/**
 * Individual Quote API
 * GET /api/quotes/[id] - Get a specific quote
 * PATCH /api/quotes/[id] - Update quote status or details
 * DELETE /api/quotes/[id] - Delete a quote
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET - Fetch a specific quote with full details
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const quoteId = params.id

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Check if expired
    const isExpired = quote.expiresAt && new Date(quote.expiresAt) < new Date()

    return NextResponse.json({
      success: true,
      quote: {
        ...quote,
        isExpired,
        items: quote.items,
        examItems: quote.examItems,
        secondPair: quote.secondPair,
        contactLenses: quote.contactLenses
      }
    })

  } catch (error) {
    console.error('[Quote API] Error fetching quote:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quote' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update quote status or details
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const quoteId = params.id
    const body = await request.json()

    // Find the quote
    const existingQuote = await prisma.quote.findUnique({
      where: { id: quoteId }
    })

    if (!existingQuote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Status update
    if (body.status) {
      const validStatuses = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'EXPIRED', 'CONVERTED']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = body.status
    }

    // Notes update
    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    // Items update (full replacement)
    if (body.items) {
      updateData.items = body.items
      // Recalculate totals if items changed
      if (body.retailTotal !== undefined) updateData.retailTotal = body.retailTotal
      if (body.insuranceTotal !== undefined) updateData.insuranceTotal = body.insuranceTotal
      if (body.patientTotal !== undefined) updateData.patientTotal = body.patientTotal
      if (body.tax !== undefined) updateData.tax = body.tax
      if (body.grandTotal !== undefined) updateData.grandTotal = body.grandTotal
    }

    // Update exam items
    if (body.examItems !== undefined) {
      updateData.examItems = body.examItems
    }

    // Update second pair
    if (body.secondPair !== undefined) {
      updateData.secondPair = body.secondPair
    }

    // Update contact lenses
    if (body.contactLenses !== undefined) {
      updateData.contactLenses = body.contactLenses
    }

    // Expiration update
    if (body.expiresAt) {
      updateData.expiresAt = new Date(body.expiresAt)
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: quoteId },
      data: updateData,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      quote: updatedQuote
    })

  } catch (error) {
    console.error('[Quote API] Error updating quote:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update quote' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete a quote
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const quoteId = params.id

    // Verify quote exists
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId }
    })

    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Don't allow deletion of converted quotes
    if (quote.status === 'CONVERTED') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a converted quote' },
        { status: 400 }
      )
    }

    await prisma.quote.delete({
      where: { id: quoteId }
    })

    return NextResponse.json({
      success: true,
      message: 'Quote deleted successfully'
    })

  } catch (error) {
    console.error('[Quote API] Error deleting quote:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete quote' },
      { status: 500 }
    )
  }
}
