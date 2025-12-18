/**
 * Customer Authorization API
 * GET /api/customers/[id]/authorization - Get customer's active insurance authorization
 * PATCH /api/customers/[id]/authorization - Update authorization values
 *
 * Returns the normalized authorization data for the customer's active plan.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveAuthorizationForCustomer, CarrierType } from '@/lib/services/authorization-service'

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

    // Build a comprehensive response with all pricing data needed for POS
    const authorization = {
      id: authResult.authorizationId,
      carrier: authResult.carrier,
      planName: auth.plan.planName,
      planNetwork: auth.plan.network,

      // Patient info
      patientName: auth.patient.name,
      patientAge: auth.patient.age,
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

      // ===== PRICING TIERS FOR POS =====
      // These are the copays associates need to see when selecting products

      // Lens copays (SV, Bifocal, Trifocal)
      lensCopays: getLensCopays(authResult),

      // Progressive lens tier copays
      progressiveTiers: getProgressiveTiers(authResult),

      // AR coating tier copays
      arCoatingTiers: getArCoatingTiers(authResult),

      // Material copays (poly, hi-index, trivex)
      materialCopays: getMaterialCopays(authResult),

      // Enhancement copays (photochromic, polarized, blue light, tint)
      enhancementCopays: getEnhancementCopays(authResult),

      // Special rules
      specialRules: getSpecialRules(authResult),

      // ===== DECLINING BALANCE / FLEX PLAN SUPPORT =====
      ...getDecliningBalanceFields(authResult),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const copays = authorization.copays as any

  switch (carrier) {
    case 'vsp':
      // VSP uses contactLensAllowance in the converted BenefitAuthorization
      return copays.contactLensAllowance ?? null
    case 'eyemed':
      // EyeMed: Check disposable first (most common), then conventional
      return copays.contactsDisposable ?? copays.contactsConventional ?? copays.contactAllowance ?? null
    case 'spectera':
      // Spectera: Check non-selection allowance
      return copays.contactsNonSelectionAllowance ?? copays.contactAllowance ?? null
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
      // VSP: Contact lens exam copay extracted from OCR (e.g., "60 copay")
      // This is what patient pays for CL fitting (separate from routine exam copay)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vspCopays = authorization.copays as any
      // Use contactLensExamCopay (extracted from clExamDiscount text) if available
      return vspCopays.contactLensExamCopay ?? vspCopays.contactExamCopay ?? vspCopays.examWellvision ?? null
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
      // VSP: Contact lens exam/fitting copay is extracted from OCR data
      // e.g., "Charge the lesser of 60 copay or 85% U&C" = $60 copay
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vspCopays = authorization.copays as any
      // Use contactLensExamCopay (extracted from clExamDiscount text) if available
      return vspCopays.contactLensExamCopay ?? vspCopays.contactFittingCopay ?? null
    case 'eyemed':
      // EyeMed: Standard fit copay
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (authorization.copays as any).clFitStandardCopay ?? null
    case 'spectera':
      // Spectera: Selection CL fit is typically covered-in-full
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const specCopays = authorization.copays as any
      return specCopays.selectionClFitCopay ?? null
    default:
      return null
  }
}

// ===== PRICING TIER HELPER FUNCTIONS =====

type AuthResult = NonNullable<Awaited<ReturnType<typeof getActiveAuthorizationForCustomer>>>

/**
 * Get basic lens copays (Single Vision, Bifocal, Trifocal)
 */
