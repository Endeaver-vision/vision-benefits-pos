import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  checkSecondPairEligibility, 
  calculateSecondPairDiscount, 
  validateSecondPairQuote,
  createSecondPairRecord,
  SecondPairDiscountType
} from '@/lib/second-pair'

export interface ApplySecondPairRequest {
  quoteId: string
  customerId: string
  locationId: string
  userId: string
  managerOverride?: {
    discountPercent: number
    reason: string
    overrideBy: string
  }
}

export interface ApplySecondPairResponse {
  success: boolean
  message: string
  eligibility?: {
    isEligible: boolean
    discountType?: SecondPairDiscountType
    discountPercent?: number
    originalQuoteId?: string
    originalPurchaseDate?: Date
    daysAfterOriginal?: number
    reason?: string
  }
  updatedQuote?: {
    id: string
    originalTotal: number
    discountAmount: number
    finalTotal: number
    discountPercent: number
  }
  secondPairRecord?: {
    id: string
    discountType: string
    discountAmount: number
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApplySecondPairResponse>> {
  try {
    const body: ApplySecondPairRequest = await request.json()
    const { quoteId, customerId, locationId, userId, managerOverride } = body

    // Validate required fields
    if (!quoteId || !customerId || !locationId || !userId) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: quoteId, customerId, locationId, userId'
      }, { status: 400 })
    }

    // Get the quote to apply discount to
    const quote = await prisma.quotes.findUnique({
      where: { id: quoteId }
    })

    if (!quote) {
      return NextResponse.json({
        success: false,
        message: 'Quote not found'
      }, { status: 404 })
    }

    // Validate quote data for second pair eligibility
    const validation = validateSecondPairQuote(quote.patientInfo as Record<string, unknown>)
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        message: validation.reason || 'Quote not valid for second pair discount'
      }, { status: 400 })
    }

    let eligibility
    let discountType: SecondPairDiscountType
    let discountPercent: number
    let originalQuoteId: string
    let originalPurchaseDate: Date

    if (managerOverride) {
      // Manager override case
      if (managerOverride.discountPercent < 0 || managerOverride.discountPercent > 100) {
        return NextResponse.json({
          success: false,
          message: 'Manager override discount must be between 0 and 100 percent'
        }, { status: 400 })
      }

      if (!managerOverride.reason || managerOverride.reason.trim().length < 10) {
        return NextResponse.json({
          success: false,
          message: 'Manager override requires a detailed reason (minimum 10 characters)'
        }, { status: 400 })
      }

      discountType = SecondPairDiscountType.MANAGER_OVERRIDE
      discountPercent = managerOverride.discountPercent
      originalQuoteId = quoteId // For override, current quote is the "original"
      originalPurchaseDate = new Date()

      eligibility = {
        isEligible: true,
        discountType,
        discountPercent,
        originalQuoteId,
        originalPurchaseDate,
        daysAfterOriginal: 0,
        reason: 'Manager override applied'
      }
    } else {
      // Normal eligibility check
      eligibility = await checkSecondPairEligibility(customerId, locationId)
      
      if (!eligibility.isEligible) {
        return NextResponse.json({
          success: false,
          message: eligibility.reason || 'Customer not eligible for second pair discount',
          eligibility
        }, { status: 400 })
      }

      discountType = eligibility.discountType!
      discountPercent = eligibility.discountPercent!
      originalQuoteId = eligibility.originalQuoteId!
      originalPurchaseDate = eligibility.originalPurchaseDate!
    }

    // Calculate the discount
    const originalTotal = quote.total
    const discount = calculateSecondPairDiscount(originalTotal, discountType, discountPercent)

    // Update the quote with second pair information
    const updatedQuote = await prisma.quotes.update({
      where: { id: quoteId },
      data: {
        isSecondPair: true,
        total: discount.finalTotal,
        patientInfo: {
          ...(quote.patientInfo as Record<string, unknown>),
          secondPair: {
            isSecondPair: true,
            discountType: discountType,
            discountPercent: discount.discountPercent,
            discountAmount: discount.discountAmount,
            originalTotal: discount.originalTotal,
            finalTotal: discount.finalTotal,
            originalQuoteId: originalQuoteId,
            appliedAt: new Date().toISOString(),
            appliedBy: userId
          }
        }
      }
    })

    // Create the second pair record for tracking
    const secondPairRecord = await createSecondPairRecord({
      originalQuoteId: originalQuoteId,
      secondPairQuoteId: quoteId,
      customerId: customerId,
      userId: userId,
      locationId: locationId,
      discountType: discountType,
      discountPercent: discount.discountPercent,
      discountAmount: discount.discountAmount,
      originalTotal: discount.originalTotal,
      finalTotal: discount.finalTotal,
      originalPurchaseDate: originalPurchaseDate,
      managerOverride: !!managerOverride,
      overrideReason: managerOverride?.reason,
      overrideBy: managerOverride?.overrideBy
    })

    return NextResponse.json({
      success: true,
      message: `Second pair discount applied successfully (${discount.discountPercent}% off)`,
      eligibility,
      updatedQuote: {
        id: updatedQuote.id,
        originalTotal: discount.originalTotal,
        discountAmount: discount.discountAmount,
        finalTotal: discount.finalTotal,
        discountPercent: discount.discountPercent
      },
      secondPairRecord: {
        id: secondPairRecord.id,
        discountType: secondPairRecord.discountType,
        discountAmount: secondPairRecord.discountAmount
      }
    })

  } catch (error) {
    console.error('Error applying second pair discount:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error applying second pair discount'
    }, { status: 500 })
  }
}

// GET endpoint to check eligibility without applying
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const locationId = searchParams.get('locationId')

    if (!customerId) {
      return NextResponse.json({
        success: false,
        message: 'Missing required parameter: customerId'
      }, { status: 400 })
    }

    const eligibility = await checkSecondPairEligibility(customerId, locationId || undefined)

    return NextResponse.json({
      success: true,
      eligibility
    })

  } catch (error) {
    console.error('Error checking second pair eligibility:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error checking eligibility'
    }, { status: 500 })
  }
}