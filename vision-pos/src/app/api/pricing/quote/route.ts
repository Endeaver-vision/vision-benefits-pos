/**
 * Quote API - Calculate pricing using stored authorization data
 *
 * POST /api/pricing/quote
 *
 * This endpoint uses the unified insurance_authorizations table
 * to calculate patient pricing based on tier mappings.
 *
 * Flow:
 * 1. Get customer's active authorization from unified table
 * 2. Look up product tier mappings from carrier_tiers
 * 3. Calculate patient pricing using authorization copays
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
// import { EYEMED_TIER_TO_COPAY, VSP_TIER_TO_COPAY, SPECTERA_TIER_TO_COPAY } from '@/lib/data/insurance-tier-mappings'
// TODO: These tier mappings are not implemented - quote endpoint needs refactoring

// Type for the copays JSON structure in unified authorization table
interface CopaysJson {
  examCopay?: number
  materialsCopay?: number
  singleVision?: number
  bifocal?: number
  trifocal?: number
  progressiveStandard?: number
  progressiveTier1?: number
  progressiveTier2?: number
  progressiveTier3?: number
  progressiveTier4?: number
  progressiveTier5?: number
  arStandard?: number
  arTier1?: number
  arTier2?: number
  arTier3?: number
  polycarbonate?: number
  polycarbonateChild?: number
  trivex?: number
  highIndex167?: number
  highIndex174?: number
  photochromic?: number
  polarized?: number
  blueLight?: number
  tint?: number
  uvTreatment?: number
  scratchCoating?: number
  [key: string]: number | undefined
}

type CarrierType = 'vsp' | 'eyemed' | 'spectera'

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

export interface QuoteRequest {
  customerId: string
  carrier?: CarrierType // Optional - if not provided, use active auth
  products: Array<{
    sku: string
    retailPrice?: number // Override retail price
  }>
}

export interface QuoteResponse {
  success: boolean
  data?: {
    customerId: string
    authorizationId: string
    carrier: string
    planName: string
    items: Array<{
      sku: string
      productName: string
      category: string
      retailPrice: number
      patientCopay: number
      insurancePays: number
      savings: number
      tierUsed?: string
      notes?: string
    }>
    summary: {
      retailTotal: number
      patientTotal: number
      insuranceTotal: number
      totalSavings: number
      examCopay: number
      materialsCopay: number
    }
    warnings?: string[]
  }
  error?: string
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequest = await request.json()

    // Validate request
    if (!body.customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    if (!body.products || body.products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one product is required' },
        { status: 400 }
      )
    }

    // Get authorization from unified table
    const carrierFilter = body.carrier ? { carrier: { equals: body.carrier, mode: 'insensitive' as const } } : {}

    const auth = await prisma.insuranceAuthorization.findFirst({
      where: {
        customerId: body.customerId,
        isActive: true,
        ...carrierFilter,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: body.carrier
            ? `No active ${body.carrier.toUpperCase()} authorization found for customer`
            : 'No active authorization found for customer',
        },
        { status: 404 }
      )
    }

    const carrier = auth.carrier.toUpperCase() as 'VSP' | 'EYEMED' | 'SPECTERA'
    const copays = (auth.copays as CopaysJson) || {}

    // Get products from database with tier mappings
    const skus = body.products.map(p => p.sku)
    const products = await getProductsWithTierMappings(skus, carrier)

    // Get tier-to-copay mapping for this carrier
    const tierToCopay = getTierToCopayMap(carrier)

    // Calculate pricing for each product
    const items: QuoteResponse['data']['items'] = []
    const warnings: string[] = []

    for (const requestProduct of body.products) {
      const product = products.get(requestProduct.sku)
      const retailPrice = requestProduct.retailPrice ?? product?.retailPrice ?? 0

      if (!product) {
        items.push({
          sku: requestProduct.sku,
          productName: 'Unknown Product',
          category: 'other',
          retailPrice,
          patientCopay: retailPrice,
          insurancePays: 0,
          savings: 0,
          notes: 'Product not found in catalog',
        })
        continue
      }

      const tierCode = product.tierCode
      let patientCopay = retailPrice
      let tierUsed: string | undefined
      let notes: string | undefined

      if (tierCode) {
        const copayField = tierToCopay[tierCode]

        if (copayField) {
          if (copayField === 'ZERO_COPAY') {
            patientCopay = 0
            tierUsed = tierCode
            notes = 'Covered by insurance'
          } else if (copayField === 'DISCOUNT_20_PERCENT') {
            patientCopay = Math.round(retailPrice * 0.80 * 100) / 100
            tierUsed = tierCode
            notes = '20% insurance discount'
          } else {
            const copayValue = copays[copayField]
            if (copayValue !== null && copayValue !== undefined) {
              patientCopay = copayValue
              tierUsed = tierCode
              notes = `Tier ${tierCode} copay`
            } else {
              notes = `Copay not found for tier ${tierCode}`
            }
          }
        } else {
          notes = `No copay mapping for tier ${tierCode}`
        }
      } else {
        notes = 'No tier mapping - retail price'
      }

      const insurancePays = Math.max(0, retailPrice - patientCopay)

      items.push({
        sku: product.sku,
        productName: product.name,
        category: product.category,
        retailPrice,
        patientCopay,
        insurancePays,
        savings: insurancePays,
        tierUsed,
        notes,
      })
    }

    // Calculate totals
    const retailTotal = items.reduce((sum, item) => sum + item.retailPrice, 0)
    const patientSubtotal = items.reduce((sum, item) => sum + item.patientCopay, 0)
    const insuranceTotal = items.reduce((sum, item) => sum + item.insurancePays, 0)
    const totalSavings = items.reduce((sum, item) => sum + item.savings, 0)

    // Get exam and materials copays from authorization for display
    const examCopay = auth.examCopay ? Number(auth.examCopay) : (copays.examCopay ?? 0)
    const materialsCopay = auth.materialsCopay ? Number(auth.materialsCopay) : (copays.materialsCopay ?? 0)

    // Patient total includes materials copay
    const patientTotal = patientSubtotal + materialsCopay

    // Build response
    const response: QuoteResponse = {
      success: true,
      data: {
        customerId: body.customerId,
        authorizationId: auth.id,
        carrier: carrier.toLowerCase(),
        planName: auth.planName || 'Unknown Plan',
        items,
        summary: {
          retailTotal,
          patientTotal,
          insuranceTotal,
          totalSavings,
          examCopay,
          materialsCopay,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Quote calculation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate quote',
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

interface ProductInfo {
  sku: string
  name: string
  retailPrice: number
  category: string
  tierCode: string | null
}

/**
 * Get products from database with their carrier-specific tier mappings
 */
