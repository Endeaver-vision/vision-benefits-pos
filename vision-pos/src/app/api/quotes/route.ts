/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const customerId = searchParams.get('customerId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build where clause for Prisma quotes table
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId; // customerId is string in schema
    }

    if (search) {
      where.OR = [
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { customers: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with relations
    const [quotes, totalCount] = await Promise.all([
      prisma.quotes.findMany({
        where,
        include: {
          customers: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              companyName: true,
              phone: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      prisma.quotes.count({ where })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Format quotes with computed fields
    const formattedQuotes = quotes.map((quote: any) => {
      // Extract services from JSON fields
      const examServices = Array.isArray(quote.examServices) ? quote.examServices : [];
      const eyeglasses = Array.isArray(quote.eyeglasses) ? quote.eyeglasses : [];
      const contacts = Array.isArray(quote.contacts) ? quote.contacts : [];
      
      const itemCount = examServices.length + eyeglasses.length + contacts.length;

      return {
        ...quote,
        itemCount,
        subtotal: quote.subtotal || 0,
        tax: quote.tax || 0,
        total: quote.total || 0,
        customerName: quote.customers 
          ? `${quote.customers.firstName} ${quote.customers.lastName}`.trim() || quote.customers.companyName
          : 'Unknown Customer'
      };
    });

    return NextResponse.json({
      quotes: formattedQuotes,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit
      }
    });

  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Get quote statistics for dashboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'stats') {
      const stats = await prisma.quotes.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      });

      // Calculate totals
      const totalValue = await prisma.quotes.aggregate({
        _sum: {
          total: true
        }
      });

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentQuotes = await prisma.quotes.count({
        where: {
          createdAt: {
            gte: sevenDaysAgo
          }
        }
      });

      // Expiring quotes (drafts older than 23 days)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - 23);

      const expiringQuotes = await prisma.quotes.count({
        where: {
          status: 'DRAFT',
          createdAt: {
            lte: expirationDate
          }
        }
      });

      const statusStats = stats.reduce((acc: Record<string, number>, stat: any) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>);

      return NextResponse.json({
        statusStats,
        totalValue: totalValue._sum.total || 0,
        recentQuotes,
        expiringQuotes
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error fetching quote statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}