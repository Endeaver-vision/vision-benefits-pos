// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, subDays, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const period = searchParams.get('period') || '30';
    const locationId = searchParams.get('locationId');
    const reportType = searchParams.get('type') || 'summary'; // summary, detailed, financial

    // Calculate date ranges
    const today = new Date();
    let startDate: Date, endDate: Date;

    switch (period) {
      case '7':
        startDate = startOfDay(subDays(today, 6));
        endDate = endOfDay(today);
        break;
      case '30':
        startDate = startOfDay(subDays(today, 29));
        endDate = endOfDay(today);
        break;
      case 'month':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'quarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        startDate = startOfDay(quarterStart);
        endDate = endOfDay(today);
        break;
      case 'year':
        startDate = startOfDay(new Date(today.getFullYear(), 0, 1));
        endDate = endOfDay(today);
        break;
      default:
        startDate = startOfDay(subDays(today, parseInt(period)));
        endDate = endOfDay(today);
    }

    // Build where clauses
    const locationFilter = locationId ? { locationId } : {};
    const dateFilter = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // Get comprehensive data
    const [transactions, customers, inventoryItems, suppliers] = await Promise.all([
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
          customer: true,
          location: true,
          user: true
        }
      }),

      prisma.customer.findMany({
        where: { active: true },
        include: {
          transactions: {
            where: dateFilter
          }
        }
      }),

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

      prisma.supplier.findMany({
        where: { active: true }
      })
    ]);

    // Generate different report types
    let csvData = [];

    if (reportType === 'summary') {
      // Executive summary report
      const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
      const totalTransactions = transactions.length;
      const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
      const totalCustomers = customers.length;
      const activeCustomers = customers.filter(c => c.transactions.length > 0).length;
      const totalInventoryValue = inventoryItems.reduce((sum, item) => 
        sum + (item.currentStock * (item.costPrice || 0)), 0);

      // Category breakdown
      const categoryPerformance = {};
      transactions.forEach(transaction => {
        transaction.items.forEach(item => {
          const categoryName = item.product.category.name;
          if (!categoryPerformance[categoryName]) {
            categoryPerformance[categoryName] = { revenue: 0, quantity: 0 };
          }
          categoryPerformance[categoryName].revenue += item.total;
          categoryPerformance[categoryName].quantity += item.quantity;
        });
      });

      csvData = [
        {
          'Report Type': 'Executive Summary',
          'Period': `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`,
          'Total Revenue': `$${totalRevenue.toFixed(2)}`,
          'Total Transactions': totalTransactions,
          'Average Order Value': `$${averageOrderValue.toFixed(2)}`,
          'Total Customers': totalCustomers,
          'Active Customers': activeCustomers,
          'Customer Retention Rate': `${totalCustomers > 0 ? ((activeCustomers / totalCustomers) * 100).toFixed(1) : 0}%`,
          'Total Inventory Value': `$${totalInventoryValue.toFixed(2)}`,
          'Total Suppliers': suppliers.length,
          'Generated At': format(new Date(), 'yyyy-MM-dd HH:mm:ss')
        },
        {},
        { 'Category': 'Category Performance' },
        ...Object.entries(categoryPerformance).map(([name, data]) => ({
          'Category': name,
          'Revenue': `$${data.revenue.toFixed(2)}`,
          'Quantity Sold': data.quantity
        }))
      ];

    } else if (reportType === 'detailed') {
      // Detailed transaction report
      csvData = transactions.map(transaction => ({
        'Transaction ID': transaction.id,
        'Date': format(new Date(transaction.createdAt), 'yyyy-MM-dd'),
        'Time': format(new Date(transaction.createdAt), 'HH:mm:ss'),
        'Customer': `${transaction.customer.firstName} ${transaction.customer.lastName}`,
        'Customer Email': transaction.customer.email || 'N/A',
        'Location': transaction.location.name,
        'Sales Associate': `${transaction.user.firstName} ${transaction.user.lastName}`,
        'Subtotal': `$${transaction.subtotal.toFixed(2)}`,
        'Tax': `$${transaction.tax.toFixed(2)}`,
        'Discount': `$${transaction.discount.toFixed(2)}`,
        'Insurance Discount': `$${transaction.insuranceDiscount.toFixed(2)}`,
        'Total': `$${transaction.total.toFixed(2)}`,
        'Payment Method': transaction.paymentMethod || 'N/A',
        'Insurance Carrier': transaction.insuranceCarrier || 'N/A',
        'Patient Portion': `$${transaction.patientPortion.toFixed(2)}`,
        'Items Count': transaction.items.length,
        'Categories': transaction.items.map(item => item.product.category.name).join('; ')
      }));

    } else if (reportType === 'financial') {
      // Financial analysis report
      const dailyTotals = {};
      
      transactions.forEach(transaction => {
        const date = format(new Date(transaction.createdAt), 'yyyy-MM-dd');
        if (!dailyTotals[date]) {
          dailyTotals[date] = {
            revenue: 0,
            transactions: 0,
            insuranceRevenue: 0,
            patientRevenue: 0
          };
        }
        dailyTotals[date].revenue += transaction.total;
        dailyTotals[date].transactions++;
        dailyTotals[date].insuranceRevenue += transaction.insuranceDiscount;
        dailyTotals[date].patientRevenue += transaction.patientPortion;
      });

      csvData = Object.entries(dailyTotals).map(([date, data]) => ({
        'Date': date,
        'Day': format(new Date(date), 'EEEE'),
        'Total Revenue': `$${data.revenue.toFixed(2)}`,
        'Transaction Count': data.transactions,
        'Average Order Value': `$${data.transactions > 0 ? (data.revenue / data.transactions).toFixed(2) : '0.00'}`,
        'Insurance Revenue': `$${data.insuranceRevenue.toFixed(2)}`,
        'Patient Revenue': `$${data.patientRevenue.toFixed(2)}`,
        'Insurance Percentage': `${data.revenue > 0 ? ((data.insuranceRevenue / data.revenue) * 100).toFixed(1) : 0}%`
      })).sort((a, b) => a.Date.localeCompare(b.Date));
    }

    // Generate CSV
    if (csvData.length === 0) {
      return new NextResponse('No data available for export', { status: 404 });
    }

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const filename = `executive-dashboard-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Executive dashboard export error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to export executive dashboard data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}