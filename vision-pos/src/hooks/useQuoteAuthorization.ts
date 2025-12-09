/**
 * useQuoteAuthorization Hook
 *
 * Provides easy access to the quote's authorization context for POS components.
 * This hook exposes the full authorization data and helper functions for pricing.
 */

import { useQuoteStore } from '@/store/quote-store'
import {
  QuoteAuthorizationContext,
  getPolyCopay,
  getProgressiveCopay,
  getArCopay,
  hasFrameCoverage,
  hasContactCoverage,
} from '@/types/quote-authorization'

export interface UseQuoteAuthorizationResult {
  // State
  authorization: QuoteAuthorizationContext | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  customerId: string | null

  // Helpers
  hasInsurance: boolean
  carrier: string | null
  carrierUpperCase: 'VSP' | 'EyeMed' | 'Spectera' | null

  // Copay getters
  examCopay: number | null
  materialsCopay: number | null
  frameAllowance: number | null
  frameOverageDiscount: number | null
  contactAllowance: number | null

  // Tier copay helpers
  getProgressiveCopay: (tierCode: string) => number | null
  getArCopay: (tierCode: string) => number | null
  getPolyCopay: () => number | string | null

  // Coverage checks
  hasFrameCoverage: boolean
  hasContactCoverage: boolean
  isChild: boolean

  // Actions
  initializeWithCustomer: (customerId: string) => Promise<void>
  clear: () => void
}

/**
 * Hook to access the quote's authorization context
 *
 * @example
 * ```tsx
 * function LensSelector() {
 *   const { authorization, getProgressiveCopay, hasInsurance } = useQuoteAuthorization()
 *
 *   if (!hasInsurance) {
 *     return <RetailPricing />
 *   }
 *
 *   const tier4Copay = getProgressiveCopay('tier_4')
 *   return <div>Patient pays: ${tier4Copay}</div>
 * }
 * ```
 */
export function useQuoteAuthorization(): UseQuoteAuthorizationResult {
  const authorization = useQuoteStore((state) => state.authorization)
  const initState = useQuoteStore((state) => state.initState)
  const initializeQuoteWithCustomer = useQuoteStore((state) => state.initializeQuoteWithCustomer)
  const clearAuthorization = useQuoteStore((state) => state.clearAuthorization)

  const hasInsurance = authorization !== null

  // Carrier helpers
  const carrier = authorization?.carrier ?? null
  const carrierUpperCase = carrier
    ? (carrier.charAt(0).toUpperCase() + carrier.slice(1)) as 'VSP' | 'EyeMed' | 'Spectera'
    : null

  return {
    // State
    authorization,
    isLoading: initState.isLoading,
    isInitialized: initState.isInitialized,
    error: initState.error,
    customerId: initState.customerId,

    // Helpers
    hasInsurance,
    carrier,
    carrierUpperCase,

    // Direct copay access
    examCopay: authorization?.examCopay ?? null,
    materialsCopay: authorization?.materialsCopay ?? null,
    frameAllowance: authorization?.frameAllowance ?? null,
    frameOverageDiscount: authorization?.frameOverageDiscount ?? null,
    contactAllowance: authorization?.contactAllowance ?? null,

    // Tier copay helpers
    getProgressiveCopay: (tierCode: string) => getProgressiveCopay(authorization, tierCode),
    getArCopay: (tierCode: string) => getArCopay(authorization, tierCode),
    getPolyCopay: () => getPolyCopay(authorization),

    // Coverage checks
    hasFrameCoverage: hasFrameCoverage(authorization),
    hasContactCoverage: hasContactCoverage(authorization),
    isChild: authorization?.specialRules.isChild ?? false,

    // Actions
    initializeWithCustomer: initializeQuoteWithCustomer,
    clear: clearAuthorization,
  }
}

/**
 * Hook to get pricing for a specific product based on authorization
 *
 * @example
 * ```tsx
 * const pricing = useProductPricing('progressive', 'tier_4', 394.00)
 * // Returns: { patientPays: 130, insurancePays: 264, tierUsed: 'tier_4' }
 * ```
 */
export function useProductPricing(
  productType: 'progressive' | 'ar_coating' | 'material' | 'enhancement',
  tierCode: string,
  retailPrice: number
): {
  patientPays: number
  insurancePays: number
  tierUsed: string | null
  isInsurancePricing: boolean
} {
  const { authorization, hasInsurance } = useQuoteAuthorization()

  if (!hasInsurance || !authorization) {
    return {
      patientPays: retailPrice,
      insurancePays: 0,
      tierUsed: null,
      isInsurancePricing: false,
    }
  }

  let copay: number | null = null

  switch (productType) {
    case 'progressive':
      copay = getProgressiveCopay(authorization, tierCode)
      break
    case 'ar_coating':
      copay = getArCopay(authorization, tierCode)
      break
    case 'material':
      const materialCopay = authorization.materialCopays[tierCode as keyof typeof authorization.materialCopays]
      copay = typeof materialCopay === 'number' ? materialCopay : null
      break
    case 'enhancement':
      const enhCopay = authorization.enhancementCopays[tierCode as keyof typeof authorization.enhancementCopays]
      copay = typeof enhCopay === 'number' ? enhCopay : null
      break
  }

  if (copay === null) {
    // No tier mapping or special pricing - use retail
    return {
      patientPays: retailPrice,
      insurancePays: 0,
      tierUsed: null,
      isInsurancePricing: false,
    }
  }

  return {
    patientPays: copay,
    insurancePays: Math.max(0, retailPrice - copay),
    tierUsed: tierCode,
    isInsurancePricing: true,
  }
}

/**
 * Hook to calculate frame pricing with allowance and overage
 */
export function useFramePricing(
  retailPrice: number,
  isFeaturedBrand: boolean = false
): {
  patientPays: number
  insurancePays: number
  allowanceUsed: number
  overage: number
  overageDiscount: number
  isInsurancePricing: boolean
} {
  const { authorization, hasInsurance, hasFrameCoverage } = useQuoteAuthorization()

  if (!hasInsurance || !authorization || !hasFrameCoverage) {
    return {
      patientPays: retailPrice,
      insurancePays: 0,
      allowanceUsed: 0,
      overage: 0,
      overageDiscount: 0,
      isInsurancePricing: false,
    }
  }

  // Get the appropriate allowance (VSP has featured vs non-featured)
  const allowance = isFeaturedBrand && authorization.frameAllowanceFeatured
    ? authorization.frameAllowanceFeatured
    : authorization.frameAllowance ?? 0

  const overage = Math.max(0, retailPrice - allowance)
  // Normalize discount to decimal (0.20 = 20%) in case stored as integer (20)
  let discountRate = authorization.frameOverageDiscount ?? 0
  if (discountRate > 1) {
    discountRate = discountRate / 100
  }
  const overageDiscount = overage * discountRate
  const patientPays = overage - overageDiscount

  return {
    patientPays,
    insurancePays: allowance + overageDiscount,
    allowanceUsed: Math.min(allowance, retailPrice),
    overage,
    overageDiscount,
    isInsurancePricing: true,
  }
}

export default useQuoteAuthorization
