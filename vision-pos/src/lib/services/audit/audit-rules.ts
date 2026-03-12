/**
 * Audit Rules Definitions
 *
 * All 13 audit rules for price list validation:
 * - 5 Accuracy Rules (calculations correct)
 * - 5 Completeness Rules (all products have prices)
 * - 3 Consistency Rules (rules applied uniformly)
 */

import { AuditRuleCategory } from '@prisma/client'

export interface AuditRuleDefinition {
  id: string
  name: string
  category: AuditRuleCategory
  carrier: string | null // null = applies to all carriers
  description: string
  ruleCode: string // Function name to execute
  ruleLogic: string
  criticality: number // 1.0 = critical, 0.5 = warning
  enabled: boolean
}

// ============================================================================
// ACCURACY RULES (5 rules)
// ============================================================================

export const ACCURACY_RULES: AuditRuleDefinition[] = [
  {
    id: 'audit-rule-frame-copay-accuracy',
    name: 'Frame Copay Calculation Accuracy',
    category: 'ACCURACY',
    carrier: null, // Applies to all carriers
    description:
      'Verifies that frame copay amounts match the carrier-specific formula based on authorization data',
    ruleCode: 'validateFrameCopayAccuracy',
    ruleLogic:
      'For each frame in price list: actual copay should match authorization.examCopay or frame_allowance logic',
    criticality: 1.0, // Critical - fundamental pricing
    enabled: true,
  },
  {
    id: 'audit-rule-allowance-accuracy',
    name: 'Frame Allowance Application',
    category: 'ACCURACY',
    carrier: null,
    description: 'Verifies that frame allowance amounts are applied correctly from authorization',
    ruleCode: 'validateAllowanceAccuracy',
    ruleLogic:
      'For each frame: frame_allowance should match authorization.frameAllowance (or carrier-specific alt field)',
    criticality: 1.0,
    enabled: true,
  },
  {
    id: 'audit-rule-frame-overage-accuracy',
    name: 'Frame Overage Discount Calculation',
    category: 'ACCURACY',
    carrier: null,
    description: 'Verifies frame overage discounts are calculated correctly when patient price exceeds allowance',
    ruleCode: 'validateFrameOverageAccuracy',
    ruleLogic:
      'For frames with price > allowance: (price - allowance) * discount_rate should equal actual overage discount',
    criticality: 1.0,
    enabled: true,
  },
  {
    id: 'audit-rule-contact-lens-declining-balance',
    name: 'Contact Lens Declining Balance Logic',
    category: 'ACCURACY',
    carrier: 'VSP', // VSP-specific
    description: 'Verifies declining balance logic is applied correctly when applicable',
    ruleCode: 'validateContactLensDecliningBalance',
    ruleLogic:
      'If is_contact_declining_balance=true: apply unified pool from totalMaterialsAllowance to lens products',
    criticality: 0.8, // Important but not all plans use it
    enabled: true,
  },
  {
    id: 'audit-rule-exam-copay-accuracy',
    name: 'Exam Copay Accuracy',
    category: 'ACCURACY',
    carrier: null,
    description: 'Verifies that exam copay matches the authorization data',
    ruleCode: 'validateExamCopayAccuracy',
    ruleLogic: 'Exam service copay should match authorization.examCopay from extracted benefits',
    criticality: 1.0,
    enabled: true,
  },
]

// ============================================================================
// COMPLETENESS RULES (5 rules)
// ============================================================================

