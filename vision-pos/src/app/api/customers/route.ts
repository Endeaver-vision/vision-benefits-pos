import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Build smart search conditions for customer lookup
 * Supports:
 * - Multi-word: "susan mccrae" → matches first+last in either order
 * - Short queries: "mcc" → startsWith on lastName, then firstName
 * - Initial + name: "j smith" or "smi j" → finds "John Smith"
 * - Single field: email, phone, memberId exact/partial match
 */
function buildSmartSearchConditions(searchTerm: string) {
  const trimmed = searchTerm.trim().toLowerCase()

  // Split into words and filter empty
  const words = trimmed.split(/\s+/).filter(w => w.length > 0)

  if (words.length === 0) {
    return null
  }

  // Single word search
  if (words.length === 1) {
    const word = words[0]

    // Short search (1-3 chars): prioritize startsWith for names
    if (word.length <= 3) {
      return {
        OR: [
          { lastName: { startsWith: word, mode: 'insensitive' as const } },
          { firstName: { startsWith: word, mode: 'insensitive' as const } },
          // Also check contains for longer partial matches
          { lastName: { contains: word, mode: 'insensitive' as const } },
          { firstName: { contains: word, mode: 'insensitive' as const } },
          { email: { contains: word, mode: 'insensitive' as const } },
          { phone: { contains: word } },
          { memberId: { contains: word } }
        ]
      }
    }

    // Longer single word: use contains across all fields
    return {
      OR: [
        { firstName: { contains: word, mode: 'insensitive' as const } },
        { lastName: { contains: word, mode: 'insensitive' as const } },
        { email: { contains: word, mode: 'insensitive' as const } },
        { phone: { contains: word } },
        { insuranceCarrier: { contains: word, mode: 'insensitive' as const } },
        { memberId: { contains: word } }
      ]
    }
  }

  // Multi-word search (2+ words)
  // Try different interpretations:

  const conditions: Array<Record<string, unknown>> = []

  // Interpretation 1: First word = firstName, second word = lastName
  const [first, second, ...rest] = words

  // Check if one word looks like an initial (1 char)
  const firstIsInitial = first.length === 1
  const secondIsInitial = second.length === 1

  if (firstIsInitial && !secondIsInitial) {
    // "j smith" pattern: j = first initial, smith = last name
    conditions.push({
      AND: [
        { firstName: { startsWith: first, mode: 'insensitive' as const } },
        { lastName: { contains: second, mode: 'insensitive' as const } }
      ]
    })
  } else if (secondIsInitial && !firstIsInitial) {
    // "smith j" pattern: smith = last name, j = first initial
    conditions.push({
      AND: [
        { lastName: { contains: first, mode: 'insensitive' as const } },
        { firstName: { startsWith: second, mode: 'insensitive' as const } }
      ]
    })
  }

  // Interpretation 2: first word in firstName, second word in lastName
  conditions.push({
    AND: [
      { firstName: { contains: first, mode: 'insensitive' as const } },
      { lastName: { contains: second, mode: 'insensitive' as const } }
    ]
  })

  // Interpretation 3: first word in lastName, second word in firstName (reversed)
  conditions.push({
    AND: [
      { lastName: { contains: first, mode: 'insensitive' as const } },
      { firstName: { contains: second, mode: 'insensitive' as const } }
    ]
  })

  // Interpretation 4: Both words in same field (compound last names like "Van Der Berg")
  const fullSearch = words.join(' ')
  conditions.push({
    OR: [
      { lastName: { contains: fullSearch, mode: 'insensitive' as const } },
      { firstName: { contains: fullSearch, mode: 'insensitive' as const } }
    ]
  })

  // If there are 3+ words, also try first word = first name, rest = last name
  if (rest.length > 0) {
    const lastNamePart = [second, ...rest].join(' ')
    conditions.push({
      AND: [
        { firstName: { contains: first, mode: 'insensitive' as const } },
        { lastName: { contains: lastNamePart, mode: 'insensitive' as const } }
      ]
    })
  }

  return { OR: conditions }
}

// GET /api/customers - Smart customer search with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    let whereClause
    if (search.trim()) {
      const searchConditions = buildSmartSearchConditions(search)
      whereClause = searchConditions
        ? { AND: [{ active: true }, searchConditions] }
        : { active: true }
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