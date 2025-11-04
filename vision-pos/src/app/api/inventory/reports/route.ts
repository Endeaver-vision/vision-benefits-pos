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
    const reportType = searchParams.get('type') || 'summary'

    switch (reportType) {
      case 'summary':
        return await generateSummaryReport(locationId)
      case 'low-stock':
        return await generateLowStockReport(locationId)
      case 'value':
        return await generateValueReport(locationId)
      case 'movement':
        return await generateMovementReport(locationId)
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

  } catch (error) {
    console.error('Inventory reports API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

async function generateSummaryReport(locationId: string) {
  const [
    totalItems,
    totalValue,
    lowStockItems,
    outOfStockItems,
    categoryBreakdown,
    recentMovements
  ] = await Promise.all([
    // Total items
    prisma.inventory.count({
      where: { locationId }
    }),

    // Total inventory value
    prisma.inventory.aggregate({
      where: { locationId },
      _sum: {
        currentStock: true
      }
    }).then(async () => {
      const inventoryWithCosts = await prisma.inventory.findMany({
        where: { locationId },
        select: {
          currentStock: true,
          costPrice: true
        }
      })
      return inventoryWithCosts.reduce((sum, item) => 
        sum + (item.currentStock * (item.costPrice || 0)), 0
      )
    }),

    // Low stock items
    prisma.inventory.count({
      where: {
        locationId,
        AND: [
          { currentStock: { gt: 0 } },
          { currentStock: { lte: prisma.inventory.fields.reorderPoint } }
        ]
      }
    }),

    // Out of stock items
    prisma.inventory.count({
      where: {
        locationId,
        availableStock: { lte: 0 }
      }
    }),

    // Category breakdown
    prisma.inventory.groupBy({
      by: ['productId'],
      where: { locationId },
      _sum: {
        currentStock: true
      },
      _count: true
    }).then(async () => {
      const categoryData = await prisma.productCategory.findMany({
        include: {
          products: {
            include: {
              inventory: {
                where: { locationId }
              }
            }
          }
        }
      })

      return categoryData.map(category => ({
        name: category.name,
        totalItems: category.products.filter(p => p.inventory.length > 0).length,
        totalStock: category.products.reduce((sum, product) => 
          sum + (product.inventory[0]?.currentStock || 0), 0
        ),
        totalValue: category.products.reduce((sum, product) => {
          const inv = product.inventory[0]
          return sum + ((inv?.currentStock || 0) * (inv?.costPrice || 0))
        }, 0)
      }))
    }),

    // Recent movements (last 7 days)
    prisma.inventoryMovement.count({
      where: {
        inventory: { locationId },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    })
  ])

  return NextResponse.json({
    data: {
      summary: {
        totalItems,
        totalValue,
        lowStockItems,
        outOfStockItems,
        recentMovements
      },
      categoryBreakdown,
      generatedAt: new Date().toISOString()
    }
  })
}

async function generateLowStockReport(locationId: string) {
  const lowStockItems = await prisma.inventory.findMany({
    where: {
      locationId,
      OR: [
        { availableStock: { lte: 0 } },
        {
          AND: [
            { currentStock: { gt: 0 } },
            { currentStock: { lte: prisma.inventory.fields.reorderPoint } }
          ]
        }
      ]
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
            }
          }
        }
      }
    },
    orderBy: {
      availableStock: 'asc'
    }
  })

  return NextResponse.json({
    data: {
      items: lowStockItems,
      summary: {
        total: lowStockItems.length,
        outOfStock: lowStockItems.filter(item => item.availableStock <= 0).length,
        lowStock: lowStockItems.filter(item => 
          item.availableStock > 0 && item.currentStock <= item.reorderPoint
        ).length
      },
      generatedAt: new Date().toISOString()
    }
  })
}

async function generateValueReport(locationId: string) {
  const inventoryValue = await prisma.inventory.findMany({
    where: { locationId },
    include: {
      product: {
        include: {
          category: true
        }
      }
    }
  })

  const valueData = inventoryValue.map(item => ({
    product: item.product,
    currentStock: item.currentStock,
    costPrice: item.costPrice || 0,
    totalValue: item.currentStock * (item.costPrice || 0),
    basePrice: item.product.basePrice,
    potentialRevenue: item.currentStock * item.product.basePrice
  }))

  const totalCostValue = valueData.reduce((sum, item) => sum + item.totalValue, 0)
  const totalRevenueValue = valueData.reduce((sum, item) => sum + item.potentialRevenue, 0)

  return NextResponse.json({
    data: {
      items: valueData.sort((a, b) => b.totalValue - a.totalValue),
      summary: {
        totalCostValue,
        totalRevenueValue,
        potentialProfit: totalRevenueValue - totalCostValue,
        profitMargin: totalCostValue > 0 ? 
          ((totalRevenueValue - totalCostValue) / totalRevenueValue * 100) : 0
      },
      generatedAt: new Date().toISOString()
    }
  })
}

async function generateMovementReport(locationId: string) {
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      inventory: { locationId },
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    include: {
      inventory: {
        include: {
          product: {
            include: {
              category: true
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
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100 // Limit to last 100 movements
  })

  const movementSummary = {
    totalMovements: movements.length,
    stockIn: movements.filter(m => m.quantity > 0).reduce((sum, m) => sum + m.quantity, 0),
    stockOut: movements.filter(m => m.quantity < 0).reduce((sum, m) => sum + Math.abs(m.quantity), 0),
    byType: movements.reduce((acc, movement) => {
      acc[movement.type] = (acc[movement.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return NextResponse.json({
    data: {
      movements,
      summary: movementSummary,
      generatedAt: new Date().toISOString()
    }
  })
}