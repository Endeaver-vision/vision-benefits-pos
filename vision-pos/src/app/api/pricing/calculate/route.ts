/**
 * Pricing Calculate API
 * POST /api/pricing/calculate
 *
 * Calculates insurance pricing for products based on customer's active authorization.
 * Uses the unified insurance_authorizations table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
// import { EYEMED_TIER_TO_COPAY, VSP_TIER_TO_COPAY, SPECTERA_TIER_TO_COPAY } from '@/lib/data/insurance-tier-mappings'
// TODO: These tier mappings are not implemented - pricing calculate endpoint needs refactoring

// Type for the copays JSON structure in unified authorization table
interface CopaysJson {
  examCopay?: number
  materialsCopay?: number
  singleVision?: number
  bifocal?: number
  trifocal?: number
  progressiveStandard?: number
  progressiveTier1?: number
  progressiveTier2?: number
  progressiveTier3?: number
  progressiveTier4?: number
  progressiveTier5?: number
  arStandard?: number
  arTier1?: number
  arTier2?: number
  arTier3?: number
  polycarbonate?: number
  polycarbonateChild?: number
  trivex?: number
  highIndex167?: number
  highIndex174?: number
  photochromic?: number
  polarized?: number
  blueLight?: number
  tint?: number
  uvTreatment?: number
  scratchCoating?: number
  [key: string]: number | undefined
}

export interface PricingRequest {
  customerId: string
  products: Array<{
    sku: string
    productType: 'progressive' | 'ar_coating' | 'frame' | 'lens_sv' | 'material' | 'photochromic' | 'polarized' | 'blue_light' | 'tint' | 'mount_fee' | 'exam' | 'other'
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

    // Get active authorization from unified table
    const auth = await prisma.insuranceAuthorization.findFirst({
      where: {
        customerId: body.customerId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const warnings: string[] = []

    if (!auth) {
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

    const carrier = auth.carrier.toUpperCase()
    const planName = auth.planName
    const copays = (auth.copays as CopaysJson) || {}

    // Check if this is a declining balance plan
    const isDecliningBalance = auth.benefitStructure === 'DECLINING_BALANCE'
    const totalMaterialsAllowance = auth.totalMaterialsAllowance ? Number(auth.totalMaterialsAllowance) : 0
    const overageDiscountFrame = auth.overageDiscountFrame ? Number(auth.overageDiscountFrame) / 100 : 0.20

    // Get copays from authorization
    const examCopay = auth.examCopay ? Number(auth.examCopay) : (copays.examCopay ?? 0)
    const materialsCopay = auth.materialsCopay ? Number(auth.materialsCopay) : (copays.materialsCopay ?? 0)
    const frameAllowance = auth.frameAllowance ? Number(auth.frameAllowance) : null
    const frameOverageDiscount = 0.20 // Standard 20% discount on overage

    // Get tier-to-copay mapping for this carrier
    const tierToCopay = getTierToCopayMap(carrier)

    // =============================================================================
    // DECLINING BALANCE PRICING - Unified allowance covers all materials
    // =============================================================================
    if (isDecliningBalance) {
      // For declining balance: all materials consume from a unified pool at retail price
      // Patient pays only overage (with discount)
      const materialsItems = body.products.filter(p =>
        p.productType !== 'exam' // Exclude exam from materials pool
      )

      const totalRetail = materialsItems.reduce((sum, p) => sum + p.retailPrice, 0)
      const creditApplied = Math.min(totalRetail, totalMaterialsAllowance)
      const overage = Math.max(0, totalRetail - totalMaterialsAllowance)
      const overageDiscountAmount = overage * overageDiscountFrame
      const patientPaysOverage = overage - overageDiscountAmount

      // Build items - for declining balance, show retail price and allocation from pool
      const items: PricingResponse['items'] = body.products.map(product => {
        if (product.productType === 'exam') {
          // Exam uses copay, not declining balance
          return {
            sku: product.sku,
            productName: product.productName || product.sku,
            retailPrice: product.retailPrice,
            patientCopay: examCopay,
            insurancePays: product.retailPrice - examCopay,
            savings: product.retailPrice - examCopay,
            tierUsed: 'exam-copay',
            notes: `$${examCopay} exam copay`,
          }
        }

        // For declining balance, proportionally allocate the pool
        const proportionOfTotal = totalRetail > 0 ? product.retailPrice / totalRetail : 0
        const creditForThisItem = creditApplied * proportionOfTotal
        const overageForThisItem = overage * proportionOfTotal
        const overageDiscountForItem = overageForThisItem * overageDiscountFrame
        const patientPaysForItem = Math.round((overageForThisItem - overageDiscountForItem) * 100) / 100

        return {
          sku: product.sku,
          productName: product.productName || product.sku,
          retailPrice: product.retailPrice,
          patientCopay: patientPaysForItem,
          insurancePays: creditForThisItem + overageDiscountForItem,
          savings: creditForThisItem + overageDiscountForItem,
          tierUsed: 'declining-balance',
          notes: creditForThisItem >= product.retailPrice
            ? 'Covered by declining balance'
            : `${Math.round(overageDiscountFrame * 100)}% off overage`,
        }
      })

      const retailTotal = items.reduce((sum, item) => sum + item.retailPrice, 0)
      const patientTotal = items.reduce((sum, item) => sum + item.patientCopay, 0)
      const insuranceTotal = items.reduce((sum, item) => sum + item.insurancePays, 0)
      const totalSavings = items.reduce((sum, item) => sum + item.savings, 0)

      return NextResponse.json({
        success: true,
        data: {
          customerId: body.customerId,
          carrier: carrier.toLowerCase(),
          planName,
          benefitStructure: 'DECLINING_BALANCE',
          decliningBalance: {
            totalAllowance: totalMaterialsAllowance,
            totalRetail,
            creditApplied,
            overage,
            overageDiscount: overageDiscountFrame * 100,
            overageDiscountAmount,
            creditRemaining: Math.max(0, totalMaterialsAllowance - totalRetail),
          },
          items,
          summary: {
            retailTotal,
            patientTotal,
            insuranceTotal,
            totalSavings,
            examCopay,
            materialsCopay: 0, // No materials copay for declining balance
          },
          warnings: warnings.length > 0 ? warnings : undefined,
        } as PricingResponse,
      })
    }

    // =============================================================================
    // COPAY-BASED PRICING - Traditional copay structure
    // =============================================================================

    // Look up tier codes for all products from the lens_products table
    const productSkus = body.products.map(p => p.sku)
    const lensProducts = await prisma.lensProduct.findMany({
      where: {
        sku: { in: productSkus },
      },
    })

    // Create a map of sku -> tier code
    const tierCodeMap = new Map<string, string | null>()
    for (const product of lensProducts) {
      let tierCode: string | null = null
      if (carrier === 'VSP') {
        tierCode = product.tierVsp
      } else if (carrier === 'EYEMED') {
        tierCode = product.tierEyemed
      } else if (carrier === 'SPECTERA') {
        tierCode = product.tierSpectera
      }
      tierCodeMap.set(product.sku, tierCode)
    }

    // Calculate pricing for each product
    const items: PricingResponse['items'] = []

    for (const product of body.products) {
      const tierCode = tierCodeMap.get(product.sku)
      let patientCopay = product.retailPrice
      let tierUsed: string | undefined
      let notes: string | undefined

      // Handle frame pricing separately (allowance-based)
      if (product.productType === 'frame') {
        if (frameAllowance !== null) {
          if (product.retailPrice <= frameAllowance) {
            patientCopay = 0
            tierUsed = 'frame-allowance'
            notes = `Covered by $${frameAllowance} allowance`
          } else {
            const overage = product.retailPrice - frameAllowance
            patientCopay = Math.round(overage * (1 - frameOverageDiscount) * 100) / 100
            tierUsed = 'frame-overage'
            notes = `$${frameAllowance} allowance + ${Math.round(frameOverageDiscount * 100)}% off overage`
          }
        } else {
          notes = 'No frame allowance found'
        }
      }
      // Handle tier-based pricing for other products
      else if (tierCode) {
        const copayField = tierToCopay[tierCode]

        if (copayField) {
          if (copayField === 'ZERO_COPAY') {
            patientCopay = 0
            tierUsed = tierCode
            notes = 'Covered by insurance'
          } else if (copayField === 'DISCOUNT_20_PERCENT') {
            patientCopay = Math.round(product.retailPrice * 0.80 * 100) / 100
            tierUsed = tierCode
            notes = '20% insurance discount'
          } else {
            const copayValue = copays[copayField]
            if (copayValue !== null && copayValue !== undefined) {
              patientCopay = copayValue
              tierUsed = tierCode
              notes = `Tier ${tierCode} copay`
            } else {
              notes = `Copay not found for tier ${tierCode}`
            }
          }
        } else {
          notes = `No copay mapping for tier ${tierCode}`
        }
      } else {
        notes = 'No tier mapping - retail price'
      }

      const insurancePays = Math.max(0, product.retailPrice - patientCopay)
      const savings = insurancePays

      items.push({
        sku: product.sku,
        productName: product.productName || product.sku,
        retailPrice: product.retailPrice,
        patientCopay,
        insurancePays,
        savings,
        tierUsed,
        notes,
      })
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
        carrier: carrier.toLowerCase(),
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

function getTierToCopayMap(carrier: string): Record<string, string> {
  // TODO: Tier mapping data not implemented - this endpoint needs refactoring
  // For now, return empty maps to allow the app to build
  switch (carrier) {
    case 'EYEMED':
      return {}
    case 'VSP':
      return {}
    case 'SPECTERA':
      return {}
    default:
      return {}
  }
}
