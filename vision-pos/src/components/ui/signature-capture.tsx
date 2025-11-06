'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RotateCcw, Trash2, Check, Edit3 } from 'lucide-react'

interface SignaturePoint {
  x: number
  y: number
  pressure?: number
}

interface SignaturePath {
  points: SignaturePoint[]
  timestamp: number
}

interface SignatureCaptureProps {
  onSignatureChange?: (hasSignature: boolean, dataUrl?: string) => void
  onSignatureComplete?: (dataUrl: string) => void
  width?: number
  height?: number
  strokeColor?: string
  strokeWidth?: number
  backgroundColor?: string
  disabled?: boolean
  placeholder?: string
  className?: string
}

export const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  onSignatureChange,
  onSignatureComplete,
  width = 600,
  height = 200,
  strokeColor = '#000000',
  strokeWidth = 2,
  backgroundColor = '#ffffff',
  disabled = false,
  placeholder = 'Sign here',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [paths, setPaths] = useState<SignaturePath[]>([])
  const [currentPath, setCurrentPath] = useState<SignaturePoint[]>([])
  const [hasSignature, setHasSignature] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width, height })

  // Handle responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        const aspectRatio = height / width
        const newWidth = Math.min(containerWidth - 32, width) // Account for padding
        const newHeight = newWidth * aspectRatio
        
        setCanvasSize({ width: newWidth, height: newHeight })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [width, height])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear and set background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Redraw all paths
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    paths.forEach(path => {
      if (path.points.length > 1) {
        ctx.beginPath()
        ctx.moveTo(path.points[0].x, path.points[0].y)
        
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y)
        }
        
        ctx.stroke()
      }
    })
  }, [paths, strokeColor, strokeWidth, backgroundColor])

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    // Configure drawing context
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.imageSmoothingEnabled = true

    // Redraw existing paths
    redrawCanvas()
  }, [canvasSize, strokeColor, strokeWidth, backgroundColor, paths, redrawCanvas])

  const getPointFromEvent = useCallback((event: MouseEvent | TouchEvent): SignaturePoint => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in event) {
      const touch = event.touches[0] || event.changedTouches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
        pressure: (touch as Touch & { force?: number }).force || 1
      }
    } else {
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
        pressure: 1
      }
    }
  }, [])

  const startDrawing = useCallback((event: MouseEvent | TouchEvent) => {
    if (disabled) return

    event.preventDefault()
    setIsDrawing(true)
    
    const point = getPointFromEvent(event)
    setCurrentPath([point])

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
  }, [disabled, getPointFromEvent])

  const draw = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDrawing || disabled) return

    event.preventDefault()
    const point = getPointFromEvent(event)
    
    setCurrentPath(prev => [...prev, point])

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }, [isDrawing, disabled, getPointFromEvent])

  const stopDrawing = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDrawing || disabled) return

    event.preventDefault()
    setIsDrawing(false)

    if (currentPath.length > 1) {
      const newPath: SignaturePath = {
        points: currentPath,
        timestamp: Date.now()
      }
      
      setPaths(prev => [...prev, newPath])
      setHasSignature(true)
      
      // Generate signature data URL
      const canvas = canvasRef.current
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png')
        onSignatureChange?.(true, dataUrl)
      }
    }
    
    setCurrentPath([])
  }, [isDrawing, disabled, currentPath, onSignatureChange])

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startDrawing(e.nativeEvent)
  }, [startDrawing])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    draw(e.nativeEvent)
  }, [draw])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    stopDrawing(e.nativeEvent)
  }, [stopDrawing])

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startDrawing(e.nativeEvent)
  }, [startDrawing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    draw(e.nativeEvent)
  }, [draw])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    stopDrawing(e.nativeEvent)
  }, [stopDrawing])

  const clearSignature = useCallback(() => {
    setPaths([])
    setCurrentPath([])
    setHasSignature(false)
    
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    onSignatureChange?.(false)
  }, [backgroundColor, onSignatureChange])

  const undoLastStroke = useCallback(() => {
    if (paths.length === 0) return

    const newPaths = paths.slice(0, -1)
    setPaths(newPaths)
    
    const stillHasSignature = newPaths.length > 0
    setHasSignature(stillHasSignature)
    
    if (stillHasSignature) {
      // Redraw will happen via useEffect
      setTimeout(() => {
        const canvas = canvasRef.current
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png')
          onSignatureChange?.(true, dataUrl)
        }
      }, 0)
    } else {
      onSignatureChange?.(false)
    }
  }, [paths, onSignatureChange])

  const completeSignature = useCallback(() => {
    if (!hasSignature) return

    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL('image/png')
    onSignatureComplete?.(dataUrl)
  }, [hasSignature, onSignatureComplete])

  return (
    <div ref={containerRef} className={`signature-capture ${className}`}>
      <Card className="relative">
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Digital Signature</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undoLastStroke}
                disabled={disabled || paths.length === 0}
                title="Undo last stroke"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSignature}
                disabled={disabled || !hasSignature}
                title="Clear signature"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {onSignatureComplete && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={completeSignature}
                  disabled={disabled || !hasSignature}
                  title="Complete signature"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="relative">
            <canvas
              ref={canvasRef}
              className={`
                border-2 border-dashed border-muted-foreground/30 rounded-md
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'}
                ${hasSignature ? 'border-solid border-primary/50' : ''}
                touch-none
              `}
              style={{
                width: '100%',
                height: 'auto',
                maxWidth: `${canvasSize.width}px`,
                maxHeight: `${canvasSize.height}px`
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            />
            
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-muted-foreground text-sm italic">
                  {placeholder}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-2 text-xs text-muted-foreground">
            {hasSignature ? (
              <span className="text-green-600">✓ Signature captured ({paths.length} stroke{paths.length !== 1 ? 's' : ''})</span>
            ) : (
              <span>Use mouse or touch to sign above</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SignatureCapture