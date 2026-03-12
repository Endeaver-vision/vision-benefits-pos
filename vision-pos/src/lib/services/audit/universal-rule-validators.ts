/**
 * Universal Rule Validators
 *
 * Validation logic for rules that apply to all carriers:
 * - Completeness checks (all products priced)
 * - Basic consistency checks
 */

import { prisma } from '@/lib/prisma'
import { InsuranceAuthorization, PatientPriceList } from '@prisma/client'
import { AuditRuleDefinition } from './audit-rules'
import { AuditResultData } from './audit-validator'

export async function validateUniversalRules(
  rule: AuditRuleDefinition,
  customerId: string,
  authorizationId: string,
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData | null> {
  switch (rule.ruleCode) {
    case 'validateAllFramesPriced':
      return validateAllFramesPriced(customerId, priceList)
    case 'validateAllLensesPriced':
      return validateAllLensesPriced(customerId, priceList)
    case 'validateAllServicesPriced':
      return validateAllServicesPriced(customerId, priceList)
    case 'validateNoNullFinalPrices':
      return validateNoNullFinalPrices(priceList)
    case 'validateSavingsCalculated':
      return validateSavingsCalculated(priceList)
    case 'validateBenefitFlagsMatch':
      return validateBenefitFlagsMatch(priceList, authorization)
    default:
      return null
  }
}

// ============================================================================
// COMPLETENESS VALIDATORS
// ============================================================================

async function validateAllFramesPriced(
  customerId: string,
  priceList: PatientPriceList[]
): Promise<AuditResultData> {
  // Count active frames available for pricing
  const frameCount = await prisma.frame.count({
    where: {
      isActive: true,
      showInPos: true,
    },
  })

  // Count frames in this price list
  const framesPriced = priceList.filter((p) => p.pricingMethod === 'FRAME').length

  const missing = frameCount - framesPriced

  if (missing === 0) {
    return {
      ruleName: 'All Frames Have Price Entries',
      ruleCategory: 'COMPLETENESS',
      carrier: 'ALL',
      fieldChecked: 'frame_coverage',
      status: 'PASS',
      expectedValue: `${frameCount} frames`,
      actualValue: `${framesPriced} frames priced`,
      severity: 0,
      details: { frameCount, framesPriced },
    }
  }

  return {
    ruleName: 'All Frames Have Price Entries',
    ruleCategory: 'COMPLETENESS',
    carrier: 'ALL',
    fieldChecked: 'frame_coverage',
    status: 'FAIL',
    expectedValue: `${frameCount} frames`,
    actualValue: `${framesPriced} frames priced`,
    severity: 1.0,
    details: { frameCount, framesPriced, missing },
    affectedCount: missing,
  }
}

async function validateAllLensesPriced(
  customerId: string,
  priceList: PatientPriceList[]
): Promise<AuditResultData> {
  // Count active lens products
  const lensCount = await prisma.lensProduct.count({
    where: {
      active: true,
      // Note: lensProduct doesn't have showInPos, so we check all active
    },
  })

  // Count lenses in this price list (could be by category or product check)
  const lensesPriced = priceList.filter((p) => p.pricingMethod === 'LENS').length

  const missing = lensCount - lensesPriced

  if (missing === 0) {
    return {
      ruleName: 'All Lens Products Have Price Entries',
      ruleCategory: 'COMPLETENESS',
      carrier: 'ALL',
      fieldChecked: 'lens_coverage',
      status: 'PASS',
      expectedValue: `${lensCount} lenses`,
      actualValue: `${lensesPriced} lenses priced`,
      severity: 0,
      details: { lensCount, lensesPriced },
    }
  }

  return {
    ruleName: 'All Lens Products Have Price Entries',
    ruleCategory: 'COMPLETENESS',
    carrier: 'ALL',
    fieldChecked: 'lens_coverage',
    status: 'FAIL',
    expectedValue: `${lensCount} lenses`,
    actualValue: `${lensesPriced} lenses priced`,
    severity: 1.0,
    details: { lensCount, lensesPriced, missing },
    affectedCount: missing,
  }
}

async function validateAllServicesPriced(
  customerId: string,
  priceList: PatientPriceList[]
): Promise<AuditResultData> {
  // Count active services
  const serviceCount = await prisma.servicePrice.count({
    where: {
      isActive: true,
      showInPos: true,
    },
  })

  // Count services in price list
  const servicesPriced = priceList.filter((p) => p.pricingMethod === 'SERVICE').length

  const missing = serviceCount - servicesPriced

  if (missing === 0) {
    return {
      ruleName: 'All Services Have Price Entries',
      ruleCategory: 'COMPLETENESS',
      carrier: 'ALL',
      fieldChecked: 'service_coverage',
      status: 'PASS',
      expectedValue: `${serviceCount} services`,
      actualValue: `${servicesPriced} services priced`,
      severity: 0,
      details: { serviceCount, servicesPriced },
    }
  }

  // Lower criticality for services
  return {
    ruleName: 'All Services Have Price Entries',
    ruleCategory: 'COMPLETENESS',
    carrier: 'ALL',
    fieldChecked: 'service_coverage',
    status: 'WARNING',
    expectedValue: `${serviceCount} services`,
    actualValue: `${servicesPriced} services priced`,
    severity: 0.5,
    details: { serviceCount, servicesPriced, missing },
    affectedCount: missing,
  }
}

async function validateNoNullFinalPrices(priceList: PatientPriceList[]): Promise<AuditResultData> {
  const nullPrices = priceList.filter((p) => p.finalPrice === null)

  if (nullPrices.length === 0) {
    return {
      ruleName: 'No Null Final Prices',
      ruleCategory: 'COMPLETENESS',
      carrier: 'ALL',
      fieldChecked: 'final_price_null',
      status: 'PASS',
      expectedValue: '0 null prices',
      actualValue: `0 null prices`,
      severity: 0,
      details: { totalItems: priceList.length, nullCount: 0 },
    }
  }

  return {
    ruleName: 'No Null Final Prices',
    ruleCategory: 'COMPLETENESS',
    carrier: 'ALL',
    fieldChecked: 'final_price_null',
    status: 'FAIL',
    expectedValue: '0 null prices',
    actualValue: `${nullPrices.length} items with null price`,
    severity: 1.0,
    details: {
      totalItems: priceList.length,
      nullCount: nullPrices.length,
      affectedProducts: nullPrices.map((p) => p.productId),
    },
    affectedCount: nullPrices.length,
  }
}

async function validateSavingsCalculated(priceList: PatientPriceList[]): Promise<AuditResultData> {
  // Items that should have savings
  const itemsWithWholesale = priceList.filter((p) => {
    const retail = p.retailPrice.toNumber()
    const final = p.finalPrice ? p.finalPrice.toNumber() : retail
    return retail > final
  })

  const itemsWithoutSavings = itemsWithWholesale.filter((p) => !p.savings || p.savings.toNumber() === 0)

  if (itemsWithoutSavings.length === 0) {
    return {
      ruleName: 'Savings Calculated for All Items',
      ruleCategory: 'COMPLETENESS',
      carrier: 'ALL',
      fieldChecked: 'savings_calculated',
      status: 'PASS',
      expectedValue: 'All items have savings calculated',
      actualValue: 'All discounted items show savings',
      severity: 0,
      details: { itemsWithSavings: itemsWithWholesale.length },
    }
  }

  return {
    ruleName: 'Savings Calculated for All Items',
    ruleCategory: 'COMPLETENESS',
    carrier: 'ALL',
    fieldChecked: 'savings_calculated',
    status: 'WARNING',
    expectedValue: 'All discounted items should show savings',
    actualValue: `${itemsWithoutSavings.length} items missing savings`,
    severity: 0.5,
    details: {
      totalWithDiscount: itemsWithWholesale.length,
      missingCalculation: itemsWithoutSavings.length,
    },
    affectedCount: itemsWithoutSavings.length,
  }
}

// ============================================================================
// CONSISTENCY VALIDATORS
// ============================================================================

async function validateBenefitFlagsMatch(
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResultData> {
  const issues: string[] = []

  // Check if frames are eligible but showing high copay
  if (!authorization.frameEligible && priceList.some((p) => p.pricingMethod === 'FRAME')) {
    issues.push('Authorization shows frames not eligible, but frames in price list')
  }

  // Check if lenses are eligible but not showing
  if (
    !authorization.lensesEligible &&
    priceList.some((p) => p.pricingMethod === 'LENS' || p.pricingMethod === 'LENS_ADDON')
  ) {
    issues.push('Authorization shows lenses not eligible, but lenses in price list')
  }

  // Check if contacts are eligible but not showing
  if (!authorization.contactsEligible && priceList.some((p) => p.pricingMethod === 'CONTACT')) {
    issues.push('Authorization shows contacts not eligible, but contacts in price list')
  }

  if (issues.length === 0) {
    return {
      ruleName: 'Benefit Eligibility Flags Match Authorization',
      ruleCategory: 'CONSISTENCY',
      carrier: 'ALL',
      fieldChecked: 'benefit_eligibility_match',
      status: 'PASS',
      expectedValue: 'Price list reflects authorization eligibility',
      actualValue: 'All benefits match authorization flags',
      severity: 0,
      details: {
        frameEligible: authorization.frameEligible,
        lensesEligible: authorization.lensesEligible,
        contactsEligible: authorization.contactsEligible,
      },
    }
  }

  return {
    ruleName: 'Benefit Eligibility Flags Match Authorization',
    ruleCategory: 'CONSISTENCY',
    carrier: 'ALL',
    fieldChecked: 'benefit_eligibility_match',
    status: 'FAIL',
    expectedValue: 'Price list reflects authorization eligibility',
    actualValue: `${issues.length} eligibility mismatches found`,
    severity: 1.0,
    details: { issues },
    affectedCount: issues.length,
  }
}
