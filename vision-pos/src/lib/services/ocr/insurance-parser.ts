// Insurance Document Processing Orchestrator
// Simplified: GPT-4o Vision handles OCR + extraction, then auto-saves to authorization

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { processDocumentWithVision } from './ocr-service'
import { calculateOverallConfidence } from './gpt-extraction'
import { detectCarrier, detectDocumentType, countNullFields, countLowConfidenceFields } from './carrier-detection'
import type { ExtractedInsuranceData } from '@/types/insurance-document'

/**
 * Build copays JSON for unified InsuranceAuthorization table
 * Maps extracted data to our standardized copay field names
 */
function buildCopaysJson(extractedData: ExtractedInsuranceData): Record<string, number | string | null> {
  const copays: Record<string, number | string | null> = {}
  const ed = extractedData.copays as Record<string, unknown>

  // Helper to extract value - handles both numbers and discount strings
  const extractValue = (val: unknown): number | string | null => {
    if (val === null || val === undefined) return null
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      if (val.startsWith('DISCOUNT_')) return val
      const num = parseFloat(val)
      if (!isNaN(num)) return num
      return val
    }
    if (typeof val === 'object' && val !== null && 'value' in val) {
      return extractValue((val as { value: unknown }).value)
    }
    return null
  }

  // Exam copay
  copays.examCopay = extractValue(extractedData.copays?.examCopay)

  // Single vision / bifocal / trifocal
  copays.singleVision = extractValue(extractedData.copays?.singleVisionCopay)
  copays.bifocal = extractValue(extractedData.copays?.bifocalCopay)
  copays.trifocal = extractValue(extractedData.copays?.trifocalCopay)

  // Progressive tiers
  const progCopays = (ed?.progressiveCopays as Record<string, { value: number | string | null }>) || {}
  copays.progressiveStandard = extractValue(progCopays?.standard) ?? extractValue(ed?.progressiveStandardCopay)
  copays.progressiveTier1 = extractValue(progCopays?.tier1) ?? extractValue(ed?.progressiveTier1Copay)
  copays.progressiveTier2 = extractValue(progCopays?.tier2) ?? extractValue(ed?.progressiveTier2Copay)
  copays.progressiveTier3 = extractValue(progCopays?.tier3) ?? extractValue(ed?.progressiveTier3Copay)
  copays.progressiveTier4 = extractValue(progCopays?.tier4) ?? extractValue(ed?.progressiveTier4Copay)
  copays.progressiveTier5 = extractValue(progCopays?.tier5) ?? extractValue(ed?.progressiveTier5Copay)

  // AR coating tiers
  const arCopays = (ed?.arCopays as Record<string, { value: number | string | null }>) || {}
  copays.arStandard = extractValue(arCopays?.standard) ?? extractValue(ed?.arStandardCopay)
  copays.arTier1 = extractValue(arCopays?.tier1) ?? extractValue(ed?.arTier1Copay)
  copays.arTier2 = extractValue(arCopays?.tier2) ?? extractValue(ed?.arTier2Copay)
  copays.arTier3 = extractValue(arCopays?.tier3) ?? extractValue(ed?.arTier3Copay)

  // Material copays
  const matCopays = (ed?.materialCopays as Record<string, { value: number | string | null }>) || {}
  const enhCopays = (ed?.enhancementCopays as Record<string, { value: number | string | null }>) || {}

  copays.polycarbonate = extractValue(matCopays?.polycarbonate) ?? extractValue(ed?.polycarbonateAdultCopay)
  copays.polycarbonateChild = extractValue(matCopays?.polycarbonateChild) ?? extractValue(ed?.polycarbonateChildCopay)
  copays.trivex = extractValue(matCopays?.trivex) ?? extractValue(ed?.trivexCopay)
  copays.highIndex167 = extractValue(matCopays?.highIndex167) ?? extractValue(ed?.highIndex167Copay)
  copays.highIndex174 = extractValue(matCopays?.highIndex174) ?? extractValue(ed?.highIndex174Copay)

  // Enhancement copays
  copays.photochromic = extractValue(matCopays?.photochromic) ?? extractValue(enhCopays?.photochromic) ?? extractValue(ed?.photochromicCopay)
  copays.polarized = extractValue(matCopays?.polarized) ?? extractValue(enhCopays?.polarized) ?? extractValue(ed?.polarizedCopay)
  copays.tint = extractValue(matCopays?.tint) ?? extractValue(enhCopays?.tint) ?? extractValue(ed?.tintCopay)
  copays.blueLight = extractValue(matCopays?.blueLightFilter) ?? extractValue(enhCopays?.blueLightFilter) ?? extractValue(ed?.blueLightFilterCopay)
  copays.uvTreatment = extractValue(matCopays?.uvCoating) ?? extractValue(matCopays?.uvTreatment) ?? extractValue(enhCopays?.uvTreatment) ?? extractValue(ed?.uvTreatmentCopay)
  copays.scratchCoating = extractValue(matCopays?.scratchCoating) ?? extractValue(enhCopays?.scratchCoating) ?? extractValue(ed?.scratchCoatingCopay)

  // All Other Lens Options - EyeMed's catchall
  copays.allOtherLensOptions = extractValue(ed?.allOtherLensOptions) ?? extractValue(matCopays?.allOther) ?? extractValue(enhCopays?.allOther)

  // Contact lens fit copay
  const clFit = extractedData.clFit as Record<string, unknown> | undefined
  if (clFit) {
    copays.clFitStandard = extractValue(clFit.standardCost)
    copays.clFitPremium = extractValue(clFit.premiumCost)
  }

  // Frame overage discount percentage
  const frame = extractedData.frame as Record<string, unknown> | undefined
  const frameAllowances = frame?.allowances as Record<string, unknown> | undefined
  if (frameAllowances?.frameOveragePercent) {
    copays.frameOveragePercent = extractValue(frameAllowances.frameOveragePercent)
  }

  return copays
}

