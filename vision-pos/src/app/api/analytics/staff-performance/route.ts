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
    const userId = searchParams.get('userId'); // For individual staff performance
    const metric = searchParams.get('metric') || 'revenue'; // revenue, quotes, conversion_rate, activity_score
    const period = searchParams.get('period') || 'monthly'; // daily, weekly, monthly
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    
    // Default to last 30 days if no dates provided
    if (!startDate && !endDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter.gte = thirtyDaysAgo;
    }

    console.log('🏆 Fetching staff performance analytics and leaderboard data...');

    // 1. OVERALL LEADERBOARD
    const leaderboardQuery = `
      SELECT 
        u.id as user_id,
        u.firstName || ' ' || u.lastName as staff_name,
        u.firstName,
        u.lastName,
        u.email,
        u.role,
        l.name as primary_location,
        
        -- Volume Metrics
        COUNT(q.id) as total_quotes,
        COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as completed_sales,
        COUNT(CASE WHEN q.status = 'SIGNED' THEN 1 END) as signed_quotes,
        COUNT(CASE WHEN q.status = 'PRESENTED' THEN 1 END) as presented_quotes,
        COUNT(CASE WHEN q.status = 'CANCELLED' THEN 1 END) as cancelled_quotes,
        
        -- Revenue Metrics
        COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN q.status = 'COMPLETED' THEN q.total END), 0) as avg_sale_value,
        COALESCE(MAX(CASE WHEN q.status = 'COMPLETED' THEN q.total END), 0) as highest_sale,
        
        -- Performance Ratios
        ROUND(
          CASE 
            WHEN COUNT(q.id) > 0 
            THEN COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(q.id)
            ELSE 0 
          END, 2
        ) as completion_rate,
        
        ROUND(
          CASE 
            WHEN COUNT(CASE WHEN q.status IN ('PRESENTED', 'SIGNED', 'COMPLETED') THEN 1 END) > 0
            THEN COUNT(CASE WHEN q.status IN ('SIGNED', 'COMPLETED') THEN 1 END) * 100.0 / 
                 COUNT(CASE WHEN q.status IN ('PRESENTED', 'SIGNED', 'COMPLETED') THEN 1 END)
            ELSE 0 
          END, 2
        ) as close_rate,
        
        -- Specialty Metrics
        COUNT(CASE WHEN q.isSecondPair = 1 AND q.status = 'COMPLETED' THEN 1 END) as second_pair_sales,
        COUNT(CASE WHEN q.isPatientOwnedFrame = 1 AND q.status = 'COMPLETED' THEN 1 END) as pof_sales,
        COALESCE(SUM(CASE WHEN q.isSecondPair = 1 AND q.status = 'COMPLETED' THEN q.secondPairDiscount ELSE 0 END), 0) as second_pair_discounts,
        
        -- Activity Score (weighted performance metric)
        (
          (COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) * 10) +
          (COUNT(CASE WHEN q.status = 'SIGNED' THEN 1 END) * 7) +
          (COUNT(CASE WHEN q.status = 'PRESENTED' THEN 1 END) * 3) +
          (COUNT(q.id) * 1)
        ) as activity_score,
        
        -- Time Analysis
        MIN(q.createdAt) as first_quote_date,
        MAX(q.createdAt) as last_quote_date,
        COUNT(DISTINCT DATE(q.createdAt)) as active_days

      FROM users u
      LEFT JOIN quotes q ON u.id = q.userId 
        AND q.createdAt >= '${dateFilter.gte?.toISOString()}'
        ${dateFilter.lte ? `AND q.createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
        ${locationId ? `AND q.locationId = '${locationId}'` : ''}
      LEFT JOIN locations l ON u.locationId = l.id
      WHERE u.role IN ('ADMIN', 'MANAGER', 'SALES')
        ${userId ? `AND u.id = '${userId}'` : ''}
      GROUP BY u.id, u.firstName, u.lastName, u.email, u.role, l.name
      HAVING COUNT(q.id) > 0
      ORDER BY 
        CASE 
          WHEN '${metric}' = 'revenue' THEN total_revenue
          WHEN '${metric}' = 'quotes' THEN total_quotes
          WHEN '${metric}' = 'conversion_rate' THEN completion_rate
          WHEN '${metric}' = 'activity_score' THEN activity_score
          ELSE total_revenue
        END DESC
      LIMIT ${limit}
    `;

    const leaderboard = await prisma.$queryRawUnsafe(leaderboardQuery);

    // 2. STAFF PERFORMANCE TRENDS (if specific user or time period breakdown)
    let performanceTrends: any[] = [];
    
    if (period === 'daily') {
      const dailyTrendsQuery = `
        SELECT 
          DATE(q.createdAt) as performance_date,
          u.firstName || ' ' || u.lastName as staff_name,
          u.id as user_id,
          COUNT(q.id) as daily_quotes,
          COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as daily_sales,
          COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as daily_revenue,
          ROUND(
            CASE 
              WHEN COUNT(q.id) > 0 
              THEN COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(q.id)
              ELSE 0 
            END, 2
          ) as daily_conversion_rate
        FROM users u
        LEFT JOIN quotes q ON u.id = q.userId 
          AND q.createdAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND q.createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
          ${locationId ? `AND q.locationId = '${locationId}'` : ''}
        WHERE u.role IN ('ADMIN', 'MANAGER', 'SALES')
          ${userId ? `AND u.id = '${userId}'` : ''}
          AND q.id IS NOT NULL
        GROUP BY DATE(q.createdAt), u.id, u.firstName, u.lastName
        ORDER BY performance_date DESC, daily_revenue DESC
        LIMIT ${userId ? 30 : 100}
      `;
      
      performanceTrends = await prisma.$queryRawUnsafe(dailyTrendsQuery);
    } else if (period === 'weekly') {
      const weeklyTrendsQuery = `
        SELECT 
          strftime('%Y-W%W', q.createdAt) as performance_week,
          u.firstName || ' ' || u.lastName as staff_name,
          u.id as user_id,
          COUNT(q.id) as weekly_quotes,
          COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as weekly_sales,
          COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as weekly_revenue
        FROM users u
        LEFT JOIN quotes q ON u.id = q.userId 
          AND q.createdAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND q.createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
          ${locationId ? `AND q.locationId = '${locationId}'` : ''}
        WHERE u.role IN ('ADMIN', 'MANAGER', 'SALES')
          ${userId ? `AND u.id = '${userId}'` : ''}
          AND q.id IS NOT NULL
        GROUP BY strftime('%Y-W%W', q.createdAt), u.id, u.firstName, u.lastName
        ORDER BY performance_week DESC, weekly_revenue DESC
        LIMIT ${userId ? 12 : 60}
      `;
      
      performanceTrends = await prisma.$queryRawUnsafe(weeklyTrendsQuery);
    }

    // 3. TEAM STATISTICS
    const teamStats = await Promise.all([
      // Team totals
      prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(DISTINCT u.id) as total_staff,
          COUNT(DISTINCT CASE WHEN q.id IS NOT NULL THEN u.id END) as active_staff,
          COUNT(q.id) as team_total_quotes,
          COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as team_total_sales,
          COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as team_total_revenue
        FROM users u
        LEFT JOIN quotes q ON u.id = q.userId 
          AND q.createdAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND q.createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
          ${locationId ? `AND q.locationId = '${locationId}'` : ''}
        WHERE u.role IN ('ADMIN', 'MANAGER', 'SALES')
      `),
      
      // Performance distribution
      prisma.$queryRawUnsafe(`
        SELECT 
          CASE 
            WHEN completion_rate >= 80 THEN 'Excellent'
            WHEN completion_rate >= 60 THEN 'Good' 
            WHEN completion_rate >= 40 THEN 'Average'
            WHEN completion_rate > 0 THEN 'Needs Improvement'
            ELSE 'No Sales'
          END as performance_tier,
          COUNT(*) as staff_count
        FROM (
          SELECT 
            u.id,
            ROUND(
              CASE 
                WHEN COUNT(q.id) > 0 
                THEN COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(q.id)
                ELSE 0 
              END, 2
            ) as completion_rate
          FROM users u
          LEFT JOIN quotes q ON u.id = q.userId 
            AND q.createdAt >= '${dateFilter.gte?.toISOString()}'
            ${dateFilter.lte ? `AND q.createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
            ${locationId ? `AND q.locationId = '${locationId}'` : ''}
          WHERE u.role IN ('ADMIN', 'MANAGER', 'SALES')
          GROUP BY u.id
        ) performance_data
        GROUP BY performance_tier
        ORDER BY 
          CASE performance_tier
            WHEN 'Excellent' THEN 1
            WHEN 'Good' THEN 2
            WHEN 'Average' THEN 3
            WHEN 'Needs Improvement' THEN 4
            WHEN 'No Sales' THEN 5
          END
      `)
    ]);

    const [teamTotals, performanceDistribution] = teamStats;

    // 4. INDIVIDUAL STAFF DEEP DIVE (if userId provided)
    let individualAnalysis: any = null;
    
    if (userId) {
      const individualQuery = `
        SELECT 
          u.firstName || ' ' || u.lastName as staff_name,
          u.email,
          u.role,
          u.createdAt as hire_date,
          
          -- Recent Activity (last 30 days)
          COUNT(CASE WHEN q.createdAt >= date('now', '-30 days') THEN q.id END) as recent_quotes,
          COUNT(CASE WHEN q.createdAt >= date('now', '-30 days') AND q.status = 'COMPLETED' THEN 1 END) as recent_sales,
          
          -- All-time stats
          COUNT(q.id) as lifetime_quotes,
          COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as lifetime_sales,
          COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as lifetime_revenue,
          
          -- Best performance day
          (
            SELECT DATE(q2.createdAt) 
            FROM quotes q2 
            WHERE q2.userId = u.id AND q2.status = 'COMPLETED'
            GROUP BY DATE(q2.createdAt)
            ORDER BY SUM(q2.total) DESC
            LIMIT 1
          ) as best_day,
          
          (
            SELECT SUM(q2.total) 
            FROM quotes q2 
            WHERE q2.userId = u.id AND q2.status = 'COMPLETED'
            GROUP BY DATE(q2.createdAt)
            ORDER BY SUM(q2.total) DESC
            LIMIT 1
          ) as best_day_revenue

        FROM users u
        LEFT JOIN quotes q ON u.id = q.userId
        WHERE u.id = '${userId}'
        GROUP BY u.id, u.firstName, u.lastName, u.email, u.role, u.createdAt
      `;
      
      const individualResult = await prisma.$queryRawUnsafe(individualQuery);
      individualAnalysis = (individualResult as any[])[0] || null;

      // Get activity logs for the individual
      if (individualAnalysis) {
        const activityLogs = await prisma.user_activity_logs.findMany({
          where: {
            userId,
            createdAt: dateFilter
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            location: {
              select: { name: true }
            }
          }
        });

        individualAnalysis.recentActivity = activityLogs;
      }
    }

    // 5. PERFORMANCE RANKINGS
    const rankings = await prisma.$queryRawUnsafe(`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY total_revenue DESC) as revenue_rank,
        ROW_NUMBER() OVER (ORDER BY completion_rate DESC) as conversion_rank,
        ROW_NUMBER() OVER (ORDER BY total_quotes DESC) as volume_rank,
        u.id as user_id,
        u.firstName || ' ' || u.lastName as staff_name,
        total_revenue,
        completion_rate,
        total_quotes
      FROM (
        SELECT 
          u.id,
          u.firstName,
          u.lastName,
          COUNT(q.id) as total_quotes,
          COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as total_revenue,
          ROUND(
            CASE 
              WHEN COUNT(q.id) > 0 
              THEN COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(q.id)
              ELSE 0 
            END, 2
          ) as completion_rate
        FROM users u
        LEFT JOIN quotes q ON u.id = q.userId 
          AND q.createdAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND q.createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
          ${locationId ? `AND q.locationId = '${locationId}'` : ''}
        WHERE u.role IN ('ADMIN', 'MANAGER', 'SALES')
        GROUP BY u.id, u.firstName, u.lastName
        HAVING COUNT(q.id) > 0
      ) u
      ORDER BY total_revenue DESC
    `);

    // Build comprehensive response
    const staffPerformanceData = {
      leaderboard: leaderboard,
      
      ...(performanceTrends.length > 0 && { performanceTrends }),
      
      teamStatistics: {
        totals: (teamTotals as any[])[0] || {},
        performanceDistribution: performanceDistribution || []
      },
      
      ...(individualAnalysis && { individualAnalysis }),
      
      rankings: rankings,
      
      metadata: {
        generatedAt: new Date().toISOString(),
        period: {
          startDate: dateFilter.gte?.toISOString().split('T')[0],
          endDate: dateFilter.lte?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
        },
        filters: {
          locationId,
          userId,
          metric,
          period,
          limit
        },
        leaderboardCriteria: {
          metric: metric,
          description: {
            revenue: 'Ranked by total revenue generated',
            quotes: 'Ranked by total quotes created', 
            conversion_rate: 'Ranked by quote-to-sale conversion rate',
            activity_score: 'Ranked by weighted activity score (sales=10pts, signed=7pts, presented=3pts, quotes=1pt)'
          }[metric] || 'Ranked by total revenue generated'
        }
      }
    };

    console.log('✅ Staff performance analytics generated successfully');
    
    return NextResponse.json(staffPerformanceData);

  } catch (error) {
    console.error('Error fetching staff performance analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch staff performance analytics', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}