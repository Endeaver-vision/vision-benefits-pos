import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    const limit = parseInt(searchParams.get('limit') || '5')

    // Find customers with completed quotes in the last 30 days who don't have second pairs
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const eligibleCustomers = await prisma.quotes.findMany({
      where: {
        status: 'COMPLETED',
        isSecondPair: false,
        completedAt: {
          gte: thirtyDaysAgo
        },
        ...(locationId && { locationId }),
        NOT: {
          second_pairs_second_pairs_originalQuoteIdToquotes: {
            some: {}
          }
        }
      },
      include: {
        customers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: limit
    })

    // Format the response
    const customers = eligibleCustomers.map(quote => {
      const completedAt = quote.completedAt
      if (!completedAt) return null

      const daysAgo = Math.floor(
        (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      const discountType = daysAgo === 0 ? 'SAME_DAY_50' : 'THIRTY_DAY_30'
      const discountPercent = daysAgo === 0 ? 50 : 30

      return {
        id: quote.customers.id,
        name: `${quote.customers.firstName} ${quote.customers.lastName}`,
        email: quote.customers.email,
        originalPurchaseDate: completedAt.toISOString(),
        daysAgo,
        discountType,
        discountPercent,
        originalQuoteId: quote.id
      }
    }).filter(Boolean)

    return NextResponse.json({
      success: true,
      customers,
      total: customers.length
    })

  } catch (error) {
    console.error('Error fetching eligible customers:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}