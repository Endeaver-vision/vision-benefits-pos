/**
 * EyeMed Static Rules
 * Rules that apply surcharges, fallbacks, and special pricing logic
 */

import { Product, ExtractedBenefits, PricingResult, StaticRule } from './types'

// UV Surcharge amount for qualifying AR coatings
const UV_SURCHARGE_AMOUNT = 15

/**
 * UV Surcharge Rule
 * Crizal Sapphire, Rock, EZ Pro, and SunShield require a $15 UV surcharge
 */
export const uvSurchargeRule: StaticRule = {
  name: 'UV Surcharge',
  description: 'Adds $15 UV surcharge for Crizal AR coatings with backside UV',

  applies: (product: Product) => {
    return product.backsideUvSurcharge === true
  },

  modify: (result: PricingResult, product: Product) => {
    return {
      ...result,
      patientCost: result.patientCost + UV_SURCHARGE_AMOUNT,
      note: `${result.note} + $${UV_SURCHARGE_AMOUNT} UV surcharge`,
      breakdown: {
        ...result.breakdown,
        surcharge: UV_SURCHARGE_AMOUNT
      }
    }
  }
}

/**
 * Cash Only Rule
 * Ensures cash only products always return full retail
 */
export const cashOnlyRule: StaticRule = {
  name: 'Cash Only',
  description: 'Cash only products are not covered - full retail applies',

  applies: (product: Product) => {
    return product.cashOnly === true || product.type === 'cash_only'
  },

  modify: (result: PricingResult, product: Product) => {
    return {
      ...result,
      patientCost: product.retail,
      note: 'Cash only — not covered by vision plan'
    }
  }
}

/**
 * Poly Under 18 Rule
 * Polycarbonate is free for patients under 18 (if plan allows)
 */
export const polyUnder18Rule: StaticRule = {
  name: 'Poly Under 18',
  description: 'Polycarbonate is free for patients under 18',

  applies: (product: Product, benefits: ExtractedBenefits) => {
    return (
      product.type === 'material_poly' &&
      benefits.poly_free_under_18 === true &&
      (benefits.patient_age ?? 99) < 18
    )
  },

  modify: (result: PricingResult) => {
    return {
      ...result,
      patientCost: 0,
      note: 'Free — patient under 18'
    }
  }
}

/**
 * All static rules in order of application
 */
export const ALL_STATIC_RULES: StaticRule[] = [
  cashOnlyRule,
  polyUnder18Rule,
  uvSurchargeRule  // Apply surcharges last
]

/**
 * Apply all applicable static rules to a pricing result
 */
export function applyStaticRules(
  result: PricingResult,
  product: Product,
  benefits: ExtractedBenefits
): PricingResult {
  let modified = result

  for (const rule of ALL_STATIC_RULES) {
    if (rule.applies(product, benefits)) {
      modified = rule.modify(modified, product, benefits)
    }
  }

  return modified
}

/**
 * Get list of rules that apply to a product
 */
export function getApplicableRules(
  product: Product,
  benefits: ExtractedBenefits
): string[] {
  return ALL_STATIC_RULES
    .filter(rule => rule.applies(product, benefits))
    .map(rule => rule.name)
}
