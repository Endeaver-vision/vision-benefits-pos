/**
 * Insurance Summary API
 * GET /api/customers/[id]/insurance-summary
 *
 * Returns copay and allowance information for display in the quote builder.
 * This is discrete summary info, not pricing data.
 *
 * Shows actual product names instead of tier codes for user-friendly display.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'
import {
  isVspAuth,
  isEyemedAuth,
  isSpecteraAuth,
  VspBenefitAuthorization,
  EyemedBenefitAuthorization,
  SpecteraBenefitAuthorization,
} from '@/types/benefit-authorization'

interface InsuranceSummary {
  carrier: string
  planName: string
  copays: {
    exam: number | null
    materials: number | null
    frameAllowance: number | null
    contactAllowance: number | null
    contactFitting: number | null
  }
  tierCopays: TierCopay[]
  expirationDate: string | null
}

interface TierCopay {
  code: string
  description: string
  copay: number | null
  products?: string[]  // Product names that use this tier
}

// Cache for tier-to-product mappings
let tierProductCache: Map<string, Map<string, string[]>> | null = null

/**
 * Fetch products grouped by their tier codes for a given carrier
 * Uses the unified carrier_tiers table instead of product tier columns
 */
async function getTierProductMappings(carrier: 'VSP' | 'EyeMed' | 'Spectera'): Promise<Map<string, string[]>> {
  // Use cached data if available
  if (tierProductCache?.has(carrier)) {
    return tierProductCache.get(carrier)!
  }

  // Map carrier name to the uppercase format used in carrier_tiers
  const carrierMap: Record<string, string> = {
    'VSP': 'VSP',
    'EyeMed': 'EYEMED',
    'Spectera': 'SPECTERA'
  }
  const carrierCode = carrierMap[carrier] || carrier.toUpperCase()

  // Fetch tier mappings from unified carrier_tiers table
  const tierMappings = await prisma.carrierTier.findMany({
    where: {
      carrier: carrierCode
    },
    select: {
      productName: true,
      tierCode: true
    }
  })

  // Group products by tier code
  const tierMap = new Map<string, string[]>()
  for (const mapping of tierMappings) {
    const existing = tierMap.get(mapping.tierCode) || []
    existing.push(mapping.productName)
    tierMap.set(mapping.tierCode, existing)
  }

  // Cache the result
  if (!tierProductCache) {
    tierProductCache = new Map()
  }
  tierProductCache.set(carrier, tierMap)

  return tierMap
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params

    const authResult = await getActiveAuthorizationForCustomer(customerId)

    if (!authResult) {
      return NextResponse.json({
        success: true,
        hasInsurance: false,
        summary: null,
      })
    }

    const { authorization, carrier, expirationDate } = authResult
    let summary: InsuranceSummary

    // Fetch product-to-tier mappings for this carrier
    const carrierName = carrier.toUpperCase() === 'VSP' ? 'VSP'
      : carrier.toUpperCase() === 'EYEMED' ? 'EyeMed'
      : 'Spectera'
    const tierProducts = await getTierProductMappings(carrierName)

    if (isVspAuth(authorization)) {
      summary = buildVspSummary(authorization, expirationDate, tierProducts)
    } else if (isEyemedAuth(authorization)) {
      summary = buildEyemedSummary(authorization, expirationDate, tierProducts)
    } else if (isSpecteraAuth(authorization)) {
      summary = buildSpecteraSummary(authorization, expirationDate, tierProducts)
    } else {
      return NextResponse.json({
        success: true,
        hasInsurance: false,
        summary: null,
      })
    }

    return NextResponse.json({
      success: true,
      hasInsurance: true,
      carrier,
      summary,
    })
  } catch (error) {
    console.error('[Insurance Summary API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch insurance summary' },
      { status: 500 }
    )
  }
}

