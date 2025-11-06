import { prisma } from './prisma'
import crypto from 'crypto'

// Define our own enums to avoid import issues
export enum SecondPairDiscountType {
  SAME_DAY_50 = 'SAME_DAY_50',
  THIRTY_DAY_30 = 'THIRTY_DAY_30', 
  MANAGER_OVERRIDE = 'MANAGER_OVERRIDE'
}

export interface SecondPairEligibility {
  isEligible: boolean
  discountType?: SecondPairDiscountType
  discountPercent?: number
  originalQuoteId?: string
  originalPurchaseDate?: Date
  daysAfterOriginal?: number
  reason?: string // Why not eligible
}

export interface SecondPairDiscount {
  discountType: SecondPairDiscountType
  discountPercent: number
  discountAmount: number
  originalTotal: number
  finalTotal: number
}

/**
 * Check if a customer is eligible for second pair discount
 * Rules:
 * - Same day purchase: 50% off
 * - Within 30 days: 30% off  
 * - Must be cash payment (no insurance)
 * - Only one second pair per original purchase
 */
export async function checkSecondPairEligibility(
  customerId: string, 
  locationId?: string
): Promise<SecondPairEligibility> {
  try {
    // Find the most recent completed quote for this customer
    const recentQuotes = await prisma.quotes.findMany({
      where: {
        customerId,
        status: 'COMPLETED',
        isSecondPair: false, // Only original purchases are eligible
        ...(locationId && { locationId }), // Filter by location if provided
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: 5 // Check last 5 purchases to handle edge cases
    })

    if (recentQuotes.length === 0) {
      return {
        isEligible: false,
        reason: 'No recent eyeglasses purchases found'
      }
    }

    // Check each recent quote for eligibility
    for (const quote of recentQuotes) {
      if (!quote.completedAt) continue

      const daysAfterOriginal = Math.floor(
        (Date.now() - quote.completedAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Check if already has a second pair for this quote
      const existingSecondPair = await prisma.second_pairs.findFirst({
        where: {
          originalQuoteId: quote.id
        }
      })

      if (existingSecondPair) {
        continue // This quote already has a second pair, check next
      }

      // Check eligibility window (30 days)
      if (daysAfterOriginal <= 30) {
        // Determine discount type based on timing
        const discountType: SecondPairDiscountType = daysAfterOriginal === 0 
          ? SecondPairDiscountType.SAME_DAY_50
          : SecondPairDiscountType.THIRTY_DAY_30
        
        const discountPercent = daysAfterOriginal === 0 ? 50 : 30

        return {
          isEligible: true,
          discountType,
          discountPercent,
          originalQuoteId: quote.id,
          originalPurchaseDate: quote.completedAt,
          daysAfterOriginal
        }
      }
    }

    return {
      isEligible: false,
      reason: 'No eligible purchases within 30 days'
    }

  } catch (error) {
    console.error('Error checking second pair eligibility:', error)
    return {
      isEligible: false,
      reason: 'Error checking eligibility'
    }
  }
}

/**
 * Calculate second pair discount for a quote
 * Applies discount to frame and lens prices only (no exam services)
 */
export function calculateSecondPairDiscount(
  originalTotal: number,
  discountType: SecondPairDiscountType,
  customDiscountPercent?: number
): SecondPairDiscount {
  let discountPercent: number

  switch (discountType) {
    case SecondPairDiscountType.SAME_DAY_50:
      discountPercent = 50
      break
    case SecondPairDiscountType.THIRTY_DAY_30:
      discountPercent = 30
      break
    case SecondPairDiscountType.MANAGER_OVERRIDE:
      discountPercent = customDiscountPercent || 0
      break
    default:
      discountPercent = 0
  }

  const discountAmount = (originalTotal * discountPercent) / 100
  const finalTotal = originalTotal - discountAmount

  return {
    discountType,
    discountPercent,
    discountAmount,
    originalTotal,
    finalTotal: Math.max(0, finalTotal) // Ensure never negative
  }
}

/**
 * Validate that a quote can have second pair discount applied
 */
export function validateSecondPairQuote(quoteData: Record<string, unknown>): { valid: boolean; reason?: string } {
  // Must have eyeglasses (frame + lenses)
  if (!quoteData.eyeglasses || !(quoteData.eyeglasses as Record<string, unknown>).frame) {
    return {
      valid: false,
      reason: 'Second pair discount only applies to eyeglasses purchases'
    }
  }

  // Must not already be a second pair
  if (quoteData.isSecondPair) {
    return {
      valid: false,
      reason: 'Quote is already marked as a second pair'
    }
  }

  // Must be cash payment (no insurance for second pairs)
  const insuranceInfo = quoteData.insuranceInfo as Record<string, unknown>
  if (insuranceInfo && insuranceInfo.carrier) {
    return {
      valid: false,
      reason: 'Second pair discount only available with cash payment'
    }
  }

  return { valid: true }
}

/**
 * Create a second pair record in the database
 */
export async function createSecondPairRecord(data: {
  originalQuoteId: string
  secondPairQuoteId: string
  customerId: string
  userId: string
  locationId: string
  discountType: SecondPairDiscountType
  discountPercent: number
  discountAmount: number
  originalTotal: number
  finalTotal: number
  originalPurchaseDate: Date
  managerOverride?: boolean
  overrideReason?: string
  overrideBy?: string
}) {
  const daysAfterOriginal = Math.floor(
    (Date.now() - data.originalPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return await prisma.second_pairs.create({
    data: {
      id: crypto.randomUUID(), // Generate a UUID for the ID
      originalQuoteId: data.originalQuoteId,
      secondPairQuoteId: data.secondPairQuoteId,
      customerId: data.customerId,
      userId: data.userId,
      locationId: data.locationId,
      discountType: data.discountType,
      discountPercent: data.discountPercent,
      discountAmount: data.discountAmount,
      originalTotal: data.originalTotal,
      finalTotal: data.finalTotal,
      originalPurchaseDate: data.originalPurchaseDate,
      secondPairPurchaseDate: new Date(),
      daysAfterOriginal,
      managerOverride: data.managerOverride || false,
      overrideReason: data.overrideReason,
      overrideBy: data.overrideBy,
      updatedAt: new Date(),
    }
  })
}

/**
 * Get second pair statistics for analytics
 */
export async function getSecondPairStats(
  locationId?: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: Record<string, unknown> = {}
  
  if (locationId) where.locationId = locationId
  if (startDate && endDate) {
    where.secondPairPurchaseDate = {
      gte: startDate,
      lte: endDate
    }
  }

  const [
    totalSecondPairs,
    sameDayPairs,
    thirtyDayPairs,
    managerOverrides,
    totalDiscountAmount
  ] = await Promise.all([
    prisma.second_pairs.count({ where }),
    prisma.second_pairs.count({ where: { ...where, discountType: 'SAME_DAY_50' } }),
    prisma.second_pairs.count({ where: { ...where, discountType: 'THIRTY_DAY_30' } }),
    prisma.second_pairs.count({ where: { ...where, discountType: 'MANAGER_OVERRIDE' } }),
    prisma.second_pairs.aggregate({
      where,
      _sum: { discountAmount: true }
    })
  ])

  return {
    totalSecondPairs,
    sameDayPairs,
    thirtyDayPairs,
    managerOverrides,
    totalDiscountAmount: totalDiscountAmount._sum.discountAmount || 0,
    conversionRate: 0 // TODO: Calculate based on first pair sales
  }
}