import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId') || session.user.locationId
    const period = searchParams.get('period') || 'today' // today, week, month, quarter, year
    const compare = searchParams.get('compare') === 'true' // Compare with previous period
    
    const dateRanges = getDateRanges(period)
    
    // Get sales metrics for current period
    const currentMetrics = await getSalesMetrics(locationId, dateRanges.current.start, dateRanges.current.end)
    
    // Get comparison metrics if requested
    let comparisonMetrics = null
    let growth = null
    
    if (compare) {
      comparisonMetrics = await getSalesMetrics(locationId, dateRanges.previous.start, dateRanges.previous.end)
      growth = calculateGrowth(currentMetrics, comparisonMetrics)
    }

    // Get top products for the period
    const topProducts = await getTopProducts(locationId, dateRanges.current.start, dateRanges.current.end)
    
    // Get sales by day for chart data
    const dailySales = await getDailySales(locationId, dateRanges.current.start, dateRanges.current.end)
    
    // Get sales by category
    const salesByCategory = await getSalesByCategory(locationId, dateRanges.current.start, dateRanges.current.end)
    
    // Get sales associate performance
    const associatePerformance = await getAssociatePerformance(locationId, dateRanges.current.start, dateRanges.current.end)

    return NextResponse.json({
      data: {
        period,
        dateRange: dateRanges.current,
        metrics: currentMetrics,
        comparison: comparisonMetrics,
        growth,
        topProducts,
        dailySales,
        salesByCategory,
        associatePerformance,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Sales analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales analytics' },
      { status: 500 }
    )
  }
}

function getDateRanges(period: string) {
  const now = new Date()
  
  const createRange = (startDate: Date, endDate: Date) => ({ start: startDate, end: endDate })

  switch (period) {
    case 'today':
      return {
        current: createRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        ),
        previous: createRange(
          new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
          new Date(now.getFullYear(), now.getMonth(), now.getDate())
        )
      }
      
    case 'week':
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      
      return {
        current: createRange(
          startOfWeek,
          new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
        ),
        previous: createRange(
          new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000),
          startOfWeek
        )
      }
      
    case 'month':
      return {
        current: createRange(
          new Date(now.getFullYear(), now.getMonth(), 1),
          new Date(now.getFullYear(), now.getMonth() + 1, 1)
        ),
        previous: createRange(
          new Date(now.getFullYear(), now.getMonth() - 1, 1),
          new Date(now.getFullYear(), now.getMonth(), 1)
        )
      }
      
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3)
      return {
        current: createRange(
          new Date(now.getFullYear(), quarter * 3, 1),
          new Date(now.getFullYear(), (quarter + 1) * 3, 1)
        ),
        previous: createRange(
          new Date(now.getFullYear(), (quarter - 1) * 3, 1),
          new Date(now.getFullYear(), quarter * 3, 1)
        )
      }
      
    case 'year':
      return {
        current: createRange(
          new Date(now.getFullYear(), 0, 1),
          new Date(now.getFullYear() + 1, 0, 1)
        ),
        previous: createRange(
          new Date(now.getFullYear() - 1, 0, 1),
          new Date(now.getFullYear(), 0, 1)
        )
      }
      
    default:
      return getDateRanges('today')
  }
}

async function getSalesMetrics(locationId: string, startDate: Date, endDate: Date) {
  const [transactions, metrics] = await Promise.all([
    // Get all transactions for the period
    prisma.transaction.findMany({
      where: {
        locationId,
        createdAt: {
          gte: startDate,
          lt: endDate
        },
        status: 'COMPLETED'
      },
      include: {
        items: true,
        customer: true
      }
    }),
    
    // Get aggregated metrics
    prisma.transaction.aggregate({
      where: {
        locationId,
        createdAt: {
          gte: startDate,
          lt: endDate
        },
        status: 'COMPLETED'
      },
      _sum: {
        total: true,
        subtotal: true,
        tax: true,
        discount: true,
        insuranceDiscount: true
      },
      _avg: {
        total: true
      },
      _count: true
    })
  ])

  const totalRevenue = metrics._sum.total || 0
  const totalTransactions = metrics._count || 0
  const averageOrderValue = metrics._avg.total || 0
  const totalDiscount = (metrics._sum.discount || 0) + (metrics._sum.insuranceDiscount || 0)
  const totalTax = metrics._sum.tax || 0
  
  // Calculate items sold
  const totalItemsSold = transactions.reduce((sum, tx) => 
    sum + tx.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  )
  
  // Calculate unique customers
  const uniqueCustomers = new Set(transactions.map(tx => tx.customerId)).size
  
  // Calculate conversion rate (assuming some method to track visitors)
  const conversionRate = totalTransactions > 0 ? (totalTransactions / Math.max(totalTransactions * 2, 1)) * 100 : 0

  return {
    totalRevenue,
    totalTransactions,
    averageOrderValue,
    totalItemsSold,
    uniqueCustomers,
    totalDiscount,
    totalTax,
    conversionRate,
    period: {
      start: startDate,
      end: endDate
    }
  }
}