function getLensCopays(authResult: AuthResult): {
  singleVision: number | null
  bifocal: number | null
  trifocal: number | null
} {
  const { carrier, authorization } = authResult
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const copays = authorization.copays as any

  // NO DEFAULTS - return what was scanned or null
  switch (carrier) {
    case 'vsp':
      // VSP includes basic lenses in materials copay
      return {
        singleVision: copays.materials ?? null,
        bifocal: copays.materials ?? null,
        trifocal: copays.materials ?? null,
      }
    case 'eyemed':
      return {
        singleVision: copays.lensSv ?? null,
        bifocal: copays.lensBifocal ?? null,
        trifocal: copays.lensTrifocal ?? null,
      }
    case 'spectera':
      return {
        singleVision: copays.lensStandard ?? null,
        bifocal: copays.lensStandard ?? null,
        trifocal: copays.lensStandard ?? null,
      }
    default:
      return { singleVision: null, bifocal: null, trifocal: null }
  }
}

/**
 * Get progressive lens tier copays
 * Returns a map of tier code -> copay amount
 */
function getProgressiveTiers(authResult: AuthResult): Record<string, number | string | null> {
  const { carrier, authorization } = authResult
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const copays = authorization.copays as any

  switch (carrier) {
    case 'vsp':
      // VSP uses letter codes (FA, JA, KA, etc.) from planTier
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vspAuth = authorization as any
      if (vspAuth.planTier?.progressiveCopays) {
        return vspAuth.planTier.progressiveCopays
      }
      return {}
    case 'eyemed':
      // EyeMed uses numbered tiers: standard, tier_1 through tier_5
      return {
        standard: copays.progressiveStandard ?? null,
        tier_1: copays.progressivePremiumTier1 ?? null,
        tier_2: copays.progressivePremiumTier2 ?? null,
        tier_3: copays.progressivePremiumTier3 ?? null,
        tier_4: copays.progressivePremiumTier4 ?? null,
        tier_5: copays.progressivePremiumTier5 ?? null,
      }
    case 'spectera':
      // Spectera uses Roman numerals: I through V
      return {
        I: copays.progressiveTierI ?? null,
        II: copays.progressiveTierII ?? null,
        III: copays.progressiveTierIII ?? null,
        IV: copays.progressiveTierIV ?? null,
        V: copays.progressiveTierV ?? null,
        nonFormulary: copays.progressiveNonFormulary ?? null,
      }
    default:
      return {}
  }
}

/**
 * Get AR coating tier copays
 */
function getArCoatingTiers(authResult: AuthResult): Record<string, number | string | null> {
  const { carrier, authorization } = authResult
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const copays = authorization.copays as any

  switch (carrier) {
    case 'vsp':
      // VSP uses letter codes (QM, QT, QV, etc.) from planTier
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vspAuth = authorization as any
      if (vspAuth.planTier?.arCopays) {
        return vspAuth.planTier.arCopays
      }
      return {}
    case 'eyemed':
      // EyeMed uses: standard, tier_1, tier_2, tier_3
      return {
        standard: copays.arStandard ?? null,
        tier_1: copays.arPremiumTier1 ?? null,
        tier_2: copays.arPremiumTier2 ?? null,
        tier_3: copays.arPremiumTier3 ?? null,
      }
    case 'spectera':
      // Spectera uses: I, II, III, IV
      return {
        I: copays.arTierI ?? null,
        II: copays.arTierII ?? null,
        III: copays.arTierIII ?? null,
        IV: copays.arTierIV ?? null,
        nonFormulary: copays.arNonFormulary ?? null,
      }
    default:
      return {}
  }
}

/**
 * Get material upgrade copays (polycarbonate, high-index, trivex)
 */
