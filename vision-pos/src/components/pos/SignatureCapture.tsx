'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Eraser, Check } from 'lucide-react'

interface SignatureCaptureProps {
  onSignatureComplete: (signatureDataUrl: string) => void
  width?: number
  height?: number
  className?: string
}

/**
 * Touch-friendly signature capture canvas
 * Works with mouse and touch input
 */
export default function SignatureCapture({
  onSignatureComplete,
  width = 400,
  height = 200,
  className,
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up canvas for high-DPI displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // Set line style
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw signature line
    ctx.beginPath()
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.moveTo(20, height - 40)
    ctx.lineTo(width - 20, height - 40)
    ctx.stroke()

    // Reset for drawing
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
  }, [width, height])

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasSignature(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

    // Redraw signature line
    ctx.beginPath()
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.moveTo(20, height - 40)
    ctx.lineTo(width - 20, height - 40)
    ctx.stroke()

    // Reset for drawing
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2

    setHasSignature(false)
  }

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) return

    const dataUrl = canvas.toDataURL('image/png')
    onSignatureComplete(dataUrl)
  }

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="text-center text-sm text-gray-500 mb-2">
        Sign below to confirm your order
      </div>

      <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white">
        <canvas
          ref={canvasRef}
          className="touch-none cursor-crosshair"
          style={{ width, height }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* X marker */}
        <div className="absolute left-6 bottom-12 text-gray-400 text-xl font-bold">
          X
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          disabled={!hasSignature}
        >
          <Eraser className="h-4 w-4 mr-2" />
          Clear
        </Button>
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={!hasSignature}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check className="h-4 w-4 mr-2" />
          Confirm Signature
        </Button>
      </div>
    </div>
  )
}
