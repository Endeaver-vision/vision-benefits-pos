'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  PenTool,
  RotateCcw,
  CheckCircle,
  FileSignature,
  Calendar,
  User
} from 'lucide-react'

interface SignatureData {
  signature: string // Base64 encoded signature image
  timestamp: Date
  patientName: string
  staffWitness: string
}

interface POFSignatureInterfaceProps {
  patientName: string
  staffName: string
  onSignatureComplete: (signatureData: SignatureData) => void
  onCancel: () => void
}

export function POFSignatureInterface({ 
  patientName, 
  staffName, 
  onSignatureComplete, 
  onCancel 
}: POFSignatureInterfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setHasSigned(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSigned) return
    
    const signatureData: SignatureData = {
      signature: canvas.toDataURL('image/png'),
      timestamp: new Date(),
      patientName,
      staffWitness: staffName
    }
    
    onSignatureComplete(signatureData)
  }

  // Initialize canvas
  const initCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          Digital Signature Required
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Please sign below to confirm your acceptance of the patient-owned frame liability waiver.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Patient Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>Patient:</strong> {patientName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>Date:</strong> {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Signature Canvas */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Patient Signature *</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <canvas
              ref={(canvas) => {
                canvasRef.current = canvas
                initCanvas(canvas)
              }}
              width={600}
              height={200}
              className="w-full border border-gray-300 rounded bg-white cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-600">
                <PenTool className="h-3 w-3 inline mr-1" />
                Sign above using your mouse or touch screen
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSignature}
                disabled={!hasSigned}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Legal Confirmation */}
        <Alert>
          <FileSignature className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Legal Confirmation</p>
              <p className="text-sm">
                By signing above, I confirm that I have read, understood, and agree to all terms 
                of the Patient-Owned Frame Liability Waiver. I acknowledge that I am using my own 
                frame at my own risk and accept full responsibility for any damage that may occur 
                during the lens installation process.
              </p>
              <p className="text-xs text-muted-foreground">
                Staff Witness: {staffName} | Date: {new Date().toLocaleString()}
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel Process
          </Button>
          <Button 
            onClick={saveSignature}
            disabled={!hasSigned}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete POF Setup
          </Button>
        </div>

        {!hasSigned && (
          <p className="text-sm text-center text-muted-foreground">
            Please sign in the box above to continue
          </p>
        )}
      </CardContent>
    </Card>
  )
}