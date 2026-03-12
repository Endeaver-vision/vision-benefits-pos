/**
 * EyeMed Static Rules Engine
 *
 * Applies EyeMed-specific pricing rules:
 * 1. Tier 5 Fallback: If Tier 5 not on auth, use Tier 4
 * 2. UV Surcharge: Add $15 for Crizal Sapphire/Rock/EZ Pro/SunShield
 * 3. Cash Only: Full retail for cash-only products
 * 4. Age-Based: Free poly under 19
 * 5. Tier Fallback: Use "All Other Lens Options" if no tier match
 */

import { ProductCatalogEntry } from '@/types/product-catalog'
import { EyemedBenefitAuthorization } from '@/types/benefit-authorization'
import { RuleContext, RuleResult, StaticRulesApplied } from './eyemed-formula-types'

// =============================================================================
// RULE: Tier 5 Fallback
// =============================================================================

/**
 * If product uses Tier 5 but auth doesn't have Tier 5, fall back to Tier 4
 * Returns updated tier or null if both are present
 */
export function applyTier5Fallback(
  tier: string | undefined,
  auth: EyemedBenefitAuthorization
): { newTier?: string; fallbackApplied: boolean; notes: string[] } {
  const notes: string[] = []

  if (tier !== 'tier_5') {
    return { fallbackApplied: false, notes }
  }

  // Check if Tier 5 is available in auth
  const hasTier5 = auth.copays.progressivePremiumTier5 !== undefined && auth.copays.progressivePremiumTier5 !== null

  if (!hasTier5) {
    notes.push('Tier 5 not available in authorization - falling back to Tier 4')
    return { newTier: 'tier_4', fallbackApplied: true, notes }
  }

  return { fallbackApplied: false, notes }
}

// =============================================================================
// RULE: UV Surcharge
// =============================================================================

/**
 * Add $15 surcharge for premium UV coating products
 */
const UV_SURCHARGE_PRODUCTS = [
  'crizal sapphire',
  'crizal rock',
  'crizal ez pro',
  'sunshield',
  'crizal alize',
]
const UV_SURCHARGE_AMOUNT = 15

export function applyUvSurcharge(product: ProductCatalogEntry): {
  applied: boolean
  surchargeAmount: number
  notes: string[]
} {
  const notes: string[] = []

  // Check if product has UV surcharge flag in database
  // (This would come from lens_products.backside_uv_surcharge column)
  const displayNameLower = product.displayName.toLowerCase()

  const isUvProduct = UV_SURCHARGE_PRODUCTS.some((uvProd) =>
    displayNameLower.includes(uvProd)
  )

  if (isUvProduct) {
    notes.push(`UV surcharge applied: +$${UV_SURCHARGE_AMOUNT}`)
    return { applied: true, surchargeAmount: UV_SURCHARGE_AMOUNT, notes }
  }

  return { applied: false, surchargeAmount: 0, notes }
}

// =============================================================================
// RULE: Cash Only
// =============================================================================

/**
 * For cash-only products, insurance doesn't apply - full retail price
 */
export function applyCashOnlyRule(product: ProductCatalogEntry): {
  applied: boolean
  notes: string[]
} {
  const notes: string[] = []

  // This would come from lens_products.cash_only column
  // For now, detect by specific product names or markers
  const isCashOnly = (product.tags ?? []).includes('cash-only')

  if (isCashOnly) {
    notes.push('Cash-only product: patient pays full retail price')
    return { applied: true, notes }
  }

  return { applied: false, notes }
}

// =============================================================================
// RULE: Age-Based (Free Polycarbonate for Children)
// =============================================================================

/**
 * Free polycarbonate for children under specified age (typically 18-19)
 */
export function applyAgeBasedRule(
  context: RuleContext,
  priceToAdjust: number
): {
  applied: boolean
  finalPrice: number
  notes: string[]
} {
  const notes: string[] = []
  let finalPrice = priceToAdjust

  // Only applies to polycarbonate material
  if (context.product.category !== 'material') {
    return { applied: false, finalPrice, notes }
  }

  const displayNameLower = context.product.displayName.toLowerCase()
  if (!displayNameLower.includes('polycarbonate') && !displayNameLower.includes('poly')) {
    return { applied: false, finalPrice, notes }
  }

  // Check patient age
  const maxAge = context.auth.specialRules?.polycarbonateFreeCbildAgeMax ?? 18
  if (context.patientAge === null || context.patientAge > maxAge) {
    return { applied: false, finalPrice, notes }
  }

  // Child under max age: polycarbonate is free
  finalPrice = 0
  notes.push(`Polycarbonate free for children under ${maxAge}`)
  return { applied: true, finalPrice, notes }
}

// =============================================================================
// RULE: Tier Fallback
// =============================================================================

/**
 * If no matching tier found, fall back to "All Other Lens Options"
 * This typically means 80% of retail price
 */
export function applyTierFallback(
  tierFound: boolean,
  retailPrice: number
): {
  applied: boolean
  fallbackPrice: number
  notes: string[]
} {
  const notes: string[] = []

  if (tierFound) {
    return { applied: false, fallbackPrice: retailPrice, notes }
  }

  // Use 80% of retail as fallback
  const fallbackPrice = retailPrice * 0.8
  notes.push('No tier match found - using 80% of retail as fallback')

  return { applied: true, fallbackPrice, notes }
}

