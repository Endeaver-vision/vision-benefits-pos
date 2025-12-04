/**
 * Quote API - Calculate pricing using stored authorization data
 *
 * This endpoint uses the authorization data stored in the database
 * (VspAuthorization, EyemedAuthorization, SpecteraAuthorization)
 * rather than extracting from insurance documents each time.
 *
 * Flow:
 * 1. Get customer's active authorization from DB
 * 2. Look up product tier mappings
 * 3. Calculate patient pricing using authorization copays
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getActiveAuthorizationForCustomer,
  getAuthorizationByCarrier,
  CarrierType,
} from '@/lib/services/authorization-service'
import {
  createPricingCalculator,
  calculateQuote,
} from '@/lib/services/pricing-calculator'
import { ProductCatalogEntry, QuoteItem } from '@/types/product-catalog'

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
    carrier: CarrierType
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

    // Get authorization
    const authResult = body.carrier
      ? await getAuthorizationByCarrier(body.customerId, body.carrier)
      : await getActiveAuthorizationForCustomer(body.customerId)

    if (!authResult) {
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

    const { authorization, authorizationId, carrier } = authResult

    // Get products from database with tier mappings
    const skus = body.products.map(p => p.sku)
    const products = await getProductsWithTierMappings(skus, carrier)

    // Build quote items with optional price overrides
    const quoteItems: QuoteItem[] = body.products.map(p => ({
      sku: p.sku,
      retailPrice: p.retailPrice ?? products.get(p.sku)?.retailPrice ?? 0,
    }))

    // Calculate pricing
    const calculator = createPricingCalculator(authorization)
    const quote = calculator.buildQuote(quoteItems, products, authorization)
    quote.authorizationId = authorizationId

    // Build response
    const response: QuoteResponse = {
      success: true,
      data: {
        customerId: body.customerId,
        authorizationId,
        carrier,
        planName: authorization.plan.planName,
        items: quote.items.map(item => ({
          sku: item.sku,
          productName: item.displayName,
          category: item.category,
          retailPrice: item.retailPrice,
          patientCopay: item.patientCopay,
          insurancePays: item.insurancePays,
          savings: item.savings,
          tierUsed: item.tierUsed,
          notes: item.notes,
        })),
        summary: {
          retailTotal: quote.retailTotal,
          patientTotal: quote.patientTotal + (quote.materialsCopay ?? 0),
          insuranceTotal: quote.insuranceTotal,
          totalSavings: quote.totalSavings,
          examCopay: quote.examCopay ?? 0,
          materialsCopay: quote.materialsCopay ?? 0,
        },
        warnings: quote.warnings,
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

/**
 * Get products from database with their carrier-specific tier mappings
 */
async function getProductsWithTierMappings(
  skus: string[],
  carrier: CarrierType
): Promise<Map<string, ProductCatalogEntry>> {
  const productMap = new Map<string, ProductCatalogEntry>()

  // Get base products
  const products = await prisma.product.findMany({
    where: {
      sku: { in: skus },
      active: true,
    },
  })

  // Get tier mappings based on carrier
  const tierMappings = await getTierMappings(
    products.map(p => p.name),
    carrier
  )

  // Build product catalog entries with tier info
  for (const product of products) {
    const mapping = tierMappings.get(product.name)

    const entry: ProductCatalogEntry = {
      sku: product.sku ?? product.id,
      displayName: product.name,
      category: mapCategory(product.categoryId),
      retailPrice: product.basePrice ?? 0,
      isActive: product.active,
    }

    // Add carrier-specific tier mapping
    if (mapping) {
      switch (carrier) {
        case 'vsp':
          entry.vsp = {
            baseCode: mapping.code,
            arCode: mapping.arCode,
            materialModifier: mapping.materialModifier as 'D' | 'H' | 'T' | undefined,
            isFeaturedBrand: mapping.isFeatured,
          }
          break
        case 'eyemed':
          entry.eyemed = {
            progressiveTier: mapping.tier as 'standard' | 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5',
            arTier: mapping.arTier as 'standard' | 'tier_1' | 'tier_2' | 'tier_3',
            materialType: mapping.materialType as 'polycarbonate' | 'trivex' | 'high_index_167' | 'high_index_174',
          }
          break
        case 'spectera':
          entry.spectera = {
            progressiveTier: mapping.tier as 'I' | 'II' | 'III' | 'IV' | 'V',
            arTier: mapping.arTier as 'I' | 'II' | 'III' | 'IV',
            materialType: mapping.materialType as 'polycarbonate' | 'trivex' | 'high_index',
          }
          break
      }
    }

    productMap.set(product.sku, entry)
  }

  return productMap
}

/**
 * Get tier mappings for products from the carrier-specific mapping tables
 */
async function getTierMappings(
  productNames: string[],
  carrier: CarrierType
): Promise<Map<string, {
  code?: string
  arCode?: string
  materialModifier?: string
  tier?: string
  arTier?: string
  materialType?: string
  isFeatured?: boolean
}>> {
  const mappings = new Map()

  switch (carrier) {
    case 'vsp': {
      const vspMappings = await prisma.productVspCodeMapping.findMany({
        where: { productName: { in: productNames } },
      })
      for (const m of vspMappings) {
        mappings.set(m.productName, {
          code: m.vspCode,
          materialModifier: m.materialModifier,
        })
      }
      break
    }
    case 'eyemed': {
      const eyemedMappings = await prisma.productEyemedTierMapping.findMany({
        where: { productName: { in: productNames } },
      })
      for (const m of eyemedMappings) {
        mappings.set(m.productName, {
          tier: m.eyemedTier,
        })
      }
      break
    }
    case 'spectera': {
      const specteraMappings = await prisma.productSpecteraTierMapping.findMany({
        where: { productName: { in: productNames } },
      })
      for (const m of specteraMappings) {
        mappings.set(m.productName, {
          tier: m.specteraTier,
        })
      }
      break
    }
  }

  return mappings
}

/**
 * Map database category ID to ProductCategory type
 */
function mapCategory(categoryId: string | null): ProductCatalogEntry['category'] {
  if (!categoryId) return 'other'

  const lower = categoryId.toLowerCase()

  if (lower.includes('progressive')) return 'lens_progressive'
  if (lower.includes('single') || lower.includes('sv')) return 'lens_sv'
  if (lower.includes('ar') || lower.includes('anti-reflect')) return 'ar_coating'
  if (lower.includes('frame')) return 'frame'
  if (lower.includes('photo') || lower.includes('transition')) return 'photochromic'
  if (lower.includes('polar')) return 'polarized'
  if (lower.includes('blue') || lower.includes('light')) return 'blue_light'
  if (lower.includes('tint')) return 'tint'
  if (lower.includes('material') || lower.includes('poly') || lower.includes('index')) return 'material'

  return 'other'
}
