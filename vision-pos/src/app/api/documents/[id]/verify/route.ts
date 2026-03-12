import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { precomputeCustomerPrices } from '@/lib/services/price-list-precompute'

/**
 * POST /api/documents/[id]/verify
 *
 * Verifies a processed document and creates an InsuranceAuthorization.
 * Works with two-prompt extraction system (normalized data).
 *
 * Flow:
 * 1. Read document with extractedData (two-prompt format: { raw, normalized })
 * 2. Map normalized benefits to copay structure
 * 3. Create InsuranceAuthorization from normalized data
 * 4. Link document to authorization
 * 5. Mark document as verified
 * 6. Trigger price list generation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params
    const body = await request.json().catch(() => ({}))
    const { verifiedBy } = body

    // Get the document with extracted data
    const document = await prisma.insuranceDocument.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check processing status
    if (document.ocrStatus !== 'completed') {
      return NextResponse.json(
        { success: false, error: `Document not processed. Status: ${document.ocrStatus}` },
        { status: 400 }
      )
    }

    if (!document.extractedData) {
      return NextResponse.json(
        { success: false, error: 'No extracted data available' },
        { status: 400 }
      )
    }

    if (!document.customerId) {
      return NextResponse.json(
        { success: false, error: 'Document not linked to a customer' },
        { status: 400 }
      )
    }

    // Already verified?
    if (document.isVerified && document.authorizationId) {
      return NextResponse.json({
        success: true,
        authorizationId: document.authorizationId,
        message: 'Document was already verified',
      })
    }

    // Parse extracted data - support both new two-prompt format and legacy format
    const allData = document.extractedData as Record<string, unknown>

    // Check if this is the new two-prompt format (has 'raw' and 'normalized' keys)
    let normalizedData: any = null
    let data: Record<string, unknown> = {}

    if (allData.normalized) {
      // New two-prompt format
      normalizedData = allData.normalized as any
      data = normalizedData.memberInfo || {}
      data.carrier = normalizedData.carrier

      // Map normalized benefits to data structure for backwards compatibility
      data.normalizedBenefits = normalizedData.normalizedBenefits || []
    } else {
      // Legacy Haiku format - treat entire extractedData as flat data
      data = allData
    }

    // Determine carrier - check flat field first, then document
    const carrier = detectCarrier(document.carrier, data)
    if (!carrier) {
      return NextResponse.json(
        { success: false, error: 'Could not determine carrier from document' },
        { status: 400 }
      )
    }

    // Extract values
    // For new two-prompt format: map from normalized benefits array
    // For legacy format: use flat fields directly
    let examCopay: number | null = null
    let materialsCopay: number | null = null
    let clExamCopay: number | null = null
    let frameAllowance: number | null = null
    let frameOverageDiscount: number | null = null
    let contactAllowance: number | null = null

    if (normalizedData?.normalizedBenefits && Array.isArray(normalizedData.normalizedBenefits)) {
      // Extract from normalized benefits array
      const benefitValues = extractValuesFromNormalizedBenefits(normalizedData.normalizedBenefits, data.carrier || 'unknown')
      examCopay = benefitValues.examCopay
      materialsCopay = benefitValues.materialsCopay
      clExamCopay = benefitValues.clExamCopay
      frameAllowance = benefitValues.frameAllowance
      frameOverageDiscount = benefitValues.frameOverageDiscount
      contactAllowance = benefitValues.contactAllowance
    } else {
      // Legacy format - use flat fields directly
      examCopay = getNumeric(data, 'examCopay') ?? extractNumericNested(data, 'copays.examCopay')
      materialsCopay = getNumeric(data, 'materialsCopay') ?? extractNumericNested(data, 'copays.materialsCopay')
      clExamCopay = getNumeric(data, 'clExamCopay')
      frameAllowance = getNumeric(data, 'frameAllowance') ?? extractFrameAllowanceLegacy(data)
      frameOverageDiscount = getNumeric(data, 'frameOverageDiscount')
      contactAllowance = getNumeric(data, 'contactAllowance') ?? extractContactAllowanceLegacy(data)
    }

    // Build copays object
    const copays = buildCopaysFromExtracted(carrier, data, {
      examCopay,
      materialsCopay,
      clExamCopay,
      frameAllowance,
      frameOverageDiscount,
      contactAllowance,
    })

    // ===== PHASE 1: Deactivate old authorizations for this customer/carrier =====
    const oldAuthorizations = await prisma.insuranceAuthorization.findMany({
      where: {
        customerId: document.customerId,
        carrier: carrier.toUpperCase(),
        isActive: true,
      },
    })

    if (oldAuthorizations.length > 0) {
      await prisma.insuranceAuthorization.updateMany({
        where: {
          id: { in: oldAuthorizations.map(a => a.id) },
        },
        data: {
          isActive: false,
        },
      })
      console.log(`[Verify] Deactivated ${oldAuthorizations.length} old authorizations for ${document.customerId}`)

      // ===== PHASE 2: Delete old patient price list records =====
      const deletedCount = await prisma.patientPriceList.deleteMany({
        where: {
          authorizationId: { in: oldAuthorizations.map(a => a.id) },
        },
      })
      console.log(`[Verify] Deleted ${deletedCount.count} old price records for customer ${document.customerId}`)
    }

    // Create the InsuranceAuthorization
    const authorization = await prisma.insuranceAuthorization.create({
      data: {
        customerId: document.customerId,
        carrier: carrier.toUpperCase(),
        planName: getString(data, 'planName') || `${carrier} Plan`,
        memberId: getString(data, 'memberId'),
        memberName: getString(data, 'memberName'),
        examEligible: examCopay !== null,
        lensesEligible: materialsCopay !== null || frameAllowance !== null,
        frameEligible: frameAllowance !== null,
        contactsEligible: contactAllowance !== null || clExamCopay !== null,
        frameAllowance: frameAllowance,
        contactAllowance: contactAllowance,
        examCopay: examCopay,
        materialsCopay: materialsCopay,
        clExamCopay: clExamCopay,
        copays: copays,
        rawExtractedData: data,
        confidenceScore: document.confidenceScore,
        isActive: true,
        expirationDate: null,
      },
    })

    // Link document to authorization and mark verified
    await prisma.insuranceDocument.update({
      where: { id: documentId },
      data: {
        authorizationId: authorization.id,
        isVerified: true,
        verifiedBy: verifiedBy || 'system',
        verifiedAt: new Date(),
      },
    })

    // Trigger price list generation
    let priceListCount = 0
    try {
      const result = await precomputeCustomerPrices(
        buildBenefitAuth(carrier, authorization, copays),
        {
          customerId: document.customerId,
          authorizationId: authorization.id,
          carrier: carrier.toUpperCase() as 'VSP' | 'EyeMed' | 'Spectera',
          planName: authorization.planName || undefined,
        }
      )
      priceListCount = result.productsCreated + result.productsUpdated
      console.log(`[Verify] Price list generated: ${priceListCount} products`)
    } catch (priceError) {
      console.error('[Verify] Price list generation failed:', priceError)
      // Don't fail the verification - price list can be regenerated
    }

    return NextResponse.json({
      success: true,
      authorizationId: authorization.id,
      carrier: carrier.toUpperCase(),
      planName: authorization.planName,
      copays,
      priceListCount,
      message: 'Document verified and authorization created',
    })

  } catch (error) {
    console.error('[Verify] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// HELPER FUNCTIONS - Updated for flat Haiku format + legacy support
// =============================================================================

/**
 * Get string value from flat data
 */
