import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id

    // Fetch the quote with all details
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    if (!quote.customerId) {
      return NextResponse.json(
        { error: 'Quote must have a customer to convert to order' },
        { status: 400 }
      )
    }

    // Generate order number
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    
    const lastOrder = await prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: `ORD-${yearMonth}-`,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
    })

    let orderSequence = 1
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2])
      orderSequence = lastSequence + 1
    }

    const orderNumber = `ORD-${yearMonth}-${String(orderSequence).padStart(4, '0')}`

    // Calculate timelines (8 business days total)
    const orderDate = new Date()
    const vendorPlacementDeadline = new Date(orderDate)
    vendorPlacementDeadline.setHours(23, 59, 59, 999) // End of day 0

    const vendorProcessingStart = new Date(orderDate)
    vendorProcessingStart.setDate(vendorProcessingStart.getDate() + 1) // Day 1
    
    const vendorProcessingEnd = new Date(orderDate)
    vendorProcessingEnd.setDate(vendorProcessingEnd.getDate() + 5) // Day 5
    
    const shipmentStart = new Date(orderDate)
    shipmentStart.setDate(shipmentStart.getDate() + 6) // Day 6
    
    const shipmentEnd = new Date(orderDate)
    shipmentEnd.setDate(shipmentEnd.getDate() + 7) // Day 7
    
    const patientDeliveryDate = new Date(orderDate)
    patientDeliveryDate.setDate(patientDeliveryDate.getDate() + 8) // Day 8
    
    // Create the order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: quote.customerId,
        status: 'DRAFT',
        orderDate,
        estimatedCompletionDate: patientDeliveryDate,
        subtotal: quote.subtotal || 0,
        taxAmount: quote.taxAmount || 0,
        totalAmount: quote.totalAmount || 0,
        createdBy: 'system',
        
        // Timeline tracking fields
        vendorPlacementDeadline,
        vendorProcessingStart,
        vendorProcessingEnd,
        shipmentStart,
        shipmentEnd,
        patientDeliveryDate,
        
        items: {
          create: quote.items.map((item) => ({
            type: item.type as any,
            productName: item.productName || item.product?.name || 'Unknown Product',
            description: item.description || '',
            sku: item.sku || item.product?.sku || '',
            lensType: item.lensType,
            lensCoatings: item.lensCoatings || [],
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            finalPrice: item.totalPrice,
            status: 'PENDING',
            customizations: item.specifications || {},
          })),
        },
        
        statusHistory: {
          create: {
            status: 'DRAFT',
            notes: `Order created from quote ${quote.quoteNumber || quoteId}`,
            updatedBy: 'system',
          },
        },
      },
      include: {
        customer: true,
        items: true,
      },
    })

    // Mark quote as converted
    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'CONVERTED',
      },
    })

    // Mark authorization as used if present
    if (quote.authorizationId) {
      // Try to update VSP authorization
      await prisma.vspAuthorization.updateMany({
        where: { id: quote.authorizationId },
        data: { usedForOrder: true, usedDate: new Date() }
      })
      // Try to update EyeMed authorization
      await prisma.eyemedAuthorization.updateMany({
        where: { id: quote.authorizationId },
        data: { usedForOrder: true, usedDate: new Date() }
      })
      // Try to update Spectera authorization
      await prisma.specteraAuthorization.updateMany({
        where: { id: quote.authorizationId },
        data: { usedForOrder: true, usedDate: new Date() }
      })
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        timeline: {
          vendorPlacementDeadline,
          vendorProcessingStart,
          vendorProcessingEnd,
          shipmentStart,
          shipmentEnd,
          patientDeliveryDate,
          totalDays: 8,
        },
      },
    })
  } catch (error) {
    console.error('Error converting quote to order:', error)
    return NextResponse.json(
      { error: 'Failed to convert quote to order' },
      { status: 500 }
    )
  }
}