function getMaterialCopays(authResult: AuthResult): {
  polycarbonate: number | string | null
  polycarbonateChild: number | string | null
  highIndex160: number | string | null
  highIndex167: number | string | null
  highIndex174: number | string | null
  trivex: number | string | null
} {
  const { carrier, authorization } = authResult
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const copays = authorization.copays as any

  switch (carrier) {
    case 'vsp':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vspAuth = authorization as any
      const vspMaterials = vspAuth.planTier?.materialCopays ?? {}
      return {
        polycarbonate: vspMaterials.polycarbonate ?? copays.materialPolycarbonate ?? null,
        polycarbonateChild: vspMaterials.polycarbonateChild ?? copays.materialPolycarbonateChild ?? 'covered',
        highIndex160: null, // VSP typically bundles high-index
        highIndex167: vspMaterials.highIndex167 ?? null,
        highIndex174: vspMaterials.highIndex174 ?? null,
        trivex: vspMaterials.trivex ?? copays.materialTrivex ?? null,
      }
    case 'eyemed':
      return {
        polycarbonate: copays.materialPolycarbonate ?? null,
        polycarbonateChild: copays.materialPolycarbonateChild ?? 'covered',
        highIndex160: copays.materialHighIndex ?? null,
        highIndex167: copays.materialHighIndex167 ?? null,
        highIndex174: copays.materialHighIndex174 ?? null,
        trivex: copays.materialTrivex ?? null,
      }
    case 'spectera':
      return {
        polycarbonate: copays.materialPolycarbonateAdult ?? null,
        polycarbonateChild: copays.materialPolycarbonateChild ?? 'covered',
        highIndex160: copays.materialHighIndex160166 ?? null,
        highIndex167: copays.materialHighIndex166173 ?? null,
        highIndex174: copays.materialHighIndex174Plus ?? null,
        trivex: copays.materialTrivex ?? null,
      }
    default:
      return {
        polycarbonate: null,
        polycarbonateChild: null,
        highIndex160: null,
        highIndex167: null,
        highIndex174: null,
        trivex: null,
      }
  }
}

/**
 * Get enhancement copays (photochromic, polarized, blue light, tint)
 */
function getEnhancementCopays(authResult: AuthResult): {
  photochromic: number | string | null
  polarized: number | string | null
  blueLight: number | string | null
  tint: number | string | null
  uvCoating: number | string | null
  scratchCoating: number | string | null
} {
  const { carrier, authorization } = authResult
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const copays = authorization.copays as any

  switch (carrier) {
    case 'vsp':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vspAuth = authorization as any
      const vspEnhancements = vspAuth.planTier?.enhancementCopays ?? {}
      return {
        photochromic: vspEnhancements.photochromic ?? copays.photochromic ?? null,
        polarized: vspEnhancements.polarized ?? copays.polarized ?? null,
        blueLight: vspEnhancements.blueLightFilter ?? copays.blueLightFilter ?? null,
        tint: vspEnhancements.tint ?? copays.tint ?? null,
        uvCoating: copays.uvCoating ?? 'covered',
        scratchCoating: copays.scratchCoating ?? 'covered',
      }
    case 'eyemed':
      return {
        photochromic: copays.photochromic ?? null,
        polarized: copays.polarized ?? null,
        blueLight: copays.blueLightFilter ?? null,
        tint: copays.tint ?? null,
        uvCoating: copays.uvCoating ?? 'covered',
        scratchCoating: copays.scratchCoating ?? 'covered',
      }
    case 'spectera':
      return {
        photochromic: copays.photochromic ?? null,
        polarized: copays.polarized ?? null,
        blueLight: null, // Spectera may not have specific blue light field
        tint: copays.tint ?? null,
        uvCoating: copays.uvCoating ?? null,
        scratchCoating: copays.scratchCoating ?? 'covered',
      }
    default:
      return {
        photochromic: null,
        polarized: null,
        blueLight: null,
        tint: null,
        uvCoating: null,
        scratchCoating: null,
      }
  }
}

/**
 * Get special pricing rules (e.g., child poly free under age X)
 */
function getSpecialRules(authResult: AuthResult): {
  polycarbonateChildFreeAge: number
  childAge: number | null
  isChild: boolean
  secondPairDiscount: number | null
} {
  const { carrier, authorization } = authResult
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const specialRules = (authorization as any).specialRules ?? {}
  const patientAge = authorization.patient.age

  // Default: polycarbonate free for children under 18
  const polycarbonateChildFreeAge = specialRules.polycarbonateFreeCbildAgeMax ?? 18
  const isChild = patientAge !== null && patientAge < polycarbonateChildFreeAge

  return {
    polycarbonateChildFreeAge,
    childAge: patientAge,
    isChild,
    secondPairDiscount: specialRules.secondPairDiscount ?? null,
  }
}

