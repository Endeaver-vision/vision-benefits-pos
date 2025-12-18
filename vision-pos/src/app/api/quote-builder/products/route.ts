/**
 * Quote Builder Products API
 * GET /api/quote-builder/products - Returns all products grouped by category for the quote builder
 *
 * Uses LensProduct table for lens-related items (with carrier tier mappings)
 * Uses Product table for frames and legacy items
 *
 * Query Parameters:
 * - customerId: Optional customer ID to fetch pre-computed prices from CustomerPriceList
 * - carrier: Optional carrier filter when customer has multiple insurance plans
 *
 * Price List Integration:
 * - If customerId provided, merges prices from customer_price_lists table
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
  tier?: string | null       // Insurance tier code (e.g., "KA", "tier_1")
  needsPricing?: boolean     // True if no price mapping exists
  hasCustomPrice?: boolean   // True if manually overridden
  sku: string | null
  manufacturer?: string | null
  brand?: string | null
  model?: string | null
  color?: string | null
  isFeatured?: boolean
  notes?: string
  pricingCategory?: string | null  // For determining SV vs MF tech addon
  posDisplayOrder?: number | null  // For preserving database sort order
}

interface PriceListEntry {
  finalPrice: number | null
  customPrice: number | null
  tier: string | null
  retailPrice: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const carrierFilter = searchParams.get('carrier')  // Optional: filter to specific carrier

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
        priceListWhere.insuranceCarrier = carrierFilter
      }

      const customerPrices = await prisma.customerPriceList.findMany({
        where: priceListWhere,
        orderBy: { createdAt: 'desc' }  // Most recent first
      })

      for (const price of customerPrices) {
        // Use first occurrence of each product (most recent per carrier)
        if (!priceList.has(price.productId)) {
          priceList.set(price.productId, {
            finalPrice: price.customPrice ?? price.finalPrice,  // Custom price takes precedence
            customPrice: price.customPrice,
            tier: price.tier,
            retailPrice: price.retailPrice
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
      polarized: [],
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
          needsPricing: priceEntry.finalPrice === null,
          hasCustomPrice: priceEntry.customPrice !== null
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

    // Fetch ONLY preferred lens products (curated list for the practice)
    const lensProducts = await prisma.lensProduct.findMany({
      where: {
        isActive: true,
        isPreferred: true  // Only show preferred products
      },
      include: {
        carrierTiers: true
      },
      orderBy: [
        { posDisplayOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    // Map LensProduct categories to quote builder groups
    const lensCategoryMap: Record<string, string> = {
      'LENS': 'lensType',
      'AR_COATING': 'arCoating',
      'TRANSITIONS': 'transitions',
      'MATERIAL': 'lensMaterial',
      'ADDON': 'addons',
      'SERVICE': 'addons'
    }

    // Specific products that should go to different categories
    const mountFeePatterns = ['mount', 'rimless', 'semi-rimless', 'full rim']
    const polarizedPatterns = ['polarized']

    // Products that are cash pay only (no vision plans)
    const cashPayOnlyPatterns = [
      'neurolens',
      'varilux i',
      'eyezen'
    ]

    for (const product of lensProducts) {
      const nameLower = product.name.toLowerCase()

      // Determine the correct group for this product
      let groupKey = lensCategoryMap[product.category] || 'addons'

      // Override for mount fees
      if (mountFeePatterns.some(p => nameLower.includes(p))) {
        groupKey = 'mountFee'
      }
      // Override for polarized
      else if (polarizedPatterns.some(p => nameLower.includes(p))) {
        groupKey = 'polarized'
      }

      // Check if cash pay only
      const isCashPayOnly = cashPayOnlyPatterns.some(pattern =>
        nameLower.includes(pattern)
      )

      const baseProduct: QuoteBuilderProduct = {
        id: product.id,
        name: product.name,
        price: product.retailPrice,
        sku: product.sku,
        manufacturer: product.manufacturer,
        pricingCategory: product.pricingCategory,  // Include for SV vs MF tech addon
        posDisplayOrder: product.posDisplayOrder,  // Preserve database sort order
        notes: isCashPayOnly
          ? 'Cash pay only - no vision plans'
          : undefined
      }

      // Enrich with customer price list data if available
      const enrichedProduct = isCashPayOnly
        ? baseProduct  // Cash pay products don't use insurance
        : enrichWithPriceList(baseProduct, product.id)

      grouped[groupKey]?.push(enrichedProduct)
    }

    // Fetch frames from Frame table - prioritize featured and showInPos
    const frames = await prisma.frame.findMany({
      where: {
        isActive: true,
        showInPos: true
      },
      take: 100, // Get more frames for better selection
      orderBy: [
        { isFeatured: 'desc' }, // Featured frames first
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

      // Enrich with customer price list data if available
      grouped.frames.push(enrichWithPriceList(baseProduct, frame.id))
    }

    // If no frames found in Frame table, fall back to Product table
    if (grouped.frames.length === 0) {
      const legacyFrames = await prisma.product.findMany({
        where: {
          active: true,
          category: {
            code: 'FRAMES'
          }
        },
        include: {
          category: true
        }
      })

      for (const frame of legacyFrames) {
        const baseProduct: QuoteBuilderProduct = {
          id: frame.id,
          name: frame.name,
          price: frame.basePrice,
          sku: frame.sku,
          manufacturer: frame.manufacturer
        }

        // Enrich with customer price list data if available
        grouped.frames.push(enrichWithPriceList(baseProduct, frame.id))
      }
    }

    // Skip legacy Product table for mount fees, addons, polarized
    // since we now have all preferred products in LensProduct with isPreferred=true
    // Only fall back to legacy if the LensProduct categories are empty
    const needsLegacyMountFees = grouped.mountFee.length === 0
    const needsLegacyAddons = grouped.addons.length === 0
    const needsLegacyPolarized = grouped.polarized.length === 0

    if (needsLegacyMountFees || needsLegacyAddons || needsLegacyPolarized) {
      const legacyCodes: string[] = []
      if (needsLegacyMountFees) legacyCodes.push('MOUNT_FEES')
      if (needsLegacyAddons) legacyCodes.push('LENS_ADDONS')
      if (needsLegacyPolarized) legacyCodes.push('POLARIZED')

      const legacyProducts = await prisma.product.findMany({
        where: {
          active: true,
          category: {
            code: {
              in: legacyCodes
            }
          }
        },
        include: {
          category: true
        }
      })

      const legacyCategoryMap: Record<string, string> = {
        'MOUNT_FEES': 'mountFee',
        'LENS_ADDONS': 'addons',
        'POLARIZED': 'polarized'
      }

      for (const product of legacyProducts) {
        const groupKey = legacyCategoryMap[product.category.code] || 'addons'

        const baseProduct: QuoteBuilderProduct = {
          id: product.id,
          name: product.name,
          price: product.basePrice,
          sku: product.sku,
          manufacturer: product.manufacturer
        }

        // Enrich with customer price list data if available
        grouped[groupKey]?.push(enrichWithPriceList(baseProduct, product.id))
      }
    }

    // Sort each group appropriately
    for (const key of Object.keys(grouped)) {
      if (key === 'lensType' || key === 'arCoating') {
        // For lens types and AR coatings, use posDisplayOrder from database
        grouped[key].sort((a, b) => {
          const orderA = a.posDisplayOrder ?? 999
          const orderB = b.posDisplayOrder ?? 999
          return orderA - orderB
        })
      } else {
        // For other groups, sort by price with base materials first
        grouped[key].sort((a, b) => {
          // Put base/standard options first
          const aIsBase = a.name.toLowerCase().includes('cr-39') ||
                          a.name.toLowerCase().includes('standard') ||
                          a.name.toLowerCase() === 'single vision'
          const bIsBase = b.name.toLowerCase().includes('cr-39') ||
                          b.name.toLowerCase().includes('standard') ||
                          b.name.toLowerCase() === 'single vision'
          if (aIsBase && !bIsBase) return -1
          if (bIsBase && !aIsBase) return 1
          // Then sort by price
          return a.price - b.price
        })
      }
    }

    // Count products needing pricing (only relevant if customer has price list)
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
        polarized: 'Polarized',
        mountFee: 'Mount Fee',
        addons: 'Add-ons'
      },
      // Customer pricing info (only present if customerId provided)
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