export const COMPLETENESS_RULES: AuditRuleDefinition[] = [
  {
    id: 'audit-rule-all-frames-priced',
    name: 'All Frames Have Price Entries',
    category: 'COMPLETENESS',
    carrier: null,
    description: 'Verifies that every active frame with showInPos=true has a price list entry',
    ruleCode: 'validateAllFramesPriced',
    ruleLogic:
      'Count of frames (active=true, showInPos=true) should equal count of price_list entries for customer with category=FRAME',
    criticality: 1.0,
    enabled: true,
  },
  {
    id: 'audit-rule-all-lenses-priced',
    name: 'All Lens Products Have Price Entries',
    category: 'COMPLETENESS',
    carrier: null,
    description: 'Verifies that every active lens product with showInPos=true has a price list entry',
    ruleCode: 'validateAllLensesPriced',
    ruleLogic:
      'Count of lens_products (active=true, showInPos=true) should equal count of price_list entries with category=LENS',
    criticality: 1.0,
    enabled: true,
  },
  {
    id: 'audit-rule-all-services-priced',
    name: 'All Services Have Price Entries',
    category: 'COMPLETENESS',
    carrier: null,
    description: 'Verifies that every active service with showInPos=true has a price list entry',
    ruleCode: 'validateAllServicesPriced',
    ruleLogic:
      'Count of service_prices (isActive=true, showInPos=true) should equal count of price_list entries with category=SERVICE',
    criticality: 0.8, // Lower - not all services need pricing
    enabled: true,
  },
  {
    id: 'audit-rule-no-null-final-prices',
    name: 'No Null Final Prices',
    category: 'COMPLETENESS',
    carrier: null,
    description: 'Verifies that all price list entries have final_price calculated',
    ruleCode: 'validateNoNullFinalPrices',
    ruleLogic: 'Count of price_list entries with final_price=null should be 0',
    criticality: 1.0,
    enabled: true,
  },
  {
    id: 'audit-rule-savings-calculated',
    name: 'Savings Calculated for All Items',
    category: 'COMPLETENESS',
    carrier: null,
    description: 'Verifies that savings are calculated for all price list entries',
    ruleCode: 'validateSavingsCalculated',
    ruleLogic: 'All price_list entries where retail_price > final_price should have savings > 0',
    criticality: 0.5, // Warning level - non-critical
    enabled: true,
  },
]

// ============================================================================
// CONSISTENCY RULES (3 rules)
// ============================================================================

export const CONSISTENCY_RULES: AuditRuleDefinition[] = [
  {
    id: 'audit-rule-same-carrier-same-pricing',
    name: 'Same Carrier & Tier Apply Same Rules',
    category: 'CONSISTENCY',
    carrier: null,
    description:
      'Verifies that customers with identical carrier, plan name, and tier get the same pricing rules applied',
    ruleCode: 'validateSameCarrierSamePricing',
    ruleLogic:
      'For each unique (carrier, plan_name, tier) combo: all products with that tier should use same calculation formula',
    criticality: 0.9, // Important for fairness
    enabled: true,
  },
  {
    id: 'audit-rule-tier-consistency',
    name: 'Tier Assignment Consistency',
    category: 'CONSISTENCY',
    carrier: null,
    description: 'Verifies that tier assignments are consistent across product categories',
    ruleCode: 'validateTierConsistency',
    ruleLogic:
      'For each product: if tier is assigned, it should match product.tierVsp/tierEyemed/tierSpectera based on carrier',
    criticality: 0.8,
    enabled: true,
  },
  {
    id: 'audit-rule-benefit-flags-match',
    name: 'Benefit Eligibility Flags Match Authorization',
    category: 'CONSISTENCY',
    carrier: null,
    description: 'Verifies that product eligibility flags (frame_eligible, lenses_eligible, etc) match authorization',
    ruleCode: 'validateBenefitFlagsMatch',
    ruleLogic:
      'If authorization.frameEligible=false, no frame should have a patient copay. If examEligible=false, exam should show "Not covered"',
    criticality: 1.0,
    enabled: true,
  },
]

// ============================================================================
// RULE REGISTRY
// ============================================================================

export const ALL_AUDIT_RULES: AuditRuleDefinition[] = [
  ...ACCURACY_RULES,
  ...COMPLETENESS_RULES,
  ...CONSISTENCY_RULES,
]

export function getRuleById(ruleId: string): AuditRuleDefinition | undefined {
  return ALL_AUDIT_RULES.find((rule) => rule.id === ruleId)
}

export function getRulesByCategory(
  category: AuditRuleCategory
): AuditRuleDefinition[] {
  return ALL_AUDIT_RULES.filter((rule) => rule.category === category)
}

export function getRulesByCarrier(carrier: string): AuditRuleDefinition[] {
  return ALL_AUDIT_RULES.filter((rule) => rule.carrier === null || rule.carrier === carrier)
}

export function getEnabledRules(): AuditRuleDefinition[] {
  return ALL_AUDIT_RULES.filter((rule) => rule.enabled)
}
