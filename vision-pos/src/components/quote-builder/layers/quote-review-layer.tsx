'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  User,
  Glasses,
  Eye,
  FileText,
  Mail,
  Download,
  CheckCircle,
  Edit,
  Shield,
  Loader2,
  DollarSign,
  Package,
  Percent,
  Check
} from 'lucide-react'
import { useQuotePricingContext } from '@/contexts/quote-pricing-context'
import { useToast } from '@/components/ui/use-toast'

interface QuoteReviewProps {
  onEdit?: (section: 'customer' | 'insurance' | 'exam-services' | 'eyeglasses' | 'contacts') => void
  onFinalize?: () => void
}

export function QuoteReviewLayer({ onEdit, onFinalize }: QuoteReviewProps) {
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [savedQuoteNumber, setSavedQuoteNumber] = useState<string | null>(null)
  const { toast } = useToast()

  // Get real data from pricing context
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
  const contactItems = pricedItems.filter(item => item.category === 'contact')

  // Calculate exam total
  const examTotal = examItems.reduce((sum, item) => sum + item.patientPays, 0)

  // Calculate totals including second pair and contacts
  const secondPairTotal = secondPair?.totalDue || 0
  const contactLensTotal = contactLenses?.totalDue || 0
  const insurancePatientTotal = pricingSummary.patientTotal
  const totalBeforeTax = insurancePatientTotal + secondPairTotal + contactLensTotal

  // Calculate tax (8.75%) - only on optical goods, not contact lenses
  const taxableAmount = insurancePatientTotal + secondPairTotal
  const tax = taxableAmount * 0.0875
  const grandTotal = totalBeforeTax + tax

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handleFinalize = async () => {
    setIsSubmitting(true)
    try {
      // Here you would create an order/transaction in the database
      // For now, we'll just call the onFinalize callback
      if (onFinalize) {
        onFinalize()
      }
    } catch (error) {
      console.error('Error finalizing quote:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Save quote as draft
  const handleSaveDraft = async () => {
    if (!customerId) {
      toast({
        title: 'Customer Required',
        description: 'Please select a customer before saving a quote.',
        variant: 'destructive'
      })
      return
    }

    if (pricedItems.length === 0) {
      toast({
        title: 'No Items',
        description: 'Please add items to the quote before saving.',
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
          examItems: examItems.map(item => ({
            sku: item.sku,
            displayName: item.displayName,
            category: item.category,
            retailPrice: item.retailPrice,
            patientPays: item.patientPays,
            insurancePays: item.insurancePays
          })),
          secondPair: secondPair?.enabled ? secondPair : null,
          contactLenses: contactLenses?.enabled ? contactLenses : null,
          retailTotal: pricingSummary.retailTotal,
          insuranceTotal: pricingSummary.insuranceTotal,
          patientTotal: pricingSummary.patientTotal,
          tax,
          grandTotal
        })
      })

      const data = await response.json()

      if (data.success) {
        setSavedQuoteNumber(data.quote.quoteNumber)
        toast({
          title: 'Quote Saved',
          description: `Quote ${data.quote.quoteNumber} has been saved as a draft.`,
        })
      } else {
        throw new Error(data.error || 'Failed to save quote')
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      toast({
        title: 'Error',
        description: 'Failed to save quote. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSavingDraft(false)
    }
  }

  // Generate PDF (placeholder for now)
  const handleSavePdf = async () => {
    if (pricedItems.length === 0) {
      toast({
        title: 'No Items',
        description: 'Please add items to the quote before generating a PDF.',
        variant: 'destructive'
      })
      return
    }

    setIsGeneratingPdf(true)
    try {
      // TODO: Implement PDF generation
      // For now, show a coming soon message
      await new Promise(resolve => setTimeout(resolve, 500))
      toast({
        title: 'Coming Soon',
        description: 'PDF generation will be available in a future update.',
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Email quote (placeholder for now)
  const handleEmailQuote = async () => {
    if (pricedItems.length === 0) {
      toast({
        title: 'No Items',
        description: 'Please add items to the quote before emailing.',
        variant: 'destructive'
      })
      return
    }

    setIsSendingEmail(true)
    try {
      // TODO: Implement email functionality
      // For now, show a coming soon message
      await new Promise(resolve => setTimeout(resolve, 500))
      toast({
        title: 'Coming Soon',
        description: 'Email quotes will be available in a future update.',
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5" />
            Quote Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-emerald-500/20 border-emerald-400/50">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <AlertDescription className="text-white/80">
              Review your complete quote below. You can edit any section or proceed to checkout.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Customer & Insurance Information */}
      <Card className="glass-card border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="h-5 w-5" />
              Customer & Insurance
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={() => onEdit?.('customer')}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-lg text-white">{customerName || 'No customer selected'}</h4>
            </div>
            <div>
              {authorization ? (
                <div className="space-y-2">
                  <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/50">
                    <Shield className="h-3 w-3 mr-1" />
                    {authorization.carrier.toUpperCase()} Verified
                  </Badge>
                  <div className="text-sm text-white/60">{authorization.planName}</div>
                </div>
              ) : (
                <Badge variant="outline" className="border-white/30 text-white/60">
                  Self-Pay
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exam Services */}
      {examItems.length > 0 && (
        <Card className="glass-card border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Eye className="h-5 w-5" />
                Exam Services
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => onEdit?.('exam-services')}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white/10 rounded-lg space-y-2">
              {examItems.map(item => (
                <div key={item.sku} className="flex justify-between items-center">
                  <span className="text-white/80">{item.displayName}</span>
                  <div className="text-right">
                    {item.insurancePays > 0 && (
                      <div className="text-xs text-white/50 line-through">{formatPrice(item.retailPrice)}</div>
                    )}
                    <span className="font-medium text-white">{formatPrice(item.patientPays)}</span>
                  </div>
                </div>
              ))}
              <Separator className="bg-white/20 my-2" />
              <div className="flex justify-between items-center font-semibold">
                <span className="text-white">Exam Services Total</span>
                <span className="text-white">
                  {formatPrice(examItems.reduce((sum, item) => sum + item.patientPays, 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Eyeglasses Selection */}
      {(frameItems.length > 0 || lensItems.length > 0 || coatingItems.length > 0) && (
        <Card className="glass-card border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Glasses className="h-5 w-5" />
                Eyeglasses
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => onEdit?.('eyeglasses')}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Frames */}
            {frameItems.length > 0 && (
              <div className="p-4 bg-white/10 rounded-lg">
                <h4 className="font-semibold mb-2 text-white">Frame</h4>
                {frameItems.map(item => (
                  <div key={item.sku} className="flex justify-between items-center">
                    <span className="text-white/80">{item.displayName}</span>
                    <div className="text-right">
                      {item.insurancePays > 0 && (
                        <div className="text-xs text-white/50 line-through">{formatPrice(item.retailPrice)}</div>
                      )}
                      <span className="font-medium text-white">{formatPrice(item.patientPays)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lenses */}
            {lensItems.length > 0 && (
              <div className="p-4 bg-white/10 rounded-lg">
                <h4 className="font-semibold mb-2 text-white">Lenses</h4>
                {lensItems.map(item => (
                  <div key={item.sku} className="flex justify-between items-center">
                    <div>
                      <span className="text-white/80">{item.displayName}</span>
                      {item.tierUsed && (
                        <div className="text-xs text-emerald-400">{item.tierUsed}</div>
                      )}
                    </div>
                    <div className="text-right">
                      {item.insurancePays > 0 && (
                        <div className="text-xs text-white/50 line-through">{formatPrice(item.retailPrice)}</div>
                      )}
                      <span className="font-medium text-white">{formatPrice(item.patientPays)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Coatings */}
            {coatingItems.length > 0 && (
              <div className="p-4 bg-white/10 rounded-lg">
                <h4 className="font-semibold mb-2 text-white">Coatings & Enhancements</h4>
                {coatingItems.map(item => (
                  <div key={item.sku} className="flex justify-between items-center">
                    <span className="text-white/80">{item.displayName}</span>
                    <div className="text-right">
                      {item.insurancePays > 0 && (
                        <div className="text-xs text-white/50 line-through">{formatPrice(item.retailPrice)}</div>
                      )}
                      <span className="font-medium text-white">{formatPrice(item.patientPays)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add-ons */}
            {addonItems.length > 0 && (
              <div className="p-4 bg-white/10 rounded-lg">
                <h4 className="font-semibold mb-2 text-white">Add-ons</h4>
                {addonItems.map(item => (
                  <div key={item.sku} className="flex justify-between items-center">
                    <span className="text-white/80">{item.displayName}</span>
                    <span className="font-medium text-white">{formatPrice(item.patientPays)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contact Lenses from Calculator */}
      {contactLenses && contactLenses.enabled && (
        <Card className="glass-card border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Eye className="h-5 w-5" />
                Contact Lenses
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => onEdit?.('contacts')}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white/10 rounded-lg space-y-3">
              {/* Lens Name & Manufacturer */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-white">{contactLenses.lensName}</span>
                  <div className="text-sm text-white/60">{contactLenses.manufacturer}</div>
                </div>
              </div>

              {/* Box Quantities */}
              <div className="flex justify-between text-sm text-white/80">
                <span>Right Eye: {contactLenses.boxesRight} boxes</span>
                <span>Left Eye: {contactLenses.boxesLeft} boxes</span>
              </div>

              <Separator className="bg-white/20" />

              {/* Price Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/80">
                  <span>{contactLenses.boxesRight + contactLenses.boxesLeft} boxes × {formatPrice(contactLenses.pricePerBox)}</span>
                  <span>{formatPrice(contactLenses.subtotal)}</span>
                </div>

                {contactLenses.meetsAnnualSupply && contactLenses.annualSupplyDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Annual Supply Discount
                    </span>
                    <span>-{formatPrice(contactLenses.annualSupplyDiscount)}</span>
                  </div>
                )}

                {contactLenses.insuranceCredit > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Insurance Credit
                    </span>
                    <span>-{formatPrice(contactLenses.insuranceCredit)}</span>
                  </div>
                )}

                {contactLenses.rebate > 0 && (
                  <div className="flex justify-between text-blue-400">
                    <span>Manufacturer Rebate</span>
                    <span>-{formatPrice(contactLenses.rebate)}</span>
                  </div>
                )}
              </div>

              <Separator className="bg-white/20" />

              <div className="flex justify-between font-semibold text-white">
                <span>Contact Lenses Total</span>
                <span>{formatPrice(contactLenses.totalDue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy Contact Lenses (from basic items) */}
      {contactItems.length > 0 && !contactLenses?.enabled && (
        <Card className="glass-card border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Eye className="h-5 w-5" />
                Contact Lenses
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => onEdit?.('contacts')}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white/10 rounded-lg space-y-2">
              {contactItems.map(item => (
                <div key={item.sku} className="flex justify-between items-center">
                  <span className="text-white/80">{item.displayName}</span>
                  <div className="text-right">
                    {item.insurancePays > 0 && (
                      <div className="text-xs text-white/50 line-through">{formatPrice(item.retailPrice)}</div>
                    )}
                    <span className="font-medium text-white">{formatPrice(item.patientPays)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Second Pair (Cash Only) */}
      {secondPair && secondPair.enabled && (
        <Card className="glass-card border-amber-400/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Glasses className="h-5 w-5" />
                Second Pair
                <Badge className="bg-amber-500/30 text-amber-300 border-amber-400/50 ml-2">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Cash Only
                </Badge>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => onEdit?.('eyeglasses')}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-400/30 space-y-3">
              {/* Frame Name */}
              {secondPair.frameName && (
                <div className="font-medium text-white">{secondPair.frameName}</div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-2 text-sm">
                {secondPair.framePrice > 0 && (
                  <div className="flex justify-between text-white/80">
                    <span>Frame</span>
                    <span>{formatPrice(secondPair.framePrice)}</span>
                  </div>
                )}
                {secondPair.lensPrice > 0 && (
                  <div className="flex justify-between text-white/80">
                    <span>Lenses</span>
                    <span>{formatPrice(secondPair.lensPrice)}</span>
                  </div>
                )}
                {secondPair.coatingPrice > 0 && (
                  <div className="flex justify-between text-white/80">
                    <span>Coatings/Add-ons</span>
                    <span>{formatPrice(secondPair.coatingPrice)}</span>
                  </div>
                )}

                <div className="flex justify-between text-white/80">
                  <span>Subtotal</span>
                  <span>{formatPrice(secondPair.subtotal)}</span>
                </div>

                {secondPair.discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      {secondPair.discountType === 'same-day' ? 'Same Day' : '30 Day'} Discount ({secondPair.discountPercent}%)
                    </span>
                    <span>-{formatPrice(secondPair.discountAmount)}</span>
                  </div>
                )}
              </div>

              <Separator className="bg-amber-400/30" />

              <div className="flex justify-between font-semibold text-white">
                <div>
                  <span>Second Pair Total</span>
                  <div className="text-xs text-amber-300 font-normal">Not covered by insurance</div>
                </div>
                <span className="text-lg">{formatPrice(secondPair.totalDue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {pricedItems.length === 0 && (
        <Card className="glass-card border-white/20">
          <CardContent className="py-12 text-center">
            <Glasses className="h-12 w-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Items Selected</h3>
            <p className="text-white/60 mb-4">Add products to your quote to see them here.</p>
            <Button onClick={() => onEdit?.('eyeglasses')} variant="outline" className="border-white/30 text-white">
              Add Eyeglasses
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pricing Summary & Checkout */}
      <Card className="glass-card border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="flex items-center gap-2 border-white/30 text-white hover:bg-white/10"
              onClick={handleSavePdf}
              disabled={isGeneratingPdf || pricedItems.length === 0}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Save as PDF
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 border-white/30 text-white hover:bg-white/10"
              onClick={handleEmailQuote}
              disabled={isSendingEmail || pricedItems.length === 0}
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Email Quote
            </Button>
            <Button
              variant="outline"
              className={`flex items-center gap-2 border-white/30 text-white hover:bg-white/10 ${
                savedQuoteNumber ? 'border-emerald-400/50 bg-emerald-500/10' : ''
              }`}
              onClick={handleSaveDraft}
              disabled={isSavingDraft || pricedItems.length === 0 || !customerId}
            >
              {isSavingDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedQuoteNumber ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {savedQuoteNumber ? `Saved: ${savedQuoteNumber}` : 'Save Draft'}
            </Button>
          </div>

          <Separator className="bg-white/20" />

          {/* Total Summary */}
          <div className="bg-white/10 p-6 rounded-lg">
            {isCalculating ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
                <span className="text-white/70">Calculating...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Exam Services Section */}
                {examItems.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2">
                      <Eye className="h-3 w-3" />
                      Exam Services
                    </div>
                    {examItems.map(item => (
                      <div key={item.sku} className="flex justify-between text-white/80">
                        <span>{item.displayName}</span>
                        <span>{formatPrice(item.patientPays)}</span>
                      </div>
                    ))}
                    <Separator className="bg-white/20" />
                  </>
                )}

                {/* Eyeglasses Section (Insurance Covered) */}
                {pricingSummary.retailTotal > 0 && (
                  <>
                    <div className="text-xs font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2">
                      <Glasses className="h-3 w-3" />
                      Eyeglasses (Primary Pair)
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span>Retail Total</span>
                      <span>{formatPrice(pricingSummary.retailTotal)}</span>
                    </div>
                    {authorization && pricingSummary.insuranceTotal > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Insurance Pays
                        </span>
                        <span>-{formatPrice(pricingSummary.insuranceTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white">
                      <span>Patient Pays</span>
                      <span className="font-semibold">{formatPrice(insurancePatientTotal)}</span>
                    </div>
                    <Separator className="bg-white/20" />
                  </>
                )}

                {/* Contact Lenses Section */}
                {contactLenses && contactLenses.enabled && (
                  <>
                    <div className="text-xs font-semibold text-white/60 uppercase tracking-wide flex items-center gap-2">
                      <Eye className="h-3 w-3" />
                      Contact Lenses
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span>{contactLenses.lensName}</span>
                      <span>{formatPrice(contactLenses.totalDue)}</span>
                    </div>
                    <Separator className="bg-white/20" />
                  </>
                )}

                {/* Second Pair Section (Cash Only) */}
                {secondPair && secondPair.enabled && (
                  <>
                    <div className="text-xs font-semibold text-amber-400 uppercase tracking-wide flex items-center gap-2">
                      <DollarSign className="h-3 w-3" />
                      Second Pair (Cash Only)
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span>{secondPair.frameName || 'Second Pair'}</span>
                      <span>{formatPrice(secondPair.totalDue)}</span>
                    </div>
                    <Separator className="bg-white/20" />
                  </>
                )}

                {/* Tax */}
                <div className="flex justify-between text-white/80">
                  <span>Tax (8.75% on optical goods)</span>
                  <span>{formatPrice(tax)}</span>
                </div>

                <Separator className="bg-white/20" />

                {/* Grand Total */}
                <div className="flex justify-between text-2xl font-bold text-white">
                  <span>Grand Total</span>
                  <span className="text-blue-300">{formatPrice(grandTotal)}</span>
                </div>

                {/* Savings Summary */}
                {(pricingSummary.totalSavings > 0 || (secondPair?.discountAmount || 0) > 0) && (
                  <div className="mt-4 p-3 bg-emerald-500/20 rounded-lg border border-emerald-400/30">
                    <div className="text-sm text-emerald-300 font-semibold mb-2">Total Savings</div>
                    <div className="space-y-1 text-sm">
                      {pricingSummary.totalSavings > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Insurance Savings</span>
                          <span>{formatPrice(pricingSummary.totalSavings)}</span>
                        </div>
                      )}
                      {secondPair && secondPair.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Second Pair Discount</span>
                          <span>{formatPrice(secondPair.discountAmount)}</span>
                        </div>
                      )}
                      {contactLenses && contactLenses.annualSupplyDiscount > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Contact Annual Supply Discount</span>
                          <span>{formatPrice(contactLenses.annualSupplyDiscount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator className="bg-white/20" />

          {/* Terms and Checkout Button */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="terms" className="text-sm text-white/80">
                I accept the terms and conditions and authorize insurance claim processing
              </label>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => onEdit?.('contacts')}
                variant="outline"
                size="lg"
                className="flex-1 border-white/30 text-white hover:bg-white/10"
              >
                Back
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={!termsAccepted || pricedItems.length === 0 || isSubmitting}
                onClick={handleFinalize}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}