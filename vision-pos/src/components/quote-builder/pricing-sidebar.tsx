'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useQuoteStore, useQuoteSelectors } from '../../store/quote-store'
import { 
  DollarSign,
  ChevronDown,
  ChevronRight,
  User,
  Eye,
  Glasses,
  Contact
} from 'lucide-react'
import { useState } from 'react'

interface PricingSidebarProps {
  className?: string
}

export function PricingSidebar({ className = '' }: PricingSidebarProps) {
  const { quote, saveQuote, getExamServicesPricing } = useQuoteStore()
  const {
    getTotalEyeglassesCost,
    getTotalContactsCost
  } = useQuoteSelectors()

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']))

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const examPricing = getExamServicesPricing()
  const examTotal = examPricing.subtotal
  const eyeglassesTotal = getTotalEyeglassesCost()
  const contactsTotal = getTotalContactsCost()
  const patientPays = examPricing.patientResponsibility + eyeglassesTotal + contactsTotal

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleSaveQuote = async () => {
    await saveQuote()
  }

  const isQuoteComplete = examTotal > 0 || eyeglassesTotal > 0 || contactsTotal > 0

  return (
    <Card className={`sticky top-6 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <DollarSign className="h-5 w-5 mr-2" />
          Quote Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Patient Info Section */}
        <div>
          <button
            onClick={() => toggleSection('patient')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-sm text-muted-foreground flex items-center">
              <User className="h-4 w-4 mr-1" />
              PATIENT
            </h4>
            {expandedSections.has('patient') ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.has('patient') && (
            <div className="text-sm mt-2 space-y-1">
              <p className="text-muted-foreground">
                <span className="font-medium">Name:</span> {quote.patient.name || 'Not entered'}
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium">Phone:</span> {quote.patient.phone || 'Not entered'}
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium">Insurance:</span> {quote.insurance.carrier || 'Not selected'}
              </p>
              {quote.insurance.planName && (
                <p className="text-muted-foreground">
                  <span className="font-medium">Plan:</span> {quote.insurance.planName}
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Pricing Breakdown */}
        <div>
          <button
            onClick={() => toggleSection('summary')}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-sm text-muted-foreground">PRICING BREAKDOWN</h4>
            {expandedSections.has('summary') ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.has('summary') && (
            <div className="space-y-3 mt-3">
              
              {/* Exam Services */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">Exam Services</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{formatCurrency(examTotal)}</span>
                    {examTotal > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        ✓
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Detailed exam breakdown */}
                {examPricing.services.length > 0 && (
                  <div className="ml-6 space-y-1 text-xs">
                    {examPricing.services.map((service) => (
                      <div key={service.id} className="flex justify-between text-muted-foreground">
                        <span className="capitalize">
                          {service.id.replace(/-/g, ' ')}
                        </span>
                        <div className="flex items-center space-x-2">
                          {service.coverage?.covered && (
                            <span className="text-green-600">
                              ${service.coverage.copay?.toFixed(2)} copay
                            </span>
                          )}
                          <span>${service.price.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                    {examPricing.insuranceApplied > 0 && (
                      <div className="flex justify-between pt-1 border-t border-muted">
                        <span className="text-green-600">Insurance Applied:</span>
                        <span className="text-green-600">-{formatCurrency(examPricing.insuranceApplied)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-muted font-medium">
                      <span>Patient Pays:</span>
                      <span>{formatCurrency(examPricing.patientResponsibility)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Frame & Lenses */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Glasses className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">Frame & Lenses</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{formatCurrency(eyeglassesTotal)}</span>
                  {eyeglassesTotal > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      ✓
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Contact Lenses */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Contact className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">Contact Lenses</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{formatCurrency(contactsTotal)}</span>
                  {contactsTotal > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      ✓
                    </Badge>
                  )}
                </div>
              </div>

              <Separator className="my-3" />

              {/* Subtotal */}
              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{formatCurrency(quote.pricing.subtotal)}</span>
              </div>

              {/* Insurance Coverage */}
              <div className="flex justify-between text-green-600">
                <span>Insurance Coverage</span>
                <span>-{formatCurrency(quote.pricing.insurance.totalCoverage)}</span>
              </div>

              {/* Second Pair Discount */}
              {quote.pricing.secondPairDiscount > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Second Pair Discount</span>
                  <span>-{formatCurrency(quote.pricing.secondPairDiscount)}</span>
                </div>
              )}

              <Separator className="my-3" />

              {/* Patient Responsibility */}
              <div className="flex justify-between text-lg font-bold">
                <span>Patient Pays</span>
                <span className="text-primary">{formatCurrency(patientPays)}</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button 
            className="w-full" 
            size="lg" 
            disabled={!isQuoteComplete}
          >
            Review & Present Quote
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
            onClick={handleSaveQuote}
          >
            Save as Draft
          </Button>
        </div>

        {/* Quote Validity Info */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>Quote valid for 30 days</p>
          {quote.updatedAt && (
            <p>Last updated: {new Date(quote.updatedAt).toLocaleString()}</p>
          )}
        </div>

      </CardContent>
    </Card>
  )
}