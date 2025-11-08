'use client';

import React from 'react';
import { Loader2, AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  overlay?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  className,
  overlay = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const component = (
    <div className={cn(
      'flex flex-col items-center justify-center space-y-2',
      overlay && 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50',
      className
    )}>
      <Loader2 className={cn('animate-spin text-blue-600', sizeClasses[size])} />
      {text && (
        <p className={cn('text-gray-600 font-medium', textSizes[size])}>
          {text}
        </p>
      )}
    </div>
  );

  return component;
}

// Skeleton Loader Component
interface SkeletonProps {
  className?: string;
  rows?: number;
}

export function Skeleton({ className, rows = 1 }: SkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse bg-gray-200 rounded-md h-4',
            className
          )}
        />
      ))}
    </div>
  );
}

// Card Skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-6 border rounded-lg bg-white', className)}>
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton rows={3} />
        <div className="flex space-x-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Error Message Component
interface ErrorMessageProps {
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  retry?: () => void;
  className?: string;
}

export function ErrorMessage({ 
  title,
  message, 
  type = 'error', 
  retry, 
  className 
}: ErrorMessageProps) {
  const icons = {
    error: XCircle,
    warning: AlertCircle,
    info: Info,
    success: CheckCircle2
  };

  const colors = {
    error: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
    success: 'text-green-600 bg-green-50 border-green-200'
  };

  const Icon = icons[type];

  return (
    <div className={cn(
      'p-4 rounded-lg border flex items-start space-x-3',
      colors[type],
      className
    )}>
      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        {title && (
          <h3 className="font-semibold mb-1">{title}</h3>
        )}
        <p className="text-sm">{message}</p>
        {retry && (
          <button
            onClick={retry}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-12 px-4',
      className
    )}>
      {icon && (
        <div className="mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Confirmation Dialog Hook
export function useConfirmation() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'default' | 'danger';
    onConfirm: () => void;
  } | null>(null);

  const confirm = React.useCallback((options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'default' | 'danger';
    onConfirm: () => void;
  }) => {
    setConfig(options);
    setIsOpen(true);
  }, []);

  const handleConfirm = React.useCallback(() => {
    config?.onConfirm();
    setIsOpen(false);
    setConfig(null);
  }, [config]);

  const handleCancel = React.useCallback(() => {
    setIsOpen(false);
    setConfig(null);
  }, []);

  const ConfirmationDialog = React.useCallback(() => {
    if (!isOpen || !config) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
          <p className="text-gray-600 mb-6">{config.message}</p>
          <div className="flex space-x-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {config.cancelLabel || 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              className={cn(
                'px-4 py-2 rounded-md text-white',
                config.type === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {config.confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  }, [isOpen, config, handleConfirm, handleCancel]);

  return { confirm, ConfirmationDialog };
}

// Toast Notification System
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

const ToastContext = React.createContext<{
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 5000);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <ToastComponent key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastComponent({ 
  toast, 
  onRemove 
}: { 
  toast: Toast; 
  onRemove: (id: string) => void; 
}) {
  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const Icon = icons[toast.type];

  return (
    <div className={cn(
      'p-4 rounded-lg border shadow-lg max-w-sm',
      colors[toast.type],
      'animate-in slide-in-from-right duration-300'
    )}>
      <div className="flex items-start space-x-3">
        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          {toast.title && (
            <h4 className="font-semibold mb-1">{toast.title}</h4>
          )}
          <p className="text-sm">{toast.message}</p>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="text-gray-400 hover:text-gray-600"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}