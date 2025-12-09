/**
 * Quote API
 * POST /api/quote - Calculate pricing for items based on customer's authorization
 *
 * This connects the pricing-by-category service to the frontend quote builder.
 * It fetches the customer's active authorization and calculates pricing for products.
 *
 * Supports materials benefit exclusivity - when both glasses and contacts are in the quote,
 * only one category gets the insurance allowance (based on activeMaterialsBenefit parameter).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'
import {
  calculateServicePricingByCategory,
  calculateFramePricing,
  calculateLensPricingByCategory,
  calculateContactLensPricing,
  PricingResult,
} from '@/lib/services/pricing-by-category'
import { ProductCategory, QuoteLineItem, QuoteResult } from '@/types/product-catalog'
import {
  BenefitAuthorization,
  isVspAuth,
  isEyemedAuth,
  isSpecteraAuth,
} from '@/types/benefit-authorization'

type MaterialsBenefitType = 'glasses' | 'contacts' | null

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
  name: string
  retailPrice: number
  category: string  // 'frame' | 'lens' | 'contact' | 'service'
  pricingCategory: string | null
  tierCode?: string | null  // For lenses - carrier tier
}

/**
 * POST - Calculate quote pricing using pricingCategory
 *
 * Supports materials benefit exclusivity:
 * - When activeMaterialsBenefit = 'glasses', frames/lenses use insurance allowance, contacts pay retail
 * - When activeMaterialsBenefit = 'contacts', contacts use insurance allowance, frames/lenses pay retail
 * - Services (exams, fittings) ALWAYS use insurance copays regardless of materials benefit
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

    // Get customer's active authorization
    const authResult = await getActiveAuthorizationForCustomer(customerId)
    const carrier = authResult?.carrier || null

    // Fetch products for the items
    const productSkus = items.map(i => i.sku)
    const products = await fetchProductInfo(productSkus, carrier)

    if (!authResult) {
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

    const { authorization } = authResult

    // Determine if glasses/contacts are exclusive (most plans are)
    const glassesContactsExclusive = true // VSP, EyeMed, Spectera all enforce this

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
    // If not specified and both present, default to glasses (first added typically)
    let effectiveActiveBenefit: MaterialsBenefitType = activeMaterialsBenefit || null
    if (!effectiveActiveBenefit && hasGlassesMaterials && hasContactMaterials && glassesContactsExclusive) {
      effectiveActiveBenefit = 'glasses' // Default to glasses if both present
    } else if (!effectiveActiveBenefit && hasGlassesMaterials) {
      effectiveActiveBenefit = 'glasses'
    } else if (!effectiveActiveBenefit && hasContactMaterials) {
      effectiveActiveBenefit = 'contacts'
    }

    // Calculate pricing for each item
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

      const retailPrice = item.retailPrice ?? product.retailPrice
      let pricing: PricingResult

      // Determine if this item should use insurance or pay retail
      const isService = product.category === 'service'
      const isGlassesMaterial = product.category === 'frame' || product.category === 'lens'
      const isContactMaterial = product.category === 'contact'

      // Services ALWAYS use insurance (exam copays, fitting copays)
      // Materials only use insurance if they're the active benefit type
      const useInsurance = isService ||
        (isGlassesMaterial && effectiveActiveBenefit === 'glasses') ||
        (isContactMaterial && effectiveActiveBenefit === 'contacts') ||
        (!glassesContactsExclusive) // If not exclusive, both can use insurance

      if (!useInsurance) {
        // This category doesn't get insurance - patient pays retail
        pricing = {
          patientPays: retailPrice,
          insurancePays: 0,
          notes: isGlassesMaterial
            ? 'Glasses benefit not active (contacts selected)'
            : 'Contacts benefit not active (glasses selected)'
        }
      } else {
        // Calculate insurance pricing based on category
        switch (product.category) {
          case 'service':
            pricing = calculateServicePricingByCategory(
              product.pricingCategory,
              retailPrice,
              authorization
            )
            break

          case 'frame':
            pricing = calculateFramePricing(retailPrice, authorization)
            break

          case 'lens':
            pricing = calculateLensPricingByCategory(
              product.pricingCategory,
              retailPrice,
              authorization,
              product.tierCode || item.tierCode
            )
            break

          case 'contact':
            pricing = calculateContactLensPricing(retailPrice, authorization)
            break

          default:
            pricing = { patientPays: retailPrice, insurancePays: 0, notes: 'Unknown category' }
        }
      }

      lineItems.push({
        sku: product.sku,
        displayName: product.name,
        category: product.category as ProductCategory,
        pricingCategory: product.pricingCategory,
        retailPrice,
        patientCopay: pricing.patientPays,
        insurancePays: pricing.insurancePays,
        savings: pricing.insurancePays,
        tierUsed: (pricing as any).tier,
        notes: pricing.notes,
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

    // Get exam and materials copays from authorization
    let examCopay: number | null = null
    let materialsCopay: number | null = null

    if (isVspAuth(authorization)) {
      examCopay = authorization.copays.examWellvision
      materialsCopay = authorization.copays.materials
    } else if (isEyemedAuth(authorization)) {
      examCopay = authorization.copays.exam
      materialsCopay = authorization.copays.materials
    } else if (isSpecteraAuth(authorization)) {
      examCopay = authorization.copays.examAdult
      materialsCopay = authorization.copays.materials ?? null
    }

    const quote: QuoteResult = {
      authorizationId: authResult.authorizationId,
      carrier: authorization.plan.carrier.toUpperCase(),
      planName: authorization.plan.planName,
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
        id: authResult.authorizationId,
        carrier: authResult.carrier,
        planName: authorization.plan.planName,
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
        error: 'Failed to calculate quote',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Fetch product info from database for quote pricing
 * Returns simplified ProductInfo with pricingCategory and tier codes
 */
