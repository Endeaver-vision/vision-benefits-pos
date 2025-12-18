import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { generatePriceMapping } from '@/lib/services/price-mapping-service'

/**
 * POST /api/documents/[id]/verify
 * Mark a document as verified by a staff member
 * Optionally apply corrections to the extracted data
 *
 * IMPORTANT: After verification, this automatically creates the insurance
 * authorization so pricing calculations work immediately.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get verifier ID from request body
    const verifierId = body.verifiedBy || 'staff'

    // Check document exists
    const existing = await prisma.insuranceDocument.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      isVerified: true,
      verifiedBy: verifierId,
      verifiedAt: new Date(),
    }

    // Apply any corrections to extracted data
    let extractedData = (existing.extractedData as Record<string, unknown>) || {}
    if (body.corrections) {
      extractedData = {
        ...extractedData,
        ...body.corrections,
      }
      updateData.extractedData = extractedData
    }

    // Update carrier/plan if provided
    if (body.carrier) {
      updateData.carrier = body.carrier
    }

    if (body.planName) {
      updateData.planName = body.planName
    }

    if (body.verificationNotes) {
      updateData.verificationNotes = body.verificationNotes
    }

    const document = await prisma.insuranceDocument.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // =========================================================================
    // AUTO-CREATE AUTHORIZATION after verification
    // This ensures the customer has an active authorization for pricing
    // =========================================================================
    let authorizationId: string | null = null

    if (document.customerId && document.carrier) {
      try {
        const carrier = document.carrier.toLowerCase()

        // Determine which authorization to create based on carrier
        if (carrier === 'vsp') {
          authorizationId = await createVspAuthorization(
            document.customerId,
            extractedData,
            document.rawOcrText || undefined
          )
        } else if (carrier === 'eyemed') {
          authorizationId = await createEyemedAuthorization(
            document.customerId,
            extractedData
          )
        } else if (carrier === 'spectera') {
          authorizationId = await createSpecteraAuthorization(
            document.customerId,
            extractedData
          )
        }

        console.log(`[Verify] Created ${carrier} authorization: ${authorizationId}`)

        // Auto-generate price mappings after authorization is created
        try {
          const priceMappingResult = await generatePriceMapping(document.customerId)
          console.log(`[Verify] Price mapping generated: ${priceMappingResult.mappedProducts}/${priceMappingResult.totalProducts} products mapped`)
          if (priceMappingResult.missingPrices > 0) {
            console.log(`[Verify] Missing prices: ${priceMappingResult.missingPrices} products need manual entry`)
          }
        } catch (priceError) {
          console.error('[Verify] Failed to generate price mappings:', priceError)
          // Don't fail - authorization was still created
        }
      } catch (authError) {
        console.error('[Verify] Failed to create authorization:', authError)
        // Don't fail the verification, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      data: document,
      authorizationId,
      message: authorizationId
        ? 'Document verified and price mappings generated'
        : 'Document verified successfully',
    })
  } catch (error) {
    console.error('Error verifying document:', error)
    return NextResponse.json(
      { error: 'Failed to verify document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documents/[id]/verify
 * Remove verification from a document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check document exists
    const existing = await prisma.insuranceDocument.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const document = await prisma.insuranceDocument.update({
      where: { id },
      data: {
        isVerified: false,
        verifiedBy: null,
        verifiedAt: null,
        verificationNotes: null,
      },
    })

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Verification removed',
    })
  } catch (error) {
    console.error('Error removing verification:', error)
    return NextResponse.json(
      { error: 'Failed to remove verification' },
      { status: 500 }
    )
  }
}

// =============================================================================
// AUTHORIZATION CREATION HELPERS
// =============================================================================

interface ExtractedData {
  patient?: {
    authNumber?: { value: string }
    memberId?: { value: string }
    memberName?: { value: string }
    subscriberId?: { value: string }
    patientBirthDate?: { value: string }
    authEffectiveDate?: { value: string }
    authExpirationDate?: { value: string }
  }
  plan?: {
    benefitPlanName?: { value: string }
    groupName?: { value: string }
    groupNumber?: { value: string }
    network?: { value: string }
    benefitLevel?: { value: string }
  }
  copays?: {
    examCopay?: { value: number }
    materialsCopay?: { value: number }
    singleVisionCopay?: { value: number }
    bifocalCopay?: { value: number }
    trifocalCopay?: { value: number }
    progressiveCopays?: {
      standard?: { value: number }
      tier1?: { value: number }
      tier2?: { value: number }
      tier3?: { value: number }
      tier4?: { value: number }
      tier5?: { value: number }
    }
    arCopays?: {
      standard?: { value: number }
      tier1?: { value: number }
      tier2?: { value: number }
      tier3?: { value: number }
      tier4?: { value: number }
    }
    materialCopays?: {
      polycarbonate?: { value: number | 'covered' }
      polycarbonateChild?: { value: number | 'covered' }
      trivex?: { value: number }
      midIndex?: { value: number }
      highIndex166?: { value: number }
      highIndex167?: { value: number }
      highIndex174?: { value: number }
    }
    enhancementCopays?: {
      photochromic?: { value: number }
      polarized?: { value: number }
      tint?: { value: number }
      uvCoating?: { value: number }
      scratchCoating?: { value: number | 'covered' }
      edgePolish?: { value: number }
    }
  }
  frame?: {
    allowances?: {
      altairMarchonFrameAllowance?: { allowance: number; overageDiscount: number }
      nonAltairMarchonFrameAllowance?: { allowance: number; overageDiscount: number }
      frameAllowance?: { value: number }
      frameOveragePercent?: { value: number }
    }
  }
  contacts?: {
    clExamCopay?: { value: number | string }  // CL fitting copay - may be number or string like "lesser of $60..."
    clExamAndMaterialsAllowance?: { value: number }
    clMaterialsAllowance?: { value: number }  // GPT sometimes uses this field name instead
    selectionContactLensesFit?: { value: string }
    nonSelectionContactLensesFit?: { value: string }
    selectionDailyBiweekly?: { value: string }
    selectionMonthly?: { value: string }
  }
  // VSP-specific lens enhancement codes
  vspLensEnhancements?: {
    codes: Array<{
      code: string
      description: string
      copaySingleVision: number | null
      copayMultifocal: number | null
    }>
    confidence: number
  }
  // VSP lens charges (detailed pricing from lens enhancement form)
  vspLensCharges?: {
    confidence?: number
    // Digital Single Vision (Eyezen, etc.)
    digitalSingleVision?: { value: number, confidence?: number }
    progressives?: {
      standardK?: { glass?: number, plastic?: number }
      premiumF?: { glass?: number, plastic?: number }
      premiumJ?: { glass?: number, plastic?: number }
      customN?: number
      customO?: number
    }
    coatings?: {
      arA?: { value: number, confidence?: number }
      arC?: { value: number, confidence?: number }
      arD?: { value: number, confidence?: number }
      scratchA?: { value: number, confidence?: number }
      scratchB?: { value: number, confidence?: number }
    }
    polycarbonate?: {
      baseSv?: { value: number, confidence?: number }
      baseMulti?: { value: number, confidence?: number }
      digitalAddon?: { value: number, confidence?: number }
      polarizedAddon?: { value: number, confidence?: number }
      progressiveAddon?: { value: number, confidence?: number }
    }
    highIndex?: {
      trivex160Sv?: { value: number, confidence?: number }
      trivex160Multi?: { value: number, confidence?: number }
      hi166Sv?: { value: number, confidence?: number }
      hi166Multi?: { value: number, confidence?: number }
      hi170Sv?: { value: number, confidence?: number }
      hi170Multi?: { value: number, confidence?: number }
    }
    photochromic?: {
      plasticSv?: { value: number, confidence?: number }
      plasticMulti?: { value: number, confidence?: number }
      glassSv?: { value: number, confidence?: number }
      glassMulti?: { value: number, confidence?: number }
    }
    polarized?: {
      plasticSv?: { value: number, confidence?: number }
      plasticMulti?: { value: number, confidence?: number }
      glassSv?: { value: number, confidence?: number }
      glassMulti?: { value: number, confidence?: number }
      progressiveAddon?: { value: number, confidence?: number }
    }
    misc?: {
      rimlessDrill?: { value: number, confidence?: number }
      edgePolish?: { value: number, confidence?: number }
      lightFilter?: { value: number, confidence?: number }
      edgeCoating?: { value: number, confidence?: number }
      facets?: { value: number, confidence?: number }
    }
  }
}

/**
 * Log missing expected fields for debugging and improvement
 */
