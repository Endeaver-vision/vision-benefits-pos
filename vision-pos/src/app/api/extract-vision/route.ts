/**
 * Vision Extraction API Endpoint
 * POST /api/extract-vision
 *
 * Extracts insurance benefits from a PDF document using Claude Haiku vision.
 * No OCR - reads PDF directly as image and extracts benefits semantically.
 */

import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import { readDocumentWithHaiku, assignToCatalog } from '@/lib/services/ocr/haiku-extraction'

interface ExtractVisionRequest {
  filePath: string
}

interface ExtractedBenefits {
  examCopay: number | null
  frameAllowance: number | null
  materialsCopay: number | null
  contactAllowance: number | null
  confidence: 'high' | 'medium' | 'low'
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtractVisionRequest = await request.json()
    const { filePath } = body

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'filePath is required' },
        { status: 400 }
      )
    }

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: `File not found: ${filePath}` },
        { status: 404 }
      )
    }

    // Extract benefits using Haiku vision
    const extracted = await readDocumentWithHaiku(filePath)
    const authorization = assignToCatalog(extracted)

    // Map to simplified response format for checkpoint validation
    const extraction: ExtractedBenefits = {
      examCopay: authorization.examCopay,
      frameAllowance: authorization.frameAllowance,
      materialsCopay: authorization.materialsCopay,
      contactAllowance: authorization.contactAllowance,
      confidence: mapConfidenceLevel(extracted.confidence),
    }

    return NextResponse.json({
      success: true,
      extraction,
      metadata: {
        carrier: authorization.carrier,
        memberName: authorization.memberName,
        memberId: authorization.memberId,
        processingCost: extracted.processingCost,
      }
    })

  } catch (error) {
    console.error('[Extract Vision API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to extract document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Map numeric confidence to categorical level
 */
function mapConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.6) return 'medium'
  return 'low'
}
