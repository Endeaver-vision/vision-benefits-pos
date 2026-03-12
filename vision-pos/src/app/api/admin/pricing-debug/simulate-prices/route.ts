import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
// import { EYEMED_TIER_TO_COPAY, VSP_TIER_TO_COPAY, SPECTERA_TIER_TO_COPAY } from '@/lib/data/insurance-tier-mappings'
// TODO: These tier mappings are not implemented - simulate-prices endpoint needs refactoring

/**
 * POST /api/admin/pricing-debug/simulate-prices
 *
 * Simulates price calculation for all products given extracted insurance data.
 * This shows what the patient would pay WITHOUT saving to the database.
 */
export async function POST(request: NextRequest) {
  try {
    const { extractedData, carrier } = await request.json()

    if (!extractedData || !carrier) {
      return NextResponse.json(
        { success: false, error: 'Missing extractedData or carrier' },
        { status: 400 }
      )
    }

    // Build copays from extracted data
    const copays = buildCopaysFromExtraction(extractedData)

    // Get tier-to-copay mapping for this carrier
    const tierToCopay = getTierToCopayMap(carrier.toUpperCase())

    // Fetch all lens products
    const products = await prisma.lensProduct.findMany({
      where: { active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    // Calculate prices for each product
    const prices = products.map(product => {
      const tierCode = getProductTierCode(product, carrier.toUpperCase())

      let customerPrice = product.basePrice
      let tier: string | null = null
      let covered = false

      if (tierCode) {
        const copayField = tierToCopay[tierCode]

        if (copayField) {
          if (copayField === 'ZERO_COPAY') {
            customerPrice = 0
            tier = tierCode
            covered = true
          } else if (copayField === 'DISCOUNT_20_PERCENT') {
            customerPrice = Math.round(product.basePrice * 0.80 * 100) / 100
            tier = tierCode
            covered = true
          } else {
            const copayValue = copays[copayField]
            if (copayValue !== null && copayValue !== undefined) {
              customerPrice = copayValue
              tier = tierCode
              covered = true
            }
          }
        }
      }

      return {
        productName: product.name,
        category: formatCategory(product.category),
        retailPrice: product.basePrice,
        customerPrice,
        savings: Math.max(0, product.basePrice - customerPrice),
        tier,
        covered,
      }
    })

    return NextResponse.json({
      success: true,
      carrier: carrier.toUpperCase(),
      copaysUsed: copays,
      prices,
    })

  } catch (error) {
    console.error('[Simulate Prices] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function buildCopaysFromExtraction(extractedData: Record<string, unknown>): Record<string, number | null> {
  const copays: Record<string, number | null> = {}
  const ed = (extractedData.copays as Record<string, unknown>) || {}

  // Exam copay
  copays.examCopay = getNumericValue(ed, 'examCopay')

  // Single vision / bifocal / trifocal
  copays.singleVision = getNumericValue(ed, 'singleVisionCopay')
  copays.bifocal = getNumericValue(ed, 'bifocalCopay')
  copays.trifocal = getNumericValue(ed, 'trifocalCopay')

  // Progressive tiers
  const progCopays = (ed.progressiveCopays as Record<string, unknown>) || {}
  copays.progressiveStandard = getNumericValue(progCopays, 'standard')
  copays.progressiveTier1 = getNumericValue(progCopays, 'tier1')
  copays.progressiveTier2 = getNumericValue(progCopays, 'tier2')
  copays.progressiveTier3 = getNumericValue(progCopays, 'tier3')
  copays.progressiveTier4 = getNumericValue(progCopays, 'tier4')
  copays.progressiveTier5 = getNumericValue(progCopays, 'tier5')

  // AR coating tiers
  const arCopays = (ed.arCopays as Record<string, unknown>) || {}
  copays.arStandard = getNumericValue(arCopays, 'standard')
  copays.arTier1 = getNumericValue(arCopays, 'tier1')
  copays.arTier2 = getNumericValue(arCopays, 'tier2')
  copays.arTier3 = getNumericValue(arCopays, 'tier3')

  // Material copays
  const matCopays = (ed.materialCopays as Record<string, unknown>) || {}
  copays.polycarbonate = getNumericValue(matCopays, 'polycarbonate')
  copays.trivex = getNumericValue(matCopays, 'trivex')
  copays.highIndex167 = getNumericValue(matCopays, 'highIndex167')
  copays.highIndex174 = getNumericValue(matCopays, 'highIndex174')

  // Enhancement copays
  const enhCopays = (ed.enhancementCopays as Record<string, unknown>) || {}
  copays.photochromic = getNumericValue(enhCopays, 'photochromic')
  copays.polarized = getNumericValue(enhCopays, 'polarized')
  copays.tint = getNumericValue(enhCopays, 'tint')

  return copays
}

function getNumericValue(obj: Record<string, unknown>, key: string): number | null {
  const val = obj[key]
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return val
  if (typeof val === 'object' && 'value' in val) {
    const innerVal = (val as { value: unknown }).value
    if (typeof innerVal === 'number') return innerVal
  }
  return null
}

function getTierToCopayMap(carrier: string): Record<string, string> {
  switch (carrier) {
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

function getProductTierCode(
  product: { tierVsp?: string | null; tierEyemed?: string | null; tierSpectera?: string | null },
  carrier: string
): string | null {
  switch (carrier) {
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

function formatCategory(category: string): string {
  const map: Record<string, string> = {
    'single_vision': 'Single Vision',
    'progressive': 'Progressive',
    'bifocal': 'Bifocal',
    'trifocal': 'Trifocal',
    'ar_coating': 'AR Coating',
    'photochromic': 'Photochromic',
    'material': 'Lens Material',
    'mount_fee': 'Mount Fee',
    'addon': 'Add-ons',
    'tint': 'Tint',
    'polarized': 'Polarized',
  }
  return map[category] || category
}
