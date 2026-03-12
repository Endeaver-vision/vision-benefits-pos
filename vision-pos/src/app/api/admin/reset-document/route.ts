import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/admin/reset-document
 * TEMPORARY: Reset a document for re-verification
 *
 * For testing/debugging only. Allows resetting a document's verification status
 * so it can be re-verified with updated extracted data.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId required' },
        { status: 400 }
      )
    }

    // Reset document verification status
    const updated = await prisma.insuranceDocument.update({
      where: { id: documentId },
      data: {
        isVerified: false,
        authorizationId: null,
        verifiedBy: null,
        verifiedAt: null,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Document reset for re-verification',
      document: {
        id: updated.id,
        isVerified: updated.isVerified,
        authorizationId: updated.authorizationId
      }
    })

  } catch (error) {
    console.error('[ResetDocument] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reset failed' },
      { status: 500 }
    )
  }
}
