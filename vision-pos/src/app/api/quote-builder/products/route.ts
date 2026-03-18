/**
 * Quote Builder Products API
 * GET /api/quote-builder/products - Returns all products grouped by category for the quote builder
 *
 * Uses:
 * - LensProduct table for lens-related items (with carrier tier mappings)
 * - Frame table for eyeglass frames
 * - PatientPriceList table for pre-computed customer prices
 *
 * Query Parameters:
 * - customerId: Optional customer ID to fetch pre-computed prices from patient_price_lists
 * - carrier: Optional carrier filter when customer has multiple insurance plans
 *
 * Price List Integration:
 * - If customerId provided, merges prices from patient_price_lists table
 * - Products show both retailPrice and customerPrice (patient pays)
 * - customerPrice = null means needs manual pricing
 * - customerPrice = 0 means fully covered by insurance
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface QuoteBuilderProduct {
  id: string
  name: string
  price: number              // Retail price (always present)
  customerPrice?: number | null  // Patient pays from price list (null = needs pricing)
  insuranceSavings?: number  // How much insurance covers
  tier?: string | null       // Insurance tier code (e.g., "tier_3", "polycarbonate")
  needsPricing?: boolean     // True if no price mapping exists
  sku: string | null
  manufacturer?: string | null
  brand?: string | null
  model?: string | null
  color?: string | null
  isFeatured?: boolean
  notes?: string
  category?: string          // Product category
  pricingCategory?: string   // Uppercase category for tech addon logic (SINGLE_VISION, PROGRESSIVE, etc.)
  displayOrder?: number | null
}

// Map lens category to pricingCategory format expected by tech addon logic
function mapToPricingCategory(category: string): string {
  const mapping: Record<string, string> = {
    'single_vision': 'SINGLE_VISION',
    'progressive': 'PROGRESSIVE',
    'bifocal': 'BIFOCAL',
    'trifocal': 'TRIFOCAL',
    'material': 'MATERIAL',
    'ar_coating': 'AR_COATING',
    'photochromic': 'PHOTOCHROMIC',
    'addon': 'ADDON',
    'mount_fee': 'MOUNT_FEE',
  }
  return mapping[category.toLowerCase()] || category.toUpperCase()
}

interface PriceListEntry {
  finalPrice: number | null
  tier: string | null
  retailPrice: number
  needsTierAssignment: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const carrierFilter = searchParams.get('carrier')

    // Load customer's pre-computed price list if customerId provided
    const priceList = new Map<string, PriceListEntry>()
    let customerCarrier: string | null = null
    let hasPriceList = false

    if (customerId) {
      // Build where clause for price list query
      const priceListWhere: { customerId: string; active: boolean; insuranceCarrier?: string } = {
        customerId,
        active: true
      }

      // If carrier filter specified, only get prices for that carrier
      if (carrierFilter) {
        priceListWhere.insuranceCarrier = carrierFilter.toUpperCase()
      }

      const customerPrices = await prisma.patientPriceList.findMany({
        where: priceListWhere,
        orderBy: { createdAt: 'desc' }
      })

      for (const price of customerPrices) {
        // Use first occurrence of each product (most recent per carrier)
        if (!priceList.has(price.productId)) {
          priceList.set(price.productId, {
            finalPrice: price.finalPrice ? Number(price.finalPrice) : null,
            tier: price.tier,
            retailPrice: Number(price.retailPrice),
            needsTierAssignment: price.needsTierAssignment ?? false
          })
        }
        // Track carrier from first price entry
        if (!customerCarrier && price.insuranceCarrier) {
          customerCarrier = price.insuranceCarrier
        }
      }

      hasPriceList = priceList.size > 0
    }

    const grouped: Record<string, QuoteBuilderProduct[]> = {
      frames: [],
      lensType: [],
      lensMaterial: [],
      arCoating: [],
      transitions: [],
      mountFee: [],
      addons: []
    }

    // Helper to enrich product with price list data
    const enrichWithPriceList = (
      product: QuoteBuilderProduct,
      productId: string
    ): QuoteBuilderProduct => {
      const priceEntry = priceList.get(productId)

      if (priceEntry) {
        return {
          ...product,
          customerPrice: priceEntry.finalPrice,
          insuranceSavings: priceEntry.finalPrice !== null
            ? Math.max(0, product.price - priceEntry.finalPrice)
            : 0,
          tier: priceEntry.tier,
          needsPricing: priceEntry.needsTierAssignment
        }
      }

      // No price list entry - mark as needing pricing if customer has insurance
      if (hasPriceList) {
        return {
          ...product,
          customerPrice: null,
          needsPricing: true
        }
      }

      // No customer / no insurance - just return retail
      return product
    }

    // Map LensProduct category to quote builder groups
    const categoryToGroup: Record<string, string> = {
      'progressive': 'lensType',
      'single_vision': 'lensType',
      'bifocal': 'lensType',
      'trifocal': 'lensType',
      'ar_coating': 'arCoating',
      'photochromic': 'transitions',
      'material': 'lensMaterial',
      'mount_fee': 'mountFee',
      'addon': 'addons',
      'tint': 'addons',
      'polarized': 'addons'
    }

    // Fetch lens products from LensProduct table
    const lensProducts = await prisma.lensProduct.findMany({
      where: {
        active: true,
        displayGroup: 'everyday'  // Only show everyday (common) products
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    for (const product of lensProducts) {
      // Determine which group this product belongs to
      const groupKey = categoryToGroup[product.category] || 'addons'

      // Check if product is covered by insurance (has tier code for carrier)
      const hasTierMapping = carrierFilter
        ? (carrierFilter.toUpperCase() === 'EYEMED' && product.tierEyemed) ||
          (carrierFilter.toUpperCase() === 'VSP' && product.tierVsp) ||
          (carrierFilter.toUpperCase() === 'SPECTERA' && product.tierSpectera)
        : (product.tierEyemed || product.tierVsp || product.tierSpectera)

      const baseProduct: QuoteBuilderProduct = {
        id: product.id,
        name: product.name,
        price: product.basePrice,
        sku: product.sku,
        manufacturer: product.manufacturer,
        category: product.category,
        pricingCategory: mapToPricingCategory(product.category),
        displayOrder: product.displayOrder,
        notes: !hasTierMapping ? 'Cash pay only' : undefined
      }

      // Enrich with customer price list data if available
      const enrichedProduct = enrichWithPriceList(baseProduct, product.id)
      grouped[groupKey]?.push(enrichedProduct)
    }

    // Fetch frames from Frame table
    const frames = await prisma.frame.findMany({
      where: {
        isActive: true,
        showInPos: true
      },
      take: 100,
      orderBy: [
        { isFeatured: 'desc' },
        { posDisplayOrder: 'asc' },
        { brand: 'asc' },
        { model: 'asc' }
      ]
    })

    for (const frame of frames) {
      const baseProduct: QuoteBuilderProduct = {
        id: frame.id,
        name: `${frame.brand} ${frame.model}`,
        price: frame.retailPrice,
        sku: frame.sku,
        manufacturer: frame.manufacturer,
        brand: frame.brand,
        model: frame.model,
        color: frame.color,
        isFeatured: frame.isFeatured,
        notes: frame.isFeatured ? 'VSP Featured Brand' : undefined
      }

      grouped.frames.push(enrichWithPriceList(baseProduct, frame.id))
    }

    // Define lens type ordering: SV → Progressives → Bifocal → Trifocal
    const getLensTypeOrder = (name: string): number => {
      const nameLower = name.toLowerCase()
      if (nameLower === 'single vision') return 10
      if (nameLower.includes('neurolens sv')) return 15
      if (nameLower.includes('varilux comfort drx')) return 20
      if (nameLower.includes('varilux comfort max')) return 21
      if (nameLower.includes('varilux x')) return 22
      if (nameLower.includes('eyezen')) return 25
      if (nameLower.includes('varilux i')) return 38
      if (nameLower.includes('neurolens progressive')) return 39
      if (nameLower.includes('progressive')) return 35
      if (nameLower.includes('bifocal') || nameLower.includes('flat top')) return 40
      if (nameLower.includes('trifocal')) return 50
      return 100
    }

    // Sort each group appropriately
    for (const key of Object.keys(grouped)) {
      if (key === 'lensType') {
        grouped[key].sort((a, b) => {
          const orderA = getLensTypeOrder(a.name)
          const orderB = getLensTypeOrder(b.name)
          return orderA - orderB
        })
      } else if (key === 'frames') {
        // Frames already sorted by database query
      } else {
        // For other groups, sort by display order then price
        grouped[key].sort((a, b) => {
          // Use display order if available
          if (a.displayOrder !== null && b.displayOrder !== null) {
            return (a.displayOrder ?? 999) - (b.displayOrder ?? 999)
          }
          // Put base/standard options first
          const aIsBase = a.name.toLowerCase().includes('cr-39') ||
                          a.name.toLowerCase().includes('standard') ||
                          a.name.toLowerCase().includes('full rim')
          const bIsBase = b.name.toLowerCase().includes('cr-39') ||
                          b.name.toLowerCase().includes('standard') ||
                          b.name.toLowerCase().includes('full rim')
          if (aIsBase && !bIsBase) return -1
          if (bIsBase && !aIsBase) return 1
          return a.price - b.price
        })
      }
    }

    // Count products needing pricing
    const productsNeedingPricing = hasPriceList
      ? Object.values(grouped).flat().filter(p => p.needsPricing).length
      : 0

    return NextResponse.json({
      success: true,
      products: grouped,
      categories: {
        frames: 'Frames',
        lensType: 'Lens Type',
        lensMaterial: 'Lens Material',
        arCoating: 'AR Coating',
        transitions: 'Transitions/Photochromic',
        mountFee: 'Mount Fee',
        addons: 'Add-ons'
      },
      customer: customerId ? {
        id: customerId,
        carrier: customerCarrier,
        hasPriceList,
        productsNeedingPricing
      } : null
    })
  } catch (error) {
    console.error('[Quote Builder Products API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
