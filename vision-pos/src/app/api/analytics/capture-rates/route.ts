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
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'monthly'; // daily, weekly, monthly, quarterly
    const breakdown = searchParams.get('breakdown') || 'overall'; // overall, by_staff, by_location, by_time
    
    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    
    // Default to last 90 days if no dates provided
    if (!startDate && !endDate) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      dateFilter.gte = ninetyDaysAgo;
    }

    console.log('🎯 Calculating capture rates and conversion metrics...');

    // 1. OVERALL CAPTURE RATE METRICS
    const overallMetrics = await Promise.all([
      // Total prospects (quotes created)
      prisma.quotes.count({
        where: {
          ...(locationId && { locationId }),
          ...(userId && { userId }),
          createdAt: dateFilter
        }
      }),
      
      // Quotes presented to customers
      prisma.quotes.count({
        where: {
          status: { in: ['PRESENTED', 'SIGNED', 'COMPLETED'] },
          ...(locationId && { locationId }),
          ...(userId && { userId }),
          createdAt: dateFilter
        }
      }),
      
      // Quotes signed by customers  
      prisma.quotes.count({
        where: {
          status: { in: ['SIGNED', 'COMPLETED'] },
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
      
      // Cancelled quotes
      prisma.quotes.count({
        where: {
          status: 'CANCELLED',
          ...(locationId && { locationId }),
          ...(userId && { userId }),
          createdAt: dateFilter
        }
      }),
      
      // Expired quotes
      prisma.quotes.count({
        where: {
          status: 'EXPIRED',
          ...(locationId && { locationId }),
          ...(userId && { userId }),
          createdAt: dateFilter
        }
      })
    ]);

    const [
      totalProspects,
      quotesPresented, 
      quotesSigned,
      completedSales,
      cancelledQuotes,
      expiredQuotes
    ] = overallMetrics;

    // Calculate capture rates
    const presentationRate = totalProspects > 0 ? (quotesPresented / totalProspects * 100) : 0;
    const signatureRate = quotesPresented > 0 ? (quotesSigned / quotesPresented * 100) : 0;
    const completionRate = quotesSigned > 0 ? (completedSales / quotesSigned * 100) : 0;
    const overallCaptureRate = totalProspects > 0 ? (completedSales / totalProspects * 100) : 0;
    const cancellationRate = totalProspects > 0 ? (cancelledQuotes / totalProspects * 100) : 0;
    const expirationRate = totalProspects > 0 ? (expiredQuotes / totalProspects * 100) : 0;

    // 2. TIME-BASED BREAKDOWN
    let timeBreakdown: any[] = [];
    
    if (period === 'daily') {
      const dailyQuery = `
        SELECT 
          DATE(createdAt) as period_date,
          COUNT(*) as total_prospects,
          COUNT(CASE WHEN status IN ('PRESENTED', 'SIGNED', 'COMPLETED') THEN 1 END) as presented,
          COUNT(CASE WHEN status IN ('SIGNED', 'COMPLETED') THEN 1 END) as signed,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled,
          ROUND(
            CASE 
              WHEN COUNT(*) > 0 
              THEN COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*)
              ELSE 0 
            END, 2
          ) as capture_rate
        FROM quotes 
        WHERE createdAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
          ${locationId ? `AND locationId = '${locationId}'` : ''}
          ${userId ? `AND userId = '${userId}'` : ''}
        GROUP BY DATE(createdAt)
        ORDER BY period_date DESC
        LIMIT 30
      `;
      
      timeBreakdown = await prisma.$queryRawUnsafe(dailyQuery);
    } else if (period === 'weekly') {
      const weeklyQuery = `
        SELECT 
          strftime('%Y-W%W', createdAt) as period_date,
          COUNT(*) as total_prospects,
          COUNT(CASE WHEN status IN ('PRESENTED', 'SIGNED', 'COMPLETED') THEN 1 END) as presented,
          COUNT(CASE WHEN status IN ('SIGNED', 'COMPLETED') THEN 1 END) as signed,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
          ROUND(
            CASE 
              WHEN COUNT(*) > 0 
              THEN COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*)
              ELSE 0 
            END, 2
          ) as capture_rate
        FROM quotes 
        WHERE createdAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
          ${locationId ? `AND locationId = '${locationId}'` : ''}
          ${userId ? `AND userId = '${userId}'` : ''}
        GROUP BY strftime('%Y-W%W', createdAt)
        ORDER BY period_date DESC
        LIMIT 12
      `;
      
      timeBreakdown = await prisma.$queryRawUnsafe(weeklyQuery);
    } else if (period === 'monthly') {
      timeBreakdown = await prisma.$queryRawUnsafe(`
        SELECT 
          month_year as period_date,
          total_quotes as total_prospects,
          completed_sales as completed,
          completion_rate as capture_rate,
          location_name
        FROM monthly_trends 
        WHERE 1=1
          ${locationId ? `AND locationId = '${locationId}'` : ''}
        ORDER BY month_year DESC
        LIMIT 12
      `);
    }

    // 3. STAFF PERFORMANCE BREAKDOWN (if requested)
    let staffBreakdown: any[] = [];
    
    if (breakdown === 'by_staff' && !userId) {
      const staffQuery = `
        SELECT 
          u.firstName || ' ' || u.lastName as staff_name,
          u.role,
          u.id as user_id,
          COUNT(q.id) as total_prospects,
          COUNT(CASE WHEN q.status IN ('PRESENTED', 'SIGNED', 'COMPLETED') THEN 1 END) as presented,
          COUNT(CASE WHEN q.status IN ('SIGNED', 'COMPLETED') THEN 1 END) as signed,
          COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as completed,
          COUNT(CASE WHEN q.status = 'CANCELLED' THEN 1 END) as cancelled,
          ROUND(
            CASE 
              WHEN COUNT(q.id) > 0 
              THEN COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(q.id)
              ELSE 0 
            END, 2
          ) as capture_rate,
          ROUND(
            CASE 
              WHEN COUNT(CASE WHEN q.status IN ('PRESENTED', 'SIGNED', 'COMPLETED') THEN 1 END) > 0
              THEN COUNT(CASE WHEN q.status IN ('SIGNED', 'COMPLETED') THEN 1 END) * 100.0 / 
                   COUNT(CASE WHEN q.status IN ('PRESENTED', 'SIGNED', 'COMPLETED') THEN 1 END)
              ELSE 0 
            END, 2
          ) as close_rate,
          COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as total_revenue
        FROM users u
        LEFT JOIN quotes q ON u.id = q.userId 
          AND q.createdAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND q.createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
          ${locationId ? `AND q.locationId = '${locationId}'` : ''}
        WHERE u.role IN ('SALES', 'MANAGER', 'ADMIN')
        GROUP BY u.id, u.firstName, u.lastName, u.role
        HAVING COUNT(q.id) > 0
        ORDER BY capture_rate DESC, total_revenue DESC
      `;
      
      staffBreakdown = await prisma.$queryRawUnsafe(staffQuery);
    }

    // 4. LOCATION BREAKDOWN (if requested and no specific location filter)
    let locationBreakdown: any[] = [];
    
    if (breakdown === 'by_location' && !locationId) {
      const locationQuery = `
        SELECT 
          l.name as location_name,
          l.id as location_id,
          COUNT(q.id) as total_prospects,
          COUNT(CASE WHEN q.status IN ('PRESENTED', 'SIGNED', 'COMPLETED') THEN 1 END) as presented,
          COUNT(CASE WHEN q.status IN ('SIGNED', 'COMPLETED') THEN 1 END) as signed,
          COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) as completed,
          ROUND(
            CASE 
              WHEN COUNT(q.id) > 0 
              THEN COUNT(CASE WHEN q.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(q.id)
              ELSE 0 
            END, 2
          ) as capture_rate,
          COALESCE(SUM(CASE WHEN q.status = 'COMPLETED' THEN q.total ELSE 0 END), 0) as total_revenue
        FROM locations l
        LEFT JOIN quotes q ON l.id = q.locationId 
          AND q.createdAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND q.createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
        WHERE l.isActive = 1
        GROUP BY l.id, l.name
        HAVING COUNT(q.id) > 0
        ORDER BY capture_rate DESC, total_revenue DESC
      `;
      
      locationBreakdown = await prisma.$queryRawUnsafe(locationQuery);
    }

    // 5. CONVERSION FUNNEL WITH DETAILED METRICS
    const detailedFunnel = [
      {
        stage: 'Initial Interest',
        count: totalProspects,
        percentage: 100.0,
        dropoffCount: 0,
        dropoffRate: 0
      },
      {
        stage: 'Quote Presented',
        count: quotesPresented,
        percentage: presentationRate,
        dropoffCount: totalProspects - quotesPresented,
        dropoffRate: totalProspects > 0 ? ((totalProspects - quotesPresented) / totalProspects * 100) : 0
      },
      {
        stage: 'Quote Signed', 
        count: quotesSigned,
        percentage: signatureRate,
        dropoffCount: quotesPresented - quotesSigned,
        dropoffRate: quotesPresented > 0 ? ((quotesPresented - quotesSigned) / quotesPresented * 100) : 0
      },
      {
        stage: 'Sale Completed',
        count: completedSales,
        percentage: completionRate,
        dropoffCount: quotesSigned - completedSales,
        dropoffRate: quotesSigned > 0 ? ((quotesSigned - completedSales) / quotesSigned * 100) : 0
      }
    ];

    // 6. ADVANCED CAPTURE METRICS
    const advancedMetrics = await Promise.all([
      // Average time to close
      prisma.$queryRawUnsafe(`
        SELECT 
          AVG(julianday(completedAt) - julianday(createdAt)) as avg_days_to_close,
          MIN(julianday(completedAt) - julianday(createdAt)) as min_days_to_close,
          MAX(julianday(completedAt) - julianday(createdAt)) as max_days_to_close
        FROM quotes 
        WHERE status = 'COMPLETED'
          AND completedAt IS NOT NULL
          AND createdAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
          ${locationId ? `AND locationId = '${locationId}'` : ''}
          ${userId ? `AND userId = '${userId}'` : ''}
      `),
      
      // Second pair capture rate
      prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(*) as eligible_quotes,
          COUNT(CASE WHEN isSecondPair = 1 THEN 1 END) as second_pair_captures,
          ROUND(
            CASE 
              WHEN COUNT(*) > 0 
              THEN COUNT(CASE WHEN isSecondPair = 1 THEN 1 END) * 100.0 / COUNT(*)
              ELSE 0 
            END, 2
          ) as second_pair_capture_rate
        FROM quotes 
        WHERE status = 'COMPLETED'
          AND createdAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
          ${locationId ? `AND locationId = '${locationId}'` : ''}
          ${userId ? `AND userId = '${userId}'` : ''}
      `),
      
      // POF capture rate
      prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(*) as total_quotes,
          COUNT(CASE WHEN isPatientOwnedFrame = 1 THEN 1 END) as pof_captures,
          ROUND(
            CASE 
              WHEN COUNT(*) > 0 
              THEN COUNT(CASE WHEN isPatientOwnedFrame = 1 THEN 1 END) * 100.0 / COUNT(*)
              ELSE 0 
            END, 2
          ) as pof_capture_rate
        FROM quotes 
        WHERE status = 'COMPLETED'
          AND createdAt >= '${dateFilter.gte?.toISOString()}'
          ${dateFilter.lte ? `AND createdAt <= '${dateFilter.lte?.toISOString()}'` : ''}
          ${locationId ? `AND locationId = '${locationId}'` : ''}
          ${userId ? `AND userId = '${userId}'` : ''}
      `)
    ]);

    const [timingMetrics, secondPairMetrics, pofMetrics] = advancedMetrics;

    // Build comprehensive response
    const captureRateData = {
      summary: {
        totalProspects,
        quotesPresented,
        quotesSigned,
        completedSales,
        cancelledQuotes,
        expiredQuotes,
        overallCaptureRate: Math.round(overallCaptureRate * 100) / 100,
        presentationRate: Math.round(presentationRate * 100) / 100,
        signatureRate: Math.round(signatureRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        expirationRate: Math.round(expirationRate * 100) / 100
      },
      
      conversionFunnel: detailedFunnel,
      
      timeBreakdown,
      
      ...(staffBreakdown.length > 0 && { staffBreakdown }),
      ...(locationBreakdown.length > 0 && { locationBreakdown }),
      
      advancedMetrics: {
        averageDaysToClose: (timingMetrics as any)?.[0]?.avg_days_to_close || 0,
        minDaysToClose: (timingMetrics as any)?.[0]?.min_days_to_close || 0,
        maxDaysToClose: (timingMetrics as any)?.[0]?.max_days_to_close || 0,
        secondPairCaptureRate: (secondPairMetrics as any)?.[0]?.second_pair_capture_rate || 0,
        pofCaptureRate: (pofMetrics as any)?.[0]?.pof_capture_rate || 0
      },
      
      metadata: {
        generatedAt: new Date().toISOString(),
        period: {
          startDate: dateFilter.gte?.toISOString().split('T')[0],
          endDate: dateFilter.lte?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
        },
        filters: {
          locationId,
          userId,
          period,
          breakdown
        }
      }
    };

    console.log('✅ Capture rate calculations completed successfully');
    
    return NextResponse.json(captureRateData);

  } catch (error) {
    console.error('Error calculating capture rates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to calculate capture rates', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}