function buildVspSummary(
  auth: VspBenefitAuthorization,
  expirationDate: Date | null,
  tierProducts: Map<string, string[]>
): InsuranceSummary {
  const tierCopays: TierCopay[] = []

  // Helper to get product names for a tier, or fallback to generic description
  const getProductDisplay = (code: string, fallback: string): string => {
    const products = tierProducts.get(code)
    if (products && products.length > 0) {
      // Return first 2 product names (most common ones)
      return products.slice(0, 2).join(', ')
    }
    return fallback
  }

  // Progressive tier codes - show product names
  const progressiveCodes = [
    { code: 'NA', desc: 'Standard Progressive' },
    { code: 'OA', desc: 'Tier O Progressive' },
    { code: 'FA', desc: 'Premium Progressive' },
    { code: 'JA', desc: 'Tier J Progressive' },
    { code: 'KA', desc: 'Ultra Progressive' },
  ]

  for (const prog of progressiveCodes) {
    const copay = auth.planTier?.progressiveCopays?.[prog.code]
    if (copay !== undefined) {
      tierCopays.push({
        code: prog.code,
        description: getProductDisplay(prog.code, prog.desc),
        copay,
        products: tierProducts.get(prog.code)
      })
    }
  }

  // AR coating codes - show product names
  const arCodes = [
    { code: 'QM', desc: 'Standard AR' },
    { code: 'QT', desc: 'Premium AR' },
    { code: 'QV', desc: 'Ultra AR' },
  ]

  for (const ar of arCodes) {
    const copay = auth.planTier?.arCopays?.[ar.code]
    if (copay !== undefined) {
      tierCopays.push({
        code: ar.code,
        description: getProductDisplay(ar.code, ar.desc),
        copay,
        products: tierProducts.get(ar.code)
      })
    }
  }

  // Material copays - these are generic, keep as-is
  if (auth.planTier?.materialCopays) {
    const materials = [
      { code: 'AD', desc: 'Polycarbonate', key: 'polycarbonate' },
      { code: 'AB', desc: 'Trivex', key: 'trivex' },
      { code: 'AH', desc: 'High Index 1.67', key: 'highIndex167' },
      { code: 'AJ', desc: 'High Index 1.74', key: 'highIndex174' },
    ]
    for (const mat of materials) {
      const copay = auth.planTier.materialCopays[mat.key as keyof typeof auth.planTier.materialCopays]
      if (copay !== undefined && copay !== 'covered') {
        tierCopays.push({ code: mat.code, description: mat.desc, copay: copay as number })
      }
    }
  }

  // Enhancement copays - show product names where applicable
  if (auth.planTier?.enhancementCopays) {
    const enhancements = [
      { code: 'PR', desc: 'Photochromic', key: 'photochromic' },
      { code: 'DA', desc: 'Polarized', key: 'polarized' },
      { code: 'LF', desc: 'Blue Light Filter', key: 'blueLightFilter' },
    ]
    for (const enh of enhancements) {
      const copay = auth.planTier.enhancementCopays[enh.key as keyof typeof auth.planTier.enhancementCopays]
      if (copay !== undefined) {
        tierCopays.push({
          code: enh.code,
          description: getProductDisplay(enh.code, enh.desc),
          copay: copay as number,
          products: tierProducts.get(enh.code)
        })
      }
    }
  }

  return {
    carrier: 'VSP',
    planName: auth.plan.planName,
    copays: {
      exam: auth.copays.examWellvision ?? null,
      materials: auth.copays.materials ?? null,
      frameAllowance: auth.copays.frameAllowanceNonFeatured ?? null,
      contactAllowance: auth.copays.contactLensAllowance ?? null,
      contactFitting: auth.copays.contactLensExamCopay ?? null,
    },
    tierCopays,
    expirationDate: expirationDate?.toISOString().split('T')[0] ?? null,
  }
}

