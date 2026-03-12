/**
 * Universal VSP Pricing Engine
 *
 * Implements the material-centric pricing pattern:
 * TOTAL_PRICE = BASE_PRICE + MATERIAL_SURCHARGE + TREATMENT_PRICE
 *
 * Works for all lens types (Single Vision, Bifocal, Progressive) once material is selected.
 */

import businessRules from '@/lib/data/business-rules.json'

export type LensType = 'singleVision' | 'bifocal' | 'progressive'
export type MaterialKey =
  | 'plastic'
  | 'polycarbonate'
  | 'highIndex1_60'
  | 'highIndex1_66'
  | 'highIndex1_71'
export type ProgressiveTier = 'K' | 'J' | 'F' | 'N' | 'O'

export interface PricingBreakdown {
  basePrice: number
  materialPrice: number
  treatmentPrice: number
  totalPrice: number
}

export interface PricingResult {
  success: boolean
  price?: number
  breakdown?: PricingBreakdown
  error?: string
}

/**
 * Get available materials for a specific lens type
 */
export function getAvailableMaterials(lensType: LensType): MaterialKey[] {
  const vspRules = businessRules.vsp

  switch (lensType) {
    case 'singleVision':
      return ['plastic', 'polycarbonate', 'highIndex1_60', 'highIndex1_66', 'highIndex1_71']

    case 'bifocal':
      return ['plastic'] // Bifocals only available in plastic

    case 'progressive':
      return ['plastic', 'polycarbonate', 'highIndex1_60', 'highIndex1_66', 'highIndex1_71']

    default:
      return []
  }
}

/**
 * Get available progressive tiers
 */
export function getProgressiveTiers(): ProgressiveTier[] {
  return ['K', 'J', 'F', 'N', 'O']
}

/**
 * Get tier details
 */
export function getTierDetails(tier: ProgressiveTier) {
  const vspRules = businessRules.vsp
  return vspRules.progressiveTiers[tier as keyof typeof vspRules.progressiveTiers]
}

/**
 * Get material details
 */
export function getMaterialDetails(materialKey: MaterialKey) {
  const vspRules = businessRules.vsp
  return vspRules.materials[materialKey as keyof typeof vspRules.materials]
}

/**
 * Calculate single vision lens price
 * Formula: PRICE = MATERIAL_PRICE
 */
export function calculateSingleVisionPrice(materialKey: MaterialKey): PricingResult {
  const material = getMaterialDetails(materialKey)

  if (!material) {
    return { success: false, error: `Unknown material: ${materialKey}` }
  }

  const matPrice = material.pricing.singleVision
  if (matPrice === null || matPrice === undefined) {
    return {
      success: false,
      error: `Material ${materialKey} not available for Single Vision`
    }
  }

  return {
    success: true,
    price: matPrice,
    breakdown: {
      basePrice: 0,
      materialPrice: matPrice,
      treatmentPrice: 0,
      totalPrice: matPrice
    }
  }
}

/**
 * Calculate bifocal lens price
 * Formula: PRICE = $30 (fixed, plastic only)
 */
export function calculateBifocalPrice(materialKey: MaterialKey): PricingResult {
  if (materialKey !== 'plastic') {
    return {
      success: false,
      error: `Bifocals only available in plastic, requested: ${materialKey}`
    }
  }

  return {
    success: true,
    price: 30,
    breakdown: {
      basePrice: 30,
      materialPrice: 0,
      treatmentPrice: 0,
      totalPrice: 30
    }
  }
}

/**
 * Calculate progressive lens price
 * Formula: PRICE = TIER_BASE + MATERIAL_SURCHARGE + TREATMENT_PRICE
 */
