/**
 * Employee Management API
 * GET /api/admin/employees - List employees
 * POST /api/admin/employees - Create new employee
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const locationId = searchParams.get('locationId') || ''
    const status = searchParams.get('status') || 'active'
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    // Build where clause
    const where: Record<string, unknown> = {}

    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Role filter
    if (role) {
      where.roles = { has: role }
    }

    // Location filter
    if (locationId) {
      where.primaryLocationId = locationId
    }

    // Status filter
    if (status === 'active') {
      where.active = true
    } else if (status === 'inactive') {
      where.active = false
    }

    // Fetch employees
    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        externalId: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phone: true,
        roles: true,
        active: true,
        primaryLocationId: true,
        createdAt: true,
        updatedAt: true,
        primaryLocation: {
          select: {
            id: true,
            name: true,
            shortName: true,
          }
        },
        locations: {
          select: {
            location: {
              select: {
                id: true,
                name: true,
                shortName: true,
              }
            },
            isPrimary: true,
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
    const total = await prisma.employee.count({ where })

    return NextResponse.json({
      success: true,
      employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })

  } catch (error) {
    console.error('[Admin Employees API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, username, email, phone, roles, primaryLocationId } = body

    // Validate required fields
    if (!firstName || !lastName || !username) {
      return NextResponse.json(
        { success: false, error: 'firstName, lastName, and username are required' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { username }
    })
    if (existingEmployee) {
      return NextResponse.json(
        { success: false, error: 'An employee with this username already exists' },
        { status: 400 }
      )
    }

    // Verify location exists if provided
    if (primaryLocationId) {
      const location = await prisma.location.findUnique({
        where: { id: primaryLocationId }
      })
      if (!location) {
        return NextResponse.json(
          { success: false, error: 'Invalid location' },
          { status: 400 }
        )
      }
    }

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName,
        username,
        email: email || null,
        phone: phone || null,
        roles: roles || ['optician'],
        primaryLocationId: primaryLocationId || null,
        active: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phone: true,
        roles: true,
        active: true,
        primaryLocationId: true,
        createdAt: true,
        primaryLocation: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    // Create employee_location entry if location provided
    if (primaryLocationId) {
      await prisma.employeeLocation.create({
        data: {
          employeeId: employee.id,
          locationId: primaryLocationId,
          isPrimary: true,
        }
      })
    }

    return NextResponse.json({
      success: true,
      employee,
      message: 'Employee created successfully',
    })

  } catch (error) {
    console.error('[Admin Employees API] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create employee' },
      { status: 500 }
    )
  }
}