async function fetchProductInfo(skus: string[], carrier: string | null): Promise<Map<string, ProductInfo>> {
  const products = new Map<string, ProductInfo>()

  // Fetch from LensProduct table (lenses, AR coatings, materials, etc.)
  const lensProducts = await prisma.lensProduct.findMany({
    where: {
      sku: { in: skus },
      isActive: true,
    },
    include: {
      carrierTiers: carrier ? {
        where: { carrier: { equals: carrier, mode: 'insensitive' } }
      } : false,
    },
  })

  for (const product of lensProducts) {
    const tierMapping = Array.isArray(product.carrierTiers) ? product.carrierTiers[0] : null
    products.set(product.sku!, {
      sku: product.sku!,
      name: product.name,
      retailPrice: product.retailPrice,
      category: 'lens',
      pricingCategory: product.pricingCategory,
      tierCode: tierMapping?.tierCode,
    })
  }

  // Fetch from Frame table
  const frames = await prisma.frame.findMany({
    where: {
      sku: { in: skus },
      isActive: true,
    },
  })

  for (const frame of frames) {
    products.set(frame.sku!, {
      sku: frame.sku!,
      name: `${frame.brand} ${frame.model}`,
      retailPrice: frame.retailPrice,
      category: 'frame',
      pricingCategory: frame.pricingCategory || 'FRAME',
    })
  }

  // Fetch from ServicePrice table (exams, fittings)
  const services = await prisma.servicePrice.findMany({
    where: {
      sku: { in: skus },
      isActive: true,
    },
  })

  for (const service of services) {
    products.set(service.sku!, {
      sku: service.sku!,
      name: service.name,
      retailPrice: service.retailPrice,
      category: 'service',
      pricingCategory: service.pricingCategory,
    })
  }

  // Fetch from ContactLens table
  const contactLenses = await prisma.contactLens.findMany({
    where: {
      id: { in: skus },
      isActive: true,
    },
  })

  for (const cl of contactLenses) {
    products.set(cl.id, {
      sku: cl.id,
      name: cl.lensName,
      retailPrice: cl.retailPrice,
      category: 'contact',
      pricingCategory: cl.pricingCategory,
    })
  }

  // Fetch from general Product table (mount fees, add-ons, etc.)
  const generalProducts = await prisma.product.findMany({
    where: {
      sku: { in: skus },
      active: true,
    },
    include: {
      category: true,
    },
  })

  for (const product of generalProducts) {
    // Map category codes to simplified categories
    const catCode = product.category?.code || ''
    let category: string = 'lens'  // Default to lens for pricing

    if (catCode === 'MOUNT_FEES' || catCode === 'LENS_ADDONS' || catCode === 'AR_COATINGS' ||
        catCode === 'LENS_MATERIALS' || catCode === 'LINED_MULTIFOCAL') {
      category = 'lens'
    } else if (catCode === 'FRAMES') {
      category = 'frame'
    } else if (catCode === 'CONTACT_FITTING' || catCode === 'EXAMS' || catCode === 'EXAM_ADDONS') {
      category = 'service'
    }

    products.set(product.sku, {
      sku: product.sku,
      name: product.name,
      retailPrice: product.basePrice,
      category,
      pricingCategory: product.category?.code || null,
      tierCode: product.tierVsp,  // Use VSP tier code for copay lookup
    })
  }

  return products
}
