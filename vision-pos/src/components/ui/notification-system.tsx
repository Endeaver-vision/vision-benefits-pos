'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  X,
  Loader2
} from 'lucide-react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number // Auto-dismiss after milliseconds (0 = no auto-dismiss)
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'destructive'
  }>
}

interface NotificationSystemProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
  className?: string
}

const NotificationIcon = ({ type }: { type: NotificationType }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-600" />
    case 'error':
      return <XCircle className="h-5 w-5 text-red-600" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    case 'info':
      return <Info className="h-5 w-5 text-blue-600" />
    case 'loading':
      return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
    default:
      return <Info className="h-5 w-5 text-gray-600" />
  }
}

const getNotificationStyles = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'border-green-200 bg-green-50 text-green-800'
    case 'error':
      return 'border-red-200 bg-red-50 text-red-800'
    case 'warning':
      return 'border-yellow-200 bg-yellow-50 text-yellow-800'
    case 'info':
      return 'border-blue-200 bg-blue-50 text-blue-800'
    case 'loading':
      return 'border-blue-200 bg-blue-50 text-blue-800'
    default:
      return 'border-gray-200 bg-gray-50 text-gray-800'
  }
}

export function NotificationSystem({ notifications, onDismiss, className = '' }: NotificationSystemProps) {
  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 max-w-md ${className}`}>
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}

function NotificationCard({ notification, onDismiss }: { 
  notification: Notification
  onDismiss: (id: string) => void 
}) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onDismiss(notification.id), 300) // Allow fade out animation
      }, notification.duration)

      return () => clearTimeout(timer)
    }
  }, [notification.duration, notification.id, onDismiss])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss(notification.id), 300)
  }

  return (
    <div className={`transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <Alert className={`${getNotificationStyles(notification.type)} shadow-lg border-l-4`}>
        <div className="flex items-start space-x-3">
          <NotificationIcon type={notification.type} />
          <div className="flex-1 min-w-0">
            <AlertDescription>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">{notification.title}</h4>
                <p className="text-sm">{notification.message}</p>
                
                {notification.actions && notification.actions.length > 0 && (
                  <div className="flex space-x-2 mt-3">
                    {notification.actions.map((action, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={action.variant || 'outline'}
                        onClick={action.onClick}
                        className="text-xs"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </AlertDescription>
          </div>
          
          {notification.type !== 'loading' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-black/10"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Alert>
    </div>
  )
}

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    setNotifications(prev => [...prev, { ...notification, id }])
    return id
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  // Convenience methods
  const showSuccess = (title: string, message: string, duration = 5000) => {
    return addNotification({ type: 'success', title, message, duration })
  }

  const showError = (title: string, message: string, duration = 0) => {
    return addNotification({ type: 'error', title, message, duration })
  }

  const showWarning = (title: string, message: string, duration = 8000) => {
    return addNotification({ type: 'warning', title, message, duration })
  }

  const showInfo = (title: string, message: string, duration = 5000) => {
    return addNotification({ type: 'info', title, message, duration })
  }

  const showLoading = (title: string, message: string) => {
    return addNotification({ type: 'loading', title, message, duration: 0 })
  }

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading
  }
}