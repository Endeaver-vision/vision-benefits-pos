import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const inventory = await prisma.inventory.findUnique({
      where: { id: params.id },
      include: {
        products: {
          include: {
            category: true,
            suppliers: {
              include: {
                supplier: true
              },
              where: {
                active: true
              }
            }
          }
        },
        location: true,
        movements: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 20,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    if (!inventory) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    return NextResponse.json({ data: inventory })

  } catch (error) {
    console.error('Inventory item API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can update inventory
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      currentStock,
      reorderPoint,
      reorderQuantity,
      maxStock,
      costPrice,
      reason
    } = body

    // Get current inventory
    const currentInventory = await prisma.inventory.findUnique({
      where: { id: params.id }
    })

    if (!currentInventory) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    // Calculate stock difference for movement tracking
    const stockDifference = currentStock !== undefined 
      ? currentStock - currentInventory.currentStock 
      : 0

    // Update inventory
    const updatedInventory = await prisma.inventory.update({
      where: { id: params.id },
      data: {
        ...(currentStock !== undefined && {
          currentStock,
          availableStock: currentStock - currentInventory.reservedStock
        }),
        ...(reorderPoint !== undefined && { reorderPoint }),
        ...(reorderQuantity !== undefined && { reorderQuantity }),
        ...(maxStock !== undefined && { maxStock }),
        ...(costPrice !== undefined && { costPrice }),
        ...(currentStock !== undefined && currentStock > currentInventory.currentStock && {
          lastRestocked: new Date()
        })
      },
      include: {
        products: {
          include: {
            category: true
          }
        },
        locations: true
      }
    })

    // Create inventory movement if stock changed
    if (stockDifference !== 0) {
      await prisma.inventory_movements.create({
        data: {
          inventoryId: params.id,
          type: stockDifference > 0 ? 'ADJUSTMENT' : 'ADJUSTMENT',
          quantity: stockDifference,
          reason: reason || (stockDifference > 0 ? 'Stock increase adjustment' : 'Stock decrease adjustment'),
          referenceType: 'adjustment',
          unitCost: costPrice,
          userId: session.user.id,
          notes: `Stock updated from ${currentInventory.currentStock} to ${currentStock}`
        }
      })
    }

    return NextResponse.json({ data: updatedInventory })

  } catch (error) {
    console.error('Inventory update error:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete inventory records
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if inventory exists and has no reserved stock
    const inventory = await prisma.inventory.findUnique({
      where: { id: params.id }
    })

    if (!inventory) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    if (inventory.reservedStock > 0) {
      return NextResponse.json(
        { error: 'Cannot delete inventory with reserved stock' },
        { status: 400 }
      )
    }

    // Delete all movements first, then inventory
    await prisma.inventory_movements.deleteMany({
      where: { inventoryId: params.id }
    })

    await prisma.inventory.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Inventory item deleted successfully' })

  } catch (error) {
    console.error('Inventory deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    )
  }
}