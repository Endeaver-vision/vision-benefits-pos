/**
 * Orders API
 * GET /api/orders - List orders with filtering, pagination, and stats
 * POST /api/orders - Create a new order
 *
 * This API uses the real database (Supabase via Prisma) instead of mock data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { OrderStatus, Prisma } from '@prisma/client'

interface OrderFilters {
  status?: string[]
  customerId?: string
  orderNumber?: string
  labId?: string
  dateRange?: { start: string; end: string }
  sortBy?: 'orderDate' | 'completionDate' | 'totalAmount' | 'customerName'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

/**
 * GET - List orders with filtering, pagination, and stats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse filters
    const filters: OrderFilters = {
      status: searchParams.get('status')?.split(',') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      orderNumber: searchParams.get('orderNumber') || undefined,
      labId: searchParams.get('labId') || undefined,
      sortBy:
        (searchParams.get('sortBy') as
          | 'orderDate'
          | 'completionDate'
          | 'totalAmount'
          | 'customerName') || 'orderDate',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    }

    if (searchParams.get('startDate') && searchParams.get('endDate')) {
      filters.dateRange = {
        start: searchParams.get('startDate')!,
        end: searchParams.get('endDate')!,
      }
    }

    // Build where clause
    const where: Prisma.OrderWhereInput = {}

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status as OrderStatus[] }
    }

    if (filters.customerId) {
      where.customerId = filters.customerId
    }

    if (filters.orderNumber) {
      where.orderNumber = { contains: filters.orderNumber, mode: 'insensitive' }
    }

    if (filters.labId) {
      where.labId = filters.labId
    }

    if (filters.dateRange) {
      where.orderDate = {
        gte: new Date(filters.dateRange.start),
        lte: new Date(filters.dateRange.end),
      }
    }

    // Build orderBy clause
    let orderBy: Prisma.OrderOrderByWithRelationInput = {}
    switch (filters.sortBy) {
      case 'orderDate':
        orderBy = { orderDate: filters.sortOrder || 'desc' }
        break
      case 'completionDate':
        orderBy = { completedDate: filters.sortOrder || 'desc' }
        break
      case 'totalAmount':
        orderBy = { total: filters.sortOrder || 'desc' }
        break
      case 'customerName':
        orderBy = { customer: { lastName: filters.sortOrder || 'asc' } }
        break
      default:
        orderBy = { orderDate: 'desc' }
    }

    // Pagination
    const page = Math.max(1, filters.page || 1)
    const limit = Math.max(1, Math.min(filters.limit || 20, 100))
    const skip = (page - 1) * limit

    // Fetch orders with relations
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
          quote: {
            select: {
              id: true,
              quoteNumber: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          items: true,
          transactions: {
            select: {
              id: true,
              transactionNumber: true,
              paymentMethod: true,
              total: true,
              status: true,
              createdAt: true,
            },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    // Calculate stats
    const statsAggregation = await prisma.order.aggregate({
      where,
      _sum: { total: true },
      _avg: { total: true },
      _count: true,
    })

    // Get orders by status count
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    })

    const ordersByStatus = statusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status
        return acc
      },
      {} as Record<string, number>
    )

    // Format response
    const formattedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerInfo: {
        name: `${order.customer.firstName} ${order.customer.lastName}`,
        email: order.customer.email,
        phone: order.customer.phone,
        address: order.customer.address
          ? {
              street: order.customer.address,
              city: order.customer.city,
              state: order.customer.state,
              zipCode: order.customer.zipCode,
            }
          : null,
      },
      quoteId: order.quoteId,
      quoteNumber: order.quote?.quoteNumber,
      status: order.status,
      orderDate: order.orderDate,
      estimatedCompletionDate: order.estimatedCompletionDate,
      completedDate: order.completedDate,
      lab: order.labId
        ? {
            id: order.labId,
            orderNumber: order.labOrderNumber,
            trackingNumber: order.labTrackingNumber,
          }
        : null,
      location: order.location,
      employee: order.employee
        ? {
            id: order.employee.id,
            name: `${order.employee.firstName} ${order.employee.lastName}`,
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        type: item.productType,
        productId: item.productId,
        productName: item.displayName,
        sku: item.sku,
        quantity: item.quantity,
        retailPrice: Number(item.retailPrice),
        insurancePays: Number(item.insurancePays),
        patientCopay: Number(item.patientCopay),
        insuranceTier: item.insuranceTier,
      })),
      pricing: {
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.tax),
        discountAmount: Number(order.discount),
        insuranceAmount: Number(order.insuranceDiscount),
        totalAmount: Number(order.total),
        patientPortion: Number(order.patientPortion),
      },
      payment: {
        status:
          order.transactions.length > 0 &&
          order.transactions.every((t) => t.status === 'COMPLETED')
            ? 'paid'
            : order.transactions.length > 0
              ? 'partial'
              : 'pending',
        transactions: order.transactions.map((t) => ({
          id: t.id,
          transactionNumber: t.transactionNumber,
          method: t.paymentMethod,
          amount: Number(t.total),
          status: t.status,
          timestamp: t.createdAt,
        })),
      },
      insuranceCarrier: order.insuranceCarrier,
      notes: order.notes,
      statusHistory: order.statusHistory.map((h) => ({
        status: h.status,
        timestamp: h.createdAt,
        changedBy: h.changedBy,
        notes: h.notes,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }))

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: formattedOrders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      stats: {
        total: totalCount,
        totalValue: Number(statsAggregation._sum.total) || 0,
        averageOrderValue: Number(statsAggregation._avg.total) || 0,
        ordersByStatus,
      },
    })
  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orderData = await request.json()

    // Validate required fields
    const requiredFields = ['customerId', 'items']
    const missingFields = requiredFields.filter((field) => !orderData[field])

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: orderData.customerId },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Generate order number
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    const orderNumber = `ORD-${dateStr}-${random}`

    const employeeId = (session.user as { employeeId?: string })?.employeeId
    const locationId =
      orderData.locationId ||
      (session.user as { locationId?: string })?.locationId

    // Create order with items
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: orderData.customerId,
          quoteId: orderData.quoteId || null,
          locationId: locationId || null,
          employeeId: employeeId || null,
          status: OrderStatus.DRAFT,
          orderDate: new Date(),
          estimatedCompletionDate: orderData.estimatedCompletionDate
            ? new Date(orderData.estimatedCompletionDate)
            : null,
          labId: orderData.labId || null,
          subtotal: orderData.subtotal || 0,
          tax: orderData.tax || 0,
          discount: orderData.discount || 0,
          insuranceDiscount: orderData.insuranceDiscount || 0,
          total: orderData.total || 0,
          patientPortion: orderData.patientPortion || 0,
          insuranceCarrier: orderData.insuranceCarrier || null,
          insuranceAuthorizationId: orderData.authorizationId || null,
          notes: orderData.notes || null,
        },
      })

      // Create order items
      if (orderData.items && orderData.items.length > 0) {
        await tx.orderItem.createMany({
          data: orderData.items.map(
            (item: {
              productType: string
              productId?: string
              sku?: string
              displayName: string
              quantity?: number
              retailPrice?: number
              insurancePays?: number
              patientCopay?: number
              insuranceTier?: string
              notes?: string
            }) => ({
              orderId: newOrder.id,
              productType: item.productType || 'LENS',
              productId: item.productId || null,
              sku: item.sku || null,
              displayName: item.displayName,
              quantity: item.quantity || 1,
              retailPrice: item.retailPrice || 0,
              insurancePays: item.insurancePays || 0,
              patientCopay: item.patientCopay || 0,
              insuranceTier: item.insuranceTier || null,
              notes: item.notes || null,
            })
          ),
        })
      }

      // Create initial status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          status: OrderStatus.DRAFT,
          changedBy: employeeId || null,
          notes: 'Order created',
        },
      })

      // Fetch the complete order with relations
      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          items: true,
          statusHistory: true,
        },
      })
    })

    if (!order) {
      throw new Error('Failed to create order')
    }

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        status: order.status,
        orderDate: order.orderDate,
        itemCount: order.items.length,
        total: Number(order.total),
        createdAt: order.createdAt,
      },
      message: 'Order created successfully',
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      },
      { status: 500 }
    )
  }
}
