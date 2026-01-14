/**
 * Batch Price Generator
 *
 * Generates temporary price lists from batch-scanned documents.
 * These price lists are NOT assigned to a customer and can be
 * assigned later when the patient comes in.
 */

import { prisma } from '@/lib/prisma'
import { createPricingCalculator } from './pricing-calculator'
import type { BenefitAuthorization } from '@/types/benefit-authorization'

/**
 * Generate a temporary price list for a batch-scanned document
 *
 * @param batchDocumentId - The batch document ID
 * @param carrier - Detected carrier (VSP, EyeMed, Spectera)
 * @param extractedData - GPT-extracted benefit data
 * @returns Number of prices generated
 */
export async function generateTemporaryPriceList(
  batchDocumentId: string,
  carrier: string,
  extractedData: Record<string, unknown>
): Promise<number> {
  console.log(`[BatchPriceGen] Generating temp prices for doc ${batchDocumentId}, carrier: ${carrier}`)

  // Build a BenefitAuthorization object from extracted data
  const auth = buildAuthFromExtraction(carrier.toLowerCase(), extractedData)

  // Get pricing calculator for this carrier
  const calculator = createPricingCalculator(auth)

  // Fetch all products from catalog
  const products = await fetchProductCatalog()
  console.log(`[BatchPriceGen] Processing ${products.length} products`)

  let created = 0

  // Calculate price for each product
  for (const product of products) {
    try {
      const pricingResult = calculator.calculateProduct(product as any, auth)

      // Determine if using fallback pricing
      const needsTierAssignment =
        pricingResult.warnings?.some(w =>
          w.includes('using retail') ||
          w.includes('80%') ||
          w.includes('No tier mapping')
        ) ?? false

      // Create temporary price list entry
      await prisma.temporaryPriceList.create({
        data: {
          batchDocumentId,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          productCategory: product.category,
          finalPrice: pricingResult.patientCopay,
          retailPrice: pricingResult.retailPrice,
          savings: pricingResult.savings,
          insuranceCarrier: carrier.toUpperCase(),
          planName: auth.plan?.planName || null,
          tier: pricingResult.tierUsed || null,
          pricingRule: needsTierAssignment ? '80_UC' : 'TIER_COPAY',
          needsTierAssignment,
          status: 'TEMPORARY',
        },
      })

      created++
    } catch (err) {
      // Log but don't fail the whole batch for individual product errors
      console.error(`[BatchPriceGen] Failed to price ${product.sku}:`, err)
    }
  }

  console.log(`[BatchPriceGen] Created ${created} temporary prices`)
  return created
}

/**
 * Build a BenefitAuthorization from extracted data
 */
