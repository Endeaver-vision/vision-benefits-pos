/**
 * POS Services API
 * GET /api/pos/services - Fetch exam services, procedures, diagnostics
 * POST /api/pos/services - Create new service
 *
 * Returns services with pre-calculated patient copays based on authorization.
 *
 * Location-Specific Visibility:
 * - When locationId is provided, filters services based on LocationProductSettings
 * - Services with showInPos=false (either global or location-specific) are hidden
 * - Featured services and display order respect location overrides
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'
import { getLocationSettings, mergeVisibilitySettings } from '@/lib/services/product-visibility'
import { calculateServicePricingByCategory } from '@/lib/services/pricing-by-category'

type ServiceCategory = 'EXAM' | 'PROCEDURE' | 'DIAGNOSTIC' | 'CONTACT_LENS_FIT' | 'all'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const locationId = searchParams.get('locationId')
    const category = (searchParams.get('category') || 'all') as ServiceCategory
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '100')
    const page = parseInt(searchParams.get('page') || '1')
    const includeHidden = searchParams.get('includeHidden') === 'true'

    // Get customer's authorization if customerId provided
    let authorization = null
    let carrier: string | null = null

    if (customerId) {
      const authResult = await getActiveAuthorizationForCustomer(customerId)
      if (authResult) {
        authorization = authResult.authorization
        carrier = authResult.carrier
      }
    }

    // Load location-specific settings if locationId provided
    let serviceSettings = new Map()
    if (locationId) {
      serviceSettings = await getLocationSettings(locationId, 'SERVICE')
    }

    // Build where clause - fetch all, filter by visibility after merging
    const where: Record<string, unknown> = { isActive: true }

    if (category !== 'all') {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Fetch services
    const services = await prisma.servicePrice.findMany({
      where,
      take: limit * 2, // Fetch more to account for filtering
      skip: (page - 1) * limit,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    })

    // Merge with location settings
    const servicesWithVisibility = locationId
      ? mergeVisibilitySettings(services as any[], serviceSettings, 'SERVICE')
      : services.map(s => ({ ...s, hasLocationOverride: false }))

    // Filter by visibility
    const visibleServices = includeHidden
      ? servicesWithVisibility
      : servicesWithVisibility.filter(s => s.showInPos)

    // Sort by effective visibility settings
    visibleServices.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1
      if (a.posDisplayOrder !== b.posDisplayOrder) return a.posDisplayOrder - b.posDisplayOrder
      if (a.category !== b.category) return (a.category || 'OTHER').localeCompare(b.category || 'OTHER')
      return a.name.localeCompare(b.name)
    })

    // Apply pagination
    const paginatedServices = visibleServices.slice(0, limit)

    // Calculate pricing for each service using pricingCategory
    const posServices = paginatedServices.map(service => {
      const pricing = calculateServicePricingByCategory(
        service.pricingCategory,
        service.retailPrice,
        authorization
      )

      return {
        id: service.id,
        sku: service.sku || service.id,
        name: service.name,
        code: service.code,
        description: service.description,
        category: service.category || 'OTHER',
        pricingCategory: service.pricingCategory,
        retailPrice: service.retailPrice,
        patientPays: pricing.patientPays,
        insurancePays: pricing.insurancePays,
        pricingNotes: pricing.notes,
        isCoveredByVision: service.isCoveredByVision,
        isCoveredByMedical: service.isCoveredByMedical,
        billingBucket: service.billingBucket,
        notes: service.notes,
      }
    })

    // Get category counts for filters
    const categoryCounts = await prisma.servicePrice.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { category: true },
    })

    return NextResponse.json({
      success: true,
      services: posServices,
      locationId,
      filters: {
        categories: categoryCounts.map(c => ({
          name: c.category || 'OTHER',
          count: c._count.category,
        })),
      },
      customer: customerId ? {
        id: customerId,
        carrier,
        hasAuthorization: !!authorization,
      } : null,
      pagination: {
        page,
        limit,
        total: posServices.length,
      }
    })

  } catch (error) {
    console.error('[POS Services API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create a new service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      code,
      retailPrice,
      category,
      description,
      billingBucket,
      isCoveredByVision,
      isCoveredByMedical,
      vspAllowance,
      eyemedAllowance,
      specteraAllowance,
      notes,
    } = body

    if (!name || retailPrice === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name and retail price are required' },
        { status: 400 }
      )
    }

    const service = await prisma.servicePrice.create({
      data: {
        name,
        sku: code || `SVC-${Date.now()}`,
        code,
        retailPrice: parseFloat(retailPrice),
        category: category || 'OTHER',
        description,
        billingBucket,
        isCoveredByVision: isCoveredByVision ?? false,
        isCoveredByMedical: isCoveredByMedical ?? false,
        vspAllowance: vspAllowance ? parseFloat(vspAllowance) : null,
        eyemedAllowance: eyemedAllowance ? parseFloat(eyemedAllowance) : null,
        specteraAllowance: specteraAllowance ? parseFloat(specteraAllowance) : null,
        notes,
        isActive: true,
      }
    })

    return NextResponse.json({
      success: true,
      service,
      message: 'Service created successfully',
    })

  } catch (error) {
    console.error('[POS Services API] POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create service' },
      { status: 500 }
    )
  }
}

