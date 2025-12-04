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
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { insuranceCarrier: { contains: search, mode: 'insensitive' } },
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
      prisma.customer.findMany({
        where: whereClause,
        take: limit,
        skip: skip,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      }),
      prisma.customer.count({ where: whereClause })
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
      dateOfBirth,
      gender,
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

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
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

    // Create customer with all fields
    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        insuranceCarrier: insuranceCarrier || null,
        memberId: memberId || null,
        groupNumber: groupNumber || null,
        eligibilityDate: eligibilityDate ? new Date(eligibilityDate) : null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        notes: notes || null,
        active: true
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