/**
 * Get declining balance / flex plan fields
 * Only EyeMed currently supports this - check the raw authorization data
 */
function getDecliningBalanceFields(authResult: AuthResult): {
  benefitStructure: 'COPAY_ALLOWANCE' | 'DECLINING_BALANCE' | 'PACKAGE' | null
  totalMaterialsCredit: number | null
  creditAppliesToFrames: boolean
  creditAppliesToLenses: boolean
  creditAppliesToContacts: boolean
  creditAppliesToCoatings: boolean
  overageDiscountPercent: number | null
} {
  const { carrier, authorization } = authResult
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAuth = authorization as any

  // Default values for standard copay/allowance plans
  const defaults = {
    benefitStructure: 'COPAY_ALLOWANCE' as const,
    totalMaterialsCredit: null,
    creditAppliesToFrames: true,
    creditAppliesToLenses: true,
    creditAppliesToContacts: false,
    creditAppliesToCoatings: true,
    overageDiscountPercent: null,
  }

  // Only EyeMed currently has declining balance support in our schema
  if (carrier === 'eyemed') {
    // Check if this is a declining balance plan
    const benefitStructure = rawAuth.benefitStructure ?? null

    if (benefitStructure === 'DECLINING_BALANCE') {
      return {
        benefitStructure: 'DECLINING_BALANCE',
        totalMaterialsCredit: rawAuth.totalMaterialsCredit ?? null,
        creditAppliesToFrames: rawAuth.creditAppliesToFrames ?? true,
        creditAppliesToLenses: rawAuth.creditAppliesToLenses ?? true,
        creditAppliesToContacts: rawAuth.creditAppliesToContacts ?? false,
        creditAppliesToCoatings: rawAuth.creditAppliesToCoatings ?? true,
        overageDiscountPercent: rawAuth.overageDiscountPercent ?? null,
      }
    }

    if (benefitStructure === 'PACKAGE') {
      return {
        ...defaults,
        benefitStructure: 'PACKAGE',
      }
    }
  }

  // VSP and Spectera use standard copay/allowance structure
  return defaults
}

// =============================================================================
// PATCH - Update authorization values
// =============================================================================

