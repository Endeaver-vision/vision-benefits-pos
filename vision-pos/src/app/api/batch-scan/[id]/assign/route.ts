import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assignPriceListToCustomer } from '@/lib/services/batch-price-generator'

/**
 * POST /api/batch-scan/[id]/assign
 * Assign a batch document's price list to a customer
 *
 * Body: { customerId: string, assignedBy?: string }
 *
 * The [id] here is the batch DOCUMENT id (not job id)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchDocumentId } = await params
    const body = await request.json()
    const { customerId, assignedBy } = body

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      )
    }

    // Verify document exists and has prices
    const doc = await prisma.batchScanDocument.findUnique({
      where: { id: batchDocumentId },
      include: {
        temporaryPrices: {
          where: { status: 'TEMPORARY' },
          take: 1,
        },
      },
    })

    if (!doc) {
      return NextResponse.json(
        { error: 'Batch document not found' },
        { status: 404 }
      )
    }

    if (doc.status === 'ASSIGNED') {
      return NextResponse.json(
        { error: 'This price list has already been assigned' },
        { status: 400 }
      )
    }

    if (doc.temporaryPrices.length === 0) {
      return NextResponse.json(
        { error: 'No temporary prices available for this document' },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Perform the assignment
    const result = await assignPriceListToCustomer(
      batchDocumentId,
      customerId,
      assignedBy
    )

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
      },
      pricesAssigned: result.copied,
      pricesFailed: result.failed,
      carrier: doc.carrier,
      planName: doc.planName,
      message: `Assigned ${result.copied} prices to ${customer.firstName} ${customer.lastName}`,
    })

  } catch (error) {
    console.error('[BatchAssign] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to assign price list',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/batch-scan/[id]/assign
 * Get assignment info for a batch document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchDocumentId } = await params

    const doc = await prisma.batchScanDocument.findUnique({
      where: { id: batchDocumentId },
      include: {
        temporaryPrices: {
          select: {
            id: true,
            productName: true,
            productCategory: true,
            finalPrice: true,
            retailPrice: true,
            savings: true,
            status: true,
            assignedToCustomer: true,
            assignedAt: true,
          },
          orderBy: { productCategory: 'asc' },
        },
      },
    })

    if (!doc) {
      return NextResponse.json(
        { error: 'Batch document not found' },
        { status: 404 }
      )
    }

    // Group prices by status
    const temporary = doc.temporaryPrices.filter(p => p.status === 'TEMPORARY')
    const assigned = doc.temporaryPrices.filter(p => p.status === 'ASSIGNED')

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        fileName: doc.fileName,
        carrier: doc.carrier,
        planName: doc.planName,
        memberName: doc.memberName,
        memberId: doc.memberId,
        status: doc.status,
      },
      prices: {
        total: doc.temporaryPrices.length,
        temporary: temporary.length,
        assigned: assigned.length,
      },
      temporaryPrices: temporary.slice(0, 50), // First 50 for preview
      assignedTo: assigned.length > 0 ? assigned[0].assignedToCustomer : null,
    })

  } catch (error) {
    console.error('[BatchAssign] Error getting info:', error)
    return NextResponse.json(
      { error: 'Failed to get assignment info' },
      { status: 500 }
    )
  }
}
