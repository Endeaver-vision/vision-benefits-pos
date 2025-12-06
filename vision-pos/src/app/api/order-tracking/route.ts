import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  Order,
  OrderListResponse,
  CreateOrderRequest,
} from '@/types/order-tracking'

/**
 * GET /api/order-tracking
 * List all orders with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = (searchParams.get('sortBy') || 'orderDate') as 'orderDate' | 'estimatedCompletionDate' | 'totalAmount' | 'status'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    
    // Filters
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')

    // Build where clause
    const where: Record<string, unknown> = {}
    
    if (customerId) {
      where.customerId = customerId
    }
    
    if (status) {
      where.status = status
    }
    
    if (dateFrom || dateTo) {
      where.orderDate = {}
      if (dateFrom) (where.orderDate as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.orderDate as Record<string, unknown>).lte = new Date(dateTo)
    }
    
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Get total count
    const total = await prisma.order.count({ where })

    // Get orders
    const orders = await prisma.order.findMany({
      where,
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
        items: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            items: true,
            communications: true,
            qualityChecks: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    const response: OrderListResponse = {
      orders: orders as unknown as Order[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/order-tracking
 * Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json()

    // Validate required fields
    if (!body.customerId || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'customerId and items are required' },
        { status: 400 }
      )
    }

    // Generate order number
    const orderNumber = await generateOrderNumber()

    // Calculate totals
    const subtotal = body.items.reduce(
      (sum, item) => sum + item.unitPrice * (item.quantity || 1),
      0
    )
    const taxAmount = subtotal * 0.08 // 8% tax rate (adjust as needed)
    const totalAmount = subtotal + taxAmount

    // Create order with items
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: body.customerId,
        prescriptionId: body.prescriptionId,
        status: 'DRAFT',
        orderDate: new Date(),
        estimatedCompletionDate: new Date(body.estimatedCompletionDate),
        deliveryMethod: body.deliveryMethod,
        deliveryAddress: body.deliveryAddress as Record<string, unknown>,
        deliveryInstructions: body.deliveryInstructions,
        subtotal,
        taxAmount,
        totalAmount,
        amountPaid: 0,
        notes: body.notes,
        internalNotes: body.internalNotes,
        createdBy: 'system', // TODO: Get from auth session
        items: {
          create: body.items.map((item) => ({
            type: item.type,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            description: item.description,
            lensType: item.lensType,
            lensCoatings: item.lensCoatings || [],
            prescriptionId: item.prescriptionId,
            frameColor: item.frameColor,
            frameSize: item.frameSize,
            unitPrice: item.unitPrice,
            finalPrice: item.unitPrice * (item.quantity || 1),
            quantity: item.quantity || 1,
            status: 'PENDING',
            isCustom: item.isCustom || false,
            customizations: item.customizations as Record<string, unknown>,
          })),
        },
        statusHistory: {
          create: {
            status: 'DRAFT',
            updatedBy: 'system', // TODO: Get from auth session
            notes: 'Order created',
          },
        },
      },
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

    return NextResponse.json(
      {
        success: true,
        order,
        message: 'Order created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}

/**
 * Generate a unique order number
 */
async function generateOrderNumber(): Promise<string> {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  
  // Get the count of orders for this month
  const startOfMonth = new Date(year, date.getMonth(), 1)
  const endOfMonth = new Date(year, date.getMonth() + 1, 0, 23, 59, 59)
  
  const count = await prisma.order.count({
    where: {
      orderDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  })
  
  const sequence = String(count + 1).padStart(4, '0')
  
  return `ORD-${year}${month}-${sequence}`
}
