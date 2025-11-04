import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId') || session.user.locationId
    const lowStock = searchParams.get('lowStock') === 'true'
    const search = searchParams.get('search')
    const categoryId = searchParams.get('categoryId')
    
    const where: Prisma.InventoryWhereInput = {
      locationId,
      ...(lowStock && {
        OR: [
          { currentStock: { lte: prisma.inventory.fields.reorderPoint } },
          { availableStock: { lte: 0 } }
        ]
      }),
      ...(search && {
        product: {
          OR: [
            { name: { contains: search } },
            { sku: { contains: search } },
            { manufacturer: { contains: search } }
          ]
        }
      }),
      ...(categoryId && {
        product: {
          categoryId
        }
      })
    }

    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        product: {
          include: {
            category: true
          }
        },
        location: true,
        movements: {
          take: 5,
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: [
        { product: { name: 'asc' } }
      ]
    })

    // Calculate low stock items
    const lowStockCount = inventory.filter(item => 
      item.currentStock <= item.reorderPoint || item.availableStock <= 0
    ).length

    // Calculate total value
    const totalValue = inventory.reduce((sum, item) => 
      sum + (item.currentStock * (item.costPrice || 0)), 0
    )

    return NextResponse.json({
      data: inventory,
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