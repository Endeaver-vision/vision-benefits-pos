import { NextRequest, NextResponse } from 'next/server'
import { processInsuranceDocument } from '@/lib/services/ocr'

/**
 * POST /api/documents/[id]/process
 * Trigger OCR and GPT extraction for a document
 *
 * This runs the full pipeline:
 * 1. OCR extraction (Google Vision or pdf-parse)
 * 2. Carrier detection (VSP, EyeMed, Spectera)
 * 3. GPT-4o data extraction
 * 4. Save extracted data to document record
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

    console.log(`[Process] Starting OCR for document ${id}`)
    console.log(`[Process] File: ${document.filePath}`)

    // Run the processing pipeline
    const result = await processInsuranceDocument(id, document.filePath)

    const duration = Date.now() - startTime

    if (result.ocrSuccess && result.gptSuccess) {
      // Get updated document
      const updatedDoc = await prisma.insuranceDocument.findUnique({
        where: { id },
        select: {
          carrier: true,
          planName: true,
          confidenceScore: true,
          extractedData: true,
        },
      })

      return NextResponse.json({
        success: true,
        documentId: id,
        ocrStatus: 'completed',
        gptStatus: 'completed',
        carrier: updatedDoc?.carrier,
        planName: updatedDoc?.planName,
        confidenceScore: updatedDoc?.confidenceScore,
        extractedData: updatedDoc?.extractedData,
        duration: `${duration}ms`,
        message: 'Document processed successfully. Ready for verification.',
      })
    } else {
      return NextResponse.json({
        success: false,
        documentId: id,
        ocrSuccess: result.ocrSuccess,
        gptSuccess: result.gptSuccess,
        error: result.error,
        duration: `${duration}ms`,
      }, { status: 422 })
    }
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
        ocrProcessedAt: true,
        ocrError: true,
        gptStatus: true,
        gptProcessedAt: true,
        gptError: true,
        carrier: true,
        confidenceScore: true,
        isVerified: true,
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
