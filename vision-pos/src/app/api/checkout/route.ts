/**
 * Checkout API
 * POST /api/checkout - Process checkout and create transaction
 *
 * This creates a real transaction in the database from a quote,
 * updates customer stats, and marks insurance authorization as used.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Default location and user for transactions (will be replaced with auth later)
const DEFAULT_LOCATION_ID = 'cmi990a9l00000b065hm0sb0a' // Main Office
const DEFAULT_USER_ID = 'cmi990avd00020b06kzou7gyq' // Admin user

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
  authorizationId?: string
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
 * POST - Process checkout and create transaction
 */
export async function POST(request: NextRequest) {
  try {
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

    const locationId = body.locationId || DEFAULT_LOCATION_ID
    const userId = body.userId || DEFAULT_USER_ID

    // Calculate tax (assuming 8% for now - should be configurable)
    const TAX_RATE = 0.08
    const taxableAmount = body.patientTotal // Only patient portion is taxed
    const tax = Math.round(taxableAmount * TAX_RATE * 100) / 100
    const totalWithTax = body.patientTotal + tax

    console.log('[Checkout] Creating transaction:', {
      customerId: body.customerId,
      items: body.items.length,
      subtotal: body.retailTotal,
      insuranceDiscount: body.insuranceTotal,
      patientPortion: body.patientTotal,
      tax,
      total: totalWithTax,
    })

    // Create transaction with items in a single transaction
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Create the transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          customerId: body.customerId,
          userId,
          locationId,
          subtotal: body.retailTotal,
          tax,
          discount: 0, // Any manual discounts would go here
          total: totalWithTax,
          insuranceCarrier: body.carrier || null,
          insuranceDiscount: body.insuranceTotal,
          patientPortion: body.patientTotal + tax,
          status: 'COMPLETED',
          paymentMethod: body.paymentMethod,
        },
      })

      // 2. Create transaction items
      // First, we need to look up or create products for each item
      const transactionItems = []

      for (const item of body.items) {
        // Try to find product by SKU
        let productId = item.productId

        if (!productId && item.sku) {
          // Look up in various tables
          const frame = await tx.frame.findFirst({
            where: { sku: item.sku },
            select: { id: true }
          })

          if (frame) {
            // Create or get a Product record for this frame
            const existingProduct = await tx.product.findFirst({
              where: { sku: item.sku }
            })

            if (existingProduct) {
              productId = existingProduct.id
            } else {
              // Get or create frames category
              let category = await tx.productCategory.findFirst({
                where: { code: 'frames' }
              })
              if (!category) {
                category = await tx.productCategory.create({
                  data: { name: 'Frames', code: 'frames' }
                })
              }

              const newProduct = await tx.product.create({
                data: {
                  name: item.displayName,
                  sku: item.sku,
                  categoryId: category.id,
                  basePrice: item.retailPrice,
                }
              })
              productId = newProduct.id
            }
          } else {
            // Check lens products
            const lens = await tx.lensProduct.findFirst({
              where: { sku: item.sku },
              select: { id: true }
            })

            if (lens) {
              const existingProduct = await tx.product.findFirst({
                where: { sku: item.sku }
              })

              if (existingProduct) {
                productId = existingProduct.id
              } else {
                let category = await tx.productCategory.findFirst({
                  where: { code: 'lenses' }
                })
                if (!category) {
                  category = await tx.productCategory.create({
                    data: { name: 'Lenses', code: 'lenses' }
                  })
                }

                const newProduct = await tx.product.create({
                  data: {
                    name: item.displayName,
                    sku: item.sku,
                    categoryId: category.id,
                    basePrice: item.retailPrice,
                  }
                })
                productId = newProduct.id
              }
            }
          }
        }

        // If we still don't have a product, create a generic one
        if (!productId) {
          let category = await tx.productCategory.findFirst({
            where: { code: 'addons' }
          })
          if (!category) {
            category = await tx.productCategory.create({
              data: { name: 'Add-ons', code: 'addons' }
            })
          }

          const newProduct = await tx.product.create({
            data: {
              name: item.displayName,
              sku: item.sku || `TEMP-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              categoryId: category.id,
              basePrice: item.retailPrice,
            }
          })
          productId = newProduct.id
        }

        const transactionItem = await tx.transactionItem.create({
          data: {
            transactionId: newTransaction.id,
            productId,
            quantity: item.quantity || 1,
            unitPrice: item.retailPrice,
            discount: item.insurancePays,
            total: item.patientCopay * (item.quantity || 1),
            insuranceTier: item.insuranceTier || null,
            insuranceDiscount: item.insurancePays,
          }
        })

        transactionItems.push(transactionItem)
      }

      // 3. Update customer stats
      const newTotalSpent = (customer.totalSpent || 0) + totalWithTax
      await tx.customer.update({
        where: { id: body.customerId },
        data: {
          totalSpent: newTotalSpent,
          lastPurchaseDate: new Date(),
          lastVisit: new Date(),
        }
      })

      // 4. Mark authorization as used (if applicable)
      if (body.authorizationId && body.carrier) {
        const carrier = body.carrier.toLowerCase()

        if (carrier === 'vsp') {
          await tx.vspAuthorization.update({
            where: { id: body.authorizationId },
            data: {
              usedForOrder: true,
              usedDate: new Date(),
            }
          })
        } else if (carrier === 'eyemed') {
          await tx.eyemedAuthorization.update({
            where: { id: body.authorizationId },
            data: {
              usedForOrder: true,
              usedDate: new Date(),
            }
          })
        } else if (carrier === 'spectera') {
          await tx.specteraAuthorization.update({
            where: { id: body.authorizationId },
            data: {
              usedForOrder: true,
              usedDate: new Date(),
            }
          })
        }
      }

      // 5. Create customer purchase history entry
      await tx.customerPurchaseHistory.create({
        data: {
          customerId: body.customerId,
          transactionId: newTransaction.id,
          orderDate: new Date(),
          totalAmount: totalWithTax,
          paymentMethod: body.paymentMethod,
          itemsJson: JSON.stringify(body.items.map(i => ({
            name: i.displayName,
            sku: i.sku,
            price: i.patientCopay,
            quantity: i.quantity || 1,
          }))),
        }
      })

      return {
        ...newTransaction,
        items: transactionItems,
      }
    })

    console.log('[Checkout] Transaction created:', transaction.id)

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        customerId: transaction.customerId,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        total: transaction.total,
        insuranceDiscount: transaction.insuranceDiscount,
        patientPortion: transaction.patientPortion,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        itemCount: transaction.items.length,
        createdAt: transaction.createdAt,
      },
      receipt: {
        customerName: `${customer.firstName} ${customer.lastName}`,
        transactionId: transaction.id,
        date: transaction.createdAt,
        items: body.items.map(i => ({
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
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                }
              }
            }
          }
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
      transactions: transactions.map(t => ({
        id: t.id,
        customerName: `${t.customer.firstName} ${t.customer.lastName}`,
        customerId: t.customerId,
        subtotal: t.subtotal,
        tax: t.tax,
        total: t.total,
        insuranceCarrier: t.insuranceCarrier,
        insuranceDiscount: t.insuranceDiscount,
        patientPortion: t.patientPortion,
        status: t.status,
        paymentMethod: t.paymentMethod,
        itemCount: t.items.length,
        items: t.items.map(i => ({
          name: i.product.name,
          sku: i.product.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
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
        totalRevenue: stats._sum.total || 0,
        totalInsuranceBilled: stats._sum.insuranceDiscount || 0,
        averageTransactionValue: stats._avg.total || 0,
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