/**
 * Create or update InsuranceAuthorization from extracted data
 */
async function saveAuthorization(
  documentId: string,
  customerId: string,
  carrier: string,
  extractedData: ExtractedInsuranceData,
  confidenceScore: number
): Promise<string> {
  const copays = buildCopaysJson(extractedData)

  // Get customer name for the authorization
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { firstName: true, lastName: true },
  })

  const memberName = extractedData?.patient?.memberName?.value ||
    extractedData?.patient?.patientName?.value ||
    `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
    'Unknown'

  // Find existing active authorization for this carrier
  const existingAuth = await prisma.insuranceAuthorization.findFirst({
    where: {
      customerId,
      carrier: carrier.toUpperCase(),
      isActive: true,
    },
  })

  const authData = {
    customerId,
    carrier: carrier.toUpperCase(),
    planName: extractedData?.plan?.benefitPlanName?.value || null,
    memberId: extractedData?.patient?.memberId?.value || null,
    memberName,

    // Eligibility
    examEligible: extractedData?.eligibility?.examProfServices?.value !== null,
    lensesEligible: extractedData?.eligibility?.lens?.value !== null,
    frameEligible: extractedData?.eligibility?.frame?.value !== null,
    contactsEligible: extractedData?.eligibility?.contacts?.value !== null,

    // Core allowances
    frameAllowance: extractedData?.frame?.allowances?.retailMinAllowance?.value ??
      extractedData?.frame?.allowances?.nonAltairMarchonFrameAllowance?.allowance ?? null,
    contactAllowance: extractedData?.contacts?.contactAllowance?.value ??
      extractedData?.contacts?.clExamAndMaterialsAllowance?.value ??
      extractedData?.decliningBalance?.clStarting?.value ?? null,
    // Flag if contact allowance comes from declining balance (EyeMed style)
    isContactDecliningBalance: extractedData?.decliningBalance?.clStarting?.value != null,
    examCopay: copays.examCopay ?? null,
    materialsCopay: copays.singleVision ?? null,

    // All copays in JSON
    copays: copays as unknown as Prisma.InputJsonValue,

    // Raw data for debugging
    rawExtractedData: extractedData as unknown as Prisma.InputJsonValue,
    confidenceScore,

    // Status
    isActive: true,
    usedForOrder: false,
  }

  let authorizationId: string

  if (existingAuth) {
    await prisma.insuranceAuthorization.update({
      where: { id: existingAuth.id },
      data: authData,
    })
    authorizationId = existingAuth.id
    console.log(`✅ Updated ${carrier} authorization ${existingAuth.id} for customer ${customerId}`)
  } else {
    const newAuth = await prisma.insuranceAuthorization.create({
      data: authData,
    })
    authorizationId = newAuth.id
    console.log(`✅ Created ${carrier} authorization ${newAuth.id} for customer ${customerId}`)
  }

  // Link document to authorization
  await prisma.insuranceDocument.update({
    where: { id: documentId },
    data: { authorizationId },
  })

  return authorizationId
}

/**
 * Complete workflow: GPT-4o Vision OCR + extraction + auto-save to authorization
 */
export async function processInsuranceDocument(
  documentId: string,
  filePath: string
): Promise<{
  ocrSuccess: boolean
  gptSuccess: boolean
  extractedData?: ExtractedInsuranceData
  authorizationId?: string
  error?: string
  timing?: {
    ocrMs: number
    gptMs: number
    totalMs: number
  }
}> {
  try {
    // Step 1: Update status to processing
    await prisma.insuranceDocument.update({
      where: { id: documentId },
      data: { ocrStatus: 'processing', gptStatus: 'processing' },
    })

    // Step 2: Process with GPT-4o Vision (OCR + extraction in one call)
    const result = await processDocumentWithVision(filePath)

    if (!result.success || !result.extractedData) {
      await prisma.insuranceDocument.update({
        where: { id: documentId },
        data: {
          ocrStatus: 'failed',
          gptStatus: 'failed',
          ocrError: result.error || 'Document processing failed',
          gptError: result.error || 'Document processing failed',
        },
      })
      return {
        ocrSuccess: false,
        gptSuccess: false,
        error: result.error || 'Document processing failed',
      }
    }

    const extractedData = result.extractedData

    // Step 3: Get document info
    const document = await prisma.insuranceDocument.findUnique({
      where: { id: documentId },
      select: { fileName: true, customerId: true },
    })
    const fileName = document?.fileName || ''
    const customerId = document?.customerId

    // Step 4: Detect carrier
    const extractedCarrier = extractedData.plan?.carrier?.value
    const detectedCarrier = extractedCarrier || detectCarrier(result.rawText || '', fileName)
    const detectedDocType = detectDocumentType(result.rawText || '', fileName)

    console.log(`🔍 Detected: ${detectedCarrier || 'UNKNOWN'} - ${detectedDocType}`)

    // Calculate confidence
    const overallConfidence = extractedData.overallConfidence || calculateOverallConfidence(extractedData)

    // Log extraction stats
    const nullFieldsCount = countNullFields(extractedData)
    const lowConfidenceFieldsCount = countLowConfidenceFields(extractedData, 0.7)
    console.log(`📊 Extraction: ${(overallConfidence * 100).toFixed(1)}% confidence, ${nullFieldsCount} null fields, ${lowConfidenceFieldsCount} low confidence`)

    // Step 5: Save extracted data to document
    await prisma.insuranceDocument.update({
      where: { id: documentId },
      data: {
        rawOcrText: result.rawText || null,
        ocrStatus: 'completed',
        carrier: detectedCarrier || undefined,
        planName: extractedData.plan?.benefitPlanName?.value || undefined,
        memberId: extractedData.patient?.memberId?.value || extractedData.patient?.authNumber?.value || undefined,
        confidenceScore: overallConfidence,
        extractedData: extractedData as unknown as Prisma.InputJsonValue,
        gptStatus: 'completed',
      },
    })

    // Step 6: Auto-save to authorization if customer is linked
    let authorizationId: string | undefined
    if (customerId && detectedCarrier) {
      try {
        authorizationId = await saveAuthorization(
          documentId,
          customerId,
          detectedCarrier,
          extractedData,
          overallConfidence
        )
      } catch (authError) {
        console.error('Failed to save authorization:', authError)
        // Don't fail the whole process if auth save fails
      }
    } else {
      console.log('⚠️ No customer linked or carrier not detected, skipping authorization')
    }

    return {
      ocrSuccess: true,
      gptSuccess: true,
      extractedData,
      authorizationId,
      timing: result.timing,
    }
  } catch (error) {
    console.error('Error processing insurance document:', error)

    await prisma.insuranceDocument.update({
      where: { id: documentId },
      data: {
        gptStatus: 'failed',
        gptError: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return {
      ocrSuccess: true,
      gptSuccess: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get all documents for a customer
 */
export async function getCustomerDocuments(customerId: string) {
  return prisma.insuranceDocument.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
  })
}
