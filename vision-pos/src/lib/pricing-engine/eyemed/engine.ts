/**
 * EyeMed Pricing Engine
 * Main entry point that orchestrates pricing calculation
 */

import { Product, ExtractedBenefits, PricingResult, PatientPriceList } from './types'
import { EYEMED_PRODUCTS, getCategories } from './product-catalog'
import { calculateProductCost, calculateAllProducts } from './calculator'
import { applyStaticRules, getApplicableRules } from './static-rules'

/**
 * Calculate pricing for all products given extracted benefits
 */
export function calculateEyeMedPricing(
  benefits: ExtractedBenefits,
  products: Product[] = EYEMED_PRODUCTS
): PricingResult[] {
  const results: PricingResult[] = []

  for (const product of products) {
    // Calculate base pricing
    let result = calculateProductCost(product, benefits)

    // Apply static rules (UV surcharge, cash only, etc.)
    result = applyStaticRules(result, product, benefits)

    results.push(result)
  }

  return results
}

/**
 * Generate a full patient price list
 */
export function generatePatientPriceList(
  benefits: ExtractedBenefits,
  products: Product[] = EYEMED_PRODUCTS
): PatientPriceList {
  const pricedProducts = calculateEyeMedPricing(benefits, products)

  return {
    patient: {
      name: benefits.patient_name ?? 'Unknown',
      memberId: benefits.member_id ?? '',
      dob: benefits.patient_dob ?? '',
      age: benefits.patient_age ?? 0,
      planName: benefits.plan_name ?? 'Unknown Plan'
    },
    benefits,
    products: pricedProducts,
    generatedAt: new Date().toISOString()
  }
}

/**
 * Get price list grouped by category
 */
export function getPriceListByCategory(
  benefits: ExtractedBenefits,
  products: Product[] = EYEMED_PRODUCTS
): Map<string, PricingResult[]> {
  const results = calculateEyeMedPricing(benefits, products)
  const byCategory = new Map<string, PricingResult[]>()

  for (const result of results) {
    const category = result.product.category
    if (!byCategory.has(category)) {
      byCategory.set(category, [])
    }
    byCategory.get(category)!.push(result)
  }

  return byCategory
}

/**
 * Calculate pricing for a single product
 */
export function calculateSingleProduct(
  product: Product,
  benefits: ExtractedBenefits
): PricingResult {
  let result = calculateProductCost(product, benefits)
  result = applyStaticRules(result, product, benefits)
  return result
}

/**
 * Quick price check - returns just the patient cost
 */
export function getPatientCost(
  product: Product,
  benefits: ExtractedBenefits
): number {
  const result = calculateSingleProduct(product, benefits)
  return result.patientCost
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return amount === 0 ? '$0.00' : `$${amount.toFixed(2)}`
}

/**
 * Get summary statistics for a price list
 */
export function getPriceListSummary(results: PricingResult[]): {
  totalProducts: number
  coveredProducts: number
  cashOnlyProducts: number
  averagePatientCost: number
  totalRetailValue: number
  totalPatientCost: number
} {
  const covered = results.filter(r => r.product.type !== 'cash_only')
  const cashOnly = results.filter(r => r.product.type === 'cash_only')
  const totalRetail = results.reduce((sum, r) => sum + r.product.retail, 0)
  const totalPatient = results.reduce((sum, r) => sum + r.patientCost, 0)

  return {
    totalProducts: results.length,
    coveredProducts: covered.length,
    cashOnlyProducts: cashOnly.length,
    averagePatientCost: totalPatient / results.length,
    totalRetailValue: totalRetail,
    totalPatientCost: totalPatient
  }
}
