/**
 * EyeMed Pricing Engine Type Definitions
 *
 * Defines all data structures used in formula parsing,
 * rule application, and final pricing calculations.
 */

import { ProductCatalogEntry, QuoteLineItem } from '@/types/product-catalog'
import { EyemedBenefitAuthorization } from '@/types/benefit-authorization'

// =============================================================================
// FORMULA PARSING TYPES
// =============================================================================

/**
 * Different formula patterns extracted from benefit strings
 *
 * Examples:
 * - "$45 copay" → FormulaType.FIXED_COPAY
 * - "$0 copay; 20% off balance over $250 allowance" → FormulaType.ALLOWANCE_WITH_OVERAGE
 * - "$90; 20% off retail price less $120 allowance" → FormulaType.TIERED_ALLOWANCE
 */
export enum FormulaType {
  FIXED_COPAY = 'FIXED_COPAY', // e.g., "$45 copay"
  ALLOWANCE = 'ALLOWANCE', // e.g., "$120 allowance"
  ALLOWANCE_WITH_OVERAGE = 'ALLOWANCE_WITH_OVERAGE', // e.g., "$120 allowance; 20% off overage"
  TIERED_ALLOWANCE = 'TIERED_ALLOWANCE', // e.g., "$90 progressive; 20% off overage"
  PERCENT_OF_RETAIL = 'PERCENT_OF_RETAIL', // e.g., "80% of retail"
  PERCENT_OFF_RETAIL = 'PERCENT_OFF_RETAIL', // e.g., "20% off retail"
  COVERED = 'COVERED', // e.g., "covered" or "no copay"
  NOT_COVERED = 'NOT_COVERED', // e.g., "not covered"
  COMPLEX_FORMULA = 'COMPLEX_FORMULA', // Multiple components
}

/**
 * Parsed formula with components and logic
 */
export interface ParsedFormula {
  type: FormulaType
  rawInput: string // Original benefit string
  components: FormulaComponent[]
  description: string // Human-readable description
}

/**
 * Individual component of a formula
 * Examples:
 * - { type: 'copay', value: 45 }
 * - { type: 'allowance', value: 250 }
 * - { type: 'discount', value: 0.20, appliesToOverage: true }
 */
export interface FormulaComponent {
  type: 'copay' | 'allowance' | 'discount' | 'percentage' | 'multiplier'
  value: number
  operator?: 'fixed' | 'percent' // How to apply this value
  appliesToOverage?: boolean // For discounts: applies only to amount over allowance
  description?: string
}

/**
 * Result of parsing + calculating a formula against a retail price
 */
export interface FormulaResult {
  formulaType: FormulaType
  parsedFormula: ParsedFormula
  retailPrice: number
  patientOop: number // Out-of-pocket cost (copay or overage amount)
  insurancePays: number // What insurance covers
  breakdown: FormulaBreakdown
  notes: string[]
}

/**
 * Detailed breakdown of calculation for transparency
 */
export interface FormulaBreakdown {
  step1_retailPrice: number
  step2_allowanceOrCopay: number | string // e.g., 250 (allowance) or 45 (copay)
  step3_overage?: number // Amount exceeding allowance
  step4_overageDiscount?: number // Discount applied to overage
  step5_patientResponsibility: number // Final patient amount
  notes: string[]
}

// =============================================================================
// STATIC RULE TYPES
// =============================================================================

/**
 * Context for evaluating static rules
 */
export interface RuleContext {
  auth: EyemedBenefitAuthorization
  product: ProductCatalogEntry
  quantity: number
  patientAge: number | null
  isFirstTimeProgressive?: boolean
}

/**
 * Result of applying a static rule
 */
export interface RuleResult {
  ruleName: string
  applied: boolean // Whether this rule modified the pricing
  action?: 'override_price' | 'add_surcharge' | 'apply_discount' | 'fallback_tier' | 'exempt'
  originalPrice: number
  finalPrice: number
  surchargeAmount: number // 0 if no surcharge
  notes: string[]
}

/**
 * All static rules applied to a product
 */
export interface StaticRulesApplied {
  tier5Fallback?: RuleResult
  uvSurcharge?: RuleResult
  cashOnly?: RuleResult
  ageBased?: RuleResult
  fallbackTier?: RuleResult
  appliedRules: RuleResult[]
  finalPrice: number
}

// =============================================================================
// PRODUCT MATCHING TYPES
// =============================================================================

/**
 * Result of matching a product to an authorization benefit
 */
export interface ProductMatchResult {
  sku: string
  matched: boolean
  tier?: string // The tier that matched (e.g., "tier_4", "standard")
  benefitValue?: number | string // Copay, allowance, or formula
  isFormula: boolean // Whether benefitValue is a formula string vs numeric copay
  fallbackUsed: boolean // Whether we fell back to "All Other Lens Options"
  notes: string[]
}

// =============================================================================
// FINAL PRICING RESULT TYPES
// =============================================================================

/**
 * Final result from the EyeMed pricing engine
 */
export interface EyeMedPricingResult {
  authorizationId: string
  customerId: string
  carrier: 'eyemed'
  calculatedAt: Date

  // Priced line items
  pricedProducts: QuoteLineItem[]

  // Summary
  retailTotal: number
  patientTotal: number
  insuranceTotal: number
  totalSavings: number

  // Metadata
  warnings: string[]
  debugInfo?: {
    productsProcessed: number
    formulasApplied: number
    rulesApplied: number
    fallbacksUsed: number
  }
}

/**
 * Single product pricing with full breakdown
 */
export interface PricedProduct extends QuoteLineItem {
  // Formula parsing (if applicable)
  formulaApplied?: FormulaResult

  // Static rules (UV surcharge, tier fallback, etc)
  staticRules?: StaticRulesApplied

  // Matching details
  matchDetails?: ProductMatchResult

  // Final calculation
  breakdownNotes: string[]
}

// =============================================================================
// VALIDATION & ERROR TYPES
// =============================================================================

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ParsingError {
  input: string
  error: string
  possibleReason: string
}
