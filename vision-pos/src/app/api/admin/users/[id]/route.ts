/**
 * Single User Management API
 * GET /api/admin/users/[id] - Get user details
 * PATCH /api/admin/users/[id] - Update user
 * DELETE /api/admin/users/[id] - Deactivate user
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, canManageLocation, canCreateUserWithRole, AllowedRole } from '@/lib/api-auth'
import { hashPassword } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Check auth
  const auth = await requireAuth(['ADMIN', 'MANAGER'])
  if (!auth.authorized || !auth.user) {
    return auth.response
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
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
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // MANAGER can only view users in their location
    if (auth.user.role === 'MANAGER' && user.locationId !== auth.user.locationId) {
      return NextResponse.json(
        { success: false, error: 'Cannot access users from other locations' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      user,
    })

  } catch (error) {
    console.error('[Admin Users API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Check auth
  const auth = await requireAuth(['ADMIN', 'MANAGER'])
  if (!auth.authorized || !auth.user) {
    return auth.response
  }

  try {
    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check location access
    if (!canManageLocation(auth.user.role, auth.user.locationId, existingUser.locationId)) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit users from other locations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, password, firstName, lastName, role, locationId, active } = body

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (email !== undefined) {
      // Check email uniqueness
      const emailUser = await prisma.user.findUnique({ where: { email } })
      if (emailUser && emailUser.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Email already in use by another user' },
          { status: 400 }
        )
      }
      updateData.email = email
    }

    if (password) {
      updateData.passwordHash = await hashPassword(password)
    }

    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (active !== undefined) updateData.active = active

    // Role change requires permission check
    if (role !== undefined && role !== existingUser.role) {
      if (!canCreateUserWithRole(auth.user.role, role as AllowedRole)) {
        return NextResponse.json(
          { success: false, error: 'You cannot assign this role' },
          { status: 403 }
        )
      }
      updateData.role = role
    }

    // Location change - MANAGER cannot change location
    if (locationId !== undefined && locationId !== existingUser.locationId) {
      if (auth.user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Only admins can change user locations' },
          { status: 403 }
        )
      }
      // Verify location exists
      const location = await prisma.location.findUnique({ where: { id: locationId } })
      if (!location) {
        return NextResponse.json(
          { success: false, error: 'Invalid location' },
          { status: 400 }
        )
      }
      updateData.locationId = locationId
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        locationId: true,
        updatedAt: true,
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
      message: 'User updated successfully',
    })

  } catch (error) {
    console.error('[Admin Users API] PATCH Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Check auth - Only ADMIN can delete
  const auth = await requireAuth(['ADMIN', 'MANAGER'])
  if (!auth.authorized || !auth.user) {
    return auth.response
  }

  try {
    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check location access
    if (!canManageLocation(auth.user.role, auth.user.locationId, existingUser.locationId)) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete users from other locations' },
        { status: 403 }
      )
    }

    // Prevent self-deletion
    if (existingUser.id === auth.user.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Soft delete - set active to false
    await prisma.user.update({
      where: { id },
      data: { active: false }
    })

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
    })

  } catch (error) {
    console.error('[Admin Users API] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate user' },
      { status: 500 }
    )
  }
}