function buildAuthFromExtraction(
  carrier: string,
  data: Record<string, unknown>
): BenefitAuthorization {
  const copays = data.copays as Record<string, { value?: number }> | undefined
  const frame = data.frame as { allowances?: Record<string, { allowance?: number; value?: number }> } | undefined
  const plan = data.plan as Record<string, { value?: string }> | undefined

  // Get frame allowance from various possible locations
  const frameAllowance =
    frame?.allowances?.nonAltairMarchonFrameAllowance?.allowance ??
    frame?.allowances?.frameAllowance?.value ??
    copays?.frameAllowance?.value ??
    0

  const planName = plan?.benefitPlanName?.value || `${carrier.toUpperCase()} Plan`

  // Use 'as any' to bypass strict type checking for partial auth object
  // The pricing calculator handles missing fields gracefully
  const baseAuth = {
    carrier: carrier as 'vsp' | 'eyemed' | 'spectera',
    plan: {
      carrier: carrier as 'vsp' | 'eyemed' | 'spectera',
      planName,
    },
    patient: {
      age: null,
      name: '',
      dob: null,
      memberId: '',
    },
  } as any

  // Build carrier-specific copays
  if (carrier === 'vsp') {
    return {
      ...baseAuth,
      copays: {
        examWellvision: copays?.examCopay?.value ?? 0,
        materials: copays?.materialsCopay?.value ?? 0,
        frameAllowanceFeatured: frameAllowance,
        frameAllowanceNonFeatured: frameAllowance,
        frameOverageDiscount: 20, // Standard VSP
      },
      planTier: {
        progressiveCopays: extractProgressiveCopays(copays, 'vsp'),
        arCopays: {},
        materialCopays: {},
        enhancementCopays: {},
      },
    } as BenefitAuthorization
  }

  if (carrier === 'eyemed') {
    const progressives = extractProgressiveCopays(copays, 'eyemed')
    return {
      ...baseAuth,
      copays: {
        exam: copays?.examCopay?.value ?? 0,
        materials: copays?.materialsCopay?.value ?? 0,
        lensSv: copays?.singleVisionCopay?.value ?? 0,
        progressiveStandard: progressives.standard ?? 0,
        progressivePremiumTier1: progressives.tier1 ?? 0,
        progressivePremiumTier2: progressives.tier2 ?? 0,
        progressivePremiumTier3: progressives.tier3 ?? 0,
        progressivePremiumTier4: progressives.tier4 ?? 0,
        progressivePremiumTier5: progressives.tier5 ?? 0,
        frameAllowance,
        frameOverageDiscount: 20,
        materialPolycarbonate: copays?.polycarbonateCopay?.value ?? 0,
        photochromic: copays?.photochromicCopay?.value ?? 0,
        polarized: copays?.polarizedCopay?.value ?? 0,
      },
    } as BenefitAuthorization
  }

  if (carrier === 'spectera') {
    const progressives = extractProgressiveCopays(copays, 'spectera')
    return {
      ...baseAuth,
      copays: {
        examAdult: copays?.examCopay?.value ?? 0,
        materials: copays?.materialsCopay?.value ?? 0,
        lensStandard: copays?.singleVisionCopay?.value ?? 0,
        progressiveTierI: progressives.tierI ?? 0,
        progressiveTierII: progressives.tierII ?? 0,
        progressiveTierIII: progressives.tierIII ?? 0,
        progressiveTierIV: progressives.tierIV ?? 0,
        progressiveTierV: progressives.tierV ?? 0,
        frameAllowance,
        frameOveragePercent: 0.70,
        materialPolycarbonateAdult: copays?.polycarbonateCopay?.value ?? 0,
        photochromic: copays?.photochromicCopay?.value ?? 0,
        polarized: copays?.polarizedCopay?.value ?? 0,
      },
    } as BenefitAuthorization
  }

  return baseAuth as BenefitAuthorization
}

/**
 * Extract progressive copays from extraction data
 */
function extractProgressiveCopays(
  copays: Record<string, { value?: number }> | undefined,
  carrier: string
): Record<string, number> {
  if (!copays) return {}

  const progressives = copays.progressiveCopays as Record<string, { value?: number }> | undefined

  if (carrier === 'vsp') {
    return {
      standard: progressives?.standard?.value ?? copays.progressiveStandardCopay?.value ?? 0,
      premium: progressives?.premium?.value ?? copays.progressivePremiumCopay?.value ?? 0,
    }
  }

  if (carrier === 'eyemed') {
    return {
      standard: progressives?.standard?.value ?? copays.progressiveStandardCopay?.value ?? 0,
      tier1: progressives?.tier1?.value ?? copays.progressiveTier1Copay?.value ?? 0,
      tier2: progressives?.tier2?.value ?? copays.progressiveTier2Copay?.value ?? 0,
      tier3: progressives?.tier3?.value ?? copays.progressiveTier3Copay?.value ?? 0,
      tier4: progressives?.tier4?.value ?? copays.progressiveTier4Copay?.value ?? 0,
      tier5: progressives?.tier5?.value ?? copays.progressiveTier5Copay?.value ?? 0,
    }
  }

  if (carrier === 'spectera') {
    return {
      tierI: progressives?.tierI?.value ?? copays.progressiveTierICopay?.value ?? 0,
      tierII: progressives?.tierII?.value ?? copays.progressiveTierIICopay?.value ?? 0,
      tierIII: progressives?.tierIII?.value ?? copays.progressiveTierIIICopay?.value ?? 0,
      tierIV: progressives?.tierIV?.value ?? copays.progressiveTierIVCopay?.value ?? 0,
      tierV: progressives?.tierV?.value ?? copays.progressiveTierVCopay?.value ?? 0,
    }
  }

  return {}
}

