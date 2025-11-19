import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Clock, RefreshCw } from 'lucide-react';
import { useCircuitBreaker } from '@/hooks/useCircuitBreaker';
import { AIFeatureErrorBoundary } from './AIFeatureErrorBoundary';

interface Props {
  children: ReactNode;
  featureName: string;
  fallback?: ReactNode;
}

function formatTimeRemaining(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}

export function AIFeatureCircuitBreaker({ children, featureName, fallback }: Props) {
  const { status, canAttempt, recordSuccess, recordFailure, isDisabled, timeUntilRetry } = useCircuitBreaker(featureName);

  // If circuit is open, show disabled state
  if (isDisabled) {
    return (
      <Card className="border-amber-500/50 bg-amber-50/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <ShieldAlert className="h-5 w-5" />
            {featureName} Temporarily Disabled
          </CardTitle>
          <CardDescription>
            This AI feature has been temporarily disabled due to repeated failures to prevent further issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {timeUntilRetry ? (
              <span>Retry available in {formatTimeRemaining(timeUntilRetry)}</span>
            ) : (
              <span>Preparing to retry...</span>
            )}
          </div>
          
          <div className="space-y-2">
            <Badge variant="outline" className="font-mono">
              Circuit State: {status.state}
            </Badge>
            <Badge variant="outline" className="font-mono">
              Consecutive Failures: {status.failures}
            </Badge>
          </div>

          <div className="p-3 bg-muted rounded-md text-sm">
            <p className="font-medium mb-2">Why is this disabled?</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>The AI service experienced {status.failures} consecutive failures</li>
              <li>Circuit breaker activated to prevent cascading failures</li>
              <li>Feature will automatically retry after cooldown period</li>
              <li>If successful, the feature will be re-enabled</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Circuit is closed or half-open, render with error boundary
  return (
    <AIFeatureErrorBoundary
      featureName={featureName}
      fallback={fallback}
      onError={recordFailure}
      onSuccess={recordSuccess}
    >
      {children}
    </AIFeatureErrorBoundary>
  );
}
