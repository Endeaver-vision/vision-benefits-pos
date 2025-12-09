/**
 * Pricing Calculator Service
 *
 * Calculates patient pricing based on:
 * 1. Product retail prices from our catalog
 * 2. Product tier mappings per carrier
 * 3. Patient's BenefitAuthorization (copays from scanned auth)
 *
 * Flow:
 * - Product selected → Look up product's tier for patient's carrier
 * - Use authorization to find copay for that tier
 * - Patient pays: copay amount (or retail if no coverage)
 */

import {
  BenefitAuthorization,
  EyemedBenefitAuthorization,
  SpecteraBenefitAuthorization,
  VspBenefitAuthorization,
  isEyemedAuth,
  isSpecteraAuth,
  isVspAuth,
} from '@/types/benefit-authorization'

import {
  ProductCatalogEntry,
  ProductCategory,
  QuoteItem,
  QuoteLineItem,
  QuoteResult,
} from '@/types/product-catalog'

// =============================================================================
// PRICING RESULT TYPES
// =============================================================================

export interface PricingResult {
  sku: string
  displayName: string
  category: ProductCategory
  retailPrice: number

  // What the patient pays
  patientCopay: number

  // What insurance covers (retail - copay, or allowance-based)
  insurancePays: number

  // Savings vs retail
  savings: number

  // Which tier/code was used for lookup
  tierUsed?: string

  // Additional notes (e.g., "80% of U&C applied", "Frame overage: $50")
  notes?: string

  // Warnings (e.g., "No tier mapping found, using retail")
  warnings?: string[]
}

export interface FramePricingResult extends PricingResult {
  allowance: number
  overage: number
  overageDiscount: number
  overageAfterDiscount: number
}

// =============================================================================
// CALCULATOR INTERFACE
// =============================================================================

export interface IPricingCalculator {
  /**
   * Calculate pricing for a single product
   */
  calculateProduct(
    product: ProductCatalogEntry,
    auth: BenefitAuthorization,
    overrideRetailPrice?: number
  ): PricingResult

  /**
   * Calculate pricing for a frame (special allowance logic)
   */
  calculateFrame(
    product: ProductCatalogEntry,
    auth: BenefitAuthorization,
    retailPrice: number,
    isFeaturedBrand?: boolean
  ): FramePricingResult

  /**
   * Build a complete quote with multiple items
   */
  buildQuote(
    items: QuoteItem[],
    products: Map<string, ProductCatalogEntry>,
    auth: BenefitAuthorization
  ): QuoteResult
}

// =============================================================================
// EYEMED CALCULATOR
// =============================================================================

