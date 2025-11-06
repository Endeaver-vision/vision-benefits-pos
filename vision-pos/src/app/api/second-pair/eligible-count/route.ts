import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

    // Find customers with completed quotes in the last 30 days who don't have second pairs
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const count = await prisma.quotes.count({
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
      }
    })

    return NextResponse.json({
      success: true,
      count
    })

  } catch (error) {
    console.error('Error counting eligible customers:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}