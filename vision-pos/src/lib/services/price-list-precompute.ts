/**
 * Pre-Computation Engine for Patient Price Lists
 *
 * SIMPLIFIED VERSION using unified InsuranceAuthorization table
 *
 * Flow:
 * 1. Fetch authorization from insurance_authorizations (has JSON copays)
 * 2. Fetch all lens products from catalog
 * 3. For each product:
 *    - Get product's tier code for this carrier (e.g., tierEyemed = "tier_3")
 *    - Map tier code to copay field name (e.g., "tier_3" -> "progressiveTier3")
 *    - Look up copay value from authorization's copays JSON
 *    - Patient pays copay (or retail if no mapping/coverage)
 * 4. Save to patient_price_lists table
 */

import { prisma } from '@/lib/prisma'
import { EYEMED_TIER_TO_COPAY, VSP_TIER_TO_COPAY, SPECTERA_TIER_TO_COPAY } from '@/lib/data/insurance-tier-mappings'

export interface PrecomputeOptions {
  customerId: string
  authorizationId: string
  carrier: 'VSP' | 'EyeMed' | 'Spectera' | 'EYEMED' | 'SPECTERA'
  planName?: string
}

export interface PrecomputeResult {
  success: boolean
  productsProcessed: number
  productsWithCopay: number
  productsAtRetail: number
  errors: Array<{ productId: string; error: string }>
  duration: number
}

/**
 * Main entry point: Pre-compute prices for all products for a customer's authorization
 */