async function getProductsWithTierMappings(
  skus: string[],
  carrier: string
): Promise<Map<string, ProductInfo>> {
  const productMap = new Map<string, ProductInfo>()

  // Get base products
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { in: skus } },
        { id: { in: skus } }
      ],
      active: true,
    },
    include: {
      category: true,
    },
  })

  // Get tier mappings from carrier_tiers table
  const productIds = products.map(p => p.id)
  const tierMappings = await prisma.carrierTier.findMany({
    where: {
      productId: { in: productIds },
      carrier: carrier.toUpperCase(),
    },
  })
  const tierMap = new Map(tierMappings.map(t => [t.productId, t.tierCode]))

  // Build product catalog entries with tier info
  for (const product of products) {
    const key = product.sku || product.id

    productMap.set(key, {
      sku: key,
      name: product.name,
      retailPrice: product.basePrice ?? 0,
      category: mapCategory(product.category?.code),
      tierCode: tierMap.get(product.id) || null,
    })
  }

  // Also check LensProduct table for backwards compatibility
  const lensProducts = await prisma.lensProduct.findMany({
    where: {
      OR: [
        { sku: { in: skus } },
        { id: { in: skus } }
      ],
      isActive: true,
    },
  })

  const lensProductIds = lensProducts.map(p => p.id)
  const lensTierMappings = await prisma.carrierTier.findMany({
    where: {
      productId: { in: lensProductIds },
      carrier: carrier.toUpperCase(),
    },
  })
  const lensTierMap = new Map(lensTierMappings.map(t => [t.productId, t.tierCode]))

  for (const product of lensProducts) {
    const key = product.sku || product.id
    if (!productMap.has(key)) {
      productMap.set(key, {
        sku: key,
        name: product.name,
        retailPrice: product.retailPrice,
        category: mapCategory(product.pricingCategory),
        tierCode: lensTierMap.get(product.id) || null,
      })
    }
  }

  return productMap
}

function getTierToCopayMap(carrier: string): Record<string, string> {
  // TODO: Tier mapping data not implemented - this endpoint needs refactoring
  // For now, return empty maps to allow the app to build
  switch (carrier) {
    case 'EYEMED':
      return {}
    case 'VSP':
      return {}
    case 'SPECTERA':
      return {}
    default:
      return {}
  }
}

/**
 * Map database category to simplified category type
 */
function mapCategory(categoryCode: string | null | undefined): string {
  if (!categoryCode) return 'other'

  const lower = categoryCode.toLowerCase()

  if (lower.includes('progressive')) return 'lens_progressive'
  if (lower.includes('single') || lower.includes('sv')) return 'lens_sv'
  if (lower.includes('ar') || lower.includes('anti-reflect') || lower.includes('coating')) return 'ar_coating'
  if (lower.includes('frame')) return 'frame'
  if (lower.includes('photo') || lower.includes('transition')) return 'photochromic'
  if (lower.includes('polar')) return 'polarized'
  if (lower.includes('blue') || lower.includes('light')) return 'blue_light'
  if (lower.includes('tint')) return 'tint'
  if (lower.includes('material') || lower.includes('poly') || lower.includes('index')) return 'material'

  return 'other'
}
