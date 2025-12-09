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
    // Auth disabled for development - re-enable in production
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const lowStock = searchParams.get('lowStock') === 'true'
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const requestedLocationId = searchParams.get('locationId')

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

    // Query frames directly from the frames table
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

    // Query frames with their inventory by location
    const frames = await prisma.frame.findMany({
      where: frameWhere,
      orderBy: [
        { brand: 'asc' },
        { model: 'asc' }
      ],
      include: {
        inventory: {
          include: {
            location: true
          }
        }
      }
    })

    // Transform frames to InventoryItem format with per-location stock
    let inventory = frames.map(frame => {
      // Build stock by location from frame_inventory table
      const stockByLocation: { locationId: string; locationName: string; shortName: string; quantity: number }[] = []

      for (const inv of frame.inventory) {
        stockByLocation.push({
          locationId: inv.locationId,
          locationName: inv.location.name,
          shortName: getShortLocationName(inv.location.name),
          quantity: inv.quantity
        })
      }

      // Calculate total from inventory records, fallback to stockQuantity
      const totalStock = stockByLocation.length > 0
        ? stockByLocation.reduce((sum, loc) => sum + loc.quantity, 0)
        : frame.stockQuantity

      return {
        id: frame.id,
        currentStock: totalStock,
        reservedStock: 0,
        availableStock: totalStock,
        reorderPoint: DEFAULT_REORDER_POINT,
        reorderQuantity: 20,
        maxStock: null,
        costPrice: frame.wholesaleCost,
        lastRestocked: null,
        lastSold: null,
        product: {
          id: frame.id,
          name: `${frame.brand} ${frame.model}`,
          sku: frame.sku,
          manufacturer: frame.brand, // Use brand instead of manufacturer
          basePrice: frame.retailPrice,
          color: frame.color,
          colorCode: frame.colorCode,
          category: {
            id: 'frames',
            name: 'Frames'
          }
        },
        // Per-location stock breakdown
        stockByLocation,
        movements: []
      }
    })

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

    // Calculate total value (cost price * stock)
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
      summary: {
        totalItems: inventory.length,
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