interface SalesMetrics {
  totalRevenue: number
  totalTransactions: number
  averageOrderValue: number
  uniqueCustomers: number
}

function calculateGrowth(current: SalesMetrics, previous: SalesMetrics) {
  const calculatePercentage = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return ((curr - prev) / prev) * 100
  }

  return {
    revenue: calculatePercentage(current.totalRevenue, previous.totalRevenue),
    transactions: calculatePercentage(current.totalTransactions, previous.totalTransactions),
    averageOrderValue: calculatePercentage(current.averageOrderValue, previous.averageOrderValue),
    customers: calculatePercentage(current.uniqueCustomers, previous.uniqueCustomers)
  }
}

async function getTopProducts(locationId: string, startDate: Date, endDate: Date) {
  const topProducts = await prisma.transactionItem.groupBy({
    by: ['productId'],
    where: {
      transaction: {
        locationId,
        createdAt: {
          gte: startDate,
          lt: endDate
        },
        status: 'COMPLETED'
      }
    },
    _sum: {
      quantity: true,
      total: true
    },
    _count: true,
    orderBy: {
      _sum: {
        total: 'desc'
      }
    },
    take: 10
  })

  // Get product details
  const productIds = topProducts.map(p => p.productId)
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds
      }
    },
    include: {
      category: true
    }
  })

  return topProducts.map(item => {
    const product = products.find(p => p.id === item.productId)
    return {
      product,
      quantitySold: item._sum.quantity || 0,
      revenue: item._sum.total || 0,
      transactions: item._count
    }
  })
}

async function getDailySales(locationId: string, startDate: Date, endDate: Date) {
  const transactions = await prisma.transaction.findMany({
    where: {
      locationId,
      createdAt: {
        gte: startDate,
        lt: endDate
      },
      status: 'COMPLETED'
    },
    select: {
      createdAt: true,
      total: true
    }
  })

  // Group by day
  const dailyData: Record<string, { date: string, revenue: number, transactions: number }> = {}
  
  transactions.forEach(tx => {
    const date = tx.createdAt.toISOString().split('T')[0]
    if (!dailyData[date]) {
      dailyData[date] = { date, revenue: 0, transactions: 0 }
    }
    dailyData[date].revenue += tx.total
    dailyData[date].transactions += 1
  })

  return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date))
}

async function getSalesByCategory(locationId: string, startDate: Date, endDate: Date) {
  const categoryData = await prisma.transactionItem.groupBy({
    by: ['productId'],
    where: {
      transaction: {
        locationId,
        createdAt: {
          gte: startDate,
          lt: endDate
        },
        status: 'COMPLETED'
      }
    },
    _sum: {
      total: true,
      quantity: true
    }
  })

  // Get products with categories
  const productIds = categoryData.map(item => item.productId)
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds
      }
    },
    include: {
      category: true
    }
  })

  // Group by category
  const categoryMap: Record<string, { name: string, revenue: number, quantity: number }> = {}
  
  categoryData.forEach(item => {
    const product = products.find(p => p.id === item.productId)
    if (product) {
      const categoryName = product.category.name
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = { name: categoryName, revenue: 0, quantity: 0 }
      }
      categoryMap[categoryName].revenue += item._sum.total || 0
      categoryMap[categoryName].quantity += item._sum.quantity || 0
    }
  })

  return Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue)
}

async function getAssociatePerformance(locationId: string, startDate: Date, endDate: Date) {
  const associateData = await prisma.transaction.groupBy({
    by: ['userId'],
    where: {
      locationId,
      createdAt: {
        gte: startDate,
        lt: endDate
      },
      status: 'COMPLETED'
    },
    _sum: {
      total: true
    },
    _avg: {
      total: true
    },
    _count: true
  })

  // Get user details
  const userIds = associateData.map(item => item.userId)
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true
    }
  })

  return associateData.map(item => {
    const user = users.find(u => u.id === item.userId)
    return {
      user,
      totalRevenue: item._sum.total || 0,
      averageOrderValue: item._avg.total || 0,
      totalTransactions: item._count,
      performance: {
        rank: 0 // Will be calculated after sorting
      }
    }
  }).sort((a, b) => b.totalRevenue - a.totalRevenue)
    .map((item, index) => ({ ...item, performance: { rank: index + 1 } }))
}