function logMissingFields(carrier: string, extracted: ExtractedData) {
  const missing: string[] = []

  // Core copays
  if (!extracted.copays?.examCopay?.value) missing.push('examCopay')
  if (!extracted.copays?.materialsCopay?.value) missing.push('materialsCopay')

  // Frame allowances
  if (!extracted.frame?.allowances?.nonAltairMarchonFrameAllowance?.allowance &&
      !extracted.frame?.allowances?.frameAllowance?.value) {
    missing.push('frameAllowance')
  }

  // Contact lens info - CRITICAL
  if (!extracted.contacts?.clExamAndMaterialsAllowance?.value &&
      !extracted.contacts?.clMaterialsAllowance?.value) {
    missing.push('clAllowance')
  }
  if (!extracted.contacts?.clExamCopay?.value) {
    missing.push('clFittingCopay (CRITICAL - check for "CL Exam Services Charge", "Contact Lens Fitting", etc.)')
  }

  // VSP-specific
  if (carrier === 'vsp') {
    if (!extracted.vspLensEnhancements?.codes?.length) {
      missing.push('vspLensEnhancements.codes')
    }
    if (!extracted.patient?.authNumber?.value) {
      missing.push('authNumber')
    }
  }

  // EyeMed/Spectera progressive tiers
  if (carrier === 'eyemed' || carrier === 'spectera') {
    if (!extracted.copays?.progressiveCopays) {
      missing.push('progressiveCopays')
    }
    if (!extracted.copays?.arCopays) {
      missing.push('arCopays')
    }
  }

  if (missing.length > 0) {
    console.warn(`\n⚠️  [${carrier.toUpperCase()}] MISSING EXPECTED FIELDS:`)
    missing.forEach(field => console.warn(`   - ${field}`))
    console.warn('   Review GPT extraction prompt if these fields should be present on the document.\n')
  } else {
    console.log(`✅ [${carrier.toUpperCase()}] All expected fields extracted successfully`)
  }
}

