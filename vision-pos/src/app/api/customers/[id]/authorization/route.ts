/**
 * Customer Authorization API
 * GET /api/customers/[id]/authorization - Get customer's active insurance authorization
 * PATCH /api/customers/[id]/authorization - Update authorization values
 *
 * Returns the normalized authorization data for the customer's active plan.
 * Uses the unified insurance_authorizations table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Type for the copays JSON structure
interface CopaysJson {
  examCopay?: number
  materialsCopay?: number
  singleVision?: number
  bifocal?: number
  trifocal?: number
  progressiveStandard?: number
  progressiveTier1?: number
  progressiveTier2?: number
  progressiveTier3?: number
  progressiveTier4?: number
  progressiveTier5?: number
  arStandard?: number
  arTier1?: number
  arTier2?: number
  arTier3?: number
  polycarbonate?: number
  polycarbonateChild?: number
  trivex?: number
  highIndex167?: number
  highIndex174?: number
  photochromic?: number
  polarized?: number
  blueLight?: number
  tint?: number
  uvTreatment?: number
  scratchCoating?: number
  [key: string]: number | undefined
}

/**
 * GET - Fetch customer's active authorization
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const customerId = params.id

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    // Fetch the active authorization from unified table
    const auth = await prisma.insuranceAuthorization.findFirst({
      where: {
        customerId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!auth) {
      return NextResponse.json({
        success: true,
        authorization: null,
        message: 'No active authorization found for this customer',
      })
    }

    const copays = (auth.copays as CopaysJson) || {}
    const carrier = auth.carrier.toUpperCase()

    // Build a comprehensive response with all pricing data needed for POS
    const authorization = {
      id: auth.id,
      carrier: auth.carrier,
      planName: auth.planName,
      planNetwork: null,

      // Patient info
      patientName: auth.memberName,
      patientAge: null,
      memberId: auth.memberId,
      groupNumber: null,

      // Exam copay
      examCopay: auth.examCopay ? Number(auth.examCopay) : (copays.examCopay ?? null),

      // Materials copay
      materialsCopay: auth.materialsCopay ? Number(auth.materialsCopay) : (copays.materialsCopay ?? null),

      // Frame allowance
      frameAllowance: auth.frameAllowance ? Number(auth.frameAllowance) : null,
      frameAllowanceFeatured: auth.frameAllowance ? Number(auth.frameAllowance) : null,
      // Frame overage discount - use extracted value or default to 20%
      frameOverageDiscount: copays.frameOveragePercent
        ? Number(copays.frameOveragePercent) / 100
        : 0.20,
      frameOveragePercent: copays.frameOveragePercent ? Number(copays.frameOveragePercent) : 20,

      // Contact lens benefits
      contactAllowance: auth.contactAllowance ? Number(auth.contactAllowance) : null,
      isContactDecliningBalance: auth.isContactDecliningBalance ?? false,
      contactFittingCovered: copays.clFitStandard !== null && copays.clFitStandard !== undefined,
      contactExamCopay: null,
      contactFittingCopay: copays.clFitStandard ?? copays.clFitPremium ?? null,

      // Plan rules
      glassesContactsExclusive: carrier === 'VSP',

      // Validity
      effectiveDate: auth.createdAt,
      expirationDate: auth.expirationDate,
      isActive: auth.isActive,

      // ===== PRICING TIERS FOR POS =====
      // These are the copays associates need to see when selecting products

      // Lens copays (SV, Bifocal, Trifocal)
      lensCopays: {
        singleVision: copays.singleVision ?? auth.materialsCopay ?? null,
        bifocal: copays.bifocal ?? auth.materialsCopay ?? null,
        trifocal: copays.trifocal ?? auth.materialsCopay ?? null,
      },

      // Progressive lens tier copays
      progressiveTiers: buildProgressiveTiers(carrier, copays),

      // AR coating tier copays
      arCoatingTiers: buildArCoatingTiers(carrier, copays),

      // Material copays (poly, hi-index, trivex)
      materialCopays: {
        polycarbonate: copays.polycarbonate ?? null,
        polycarbonateChild: copays.polycarbonateChild ?? 'covered',
        highIndex160: null,
        highIndex167: copays.highIndex167 ?? null,
        highIndex174: copays.highIndex174 ?? null,
        trivex: copays.trivex ?? null,
      },

      // Enhancement copays (photochromic, polarized, blue light, tint)
      enhancementCopays: {
        photochromic: copays.photochromic ?? null,
        polarized: copays.polarized ?? null,
        blueLight: copays.blueLight ?? null,
        tint: copays.tint ?? null,
        uvCoating: copays.uvTreatment ?? 'covered',
        scratchCoating: copays.scratchCoating ?? 'covered',
      },

      // Special rules
      specialRules: {
        polycarbonateChildFreeAge: 18,
        childAge: null,
        isChild: false,
        secondPairDiscount: null,
      },

      // ===== DECLINING BALANCE / FLEX PLAN SUPPORT =====
      benefitStructure: 'COPAY_ALLOWANCE' as const,
      totalMaterialsCredit: null,
      creditAppliesToFrames: true,
      creditAppliesToLenses: true,
      creditAppliesToContacts: false,
      creditAppliesToCoatings: true,
      overageDiscountPercent: null,
    }

    return NextResponse.json({
      success: true,
      authorization,
    })

  } catch (error) {
    console.error('[Authorization API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch authorization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function buildProgressiveTiers(carrier: string, copays: CopaysJson): Record<string, number | null> {
  switch (carrier) {
    case 'EYEMED':
      return {
        standard: copays.progressiveStandard ?? null,
        tier_1: copays.progressiveTier1 ?? null,
        tier_2: copays.progressiveTier2 ?? null,
        tier_3: copays.progressiveTier3 ?? null,
        tier_4: copays.progressiveTier4 ?? null,
        tier_5: copays.progressiveTier5 ?? null,
      }
    case 'VSP':
      // VSP uses letter codes - return them if present in copays
      return {
        NA: copays['NA'] ?? null,
        OA: copays['OA'] ?? null,
        FA: copays['FA'] ?? null,
        JA: copays['JA'] ?? null,
        KA: copays['KA'] ?? null,
      }
    case 'SPECTERA':
      return {
        I: copays['progressiveTierI'] ?? null,
        II: copays['progressiveTierII'] ?? null,
        III: copays['progressiveTierIII'] ?? null,
        IV: copays['progressiveTierIV'] ?? null,
        V: copays['progressiveTierV'] ?? null,
      }
    default:
      return {}
  }
}

function buildArCoatingTiers(carrier: string, copays: CopaysJson): Record<string, number | null> {
  switch (carrier) {
    case 'EYEMED':
      return {
        standard: copays.arStandard ?? null,
        tier_1: copays.arTier1 ?? null,
        tier_2: copays.arTier2 ?? null,
        tier_3: copays.arTier3 ?? null,
      }
    case 'VSP':
      return {
        QM: copays['QM'] ?? null,
        QT: copays['QT'] ?? null,
        QV: copays['QV'] ?? null,
      }
    case 'SPECTERA':
      return {
        I: copays['arTierI'] ?? null,
        II: copays['arTierII'] ?? null,
        III: copays['arTierIII'] ?? null,
        IV: copays['arTierIV'] ?? null,
      }
    default:
      return {}
  }
}

// =============================================================================
// PATCH - Update authorization values
// =============================================================================

interface AuthorizationUpdateRequest {
  authorizationId: string
  updates: {
    examCopay?: number | null
    materialsCopay?: number | null
    frameAllowance?: number | null
    contactAllowance?: number | null
    expirationDate?: string | null
    isActive?: boolean
    copays?: CopaysJson
  }
}

/**
 * PATCH - Update authorization values
 * Allows staff to correct or adjust insurance benefit values
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const customerId = params.id
    const body: AuthorizationUpdateRequest = await request.json()

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    const { authorizationId, updates } = body

    if (!authorizationId) {
      return NextResponse.json(
        { success: false, error: 'Authorization ID is required' },
        { status: 400 }
      )
    }

    // Build the update data
    const updateData: Record<string, unknown> = {}

    if (updates.examCopay !== undefined) updateData.examCopay = updates.examCopay
    if (updates.materialsCopay !== undefined) updateData.materialsCopay = updates.materialsCopay
    if (updates.frameAllowance !== undefined) updateData.frameAllowance = updates.frameAllowance
    if (updates.contactAllowance !== undefined) updateData.contactAllowance = updates.contactAllowance
    if (updates.expirationDate !== undefined) {
      updateData.expirationDate = updates.expirationDate ? new Date(updates.expirationDate) : null
    }
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive
    if (updates.copays !== undefined) updateData.copays = updates.copays

    // Update the unified authorization table
    const updatedAuth = await prisma.insuranceAuthorization.update({
      where: { id: authorizationId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: 'Authorization updated successfully',
      authorization: updatedAuth,
      updatedFields: Object.keys(updates),
    })

  } catch (error) {
    console.error('[Authorization API] Update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update authorization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
