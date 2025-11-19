import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RefreshCw, ShieldAlert, Clock } from 'lucide-react';

interface Props {
  children: ReactNode;
  featureName: string;
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class AIFeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.featureName}:`, error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // If error was cleared (hasError changed from true to false), notify success
    if (prevState.hasError && !this.state.hasError) {
      this.props.onSuccess?.();
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {this.props.featureName} Error
            </CardTitle>
            <CardDescription>
              An error occurred while loading this AI feature. This may be due to:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Temporary service disruption</li>
              <li>Rate limiting (too many requests)</li>
              <li>Network connectivity issues</li>
              <li>Invalid or missing data</li>
            </ul>

            {this.state.error && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-mono text-destructive">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="ghost"
                size="sm"
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
