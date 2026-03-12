/**
 * Price List Precompute Service
 *
 * Generates and persists customer price lists based on insurance authorization
 */

import { prisma } from '@/lib/prisma'
import { generatePriceMapping } from './price-mapping-service'
import type { BenefitAuthorization } from '@/types/benefit-authorization'

export interface PrecomputeResult {
  success: boolean
  customerId?: string
  authorizationId?: string
  productsProcessed: number
  productsCreated: number
  productsUpdated: number
  productsFailed: number
  errors: string[]
}

export interface PrecomputeInput {
  customerId: string
  authorizationId: string
  carrier: 'VSP' | 'EyeMed' | 'Spectera'
  planName: string
}

/**
 * Precompute and persist customer prices
 *
 * This function:
 * 1. Fetches all products from the catalog
 * 2. Calculates prices based on the benefit authorization
 * 3. Stores the prices in patientPriceList table
 *
 * Includes retry logic to handle timing issues when authorization is just being created
 */
export async function precomputeCustomerPrices(
  benefitAuth: BenefitAuthorization,
  input: PrecomputeInput
): Promise<PrecomputeResult> {
  const { customerId, authorizationId, carrier } = input
  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 500

  try {
    console.log(`[PrecomputePrice] Starting for customer ${customerId}, carrier: ${carrier}`)

    // Retry logic: authorization might not be immediately available after processing
    let result = await generatePriceMapping(customerId)
    let retryCount = 0

    while (!result.success && retryCount < MAX_RETRIES && result.error?.includes('No active insurance authorization')) {
      retryCount++
      console.warn(`[PrecomputePrice] Authorization not found, retrying (${retryCount}/${MAX_RETRIES}) after ${RETRY_DELAY_MS}ms...`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      result = await generatePriceMapping(customerId)
    }

    if (!result.success) {
      return {
        success: false,
        productsProcessed: 0,
        productsCreated: 0,
        productsUpdated: 0,
        productsFailed: 0,
        errors: [result.error || 'Price mapping failed']
      }
    }

    console.log(`[PrecomputePrice] Completed: ${result.mappedProducts} mapped, ${result.fallbackProducts} fallback`)

    return {
      success: result.success,
      customerId,
      authorizationId,
      productsProcessed: result.totalProducts,
      productsCreated: result.mappedProducts,
      productsUpdated: 0,
      productsFailed: result.fallbackProducts,
      errors: result.missingKeyProducts.slice(0, 5)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[PrecomputePrice] Error:', message)

    return {
      success: false,
      productsProcessed: 0,
      productsCreated: 0,
      productsUpdated: 0,
      productsFailed: 0,
      errors: [message]
    }
  }
}

/**
 * Get statistics about a customer's price list
 */
export async function getCustomerPriceListStats(customerId: string) {
  const priceList = await prisma.patientPriceList.findMany({
    where: { customerId, active: true }
  })

  return {
    total: priceList.length,
    carriers: [...new Set(priceList.map(p => p.insuranceCarrier).filter(Boolean))],
    averagePrice: priceList.length > 0
      ? priceList.reduce((sum, p) => sum + (Number(p.finalPrice) || 0), 0) / priceList.length
      : 0
  }
}
