/**
 * Checkout API
 * POST /api/checkout - Process checkout and create order + transaction
 *
 * Flow: Quote → Order → Transaction
 * - Creates an Order record for fulfillment tracking
 * - Creates a Transaction record for payment tracking
 * - Updates customer stats and marks insurance authorization as used
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { OrderStatus, ProductType, PaymentMethod, TransactionStatus } from '@prisma/client'

interface CheckoutItem {
  sku: string
  productId?: string
  displayName: string
  category: string
  retailPrice: number
  patientCopay: number
  insurancePays: number
  quantity: number
  insuranceTier?: string
}

interface CheckoutRequest {
  customerId: string
  quoteId?: string
  authorizationId?: string
  priceListVersionId?: string
  carrier?: string
  items: CheckoutItem[]

  // Calculated totals from quote
  retailTotal: number
  patientTotal: number
  insuranceTotal: number

  // Optional copays
  examCopay?: number
  materialsCopay?: number

  // Payment info
  paymentMethod: 'cash' | 'card' | 'check' | 'insurance_only' | 'split'
  paymentDetails?: {
    cardLast4?: string
    checkNumber?: string
    splitPayments?: Array<{
      method: string
      amount: number
    }>
  }

  // Optional metadata
  notes?: string
  locationId?: string
  userId?: string
}

/**
 * Generate order number: ORD-YYYYMMDD-XXXX
 */
function generateOrderNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ORD-${dateStr}-${random}`
}

/**
 * Generate transaction number: TXN-YYYYMMDD-XXXX
 */
function generateTransactionNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TXN-${dateStr}-${random}`
}

/**
 * Map category string to ProductType enum
 */
function mapCategoryToProductType(category: string): ProductType {
  const categoryLower = category.toLowerCase()
  if (categoryLower.includes('frame')) return ProductType.FRAME
  if (categoryLower.includes('lens') && !categoryLower.includes('contact')) return ProductType.LENS
  if (categoryLower.includes('contact')) return ProductType.CONTACT
  if (categoryLower.includes('coating') || categoryLower.includes('ar') || categoryLower.includes('transition')) return ProductType.LENS
  if (categoryLower.includes('service') || categoryLower.includes('exam') || categoryLower.includes('fit')) return ProductType.SERVICE
  return ProductType.LENS // Default
}

