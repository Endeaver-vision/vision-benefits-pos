import { NextRequest, NextResponse } from 'next/server'
import { signatureService } from '@/lib/signature-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id
    const requestBody = await request.json()

    const {
      signatureData,
      signerName,
      signerRole,
      signatureWidth,
      signatureHeight
    } = requestBody

    // Validate required fields
    if (!signatureData) {
      return NextResponse.json(
        { error: 'Signature data is required' },
        { status: 400 }
      )
    }

    if (!signerName) {
      return NextResponse.json(
        { error: 'Signer name is required' },
        { status: 400 }
      )
    }

    // Extract client information for audit trail
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Capture the exam signature
    const result = await signatureService.captureSignature({
      quoteId,
      signatureType: 'EXAM',
      signatureData,
      signerName,
      signerRole,
      ipAddress,
      userAgent,
      signatureWidth,
      signatureHeight,
      deviceInfo: JSON.stringify({
        userAgent,
        timestamp: new Date().toISOString()
      })
    })

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Failed to capture exam signature',
          details: result.errors,
          warnings: result.warnings
        },
        { status: 400 }
      )
    }

    // Get updated workflow status
    const workflowStatus = await signatureService.getSignatureWorkflowStatus(quoteId)

    return NextResponse.json({
      success: true,
      message: 'Exam signature captured successfully',
      signatureId: result.signatureId,
      warnings: result.warnings,
      workflowStatus
    })

  } catch (error) {
    console.error('Error capturing exam signature:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id

    // Get exam signatures for this quote
    const signatures = await signatureService.getQuoteSignatures(quoteId)
    const examSignatures = signatures.filter(s => s.signatureType === 'EXAM')

    // Get workflow status
    const workflowStatus = await signatureService.getSignatureWorkflowStatus(quoteId)

    return NextResponse.json({
      signatures: examSignatures,
      workflowStatus: {
        examSignatureRequired: workflowStatus.examSignatureRequired,
        examSignatureCompleted: workflowStatus.examSignatureCompleted,
        canCaptureExamSignature: workflowStatus.canCaptureExamSignature
      }
    })

  } catch (error) {
    console.error('Error retrieving exam signatures:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}