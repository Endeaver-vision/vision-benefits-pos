import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Props {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = params;

    // Get customer with all transactions and related data
    const customer = await prisma.customers.findUnique({
      where: { id },
      include: {
        transactions: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    sku: true,
                    category: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            location: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Calculate analytics for this customer
    const transactions = customer.transactions.filter(t => t.status === 'COMPLETED');
    
    const totalSpent = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = transactions.length;
    const averageTransactionValue = totalTransactions > 0 ? totalSpent / totalTransactions : 0;
    
    const firstPurchase = transactions.length > 0 
      ? new Date(Math.min(...transactions.map(t => new Date(t.createdAt).getTime())))
      : null;
    const lastPurchase = transactions.length > 0
      ? new Date(Math.max(...transactions.map(t => new Date(t.createdAt).getTime())))
      : null;
    
    const daysSinceFirstPurchase = firstPurchase 
      ? Math.floor((new Date().getTime() - firstPurchase.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const daysSinceLastPurchase = lastPurchase
      ? Math.floor((new Date().getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Product preferences
    const productPreferences = transactions
      .reduce((acc, transaction) => {
        transaction.items.forEach(item => {
          const productName = item.product.name;
          const categoryName = item.product.category.name;
          
          if (!acc[categoryName]) {
            acc[categoryName] = {};
          }
          if (!acc[categoryName][productName]) {
            acc[categoryName][productName] = {
              quantity: 0,
              totalSpent: 0,
              lastPurchased: new Date(0),
            };
          }
          
          acc[categoryName][productName].quantity += item.quantity;
          acc[categoryName][productName].totalSpent += item.total;
          
          const transactionDate = new Date(transaction.createdAt);
          if (transactionDate > acc[categoryName][productName].lastPurchased) {
            acc[categoryName][productName].lastPurchased = transactionDate;
          }
        });
        
        return acc;
      }, {} as Record<string, Record<string, { quantity: number; totalSpent: number; lastPurchased: Date }>>);

    // Insurance usage
    const insuranceUsage = transactions.reduce((acc, t) => {
      const carrier = t.insuranceCarrier || 'No Insurance';
      if (!acc[carrier]) {
        acc[carrier] = {
          transactions: 0,
          totalSavings: 0,
          totalSpent: 0,
        };
      }
      acc[carrier].transactions++;
      acc[carrier].totalSavings += t.insuranceDiscount;
      acc[carrier].totalSpent += t.total;
      return acc;
    }, {} as Record<string, { transactions: number; totalSavings: number; totalSpent: number }>);

    // Monthly spending pattern
    const monthlySpending = transactions.reduce((acc, t) => {
      const month = new Date(t.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { transactions: 0, spending: 0 };
      }
      acc[month].transactions++;
      acc[month].spending += t.total;
      return acc;
    }, {} as Record<string, { transactions: number; spending: number }>);

    const analytics = {
      totalSpent,
      totalTransactions,
      averageTransactionValue,
      firstPurchase,
      lastPurchase,
      daysSinceFirstPurchase,
      daysSinceLastPurchase,
      
      // Loyalty indicators
      isRepeatCustomer: totalTransactions > 1,
      isRecentCustomer: daysSinceLastPurchase <= 30,
      isHighValueCustomer: totalSpent > 500,
      isFrequentCustomer: totalTransactions >= 3,
      
      // Patterns
      productPreferences,
      insuranceUsage,
      monthlySpending,
    };

    return NextResponse.json({
      success: true,
      data: {
        customer,
        analytics,
      },
    });
  } catch (error) {
    console.error('Customer detail API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer details' },
      { status: 500 }
    );
  }
}