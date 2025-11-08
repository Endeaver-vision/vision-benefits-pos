'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText,
  CheckCircle,
  Calculator,
  User,
  Glasses,
  Eye
} from 'lucide-react'
import { useQuoteStore, useQuoteSelectors } from '@/store/quote-store'

interface QuoteReviewProps {
  onEdit?: (section: 'customer' | 'exam-services' | 'eyeglasses' | 'contacts') => void
  onFinalize?: () => void
}

export function QuoteReviewLayer({ onEdit, onFinalize }: QuoteReviewProps) {
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Get actual quote data from store
  const { quote, getExamServicesPricing } = useQuoteStore()
  const { getTotalEyeglassesCost, getTotalContactsCost } = useQuoteSelectors()

  // Calculate totals from actual selections
  const examPricing = getExamServicesPricing()
  const examTotal = examPricing.subtotal
  const eyeglassesTotal = getTotalEyeglassesCost()
  const contactsTotal = getTotalContactsCost()

  const orderSubtotal = examTotal + eyeglassesTotal + contactsTotal
  const tax = orderSubtotal * 0.0875 // 8.75% tax
  const grandTotal = orderSubtotal + tax

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quote Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Review your complete quote below. You can edit any section or proceed to finalize your order.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Exam Services */}
        {examTotal > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Exam Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                ${examTotal.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                {examPricing.services.length} service{examPricing.services.length !== 1 ? 's' : ''} selected
              </div>
              {examPricing.insuranceApplied > 0 && (
                <div className="text-sm text-green-600">
                  Insurance coverage: ${examPricing.insuranceApplied.toFixed(2)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Eyeglasses */}
        {eyeglassesTotal > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Glasses className="h-4 w-4" />
                Eyeglasses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                ${eyeglassesTotal.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                {quote.eyeglasses.frame && 'Frame selected'}
                {quote.eyeglasses.frame && quote.eyeglasses.lenses.type && ' • '}
                {quote.eyeglasses.lenses.type && `${quote.eyeglasses.lenses.type} lenses`}
              </div>
              {quote.eyeglasses.enhancements && quote.eyeglasses.enhancements.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {quote.eyeglasses.enhancements.length} enhancement{quote.eyeglasses.enhancements.length !== 1 ? 's' : ''}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact Lenses */}
        {contactsTotal > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4" />
                Contact Lenses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold text-primary">
                ${contactsTotal.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                {quote.contacts.brand && `${quote.contacts.brand} • `}
                {quote.contacts.type} lenses
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pricing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pricing Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Individual Totals */}
          {examTotal > 0 && (
            <div className="flex justify-between">
              <span>Exam Services:</span>
              <span>${examTotal.toFixed(2)}</span>
            </div>
          )}
          
          {eyeglassesTotal > 0 && (
            <div className="flex justify-between">
              <span>Eyeglasses:</span>
              <span>${eyeglassesTotal.toFixed(2)}</span>
            </div>
          )}
          
          {contactsTotal > 0 && (
            <div className="flex justify-between">
              <span>Contact Lenses:</span>
              <span>${contactsTotal.toFixed(2)}</span>
            </div>
          )}

          <Separator />

          {/* Subtotal */}
          <div className="flex justify-between font-medium">
            <span>Subtotal:</span>
            <span>${orderSubtotal.toFixed(2)}</span>
          </div>

          {/* Insurance */}
          {examPricing.insuranceApplied > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Insurance Coverage:</span>
              <span>-${examPricing.insuranceApplied.toFixed(2)}</span>
            </div>
          )}

          {/* Tax */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tax (8.75%):</span>
            <span>${tax.toFixed(2)}</span>
          </div>

          <Separator />

          {/* Final Total */}
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-primary">${grandTotal.toFixed(2)}</span>
          </div>

          {/* Patient Responsibility */}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Patient Pays:</span>
            <span className="text-primary">
              ${(grandTotal - examPricing.insuranceApplied).toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span className="text-sm">
              I accept the terms and conditions and authorize this quote
            </span>
          </label>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Save Quote
          </Button>
          
          <Button 
            onClick={onFinalize}
            disabled={!termsAccepted || orderSubtotal === 0}
            size="sm"
          >
            Finalize Order
          </Button>
        </div>
      </div>
    </div>
  )
}