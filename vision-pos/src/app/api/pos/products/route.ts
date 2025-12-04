/**
 * POS Products API
 * GET /api/pos/products - Unified endpoint for all POS products
 *
 * Returns frames, lenses, contacts with pre-calculated patient copays
 * based on the customer's active insurance authorization.
 *
 * Location-Specific Visibility:
 * - When locationId is provided, filters products based on LocationProductSettings
 * - Products with showInPos=false (either global or location-specific) are hidden
 * - Featured products and display order respect location overrides
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'
import { createPricingCalculator } from '@/lib/services/pricing-calculator'
import { getLocationSettings, mergeVisibilitySettings } from '@/lib/services/product-visibility'

type ProductCategory = 'frames' | 'lenses' | 'contacts' | 'all'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const locationId = searchParams.get('locationId')
    const category = (searchParams.get('category') || 'all') as ProductCategory
    const search = searchParams.get('search') || ''
    const brand = searchParams.get('brand') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const includeHidden = searchParams.get('includeHidden') === 'true'

    // Get customer's authorization if customerId provided
    let authorization = null
    let calculator = null
    let carrier: string | null = null

    if (customerId) {
      const authResult = await getActiveAuthorizationForCustomer(customerId)
      if (authResult) {
        authorization = authResult.authorization
        carrier = authResult.carrier
        calculator = createPricingCalculator(authorization)
      }
    }

    // Load location-specific settings if locationId provided
    let frameSettings = new Map()
    let lensSettings = new Map()
    let contactSettings = new Map()

    if (locationId) {
      if (category === 'frames' || category === 'all') {
        frameSettings = await getLocationSettings(locationId, 'FRAME')
      }
      if (category === 'lenses' || category === 'all') {
        lensSettings = await getLocationSettings(locationId, 'LENS')
      }
      if (category === 'contacts' || category === 'all') {
        contactSettings = await getLocationSettings(locationId, 'CONTACT')
      }
    }

    const products: PosProduct[] = []

    // Fetch frames
    if (category === 'frames' || category === 'all') {
      const frames = await fetchFrames(search, brand, limit * 2, page, true) // Fetch more, filter after

      // Merge with location settings
      const framesWithVisibility = locationId
        ? mergeVisibilitySettings(frames as any[], frameSettings, 'FRAME')
        : frames.map(f => ({ ...f, hasLocationOverride: false }))

      // Filter by visibility and sort
      const visibleFrames = includeHidden
        ? framesWithVisibility
        : framesWithVisibility.filter(f => f.showInPos)

      visibleFrames.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1
        if (a.posDisplayOrder !== b.posDisplayOrder) return a.posDisplayOrder - b.posDisplayOrder
        return a.brand.localeCompare(b.brand)
      })

      // Apply pagination
      const paginatedFrames = visibleFrames.slice(0, limit)

      for (const frame of paginatedFrames) {
        const pricing = calculateFramePricing(frame, calculator, authorization, carrier)
        products.push({
          id: frame.id,
          sku: frame.sku || frame.id,
          name: `${frame.brand} ${frame.model}`,
          brand: frame.brand,
          description: `${frame.color} - ${frame.eyeSize}/${frame.bridge}/${frame.temple}`,
          category: 'frames',
          subcategory: frame.gender || 'unisex',
          retailPrice: frame.retailPrice,
          patientPays: pricing.patientPays,
          insurancePays: pricing.insurancePays,
          tier: pricing.tier,
          inStock: frame.stockQuantity > 0,
          stockQuantity: frame.stockQuantity,
          manufacturer: frame.manufacturer,
        })
      }
    }

    // Fetch lenses
    if (category === 'lenses' || category === 'all') {
      const lenses = await fetchLenses(search, limit * 2, page, true)

      const lensesWithVisibility = locationId
        ? mergeVisibilitySettings(lenses as any[], lensSettings, 'LENS')
        : lenses.map(l => ({ ...l, hasLocationOverride: false }))

      const visibleLenses = includeHidden
        ? lensesWithVisibility
        : lensesWithVisibility.filter(l => l.showInPos)

      visibleLenses.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1
        if (a.posDisplayOrder !== b.posDisplayOrder) return a.posDisplayOrder - b.posDisplayOrder
        return a.name.localeCompare(b.name)
      })

      const paginatedLenses = visibleLenses.slice(0, limit)

      for (const lens of paginatedLenses) {
        const pricing = calculateLensPricing(lens, calculator, authorization, carrier)
        products.push({
          id: lens.id,
          sku: lens.sku || lens.id,
          name: lens.name,
          brand: lens.manufacturer || 'Generic',
          description: lens.description || lens.category,
          category: 'lenses',
          subcategory: lens.category.toLowerCase(),
          retailPrice: lens.retailPrice,
          patientPays: pricing.patientPays,
          insurancePays: pricing.insurancePays,
          tier: pricing.tier,
          inStock: true,
          manufacturer: lens.manufacturer,
        })
      }
    }

    // Fetch contacts
    if (category === 'contacts' || category === 'all') {
      const contacts = await fetchContacts(search, brand, limit * 2, page, true)

      const contactsWithVisibility = locationId
        ? mergeVisibilitySettings(contacts as any[], contactSettings, 'CONTACT')
        : contacts.map(c => ({ ...c, hasLocationOverride: false }))

      const visibleContacts = includeHidden
        ? contactsWithVisibility
        : contactsWithVisibility.filter(c => c.showInPos)

      visibleContacts.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1
        if (a.posDisplayOrder !== b.posDisplayOrder) return a.posDisplayOrder - b.posDisplayOrder
        return a.manufacturer.localeCompare(b.manufacturer)
      })

      const paginatedContacts = visibleContacts.slice(0, limit)

      for (const contact of paginatedContacts) {
        const pricing = calculateContactPricing(contact, calculator, authorization, carrier)
        products.push({
          id: contact.id,
          sku: contact.id,
          name: contact.lensName,
          brand: contact.manufacturer,
          description: `${contact.boxSize} pack${contact.isDaily ? ' - Daily' : contact.isMonthly ? ' - Monthly' : ''}`,
          category: 'contacts',
          subcategory: getContactSubcategory(contact),
          retailPrice: contact.retailPrice,
          patientPays: pricing.patientPays,
          insurancePays: pricing.insurancePays,
          tier: pricing.tier,
          inStock: true,
          manufacturer: contact.manufacturer,
          metadata: {
            boxSize: contact.boxSize,
            isDaily: contact.isDaily,
            isMonthly: contact.isMonthly,
            isAstigmatism: contact.isAstigmatism,
            isMultifocal: contact.isMultifocal,
          }
        })
      }
    }

    // Get available brands for filters
    const brands = await getAvailableBrands(category)

    return NextResponse.json({
      success: true,
      products,
      locationId,
      filters: {
        brands,
        categories: ['frames', 'lenses', 'contacts'],
      },
      customer: customerId ? {
        id: customerId,
        carrier,
        hasAuthorization: !!authorization,
      } : null,
      pagination: {
        page,
        limit,
        total: products.length,
      }
    })

  } catch (error) {
    console.error('[POS Products API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface PosProduct {
  id: string
  sku: string
  name: string
  brand: string
  description: string
  category: 'frames' | 'lenses' | 'contacts'
  subcategory: string
  retailPrice: number
  patientPays: number
  insurancePays: number
  tier?: string
  inStock: boolean
  stockQuantity?: number
  manufacturer?: string
  metadata?: Record<string, unknown>
}

interface PricingResult {
  patientPays: number
  insurancePays: number
  tier?: string
}

// =============================================================================
// DATA FETCHERS
// =============================================================================

async function fetchFrames(search: string, brand: string, limit: number, page: number, includeHidden = false) {
  const where: Record<string, unknown> = { isActive: true }

  // Only show products marked for POS display (unless includeHidden)
  if (!includeHidden) {
    where.showInPos = true
  }

  if (search) {
    where.OR = [
      { brand: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (brand) {
    where.brand = { contains: brand, mode: 'insensitive' }
  }

  return prisma.frame.findMany({
    where,
    take: limit,
    skip: (page - 1) * limit,
    orderBy: [
      { isFeatured: 'desc' },
      { posDisplayOrder: 'asc' },
      { brand: 'asc' },
    ],
  })
}

async function fetchLenses(search: string, limit: number, page: number, includeHidden = false) {
  const where: Record<string, unknown> = { isActive: true }

  if (!includeHidden) {
    where.showInPos = true
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } },
    ]
  }

  return prisma.lensProduct.findMany({
    where,
    include: { carrierTiers: true },
    take: limit,
    skip: (page - 1) * limit,
    orderBy: [
      { isFeatured: 'desc' },
      { posDisplayOrder: 'asc' },
      { name: 'asc' },
    ],
  })
}

async function fetchContacts(search: string, brand: string, limit: number, page: number, includeHidden = false) {
  const where: Record<string, unknown> = { isActive: true }

  // Only show products marked for POS display (unless includeHidden)
  if (!includeHidden) {
    where.showInPos = true
  }

  if (search) {
    where.OR = [
      { lensName: { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (brand) {
    where.manufacturer = { contains: brand, mode: 'insensitive' }
  }

  return prisma.contactLens.findMany({
    where,
    take: limit,
    skip: (page - 1) * limit,
    orderBy: [
      { isFeatured: 'desc' },
      { posDisplayOrder: 'asc' },
      { manufacturer: 'asc' },
    ],
  })
}

async function getAvailableBrands(category: ProductCategory) {
  const brands: string[] = []

  if (category === 'frames' || category === 'all') {
    const frameBrands = await prisma.frame.groupBy({
      by: ['brand'],
      where: { isActive: true },
      orderBy: { brand: 'asc' },
    })
    brands.push(...frameBrands.map(b => b.brand))
  }

  if (category === 'contacts' || category === 'all') {
    const contactBrands = await prisma.contactLens.groupBy({
      by: ['manufacturer'],
      where: { isActive: true },
      orderBy: { manufacturer: 'asc' },
    })
    brands.push(...contactBrands.map(b => b.manufacturer))
  }

  return [...new Set(brands)].sort()
}

// =============================================================================
// PRICING CALCULATORS
// =============================================================================

function calculateFramePricing(
  frame: { retailPrice: number; manufacturer: string },
  calculator: ReturnType<typeof createPricingCalculator> | null,
  authorization: unknown,
  carrier: string | null
): PricingResult {
  if (!calculator || !authorization || !carrier) {
    return { patientPays: frame.retailPrice, insurancePays: 0 }
  }

  try {
    // Check if featured brand (Marchon/Altair) for VSP
    const featuredManufacturers = ['marchon', 'altair', 'nike', 'columbia', 'nautica', 'flexon', 'dragon']
    const isFeaturedBrand = featuredManufacturers.some(m =>
      frame.manufacturer.toLowerCase().includes(m)
    )

    const result = calculator.calculateFrame(
      {
        sku: '',
        displayName: '',
        category: 'frame',
        retailPrice: frame.retailPrice,
        isActive: true,
        vsp: { isFeaturedBrand },
      },
      authorization as any,
      frame.retailPrice,
      isFeaturedBrand
    )

    return {
      patientPays: result.patientCopay,
      insurancePays: result.insurancePays,
      tier: result.tierUsed,
    }
  } catch {
    return { patientPays: frame.retailPrice, insurancePays: 0 }
  }
}

function calculateLensPricing(
  lens: { retailPrice: number; carrierTiers?: Array<{ carrier: string; tierCode: string }> },
  calculator: ReturnType<typeof createPricingCalculator> | null,
  authorization: unknown,
  carrier: string | null
): PricingResult {
  if (!calculator || !authorization || !carrier) {
    return { patientPays: lens.retailPrice, insurancePays: 0 }
  }

  try {
    // Find tier for this carrier
    const tierMapping = lens.carrierTiers?.find(t =>
      t.carrier.toLowerCase() === carrier.toLowerCase()
    )

    const result = calculator.calculateProduct(
      {
        sku: '',
        displayName: '',
        category: 'lens_progressive',
        retailPrice: lens.retailPrice,
        isActive: true,
        vsp: tierMapping?.carrier === 'VSP' ? { baseCode: tierMapping.tierCode } : undefined,
        eyemed: tierMapping?.carrier === 'EyeMed' ? { progressiveTier: tierMapping.tierCode as any } : undefined,
        spectera: tierMapping?.carrier === 'Spectera' ? { progressiveTier: tierMapping.tierCode as any } : undefined,
      },
      authorization as any,
      lens.retailPrice
    )

    return {
      patientPays: result.patientCopay,
      insurancePays: result.insurancePays,
      tier: result.tierUsed,
    }
  } catch {
    return { patientPays: lens.retailPrice, insurancePays: 0 }
  }
}

function calculateContactPricing(
  contact: { retailPrice: number; vspCategory?: string | null },
  calculator: ReturnType<typeof createPricingCalculator> | null,
  authorization: unknown,
  carrier: string | null
): PricingResult {
  if (!calculator || !authorization || !carrier) {
    return { patientPays: contact.retailPrice, insurancePays: 0 }
  }

  try {
    const result = calculator.calculateProduct(
      {
        sku: '',
        displayName: '',
        category: 'contact',
        retailPrice: contact.retailPrice,
        isActive: true,
      },
      authorization as any,
      contact.retailPrice
    )

    return {
      patientPays: result.patientCopay,
      insurancePays: result.insurancePays,
      tier: result.tierUsed,
    }
  } catch {
    return { patientPays: contact.retailPrice, insurancePays: 0 }
  }
}

function getContactSubcategory(contact: {
  isDaily?: boolean
  isMonthly?: boolean
  isAstigmatism?: boolean
  isMultifocal?: boolean
}): string {
  if (contact.isAstigmatism) return 'toric'
  if (contact.isMultifocal) return 'multifocal'
  if (contact.isDaily) return 'daily'
  if (contact.isMonthly) return 'monthly'
  return 'standard'
}
