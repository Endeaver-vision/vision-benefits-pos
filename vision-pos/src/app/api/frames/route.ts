/**
 * Frames API
 * GET /api/frames - Get frames from inventory with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const search = searchParams.get('search') || ''
    const brand = searchParams.get('brand') || ''
    const minPrice = parseFloat(searchParams.get('minPrice') || '0')
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '9999')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'brand'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
      retailPrice: {
        gte: minPrice,
        lte: maxPrice,
      },
    }

    // Search filter
    if (search) {
      where.OR = [
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { color: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Brand filter
    if (brand && brand !== 'all') {
      where.brand = { contains: brand, mode: 'insensitive' }
    }

    // Get total count
    const totalCount = await prisma.frame.count({ where })

    // Get frames with pagination
    const frames = await prisma.frame.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    })

    // Transform to frontend format
    const transformedFrames = frames.map(frame => ({
      id: frame.id,
      sku: frame.sku,
      brand: frame.brand,
      model: frame.model,
      color: frame.color,
      size: frame.eyeSize ? `${frame.eyeSize}-${frame.bridge}-${frame.temple}` : null,
      price: frame.retailPrice,
      manufacturer: frame.manufacturer,
      material: 'plastic',
      style: determineStyle(frame),
      category: determineCategory(frame.retailPrice),
      inStock: frame.stockQuantity > 0,
      // VSP featured brand check for allowance calculation
      isFeaturedBrand: isMarchonOrAltair(frame.manufacturer),
    }))

    // Get unique brands for filter
    const brands = await prisma.frame.groupBy({
      by: ['brand'],
      where: { isActive: true },
      _count: { brand: true },
      orderBy: { brand: 'asc' },
    })

    return NextResponse.json({
      success: true,
      frames: transformedFrames,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      filters: {
        brands: brands.map(b => ({ name: b.brand, count: b._count.brand })),
      },
    })
  } catch (error) {
    console.error('[Frames API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch frames' },
      { status: 500 }
    )
  }
}

function determineStyle(frame: { model: string; brand: string }): string {
  const modelLower = frame.model.toLowerCase()
  if (modelLower.includes('rimless')) return 'rimless'
  if (modelLower.includes('semi')) return 'semi-rimless'
  return 'full-rim'
}

function determineCategory(price: number): 'value' | 'designer' | 'premium' {
  if (price < 150) return 'value'
  if (price < 300) return 'designer'
  return 'premium'
}

function isMarchonOrAltair(manufacturer: string): boolean {
  const featuredManufacturers = [
    'marchon', 'altair', 'nike', 'columbia', 'nautica',
    'flexon', 'dragon', 'salvatore ferragamo', 'calvin klein',
    'lacoste', 'chloe', 'lanvin', 'longchamp', 'mcm'
  ]
  return featuredManufacturers.some(m =>
    manufacturer.toLowerCase().includes(m)
  )
}

/**
 * POST /api/frames
 * Create a new frame with initial stock
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      brand,
      model,
      color,
      upc,
      sku,
      retailPrice,
      wholesaleCost,
      locationStock,
      manufacturer,
      eyeSize,
      bridge,
      temple
    } = body

    // Validate required fields
    if (!brand || !model || !color) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'Brand, model, and color are required'
      }, { status: 400 })
    }

    if (retailPrice === undefined || wholesaleCost === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'Retail price and wholesale cost are required'
      }, { status: 400 })
    }

    // Check for duplicate SKU if provided
    if (sku) {
      const existingSku = await prisma.frame.findFirst({
        where: { sku: { equals: sku, mode: 'insensitive' } }
      })
      if (existingSku) {
        return NextResponse.json({
          success: false,
          error: 'Duplicate SKU',
          message: `A frame with SKU "${sku}" already exists`
        }, { status: 400 })
      }
    }

    // Check for duplicate UPC if provided
    if (upc) {
      const existingUpc = await prisma.frame.findFirst({
        where: { upc }
      })
      if (existingUpc) {
        return NextResponse.json({
          success: false,
          error: 'Duplicate UPC',
          message: `A frame with UPC "${upc}" already exists`
        }, { status: 400 })
      }
    }

    // Build locations array and calculate total stock from locationStock
    const stockData = (locationStock || {}) as Record<string, number>
    const locations = Object.keys(stockData).filter(loc => stockData[loc] > 0)
    const totalStock = Object.values(stockData).reduce((sum, qty) => sum + qty, 0)

    // Create the frame
    const frame = await prisma.frame.create({
      data: {
        brand: brand.trim(),
        model: model.trim(),
        color: color.trim(),
        manufacturer: (manufacturer || brand).trim(),
        upc: upc?.trim() || null,
        sku: sku?.trim() || null,
        retailPrice: parseFloat(retailPrice),
        wholesaleCost: parseFloat(wholesaleCost),
        stockQuantity: totalStock,
        locations,
        locationStock: stockData,
        eyeSize: eyeSize ? parseInt(eyeSize, 10) : null,
        bridge: bridge ? parseInt(bridge, 10) : null,
        temple: temple ? parseInt(temple, 10) : null,
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      data: frame,
      message: `Created ${frame.brand} ${frame.model} - ${frame.color}`
    }, { status: 201 })

  } catch (error) {
    console.error('Frame creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create frame' },
      { status: 500 }
    )
  }
}
