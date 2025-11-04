import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/customers - Search customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereClause = search
      ? {
          AND: [
            { active: true },
            {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { memberId: { contains: search, mode: 'insensitive' } },
              ]
            }
          ]
        }
      : { active: true }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ],
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        }
      }),
      prisma.customer.count({ where: whereClause })
    ])

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Customers API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      insuranceCarrier,
      memberId,
      groupNumber,
      eligibilityDate,
      address,
      city,
      state,
      zipCode,
      notes
    } = body

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json({
        success: false,
        error: 'First name and last name are required'
      }, { status: 400 })
    }

    // Check for duplicate email if provided
    if (email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          email,
          active: true
        }
      })

      if (existingCustomer) {
        return NextResponse.json({
          success: false,
          error: 'A customer with this email already exists'
        }, { status: 409 })
      }
    }

    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        insuranceCarrier,
        memberId,
        groupNumber,
        eligibilityDate: eligibilityDate ? new Date(eligibilityDate) : null,
        address,
        city,
        state,
        zipCode,
        notes
      }
    })

    return NextResponse.json({
      success: true,
      data: customer
    }, { status: 201 })
  } catch (error) {
    console.error('Create customer error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}