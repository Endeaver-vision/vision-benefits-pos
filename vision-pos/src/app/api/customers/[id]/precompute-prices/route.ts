import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { precomputeCustomerPrices, getCustomerPriceListStats } from '@/lib/services/price-list-precompute'
import type { BenefitAuthorization } from '@/types/benefit-authorization'

/**
 * GET /api/customers/[id]/precompute-prices
 *
 * Get price list statistics for a customer.
 * Query params: statsOnly=true to just get stats without recomputing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params
    const { searchParams } = new URL(request.url)
    const statsOnly = searchParams.get('statsOnly') === 'true'

    if (statsOnly) {
      // Just return stats about existing price list
      const stats = await getCustomerPriceListStats(customerId)
      return NextResponse.json({
        success: true,
        stats,
      })
    }

    // Return full price list
    const priceList = await prisma.customerPriceList.findMany({
      where: { customerId, active: true },
      orderBy: { finalPrice: 'asc' },
      take: 100,
    })

    const stats = await getCustomerPriceListStats(customerId)

    return NextResponse.json({
      success: true,
      data: priceList,
      stats,
    })

  } catch (error) {
    console.error('[API] Error fetching price list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price list' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/customers/[id]/precompute-prices
 *
 * Trigger price list pre-computation for a customer's authorization.
 * This should be called after:
 * - New insurance auth is uploaded/created
 * - Authorization is updated
 * - Manual price refresh is requested
 *
 * Body: { authorizationId: string, carrier: 'VSP' | 'EyeMed' | 'Spectera' }
 * Returns: { success: boolean, stats: PrecomputeResult }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params
    const { authorizationId, carrier } = await request.json()

    if (!authorizationId || !carrier) {
      return NextResponse.json(
        { error: 'Missing authorizationId or carrier' },
        { status: 400 }
      )
    }

    console.log(`[API] Precomputing prices for customer ${customerId}, auth ${authorizationId}`)

    // Fetch the authorization based on carrier
    let authData: any
    let planName: string

    switch (carrier) {
      case 'VSP': {
        const vspAuth = await prisma.vspAuthorization.findUnique({
          where: { authorizationNumber: authorizationId },
          include: { lensEnhancementCopays: true },
        })
        if (!vspAuth) {
          return NextResponse.json(
            { error: 'VSP authorization not found' },
            { status: 404 }
          )
        }
        authData = mapVspAuthToBenefitAuth(vspAuth)
        planName = vspAuth.planName
        break
      }

      case 'EyeMed': {
        const eyemedAuth = await prisma.eyemedAuthorization.findUnique({
          where: { id: authorizationId },
          include: { arCoatingCopays: true },
        })
        if (!eyemedAuth) {
          return NextResponse.json(
            { error: 'EyeMed authorization not found' },
            { status: 404 }
          )
        }
        authData = mapEyemedAuthToBenefitAuth(eyemedAuth)
        planName = eyemedAuth.groupName || 'EyeMed Plan'
        break
      }

      case 'Spectera': {
        const specteraAuth = await prisma.specteraAuthorization.findUnique({
          where: { id: authorizationId },
          include: { arCoatingCopays: true },
        })
        if (!specteraAuth) {
          return NextResponse.json(
            { error: 'Spectera authorization not found' },
            { status: 404 }
          )
        }
        authData = mapSpecteraAuthToBenefitAuth(specteraAuth)
        planName = specteraAuth.productName || 'Spectera Plan'
        break
      }

      default:
        return NextResponse.json(
          { error: `Unsupported carrier: ${carrier}` },
          { status: 400 }
        )
    }

    // Run the pre-computation
    const result = await precomputeCustomerPrices(authData, {
      customerId,
      authorizationId,
      carrier,
      planName,
    })

    return NextResponse.json({
      success: result.success,
      stats: result,
    })

  } catch (error) {
    console.error('[API] Error precomputing prices:', error)
    return NextResponse.json(
      {
        error: 'Failed to precompute prices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Helper functions to map Prisma auth models to BenefitAuthorization type
 * These need to match the structure expected by pricing-calculator.ts
 */

