import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateOrderStatusRequest } from '@/types/order-tracking'

/**
 * POST /api/order-tracking/[id]/status
 * Update order status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: UpdateOrderStatusRequest = await request.json()

    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Get current order
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { status: true },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Update order status and create history entry
    const order = await prisma.order.update({
      where: { id },
      data: {
        status: body.status,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: body.updatedBy,
        statusHistory: {
          create: {
            status: body.status,
            previousStatus: existingOrder.status,
            updatedBy: body.updatedBy,
            updatedByName: body.updatedByName,
            notes: body.notes,
          },
        },
      },
      include: {
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    })

    return NextResponse.json({
      success: true,
      order,
      message: `Order status updated to ${body.status}`,
    })
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}
