'use client'

import { useQuotePricingContext } from '@/contexts/quote-pricing-context'
import { DollarSign, TrendingDown, Shield, Loader2, FileText, Calculator } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface FloatingPriceSummaryProps {
  className?: string
}

export function FloatingPriceSummary({ className = '' }: FloatingPriceSummaryProps) {
  const {
    pricingSummary,
    isCalculating,
    pricedItems,
    secondPair,
    contactLenses,
    useSavedPriceList,
    activePriceListVersion,
  } = useQuotePricingContext()

  // Calculate total including second pair and contacts (which are tracked separately)
  const secondPairTotal = secondPair?.enabled ? secondPair.totalDue : 0
  const contactsTotal = contactLenses?.enabled ? contactLenses.totalDue : 0

  const totalPatientPays = pricingSummary.patientTotal + secondPairTotal + contactsTotal
  const totalRetail = pricingSummary.retailTotal + (secondPair?.enabled ? secondPair.subtotal : 0) + (contactLenses?.enabled ? contactLenses.subtotal : 0)
  const totalSavings = totalRetail - totalPatientPays

  // Don't show if no items
  const hasItems = pricedItems.length > 0 || secondPair?.enabled || contactLenses?.enabled
  if (!hasItems) return null

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 ${className}`}>
      {/* Gradient overlay for visual separation */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent h-8 -top-8 pointer-events-none" />

      <div className="bg-gray-900/95 backdrop-blur-sm border-t border-white/20 shadow-lg">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left side - Item count and pricing source */}
            <div className="flex items-center gap-4">
              <div className="text-white/70 text-sm">
                <span className="font-medium text-white">{pricedItems.length}</span> items
                {secondPair?.enabled && <span className="ml-2">+ second pair</span>}
                {contactLenses?.enabled && <span className="ml-2">+ contacts</span>}
              </div>

              {/* Pricing source indicator */}
              {useSavedPriceList && activePriceListVersion ? (
                <Badge variant="outline" className="border-blue-400/50 text-blue-300 gap-1">
                  <FileText className="h-3 w-3" />
                  {activePriceListVersion.versionLabel}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-white/30 text-white/60 gap-1">
                  <Calculator className="h-3 w-3" />
                  Live Pricing
                </Badge>
              )}
            </div>

            {/* Right side - Price totals */}
            <div className="flex items-center gap-6">
              {/* Insurance Pays */}
              <div className="text-center">
                <div className="text-xs text-white/50 uppercase tracking-wide flex items-center justify-center gap-1">
                  <Shield className="h-3 w-3" />
                  Insurance
                </div>
                <div className="text-lg font-semibold text-emerald-400">
                  {isCalculating ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : (
                    `$${pricingSummary.insuranceTotal.toFixed(2)}`
                  )}
                </div>
              </div>

              {/* Savings */}
              <div className="text-center">
                <div className="text-xs text-white/50 uppercase tracking-wide flex items-center justify-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Savings
                </div>
                <div className="text-lg font-semibold text-blue-400">
                  {isCalculating ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : (
                    `$${totalSavings.toFixed(2)}`
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-white/20" />

              {/* Patient Pays (Total) */}
              <div className="text-center">
                <div className="text-xs text-white/50 uppercase tracking-wide flex items-center justify-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Patient Pays
                </div>
                <div className="text-2xl font-bold text-white">
                  {isCalculating ? (
                    <Loader2 className="h-5 w-5 animate-spin inline" />
                  ) : (
                    `$${totalPatientPays.toFixed(2)}`
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
