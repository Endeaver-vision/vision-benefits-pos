import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Prisma, TransactionStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationId = searchParams.get('locationId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const insuranceCarrier = searchParams.get('insuranceCarrier');
    const customerId = searchParams.get('customerId');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filters
    const filters: Prisma.TransactionWhereInput = {};

    // Date range filter
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        filters.createdAt.gte = startOfDay(parseISO(startDate));
      }
      if (endDate) {
        filters.createdAt.lte = endOfDay(parseISO(endDate));
      }
    }

    // Location filter
    if (locationId) {
      filters.locationId = locationId;
    }

    // User (sales associate) filter
    if (userId) {
      filters.userId = userId;
    }

    // Transaction status filter
    if (status && Object.values(TransactionStatus).includes(status as TransactionStatus)) {
      filters.status = status as TransactionStatus;
    }

    // Insurance carrier filter
    if (insuranceCarrier) {
      filters.insuranceCarrier = insuranceCarrier;
    }

    // Customer filter
    if (customerId) {
      filters.customerId = customerId;
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      filters.total = {};
      if (minAmount) {
        filters.total.gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        filters.total.lte = parseFloat(maxAmount);
      }
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalTransactions = await prisma.transaction.count({
      where: filters,
    });

    // Get transactions with related data
    const transactions = await prisma.transaction.findMany({
      where: filters,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            insuranceCarrier: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
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
        [sortBy]: sortOrder as 'asc' | 'desc',
      },
      skip: offset,
      take: limit,
    });

    // Calculate summary statistics for the filtered results
    const summaryResult = await prisma.transaction.aggregate({
      where: filters,
      _sum: {
        subtotal: true,
        tax: true,
        discount: true,
        total: true,
        insuranceDiscount: true,
        patientPortion: true,
      },
      _avg: {
        total: true,
      },
      _count: {
        id: true,
      },
    });

    // Get status distribution
    const statusDistribution = await prisma.transaction.groupBy({
      by: ['status'],
      where: filters,
      _count: {
        status: true,
      },
    });

    // Get insurance carrier distribution
    const insuranceDistribution = await prisma.transaction.groupBy({
      by: ['insuranceCarrier'],
      where: filters,
      _count: {
        insuranceCarrier: true,
      },
    });

    // Get top selling associates for the filtered period
    const topAssociates = await prisma.transaction.groupBy({
      by: ['userId'],
      where: filters,
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: 10,
    });

    // Get user details for top associates
    const userIds = topAssociates.map((a) => a.userId);
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const topAssociatesWithNames = topAssociates.map((associate) => {
      const user = users.find((u) => u.id === associate.userId);
      return {
        ...associate,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalTransactions / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalTransactions,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
        summary: {
          totalRevenue: summaryResult._sum.total || 0,
          totalSubtotal: summaryResult._sum.subtotal || 0,
          totalTax: summaryResult._sum.tax || 0,
          totalDiscount: summaryResult._sum.discount || 0,
          totalInsuranceDiscount: summaryResult._sum.insuranceDiscount || 0,
          totalPatientPortion: summaryResult._sum.patientPortion || 0,
          averageTransactionValue: summaryResult._avg.total || 0,
          transactionCount: summaryResult._count.id || 0,
        },
        distributions: {
          status: statusDistribution,
          insurance: insuranceDistribution,
        },
        topAssociates: topAssociatesWithNames,
      },
    });
  } catch (error) {
    console.error('Transaction reports API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transaction reports' },
      { status: 500 }
    );
  }
}