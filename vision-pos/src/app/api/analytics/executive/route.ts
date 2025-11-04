// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, subDays, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const period = searchParams.get('period') || '30'; // days, week, month, quarter, year
    const locationId = searchParams.get('locationId');

    // Calculate date ranges
    const today = new Date();
    let startDate: Date, endDate: Date, previousStartDate: Date, previousEndDate: Date;

    switch (period) {
      case '7':
        startDate = startOfDay(subDays(today, 6));
        endDate = endOfDay(today);
        previousStartDate = startOfDay(subDays(startDate, 7));
        previousEndDate = endOfDay(subDays(endDate, 7));
        break;
      case '30':
        startDate = startOfDay(subDays(today, 29));
        endDate = endOfDay(today);
        previousStartDate = startOfDay(subDays(startDate, 30));
        previousEndDate = endOfDay(subDays(endDate, 30));
        break;
      case 'month':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        const previousMonth = subMonths(today, 1);
        previousStartDate = startOfMonth(previousMonth);
        previousEndDate = endOfMonth(previousMonth);
        break;
      case 'quarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        startDate = startOfDay(quarterStart);
        endDate = endOfDay(today);
        previousStartDate = startOfDay(subMonths(quarterStart, 3));
        previousEndDate = endOfDay(subDays(startDate, 1));
        break;
      case 'year':
        startDate = startOfDay(new Date(today.getFullYear(), 0, 1));
        endDate = endOfDay(today);
        previousStartDate = startOfDay(new Date(today.getFullYear() - 1, 0, 1));
        previousEndDate = endOfDay(new Date(today.getFullYear() - 1, 11, 31));
        break;
      default:
        startDate = startOfDay(subDays(today, parseInt(period)));
        endDate = endOfDay(today);
        previousStartDate = startOfDay(subDays(startDate, parseInt(period)));
        previousEndDate = endOfDay(subDays(endDate, parseInt(period)));
    }

    // Build where clauses
    const locationFilter = locationId ? { locationId } : {};
    const dateFilter = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
    const previousDateFilter = {
      createdAt: {
        gte: previousStartDate,
        lte: previousEndDate
      }
    };

    // 1. SALES PERFORMANCE METRICS
    const [
      currentTransactions,
      previousTransactions,
      totalCustomers,
      activeCustomers,
      inventoryItems,
      lowStockItems,
      totalSuppliers,
      pendingPurchaseOrders
    ] = await Promise.all([
      // Current period transactions
      prisma.transaction.findMany({
        where: {
          ...locationFilter,
          ...dateFilter,
          status: 'COMPLETED'
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          },
          customer: true
        }
      }),

      // Previous period transactions for comparison
      prisma.transaction.findMany({
        where: {
          ...locationFilter,
          ...previousDateFilter,
          status: 'COMPLETED'
        }
      }),

      // Customer metrics
      prisma.customer.count({
        where: { active: true }
      }),

      prisma.customer.count({
        where: {
          active: true,
          transactions: {
            some: dateFilter
          }
        }
      }),

      // Inventory metrics
      prisma.inventory.findMany({
        where: locationFilter,
        include: {
          product: {
            include: {
              category: true
            }
          },
          location: true
        }
      }),

      // Low stock items
      prisma.inventory.count({
        where: {
          ...locationFilter,
          OR: [
            { availableStock: { lte: 0 } },
            {
              availableStock: {
                lte: prisma.inventory.fields.reorderPoint
              }
            }
          ]
        }
      }),

      // Supplier metrics
      prisma.supplier.count({
        where: { active: true }
      }),

      // Purchase orders
      prisma.purchaseOrder.count({
        where: {
          ...locationFilter,
          status: {
            in: ['PENDING', 'SENT', 'CONFIRMED']
          }
        }
      })
    ]);

    // 2. CALCULATE KEY METRICS
    const currentRevenue = currentTransactions.reduce((sum, t) => sum + t.total, 0);
    const previousRevenue = previousTransactions.reduce((sum, t) => sum + t.total, 0);
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const currentTransactionCount = currentTransactions.length;
    const previousTransactionCount = previousTransactions.length;
    const transactionGrowth = previousTransactionCount > 0 ? 
      ((currentTransactionCount - previousTransactionCount) / previousTransactionCount) * 100 : 0;

    const averageOrderValue = currentTransactionCount > 0 ? currentRevenue / currentTransactionCount : 0;
    const previousAOV = previousTransactionCount > 0 ? previousRevenue / previousTransactionCount : 0;
    const aovGrowth = previousAOV > 0 ? ((averageOrderValue - previousAOV) / previousAOV) * 100 : 0;

    // 3. CATEGORY PERFORMANCE ANALYSIS
    const categoryPerformance = {};
    currentTransactions.forEach(transaction => {
      transaction.items.forEach(item => {
        const categoryName = item.product.category.name;
        if (!categoryPerformance[categoryName]) {
          categoryPerformance[categoryName] = {
            name: categoryName,
            revenue: 0,
            quantity: 0,
            transactions: new Set()
          };
        }
        categoryPerformance[categoryName].revenue += item.total;
        categoryPerformance[categoryName].quantity += item.quantity;
        categoryPerformance[categoryName].transactions.add(transaction.id);
      });
    });

    const categoryStats = Object.values(categoryPerformance).map(cat => ({
      ...cat,
      transactions: cat.transactions.size,
      averageOrderValue: cat.transactions.size > 0 ? cat.revenue / cat.transactions.size : 0
    })).sort((a, b) => b.revenue - a.revenue);

    // 4. CUSTOMER ANALYTICS
    const customerAnalytics = currentTransactions.reduce((acc, transaction) => {
      const customerId = transaction.customerId;
      if (!acc[customerId]) {
        acc[customerId] = {
          customer: transaction.customer,
          totalSpent: 0,
          transactionCount: 0,
          lastPurchase: transaction.createdAt
        };
      }
      acc[customerId].totalSpent += transaction.total;
      acc[customerId].transactionCount++;
      if (transaction.createdAt > acc[customerId].lastPurchase) {
        acc[customerId].lastPurchase = transaction.createdAt;
      }
      return acc;
    }, {});

    const topCustomers = Object.values(customerAnalytics)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    const repeatCustomers = Object.values(customerAnalytics)
      .filter(c => c.transactionCount > 1).length;

    const customerRetentionRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    // 5. INVENTORY ANALYTICS
    const totalInventoryValue = inventoryItems.reduce((sum, item) => 
      sum + (item.currentStock * (item.costPrice || 0)), 0);

    const inventoryTurnover = inventoryItems.reduce((acc, item) => {
      const movements = currentTransactions
        .flatMap(t => t.items)
        .filter(i => i.productId === item.productId)
        .reduce((sum, i) => sum + i.quantity, 0);
      
      const averageStock = (item.currentStock + item.reorderPoint) / 2;
      const turnover = averageStock > 0 ? movements / averageStock : 0;
      
      return acc + turnover;
    }, 0) / Math.max(inventoryItems.length, 1);

    // 6. FINANCIAL METRICS
    const insuranceRevenue = currentTransactions.reduce((sum, t) => sum + (t.insuranceDiscount || 0), 0);
    const patientRevenue = currentRevenue - insuranceRevenue;
    const averageInsuranceDiscount = currentTransactionCount > 0 ? insuranceRevenue / currentTransactionCount : 0;

    // 7. DAILY TRENDS (last 30 days for charts)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(today, 29 - i);
      return {
        date: format(date, 'yyyy-MM-dd'),
        dayName: format(date, 'EEE')
      };
    });

    const dailyMetrics = await Promise.all(
      last30Days.map(async (day) => {
        const dayStart = startOfDay(new Date(day.date));
        const dayEnd = endOfDay(new Date(day.date));

        const dayTransactions = await prisma.transaction.findMany({
          where: {
            ...locationFilter,
            createdAt: {
              gte: dayStart,
              lte: dayEnd
            },
            status: 'COMPLETED'
          }
        });

        const dayRevenue = dayTransactions.reduce((sum, t) => sum + t.total, 0);
        const dayCount = dayTransactions.length;
        const dayAOV = dayCount > 0 ? dayRevenue / dayCount : 0;

        return {
          date: day.date,
          dayName: day.dayName,
          revenue: dayRevenue,
          transactions: dayCount,
          averageOrderValue: dayAOV
        };
      })
    );

    // 8. PERFORMANCE INDICATORS
    const performanceIndicators = {
      salesGrowth: {
        current: currentRevenue,
        previous: previousRevenue,
        growth: revenueGrowth,
        trend: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable'
      },
      transactionVolume: {
        current: currentTransactionCount,
        previous: previousTransactionCount,
        growth: transactionGrowth,
        trend: transactionGrowth > 0 ? 'up' : transactionGrowth < 0 ? 'down' : 'stable'
      },
      averageOrderValue: {
        current: averageOrderValue,
        previous: previousAOV,
        growth: aovGrowth,
        trend: aovGrowth > 0 ? 'up' : aovGrowth < 0 ? 'down' : 'stable'
      },
      customerRetention: {
        current: customerRetentionRate,
        trend: customerRetentionRate > 70 ? 'up' : customerRetentionRate > 50 ? 'stable' : 'down'
      }
    };

    // 9. ALERTS AND NOTIFICATIONS
    const alerts = [];
    
    if (lowStockItems > 0) {
      alerts.push({
        type: 'warning',
        message: `${lowStockItems} items are low on stock or out of stock`,
        action: 'Review inventory levels',
        priority: 'high'
      });
    }

    if (pendingPurchaseOrders > 0) {
      alerts.push({
        type: 'info',
        message: `${pendingPurchaseOrders} purchase orders pending`,
        action: 'Review purchase orders',
        priority: 'medium'
      });
    }

    if (revenueGrowth < -10) {
      alerts.push({
        type: 'error',
        message: `Revenue declined by ${Math.abs(revenueGrowth).toFixed(1)}% compared to previous period`,
        action: 'Analyze sales performance',
        priority: 'high'
      });
    }

    if (customerRetentionRate < 50) {
      alerts.push({
        type: 'warning',
        message: `Customer retention rate is below 50% (${customerRetentionRate.toFixed(1)}%)`,
        action: 'Review customer engagement strategies',
        priority: 'medium'
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd')
        },
        keyMetrics: {
          revenue: currentRevenue,
          transactions: currentTransactionCount,
          averageOrderValue,
          activeCustomers,
          totalCustomers,
          customerRetentionRate,
          inventoryValue: totalInventoryValue,
          inventoryTurnover,
          lowStockItems,
          pendingOrders: pendingPurchaseOrders
        },
        performanceIndicators,
        categoryPerformance: categoryStats,
        topCustomers,
        dailyTrends: dailyMetrics,
        financialBreakdown: {
          totalRevenue: currentRevenue,
          insuranceRevenue,
          patientRevenue,
          averageInsuranceDiscount
        },
        operationalMetrics: {
          totalInventoryItems: inventoryItems.length,
          totalSuppliers,
          averageInventoryTurnover: inventoryTurnover
        },
        alerts
      }
    });

  } catch (error) {
    console.error('Executive dashboard API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch executive dashboard data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}