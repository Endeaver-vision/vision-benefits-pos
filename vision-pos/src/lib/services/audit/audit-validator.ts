/**
 * Audit Validator
 *
 * Executes audit rules against price lists and generates audit results.
 * Routes rule execution to carrier-specific validators as needed.
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { ALL_AUDIT_RULES, AuditRuleDefinition } from './audit-rules'
import { validateVSPRules } from './vsp-rule-validators'
import { validateEyeMedRules } from './eyemed-rule-validators'
import { validateSpecteraRules } from './spectera-rule-validators'
import { validateUniversalRules } from './universal-rule-validators'

export interface AuditResultData {
  ruleName: string
  ruleCategory: string
  carrier: string
  fieldChecked: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  expectedValue?: string
  actualValue?: string
  severity: number
  details: Record<string, unknown>
  affectedCount?: number
}

/**
 * Run a single audit rule against a customer's price list
 */
export async function runRule(
  rule: AuditRuleDefinition,
  customerId: string,
  authorizationId: string
): Promise<AuditResultData | null> {
  try {
    // Get required data
    const authorization = await prisma.insuranceAuthorization.findUnique({
      where: { id: authorizationId },
    })

    if (!authorization) {
      return {
        ruleName: rule.name,
        ruleCategory: rule.category,
        carrier: rule.carrier || 'ALL',
        fieldChecked: rule.ruleCode,
        status: 'SKIPPED',
        severity: 0,
        details: { error: 'Authorization not found' },
      }
    }

    const priceList = await prisma.patientPriceList.findMany({
      where: {
        customerId,
        authorizationId,
        active: true,
      },
    })

    // Route to appropriate validator based on rule code and carrier
    let result: AuditResultData | null = null

    if (authorization.carrier === 'VSP') {
      result = await validateVSPRules(
        rule,
        customerId,
        authorizationId,
        priceList,
        authorization
      )
    } else if (authorization.carrier === 'EyeMed') {
      result = await validateEyeMedRules(
        rule,
        customerId,
        authorizationId,
        priceList,
        authorization
      )
    } else if (authorization.carrier === 'Spectera') {
      result = await validateSpecteraRules(
        rule,
        customerId,
        authorizationId,
        priceList,
        authorization
      )
    } else {
      // Unknown carrier - run universal rules only
      if (rule.carrier === null) {
        result = await validateUniversalRules(
          rule,
          customerId,
          authorizationId,
          priceList,
          authorization
        )
      }
    }

    return result
  } catch (error) {
    console.error(`Error running rule ${rule.id}:`, error)
    return {
      ruleName: rule.name,
      ruleCategory: rule.category,
      carrier: rule.carrier || 'ALL',
      fieldChecked: rule.ruleCode,
      status: 'FAIL',
      severity: rule.criticality,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Run all applicable audit rules for a customer
 */
export async function runAllRules(
  customerId: string,
  authorizationId: string
): Promise<AuditResultData[]> {
  // Get the authorization to determine which rules apply
  const authorization = await prisma.insuranceAuthorization.findUnique({
    where: { id: authorizationId },
  })

  if (!authorization) {
    return []
  }

  // Filter rules that apply to this carrier
  const applicableRules = ALL_AUDIT_RULES.filter(
    (rule) => rule.enabled && (rule.carrier === null || rule.carrier === authorization.carrier)
  )

  // Run all rules in parallel for speed
  const results = await Promise.all(
    applicableRules.map((rule) => runRule(rule, customerId, authorizationId))
  )

  return results.filter((result) => result !== null)
}

/**
 * Calculate audit score from results
 */
export interface AuditScore {
  totalRules: number
  passedRules: number
  failedRules: number
  warningRules: number
  passRate: number
  status: 'PASSED' | 'PASSED_WITH_WARNINGS' | 'FAILED'
  criticalFailures: number
}

export function calculateAuditScore(results: AuditResultData[]): AuditScore {
  const passedRules = results.filter((r) => r.status === 'PASS').length
  const failedRules = results.filter((r) => r.status === 'FAIL').length
  const warningRules = results.filter((r) => r.status === 'WARNING').length
  const totalRules = results.length

  const criticalFailures = results.filter(
    (r) => r.status === 'FAIL' && r.severity >= 1.0
  ).length

  let status: 'PASSED' | 'PASSED_WITH_WARNINGS' | 'FAILED'
  if (failedRules > 0) {
    status = 'FAILED'
  } else if (warningRules > 0) {
    status = 'PASSED_WITH_WARNINGS'
  } else {
    status = 'PASSED'
  }

  return {
    totalRules,
    passedRules,
    failedRules,
    warningRules,
    passRate: totalRules > 0 ? (passedRules / totalRules) * 100 : 100,
    status,
    criticalFailures,
  }
}
