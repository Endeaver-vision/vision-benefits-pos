import { NextRequest, NextResponse } from 'next/server'
// DELETED: import { processDocument } from '@/lib/services/ocr/ocr-service'
// DELETED: import { parseInsuranceDocument } from '@/lib/services/ocr/gpt-extraction'

/**
 * POST /api/admin/pricing-debug/process
 * Debug version of document processing - exposes raw OCR text and GPT parsing results
 *
 * Body: { filePath: string, carrier?: string }
 * Returns: { rawText, gptInput, gptOutput, extractedData, timing, errors }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { filePath, carrier } = await request.json()

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'filePath is required' },
        { status: 400 }
      )
    }

    // Check if file exists
    const fs = await import('fs')
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: `File not found: ${filePath}` },
        { status: 404 }
      )
    }

    console.log(`[Debug] Processing file: ${filePath}`)

    // Step 1: Run OCR
    const ocrStart = Date.now()
    const ocrResult = await processDocument(filePath)
    const ocrTime = Date.now() - ocrStart

    if (!ocrResult.success) {
      return NextResponse.json({
        success: false,
        error: 'OCR failed',
        ocrError: ocrResult.error,
        timing: {
          ocrMs: ocrTime,
          totalMs: Date.now() - startTime,
        },
      }, { status: 422 })
    }

    // Step 2: Run GPT extraction
    const gptStart = Date.now()
    let gptResult: any
    let gptError: string | undefined

    try {
      gptResult = await parseInsuranceDocument(ocrResult.text)
    } catch (err) {
      gptError = err instanceof Error ? err.message : 'GPT parsing failed'
    }

    const gptTime = Date.now() - gptStart
    const totalTime = Date.now() - startTime

    // Return full debug data
    return NextResponse.json({
      success: !gptError,
      debug: {
        // Raw OCR output
        rawText: ocrResult.text,
        ocrMethod: ocrResult.method,
        pageCount: ocrResult.pageCount,

        // GPT parsing
        detectedCarrier: gptResult?.carrier,
        planName: gptResult?.planName,
        confidenceScore: gptResult?.confidenceScore,

        // Full extracted data
        extractedData: gptResult?.data,

        // Errors
        gptError,

        // Timing breakdown
        timing: {
          ocrMs: ocrTime,
          gptMs: gptTime,
          totalMs: totalTime,
        },
      },
    })

  } catch (error) {
    console.error('[Debug] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: {
        totalMs: Date.now() - startTime,
      },
    }, { status: 500 })
  }
}
