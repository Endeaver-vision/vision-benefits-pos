/**
 * Week 6 Production Polish & Error Handling
 * Comprehensive error handling, success messages, and fallback options
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'

// Global Error Context
interface ErrorContextType {
  errors: ErrorInfo[]
  addError: (error: ErrorInfo) => void
  removeError: (id: string) => void
  clearErrors: () => void
  hasErrors: boolean
}

interface ErrorInfo {
  id: string
  message: string
  type: 'error' | 'warning' | 'info' | 'success'
  timestamp: Date
  context?: string
  action?: {
    label: string
    handler: () => void
  }
}

const ErrorContext = createContext<ErrorContextType | null>(null)

// Error Provider Component
export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorInfo[]>([])

  const addError = useCallback((error: ErrorInfo) => {
    const errorWithId = {
      ...error,
      id: error.id || `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }
    
    setErrors(prev => [...prev, errorWithId])
    
    // Auto-remove success messages after 5 seconds
    if (error.type === 'success') {
      setTimeout(() => {
        removeError(errorWithId.id)
      }, 5000)
    }
  }, [])

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  const hasErrors = errors.some(error => error.type === 'error')

  return (
    <ErrorContext.Provider value={{
      errors,
      addError,
      removeError,
      clearErrors,
      hasErrors
    }}>
      {children}
    </ErrorContext.Provider>
  )
}

// Hook to use error context
export const useErrorHandler = () => {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorProvider')
  }
  return context
}

// Error Display Component
export const ErrorDisplay: React.FC = () => {
  const { errors, removeError } = useErrorHandler()

  if (errors.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.map(error => (
        <ErrorMessage
          key={error.id}
          error={error}
          onDismiss={() => removeError(error.id)}
        />
      ))}
    </div>
  )
}

// Individual Error Message Component
const ErrorMessage: React.FC<{
  error: ErrorInfo
  onDismiss: () => void
}> = ({ error, onDismiss }) => {
  const getErrorStyles = () => {
    switch (error.type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getIcon = () => {
    switch (error.type) {
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'success':
        return '✅'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  return (
    <div className={`p-4 border rounded-lg shadow-lg ${getErrorStyles()}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 text-lg">
          {getIcon()}
        </div>
        
        <div className="flex-1">
          <p className="font-medium">{error.message}</p>
          
          {error.context && (
            <p className="text-sm opacity-75 mt-1">
              Context: {error.context}
            </p>
          )}
          
          <p className="text-xs opacity-60 mt-1">
            {error.timestamp.toLocaleTimeString()}
          </p>
          
          {error.action && (
            <button
              onClick={error.action.handler}
              className="mt-2 px-3 py-1 bg-white bg-opacity-20 rounded text-sm hover:bg-opacity-30 transition-colors"
            >
              {error.action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={onDismiss}
          className="flex-shrink-0 ml-3 text-lg hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// Enhanced API Error Handler
export const handleAPIError = (
  error: any, 
  context: string,
  addError: (error: ErrorInfo) => void,
  fallbackAction?: () => void
): void => {
  let message = 'An unexpected error occurred'
  let actionButton = undefined

  if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        message = 'Invalid data provided. Please check your input and try again.'
        break
      case 401:
        message = 'Session expired. Please refresh the page and try again.'
        actionButton = {
          label: 'Refresh Page',
          handler: () => window.location.reload()
        }
        break
      case 403:
        message = 'You do not have permission to perform this action.'
        break
      case 404:
        message = 'The requested resource was not found.'
        break
      case 409:
        message = 'This action conflicts with existing data. Please refresh and try again.'
        actionButton = {
          label: 'Refresh',
          handler: () => window.location.reload()
        }
        break
      case 422:
        message = 'The provided data is invalid. Please check your input.'
        break
      case 429:
        message = 'Too many requests. Please wait a moment and try again.'
        break
      case 500:
        message = 'Server error. Our team has been notified.'
        if (fallbackAction) {
          actionButton = {
            label: 'Try Offline Mode',
            handler: fallbackAction
          }
        }
        break
      case 503:
        message = 'Service temporarily unavailable. Please try again in a few minutes.'
        break
      default:
        message = `Error ${error.response.status}: ${error.response.statusText || 'Unknown error'}`
    }
  } else if (error?.name === 'NetworkError' || !navigator.onLine) {
    message = 'Network connection lost. Please check your internet connection.'
    if (fallbackAction) {
      actionButton = {
        label: 'Continue Offline',
        handler: fallbackAction
      }
    }
  } else if (error?.message) {
    message = error.message
  }

  addError({
    id: `api-error-${Date.now()}`,
    message,
    type: 'error',
    context,
    action: actionButton,
    timestamp: new Date()
  })
}

// Success Message Helper
export const showSuccessMessage = (
  message: string,
  addError: (error: ErrorInfo) => void,
  context?: string
): void => {
  addError({
    id: `success-${Date.now()}`,
    message,
    type: 'success',
    context,
    timestamp: new Date()
  })
}

// Signature Capture Error Handling
export const useSignatureErrorHandling = () => {
  const { addError } = useErrorHandler()

  const handleSignatureError = useCallback((error: any, context: string) => {
    if (error.type === 'canvas-not-supported') {
      addError({
        id: 'canvas-error',
        message: 'Signature capture is not supported on this device. Please use a different device or contact support.',
        type: 'error',
        context: 'Signature Capture',
        action: {
          label: 'Contact Support',
          handler: () => window.open('mailto:support@example.com?subject=Signature%20Capture%20Issue')
        }
      })
    } else if (error.type === 'signature-too-small') {
      addError({
        id: 'signature-size-error',
        message: 'Please provide a larger signature. Draw your full signature in the box.',
        type: 'warning',
        context: 'Signature Capture'
      })
    } else if (error.type === 'signature-invalid') {
      addError({
        id: 'signature-invalid-error',
        message: 'Invalid signature data. Please clear and try again.',
        type: 'error',
        context: 'Signature Capture',
        action: {
          label: 'Clear Signature',
          handler: () => {
            // This would be passed from the signature component
            console.log('Clear signature action')
          }
        }
      })
    } else {
      handleAPIError(error, context, addError)
    }
  }, [addError])

  const handleSignatureSuccess = useCallback((type: 'exam' | 'materials') => {
    showSuccessMessage(
      `${type === 'exam' ? 'Exam' : 'Materials'} signature captured successfully!`,
      addError,
      'Signature Capture'
    )
  }, [addError])

  return {
    handleSignatureError,
    handleSignatureSuccess
  }
}

// Quote Output Error Handling
export const useQuoteOutputErrorHandling = () => {
  const { addError } = useErrorHandler()

  const handleOutputError = useCallback((error: any, outputType: string) => {
    if (error.type === 'pdf-generation-failed') {
      addError({
        id: 'pdf-error',
        message: 'Failed to generate PDF. Please try again or contact support.',
        type: 'error',
        context: 'Quote Output',
        action: {
          label: 'Try Again',
          handler: () => {
            // Retry PDF generation
            console.log('Retry PDF generation')
          }
        }
      })
    } else if (error.type === 'email-failed') {
      addError({
        id: 'email-error',
        message: 'Failed to send email. Please check the email address and try again.',
        type: 'error',
        context: 'Quote Output',
        action: {
          label: 'Download Instead',
          handler: () => {
            // Download PDF as fallback
            console.log('Download PDF fallback')
          }
        }
      })
    } else if (error.type === 'print-failed') {
      addError({
        id: 'print-error',
        message: 'Printing failed. Please check your printer connection.',
        type: 'warning',
        context: 'Quote Output',
        action: {
          label: 'Download PDF',
          handler: () => {
            // Download PDF as fallback
            console.log('Download PDF fallback')
          }
        }
      })
    } else {
      handleAPIError(error, `Quote Output - ${outputType}`, addError)
    }
  }, [addError])

  const handleOutputSuccess = useCallback((outputType: string, details?: string) => {
    showSuccessMessage(
      `Quote ${outputType} completed successfully!${details ? ` ${details}` : ''}`,
      addError,
      'Quote Output'
    )
  }, [addError])

  return {
    handleOutputError,
    handleOutputSuccess
  }
}

// Network Status Monitor
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const { addError } = useErrorHandler()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      showSuccessMessage('Connection restored', addError, 'Network Status')
    }

    const handleOffline = () => {
      setIsOnline(false)
      addError({
        id: 'offline-status',
        message: 'Connection lost. Some features may be limited until connection is restored.',
        type: 'warning',
        context: 'Network Status'
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [addError])

  return isOnline
}

// Loading State Manager
export const useLoadingState = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }))
  }, [])

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false
  }, [loadingStates])

  const isAnyLoading = Object.values(loadingStates).some(Boolean)

  return {
    setLoading,
    isLoading,
    isAnyLoading,
    loadingStates
  }
}

// Fallback Component for Critical Errors
export const ErrorBoundaryFallback: React.FC<{
  error: Error
  resetError: () => void
}> = ({ error, resetError }) => {
  const { addError } = useErrorHandler()

  useEffect(() => {
    addError({
      id: 'critical-error',
      message: 'A critical error occurred. Please refresh the page.',
      type: 'error',
      context: 'Application Error',
      action: {
        label: 'Refresh Page',
        handler: () => window.location.reload()
      }
    })
  }, [addError])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="text-6xl mb-4">😵</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          A critical error occurred in the application. Don't worry, your data is safe.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={resetError}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Refresh Page
          </button>
        </div>
        
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-sm text-gray-500">Technical Details</summary>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
            {error.stack}
          </pre>
        </details>
      </div>
    </div>
  )
}

// Validation Helper
export const validateFormData = (
  data: Record<string, any>,
  rules: Record<string, {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: any) => string | null
  }>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}

  Object.entries(rules).forEach(([field, rule]) => {
    const value = data[field]

    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors[field] = `${field} is required`
      return
    }

    if (value && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors[field] = `${field} must be at least ${rule.minLength} characters`
        return
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors[field] = `${field} must be no more than ${rule.maxLength} characters`
        return
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        errors[field] = `${field} format is invalid`
        return
      }
    }

    if (rule.custom && value) {
      const customError = rule.custom(value)
      if (customError) {
        errors[field] = customError
        return
      }
    }
  })

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Export all error handling utilities
export const ErrorHandling = {
  ErrorProvider,
  ErrorDisplay,
  useErrorHandler,
  useSignatureErrorHandling,
  useQuoteOutputErrorHandling,
  useNetworkStatus,
  useLoadingState,
  ErrorBoundaryFallback,
  handleAPIError,
  showSuccessMessage,
  validateFormData
}

export default ErrorHandling