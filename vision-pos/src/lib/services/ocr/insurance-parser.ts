// Insurance Document Processing Orchestrator
// Simplified: GPT-4o Vision handles OCR + extraction in one call

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { processDocumentWithVision } from './ocr-service'
import { calculateOverallConfidence } from './gpt-extraction'
import { detectCarrier, detectDocumentType, countNullFields, countLowConfidenceFields } from './carrier-detection'
import type { ExtractedInsuranceData } from '@/types/insurance-document'

/**
 * Complete workflow: Single GPT-4o Vision call for OCR + extraction
 */
export async function processInsuranceDocument(
  documentId: string,
  filePath: string
): Promise<{
  ocrSuccess: boolean
  gptSuccess: boolean
  extractedData?: ExtractedInsuranceData
  error?: string
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

    // Step 3: Get filename for additional carrier detection
    const document = await prisma.insuranceDocument.findUnique({
      where: { id: documentId },
      select: { fileName: true },
    })
    const fileName = document?.fileName || ''

    // Step 4: Detect carrier (from extracted data or filename)
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

    // Step 5: Save extracted data (single step - OCR and GPT done together)
    await prisma.insuranceDocument.update({
      where: { id: documentId },
      data: {
        rawOcrText: result.rawText || null, // Store the raw GPT response
        ocrProcessedAt: new Date(),
        ocrStatus: 'completed',
        carrier: extractedData.plan?.carrier?.value || detectedCarrier || undefined,
        planName: extractedData.plan?.benefitPlanName?.value || undefined,
        memberId: extractedData.patient?.authNumber?.value || undefined,
        groupNumber: extractedData.patient?.relationship?.value || undefined,
        copayExam: extractedData.copays?.examCopay?.value ?? undefined,
        copayMaterials: extractedData.copays?.materialsCopay?.value ?? undefined,
        frameAllowance: extractedData.frame?.allowances?.altairMarchonFrameAllowance?.allowance ?? undefined,
        lensAllowance: extractedData.frame?.allowances?.nonAltairMarchonFrameAllowance?.allowance ?? undefined,
        contactAllowance: extractedData.contacts?.clExamAndMaterialsAllowance?.value ?? undefined,
        networkTier: extractedData.plan?.networkLabRequirement?.value || undefined,
        effectiveDate: extractedData.patient?.authEffectiveDate?.value
          ? new Date(extractedData.patient.authEffectiveDate.value)
          : null,
        expirationDate: extractedData.patient?.authExpirationDate?.value
          ? new Date(extractedData.patient.authExpirationDate.value)
          : null,
        confidenceScore: overallConfidence,
        extractedData: extractedData as unknown as Prisma.InputJsonValue,
        gptProcessedAt: new Date(),
        gptStatus: 'completed',
      },
    })

    // Optional: merge all docs in the same case into a consolidated record
    const doc = await prisma.insuranceDocument.findUnique({ where: { id: documentId } })
    if (doc?.caseId) {
      try {
        const docsInCase = await prisma.insuranceDocument.findMany({
          where: { caseId: doc.caseId, gptStatus: 'completed' },
          select: { extractedData: true, fileName: true },
        })
        const merged = mergeExtractedData(
          docsInCase.map((d) => ({
            fileName: d.fileName,
            data: d.extractedData as unknown as ExtractedInsuranceData,
          }))
        )
        await prisma.insuranceCase.update({
          where: { id: doc.caseId },
          data: {
            mergedData: merged ? (merged as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
            mergedAt: new Date(),
          },
        })
      } catch (e) {
        console.error('Failed to merge case data:', e)
      }
    }

    return {
      ocrSuccess: true,
      gptSuccess: true,
      extractedData,
    }
  } catch (error) {
    console.error('Error processing insurance document:', error)

    // Update error status
    await prisma.insuranceDocument.update({
      where: { id: documentId },
      data: {
        gptStatus: 'failed',
        gptError: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return {
      ocrSuccess: true, // OCR succeeded if we got here
      gptSuccess: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function mergeExtractedData(
  docs: { fileName: string; data: ExtractedInsuranceData }[]
): ExtractedInsuranceData | null {
  if (!docs.length) return null

  const isEnhancementDoc = (name: string) => /lens|enhance|lens-?enh/i.test(name)
  const enhancementsDocs = docs.filter((d) => isEnhancementDoc(d.fileName))
  const datasets = docs.map((d) => d.data)

  const mergeArray = (arrays: unknown[][]) =>
    Array.from(new Set(arrays.flat().filter(Boolean)))

  const base = (docs.find((d) => !isEnhancementDoc(d.fileName))?.data ||
    docs[0].data) as ExtractedInsuranceData
  const merged: ExtractedInsuranceData = JSON.parse(JSON.stringify(base))

  const fields = [
    'patient',
    'conditions',
    'eligibility',
    'plan',
    'copays',
    'frame',
    'contacts',
    'valueAdded',
    'enhancements',
    'disclaimers',
  ] as const

  for (const f of fields) {
    if (f === 'enhancements') {
      const sources = enhancementsDocs.length
        ? enhancementsDocs.map((d) => d.data)
        : datasets
      merged.enhancements = merged.enhancements || {
        covered: { value: null, confidence: 0 },
        coveredWithAdditionalCopay: { value: null, confidence: 0 },
        coveredWithAdditionalCopayOr80Uc: { value: null, confidence: 0 },
      }
      merged.enhancements.covered = {
        value: mergeArray(
          sources.map((d) => (d.enhancements?.covered?.value as string[]) || [])
        ) as string[],
        confidence: sources.length ? 0.95 : 0.8,
      }
      merged.enhancements.coveredWithAdditionalCopay = {
        value: mergeArray(
          sources.map(
            (d) =>
              (d.enhancements?.coveredWithAdditionalCopay?.value as string[]) ||
              []
          )
        ) as string[],
        confidence: sources.length ? 0.95 : 0.8,
      }
      merged.enhancements.coveredWithAdditionalCopayOr80Uc = {
        value: mergeArray(
          sources.map(
            (d) =>
              (d.enhancements?.coveredWithAdditionalCopayOr80Uc
                ?.value as string[]) || []
          )
        ) as string[],
        confidence: sources.length ? 0.95 : 0.8,
      }
      continue
    }
    const target = (merged as Record<string, unknown>)[f] as Record<
      string,
      unknown
    >
    if (!target) continue

    for (const ds of datasets) {
      const src = (ds as Record<string, unknown>)[f] as Record<string, unknown>
      if (!src || typeof src !== 'object') continue
      for (const [k, v] of Object.entries(src)) {
        if (
          v &&
          typeof v === 'object' &&
          'value' in v &&
          typeof (v as { confidence?: unknown }).confidence === 'number'
        ) {
          if (
            !target[k] ||
            (target[k] as { value: unknown }).value == null
          ) {
            target[k] = v
          }
        } else if (v && typeof v === 'object') {
          target[k] = { ...(target[k] as object || {}), ...(v as object) }
        }
      }
    }
  }

  merged.overallConfidence =
    datasets.reduce((sum, d) => sum + (d.overallConfidence || 0), 0) /
    datasets.length
  merged.notes = datasets
    .map((d) => d.notes)
    .filter(Boolean)
    .join(' | ')
  return merged
}

/**
 * Verify and save corrections to an insurance document
 * Creates carrier-specific authorization records for use in Vision POS
 */
export async function verifyInsuranceDocument(
  documentId: string,
  verifiedBy: string,
  corrections?: Partial<{
    carrier: string
    planName: string
    memberId: string
    groupNumber: string
    copayExam: number
    copayMaterials: number
    frameAllowance: number
    lensAllowance: number
    contactAllowance: number
    networkTier: string
    effectiveDate: Date
    expirationDate: Date
  }>,
  notes?: string
): Promise<void> {
  // Get the full document with extracted data
  const document = await prisma.insuranceDocument.findUnique({
    where: { id: documentId },
    include: { customer: true },
  })

  if (!document) {
    throw new Error('Document not found')
  }

  // Update the document as verified
  await prisma.insuranceDocument.update({
    where: { id: documentId },
    data: {
      ...corrections,
      verifiedBy,
      verifiedAt: new Date(),
      isVerified: true,
      verificationNotes: notes,
    },
  })

  // If no customer linked, skip authorization creation
  if (!document.customerId) {
    console.log('No customer linked to document, skipping authorization creation')
    return
  }

  // Merge corrections with extracted data
  const carrier = corrections?.carrier || document.carrier
  const extractedData = document.extractedData as ExtractedInsuranceData | null

  // Create carrier-specific authorization based on detected carrier
  if (carrier?.toUpperCase() === 'EYEMED') {
    await createEyemedAuthorization(document, extractedData, corrections)
  } else if (carrier?.toUpperCase() === 'SPECTERA') {
    await createSpecteraAuthorization(document, extractedData, corrections)
  } else if (carrier?.toUpperCase() === 'VSP') {
    await createVspAuthorization(document, extractedData, corrections)
  } else {
    console.log(`Unknown carrier "${carrier}", skipping authorization creation`)
  }
}

/**
 * Create EyeMed authorization record from verified document
 */
async function createEyemedAuthorization(
  document: { customerId: string | null; memberId: string | null; groupNumber: string | null; customer: { firstName: string; lastName: string; dateOfBirth: Date | null } | null },
  extractedData: ExtractedInsuranceData | null,
  corrections?: Record<string, unknown>
) {
  if (!document.customerId) return

  const memberId =
    (corrections?.memberId as string) ||
    document.memberId ||
    extractedData?.patient?.authNumber?.value ||
    'UNKNOWN'
  const memberName =
    extractedData?.patient?.memberName?.value ||
    extractedData?.patient?.patientName?.value ||
    `${document.customer?.firstName || ''} ${document.customer?.lastName || ''}`.trim() ||
    'Unknown'

  // Check if authorization already exists for this member
  const existing = await prisma.eyemedAuthorization.findFirst({
    where: {
      customerId: document.customerId,
      isActive: true,
    },
  })

  const authData = {
    customerId: document.customerId,
    memberId,
    memberName,
    dateOfBirth: document.customer?.dateOfBirth || null,
    network: extractedData?.plan?.networkLabRequirement?.value || null,
    groupName: extractedData?.plan?.clientName?.value || null,
    groupNumber:
      (corrections?.groupNumber as string) || document.groupNumber || null,

    // Service eligibility
    examEligible: extractedData?.eligibility?.examProfServices?.value !== null,
    lensesEligible: extractedData?.eligibility?.lens?.value !== null,
    frameEligible: extractedData?.eligibility?.frame?.value !== null,
    contactsEligible: extractedData?.eligibility?.contacts?.value !== null,

    // Copays
    examCopay:
      (corrections?.copayExam as number) ??
      extractedData?.copays?.examCopay?.value ??
      null,

    // Frame benefits
    frameAllowance:
      (corrections?.frameAllowance as number) ??
      extractedData?.frame?.allowances?.nonAltairMarchonFrameAllowance
        ?.allowance ??
      null,
    frameOverageDiscount:
      extractedData?.frame?.allowances?.nonAltairMarchonFrameAllowance
        ?.overageDiscount ?? null,

    // Lens copays
    singleVisionCopay:
      (corrections?.copayMaterials as number) ??
      extractedData?.copays?.materialsCopay?.value ??
      null,

    // Contact lens benefits
    contactAllowance:
      (corrections?.contactAllowance as number) ??
      extractedData?.contacts?.clExamAndMaterialsAllowance?.value ??
      null,

    // Authorization validity
    dateOfService: corrections?.effectiveDate
      ? new Date(corrections.effectiveDate as string)
      : new Date(),
    expirationDate: corrections?.expirationDate
      ? new Date(corrections.expirationDate as string)
      : null,

    // Status
    isActive: true,
    usedForOrder: false,

    // Raw data storage
    rawBenefitsData: extractedData
      ? (extractedData as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  }

  if (existing) {
    await prisma.eyemedAuthorization.update({
      where: { id: existing.id },
      data: authData,
    })
    console.log(
      `Updated EyeMed authorization ${existing.id} for customer ${document.customerId}`
    )
  } else {
    const newAuth = await prisma.eyemedAuthorization.create({
      data: authData,
    })
    console.log(
      `Created EyeMed authorization ${newAuth.id} for customer ${document.customerId}`
    )
  }
}

/**
 * Create Spectera authorization record from verified document
 */
async function createSpecteraAuthorization(
  document: { customerId: string | null; memberId: string | null; groupNumber: string | null; customer: { firstName: string; lastName: string; dateOfBirth: Date | null } | null },
  extractedData: ExtractedInsuranceData | null,
  corrections?: Record<string, unknown>
) {
  if (!document.customerId) return

  const subscriberId =
    (corrections?.memberId as string) ||
    document.memberId ||
    extractedData?.patient?.authNumber?.value ||
    'UNKNOWN'
  const memberName =
    extractedData?.patient?.memberName?.value ||
    extractedData?.patient?.patientName?.value ||
    `${document.customer?.firstName || ''} ${document.customer?.lastName || ''}`.trim() ||
    'Unknown'

  // Check if authorization already exists
  const existing = await prisma.specteraAuthorization.findFirst({
    where: {
      customerId: document.customerId,
      isActive: true,
    },
  })

  const authData = {
    customerId: document.customerId,
    subscriberId,
    memberName,
    dateOfBirth: document.customer?.dateOfBirth || null,
    productName: extractedData?.plan?.benefitPlanName?.value || null,

    // Service eligibility
    examEligible: extractedData?.eligibility?.examProfServices?.value !== null,
    frameEligible: extractedData?.eligibility?.frame?.value !== null,
    lensesEligible: extractedData?.eligibility?.lens?.value !== null,

    // Copays
    examCopay:
      (corrections?.copayExam as number) ??
      extractedData?.copays?.examCopay?.value ??
      null,
    standardLensCopay:
      (corrections?.copayMaterials as number) ??
      extractedData?.copays?.materialsCopay?.value ??
      null,

    // Frame benefits
    frameAllowance:
      (corrections?.frameAllowance as number) ??
      extractedData?.frame?.allowances?.nonAltairMarchonFrameAllowance
        ?.allowance ??
      null,

    // Contact lens benefits
    nonSelectionClAllowance:
      (corrections?.contactAllowance as number) ??
      extractedData?.contacts?.clExamAndMaterialsAllowance?.value ??
      null,

    // Authorization validity
    dateOfService: corrections?.effectiveDate
      ? new Date(corrections.effectiveDate as string)
      : new Date(),
    expirationDate: corrections?.expirationDate
      ? new Date(corrections.expirationDate as string)
      : null,

    // Status
    isActive: true,
    usedForOrder: false,

    // Raw data storage
    rawBenefitsData: extractedData
      ? (extractedData as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  }

  if (existing) {
    await prisma.specteraAuthorization.update({
      where: { id: existing.id },
      data: authData,
    })
    console.log(
      `Updated Spectera authorization ${existing.id} for customer ${document.customerId}`
    )
  } else {
    const newAuth = await prisma.specteraAuthorization.create({
      data: authData,
    })
    console.log(
      `Created Spectera authorization ${newAuth.id} for customer ${document.customerId}`
    )
  }
}

/**
 * Create VSP authorization record from verified document
 */
async function createVspAuthorization(
  document: { customerId: string | null; memberId: string | null; customer: { firstName: string; lastName: string; dateOfBirth: Date | null } | null },
  extractedData: ExtractedInsuranceData | null,
  corrections?: Record<string, unknown>
) {
  if (!document.customerId) return

  const authNumber =
    (corrections?.memberId as string) ||
    document.memberId ||
    extractedData?.patient?.authNumber?.value

  if (!authNumber) {
    console.log('No authorization number found, skipping VSP authorization creation')
    return
  }

  // Check if authorization already exists
  const existing = await prisma.vspAuthorization.findFirst({
    where: {
      authorizationNumber: authNumber,
    },
  })

  const authData = {
    customerId: document.customerId,
    authorizationNumber: authNumber,
    planName: extractedData?.plan?.benefitPlanName?.value || 'VSP Plan',
    planType: 'OTHER' as const,

    // Copays
    examCopay:
      (corrections?.copayExam as number) ??
      extractedData?.copays?.examCopay?.value ??
      null,
    materialsCopay:
      (corrections?.copayMaterials as number) ??
      extractedData?.copays?.materialsCopay?.value ??
      null,

    // Frame allowances
    frameAllowanceRetail:
      extractedData?.frame?.allowances?.nonAltairMarchonFrameAllowance
        ?.allowance ?? null,
    frameAllowanceMarchon:
      extractedData?.frame?.allowances?.altairMarchonFrameAllowance?.allowance ??
      null,
    frameOverageDiscount:
      extractedData?.frame?.allowances?.nonAltairMarchonFrameAllowance
        ?.overageDiscount ?? null,

    // Contact lens
    contactAllowance:
      (corrections?.contactAllowance as number) ??
      extractedData?.contacts?.clExamAndMaterialsAllowance?.value ??
      null,

    // Authorization validity
    authDate: corrections?.effectiveDate
      ? new Date(corrections.effectiveDate as string)
      : new Date(),
    expirationDate: corrections?.expirationDate
      ? new Date(corrections.expirationDate as string)
      : null,

    // Status
    isActive: true,
    usedForOrder: false,

    // Raw data storage
    rawPatientReport: extractedData
      ? (extractedData as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  }

  if (existing) {
    // Merge rawPatientReport to preserve data from different documents
    // (e.g., patient record has CL fitting data, lens enhancement has copay tiers)
    const existingRaw = existing.rawPatientReport as Record<string, unknown> | null
    const newRaw = extractedData as Record<string, unknown> | null

    if (existingRaw && newRaw) {
      // Merge contacts data - preserve non-null values from existing
      const existingContacts = existingRaw.contacts as Record<string, unknown> | undefined
      const newContacts = newRaw.contacts as Record<string, unknown> | undefined

      if (existingContacts && newContacts) {
        // Merge each field, preferring non-null new values, keeping existing if new is null
        const mergedContacts: Record<string, unknown> = { ...existingContacts }
        for (const [key, newVal] of Object.entries(newContacts)) {
          const newValObj = newVal as { value: unknown; confidence: number } | undefined
          const existingVal = existingContacts[key] as { value: unknown; confidence: number } | undefined

          // Only overwrite if new value is non-null with good confidence
          if (newValObj?.value !== null && newValObj?.value !== undefined && newValObj?.confidence > 0) {
            mergedContacts[key] = newVal
          } else if (existingVal?.value !== null && existingVal?.value !== undefined) {
            // Keep existing non-null value
            mergedContacts[key] = existingVal
          }
        }
        newRaw.contacts = mergedContacts
      } else if (existingContacts) {
        // New doesn't have contacts, keep existing
        newRaw.contacts = existingContacts
      }

      authData.rawPatientReport = newRaw as unknown as Prisma.InputJsonValue
    }

    await prisma.vspAuthorization.update({
      where: { id: existing.id },
      data: authData,
    })
    console.log(
      `Updated VSP authorization ${existing.id} for customer ${document.customerId} (merged data)`
    )
  } else {
    const newAuth = await prisma.vspAuthorization.create({
      data: authData,
    })
    console.log(
      `Created VSP authorization ${newAuth.id} for customer ${document.customerId}`
    )
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

/**
 * Get documents pending verification
 */
export async function getPendingDocuments() {
  return prisma.insuranceDocument.findMany({
    where: {
      isVerified: false,
      gptStatus: 'completed',
    },
    include: {
      customer: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}