export class EyemedPricingCalculator implements IPricingCalculator {
  calculateProduct(
    product: ProductCatalogEntry,
    auth: BenefitAuthorization,
    overrideRetailPrice?: number
  ): PricingResult {
    if (!isEyemedAuth(auth)) {
      throw new Error('EyemedPricingCalculator requires EyeMed authorization')
    }

    const retailPrice = overrideRetailPrice ?? product.retailPrice
    const warnings: string[] = []
    let tierUsed: string | undefined
    let patientCopay = retailPrice // Default to full retail

    const eyemedMapping = product.eyemed

    switch (product.category) {
      case 'lens_sv':
        patientCopay = auth.copays.lensSv
        tierUsed = 'single_vision'
        break

      case 'lens_progressive':
        if (eyemedMapping?.progressiveTier) {
          patientCopay = this.getProgressiveCopay(auth, eyemedMapping.progressiveTier)
          tierUsed = eyemedMapping.progressiveTier
        } else {
          warnings.push('No EyeMed progressive tier mapping, using retail')
        }
        break

      case 'ar_coating':
        if (eyemedMapping?.arTier) {
          patientCopay = this.getArCopay(auth, eyemedMapping.arTier)
          tierUsed = eyemedMapping.arTier
        } else {
          warnings.push('No EyeMed AR tier mapping, using retail')
        }
        break

      case 'material':
        if (eyemedMapping?.materialType) {
          const result = this.getMaterialCopay(auth, eyemedMapping.materialType)
          patientCopay = result.copay
          tierUsed = eyemedMapping.materialType
          if (result.notes) warnings.push(result.notes)
        } else {
          warnings.push('No EyeMed material mapping, using retail')
        }
        break

      case 'photochromic':
        patientCopay = auth.copays.photochromic
        tierUsed = 'photochromic'
        break

      case 'polarized':
        patientCopay = auth.copays.polarized
        tierUsed = 'polarized'
        break

      case 'blue_light':
        patientCopay = auth.copays.blueLightFilter
        tierUsed = 'blue_light'
        break

      case 'tint':
        patientCopay = auth.copays.tint
        tierUsed = 'tint'
        break

      case 'mount_fee':
        // Mount fees for EyeMed: standard = $0, rimless/semi_rimless = retail
        const eyemedMountCode = eyemedMapping?.materialType || 'standard'
        if (eyemedMountCode === 'standard') {
          patientCopay = 0
          tierUsed = 'standard'
        } else {
          // Rimless and semi-rimless typically patient responsibility
          patientCopay = retailPrice
          tierUsed = eyemedMountCode
        }
        break

      default:
        warnings.push(`No pricing rule for category: ${product.category}`)
    }

    const insurancePays = Math.max(0, retailPrice - patientCopay)
    const savings = insurancePays

    return {
      sku: product.sku,
      displayName: product.displayName,
      category: product.category,
      retailPrice,
      patientCopay,
      insurancePays,
      savings,
      tierUsed,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  calculateFrame(
    product: ProductCatalogEntry,
    auth: BenefitAuthorization,
    retailPrice: number,
  ): FramePricingResult {
    if (!isEyemedAuth(auth)) {
      throw new Error('EyemedPricingCalculator requires EyeMed authorization')
    }

    const allowance = auth.copays.frameAllowance
    // Normalize discount to decimal (0.20 = 20%) in case stored as integer (20)
    let overageDiscount = auth.copays.frameOverageDiscount
    if (overageDiscount > 1) {
      overageDiscount = overageDiscount / 100
    }

    let overage = 0
    let overageAfterDiscount = 0
    let patientCopay = 0

    if (retailPrice <= allowance) {
      // Frame is within allowance - patient pays $0 for frame
      patientCopay = 0
    } else {
      // Frame exceeds allowance
      overage = retailPrice - allowance
      overageAfterDiscount = overage * (1 - overageDiscount)
      patientCopay = overageAfterDiscount
    }

    const insurancePays = Math.min(allowance, retailPrice)
    const savings = retailPrice - patientCopay

    return {
      sku: product.sku,
      displayName: product.displayName,
      category: 'frame',
      retailPrice,
      patientCopay,
      insurancePays,
      savings,
      tierUsed: 'frame_allowance',
      allowance,
      overage,
      overageDiscount,
      overageAfterDiscount,
      notes: overage > 0
        ? `Frame overage $${overage.toFixed(2)}, ${(overageDiscount * 100).toFixed(0)}% discount applied`
        : undefined,
    }
  }

  buildQuote(
    items: QuoteItem[],
    products: Map<string, ProductCatalogEntry>,
    auth: BenefitAuthorization
  ): QuoteResult {
    if (!isEyemedAuth(auth)) {
      throw new Error('EyemedPricingCalculator requires EyeMed authorization')
    }

    const lineItems: QuoteLineItem[] = []
    const warnings: string[] = []

    for (const item of items) {
      const product = products.get(item.sku)
      if (!product) {
        warnings.push(`Product not found: ${item.sku}`)
        continue
      }

      let result: PricingResult

      if (product.category === 'frame') {
        result = this.calculateFrame(product, auth, item.retailPrice)
      } else {
        result = this.calculateProduct(product, auth, item.retailPrice)
      }

      if (result.warnings) {
        warnings.push(...result.warnings)
      }

      lineItems.push({
        sku: result.sku,
        displayName: result.displayName,
        category: result.category,
        retailPrice: result.retailPrice,
        patientCopay: result.patientCopay,
        insurancePays: result.insurancePays,
        savings: result.savings,
        tierUsed: result.tierUsed,
        notes: result.notes,
      })
    }

    const retailTotal = lineItems.reduce((sum, item) => sum + item.retailPrice, 0)
    const patientTotal = lineItems.reduce((sum, item) => sum + item.patientCopay, 0)
    const insuranceTotal = lineItems.reduce((sum, item) => sum + item.insurancePays, 0)
    const totalSavings = lineItems.reduce((sum, item) => sum + item.savings, 0)

    return {
      authorizationId: '', // Set by caller
      carrier: 'EyeMed',
      planName: auth.plan.planName,
      items: lineItems,
      retailTotal,
      patientTotal,
      insuranceTotal,
      totalSavings,
      examCopay: auth.copays.exam,
      materialsCopay: auth.copays.materials,
      calculatedAt: new Date(),
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  private getProgressiveCopay(
    auth: EyemedBenefitAuthorization,
    tier: NonNullable<ProductCatalogEntry['eyemed']>['progressiveTier']
  ): number {
    switch (tier) {
      case 'standard':
        return auth.copays.progressiveStandard
      case 'tier_1':
        return auth.copays.progressivePremiumTier1
      case 'tier_2':
        return auth.copays.progressivePremiumTier2
      case 'tier_3':
        return auth.copays.progressivePremiumTier3
      case 'tier_4':
        return auth.copays.progressivePremiumTier4
      case 'tier_5':
        return auth.copays.progressivePremiumTier5
      default:
        return 0
    }
  }

  private getArCopay(
    auth: EyemedBenefitAuthorization,
    tier: NonNullable<ProductCatalogEntry['eyemed']>['arTier']
  ): number {
    switch (tier) {
      case 'standard':
        return auth.copays.arStandard
      case 'tier_1':
        return auth.copays.arPremiumTier1
      case 'tier_2':
        return auth.copays.arPremiumTier2
      case 'tier_3':
        return auth.copays.arPremiumTier3
      default:
        return 0
    }
  }

  private getMaterialCopay(
    auth: EyemedBenefitAuthorization,
    materialType: NonNullable<ProductCatalogEntry['eyemed']>['materialType']
  ): { copay: number; notes?: string } {
    switch (materialType) {
      case 'polycarbonate': {
        // Check age for free poly for children
        const patientAge = auth.patient.age
        const maxChildAge = auth.specialRules.polycarbonateFreeCbildAgeMax
        if (patientAge !== null && patientAge <= maxChildAge) {
          const copay = auth.copays.materialPolycarbonateChild
          if (copay === 'covered') {
            return { copay: 0, notes: `Polycarbonate covered (age ${patientAge})` }
          }
          return { copay: typeof copay === 'number' ? copay : 0 }
        }
        const copay = auth.copays.materialPolycarbonate
        if (copay === 'covered') return { copay: 0, notes: 'Polycarbonate covered' }
        return { copay }
      }
      case 'trivex':
        return { copay: auth.copays.materialTrivex }
      case 'high_index_167':
        return { copay: auth.copays.materialHighIndex167 ?? auth.copays.materialHighIndex }
      case 'high_index_174':
        return { copay: auth.copays.materialHighIndex174 ?? auth.copays.materialHighIndex }
      default:
        return { copay: 0 }
    }
  }
}

// =============================================================================
// SPECTERA CALCULATOR
// =============================================================================

export class SpecteraPricingCalculator implements IPricingCalculator {
  calculateProduct(
    product: ProductCatalogEntry,
    auth: BenefitAuthorization,
    overrideRetailPrice?: number
  ): PricingResult {
    if (!isSpecteraAuth(auth)) {
      throw new Error('SpecteraPricingCalculator requires Spectera authorization')
    }

    const retailPrice = overrideRetailPrice ?? product.retailPrice
    const warnings: string[] = []
    let tierUsed: string | undefined
    let patientCopay = retailPrice
    let notes: string | undefined

    const specteraMapping = product.spectera

    switch (product.category) {
      case 'lens_sv':
        patientCopay = auth.copays.lensStandard
        tierUsed = 'single_vision'
        break

      case 'lens_progressive':
        if (specteraMapping?.progressiveTier) {
          patientCopay = this.getProgressiveCopay(auth, specteraMapping.progressiveTier)
          tierUsed = specteraMapping.progressiveTier
        } else {
          // Non-formulary: 80% of billed charges
          patientCopay = retailPrice * 0.80
          tierUsed = 'non-formulary'
          warnings.push('No Spectera progressive tier mapping, using 80% of billed')
        }
        break

      case 'ar_coating':
        if (specteraMapping?.arTier) {
          patientCopay = this.getArCopay(auth, specteraMapping.arTier)
          tierUsed = specteraMapping.arTier
        } else {
          // Non-formulary: 80% of billed charges
          patientCopay = retailPrice * 0.80
          tierUsed = 'non-formulary'
          warnings.push('No Spectera AR tier mapping, using 80% of billed')
        }
        break

      case 'material':
        if (specteraMapping?.materialType) {
          const result = this.getMaterialCopay(auth, specteraMapping.materialType, retailPrice)
          patientCopay = result.copay
          tierUsed = specteraMapping.materialType
          if (result.notes) notes = result.notes
        } else {
          warnings.push('No Spectera material mapping, using retail')
        }
        break

      case 'photochromic':
        patientCopay = auth.copays.photochromic
        tierUsed = 'photochromic'
        break

      case 'polarized': {
        // Spectera polarized may be "80% billed"
        const polarizedCopay = auth.copays.polarized
        if (typeof polarizedCopay === 'string') {
          patientCopay = retailPrice * 0.80
          notes = 'Polarized: 80% of billed'
        } else {
          patientCopay = polarizedCopay
        }
        tierUsed = 'polarized'
        break
      }

      case 'tint':
        patientCopay = auth.copays.tint
        tierUsed = 'tint'
        break

      case 'mount_fee':
        // Mount fees for Spectera: standard = $0, rimless/semi_rimless = retail
        const specteraMountCode = specteraMapping?.materialType || 'standard'
        if (specteraMountCode === 'standard') {
          patientCopay = 0
          tierUsed = 'standard'
        } else {
          // Rimless and semi-rimless typically patient responsibility
          patientCopay = retailPrice
          tierUsed = specteraMountCode
        }
        break

      default:
        warnings.push(`No pricing rule for category: ${product.category}`)
    }

    const insurancePays = Math.max(0, retailPrice - patientCopay)
    const savings = insurancePays

    return {
      sku: product.sku,
      displayName: product.displayName,
      category: product.category,
      retailPrice,
      patientCopay,
      insurancePays,
      savings,
      tierUsed,
      notes,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  calculateFrame(
    product: ProductCatalogEntry,
    auth: BenefitAuthorization,
    retailPrice: number,
  ): FramePricingResult {
    if (!isSpecteraAuth(auth)) {
      throw new Error('SpecteraPricingCalculator requires Spectera authorization')
    }

    const allowance = auth.copays.frameAllowance
    // Spectera uses frameOveragePercent = what PATIENT PAYS (e.g., 0.70 = 70%)
    const overagePercent = auth.copays.frameOveragePercent

    let overage = 0
    let overageAfterPercent = 0
    let patientCopay = 0

    if (retailPrice <= allowance) {
      patientCopay = 0
    } else {
      overage = retailPrice - allowance
      // Patient pays overagePercent of the overage amount
      overageAfterPercent = overage * overagePercent
      patientCopay = overageAfterPercent
    }

    const insurancePays = Math.min(allowance, retailPrice) + (overage - overageAfterPercent)
    const savings = retailPrice - patientCopay

    return {
      sku: product.sku,
      displayName: product.displayName,
      category: 'frame',
      retailPrice,
      patientCopay,
      insurancePays,
      savings,
      tierUsed: 'frame_allowance',
      allowance,
      overage,
      overageDiscount: 1 - overagePercent, // Convert to discount for interface compatibility
      overageAfterDiscount: overageAfterPercent,
      notes: overage > 0
        ? `Frame overage $${overage.toFixed(2)}, patient pays ${(overagePercent * 100).toFixed(0)}%`
        : undefined,
    }
  }

  buildQuote(
    items: QuoteItem[],
    products: Map<string, ProductCatalogEntry>,
    auth: BenefitAuthorization
  ): QuoteResult {
    if (!isSpecteraAuth(auth)) {
      throw new Error('SpecteraPricingCalculator requires Spectera authorization')
    }

    const lineItems: QuoteLineItem[] = []
    const warnings: string[] = []

    for (const item of items) {
      const product = products.get(item.sku)
      if (!product) {
        warnings.push(`Product not found: ${item.sku}`)
        continue
      }

      let result: PricingResult

      if (product.category === 'frame') {
        result = this.calculateFrame(product, auth, item.retailPrice)
      } else {
        result = this.calculateProduct(product, auth, item.retailPrice)
      }

      if (result.warnings) {
        warnings.push(...result.warnings)
      }

      lineItems.push({
        sku: result.sku,
        displayName: result.displayName,
        category: result.category,
        retailPrice: result.retailPrice,
        patientCopay: result.patientCopay,
        insurancePays: result.insurancePays,
        savings: result.savings,
        tierUsed: result.tierUsed,
        notes: result.notes,
      })
    }

    const retailTotal = lineItems.reduce((sum, item) => sum + item.retailPrice, 0)
    const patientTotal = lineItems.reduce((sum, item) => sum + item.patientCopay, 0)
    const insuranceTotal = lineItems.reduce((sum, item) => sum + item.insurancePays, 0)
    const totalSavings = lineItems.reduce((sum, item) => sum + item.savings, 0)

    // Get exam copay based on patient age
    let examCopay = auth.copays.examAdult
    if (auth.patient.age !== null && auth.patient.age < 18) {
      examCopay = auth.copays.examPediatric
    }

    return {
      authorizationId: '',
      carrier: 'Spectera',
      planName: auth.plan.planName,
      items: lineItems,
      retailTotal,
      patientTotal,
      insuranceTotal,
      totalSavings,
      examCopay,
      materialsCopay: auth.copays.materials,
      calculatedAt: new Date(),
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  private getProgressiveCopay(
    auth: SpecteraBenefitAuthorization,
    tier: NonNullable<ProductCatalogEntry['spectera']>['progressiveTier']
  ): number {
    switch (tier) {
      case 'I':
        return auth.copays.progressiveTierI
      case 'II':
        return auth.copays.progressiveTierII
      case 'III':
        return auth.copays.progressiveTierIII
      case 'IV':
        return auth.copays.progressiveTierIV
      case 'V':
        return auth.copays.progressiveTierV
      default:
        return 0
    }
  }

  private getArCopay(
    auth: SpecteraBenefitAuthorization,
    tier: NonNullable<ProductCatalogEntry['spectera']>['arTier']
  ): number {
    switch (tier) {
      case 'I':
        return auth.copays.arTierI
      case 'II':
        return auth.copays.arTierII
      case 'III':
        return auth.copays.arTierIII
      case 'IV':
        return auth.copays.arTierIV
      default:
        return 0
    }
  }

  private getMaterialCopay(
    auth: SpecteraBenefitAuthorization,
    materialType: NonNullable<ProductCatalogEntry['spectera']>['materialType'],
    retailPrice: number
  ): { copay: number; notes?: string } {
    switch (materialType) {
      case 'polycarbonate': {
        // Check age for free poly for children
        const patientAge = auth.patient.age
        const maxChildAge = auth.specialRules.polycarbonateFreeCbildAgeMax
        if (patientAge !== null && patientAge <= maxChildAge) {
          const copay = auth.copays.materialPolycarbonateChild
          if (copay === 'covered') {
            return { copay: 0, notes: `Polycarbonate covered (age ${patientAge})` }
          }
          return { copay: typeof copay === 'number' ? copay : 0 }
        }
        return { copay: auth.copays.materialPolycarbonateAdult }
      }
      case 'trivex':
        return { copay: auth.copays.materialTrivex ?? 0 }
      case 'high_index': {
        // Use 1.60-1.66 tier by default
        return { copay: auth.copays.materialHighIndex160166 }
      }
      default:
        return { copay: 0 }
    }
  }
}

// =============================================================================
// VSP CALCULATOR
// =============================================================================

export class VspPricingCalculator implements IPricingCalculator {
  calculateProduct(
    product: ProductCatalogEntry,
    auth: BenefitAuthorization,
    overrideRetailPrice?: number
  ): PricingResult {
    if (!isVspAuth(auth)) {
      throw new Error('VspPricingCalculator requires VSP authorization')
    }

    const retailPrice = overrideRetailPrice ?? product.retailPrice
    const warnings: string[] = []
    let tierUsed: string | undefined
    let patientCopay = retailPrice
    let notes: string | undefined

    const vspMapping = product.vsp

    switch (product.category) {
      case 'lens_progressive':
        if (vspMapping?.baseCode) {
          const code = vspMapping.baseCode
          const copay = auth.planTier.progressiveCopays[code]
          if (copay !== undefined) {
            // Check pricing rule for this code
            const rule = auth.specialRules.pricingRules[code] || 'copay'
            patientCopay = this.applyPricingRule(rule, copay, retailPrice)
            tierUsed = code
            if (rule !== 'copay') {
              notes = `Pricing rule: ${rule}`
            }
          } else {
            warnings.push(`VSP code ${code} not found in plan tier, using retail`)
          }
        } else {
          warnings.push('No VSP base code mapping, using retail')
        }
        break

      case 'ar_coating':
        if (vspMapping?.arCode) {
          const code = vspMapping.arCode
          const copay = auth.planTier.arCopays[code]
          if (copay !== undefined) {
            const rule = auth.specialRules.pricingRules[code] || 'copay'
            patientCopay = this.applyPricingRule(rule, copay, retailPrice)
            tierUsed = code
            if (rule !== 'copay') {
              notes = `Pricing rule: ${rule}`
            }
          } else {
            warnings.push(`VSP AR code ${code} not found in plan tier, using retail`)
          }
        } else {
          warnings.push('No VSP AR code mapping, using retail')
        }
        break

      case 'material':
        if (vspMapping?.materialModifier) {
          const result = this.getMaterialCopay(auth, vspMapping.materialModifier)
          patientCopay = result.copay
          tierUsed = vspMapping.materialModifier
        } else {
          warnings.push('No VSP material modifier, using retail')
        }
        break

      case 'photochromic':
        patientCopay = auth.planTier.enhancementCopays.photochromic
        tierUsed = 'photochromic'
        break

      case 'polarized':
        patientCopay = auth.planTier.enhancementCopays.polarized
        tierUsed = 'polarized'
        break

      case 'blue_light':
        patientCopay = auth.planTier.enhancementCopays.blueLightFilter
        tierUsed = 'blue_light'
        break

      case 'tint':
        patientCopay = auth.planTier.enhancementCopays.tint
        tierUsed = 'tint'
        break

      case 'mount_fee':
        // Mount fees: standard (full rim) = $0, semi_rimless = retail, SW (rimless) = $30
        const mountCode = product.vsp?.baseCode
        if (mountCode === 'standard') {
          // Full rim - no charge
          patientCopay = 0
          tierUsed = 'standard'
          notes = 'Full rim mount - no charge'
        } else if (mountCode === 'SW') {
          // Rimless drill - VSP code SW ($30)
          patientCopay = 30
          tierUsed = 'SW'
          notes = 'Rimless drill mount'
        } else if (mountCode === 'semi_rimless') {
          // Semi-rimless - typically retail/U&C
          patientCopay = retailPrice
          tierUsed = 'semi_rimless'
          notes = 'Semi-rimless mount'
        } else {
          // Unknown mount type - charge retail
          patientCopay = retailPrice
        }
        break

      case 'addon':
        // For add-ons with enhancement codes (polarized, tint, blue light), look up copay
        const vspEnhancement = product.vsp as { enhancementCode?: string } | undefined
        if (vspEnhancement?.enhancementCode) {
          const code = vspEnhancement.enhancementCode
          // Map enhancement codes to copays
          if (code === 'DA') {
            patientCopay = auth.planTier.enhancementCopays.polarized
            tierUsed = 'DA'
          } else if (code === 'PR') {
            patientCopay = auth.planTier.enhancementCopays.photochromic
            tierUsed = 'PR'
          } else if (code === 'LF') {
            patientCopay = auth.planTier.enhancementCopays.blueLightFilter
            tierUsed = 'LF'
          } else if (code === 'MN' || code === 'MP') {
            patientCopay = auth.planTier.enhancementCopays.tint
            tierUsed = code
          } else {
            // Unknown enhancement code, charge retail
            patientCopay = retailPrice
          }
        } else {
          // No enhancement code, charge retail (mount fees, prism, etc.)
          patientCopay = retailPrice
        }
        break

      default:
        warnings.push(`No pricing rule for category: ${product.category}`)
    }

    const insurancePays = Math.max(0, retailPrice - patientCopay)
    const savings = insurancePays

    return {
      sku: product.sku,
      displayName: product.displayName,
      category: product.category,
      retailPrice,
      patientCopay,
      insurancePays,
      savings,
      tierUsed,
      notes,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  calculateFrame(
    product: ProductCatalogEntry,
    auth: BenefitAuthorization,
    retailPrice: number,
    isFeaturedBrand?: boolean
  ): FramePricingResult {
    if (!isVspAuth(auth)) {
      throw new Error('VspPricingCalculator requires VSP authorization')
    }

    // VSP has different allowances for featured (Altair/Marchon) vs non-featured brands
    const featured = isFeaturedBrand ?? product.vsp?.isFeaturedBrand ?? false
    const allowance = featured
      ? auth.copays.frameAllowanceFeatured
      : auth.copays.frameAllowanceNonFeatured
    // Normalize discount to decimal (0.20 = 20%) in case stored as integer (20)
    let overageDiscount = auth.copays.frameOverageDiscount
    if (overageDiscount > 1) {
      overageDiscount = overageDiscount / 100
    }

    let overage = 0
    let overageAfterDiscount = 0
    let patientCopay = 0

    if (retailPrice <= allowance) {
      patientCopay = 0
    } else {
      overage = retailPrice - allowance
      overageAfterDiscount = overage * (1 - overageDiscount)
      patientCopay = overageAfterDiscount
    }

    const insurancePays = Math.min(allowance, retailPrice)
    const savings = retailPrice - patientCopay

    return {
      sku: product.sku,
      displayName: product.displayName,
      category: 'frame',
      retailPrice,
      patientCopay,
      insurancePays,
      savings,
      tierUsed: featured ? 'featured_frame' : 'non_featured_frame',
      allowance,
      overage,
      overageDiscount,
      overageAfterDiscount,
      notes: overage > 0
        ? `${featured ? 'Featured' : 'Non-featured'} frame, overage $${overage.toFixed(2)}, ${(overageDiscount * 100).toFixed(0)}% discount`
        : `${featured ? 'Featured' : 'Non-featured'} frame allowance: $${allowance}`,
    }
  }

  buildQuote(
    items: QuoteItem[],
    products: Map<string, ProductCatalogEntry>,
    auth: BenefitAuthorization
  ): QuoteResult {
    if (!isVspAuth(auth)) {
      throw new Error('VspPricingCalculator requires VSP authorization')
    }

    const lineItems: QuoteLineItem[] = []
    const warnings: string[] = []

    for (const item of items) {
      const product = products.get(item.sku)
      if (!product) {
        warnings.push(`Product not found: ${item.sku}`)
        continue
      }

      let result: PricingResult

      if (product.category === 'frame') {
        result = this.calculateFrame(product, auth, item.retailPrice)
      } else {
        result = this.calculateProduct(product, auth, item.retailPrice)
      }

      if (result.warnings) {
        warnings.push(...result.warnings)
      }

      lineItems.push({
        sku: result.sku,
        displayName: result.displayName,
        category: result.category,
        retailPrice: result.retailPrice,
        patientCopay: result.patientCopay,
        insurancePays: result.insurancePays,
        savings: result.savings,
        tierUsed: result.tierUsed,
        notes: result.notes,
      })
    }

    const retailTotal = lineItems.reduce((sum, item) => sum + item.retailPrice, 0)
    const patientTotal = lineItems.reduce((sum, item) => sum + item.patientCopay, 0)
    const insuranceTotal = lineItems.reduce((sum, item) => sum + item.insurancePays, 0)
    const totalSavings = lineItems.reduce((sum, item) => sum + item.savings, 0)

    return {
      authorizationId: '',
      carrier: 'VSP',
      planName: auth.plan.planName,
      items: lineItems,
      retailTotal,
      patientTotal,
      insuranceTotal,
      totalSavings,
      examCopay: auth.copays.examWellvision,
      materialsCopay: auth.copays.materials,
      calculatedAt: new Date(),
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  private applyPricingRule(
    rule: string,
    copay: number,
    retailPrice: number
  ): number {
    switch (rule) {
      case 'copay':
        return copay
      case 'lower_of_copay_or_uc':
        return Math.min(copay, retailPrice)
      case 'lower_of_copay_or_80_uc':
        return Math.min(copay, retailPrice * 0.8)
      case '80_percent_uc':
        return retailPrice * 0.8
      case 'add_to_base':
        // This is typically used for add-ons that stack
        return copay
      default:
        return copay
    }
  }

  private getMaterialCopay(
    auth: VspBenefitAuthorization,
    modifier: NonNullable<ProductCatalogEntry['vsp']>['materialModifier']
  ): { copay: number } {
    switch (modifier) {
      case 'D': { // Polycarbonate
        const copay = auth.planTier.materialCopays.polycarbonate
        if (copay === 'covered') return { copay: 0 }
        return { copay }
      }
      case 'T': // Trivex
        return { copay: auth.planTier.materialCopays.trivex }
      case 'H': // High index (use 1.67 as default)
        return { copay: auth.planTier.materialCopays.highIndex167 }
      default:
        return { copay: 0 }
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createPricingCalculator(auth: BenefitAuthorization): IPricingCalculator {
  if (isEyemedAuth(auth)) {
    return new EyemedPricingCalculator()
  }
  if (isSpecteraAuth(auth)) {
    return new SpecteraPricingCalculator()
  }
  if (isVspAuth(auth)) {
    return new VspPricingCalculator()
  }
  throw new Error(`Unknown carrier: ${(auth as { plan: { carrier: string } }).plan.carrier}`)
}

// =============================================================================
// CONVENIENCE FUNCTION - Calculate full quote
// =============================================================================

export function calculateQuote(
  items: QuoteItem[],
  products: Map<string, ProductCatalogEntry>,
  auth: BenefitAuthorization,
  authorizationId: string
): QuoteResult {
  const calculator = createPricingCalculator(auth)
  const result = calculator.buildQuote(items, products, auth)
  result.authorizationId = authorizationId
  return result
}