/**
 * POST - Process checkout: Create Order, then Transaction
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CheckoutRequest = await request.json()

    // Validate required fields
    if (!body.customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
      select: { id: true, firstName: true, lastName: true, totalSpent: true }
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Use location from request body (selected location), fall back to session location
    const locationId = body.locationId || (session.user as { locationId?: string })?.locationId
    const employeeId = (session.user as { employeeId?: string })?.employeeId

    // Calculate tax (assuming 8% for now - should be configurable)
    const TAX_RATE = 0.08
    const taxableAmount = body.patientTotal // Only patient portion is taxed
    const tax = Math.round(taxableAmount * TAX_RATE * 100) / 100
    const totalWithTax = body.patientTotal + tax

    console.log('[Checkout] Creating order and transaction:', {
      customerId: body.customerId,
      items: body.items.length,
      subtotal: body.retailTotal,
      insuranceDiscount: body.insuranceTotal,
      patientPortion: body.patientTotal,
      tax,
      total: totalWithTax,
    })

    // Create order and transaction in a single database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Order record
      const orderNumber = generateOrderNumber()
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: body.customerId,
          quoteId: body.quoteId || null,
          locationId: locationId || null,
          employeeId: employeeId || null,
          status: OrderStatus.CONFIRMED, // Order is confirmed at checkout
          orderDate: new Date(),
          subtotal: body.retailTotal,
          tax,
          discount: 0,
          insuranceDiscount: body.insuranceTotal,
          total: totalWithTax,
          patientPortion: body.patientTotal + tax,
          insuranceCarrier: body.carrier || null,
          insuranceAuthorizationId: body.authorizationId || null,
          priceListVersionId: body.priceListVersionId || null,
          notes: body.notes || null,
        },
      })

      // 2. Create OrderItems
      const orderItems = []
      for (const item of body.items) {
        const productType = mapCategoryToProductType(item.category)

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productType,
            productId: item.productId || null,
            sku: item.sku || null,
            displayName: item.displayName,
            quantity: item.quantity || 1,
            retailPrice: item.retailPrice,
            insurancePays: item.insurancePays,
            patientCopay: item.patientCopay,
            insuranceTier: item.insuranceTier || null,
          },
        })
        orderItems.push(orderItem)
      }

      // 3. Create initial status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.CONFIRMED,
          changedBy: employeeId || null,
          notes: 'Order created from checkout',
        },
      })

      // 4. Create the Transaction record (payment)
      const transactionNumber = generateTransactionNumber()
      const transaction = await tx.transaction.create({
        data: {
          transactionNumber,
          orderId: order.id,
          customerId: body.customerId,
          locationId: locationId || null,
          employeeId: employeeId || null,
          paymentMethod: body.paymentMethod as PaymentMethod,
          subtotal: body.retailTotal,
          tax,
          discount: 0,
          total: totalWithTax,
          insuranceDiscount: body.insuranceTotal,
          patientPortion: body.patientTotal + tax,
          cardLastFour: body.paymentDetails?.cardLast4 || null,
          checkNumber: body.paymentDetails?.checkNumber || null,
          splitDetails: body.paymentDetails?.splitPayments ? JSON.parse(JSON.stringify(body.paymentDetails.splitPayments)) : null,
          status: TransactionStatus.COMPLETED,
        },
      })

      // 5. Create TransactionItems linked to OrderItems
      const transactionItems = []
      for (const orderItem of orderItems) {
        const transactionItem = await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            orderItemId: orderItem.id,
            productId: orderItem.productId,
            quantity: orderItem.quantity,
            unitPrice: Number(orderItem.retailPrice),
            discount: Number(orderItem.insurancePays),
            total: Number(orderItem.patientCopay) * orderItem.quantity,
          },
        })
        transactionItems.push(transactionItem)
      }

      // 6. Update customer stats
      const newTotalSpent = (customer.totalSpent || 0) + totalWithTax
      await tx.customer.update({
        where: { id: body.customerId },
        data: {
          totalSpent: newTotalSpent,
          lastPurchaseDate: new Date(),
          lastVisit: new Date(),
        },
      })

      // 7. Mark authorization as used (if applicable)
      if (body.authorizationId) {
        await tx.insuranceAuthorization.update({
          where: { id: body.authorizationId },
          data: {
            usedForOrder: true,
            usedDate: new Date(),
          },
        })
      }

      // 8. Update quote status to CONVERTED (if applicable)
      if (body.quoteId) {
        await tx.quote.update({
          where: { id: body.quoteId },
          data: {
            status: 'CONVERTED',
          },
        })
      }

      return {
        order,
        orderItems,
        transaction,
        transactionItems,
      }
    })

    console.log('[Checkout] Order created:', result.order.id)
    console.log('[Checkout] Transaction created:', result.transaction.id)

    return NextResponse.json({
      success: true,
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
        itemCount: result.orderItems.length,
        createdAt: result.order.createdAt,
      },
      transaction: {
        id: result.transaction.id,
        transactionNumber: result.transaction.transactionNumber,
        customerId: result.transaction.customerId,
        subtotal: Number(result.transaction.subtotal),
        tax: Number(result.transaction.tax),
        total: Number(result.transaction.total),
        insuranceDiscount: Number(result.transaction.insuranceDiscount),
        patientPortion: Number(result.transaction.patientPortion),
        status: result.transaction.status,
        paymentMethod: result.transaction.paymentMethod,
        itemCount: result.transactionItems.length,
        createdAt: result.transaction.createdAt,
      },
      receipt: {
        customerName: `${customer.firstName} ${customer.lastName}`,
        orderNumber: result.order.orderNumber,
        transactionId: result.transaction.id,
        date: result.transaction.createdAt,
        items: body.items.map((i) => ({
          name: i.displayName,
          retailPrice: i.retailPrice,
          insuranceDiscount: i.insurancePays,
          patientPays: i.patientCopay,
          quantity: i.quantity || 1,
        })),
        subtotal: body.retailTotal,
        insuranceDiscount: body.insuranceTotal,
        tax,
        total: totalWithTax,
        paymentMethod: body.paymentMethod,
        carrier: body.carrier || 'Self-Pay',
      },
      message: 'Checkout completed successfully',
    })
  } catch (error) {
    console.error('[Checkout] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process checkout',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Get recent transactions for dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')

    const where = customerId ? { customerId } : {}

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
          items: {
            include: {
              orderItem: {
                select: {
                  displayName: true,
                  sku: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    // Calculate summary stats
    const stats = await prisma.transaction.aggregate({
      where,
      _sum: {
        total: true,
        insuranceDiscount: true,
      },
      _avg: {
        total: true,
      },
      _count: true,
    })

    return NextResponse.json({
      success: true,
      transactions: transactions.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        customerName: `${t.customer.firstName} ${t.customer.lastName}`,
        customerId: t.customerId,
        orderId: t.orderId,
        orderNumber: t.order?.orderNumber,
        orderStatus: t.order?.status,
        subtotal: Number(t.subtotal),
        tax: Number(t.tax),
        total: Number(t.total),
        insuranceDiscount: Number(t.insuranceDiscount),
        patientPortion: Number(t.patientPortion),
        status: t.status,
        paymentMethod: t.paymentMethod,
        itemCount: t.items.length,
        items: t.items.map((i) => ({
          name: i.orderItem?.displayName || 'Unknown',
          sku: i.orderItem?.sku,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          total: Number(i.total),
        })),
        createdAt: t.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalRevenue: Number(stats._sum.total) || 0,
        totalInsuranceBilled: Number(stats._sum.insuranceDiscount) || 0,
        averageTransactionValue: Number(stats._avg.total) || 0,
        transactionCount: stats._count,
      },
    })
  } catch (error) {
    console.error('[Checkout GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
