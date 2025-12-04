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
      size: frame.size,
      price: frame.retailPrice,
      manufacturer: frame.manufacturer,
      material: frame.material || 'plastic',
      style: determineStyle(frame),
      category: determineCategory(frame.retailPrice),
      inStock: true,
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
