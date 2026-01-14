/**
 * POS Products API
 * GET /api/pos/products - Unified endpoint for all POS products
 *
 * Returns frames, lenses, contacts with pre-calculated patient copays
 * based on the customer's price list (from scanned documents).
 *
 * Price List Priority:
 * - If customer has a price list entry for product, use that price
 * - Products with NULL prices are flagged as "needsPricing" = true
 * - Falls back to real-time calculation if no price list exists
 *
 * Location-Specific Visibility:
 * - When locationId is provided, filters products based on LocationProductSettings
 * - Products with showInPos=false (either global or location-specific) are hidden
 * - Featured products and display order respect location overrides
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'
import { getLocationSettings, mergeVisibilitySettings } from '@/lib/services/product-visibility'
import {
  calculateFramePricing,
  calculateLensPricingByCategory,
  calculateContactLensPricing
} from '@/lib/services/pricing-by-category'

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
    let carrier: string | null = null

    // Get customer's pre-calculated price list
    let priceList = new Map<string, { finalPrice: number | null; customPrice: number | null; tier: string | null }>()

    if (customerId) {
      const authResult = await getActiveAuthorizationForCustomer(customerId)
      if (authResult) {
        authorization = authResult.authorization
        carrier = authResult.carrier
      }

      // Load price list for this customer
      const customerPrices = await prisma.customerPriceList.findMany({
        where: { customerId, active: true }
      })
      for (const price of customerPrices) {
        priceList.set(price.productId, {
          finalPrice: price.customPrice ?? price.finalPrice,  // Custom price takes precedence
          customPrice: price.customPrice,
          tier: price.tier
        })
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
        // Check for pre-calculated price from price list
        const priceEntry = priceList.get(frame.id)

        let patientPays: number | null
        let insurancePays: number
        let tier: string | null = null
        let pricingNotes: string | undefined
        let needsPricing = false
        let hasCustomPrice = false

        if (priceEntry) {
          // Use price list entry
          if (priceEntry.finalPrice === null) {
            patientPays = null
            insurancePays = 0
            needsPricing = true
            pricingNotes = 'Price not set - manual entry required'
          } else {
            patientPays = priceEntry.finalPrice
            insurancePays = Math.max(0, frame.retailPrice - priceEntry.finalPrice)
            tier = priceEntry.tier
            hasCustomPrice = priceEntry.customPrice !== null
            pricingNotes = hasCustomPrice ? 'Custom price override' : undefined
          }
        } else {
          // Fall back to real-time calculation
          const pricing = calculateFramePricing(frame.retailPrice, authorization)
          patientPays = pricing.patientPays
          insurancePays = pricing.insurancePays
          pricingNotes = pricing.notes
        }

        products.push({
          id: frame.id,
          sku: frame.sku || frame.id,
          name: `${frame.brand} ${frame.model}`,
          brand: frame.brand,
          description: `${frame.color} - ${frame.eyeSize}/${frame.bridge}/${frame.temple}`,
          category: 'frames',
          subcategory: frame.gender || 'unisex',
          retailPrice: frame.retailPrice,
          patientPays,
          insurancePays,
          tier,
          pricingNotes,
          needsPricing,
          hasCustomPrice,
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

      // Pre-fetch tier mappings from carrier_tiers table for fallback calculation
      const lensIds = paginatedLenses.map(l => l.id)
      const lensTierMappings = carrier ? await prisma.carrierTier.findMany({
        where: {
          productId: { in: lensIds },
          productType: 'LENS_PRODUCT',
          carrier: carrier.toUpperCase()
        }
      }) : []
      const lensTierMap = new Map(lensTierMappings.map(t => [t.productId, t.tierCode]))

      for (const lens of paginatedLenses) {
        // Check for pre-calculated price from price list
        const priceEntry = priceList.get(lens.id)

        let patientPays: number | null
        let insurancePays: number
        let tier: string | null = null
        let pricingNotes: string | undefined
        let needsPricing = false
        let hasCustomPrice = false

        if (priceEntry) {
          // Use price list entry
          if (priceEntry.finalPrice === null) {
            patientPays = null
            insurancePays = 0
            needsPricing = true
            pricingNotes = 'Price not set - manual entry required'
          } else {
            patientPays = priceEntry.finalPrice
            insurancePays = Math.max(0, lens.retailPrice - priceEntry.finalPrice)
            tier = priceEntry.tier
            hasCustomPrice = priceEntry.customPrice !== null
            pricingNotes = hasCustomPrice ? 'Custom price override' : undefined
          }
        } else {
          // Fall back to real-time calculation using carrier_tiers table
          const tierCode = lensTierMap.get(lens.id)
          const pricing = calculateLensPricingByCategory(
            lens.pricingCategory,
            lens.retailPrice,
            authorization,
            tierCode
          )
          patientPays = pricing.patientPays
          insurancePays = pricing.insurancePays
          tier = pricing.tier || null
          pricingNotes = pricing.notes
        }

        products.push({
          id: lens.id,
          sku: lens.sku || lens.id,
          name: lens.name,
          brand: lens.manufacturer || 'Generic',
          description: lens.description || lens.category,
          category: 'lenses',
          subcategory: lens.category.toLowerCase(),
          pricingCategory: lens.pricingCategory,
          retailPrice: lens.retailPrice,
          patientPays,
          insurancePays,
          tier,
          pricingNotes,
          needsPricing,
          hasCustomPrice,
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
        // Check for pre-calculated price from price list
        const priceEntry = priceList.get(contact.id)

        let patientPays: number | null
        let insurancePays: number
        let tier: string | null = null
        let pricingNotes: string | undefined
        let needsPricing = false
        let hasCustomPrice = false

        if (priceEntry) {
          // Use price list entry
          if (priceEntry.finalPrice === null) {
            patientPays = null
            insurancePays = 0
            needsPricing = true
            pricingNotes = 'Price not set - manual entry required'
          } else {
            patientPays = priceEntry.finalPrice
            insurancePays = Math.max(0, contact.retailPrice - priceEntry.finalPrice)
            tier = priceEntry.tier
            hasCustomPrice = priceEntry.customPrice !== null
            pricingNotes = hasCustomPrice ? 'Custom price override' : undefined
          }
        } else {
          // Fall back to real-time calculation
          const pricing = calculateContactLensPricing(contact.retailPrice, authorization)
          patientPays = pricing.patientPays
          insurancePays = pricing.insurancePays
          pricingNotes = pricing.notes
        }

        products.push({
          id: contact.id,
          sku: contact.id,
          name: contact.lensName,
          brand: contact.manufacturer,
          description: `${contact.boxSize} pack${contact.isDaily ? ' - Daily' : contact.isMonthly ? ' - Monthly' : ''}`,
          category: 'contacts',
          subcategory: getContactSubcategory(contact),
          pricingCategory: contact.pricingCategory,
          retailPrice: contact.retailPrice,
          patientPays,
          insurancePays,
          tier,
          pricingNotes,
          needsPricing,
          hasCustomPrice,
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

    // Count products needing pricing
    const productsNeedingPricing = products.filter(p => p.needsPricing).length

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
        hasPriceList: priceList.size > 0,
      } : null,
      pricing: {
        productsNeedingPricing,
        canAddToCart: productsNeedingPricing === 0,  // Block if any products need pricing
      },
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
  pricingCategory?: string | null
  retailPrice: number
  patientPays: number | null  // NULL means needs manual pricing
  insurancePays: number
  tier?: string | null
  pricingNotes?: string
  needsPricing: boolean  // TRUE if price is NULL and must be set before adding to cart
  hasCustomPrice?: boolean  // TRUE if price was manually overridden
  inStock: boolean
  stockQuantity?: number
  manufacturer?: string
  metadata?: Record<string, unknown>
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
// HELPERS
// =============================================================================

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
