/**
 * Price Mapping Service
 *
 * Generates customer-specific price mappings from authorization data.
 * Maps copays from scanned insurance documents to products.
 *
 * SINGLE SOURCE OF TRUTH: customer_price_lists is THE gospel for all pricing.
 *
 * WHAT GETS MAPPED:
 * - Lens products (progressives, AR coatings, materials, photochromic, etc.)
 * - Exam services (routine exams, comprehensive exams)
 * - Contact lens fittings (sphere, toric, multifocal, specialty)
 *
 * WHAT DOES NOT GET MAPPED (calculated at quote time):
 * - Frames (retail - allowance + overage calc)
 * - Contact lenses (retail - allowance)
 *
 * PRICING RULES:
 * - Products/services WITH tier codes → use copay from authorization
 * - Products/services WITHOUT tier codes → use 80% of retail (20% discount) as fallback
 * - ALL items get a price entry (no nulls) - 100% pre-computed
 * - Items using fallback pricing are flagged for tier assignment
 *
 * MULTI-CARRIER SUPPORT - Customers can have multiple authorizations (VSP + EyeMed).
 * Each carrier's prices are stored separately and don't overwrite each other.
 */

import { prisma } from '@/lib/prisma'
import { getActiveAuthorizationForCustomer } from './authorization-service'

/**
 * Type for carrier tier lookup results
 */
interface CarrierTierLookup {
  tierCode: string
  tierLabel: string | null
  pricingRule: string
}

/**
 * Build a carrier tier lookup map from the unified carrier_tiers table
 * Key format: "productType:productId" -> tier info
 */
async function buildCarrierTierMap(carrier: string): Promise<Map<string, CarrierTierLookup>> {
  const tiers = await prisma.carrierTier.findMany({
    where: { carrier: carrier.toUpperCase() }
  })

  const map = new Map<string, CarrierTierLookup>()
  for (const tier of tiers) {
    // Key by productType:productId for exact lookup
    const key = `${tier.productType}:${tier.productId}`
    map.set(key, {
      tierCode: tier.tierCode,
      tierLabel: tier.tierLabel,
      pricingRule: tier.pricingRule
    })
  }

  return map
}

/**
 * Get tier code for a product from the carrier tier map
 */
function getTierForProduct(
  tierMap: Map<string, CarrierTierLookup>,
  productType: string,
  productId: string
): CarrierTierLookup | null {
  return tierMap.get(`${productType}:${productId}`) || null
}

/**
 * Extract CL fitting copay from VSP rawPatientReport JSON
 * The copay is stored in rawPatientReport.contacts.clExamCopay.value
 */
function extractClFittingCopay(rawPatientReport: Record<string, unknown> | null | undefined): number | null {
  if (!rawPatientReport) return null

  const contacts = rawPatientReport.contacts as Record<string, unknown> | undefined
  if (!contacts) return null

  // Try clExamCopay field (primary source)
  const clExamCopay = contacts.clExamCopay as { value: number | string | null; confidence?: number } | undefined
  if (clExamCopay?.value !== null && clExamCopay?.value !== undefined) {
    if (typeof clExamCopay.value === 'number') {
      return clExamCopay.value
    }
    // Parse number from string if needed
    const parsed = parseFloat(String(clExamCopay.value))
    if (!isNaN(parsed)) {
      return parsed
    }
  }

  // Try clExamOnlyPatientPaysOver field (alternative)
  const clExamOnly = contacts.clExamOnlyPatientPaysOver as { value: number | null } | undefined
  if (clExamOnly?.value !== null && clExamOnly?.value !== undefined) {
    return clExamOnly.value
  }

  return null
}

/**
 * Get VSP copay for a tier code, handling combo codes like "QV+QP" or "PR+DA"
 * Combo codes are split and summed: QV+QP = QV copay + QP copay
 */
