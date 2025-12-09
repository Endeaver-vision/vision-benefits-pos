/**
 * Quote Builder Products API
 * GET /api/quote-builder/products - Returns all products grouped by category for the quote builder
 *
 * Uses LensProduct table for lens-related items (with carrier tier mappings)
 * Uses Product table for frames and legacy items
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface QuoteBuilderProduct {
  id: string
  name: string
  price: number
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

export async function GET() {
  try {
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

      grouped[groupKey]?.push({
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
      })
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
      grouped.frames.push({
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
      })
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
        grouped.frames.push({
          id: frame.id,
          name: frame.name,
          price: frame.basePrice,
          sku: frame.sku,
          manufacturer: frame.manufacturer
        })
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

        grouped[groupKey]?.push({
          id: product.id,
          name: product.name,
          price: product.basePrice,
          sku: product.sku,
          manufacturer: product.manufacturer
        })
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
      }
    })
  } catch (error) {
    console.error('[Quote Builder Products API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
