/**
 * Audit Service
 *
 * Main service that orchestrates price list auditing:
 * - Runs all applicable audit rules
 * - Aggregates results
 * - Creates audit records in database
 * - Handles audit workflow (pass/fail/regenerate)
 */

import { prisma } from '@/lib/prisma'
import { AuditStatus, AuditTriggerType } from '@prisma/client'
import { runAllRules, calculateAuditScore, AuditScore, AuditResultData } from './audit/audit-validator'

export interface AuditRunResponse {
  auditId: string
  customerId: string
  authorizationId: string
  carrier: string
  status: AuditStatus
  score: AuditScore
  results: AuditResultData[]
  createdAt: Date
}

/**
 * Run a complete audit for a customer's price list
 *
 * This is the main entry point for auditing. It:
 * 1. Runs all applicable audit rules
 * 2. Aggregates the results
 * 3. Saves audit record to database
 * 4. Returns audit status and findings
 */
export async function runPriceListAudit(
  customerId: string,
  authorizationId: string,
  triggeredBy: AuditTriggerType = 'MANUAL'
): Promise<AuditRunResponse> {
  const auditStartTime = new Date()

  // Get authorization data
  const authorization = await prisma.insuranceAuthorization.findUnique({
    where: { id: authorizationId },
  })

  if (!authorization) {
    throw new Error(`Authorization not found: ${authorizationId}`)
  }

  // Run all audit rules
  const auditResults = await runAllRules(customerId, authorizationId)
  const auditScore = calculateAuditScore(auditResults)

  // Determine audit status based on score
  let auditStatus: AuditStatus
  if (auditScore.failedRules > 0) {
    auditStatus = 'FAILED'
  } else if (auditScore.warningRules > 0) {
    auditStatus = 'PASSED_WITH_WARNINGS'
  } else {
    auditStatus = 'PASSED'
  }

  // Create audit record
  const audit = await prisma.priceListAudit.create({
    data: {
      customerId,
      authorizationId,
      carrier: authorization.carrier,
      planName: authorization.planName,
      status: auditStatus,
      triggeredBy,
      totalRules: auditScore.totalRules,
      passedRules: auditScore.passedRules,
      failedRules: auditScore.failedRules,
      warningRules: auditScore.warningRules,
      passRate: new Prisma.Decimal(auditScore.passRate),
      criticalIssues: auditScore.criticalFailures,
      auditEndTime: new Date(),
      findings: auditResults as any, // Store results as JSONB
    },
  })

  // Create audit result records
  await Promise.all(
    auditResults.map((result) =>
      prisma.auditResult.create({
        data: {
          auditId: audit.id,
          ruleId: '', // TODO: Link to actual rule ID
          status: result.status as any,
          ruleName: result.ruleName,
          ruleCategory: result.ruleCategory,
          carrier: result.carrier,
          fieldChecked: result.fieldChecked,
          expectedValue: result.expectedValue,
          actualValue: result.actualValue,
          severity: result.severity ? new Prisma.Decimal(result.severity) : null,
          details: result.details,
          affectedCount: result.affectedCount,
        },
      })
    )
  )

  return {
    auditId: audit.id,
    customerId,
    authorizationId,
    carrier: authorization.carrier,
    status: auditStatus,
    score: auditScore,
    results: auditResults,
    createdAt: audit.createdAt,
  }
}

/**
 * Get audit history for a customer
 */
export async function getAuditHistory(
  customerId: string,
  limit: number = 10
): Promise<AuditRunResponse[]> {
  const audits = await prisma.priceListAudit.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return audits.map((audit) => ({
    auditId: audit.id,
    customerId: audit.customerId,
    authorizationId: audit.authorizationId,
    carrier: audit.carrier,
    status: audit.status,
    score: {
      totalRules: audit.totalRules,
      passedRules: audit.passedRules,
      failedRules: audit.failedRules,
      warningRules: audit.warningRules,
      passRate: Number(audit.passRate || 0),
      status:
        audit.failedRules > 0 ? 'FAILED' : audit.warningRules > 0 ? 'PASSED_WITH_WARNINGS' : 'PASSED',
      criticalFailures: audit.criticalIssues,
    },
    results: (audit.findings as AuditResultData[]) || [],
    createdAt: audit.createdAt,
  }))
}

/**
 * Get detailed audit results for a specific audit
 */
export async function getAuditResults(auditId: string) {
  const audit = await prisma.priceListAudit.findUnique({
    where: { id: auditId },
    include: {
      results: true,
      regenerationLogs: true,
    },
  })

  if (!audit) {
    throw new Error(`Audit not found: ${auditId}`)
  }

  return {
    audit,
    results: audit.results,
    regenerationHistory: audit.regenerationLogs,
  }
}

/**
 * Dashboard summary statistics
 */
export async function getAuditDashboardStats() {
  const totalAudits = await prisma.priceListAudit.count()

  const passedAudits = await prisma.priceListAudit.count({
    where: { status: 'PASSED' },
  })

  const passedWithWarnings = await prisma.priceListAudit.count({
    where: { status: 'PASSED_WITH_WARNINGS' },
  })

  const failedAudits = await prisma.priceListAudit.count({
    where: { status: 'FAILED' },
  })

  const blockingIssues = await prisma.priceListAudit.count({
    where: {
      status: 'FAILED',
      autoRegenerationAttempts: { gte: 3 }, // Max retries exhausted
    },
  })

  const recentAudits = await prisma.priceListAudit.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      customer: {
        select: { firstName: true, lastName: true },
      },
    },
  })

  const passRate =
    totalAudits > 0 ? ((passedAudits + passedWithWarnings) / totalAudits) * 100 : 100

  return {
    summary: {
      totalAudits,
      passedAudits,
      passedWithWarnings,
      failedAudits,
      blockingIssues,
      passRate: Math.round(passRate * 100) / 100,
    },
    recentAudits: recentAudits.map((audit) => ({
      id: audit.id,
      customer: `${audit.customer?.firstName} ${audit.customer?.lastName}`,
      carrier: audit.carrier,
      status: audit.status,
      passRate: Number(audit.passRate || 0),
      failureCount: audit.failedRules,
      createdAt: audit.createdAt,
    })),
  }
}

// Import Prisma for type access
import { Prisma } from '@prisma/client'
