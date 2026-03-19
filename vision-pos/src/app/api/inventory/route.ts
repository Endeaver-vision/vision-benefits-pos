import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Prisma } from '@prisma/client'

const DEFAULT_REORDER_POINT = 5

// Short location name mapping for display
const LOCATION_SHORT_NAMES: Record<string, string> = {
  'Insight': 'Insight',
  'Spectrum': 'Spectrum',
}

function getShortLocationName(name: string): string {
  // Check if the name contains any of the known location names
  for (const [key, shortName] of Object.entries(LOCATION_SHORT_NAMES)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return shortName
    }
  }
  // Default to first word
  return name.split(' ')[0]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productType = searchParams.get('type') || 'frames'
    const lowStock = searchParams.get('lowStock') === 'true'
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Fetch all active locations (excluding erroneous ones)
    const allLocations = await prisma.location.findMany({
      where: {
        active: true,
        NOT: {
          OR: [
            { name: { contains: 'Insurance', mode: 'insensitive' } },
            { name: { equals: 'Default', mode: 'insensitive' } },
            { name: { contains: 'Scanner', mode: 'insensitive' } },
          ]
        }
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })

    let inventory: Array<{
      id: string
      currentStock: number
      reservedStock: number
      availableStock: number
      reorderPoint: number
      reorderQuantity: number
      maxStock: number | null
      costPrice: number | null
      lastRestocked: string | null
      lastSold: string | null
      product: {
        id: string
        name: string
        sku: string | null
        manufacturer: string | null
        basePrice: number
        color?: string
        colorCode?: string
        category: { id: string; name: string }
      }
      stockByLocation: Array<{ locationId: string; locationName: string; shortName: string; quantity: number }>
      movements: unknown[]
    }> = []

    let totalCount = 0

    // Route based on product type
    if (productType === 'frames') {
      const frameWhere: Prisma.FrameWhereInput = {
        isActive: true,
        ...(search && {
          OR: [
            { brand: { contains: search, mode: 'insensitive' } },
            { model: { contains: search, mode: 'insensitive' } },
            { manufacturer: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { upc: { contains: search, mode: 'insensitive' } }
          ]
        })
      }

      const [frames, count] = await Promise.all([
        prisma.frame.findMany({
          where: frameWhere,
          orderBy: [{ brand: 'asc' }, { model: 'asc' }],
          skip: offset,
          take: limit
        }),
        prisma.frame.count({ where: frameWhere })
      ])

      totalCount = count

      // Map frames to inventory format
      inventory = frames.map(frame => ({
        id: frame.id,
        currentStock: frame.stockQuantity,
        reservedStock: 0,
        availableStock: frame.stockQuantity,
        reorderPoint: DEFAULT_REORDER_POINT,
        reorderQuantity: 10,
        maxStock: null,
        costPrice: frame.wholesaleCost,
        lastRestocked: null,
        lastSold: null,
        product: {
          id: frame.id,
          name: `${frame.brand} ${frame.model}`,
          sku: frame.sku,
          manufacturer: frame.brand,
          basePrice: frame.retailPrice,
          color: frame.color,
          colorCode: frame.colorCode || undefined,
          category: { id: 'frames', name: 'Frames' }
        },
        stockByLocation: [],
        movements: []
      }))
    } else if (productType === 'supplements') {
      const suppWhere: Prisma.SupplementWhereInput = {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } }
          ]
        })
      }

      const supplements = await prisma.supplement.findMany({
        where: suppWhere,
        orderBy: [{ brand: 'asc' }, { name: 'asc' }]
      })

      inventory = supplements.map(supp => ({
        id: supp.id,
        currentStock: supp.stockQuantity,
        reservedStock: 0,
        availableStock: supp.stockQuantity,
        reorderPoint: supp.reorderPoint,
        reorderQuantity: 20,
        maxStock: null,
        costPrice: supp.wholesaleCost,
        lastRestocked: null,
        lastSold: null,
        product: {
          id: supp.id,
          name: supp.name,
          sku: supp.sku,
          manufacturer: supp.brand,
          basePrice: supp.retailPrice,
          category: { id: 'supplements', name: 'Supplements' }
        },
        stockByLocation: [],
        movements: []
      }))
    } else if (productType === 'dryeye') {
      const dryEyeWhere: Prisma.DryEyeProductWhereInput = {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } }
          ]
        })
      }

      const dryEyeProducts = await prisma.dryEyeProduct.findMany({
        where: dryEyeWhere,
        orderBy: [{ brand: 'asc' }, { name: 'asc' }]
      })

      inventory = dryEyeProducts.map(de => ({
        id: de.id,
        currentStock: de.stockQuantity,
        reservedStock: 0,
        availableStock: de.stockQuantity,
        reorderPoint: de.reorderPoint,
        reorderQuantity: 20,
        maxStock: null,
        costPrice: de.wholesaleCost,
        lastRestocked: null,
        lastSold: null,
        product: {
          id: de.id,
          name: de.name,
          sku: de.sku,
          manufacturer: de.brand,
          basePrice: de.retailPrice,
          category: { id: 'dryeye', name: 'Dry Eye Products' }
        },
        stockByLocation: [],
        movements: []
      }))
    }

    // Filter for low stock if requested
    if (lowStock) {
      inventory = inventory.filter(item =>
        item.currentStock <= item.reorderPoint || item.availableStock <= 0
      )
    }

    // Calculate low stock items
    const lowStockCount = inventory.filter(item =>
      item.currentStock <= item.reorderPoint || item.availableStock <= 0
    ).length

    // Calculate total wholesale value (cost price * stock)
    const totalValue = inventory.reduce((sum, item) =>
      sum + (item.currentStock * (item.costPrice || 0)), 0
    )

    return NextResponse.json({
      success: true,
      data: inventory,
      locations: allLocations.map(loc => ({
        id: loc.id,
        name: loc.name,
        shortName: getShortLocationName(loc.name)
      })),
      pagination: {
        page,
        limit,
        total: totalCount || inventory.length,
        totalPages: Math.ceil((totalCount || inventory.length) / limit)
      },
      summary: {
        totalItems: totalCount || inventory.length,
        lowStockCount,
        totalValue,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Inventory API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can create inventory records
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      productId,
      locationId = session.user.locationId,
      currentStock = 0,
      reorderPoint = 5,
      reorderQuantity = 20,
      maxStock,
      costPrice
    } = body

    // Check if inventory record already exists
    const existing = await prisma.inventory.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Inventory record already exists for this product at this location' },
        { status: 400 }
      )
    }

    // Create inventory record
    const inventory = await prisma.inventory.create({
      data: {
        productId,
        locationId,
        currentStock,
        reservedStock: 0,
        availableStock: currentStock,
        reorderPoint,
        reorderQuantity,
        maxStock,
        costPrice,
        lastRestocked: currentStock > 0 ? new Date() : null
      },
      include: {
        product: {
          include: {
            category: true
          }
        },
        location: true
      }
    })

    // Create initial inventory movement if stock > 0
    if (currentStock > 0) {
      await prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: 'RESTOCK',
          quantity: currentStock,
          reason: 'Initial stock setup',
          referenceType: 'adjustment',
          unitCost: costPrice,
          userId: session.user.id
        }
      })
    }

    return NextResponse.json({ data: inventory }, { status: 201 })

  } catch (error) {
    console.error('Inventory creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create inventory record' },
      { status: 500 }
    )
  }
}