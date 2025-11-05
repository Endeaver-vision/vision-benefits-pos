import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Enhanced Customer Analytics Dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30' // days
    const includeSegmentation = searchParams.get('segmentation') === 'true'
    const includeGrowth = searchParams.get('growth') === 'true'

    const days = parseInt(timeframe)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Basic customer metrics
    const [
      totalCustomers,
      activeCustomers,
      newCustomersThisPeriod,
      highValueCustomers,
      frequentCustomers,
      transactionMetrics
    ] = await Promise.all([
      // Total customers
      prisma.customer.count(),
      
      // Active customers (have made transactions or visited recently)
      prisma.customer.count({
        where: { active: true }
      }),
      
      // New customers in timeframe
      prisma.customer.count({
        where: {
          createdAt: { gte: startDate },
          active: true
        }
      }),
      
      // High value customers (customers with total transactions > $500)
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT c.id) as count 
        FROM customers c 
        INNER JOIN transactions t ON c.id = t.customerId 
        WHERE c.active = 1 
        AND t.status = 'COMPLETED'
        GROUP BY c.id
        HAVING SUM(t.total) > 500
      `,
      
      // Frequent customers (multiple transactions)
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT c.id) as count 
        FROM customers c 
        INNER JOIN transactions t ON c.id = t.customerId 
        WHERE c.active = 1 
        AND t.status = 'COMPLETED'
        GROUP BY c.id
        HAVING COUNT(t.id) >= 3
      `,
      
      // Transaction metrics
      prisma.transaction.aggregate({
        where: { 
          status: 'COMPLETED',
          createdAt: { gte: startDate }
        },
        _avg: {
          total: true
        },
        _sum: {
          total: true
        },
        _count: {
          id: true
        }
      })
    ])

    // Customer segmentation analysis
    let segmentation = null
    if (includeSegmentation) {
      const [
        recentlyActive,
        atRisk,
        dormant,
        byInsuranceCarrier,
        byLocation
      ] = await Promise.all([
        // Recently active (visited/purchased in last 30 days)
        prisma.customer.count({
          where: {
            active: true,
            updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }),
        
        // At risk (no activity in 60-90 days)
        prisma.customer.count({
          where: {
            active: true,
            updatedAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
              lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Dormant (no activity in 90+ days)
        prisma.customer.count({
          where: {
            active: true,
            updatedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
          }
        }),
        
        // By insurance carrier
        prisma.customer.groupBy({
          by: ['insuranceCarrier'],
          where: {
            active: true,
            insuranceCarrier: { not: null }
          },
          _count: {
            id: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          },
          take: 10
        }),
        
        // By location (city)
        prisma.customer.groupBy({
          by: ['city'],
          where: {
            active: true,
            city: { not: null }
          },
          _count: {
            id: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          },
          take: 10
        })
      ])

      segmentation = {
        recentlyActive,
        atRisk,
        dormant,
        byInsuranceCarrier: byInsuranceCarrier.map(item => ({
          carrier: item.insuranceCarrier || 'Unknown',
          count: item._count.id,
          percentage: activeCustomers > 0 ? ((item._count.id / activeCustomers) * 100).toFixed(1) : '0'
        })),
        byLocation: byLocation.map(item => ({
          city: item.city || 'Unknown',
          count: item._count.id,
          percentage: activeCustomers > 0 ? ((item._count.id / activeCustomers) * 100).toFixed(1) : '0'
        }))
      }
    }

    // Growth analysis
    let growthAnalysis = null
    if (includeGrowth) {
      const periods = [7, 14, 30, 60, 90] // days
      const growthData = await Promise.all(
        periods.map(async (period) => {
          const periodStart = new Date()
          periodStart.setDate(periodStart.getDate() - period)
          
          const [newCustomers, totalRevenue] = await Promise.all([
            prisma.customer.count({
              where: {
                createdAt: { gte: periodStart },
                active: true
              }
            }),
            prisma.transaction.aggregate({
              where: {
                createdAt: { gte: periodStart },
                status: 'COMPLETED'
              },
              _sum: {
                total: true
              }
            })
          ])
          
          return {
            period: `${period} days`,
            newCustomers,
            revenue: totalRevenue._sum.total || 0
          }
        })
      )
      
      growthAnalysis = {
        periods: growthData,
        trends: {
          customerGrowthRate: newCustomersThisPeriod > 0 ? 
            ((newCustomersThisPeriod / activeCustomers) * 100).toFixed(2) : '0',
          averageCustomerValue: averageMetrics._avg.totalSpent || 0,
          totalCustomerValue: averageMetrics._sum.totalSpent || 0
        }
      }
    }

    // Top customers by value (calculated from transactions)
    const topCustomers = await prisma.$queryRaw<Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      insuranceCarrier: string | null;
      city: string | null;
      state: string | null;
      totalSpent: number;
    }>>`
      SELECT 
        c.id,
        c.firstName,
        c.lastName,
        c.email,
        c.insuranceCarrier,
        c.city,
        c.state,
        COALESCE(SUM(t.total), 0) as totalSpent
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customerId AND t.status = 'COMPLETED'
      WHERE c.active = 1
      GROUP BY c.id, c.firstName, c.lastName, c.email, c.insuranceCarrier, c.city, c.state
      HAVING totalSpent > 0
      ORDER BY totalSpent DESC
      LIMIT 10
    `

    // Recent customer activity
    const recentActivity = await prisma.customer.findMany({
      where: { active: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        updatedAt: true,
        createdAt: true
      }
    })

    const analytics = {
      overview: {
        totalCustomers,
        activeCustomers,
        newCustomersThisPeriod,
        highValueCustomers: Array.isArray(highValueCustomers) ? highValueCustomers.length : 0,
        frequentCustomers: Array.isArray(frequentCustomers) ? frequentCustomers.length : 0,
        customerRetentionRate: activeCustomers > 0 ? 
          (((activeCustomers - newCustomersThisPeriod) / activeCustomers) * 100).toFixed(1) : '0',
        averageOrderValue: transactionMetrics._avg.total || 0,
        totalRevenue: transactionMetrics._sum.total || 0,
        totalTransactions: transactionMetrics._count.id || 0
      },
      topCustomers,
      recentActivity,
      timeframe: `${days} days`,
      ...(segmentation && { segmentation }),
      ...(growthAnalysis && { growth: growthAnalysis })
    }

    return NextResponse.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('Customer analytics error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate analytics'
    }, { status: 500 })
  }
}