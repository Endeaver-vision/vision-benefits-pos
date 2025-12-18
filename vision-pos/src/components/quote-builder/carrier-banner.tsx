'use client'

import { Shield, DollarSign, Eye, Glasses, AlertTriangle, Wallet, TrendingDown } from 'lucide-react'

interface CarrierBannerProps {
  carrier: string | null
  planName?: string | null
  examCopay?: number | null
  materialsCopay?: number | null
  frameAllowance?: number | null
  contactAllowance?: number | null
  contactFittingCopay?: number | null
  contactFittingCovered?: boolean
  glassesContactsExclusive?: boolean
  isLoading?: boolean
  // Declining balance support
  benefitStructure?: 'COPAY_ALLOWANCE' | 'DECLINING_BALANCE' | 'PACKAGE' | null
  totalMaterialsCredit?: number | null
  overageDiscountPercent?: number | null
}

const carrierConfig: Record<string, { bg: string; text: string; border: string }> = {
  'VSP': { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-400' },
  'VSP Choice': { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-400' },
  'EyeMed': { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-400' },
  'Spectera': { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-400' },
  'Davis Vision': { bg: 'bg-orange-600', text: 'text-white', border: 'border-orange-400' },
}

export function CarrierBanner({
  carrier,
  planName,
  examCopay,
  materialsCopay,
  frameAllowance,
  contactAllowance,
  contactFittingCopay,
  contactFittingCovered,
  glassesContactsExclusive,
  isLoading,
  benefitStructure,
  totalMaterialsCredit,
  overageDiscountPercent
}: CarrierBannerProps) {
  const isDecliningBalance = benefitStructure === 'DECLINING_BALANCE'
  if (isLoading) {
    return (
      <div className="bg-white/10 rounded-xl px-4 py-3 border border-white/20 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white/20" />
          <div className="h-4 w-32 rounded bg-white/20" />
        </div>
      </div>
    )
  }

  // Cash pay scenario
  if (!carrier) {
    return (
      <div className="bg-gray-700 rounded-xl px-4 py-3 border border-gray-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gray-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-gray-300" />
            </div>
            <div>
              <div className="font-bold text-gray-200">CASH PAY</div>
              <div className="text-xs text-gray-400">No insurance on file</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const config = carrierConfig[carrier] || { bg: 'bg-gray-600', text: 'text-white', border: 'border-gray-400' }

  return (
    <div className={`${config.bg} rounded-xl px-4 py-3 border ${config.border}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Carrier Info */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-lg">{carrier.toUpperCase()}</div>
            {planName && (
              <div className="text-xs text-white/80">{planName}</div>
            )}
          </div>
        </div>

        {/* Benefits Summary - Horizontal on larger screens */}
        <div className="flex items-center gap-4 text-sm">
          {/* Declining Balance Badge */}
          {isDecliningBalance && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/30 rounded-lg">
              <TrendingDown className="h-4 w-4 text-amber-200" />
              <span className="font-semibold text-amber-100">Flex Plan</span>
            </div>
          )}

          {/* Declining Balance: Show total credit */}
          {isDecliningBalance && totalMaterialsCredit !== null && totalMaterialsCredit !== undefined && (
            <div className="flex items-center gap-1.5 text-white/90">
              <Wallet className="h-4 w-4 text-emerald-300" />
              <span className="text-white/70">Credit:</span>
              <span className="font-bold text-emerald-300">${totalMaterialsCredit}</span>
              {overageDiscountPercent !== null && overageDiscountPercent > 0 && (
                <span className="text-xs text-white/60">
                  (+{Math.round(overageDiscountPercent * 100)}% off overage)
                </span>
              )}
            </div>
          )}

          {examCopay !== null && examCopay !== undefined && (
            <div className="flex items-center gap-1.5 text-white/90">
              <Eye className="h-4 w-4" />
              <span className="text-white/70">Exam:</span>
              <span className="font-semibold">${examCopay}</span>
            </div>
          )}

          {/* Standard Copay Plan: Show materials copay and frame allowance */}
          {!isDecliningBalance && materialsCopay !== null && materialsCopay !== undefined && (
            <div className="flex items-center gap-1.5 text-white/90">
              <Glasses className="h-4 w-4" />
              <span className="text-white/70">Materials:</span>
              <span className="font-semibold">${materialsCopay}</span>
            </div>
          )}
          {!isDecliningBalance && frameAllowance !== null && frameAllowance !== undefined && (
            <div className="flex items-center gap-1.5 text-white/90">
              <DollarSign className="h-4 w-4" />
              <span className="text-white/70">Frame:</span>
              <span className="font-semibold">${frameAllowance}</span>
            </div>
          )}
          {contactAllowance !== null && contactAllowance !== undefined && (
            <div className="flex items-center gap-1.5 text-white/90">
              <DollarSign className="h-4 w-4" />
              <span className="text-white/70">Contacts:</span>
              <span className="font-semibold">${contactAllowance}</span>
              {contactFittingCovered && !contactFittingCopay && (
                <span className="text-xs text-white/60">(fitting covered)</span>
              )}
            </div>
          )}
          {contactFittingCopay !== null && contactFittingCopay !== undefined && (
            <div className="flex items-center gap-1.5 text-white/90">
              <Eye className="h-4 w-4" />
              <span className="text-white/70">CL Fit:</span>
              <span className="font-semibold">${contactFittingCopay}</span>
            </div>
          )}
        </div>
      </div>

      {/* Declining Balance Explanation */}
      {isDecliningBalance && (
        <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-emerald-500/20 rounded-lg">
          <Wallet className="h-4 w-4 text-emerald-300 shrink-0" />
          <span className="text-xs text-emerald-200">
            <strong>Flex Plan:</strong> ${totalMaterialsCredit} credit applies to frame, lenses, and coatings.
            {overageDiscountPercent !== null && overageDiscountPercent > 0 && (
              <> After credit, {Math.round(overageDiscountPercent * 100)}% off remaining balance.</>
            )}
          </span>
        </div>
      )}
      {/* Glasses/Contacts Mutual Exclusion Warning */}
      {glassesContactsExclusive && (
        <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-amber-500/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0" />
          <span className="text-xs text-amber-200">
            This plan covers glasses OR contacts per benefit year, not both
          </span>
        </div>
      )}
    </div>
  )
}
