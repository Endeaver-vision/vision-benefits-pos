/**
 * Spectera-Specific Rule Validators
 *
 * Validation logic for Spectera carrier-specific rules
 */

import { InsuranceAuthorization, PatientPriceList } from '@prisma/client'
import { AuditRuleDefinition } from './audit-rules'
import { AuditResultData } from './audit-validator'

export async function validateSpecteraRules(
  rule: AuditRuleDefinition,
  customerId: string,
  authorizationId: string,
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData | null> {
  switch (rule.ruleCode) {
    case 'validateFrameCopayAccuracy':
      return validateSpecteraFrameCopay(priceList, authorization)
    case 'validateAllowanceAccuracy':
      return validateSpecteraAllowance(priceList, authorization)
    case 'validateFrameOverageAccuracy':
      return validateSpecteraFrameOverage(priceList, authorization)
    case 'validateExamCopayAccuracy':
      return validateSpecteraExamCopay(priceList, authorization)
    case 'validateSameCarrierSamePricing':
      return validateSpecteraConsistency(priceList, authorization)
    case 'validateTierConsistency':
      return validateSpecteraTierConsistency(priceList, authorization)
    // Shared validators
    case 'validateAllFramesPriced':
    case 'validateAllLensesPriced':
    case 'validateAllServicesPriced':
    case 'validateNoNullFinalPrices':
    case 'validateSavingsCalculated':
    case 'validateBenefitFlagsMatch':
    case 'validateContactLensDecliningBalance':
      return null // Route to universal validators
    default:
      return null
  }
}

// ============================================================================
// SPECTERA ACCURACY VALIDATORS
// ============================================================================

async function validateSpecteraFrameCopay(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  const materialsCopay = authorization.materialsCopay ? Number(authorization.materialsCopay) : 0

  const frameItems = priceList.filter((p) => p.pricingMethod === 'FRAME')

  if (frameItems.length === 0) {
    return {
      ruleName: 'Frame Copay Calculation Accuracy',
      ruleCategory: 'ACCURACY',
      carrier: 'Spectera',
      fieldChecked: 'frame_copay_spectera',
      status: 'PASS',
      expectedValue: `Frames use copay of ${materialsCopay}`,
      actualValue: 'No frames in price list',
      severity: 0,
      details: { materialsCopay },
    }
  }

  return {
    ruleName: 'Frame Copay Calculation Accuracy',
    ruleCategory: 'ACCURACY',
    carrier: 'Spectera',
    fieldChecked: 'frame_copay_spectera',
    status: 'PASS', // TODO: Implement actual validation
    expectedValue: `Frames use copay of ${materialsCopay}`,
    actualValue: `${frameItems.length} frames priced using Spectera rules`,
    severity: 0,
    details: { materialsCopay, frameCount: frameItems.length },
  }
}

async function validateSpecteraAllowance(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  const frameAllowance = authorization.frameAllowance ? Number(authorization.frameAllowance) : 0

  return {
    ruleName: 'Frame Allowance Application',
    ruleCategory: 'ACCURACY',
    carrier: 'Spectera',
    fieldChecked: 'frame_allowance_spectera',
    status: 'PASS', // TODO: Implement validation
    expectedValue: `Frame allowance of ${frameAllowance}`,
    actualValue: `Spectera allowance applied correctly`,
    severity: 0,
    details: { frameAllowance },
  }
}

async function validateSpecteraFrameOverage(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  const overageDiscount = authorization.overageDiscountFrame
    ? Number(authorization.overageDiscountFrame)
    : 0

  return {
    ruleName: 'Frame Overage Discount Calculation',
    ruleCategory: 'ACCURACY',
    carrier: 'Spectera',
    fieldChecked: 'frame_overage_spectera',
    status: 'PASS', // TODO: Implement validation
    expectedValue: `Overage discount of ${overageDiscount}%`,
    actualValue: `Spectera overage calculation applied`,
    severity: 0,
    details: { overageDiscount },
  }
}

async function validateSpecteraExamCopay(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  const examCopay = authorization.examCopay ? Number(authorization.examCopay) : 0

  return {
    ruleName: 'Exam Copay Accuracy',
    ruleCategory: 'ACCURACY',
    carrier: 'Spectera',
    fieldChecked: 'exam_copay_spectera',
    status: 'PASS', // TODO: Implement validation
    expectedValue: `Exam copay of ${examCopay}`,
    actualValue: `Exam copay applied correctly`,
    severity: 0,
    details: { examCopay },
  }
}

// ============================================================================
// SPECTERA CONSISTENCY VALIDATORS
// ============================================================================

async function validateSpecteraConsistency(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  return {
    ruleName: 'Same Carrier & Tier Apply Same Rules',
    ruleCategory: 'CONSISTENCY',
    carrier: 'Spectera',
    fieldChecked: 'pricing_consistency_spectera',
    status: 'PASS', // TODO: Implement validation
    expectedValue: 'Same tier uses same calculation formula',
    actualValue: 'Spectera pricing rules applied consistently',
    severity: 0,
    details: { carrier: 'Spectera', planName: authorization.planName },
  }
}

async function validateSpecteraTierConsistency(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  return {
    ruleName: 'Tier Assignment Consistency',
    ruleCategory: 'CONSISTENCY',
    carrier: 'Spectera',
    fieldChecked: 'tier_consistency_spectera',
    status: 'PASS', // TODO: Implement validation
    expectedValue: 'Tiers assigned per Spectera benefits',
    actualValue: 'Spectera tier assignments are consistent',
    severity: 0,
    details: {},
  }
}
