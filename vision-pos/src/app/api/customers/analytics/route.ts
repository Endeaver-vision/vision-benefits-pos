import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/customers/analytics - Get customer analytics and statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Date filters
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } : {}

    // Get basic customer counts
    const [
      totalCustomers,
      activeCustomers,
      customersThisMonth,
      customersToday
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { active: true } }),
      prisma.customer.count({
        where: {
          active: true,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.customer.count({
        where: {
          active: true,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ])

    // Get customers by insurance carrier
    const customersByInsurance = await prisma.customer.groupBy({
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
      }
    })

    // Get customers by location (city)
    const customersByLocation = await prisma.customer.groupBy({
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

    // Get recent customer registrations
    const recentCustomers = await prisma.customer.findMany({
      where: {
        active: true,
        ...dateFilter
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        insuranceCarrier: true
      }
    })

    // Get top customers by transaction count
    const topCustomersByTransactions = await prisma.customer.findMany({
      where: { active: true },
      include: {
        _count: {
          select: {
            transactions: true
          }
        }
      },
      orderBy: {
        transactions: {
          _count: 'desc'
        }
      },
      take: 10
    })

    // Calculate customer retention rate (simplified)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    const customersOneYearAgo = await prisma.customer.count({
      where: {
        createdAt: { lte: oneYearAgo },
        active: true
      }
    })

    const retentionRate = customersOneYearAgo > 0 
      ? parseFloat(((activeCustomers / customersOneYearAgo) * 100).toFixed(2))
      : 0

    // Get average transaction value per customer
    const transactionStats = await prisma.transaction.aggregate({
      _avg: {
        total: true
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      },
      where: {
        status: 'COMPLETED'
      }
    })

    const averageOrderValue = transactionStats._avg.total || 0
    const totalRevenue = transactionStats._sum.total || 0
    const totalTransactions = transactionStats._count.id || 0

    const averageCustomerValue = activeCustomers > 0 
      ? parseFloat((totalRevenue / activeCustomers).toFixed(2))
      : 0

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          activeCustomers,
          customersThisMonth,
          customersToday,
          retentionRate: retentionRate,
          averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
          averageCustomerValue: averageCustomerValue,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalTransactions
        },
        distribution: {
          byInsurance: customersByInsurance.map(item => ({
            carrier: item.insuranceCarrier || 'No Insurance',
            count: item._count.id
          })),
          byLocation: customersByLocation.map(item => ({
            city: item.city || 'Unknown',
            count: item._count.id
          }))
        },
        recent: {
          customers: recentCustomers,
          topByTransactions: topCustomersByTransactions.map(customer => ({
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            transactionCount: customer._count.transactions
          }))
        }
      }
    })
  } catch (error) {
    console.error('Customer analytics error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get customer analytics'
    }, { status: 500 })
  }
}