/**
 * EyeMed Pricing Engine - Precompute Service Integration
 *
 * Integrates the new EyeMed pricing engine with the price list precomputation flow.
 * This allows the engine to be used in:
 * 1. Batch price generation for a customer
 * 2. Price list regeneration after document upload
 */

import { prisma } from '@/lib/prisma'
import { isEyemedAuth, EyemedBenefitAuthorization } from '@/types/benefit-authorization'
import { ProductCatalogEntry } from '@/types/product-catalog'
import { calculateEyeMedPricing } from './eyemed-pricing-engine'

export interface EyemedPrecomputeResult {
  success: boolean
  customerId: string
  authorizationId: string
  productsProcessed: number
  pricesCreated: number
  pricesUpdated: number
  pricesFailed: number
  errors: string[]
  debugInfo?: {
    formulasApplied: number
    rulesApplied: number
    fallbacksUsed: number
  }
}

/**
 * Precompute prices for a customer using the EyeMed pricing engine
 *
 * This is called from the main precompute flow when:
 * 1. A new EyeMed authorization is created
 * 2. Prices need to be regenerated after auth update
 * 3. Batch processing of customers
 *
 * @param auth - EyeMed benefit authorization
 * @param customerId - Customer ID
 * @param authorizationId - Authorization ID
 * @param productCatalog - Product catalog entries to price
 * @returns Precompute result with statistics
 */
export async function precomputeEyemedPrices(
  auth: EyemedBenefitAuthorization,
  customerId: string,
  authorizationId: string,
  productCatalog: ProductCatalogEntry[]
): Promise<EyemedPrecomputeResult> {
  const result: EyemedPrecomputeResult = {
    success: false,
    customerId,
    authorizationId,
    productsProcessed: 0,
    pricesCreated: 0,
    pricesUpdated: 0,
    pricesFailed: 0,
    errors: [],
  }

  try {
    // Validate auth
    if (!isEyemedAuth(auth)) {
      result.errors.push('Authorization is not EyeMed')
      return result
    }

    // Calculate prices using the new engine
    const pricingResult = await calculateEyeMedPricing(auth, productCatalog, {
      customerId,
    })

    result.productsProcessed = pricingResult.pricedProducts.length
    result.debugInfo = {
      formulasApplied: pricingResult.debugInfo?.formulasApplied ?? 0,
      rulesApplied: pricingResult.debugInfo?.rulesApplied ?? 0,
      fallbacksUsed: pricingResult.debugInfo?.fallbacksUsed ?? 0,
    }

    // Persist prices to database
    for (const pricedProduct of pricingResult.pricedProducts) {
      try {
        // Find product by SKU
        const dbProduct = await prisma.lensProduct.findUnique({
          where: { sku: pricedProduct.sku },
        })

        if (!dbProduct) {
          result.pricesFailed++
          result.errors.push(`Product not found in database: ${pricedProduct.sku}`)
          continue
        }

        // Check if price list entry exists
        const existingPrice = await prisma.patientPriceList.findUnique({
          where: {
            customerId_productId_insuranceCarrier: {
              customerId,
              productId: dbProduct.id,
              insuranceCarrier: 'eyemed',
            },
          },
        })

        if (existingPrice) {
          // Update existing price
          await prisma.patientPriceList.update({
            where: { id: existingPrice.id },
            data: {
              retailPrice: pricedProduct.retailPrice,
              finalPrice: pricedProduct.patientCopay,
              savings: pricedProduct.savings,
              tier: pricedProduct.tierUsed,
              pricingMethod: pricedProduct.category,
              needsTierAssignment: pricedProduct.needsTierAssignment,
              updatedAt: new Date(),
            },
          })
          result.pricesUpdated++
        } else {
          // Create new price
          await prisma.patientPriceList.create({
            data: {
              customerId,
              productId: dbProduct.id,
              authorizationId,
              retailPrice: pricedProduct.retailPrice,
              finalPrice: pricedProduct.patientCopay,
              savings: pricedProduct.savings,
              insuranceCarrier: 'eyemed',
              planName: auth.plan.planName,
              tier: pricedProduct.tierUsed,
              pricingMethod: pricedProduct.category,
              needsTierAssignment: pricedProduct.needsTierAssignment,
              active: true,
            },
          })
          result.pricesCreated++
        }
      } catch (err) {
        result.pricesFailed++
        const message = err instanceof Error ? err.message : String(err)
        result.errors.push(`Failed to persist price for ${pricedProduct.sku}: ${message}`)
      }
    }

    result.success = result.pricesFailed === 0

    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    result.errors.push(message)
    return result
  }
}