function getVspCopay(
  tierCode: string,
  copayMap: Map<string, { sv: number | null; mf: number | null }>,
  preferMultifocal: boolean = true
): number | null {
  if (!tierCode) return null

  // Handle combo codes like "QV+QP", "PR+DA"
  if (tierCode.includes('+')) {
    const codes = tierCode.split('+')
    let total = 0
    for (const code of codes) {
      const trimmedCode = code.trim()
      const copay = copayMap.get(trimmedCode)
      if (!copay) {
        // If any code is missing, we can't calculate the total
        return null
      }
      const value = preferMultifocal ? (copay.mf ?? copay.sv) : (copay.sv ?? copay.mf)
      if (value === null) {
        return null
      }
      total += value
    }
    return total
  }

  // Single code - exact match
  const copay = copayMap.get(tierCode)
  if (!copay) return null
  return preferMultifocal ? (copay.mf ?? copay.sv) : (copay.sv ?? copay.mf)
}

interface PriceMappingResult {
  success: boolean
  customerId: string
  carrier: string | null
  authorizationId: string | null
  totalProducts: number
  mappedProducts: number      // Products with tier-based pricing
  fallbackProducts: number    // Products using 80% retail fallback
  missingKeyProducts: string[] // Products that MUST have prices
  error?: string
}

// Fallback discount for products without tier codes (20% off retail = 80% of retail)
const FALLBACK_DISCOUNT = 0.20

// Key product categories that MUST have prices mapped
const KEY_CATEGORIES = [
  'PROGRESSIVE_LENSES',
  'AR_COATINGS',
  'FRAMES',
  'EXAMS',
  'LENS_MATERIALS',
  'CONTACT_FITTING'
]

/**
 * Generate price mappings for a customer based on their authorization
 * Called automatically after document verification
 *
 * @param customerId - The customer ID
 * @param forCarrier - Optional: only generate for specific carrier (for multi-carrier support)
 */
