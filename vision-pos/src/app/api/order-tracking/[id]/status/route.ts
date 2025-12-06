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

    console.log('Status update request:', { id, status: body.status })

    if (!body.status) {
      console.error('Status is required')
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

    console.log('Existing order:', existingOrder)

    if (!existingOrder) {
      console.error('Order not found:', id)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Update order status and create history entry + communication record
    const order = await prisma.$transaction(async (tx) => {
      // Update the order
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: body.status,
          statusUpdatedAt: new Date(),
          statusUpdatedBy: body.updatedBy,
        },
      })

      // Create status history record
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: body.status,
          previousStatus: existingOrder.status,
          updatedBy: body.updatedBy,
          updatedByName: body.updatedByName,
          notes: body.notes,
          timestamp: new Date(),
        },
      })

      // Create communication record if notes provided
      if (body.notes) {
        await tx.orderCommunication.create({
          data: {
            orderId: id,
            type: 'NOTE',
            direction: 'INTERNAL',
            message: body.notes,
            timestamp: new Date(),
          },
        })
      }

      // Return order with history
      return tx.order.findUnique({
        where: { id },
        include: {
          statusHistory: {
            orderBy: { timestamp: 'desc' },
            take: 5,
          },
        },
      })
    })

    console.log('Order status updated successfully:', body.status)
    return NextResponse.json({
      success: true,
      order,
      message: `Order status updated to ${body.status}`,
    })
  } catch (error) {
    console.error('Error updating order status:', error)
    console.error('Error details:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update order status' },
      { status: 500 }
    )
  }
}
