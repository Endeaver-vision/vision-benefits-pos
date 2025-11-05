import { Customer } from '@/types/customer'

interface Transaction {
  id: string
  customerId: string
  total: number
  status: string
  createdAt: string
  items?: Array<{
    productId: string
    quantity: number
    unitPrice: number
  }>
}

export interface CustomerInsight {
  id: string
  customerId: string
  type: 'recommendation' | 'alert' | 'opportunity' | 'risk'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  actionItems: string[]
  confidence: number // 0-1
  createdAt: Date
  category: 'retention' | 'upsell' | 'engagement' | 'lifecycle' | 'financial'
}

export interface CustomerLifecycleStage {
  stage: 'prospect' | 'new' | 'active' | 'loyal' | 'at-risk' | 'dormant' | 'churned'
  daysInStage: number
  nextStage?: string
  probability: number
  triggers: string[]
}

export interface CustomerScore {
  customerId: string
  overallScore: number // 0-100
  lifetimeValue: number
  churnRisk: number // 0-1
  engagementScore: number // 0-100
  loyaltyScore: number // 0-100
  satisfactionScore?: number // 0-100
  lastUpdated: Date
}

export interface BusinessMetrics {
  totalCustomers: number
  activeCustomers: number
  monthlyActiveCustomers: number
  churnRate: number
  customerLifetimeValue: number
  averageOrderValue: number
  customerAcquisitionCost?: number
  netPromoterScore?: number
  revenuePerCustomer: number
  retentionRate: number
}

export interface CustomerBehaviorPattern {
  customerId: string
  visitFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'irregular'
  preferredDays: string[]
  preferredTimes: string[]
  seasonalTrends: Record<string, number>
  purchasePatterns: {
    averageOrderValue: number
    preferredCategories: string[]
    pricesensitivity: 'low' | 'medium' | 'high'
    brandLoyalty: Record<string, number>
  }
  communicationPreferences: {
    channel: 'email' | 'phone' | 'sms' | 'in-person'
    frequency: 'daily' | 'weekly' | 'monthly' | 'as-needed'
    responseRate: number
  }
}

