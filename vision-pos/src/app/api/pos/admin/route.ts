/**
 * POS Admin API
 *
 * GET /api/pos/admin - Get all products with their POS visibility settings
 * PATCH /api/pos/admin - Update product visibility settings
 *
 * Allows management to:
 * - Show/hide products from POS (per-location or global)
 * - Feature products (appear first)
 * - Set display order
 *
 * Location-Specific Visibility:
 * - When locationId is provided, returns products with location-specific overrides merged
 * - When updating with locationId, writes to LocationProductSettings table
 * - Without locationId, uses global defaults from product tables
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ProductType } from '@prisma/client'
import { requireAuth, getEffectiveLocationId } from '@/lib/api-auth'
import { getLocationSettings, mergeVisibilitySettings, upsertLocationSettings } from '@/lib/services/product-visibility'

type ApiProductType = 'frames' | 'lenses' | 'contacts' | 'services'

// Map API product types to Prisma enum
const productTypeMap: Record<ApiProductType, ProductType> = {
  frames: 'FRAME',
  lenses: 'LENS',
  contacts: 'CONTACT',
  services: 'SERVICE',
}

export async function GET(request: NextRequest) {
  // Check auth - ADMIN and MANAGER can access
  const auth = await requireAuth(['ADMIN', 'MANAGER'])
  if (!auth.authorized || !auth.user) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') || 'all') as ApiProductType | 'all'
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')

    // Get location ID - from param for ADMIN, from session for MANAGER
    const requestedLocationId = searchParams.get('locationId')
    const locationId = getEffectiveLocationId(auth.user.role, auth.user.locationId, requestedLocationId)

    const results: {
      frames: any[]
      lenses: any[]
      contacts: any[]
      services: any[]
    } = {
      frames: [],
      lenses: [],
      contacts: [],
      services: [],
    }

    const skip = (page - 1) * limit

    // Load location-specific settings if we have a location
    let frameSettings = new Map()
    let lensSettings = new Map()
    let contactSettings = new Map()
    let serviceSettings = new Map()

    if (locationId) {
      if (type === 'all' || type === 'frames') {
        frameSettings = await getLocationSettings(locationId, 'FRAME')
      }
      if (type === 'all' || type === 'lenses') {
        lensSettings = await getLocationSettings(locationId, 'LENS')
      }
      if (type === 'all' || type === 'contacts') {
        contactSettings = await getLocationSettings(locationId, 'CONTACT')
      }
      if (type === 'all' || type === 'services') {
        serviceSettings = await getLocationSettings(locationId, 'SERVICE')
      }
    }

    // Fetch frames
    if (type === 'all' || type === 'frames') {
      const where: any = { isActive: true }
      if (search) {
        where.OR = [
          { brand: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
        ]
      }

      const frames = await prisma.frame.findMany({
        where,
        select: {
          id: true,
          brand: true,
          model: true,
          retailPrice: true,
          manufacturer: true,
          showInPos: true,
          isFeatured: true,
          posDisplayOrder: true,
        },
        orderBy: [
          { brand: 'asc' },
          { model: 'asc' },
        ],
        take: limit,
        skip,
      })

      // Merge with location settings
      results.frames = locationId
        ? mergeVisibilitySettings(frames, frameSettings, 'FRAME')
        : frames.map(f => ({ ...f, hasLocationOverride: false }))

      // Sort by effective visibility settings
      results.frames.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1
        if (a.posDisplayOrder !== b.posDisplayOrder) return a.posDisplayOrder - b.posDisplayOrder
        return a.brand.localeCompare(b.brand)
      })
    }

    // Fetch lenses
    if (type === 'all' || type === 'lenses') {
      const where: any = { isActive: true }
      if (search) {
        where.name = { contains: search, mode: 'insensitive' }
      }

      const lenses = await prisma.lensProduct.findMany({
        where,
        select: {
          id: true,
          name: true,
          category: true,
          retailPrice: true,
          manufacturer: true,
          showInPos: true,
          isFeatured: true,
          posDisplayOrder: true,
        },
        orderBy: [
          { name: 'asc' },
        ],
        take: limit,
        skip,
      })

      results.lenses = locationId
        ? mergeVisibilitySettings(lenses, lensSettings, 'LENS')
        : lenses.map(l => ({ ...l, hasLocationOverride: false }))

      results.lenses.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1
        if (a.posDisplayOrder !== b.posDisplayOrder) return a.posDisplayOrder - b.posDisplayOrder
        return a.name.localeCompare(b.name)
      })
    }

    // Fetch contacts
    if (type === 'all' || type === 'contacts') {
      const where: any = { isActive: true }
      if (search) {
        where.OR = [
          { lensName: { contains: search, mode: 'insensitive' } },
          { manufacturer: { contains: search, mode: 'insensitive' } },
        ]
      }

      const contacts = await prisma.contactLens.findMany({
        where,
        select: {
          id: true,
          lensName: true,
          manufacturer: true,
          boxSize: true,
          retailPrice: true,
          showInPos: true,
          isFeatured: true,
          posDisplayOrder: true,
        },
        orderBy: [
          { manufacturer: 'asc' },
          { lensName: 'asc' },
        ],
        take: limit,
        skip,
      })

      results.contacts = locationId
        ? mergeVisibilitySettings(contacts, contactSettings, 'CONTACT')
        : contacts.map(c => ({ ...c, hasLocationOverride: false }))

      results.contacts.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1
        if (a.posDisplayOrder !== b.posDisplayOrder) return a.posDisplayOrder - b.posDisplayOrder
        return a.manufacturer.localeCompare(b.manufacturer)
      })
    }

    // Fetch services
    if (type === 'all' || type === 'services') {
      const where: any = { isActive: true }
      if (search) {
        where.name = { contains: search, mode: 'insensitive' }
      }

      const services = await prisma.servicePrice.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          category: true,
          retailPrice: true,
          showInPos: true,
          isFeatured: true,
          posDisplayOrder: true,
        },
        orderBy: [
          { name: 'asc' },
        ],
        take: limit,
        skip,
      })

      results.services = locationId
        ? mergeVisibilitySettings(services, serviceSettings, 'SERVICE')
        : services.map(s => ({ ...s, hasLocationOverride: false }))

      results.services.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1
        if (a.posDisplayOrder !== b.posDisplayOrder) return a.posDisplayOrder - b.posDisplayOrder
        return a.name.localeCompare(b.name)
      })
    }

    // Get counts for each type
    const counts = {
      frames: await prisma.frame.count({ where: { isActive: true } }),
      lenses: await prisma.lensProduct.count({ where: { isActive: true } }),
      contacts: await prisma.contactLens.count({ where: { isActive: true } }),
      services: await prisma.servicePrice.count({ where: { isActive: true } }),
    }

    // Calculate hidden/featured counts based on effective visibility
    const hiddenCounts = {
      frames: results.frames.filter(f => !f.showInPos).length,
      lenses: results.lenses.filter(l => !l.showInPos).length,
      contacts: results.contacts.filter(c => !c.showInPos).length,
      services: results.services.filter(s => !s.showInPos).length,
    }

    const featuredCounts = {
      frames: results.frames.filter(f => f.isFeatured).length,
      lenses: results.lenses.filter(l => l.isFeatured).length,
      contacts: results.contacts.filter(c => c.isFeatured).length,
      services: results.services.filter(s => s.isFeatured).length,
    }

    // Count location overrides
    const overrideCounts = locationId ? {
      frames: results.frames.filter(f => f.hasLocationOverride).length,
      lenses: results.lenses.filter(l => l.hasLocationOverride).length,
      contacts: results.contacts.filter(c => c.hasLocationOverride).length,
      services: results.services.filter(s => s.hasLocationOverride).length,
    } : undefined

    return NextResponse.json({
      success: true,
      ...results,
      locationId,
      stats: {
        total: counts,
        hidden: hiddenCounts,
        featured: featuredCounts,
        overrides: overrideCounts,
      },
      pagination: {
        page,
        limit,
      }
    })

  } catch (error) {
    console.error('[POS Admin API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update product visibility settings
 * When locationId is provided, updates LocationProductSettings
 * Otherwise updates global visibility on the product table
 */
