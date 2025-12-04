import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (category !== 'all') {
      where.category = category
    }

    const [lenses, total] = await Promise.all([
      prisma.lensProduct.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
      prisma.lensProduct.count({ where }),
    ])

    return NextResponse.json({
      data: lenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching lenses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lenses' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Lens ID is required' },
        { status: 400 }
      )
    }

    const updated = await prisma.lensProduct.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error updating lens:', error)
    return NextResponse.json(
      { error: 'Failed to update lens' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle CSV import
    if (body.importData && Array.isArray(body.importData)) {
      const results = { created: 0, updated: 0, errors: 0 }

      for (const item of body.importData) {
        try {
          const sku = item.sku || item.name?.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)

          await prisma.lensProduct.upsert({
            where: { sku },
            update: {
              name: item.name,
              category: item.category || 'ADDON',
              wholesaleCost: item.wholesaleCost ? parseFloat(item.wholesaleCost) : null,
              retailPrice: parseFloat(item.retailPrice),
              multiplier: item.multiplier ? parseFloat(item.multiplier) : 3.0,
              manufacturer: item.manufacturer || null,
              updatedAt: new Date(),
            },
            create: {
              name: item.name,
              sku,
              category: item.category || 'ADDON',
              wholesaleCost: item.wholesaleCost ? parseFloat(item.wholesaleCost) : null,
              retailPrice: parseFloat(item.retailPrice),
              multiplier: item.multiplier ? parseFloat(item.multiplier) : 3.0,
              manufacturer: item.manufacturer || null,
              isActive: true,
            },
          })
          results.updated++
        } catch {
          results.errors++
        }
      }

      return NextResponse.json({ success: true, results })
    }

    // Create single lens
    const sku = body.sku || body.name?.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)

    const created = await prisma.lensProduct.create({
      data: {
        name: body.name,
        sku,
        category: body.category || 'ADDON',
        wholesaleCost: body.wholesaleCost,
        retailPrice: body.retailPrice,
        multiplier: body.multiplier || 3.0,
        manufacturer: body.manufacturer,
        isActive: true,
      },
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    console.error('Error creating lens:', error)
    return NextResponse.json(
      { error: 'Failed to create lens' },
      { status: 500 }
    )
  }
}
