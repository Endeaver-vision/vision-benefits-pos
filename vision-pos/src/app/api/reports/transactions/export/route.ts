import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Prisma, TransactionStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters (same as main reports API)
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationId = searchParams.get('locationId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const insuranceCarrier = searchParams.get('insuranceCarrier');
    const customerId = searchParams.get('customerId');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');

    // Build filters (same as main reports API)
    const filters: Prisma.TransactionWhereInput = {};

    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        filters.createdAt.gte = startOfDay(parseISO(startDate));
      }
      if (endDate) {
        filters.createdAt.lte = endOfDay(parseISO(endDate));
      }
    }

    if (locationId) filters.locationId = locationId;
    if (userId) filters.userId = userId;
    if (status && Object.values(TransactionStatus).includes(status as TransactionStatus)) {
      filters.status = status as TransactionStatus;
    }
    if (insuranceCarrier) filters.insuranceCarrier = insuranceCarrier;
    if (customerId) filters.customerId = customerId;
    if (minAmount || maxAmount) {
      filters.total = {};
      if (minAmount) filters.total.gte = parseFloat(minAmount);
      if (maxAmount) filters.total.lte = parseFloat(maxAmount);
    }

    // Get all transactions for export (no pagination)
    const transactions = await prisma.transaction.findMany({
      where: filters,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Create CSV headers
    const headers = [
      'Transaction ID',
      'Date',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Sales Associate',
      'Location',
      'Status',
      'Insurance Carrier',
      'Subtotal',
      'Tax',
      'Discount',
      'Insurance Discount',
      'Total',
      'Patient Portion',
      'Items',
    ];

    // Create CSV rows
    const csvRows = transactions.map((transaction) => {
      const customerName = `${transaction.customer.firstName} ${transaction.customer.lastName}`;
      const salesAssociate = `${transaction.user.firstName} ${transaction.user.lastName}`;
      const items = transaction.items
        .map((item) => `${item.product.name} (${item.quantity}x)`)
        .join('; ');

      return [
        transaction.id,
        transaction.createdAt.toISOString().split('T')[0], // Date only
        customerName,
        transaction.customer.email || '',
        transaction.customer.phone || '',
        salesAssociate,
        transaction.location.name,
        transaction.status,
        transaction.insuranceCarrier || '',
        transaction.subtotal.toFixed(2),
        transaction.tax.toFixed(2),
        transaction.discount.toFixed(2),
        transaction.insuranceDiscount.toFixed(2),
        transaction.total.toFixed(2),
        transaction.patientPortion.toFixed(2),
        items,
      ];
    });

    // Combine headers and rows
    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `transaction-report-${timestamp}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Transaction export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export transaction report' },
      { status: 500 }
    );
  }
}