export async function precomputeCustomerPrices(
  options: PrecomputeOptions
): Promise<PrecomputeResult> {
  const startTime = Date.now()
  const errors: Array<{ productId: string; error: string }> = []
  let productsWithCopay = 0
  let productsAtRetail = 0

  // Normalize carrier to uppercase
  const carrier = options.carrier.toUpperCase() as 'VSP' | 'EYEMED' | 'SPECTERA'

  console.log(`[Precompute] Starting for customer ${options.customerId}, carrier ${carrier}`)

  try {
    // Step 1: Get the authorization with copays JSON
    const auth = await prisma.insuranceAuthorization.findUnique({
      where: { id: options.authorizationId },
    })

    if (!auth) {
      throw new Error(`Authorization ${options.authorizationId} not found`)
    }

    const copays = (auth.copays as Record<string, number | null>) || {}
    console.log(`[Precompute] Authorization copays:`, JSON.stringify(copays, null, 2))

    // Step 2: Get all active lens products
    const products = await prisma.lensProduct.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })

    console.log(`[Precompute] Found ${products.length} products to process`)

    // Step 3: Get the tier-to-copay mapping for this carrier
    const tierToCopay = getTierToCopayMap(carrier)

    // Step 4: Process each product
    for (const product of products) {
      try {
        // Get the product's tier code for this carrier
        const tierCode = getProductTierCode(product, carrier)

        let finalPrice: number | null = null
        let tier: string | null = null
        let pricingMethod: string = 'cash_only' // Default for products not covered by insurance
        let needsTierAssignment = false

        if (tierCode) {
          // Product has a tier code for this carrier (is covered)
          // Map tier code to copay field name
          const copayField = tierToCopay[tierCode]

          if (copayField) {
            // Handle special cases
            if (copayField === 'ZERO_COPAY') {
              finalPrice = 0
              tier = tierCode
              pricingMethod = 'by_tier'
              productsWithCopay++
            } else if (copayField === 'DISCOUNT_20_PERCENT') {
              // EyeMed discount-based tier = 20% off retail (patient pays 80%)
              // Examples: AR Tier 3, "all other lens options"
              // NOTE: Progressive Tier 4/5 are handled separately below with allowance
              finalPrice = Math.round(product.basePrice * 0.80 * 100) / 100
              tier = tierCode
              pricingMethod = 'ins_discount'  // Insurance-based discount (not a fallback)
              productsWithCopay++
            } else if (carrier === 'EYEMED' && (tierCode === 'tier_4' || tierCode === 'tier_5')) {
              // EyeMed Progressive Tier 4/5: Special formula
              // Formula: copay + (retail × 0.80) - progressiveAllowance
              // The copay field (progressiveTier4/5) may contain the discount % (20), not a copay
              // We use progressiveStandard copay ($25) + discount formula - allowance ($120)
              const progressiveCopay = typeof copays['progressiveStandard'] === 'number'
                ? copays['progressiveStandard']
                : 25 // Default to $25 if not found
              const progressiveAllowance = typeof copays['progressiveAllowance'] === 'number'
                ? copays['progressiveAllowance']
                : 120 // Default to $120 if not found
              const discountedRetail = product.basePrice * 0.80
              finalPrice = Math.round((progressiveCopay + discountedRetail - progressiveAllowance) * 100) / 100
              // Ensure price doesn't go negative
              if (finalPrice < progressiveCopay) {
                finalPrice = progressiveCopay
              }
              tier = tierCode
              pricingMethod = 'ins_tier4_formula'  // Special EyeMed tier 4/5 formula
              productsWithCopay++
              console.log(`[Precompute] ${product.name}: EyeMed tier 4/5 formula: $${progressiveCopay} + ($${product.basePrice} × 0.80) - $${progressiveAllowance} = $${finalPrice}`)
            } else {
              // Look up copay from authorization's JSON
              const copayValue = copays[copayField]

              if (copayValue !== null && copayValue !== undefined) {
                // Check if it's a discount string like "DISCOUNT_20"
                if (typeof copayValue === 'string' && copayValue.startsWith('DISCOUNT_')) {
                  // Parse discount percentage (e.g., "DISCOUNT_20" means 20% off = patient pays 80%)
                  const discountPercent = parseInt(copayValue.replace('DISCOUNT_', ''), 10) || 20
                  const patientPaysPercent = (100 - discountPercent) / 100
                  finalPrice = Math.round(product.basePrice * patientPaysPercent * 100) / 100
                  tier = tierCode
                  pricingMethod = 'ins_discount'  // Insurance-defined discount benefit
                  productsWithCopay++
                } else if (typeof copayValue === 'number') {
                  // Found specific copay value
                  finalPrice = copayValue
                  tier = tierCode
                  pricingMethod = 'by_tier'
                  productsWithCopay++
                } else {
                  // Unexpected value type - log and use retail
                  console.warn(`[Precompute] ${product.name}: unexpected copay value type: ${typeof copayValue}`)
                  finalPrice = product.basePrice
                  pricingMethod = 'cash_only'
                  productsAtRetail++
                }
              } else {
                // Product IS covered by insurance but copay is null in this plan
                // For EyeMed progressives (tier_1, tier_2, tier_3), fall back to progressiveStandard copay
                const isEyemedProgressive = carrier === 'EYEMED' &&
                  (tierCode === 'tier_1' || tierCode === 'tier_2' || tierCode === 'tier_3')

                if (isEyemedProgressive) {
                  // EyeMed progressive tiers 1-3: Use progressiveStandard copay as fallback
                  const standardCopay = copays['progressiveStandard']
                  if (typeof standardCopay === 'number') {
                    finalPrice = standardCopay
                    tier = tierCode
                    pricingMethod = 'by_tier'
                    productsWithCopay++
                    console.log(`[Precompute] ${product.name}: EyeMed ${tierCode} using progressiveStandard copay -> $${finalPrice}`)
                  } else {
                    // No progressiveStandard either - use default $25
                    finalPrice = 25
                    tier = tierCode
                    pricingMethod = 'by_tier'
                    productsWithCopay++
                    console.warn(`[Precompute] ⚠️ ${product.name}: EyeMed ${tierCode} no copay found, defaulting to $25`)
                  }
                } else {
                  // Non-progressive product: Check for "allOtherLensOptions" fallback (EyeMed's catch-all)
                  const allOtherValue = copays['allOtherLensOptions']

                  if (allOtherValue !== null && allOtherValue !== undefined) {
                    // Use the "All Other Lens Options" benefit (typically DISCOUNT_20)
                    if (typeof allOtherValue === 'string' && allOtherValue.startsWith('DISCOUNT_')) {
                      const discountPercent = parseInt(allOtherValue.replace('DISCOUNT_', ''), 10) || 20
                      const patientPaysPercent = (100 - discountPercent) / 100
                      finalPrice = Math.round(product.basePrice * patientPaysPercent * 100) / 100
                      tier = tierCode
                      pricingMethod = 'ins_discount'  // This IS defined in the plan - "All Other Lens Options"
                      productsWithCopay++
                      console.log(`[Precompute] ${product.name}: using allOtherLensOptions (${allOtherValue}) -> $${finalPrice}`)
                    } else if (typeof allOtherValue === 'number') {
                      finalPrice = allOtherValue
                      tier = tierCode
                      pricingMethod = 'by_tier'
                      productsWithCopay++
                    } else {
                      // Unexpected - flag for review
                      finalPrice = Math.round(product.basePrice * 0.80 * 100) / 100
                      tier = tierCode
                      pricingMethod = 'uc_discount'
                      needsTierAssignment = true
                      productsWithCopay++
                      console.warn(`[Precompute] ⚠️ ${product.name}: unexpected allOtherLensOptions value: ${allOtherValue}`)
                    }
                  } else {
                    // No specific copay AND no allOtherLensOptions - flag for review
                    finalPrice = Math.round(product.basePrice * 0.80 * 100) / 100
                    tier = tierCode
                    pricingMethod = 'uc_discount'
                    needsTierAssignment = true  // Flag for admin review - null should not happen
                    productsWithCopay++
                    console.warn(`[Precompute] ⚠️ ${product.name}: tier ${tierCode} copay is NULL and no allOtherLensOptions - data extraction issue! Using UC discount -> $${finalPrice}`)
                  }
                }
              }
            }
          } else {
            // Tier code exists but no mapping found - should not happen, use UC discount
            finalPrice = Math.round(product.basePrice * 0.80 * 100) / 100
            tier = tierCode
            pricingMethod = 'uc_discount'
            needsTierAssignment = true // Flag for admin review
            productsWithCopay++
            console.log(`[Precompute] ${product.name}: unknown tier ${tierCode}, using UC discount -> $${finalPrice}`)
          }
        } else {
          // No tier mapping for this carrier - product is NOT covered by insurance
          // This is a cash-only product at full retail price
          finalPrice = product.basePrice
          pricingMethod = 'cash_only'
          productsAtRetail++
        }

        // Calculate savings
        const savings = product.basePrice - (finalPrice ?? product.basePrice)

        // Upsert to patient_price_lists
        await prisma.patientPriceList.upsert({
          where: {
            customerId_productId_insuranceCarrier: {
              customerId: options.customerId,
              productId: product.id,
              insuranceCarrier: carrier,
            },
          },
          create: {
            customerId: options.customerId,
            productId: product.id,
            authorizationId: options.authorizationId,
            retailPrice: product.basePrice,
            finalPrice,
            savings,
            insuranceCarrier: carrier,
            planName: options.planName || auth.planName || null,
            tier,
            pricingMethod,
            needsTierAssignment,
            active: true,
          },
          update: {
            authorizationId: options.authorizationId,
            retailPrice: product.basePrice,
            finalPrice,
            savings,
            planName: options.planName || auth.planName || null,
            tier,
            pricingMethod,
            needsTierAssignment,
            active: true,
            updatedAt: new Date(),
          },
        })

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        errors.push({ productId: product.id, error: errorMsg })
        console.error(`[Precompute] Failed to process ${product.name}:`, errorMsg)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[Precompute] Completed in ${(duration / 1000).toFixed(1)}s`)
    console.log(`[Precompute] With copay: ${productsWithCopay}, At retail: ${productsAtRetail}`)

    return {
      success: errors.length === 0,
      productsProcessed: products.length,
      productsWithCopay,
      productsAtRetail,
      errors,
      duration,
    }

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[Precompute] Fatal error:', error)
    return {
      success: false,
      productsProcessed: 0,
      productsWithCopay: 0,
      productsAtRetail: 0,
      errors: [{
        productId: 'FATAL',
        error: error instanceof Error ? error.message : 'Unknown fatal error'
      }],
      duration,
    }
  }
}

/**
 * Get the tier-to-copay mapping for a carrier
 */
function getTierToCopayMap(carrier: string): Record<string, string> {
  switch (carrier.toUpperCase()) {
    case 'EYEMED':
      return EYEMED_TIER_TO_COPAY
    case 'VSP':
      return VSP_TIER_TO_COPAY
    case 'SPECTERA':
      return SPECTERA_TIER_TO_COPAY
    default:
      return {}
  }
}

/**
 * Get a product's tier code for a specific carrier
 */
function getProductTierCode(
  product: { tierVsp?: string | null; tierEyemed?: string | null; tierSpectera?: string | null },
  carrier: string
): string | null {
  switch (carrier.toUpperCase()) {
    case 'EYEMED':
      return product.tierEyemed || null
    case 'VSP':
      return product.tierVsp || null
    case 'SPECTERA':
      return product.tierSpectera || null
    default:
      return null
  }
}

/**
 * Get statistics about a customer's price list
 */
export async function getCustomerPriceListStats(customerId: string) {
  const [total, needsTier, active] = await Promise.all([
    prisma.patientPriceList.count({
      where: { customerId },
    }),
    prisma.patientPriceList.count({
      where: { customerId, needsTierAssignment: true },
    }),
    prisma.patientPriceList.count({
      where: { customerId, active: true },
    }),
  ])

  const avgSavings = await prisma.patientPriceList.aggregate({
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

/**
 * Deactivate all prices for a customer's authorization
 */
export async function deactivateCustomerPrices(
  customerId: string,
  authorizationId: string
): Promise<number> {
  const result = await prisma.patientPriceList.updateMany({
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