function getString(data: Record<string, unknown>, key: string): string | null {
  const val = data[key]
  if (typeof val === 'string') return val
  return null
}

/**
 * Get numeric value from flat data
 */
function getNumeric(data: Record<string, unknown>, key: string): number | null {
  const val = data[key]
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''))
    return isNaN(num) ? null : num
  }
  return null
}

function detectCarrier(docCarrier: string | null, data: Record<string, unknown>): string | null {
  // Check flat carrier field first (Haiku format)
  const flatCarrier = getString(data, 'carrier')
  if (flatCarrier) {
    const lower = flatCarrier.toLowerCase()
    if (lower.includes('vsp')) return 'vsp'
    if (lower.includes('eyemed')) return 'eyemed'
    if (lower.includes('spectera')) return 'spectera'
    return lower
  }

  // Use document carrier if available
  if (docCarrier) {
    return docCarrier.toLowerCase()
  }

  // Try legacy nested path
  const planCarrier = getNestedValue(data, 'plan.carrier.value') as string
  if (planCarrier) {
    const lower = planCarrier.toLowerCase()
    if (lower.includes('vsp')) return 'vsp'
    if (lower.includes('eyemed')) return 'eyemed'
    if (lower.includes('spectera')) return 'spectera'
  }

  return null
}