/**
 * Create VSP authorization from extracted data
 */
async function createVspAuthorization(
  customerId: string,
  data: Record<string, unknown>,
  ocrText?: string
): Promise<string> {
  const extracted = data as ExtractedData

  // Log missing fields for debugging
  logMissingFields('vsp', extracted)

  const planName = extracted.plan?.benefitPlanName?.value ?? 'VSP Vision'

  // Check if this is a lens-only document (no patient info)
  const hasPatientInfo = extracted.patient?.authNumber?.value || extracted.patient?.memberName?.value

  // If no auth number in document, try to find existing active authorization for this customer
  let authNumber: string | undefined = extracted.patient?.authNumber?.value
  let existingAuth: Awaited<ReturnType<typeof prisma.vspAuthorization.findFirst>> = null

  if (!authNumber) {
    // Look for existing active authorization
    existingAuth = await prisma.vspAuthorization.findFirst({
      where: { customerId, isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    if (existingAuth) {
      authNumber = existingAuth.authorizationNumber
      console.log(`[Verify] Found existing VSP authorization ${authNumber} for customer - will merge data`)
    } else {
      authNumber = `VSP-${Date.now()}`
      console.log(`[Verify] No existing authorization found, creating new: ${authNumber}`)
    }
  }

  // First try to use GPT-extracted lens enhancement codes (more reliable)
  // Fall back to OCR text parsing if GPT extraction didn't find codes
  let lensEnhancements: Array<{
    code: string
    description: string
    copaySingleVision: number | null
    copayMultifocal: number | null
    isAddonCode: boolean
    baseCode: string | null
  }> = []

  // Get vspLensCharges for merging with enhancement codes
  const lensCharges = extracted.vspLensCharges

  // VSP code to lensCharges mapping for price lookup
  const getChargePrice = (code: string, type: 'sv' | 'mf'): number | null => {
    if (!lensCharges) return null
    switch (code) {
      // Digital Single Vision (Eyezen, etc.)
      case 'BA': return type === 'sv' ? (lensCharges.digitalSingleVision?.value ?? null) : null
      // Progressives
      case 'KA': return type === 'mf' ? (lensCharges.progressives?.standardK?.plastic ?? null) : null
      case 'KE': return type === 'mf' ? (lensCharges.progressives?.standardK?.glass ?? null) : null
      case 'FA': return type === 'mf' ? (lensCharges.progressives?.premiumF?.plastic ?? null) : null
      case 'FE': return type === 'mf' ? (lensCharges.progressives?.premiumF?.glass ?? null) : null
      case 'JA': return type === 'mf' ? (lensCharges.progressives?.premiumJ?.plastic ?? null) : null
      case 'JE': return type === 'mf' ? (lensCharges.progressives?.premiumJ?.glass ?? null) : null
      case 'NA': return type === 'mf' ? (lensCharges.progressives?.customN ?? null) : null
      case 'OA': return type === 'mf' ? (lensCharges.progressives?.customO ?? null) : null
      // AR Coatings
      case 'QM': return lensCharges.coatings?.arA?.value ?? null
      case 'QT': return lensCharges.coatings?.arC?.value ?? null
      case 'QV': return lensCharges.coatings?.arD?.value ?? null
      // Materials
      case 'AD': return type === 'sv'
        ? (lensCharges.polycarbonate?.baseSv?.value ?? null)
        : (lensCharges.polycarbonate?.baseMulti?.value ?? null)
      case 'AB': return type === 'sv'
        ? (lensCharges.highIndex?.trivex160Sv?.value ?? null)
        : (lensCharges.highIndex?.trivex160Multi?.value ?? null)
      case 'AH': return type === 'sv'
        ? (lensCharges.highIndex?.hi166Sv?.value ?? null)
        : (lensCharges.highIndex?.hi166Multi?.value ?? null)
      case 'AJ': return type === 'sv'
        ? (lensCharges.highIndex?.hi170Sv?.value ?? null)
        : (lensCharges.highIndex?.hi170Multi?.value ?? null)
      // Photochromic
      case 'PR': return type === 'sv'
        ? (lensCharges.photochromic?.plasticSv?.value ?? null)
        : (lensCharges.photochromic?.plasticMulti?.value ?? null)
      // Polarized
      case 'DA': return type === 'sv'
        ? (lensCharges.polarized?.plasticSv?.value ?? null)
        : (lensCharges.polarized?.plasticMulti?.value ?? null)
      // Misc
      case 'SW': return lensCharges.misc?.rimlessDrill?.value ?? null
      case 'SP': return lensCharges.misc?.edgePolish?.value ?? null
      case 'LF': return lensCharges.misc?.lightFilter?.value ?? null
      default: return null
    }
  }

  if (extracted.vspLensEnhancements?.codes && extracted.vspLensEnhancements.codes.length > 0) {
    // Use GPT-extracted codes, but merge with lensCharges prices if codes have null copays
    console.log(`[Verify] Using ${extracted.vspLensEnhancements.codes.length} GPT-extracted VSP codes`)
    lensEnhancements = extracted.vspLensEnhancements.codes.map(code => {
      // Determine if this is an addon code (AR, poly, photochromic)
      const addonCodes = ['QM', 'QT', 'QV', 'QW', 'AD', 'AH', 'AB', 'AJ', 'PR', 'PS']
      const isAddon = addonCodes.includes(code.code)

      // Try to get price from code first, then fallback to lensCharges
      let svPrice = code.copaySingleVision
      let mfPrice = code.copayMultifocal

      if (svPrice === null) {
        svPrice = getChargePrice(code.code, 'sv')
      }
      if (mfPrice === null) {
        mfPrice = getChargePrice(code.code, 'mf')
      }

      return {
        code: code.code,
        description: code.description,
        copaySingleVision: svPrice,
        copayMultifocal: mfPrice,
        isAddonCode: isAddon,
        baseCode: isAddon && code.code.startsWith('Q') ? 'VA' : null,
      }
    })

    // Log how many prices were filled from lensCharges
    const filledFromCharges = lensEnhancements.filter(e =>
      (e.copaySingleVision !== null || e.copayMultifocal !== null)
    ).length
    console.log(`[Verify] ${filledFromCharges} codes have pricing (merged from vspLensCharges where needed)`)
  } else if (ocrText) {
    // Fall back to OCR text parsing
    console.log('[Verify] Falling back to OCR text parsing for VSP codes')
    lensEnhancements = parseVspLensEnhancements(ocrText)
  }

  // Determine plan type from plan name
  let planType: 'SIGNATURE' | 'CHOICE' | 'ADVANTAGE' | 'ESSENTIALS' | 'OTHER' = 'CHOICE'
  const planNameLower = planName.toLowerCase()
  if (planNameLower.includes('signature')) planType = 'SIGNATURE'
  else if (planNameLower.includes('advantage')) planType = 'ADVANTAGE'
  else if (planNameLower.includes('essentials')) planType = 'ESSENTIALS'

  // Deactivate existing authorizations for this customer (except the one we might update)
  await prisma.vspAuthorization.updateMany({
    where: { customerId, isActive: true, authorizationNumber: { not: authNumber } },
    data: { isActive: false }
  })

  // Get extracted values (may be null for lens-only documents)
  const newExamCopay = extracted.copays?.examCopay?.value ?? null
  const newMaterialsCopay = extracted.copays?.materialsCopay?.value ?? null
  const newFrameAllowanceRetail = extracted.frame?.allowances?.nonAltairMarchonFrameAllowance?.allowance ?? null
  const newFrameAllowanceMarchon = extracted.frame?.allowances?.altairMarchonFrameAllowance?.allowance ?? null
  const newFrameOverageDiscount = extracted.frame?.allowances?.nonAltairMarchonFrameAllowance?.overageDiscount ?? null
  const newContactAllowance = extracted.contacts?.clExamAndMaterialsAllowance?.value ??
                              extracted.contacts?.clMaterialsAllowance?.value ?? null
  const newAuthDate = extracted.patient?.authEffectiveDate?.value
  const newExpirationDate = extracted.patient?.authExpirationDate?.value

  // If we have an existing auth, we need to look it up again to get current values
  if (!existingAuth) {
    existingAuth = await prisma.vspAuthorization.findUnique({
      where: { authorizationNumber: authNumber }
    })
  }

  // Build authorization data - MERGE with existing values (preserve non-null existing values)
  const authData = {
    customerId,
    planName: hasPatientInfo ? planName : (existingAuth?.planName ?? planName),
    planType: hasPatientInfo ? planType : (existingAuth?.planType ?? planType),
    // Only update copays if we have new values, otherwise keep existing
    examCopay: newExamCopay ?? existingAuth?.examCopay ?? null,
    materialsCopay: newMaterialsCopay ?? existingAuth?.materialsCopay ?? null,
    frameAllowanceRetail: newFrameAllowanceRetail ?? existingAuth?.frameAllowanceRetail ?? null,
    frameAllowanceMarchon: newFrameAllowanceMarchon ?? existingAuth?.frameAllowanceMarchon ?? null,
    frameOverageDiscount: newFrameOverageDiscount ?? existingAuth?.frameOverageDiscount ?? null,
    // Contact allowance - preserve existing if new is null
    contactAllowance: newContactAllowance ?? existingAuth?.contactAllowance ?? null,
    contactFittingCovered: existingAuth?.contactFittingCovered ?? false,
    authDate: newAuthDate
      ? new Date(newAuthDate)
      : (existingAuth?.authDate ?? new Date()),
    expirationDate: newExpirationDate
      ? new Date(newExpirationDate)
      : (existingAuth?.expirationDate ?? null),
    isActive: true,
    // Merge rawPatientReport - combine existing and new data
    rawPatientReport: existingAuth?.rawPatientReport
      ? mergeRawPatientReport(existingAuth.rawPatientReport as Record<string, unknown>, data)
      : data as Prisma.InputJsonValue,
  }

  let auth
  if (existingAuth) {
    // Update with merged data
    console.log(`[Verify] Updating existing VSP authorization ${authNumber} with merged data`)
    auth = await prisma.vspAuthorization.update({
      where: { authorizationNumber: authNumber },
      data: authData
    })

    // Update lens enhancement copays if we have them
    if (lensEnhancements.length > 0) {
      // Delete old copays and create new ones
      await prisma.vspLensEnhancementCopay.deleteMany({
        where: { authorizationId: auth.id }
      })
      await prisma.vspLensEnhancementCopay.createMany({
        data: lensEnhancements.map(e => ({ ...e, authorizationId: auth.id }))
      })
    }
  } else {
    // Create new authorization
    auth = await prisma.vspAuthorization.create({
      data: {
        ...authData,
        authorizationNumber: authNumber,
        rawLensEnhancements: lensEnhancements.length > 0 ? lensEnhancements : undefined,
        lensEnhancementCopays: lensEnhancements.length > 0 ? {
          create: lensEnhancements
        } : undefined,
      }
    })
  }

  return auth.id
}

/**
 * Create EyeMed authorization from extracted data
 */
async function createEyemedAuthorization(
  customerId: string,
  data: Record<string, unknown>
): Promise<string> {
  const extracted = data as ExtractedData

  // Deactivate existing authorizations for this customer
  await prisma.eyemedAuthorization.updateMany({
    where: { customerId, isActive: true },
    data: { isActive: false }
  })

  // Helper to convert 'covered' to 0
  const copayValue = (val: number | 'covered' | undefined | null): number | null => {
    if (val === 'covered') return 0
    return val ?? null
  }

  const auth = await prisma.eyemedAuthorization.create({
    data: {
      customerId,
      memberId: extracted.patient?.memberId?.value ?? `EYEMED-${Date.now()}`,
      memberName: extracted.patient?.memberName?.value ?? 'Unknown',
      dateOfBirth: extracted.patient?.patientBirthDate?.value
        ? new Date(extracted.patient.patientBirthDate.value)
        : null,
      network: extracted.plan?.network?.value ?? null,
      groupName: extracted.plan?.groupName?.value ?? null,
      groupNumber: extracted.plan?.groupNumber?.value ?? null,
      benefitLevel: extracted.plan?.benefitLevel?.value ?? null,

      // Exam copay
      examCopay: extracted.copays?.examCopay?.value ?? null,

      // Frame benefits
      frameAllowance: extracted.frame?.allowances?.frameAllowance?.value ??
                      extracted.frame?.allowances?.nonAltairMarchonFrameAllowance?.allowance ?? null,
      frameOverageDiscount: 0.20,

      // Basic lens copays
      singleVisionCopay: extracted.copays?.singleVisionCopay?.value ?? null,
      bifocalCopay: extracted.copays?.bifocalCopay?.value ?? null,
      trifocalCopay: extracted.copays?.trifocalCopay?.value ?? null,

      // Progressive lens tier copays
      progressiveStandardCopay: extracted.copays?.progressiveCopays?.standard?.value ?? null,
      progressiveTier1Copay: extracted.copays?.progressiveCopays?.tier1?.value ?? null,
      progressiveTier2Copay: extracted.copays?.progressiveCopays?.tier2?.value ?? null,
      progressiveTier3Copay: extracted.copays?.progressiveCopays?.tier3?.value ?? null,
      progressiveTier4Copay: extracted.copays?.progressiveCopays?.tier4?.value ?? null,
      progressiveTier5Copay: extracted.copays?.progressiveCopays?.tier5?.value ?? null,

      // Material copays
      polycarbonateAdultCopay: copayValue(extracted.copays?.materialCopays?.polycarbonate?.value),
      polycarbonateChildCopay: copayValue(extracted.copays?.materialCopays?.polycarbonateChild?.value),
      trivexCopay: extracted.copays?.materialCopays?.trivex?.value ?? null,
      highIndex167Copay: extracted.copays?.materialCopays?.highIndex167?.value ?? null,
      highIndex174Copay: extracted.copays?.materialCopays?.highIndex174?.value ?? null,

      // Enhancement copays
      photochromicCopay: extracted.copays?.enhancementCopays?.photochromic?.value ?? null,
      polarizedCopay: extracted.copays?.enhancementCopays?.polarized?.value ?? null,
      tintCopay: extracted.copays?.enhancementCopays?.tint?.value ?? null,

      // Contact lens benefits - check both field names
      contactAllowance: extracted.contacts?.clExamAndMaterialsAllowance?.value ??
                        extracted.contacts?.clMaterialsAllowance?.value ?? null,

      isActive: true,
      rawBenefitsData: data as Prisma.InputJsonValue,
    }
  })

  // Create AR coating copays if extracted
  const arCopays = extracted.copays?.arCopays
  if (arCopays) {
    const arTiers = [
      { tier: 'standard', copay: arCopays.standard?.value },
      { tier: 'tier_1', copay: arCopays.tier1?.value },
      { tier: 'tier_2', copay: arCopays.tier2?.value },
      { tier: 'tier_3', copay: arCopays.tier3?.value },
    ].filter(t => t.copay !== undefined && t.copay !== null)

    if (arTiers.length > 0) {
      await prisma.eyemedArCoatingCopay.createMany({
        data: arTiers.map(t => ({
          authorizationId: auth.id,
          tier: t.tier,
          copay: String(t.copay),
        }))
      })
    }
  }

  console.log(`[Verify] Created EyeMed authorization ${auth.id} with tier copays`)
  return auth.id
}

/**
 * Create Spectera authorization from extracted data
 */
async function createSpecteraAuthorization(
  customerId: string,
  data: Record<string, unknown>
): Promise<string> {
  const extracted = data as ExtractedData

  // Deactivate existing authorizations for this customer
  await prisma.specteraAuthorization.updateMany({
    where: { customerId, isActive: true },
    data: { isActive: false }
  })

  // Helper to convert 'covered' to 0
  const copayValue = (val: number | 'covered' | undefined | null): number | null => {
    if (val === 'covered') return 0
    return val ?? null
  }

  const auth = await prisma.specteraAuthorization.create({
    data: {
      customerId,
      subscriberId: extracted.patient?.subscriberId?.value ?? `SPECTERA-${Date.now()}`,
      memberName: extracted.patient?.memberName?.value ?? 'Unknown',
      dateOfBirth: extracted.patient?.patientBirthDate?.value
        ? new Date(extracted.patient.patientBirthDate.value)
        : null,
      productName: extracted.plan?.benefitPlanName?.value ?? null,

      // Exam copay
      examCopay: extracted.copays?.examCopay?.value ?? null,

      // Frame benefits - extract from description like "70% of Balance over $130"
      frameAllowance: extracted.frame?.allowances?.frameAllowance?.value ??
                      extracted.frame?.allowances?.nonAltairMarchonFrameAllowance?.allowance ?? null,
      frameOveragePercent: extracted.frame?.allowances?.frameOveragePercent?.value ?? null,

      // Standard lens copay
      standardLensCopay: extracted.copays?.singleVisionCopay?.value ?? null,

      // Progressive lens tier copays (Spectera uses Tier I-V)
      progressiveTier1Copay: extracted.copays?.progressiveCopays?.tier1?.value ?? null,
      progressiveTier2Copay: extracted.copays?.progressiveCopays?.tier2?.value ?? null,
      progressiveTier3Copay: extracted.copays?.progressiveCopays?.tier3?.value ?? null,
      progressiveTier4Copay: extracted.copays?.progressiveCopays?.tier4?.value ?? null,
      progressiveTier5Copay: extracted.copays?.progressiveCopays?.tier5?.value ?? null,

      // Material copays
      polycarbonateAdultCopay: copayValue(extracted.copays?.materialCopays?.polycarbonate?.value),
      polycarbonateChildCopay: copayValue(extracted.copays?.materialCopays?.polycarbonateChild?.value),
      trivexCopay: extracted.copays?.materialCopays?.trivex?.value ?? null,
      highIndex166: extracted.copays?.materialCopays?.highIndex166?.value ?? null,
      highIndex167to173: extracted.copays?.materialCopays?.highIndex167?.value ?? null,
      highIndex174Copay: extracted.copays?.materialCopays?.highIndex174?.value ?? null,

      // Enhancement copays
      photochromicCopay: extracted.copays?.enhancementCopays?.photochromic?.value ?? null,
      polarizedCopay: extracted.copays?.enhancementCopays?.polarized?.value ?? null,
      tintCopay: extracted.copays?.enhancementCopays?.tint?.value ?? null,

      // Contact lens benefits - check both field names
      nonSelectionClAllowance: extracted.contacts?.clExamAndMaterialsAllowance?.value ??
                               extracted.contacts?.clMaterialsAllowance?.value ?? null,
      selectionClFitCopay: extracted.contacts?.selectionContactLensesFit?.value ?? null,
      nonSelectionClFitCopay: extracted.contacts?.nonSelectionContactLensesFit?.value ?? null,
      selectionClDailyCopay: extracted.contacts?.selectionDailyBiweekly?.value ?? null,
      selectionClMonthlyCopay: extracted.contacts?.selectionMonthly?.value ?? null,

      isActive: true,
      rawBenefitsData: data as Prisma.InputJsonValue,
    }
  })

  // Create AR coating copays if extracted
  const arCopays = extracted.copays?.arCopays
  if (arCopays) {
    const arTiers = [
      { tier: 'tier_1', copay: arCopays.tier1?.value },
      { tier: 'tier_2', copay: arCopays.tier2?.value },
      { tier: 'tier_3', copay: arCopays.tier3?.value },
      { tier: 'tier_4', copay: arCopays.tier4?.value },
    ].filter(t => t.copay !== undefined && t.copay !== null)

    if (arTiers.length > 0) {
      await prisma.specteraArCoatingCopay.createMany({
        data: arTiers.map(t => ({
          authorizationId: auth.id,
          tier: t.tier,
          copay: String(t.copay),
        }))
      })
    }
  }

  console.log(`[Verify] Created Spectera authorization ${auth.id} with tier copays`)
  return auth.id
}

/**
 * Parse VSP lens enhancement copays from OCR text
 */
function parseVspLensEnhancements(ocrText: string): Array<{
  code: string
  description: string
  copaySingleVision: number | null
  copayMultifocal: number | null
  isAddonCode: boolean
  baseCode: string | null
}> {
  const enhancements: Array<{
    code: string
    description: string
    copaySingleVision: number | null
    copayMultifocal: number | null
    isAddonCode: boolean
    baseCode: string | null
  }> = []

  // Pattern to match VSP codes like "KA - Progressive K Plastic $55"
  // or "QM - Anti-Reflective A $41$41"
  const codePattern = /([A-Z]{2})\s*[-–]\s*([^$\n]+?)[\n\s]*\$(\d+)(?:\$(\d+))?/g
  let match

  while ((match = codePattern.exec(ocrText)) !== null) {
    const code = match[1]
    const description = match[2].trim()
    const firstPrice = parseInt(match[3], 10)
    const secondPrice = match[4] ? parseInt(match[4], 10) : null

    // Determine if this is an addon code (AR, poly, photochromic)
    const addonCodes = ['QM', 'QT', 'QV', 'QW', 'AD', 'AH', 'AB', 'AJ', 'PR', 'PS']
    const isAddon = addonCodes.includes(code)

    // For progressives (K, F, J, N, O codes), the price is multifocal only
    const progressiveCodes = ['KA', 'KB', 'FA', 'FB', 'JA', 'JB', 'NA', 'NB', 'OA', 'OB']
    const isProgressive = progressiveCodes.includes(code)

    enhancements.push({
      code,
      description,
      copaySingleVision: isProgressive ? null : (secondPrice ?? firstPrice),
      copayMultifocal: isProgressive ? firstPrice : (secondPrice ?? firstPrice),
      isAddonCode: isAddon,
      baseCode: isAddon && code.startsWith('Q') ? 'VA' : null,
    })
  }

  return enhancements
}

/**
 * Merge two rawPatientReport objects, preferring non-null values from new data
 * but preserving existing non-null values when new values are null
 */
function mergeRawPatientReport(
  existing: Record<string, unknown>,
  newData: Record<string, unknown>
): Prisma.InputJsonValue {
  const merged: Record<string, unknown> = { ...existing }

  // Deep merge each top-level key
  for (const [key, newValue] of Object.entries(newData)) {
    if (newValue === null || newValue === undefined) {
      // Keep existing value
      continue
    }

    if (typeof newValue === 'object' && !Array.isArray(newValue)) {
      // For nested objects, merge recursively
      const existingValue = existing[key] as Record<string, unknown> | undefined
      if (existingValue && typeof existingValue === 'object') {
        merged[key] = mergeNestedObject(existingValue, newValue as Record<string, unknown>)
      } else {
        merged[key] = newValue
      }
    } else {
      // For primitives and arrays, prefer new value if it's not null
      merged[key] = newValue
    }
  }

  return merged as Prisma.InputJsonValue
}

/**
 * Merge nested objects, preferring non-null new values
 */
function mergeNestedObject(
  existing: Record<string, unknown>,
  newData: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...existing }

  for (const [key, newValue] of Object.entries(newData)) {
    // Check if this is a field with {value, confidence} structure
    if (newValue && typeof newValue === 'object' && 'value' in newValue) {
      const typedNewValue = newValue as { value: unknown; confidence: number }
      const existingValue = existing[key] as { value: unknown; confidence: number } | undefined

      // Only update if new value is not null and has reasonable confidence
      if (typedNewValue.value !== null && typedNewValue.value !== undefined) {
        merged[key] = newValue
      } else if (existingValue?.value !== null && existingValue?.value !== undefined) {
        // Keep existing non-null value
        merged[key] = existingValue
      }
    } else if (newValue !== null && newValue !== undefined) {
      merged[key] = newValue
    }
  }

  return merged
}
