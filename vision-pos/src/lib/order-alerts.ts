import { prisma } from '@/lib/prisma'
import { AlertSeverity, OrderAlertType } from '@prisma/client'

/**
 * Check all active orders and create alerts for overdue stages
 */
export async function checkOrderTimelines() {
  const activeOrders = await prisma.order.findMany({
    where: {
      status: {
        notIn: ['DELIVERED', 'CANCELLED'],
      },
    },
    include: {
      statusHistory: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
      alerts: {
        where: {
          resolved: false,
        },
      },
    },
  })

  const stageConfigs = await prisma.orderStageConfig.findMany({
    where: { active: true },
  })

  const configMap = new Map(
    stageConfigs.map(config => [config.stage, config])
  )

  const alerts = []

  for (const order of activeOrders) {
    const config = configMap.get(order.status)
    if (!config) continue

    const latestStatusChange = order.statusHistory[0]
    if (!latestStatusChange) continue

    const hoursInStage = 
      (Date.now() - latestStatusChange.timestamp.getTime()) / (1000 * 60 * 60)

    // Check if already alerted for this stage
    const existingAlert = order.alerts.find(
      alert => 
        alert.stage === order.status &&
        alert.alertType === 'STAGE_OVERDUE' &&
        !alert.resolved
    )

    if (existingAlert) continue

    let severity: AlertSeverity | null = null
    let message = ''

    if (hoursInStage >= config.criticalThresholdHours) {
      severity = 'CRITICAL'
      message = `Order ${order.orderNumber} has been in ${order.status} for ${Math.floor(hoursInStage)} hours (critical threshold: ${config.criticalThresholdHours}h)`
    } else if (hoursInStage >= config.warningThresholdHours) {
      severity = 'WARNING'
      message = `Order ${order.orderNumber} has been in ${order.status} for ${Math.floor(hoursInStage)} hours (warning threshold: ${config.warningThresholdHours}h)`
    }

    if (severity) {
      alerts.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        stage: order.status,
        alertType: 'STAGE_OVERDUE' as OrderAlertType,
        severity,
        message,
      })
    }

    // Check estimated completion date
    if (order.estimatedCompletionDate && new Date() > order.estimatedCompletionDate) {
      const daysOverdue = Math.floor(
        (Date.now() - order.estimatedCompletionDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      const completionAlert = order.alerts.find(
        alert => 
          alert.alertType === 'EXPECTED_COMPLETION_PASSED' &&
          !alert.resolved
      )

      if (!completionAlert) {
        alerts.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          stage: order.status,
          alertType: 'EXPECTED_COMPLETION_PASSED' as OrderAlertType,
          severity: daysOverdue > 2 ? 'URGENT' : 'WARNING',
          message: `Order ${order.orderNumber} is ${daysOverdue} day(s) past estimated completion date`,
        })
      }
    }
  }

  // Create all alerts
  if (alerts.length > 0) {
    await prisma.orderAlert.createMany({
      data: alerts,
    })
  }

  return alerts
}

/**
 * Get all unresolved alerts
 */
export async function getUnresolvedAlerts() {
  return prisma.orderAlert.findMany({
    where: {
      resolved: false,
    },
    include: {
      order: {
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'asc' },
    ],
  })
}

/**
 * Get alert statistics
 */
export async function getAlertStats() {
  const [total, bySeverity, byType, byStage] = await Promise.all([
    prisma.orderAlert.count({
      where: { resolved: false },
    }),
    prisma.orderAlert.groupBy({
      by: ['severity'],
      where: { resolved: false },
      _count: true,
    }),
    prisma.orderAlert.groupBy({
      by: ['alertType'],
      where: { resolved: false },
      _count: true,
    }),
    prisma.orderAlert.groupBy({
      by: ['stage'],
      where: { resolved: false },
      _count: true,
    }),
  ])

  return {
    total,
    bySeverity: Object.fromEntries(
      bySeverity.map(s => [s.severity, s._count])
    ),
    byType: Object.fromEntries(
      byType.map(t => [t.alertType, t._count])
    ),
    byStage: Object.fromEntries(
      byStage.map(s => [s.stage, s._count])
    ),
  }
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, acknowledgedBy: string) {
  return prisma.orderAlert.update({
    where: { id: alertId },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedBy,
    },
  })
}

/**
 * Resolve an alert
 */
export async function resolveAlert(
  alertId: string,
  resolvedBy: string,
  resolutionNotes?: string
) {
  return prisma.orderAlert.update({
    where: { id: alertId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
      resolutionNotes,
    },
  })
}
