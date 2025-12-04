import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const brand = searchParams.get('brand') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (brand !== 'all') {
      where.brand = brand
    }

    const [frames, total, brands] = await Promise.all([
      prisma.frame.findMany({
        where,
        orderBy: [{ brand: 'asc' }, { model: 'asc' }],
        skip: offset,
        take: limit,
      }),
      prisma.frame.count({ where }),
      prisma.frame.findMany({
        where: { isActive: true },
        select: { brand: true },
        distinct: ['brand'],
        orderBy: { brand: 'asc' },
      }),
    ])

    return NextResponse.json({
      data: frames,
      brands: brands.map(b => b.brand),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching frames:', error)
    return NextResponse.json(
      { error: 'Failed to fetch frames' },
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
        { error: 'Frame ID is required' },
        { status: 400 }
      )
    }

    const updated = await prisma.frame.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error updating frame:', error)
    return NextResponse.json(
      { error: 'Failed to update frame' },
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
          const sku = item.sku || `${item.brand}-${item.model}-${item.colorCode || item.color}`
            .toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)

          await prisma.frame.upsert({
            where: { sku },
            update: {
              manufacturer: item.manufacturer || 'Unknown',
              brand: item.brand,
              collection: item.collection || null,
              model: item.model,
              color: item.color,
              colorCode: item.colorCode || null,
              eyeSize: item.eyeSize ? parseInt(item.eyeSize) : null,
              bridge: item.bridge ? parseInt(item.bridge) : null,
              temple: item.temple ? parseInt(item.temple) : null,
              wholesaleCost: item.wholesaleCost ? parseFloat(item.wholesaleCost) : null,
              retailPrice: parseFloat(item.retailPrice),
              stockQuantity: item.stockQuantity ? parseInt(item.stockQuantity) : 0,
              updatedAt: new Date(),
            },
            create: {
              manufacturer: item.manufacturer || 'Unknown',
              brand: item.brand,
              collection: item.collection || null,
              model: item.model,
              color: item.color,
              colorCode: item.colorCode || null,
              eyeSize: item.eyeSize ? parseInt(item.eyeSize) : null,
              bridge: item.bridge ? parseInt(item.bridge) : null,
              temple: item.temple ? parseInt(item.temple) : null,
              sku,
              wholesaleCost: item.wholesaleCost ? parseFloat(item.wholesaleCost) : null,
              retailPrice: parseFloat(item.retailPrice),
              stockQuantity: item.stockQuantity ? parseInt(item.stockQuantity) : 0,
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

    // Create single frame
    const sku = body.sku || `${body.brand}-${body.model}-${body.colorCode || body.color}`
      .toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)

    const created = await prisma.frame.create({
      data: {
        manufacturer: body.manufacturer || 'Unknown',
        brand: body.brand,
        collection: body.collection,
        model: body.model,
        color: body.color,
        colorCode: body.colorCode,
        eyeSize: body.eyeSize,
        bridge: body.bridge,
        temple: body.temple,
        sku,
        wholesaleCost: body.wholesaleCost,
        retailPrice: body.retailPrice,
        stockQuantity: body.stockQuantity || 0,
        isActive: true,
      },
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    console.error('Error creating frame:', error)
    return NextResponse.json(
      { error: 'Failed to create frame' },
      { status: 500 }
    )
  }
}
