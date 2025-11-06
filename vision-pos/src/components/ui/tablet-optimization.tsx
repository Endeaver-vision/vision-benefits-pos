/**
 * Week 6 Tablet Workflow Optimization
 * Tablet-specific enhancements for signature capture and POS workflow
 */

import React, { useEffect, useState, useCallback } from 'react'

// Enhanced touch handlers for better mobile experience
export const useTabletOptimization = () => {
  const [isTablet, setIsTablet] = useState(false)
  const [orientation, setOrientation] = useState('landscape')
  const [touchCapabilities, setTouchCapabilities] = useState({
    maxTouchPoints: 0,
    supportsPressure: false
  })

  useEffect(() => {
    // Detect tablet environment
    const detectTablet = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isLargeScreen = window.innerWidth >= 768 && window.innerWidth <= 1024
      const isMobileUserAgent = /iPad|Android|Windows NT.*Touch/i.test(navigator.userAgent)
      
      setIsTablet(hasTouch && (isLargeScreen || isMobileUserAgent))
      
      setTouchCapabilities({
        maxTouchPoints: navigator.maxTouchPoints || 0,
        supportsPressure: 'force' in TouchEvent.prototype || false
      })
    }

    // Detect orientation changes
    const handleOrientationChange = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }

    detectTablet()
    handleOrientationChange()

    window.addEventListener('resize', detectTablet)
    window.addEventListener('resize', handleOrientationChange)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', detectTablet)
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  return {
    isTablet,
    orientation,
    touchCapabilities,
    deviceInfo: {
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1
    }
  }
}

// Enhanced signature canvas for tablet use
export const TabletSignatureCanvas = React.forwardRef<
  HTMLCanvasElement,
  {
    width?: number
    height?: number
    onSignatureChange?: (signature: string) => void
    disabled?: boolean
    className?: string
  }
