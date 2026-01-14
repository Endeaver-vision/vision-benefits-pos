/**
 * Pre-Computation Engine for Customer Price Lists
 *
 * This service pre-computes ALL product prices for a customer when their insurance
 * authorization is scanned/uploaded. Instead of calculating prices on-demand during
 * checkout, the POS simply reads from the pre-computed customer_price_lists table.
 *
 * Flow:
 * 1. Insurance auth is created (VSP/EyeMed/Spectera)
 * 2. precomputeCustomerPrices() is called
 * 3. Fetches ALL products from catalog
 * 4. For each product, calculates patient price using pricing-calculator.ts
 * 5. Stores result in customer_price_lists table
 * 6. POS reads from customer_price_lists during checkout
 *
 * Benefits:
 * - Fast POS performance (no calculation overhead)
 * - Consistent pricing across sessions
 * - Easy to audit and debug prices
 * - Can handle complex pricing rules once at upload time
 */

import { prisma } from '@/lib/prisma'
import { createPricingCalculator, type IPricingCalculator } from './pricing-calculator'
import type { BenefitAuthorization } from '@/types/benefit-authorization'

export interface PrecomputeOptions {
  customerId: string
  authorizationId: string
  carrier: 'VSP' | 'EyeMed' | 'Spectera'
  planName: string
  // Optional: only precompute specific product categories
  categories?: string[]
}

export interface PrecomputeResult {
  success: boolean
  productsProcessed: number
  productsCreated: number
  productsUpdated: number
  productsFailed: number
  errors: Array<{ sku: string; error: string }>
  duration: number
}

/**
 * Main entry point: Pre-compute prices for all products for a customer's authorization
 */
