/**
 * Held Quotes API
 * GET /api/quotes/held - Get all draft (held) quotes
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get all draft quotes that haven't expired
    const quotes = await prisma.quote.findMany({
      where: {
        status: 'DRAFT',
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50 held quotes
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      quotes: quotes.map((q) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        status: q.status,
        grandTotal: Number(q.grandTotal),
        patientTotal: Number(q.patientTotal),
        expiresAt: q.expiresAt?.toISOString(),
        createdAt: q.createdAt.toISOString(),
        customer: q.customer,
      })),
    })
  } catch (error) {
    console.error('[Held Quotes API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch held quotes' },
      { status: 500 }
    )
  }
}
