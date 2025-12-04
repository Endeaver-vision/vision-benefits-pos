import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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
        ? 'Document verified and authorization created'
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
    clExamAndMaterialsAllowance?: { value: number }
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

  const planName = extracted.plan?.benefitPlanName?.value ?? 'VSP Vision'
  const authNumber = extracted.patient?.authNumber?.value ?? `VSP-${Date.now()}`

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

  if (extracted.vspLensEnhancements?.codes && extracted.vspLensEnhancements.codes.length > 0) {
    // Use GPT-extracted codes
    console.log(`[Verify] Using ${extracted.vspLensEnhancements.codes.length} GPT-extracted VSP codes`)
    lensEnhancements = extracted.vspLensEnhancements.codes.map(code => {
      // Determine if this is an addon code (AR, poly, photochromic)
      const addonCodes = ['QM', 'QT', 'QV', 'QW', 'AD', 'AH', 'AB', 'AJ', 'PR', 'PS']
      const isAddon = addonCodes.includes(code.code)
      return {
        code: code.code,
        description: code.description,
        copaySingleVision: code.copaySingleVision,
        copayMultifocal: code.copayMultifocal,
        isAddonCode: isAddon,
        baseCode: isAddon && code.code.startsWith('Q') ? 'VA' : null,
      }
    })
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

  // Build authorization data
  const authData = {
    customerId,
    planName,
    planType,
    examCopay: extracted.copays?.examCopay?.value ?? null,
    materialsCopay: extracted.copays?.materialsCopay?.value ?? null,
    frameAllowanceRetail: extracted.frame?.allowances?.nonAltairMarchonFrameAllowance?.allowance ?? null,
    frameAllowanceMarchon: extracted.frame?.allowances?.altairMarchonFrameAllowance?.allowance ?? null,
    frameOverageDiscount: extracted.frame?.allowances?.nonAltairMarchonFrameAllowance?.overageDiscount ?? 20,
    contactAllowance: extracted.contacts?.clExamAndMaterialsAllowance?.value ?? null,
    contactFittingCovered: false, // VSP typically doesn't cover fitting
    authDate: extracted.patient?.authEffectiveDate?.value
      ? new Date(extracted.patient.authEffectiveDate.value)
      : new Date(),
    expirationDate: extracted.patient?.authExpirationDate?.value
      ? new Date(extracted.patient.authExpirationDate.value)
      : null,
    isActive: true,
    rawPatientReport: data as Prisma.InputJsonValue,
  }

  // Check if authorization exists
  const existingAuth = await prisma.vspAuthorization.findUnique({
    where: { authorizationNumber: authNumber }
  })

  let auth
  if (existingAuth) {
    // Always update with latest extracted data
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

      // Contact lens benefits
      contactAllowance: extracted.contacts?.clExamAndMaterialsAllowance?.value ?? null,

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
      frameOveragePercent: extracted.frame?.allowances?.frameOveragePercent?.value ?? 0.70,

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

      // Contact lens benefits
      nonSelectionClAllowance: extracted.contacts?.clExamAndMaterialsAllowance?.value ?? null,
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
