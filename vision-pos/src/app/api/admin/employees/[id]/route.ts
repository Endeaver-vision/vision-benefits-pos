/**
 * Single Employee Management API
 * GET /api/admin/employees/[id] - Get employee details
 * PATCH /api/admin/employees/[id] - Update employee
 * DELETE /api/admin/employees/[id] - Deactivate employee
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        externalId: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phone: true,
        address: true,
        roles: true,
        active: true,
        primaryLocationId: true,
        hireDate: true,
        terminationDate: true,
        notes: true,
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
      }
    })

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      employee,
    })

  } catch (error) {
    console.error('[Admin Employees API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Get existing employee
    const existingEmployee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, username, email, phone, address, roles, primaryLocationId, active, notes } = body

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (roles !== undefined) updateData.roles = roles
    if (active !== undefined) updateData.active = active
    if (notes !== undefined) updateData.notes = notes

    // Handle username change
    if (username !== undefined && username !== existingEmployee.username) {
      const usernameEmployee = await prisma.employee.findUnique({ where: { username } })
      if (usernameEmployee && usernameEmployee.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Username already in use by another employee' },
          { status: 400 }
        )
      }
      updateData.username = username
    }

    // Handle location change
    if (primaryLocationId !== undefined && primaryLocationId !== existingEmployee.primaryLocationId) {
      if (primaryLocationId) {
        const location = await prisma.location.findUnique({ where: { id: primaryLocationId } })
        if (!location) {
          return NextResponse.json(
            { success: false, error: 'Invalid location' },
            { status: 400 }
          )
        }
      }
      updateData.primaryLocationId = primaryLocationId || null
    }

    // Update employee
    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
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
        updatedAt: true,
        primaryLocation: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      employee,
      message: 'Employee updated successfully',
    })

  } catch (error) {
    console.error('[Admin Employees API] PATCH Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update employee' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Get existing employee
    const existingEmployee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Soft delete - set active to false
    await prisma.employee.update({
      where: { id },
      data: { active: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Employee deactivated successfully',
    })

  } catch (error) {
    console.error('[Admin Employees API] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate employee' },
      { status: 500 }
    )
  }
}
