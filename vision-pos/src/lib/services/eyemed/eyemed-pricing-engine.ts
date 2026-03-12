/**
 * EyeMed Pricing Engine
 *
 * Main orchestrator that combines:
 * 1. Product-to-tier matching
 * 2. Formula parsing and calculation
 * 3. Static rules application
 * 4. Final OOP calculation
 */

import { ProductCatalogEntry, QuoteLineItem } from '@/types/product-catalog'
import { EyemedBenefitAuthorization } from '@/types/benefit-authorization'
import {
  EyeMedPricingResult,
  RuleContext,
  ProductMatchResult,
} from './eyemed-formula-types'
import {
  parseAndCalculate,
  FormulaResult,
} from './eyemed-formula-parser'
import { applyStaticRules } from './eyemed-static-rules'
import { matchProductToAuth } from './eyemed-product-matcher'

// =============================================================================
// PRICING ENGINE - MAIN ENTRY POINT
// =============================================================================

/**
 * Calculate pricing for EyeMed products
 *
 * @param auth - EyeMed benefit authorization
 * @param products - Products to price
 * @param options - Optional calculation options
 * @returns Pricing result with priced line items
 */
export async function calculateEyeMedPricing(
  auth: EyemedBenefitAuthorization,
  products: ProductCatalogEntry[],
  options?: {
    customerId?: string
    isSecondPair?: boolean
  }
): Promise<EyeMedPricingResult> {
  const result: EyeMedPricingResult = {
    authorizationId: '', // Will be set if available
    customerId: options?.customerId ?? '',
    carrier: 'eyemed',
    calculatedAt: new Date(),
    pricedProducts: [],
    retailTotal: 0,
    patientTotal: 0,
    insuranceTotal: 0,
    totalSavings: 0,
    warnings: [],
    debugInfo: {
      productsProcessed: 0,
      formulasApplied: 0,
      rulesApplied: 0,
      fallbacksUsed: 0,
    },
  }

  // Process each product
  for (const product of products) {
    const lineItem = priceProduct(
      product,
      auth,
      {
        ...options,
        patientAge: auth.patient.age,
      }
    )

    result.pricedProducts.push(lineItem)
    result.retailTotal += lineItem.retailPrice
    result.patientTotal += lineItem.patientCopay
    result.insuranceTotal += lineItem.insurancePays
    result.totalSavings += lineItem.savings

    // Track debug info
    result.debugInfo!.productsProcessed++
    if (lineItem.notes?.includes('formula')) {
      result.debugInfo!.formulasApplied++
    }
    if (lineItem.notes?.some((n) => n.includes('rule'))) {
      result.debugInfo!.rulesApplied++
    }
    if (lineItem.needsTierAssignment) {
      result.debugInfo!.fallbacksUsed++
    }
  }

  // Round totals to 2 decimals
  result.retailTotal = Math.round(result.retailTotal * 100) / 100
  result.patientTotal = Math.round(result.patientTotal * 100) / 100
  result.insuranceTotal = Math.round(result.insuranceTotal * 100) / 100
  result.totalSavings = Math.round(result.totalSavings * 100) / 100

  return result
}

// =============================================================================
// SINGLE PRODUCT PRICING
// =============================================================================

/**
 * Price a single product
 */