export async function PATCH(request: NextRequest) {
  // Check auth - ADMIN and MANAGER can update
  const auth = await requireAuth(['ADMIN', 'MANAGER'])
  if (!auth.authorized || !auth.user) {
    return auth.response
  }

  try {
    const body = await request.json()
    const { type, id, showInPos, isFeatured, posDisplayOrder, locationId: requestedLocationId } = body

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: 'Type and ID are required' },
        { status: 400 }
      )
    }

    // Validate product type
    if (!productTypeMap[type as ApiProductType]) {
      return NextResponse.json(
        { success: false, error: 'Invalid product type' },
        { status: 400 }
      )
    }

    // Get effective location ID
    const locationId = getEffectiveLocationId(auth.user.role, auth.user.locationId, requestedLocationId)

    // If we have a locationId, update LocationProductSettings
    if (locationId) {
      const productType = productTypeMap[type as ApiProductType]

      await upsertLocationSettings(locationId, productType, id, {
        showInPos,
        isFeatured,
        posDisplayOrder,
      })

      return NextResponse.json({
        success: true,
        locationId,
        message: 'Location-specific visibility updated',
      })
    }

    // No locationId - update global visibility (ADMIN only for global changes)
    if (auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only admins can update global visibility settings' },
        { status: 403 }
      )
    }

    const updateData: any = {}
    if (showInPos !== undefined) updateData.showInPos = showInPos
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured
    if (posDisplayOrder !== undefined) updateData.posDisplayOrder = posDisplayOrder

    let updated

    switch (type) {
      case 'frames':
        updated = await prisma.frame.update({
          where: { id },
          data: updateData,
        })
        break
      case 'lenses':
        updated = await prisma.lensProduct.update({
          where: { id },
          data: updateData,
        })
        break
      case 'contacts':
        updated = await prisma.contactLens.update({
          where: { id },
          data: updateData,
        })
        break
      case 'services':
        updated = await prisma.servicePrice.update({
          where: { id },
          data: updateData,
        })
        break
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      updated,
      message: 'Global visibility updated',
    })

  } catch (error) {
    console.error('[POS Admin API] PATCH Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

/**
 * POST - Bulk update visibility settings
 * When locationId is provided, updates LocationProductSettings for multiple products
 * Otherwise updates global visibility (ADMIN only)
 */
export async function POST(request: NextRequest) {
  // Check auth - ADMIN and MANAGER can bulk update
  const auth = await requireAuth(['ADMIN', 'MANAGER'])
  if (!auth.authorized || !auth.user) {
    return auth.response
  }

  try {
    const body = await request.json()
    const { updates, locationId: requestedLocationId } = body // updates: Array of { type, id, showInPos, isFeatured, posDisplayOrder }

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: 'Updates array is required' },
        { status: 400 }
      )
    }

    // Get effective location ID
    const locationId = getEffectiveLocationId(auth.user.role, auth.user.locationId, requestedLocationId)

    const results: { id: string; success: boolean; error?: string }[] = []

    // If we have a locationId, update LocationProductSettings
    if (locationId) {
      for (const update of updates) {
        const { type, id, showInPos, isFeatured, posDisplayOrder } = update

        if (!productTypeMap[type as ApiProductType]) {
          results.push({ id, success: false, error: 'Invalid product type' })
          continue
        }

        try {
          const productType = productTypeMap[type as ApiProductType]
          await upsertLocationSettings(locationId, productType, id, {
            showInPos,
            isFeatured,
            posDisplayOrder,
          })
          results.push({ id, success: true })
        } catch (err) {
          results.push({ id, success: false, error: (err as Error).message })
        }
      }

      return NextResponse.json({
        success: true,
        locationId,
        results,
        message: `Updated ${results.filter(r => r.success).length} of ${results.length} products for this location`,
      })
    }

    // No locationId - update global visibility (ADMIN only)
    if (auth.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only admins can update global visibility settings' },
        { status: 403 }
      )
    }

    for (const update of updates) {
      const { type, id, showInPos, isFeatured, posDisplayOrder } = update

      const updateData: any = {}
      if (showInPos !== undefined) updateData.showInPos = showInPos
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured
      if (posDisplayOrder !== undefined) updateData.posDisplayOrder = posDisplayOrder

      try {
        switch (type) {
          case 'frames':
            await prisma.frame.update({ where: { id }, data: updateData })
            break
          case 'lenses':
            await prisma.lensProduct.update({ where: { id }, data: updateData })
            break
          case 'contacts':
            await prisma.contactLens.update({ where: { id }, data: updateData })
            break
          case 'services':
            await prisma.servicePrice.update({ where: { id }, data: updateData })
            break
          default:
            results.push({ id, success: false, error: 'Invalid product type' })
            continue
        }
        results.push({ id, success: true })
      } catch (err) {
        results.push({ id, success: false, error: (err as Error).message })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Updated ${results.filter(r => r.success).length} of ${results.length} products globally`,
    })

  } catch (error) {
    console.error('[POS Admin API] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to bulk update products' },
      { status: 500 }
    )
  }
}