export async function generatePriceMapping(
  customerId: string,
  forCarrier?: string
): Promise<PriceMappingResult> {
  try {
    // Get customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return {
        success: false,
        customerId,
        carrier: null,
        authorizationId: null,
        totalProducts: 0,
        mappedProducts: 0,
        missingPrices: 0,
        missingKeyProducts: [],
        error: 'Customer not found'
      }
    }

    // Get active authorization with copays
    const authResult = await getActiveAuthorizationForCustomer(customerId)

    // If forCarrier specified, check if it matches
    if (forCarrier && authResult?.carrier.toLowerCase() !== forCarrier.toLowerCase()) {
      return {
        success: false,
        customerId,
        carrier: forCarrier,
        authorizationId: null,
        totalProducts: 0,
        mappedProducts: 0,
        missingPrices: 0,
        missingKeyProducts: [],
        error: `No active ${forCarrier} authorization found`
      }
    }

    const insuranceCarrier = authResult?.carrier.toUpperCase() || null
    const authorizationId = authResult?.authorizationId || null

    // Get carrier-specific copays from authorization tables
    let vspCopays: Map<string, { sv: number | null, mf: number | null }> = new Map()
    let eyemedCopays: Record<string, number | null> = {}
    let specteraCopays: Record<string, number | null> = {}

    // Frame/exam allowances
    let examCopay: number | null = null
    let materialsCopay: number | null = null
    let frameAllowance: number | null = null
    let frameAllowanceFeatured: number | null = null
    let frameOverageDiscount: number | null = null
    let contactAllowance: number | null = null
    let contactFittingCovered: boolean = false
    let contactLensExamCopay: number | null = null

    if (authResult?.carrier === 'vsp') {
      const vspAuth = await prisma.vspAuthorization.findFirst({
        where: { id: authResult.authorizationId },
        include: { lensEnhancementCopays: true }
      })
      if (vspAuth) {
        examCopay = vspAuth.examCopay
        materialsCopay = vspAuth.materialsCopay
        frameAllowance = vspAuth.frameAllowanceRetail
        frameAllowanceFeatured = vspAuth.frameAllowanceMarchon
        frameOverageDiscount = vspAuth.frameOverageDiscount ? vspAuth.frameOverageDiscount / 100 : null
        contactAllowance = vspAuth.contactAllowance
        contactFittingCovered = vspAuth.contactFittingCovered

        // Extract CL fitting copay from rawPatientReport JSON (not the null column)
        // The copay is in rawPatientReport.contacts.clExamCopay.value
        contactLensExamCopay = extractClFittingCopay(vspAuth.rawPatientReport as Record<string, unknown> | null)
        console.log(`[PriceMapping] CL Fitting Copay extracted from rawPatientReport: ${contactLensExamCopay}`)

        // Build copay map from lens enhancements
        if (vspAuth.lensEnhancementCopays) {
          for (const copay of vspAuth.lensEnhancementCopays) {
            vspCopays.set(copay.code, {
              sv: copay.copaySingleVision,
              mf: copay.copayMultifocal
            })
          }
        }
      }
    } else if (authResult?.carrier === 'eyemed') {
      const eyemedAuth = await prisma.eyemedAuthorization.findFirst({
        where: { id: authResult.authorizationId },
        include: { arCoatingCopays: true }
      })
      if (eyemedAuth) {
        examCopay = eyemedAuth.examCopay
        frameAllowance = eyemedAuth.frameAllowance
        frameOverageDiscount = eyemedAuth.frameOverageDiscount ? eyemedAuth.frameOverageDiscount / 100 : null
        contactAllowance = eyemedAuth.contactAllowance

        // Progressive copays
        eyemedCopays['standard'] = eyemedAuth.progressiveStandardCopay
        eyemedCopays['tier_1'] = eyemedAuth.progressiveTier1Copay
        eyemedCopays['tier_2'] = eyemedAuth.progressiveTier2Copay
        eyemedCopays['tier_3'] = eyemedAuth.progressiveTier3Copay
        eyemedCopays['tier_4'] = eyemedAuth.progressiveTier4Copay
        eyemedCopays['tier_5'] = eyemedAuth.progressiveTier5Copay

        // Material copays
        eyemedCopays['polycarbonate'] = eyemedAuth.polycarbonateAdultCopay
        eyemedCopays['photochromic'] = eyemedAuth.photochromicCopay
        eyemedCopays['high_index_167'] = eyemedAuth.highIndex167Copay
        eyemedCopays['high_index_174'] = eyemedAuth.highIndex174Copay
        eyemedCopays['trivex'] = eyemedAuth.trivexCopay
        eyemedCopays['polarized'] = eyemedAuth.polarizedCopay
        eyemedCopays['tint'] = eyemedAuth.tintCopay

        // AR copays
        if (eyemedAuth.arCoatingCopays) {
          for (const ar of eyemedAuth.arCoatingCopays) {
            eyemedCopays[`ar_${ar.tier}`] = ar.copay ? parseFloat(ar.copay) : null
          }
        }
      }
    } else if (authResult?.carrier === 'spectera') {
      const specteraAuth = await prisma.specteraAuthorization.findFirst({
        where: { id: authResult.authorizationId },
        include: { arCoatingCopays: true }
      })
      if (specteraAuth) {
        examCopay = specteraAuth.examCopay
        frameAllowance = specteraAuth.frameAllowance
        frameOverageDiscount = specteraAuth.frameOveragePercent ? 1 - (specteraAuth.frameOveragePercent / 100) : null
        contactAllowance = specteraAuth.nonSelectionClAllowance

        // Progressive copays (Roman numerals)
        specteraCopays['I'] = specteraAuth.progressiveTier1Copay
        specteraCopays['II'] = specteraAuth.progressiveTier2Copay
        specteraCopays['III'] = specteraAuth.progressiveTier3Copay
        specteraCopays['IV'] = specteraAuth.progressiveTier4Copay
        specteraCopays['V'] = specteraAuth.progressiveTier5Copay

        // Material copays
        specteraCopays['polycarbonate'] = specteraAuth.polycarbonateAdultCopay
        specteraCopays['photochromic'] = specteraAuth.photochromicCopay
        specteraCopays['high_index_166'] = specteraAuth.highIndex166
        specteraCopays['high_index_167'] = specteraAuth.highIndex167to173
        specteraCopays['high_index_174'] = specteraAuth.highIndex174Copay
        specteraCopays['trivex'] = specteraAuth.trivexCopay
        specteraCopays['polarized'] = specteraAuth.polarizedCopay
        specteraCopays['tint'] = specteraAuth.tintCopay

        // AR copays
        if (specteraAuth.arCoatingCopays) {
          for (const ar of specteraAuth.arCoatingCopays) {
            specteraCopays[`ar_${ar.tier}`] = ar.copay ? parseFloat(ar.copay) : null
          }
        }
      }
    }

    // Get all active products with categories (lens products, frames, etc.)
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { category: true }
    })

    // Get all active services (exams, CL fittings, procedures)
    const services = await prisma.servicePrice.findMany({
      where: { isActive: true }
    })

    // Build carrier tier lookup map from unified carrier_tiers table
    // This replaces the old product.tierVsp/tierEyemed/tierSpectera column reads
    let carrierTierMap: Map<string, CarrierTierLookup> = new Map()
    if (insuranceCarrier) {
      carrierTierMap = await buildCarrierTierMap(insuranceCarrier)
      console.log(`[PriceMapping] Loaded ${carrierTierMap.size} tier mappings for ${insuranceCarrier}`)
    }

    const priceMappings: Array<{
      customerId: string
      productId: string
      authorizationId?: string
      authorizationType?: string
      finalPrice: number  // Always set - no undefined/null
      retailPrice: number
      savings: number
      insuranceCarrier?: string
      tier?: string
      needsTierAssignment: boolean  // True if using fallback pricing
      active: boolean
    }> = []

    const missingKeyProducts: string[] = []
    let mappedCount = 0     // Products with tier-based pricing
    let fallbackCount = 0   // Products using 80% retail fallback

    console.log(`[PriceMapping] Starting price generation for customer ${customerId}`)
    console.log(`[PriceMapping] Carrier: ${insuranceCarrier || 'none'}, Auth ID: ${authorizationId || 'none'}`)
    console.log(`[PriceMapping] VSP Copays available: ${vspCopays.size} codes`)
    if (vspCopays.size > 0) {
      console.log(`[PriceMapping] VSP Codes: ${Array.from(vspCopays.keys()).join(', ')}`)
    }

    for (const product of products) {
      const categoryCode = product.category?.code
      let tier: string | null = null
      let customerPrice: number | null = null // NULL means needs manual entry

      // Look up tier from unified carrier_tiers table (replaces product.tierVsp/tierEyemed/tierSpectera)
      const productTier = getTierForProduct(carrierTierMap, 'PRODUCT', product.id)
      const tierCode = productTier?.tierCode || null
      const pricingRule = productTier?.pricingRule || null

      if (authResult && insuranceCarrier) {
        // === EXAMS ===
        if (categoryCode === 'EXAMS') {
          if (tierCode === 'exam_copay' || tierCode === 'covered' || tierCode === 'EXAM') {
            customerPrice = examCopay // NULL if not scanned
            tier = 'exam-copay'
          } else if (tierCode === 'CONTACT_EXAM' || tierCode === 'contact_exam') {
            // Contact lens exam - use CL exam copay if available
            customerPrice = contactLensExamCopay ?? examCopay
            tier = 'contact-exam'
          }
        }
        // === CONTACT LENS FITTING ===
        else if (categoryCode === 'CONTACT_FITTING') {
          if (insuranceCarrier === 'VSP') {
            if (contactFittingCovered) {
              customerPrice = 0
              tier = 'covered'
            } else if (contactLensExamCopay !== null) {
              // Use CL exam copay as fitting copay (common VSP pattern)
              customerPrice = contactLensExamCopay
              tier = 'cl-fitting'
            }
          } else if (tierCode) {
            // EyeMed/Spectera: lookup copay by tier code
            if (insuranceCarrier === 'EYEMED') {
              customerPrice = eyemedCopays[tierCode] ?? null
            } else if (insuranceCarrier === 'SPECTERA') {
              customerPrice = specteraCopays[tierCode] ?? null
            }
            tier = tierCode
          }
        }
        // === PROGRESSIVE LENSES ===
        else if (categoryCode === 'PROGRESSIVE_LENSES') {
          if (tierCode) {
            if (insuranceCarrier === 'VSP') {
              customerPrice = getVspCopay(tierCode, vspCopays, true)
            } else if (insuranceCarrier === 'EYEMED') {
              customerPrice = eyemedCopays[tierCode] ?? null
            } else if (insuranceCarrier === 'SPECTERA') {
              customerPrice = specteraCopays[tierCode] ?? null
            }
            tier = tierCode
          }
        }
        // === AR COATINGS ===
        else if (categoryCode === 'AR_COATINGS') {
          if (tierCode) {
            if (insuranceCarrier === 'VSP') {
              customerPrice = getVspCopay(tierCode, vspCopays, true)
            } else if (insuranceCarrier === 'EYEMED') {
              customerPrice = eyemedCopays[`ar_${tierCode}`] ?? null
            } else if (insuranceCarrier === 'SPECTERA') {
              customerPrice = specteraCopays[`ar_${tierCode}`] ?? null
            }
            tier = tierCode
          }
        }
        // === LENS MATERIALS ===
        else if (categoryCode === 'LENS_MATERIALS') {
          // Handle "standard" tier (CR-39) - covered with materials copay
          if (tierCode === 'standard' || tierCode === 'covered' || pricingRule === 'INCLUDED') {
            customerPrice = 0 // Covered - part of base lens benefit
            tier = 'covered'
          } else if (tierCode) {
            if (insuranceCarrier === 'VSP') {
              customerPrice = getVspCopay(tierCode, vspCopays, true)
            } else if (insuranceCarrier === 'EYEMED') {
              customerPrice = eyemedCopays[tierCode] ?? null
            } else if (insuranceCarrier === 'SPECTERA') {
              customerPrice = specteraCopays[tierCode] ?? null
            }
            tier = tierCode
          }
        }
        // === FRAMES ===
        else if (categoryCode === 'FRAMES') {
          if (frameAllowance !== null) {
            const applicableAllowance = frameAllowanceFeatured && tierCode === 'featured'
              ? frameAllowanceFeatured
              : frameAllowance

            if (product.basePrice <= applicableAllowance) {
              customerPrice = 0
            } else {
              const overage = product.basePrice - applicableAllowance
              if (frameOverageDiscount !== null) {
                customerPrice = Math.round((overage * (1 - frameOverageDiscount)) * 100) / 100
              } else {
                customerPrice = overage
              }
            }
            tier = tierCode === 'featured' ? 'featured-frame' : 'frame-allowance'
          }
          // If no frame allowance scanned, customerPrice stays NULL
        }
        // === MOUNT_FEES ===
        // VSP: standard (full rim) and semi_rimless (grooved) are covered at $0
        // SW (rimless drill) and SP (roll & polish) use enhancement copays
        else if (categoryCode === 'MOUNT_FEES') {
          if (tierCode) {
            // Full rim and semi-rimless/grooved are covered at no charge
            if (tierCode === 'standard' || tierCode === 'semi_rimless' || tierCode === 'groove' || pricingRule === 'INCLUDED') {
              customerPrice = 0
              tier = tierCode
            } else {
              // SW (rimless drill), SP (roll & polish) - use enhancement copays
              if (insuranceCarrier === 'VSP') {
                customerPrice = getVspCopay(tierCode, vspCopays, true)
              } else if (insuranceCarrier === 'EYEMED') {
                customerPrice = eyemedCopays[tierCode] ?? null
              } else if (insuranceCarrier === 'SPECTERA') {
                customerPrice = specteraCopays[tierCode] ?? null
              }
              tier = tierCode
            }
          }
        }
        // === PHOTOCHROMIC ===
        else if (categoryCode === 'PHOTOCHROMIC') {
          if (tierCode) {
            if (insuranceCarrier === 'VSP') {
              customerPrice = getVspCopay(tierCode, vspCopays, true)
            } else if (insuranceCarrier === 'EYEMED') {
              customerPrice = eyemedCopays['photochromic'] ?? null
            } else if (insuranceCarrier === 'SPECTERA') {
              customerPrice = specteraCopays['photochromic'] ?? null
            }
            tier = tierCode
          }
        }
        // === SINGLE VISION ===
        else if (categoryCode === 'SINGLE_VISION_LENSES') {
          if (tierCode === 'standard' || tierCode === 'covered' || tierCode === 'COVERED' || pricingRule === 'INCLUDED') {
            customerPrice = 0 // Covered after materials copay
            tier = 'covered'
          } else if (tierCode) {
            if (insuranceCarrier === 'VSP') {
              // Digital SV (Eyezen, etc.) with tier code BA or other
              customerPrice = getVspCopay(tierCode, vspCopays, false) // prefer SV copay
            } else if (insuranceCarrier === 'EYEMED') {
              customerPrice = eyemedCopays[tierCode] ?? null
            } else if (insuranceCarrier === 'SPECTERA') {
              customerPrice = specteraCopays[tierCode] ?? null
            }
            tier = tierCode
          }
        }
        // === LINED MULTIFOCAL ===
        else if (categoryCode === 'LINED_MULTIFOCAL') {
          if (tierCode === 'standard' || tierCode === 'covered' || tierCode === 'COVERED' || tierCode === 'AA' || pricingRule === 'INCLUDED') {
            customerPrice = 0 // Covered after materials copay
            tier = 'covered'
          } else if (tierCode) {
            if (insuranceCarrier === 'VSP') {
              customerPrice = getVspCopay(tierCode, vspCopays, true)
            }
            tier = tierCode
          }
        }
        // === POLARIZED ===
        else if (categoryCode === 'POLARIZED') {
          if (tierCode) {
            if (insuranceCarrier === 'VSP') {
              customerPrice = getVspCopay(tierCode, vspCopays, true)
            } else if (insuranceCarrier === 'EYEMED') {
              customerPrice = eyemedCopays['polarized'] ?? null
            } else if (insuranceCarrier === 'SPECTERA') {
              customerPrice = specteraCopays['polarized'] ?? null
            }
            tier = tierCode
          }
        }
        // === FALLBACK - try tier lookup ===
        else {
          if (tierCode) {
            if (insuranceCarrier === 'VSP') {
              customerPrice = getVspCopay(tierCode, vspCopays, true)
              if (customerPrice !== null) {
                tier = tierCode
              }
            } else if (insuranceCarrier === 'EYEMED') {
              customerPrice = eyemedCopays[tierCode] ?? null
              tier = tierCode
            } else if (insuranceCarrier === 'SPECTERA') {
              customerPrice = specteraCopays[tierCode] ?? null
              tier = tierCode
            }
          }
        }
      }

      // Determine final price and whether it's using fallback
      let needsTierAssignment = false
      let finalPrice: number

      // Check if product is cash pay only - no tier mapping in carrier_tiers for ANY carrier
      // A product is cash-pay if it has no tier mapping for the current carrier
      const isCashPayOnly = !productTier || pricingRule === 'CASH_ONLY'

      if (customerPrice !== null) {
        // Has tier-based pricing from authorization
        finalPrice = customerPrice
        mappedCount++
      } else if (isCashPayOnly) {
        // Cash pay only product - full retail, no insurance discount
        finalPrice = product.basePrice
        tier = 'cash-pay'  // Mark as intentionally cash pay
        needsTierAssignment = false  // Not missing a tier, intentionally cash pay
        mappedCount++  // Count as mapped since it's correctly priced
      } else {
        // Has tier codes but no mapping found - use 80% of retail (20% off) as fallback
        finalPrice = Math.round(product.basePrice * (1 - FALLBACK_DISCOUNT) * 100) / 100
        needsTierAssignment = true
        fallbackCount++

        // Track key categories that need tier assignment
        if (categoryCode && KEY_CATEGORIES.includes(categoryCode)) {
          missingKeyProducts.push(`${product.name} (${categoryCode})`)
        }
      }

      const savings = Math.max(0, product.basePrice - finalPrice)

      priceMappings.push({
        customerId,
        productId: product.id,
        authorizationId: authorizationId ?? undefined,
        authorizationType: authResult?.carrier ?? undefined,
        finalPrice,  // Always a number, never undefined
        retailPrice: product.basePrice,
        savings,
        insuranceCarrier: insuranceCarrier ?? undefined,
        tier: tier ?? undefined,
        needsTierAssignment,
        active: true
      })
    }

    // =========================================================================
    // PROCESS SERVICES (Exams, CL Fittings, Procedures)
    // =========================================================================
    console.log(`[PriceMapping] Processing ${services.length} services`)

    for (const service of services) {
      let tier: string | null = null
      let customerPrice: number | null = null
      const serviceCategory = service.category

      // Look up tier from unified carrier_tiers table for services
      const serviceTier = getTierForProduct(carrierTierMap, 'SERVICE', service.id)
      const serviceTierCode = serviceTier?.tierCode || null
      const servicePricingRule = serviceTier?.pricingRule || null

      if (authResult && insuranceCarrier) {
        // === EXAM SERVICES ===
        if (serviceCategory === 'EXAM') {
          // Refraction is bundled with the exam - $0 cost
          if (service.name === 'Refraction' || servicePricingRule === 'INCLUDED') {
            customerPrice = 0
            tier = 'bundled'
          }
          // Routine Vision Exams use the vision plan exam copay
          else if (serviceTierCode === 'exam_copay' || service.name.toLowerCase().includes('routine')) {
            if (examCopay !== null) {
              customerPrice = examCopay
              tier = 'exam-copay'
            }
          }
          // Medical Exam = full retail (billed to medical insurance, not vision plan)
          else if (service.name === 'Medical Exam' || servicePricingRule === 'CASH_ONLY') {
            customerPrice = service.retailPrice
            tier = 'medical-retail'
          }
          // Comp/Interm Ophth services are medical billing codes - use fallback pricing
          // They're not selectable in POS (showInPos = false) but still need price entries
        }
        // === CONTACT LENS FITTINGS ===
        else if (serviceCategory === 'CONTACT_LENS_FIT') {
          const nameLower = service.name.toLowerCase()

          // Check if carrier_tiers says this is CASH_ONLY (specialty fittings)
          if (servicePricingRule === 'CASH_ONLY') {
            customerPrice = service.retailPrice
            tier = 'specialty-retail'
          }
          // Specialty fittings (Ortho-K, RGP, Scleral, MiSight, Specialty) - NOT covered
          // Patient pays full retail - these are specialty services outside vision plan
          else if (nameLower.includes('ortho-k') || nameLower.includes('rgp') ||
              nameLower.includes('specialty') || nameLower.includes('misight') ||
              nameLower.includes('scleral')) {
            customerPrice = service.retailPrice
            tier = 'specialty-retail'
          }
          // Standard soft lens fittings (Sphere, Toric, Multifocal, Monovision)
          // ALL use the same flat CL fitting copay from authorization
          else if (serviceTierCode === 'cl_fitting_copay' || nameLower.includes('sphere') || nameLower.includes('toric') ||
                   nameLower.includes('multifocal') || nameLower.includes('monovision')) {
            if (insuranceCarrier === 'VSP') {
              if (contactFittingCovered) {
                customerPrice = 0
                tier = 'cl-fit-covered'
              } else if (contactLensExamCopay !== null) {
                // Same flat copay for all standard fitting types
                customerPrice = contactLensExamCopay
                tier = 'cl-fit-copay'
              }
            } else if (insuranceCarrier === 'EYEMED') {
              // EyeMed standard fitting copay
              const auth = authResult.authorization
              if ('copays' in auth && typeof auth.copays === 'object' && auth.copays !== null) {
                const copays = auth.copays as Record<string, unknown>
                if (copays.clFitStandardCopay === 'covered') {
                  customerPrice = 0
                  tier = 'cl-fit-covered'
                } else if (typeof copays.clFitStandardCopay === 'number') {
                  customerPrice = copays.clFitStandardCopay
                  tier = 'cl-fit-standard'
                }
              }
            } else if (insuranceCarrier === 'SPECTERA') {
              // Spectera selection fitting
              const auth = authResult.authorization
              if ('copays' in auth && typeof auth.copays === 'object' && auth.copays !== null) {
                const copays = auth.copays as Record<string, unknown>
                if (typeof copays.selectionClFitCopay === 'number') {
                  customerPrice = copays.selectionClFitCopay
                  tier = 'cl-fit-selection'
                }
              }
            }
          }
        }
        // === PROCEDURES & DIAGNOSTICS ===
        // Check carrier_tiers for pricing rule
        else if (servicePricingRule === 'CASH_ONLY') {
          customerPrice = service.retailPrice
          tier = 'cash-pay'
        }
        // These are typically medical services, not vision plan covered
        // Use fallback pricing (80% retail)
      }

      // Determine final price
      let needsTierAssignment = false
      let finalPrice: number

      // Check if service is explicitly marked as cash-only
      const isServiceCashOnly = servicePricingRule === 'CASH_ONLY'

      if (customerPrice !== null) {
        finalPrice = customerPrice
        mappedCount++
      } else if (isServiceCashOnly) {
        // Cash pay service - full retail
        finalPrice = service.retailPrice
        tier = 'cash-pay'
        needsTierAssignment = false
        mappedCount++
      } else {
        // Use 80% of retail as fallback
        finalPrice = Math.round(service.retailPrice * (1 - FALLBACK_DISCOUNT) * 100) / 100
        needsTierAssignment = true
        fallbackCount++
      }

      const savings = Math.max(0, service.retailPrice - finalPrice)

      priceMappings.push({
        customerId,
        productId: service.id,  // Service ID stored as productId
        authorizationId: authorizationId ?? undefined,
        authorizationType: authResult?.carrier ?? undefined,
        finalPrice,
        retailPrice: service.retailPrice,
        savings,
        insuranceCarrier: insuranceCarrier ?? undefined,
        tier: tier ?? undefined,
        needsTierAssignment,
        active: true
      })
    }

    console.log(`[PriceMapping] Total mappings: ${priceMappings.length} (${products.length} products + ${services.length} services)`)

    // Delete existing price mappings for this customer AND carrier only
    // This preserves prices from other carriers
    console.log(`[PriceMapping] Deleting existing mappings for customer ${customerId}, carrier: ${insuranceCarrier || 'all'}`)
    const deleteResult = await prisma.customerPriceList.deleteMany({
      where: {
        customerId,
        insuranceCarrier: insuranceCarrier ?? undefined
      }
    })
    console.log(`[PriceMapping] Deleted ${deleteResult.count} existing mappings`)

    // Create new price mappings
    console.log(`[PriceMapping] Creating ${priceMappings.length} new price mappings`)
    console.log(`[PriceMapping] Sample mapping: ${JSON.stringify(priceMappings[0])}`)

    const createResult = await prisma.customerPriceList.createMany({
      data: priceMappings
    })
    console.log(`[PriceMapping] Created ${createResult.count} price mappings`)

    // Verify the mappings were created
    const verifyCount = await prisma.customerPriceList.count({
      where: { customerId, active: true }
    })
    console.log(`[PriceMapping] Verification: ${verifyCount} active mappings in database for customer`)

    console.log(`[PriceMapping] ✅ Complete for customer ${customerId} (${insuranceCarrier})`)
    console.log(`[PriceMapping] Tier-based: ${mappedCount}, Fallback (80% retail): ${fallbackCount}`)
    if (missingKeyProducts.length > 0) {
      console.log(`[PriceMapping] ⚠️ Key products needing tier assignment: ${missingKeyProducts.slice(0, 10).join(', ')}${missingKeyProducts.length > 10 ? '...' : ''}`)
    }

    return {
      success: true,
      customerId,
      carrier: insuranceCarrier,
      authorizationId,
      totalProducts: products.length + services.length,  // Products + Services
      mappedProducts: mappedCount,
      fallbackProducts: fallbackCount,
      missingKeyProducts: missingKeyProducts.slice(0, 20) // Limit to first 20
    }
  } catch (error) {
    console.error('[PriceMapping] ❌ Error:', error)
    return {
      success: false,
      customerId,
      carrier: null,
      authorizationId: null,
      totalProducts: 0,
      mappedProducts: 0,
      fallbackProducts: 0,
      missingKeyProducts: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get all carriers that have price lists for a customer
 */
export async function getCustomerCarriers(customerId: string): Promise<string[]> {
  const carriers = await prisma.customerPriceList.findMany({
    where: { customerId, active: true },
    select: { insuranceCarrier: true },
    distinct: ['insuranceCarrier']
  })

  return carriers
    .map(c => c.insuranceCarrier)
    .filter((c): c is string => c !== null)
}

/**
 * Get price list statistics for a customer
 */
export async function getPriceListStats(customerId: string, carrier?: string) {
  const where = {
    customerId,
    active: true,
    ...(carrier ? { insuranceCarrier: carrier.toUpperCase() } : {})
  }

  const [total, withPrice, needsManual] = await Promise.all([
    prisma.customerPriceList.count({ where }),
    prisma.customerPriceList.count({ where: { ...where, finalPrice: { not: null } } }),
    prisma.customerPriceList.count({ where: { ...where, finalPrice: null, customPrice: null } })
  ])

  return {
    total,
    withPrice,
    needsManual,
    coverage: total > 0 ? Math.round((withPrice / total) * 100) : 0
  }
}