function priceProduct(
  product: ProductCatalogEntry,
  auth: EyemedBenefitAuthorization,
  options?: {
    customerId?: string
    patientAge?: number | null
    isSecondPair?: boolean
    isFirstTimeProgressive?: boolean
  }
): QuoteLineItem {
  const notes: string[] = []

  // Step 1: Match product to auth benefit
  const matchResult = matchProductToAuth(product, auth)
  notes.push(`Matched: ${matchResult.tier}`)

  // Step 2: Handle cash-only products
  if ((product.tags ?? []).includes('cash-only')) {
    return {
      sku: product.sku,
      displayName: product.displayName,
      category: product.category,
      retailPrice: product.retailPrice,
      patientCopay: product.retailPrice,
      insurancePays: 0,
      savings: 0,
      tierUsed: 'cash-only',
      notes: ['Cash-only product - insurance does not apply'],
      needsTierAssignment: false,
    }
  }

  // Step 3: Parse and calculate formula
  let formulaResult: FormulaResult | null = null
  let basePrice = product.retailPrice

  if (matchResult.benefitValue && matchResult.isFormula) {
    formulaResult = parseAndCalculate(matchResult.benefitValue, product.retailPrice)
    notes.push(`Formula type: ${formulaResult.formulaType}`)
    notes.push(...formulaResult.notes)
  } else if (matchResult.benefitValue && typeof matchResult.benefitValue === 'number') {
    // Simple copay or allowance
    formulaResult = parseAndCalculate(matchResult.benefitValue, product.retailPrice)
    notes.push(`Copay: $${matchResult.benefitValue}`)
  } else if (matchResult.fallbackUsed) {
    // Fallback to 80% of retail
    formulaResult = parseAndCalculate(null, product.retailPrice)
    notes.push('Fallback: 80% of retail applied')
  } else {
    // Default: assume covered
    formulaResult = parseAndCalculate('covered', product.retailPrice)
  }

  // Calculate initial OOP and insurance
  let patientOop = formulaResult.patientOop
  let insurancePays = formulaResult.insurancePays

  // Step 4: Apply static rules
  const ruleContext: RuleContext = {
    auth,
    product,
    quantity: 1,
    patientAge: options?.patientAge ?? null,
    isFirstTimeProgressive: options?.isFirstTimeProgressive,
  }

  const rulesResult = applyStaticRules(ruleContext, basePrice, {
    isSecondPair: options?.isSecondPair,
  })

  basePrice = rulesResult.finalPrice
  notes.push(...rulesResult.appliedRules.map((r) => `${r.ruleName}: ${r.notes.join(' ')}`))

  // Apply surcharges to patient cost
  const totalSurcharges = rulesResult.appliedRules
    .filter((r) => r.action === 'add_surcharge')
    .reduce((sum, r) => sum + r.surchargeAmount, 0)

  patientOop += totalSurcharges

  // Step 5: Calculate final values
  const finalRetailPrice = basePrice
  const savings = insurancePays
  const finalPatientCopay = Math.max(0, Math.round(patientOop * 100) / 100)
  const finalInsurancePays = Math.max(0, Math.round(insurancePays * 100) / 100)

  return {
    sku: product.sku,
    displayName: product.displayName,
    category: product.category,
    pricingCategory: product.category,
    retailPrice: finalRetailPrice,
    patientCopay: finalPatientCopay,
    insurancePays: finalInsurancePays,
    savings: Math.max(0, finalInsurancePays),
    tierUsed: matchResult.tier,
    notes: notes,
    needsTierAssignment: matchResult.fallbackUsed,
  }
}

// =============================================================================
// HELPER: Price multiple products with custom product catalog
// =============================================================================

/**
 * Price a batch of products using a product catalog lookup
 */
export async function priceProductBatch(
  auth: EyemedBenefitAuthorization,
  skus: string[],
  productCatalog: Map<string, ProductCatalogEntry>,
  options?: {
    customerId?: string
    isSecondPair?: boolean
  }
): Promise<EyeMedPricingResult> {
  const productsToPrice: ProductCatalogEntry[] = []

  for (const sku of skus) {
    const product = productCatalog.get(sku)
    if (!product) {
      console.warn(`Product not found in catalog: ${sku}`)
      continue
    }
    productsToPrice.push(product)
  }

  return calculateEyeMedPricing(auth, productsToPrice, options)
}

// =============================================================================
// HELPER: Validate authorization has required fields
// =============================================================================

/**
 * Validate that an EyeMed authorization has the minimum required fields
 */
export function validateEyemedAuthorization(
  auth: EyemedBenefitAuthorization
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!auth.patient || !auth.patient.memberId) {
    errors.push('Patient missing or no member ID')
  }

  if (!auth.plan || auth.plan.carrier !== 'eyemed') {
    errors.push('Plan missing or not EyeMed')
  }

  if (!auth.frequency) {
    errors.push('Frequency missing')
  }

  if (!auth.copays) {
    errors.push('Copays missing')
  }

  if (!auth.specialRules) {
    errors.push('Special rules missing')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
