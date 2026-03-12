import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { precomputeCustomerPrices, getCustomerPriceListStats } from '@/lib/services/price-list-precompute'

/**
 * GET /api/customers/[id]/precompute-prices
 *
 * Get price list statistics for a customer.
 * Query params: statsOnly=true to just get stats without returning full list
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
    const priceList = await prisma.patientPriceList.findMany({
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
 * Uses the unified InsuranceAuthorization table.
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

    // Verify the authorization exists in the unified table
    const auth = await prisma.insuranceAuthorization.findUnique({
      where: { id: authorizationId },
    })

    if (!auth) {
      return NextResponse.json(
        { error: 'Authorization not found' },
        { status: 404 }
      )
    }

    // Verify it belongs to this customer
    if (auth.customerId !== customerId) {
      return NextResponse.json(
        { error: 'Authorization does not belong to this customer' },
        { status: 403 }
      )
    }

    // Build copays from authorization
    const copays = (auth.copays as Record<string, unknown>) || {}

    // Normalize carrier to lowercase for type guards
    const carrierLower = carrier.toLowerCase()

    // Build BenefitAuthorization object
    const benefitAuth = {
      carrier: carrierLower,
      plan: {
        carrier: carrierLower,
        planName: auth.planName || `${carrier} Plan`,
      },
      patient: { age: null },
      copays: {
        exam: Number(auth.examCopay) || 0,
        materials: Number(auth.materialsCopay) || 0,
        frameAllowance: Number(auth.frameAllowance) || 0,
        frameAllowanceFeatured: Number(auth.frameAllowance) || 0,
        frameAllowanceNonFeatured: Number(auth.frameAllowance) || 0,
        contactAllowance: Number(auth.contactAllowance) || 0,
        clExamCopay: Number(auth.clExamCopay) || 0,
        ...copays,
      },
    }

    // Run the pre-computation
    const result = await precomputeCustomerPrices(
      benefitAuth,
      {
        customerId,
        authorizationId,
        carrier: carrier.toUpperCase() as 'VSP' | 'EyeMed' | 'Spectera',
        planName: auth.planName || `${carrier} Plan`,
      }
    )

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
