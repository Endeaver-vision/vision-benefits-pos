import { NextRequest, NextResponse } from 'next/server'
import { processInsuranceWithHaiku } from '@/lib/services/haiku-pricing-service'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * POST /api/insurance/extract
 *
 * Extract insurance benefits from a PDF, build a priced product list, and save to database
 *
 * Request:
 *   - multipart/form-data with "file" field containing PDF
 *   - "customerId" field (required) - customer to save authorization for
 *   - "carrier" field (EYEMED, VSP, SPECTERA) - defaults to EYEMED
 *
 * Response:
 *   {
 *     success: boolean,
 *     authorizationId: string,
 *     extractedBenefits: { frameAllowance, examCopay, copays, etc },
 *     pricedProducts: [ { productName, copay, rulesApplied, ... } ],
 *     pricingNotes: string
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Extract API] Request received')

    // Parse multipart form data
    console.log('[Extract API] Parsing form data...')
    const formData = await request.formData()
    const file = formData.get('file') as File
    const customerId = formData.get('customerId') as string
    const carrier = (formData.get('carrier') as string) || 'EYEMED'

    console.log(`[Extract API] Form parsed: customerId=${customerId}, carrier=${carrier}, file size=${file?.size}`)

    if (!file) {
      console.log('[Extract API] No file provided')
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!customerId) {
      console.log('[Extract API] No customer ID provided')
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    if (!['EYEMED', 'VSP', 'SPECTERA'].includes(carrier)) {
      console.log(`[Extract API] Invalid carrier: ${carrier}`)
      return NextResponse.json(
        { success: false, error: `Invalid carrier: ${carrier}` },
        { status: 400 }
      )
    }

    // Save PDF to temp file
    console.log('[Extract API] Reading file buffer...')
    const buffer = await file.arrayBuffer()
    const tempDir = os.tmpdir()
    const tempPath = path.join(tempDir, `insurance-${Date.now()}.pdf`)
    console.log(`[Extract API] Writing to temp file: ${tempPath}`)
    fs.writeFileSync(tempPath, Buffer.from(buffer))
    console.log('[Extract API] Temp file written')

    try {
      // Extract benefits and build price list using Haiku
      const modelName = process.env.EXTRACTION_MODEL || "claude-3-5-haiku-20241022"
      console.log(`[Extract API] Starting extraction with model=${modelName} for carrier=${carrier}...`)
      const startTime = Date.now()
      const result = await processInsuranceWithHaiku(tempPath, carrier as any)
      const elapsedSeconds = Math.round((Date.now() - startTime) / 1000)
      console.log(`[Extract API] Extraction completed in ${elapsedSeconds}s`)
      console.log(`[Extract API] Extracted benefits: examCopay=${result.extractedBenefits.examCopay}, frameAllowance=${result.extractedBenefits.frameAllowance}`)
      console.log(`[Extract API] Priced products count: ${result.pricedProducts.length}`)

      // Save extracted benefits to database as insurance authorization
      // First, deactivate any existing active authorizations for this customer
      console.log(`[Extract API] Deactivating existing authorizations for customer ${customerId}...`)
      await prisma.insuranceAuthorization.updateMany({
        where: {
          customerId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      })
      console.log('[Extract API] Existing authorizations deactivated')

      // Create new authorization record with extracted benefits
      const copaysData = result.extractedBenefits.copays ?
        result.extractedBenefits.copays :
        Object.fromEntries(
          Object.entries(result.extractedBenefits)
            .filter(([key]) => !['frameAllowance', 'frameOverageDiscount', 'notes'].includes(key))
        )

      console.log('[Extract API] Creating new authorization record...')
      const authorization = await prisma.insuranceAuthorization.create({
        data: {
          customerId,
          carrier: carrier,
          planName: `${carrier} Plan - Extracted ${new Date().toLocaleDateString()}`,
          memberName: '', // Will be updated by customer or admin
          memberId: '', // Will be updated by customer or admin
          examCopay: result.extractedBenefits.examCopay || null,
          frameAllowance: result.extractedBenefits.frameAllowance || null,
          copays: copaysData,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      console.log(`[Extract API] Authorization record created: ${authorization.id}`)

      console.log('[Extract API] Sending success response')
      return NextResponse.json({
        success: true,
        authorizationId: authorization.id,
        extractedBenefits: result.extractedBenefits,
        pricedProducts: result.pricedProducts,
        pricingNotes: result.pricingNotes,
      })
    } finally {
      // Clean up temp file
      console.log('[Extract API] Cleaning up temp file')
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath)
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Extraction failed'
    console.error('[Extract API] Error occurred:', errorMessage)
    if (error instanceof Error && error.stack) {
      console.error('[Extract API] Stack trace:', error.stack)
    }
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
