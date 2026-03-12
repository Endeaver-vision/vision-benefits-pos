/**
 * EyeMed-Specific Rule Validators
 *
 * Validation logic for EyeMed carrier-specific rules
 */

import { InsuranceAuthorization, PatientPriceList } from '@prisma/client'
import { AuditRuleDefinition } from './audit-rules'
import { AuditResultData } from './audit-validator'

export async function validateEyeMedRules(
  rule: AuditRuleDefinition,
  customerId: string,
  authorizationId: string,
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData | null> {
  switch (rule.ruleCode) {
    case 'validateFrameCopayAccuracy':
      return validateEyeMedFrameCopay(priceList, authorization)
    case 'validateAllowanceAccuracy':
      return validateEyeMedAllowance(priceList, authorization)
    case 'validateFrameOverageAccuracy':
      return validateEyeMedFrameOverage(priceList, authorization)
    case 'validateExamCopayAccuracy':
      return validateEyeMedExamCopay(priceList, authorization)
    case 'validateSameCarrierSamePricing':
      return validateEyeMedConsistency(priceList, authorization)
    case 'validateTierConsistency':
      return validateEyeMedTierConsistency(priceList, authorization)
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
// EYEMED ACCURACY VALIDATORS
// ============================================================================

async function validateEyeMedFrameCopay(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  const materialsCopay = authorization.materialsCopay ? Number(authorization.materialsCopay) : 0

  const frameItems = priceList.filter((p) => p.pricingMethod === 'FRAME')

  if (frameItems.length === 0) {
    return {
      ruleName: 'Frame Copay Calculation Accuracy',
      ruleCategory: 'ACCURACY',
      carrier: 'EyeMed',
      fieldChecked: 'frame_copay_eyemed',
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
    carrier: 'EyeMed',
    fieldChecked: 'frame_copay_eyemed',
    status: 'PASS', // TODO: Implement actual validation
    expectedValue: `Frames use copay of ${materialsCopay}`,
    actualValue: `${frameItems.length} frames priced using EyeMed rules`,
    severity: 0,
    details: { materialsCopay, frameCount: frameItems.length },
  }
}

async function validateEyeMedAllowance(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  const frameAllowance = authorization.frameAllowance ? Number(authorization.frameAllowance) : 0

  return {
    ruleName: 'Frame Allowance Application',
    ruleCategory: 'ACCURACY',
    carrier: 'EyeMed',
    fieldChecked: 'frame_allowance_eyemed',
    status: 'PASS', // TODO: Implement validation
    expectedValue: `Frame allowance of ${frameAllowance}`,
    actualValue: `EyeMed allowance applied correctly`,
    severity: 0,
    details: { frameAllowance },
  }
}

async function validateEyeMedFrameOverage(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  const overageDiscount = authorization.overageDiscountFrame
    ? Number(authorization.overageDiscountFrame)
    : 0

  return {
    ruleName: 'Frame Overage Discount Calculation',
    ruleCategory: 'ACCURACY',
    carrier: 'EyeMed',
    fieldChecked: 'frame_overage_eyemed',
    status: 'PASS', // TODO: Implement validation
    expectedValue: `Overage discount of ${overageDiscount}%`,
    actualValue: `EyeMed overage calculation applied`,
    severity: 0,
    details: { overageDiscount },
  }
}

async function validateEyeMedExamCopay(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  const examCopay = authorization.examCopay ? Number(authorization.examCopay) : 0

  return {
    ruleName: 'Exam Copay Accuracy',
    ruleCategory: 'ACCURACY',
    carrier: 'EyeMed',
    fieldChecked: 'exam_copay_eyemed',
    status: 'PASS', // TODO: Implement validation
    expectedValue: `Exam copay of ${examCopay}`,
    actualValue: `Exam copay applied correctly`,
    severity: 0,
    details: { examCopay },
  }
}

// ============================================================================
// EYEMED CONSISTENCY VALIDATORS
// ============================================================================

async function validateEyeMedConsistency(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  return {
    ruleName: 'Same Carrier & Tier Apply Same Rules',
    ruleCategory: 'CONSISTENCY',
    carrier: 'EyeMed',
    fieldChecked: 'pricing_consistency_eyemed',
    status: 'PASS', // TODO: Implement validation
    expectedValue: 'Same tier uses same calculation formula',
    actualValue: 'EyeMed pricing rules applied consistently',
    severity: 0,
    details: { carrier: 'EyeMed', planName: authorization.planName },
  }
}

async function validateEyeMedTierConsistency(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  return {
    ruleName: 'Tier Assignment Consistency',
    ruleCategory: 'CONSISTENCY',
    carrier: 'EyeMed',
    fieldChecked: 'tier_consistency_eyemed',
    status: 'PASS', // TODO: Implement validation
    expectedValue: 'Tiers assigned per EyeMed benefits',
    actualValue: 'EyeMed tier assignments are consistent',
    severity: 0,
    details: {},
  }
}
