/**
 * EyeMed Product Matcher
 *
 * Matches products to authorization benefits.
 * Maps product.tierEyemed to auth.copays fields.
 */

import { ProductCatalogEntry } from '@/types/product-catalog'
import { EyemedBenefitAuthorization } from '@/types/benefit-authorization'
import { ProductMatchResult } from './eyemed-formula-types'

// =============================================================================
// TIER MAPPING
// =============================================================================

/**
 * Map product tier to copay field name in authorization
 */
function getTierCopayField(
  tier: string,
  category: 'lens' | 'ar' | 'material' | 'enhancement'
): string | null {
  // Lens/Progressive tiers
  if (category === 'lens') {
    const map: Record<string, string> = {
      standard: 'progressiveStandard',
      tier_1: 'progressivePremiumTier1',
      tier_2: 'progressivePremiumTier2',
      tier_3: 'progressivePremiumTier3',
      tier_4: 'progressivePremiumTier4',
      tier_5: 'progressivePremiumTier5',
    }
    return map[tier] ?? null
  }

  // AR Coating tiers
  if (category === 'ar') {
    const map: Record<string, string> = {
      standard: 'arStandard',
      tier_1: 'arPremiumTier1',
      tier_2: 'arPremiumTier2',
      tier_3: 'arPremiumTier3',
    }
    return map[tier] ?? null
  }

  // Material types
  if (category === 'material') {
    const map: Record<string, string> = {
      polycarbonate: 'materialPolycarbonate',
      high_index_167: 'materialHighIndex167',
      high_index_174: 'materialHighIndex174',
      trivex: 'materialTrivex',
    }
    return map[tier] ?? null
  }

  // Enhancements
  if (category === 'enhancement') {
    const map: Record<string, string> = {
      photochromic: 'photochromic',
      polarized: 'polarized',
      blue_light: 'blueLightFilter',
      tint: 'tint',
      uv: 'uvCoating',
      scratch: 'scratchCoating',
    }
    return map[tier] ?? null
  }

  return null
}

// =============================================================================
// MATCHING LOGIC
// =============================================================================

/**
 * Determine the category type for copay lookup
 */
function getCategoryType(
  category: string
): 'lens' | 'ar' | 'material' | 'enhancement' | 'service' | null {
  if (category === 'lens_progressive' || category === 'lens_sv' || category === 'lens_bifocal') {
    return 'lens'
  }
  if (category === 'ar_coating') {
    return 'ar'
  }
  if (category === 'material') {
    return 'material'
  }
  if (category === 'photochromic' || category === 'polarized' || category === 'blue_light' || category === 'tint') {
    return 'enhancement'
  }
  if (category === 'service') {
    return 'service'
  }
  return null
}

/**
 * Match a product to an authorization benefit
 */
export function matchProductToAuth(
  product: ProductCatalogEntry,
  auth: EyemedBenefitAuthorization
): ProductMatchResult {
  const result: ProductMatchResult = {
    sku: product.sku,
    matched: false,
    isFormula: false,
    fallbackUsed: false,
    notes: [],
  }

  // Get the tier for this product
  const tier = product.eyemed?.progressiveTier ||
    product.eyemed?.arTier ||
    product.eyemed?.materialType ||
    product.eyemed?.enhancementType

  if (!tier) {
    result.notes.push('No tier mapping found for product')
    result.fallbackUsed = true
    // Fall back to "All Other Lens Options" (80% of retail)
    result.tier = 'fallback'
    result.benefitValue = 'fallback'
    return result
  }

  // Determine category type
  const categoryType = getCategoryType(product.category)
  if (!categoryType) {
    result.notes.push(`Unknown category: ${product.category}`)
    result.fallbackUsed = true
    result.tier = 'fallback'
    result.benefitValue = 'fallback'
    return result
  }

  // Get the copay field name
  const copayField = getTierCopayField(tier, categoryType as any)
  if (!copayField) {
    result.notes.push(`No copay field for tier: ${tier}`)
    result.fallbackUsed = true
    result.tier = 'fallback'
    result.benefitValue = 'fallback'
    return result
  }

  // Look up the copay value in auth
  const copayValue = (auth.copays as any)[copayField]

  if (copayValue === undefined || copayValue === null) {
    result.notes.push(`No copay value in auth for field: ${copayField}`)
    result.fallbackUsed = true
    result.tier = 'fallback'
    result.benefitValue = 'fallback'
    return result
  }

  // Success!
  result.matched = true
  result.tier = tier
  result.benefitValue = copayValue
  result.isFormula = typeof copayValue === 'string'
  result.notes.push(`Matched to tier: ${tier} → ${copayField}`)

  return result
}

