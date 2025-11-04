import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { MovementType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can create inventory movements
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      inventoryId,
      type,
      quantity,
      reason,
      referenceType,
      referenceId,
      unitCost,
      notes
    } = body

    // Validate movement type
    if (!Object.values(MovementType).includes(type)) {
      return NextResponse.json({ error: 'Invalid movement type' }, { status: 400 })
    }

    // Get current inventory
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId }
    })

    if (!inventory) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    // Calculate new stock levels
    const newCurrentStock = inventory.currentStock + quantity
    const newAvailableStock = newCurrentStock - inventory.reservedStock

    // Validate stock levels
    if (newCurrentStock < 0) {
      return NextResponse.json(
        { error: 'Insufficient stock for this movement' },
        { status: 400 }
      )
    }

    // Create movement and update inventory in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the movement
      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId,
          type,
          quantity,
          reason,
          referenceType,
          referenceId,
          unitCost,
          userId: session.user.id,
          notes
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      })

      // Update inventory stock levels
      const updatedInventory = await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          currentStock: newCurrentStock,
          availableStock: newAvailableStock,
          ...(quantity > 0 && {
            lastRestocked: new Date()
          }),
          ...(quantity < 0 && {
            lastSold: new Date()
          }),
          ...(unitCost && {
            lastCostPrice: inventory.costPrice,
            costPrice: unitCost
          })
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

      return { movement, inventory: updatedInventory }
    })

    return NextResponse.json({ 
      data: result.movement,
      inventory: result.inventory
    }, { status: 201 })

  } catch (error) {
    console.error('Inventory movement creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create inventory movement' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const inventoryId = searchParams.get('inventoryId')
    const type = searchParams.get('type') as MovementType
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: {
      inventoryId?: string
      type?: MovementType
    } = {}
    
    if (inventoryId) {
      where.inventoryId = inventoryId
    }
    
    if (type && Object.values(MovementType).includes(type)) {
      where.type = type
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        inventory: {
          include: {
            product: {
              select: {
                name: true,
                sku: true
              }
            },
            location: {
              select: {
                name: true
              }
            }
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    const totalCount = await prisma.inventoryMovement.count({ where })

    return NextResponse.json({
      data: movements,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Inventory movements API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory movements' },
      { status: 500 }
    )
  }
}