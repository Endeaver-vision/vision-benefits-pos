/**
 * Location Management API
 * GET /api/admin/locations - List locations
 * POST /api/admin/locations - Create new location (ADMIN only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  // Check auth - ADMIN and MANAGER can view locations
  const auth = await requireAuth(['ADMIN', 'MANAGER'])
  if (!auth.authorized || !auth.user) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'active' // active, inactive, all
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    // Build where clause
    const where: Record<string, unknown> = {}

    // MANAGER can only see their own location
    if (auth.user.role === 'MANAGER') {
      where.id = auth.user.locationId
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Status filter
    if (status === 'active') {
      where.active = true
    } else if (status === 'inactive') {
      where.active = false
    }

    // Fetch locations
    const locations = await prisma.location.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        timezone: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            productSettings: true,
          }
        }
      },
      orderBy: [
        { active: 'desc' },
        { name: 'asc' },
      ],
      take: limit,
      skip: (page - 1) * limit,
    })

    // Get total count
    const total = await prisma.location.count({ where })

    return NextResponse.json({
      success: true,
      locations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })

  } catch (error) {
    console.error('[Admin Locations API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Only ADMIN can create locations
  const auth = await requireAuth(['ADMIN'])
  if (!auth.authorized || !auth.user) {
    return auth.response
  }

  try {
    const body = await request.json()
    const { name, address, phone, timezone } = body

    // Validate required fields
    if (!name || !address) {
      return NextResponse.json(
        { success: false, error: 'Name and address are required' },
        { status: 400 }
      )
    }

    // Check if name already exists
    const existingLocation = await prisma.location.findUnique({
      where: { name }
    })
    if (existingLocation) {
      return NextResponse.json(
        { success: false, error: 'A location with this name already exists' },
        { status: 400 }
      )
    }

    // Create location
    const location = await prisma.location.create({
      data: {
        name,
        address,
        phone: phone || null,
        timezone: timezone || 'America/Los_Angeles',
        active: true,
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        timezone: true,
        active: true,
        createdAt: true,
      }
    })

    return NextResponse.json({
      success: true,
      location,
      message: 'Location created successfully',
    })

  } catch (error) {
    console.error('[Admin Locations API] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create location' },
      { status: 500 }
    )
  }
}