/**
 * Get benefit value for a specific tier/field
 */
export function getCopayValue(
  tier: string,
  categoryType: 'lens' | 'ar' | 'material' | 'enhancement',
  auth: EyemedBenefitAuthorization
): number | string | null {
  const field = getTierCopayField(tier, categoryType)
  if (!field) return null

  const value = (auth.copays as any)[field]
  return value ?? null
}

/**
 * Match single vision lens to auth
 */
export function matchSingleVisionLens(
  product: ProductCatalogEntry,
  auth: EyemedBenefitAuthorization
): ProductMatchResult {
  const result: ProductMatchResult = {
    sku: product.sku,
    matched: false,
    isFormula: false,
    fallbackUsed: false,
    notes: [],
  }

  // Single vision has direct copay fields
  const svCopay = auth.copays.lensSv
  if (svCopay !== undefined && svCopay !== null) {
    result.matched = true
    result.tier = 'single_vision'
    result.benefitValue = svCopay
    result.notes.push(`Single vision copay: $${svCopay}`)
    return result
  }

  result.notes.push('No single vision copay found')
  result.fallbackUsed = true
  result.tier = 'fallback'
  result.benefitValue = 'fallback'
  return result
}

/**
 * Match bifocal lens to auth
 */
export function matchBifocalLens(
  product: ProductCatalogEntry,
  auth: EyemedBenefitAuthorization
): ProductMatchResult {
  const result: ProductMatchResult = {
    sku: product.sku,
    matched: false,
    isFormula: false,
    fallbackUsed: false,
    notes: [],
  }

  const bfCopay = auth.copays.lensBifocal
  if (bfCopay !== undefined && bfCopay !== null) {
    result.matched = true
    result.tier = 'bifocal'
    result.benefitValue = bfCopay
    result.notes.push(`Bifocal copay: $${bfCopay}`)
    return result
  }

  result.notes.push('No bifocal copay found')
  result.fallbackUsed = true
  result.tier = 'fallback'
  result.benefitValue = 'fallback'
  return result
}

/**
 * Match frame to auth (allowance-based)
 */
export function matchFrame(
  product: ProductCatalogEntry,
  auth: EyemedBenefitAuthorization
): ProductMatchResult {
  const result: ProductMatchResult = {
    sku: product.sku,
    matched: false,
    isFormula: false,
    fallbackUsed: false,
    notes: [],
  }

  const allowance = auth.copays.frameAllowance
  if (allowance !== undefined && allowance !== null && allowance > 0) {
    result.matched = true
    result.tier = 'frame_allowance'
    result.benefitValue = allowance
    result.isFormula = true // Allowance is a formula-type benefit
    result.notes.push(`Frame allowance: $${allowance}`)
    return result
  }

  result.notes.push('No frame allowance found')
  result.fallbackUsed = true
  result.tier = 'fallback'
  result.benefitValue = 'fallback'
  return result
}

/**
 * Match contact lens to auth
 */
export function matchContactLens(
  product: ProductCatalogEntry,
  auth: EyemedBenefitAuthorization
): ProductMatchResult {
  const result: ProductMatchResult = {
    sku: product.sku,
    matched: false,
    isFormula: false,
    fallbackUsed: false,
    notes: [],
  }

  // Try to match based on lens type
  // For now, use conventional as default
  const clCopay = auth.copays.contactsConventional ?? auth.copays.contactsDisposable

  if (clCopay !== undefined && clCopay !== null) {
    result.matched = true
    result.tier = 'contact_conventional'
    result.benefitValue = clCopay
    result.notes.push(`Contact lens copay: $${clCopay}`)
    return result
  }

  result.notes.push('No contact lens copay found')
  result.fallbackUsed = true
  result.tier = 'fallback'
  result.benefitValue = 'fallback'
  return result
}

/**
 * Batch match multiple products to auth
 */
export function matchProductsToAuth(
  products: ProductCatalogEntry[],
  auth: EyemedBenefitAuthorization
): ProductMatchResult[] {
  return products.map((product) => {
    // Use specific matcher for known categories
    if (product.category === 'lens_sv') {
      return matchSingleVisionLens(product, auth)
    }
    if (product.category === 'lens_bifocal') {
      return matchBifocalLens(product, auth)
    }
    if (product.category === 'frame') {
      return matchFrame(product, auth)
    }
    if (product.category === 'contact') {
      return matchContactLens(product, auth)
    }

    // Default: use general matcher
    return matchProductToAuth(product, auth)
  })
}
