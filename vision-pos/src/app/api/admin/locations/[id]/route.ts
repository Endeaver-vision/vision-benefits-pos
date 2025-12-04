/**
 * Single Location Management API
 * GET /api/admin/locations/[id] - Get location details
 * PATCH /api/admin/locations/[id] - Update location
 * DELETE /api/admin/locations/[id] - Deactivate location
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, canManageLocation } from '@/lib/api-auth'

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
    const location = await prisma.location.findUnique({
      where: { id },
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
            transactions: true,
          }
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            active: true,
          },
          orderBy: { lastName: 'asc' }
        }
      }
    })

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }

    // MANAGER can only view their own location
    if (auth.user.role === 'MANAGER' && location.id !== auth.user.locationId) {
      return NextResponse.json(
        { success: false, error: 'Cannot access other locations' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      location,
    })

  } catch (error) {
    console.error('[Admin Locations API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch location' },
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
    // Get existing location
    const existingLocation = await prisma.location.findUnique({
      where: { id }
    })

    if (!existingLocation) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check access
    if (!canManageLocation(auth.user.role, auth.user.locationId, id)) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit other locations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, address, phone, timezone, active } = body

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      // Check name uniqueness
      const nameLocation = await prisma.location.findUnique({ where: { name } })
      if (nameLocation && nameLocation.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Location name already in use' },
          { status: 400 }
        )
      }
      updateData.name = name
    }

    if (address !== undefined) updateData.address = address
    if (phone !== undefined) updateData.phone = phone
    if (timezone !== undefined) updateData.timezone = timezone

    // Only ADMIN can deactivate locations
    if (active !== undefined) {
      if (auth.user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Only admins can change location status' },
          { status: 403 }
        )
      }
      updateData.active = active
    }

    // Update location
    const location = await prisma.location.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        timezone: true,
        active: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({
      success: true,
      location,
      message: 'Location updated successfully',
    })

  } catch (error) {
    console.error('[Admin Locations API] PATCH Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Only ADMIN can delete locations
  const auth = await requireAuth(['ADMIN'])
  if (!auth.authorized || !auth.user) {
    return auth.response
  }

  try {
    // Get existing location
    const existingLocation = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: { where: { active: true } }
          }
        }
      }
    })

    if (!existingLocation) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }

    // Prevent deactivating location with active users
    if (existingLocation._count.users > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot deactivate location with ${existingLocation._count.users} active users. Reassign or deactivate users first.` },
        { status: 400 }
      )
    }

    // Soft delete - set active to false
    await prisma.location.update({
      where: { id },
      data: { active: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Location deactivated successfully',
    })

  } catch (error) {
    console.error('[Admin Locations API] DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate location' },
      { status: 500 }
    )
  }
}