/**
 * Fetch all products from catalog for pricing
 */
async function fetchProductCatalog() {
  const products: Array<{
    id: string
    sku: string
    name: string
    retailPrice: number
    category: string
    vsp?: unknown
    eyemed?: unknown
    spectera?: unknown
  }> = []

  // Fetch lens products with tier mappings
  const lensProducts = await prisma.lensProduct.findMany({
    where: { isActive: true },
  })

  const lensProductIds = lensProducts.map(p => p.id)
  const lensTiers = await prisma.carrierTier.findMany({
    where: {
      productId: { in: lensProductIds },
      productType: 'LENS_PRODUCT',
    },
  })

  const tierMap = new Map<string, { vsp?: unknown; eyemed?: unknown; spectera?: unknown }>()
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
      vsp: tiers.vsp,
      eyemed: tiers.eyemed,
      spectera: tiers.spectera,
    })
  }

  // Fetch frames
  const frames = await prisma.frame.findMany({
    where: { isActive: true },
    take: 100, // Limit frames for temp price lists
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

  // Fetch contact lenses
  const contacts = await prisma.contactLens.findMany({
    where: { isActive: true },
  })

  for (const contact of contacts) {
    products.push({
      id: contact.id,
      sku: contact.id, // ContactLens doesn't have SKU field
      name: contact.lensName,
      retailPrice: contact.retailPrice,
      category: 'contact_lens',
    })
  }

  return products
}

/**
 * Assign a temporary price list to a customer
 *
 * This copies all temporary prices to the customer's price list
 * and marks the batch document as ASSIGNED.
 */
export async function assignPriceListToCustomer(
  batchDocumentId: string,
  customerId: string,
  assignedBy?: string
): Promise<{ copied: number; failed: number }> {
  console.log(`[BatchPriceGen] Assigning prices from ${batchDocumentId} to customer ${customerId}`)

  // Get all temporary prices for this document
  const tempPrices = await prisma.temporaryPriceList.findMany({
    where: {
      batchDocumentId,
      status: 'TEMPORARY',
    },
  })

  if (tempPrices.length === 0) {
    throw new Error('No temporary prices found for this document')
  }

  let copied = 0
  let failed = 0

  // Copy each price to customer's price list
  for (const temp of tempPrices) {
    try {
      await prisma.customerPriceList.upsert({
        where: {
          customerId_productId_insuranceCarrier: {
            customerId,
            productId: temp.productId,
            insuranceCarrier: temp.insuranceCarrier,
          },
        },
        create: {
          customerId,
          productId: temp.productId,
          finalPrice: temp.finalPrice,
          retailPrice: temp.retailPrice,
          savings: temp.savings,
          insuranceCarrier: temp.insuranceCarrier,
          planName: temp.planName,
          tier: temp.tier,
          needsTierAssignment: temp.needsTierAssignment,
          active: true,
        },
        update: {
          finalPrice: temp.finalPrice,
          retailPrice: temp.retailPrice,
          savings: temp.savings,
          planName: temp.planName,
          tier: temp.tier,
          needsTierAssignment: temp.needsTierAssignment,
          active: true,
          updatedAt: new Date(),
        },
      })

      // Mark temp price as assigned
      await prisma.temporaryPriceList.update({
        where: { id: temp.id },
        data: {
          status: 'ASSIGNED',
          assignedToCustomer: customerId,
          assignedAt: new Date(),
          assignedBy,
        },
      })

      copied++
    } catch (err) {
      console.error(`[BatchPriceGen] Failed to copy price ${temp.productId}:`, err)
      failed++
    }
  }

  // Mark the batch document as assigned
  await prisma.batchScanDocument.update({
    where: { id: batchDocumentId },
    data: { status: 'ASSIGNED' },
  })

  console.log(`[BatchPriceGen] Assigned ${copied} prices to customer ${customerId} (${failed} failed)`)
  return { copied, failed }
}
