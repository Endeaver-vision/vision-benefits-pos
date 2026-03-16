/**
 * Order Detail API
 * GET /api/orders/[id] - Get single order details
 * PATCH /api/orders/[id] - Update order (status, lab info, etc.)
 * DELETE /api/orders/[id] - Cancel/delete order
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { OrderStatus } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET - Get single order with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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
            address: true,
            city: true,
            state: true,
            zipCode: true,
            insuranceCarrier: true,
            memberId: true,
          },
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            items: true,
            retailTotal: true,
            patientTotal: true,
            insuranceTotal: true,
          },
        },
        location: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: true,
        transactions: {
          include: {
            items: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Format response
    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerInfo: {
        id: order.customer.id,
        name: `${order.customer.firstName} ${order.customer.lastName}`,
        firstName: order.customer.firstName,
        lastName: order.customer.lastName,
        email: order.customer.email,
        phone: order.customer.phone,
        address: order.customer.address
          ? {
              street: order.customer.address,
              city: order.customer.city,
              state: order.customer.state,
              zipCode: order.customer.zipCode,
            }
          : null,
        insuranceCarrier: order.customer.insuranceCarrier,
        memberId: order.customer.memberId,
      },
      quote: order.quote
        ? {
            id: order.quote.id,
            quoteNumber: order.quote.quoteNumber,
            retailTotal: order.quote.retailTotal,
            patientTotal: order.quote.patientTotal,
            insuranceTotal: order.quote.insuranceTotal,
          }
        : null,
      status: order.status,
      orderDate: order.orderDate,
      estimatedCompletionDate: order.estimatedCompletionDate,
      completedDate: order.completedDate,
      lab: order.labId
        ? {
            id: order.labId,
            orderNumber: order.labOrderNumber,
            trackingNumber: order.labTrackingNumber,
          }
        : null,
      location: order.location,
      employee: order.employee
        ? {
            id: order.employee.id,
            name: `${order.employee.firstName} ${order.employee.lastName}`,
            email: order.employee.email,
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        productType: item.productType,
        productId: item.productId,
        displayName: item.displayName,
        sku: item.sku,
        quantity: item.quantity,
        retailPrice: Number(item.retailPrice),
        insurancePays: Number(item.insurancePays),
        patientCopay: Number(item.patientCopay),
        insuranceTier: item.insuranceTier,
        notes: item.notes,
      })),
      pricing: {
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        discount: Number(order.discount),
        insuranceDiscount: Number(order.insuranceDiscount),
        total: Number(order.total),
        patientPortion: Number(order.patientPortion),
      },
      payment: {
        status:
          order.transactions.length > 0 &&
          order.transactions.every((t) => t.status === 'COMPLETED')
            ? 'paid'
            : order.transactions.length > 0
              ? 'partial'
              : 'pending',
        transactions: order.transactions.map((t) => ({
          id: t.id,
          transactionNumber: t.transactionNumber,
          paymentMethod: t.paymentMethod,
          subtotal: Number(t.subtotal),
          tax: Number(t.tax),
          total: Number(t.total),
          status: t.status,
          createdAt: t.createdAt,
          items: t.items.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
            discount: Number(i.discount),
            total: Number(i.total),
          })),
        })),
      },
      insuranceCarrier: order.insuranceCarrier,
      insuranceAuthorizationId: order.insuranceAuthorizationId,
      priceListVersionId: order.priceListVersionId,
      notes: order.notes,
      statusHistory: order.statusHistory.map((h) => ({
        id: h.id,
        status: h.status,
        changedBy: h.changedBy,
        notes: h.notes,
        createdAt: h.createdAt,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }

    return NextResponse.json({
      success: true,
      data: formattedOrder,
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch order',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update order
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const updates = await request.json()

    // Verify order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    const employeeId = (session.user as { employeeId?: string })?.employeeId

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Status update
    if (updates.status && updates.status !== existingOrder.status) {
      updateData.status = updates.status as OrderStatus

      // Set completion date if status is DELIVERED
      if (updates.status === 'DELIVERED' || updates.status === 'READY_FOR_PICKUP') {
        updateData.completedDate = new Date()
      }
    }

    // Lab info updates
    if (updates.labId !== undefined) updateData.labId = updates.labId
    if (updates.labOrderNumber !== undefined)
      updateData.labOrderNumber = updates.labOrderNumber
    if (updates.labTrackingNumber !== undefined)
      updateData.labTrackingNumber = updates.labTrackingNumber

    // Dates
    if (updates.estimatedCompletionDate !== undefined) {
      updateData.estimatedCompletionDate = updates.estimatedCompletionDate
        ? new Date(updates.estimatedCompletionDate)
        : null
    }

    // Notes
    if (updates.notes !== undefined) updateData.notes = updates.notes

    // Update order and create status history in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
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
          items: true,
        },
      })

      // Create status history entry if status changed
      if (updates.status && updates.status !== existingOrder.status) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            status: updates.status as OrderStatus,
            changedBy: employeeId || null,
            notes: updates.statusNotes || `Status changed to ${updates.status}`,
          },
        })
      }

      return order
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        customerName: `${updatedOrder.customer.firstName} ${updatedOrder.customer.lastName}`,
        updatedAt: updatedOrder.updatedAt,
      },
      message: 'Order updated successfully',
    })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Cancel order
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, orderNumber: true },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Can only cancel orders that are not already delivered
    if (
      existingOrder.status === 'DELIVERED' ||
      existingOrder.status === 'CANCELLED'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel order with status: ${existingOrder.status}`,
        },
        { status: 400 }
      )
    }

    const employeeId = (session.user as { employeeId?: string })?.employeeId

    // Cancel the order
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      })

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: OrderStatus.CANCELLED,
          changedBy: employeeId || null,
          notes: 'Order cancelled',
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: `Order ${existingOrder.orderNumber} cancelled successfully`,
    })
  } catch (error) {
    console.error('Error cancelling order:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel order',
      },
      { status: 500 }
    )
  }
}
