/**
 * Quote API
 * POST /api/quote - Get pricing for items from customer's pre-computed price list
 *
 * ARCHITECTURE: All prices come from patient_price_lists table.
 * NO real-time calculation - prices are pre-computed by generatePriceMapping().
 * Uses the unified insurance_authorizations table.
 *
 * Supports materials benefit exclusivity - when both glasses and contacts are in the quote,
 * only one category gets the insurance allowance (based on activeMaterialsBenefit parameter).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ProductCategory, QuoteLineItem, QuoteResult } from '@/types/product-catalog'

type MaterialsBenefitType = 'glasses' | 'contacts' | null

// Type for the copays JSON structure in unified authorization table
interface CopaysJson {
  examCopay?: number
  materialsCopay?: number
  examWellvision?: number
  exam?: number
  examAdult?: number
  materials?: number
  [key: string]: number | undefined
}

interface QuoteRequest {
  customerId: string
  items: Array<{
    sku: string
    category?: string  // 'frame' | 'lens' | 'contact' | 'service'
    pricingCategory?: string
    retailPrice?: number
    quantity?: number
    tierCode?: string
  }>
  // Materials benefit exclusivity - which category gets the insurance allowance
  activeMaterialsBenefit?: MaterialsBenefitType
}

// Product info fetched from database
interface ProductInfo {
  sku: string
  productId: string  // ID used in patient_price_lists
  name: string
  retailPrice: number
  category: string  // 'frame' | 'lens' | 'contact' | 'service'
  pricingCategory: string | null
  tierCode?: string | null  // For lenses - carrier tier
}

/**
 * POST - Get quote pricing from pre-computed patient_price_lists
 *
 * ALL PRICES come from patient_price_lists - NO real-time calculation.
 * Prices must be generated via generatePriceMapping() before quotes work.
 *
 * Supports materials benefit exclusivity:
 * - When activeMaterialsBenefit = 'glasses', frames/lenses use insurance price, contacts pay retail
 * - When activeMaterialsBenefit = 'contacts', contacts use insurance price, frames/lenses pay retail
 * - Services (exams, fittings) ALWAYS use insurance prices regardless of materials benefit
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequest = await request.json()
    const { customerId, items, activeMaterialsBenefit } = body

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required' },
        { status: 400 }
      )
    }

    console.log('[Quote API] Received', items.length, 'items for customer', customerId)

    // Get customer's active authorization from unified table
    const auth = await prisma.insuranceAuthorization.findFirst({
      where: {
        customerId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const carrier = auth?.carrier?.toUpperCase() || null
    const copays = auth ? (auth.copays as CopaysJson) || {} : {}

    // Fetch product info for display names and categories
    const productSkus = items.map(i => i.sku)
    const products = await fetchProductInfo(productSkus, carrier)

    // Fetch pre-computed prices from patient_price_lists
    const priceList = await prisma.patientPriceList.findMany({
      where: {
        customerId,
        active: true,
        insuranceCarrier: carrier || undefined,
      },
    })

    // Build a map of productId -> price entry
    const priceMap = new Map(priceList.map(p => [p.productId, p]))

    if (!auth) {
      // No authorization - return retail pricing for everything
      const lineItems: QuoteLineItem[] = items.map(item => {
        const product = products.get(item.sku)
        const retailPrice = item.retailPrice ?? product?.retailPrice ?? 0
        return {
          sku: item.sku,
          displayName: product?.name || 'Unknown Product',
          category: (product?.category || 'unknown') as ProductCategory,
          pricingCategory: product?.pricingCategory || null,
          retailPrice,
          patientCopay: retailPrice,
          insurancePays: 0,
          savings: 0,
          notes: product ? 'No insurance authorization' : 'Product not found',
        }
      })

      const retailTotal = lineItems.reduce((sum, item) => sum + item.retailPrice, 0)

      return NextResponse.json({
        success: true,
        quote: {
          authorizationId: null,
          carrier: null,
          planName: 'Cash/Self-Pay',
          items: lineItems,
          retailTotal,
          patientTotal: retailTotal,
          insuranceTotal: 0,
          totalSavings: 0,
          examCopay: null,
          materialsCopay: null,
          activeMaterialsBenefit: null,
          calculatedAt: new Date(),
          warnings: ['No active insurance authorization found'],
        },
      })
    }

    // Determine if glasses/contacts are exclusive (most plans are)
    const glassesContactsExclusive = true

    // Detect what's in the quote
    const hasGlassesMaterials = items.some(item => {
      const product = products.get(item.sku)
      return product?.category === 'frame' || product?.category === 'lens'
    })
    const hasContactMaterials = items.some(item => {
      const product = products.get(item.sku)
      return product?.category === 'contact'
    })

    // Determine which benefit is active
    let effectiveActiveBenefit: MaterialsBenefitType = activeMaterialsBenefit || null
    if (!effectiveActiveBenefit && hasGlassesMaterials && hasContactMaterials && glassesContactsExclusive) {
      effectiveActiveBenefit = 'glasses'
    } else if (!effectiveActiveBenefit && hasGlassesMaterials) {
      effectiveActiveBenefit = 'glasses'
    } else if (!effectiveActiveBenefit && hasContactMaterials) {
      effectiveActiveBenefit = 'contacts'
    }

    // Build line items from price list
    const lineItems: QuoteLineItem[] = []
    const warnings: string[] = []

    for (const item of items) {
      const product = products.get(item.sku)
      if (!product) {
        lineItems.push({
          sku: item.sku,
          displayName: 'Unknown Product',
          category: 'unknown' as ProductCategory,
          retailPrice: item.retailPrice || 0,
          patientCopay: item.retailPrice || 0,
          insurancePays: 0,
          savings: 0,
          notes: 'Product not found in catalog',
        })
        continue
      }

      // Look up pre-computed price from patient_price_lists
      // Use product.productId if available, otherwise try sku
      const priceEntry = priceMap.get(product.productId || item.sku)
      const retailPrice = item.retailPrice ?? product.retailPrice

      // Determine if this item should use insurance or pay retail
      const isService = product.category === 'service'
      const isGlassesMaterial = product.category === 'frame' || product.category === 'lens'
      const isContactMaterial = product.category === 'contact'

      const useInsurance = isService ||
        (isGlassesMaterial && effectiveActiveBenefit === 'glasses') ||
        (isContactMaterial && effectiveActiveBenefit === 'contacts') ||
        (!glassesContactsExclusive)

      let patientCopay: number
      let insurancePays: number
      let notes: string | undefined
      let tierUsed: string | undefined
      let needsTierAssignment = false

      if (!useInsurance) {
        // This category doesn't get insurance - patient pays retail
        patientCopay = retailPrice
        insurancePays = 0
        notes = isGlassesMaterial
          ? 'Glasses benefit not active (contacts selected)'
          : 'Contacts benefit not active (glasses selected)'
      } else if (priceEntry && priceEntry.finalPrice !== null) {
        // Use pre-computed price from price list
        patientCopay = Number(priceEntry.finalPrice)
        insurancePays = Math.max(0, retailPrice - patientCopay)
        tierUsed = priceEntry.tier || undefined
        needsTierAssignment = priceEntry.needsTierAssignment || false
        if (needsTierAssignment) {
          notes = 'Using fallback pricing (80% retail) - needs tier assignment'
        }
      } else {
        // No price in list - this shouldn't happen if prices were generated
        patientCopay = retailPrice
        insurancePays = 0
        notes = 'No price in customer price list - run price generation'
        warnings.push(`Product "${product.name}" has no price entry`)
      }

      lineItems.push({
        sku: product.sku,
        displayName: product.name,
        category: product.category as ProductCategory,
        pricingCategory: product.pricingCategory,
        retailPrice,
        patientCopay,
        insurancePays,
        savings: insurancePays,
        tierUsed,
        notes,
        needsTierAssignment,
      })
    }

    // Add warning if both materials present
    if (hasGlassesMaterials && hasContactMaterials && glassesContactsExclusive) {
      warnings.push(
        `Both glasses and contacts in quote. ${effectiveActiveBenefit === 'glasses' ? 'Glasses' : 'Contacts'} using insurance allowance.`
      )
    }

    // Calculate totals
    const retailTotal = lineItems.reduce((sum, item) => sum + item.retailPrice, 0)
    const patientTotal = lineItems.reduce((sum, item) => sum + item.patientCopay, 0)
    const insuranceTotal = lineItems.reduce((sum, item) => sum + item.insurancePays, 0)
    const totalSavings = lineItems.reduce((sum, item) => sum + item.savings, 0)

    // Get exam and materials copays from authorization for display
    const carrierUpper = carrier?.toUpperCase()
    let examCopay: number | null = null
    let materialsCopay: number | null = null

    if (carrierUpper === 'VSP') {
      examCopay = copays.examWellvision ?? auth.examCopay ? Number(auth.examCopay) : null
      materialsCopay = copays.materials ?? auth.materialsCopay ? Number(auth.materialsCopay) : null
    } else if (carrierUpper === 'EYEMED') {
      examCopay = copays.exam ?? auth.examCopay ? Number(auth.examCopay) : null
      materialsCopay = copays.materials ?? auth.materialsCopay ? Number(auth.materialsCopay) : null
    } else if (carrierUpper === 'SPECTERA') {
      examCopay = copays.examAdult ?? auth.examCopay ? Number(auth.examCopay) : null
      materialsCopay = copays.materials ?? auth.materialsCopay ? Number(auth.materialsCopay) : null
    } else {
      // Fallback for other carriers
      examCopay = auth.examCopay ? Number(auth.examCopay) : null
      materialsCopay = auth.materialsCopay ? Number(auth.materialsCopay) : null
    }

    const quote: QuoteResult = {
      authorizationId: auth.id,
      carrier: carrierUpper || null,
      planName: auth.planName || 'Unknown Plan',
      items: lineItems,
      retailTotal,
      patientTotal,
      insuranceTotal,
      totalSavings,
      examCopay,
      materialsCopay,
      activeMaterialsBenefit: effectiveActiveBenefit,
      calculatedAt: new Date(),
      warnings: warnings.length > 0 ? warnings : undefined,
    }

    return NextResponse.json({
      success: true,
      quote,
      authorization: {
        id: auth.id,
        carrier,
        planName: auth.planName,
        examCopay,
        materialsCopay,
        glassesContactsExclusive,
      },
    })

  } catch (error) {
    console.error('[Quote API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get quote pricing',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Fetch product info from database for quote pricing
 * Returns simplified ProductInfo with pricingCategory and tier codes
 *
 * Uses LensProduct, Frame, ServicePrice, and ContactLens tables.
 */
