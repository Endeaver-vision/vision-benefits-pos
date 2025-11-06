'use client'

import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SignatureCapture } from '@/components/ui/signature-capture'
import { Loader2, FileText, PenTool, User, AlertCircle, CheckCircle } from 'lucide-react'

interface ExamService {
  id: string
  name: string
  description: string
  estimatedTime: string
  price: number
}

interface ExamSignatureModalProps {
  isOpen: boolean
  onClose: () => void
  quote: {
    id: string
    customerName: string
    customerEmail?: string
    vehicleInfo: string
    services: ExamService[]
    totalCost: number
  }
  onSignatureComplete: (signature: {
    type: 'signature' | 'typed'
    data: string
    signerName: string
    signerEmail?: string
  }) => void
}

export const ExamSignatureModal: React.FC<ExamSignatureModalProps> = ({
  isOpen,
  onClose,
  quote,
  onSignatureComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'agreement' | 'signature'>('agreement')
  const [signatureMethod, setSignatureMethod] = useState<'draw' | 'type'>('draw')
  const [signerName, setSignerName] = useState(quote.customerName || '')
  const [signerEmail, setSignerEmail] = useState(quote.customerEmail || '')
  const [typedSignature, setTypedSignature] = useState('')
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false)
  const [signatureData, setSignatureData] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [agreed, setAgreed] = useState(false)

  const handleSignatureChange = useCallback((hasSignature: boolean, dataUrl?: string) => {
    setHasDrawnSignature(hasSignature)
    if (dataUrl) {
      setSignatureData(dataUrl)
    }
    setError('')
  }, [])

  const validateForm = (): boolean => {
    if (!agreed) {
      setError('You must agree to the exam services before signing')
      return false
    }

    if (!signerName.trim()) {
      setError('Signer name is required')
      return false
    }

    if (signatureMethod === 'draw' && !hasDrawnSignature) {
      setError('Please provide a signature')
      return false
    }

    if (signatureMethod === 'type' && !typedSignature.trim()) {
      setError('Please type your name for the signature')
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    setError('')

    try {
      const signature = {
        type: signatureMethod === 'draw' ? 'signature' as const : 'typed' as const,
        data: signatureMethod === 'draw' ? signatureData : typedSignature,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim() || undefined,
      }

      await onSignatureComplete(signature)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedToSignature = agreed && signerName.trim()
  const canSubmit = canProceedToSignature && (
    (signatureMethod === 'draw' && hasDrawnSignature) ||
    (signatureMethod === 'type' && typedSignature.trim())
  )

  const totalExamCost = quote.services.reduce((sum, service) => sum + service.price, 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exam Services Agreement
          </DialogTitle>
          <DialogDescription>
            Please review and sign to authorize the examination services for {quote.vehicleInfo}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'agreement' | 'signature')} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agreement">Review Agreement</TabsTrigger>
            <TabsTrigger value="signature" disabled={!canProceedToSignature}>
              Sign Document
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="agreement" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Examination Services Authorization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-muted-foreground mb-4">
                      I authorize Vision Benefits Optical to perform the following examination services 
                      on my vehicle <strong>{quote.vehicleInfo}</strong>:
                    </p>

                    <div className="space-y-3">
                      {quote.services.map((service) => (
                        <div key={service.id} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{service.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Estimated time: {service.estimatedTime}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-medium">${service.price.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3 mt-4">
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span>Total Examination Cost:</span>
                        <span>${totalExamCost.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg mt-4">
                      <h4 className="font-medium text-blue-900 mb-2">Important Notes:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• This authorization covers examination services only</li>
                        <li>• Additional repairs or materials will require separate authorization</li>
                        <li>• You will be contacted before any additional work begins</li>
                        <li>• Examination findings will be documented and shared with you</li>
                        <li>• Payment is due upon completion of examination services</li>
                      </ul>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signer-name">Your Full Name *</Label>
                        <Input
                          id="signer-name"
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          placeholder="Enter your full legal name"
                          className="max-w-md"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signer-email">Email Address (Optional)</Label>
                        <Input
                          id="signer-email"
                          type="email"
                          value={signerEmail}
                          onChange={(e) => setSignerEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className="max-w-md"
                        />
                      </div>

                      <div className="flex items-start space-x-2">
                        <input
                          type="checkbox"
                          id="agreement-checkbox"
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                          className="mt-1"
                        />
                        <Label htmlFor="agreement-checkbox" className="text-sm leading-5">
                          I have read and agree to the examination services outlined above. 
                          I authorize Vision Benefits Optical to perform these services and 
                          understand the associated costs and terms.
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => setActiveTab('signature')}
                  disabled={!canProceedToSignature}
                >
                  Proceed to Signature
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signature" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PenTool className="h-5 w-5" />
                    Digital Signature
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <Label>Signature Method:</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={signatureMethod === 'draw' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSignatureMethod('draw')}
                      >
                        <PenTool className="h-4 w-4 mr-1" />
                        Draw
                      </Button>
                      <Button
                        variant={signatureMethod === 'type' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSignatureMethod('type')}
                      >
                        <User className="h-4 w-4 mr-1" />
                        Type Name
                      </Button>
                    </div>
                  </div>

                  {signatureMethod === 'draw' ? (
                    <SignatureCapture
                      onSignatureChange={handleSignatureChange}
                      placeholder="Sign your name here"
                      className="mb-4"
                    />
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="typed-signature">Type Your Full Name</Label>
                      <Input
                        id="typed-signature"
                        value={typedSignature}
                        onChange={(e) => setTypedSignature(e.target.value)}
                        placeholder="Type your full name as it appears on legal documents"
                        className="font-serif text-lg"
                      />
                      {typedSignature && (
                        <div className="p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                          <p className="font-serif text-2xl italic text-center">
                            {typedSignature}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Signing as:</strong> {signerName}
                      {signerEmail && (
                        <>
                          <br />
                          <strong>Email:</strong> {signerEmail}
                        </>
                      )}
                    </p>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab('agreement')}>
                  Back to Agreement
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving Signature...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Exam Authorization
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default ExamSignatureModal