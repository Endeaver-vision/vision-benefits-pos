'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Glasses,
  FileText,
  Mail,
  CheckCircle,
  Shield,
  Loader2,
  Printer,
  Save,
  ArrowLeft
} from 'lucide-react'
import { useQuotePricingContext } from '@/contexts/quote-pricing-context'
import { useToast } from '@/components/ui/use-toast'
import { QuoteReceipt } from '../QuoteReceipt'

interface QuoteReviewProps {
  onEdit?: (section: 'customer' | 'insurance' | 'exam-services' | 'eyeglasses' | 'second-pair' | 'contacts') => void
  onFinalize?: () => void
  onBack?: () => void
}

export function QuoteReviewLayer({ onEdit, onFinalize, onBack }: QuoteReviewProps) {
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [savedQuoteNumber, setSavedQuoteNumber] = useState<string | null>(null)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const {
    customerName,
    customerId,
    authorization,
    pricedItems,
    pricingSummary,
    secondPair,
    contactLenses,
    isCalculating
  } = useQuotePricingContext()

  // Group items by category
  const frameItems = pricedItems.filter(item => item.category === 'frame')
  const lensItems = pricedItems.filter(item => item.category === 'lens')
  const coatingItems = pricedItems.filter(item => item.category === 'coating')
  const addonItems = pricedItems.filter(item => item.category === 'addon')
  const examItems = pricedItems.filter(item => item.category === 'exam')

  // Calculate totals by category
  // Calculate eyeglasses total (frames + lenses + coatings + addons only)
  const eyeglassesItems = [...frameItems, ...lensItems, ...coatingItems, ...addonItems]
  const eyeglassesPatientTotal = eyeglassesItems.reduce((sum, item) => sum + item.patientPays, 0)
  const eyeglassesInsuranceTotal = eyeglassesItems.reduce((sum, item) => sum + item.insurancePays, 0)

  // Calculate exam total separately
  const examPatientTotal = examItems.reduce((sum, item) => sum + item.patientPays, 0)

  const secondPairTotal = secondPair?.totalDue || 0
  const contactLensTotal = contactLenses?.totalDue || 0

  // Grand total = exams + eyeglasses + second pair + contacts
  // No tax - medical devices and services are tax exempt
  const grandTotal = examPatientTotal + eyeglassesPatientTotal + secondPairTotal + contactLensTotal

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handleFinalize = async () => {
    if (!customerId) {
      toast({
        title: 'Customer Required',
        description: 'Please select a customer before completing the order.',
        variant: 'destructive'
      })
      return
    }

    if (pricedItems.length === 0 && !secondPair?.enabled && !contactLenses?.enabled) {
      toast({
        title: 'No Items',
        description: 'Please add items to the quote before completing.',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    try {
      const saveResponse = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          authorizationId: authorization?.id,
          items: pricedItems.map(item => ({
            sku: item.sku,
            displayName: item.displayName,
            category: item.category,
            retailPrice: item.retailPrice,
            patientPays: item.patientPays,
            insurancePays: item.insurancePays,
            quantity: item.quantity || 1,
            tierUsed: item.tierUsed,
            notes: item.notes
          })),
          secondPair: secondPair?.enabled ? secondPair : null,
          contactLenses: contactLenses?.enabled ? contactLenses : null,
          retailTotal: pricingSummary.retailTotal,
          insuranceTotal: pricingSummary.insuranceTotal,
          patientTotal: pricingSummary.patientTotal,
          tax: 0,  // Medical devices/services are tax exempt
          grandTotal
        })
      })

      const saveData = await saveResponse.json()
      if (!saveData.success) {
        throw new Error(saveData.error || 'Failed to save quote')
      }

      const quoteId = saveData.quote.id

      const convertResponse = await fetch(`/api/quotes/${quoteId}/convert-to-order`, {
        method: 'POST'
      })

      const convertData = await convertResponse.json()
      if (!convertData.success) {
        throw new Error(convertData.error || 'Failed to convert to order')
      }

      toast({
        title: 'Order Complete!',
        description: `Order ${convertData.order.orderNumber} has been created.`,
      })

      if (onFinalize) {
        onFinalize()
      }
    } catch (error) {
      console.error('Error finalizing quote:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete order.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!customerId) {
      toast({
        title: 'Customer Required',
        description: 'Please select a customer before saving.',
        variant: 'destructive'
      })
      return
    }

    setIsSavingDraft(true)
    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          authorizationId: authorization?.id,
          items: pricedItems.map(item => ({
            sku: item.sku,
            displayName: item.displayName,
            category: item.category,
            retailPrice: item.retailPrice,
            patientPays: item.patientPays,
            insurancePays: item.insurancePays,
            quantity: item.quantity || 1,
            tierUsed: item.tierUsed,
            notes: item.notes
          })),
          secondPair: secondPair?.enabled ? secondPair : null,
          contactLenses: contactLenses?.enabled ? contactLenses : null,
          retailTotal: pricingSummary.retailTotal,
          insuranceTotal: pricingSummary.insuranceTotal,
          patientTotal: pricingSummary.patientTotal,
          tax: 0,  // Medical devices/services are tax exempt
          grandTotal
        })
      })

      const data = await response.json()
      if (data.success) {
        setSavedQuoteNumber(data.quote.quoteNumber)
        toast({
          title: 'Quote Saved',
          description: `Quote ${data.quote.quoteNumber} saved.`,
        })
      } else {
        throw new Error(data.error || 'Failed to save quote')
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      toast({
        title: 'Error',
        description: 'Failed to save quote.',
        variant: 'destructive'
      })
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handlePrint = () => {
    setShowPrintPreview(true)
  }

  const triggerPrint = () => {
    if (receiptRef.current) {
      const printContents = receiptRef.current.innerHTML
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Quote Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              table { border-collapse: collapse; width: 100%; }
              th, td { padding: 8px; text-align: left; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .text-green-700 { color: #15803d; }
              .text-gray-600 { color: #4b5563; }
              .border-b { border-bottom: 1px solid #e5e7eb; }
              .border-t { border-top: 1px solid #e5e7eb; }
              @media print {
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>${printContents}</body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    }
    setShowPrintPreview(false)
  }

  const handleEmailQuote = async () => {
    setIsSendingEmail(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      toast({
        title: 'Coming Soon',
        description: 'Email quotes will be available in a future update.',
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const hasItems = pricedItems.length > 0 || secondPair?.enabled || contactLenses?.enabled

  return (
    <div className="space-y-6">
      {/* Header with Customer Info */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 border-white/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{customerName || 'No Customer Selected'}</h2>
                {authorization ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/50">
                      <Shield className="h-3 w-3 mr-1" />
                      {authorization.carrier.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-white/60">{authorization.planName}</span>
                  </div>
                ) : (
                  <Badge variant="outline" className="border-amber-400/50 text-amber-300 mt-1">
                    Cash Pay
                  </Badge>
                )}
              </div>
            </div>
            {savedQuoteNumber && (
              <Badge className="bg-blue-500/30 text-blue-300 border-blue-400/50">
                Quote #{savedQuoteNumber}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Quote Details */}
      <Card className="border-white/20">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5" />
            Quote Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isCalculating ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              <span className="ml-3 text-white/70">Calculating...</span>
            </div>
          ) : !hasItems ? (
            <div className="py-12 text-center">
              <Glasses className="h-12 w-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Items Selected</h3>
              <p className="text-white/60 mb-4">Add products to see your quote.</p>
              <Button onClick={() => onEdit?.('eyeglasses')} variant="outline">
                Add Eyeglasses
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {/* Exam Services - First */}
              {examItems.length > 0 && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Exam Services</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit?.('exam-services')}
                      className="text-white/60 hover:text-white"
                    >
                      Edit
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {examItems.map(item => (
                      <div key={item.sku} className="flex justify-between items-center py-2">
                        <span className="text-white">{item.displayName}</span>
                        <div className="text-right">
                          {item.insurancePays > 0 && (
                            <span className="text-xs text-white/40 line-through mr-2">{formatPrice(item.retailPrice)}</span>
                          )}
                          <span className="font-medium text-white">{formatPrice(item.patientPays)}</span>
                        </div>
                      </div>
                    ))}

                    {/* Exam Services Subtotal */}
                    {examItems.length > 1 && (
                      <div className="flex justify-between items-center pt-3 border-t border-white/10">
                        <span className="font-medium text-white">Exam Services Subtotal</span>
                        <span className="font-bold text-white">{formatPrice(examPatientTotal)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Primary Pair - Eyeglasses */}
              {(frameItems.length > 0 || lensItems.length > 0 || coatingItems.length > 0 || addonItems.length > 0) && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Glasses className="h-4 w-4 text-blue-400" />
                      Primary Eyeglasses
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit?.('eyeglasses')}
                      className="text-white/60 hover:text-white"
                    >
                      Edit
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {/* Frame */}
                    {frameItems.map(item => (
                      <div key={item.sku} className="flex justify-between items-center py-2">
                        <div>
                          <span className="text-white">{item.displayName}</span>
                          {item.tierUsed && (
                            <span className="ml-2 text-xs text-emerald-400">({item.tierUsed})</span>
                          )}
                        </div>
                        <div className="text-right">
                          {item.insurancePays > 0 && (
                            <span className="text-xs text-white/40 line-through mr-2">{formatPrice(item.retailPrice)}</span>
                          )}
                          <span className="font-medium text-white">{formatPrice(item.patientPays)}</span>
                        </div>
                      </div>
                    ))}

                    {/* Lenses */}
                    {lensItems.map(item => (
                      <div key={item.sku} className="flex justify-between items-center py-2">
                        <div>
                          <span className="text-white">{item.displayName}</span>
                          {item.tierUsed && (
                            <span className="ml-2 text-xs text-emerald-400">({item.tierUsed})</span>
                          )}
                        </div>
                        <div className="text-right">
                          {item.insurancePays > 0 && (
                            <span className="text-xs text-white/40 line-through mr-2">{formatPrice(item.retailPrice)}</span>
                          )}
                          <span className="font-medium text-white">{formatPrice(item.patientPays)}</span>
                        </div>
                      </div>
                    ))}

                    {/* Coatings */}
                    {coatingItems.map(item => (
                      <div key={item.sku} className="flex justify-between items-center py-2">
                        <div>
                          <span className="text-white">{item.displayName}</span>
                          {item.tierUsed && (
                            <span className="ml-2 text-xs text-emerald-400">({item.tierUsed})</span>
                          )}
                        </div>
                        <div className="text-right">
                          {item.insurancePays > 0 && (
                            <span className="text-xs text-white/40 line-through mr-2">{formatPrice(item.retailPrice)}</span>
                          )}
                          <span className="font-medium text-white">{formatPrice(item.patientPays)}</span>
                        </div>
                      </div>
                    ))}

                    {/* Addons */}
                    {addonItems.map(item => (
                      <div key={item.sku} className="flex justify-between items-center py-2">
                        <span className="text-white">{item.displayName}</span>
                        <span className="font-medium text-white">{formatPrice(item.patientPays)}</span>
                      </div>
                    ))}

                    {/* Subtotal */}
                    <div className="flex justify-between items-center pt-3 border-t border-white/10">
                      <span className="font-medium text-white">Primary Pair Subtotal</span>
                      <span className="font-bold text-white">{formatPrice(eyeglassesPatientTotal)}</span>
                    </div>

                    {eyeglassesInsuranceTotal > 0 && (
                      <div className="flex justify-between items-center text-emerald-400 text-sm">
                        <span>Insurance Covered</span>
                        <span>-{formatPrice(eyeglassesInsuranceTotal)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Second Pair */}
              {secondPair?.enabled && (
                <div className="p-6 bg-amber-500/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Glasses className="h-4 w-4 text-amber-400" />
                      Second Pair
                      <Badge className="bg-amber-500/30 text-amber-300 border-amber-400/50 text-xs">
                        {secondPair.discountPercent}% Off
                      </Badge>
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit?.('second-pair')}
                      className="text-white/60 hover:text-white"
                    >
                      Edit
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {/* Show individual line items if available */}
                    {secondPair.lineItems && secondPair.lineItems.length > 0 ? (
                      secondPair.lineItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2">
                          <span className="text-white">{item.name}</span>
                          <span className="text-white/60">{formatPrice(item.price)}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        {secondPair.frameName && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-white">{secondPair.frameName}</span>
                            <span className="text-white/60">{formatPrice(secondPair.framePrice)}</span>
                          </div>
                        )}
                        {secondPair.lensPrice > 0 && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-white">Lenses & Material</span>
                            <span className="text-white/60">{formatPrice(secondPair.lensPrice)}</span>
                          </div>
                        )}
                        {secondPair.coatingPrice > 0 && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-white">Coatings & Add-ons</span>
                            <span className="text-white/60">{formatPrice(secondPair.coatingPrice)}</span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex justify-between items-center py-2 text-white/60 border-t border-white/10 mt-2 pt-2">
                      <span>Subtotal</span>
                      <span>{formatPrice(secondPair.subtotal)}</span>
                    </div>

                    {secondPair.discountAmount > 0 && (
                      <div className="flex justify-between items-center py-2 text-emerald-400">
                        <span>{secondPair.discountType === 'same-day' ? 'Same Day' : '30 Day'} Discount</span>
                        <span>-{formatPrice(secondPair.discountAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-amber-400/20">
                      <span className="font-medium text-white">Second Pair Total</span>
                      <span className="font-bold text-amber-400">{formatPrice(secondPair.totalDue)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Lenses */}
              {contactLenses?.enabled && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Contact Lenses</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit?.('contacts')}
                      className="text-white/60 hover:text-white"
                    >
                      Edit
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <span className="text-white">{contactLenses.lensName}</span>
                        <div className="text-xs text-white/60">{contactLenses.manufacturer}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-2 text-white/70 text-sm">
                      <span>
                        {contactLenses.boxesRight + contactLenses.boxesLeft} boxes
                        ({contactLenses.boxesRight}R / {contactLenses.boxesLeft}L)
                      </span>
                      <span>{formatPrice(contactLenses.subtotal)}</span>
                    </div>

                    {contactLenses.annualSupplyDiscount > 0 && (
                      <div className="flex justify-between items-center py-2 text-emerald-400 text-sm">
                        <span>Annual Supply Discount</span>
                        <span>-{formatPrice(contactLenses.annualSupplyDiscount)}</span>
                      </div>
                    )}

                    {contactLenses.insuranceCredit > 0 && (
                      <div className="flex justify-between items-center py-2 text-emerald-400 text-sm">
                        <span>Insurance Credit</span>
                        <span>-{formatPrice(contactLenses.insuranceCredit)}</span>
                      </div>
                    )}

                    {contactLenses.rebate > 0 && (
                      <div className="flex justify-between items-center py-2 text-blue-400 text-sm">
                        <span>Manufacturer Rebate</span>
                        <span>-{formatPrice(contactLenses.rebate)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-white/10">
                      <span className="font-medium text-white">Contact Lenses Total</span>
                      <span className="font-bold text-white">{formatPrice(contactLenses.totalDue)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Total */}
      {hasItems && (
        <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-400/30">
          <CardContent className="p-6">
            <div className="space-y-3">
              {/* Line items summary - Order: Exam, Eyeglasses, Second Pair, Contact Lenses */}
              <div className="space-y-2 text-sm">
                {examPatientTotal > 0 && (
                  <div className="flex justify-between text-white/80">
                    <span>Exam Services</span>
                    <span>{formatPrice(examPatientTotal)}</span>
                  </div>
                )}
                {eyeglassesPatientTotal > 0 && (
                  <div className="flex justify-between text-white/80">
                    <span>Primary Eyeglasses</span>
                    <span>{formatPrice(eyeglassesPatientTotal)}</span>
                  </div>
                )}
                {secondPair?.enabled && (
                  <div className="flex justify-between text-white/80">
                    <span>Second Pair</span>
                    <span>{formatPrice(secondPairTotal)}</span>
                  </div>
                )}
                {contactLenses?.enabled && (
                  <div className="flex justify-between text-white/80">
                    <span>Contact Lenses</span>
                    <span>{formatPrice(contactLensTotal)}</span>
                  </div>
                )}
              </div>

              <Separator className="bg-white/20" />

              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-white">Total Due</span>
                <span className="text-3xl font-bold text-blue-300">{formatPrice(grandTotal)}</span>
              </div>

              {/* Savings callout */}
              {(pricingSummary.totalSavings > 0 || (secondPair?.discountAmount || 0) > 0) && (
                <div className="mt-4 p-3 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-300 font-medium">Total Savings</span>
                    <span className="text-emerald-300 font-bold">
                      {formatPrice(
                        pricingSummary.totalSavings +
                        (secondPair?.discountAmount || 0) +
                        (contactLenses?.annualSupplyDiscount || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="border-white/20">
        <CardContent className="p-6 space-y-4">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={!hasItems}
              className="border-white/30 text-white hover:bg-white/10"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleEmailQuote}
              disabled={isSendingEmail || !hasItems}
              className="border-white/30 text-white hover:bg-white/10"
            >
              {isSendingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Email
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || !hasItems || !customerId}
              className={`border-white/30 text-white hover:bg-white/10 ${savedQuoteNumber ? 'border-emerald-400/50' : ''}`}
            >
              {isSavingDraft ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {savedQuoteNumber ? 'Saved' : 'Save Draft'}
            </Button>
          </div>

          <Separator className="bg-white/20" />

          {/* Terms */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="rounded border-white/30 bg-white/10"
            />
            <label htmlFor="terms" className="text-sm text-white/80">
              I accept the terms and authorize insurance claim processing
            </label>
          </div>

          {/* Main Actions */}
          <div className="flex gap-3">
            {onBack && (
              <Button
                onClick={onBack}
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              className="flex-1"
              size="lg"
              disabled={!termsAccepted || !hasItems || isSubmitting || !customerId}
              onClick={handleFinalize}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Order - {formatPrice(grandTotal)}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-gray-100 p-4 flex justify-between items-center border-b">
              <h3 className="font-bold text-lg text-gray-800">Print Preview</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
                  Cancel
                </Button>
                <Button onClick={triggerPrint} className="bg-blue-600 hover:bg-blue-700">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
            <QuoteReceipt
              ref={receiptRef}
              customerName={customerName || 'Customer'}
              quoteNumber={savedQuoteNumber || undefined}
              carrier={authorization?.carrier}
              planName={authorization?.planName}
              items={pricedItems.filter(item => item.category !== 'exam')}
              examItems={examItems}
              secondPair={secondPair?.enabled ? secondPair : null}
              contactLenses={contactLenses?.enabled ? contactLenses : null}
              retailTotal={pricingSummary.retailTotal}
              insuranceTotal={pricingSummary.insuranceTotal}
              patientTotal={pricingSummary.patientTotal}
              tax={0}
              grandTotal={grandTotal}
            />
          </div>
        </div>
      )}
    </div>
  )
}
