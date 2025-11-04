// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const startDate = searchParams.get('startDate') || format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const endDate = searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd');
    const locationId = searchParams.get('locationId');
    const categoryId = searchParams.get('categoryId');
    const supplierId = searchParams.get('supplierId');
    const lowStock = searchParams.get('lowStock') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');

    const startDateTime = startOfDay(new Date(startDate));
    const endDateTime = endOfDay(new Date(endDate));

    // Build where clauses
    const inventoryWhere: any = {};
    const movementWhere: any = {
      createdAt: {
        gte: startDateTime,
        lte: endDateTime
      }
    };

    if (locationId) {
      inventoryWhere.locationId = locationId;
    }

    if (categoryId) {
      inventoryWhere.product = {
        categoryId: categoryId
      };
    }

    if (supplierId) {
      inventoryWhere.product = {
        ...inventoryWhere.product,
        suppliers: {
          some: {
            supplierId: supplierId,
            isPrimary: true
          }
        }
      };
    }

    if (lowStock) {
      inventoryWhere.availableStock = {
        lte: prisma.inventory.fields.reorderPoint
      };
    }

    // 1. Get inventory records with comprehensive data
    const inventoryItems = await prisma.inventory.findMany({
      where: inventoryWhere,
      include: {
        product: {
          include: {
            category: true,
            suppliers: {
              where: { isPrimary: true },
              include: {
                supplier: true
              }
            }
          }
        },
        location: true,
        movements: {
          where: movementWhere,
          include: {
            user: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      take: limit,
      orderBy: {
        product: {
          name: 'asc'
        }
      }
    });

    // 2. Calculate turnover rates and analytics
    const analyticsData = inventoryItems.map(item => {
      const movements = item.movements;
      const sales = movements.filter(m => m.type === 'SALE');
      const restocks = movements.filter(m => m.type === 'RESTOCK');
      const adjustments = movements.filter(m => m.type === 'ADJUSTMENT');
      
      // Calculate turnover metrics
      const totalSold = Math.abs(sales.reduce((sum, sale) => sum + sale.quantity, 0));
      const averageStock = (item.currentStock + item.reorderPoint) / 2;
      const daysBetween = Math.max((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24), 1);
      
      // Inventory turnover rate (times per period)
      const turnoverRate = averageStock > 0 ? totalSold / averageStock : 0;
      
      // Days of inventory remaining
      const dailySalesRate = totalSold / daysBetween;
      const daysOfInventory = dailySalesRate > 0 ? item.availableStock / dailySalesRate : 999;
      
      // Stock status
      const stockStatus = item.availableStock <= 0 ? 'OUT_OF_STOCK' :
                         item.availableStock <= item.reorderPoint ? 'LOW_STOCK' :
                         item.availableStock >= (item.maxStock || item.reorderQuantity * 3) ? 'OVERSTOCK' :
                         'NORMAL';

      // Reorder recommendations
      const shouldReorder = item.availableStock <= item.reorderPoint;
      const urgentReorder = item.availableStock <= (item.reorderPoint * 0.5);
      
      // Cost analysis
      const currentValue = item.currentStock * (item.costPrice || 0);
      const reorderValue = item.reorderQuantity * (item.costPrice || 0);
      
      // Performance metrics
      const lastMovement = movements[0];
      const daysSinceLastMovement = lastMovement ? 
        Math.floor((new Date().getTime() - lastMovement.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 
        null;

      return {
        ...item,
        analytics: {
          turnoverRate,
          daysOfInventory,
          stockStatus,
          shouldReorder,
          urgentReorder,
          totalSold,
          averageStock,
          currentValue,
          reorderValue,
          dailySalesRate,
          daysSinceLastMovement,
          movementCounts: {
            sales: sales.length,
            restocks: restocks.length,
            adjustments: adjustments.length,
            total: movements.length
          }
        }
      };
    });

    // 3. Generate summary statistics
    const summary = {
      totalItems: analyticsData.length,
      totalValue: analyticsData.reduce((sum, item) => sum + item.analytics.currentValue, 0),
      avgTurnoverRate: analyticsData.reduce((sum, item) => sum + item.analytics.turnoverRate, 0) / analyticsData.length,
      
      stockStatus: {
        outOfStock: analyticsData.filter(item => item.analytics.stockStatus === 'OUT_OF_STOCK').length,
        lowStock: analyticsData.filter(item => item.analytics.stockStatus === 'LOW_STOCK').length,
        normal: analyticsData.filter(item => item.analytics.stockStatus === 'NORMAL').length,
        overstock: analyticsData.filter(item => item.analytics.stockStatus === 'OVERSTOCK').length
      },
      
      reorderAlerts: {
        urgent: analyticsData.filter(item => item.analytics.urgentReorder).length,
        recommended: analyticsData.filter(item => item.analytics.shouldReorder).length,
        totalValue: analyticsData
          .filter(item => item.analytics.shouldReorder)
          .reduce((sum, item) => sum + item.analytics.reorderValue, 0)
      }
    };

    // 4. Top performers analysis
    const topPerformers = {
      fastestTurning: analyticsData
        .sort((a, b) => b.analytics.turnoverRate - a.analytics.turnoverRate)
        .slice(0, 10),
      
      slowestTurning: analyticsData
        .filter(item => item.analytics.turnoverRate > 0)
        .sort((a, b) => a.analytics.turnoverRate - b.analytics.turnoverRate)
        .slice(0, 10),
      
      highestValue: analyticsData
        .sort((a, b) => b.analytics.currentValue - a.analytics.currentValue)
        .slice(0, 10),
      
      mostSold: analyticsData
        .sort((a, b) => b.analytics.totalSold - a.analytics.totalSold)
        .slice(0, 10)
    };

    // 5. Category analysis
    const categoryStats = analyticsData.reduce((acc, item) => {
      const categoryName = item.product.category.name;
      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          totalItems: 0,
          totalValue: 0,
          avgTurnover: 0,
          totalSold: 0,
          needsReorder: 0
        };
      }
      
      acc[categoryName].totalItems++;
      acc[categoryName].totalValue += item.analytics.currentValue;
      acc[categoryName].avgTurnover += item.analytics.turnoverRate;
      acc[categoryName].totalSold += item.analytics.totalSold;
      if (item.analytics.shouldReorder) acc[categoryName].needsReorder++;
      
      return acc;
    }, {});

    // Calculate averages for categories
    Object.values(categoryStats).forEach(category => {
      category.avgTurnover = category.avgTurnover / category.totalItems;
    });

    // 6. Supplier performance analysis
    const supplierStats = {};
    analyticsData.forEach(item => {
      if (item.product.suppliers && item.product.suppliers.length > 0) {
        const supplier = item.product.suppliers[0].supplier;
        if (!supplierStats[supplier.id]) {
          supplierStats[supplier.id] = {
            name: supplier.name,
            totalProducts: 0,
            avgTurnover: 0,
            totalValue: 0,
            productsNeedingReorder: 0,
            leadTime: item.product.suppliers[0].leadTimeDays || 0
          };
        }
        
        supplierStats[supplier.id].totalProducts++;
        supplierStats[supplier.id].avgTurnover += item.analytics.turnoverRate;
        supplierStats[supplier.id].totalValue += item.analytics.currentValue;
        if (item.analytics.shouldReorder) supplierStats[supplier.id].productsNeedingReorder++;
      }
    });

    // Calculate supplier averages
    Object.values(supplierStats).forEach(supplier => {
      supplier.avgTurnover = supplier.avgTurnover / supplier.totalProducts;
    });

    // 7. Recent activity timeline
    const allMovements = analyticsData.flatMap(item => 
      item.movements.map(movement => ({
        ...movement,
        productName: item.product.name,
        categoryName: item.product.category.name
      }))
    ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 50);

    return NextResponse.json({
      success: true,
      data: {
        inventory: analyticsData,
        summary,
        topPerformers,
        categoryAnalysis: Object.values(categoryStats),
        supplierAnalysis: Object.values(supplierStats),
        recentActivity: allMovements,
        filters: {
          startDate,
          endDate,
          locationId,
          categoryId,
          supplierId,
          lowStock
        }
      }
    });

  } catch (error) {
    console.error('Inventory analytics API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch inventory analytics',
        details: error.message 
      },
      { status: 500 }
    );
  }
}