// =============================================================================
// RULE: Progressive Non-Adapt Policy
// =============================================================================

/**
 * EyeMed may allow remakes for first-time progressive wearers
 */
export function applyProgressiveNonAdaptPolicy(
  context: RuleContext
): {
  applicable: boolean
  notes: string[]
} {
  const notes: string[] = []

  if (!context.auth.specialRules?.progressiveNonadaptPolicy) {
    return { applicable: false, notes }
  }

  if (context.product.category !== 'lens_progressive') {
    return { applicable: false, notes }
  }

  if (!context.isFirstTimeProgressive) {
    return { applicable: false, notes }
  }

  notes.push('Progressive non-adapt policy: patient may qualify for remake')
  return { applicable: true, notes }
}

// =============================================================================
// RULE: Second Pair Discount
// =============================================================================

/**
 * If auth has second pair discount, apply it
 */
export function applySecondPairDiscount(
  isSecondPair: boolean,
  context: RuleContext,
  retailPrice: number
): {
  applied: boolean
  discountAmount: number
  finalPrice: number
  notes: string[]
} {
  const notes: string[] = []

  if (!isSecondPair) {
    return { applied: false, discountAmount: 0, finalPrice: retailPrice, notes }
  }

  const discountPercent = context.auth.specialRules?.secondPairDiscount ?? 0
  if (discountPercent === 0) {
    return { applied: false, discountAmount: 0, finalPrice: retailPrice, notes }
  }

  const discountAmount = retailPrice * discountPercent
  const finalPrice = retailPrice - discountAmount

  notes.push(`Second pair discount: ${discountPercent * 100}% off = -$${discountAmount.toFixed(2)}`)

  return { applied: true, discountAmount, finalPrice, notes }
}

// =============================================================================
// MAIN: Apply All Rules
// =============================================================================

/**
 * Apply all static rules to a product and return the final adjustments
 */
export function applyStaticRules(
  context: RuleContext,
  originalPrice: number,
  options?: {
    isSecondPair?: boolean
  }
): StaticRulesApplied {
  const appliedRules: RuleResult[] = []
  let finalPrice = originalPrice

  // Rule 1: Cash Only (absolute, doesn't modify copay - prevents insurance from applying)
  const cashOnlyResult = applyCashOnlyRule(context.product)
  if (cashOnlyResult.applied) {
    appliedRules.push({
      ruleName: 'Cash Only',
      applied: true,
      action: 'override_price',
      originalPrice,
      finalPrice: originalPrice, // No change to price itself
      surchargeAmount: 0,
      notes: cashOnlyResult.notes,
    })
    // Note: This is handled separately in pricing engine
  }

  // Rule 2: Age-Based (Free Poly for Children)
  const ageBasedResult = applyAgeBasedRule(context, finalPrice)
  if (ageBasedResult.applied) {
    const adjustment = finalPrice - ageBasedResult.finalPrice
    appliedRules.push({
      ruleName: 'Age-Based (Free Poly)',
      applied: true,
      action: 'apply_discount',
      originalPrice: finalPrice,
      finalPrice: ageBasedResult.finalPrice,
      surchargeAmount: -adjustment,
      notes: ageBasedResult.notes,
    })
    finalPrice = ageBasedResult.finalPrice
  }

  // Rule 3: UV Surcharge
  const uvResult = applyUvSurcharge(context.product)
  if (uvResult.applied) {
    appliedRules.push({
      ruleName: 'UV Surcharge',
      applied: true,
      action: 'add_surcharge',
      originalPrice: finalPrice,
      finalPrice: finalPrice + uvResult.surchargeAmount,
      surchargeAmount: uvResult.surchargeAmount,
      notes: uvResult.notes,
    })
    finalPrice += uvResult.surchargeAmount
  }

  // Rule 4: Second Pair Discount (if applicable)
  if (options?.isSecondPair) {
    const secondPairResult = applySecondPairDiscount(true, context, finalPrice)
    if (secondPairResult.applied) {
      appliedRules.push({
        ruleName: 'Second Pair Discount',
        applied: true,
        action: 'apply_discount',
        originalPrice: finalPrice,
        finalPrice: secondPairResult.finalPrice,
        surchargeAmount: -secondPairResult.discountAmount,
        notes: secondPairResult.notes,
      })
      finalPrice = secondPairResult.finalPrice
    }
  }

  return {
    appliedRules,
    finalPrice: Math.round(finalPrice * 100) / 100,
  }
}

/**
 * Check if a tier is available in the authorization
 */
export function isTierAvailable(
  tier: string | undefined,
  auth: EyemedBenefitAuthorization
): boolean {
  if (!tier) return false

  // Map tier to copay field
  const tierToCopayField: Record<string, keyof typeof auth.copays> = {
    standard: 'progressiveStandard',
    tier_1: 'progressivePremiumTier1',
    tier_2: 'progressivePremiumTier2',
    tier_3: 'progressivePremiumTier3',
    tier_4: 'progressivePremiumTier4',
    tier_5: 'progressivePremiumTier5',
    ar_standard: 'arStandard',
    ar_tier_1: 'arPremiumTier1',
    ar_tier_2: 'arPremiumTier2',
    ar_tier_3: 'arPremiumTier3',
  }

  const field = tierToCopayField[tier]
  if (!field) return false

  const value = auth.copays[field as keyof typeof auth.copays]
  return value !== undefined && value !== null && value !== 0
}
