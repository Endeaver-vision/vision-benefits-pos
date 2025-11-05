import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/customers/simple - Simple customer search for SQLite
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    let customers = []

    if (search.trim()) {
      // SQLite-compatible search - case-sensitive but works
      customers = await prisma.customer.findMany({
        where: {
          AND: [
            { active: true },
            {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } },
                { insuranceCarrier: { contains: search } },
                { memberId: { contains: search } }
              ]
            }
          ]
        },
        take: limit,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      })
    } else {
      // Get all active customers if no search
      customers = await prisma.customer.findMany({
        where: { active: true },
        take: limit,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      })
    }

    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length
    })
  } catch (error) {
    console.error('Simple customers API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}