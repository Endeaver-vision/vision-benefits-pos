/**
 * Customer Authorization API
 * GET /api/customers/[id]/authorization - Get customer's active insurance authorization
 *
 * Returns the normalized authorization data for the customer's active plan.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'

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

    // Fetch the active authorization
    const authResult = await getActiveAuthorizationForCustomer(customerId)

    if (!authResult) {
      return NextResponse.json({
        success: true,
        authorization: null,
        message: 'No active authorization found for this customer',
      })
    }

    const auth = authResult.authorization

    // Build a summary response
    const authorization = {
      id: authResult.authorizationId,
      carrier: authResult.carrier,
      planName: auth.plan.planName,
      planNetwork: auth.plan.network,

      // Patient info
      patientName: auth.patient.name,
      memberId: auth.patient.memberId,
      groupNumber: auth.patient.groupNumber,

      // Exam copay
      examCopay: getExamCopay(authResult),

      // Materials copay
      materialsCopay: getMaterialsCopay(authResult),

      // Frame allowance
      frameAllowance: getFrameAllowance(authResult),
      frameAllowanceFeatured: getFrameAllowanceFeatured(authResult),
      frameOverageDiscount: getFrameOverageDiscount(authResult),

      // Contact lens benefits
      contactAllowance: getContactAllowance(authResult),
      contactFittingCovered: getContactFittingCovered(authResult),
      contactExamCopay: getContactExamCopay(authResult),
      contactFittingCopay: getContactFittingCopay(authResult),

      // Plan rules
      glassesContactsExclusive: getGlassesContactsExclusive(authResult),

      // Validity
      effectiveDate: auth.plan.effectiveDate,
      expirationDate: auth.plan.expirationDate,
      isActive: true,
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

// Helper functions to extract values from different carrier authorization types

function getExamCopay(authResult: NonNullable<Awaited<ReturnType<typeof getActiveAuthorizationForCustomer>>>): number | null {
  const { carrier, authorization } = authResult

  switch (carrier) {
    case 'vsp':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).examWellvision ?? null
    case 'eyemed':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).exam ?? null
    case 'spectera':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).examAdult ?? null
    default:
      return null
  }
}

function getMaterialsCopay(authResult: NonNullable<Awaited<ReturnType<typeof getActiveAuthorizationForCustomer>>>): number | null {
  const { authorization } = authResult
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (authorization.copays as any).materials ?? null
}

function getFrameAllowance(authResult: NonNullable<Awaited<ReturnType<typeof getActiveAuthorizationForCustomer>>>): number | null {
  const { carrier, authorization } = authResult

  switch (carrier) {
    case 'vsp':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).frameAllowanceNonFeatured ?? null
    case 'eyemed':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).frameAllowance ?? null
    case 'spectera':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).frameAllowance ?? null
    default:
      return null
  }
}

function getFrameAllowanceFeatured(authResult: NonNullable<Awaited<ReturnType<typeof getActiveAuthorizationForCustomer>>>): number | null {
  const { carrier, authorization } = authResult

  switch (carrier) {
    case 'vsp':
      // VSP featured brands (Marchon, Altair) get higher allowance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).frameAllowanceFeatured ?? null
    case 'eyemed':
      // EyeMed doesn't have featured brand differentiation
      return null
    case 'spectera':
      // Spectera doesn't have featured brand differentiation
      return null
    default:
      return null
  }
}

function getFrameOverageDiscount(authResult: NonNullable<Awaited<ReturnType<typeof getActiveAuthorizationForCustomer>>>): number | null {
  const { carrier, authorization } = authResult

  switch (carrier) {
    case 'vsp':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).frameOverageDiscount ?? null
    case 'eyemed':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).frameOverageDiscount ?? null
    case 'spectera':
      // Spectera uses percent patient pays, so invert it
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const percent = (authorization.copays as any).frameOveragePercent
      return percent ? 1 - percent : null
    default:
      return null
  }
}

function getContactAllowance(authResult: NonNullable<Awaited<ReturnType<typeof getActiveAuthorizationForCustomer>>>): number | null {
  const { carrier, authorization } = authResult

  switch (carrier) {
    case 'vsp':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).contactAllowance ?? null
    case 'eyemed':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).contactAllowance ?? null
    case 'spectera':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).contactAllowance ?? null
    default:
      return null
  }
}

function getContactFittingCovered(authResult: NonNullable<Awaited<ReturnType<typeof getActiveAuthorizationForCustomer>>>): boolean {
  const { carrier, authorization } = authResult

  switch (carrier) {
    case 'vsp':
      // VSP may cover contact fitting based on plan
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).contactFittingCovered ?? false
    case 'eyemed':
      // EyeMed typically includes fitting in contact allowance
      return true
    case 'spectera':
      // Spectera plans vary
      return false
    default:
      return false
  }
}

function getGlassesContactsExclusive(authResult: NonNullable<Awaited<ReturnType<typeof getActiveAuthorizationForCustomer>>>): boolean {
  const { carrier } = authResult

  // VSP plans typically have glasses/contacts mutual exclusion per benefit period
  // EyeMed and Spectera also generally follow this rule
  switch (carrier) {
    case 'vsp':
      return true // VSP: glasses OR contacts, not both
    case 'eyemed':
      return true // EyeMed: glasses OR contacts, not both
    case 'spectera':
      return true // Spectera: glasses OR contacts, not both
    default:
      return false
  }
}

function getContactExamCopay(authResult: NonNullable<Awaited<ReturnType<typeof getActiveAuthorizationForCustomer>>>): number | null {
  const { carrier, authorization } = authResult

  switch (carrier) {
    case 'vsp':
      // VSP contact lens exam is typically covered at the same copay as routine exam
      // Or a 15% discount off the contact lens exam fee
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vspCopays = authorization.copays as any
      // If contact exam copay is explicitly set, use it; otherwise use exam copay
      return vspCopays.contactExamCopay ?? vspCopays.examWellvision ?? null
    case 'eyemed':
      // EyeMed: contact lens exam typically covered with fitting allowance
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).clFitStandardCopay ?? null
    case 'spectera':
      // Spectera: selection CL fit copay
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).selectionClFitCopay ?? null
    default:
      return null
  }
}

function getContactFittingCopay(authResult: NonNullable<Awaited<ReturnType<typeof getActiveAuthorizationForCustomer>>>): number | null {
  const { carrier, authorization } = authResult

  switch (carrier) {
    case 'vsp':
      // VSP: Contact fitting is typically covered after exam copay
      // Standard fitting is usually no additional charge; specialty may have copay
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vspCopays = authorization.copays as any
      return vspCopays.contactFittingCopay ?? 0 // Usually covered
    case 'eyemed':
      // EyeMed: Standard fit copay
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).clFitStandardCopay ?? null
    case 'spectera':
      // Spectera: Selection CL fit is typically covered-in-full
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const specCopays = authorization.copays as any
      return specCopays.selectionClFitCopay ?? 0
    default:
      return null
  }
}