export async function precomputeCustomerPrices(
  auth: BenefitAuthorization,
  options: PrecomputeOptions
): Promise<PrecomputeResult> {
  const startTime = Date.now()
  const errors: Array<{ sku: string; error: string }> = []
  let productsCreated = 0
  let productsUpdated = 0
  let productsFailed = 0

  console.log(`[Precompute] Starting price generation for customer ${options.customerId}`)
  console.log(`[Precompute] Carrier: ${options.carrier}, Plan: ${options.planName}`)

  try {
    // Step 1: Fetch ALL products from catalog
    const products = await fetchProductCatalog(options.categories)
    console.log(`[Precompute] Found ${products.length} products to process`)

    // Step 2: Get the appropriate pricing calculator for this carrier
    const calculator = createPricingCalculator(auth)

    // Step 3: Process each product
    for (const product of products) {
      try {
        // Calculate price using the existing pricing calculator
        const pricingResult = calculator.calculateProduct(
          product as any, // Type conversion - product catalog entry
          auth
        )

        // Determine if this is a tier-mapped product or 80% fallback
        const needsTierAssignment =
          pricingResult.warnings?.some(w =>
            w.includes('using retail') ||
            w.includes('80%') ||
            w.includes('No tier mapping')
          ) ?? false

        // Upsert to customer_price_lists
        const result = await prisma.customerPriceList.upsert({
          where: {
            customerId_productId_insuranceCarrier: {
              customerId: options.customerId,
              productId: product.id,
              insuranceCarrier: options.carrier,
            },
          },
          create: {
            customerId: options.customerId,
            productId: product.id,
            authorizationId: options.authorizationId,
            authorizationType: options.carrier.toLowerCase(),
            finalPrice: pricingResult.patientCopay,
            retailPrice: pricingResult.retailPrice,
            savings: pricingResult.savings,
            insuranceCarrier: options.carrier,
            planName: options.planName,
            tier: pricingResult.tierUsed,
            needsTierAssignment,
            active: true,
          },
          update: {
            authorizationId: options.authorizationId,
            authorizationType: options.carrier.toLowerCase(),
            finalPrice: pricingResult.patientCopay,
            retailPrice: pricingResult.retailPrice,
            savings: pricingResult.savings,
            planName: options.planName,
            tier: pricingResult.tierUsed,
            needsTierAssignment,
            active: true,
            updatedAt: new Date(),
          },
        })

        // Track if created or updated
        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          productsCreated++
        } else {
          productsUpdated++
        }

      } catch (err) {
        productsFailed++
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        errors.push({
          sku: product.sku || product.id,
          error: errorMsg,
        })
        console.error(`[Precompute] Failed to process product ${product.sku}:`, errorMsg)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[Precompute] Completed in ${(duration / 1000).toFixed(1)}s`)
    console.log(`[Precompute] Created: ${productsCreated}, Updated: ${productsUpdated}, Failed: ${productsFailed}`)

    return {
      success: productsFailed === 0,
      productsProcessed: products.length,
      productsCreated,
      productsUpdated,
      productsFailed,
      errors,
      duration,
    }

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[Precompute] Fatal error:', error)
    return {
      success: false,
      productsProcessed: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsFailed: 0,
      errors: [{
        sku: 'FATAL',
        error: error instanceof Error ? error.message : 'Unknown fatal error'
      }],
      duration,
    }
  }
}

/**
 * Fetch all products from the catalog
 * Combines lens products, frames, contact lenses, and services
 */
async function fetchProductCatalog(categories?: string[]) {
  const products: Array<{
    id: string
    sku: string
    name: string
    retailPrice: number
    category: string
    vsp?: any
    eyemed?: any
    spectera?: any
  }> = []

  // Fetch lens products
  if (!categories || categories.includes('lens')) {
    const lensProducts = await prisma.lensProduct.findMany({
      where: { isActive: true },
    })

    // Get tier mappings from carrier_tiers table
    const lensProductIds = lensProducts.map(p => p.id)
    const lensTiers = await prisma.carrierTier.findMany({
      where: {
        productId: { in: lensProductIds },
        productType: 'LENS_PRODUCT'
      }
    })

    // Build a map of productId -> carrier -> tier
    const tierMap = new Map<string, { vsp?: any; eyemed?: any; spectera?: any }>()
    for (const tier of lensTiers) {
      const existing = tierMap.get(tier.productId) || {}
      if (tier.carrier === 'VSP') existing.vsp = tier
      else if (tier.carrier === 'EYEMED') existing.eyemed = tier
      else if (tier.carrier === 'SPECTERA') existing.spectera = tier
      tierMap.set(tier.productId, existing)
    }

    for (const lens of lensProducts) {
      const tiers = tierMap.get(lens.id) || {}
      products.push({
        id: lens.id,
        sku: lens.sku,
        name: lens.name,
        retailPrice: lens.retailPrice,
        category: lens.pricingCategory || 'lens',
        // Map carrier tiers to product
        vsp: tiers.vsp,
        eyemed: tiers.eyemed,
        spectera: tiers.spectera,
      })
    }
  }

  // Fetch frames
  if (!categories || categories.includes('frame')) {
    const frames = await prisma.frame.findMany({
      where: { isActive: true },
    })

    for (const frame of frames) {
      products.push({
        id: frame.id,
        sku: frame.sku || frame.id,
        name: `${frame.brand} ${frame.model}`,
        retailPrice: frame.retailPrice,
        category: 'frame',
      })
    }
  }

  // Fetch contact lenses
  if (!categories || categories.includes('contact')) {
    const contacts = await prisma.contactLens.findMany({
      where: { isActive: true },
    })

    for (const contact of contacts) {
      products.push({
        id: contact.id,
        sku: contact.sku || contact.id,
        name: contact.lensName,
        retailPrice: contact.retailPrice,
        category: 'contact_lens',
      })
    }
  }

  return products
}

/**
 * Deactivate all prices for a customer's authorization
 * (called when an auth expires or is replaced)
 */
export async function deactivateCustomerPrices(
  customerId: string,
  authorizationId: string
): Promise<number> {
  const result = await prisma.customerPriceList.updateMany({
    where: {
      customerId,
      authorizationId,
    },
    data: {
      active: false,
      updatedAt: new Date(),
    },
  })

  console.log(`[Precompute] Deactivated ${result.count} prices for auth ${authorizationId}`)
  return result.count
}

/**
 * Get statistics about a customer's price list
 */
export async function getCustomerPriceListStats(customerId: string) {
  const [total, needsTier, active] = await Promise.all([
    prisma.customerPriceList.count({
      where: { customerId },
    }),
    prisma.customerPriceList.count({
      where: { customerId, needsTierAssignment: true },
    }),
    prisma.customerPriceList.count({
      where: { customerId, active: true },
    }),
  ])

  const avgSavings = await prisma.customerPriceList.aggregate({
    where: { customerId, active: true },
    _avg: { savings: true },
  })

  return {
    totalProducts: total,
    activeProducts: active,
    productsNeedingTierAssignment: needsTier,
    averageSavings: avgSavings._avg.savings || 0,
    tierAssignmentPercentage: total > 0 ? (needsTier / total) * 100 : 0,
  }
}
