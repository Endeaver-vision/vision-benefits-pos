'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error!} 
          resetError={this.resetError} 
        />
      );
    }

    return this.props.children;
  }
}

// Default Error Fallback Component
function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-red-900">Something went wrong</CardTitle>
          <CardDescription>
            We apologize for the inconvenience. An unexpected error has occurred.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 bg-gray-100 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">
                Error Details (Development Mode):
              </h4>
              <p className="text-xs text-gray-700 font-mono">
                {error.message}
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={resetError}
              className="flex-1 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex-1 flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            If this problem persists, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Async Error Boundary Hook for handling Promise rejections
export function useAsyncError() {
  const [, setError] = React.useState();
  
  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}

// Page-level Error Fallback
export function PageErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Page Error</CardTitle>
          <CardDescription>
            This page encountered an error and couldn&apos;t load properly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">
                Error Details:
              </h4>
              <pre className="text-xs text-gray-700 overflow-auto">
                {error.stack}
              </pre>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button onClick={resetError}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component-level Error Fallback
export function ComponentErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-900 mb-1">
            Component Error
          </h4>
          <p className="text-sm text-red-700 mb-3">
            This component failed to load properly.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-3">
              <summary className="text-xs text-red-600 cursor-pointer">
                Show error details
              </summary>
              <pre className="text-xs mt-2 p-2 bg-white rounded border text-red-800 overflow-auto">
                {error.message}
              </pre>
            </details>
          )}
          <Button size="sm" variant="outline" onClick={resetError}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

// Network Error Component
export function NetworkError({ 
  onRetry, 
  message = "Network connection failed" 
}: { 
  onRetry?: () => void; 
  message?: string; 
}) {
  return (
    <div className="p-6 text-center">
      <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
        <AlertTriangle className="h-6 w-6 text-orange-600" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">Connection Problem</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

export { ErrorBoundary };
export default ErrorBoundary;