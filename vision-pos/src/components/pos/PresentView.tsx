'use client'

import { useState } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  X,
  Glasses,
  Tag,
  Check,
  Sparkles,
  PenTool,
} from 'lucide-react'
import SignatureCapture from './SignatureCapture'

interface PresentViewProps {
  open: boolean
  onClose: () => void
}

export default function PresentView({ open, onClose }: PresentViewProps) {
  const { quote } = usePOSStore()
  const [showSignature, setShowSignature] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)

  // Early return if not open to prevent calculations on undefined data
  if (!open) {
    return null
  }

  const pairs = quote.pairs ?? []
  const lineItems = quote.lineItems ?? []
  const { patient, subtotal = 0, insuranceSavings = 0, discountTotal = 0, tax = 0, total = 0 } = quote

  const handleSignatureComplete = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl)
    setShowSignature(false)
    // TODO: Save signature and proceed to checkout
  }

  // Group items by pair
  const itemsByPair = pairs.map((pair) => ({
    pair,
    items: lineItems.filter((item) => item.pairId === pair.id),
    total: lineItems
      .filter((item) => item.pairId === pair.id)
      .reduce((sum, item) => sum + item.patientPays, 0),
  }))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Your Quote</h1>
              {patient && (
                <p className="text-gray-600 mt-1">
                  Prepared for {patient.firstName} {patient.lastName}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Each pair */}
          {itemsByPair.map(
            ({ pair, items, total: pairTotal }, index) =>
              items.length > 0 && (
                <div key={pair.id}>
                  {/* Pair header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        'bg-blue-100 text-blue-600'
                      )}
                    >
                      <Glasses className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">{pair.label}</h2>
                      {index === 1 && (
                        <Badge className="bg-green-100 text-green-700 text-xs mt-1">
                          20% Second Pair Discount Applied
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.note && (
                              <p className="text-sm text-gray-500">{item.note}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {item.insurancePays > 0 ? (
                            <>
                              <p className="font-semibold text-green-600">
                                ${item.patientPays.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-400 line-through">
                                ${item.retailPrice.toFixed(2)}
                              </p>
                            </>
                          ) : (
                            <p className="font-medium">
                              ${item.patientPays.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    <Separator className="my-2" />

                    <div className="flex justify-between font-medium">
                      <span>{pair.label} Subtotal</span>
                      <span>${pairTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )
          )}

          {/* Savings callout */}
          {insuranceSavings > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <Sparkles className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-800 font-medium text-lg">
                You're saving ${insuranceSavings.toFixed(2)} with your insurance!
              </p>
            </div>
          )}

          {/* Totals */}
          <div className="bg-gray-100 rounded-xl p-6">
            <div className="space-y-2">
              {/* Retail */}
              <div className="flex justify-between text-gray-600">
                <span>Retail Value</span>
                <span>
                  $
                  {lineItems
                    .reduce((sum, item) => sum + item.retailPrice, 0)
                    .toFixed(2)}
                </span>
              </div>

              {/* Insurance savings */}
              {insuranceSavings > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Insurance Savings
                  </span>
                  <span>-${insuranceSavings.toFixed(2)}</span>
                </div>
              )}

              {/* Discounts */}
              {discountTotal > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Discounts</span>
                  <span>-${discountTotal.toFixed(2)}</span>
                </div>
              )}

              {/* Subtotal */}
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              {/* Tax */}
              <div className="flex justify-between text-gray-600">
                <span>Tax (8.75%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>

              <Separator className="my-3" />

              {/* Total */}
              <div className="flex justify-between text-2xl font-bold">
                <span>Your Total</span>
                <span className="text-green-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Signature Section */}
          {showSignature ? (
            <div className="bg-gray-50 rounded-xl p-6">
              <SignatureCapture
                onSignatureComplete={handleSignatureComplete}
                width={500}
                height={200}
              />
              <div className="mt-4 text-center">
                <Button
                  variant="ghost"
                  onClick={() => setShowSignature(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : signatureDataUrl ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-800 font-medium">
                Signature captured successfully
              </p>
              <img
                src={signatureDataUrl}
                alt="Customer signature"
                className="mx-auto mt-2 border border-green-200 rounded bg-white"
                style={{ maxWidth: 200, height: 'auto' }}
              />
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Go Back
            </Button>
            {!signatureDataUrl ? (
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowSignature(true)}
              >
                <PenTool className="h-4 w-4 mr-2" />
                Sign to Confirm
              </Button>
            ) : (
              <Button className="flex-1 bg-green-600 hover:bg-green-700">
                Proceed to Checkout
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
