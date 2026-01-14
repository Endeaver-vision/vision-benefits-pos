import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createPricingCalculator,
  PricingResult,
  FramePricingResult,
} from '@/lib/services/pricing-calculator'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'
import { ProductCatalogEntry } from '@/types/product-catalog'

export interface PricingRequest {
  customerId: string
  products: Array<{
    sku: string
    productType: 'progressive' | 'ar_coating' | 'frame' | 'lens_sv' | 'material' | 'photochromic' | 'polarized' | 'blue_light' | 'tint' | 'mount_fee' | 'other'
    brand?: string
    productName?: string
    retailPrice: number
    isFeaturedBrand?: boolean // For VSP frame allowance
  }>
}

export interface PricingResponse {
  customerId: string
  carrier: string | null
  planName: string | null
  items: Array<{
    sku: string
    productName: string
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

export async function POST(request: NextRequest) {
  try {
    const body: PricingRequest = await request.json()

    if (!body.customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    if (!body.products || body.products.length === 0) {
      return NextResponse.json(
        { error: 'At least one product is required' },
        { status: 400 }
      )
    }

    // First, try to get authorization from carrier-specific tables
    const authResult = await getActiveAuthorizationForCustomer(body.customerId)

    const warnings: string[] = []
    let carrier: string | null = null
    let planName: string | null = null
    let examCopay = 0
    let materialsCopay = 0

    if (!authResult) {
      // No authorization found - calculate at retail prices
      warnings.push('No active authorization found - pricing at retail')

      const items = body.products.map(product => ({
        sku: product.sku,
        productName: product.productName || product.sku,
        retailPrice: product.retailPrice,
        patientCopay: product.retailPrice,
        insurancePays: 0,
        savings: 0,
        notes: 'No insurance coverage',
      }))

      const retailTotal = items.reduce((sum, item) => sum + item.retailPrice, 0)

      return NextResponse.json({
        success: true,
        data: {
          customerId: body.customerId,
          carrier: null,
          planName: null,
          items,
          summary: {
            retailTotal,
            patientTotal: retailTotal,
            insuranceTotal: 0,
            totalSavings: 0,
            examCopay: 0,
            materialsCopay: 0,
          },
          warnings,
        } as PricingResponse,
      })
    }

    // Use the authorization from the carrier-specific table
    const auth = authResult.authorization
    carrier = authResult.carrier
    planName = auth.plan.planName

    // Get copays from authorization
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const copays = auth.copays as any
    if (authResult.carrier === 'vsp') {
      examCopay = copays.examWellvision || 0
      materialsCopay = copays.materials || 0
    } else if (authResult.carrier === 'eyemed') {
      examCopay = copays.exam || 0
      materialsCopay = copays.materials || 0
    } else if (authResult.carrier === 'spectera') {
      examCopay = copays.examAdult || 0
      materialsCopay = copays.materials || 0
    }

    // Create carrier-specific pricing calculator
    const calculator = createPricingCalculator(auth)

    // Look up tier codes for all products from the unified carrier_tiers table
    const productSkus = body.products.map(p => p.sku)
    // Map carrier to uppercase format used in carrier_tiers table
    const carrierMap: Record<string, string> = {
      'vsp': 'VSP',
      'eyemed': 'EYEMED',
      'spectera': 'SPECTERA',
    }
    const tierCarrier = carrierMap[authResult.carrier] || authResult.carrier.toUpperCase()
    const tierMappings = await prisma.carrierTier.findMany({
      where: {
        productId: { in: productSkus },
        carrier: tierCarrier,
      },
    })

    // Create a map of productId -> tierCode for quick lookup
    const tierCodeMap = new Map<string, string>()
    for (const tier of tierMappings) {
      tierCodeMap.set(tier.productId, tier.tierCode)
    }

    // Calculate pricing for each product
    const items: PricingResponse['items'] = []

    for (const product of body.products) {
      // Get the tier code for this product
      const tierCode = tierCodeMap.get(product.sku)

      // Create a ProductCatalogEntry with carrier-specific tier mapping
      const catalogEntry: ProductCatalogEntry = {
        sku: product.sku,
        displayName: product.productName || product.sku,
        category: mapProductType(product.productType),
        retailPrice: product.retailPrice,
        isActive: true,
      }

      // Add carrier-specific mapping based on product type and tier code
      if (tierCode) {
        if (authResult.carrier === 'vsp') {
          catalogEntry.vsp = {
            isFeaturedBrand: product.isFeaturedBrand,
          }
          // Map tier code to VSP property based on product type
          if (product.productType === 'progressive') {
            catalogEntry.vsp.baseCode = tierCode as 'KA' | 'JA' | 'FA' | 'NA' | 'OA'
          } else if (product.productType === 'ar_coating') {
            catalogEntry.vsp.arCode = tierCode as 'QM' | 'QT' | 'QV'
          } else if (product.productType === 'material') {
            // Map VSP material codes (AD=poly, AB=hi-index 1.60, AH=hi-index 1.67)
            const materialMap: Record<string, 'D' | 'T' | 'H'> = {
              'AD': 'D', 'BD': 'D', 'DD': 'D', 'FD': 'D', 'JD': 'D', 'KD': 'D', 'ND': 'D', 'OD': 'D', // Poly codes
              'AB': 'T', // Trivex/1.60
              'AH': 'H', 'AJ': 'H', // High index
            }
            if (materialMap[tierCode]) {
              catalogEntry.vsp.materialModifier = materialMap[tierCode]
            }
          } else if (product.productType === 'mount_fee') {
            // Mount fee codes: standard, semi_rimless, SW (rimless)
            catalogEntry.vsp.baseCode = tierCode as 'standard' | 'semi_rimless' | 'SW'
          }
        } else if (authResult.carrier === 'eyemed') {
          catalogEntry.eyemed = {}
          if (product.productType === 'progressive') {
            catalogEntry.eyemed.progressiveTier = tierCode as 'standard' | 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5'
          } else if (product.productType === 'ar_coating') {
            catalogEntry.eyemed.arTier = tierCode as 'standard' | 'tier_1' | 'tier_2' | 'tier_3'
          } else if (product.productType === 'material') {
            const materialMap: Record<string, 'polycarbonate' | 'trivex' | 'high_index_167' | 'high_index_174'> = {
              'polycarbonate': 'polycarbonate',
              'trivex': 'trivex',
              'high_index_167': 'high_index_167',
              'high_index_174': 'high_index_174',
            }
            if (materialMap[tierCode]) {
              catalogEntry.eyemed.materialType = materialMap[tierCode]
            }
          } else if (product.productType === 'mount_fee') {
            // Mount fee codes: standard, semi_rimless, rimless
            catalogEntry.eyemed.materialType = tierCode as 'standard' | 'semi_rimless' | 'rimless'
          }
        } else if (authResult.carrier === 'spectera') {
          catalogEntry.spectera = {}
          if (product.productType === 'progressive') {
            catalogEntry.spectera.progressiveTier = tierCode as 'I' | 'II' | 'III' | 'IV' | 'V'
          } else if (product.productType === 'ar_coating') {
            catalogEntry.spectera.arTier = tierCode as 'I' | 'II' | 'III' | 'IV'
          } else if (product.productType === 'material') {
            const materialMap: Record<string, 'polycarbonate' | 'trivex' | 'high_index'> = {
              'polycarbonate': 'polycarbonate',
              'trivex': 'trivex',
              'high_index': 'high_index',
            }
            if (materialMap[tierCode]) {
              catalogEntry.spectera.materialType = materialMap[tierCode]
            }
          } else if (product.productType === 'mount_fee') {
            // Mount fee codes: standard, semi_rimless, rimless
            catalogEntry.spectera.materialType = tierCode as 'standard' | 'semi_rimless' | 'rimless'
          }
        }
      } else if (product.isFeaturedBrand !== undefined && authResult.carrier === 'vsp') {
        // VSP frame with no tier code, still set featured brand flag
        catalogEntry.vsp = { isFeaturedBrand: product.isFeaturedBrand }
      }

      let result: PricingResult | FramePricingResult

      if (product.productType === 'frame') {
        result = calculator.calculateFrame(
          catalogEntry,
          auth,
          product.retailPrice,
          product.isFeaturedBrand
        )
      } else {
        result = calculator.calculateProduct(
          catalogEntry,
          auth,
          product.retailPrice
        )
      }

      items.push({
        sku: result.sku,
        productName: result.displayName,
        retailPrice: result.retailPrice,
        patientCopay: result.patientCopay,
        insurancePays: result.insurancePays,
        savings: result.savings,
        tierUsed: result.tierUsed,
        notes: result.notes,
      })

      if (result.warnings) {
        warnings.push(...result.warnings)
      }
    }

    // Calculate totals
    const retailTotal = items.reduce((sum, item) => sum + item.retailPrice, 0)
    const patientTotal = items.reduce((sum, item) => sum + item.patientCopay, 0)
    const insuranceTotal = items.reduce((sum, item) => sum + item.insurancePays, 0)
    const totalSavings = items.reduce((sum, item) => sum + item.savings, 0)

    return NextResponse.json({
      success: true,
      data: {
        customerId: body.customerId,
        carrier,
        planName,
        items,
        summary: {
          retailTotal,
          patientTotal: patientTotal + materialsCopay, // Add materials copay to patient total
          insuranceTotal,
          totalSavings,
          examCopay,
          materialsCopay,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      } as PricingResponse,
    })
  } catch (error) {
    console.error('Pricing calculation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate pricing' },
      { status: 500 }
    )
  }
}

/**
 * Map API product type to ProductCategory
 */
function mapProductType(
  productType: string
): ProductCatalogEntry['category'] {
  switch (productType) {
    case 'progressive':
      return 'lens_progressive'
    case 'ar_coating':
      return 'ar_coating'
    case 'frame':
      return 'frame'
    case 'lens_sv':
      return 'lens_sv'
    case 'material':
      return 'material'
    case 'photochromic':
      return 'photochromic'
    case 'polarized':
      return 'polarized'
    case 'blue_light':
      return 'blue_light'
    case 'tint':
      return 'tint'
    case 'mount_fee':
      return 'mount_fee'
    default:
      return 'other'
  }
}
