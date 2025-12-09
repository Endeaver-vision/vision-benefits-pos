/**
 * Quotes API
 * POST /api/quotes - Save a new quote draft
 * GET /api/quotes?customerId=xxx - Get quotes for a customer
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface QuoteItemInput {
  sku: string
  displayName: string
  category: string
  retailPrice: number
  patientPays: number
  insurancePays: number
  quantity?: number
  tierUsed?: string
  notes?: string
}

interface CreateQuoteBody {
  customerId: string
  authorizationId?: string
  items: QuoteItemInput[]
  examItems?: QuoteItemInput[]
  secondPair?: {
    enabled: boolean
    frameName: string
    framePrice: number
    lensPrice: number
    coatingPrice: number
    discountType: string
    discountPercent: number
    subtotal: number
    discountAmount: number
    totalDue: number
  }
  contactLenses?: {
    enabled: boolean
    lensName: string
    manufacturer: string
    boxesRight: number
    boxesLeft: number
    pricePerBox: number
    subtotal: number
    meetsAnnualSupply: boolean
    annualSupplyDiscount: number
    insuranceCredit: number
    rebate: number
    totalDue: number
  }
  materialsBenefitUsed?: string // 'glasses' or 'contacts'
  retailTotal: number
  insuranceTotal: number
  patientTotal: number
  tax: number
  grandTotal: number
  notes?: string
  expiresAt?: string
}

/**
 * POST - Create a new quote draft
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateQuoteBody = await request.json()

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
      where: { id: body.customerId }
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Generate quote number: Q-YYYYMMDD-XXXX
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const quoteNumber = `Q-${dateStr}-${randomSuffix}`

    // Set expiration (default 30 days)
    const expiresAt = body.expiresAt
      ? new Date(body.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Create the quote
    const quote = await prisma.quote.create({
      data: {
        customerId: body.customerId,
        authorizationId: body.authorizationId,
        quoteNumber,
        status: 'DRAFT',
        retailTotal: body.retailTotal,
        insuranceTotal: body.insuranceTotal,
        patientTotal: body.patientTotal,
        tax: body.tax,
        grandTotal: body.grandTotal,
        items: body.items,
        examItems: body.examItems || null,
        secondPair: body.secondPair || null,
        contactLenses: body.contactLenses || null,
        materialsBenefitUsed: body.materialsBenefitUsed || null,
        notes: body.notes,
        expiresAt,
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        grandTotal: quote.grandTotal,
        expiresAt: quote.expiresAt,
        createdAt: quote.createdAt,
        customer: quote.customer
      }
    })

  } catch (error) {
    console.error('[Quotes API] Error creating quote:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create quote',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET - List quotes for a customer
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    const quotes = await prisma.quote.findMany({
      where: {
        customerId,
        // Don't include expired quotes by default
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
          { status: 'CONVERTED' } // Always show converted quotes
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        retailTotal: true,
        insuranceTotal: true,
        patientTotal: true,
        grandTotal: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      quotes
    })

  } catch (error) {
    console.error('[Quotes API] Error listing quotes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list quotes' },
      { status: 500 }
    )
  }
}
