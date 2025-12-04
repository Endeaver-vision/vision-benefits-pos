import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/documents/[id]
 * Get a single insurance document by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const document = await prisma.insuranceDocument.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dateOfBirth: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: document,
    })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/documents/[id]
 * Update an insurance document (extracted data, carrier, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check document exists
    const existing = await prisma.insuranceDocument.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (body.extractedData !== undefined) {
      updateData.extractedData = body.extractedData
      updateData.gptStatus = 'completed'
      updateData.gptProcessedAt = new Date()
    }

    if (body.rawOcrText !== undefined) {
      updateData.rawOcrText = body.rawOcrText
      updateData.ocrStatus = 'completed'
      updateData.ocrProcessedAt = new Date()
    }

    if (body.carrier !== undefined) {
      updateData.carrier = body.carrier
    }

    if (body.planName !== undefined) {
      updateData.planName = body.planName
    }

    if (body.confidenceScore !== undefined) {
      updateData.confidenceScore = body.confidenceScore
    }

    const document = await prisma.insuranceDocument.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: document,
    })
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documents/[id]
 * Delete an insurance document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check document exists
    const existing = await prisma.insuranceDocument.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    await prisma.insuranceDocument.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Document deleted',
    })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
