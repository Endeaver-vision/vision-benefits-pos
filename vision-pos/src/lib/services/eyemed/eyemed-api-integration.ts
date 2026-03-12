/**
 * EyeMed Pricing Engine - API Integration
 *
 * Provides helpers for integrating the new EyeMed pricing engine
 * with the on-demand pricing API endpoint.
 *
 * This is used in routes like:
 * - POST /api/pricing/calculate
 * - POST /api/quote-builder/products
 */

import { BenefitAuthorization, isEyemedAuth } from '@/types/benefit-authorization'
import { ProductCatalogEntry, QuoteLineItem } from '@/types/product-catalog'
import { calculateEyeMedPricing } from './eyemed-pricing-engine'

export interface ApiPricingRequest {
  customerId: string
  authorizationId?: string
  products: Array<{
    sku: string
    retailPrice?: number
  }>
}

export interface ApiPricingResponse {
  success: boolean
  carrier: string | null
  planName: string | null
  items: QuoteLineItem[]
  summary: {
    retailTotal: number
    patientTotal: number
    insuranceTotal: number
    totalSavings: number
  }
  warnings?: string[]
  errors?: string[]
}

/**
 * Convert API request to pricing calculation
 *
 * Used by endpoints to call the new EyeMed pricing engine
 */
export async function calculateEyemedPricingFromRequest(
  auth: BenefitAuthorization,
  request: ApiPricingRequest,
  productCatalog: Map<string, ProductCatalogEntry>
): Promise<ApiPricingResponse> {
  const response: ApiPricingResponse = {
    success: false,
    carrier: auth.plan.carrier,
    planName: auth.plan.planName,
    items: [],
    summary: {
      retailTotal: 0,
      patientTotal: 0,
      insuranceTotal: 0,
      totalSavings: 0,
    },
    warnings: [],
    errors: [],
  }

  // Validate auth is EyeMed
  if (!isEyemedAuth(auth)) {
    response.errors?.push('Authorization is not EyeMed')
    return response
  }

  try {
    // Build product list from catalog
    const productsToPrice: ProductCatalogEntry[] = []
    for (const reqProduct of request.products) {
      const catalogProduct = productCatalog.get(reqProduct.sku)
      if (!catalogProduct) {
        response.warnings?.push(`Product not found in catalog: ${reqProduct.sku}`)
        continue
      }

      // Override retail price if provided
      if (reqProduct.retailPrice !== undefined) {
        catalogProduct.retailPrice = reqProduct.retailPrice
      }

      productsToPrice.push(catalogProduct)
    }

    if (productsToPrice.length === 0) {
      response.errors?.push('No valid products to price')
      return response
    }

    // Calculate prices
    const pricingResult = await calculateEyeMedPricing(auth, productsToPrice, {
      customerId: request.customerId,
    })

    // Convert result
    response.success = true
    response.items = pricingResult.pricedProducts
    response.summary = {
      retailTotal: pricingResult.retailTotal,
      patientTotal: pricingResult.patientTotal,
      insuranceTotal: pricingResult.insuranceTotal,
      totalSavings: pricingResult.totalSavings,
    }
    response.warnings = pricingResult.warnings

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    response.errors?.push(message)
    return response
  }
}

/**
 * Format pricing result for JSON response
 */
export function formatPricingResponseForJson(response: ApiPricingResponse) {
  return {
    success: response.success,
    carrier: response.carrier,
    planName: response.planName,
    items: response.items.map((item) => ({
      sku: item.sku,
      displayName: item.displayName,
      category: item.category,
      retailPrice: Number(item.retailPrice),
      patientCopay: Number(item.patientCopay),
      insurancePays: Number(item.insurancePays),
      savings: Number(item.savings),
      tierUsed: item.tierUsed,
      notes: item.notes,
    })),
    summary: {
      retailTotal: Number(response.summary.retailTotal),
      patientTotal: Number(response.summary.patientTotal),
      insuranceTotal: Number(response.summary.insuranceTotal),
      totalSavings: Number(response.summary.totalSavings),
    },
    warnings: response.warnings,
    errors: response.errors,
  }
}
