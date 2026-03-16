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
    const locationId = searchParams.get('locationId') || (session.user as { locationId?: string })?.locationId
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

    // Get order status breakdown
    const ordersByStatus = await getOrdersByStatus(locationId, dateRanges.current.start, dateRanges.current.end)

    // Get top products for the period (from order items)
    const topProducts = await getTopProducts(locationId, dateRanges.current.start, dateRanges.current.end)

    // Get sales by day for chart data
    const dailySales = await getDailySales(locationId, dateRanges.current.start, dateRanges.current.end)

    // Get sales by category (from order items)
    const salesByCategory = await getSalesByCategory(locationId, dateRanges.current.start, dateRanges.current.end)

    // Get sales associate performance
    const associatePerformance = await getAssociatePerformance(locationId, dateRanges.current.start, dateRanges.current.end)

    // Get order fulfillment metrics
    const fulfillmentMetrics = await getFulfillmentMetrics(locationId, dateRanges.current.start, dateRanges.current.end)

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: dateRanges.current,
        metrics: currentMetrics,
        comparison: comparisonMetrics,
        growth,
        ordersByStatus,
        fulfillmentMetrics,
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

async function getSalesMetrics(locationId: string | null, startDate: Date, endDate: Date) {
  const whereClause = {
    ...(locationId && { locationId }),
    createdAt: {
      gte: startDate,
      lt: endDate
    },
    status: 'COMPLETED' as const
  }

  const [transactions, metrics, orderMetrics] = await Promise.all([
    // Get all transactions for the period
    prisma.transaction.findMany({
      where: whereClause,
      include: {
        items: true,
        customer: true
      }
    }),

    // Get aggregated transaction metrics
    prisma.transaction.aggregate({
      where: whereClause,
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
    }),

    // Get order metrics
    prisma.order.aggregate({
      where: {
        ...(locationId && { locationId }),
        orderDate: {
          gte: startDate,
          lt: endDate
        }
      },
      _sum: {
        total: true,
        patientPortion: true,
        insuranceDiscount: true
      },
      _count: true
    })
  ])

  const totalRevenue = Number(metrics._sum.total) || 0
  const totalTransactions = metrics._count || 0
  const averageOrderValue = Number(metrics._avg.total) || 0
  const totalDiscount = Number(metrics._sum.discount || 0) + Number(metrics._sum.insuranceDiscount || 0)
  const totalTax = Number(metrics._sum.tax) || 0
  const totalOrders = orderMetrics._count || 0
  const totalInsuranceBilled = Number(orderMetrics._sum.insuranceDiscount) || 0

  // Calculate items sold
  const totalItemsSold = transactions.reduce((sum, tx) =>
    sum + tx.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  )

  // Calculate unique customers
  const uniqueCustomers = new Set(transactions.map(tx => tx.customerId)).size

  // Calculate conversion rate (quotes to orders)
  const conversionRate = totalOrders > 0 ? 75 : 0 // Placeholder - would need quote data

  return {
    totalRevenue,
    totalTransactions,
    totalOrders,
    averageOrderValue,
    totalItemsSold,
    uniqueCustomers,
    totalDiscount,
    totalInsuranceBilled,
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
  totalOrders: number
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
    orders: calculatePercentage(current.totalOrders, previous.totalOrders),
    averageOrderValue: calculatePercentage(current.averageOrderValue, previous.averageOrderValue),
    customers: calculatePercentage(current.uniqueCustomers, previous.uniqueCustomers)
  }
}

async function getOrdersByStatus(locationId: string | null, startDate: Date, endDate: Date) {
  const statusCounts = await prisma.order.groupBy({
    by: ['status'],
    where: {
      ...(locationId && { locationId }),
      orderDate: {
        gte: startDate,
        lt: endDate
      }
    },
    _count: { status: true },
    _sum: { total: true }
  })

  return statusCounts.map(item => ({
    status: item.status,
    count: item._count.status,
    revenue: Number(item._sum.total) || 0
  }))
}

async function getFulfillmentMetrics(locationId: string | null, startDate: Date, endDate: Date) {
  // Get completed orders to calculate fulfillment time
  const completedOrders = await prisma.order.findMany({
    where: {
      ...(locationId && { locationId }),
      orderDate: {
        gte: startDate,
        lt: endDate
      },
      completedDate: { not: null }
    },
    select: {
      orderDate: true,
      completedDate: true,
      status: true
    }
  })

  // Calculate average fulfillment time in days
  let totalDays = 0
  let completedCount = 0

  completedOrders.forEach(order => {
    if (order.completedDate) {
      const days = (order.completedDate.getTime() - order.orderDate.getTime()) / (1000 * 60 * 60 * 24)
      totalDays += days
      completedCount++
    }
  })

  const avgFulfillmentDays = completedCount > 0 ? totalDays / completedCount : 0

  // Get orders by lab (if labId is set)
  const labOrders = await prisma.order.groupBy({
    by: ['labId'],
    where: {
      ...(locationId && { locationId }),
      orderDate: {
        gte: startDate,
        lt: endDate
      },
      labId: { not: null }
    },
    _count: { id: true }
  })

  return {
    averageFulfillmentDays: Math.round(avgFulfillmentDays * 10) / 10,
    completedOrdersCount: completedCount,
    ordersByLab: labOrders.map(l => ({
      labId: l.labId,
      count: l._count.id
    }))
  }
}

