import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitStatus {
  state: CircuitState;
  failures: number;
  lastFailureTime: number | null;
  nextRetryTime: number | null;
}

interface CircuitBreakerContextType {
  getCircuitStatus: (featureName: string) => CircuitStatus;
  recordSuccess: (featureName: string) => void;
  recordFailure: (featureName: string) => void;
  canAttempt: (featureName: string) => boolean;
}

const CircuitBreakerContext = createContext<CircuitBreakerContextType | null>(null);

const FAILURE_THRESHOLD = 3; // Open circuit after 3 failures
const COOLDOWN_PERIOD = 60000; // 1 minute cooldown
const HALF_OPEN_TIMEOUT = 30000; // 30 seconds in half-open state

const DEFAULT_STATUS: CircuitStatus = {
  state: 'CLOSED',
  failures: 0,
  lastFailureTime: null,
  nextRetryTime: null,
};

export function CircuitBreakerProvider({ children }: { children: ReactNode }) {
  const [circuits, setCircuits] = useState<Record<string, CircuitStatus>>(() => {
    const stored = localStorage.getItem('circuit_breaker_state');
    return stored ? JSON.parse(stored) : {};
  });

  // Persist circuit state to localStorage
  useEffect(() => {
    localStorage.setItem('circuit_breaker_state', JSON.stringify(circuits));
  }, [circuits]);

  // Check for circuits that should transition from OPEN to HALF_OPEN
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCircuits((prev) => {
        const updated = { ...prev };
        let hasChanges = false;

        Object.keys(updated).forEach((feature) => {
          const circuit = updated[feature];
          if (circuit.state === 'OPEN' && circuit.nextRetryTime && now >= circuit.nextRetryTime) {
            updated[feature] = {
              ...circuit,
              state: 'HALF_OPEN',
              nextRetryTime: now + HALF_OPEN_TIMEOUT,
            };
            hasChanges = true;
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getCircuitStatus = (featureName: string): CircuitStatus => {
    return circuits[featureName] || DEFAULT_STATUS;
  };

  const recordSuccess = (featureName: string) => {
    setCircuits((prev) => ({
      ...prev,
      [featureName]: DEFAULT_STATUS,
    }));
  };

  const recordFailure = (featureName: string) => {
    setCircuits((prev) => {
      const current = prev[featureName] || DEFAULT_STATUS;
      const newFailures = current.failures + 1;
      const now = Date.now();

      // If we've hit the threshold, open the circuit
      if (newFailures >= FAILURE_THRESHOLD) {
        return {
          ...prev,
          [featureName]: {
            state: 'OPEN',
            failures: newFailures,
            lastFailureTime: now,
            nextRetryTime: now + COOLDOWN_PERIOD,
          },
        };
      }

      // Otherwise, just increment failures
      return {
        ...prev,
        [featureName]: {
          ...current,
          failures: newFailures,
          lastFailureTime: now,
        },
      };
    });
  };

  const canAttempt = (featureName: string): boolean => {
    const circuit = getCircuitStatus(featureName);
    const now = Date.now();

    if (circuit.state === 'CLOSED') {
      return true;
    }

    if (circuit.state === 'HALF_OPEN') {
      return true; // Allow one attempt in half-open state
    }

    if (circuit.state === 'OPEN') {
      // Check if cooldown period has passed
      if (circuit.nextRetryTime && now >= circuit.nextRetryTime) {
        return true;
      }
      return false;
    }

    return false;
  };

  return (
    <CircuitBreakerContext.Provider value={{ getCircuitStatus, recordSuccess, recordFailure, canAttempt }}>
      {children}
    </CircuitBreakerContext.Provider>
  );
}

export function useCircuitBreaker(featureName: string) {
  const context = useContext(CircuitBreakerContext);
  if (!context) {
    throw new Error('useCircuitBreaker must be used within CircuitBreakerProvider');
  }

  const status = context.getCircuitStatus(featureName);
  const canAttempt = context.canAttempt(featureName);

  return {
    status,
    canAttempt,
    recordSuccess: () => context.recordSuccess(featureName),
    recordFailure: () => context.recordFailure(featureName),
    isDisabled: !canAttempt,
    timeUntilRetry: status.nextRetryTime ? Math.max(0, status.nextRetryTime - Date.now()) : null,
  };
}
