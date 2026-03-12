import { NextRequest, NextResponse } from 'next/server'
import { normalizeBenefits } from '@/lib/services/ocr/prompt-2-normalization'
import { dispatchExtraction } from '@/lib/services/ocr/extraction-dispatcher'

/**
 * POST /api/documents/[id]/process
 * Process insurance document with smart carrier routing
 *
 * Smart Extraction Pipeline:
 * 1. Dispatcher detects carrier from file path
 * 2. For EyeMed: Use pattern-based extraction (209 known patterns)
 * 3. For other carriers: Use generic extraction
 * 4. Normalize results using rosetta stones and business rules
 * 5. Save both extraction and normalized data to document record
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const { id } = await params

    // Import prisma here to avoid circular dependency
    const { prisma } = await import('@/lib/prisma')

    // Get the document
    const document = await prisma.insuranceDocument.findUnique({
      where: { id },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if already processing
    if (document.ocrStatus === 'processing' || document.gptStatus === 'processing') {
      return NextResponse.json(
        { success: false, error: 'Document is already being processed' },
        { status: 409 }
      )
    }

    // Check if file exists
    const fs = await import('fs')
    if (!fs.existsSync(document.filePath)) {
      return NextResponse.json(
        { success: false, error: `File not found: ${document.filePath}` },
        { status: 404 }
      )
    }

    console.log(`[Process] Starting smart extraction for document ${id}`)
    console.log(`[Process] File: ${document.filePath}`)

    // STEP 1: Dispatch to appropriate extraction method
    console.log(`[Process] Step 1: Dispatching to extraction service`)
    const dispatchResult = await dispatchExtraction(document.filePath)
    const rawData = dispatchResult.rawExtraction
    const extractionMethod = dispatchResult.extractionType

    console.log(`[Process] Extraction complete. Method: ${extractionMethod}`)
    console.log(`[Process] Carrier detected: ${rawData.carrier}`)
    console.log(`[Process] Benefits found: ${rawData.benefits.length}`)

    // STEP 2: Convert raw data to normalized format
    console.log(`[Process] Step 2: Converting raw data to normalized format`)
    const normalizedData = {
      carrier: rawData.carrier || 'UNKNOWN',
      carrierConfidence: rawData.carrierConfidence || 'high',
      memberInfo: rawData.memberInfo || {},
      normalizedBenefits: rawData.benefits.map(b => ({
        canonicalName: b.benefitName,
        originalText: b.value || '',
        category: b.category,
        value: typeof b.value === 'string' ? parseInt(b.value.replace(/\D/g, ''), 10) || 0 : b.value || 0,
        valueUnit: 'dollars',
        eligible: true
      })),
      mappingResults: {
        totalBenefits: rawData.benefits.length,
        successfulMappings: rawData.benefits.length,
        partialMappings: 0,
        unmappedCount: 0
      },
      appliedBusinessRules: [],
      unmappedBenefits: [],
      validationWarnings: []
    }
    console.log(
      `[Process] Conversion complete. ${normalizedData.mappingResults.successfulMappings}/${normalizedData.mappingResults.totalBenefits} benefits converted`
    )

    const duration = Date.now() - startTime

    // Store extraction results with both raw and normalized data
    const extractedDataWithBoth = {
      raw: rawData,
      normalized: normalizedData,
      extractionMethod: extractionMethod,
      nativeExtraction: dispatchResult.nativeExtraction,
    }

    // Update document with extraction results
    const updatedDocument = await prisma.insuranceDocument.update({
      where: { id },
      data: {
        carrier: normalizedData.carrier,
        extractedData: extractedDataWithBoth,
        ocrStatus: 'completed',
        confidenceScore:
          normalizedData.carrierConfidence === 'high'
            ? 0.95
            : normalizedData.carrierConfidence === 'medium'
              ? 0.75
              : 0.5,
      },
    })

    // STEP 3: Auto-create InsuranceAuthorization for this customer
    console.log(`[Process] Step 3: Creating InsuranceAuthorization for customer ${updatedDocument.customerId}`)
    if (updatedDocument.customerId) {
      try {
        console.log(`[Process] Authorization creation attempt for carrier: ${normalizedData.carrier}`)
        // Deactivate old authorizations for this carrier
        const deactivateCount = await prisma.insuranceAuthorization.updateMany({
          where: {
            customerId: updatedDocument.customerId,
            carrier: normalizedData.carrier?.toUpperCase() || "UNKNOWN",
            isActive: true,
          },
          data: { isActive: false },
        })
        console.log(`[Process] Deactivated ${deactivateCount.count} old authorizations`)
        const nativeExtraction = dispatchResult.nativeExtraction
        let examCopay: number | null = null
        let materialsCopay: number | null = null
        let clExamCopay: number | null = null
        let frameAllowance: number | null = null
        let contactAllowance: number | null = null

        console.log(`[Process] Using native extraction data with structured benefit fields`)

        // Process benefits from native extraction which has allowance, copay fields already parsed
        if (nativeExtraction && nativeExtraction.benefits) {
          for (const [key, benefit] of Object.entries(nativeExtraction.benefits)) {
            const category = (benefit.category || '').toLowerCase()
            const copayValue = benefit.copay ?? benefit.base_copay

            console.log(`[Process] Benefit: ${key} (${category}) - allowance: ${benefit.allowance}, copay: ${copayValue}`)

            // Exam copay - only from the exam category
            if (category.includes('exam') && !category.includes('contact') && copayValue !== undefined) {
              examCopay = copayValue
              console.log(`[Process] -> Extracted examCopay: ${examCopay}`)
            }
            // Materials copay - lens types (single vision, bifocal, trifocal, lenticular, progressive)
            if (!materialsCopay && (category.includes('single_vision') || category === 'bifocal' || category === 'trifocal' || category === 'lenticular' || category.includes('progressive'))) {
              materialsCopay = copayValue
              console.log(`[Process] -> Extracted materialsCopay: ${materialsCopay}`)
            }
            // Contact lens fitting copay - from contact_lens_fit categories
            // Use copay if available, otherwise use allowance as the fitting cost
            if (!clExamCopay && category.includes('contact_lens_fit')) {
              if (copayValue !== undefined) {
                clExamCopay = copayValue
              } else if (benefit.allowance !== undefined) {
                // Use allowance as fitting cost if no copay is specified
                clExamCopay = benefit.allowance
              }
              if (clExamCopay !== undefined) {
                console.log(`[Process] -> Extracted clExamCopay: ${clExamCopay}`)
              }
            }
            // Frame allowance - use the allowance field directly
            if (category === 'frame' && benefit.allowance !== undefined) {
              frameAllowance = benefit.allowance
              console.log(`[Process] -> Extracted frameAllowance: ${frameAllowance}`)
            }
            // Contact lens allowance - from contacts_conventional or contacts_disposable categories
            if (!contactAllowance && (category.includes('contacts_conventional') || category.includes('contacts_disposable')) && benefit.allowance !== undefined) {
              contactAllowance = benefit.allowance
              console.log(`[Process] -> Extracted contactAllowance: ${contactAllowance}`)
            }
          }
        }

        // Create new authorization
        const authData: any = {
          customerId: updatedDocument.customerId,
          carrier: normalizedData.carrier || "UNKNOWN",
          frameAllowance: frameAllowance !== null ? Number(frameAllowance) : null,
          examCopay: examCopay !== null ? Number(examCopay) : null,
          materialsCopay: materialsCopay !== null ? Number(materialsCopay) : null,
          clExamCopay: clExamCopay !== null ? Number(clExamCopay) : null,
          contactAllowance: contactAllowance !== null ? Number(contactAllowance) : null,
          copays: {
            exam: examCopay,
            materials: materialsCopay,
            clExam: clExamCopay,
            contactAllowance: contactAllowance,
          },
          isActive: true,
          confidenceScore: normalizedData.carrierConfidence === 'high' ? 0.95 : normalizedData.carrierConfidence === 'medium' ? 0.75 : 0.5,
        }

        // Only add optional fields if they have values
        if (normalizedData.planName) authData.planName = normalizedData.planName
        if (normalizedData.memberInfo?.memberId) authData.memberId = normalizedData.memberInfo.memberId
        if (normalizedData.memberInfo?.memberName) authData.memberName = normalizedData.memberInfo.memberName

        console.log(`[Process] Creating authorization with: examCopay=${examCopay}, materialsCopay=${materialsCopay}, clExamCopay=${clExamCopay}, frameAllowance=${frameAllowance}, contactAllowance=${contactAllowance}`);
        const authorization = await prisma.insuranceAuthorization.create({
          data: authData,
        })

        console.log(`[Process] Authorization created: ${authorization.id}`)

        // Link document to authorization
        await prisma.insuranceDocument.update({
          where: { id },
          data: {
            authorizationId: authorization.id,
            isVerified: true,
          },
        })
      } catch (authError) {
        console.error('[Process] Failed to create authorization:', authError)
        // Don't fail the entire process if authorization creation fails
      }
    }

    return NextResponse.json({
      success: true,
      documentId: id,
      ocrStatus: 'completed',
      carrier: normalizedData.carrier,
      carrierConfidence: normalizedData.carrierConfidence,
      rawExtraction: {
        benefitsFound: rawData.benefits.length,
        memberInfo: rawData.memberInfo,
      },
      normalization: {
        successfulMappings: normalizedData.mappingResults.successfulMappings,
        totalBenefits: normalizedData.mappingResults.totalBenefits,
        unmappedCount: normalizedData.mappingResults.unmappedCount,
        appliedRules: normalizedData.appliedBusinessRules.length,
      },
      duration: `${duration}ms`,
      extractionMethod: extractionMethod,
      nativeExtractionStats:
        extractionMethod === 'eyemed-pattern-based'
          ? {
              patternsMatched:
                dispatchResult.nativeExtraction?.stats?.total_patterns_matched || 0,
              unrecognized:
                dispatchResult.nativeExtraction?.stats?.total_unrecognized || 0,
            }
          : undefined,
      message:
        extractionMethod === 'eyemed-pattern-based'
          ? 'Document processed successfully using EyeMed pattern database.'
          : 'Document processed successfully.',
    })
  } catch (error) {
    console.error('[Process] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/documents/[id]/process
 * Check the processing status of a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { prisma } = await import('@/lib/prisma')

    const document = await prisma.insuranceDocument.findUnique({
      where: { id },
      select: {
        id: true,
        ocrStatus: true,
        ocrError: true,
        gptStatus: true,
        gptError: true,
        carrier: true,
        confidenceScore: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: document,
    })
  } catch (error) {
    console.error('Error checking process status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