function mapVspAuthToBenefitAuth(auth: any): BenefitAuthorization {
  return {
    carrier: 'vsp',
    plan: {
      carrier: 'vsp',
      planName: auth.planName,
      planType: auth.planType,
    },
    patient: {
      age: null, // VSP doesn't typically have age in auth
    },
    copays: {
      examWellvision: auth.examCopay || 0,
      materials: auth.materialsCopay || 0,
      frameAllowanceFeatured: auth.frameAllowanceMarchon || auth.frameAllowanceRetail || 0,
      frameAllowanceNonFeatured: auth.frameAllowanceRetail || 0,
      frameOverageDiscount: auth.frameOverageDiscount || 0,
    },
    planTier: {
      progressiveCopays: {},
      arCopays: {},
      materialCopays: {
        polycarbonate: 0, // These come from lensEnhancementCopays
        trivex: 0,
        highIndex167: 0,
      },
      enhancementCopays: {
        photochromic: 0,
        polarized: 0,
        blueLightFilter: 0,
        tint: 0,
      },
    },
    specialRules: {
      pricingRules: {},
    },
  } as BenefitAuthorization
}

function mapEyemedAuthToBenefitAuth(auth: any): BenefitAuthorization {
  return {
    carrier: 'eyemed',
    plan: {
      carrier: 'eyemed',
      planName: auth.groupName || 'EyeMed',
      groupNumber: auth.groupNumber,
      benefitLevel: auth.benefitLevel,
      network: auth.network,
    },
    patient: {
      age: null,
    },
    copays: {
      exam: auth.examCopay || 0,
      materials: auth.materialsCopay || 0,
      lensSv: auth.singleVisionCopay || 0,
      progressiveStandard: auth.progressiveStandardCopay || 0,
      progressivePremiumTier1: auth.progressiveTier1Copay || 0,
      progressivePremiumTier2: auth.progressiveTier2Copay || 0,
      progressivePremiumTier3: auth.progressiveTier3Copay || 0,
      progressivePremiumTier4: auth.progressiveTier4Copay || 0,
      progressivePremiumTier5: auth.progressiveTier5Copay || 0,
      frameAllowance: auth.frameAllowanceRetail || 0,
      frameOverageDiscount: auth.frameOverageDiscount || 0,
      arStandard: 0, // These come from arCoatingCopays
      arPremiumTier1: 0,
      arPremiumTier2: 0,
      arPremiumTier3: 0,
      materialPolycarbonate: auth.polycarbonateCopay || 0,
      materialPolycarbonateChild: 0,
      materialTrivex: 0,
      materialHighIndex167: 0,
      materialHighIndex174: 0,
      materialHighIndex: 0,
      photochromic: auth.photochromicCopay || 0,
      polarized: auth.polarizedCopay || 0,
      blueLightFilter: 0,
      tint: 0,
    },
    specialRules: {
      polycarbonateFreeCbildAgeMax: 18,
    },
  } as BenefitAuthorization
}

function mapSpecteraAuthToBenefitAuth(auth: any): BenefitAuthorization {
  return {
    carrier: 'spectera',
    plan: {
      carrier: 'spectera',
      planName: auth.productName || 'Spectera',
    },
    patient: {
      age: null,
    },
    copays: {
      examAdult: auth.examCopay || 0,
      examPediatric: auth.pediatricExamCopay || auth.examCopay || 0,
      materials: auth.materialsCopay || 0,
      lensStandard: auth.singleVisionCopay || 0,
      progressiveTierI: auth.progressiveTier1Copay || 0,
      progressiveTierII: auth.progressiveTier2Copay || 0,
      progressiveTierIII: auth.progressiveTier3Copay || 0,
      progressiveTierIV: auth.progressiveTier4Copay || 0,
      progressiveTierV: auth.progressiveTier5Copay || 0,
      frameAllowance: auth.frameAllowance || 0,
      frameOveragePercent: auth.frameOveragePercent || 0.70,
      arTierI: 0, // These come from arCoatingCopays
      arTierII: 0,
      arTierIII: 0,
      arTierIV: 0,
      materialPolycarbonateAdult: auth.polycarbonateCopay || 0,
      materialPolycarbonateChild: 0,
      materialTrivex: 0,
      materialHighIndex160166: 0,
      photochromic: auth.photochromicCopay || 0,
      polarized: auth.polarizedCopay || 0,
      tint: 0,
    },
    specialRules: {
      polycarbonateFreeCbildAgeMax: 18,
    },
  } as BenefitAuthorization
}
