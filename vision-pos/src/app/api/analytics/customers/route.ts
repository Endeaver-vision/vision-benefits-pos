import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationId = searchParams.get('locationId');
    const insuranceCarrier = searchParams.get('insuranceCarrier');
    const minTransactions = parseInt(searchParams.get('minTransactions') || '0');
    const minSpent = parseFloat(searchParams.get('minSpent') || '0');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build transaction filters
    const transactionFilters: Prisma.TransactionWhereInput = {};

    // Date range filter
    if (startDate || endDate) {
      transactionFilters.createdAt = {};
      if (startDate) {
        transactionFilters.createdAt.gte = startOfDay(parseISO(startDate));
      }
      if (endDate) {
        transactionFilters.createdAt.lte = endOfDay(parseISO(endDate));
      }
    }

    // Location filter
    if (locationId) {
      transactionFilters.locationId = locationId;
    }

    // Insurance carrier filter
    if (insuranceCarrier) {
      transactionFilters.insuranceCarrier = insuranceCarrier;
    }

    // Only completed transactions
    transactionFilters.status = 'COMPLETED';

    // Get comprehensive customer analytics
    const customers = await prisma.customer.findMany({
      include: {
        transactions: {
          where: transactionFilters,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    category: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            location: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: limit,
    });

    // Process customer analytics
    const customerAnalytics = customers
      .map((customer) => {
        const transactions = customer.transactions;
        
        if (transactions.length === 0) return null;

        // Basic metrics
        const totalSpent = transactions.reduce((sum, t) => sum + t.total, 0);
        const totalTransactions = transactions.length;
        const averageTransactionValue = totalSpent / totalTransactions;
        
        // Date analysis
        const firstPurchase = new Date(Math.min(...transactions.map(t => new Date(t.createdAt).getTime())));
        const lastPurchase = new Date(Math.max(...transactions.map(t => new Date(t.createdAt).getTime())));
        const daysSinceFirstPurchase = Math.floor((new Date().getTime() - firstPurchase.getTime()) / (1000 * 60 * 60 * 24));
        const daysSinceLastPurchase = Math.floor((new Date().getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
        
        // Insurance analysis
        const insuranceUsage = transactions.reduce((acc, t) => {
          const carrier = t.insuranceCarrier || 'No Insurance';
          if (!acc[carrier]) {
            acc[carrier] = { count: 0, totalSavings: 0 };
          }
          acc[carrier].count++;
          acc[carrier].totalSavings += t.insuranceDiscount;
          return acc;
        }, {} as Record<string, { count: number; totalSavings: number }>);

        // Product category preferences
        const categoryPreferences = transactions.flatMap(t => t.items).reduce((acc, item) => {
          const category = item.product.category.name;
          if (!acc[category]) {
            acc[category] = { count: 0, totalSpent: 0 };
          }
          acc[category].count += item.quantity;
          acc[category].totalSpent += item.total;
          return acc;
        }, {} as Record<string, { count: number; totalSpent: number }>);

        // Location preferences
        const locationPreferences = transactions.reduce((acc, t) => {
          const location = t.location.name;
          if (!acc[location]) {
            acc[location] = 0;
          }
          acc[location]++;
          return acc;
        }, {} as Record<string, number>);

        // Customer lifetime value calculation
        const purchaseFrequency = daysSinceFirstPurchase > 0 ? totalTransactions / (daysSinceFirstPurchase / 30) : 0; // purchases per month
        const estimatedLifetimeValue = averageTransactionValue * purchaseFrequency * 24; // 2 year estimate

        return {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          insuranceCarrier: customer.insuranceCarrier,
          createdAt: customer.createdAt,
          
          // Analytics
          totalSpent,
          totalTransactions,
          averageTransactionValue,
          firstPurchase,
          lastPurchase,
          daysSinceFirstPurchase,
          daysSinceLastPurchase,
          purchaseFrequency,
          estimatedLifetimeValue,
          
          // Preferences and patterns
          insuranceUsage,
          categoryPreferences,
          locationPreferences,
          
          // Loyalty indicators
          isRepeatCustomer: totalTransactions > 1,
          isRecentCustomer: daysSinceLastPurchase <= 30,
          isHighValueCustomer: totalSpent > 500,
          isFrequentCustomer: totalTransactions >= 3,
        };
      })
      .filter((customer) => {
        if (!customer) return false;
        if (customer.totalTransactions < minTransactions) return false;
        if (customer.totalSpent < minSpent) return false;
        return true;
      })
      .sort((a, b) => b!.totalSpent - a!.totalSpent);

    // Calculate overall metrics
    const totalCustomers = customerAnalytics.length;
    const totalRevenue = customerAnalytics.reduce((sum, c) => sum + c!.totalSpent, 0);
    const averageCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    
    const repeatCustomers = customerAnalytics.filter(c => c!.isRepeatCustomer).length;
    const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
    
    const recentCustomers = customerAnalytics.filter(c => c!.isRecentCustomer).length;
    const recentCustomerRate = totalCustomers > 0 ? (recentCustomers / totalCustomers) * 100 : 0;
    
    const highValueCustomers = customerAnalytics.filter(c => c!.isHighValueCustomer).length;
    const highValueCustomerRate = totalCustomers > 0 ? (highValueCustomers / totalCustomers) * 100 : 0;

    // Top customers by different metrics
    const topSpenders = [...customerAnalytics].slice(0, 10);
    const topFrequent = [...customerAnalytics].sort((a, b) => b!.totalTransactions - a!.totalTransactions).slice(0, 10);
    const topRecent = [...customerAnalytics].sort((a, b) => a!.daysSinceLastPurchase - b!.daysSinceLastPurchase).slice(0, 10);

    // Insurance carrier analysis
    const insuranceAnalysis = customerAnalytics.reduce((acc, customer) => {
      Object.entries(customer!.insuranceUsage).forEach(([carrier, data]) => {
        if (!acc[carrier]) {
          acc[carrier] = { customers: 0, transactions: 0, totalSavings: 0 };
        }
        acc[carrier].customers++;
        acc[carrier].transactions += data.count;
        acc[carrier].totalSavings += data.totalSavings;
      });
      return acc;
    }, {} as Record<string, { customers: number; transactions: number; totalSavings: number }>);

    // Category preferences analysis
    const categoryAnalysis = customerAnalytics.reduce((acc, customer) => {
      Object.entries(customer!.categoryPreferences).forEach(([category, data]) => {
        if (!acc[category]) {
          acc[category] = { customers: 0, items: 0, revenue: 0 };
        }
        acc[category].customers++;
        acc[category].items += data.count;
        acc[category].revenue += data.totalSpent;
      });
      return acc;
    }, {} as Record<string, { customers: number; items: number; revenue: number }>);

    return NextResponse.json({
      success: true,
      data: {
        customers: customerAnalytics,
        summary: {
          totalCustomers,
          totalRevenue,
          averageCustomerValue,
          repeatCustomerRate,
          recentCustomerRate,
          highValueCustomerRate,
        },
        topCustomers: {
          topSpenders,
          topFrequent,
          topRecent,
        },
        insights: {
          insuranceAnalysis,
          categoryAnalysis,
        },
      },
    });
  } catch (error) {
    console.error('Customer analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer analytics' },
      { status: 500 }
    );
  }
}