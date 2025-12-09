import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/frames/lookup
 * Look up frames by UPC, SKU, or search term
 *
 * Query params:
 * - upc: Look up by UPC code
 * - sku: Look up by SKU
 * - search: Search by brand, model, color, SKU
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const upc = searchParams.get('upc')
    const sku = searchParams.get('sku')
    const search = searchParams.get('search')

    // UPC lookup - exact match
    if (upc) {
      const frame = await prisma.frame.findFirst({
        where: {
          upc: upc.trim(),
          isActive: true
        }
      })

      if (!frame) {
        return NextResponse.json({
          success: false,
          error: 'Frame not found',
          message: `No frame found with UPC: ${upc}`
        }, { status: 404 })
      }

      return NextResponse.json({ success: true, data: frame })
    }

    // SKU lookup - exact match (case insensitive)
    if (sku) {
      const frame = await prisma.frame.findFirst({
        where: {
          sku: { equals: sku.trim(), mode: 'insensitive' },
          isActive: true
        }
      })

      if (!frame) {
        return NextResponse.json({
          success: false,
          error: 'Frame not found',
          message: `No frame found with SKU: ${sku}`
        }, { status: 404 })
      }

      return NextResponse.json({ success: true, data: frame })
    }

    // Search lookup - search across multiple fields
    if (search) {
      const searchTerm = search.trim()

      const frames = await prisma.frame.findMany({
        where: {
          isActive: true,
          OR: [
            { brand: { contains: searchTerm, mode: 'insensitive' } },
            { model: { contains: searchTerm, mode: 'insensitive' } },
            { color: { contains: searchTerm, mode: 'insensitive' } },
            { sku: { contains: searchTerm, mode: 'insensitive' } },
            { upc: { contains: searchTerm, mode: 'insensitive' } },
            { manufacturer: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        orderBy: [
          { brand: 'asc' },
          { model: 'asc' }
        ],
        take: 50 // Limit results
      })

      return NextResponse.json({
        success: true,
        data: frames,
        count: frames.length
      })
    }

    // No lookup parameter provided
    return NextResponse.json({
      success: false,
      error: 'Missing parameter',
      message: 'Provide upc, sku, or search parameter'
    }, { status: 400 })

  } catch (error) {
    console.error('Frame lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to look up frame' },
      { status: 500 }
    )
  }
}
