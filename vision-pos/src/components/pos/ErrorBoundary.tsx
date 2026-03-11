'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary for POS components
 * Catches React errors and displays recovery options
 */
export class POSErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console (could send to monitoring service)
    console.error('POS Error:', error)
    console.error('Component Stack:', errorInfo.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-500 mb-6 max-w-md">
            We encountered an unexpected error. Your quote data has been preserved.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={this.handleGoHome}>
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
            <Button onClick={this.handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 text-left text-xs text-gray-400 max-w-lg">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded overflow-auto">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Toast notification for transient errors
 */
export function ErrorToast({
  message,
  onDismiss,
  onRetry,
}: {
  message: string
  onDismiss: () => void
  onRetry?: () => void
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-md">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <p className="flex-1 text-sm">{message}</p>
        <div className="flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs font-medium hover:underline"
            >
              Retry
            </button>
          )}
          <button
            onClick={onDismiss}
            className="text-xs font-medium hover:underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Network error indicator
 */
export function OfflineIndicator() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium">
      <span className="flex items-center justify-center gap-2">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        You're offline. Changes will be saved when you reconnect.
      </span>
    </div>
  )
}

/**
 * Empty state for when data fails to load
 */
export function LoadErrorState({
  message = 'Failed to load data',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertTriangle className="h-12 w-12 text-gray-300 mb-4" />
      <p className="text-gray-500 mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  )
}
