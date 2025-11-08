/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const locationId = searchParams.get('locationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || 'daily'; // daily, weekly, monthly
    const userId = searchParams.get('userId'); // For staff-specific analytics
    
    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    
    // If no dates provided, default to last 30 days
    if (!startDate && !endDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter.gte = thirtyDaysAgo;
    }

    // 1. SUMMARY METRICS
    console.log('📊 Fetching summary metrics...');
    
    const summaryMetrics = await Promise.all([
      // Total quotes in period
      prisma.quotes.count({
        where: {
          ...(locationId && { locationId }),
          ...(userId && { userId }),
          createdAt: dateFilter
        }
      }),
      
      // Completed sales
      prisma.quotes.count({
        where: {
          status: 'COMPLETED',
          ...(locationId && { locationId }),
          ...(userId && { userId }),
          completedAt: dateFilter
        }
      }),
      
      // Total revenue
      prisma.quotes.aggregate({
        _sum: { total: true },
        where: {
          status: 'COMPLETED',
          ...(locationId && { locationId }),
          ...(userId && { userId }),
          completedAt: dateFilter
        }
      }),
      
      // Average sale value
      prisma.quotes.aggregate({
        _avg: { total: true },
        where: {
          status: 'COMPLETED',
          ...(locationId && { locationId }),
          ...(userId && { userId }),
          completedAt: dateFilter
        }
      }),
      
      // Unique customers
      prisma.quotes.findMany({
        select: { customerId: true },
        where: {
          ...(locationId && { locationId }),
          ...(userId && { userId }),
          createdAt: dateFilter
        },
        distinct: ['customerId']
      }),
      
      // Active staff
      prisma.quotes.findMany({
        select: { userId: true },
        where: {
          ...(locationId && { locationId }),
          createdAt: dateFilter
        },
        distinct: ['userId']
      })
    ]);

    const [
      totalQuotes,
      completedSales, 
      revenueSum,
      avgSaleValue,
      uniqueCustomers,
      activeStaff
    ] = summaryMetrics;

    // 2. QUOTE STATUS BREAKDOWN
    console.log('📈 Fetching status breakdown...');
    
    const statusBreakdown = await prisma.quotes.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { total: true },
      where: {
        ...(locationId && { locationId }),
        ...(userId && { userId }),
        createdAt: dateFilter
      }
    });

    // 3. TREND ANALYSIS (last 30 days daily)
    console.log('📅 Fetching trend analysis...');
    
    let trendData: any[] = [];
    
    if (period === 'daily') {
      // Get daily analytics from view
      const dailyQuery = `
        SELECT 
          analytics_date,
          location_name,
          total_quotes,
          quotes_completed,
          revenue_completed,
          completion_rate,
          avg_sale_value
        FROM daily_analytics 
        WHERE analytics_date >= date('${dateFilter.gte?.toISOString().split('T')[0]}')
        ${locationId ? `AND locationId = '${locationId}'` : ''}
        ORDER BY analytics_date DESC
        LIMIT 30
      `;
      
      trendData = await prisma.$queryRawUnsafe(dailyQuery);
    } else if (period === 'monthly') {
      // Get monthly trends from view
      const monthlyQuery = `
        SELECT 
          month_year,
          location_name,
          total_quotes,
          completed_sales,
          total_revenue,
          completion_rate,
          avg_sale_value
        FROM monthly_trends 
        ${locationId ? `WHERE locationId = '${locationId}'` : ''}
        ORDER BY month_year DESC
        LIMIT 12
      `;
      
      trendData = await prisma.$queryRawUnsafe(monthlyQuery);
    }

    // 4. CATEGORY ANALYSIS
    console.log('🏷️ Fetching category analysis...');
    
    const categoryAnalysis = await Promise.all([
      // Second pair analysis
      prisma.quotes.aggregate({
        _count: { isSecondPair: true },
        _sum: { secondPairDiscount: true },
        where: {
          isSecondPair: true,
          status: 'COMPLETED',
          ...(locationId && { locationId }),
          ...(userId && { userId }),
          completedAt: dateFilter
        }
      }),
      
      // POF analysis
      prisma.quotes.aggregate({
        _count: { isPatientOwnedFrame: true },
        _sum: { pofFixedFee: true },
        where: {
          isPatientOwnedFrame: true,
          status: 'COMPLETED',
          ...(locationId && { locationId }),
          ...(userId && { userId }),
          completedAt: dateFilter
        }
      }),
      
      // Insurance vs cash analysis
      prisma.$queryRawUnsafe(`
        SELECT 
          CASE 
            WHEN JSON_EXTRACT(insuranceInfo, '$.hasInsurance') = true THEN 'Insurance'
            ELSE 'Cash'
          END as payment_type,
          COUNT(*) as quote_count,
          SUM(total) as total_revenue,
          AVG(total) as avg_value
        FROM quotes 
        WHERE status = 'COMPLETED'
          ${locationId ? `AND locationId = '${locationId}'` : ''}
          ${userId ? `AND userId = '${userId}'` : ''}
          AND completedAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND completedAt <= '${dateFilter.lte?.toISOString()}'` : ''}
        GROUP BY JSON_EXTRACT(insuranceInfo, '$.hasInsurance')
      `)
    ]);

    const [secondPairStats, pofStats, paymentTypeStats] = categoryAnalysis;

    // 5. TOP PERFORMERS (if not user-specific)
    console.log('🏆 Fetching top performers...');
    
    let topPerformers: any[] = [];
    if (!userId) {
      const performanceQuery = `
        SELECT 
          u.firstName || ' ' || u.lastName as staff_name,
          u.role,
          COUNT(q.id) as total_quotes,
          COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as completed_sales,
          COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as total_revenue,
          ROUND(
            CASE 
              WHEN COUNT(q.id) > 0 
              THEN (COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(q.id))
              ELSE 0 
            END, 2
          ) as completion_rate
        FROM users u
        LEFT JOIN quotes q ON u.id = q.userId 
          AND q.createdAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND q.createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
          ${locationId ? `AND q.locationId = '${locationId}'` : ''}
        WHERE u.role IN ('SALES', 'MANAGER', 'ADMIN')
        GROUP BY u.id, u.firstName, u.lastName, u.role
        HAVING COUNT(q.id) > 0
        ORDER BY total_revenue DESC
        LIMIT 10
      `;
      
      topPerformers = await prisma.$queryRawUnsafe(performanceQuery);
    }

    // 6. RECENT ACTIVITY
    console.log('⚡ Fetching recent activity...');
    
    const recentActivity = await prisma.user_activity_logs.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      where: {
        ...(locationId && { locationId }),
        ...(userId && { userId }),
        createdAt: dateFilter
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        location: {
          select: {
            name: true
          }
        }
      }
    });

    // 7. CONVERSION FUNNEL
    console.log('🎯 Calculating conversion funnel...');
    
    const conversionFunnel = await prisma.$queryRawUnsafe(`
      SELECT 
        'Quotes Created' as stage,
        COUNT(*) as count,
        100.0 as percentage
      FROM quotes 
      WHERE createdAt >= '${dateFilter.gte?.toISOString()}'
        ${dateFilter.lte ? `AND createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
        ${locationId ? `AND locationId = '${locationId}'` : ''}
        ${userId ? `AND userId = '${userId}'` : ''}
      
      UNION ALL
      
      SELECT 
        'Presented to Customer' as stage,
        COUNT(*) as count,
        ROUND(
          COUNT(*) * 100.0 / (
            SELECT COUNT(*) FROM quotes 
            WHERE createdAt >= '${dateFilter.gte?.toISOString()}'
              ${dateFilter.lte ? `AND createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
              ${locationId ? `AND locationId = '${locationId}'` : ''}
              ${userId ? `AND userId = '${userId}'` : ''}
          ), 2
        ) as percentage
      FROM quotes 
      WHERE status IN ('PRESENTED', 'SIGNED', 'COMPLETED')
        AND createdAt >= '${dateFilter.gte?.toISOString()}'
        ${dateFilter.lte ? `AND createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
        ${locationId ? `AND locationId = '${locationId}'` : ''}
        ${userId ? `AND userId = '${userId}'` : ''}
      
      UNION ALL
      
      SELECT 
        'Signed by Customer' as stage,
        COUNT(*) as count,
        ROUND(
          COUNT(*) * 100.0 / (
            SELECT COUNT(*) FROM quotes 
            WHERE createdAt >= '${dateFilter.gte?.toISOString()}'
              ${dateFilter.lte ? `AND createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
              ${locationId ? `AND locationId = '${locationId}'` : ''}
              ${userId ? `AND userId = '${userId}'` : ''}
          ), 2
        ) as percentage
      FROM quotes 
      WHERE status IN ('SIGNED', 'COMPLETED')
        AND createdAt >= '${dateFilter.gte?.toISOString()}'
        ${dateFilter.lte ? `AND createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
        ${locationId ? `AND locationId = '${locationId}'` : ''}
        ${userId ? `AND userId = '${userId}'` : ''}
      
      UNION ALL
      
      SELECT 
        'Sale Completed' as stage,
        COUNT(*) as count,
        ROUND(
          COUNT(*) * 100.0 / (
            SELECT COUNT(*) FROM quotes 
            WHERE createdAt >= '${dateFilter.gte?.toISOString()}'
              ${dateFilter.lte ? `AND createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
              ${locationId ? `AND locationId = '${locationId}'` : ''}
              ${userId ? `AND userId = '${userId}'` : ''}
          ), 2
        ) as percentage
      FROM quotes 
      WHERE status = 'COMPLETED'
        AND createdAt >= '${dateFilter.gte?.toISOString()}'
        ${dateFilter.lte ? `AND createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
        ${locationId ? `AND locationId = '${locationId}'` : ''}
        ${userId ? `AND userId = '${userId}'` : ''}
      
      ORDER BY count DESC
    `);

    // Build comprehensive response
    const dashboardData = {
      summary: {
        totalQuotes,
        completedSales,
        totalRevenue: revenueSum._sum.total || 0,
        averageSaleValue: avgSaleValue._avg.total || 0,
        uniqueCustomers: uniqueCustomers.length,
        activeStaff: activeStaff.length,
        conversionRate: totalQuotes > 0 ? (completedSales / totalQuotes * 100).toFixed(2) : 0,
        period: {
          startDate: dateFilter.gte?.toISOString().split('T')[0],
          endDate: dateFilter.lte?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
        }
      },
      
      statusBreakdown: statusBreakdown.map(item => ({
        status: item.status,
        count: item._count.status,
        value: item._sum.total || 0,
        percentage: totalQuotes > 0 ? (item._count.status / totalQuotes * 100).toFixed(2) : 0
      })),
      
      trends: trendData,
      
      categories: {
        secondPair: {
          count: secondPairStats._count.isSecondPair,
          totalDiscount: secondPairStats._sum.secondPairDiscount || 0
        },
        patientOwnedFrame: {
          count: pofStats._count.isPatientOwnedFrame,
          totalFees: pofStats._sum.pofFixedFee || 0
        },
        paymentTypes: paymentTypeStats
      },
      
      topPerformers,
      
      conversionFunnel,
      
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        action: activity.action,
        entity: activity.entity,
        entityId: activity.entityId,
        timestamp: activity.createdAt,
        user: activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'Unknown',
        location: activity.location?.name || 'Unknown',
        details: activity.details
      })),
      
      metadata: {
        generatedAt: new Date().toISOString(),
        filters: {
          locationId,
          userId,
          startDate,
          endDate,
          period
        }
      }
    };

    console.log('✅ Analytics dashboard data prepared successfully');
    
    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics dashboard', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}