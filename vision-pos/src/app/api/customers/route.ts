import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/customers - Simple customer search with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    let whereClause
    if (search.trim()) {
      whereClause = {
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
      }
    } else {
      whereClause = { active: true }
    }

    // Execute queries
    const [customers, total] = await Promise.all([
      prisma.customers.findMany({
        where: whereClause,
        take: limit,
        skip: skip,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      }),
      prisma.customers.count({ where: whereClause })
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    })
  } catch (error) {
    console.error('Customers API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
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
      insuranceCarrier,
      memberId,
      address,
      city,
      state,
      zipCode
    } = body

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json({
        success: false,
        error: 'First name and last name are required'
      }, { status: 400 })
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 })
    }

    // Check for duplicate email if provided
    if (email) {
      const existingCustomer = await prisma.customers.findFirst({
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

    // Create customer using current schema
    const customer = await prisma.customers.create({
      data: {
        id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstName,
        lastName,
        email,
        phone,
        insuranceCarrier,
        memberId,
        address,
        city,
        state,
        zipCode,
        active: true,
        registrationDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
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
      error: error instanceof Error ? error.message : 'Failed to create customer'
    }, { status: 500 })
  }
}