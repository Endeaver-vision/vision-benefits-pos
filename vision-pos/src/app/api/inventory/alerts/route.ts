import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId') || session.user.locationId
    const severity = searchParams.get('severity') // 'critical', 'low', 'all'

    // Build where conditions based on severity
    const stockConditions: Array<Record<string, unknown>> = []
    
    if (severity === 'critical' || severity === 'all') {
      stockConditions.push({ availableStock: { lte: 0 } }) // Out of stock
    }
    
    if (severity === 'low' || severity === 'all' || !severity) {
      // Items at or below reorder point but not out of stock
      stockConditions.push({
        AND: [
          { currentStock: { gt: 0 } },
          { currentStock: { lte: prisma.inventory.fields.reorderPoint } }
        ]
      })
    }

    const alerts = await prisma.inventory.findMany({
      where: {
        locationId,
        OR: stockConditions
      },
      include: {
        product: {
          include: {
            category: true,
            suppliers: {
              include: {
                supplier: true
              },
              where: {
                isPrimary: true,
                active: true
              },
              take: 1
            }
          }
        },
        location: true
      },
      orderBy: [
        { availableStock: 'asc' }, // Most critical first
        { currentStock: 'asc' },
        { product: { name: 'asc' } }
      ]
    })

    // Categorize alerts by severity
    const categorizedAlerts = {
      critical: alerts.filter(item => item.availableStock <= 0),
      low: alerts.filter(item => 
        item.availableStock > 0 && 
        item.currentStock <= item.reorderPoint
      ),
      summary: {
        total: alerts.length,
        critical: alerts.filter(item => item.availableStock <= 0).length,
        low: alerts.filter(item => 
          item.availableStock > 0 && 
          item.currentStock <= item.reorderPoint
        ).length
      }
    }

    return NextResponse.json({
      data: categorizedAlerts,
      locationId
    })

  } catch (error) {
    console.error('Stock alerts API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock alerts' },
      { status: 500 }
    )
  }
}

// POST endpoint to acknowledge/dismiss alerts (future feature)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { inventoryId, action, notes } = body

    if (action === 'acknowledge') {
      // Create a movement record to acknowledge the alert
      await prisma.inventoryMovement.create({
        data: {
          inventoryId,
          type: 'ADJUSTMENT',
          quantity: 0, // No stock change, just acknowledgment
          reason: 'Alert acknowledged',
          referenceType: 'alert_acknowledgment',
          userId: session.user.id,
          notes: notes || 'Low stock alert acknowledged by user'
        }
      })

      return NextResponse.json({ 
        message: 'Alert acknowledged successfully' 
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Stock alert action error:', error)
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    )
  }
}