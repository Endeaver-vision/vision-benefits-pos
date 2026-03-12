'use client'

import { useEffect, useState, useCallback } from 'react'

/**
 * Detect if device is iPad
 */
export function useIsIPad() {
  const [isIPad, setIsIPad] = useState(false)

  useEffect(() => {
    const checkIsIPad = () => {
      // Check for iPad
      const isIPadOS =
        navigator.maxTouchPoints > 1 &&
        /Macintosh/.test(navigator.userAgent) &&
        'ontouchend' in document

      const isIPadUserAgent = /iPad/.test(navigator.userAgent)

      setIsIPad(isIPadOS || isIPadUserAgent)
    }

    checkIsIPad()
  }, [])

  return isIPad
}

/**
 * Get safe area insets for iPad/iPhone notch handling
 */
export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })

  useEffect(() => {
    const updateInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement)
      setInsets({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
      })
    }

    // Set CSS variables for safe area
    document.documentElement.style.setProperty(
      '--sat',
      'env(safe-area-inset-top, 0px)'
    )
    document.documentElement.style.setProperty(
      '--sar',
      'env(safe-area-inset-right, 0px)'
    )
    document.documentElement.style.setProperty(
      '--sab',
      'env(safe-area-inset-bottom, 0px)'
    )
    document.documentElement.style.setProperty(
      '--sal',
      'env(safe-area-inset-left, 0px)'
    )

    updateInsets()
    window.addEventListener('resize', updateInsets)
    return () => window.removeEventListener('resize', updateInsets)
  }, [])

  return insets
}

/**
 * Prevent overscroll/bounce effect on iOS
 */
export function usePreventOverscroll() {
  useEffect(() => {
    const preventOverscroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      // Allow scrolling inside scrollable elements
      if (
        target.closest('[data-scrollable]') ||
        target.closest('.overflow-auto') ||
        target.closest('.overflow-y-auto') ||
        target.closest('.overflow-x-auto')
      ) {
        return
      }
      // Prevent default only at boundaries
      const scrollableParent = target.closest('[data-scrollable]')
      if (!scrollableParent) {
        // Only prevent if we're at the boundary
        const isAtTop = window.scrollY <= 0
        const isAtBottom =
          window.scrollY + window.innerHeight >= document.body.scrollHeight

        if ((isAtTop && e.touches[0].clientY > 0) || (isAtBottom && e.touches[0].clientY < 0)) {
          e.preventDefault()
        }
      }
    }

    document.addEventListener('touchmove', preventOverscroll, { passive: false })
    return () =>
      document.removeEventListener('touchmove', preventOverscroll)
  }, [])
}

/**
 * Swipe gesture detection for iPad
 */
export function useSwipeGesture(
  ref: React.RefObject<HTMLElement>,
  callbacks: {
    onSwipeLeft?: () => void
    onSwipeRight?: () => void
    onSwipeUp?: () => void
    onSwipeDown?: () => void
  },
  options?: {
    threshold?: number
    preventDefault?: boolean
  }
) {
  const threshold = options?.threshold ?? 50

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let startX = 0
    let startY = 0
    let startTime = 0

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      startTime = Date.now()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const endTime = Date.now()

      const diffX = endX - startX
      const diffY = endY - startY
      const duration = endTime - startTime

      // Only register swipes completed within 300ms
      if (duration > 300) return

      const absX = Math.abs(diffX)
      const absY = Math.abs(diffY)

      // Horizontal swipe
      if (absX > threshold && absX > absY) {
        if (diffX > 0) {
          callbacks.onSwipeRight?.()
        } else {
          callbacks.onSwipeLeft?.()
        }
        if (options?.preventDefault) e.preventDefault()
      }

      // Vertical swipe
      if (absY > threshold && absY > absX) {
        if (diffY > 0) {
          callbacks.onSwipeDown?.()
        } else {
          callbacks.onSwipeUp?.()
        }
        if (options?.preventDefault) e.preventDefault()
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: !options?.preventDefault })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [ref, callbacks, threshold, options?.preventDefault])
}

/**
 * Haptic feedback for iPad (where supported)
 */
export function useHaptics() {
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'selection') => {
    // Use the Vibration API if available
    if ('vibrate' in navigator) {
      switch (type) {
        case 'light':
          navigator.vibrate(10)
          break
        case 'medium':
          navigator.vibrate(20)
          break
        case 'heavy':
          navigator.vibrate(30)
          break
        case 'selection':
          navigator.vibrate(5)
          break
      }
    }
  }, [])

  return { triggerHaptic }
}

/**
 * Prevent zoom on double-tap
 */
export function usePreventDoubleZoom() {
  useEffect(() => {
    let lastTap = 0

    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now()
      const DOUBLE_TAP_DELAY = 300

      if (now - lastTap < DOUBLE_TAP_DELAY) {
        e.preventDefault()
      }
      lastTap = now
    }

    // Prevent double-tap zoom
    document.addEventListener('touchend', handleTouchEnd, { passive: false })

    // Prevent pinch zoom
    document.addEventListener(
      'gesturestart',
      (e) => e.preventDefault(),
      { passive: false }
    )

    return () => {
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])
}
