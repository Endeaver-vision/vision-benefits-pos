'use client'

import { useState } from 'react'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

interface LoadingOverlayProps {
  isLoading: boolean
  title?: string
  message?: string
  className?: string
}

interface AsyncOperationState {
  state: LoadingState
  title?: string
  message?: string
  error?: string
  progress?: number
}

interface AsyncOperationDisplayProps {
  operation: AsyncOperationState
  onRetry?: () => void
  onCancel?: () => void
  className?: string
}

// Simple loading overlay for buttons and small components
export function LoadingOverlay({ 
  isLoading, 
  title = 'Loading...', 
  message = 'Please wait', 
  className = '' 
}: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className={`absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  )
}

// Comprehensive async operation display for complex workflows
export function AsyncOperationDisplay({ 
  operation, 
  onRetry, 
  onCancel,
  className = '' 
}: AsyncOperationDisplayProps) {
  const getStateIcon = () => {
    switch (operation.state) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      case 'success':
        return <CheckCircle2 className="h-8 w-8 text-green-600" />
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />
      default:
        return null
    }
  }

  const getStateColor = () => {
    switch (operation.state) {
      case 'loading':
        return 'text-blue-800 bg-blue-50 border-blue-200'
      case 'success':
        return 'text-green-800 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-800 bg-red-50 border-red-200'
      default:
        return 'text-gray-800 bg-gray-50 border-gray-200'
    }
  }

  if (operation.state === 'idle') return null

  return (
    <Card className={`${getStateColor()} ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          {getStateIcon()}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">
              {operation.title || 'Processing...'}
            </h3>
            <p className="text-sm mt-1">
              {operation.message || 'Please wait while we process your request.'}
            </p>
            
            {operation.error && (
              <p className="text-sm mt-2 font-medium text-red-700">
                Error: {operation.error}
              </p>
            )}
            
            {operation.progress !== undefined && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span>{Math.round(operation.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, operation.progress))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {(operation.state === 'error' || operation.state === 'success') && (onRetry || onCancel) && (
          <div className="flex justify-end space-x-2 mt-4">
            {operation.state === 'error' && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try Again
              </Button>
            )}
            {onCancel && (
              <Button 
                variant={operation.state === 'error' ? 'default' : 'outline'} 
                size="sm" 
                onClick={onCancel}
              >
                {operation.state === 'success' ? 'Continue' : 'Cancel'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Hook for managing async operation states
export function useAsyncOperation() {
  const [operation, setOperation] = useState<AsyncOperationState>({
    state: 'idle'
  })

  const startOperation = (title?: string, message?: string) => {
    setOperation({
      state: 'loading',
      title,
      message,
      progress: 0
    })
  }

  const updateProgress = (progress: number, message?: string) => {
    setOperation(prev => ({
      ...prev,
      progress,
      message: message || prev.message
    }))
  }

  const completeOperation = (title?: string, message?: string) => {
    setOperation({
      state: 'success',
      title: title || 'Operation Completed',
      message: message || 'The operation completed successfully.',
      progress: 100
    })
  }

  const failOperation = (error: string, title?: string) => {
    setOperation({
      state: 'error',
      title: title || 'Operation Failed',
      message: 'An error occurred while processing your request.',
      error
    })
  }

  const resetOperation = () => {
    setOperation({ state: 'idle' })
  }

  return {
    operation,
    startOperation,
    updateProgress,
    completeOperation,
    failOperation,
    resetOperation,
    isLoading: operation.state === 'loading',
    isSuccess: operation.state === 'success',
    isError: operation.state === 'error',
    isIdle: operation.state === 'idle'
  }
}

// Higher-order component for adding loading states to any component
export function withLoading<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  loadingProps?: Partial<LoadingOverlayProps>
) {
  return function LoadingWrapper(props: T & { isLoading?: boolean }) {
    const { isLoading, ...componentProps } = props
    
    return (
      <div className="relative">
        <Component {...(componentProps as T)} />
        <LoadingOverlay 
          isLoading={isLoading || false} 
          {...loadingProps}
        />
      </div>
    )
  }
}