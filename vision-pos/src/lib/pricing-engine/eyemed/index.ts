/**
 * EyeMed Pricing Engine
 *
 * Usage:
 *   import { calculateEyeMedPricing, EYEMED_PRODUCTS } from '@/lib/pricing-engine/eyemed'
 *
 *   const results = calculateEyeMedPricing(extractedBenefits)
 */

// Types
export * from './types'

// Product catalog
export { EYEMED_PRODUCTS, getProductsByCategory, getCategories, findProduct } from './product-catalog'

// Calculator
export { calculateProductCost, calculateAllProducts } from './calculator'

// Static rules
export { applyStaticRules, getApplicableRules, ALL_STATIC_RULES } from './static-rules'

// Formula parser (legacy)
export { parseFormula, calculateFromFormula, parseAndCalculate as legacyParseAndCalculate } from './formula-parser'
export type { FormulaType, ParsedFormula } from './formula-parser'

// ============================================================
// ELEMENTAL PRICING (New - Simplified Architecture)
// ============================================================

// Product-to-Tier Formulary
export {
  PROGRESSIVE_FORMULARY,
  AR_FORMULARY,
  UV_SURCHARGE_PRODUCTS,
  getProgressiveTier,
  getARTier,
  requiresUVSurcharge,
  findProductTier
} from './formulary'
export type { ProgressiveTier, ARTier } from './formulary'

// Benefit String Parser
export {
  parseBenefitString,
  calculateFromBenefit,
  parseAndCalculate
} from './benefit-parser'
export type { BenefitType, ParsedBenefit } from './benefit-parser'

// ============================================================

// Extraction prompt
export { EYEMED_EXTRACTION_PROMPT, parseExtractionResponse } from './extraction-prompt'

// Main engine
export {
  calculateEyeMedPricing,
  generatePatientPriceList,
  getPriceListByCategory,
  calculateSingleProduct,
  getPatientCost,
  formatCurrency,
  getPriceListSummary
} from './engine'