>(({ width, height, onSignatureChange, disabled = false, className }, ref) => {
  const { isTablet, orientation, deviceInfo } = useTabletOptimization()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)

  // Calculate optimal canvas size for tablet
  const getOptimalCanvasSize = useCallback(() => {
    if (!isTablet) {
      return { width: width || 400, height: height || 200 }
    }

    const availableWidth = deviceInfo.screenWidth * 0.9 // 90% of screen width
    const availableHeight = deviceInfo.screenHeight * 0.4 // 40% of screen height

    if (orientation === 'portrait') {
      return {
        width: Math.min(availableWidth, 600),
        height: Math.min(availableHeight, 300)
      }
    } else {
      return {
        width: Math.min(availableWidth, 800),
        height: Math.min(availableHeight, 250)
      }
    }
  }, [isTablet, orientation, deviceInfo, width, height])

  const canvasSize = getOptimalCanvasSize()

  // Enhanced drawing functions with tablet optimization
  const startDrawing = useCallback((point: { x: number; y: number }) => {
    if (disabled) return
    
    setIsDrawing(true)
    setLastPoint(point)
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Enhanced drawing settings for tablet
    ctx.lineWidth = isTablet ? 3 : 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000000'
    
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }, [disabled, isTablet])

  const draw = useCallback((point: { x: number; y: number }) => {
    if (!isDrawing || disabled || !lastPoint) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.beginPath()
    ctx.moveTo(lastPoint.x, lastPoint.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    
    setLastPoint(point)
  }, [isDrawing, disabled, lastPoint])

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return
    
    setIsDrawing(false)
    setLastPoint(null)
    
    // Export signature
    const canvas = canvasRef.current
    if (canvas && onSignatureChange) {
      const dataURL = canvas.toDataURL('image/png')
      onSignatureChange(dataURL)
    }
  }, [isDrawing, onSignatureChange])

  // Touch event handlers with enhanced tablet support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    const point = {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    }
    
    startDrawing(point)
  }, [startDrawing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    const point = {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    }
    
    draw(point)
  }, [draw])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    stopDrawing()
  }, [stopDrawing])

  // Mouse event handlers (fallback)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const point = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    }
    
    startDrawing(point)
  }, [startDrawing])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const point = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    }
    
    draw(point)
  }, [draw])

  const handleMouseUp = useCallback(() => {
    stopDrawing()
  }, [stopDrawing])

  // Clear canvas function
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    if (onSignatureChange) {
      onSignatureChange('')
    }
  }, [onSignatureChange])

  // Set up canvas ref
  React.useImperativeHandle(ref, () => ({
    ...canvasRef.current!,
    clearCanvas
  }))

  return (
    <div className={`signature-canvas-container ${className || ''}`}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={`signature-canvas ${isTablet ? 'tablet-optimized' : ''} ${disabled ? 'disabled' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          touchAction: 'none',
          userSelect: 'none',
          cursor: disabled ? 'not-allowed' : 'crosshair',
          ...(isTablet && {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            borderWidth: '3px'
          })
        }}
      />
      
      {isTablet && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          {orientation === 'portrait' 
            ? '💡 Rotate to landscape for a larger signing area'
            : '✓ Optimized for tablet signing'
          }
        </div>
      )}
    </div>
  )
})

TabletSignatureCanvas.displayName = 'TabletSignatureCanvas'

// Tablet-optimized UI components
export const TabletUIOptimizations = {
  // Larger touch targets for tablet use
  ButtonSize: {
    small: 'px-4 py-3 text-base',
    medium: 'px-6 py-4 text-lg',
    large: 'px-8 py-5 text-xl'
  },
  
  // Enhanced spacing for finger navigation
  Spacing: {
    tight: 'space-y-3',
    normal: 'space-y-4',
    loose: 'space-y-6'
  },
  
  // Tablet-friendly modal sizes
  ModalSizes: {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    fullscreen: 'max-w-full mx-4'
  }
}

// Tablet workflow layout component
export const TabletWorkflowLayout: React.FC<{
  children: React.ReactNode
  title: string
  onBack?: () => void
  actions?: React.ReactNode
}> = ({ children, title, onBack, actions }) => {
  const { isTablet, orientation } = useTabletOptimization()
  
  return (
    <div className={`tablet-workflow-layout ${isTablet ? 'tablet-optimized' : ''}`}>
      {/* Header with larger touch targets */}
      <div className={`flex items-center justify-between p-4 border-b ${isTablet ? 'px-6 py-5' : ''}`}>
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className={`p-2 rounded-lg hover:bg-gray-100 ${isTablet ? 'p-3 text-lg' : ''}`}
            >
              ← Back
            </button>
          )}
          <h1 className={`font-semibold ${isTablet ? 'text-2xl' : 'text-xl'}`}>
            {title}
          </h1>
        </div>
        
        {actions && (
          <div className={`flex items-center space-x-3 ${isTablet ? 'space-x-4' : ''}`}>
            {actions}
          </div>
        )}
      </div>
      
      {/* Content area with tablet-optimized spacing */}
      <div className={`flex-1 overflow-auto ${isTablet ? 'p-6' : 'p-4'}`}>
        <div className={`max-w-none ${orientation === 'portrait' && isTablet ? 'space-y-6' : 'space-y-4'}`}>
          {children}
        </div>
      </div>
      
      {/* Tablet-specific optimization indicators */}
      {isTablet && (
        <div className="hidden">
          {/* Hidden elements for CSS targeting */}
          <div className="tablet-device" />
          <div className={`orientation-${orientation}`} />
        </div>
      )}
    </div>
  )
}

// Touch gesture helpers
export const useTouchGestures = () => {
  const [gestureState, setGestureState] = useState({
    isSwipeGesture: false,
    swipeDirection: null as 'left' | 'right' | 'up' | 'down' | null,
    isPinchGesture: false,
    scale: 1
  })

  const handleTouchGesture = useCallback((touches: TouchList, type: 'start' | 'move' | 'end') => {
    if (touches.length === 2) {
      // Handle pinch gesture
      if (type === 'start' || type === 'move') {
        const touch1 = touches[0]
        const touch2 = touches[1]
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) + 
          Math.pow(touch2.clientY - touch1.clientY, 2)
        )
        
        setGestureState(prev => ({
          ...prev,
          isPinchGesture: true,
          scale: distance / 100 // Normalized scale
        }))
      }
    } else if (touches.length === 1 && type === 'move') {
      // Handle swipe gesture (simplified)
      setGestureState(prev => ({
        ...prev,
        isSwipeGesture: true
      }))
    }
    
    if (type === 'end') {
      setGestureState({
        isSwipeGesture: false,
        swipeDirection: null,
        isPinchGesture: false,
        scale: 1
      })
    }
  }, [])

  return {
    gestureState,
    handleTouchGesture
  }
}

export default TabletSignatureCanvas