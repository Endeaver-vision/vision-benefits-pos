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
import { Badge } from '@/components/ui/badge'
import { SignatureCapture } from '@/components/ui/signature-capture'
import { Loader2, Package, PenTool, User, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface MaterialItem {
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
}

interface MaterialsSignatureModalProps {
  isOpen: boolean
  onClose: () => void
  quote: {
    id: string
    customerName: string
    customerEmail?: string
    vehicleInfo: string
    materials: MaterialItem[]
    laborCost: number
    totalCost: number
  }
  onSignatureComplete: (signature: {
    type: 'signature' | 'typed'
    data: string
    signerName: string
    signerEmail?: string
  }) => void
}

export const MaterialsSignatureModal: React.FC<MaterialsSignatureModalProps> = ({
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
      setError('You must agree to the materials and services before signing')
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

  const totalMaterialsCost = quote.materials.reduce((sum, item) => sum + item.totalPrice, 0)
  const grandTotal = totalMaterialsCost + quote.laborCost

  // Group materials by category
  const materialsByCategory = quote.materials.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, MaterialItem[]>)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Materials & Services Authorization
          </DialogTitle>
          <DialogDescription>
            Please review and authorize the materials and services for {quote.vehicleInfo}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'agreement' | 'signature')} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agreement">Review Materials & Services</TabsTrigger>
            <TabsTrigger value="signature" disabled={!canProceedToSignature}>
              Sign Authorization
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="agreement" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Materials & Services Authorization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-muted-foreground mb-4">
                      I authorize Vision Benefits Optical to supply and install the following 
                      materials and perform related services on my vehicle <strong>{quote.vehicleInfo}</strong>:
                    </p>

                    <div className="space-y-6">
                      {Object.entries(materialsByCategory).map(([category, items]) => (
                        <div key={category} className="space-y-3">
                          <h4 className="font-semibold text-base flex items-center gap-2">
                            <Badge variant="outline">{category}</Badge>
                            <span className="text-sm text-muted-foreground">
                              ({items.length} item{items.length !== 1 ? 's' : ''})
                            </span>
                          </h4>
                          
                          <div className="space-y-2">
                            {items.map((item) => (
                              <div key={item.id} className="flex justify-between items-start p-4 bg-muted/50 rounded-lg">
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h5 className="font-medium">{item.name}</h5>
                                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                      {item.partNumber && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Part #: {item.partNumber}
                                        </p>
                                      )}
                                      <div className="flex gap-4 mt-2">
                                        <span className="text-xs text-muted-foreground">
                                          Qty: {item.quantity}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          Unit: ${item.unitPrice.toFixed(2)}
                                        </span>
                                        {item.warrantyPeriod && (
                                          <span className="text-xs text-green-600">
                                            Warranty: {item.warrantyPeriod}
                                          </span>
                                        )}
                                        {item.estimatedDelivery && (
                                          <span className="text-xs text-blue-600 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {item.estimatedDelivery}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="font-medium">${item.totalPrice.toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 mt-6 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Materials Subtotal:</span>
                        <span className="font-medium">${totalMaterialsCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Labor & Installation:</span>
                        <span className="font-medium">${quote.laborCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-semibold border-t pt-2">
                        <span>Total Authorization Amount:</span>
                        <span>${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg mt-4">
                      <h4 className="font-medium text-amber-900 mb-2">Important Terms & Conditions:</h4>
                      <ul className="text-sm text-amber-800 space-y-1">
                        <li>• This authorization covers materials supply and installation services</li>
                        <li>• Materials are subject to availability and delivery schedules</li>
                        <li>• Warranty terms apply as specified for each item</li>
                        <li>• Additional charges may apply for unforeseen complications</li>
                        <li>• You will be contacted before any changes to this authorization</li>
                        <li>• Payment terms: 50% deposit, balance due upon completion</li>
                        <li>• Installation scheduling will be confirmed separately</li>
                      </ul>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg mt-4">
                      <h4 className="font-medium text-green-900 mb-2">Warranty Information:</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• All materials carry manufacturer warranties as specified</li>
                        <li>• Installation work is warranted for 12 months</li>
                        <li>• Warranty service requires presentation of this authorization</li>
                        <li>• Normal wear and tear is not covered under warranty</li>
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
                          I have read and agree to the materials, services, pricing, and terms outlined above. 
                          I authorize Vision Benefits Optical to proceed with the supply and installation 
                          of these materials and understand all associated costs, warranties, and conditions.
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
                      <br />
                      <strong>Authorization Amount:</strong> ${grandTotal.toFixed(2)}
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
                      Complete Materials Authorization
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

export default MaterialsSignatureModal