function buildEyemedSummary(
  auth: EyemedBenefitAuthorization,
  expirationDate: Date | null,
  tierProducts: Map<string, string[]>
): InsuranceSummary {
  const tierCopays: TierCopay[] = []

  // Helper to get product names for a tier
  const getProductDisplay = (code: string, fallback: string): string => {
    const products = tierProducts.get(code)
    if (products && products.length > 0) {
      return products.slice(0, 2).join(', ')
    }
    return fallback
  }

  // Progressive tiers
  if (auth.copays.progressiveCopays) {
    const tiers = [
      { code: 'tier_1', desc: 'Standard Progressive' },
      { code: 'tier_2', desc: 'Tier 2 Progressive' },
      { code: 'tier_3', desc: 'Tier 3 Progressive' },
      { code: 'tier_4', desc: 'Tier 4 Progressive' },
      { code: 'tier_5', desc: 'Premium Progressive' },
    ]
    for (const tier of tiers) {
      const copay = auth.copays.progressiveCopays[tier.code]
      if (copay !== undefined) {
        tierCopays.push({
          code: tier.code,
          description: getProductDisplay(tier.code, tier.desc),
          copay,
          products: tierProducts.get(tier.code)
        })
      }
    }
  }

  // AR tiers
  if (auth.copays.arCoatingCopays) {
    const arTiers = [
      { code: 'ar_tier_1', desc: 'Standard AR' },
      { code: 'ar_tier_2', desc: 'Premium AR' },
      { code: 'ar_tier_3', desc: 'Ultra AR' },
    ]
    for (const tier of arTiers) {
      const copay = auth.copays.arCoatingCopays[tier.code]
      if (copay !== undefined) {
        tierCopays.push({
          code: tier.code,
          description: getProductDisplay(tier.code, tier.desc),
          copay,
          products: tierProducts.get(tier.code)
        })
      }
    }
  }

  // Material copays
  if (auth.copays.materialCopays) {
    const materials = [
      { code: 'poly', desc: 'Polycarbonate', key: 'polycarbonateAdult' },
      { code: 'trivex', desc: 'Trivex', key: 'trivex' },
      { code: 'hi167', desc: 'High Index 1.67', key: 'highIndex167' },
      { code: 'hi174', desc: 'High Index 1.74', key: 'highIndex174' },
    ]
    for (const mat of materials) {
      const copay = auth.copays.materialCopays[mat.key as keyof typeof auth.copays.materialCopays]
      if (copay !== undefined) {
        tierCopays.push({ code: mat.code, description: mat.desc, copay: copay as number })
      }
    }
  }

  return {
    carrier: 'EyeMed',
    planName: auth.plan.planName,
    copays: {
      exam: auth.copays.exam ?? null,
      materials: auth.copays.materials ?? null,
      frameAllowance: auth.copays.frameAllowance ?? null,
      contactAllowance: auth.copays.contactAllowance ?? null,
      contactFitting: auth.copays.clFitStandardCopay ?? null,
    },
    tierCopays,
    expirationDate: expirationDate?.toISOString().split('T')[0] ?? null,
  }
}

function buildSpecteraSummary(
  auth: SpecteraBenefitAuthorization,
  expirationDate: Date | null,
  tierProducts: Map<string, string[]>
): InsuranceSummary {
  const tierCopays: TierCopay[] = []

  // Helper to get product names for a tier
  const getProductDisplay = (code: string, fallback: string): string => {
    const products = tierProducts.get(code)
    if (products && products.length > 0) {
      return products.slice(0, 2).join(', ')
    }
    return fallback
  }

  // Progressive tiers
  if (auth.copays.progressiveCopays) {
    const tiers = [
      { code: 'I', desc: 'Standard Progressive' },
      { code: 'II', desc: 'Tier II Progressive' },
      { code: 'III', desc: 'Tier III Progressive' },
      { code: 'IV', desc: 'Tier IV Progressive' },
      { code: 'V', desc: 'Premium Progressive' },
    ]
    for (const tier of tiers) {
      const copay = auth.copays.progressiveCopays[tier.code]
      if (copay !== undefined) {
        tierCopays.push({
          code: tier.code,
          description: getProductDisplay(tier.code, tier.desc),
          copay,
          products: tierProducts.get(tier.code)
        })
      }
    }
  }

  // AR tiers
  if (auth.copays.arCoatingCopays) {
    const arTiers = [
      { code: 'ar_I', desc: 'Standard AR' },
      { code: 'ar_II', desc: 'Premium AR' },
      { code: 'ar_III', desc: 'Ultra AR' },
    ]
    for (const tier of arTiers) {
      const copay = auth.copays.arCoatingCopays[tier.code]
      if (copay !== undefined) {
        tierCopays.push({
          code: tier.code,
          description: getProductDisplay(tier.code, tier.desc),
          copay,
          products: tierProducts.get(tier.code)
        })
      }
    }
  }

  // Material copays
  if (auth.copays.materialCopays) {
    const materials = [
      { code: 'poly', desc: 'Polycarbonate', key: 'polycarbonateAdult' },
      { code: 'trivex', desc: 'Trivex', key: 'trivex' },
      { code: 'hi174', desc: 'High Index 1.74', key: 'highIndex174' },
    ]
    for (const mat of materials) {
      const copay = auth.copays.materialCopays[mat.key as keyof typeof auth.copays.materialCopays]
      if (copay !== undefined) {
        tierCopays.push({ code: mat.code, description: mat.desc, copay: copay as number })
      }
    }
  }

  return {
    carrier: 'Spectera',
    planName: auth.plan.planName,
    copays: {
      exam: auth.copays.examAdult ?? null,
      materials: auth.copays.materials ?? null,
      frameAllowance: auth.copays.frameAllowance ?? null,
      contactAllowance: auth.copays.nonSelectionClAllowance ?? null,
      contactFitting: auth.copays.selectionClFitCopay ?? null,
    },
    tierCopays,
    expirationDate: expirationDate?.toISOString().split('T')[0] ?? null,
  }
}
