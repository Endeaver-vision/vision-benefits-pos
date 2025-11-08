import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch user activity logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const reportType = searchParams.get('reportType'); // 'daily', 'weekly', 'monthly'

    // Handle summary reports
    if (reportType) {
      return handleSummaryReport(reportType, userId, startDate, endDate);
    }

    // Build where clause
    const where: Record<string, unknown> = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [logs, totalLogs] = await Promise.all([
      prisma.user_activity_logs.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user_activity_logs.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: totalLogs,
          page,
          limit,
          pages: Math.ceil(totalLogs / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}

// Handle summary reports
async function handleSummaryReport(reportType: string, userId?: string | null, startDate?: string | null, endDate?: string | null) {
  try {
    let dateFilter: Record<string, unknown> = {};
    const now = new Date();

    switch (reportType) {
      case 'daily':
        dateFilter = {
          createdAt: {
            gte: new Date(now.setHours(0, 0, 0, 0)),
            lt: new Date(now.setHours(23, 59, 59, 999)),
          },
        };
        break;
      case 'weekly':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        dateFilter = {
          createdAt: {
            gte: weekStart,
            lte: weekEnd,
          },
        };
        break;
      case 'monthly':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        dateFilter = {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        };
        break;
      default:
        if (startDate && endDate) {
          dateFilter = {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          };
        }
    }

    const where: Record<string, unknown> = { ...dateFilter };
    if (userId) {
      where.userId = userId;
    }

    // Get activity summary by action
    const actionSummary = await prisma.user_activity_logs.groupBy({
      by: ['action'],
      _count: {
        id: true,
      },
      where,
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Get most active users
    const userActivity = await prisma.user_activity_logs.groupBy({
      by: ['userId'],
      _count: {
        id: true,
      },
      where,
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Get user details for the most active users
    const userIds = userActivity.map(u => u.userId);
    const users = await prisma.users.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    const userActivityWithDetails = userActivity.map(activity => {
      const user = users.find(u => u.id === activity.userId);
      return {
        ...activity,
        user,
      };
    });

    // Get hourly activity pattern (for daily/weekly reports)
    let hourlyActivity = null;
    if (reportType === 'daily' || reportType === 'weekly') {
      hourlyActivity = await prisma.$queryRaw`
        SELECT 
          strftime('%H', createdAt) as hour,
          COUNT(*) as count
        FROM user_activity_logs 
        WHERE createdAt >= ${dateFilter.createdAt?.gte} 
          AND createdAt <= ${dateFilter.createdAt?.lte}
          ${userId ? `AND userId = ${userId}` : ''}
        GROUP BY hour
        ORDER BY hour
      `;
    }

    // Get sales and quote activity specifically
    const salesActivity = await prisma.user_activity_logs.count({
      where: {
        ...where,
        action: { in: ['SALE_COMPLETED', 'TRANSACTION_CREATED'] },
      },
    });

    const quoteActivity = await prisma.user_activity_logs.count({
      where: {
        ...where,
        action: { in: ['QUOTE_CREATED', 'QUOTE_UPDATED', 'QUOTE_SIGNED'] },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        reportType,
        dateRange: dateFilter,
        summary: {
          totalActivities: actionSummary.reduce((sum, a) => sum + a._count.id, 0),
          salesActivities: salesActivity,
          quoteActivities: quoteActivity,
        },
        actionSummary,
        topUsers: userActivityWithDetails,
        hourlyActivity,
      },
    });
  } catch (error) {
    console.error('Error generating summary report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate summary report' },
      { status: 500 }
    );
  }
}

// POST - Create activity log entry (for manual logging)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, entity, entityId, details, locationId, ipAddress, userAgent } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: 'UserId and action are required' },
        { status: 400 }
      );
    }

    const activityLog = await prisma.user_activity_logs.create({
      data: {
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
        locationId,
        createdAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { activityLog },
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create activity log' },
      { status: 500 }
    );
  }
}