export function calculateProgressivePrice(
  materialKey: MaterialKey,
  tier: ProgressiveTier,
  treatmentKey?: string
): PricingResult {
  const material = getMaterialDetails(materialKey)
  const tierConfig = getTierDetails(tier)

  if (!material) {
    return { success: false, error: `Unknown material: ${materialKey}` }
  }

  if (!tierConfig) {
    return { success: false, error: `Unknown tier: ${tier}` }
  }

  const surcharge = material.pricing.progressive
  if (surcharge === null || surcharge === undefined) {
    return {
      success: false,
      error: `Material ${materialKey} not available for Progressive`
    }
  }

  let treatmentPrice = 0
  if (treatmentKey) {
    const vspRules = businessRules.vsp
    const treatment = vspRules.treatments[treatmentKey as keyof typeof vspRules.treatments]
    if (treatment) {
      treatmentPrice = treatment.pricing.progressive || 0
    }
  }

  const totalPrice = tierConfig.basePrice + surcharge + treatmentPrice

  return {
    success: true,
    price: totalPrice,
    breakdown: {
      basePrice: tierConfig.basePrice,
      materialPrice: surcharge,
      treatmentPrice: treatmentPrice,
      totalPrice: totalPrice
    }
  }
}

/**
 * Universal lens price calculator
 * Entry point for all lens type pricing
 */
export function calculateLensPrice(
  lensType: LensType,
  materialKey: MaterialKey,
  options?: {
    tier?: ProgressiveTier
    treatment?: string
  }
): PricingResult {
  switch (lensType) {
    case 'singleVision':
      return calculateSingleVisionPrice(materialKey)

    case 'bifocal':
      return calculateBifocalPrice(materialKey)

    case 'progressive':
      if (!options?.tier) {
        return { success: false, error: 'Progressive requires tier selection' }
      }
      return calculateProgressivePrice(materialKey, options.tier, options.treatment)

    default:
      return { success: false, error: `Unknown lens type: ${lensType}` }
  }
}

/**
 * Validate if a material is available for a lens type
 */
export function isMaterialAvailableForLensType(
  lensType: LensType,
  materialKey: MaterialKey
): boolean {
  const available = getAvailableMaterials(lensType)
  return available.includes(materialKey)
}

/**
 * Get pricing matrix for progressive lenses
 * Shows all tier + material combinations
 */
export function getProgressivePricingMatrix(materialKey: MaterialKey) {
  const material = getMaterialDetails(materialKey)
  if (!material) return null

  const surcharge = material.pricing.progressive
  if (surcharge === null || surcharge === undefined) return null

  const vspRules = businessRules.vsp
  const matrix: Record<ProgressiveTier, { tier: string; basePrice: number; totalPrice: number }> =
    {} as any

  for (const tier of getProgressiveTiers()) {
    const tierConfig = getTierDetails(tier)
    if (tierConfig) {
      matrix[tier] = {
        tier: tierConfig.name,
        basePrice: tierConfig.basePrice,
        totalPrice: tierConfig.basePrice + surcharge
      }
    }
  }

  return matrix
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

/**
 * Example usage showing all pricing capabilities
 */
export function exampleUsage() {
  console.log('=== Single Vision Pricing ===')
  console.log(calculateLensPrice('singleVision', 'highIndex1_66'))
  // Returns: { price: 83, breakdown: { base: 0, material: 83 } }

  console.log('\n=== Bifocal Pricing ===')
  console.log(calculateLensPrice('bifocal', 'plastic'))
  // Returns: { price: 30, breakdown: { base: 30, material: 0 } }

  console.log('\n=== Progressive Pricing ===')
  console.log(calculateLensPrice('progressive', 'highIndex1_66', { tier: 'F' }))
  // Returns: { price: 183, breakdown: { base: 105, material: 78 } }

  console.log('\n=== Available Materials for Single Vision ===')
  console.log(getAvailableMaterials('singleVision'))
  // Returns: ['plastic', 'polycarbonate', 'highIndex1_60', 'highIndex1_66', 'highIndex1_71']

  console.log('\n=== Available Materials for Bifocal ===')
  console.log(getAvailableMaterials('bifocal'))
  // Returns: ['plastic']

  console.log('\n=== Progressive Pricing Matrix for High Index 1.66 ===')
  console.log(getProgressivePricingMatrix('highIndex1_66'))
  // Returns: {
  //   K: { tier: 'Standard Progressive', basePrice: 55, totalPrice: 133 },
  //   J: { tier: 'Mid-Grade Progressive', basePrice: 95, totalPrice: 173 },
  //   F: { tier: 'Premium Progressive', basePrice: 105, totalPrice: 183 },
  //   N: { tier: 'Professional Progressive', basePrice: 175, totalPrice: 253 },
  //   O: { tier: 'Ultra-Premium Progressive', basePrice: 150, totalPrice: 228 }
  // }
}
