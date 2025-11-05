import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Fuse from 'fuse.js'

// Enhanced search endpoint with fuzzy matching
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const fuzzy = searchParams.get('fuzzy') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Search query must be at least 2 characters'
      }, { status: 400 })
    }

    if (fuzzy) {
      // Fuzzy search implementation
      const allCustomers = await prisma.customer.findMany({
        take: 500, // Limit for performance
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        }
      })

      // Configure Fuse.js for fuzzy search
      const fuseOptions = {
        keys: [
          { name: 'firstName', weight: 0.3 },
          { name: 'lastName', weight: 0.3 },
          { name: 'email', weight: 0.2 },
          { name: 'phone', weight: 0.1 },
          { name: 'memberId', weight: 0.1 }
        ],
        threshold: 0.4,
        includeScore: true,
        includeMatches: true,
        minMatchCharLength: 2
      }

      const fuse = new Fuse(allCustomers, fuseOptions)
      const results = fuse.search(query)

      // Extract and paginate results
      const matches = results.map(result => ({
        ...result.item,
        _searchScore: result.score,
        _searchMatches: result.matches?.map(match => ({
          key: match.key,
          value: match.value,
          indices: match.indices
        }))
      }))

      const startIndex = (page - 1) * limit
      const paginatedResults = matches.slice(startIndex, startIndex + limit)
      const totalPages = Math.ceil(matches.length / limit)

      return NextResponse.json({
        success: true,
        data: {
          customers: paginatedResults,
          total: matches.length,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          searchType: 'fuzzy'
        }
      })
    } else {
      // Standard database search
      const skip = (page - 1) * limit
      
      const where = {
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
          { memberId: { contains: query } }
        ]
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          include: {
            _count: {
              select: {
                transactions: true
              }
            }
          },
          orderBy: { firstName: 'asc' },
          skip,
          take: limit
        }),
        prisma.customer.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)

      return NextResponse.json({
        success: true,
        data: {
          customers,
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          searchType: 'standard'
        }
      })
    }
  } catch (error) {
    console.error('Enhanced search error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed'
    }, { status: 500 })
  }
}

// Search suggestions endpoint
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { startsWith: query } },
          { lastName: { startsWith: query } },
          { email: { startsWith: query } }
        ]
      },
      select: {
        firstName: true,
        lastName: true,
        email: true
      },
      take: 10
    })

    const suggestions = new Set<string>()
    
    customers.forEach(customer => {
      const fullName = `${customer.firstName} ${customer.lastName}`
      if (fullName.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(fullName)
      }
      if (customer.email && customer.email.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(customer.email)
      }
    })

    return NextResponse.json({
      success: true,
      suggestions: Array.from(suggestions).slice(0, 5)
    })
  } catch (error) {
    console.error('Search suggestions error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get suggestions'
    }, { status: 500 })
  }
}