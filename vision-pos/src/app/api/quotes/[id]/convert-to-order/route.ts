import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OrderItemType } from '@prisma/client'

// Structure of items stored in Quote.items JSON field
interface QuoteItem {
  sku: string
  displayName: string
  category: string
  retailPrice: number
  patientPays: number
  insurancePays: number
  quantity?: number
  tierUsed?: string
  notes?: string
}

// Map quote item category to OrderItemType enum
function mapCategoryToOrderItemType(category: string): OrderItemType {
  const categoryLower = category?.toLowerCase() || ''
  
  if (categoryLower.includes('frame')) return 'FRAME'
  if (categoryLower.includes('lens') || categoryLower.includes('progressive') || 
      categoryLower.includes('single_vision') || categoryLower.includes('bifocal') ||
      categoryLower.includes('trifocal')) return 'LENS'
  if (categoryLower.includes('coating') || categoryLower.includes('ar_coating')) return 'COATING'
  if (categoryLower.includes('exam') || categoryLower.includes('service') || 
      categoryLower.includes('fitting')) return 'SERVICE'
  if (categoryLower.includes('addon') || categoryLower.includes('add-on') ||
      categoryLower.includes('material') || categoryLower.includes('photochromic') ||
      categoryLower.includes('polarized') || categoryLower.includes('transition')) return 'ADDON'
  
  // Default fallback
  return 'ADDON'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params

    // Fetch the quote with customer details
    // Note: items is a JSON field, not a relation
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        customer: true,
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
          create: (quote.items as QuoteItem[]).map((item) => ({
            type: mapCategoryToOrderItemType(item.category),
            productName: item.displayName || 'Unknown Product',
            description: item.notes || '',
            sku: item.sku || '',
            quantity: item.quantity || 1,
            unitPrice: item.retailPrice,
            finalPrice: item.patientPays * (item.quantity || 1),
            insuranceCoverage: item.insurancePays,
            status: 'PENDING',
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