interface AuthorizationUpdateRequest {
  carrier: CarrierType
  authorizationId: string
  updates: {
    // Common fields across carriers
    examCopay?: number | null
    materialsCopay?: number | null
    frameAllowance?: number | null
    frameOverageDiscount?: number | null
    contactAllowance?: number | null
    contactFittingCovered?: boolean
    expirationDate?: string | null
    isActive?: boolean

    // VSP-specific
    frameAllowanceRetail?: number | null
    frameAllowanceMarchon?: number | null

    // Lens copays (EyeMed/Spectera)
    singleVisionCopay?: number | null
    bifocalCopay?: number | null
    trifocalCopay?: number | null

    // Progressive tiers
    progressiveStandardCopay?: number | null
    progressiveTier1Copay?: number | null
    progressiveTier2Copay?: number | null
    progressiveTier3Copay?: number | null
    progressiveTier4Copay?: number | null
    progressiveTier5Copay?: number | null

    // Material copays
    polycarbonateAdultCopay?: number | null
    polycarbonateChildCopay?: number | null
    trivexCopay?: number | null
    highIndex160Copay?: number | null
    highIndex167Copay?: number | null
    highIndex174Copay?: number | null

    // Enhancement copays
    photochromicCopay?: number | null
    polarizedCopay?: number | null
    blueLightFilterCopay?: number | null
    tintCopay?: number | null
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

    const { carrier, authorizationId, updates } = body

    if (!carrier || !authorizationId) {
      return NextResponse.json(
        { success: false, error: 'Carrier and authorization ID are required' },
        { status: 400 }
      )
    }

    // Build the update data based on carrier
    let updatedAuth

    switch (carrier) {
      case 'vsp':
        updatedAuth = await prisma.vspAuthorization.update({
          where: { id: authorizationId },
          data: buildVspUpdateData(updates),
        })
        break

      case 'eyemed':
        updatedAuth = await prisma.eyemedAuthorization.update({
          where: { id: authorizationId },
          data: buildEyemedUpdateData(updates),
        })
        break

      case 'spectera':
        updatedAuth = await prisma.specteraAuthorization.update({
          where: { id: authorizationId },
          data: buildSpecteraUpdateData(updates),
        })
        break

      default:
        return NextResponse.json(
          { success: false, error: `Unknown carrier: ${carrier}` },
          { status: 400 }
        )
    }

    // Fetch the updated authorization in normalized format
    const authResult = await getActiveAuthorizationForCustomer(customerId)

    return NextResponse.json({
      success: true,
      message: 'Authorization updated successfully',
      authorization: authResult?.authorization,
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

// =============================================================================
// UPDATE DATA BUILDERS
// =============================================================================

function buildVspUpdateData(updates: AuthorizationUpdateRequest['updates']) {
  const data: Record<string, unknown> = {}

  if (updates.examCopay !== undefined) data.examCopay = updates.examCopay
  if (updates.materialsCopay !== undefined) data.materialsCopay = updates.materialsCopay
  if (updates.frameAllowanceRetail !== undefined) data.frameAllowanceRetail = updates.frameAllowanceRetail
  if (updates.frameAllowanceMarchon !== undefined) data.frameAllowanceMarchon = updates.frameAllowanceMarchon
  if (updates.frameAllowance !== undefined) data.frameAllowanceRetail = updates.frameAllowance
  if (updates.frameOverageDiscount !== undefined) data.frameOverageDiscount = updates.frameOverageDiscount
  if (updates.contactAllowance !== undefined) data.contactAllowance = updates.contactAllowance
  if (updates.contactFittingCovered !== undefined) data.contactFittingCovered = updates.contactFittingCovered
  if (updates.expirationDate !== undefined) data.expirationDate = updates.expirationDate ? new Date(updates.expirationDate) : null
  if (updates.isActive !== undefined) data.isActive = updates.isActive

  return data
}

function buildEyemedUpdateData(updates: AuthorizationUpdateRequest['updates']) {
  const data: Record<string, unknown> = {}

  if (updates.examCopay !== undefined) data.examCopay = updates.examCopay
  if (updates.frameAllowance !== undefined) data.frameAllowance = updates.frameAllowance
  if (updates.frameOverageDiscount !== undefined) data.frameOverageDiscount = updates.frameOverageDiscount
  if (updates.contactAllowance !== undefined) data.contactAllowance = updates.contactAllowance
  if (updates.expirationDate !== undefined) data.expirationDate = updates.expirationDate ? new Date(updates.expirationDate) : null
  if (updates.isActive !== undefined) data.isActive = updates.isActive

  // Lens copays
  if (updates.singleVisionCopay !== undefined) data.singleVisionCopay = updates.singleVisionCopay
  if (updates.bifocalCopay !== undefined) data.bifocalCopay = updates.bifocalCopay
  if (updates.trifocalCopay !== undefined) data.trifocalCopay = updates.trifocalCopay

  // Progressive tiers
  if (updates.progressiveStandardCopay !== undefined) data.progressiveStandardCopay = updates.progressiveStandardCopay
  if (updates.progressiveTier1Copay !== undefined) data.progressiveTier1Copay = updates.progressiveTier1Copay
  if (updates.progressiveTier2Copay !== undefined) data.progressiveTier2Copay = updates.progressiveTier2Copay
  if (updates.progressiveTier3Copay !== undefined) data.progressiveTier3Copay = updates.progressiveTier3Copay
  if (updates.progressiveTier4Copay !== undefined) data.progressiveTier4Copay = updates.progressiveTier4Copay
  if (updates.progressiveTier5Copay !== undefined) data.progressiveTier5Copay = updates.progressiveTier5Copay

  // Material copays
  if (updates.polycarbonateAdultCopay !== undefined) data.polycarbonateAdultCopay = updates.polycarbonateAdultCopay
  if (updates.polycarbonateChildCopay !== undefined) data.polycarbonateChildCopay = updates.polycarbonateChildCopay
  if (updates.trivexCopay !== undefined) data.trivexCopay = updates.trivexCopay
  if (updates.highIndex160Copay !== undefined) data.highIndex160Copay = updates.highIndex160Copay
  if (updates.highIndex167Copay !== undefined) data.highIndex167Copay = updates.highIndex167Copay
  if (updates.highIndex174Copay !== undefined) data.highIndex174Copay = updates.highIndex174Copay

  // Enhancement copays
  if (updates.photochromicCopay !== undefined) data.photochromicCopay = updates.photochromicCopay
  if (updates.polarizedCopay !== undefined) data.polarizedCopay = updates.polarizedCopay
  if (updates.blueLightFilterCopay !== undefined) data.blueLightFilterCopay = updates.blueLightFilterCopay
  if (updates.tintCopay !== undefined) data.tintCopay = updates.tintCopay

  return data
}

function buildSpecteraUpdateData(updates: AuthorizationUpdateRequest['updates']) {
  const data: Record<string, unknown> = {}

  if (updates.examCopay !== undefined) data.examCopay = updates.examCopay
  if (updates.frameAllowance !== undefined) data.frameAllowance = updates.frameAllowance
  if (updates.contactAllowance !== undefined) data.nonSelectionClAllowance = updates.contactAllowance
  if (updates.expirationDate !== undefined) data.expirationDate = updates.expirationDate ? new Date(updates.expirationDate) : null
  if (updates.isActive !== undefined) data.isActive = updates.isActive

  // Lens copays
  if (updates.singleVisionCopay !== undefined) data.standardLensCopay = updates.singleVisionCopay

  // Progressive tiers (Spectera uses different naming)
  if (updates.progressiveTier1Copay !== undefined) data.progressiveTier1Copay = updates.progressiveTier1Copay
  if (updates.progressiveTier2Copay !== undefined) data.progressiveTier2Copay = updates.progressiveTier2Copay
  if (updates.progressiveTier3Copay !== undefined) data.progressiveTier3Copay = updates.progressiveTier3Copay
  if (updates.progressiveTier4Copay !== undefined) data.progressiveTier4Copay = updates.progressiveTier4Copay
  if (updates.progressiveTier5Copay !== undefined) data.progressiveTier5Copay = updates.progressiveTier5Copay

  // Material copays
  if (updates.polycarbonateAdultCopay !== undefined) data.polycarbonateAdultCopay = updates.polycarbonateAdultCopay
  if (updates.polycarbonateChildCopay !== undefined) data.polycarbonateChildCopay = updates.polycarbonateChildCopay
  if (updates.trivexCopay !== undefined) data.trivexCopay = updates.trivexCopay
  if (updates.highIndex174Copay !== undefined) data.highIndex174Copay = updates.highIndex174Copay

  // Enhancement copays
  if (updates.photochromicCopay !== undefined) data.photochromicCopay = updates.photochromicCopay
  if (updates.polarizedCopay !== undefined) data.polarizedCopay = updates.polarizedCopay
  if (updates.blueLightFilterCopay !== undefined) data.blueLightFilterCopay = updates.blueLightFilterCopay
  if (updates.tintCopay !== undefined) data.tintCopay = updates.tintCopay

  return data
}