async function getTopProducts(locationId: string | null, startDate: Date, endDate: Date) {
  // Get top products from OrderItems (more reliable than TransactionItems)
  const topProducts = await prisma.orderItem.groupBy({
    by: ['displayName', 'productType'],
    where: {
      order: {
        ...(locationId && { locationId }),
        orderDate: {
          gte: startDate,
          lt: endDate
        }
      }
    },
    _sum: {
      quantity: true,
      retailPrice: true,
      patientCopay: true
    },
    _count: true,
    orderBy: {
      _sum: {
        retailPrice: 'desc'
      }
    },
    take: 10
  })

  return topProducts.map(item => ({
    name: item.displayName,
    productType: item.productType,
    quantitySold: item._sum.quantity || 0,
    retailRevenue: Number(item._sum.retailPrice) || 0,
    patientRevenue: Number(item._sum.patientCopay) || 0,
    orderCount: item._count
  }))
}

async function getDailySales(locationId: string | null, startDate: Date, endDate: Date) {
  // Get orders by day (primary data source)
  const orders = await prisma.order.findMany({
    where: {
      ...(locationId && { locationId }),
      orderDate: {
        gte: startDate,
        lt: endDate
      }
    },
    select: {
      orderDate: true,
      total: true,
      patientPortion: true,
      insuranceDiscount: true
    }
  })

  // Group by day
  const dailyData: Record<string, {
    date: string
    revenue: number
    patientRevenue: number
    insuranceRevenue: number
    orders: number
  }> = {}

  orders.forEach(order => {
    const date = order.orderDate.toISOString().split('T')[0]
    if (!dailyData[date]) {
      dailyData[date] = { date, revenue: 0, patientRevenue: 0, insuranceRevenue: 0, orders: 0 }
    }
    dailyData[date].revenue += Number(order.total)
    dailyData[date].patientRevenue += Number(order.patientPortion)
    dailyData[date].insuranceRevenue += Number(order.insuranceDiscount)
    dailyData[date].orders += 1
  })

  return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date))
}

async function getSalesByCategory(locationId: string | null, startDate: Date, endDate: Date) {
  // Group OrderItems by productType (our category system)
  const categoryData = await prisma.orderItem.groupBy({
    by: ['productType'],
    where: {
      order: {
        ...(locationId && { locationId }),
        orderDate: {
          gte: startDate,
          lt: endDate
        }
      }
    },
    _sum: {
      retailPrice: true,
      patientCopay: true,
      insurancePays: true,
      quantity: true
    },
    _count: true
  })

  // Map product types to friendly names
  const categoryNames: Record<string, string> = {
    FRAME: 'Frames',
    LENS: 'Lenses',
    CONTACT: 'Contact Lenses',
    COATING: 'Coatings & Add-ons',
    SERVICE: 'Services'
  }

  return categoryData.map(item => ({
    name: categoryNames[item.productType] || item.productType,
    productType: item.productType,
    retailRevenue: Number(item._sum.retailPrice) || 0,
    patientRevenue: Number(item._sum.patientCopay) || 0,
    insuranceRevenue: Number(item._sum.insurancePays) || 0,
    quantity: item._sum.quantity || 0,
    itemCount: item._count
  })).sort((a, b) => b.retailRevenue - a.retailRevenue)
}

async function getAssociatePerformance(locationId: string | null, startDate: Date, endDate: Date) {
  // Get performance from Orders (more comprehensive than transactions)
  const associateData = await prisma.order.groupBy({
    by: ['employeeId'],
    where: {
      ...(locationId && { locationId }),
      orderDate: {
        gte: startDate,
        lt: endDate
      },
      employeeId: { not: null }
    },
    _sum: {
      total: true,
      patientPortion: true
    },
    _avg: {
      total: true
    },
    _count: true
  })

  // Get employee details
  const employeeIds = associateData.map(item => item.employeeId).filter((id): id is string => id !== null)
  const employees = await prisma.employee.findMany({
    where: {
      id: {
        in: employeeIds
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      roles: true
    }
  })

  return associateData.map(item => {
    const employee = employees.find(e => e.id === item.employeeId)
    return {
      employee: employee ? {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        role: employee.roles?.[0] || 'Staff'
      } : null,
      totalRevenue: Number(item._sum.total) || 0,
      patientRevenue: Number(item._sum.patientPortion) || 0,
      averageOrderValue: Number(item._avg.total) || 0,
      totalOrders: item._count,
      performance: {
        rank: 0 // Will be calculated after sorting
      }
    }
  }).sort((a, b) => b.totalRevenue - a.totalRevenue)
    .map((item, index) => ({ ...item, performance: { rank: index + 1 } }))
}