/**
 * Fetch EyeMed authorization from database and convert to typed object
 */
export async function fetchEyemedAuthFromDb(
  authorizationId: string
): Promise<EyemedBenefitAuthorization | null> {
  try {
    const dbAuth = await prisma.insuranceAuthorization.findUnique({
      where: { id: authorizationId },
      include: { customer: true },
    })

    if (!dbAuth || dbAuth.carrier !== 'eyemed') {
      return null
    }

    // Convert DB record to EyemedBenefitAuthorization
    // This is a simplified conversion - in reality, the copays JSON would have all the fields
    const auth: EyemedBenefitAuthorization = {
      patient: {
        name: dbAuth.customer?.firstName + ' ' + dbAuth.customer?.lastName,
        dob: dbAuth.customer?.dateOfBirth?.toISOString().split('T')[0] ?? null,
        age: dbAuth.customer?.dateOfBirth
          ? Math.floor(
              (new Date().getTime() - new Date(dbAuth.customer.dateOfBirth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000)
            )
          : null,
        memberId: dbAuth.memberId ?? '',
        groupNumber: dbAuth.customer?.groupNumber ?? undefined,
      },
      plan: {
        carrier: 'eyemed',
        planId: dbAuth.id,
        planName: dbAuth.planName ?? 'EyeMed Plan',
        effectiveDate: undefined,
        expirationDate: dbAuth.expirationDate?.toISOString().split('T')[0],
      },
      frequency: {
        exam: { count: 1, periodMonths: 12 },
        frame: { count: 1, periodMonths: 12 },
        lenses: { count: 1, periodMonths: 12 },
      },
      copays: (dbAuth.copays as any) || {},
      specialRules: {
        polycarbonateFreeCbildAgeMax: 18,
        progressiveNonadaptPolicy: true,
      },
    }

    return auth
  } catch (err) {
    console.error('[EyemedPrecompute] Error fetching auth from DB:', err)
    return null
  }
}

/**
 * Fetch product catalog from database
 */
export async function fetchProductCatalogFromDb(): Promise<ProductCatalogEntry[]> {
  try {
    const dbProducts = await prisma.lensProduct.findMany({
      where: { active: true },
    })

    return dbProducts.map((p) => ({
      sku: p.sku ?? '',
      displayName: p.name,
      category: (p.category as any) || 'unknown',
      retailPrice: p.basePrice,
      isActive: p.active,
      eyemed: p.tierEyemed
        ? {
            progressiveTier: p.tierEyemed as any,
          }
        : undefined,
    }))
  } catch (err) {
    console.error('[EyemedPrecompute] Error fetching product catalog:', err)
    return []
  }
}

/**
 * Complete precompute workflow: fetch auth + catalog, calculate, and persist
 */
export async function completeEyemedPrecomputeWorkflow(
  customerId: string,
  authorizationId: string
): Promise<EyemedPrecomputeResult> {
  // Fetch auth from DB
  const auth = await fetchEyemedAuthFromDb(authorizationId)
  if (!auth) {
    return {
      success: false,
      customerId,
      authorizationId,
      productsProcessed: 0,
      pricesCreated: 0,
      pricesUpdated: 0,
      pricesFailed: 0,
      errors: ['Could not fetch EyeMed authorization'],
    }
  }

  // Fetch product catalog
  const catalog = await fetchProductCatalogFromDb()
  if (catalog.length === 0) {
    return {
      success: false,
      customerId,
      authorizationId,
      productsProcessed: 0,
      pricesCreated: 0,
      pricesUpdated: 0,
      pricesFailed: 0,
      errors: ['Could not fetch product catalog'],
    }
  }

  // Calculate and persist prices
  return precomputeEyemedPrices(auth, customerId, authorizationId, catalog)
}