async function fetchProductInfo(skus: string[], carrier: string | null): Promise<Map<string, ProductInfo>> {
  const products = new Map<string, ProductInfo>()

  // Fetch from LensProduct table (primary source for lens products)
  const lensProducts = await prisma.lensProduct.findMany({
    where: {
      OR: [
        { sku: { in: skus } },
        { id: { in: skus } }
      ],
      active: true,
    },
  })

  for (const product of lensProducts) {
    const key = product.sku || product.id
    if (!products.has(key)) {
      // Get tier code based on carrier
      let tierCode: string | undefined
      if (carrier === 'VSP') tierCode = product.tierVsp || undefined
      else if (carrier === 'EYEMED') tierCode = product.tierEyemed || undefined
      else if (carrier === 'SPECTERA') tierCode = product.tierSpectera || undefined

      products.set(key, {
        sku: key,
        productId: product.id,
        name: product.name,
        retailPrice: product.basePrice,  // LensProduct uses basePrice
        category: 'lens',
        pricingCategory: product.category || null,
        tierCode,
      })
    }
  }

  // Fetch from Frame table
  const frames = await prisma.frame.findMany({
    where: {
      OR: [
        { sku: { in: skus } },
        { id: { in: skus } }
      ],
      isActive: true,
    },
  })

  for (const frame of frames) {
    const key = frame.sku || frame.id
    if (!products.has(key)) {
      products.set(key, {
        sku: key,
        productId: frame.id,  // Frame ID - may not be in price list
        name: `${frame.brand} ${frame.model}`,
        retailPrice: frame.retailPrice,
        category: 'frame',
        pricingCategory: frame.pricingCategory || 'FRAME',
      })
    }
  }

  // Fetch from ServicePrice table
  const services = await prisma.servicePrice.findMany({
    where: {
      OR: [
        { sku: { in: skus } },
        { id: { in: skus } }
      ],
      isActive: true,
    },
  })

  for (const service of services) {
    const key = service.sku || service.id
    if (!products.has(key)) {
      products.set(key, {
        sku: key,
        productId: service.id,  // Service ID - may not be in price list
        name: service.name,
        retailPrice: service.retailPrice,
        category: 'service',
        pricingCategory: service.pricingCategory,
      })
    }
  }

  // Fetch from ContactLens table
  const contactLenses = await prisma.contactLens.findMany({
    where: {
      id: { in: skus },
      isActive: true,
    },
  })

  for (const cl of contactLenses) {
    if (!products.has(cl.id)) {
      products.set(cl.id, {
        sku: cl.id,
        productId: cl.id,  // ContactLens ID - may not be in price list
        name: cl.lensName,
        retailPrice: cl.retailPrice,
        category: 'contact',
        pricingCategory: cl.pricingCategory,
      })
    }
  }

  return products
}
