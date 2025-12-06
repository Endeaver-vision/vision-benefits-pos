import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UpdateOrderStatusRequest } from '@/types/order-tracking'

/**
 * GET /api/order-tracking/[id]
 * Get order details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: {
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          orderBy: { timestamp: 'desc' },
        },
        communications: {
          orderBy: { timestamp: 'desc' },
        },
        qualityChecks: {
          orderBy: { performedAt: 'desc' },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/order-tracking/[id]
 * Update order details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        items: true,
      },
    })

    return NextResponse.json({
      success: true,
      order,
      message: 'Order updated successfully',
    })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/order-tracking/[id]
 * Cancel an order (soft delete by updating status)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if order can be cancelled
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

    if (['DELIVERED', 'CANCELLED', 'SHIPPED'].includes(existingOrder.status)) {
      return NextResponse.json(
        { error: 'Order cannot be cancelled in current status' },
        { status: 400 }
      )
    }

    // Update order status to CANCELLED
    const order = await prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        statusUpdatedAt: new Date(),
        statusUpdatedBy: 'system', // TODO: Get from auth session
        statusHistory: {
          create: {
            status: 'CANCELLED',
            previousStatus: existingOrder.status,
            updatedBy: 'system', // TODO: Get from auth session
            notes: 'Order cancelled',
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      order,
      message: 'Order cancelled successfully',
    })
  } catch (error) {
    console.error('Error cancelling order:', error)
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    )
  }
}
