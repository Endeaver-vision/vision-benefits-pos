'use client'

import { useState, useEffect, useCallback } from 'react'
import { pendingQuotesCache } from '@/lib/offline-cache'

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    // Set initial state
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)

    // Update pending count
    const updatePendingCount = async () => {
      try {
        const pending = await pendingQuotesCache.getAll()
        setPendingCount(pending.filter((q) => q.status === 'pending').length)
      } catch {
        // IndexedDB not available
      }
    }

    updatePendingCount()

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Attempt to sync pending quotes when coming back online
      syncPendingQuotes()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sync pending quotes to server
  const syncPendingQuotes = useCallback(async () => {
    if (!navigator.onLine) return

    try {
      const pending = await pendingQuotesCache.getAll()
      const toSync = pending.filter((q) => q.status === 'pending')

      for (const quote of toSync) {
        try {
          const response = await fetch('/api/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: quote.customerId,
              items: quote.items,
              totals: quote.totals,
              status: 'DRAFT',
            }),
          })

          if (response.ok) {
            // Remove from pending
            if (quote.localId) {
              await pendingQuotesCache.remove(quote.localId)
            }
          }
        } catch {
          // Individual sync failed, will retry later
        }
      }

      // Update pending count
      const remaining = await pendingQuotesCache.getAll()
      setPendingCount(remaining.filter((q) => q.status === 'pending').length)
    } catch {
      // Sync failed
    }
  }, [])

  return {
    isOnline,
    pendingCount,
    syncPendingQuotes,
  }
}

/**
 * Hook for offline-first data fetching
 */
export function useOfflineFirst<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    revalidateOnMount?: boolean
    revalidateOnFocus?: boolean
  }
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isValidating, setIsValidating] = useState(false)
  const { isOnline } = useOnlineStatus()

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    else setIsValidating(true)

    try {
      // Try to fetch fresh data if online
      if (navigator.onLine) {
        const freshData = await fetcher()
        setData(freshData)
        setError(null)
        // Cache the data (implementation depends on data type)
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`cache:${key}`, JSON.stringify(freshData))
        }
      } else {
        // Use cached data
        if (typeof localStorage !== 'undefined') {
          const cached = localStorage.getItem(`cache:${key}`)
          if (cached) {
            setData(JSON.parse(cached))
          } else {
            throw new Error('No cached data available')
          }
        }
      }
    } catch (err) {
      // Try cache as fallback
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(`cache:${key}`)
        if (cached) {
          setData(JSON.parse(cached))
        } else {
          setError(err instanceof Error ? err : new Error('Failed to fetch'))
        }
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch'))
      }
    } finally {
      setIsLoading(false)
      setIsValidating(false)
    }
  }, [key, fetcher])

  useEffect(() => {
    if (options?.revalidateOnMount !== false) {
      fetchData()
    }
  }, [fetchData, options?.revalidateOnMount])

  useEffect(() => {
    if (options?.revalidateOnFocus !== false) {
      const handleFocus = () => {
        if (isOnline && !isLoading) {
          fetchData(false)
        }
      }

      window.addEventListener('focus', handleFocus)
      return () => window.removeEventListener('focus', handleFocus)
    }
  }, [fetchData, isOnline, isLoading, options?.revalidateOnFocus])

  return {
    data,
    error,
    isLoading,
    isValidating,
    isOnline,
    mutate: () => fetchData(false),
  }
}
