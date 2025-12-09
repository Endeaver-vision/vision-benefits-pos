import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/frames/[id]/stock
 * Update location stock for a frame
 *
 * Body:
 * {
 *   "locationStock": {
 *     "Insight": 3,
 *     "Spectrum": 5
 *   }
 * }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { locationStock } = body

    if (!locationStock || typeof locationStock !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Invalid request',
        message: 'locationStock must be an object with location names as keys and quantities as values'
      }, { status: 400 })
    }

    // Validate all values are non-negative integers
    for (const [location, qty] of Object.entries(locationStock)) {
      if (typeof qty !== 'number' || qty < 0 || !Number.isInteger(qty)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid quantity',
          message: `Quantity for ${location} must be a non-negative integer`
        }, { status: 400 })
      }
    }

    // Check frame exists
    const existingFrame = await prisma.frame.findUnique({
      where: { id },
      select: { id: true, brand: true, model: true }
    })

    if (!existingFrame) {
      return NextResponse.json({
        success: false,
        error: 'Frame not found',
        message: `No frame found with ID: ${id}`
      }, { status: 404 })
    }

    // Build locations array from locationStock (locations with stock > 0 or explicitly included)
    const locations = Object.keys(locationStock).filter(loc => locationStock[loc] > 0)

    // Calculate total stock
    const totalStock = Object.values(locationStock as Record<string, number>).reduce((sum, qty) => sum + qty, 0)

    // Update the frame
    const updatedFrame = await prisma.frame.update({
      where: { id },
      data: {
        locationStock,
        locations,
        stockQuantity: totalStock
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedFrame,
      message: `Updated stock for ${existingFrame.brand} ${existingFrame.model}`
    })

  } catch (error) {
    console.error('Frame stock update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update frame stock' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/frames/[id]/stock
 * Get current stock info for a frame
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    const frame = await prisma.frame.findUnique({
      where: { id },
      select: {
        id: true,
        brand: true,
        model: true,
        color: true,
        sku: true,
        upc: true,
        locations: true,
        locationStock: true,
        stockQuantity: true,
        retailPrice: true,
        wholesaleCost: true
      }
    })

    if (!frame) {
      return NextResponse.json({
        success: false,
        error: 'Frame not found',
        message: `No frame found with ID: ${id}`
      }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: frame })

  } catch (error) {
    console.error('Frame stock fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch frame stock' },
      { status: 500 }
    )
  }
}
