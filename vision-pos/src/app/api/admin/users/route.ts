/**
 * User Management API
 * GET /api/admin/users - List users
 * POST /api/admin/users - Create new user
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getEffectiveLocationId, canCreateUserWithRole, AllowedRole } from '@/lib/api-auth'
import { hashPassword } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Check auth - ADMIN and MANAGER can view users
  const auth = await requireAuth(['ADMIN', 'MANAGER'])
  if (!auth.authorized || !auth.user) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const locationId = searchParams.get('locationId') || ''
    const status = searchParams.get('status') || 'active' // active, inactive, all
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    // Build where clause
    const where: Record<string, unknown> = {}

    // MANAGER can only see users in their location
    if (auth.user.role === 'MANAGER') {
      where.locationId = auth.user.locationId
    } else if (locationId) {
      // ADMIN can filter by location
      where.locationId = locationId
    }

    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Role filter
    if (role) {
      where.role = role
    }

    // Status filter
    if (status === 'active') {
      where.active = true
    } else if (status === 'inactive') {
      where.active = false
    }

    // Fetch users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        locationId: true,
        createdAt: true,
        updatedAt: true,
        location: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [
        { active: 'desc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
      take: limit,
      skip: (page - 1) * limit,
    })

    // Get total count
    const total = await prisma.user.count({ where })

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })

  } catch (error) {
    console.error('[Admin Users API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Check auth - ADMIN and MANAGER can create users
  const auth = await requireAuth(['ADMIN', 'MANAGER'])
  if (!auth.authorized || !auth.user) {
    return auth.response
  }

  try {
    const body = await request.json()
    const { email, password, firstName, lastName, role, locationId } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role || !locationId) {
      return NextResponse.json(
        { success: false, error: 'All fields are required: email, password, firstName, lastName, role, locationId' },
        { status: 400 }
      )
    }

    // Check if user can create users with this role
    if (!canCreateUserWithRole(auth.user.role, role as AllowedRole)) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to create users with this role' },
        { status: 403 }
      )
    }

    // MANAGER can only create users in their own location
    if (auth.user.role === 'MANAGER' && locationId !== auth.user.locationId) {
      return NextResponse.json(
        { success: false, error: 'You can only create users in your own location' },
        { status: 403 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    })
    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Invalid location' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        locationId,
        active: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        locationId: true,
        createdAt: true,
        location: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      user,
      message: 'User created successfully',
    })

  } catch (error) {
    console.error('[Admin Users API] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
