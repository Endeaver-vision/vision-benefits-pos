'use client'

import React, { useState } from 'react'
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import { QuotePDFTemplate, QuoteData, defaultQuoteData } from './quote-pdf-template'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Download, 
  Eye, 
  Mail, 
  Printer, 
  FileText, 
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react'

interface QuotePDFGeneratorProps {
  quote: Partial<QuoteData>
  onEmailSent?: () => void
  onPrintComplete?: () => void
}

export function QuotePDFGenerator({ quote, onEmailSent, onPrintComplete }: QuotePDFGeneratorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [isEmailSending, setIsEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  // Merge quote data with defaults
  const completeQuote: QuoteData = {
    id: quote.id || 'temp-quote',
    quoteNumber: quote.quoteNumber || 'QT-' + Date.now(),
    date: quote.date || new Date().toLocaleDateString(),
    expirationDate: quote.expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    customer: {
      name: quote.customer?.name || 'John Doe',
      email: quote.customer?.email || 'customer@example.com',
      phone: quote.customer?.phone || '(555) 000-0000',
      address: {
        street: quote.customer?.address?.street || '123 Main St',
        city: quote.customer?.address?.city || 'Anytown',
        state: quote.customer?.address?.state || 'ST',
        zipCode: quote.customer?.address?.zipCode || '12345'
      }
    },
    insurance: quote.insurance,
    items: quote.items || [],
    pricing: {
      subtotal: quote.pricing?.subtotal || 0,
      discounts: quote.pricing?.discounts || 0,
      tax: quote.pricing?.tax || 0,
      insuranceCoverage: quote.pricing?.insuranceCoverage || 0,
      total: quote.pricing?.total || 0,
      amountDue: quote.pricing?.amountDue || 0
    },
    specialFeatures: quote.specialFeatures,
    terms: quote.terms || defaultQuoteData.terms || [],
    staff: quote.staff || defaultQuoteData.staff || { name: 'Staff Member', title: 'Optician' },
    location: quote.location || defaultQuoteData.location || {
      name: 'Vision Center',
      address: '123 Vision St',
      phone: '(555) 123-4567',
      email: 'info@visioncenter.com'
    }
  }

  const handleEmailQuote = async () => {
    setIsEmailSending(true)
    try {
      // Simulate email sending - would integrate with actual email service
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Call API to send email
      const response = await fetch(`/api/quotes/${completeQuote.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: completeQuote.customer.email,
          subject: `Quote ${completeQuote.quoteNumber} from ${completeQuote.location.name}`,
          includeAttachment: true
        })
      })
      
      if (response.ok) {
        setEmailSent(true)
        onEmailSent?.()
        setTimeout(() => setEmailSent(false), 5000)
      }
    } catch (error) {
      console.error('Failed to send email:', error)
    } finally {
      setIsEmailSending(false)
    }
  }

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      // Trigger browser print dialog
      window.print()
      onPrintComplete?.()
    } catch (error) {
      console.error('Print failed:', error)
    } finally {
      setIsPrinting(false)
    }
  }

  const fileName = `Quote_${completeQuote.quoteNumber}_${completeQuote.customer.name.replace(/\s+/g, '_')}.pdf`

  return (
    <div className="space-y-6">
      {/* Quote Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quote Summary
          </CardTitle>
          <CardDescription>
            Quote #{completeQuote.quoteNumber} for {completeQuote.customer.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date Created</p>
              <p className="font-medium">{completeQuote.date}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expires</p>
              <p className="font-medium">{completeQuote.expirationDate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-medium text-lg">${completeQuote.pricing.total.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="font-medium text-lg text-blue-600">${completeQuote.pricing.amountDue.toFixed(2)}</p>
            </div>
          </div>

          {/* Quote Items Preview */}
          <div className="space-y-2">
            <h4 className="font-medium">Items ({completeQuote.items.length})</h4>
            <div className="space-y-1">
              {completeQuote.items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.description}</span>
                  <span>${item.total.toFixed(2)}</span>
                </div>
              ))}
              {completeQuote.items.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  +{completeQuote.items.length - 3} more items
                </p>
              )}
            </div>
          </div>

          {/* Special Features */}
          {completeQuote.specialFeatures && completeQuote.specialFeatures.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Special Features</h4>
              <div className="flex flex-wrap gap-2">
                {completeQuote.specialFeatures.map((feature, index) => (
                  <Badge key={index} variant="secondary">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Actions */}
      <Card>
        <CardHeader>
          <CardTitle>PDF Actions</CardTitle>
          <CardDescription>
            Generate, preview, and share your professional quote
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Preview Button */}
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant={showPreview ? "default" : "outline"}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Hide Preview' : 'Preview PDF'}
            </Button>

            {/* Download Button */}
            <PDFDownloadLink
              document={<QuotePDFTemplate quote={completeQuote} />}
              fileName={fileName}
              className="w-full"
            >
              {({ loading }) => (
                <Button variant="outline" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Generating...' : 'Download PDF'}
                </Button>
              )}
            </PDFDownloadLink>

            {/* Email Button */}
            <Button
              onClick={handleEmailQuote}
              variant="outline"
              className="w-full"
              disabled={isEmailSending}
            >
              {isEmailSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : emailSent ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {isEmailSending ? 'Sending...' : emailSent ? 'Sent!' : 'Email Quote'}
            </Button>

            {/* Print Button */}
            <Button
              onClick={handlePrint}
              variant="outline"
              className="w-full"
              disabled={isPrinting}
            >
              {isPrinting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              {isPrinting ? 'Printing...' : 'Print Quote'}
            </Button>
          </div>

          {/* Status Messages */}
          {emailSent && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Quote successfully emailed to {completeQuote.customer.email}
              </AlertDescription>
            </Alert>
          )}

          {completeQuote.items.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No items in quote. Add items to generate a complete quote PDF.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* PDF Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>PDF Preview</CardTitle>
            <CardDescription>
              Live preview of your quote PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
              <PDFViewer width="100%" height="100%">
                <QuotePDFTemplate quote={completeQuote} />
              </PDFViewer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper function to create sample quote data for testing
export function createSampleQuote(): Partial<QuoteData> {
  return {
    id: 'sample-quote-001',
    quoteNumber: 'QT-2024-1001',
    date: new Date().toLocaleDateString(),
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    customer: {
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      address: {
        street: '456 Oak Avenue',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701'
      }
    },
    insurance: {
      provider: 'VSP',
      memberId: 'VSP123456789',
      groupNumber: 'GRP001',
      planType: 'Choice Plan',
      benefits: {
        frameAllowance: 150.00,
        lensAllowance: 200.00,
        examCovered: true
      }
    },
    items: [
      {
        id: 'item-1',
        type: 'exam',
        description: 'Comprehensive Eye Exam',
        details: 'Complete vision and health assessment',
        quantity: 1,
        unitPrice: 125.00,
        discount: 0,
        total: 125.00
      },
      {
        id: 'item-2',
        type: 'eyeglasses',
        description: 'Oakley Titanium Frame',
        details: 'Model: OX5038-0354, Color: Satin Black',
        quantity: 1,
        unitPrice: 280.00,
        discount: 150.00,
        total: 130.00
      },
      {
        id: 'item-3',
        type: 'eyeglasses',
        description: 'Varilux Progressive Lenses',
        details: 'Anti-reflective coating, Blue light filter',
        quantity: 1,
        unitPrice: 394.00,
        discount: 200.00,
        total: 194.00
      }
    ],
    pricing: {
      subtotal: 799.00,
      discounts: 350.00,
      tax: 35.92,
      insuranceCoverage: 350.00,
      total: 484.92,
      amountDue: 134.92
    },
    specialFeatures: [
      'Progressive Lens Technology',
      'Blue Light Protection',
      'Anti-Reflective Coating',
      'VSP Insurance Applied'
    ]
  }
}