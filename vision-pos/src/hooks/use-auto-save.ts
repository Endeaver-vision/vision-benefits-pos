'use client'

import { useEffect, useRef } from 'react'
import { useQuoteStore } from '../store/quote-store'

interface UseAutoSaveOptions {
  enabled?: boolean
  intervalMs?: number
  onSave?: () => Promise<void>
  onError?: (error: Error) => void
}

export function useAutoSave({
  enabled = true,
  intervalMs = 30000, // 30 seconds
  onSave,
  onError
}: UseAutoSaveOptions = {}) {
  const { autoSave, saveQuote } = useQuoteStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<Date | null>(null)

  useEffect(() => {
    if (!enabled || !autoSave.enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const performAutoSave = async () => {
      try {
        // Only auto-save if there are unsaved changes
        if (autoSave.isDirty) {
          if (onSave) {
            await onSave()
          } else {
            await saveQuote()
          }
          lastSaveRef.current = new Date()
        }
      } catch (error) {
        console.error('Auto-save failed:', error)
        if (onError) {
          onError(error as Error)
        }
      }
    }

    // Set up interval for auto-save
    intervalRef.current = setInterval(performAutoSave, intervalMs)

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, autoSave.enabled, autoSave.isDirty, intervalMs, saveQuote, onSave, onError])

  // Auto-save when the page is about to unload
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (autoSave.isDirty) {
        // Show confirmation dialog
        event.preventDefault()
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        
        // Try to save before leaving (this may not complete in time)
        try {
          if (onSave) {
            await onSave()
          } else {
            await saveQuote()
          }
        } catch (error) {
          console.error('Failed to save before unload:', error)
        }
      }
    }

    const handleVisibilityChange = async () => {
      // Auto-save when the tab becomes hidden (user switches tabs)
      if (document.hidden && autoSave.isDirty) {
        try {
          if (onSave) {
            await onSave()
          } else {
            await saveQuote()
          }
        } catch (error) {
          console.error('Failed to save on visibility change:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [autoSave.isDirty, saveQuote, onSave])

  return {
    isAutoSaveEnabled: enabled && autoSave.enabled,
    isDirty: autoSave.isDirty,
    lastSaved: autoSave.lastSaved
  }
}

// Hook for manual save with debouncing
export function useDebouncedSave(delay = 1000) {
  const { saveQuote } = useQuoteStore()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedSave = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        await saveQuote()
      } catch (error) {
        console.error('Debounced save failed:', error)
      }
    }, delay)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { debouncedSave }
}