export class CustomerIntelligenceService {
  /**
   * Generate insights for a specific customer
   */
  static generateCustomerInsights(customer: Customer, _transactions: Transaction[] = []): CustomerInsight[] {
    const insights: CustomerInsight[] = []
    const now = new Date()
    const daysSinceLastUpdate = Math.floor((now.getTime() - new Date(customer.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    const daysSinceCreation = Math.floor((now.getTime() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))

    // New customer welcome opportunity
    if (daysSinceCreation <= 7) {
      insights.push({
        id: `welcome-${customer.id}`,
        customerId: customer.id,
        type: 'opportunity',
        priority: 'high',
        title: 'New Customer Welcome',
        description: `${customer.firstName} is a new customer. Consider sending a welcome package or scheduling a follow-up.`,
        actionItems: [
          'Send welcome email with first-time customer benefits',
          'Schedule follow-up appointment',
          'Offer product education session'
        ],
        confidence: 0.9,
        createdAt: now,
        category: 'engagement'
      })
    }

    // At-risk customer alert
    if (daysSinceLastUpdate > 60 && daysSinceLastUpdate <= 90) {
      insights.push({
        id: `at-risk-${customer.id}`,
        customerId: customer.id,
        type: 'alert',
        priority: 'medium',
        title: 'Customer At Risk',
        description: `${customer.firstName} hasn't been seen in ${daysSinceLastUpdate} days. Risk of churn increasing.`,
        actionItems: [
          'Send re-engagement email campaign',
          'Offer special promotion or discount',
          'Schedule personal check-in call'
        ],
        confidence: 0.7,
        createdAt: now,
        category: 'retention'
      })
    }

    // Dormant customer alert
    if (daysSinceLastUpdate > 90) {
      insights.push({
        id: `dormant-${customer.id}`,
        customerId: customer.id,
        type: 'alert',
        priority: 'high',
        title: 'Dormant Customer',
        description: `${customer.firstName} has been inactive for ${daysSinceLastUpdate} days. High churn risk.`,
        actionItems: [
          'Launch win-back campaign',
          'Offer significant incentive to return',
          'Conduct customer satisfaction survey'
        ],
        confidence: 0.85,
        createdAt: now,
        category: 'retention'
      })
    }

    // High-value customer upsell opportunity
    const estimatedValue = Math.random() * 2000 // Mock calculation
    if (estimatedValue > 1000) {
      insights.push({
        id: `upsell-${customer.id}`,
        customerId: customer.id,
        type: 'opportunity',
        priority: 'medium',
        title: 'Upsell Opportunity',
        description: `${customer.firstName} is a high-value customer. Consider premium products or services.`,
        actionItems: [
          'Present premium lens options',
          'Offer designer frame collections',
          'Suggest annual eye care package'
        ],
        confidence: 0.6,
        createdAt: now,
        category: 'upsell'
      })
    }

    // Insurance renewal reminder
    if (customer.eligibilityDate) {
      const eligibilityDate = new Date(customer.eligibilityDate)
      const daysUntilRenewal = Math.floor((eligibilityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntilRenewal > 0 && daysUntilRenewal <= 30) {
        insights.push({
          id: `insurance-${customer.id}`,
          customerId: customer.id,
          type: 'recommendation',
          priority: 'medium',
          title: 'Insurance Benefits Expiring',
          description: `${customer.firstName}'s insurance benefits expire in ${daysUntilRenewal} days.`,
          actionItems: [
            'Schedule appointment before benefits expire',
            'Review available benefits',
            'Suggest comprehensive eye exam'
          ],
          confidence: 0.95,
          createdAt: now,
          category: 'financial'
        })
      }
    }

    return insights
  }

  /**
   * Calculate customer lifecycle stage
   */
  static calculateLifecycleStage(customer: Customer, transactions: Transaction[] = []): CustomerLifecycleStage {
    const now = new Date()
    const daysSinceCreation = Math.floor((now.getTime() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    const daysSinceLastUpdate = Math.floor((now.getTime() - new Date(customer.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    const transactionCount = transactions.length

    // Determine current stage
    let stage: CustomerLifecycleStage['stage'] = 'prospect'
    let daysInStage = daysSinceCreation
    let probability = 0.5
    const triggers: string[] = []

    if (!customer.active) {
      stage = 'churned'
      probability = 0.95
      triggers.push('Account marked inactive')
    } else if (daysSinceLastUpdate > 180) {
      stage = 'dormant'
      daysInStage = daysSinceLastUpdate
      probability = 0.8
      triggers.push('No activity in 6+ months')
    } else if (daysSinceLastUpdate > 90) {
      stage = 'at-risk'
      daysInStage = daysSinceLastUpdate - 90
      probability = 0.7
      triggers.push('No activity in 3+ months')
    } else if (transactionCount >= 5 && daysSinceCreation > 365) {
      stage = 'loyal'
      probability = 0.9
      triggers.push('Multiple transactions over extended period')
    } else if (transactionCount >= 2 && daysSinceCreation > 30) {
      stage = 'active'
      probability = 0.8
      triggers.push('Multiple transactions')
    } else if (daysSinceCreation <= 30) {
      stage = 'new'
      daysInStage = daysSinceCreation
      probability = 0.6
      triggers.push('Recently registered')
    }

    // Determine next stage
    let nextStage: string | undefined
    switch (stage) {
      case 'prospect':
        nextStage = 'new'
        break
      case 'new':
        nextStage = 'active'
        break
      case 'active':
        nextStage = 'loyal'
        break
      case 'at-risk':
        nextStage = 'active'
        break
      case 'dormant':
        nextStage = 'at-risk'
        break
    }

    return {
      stage,
      daysInStage,
      nextStage,
      probability,
      triggers
    }
  }

  /**
   * Calculate comprehensive customer score
   */
  static calculateCustomerScore(customer: Customer, transactions: Transaction[] = []): CustomerScore {
    const now = new Date()
    const daysSinceCreation = Math.floor((now.getTime() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    const daysSinceLastUpdate = Math.floor((now.getTime() - new Date(customer.updatedAt).getTime()) / (1000 * 60 * 60 * 24))

    // Mock calculations based on available data
    const transactionCount = transactions.length
    const estimatedSpending = Math.random() * 2000
    
    // Engagement Score (0-100)
    let engagementScore = 50
    if (daysSinceLastUpdate <= 30) engagementScore += 30
    if (daysSinceLastUpdate <= 7) engagementScore += 20
    if (transactionCount >= 3) engagementScore += 20
    engagementScore = Math.min(engagementScore, 100)

    // Loyalty Score (0-100)
    let loyaltyScore = 40
    if (daysSinceCreation > 365) loyaltyScore += 30
    if (transactionCount >= 5) loyaltyScore += 20
    if (customer.insuranceCarrier) loyaltyScore += 10
    loyaltyScore = Math.min(loyaltyScore, 100)

    // Churn Risk (0-1)
    let churnRisk = 0.1
    if (daysSinceLastUpdate > 90) churnRisk += 0.4
    if (daysSinceLastUpdate > 180) churnRisk += 0.3
    if (transactionCount === 0) churnRisk += 0.2
    churnRisk = Math.min(churnRisk, 1)

    // Lifetime Value
    const lifetimeValue = estimatedSpending + (transactionCount * 150)

    // Overall Score (0-100)
    const overallScore = Math.round(
      (engagementScore * 0.3) +
      (loyaltyScore * 0.3) +
      ((1 - churnRisk) * 100 * 0.2) +
      (Math.min(lifetimeValue / 20, 100) * 0.2)
    )

    return {
      customerId: customer.id,
      overallScore,
      lifetimeValue,
      churnRisk,
      engagementScore,
      loyaltyScore,
      lastUpdated: now
    }
  }

  /**
   * Analyze customer behavior patterns
   */
  static analyzeCustomerBehavior(customer: Customer, _transactions: Transaction[] = []): CustomerBehaviorPattern {
    // Mock behavior analysis - in real implementation, this would analyze transaction history
    const visitFrequencies = ['monthly', 'quarterly', 'annual'] as const
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const times = ['Morning', 'Afternoon', 'Evening']

    return {
      customerId: customer.id,
      visitFrequency: visitFrequencies[Math.floor(Math.random() * visitFrequencies.length)],
      preferredDays: weekdays.slice(0, 2 + Math.floor(Math.random() * 3)),
      preferredTimes: times.slice(0, 1 + Math.floor(Math.random() * 2)),
      seasonalTrends: {
        spring: 0.8,
        summer: 1.2,
        fall: 1.0,
        winter: 0.9
      },
      purchasePatterns: {
        averageOrderValue: 250 + Math.random() * 500,
        preferredCategories: ['Frames', 'Lenses'],
        pricesensitivity: Math.random() > 0.5 ? 'medium' : 'low',
        brandLoyalty: {
          'Ray-Ban': 0.7,
          'Oakley': 0.3
        }
      },
      communicationPreferences: {
        channel: customer.email ? 'email' : 'phone',
        frequency: 'monthly',
        responseRate: 0.6 + Math.random() * 0.3
      }
    }
  }

  /**
   * Generate business-wide customer analytics
   */
  static generateBusinessMetrics(customers: Customer[], transactions: Transaction[] = []): BusinessMetrics {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const totalCustomers = customers.length
    const activeCustomers = customers.filter(c => c.active).length
    
    // Monthly active customers (customers updated in last 30 days)
    const monthlyActiveCustomers = customers.filter(c => 
      new Date(c.updatedAt) >= thirtyDaysAgo
    ).length

    // Mock calculations for other metrics
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.total || 0), 0)
    const averageOrderValue = transactions.length > 0 ? totalRevenue / transactions.length : 0
    const revenuePerCustomer = activeCustomers > 0 ? totalRevenue / activeCustomers : 0

    // Churn rate (customers inactive for 90+ days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const churnedCustomers = customers.filter(c => 
      new Date(c.updatedAt) < ninetyDaysAgo && c.active
    ).length
    const churnRate = activeCustomers > 0 ? churnedCustomers / activeCustomers : 0

    // Retention rate
    const retentionRate = 1 - churnRate

    // Customer lifetime value (simplified calculation)
    const customerLifetimeValue = averageOrderValue * 3 * (1 / (churnRate || 0.1))

    return {
      totalCustomers,
      activeCustomers,
      monthlyActiveCustomers,
      churnRate,
      customerLifetimeValue,
      averageOrderValue,
      revenuePerCustomer,
      retentionRate
    }
  }

  /**
   * Get prioritized insights for dashboard
   */
  static getPrioritizedInsights(insights: CustomerInsight[]): CustomerInsight[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    
    return insights
      .sort((a, b) => {
        // Sort by priority first, then by confidence
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return b.confidence - a.confidence
      })
      .slice(0, 10) // Return top 10 insights
  }

  /**
   * Generate customer intelligence summary
   */
  static generateIntelligenceSummary(customers: Customer[]): {
    totalInsights: number
    criticalAlerts: number
    opportunities: number
    highRiskCustomers: number
    topPerformers: number
    recommendations: string[]
  } {
    const allInsights = customers.flatMap(customer => 
      this.generateCustomerInsights(customer)
    )

    const criticalAlerts = allInsights.filter(i => 
      i.priority === 'critical' || (i.type === 'alert' && i.priority === 'high')
    ).length

    const opportunities = allInsights.filter(i => i.type === 'opportunity').length

    const highRiskCustomers = customers.filter(customer => {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(customer.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysSinceUpdate > 90
    }).length

    const topPerformers = customers.filter(customer => {
      const score = this.calculateCustomerScore(customer)
      return score.overallScore > 80
    }).length

    const recommendations = [
      `${criticalAlerts} customers need immediate attention`,
      `${opportunities} upselling opportunities identified`,
      `${highRiskCustomers} customers at risk of churning`,
      `Focus on retention campaigns for at-risk customers`,
      `Leverage ${topPerformers} top performers for referrals`
    ]

    return {
      totalInsights: allInsights.length,
      criticalAlerts,
      opportunities,
      highRiskCustomers,
      topPerformers,
      recommendations
    }
  }
}