import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters (same as main analytics API)
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationId = searchParams.get('locationId');
    const insuranceCarrier = searchParams.get('insuranceCarrier');
    const minTransactions = parseInt(searchParams.get('minTransactions') || '0');
    const minSpent = parseFloat(searchParams.get('minSpent') || '0');

    // Build transaction filters
    const transactionFilters: Prisma.TransactionWhereInput = {};

    if (startDate || endDate) {
      transactionFilters.createdAt = {};
      if (startDate) {
        transactionFilters.createdAt.gte = startOfDay(parseISO(startDate));
      }
      if (endDate) {
        transactionFilters.createdAt.lte = endOfDay(parseISO(endDate));
      }
    }

    if (locationId) transactionFilters.locationId = locationId;
    if (insuranceCarrier) transactionFilters.insuranceCarrier = insuranceCarrier;
    transactionFilters.status = 'COMPLETED';

    // Get customers for export
    const customers = await prisma.customer.findMany({
      include: {
        transactions: {
          where: transactionFilters,
        },
      },
    });

    // Process customer analytics for export
    const customerData = customers
      .map((customer) => {
        const transactions = customer.transactions;
        
        if (transactions.length === 0) return null;

        const totalSpent = transactions.reduce((sum, t) => sum + t.total, 0);
        const totalTransactions = transactions.length;
        const averageTransactionValue = totalSpent / totalTransactions;
        
        const firstPurchase = new Date(Math.min(...transactions.map(t => new Date(t.createdAt).getTime())));
        const lastPurchase = new Date(Math.max(...transactions.map(t => new Date(t.createdAt).getTime())));
        const daysSinceLastPurchase = Math.floor((new Date().getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));

        return {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email || '',
          phone: customer.phone || '',
          insuranceCarrier: customer.insuranceCarrier || '',
          totalSpent: totalSpent.toFixed(2),
          totalTransactions,
          averageTransactionValue: averageTransactionValue.toFixed(2),
          firstPurchase: firstPurchase.toISOString().split('T')[0],
          lastPurchase: lastPurchase.toISOString().split('T')[0],
          daysSinceLastPurchase,
          isRepeatCustomer: totalTransactions > 1 ? 'Yes' : 'No',
          isHighValueCustomer: totalSpent > 500 ? 'Yes' : 'No',
          isFrequentCustomer: totalTransactions >= 3 ? 'Yes' : 'No',
          customerType: totalSpent > 500 && totalTransactions >= 3 ? 'VIP' :
                       totalSpent > 500 ? 'High Value' :
                       totalTransactions >= 3 ? 'Frequent' :
                       totalTransactions > 1 ? 'Repeat' : 'New',
        };
      })
      .filter((customer) => {
        if (!customer) return false;
        if (customer.totalTransactions < minTransactions) return false;
        if (parseFloat(customer.totalSpent) < minSpent) return false;
        return true;
      })
      .sort((a, b) => parseFloat(b!.totalSpent) - parseFloat(a!.totalSpent));

    // Create CSV headers
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Insurance Carrier',
      'Total Spent',
      'Total Transactions',
      'Average Transaction Value',
      'First Purchase',
      'Last Purchase',
      'Days Since Last Purchase',
      'Is Repeat Customer',
      'Is High Value Customer',
      'Is Frequent Customer',
      'Customer Type',
    ];

    // Create CSV rows
    const csvRows = customerData.map((customer) => [
      customer!.firstName,
      customer!.lastName,
      customer!.email,
      customer!.phone,
      customer!.insuranceCarrier,
      customer!.totalSpent,
      customer!.totalTransactions.toString(),
      customer!.averageTransactionValue,
      customer!.firstPurchase,
      customer!.lastPurchase,
      customer!.daysSinceLastPurchase.toString(),
      customer!.isRepeatCustomer,
      customer!.isHighValueCustomer,
      customer!.isFrequentCustomer,
      customer!.customerType,
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `customer-analytics-${timestamp}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Customer analytics export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export customer analytics' },
      { status: 500 }
    );
  }
}