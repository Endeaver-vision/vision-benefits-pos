import { NextRequest, NextResponse } from 'next/server'
import { signatureService } from '@/lib/signature-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id

    // Get all signatures for this quote
    const signatures = await signatureService.getQuoteSignatures(quoteId)

    // Get comprehensive workflow status
    const workflowStatus = await signatureService.getSignatureWorkflowStatus(quoteId)

    // Organize signatures by type for easier frontend consumption
    const examSignatures = signatures.filter(s => s.signatureType === 'EXAM')
    const materialsSignatures = signatures.filter(s => s.signatureType === 'MATERIALS')

    return NextResponse.json({
      quoteId,
      workflowStatus,
      signatures: {
        exam: examSignatures,
        materials: materialsSignatures,
        all: signatures
      },
      summary: {
        totalSignatures: signatures.length,
        examSignatures: examSignatures.length,
        materialsSignatures: materialsSignatures.length,
        validSignatures: signatures.filter(s => s.isValid).length,
        invalidSignatures: signatures.filter(s => !s.isValid).length
      }
    })

  } catch (error) {
    console.error('Error retrieving signatures:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id
    const { searchParams } = new URL(request.url)
    const signatureId = searchParams.get('signatureId')
    const reason = searchParams.get('reason') || 'Invalidated by user'
    const invalidatedBy = searchParams.get('invalidatedBy') || 'system'

    if (!signatureId) {
      return NextResponse.json(
        { error: 'Signature ID is required' },
        { status: 400 }
      )
    }

    // Invalidate the signature
    const success = await signatureService.invalidateSignature(
      signatureId,
      reason,
      invalidatedBy
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to invalidate signature' },
        { status: 400 }
      )
    }

    // Get updated workflow status
    const workflowStatus = await signatureService.getSignatureWorkflowStatus(quoteId)

    return NextResponse.json({
      success: true,
      message: 'Signature invalidated successfully',
      workflowStatus
    })

  } catch (error) {
    console.error('Error invalidating signature:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestBody = await request.json()
    const { signatureId, action, verifiedBy } = requestBody

    if (!signatureId) {
      return NextResponse.json(
        { error: 'Signature ID is required' },
        { status: 400 }
      )
    }

    if (action === 'verify-name') {
      if (!verifiedBy) {
        return NextResponse.json(
          { error: 'verifiedBy is required for name verification' },
          { status: 400 }
        )
      }

      const success = await signatureService.verifySignerName(signatureId, verifiedBy)

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to verify signer name' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Signer name verified successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error updating signature:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}