// Legacy extraction functions for backwards compatibility
function extractNumericNested(data: Record<string, unknown>, path: string): number | null {
  const val = getNestedValue(data, `${path}.value`)
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const num = parseFloat(val.replace(/[^0-9.-]/g, ''))
    return isNaN(num) ? null : num
  }
  return null
}

function extractFrameAllowanceLegacy(data: Record<string, unknown>): number | null {
  const altair = getNestedValue(data, 'frame.allowances.altairMarchonFrameAllowance.allowance') as number
  const nonAltair = getNestedValue(data, 'frame.allowances.nonAltairMarchonFrameAllowance.allowance') as number
  return altair || nonAltair || null
}

function extractContactAllowanceLegacy(data: Record<string, unknown>): number | null {
  return getNestedValue(data, 'contacts.clExamAndMaterialsAllowance.value') as number || null
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

interface ExtractedValues {
  examCopay: number | null
  materialsCopay: number | null
  clExamCopay: number | null
  frameAllowance: number | null
  frameOverageDiscount: number | null
  contactAllowance: number | null
}

function buildCopaysFromExtracted(
  carrier: string,
  data: Record<string, unknown>,
  values: ExtractedValues
): Record<string, unknown> {
  const copays: Record<string, unknown> = {
    examCopay: values.examCopay,
    materialsCopay: values.materialsCopay,
    clExamCopay: values.clExamCopay,
    frameAllowance: values.frameAllowance,
    frameOverageDiscount: values.frameOverageDiscount,
    contactAllowance: values.contactAllowance,
  }

  // EyeMed tiers (from Haiku extraction)
  // NOTE: Field names must match what pricing-calculator.ts expects
  if (carrier === 'eyemed') {
    const eyemedTiers = data.eyemedTiers as Record<string, number | null> | null
    if (eyemedTiers) {
      copays.progressiveStandard = eyemedTiers.progressiveStandard
      copays.progressivePremiumTier1 = eyemedTiers.progressiveTier1
      copays.progressivePremiumTier2 = eyemedTiers.progressiveTier2
      copays.progressivePremiumTier3 = eyemedTiers.progressiveTier3
      copays.progressivePremiumTier4 = eyemedTiers.progressiveTier4
      copays.arStandard = eyemedTiers.arStandard
      copays.arPremiumTier1 = eyemedTiers.arTier1
      copays.arPremiumTier2 = eyemedTiers.arTier2
      copays.arPremiumTier3 = eyemedTiers.arTier3
    }

    // Extract formula components from rawExtractedData (NEW)
    // These indicate when a tier uses formula pricing instead of flat copay
    const rawData = data.rawExtractedData as Record<string, unknown> | undefined
    if (rawData) {
      // Progressive tier formula components
      if (rawData['tier_4HasFormula']) {
        copays.tier4HasFormula = true
        if (rawData['tier_4DiscountPercent']) copays.tier4DiscountPercent = rawData['tier_4DiscountPercent']
        if (rawData['tier_4Allowance']) copays.tier4Allowance = rawData['tier_4Allowance']
      }
      if (rawData['tier_5HasFormula']) {
        copays.tier5HasFormula = true
        if (rawData['tier_5DiscountPercent']) copays.tier5DiscountPercent = rawData['tier_5DiscountPercent']
        if (rawData['tier_5Allowance']) copays.tier5Allowance = rawData['tier_5Allowance']
      }
      if (rawData['premiumHasFormula']) {
        copays.premiumHasFormula = true
        if (rawData['premiumDiscountPercent']) copays.premiumDiscountPercent = rawData['premiumDiscountPercent']
        if (rawData['premiumAllowance']) copays.premiumAllowance = rawData['premiumAllowance']
      }
      // Progressive standard copay (base copay for formula)
      if (rawData['progressiveStandard']) copays.progressiveStandard = rawData['progressiveStandard']
      // General progressive allowance
      if (rawData['progressiveAllowance']) copays.progressiveAllowance = rawData['progressiveAllowance']
    }

    // Legacy EyeMed format
    const legacyEyemed = getNestedValue(data, 'eyemedCopays') as Record<string, unknown>
    if (legacyEyemed) {
      copays.singleVisionCopay = legacyEyemed.singleVisionCopay ?? copays.materialsCopay
      copays.bifocalCopay = legacyEyemed.bifocalCopay
      copays.trifocalCopay = legacyEyemed.trifocalCopay
      copays.progressiveStandardCopay = copays.progressiveStandardCopay ?? legacyEyemed.progressiveStandardCopay
      copays.progressiveTier1Copay = copays.progressiveTier1Copay ?? legacyEyemed.progressiveTier1Copay
      copays.progressiveTier2Copay = copays.progressiveTier2Copay ?? legacyEyemed.progressiveTier2Copay
      copays.progressiveTier3Copay = copays.progressiveTier3Copay ?? legacyEyemed.progressiveTier3Copay
      copays.progressiveTier4Copay = copays.progressiveTier4Copay ?? legacyEyemed.progressiveTier4Copay
      copays.arCoatingCopays = legacyEyemed.arCoatingCopays
      copays.lensOptionCopays = legacyEyemed.lensOptionCopays
    }
  }

  // VSP matrix (from Haiku extraction)
  if (carrier === 'vsp') {
    const vspMatrix = data.vspMatrix as Record<string, number> | null
    if (vspMatrix) {
      copays.vspMatrix = vspMatrix
    }

    // Legacy VSP format
    const legacyEnhancements = getNestedValue(data, 'vspLensEnhancements') as unknown[]
    if (legacyEnhancements) {
      copays.lensEnhancements = legacyEnhancements
    }
  }

  return copays
}

/**
 * Extract benefit values from normalized benefits array
 * Maps canonical benefit names to copay fields
 */
function extractValuesFromNormalizedBenefits(
  benefits: any[],
  carrier: string
): {
  examCopay: number | null
  materialsCopay: number | null
  clExamCopay: number | null
  frameAllowance: number | null
  frameOverageDiscount: number | null
  contactAllowance: number | null
} {
  const result = {
    examCopay: null as number | null,
    materialsCopay: null as number | null,
    clExamCopay: null as number | null,
    frameAllowance: null as number | null,
    frameOverageDiscount: null as number | null,
    contactAllowance: null as number | null,
  }

  if (!Array.isArray(benefits)) return result

  for (const benefit of benefits) {
    const name = benefit.canonicalName?.toLowerCase() || ''
    const value = benefit.value
    const numValue = typeof value === 'number' ? value : extractNumericValue(value)

    if (name.includes('exam') && !name.includes('contact')) {
      result.examCopay = numValue
    } else if (name.includes('material') || name.includes('single vision') || name.includes('lens')) {
      result.materialsCopay = numValue
    } else if (name.includes('contact') && name.includes('exam')) {
      result.clExamCopay = numValue
    } else if (name.includes('contact') && name.includes('allowance')) {
      result.contactAllowance = numValue
    } else if (name.includes('frame')) {
      result.frameAllowance = numValue
    }
  }

  return result
}

function extractNumericValue(value: any): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[^0-9.-]/g, ''))
    return isNaN(num) ? null : num
  }
  return null
}

function buildBenefitAuth(
  carrier: string,
  auth: {
    planName: string | null
    examCopay?: unknown
    materialsCopay?: unknown
    frameAllowance?: unknown
    contactAllowance?: unknown
    clExamCopay?: unknown
  },
  copays: Record<string, unknown>
) {
  // Minimal BenefitAuthorization for price pre-computation
  // Use lowercase carrier for type guards (isEyemedAuth, isVspAuth, etc.)
  const carrierLower = carrier.toLowerCase()
  return {
    carrier: carrierLower,
    plan: {
      carrier: carrierLower,
      planName: auth.planName || `${carrier} Plan`,
    },
    patient: {
      age: null,
    },
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
}
