'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { SignatureStatusIndicators } from './signature-status-indicators'
import { ExamSignatureModal } from './exam-signature-modal'
import { MaterialsSignatureModal } from './materials-signature-modal'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Eye, User, Calendar, PenTool } from 'lucide-react'

interface SignatureData {
  id: string
  type: 'EXAM' | 'MATERIALS'
  completed: boolean
  signerName?: string
  signerEmail?: string
  timestamp?: Date
  signatureType?: 'signature' | 'typed'
  signatureData?: string
}

interface QuoteData {
  id: string
  customerName: string
  customerEmail?: string
  vehicleInfo: string
  services: Array<{
    id: string
    name: string
    description: string
    estimatedTime: string
    price: number
  }>
  materials: Array<{
    id: string
    name: string
    description: string
    category: string
    partNumber?: string
    quantity: number
    unitPrice: number
    totalPrice: number
    warrantyPeriod?: string
    estimatedDelivery?: string
  }>
  laborCost: number
  totalCost: number
}

interface WorkflowStatus {
  examCompleted: boolean
  materialsCompleted: boolean
  allCompleted: boolean
  nextStep: 'exam' | 'materials' | 'complete'
}

interface SignatureIntegrationProps {
  quote: QuoteData
  onSignatureUpdate?: () => void
  compact?: boolean
  className?: string
}

export const SignatureIntegration: React.FC<SignatureIntegrationProps> = ({
  quote,
  onSignatureUpdate,
  compact = false,
  className = '',
}) => {
  const [signatures, setSignatures] = useState<SignatureData[]>([])
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({
    examCompleted: false,
    materialsCompleted: false,
    allCompleted: false,
    nextStep: 'exam'
  })
  const [showExamModal, setShowExamModal] = useState(false)
  const [showMaterialsModal, setShowMaterialsModal] = useState(false)
  const [viewingSignature, setViewingSignature] = useState<SignatureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Fetch signature status
  const fetchSignatures = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/quotes/${quote.id}/signatures`)
      if (!response.ok) {
        throw new Error('Failed to fetch signatures')
      }

      const data = await response.json()
      
      // Transform API response to component format
      const signatureData: SignatureData[] = data.signatures?.map((sig: {
        id: string
        signatureType: 'EXAM' | 'MATERIALS'
        isValid: boolean
        signerName: string
        signerEmail?: string
        timestamp: string
        signatureData: string
      }) => ({
        id: sig.id,
        type: sig.signatureType,
        completed: sig.isValid,
        signerName: sig.signerName,
        signerEmail: sig.signerEmail,
        timestamp: new Date(sig.timestamp),
        signatureType: sig.signatureData.startsWith('data:') ? 'signature' : 'typed',
        signatureData: sig.signatureData
      })) || []

      setSignatures(signatureData)
      
      // Update workflow status
      const examCompleted = signatureData.some(s => s.type === 'EXAM' && s.completed)
      const materialsCompleted = signatureData.some(s => s.type === 'MATERIALS' && s.completed)
      
      setWorkflowStatus({
        examCompleted,
        materialsCompleted,
        allCompleted: examCompleted && materialsCompleted,
        nextStep: examCompleted ? (materialsCompleted ? 'complete' : 'materials') : 'exam'
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signatures')
    } finally {
      setLoading(false)
    }
  }, [quote.id])

  useEffect(() => {
    fetchSignatures()
  }, [fetchSignatures])

  const handleSignatureComplete = useCallback(async (
    type: 'EXAM' | 'MATERIALS',
    signature: {
      type: 'signature' | 'typed'
      data: string
      signerName: string
      signerEmail?: string
    }
  ) => {
    try {
      setError('')

      const endpoint = type === 'EXAM' ? 'exam' : 'materials'
      const response = await fetch(`/api/quotes/${quote.id}/signatures/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signatureData: signature.data,
          signerName: signature.signerName,
          signerEmail: signature.signerEmail,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save signature')
      }

      // Refresh signatures
      await fetchSignatures()
      onSignatureUpdate?.()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature')
      throw err // Re-throw to let modal handle error display
    }
  }, [quote.id, fetchSignatures, onSignatureUpdate])

  const handleRequestSignature = useCallback((type: 'EXAM' | 'MATERIALS') => {
    if (type === 'EXAM') {
      setShowExamModal(true)
    } else {
      setShowMaterialsModal(true)
    }
  }, [])

  const handleViewSignature = useCallback((signature: SignatureData) => {
    setViewingSignature(signature)
  }, [])

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-32 bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className={className}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SignatureStatusIndicators
        signatures={signatures}
        workflowStatus={workflowStatus}
        onRequestSignature={handleRequestSignature}
        onViewSignature={handleViewSignature}
        compact={compact}
      />

      {/* Exam Signature Modal */}
      <ExamSignatureModal
        isOpen={showExamModal}
        onClose={() => setShowExamModal(false)}
        quote={{
          id: quote.id,
          customerName: quote.customerName,
          customerEmail: quote.customerEmail,
          vehicleInfo: quote.vehicleInfo,
          services: quote.services,
          totalCost: quote.services.reduce((sum, service) => sum + service.price, 0)
        }}
        onSignatureComplete={(signature) => handleSignatureComplete('EXAM', signature)}
      />

      {/* Materials Signature Modal */}
      <MaterialsSignatureModal
        isOpen={showMaterialsModal}
        onClose={() => setShowMaterialsModal(false)}
        quote={{
          id: quote.id,
          customerName: quote.customerName,
          customerEmail: quote.customerEmail,
          vehicleInfo: quote.vehicleInfo,
          materials: quote.materials,
          laborCost: quote.laborCost,
          totalCost: quote.totalCost
        }}
        onSignatureComplete={(signature) => handleSignatureComplete('MATERIALS', signature)}
      />

      {/* Signature Viewer Modal */}
      <Dialog 
        open={!!viewingSignature} 
        onOpenChange={() => setViewingSignature(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              View Signature - {viewingSignature?.type === 'EXAM' ? 'Exam Services' : 'Materials & Services'}
            </DialogTitle>
          </DialogHeader>
          
          {viewingSignature && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Signer:</span>
                  <p className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {viewingSignature.signerName}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Date:</span>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {viewingSignature.timestamp?.toLocaleDateString()} at{' '}
                    {viewingSignature.timestamp?.toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Type:</span>
                  <p className="flex items-center gap-1">
                    <PenTool className="h-3 w-3" />
                    {viewingSignature.signatureType === 'signature' ? 'Hand-drawn' : 'Typed Name'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Status:</span>
                  <Badge variant="default" className="bg-green-500">
                    Valid
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <span className="font-medium text-muted-foreground block mb-2">Signature:</span>
                <div className="border rounded-lg p-4 bg-muted/30 min-h-[120px] flex items-center justify-center">
                  {viewingSignature.signatureType === 'signature' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={viewingSignature.signatureData}
                      alt="Signature"
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <p className="font-serif text-2xl italic text-muted-foreground">
                        {viewingSignature.signerName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">(Typed Signature)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setViewingSignature(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SignatureIntegration