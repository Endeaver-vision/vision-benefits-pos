/**
 * Quote API
 * POST /api/quote - Calculate pricing for items based on customer's authorization
 *
 * This connects the pricing calculator service to the frontend quote builder.
 * It fetches the customer's active authorization and calculates pricing for products.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'
import { createPricingCalculator } from '@/lib/services/pricing-calculator'
import { ProductCatalogEntry, QuoteItem, ProductCategory, QuoteLineItem, QuoteResult } from '@/types/product-catalog'
import {
  BenefitAuthorization,
  isVspAuth,
  isEyemedAuth,
  isSpecteraAuth,
} from '@/types/benefit-authorization'

interface QuoteRequest {
  customerId: string
  items: Array<{
    sku: string
    retailPrice?: number
    quantity?: number
  }>
}

interface ProductWithTiers {
  sku: string | null
  name: string
  basePrice: number
  tierVsp?: string | null
  tierEyemed?: string | null
  tierSpectera?: string | null
}

/**
 * Calculate service pricing based on authorization
 * Services include exams and fittings - they use simple copay logic
 */
function calculateServicePricing(
  product: ProductCatalogEntry,
  auth: BenefitAuthorization,
  retailPrice: number
): { patientCopay: number; tierUsed?: string; notes?: string } {
  const name = product.displayName.toLowerCase()
  
  // Determine what type of service this is
  const isRoutineExam = name.includes('routine') || name.includes('wellvision')
  const isMedicalExam = name.includes('medical') && name.includes('exam')
  const isContactFitting = name.includes('fitting') || name.includes('cl fit')
  const isContactExam = name.includes('contact') && name.includes('exam')
  
  if (isVspAuth(auth)) {
    if (isRoutineExam) {
      return { 
        patientCopay: auth.copays.examWellvision, 
        tierUsed: 'wellvision_exam'
      }
    }
    if (isMedicalExam && auth.copays.examMedical !== undefined) {
      return { 
        patientCopay: auth.copays.examMedical, 
        tierUsed: 'medical_exam'
      }
    }
    if (isContactExam && auth.copays.contactLensExamCopay !== undefined) {
      return {
        patientCopay: auth.copays.contactLensExamCopay,
        tierUsed: 'contact_exam'
      }
    }
    // Contact lens fittings typically not covered by VSP vision plan
    if (isContactFitting) {
      return {
        patientCopay: retailPrice,
        notes: 'Contact lens fitting - verify coverage'
      }
    }
    // Add-on services (Optomap, OCT, etc.) - not covered
    return {
      patientCopay: retailPrice,
      notes: 'Diagnostic service - verify coverage'
    }
  }
  
  if (isEyemedAuth(auth)) {
    if (isRoutineExam || isMedicalExam) {
      return {
        patientCopay: auth.copays.exam,
        tierUsed: 'exam'
      }
    }
    // EyeMed may cover contact fittings through materials copay
    if (isContactFitting) {
      return {
        patientCopay: retailPrice,
        notes: 'Contact lens fitting - verify coverage'
      }
    }
    // Add-on services
    return {
      patientCopay: retailPrice,
      notes: 'Diagnostic service - verify coverage'
    }
  }
  
  if (isSpecteraAuth(auth)) {
    if (isRoutineExam) {
      return {
        patientCopay: auth.copays.examAdult,
        tierUsed: 'exam_adult'
      }
    }
    if (isContactFitting && auth.copays.examContactFitSelection !== undefined) {
      const copay = auth.copays.examContactFitSelection
      if (copay === 'covered') {
        return { patientCopay: 0, tierUsed: 'contact_fit_covered' }
      }
      return { patientCopay: copay as number, tierUsed: 'contact_fit' }
    }
    // Add-on services
    return {
      patientCopay: retailPrice,
      notes: 'Diagnostic service - verify coverage'
    }
  }
  
  // Default: no coverage, patient pays retail
  return { 
    patientCopay: retailPrice,
    notes: 'Service not covered - check authorization'
  }
}

/**
 * POST - Calculate quote pricing
 */
export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequest = await request.json()
    const { customerId, items } = body

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

    if (!authResult) {
      // No authorization - return retail pricing
      const productSkus = items.map(i => i.sku)
      const products = await fetchProducts(productSkus)

      const lineItems = items.map(item => {
        const product = products.get(item.sku)
        if (!product) {
          return {
            sku: item.sku,
            displayName: 'Unknown Product',
            category: 'unknown' as ProductCategory,
            retailPrice: item.retailPrice || 0,
            patientCopay: item.retailPrice || 0,
            insurancePays: 0,
            savings: 0,
            notes: 'Product not found in catalog',
          }
        }
        const retailPrice = item.retailPrice ?? product.retailPrice
        return {
          sku: product.sku,
          displayName: product.displayName,
          category: product.category,
          retailPrice,
          patientCopay: retailPrice,
          insurancePays: 0,
          savings: 0,
          notes: 'No insurance authorization found',
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
          calculatedAt: new Date(),
          warnings: ['No active insurance authorization found for this customer'],
        },
      })
    }

    const { authorization } = authResult

    // Fetch products for the items
    const productSkus = items.map(i => i.sku)
    const products = await fetchProducts(productSkus)

    // Separate service items from product items
    const serviceItems: Array<typeof items[0]> = []
    const productItems: Array<typeof items[0]> = []
    
    for (const item of items) {
      const product = products.get(item.sku)
      if (product?.category === 'service') {
        serviceItems.push(item)
      } else {
        productItems.push(item)
      }
    }

    // Calculate service items manually (with carrier-specific copays)
    const serviceLineItems: QuoteLineItem[] = []
    for (const item of serviceItems) {
      const product = products.get(item.sku)
      if (!product) continue
      
      const retailPrice = item.retailPrice ?? product.retailPrice
      const { patientCopay, tierUsed, notes } = calculateServicePricing(product, authorization, retailPrice)
      const insurancePays = Math.max(0, retailPrice - patientCopay)
      
      serviceLineItems.push({
        sku: product.sku,
        displayName: product.displayName,
        category: product.category,
        retailPrice,
        patientCopay,
        insurancePays,
        savings: insurancePays,
        tierUsed,
        notes,
      })
    }

    // Calculate product items using the pricing calculator
    let productQuote: QuoteResult | null = null
    if (productItems.length > 0) {
      const calculator = createPricingCalculator(authorization)
      const quoteItems: QuoteItem[] = productItems.map(item => ({
        sku: item.sku,
        retailPrice: item.retailPrice ?? products.get(item.sku)?.retailPrice ?? 0,
      }))
      productQuote = calculator.buildQuote(quoteItems, products, authorization)
    }

    // Combine service and product line items
    const allLineItems = [
      ...serviceLineItems,
      ...(productQuote?.items || []),
    ]

    // Calculate totals
    const retailTotal = allLineItems.reduce((sum, item) => sum + item.retailPrice, 0)
    const patientTotal = allLineItems.reduce((sum, item) => sum + item.patientCopay, 0)
    const insuranceTotal = allLineItems.reduce((sum, item) => sum + item.insurancePays, 0)
    const totalSavings = allLineItems.reduce((sum, item) => sum + item.savings, 0)

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
      items: allLineItems,
      retailTotal,
      patientTotal,
      insuranceTotal,
      totalSavings,
      examCopay,
      materialsCopay,
      calculatedAt: new Date(),
      warnings: productQuote?.warnings,
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
 * Fetch products from database and map to ProductCatalogEntry format
 */
async function fetchProducts(skus: string[]): Promise<Map<string, ProductCatalogEntry>> {
  const products = new Map<string, ProductCatalogEntry>()

  // Fetch from LensProduct table (lenses, AR coatings, materials, etc.)
  const lensProducts = await prisma.lensProduct.findMany({
    where: {
      sku: { in: skus },
      isActive: true,
    },
    include: {
      carrierTiers: true,
    },
  })

  for (const product of lensProducts) {
    const entry = mapLensProductToCatalog(product)
    products.set(product.sku!, entry)
  }

  // Fetch from Frame table
  const frames = await prisma.frame.findMany({
    where: {
      sku: { in: skus },
      isActive: true,
    },
  })

  for (const frame of frames) {
    const entry = mapFrameToCatalog(frame)
    products.set(frame.sku!, entry)
  }

  // Fetch from ServicePrice table (exams, fittings)
  const services = await prisma.servicePrice.findMany({
    where: {
      sku: { in: skus },
      isActive: true,
    },
  })

  for (const service of services) {
    const entry = mapServiceToCatalog(service)
    products.set(service.sku!, entry)
  }

  // Fetch from Product table (legacy)
  const legacyProducts = await prisma.product.findMany({
    where: {
      sku: { in: skus },
      active: true,
    },
    include: {
      category: true,
    },
  })

  for (const product of legacyProducts) {
    if (!products.has(product.sku!)) {
      const entry = mapLegacyProductToCatalog(product)
      products.set(product.sku!, entry)
    }
  }

  return products
}

/**
 * Map LensProduct to ProductCatalogEntry
 *
 * Maps database tier codes to the format expected by pricing calculators:
 * - VSP: baseCode (for progressives), arCode (for AR coatings)
 * - EyeMed: progressiveTier, arTier
 * - Spectera: progressiveTier, arTier
 */
function mapLensProductToCatalog(product: {
  sku: string | null
  name: string
  category: string
  retailPrice: number
  carrierTiers: Array<{
    carrier: string
    tierCode: string
    tierLabel: string | null
    patientCopay: number | null
  }>
}): ProductCatalogEntry {
  const vspTier = product.carrierTiers.find(t => t.carrier === 'VSP')
  const eyemedTier = product.carrierTiers.find(t => t.carrier === 'EyeMed')
  const specteraTier = product.carrierTiers.find(t => t.carrier === 'Spectera')

  // Map database category to ProductCategory
  const category = mapLensCategoryToProductCategory(product.category)

  return {
    sku: product.sku || '',
    displayName: product.name,
    category,
    retailPrice: product.retailPrice,
    isActive: true,
    vsp: vspTier ? {
      baseCode: category === 'lens_progressive' ? vspTier.tierCode : undefined,
      arCode: category === 'ar_coating' ? vspTier.tierCode : undefined,
      materialModifier: category === 'material' ? mapVspMaterialModifier(vspTier.tierCode) : undefined,
    } : undefined,
    eyemed: eyemedTier ? {
      progressiveTier: category === 'lens_progressive' ? mapEyemedTier(eyemedTier.tierCode) : undefined,
      arTier: category === 'ar_coating' ? mapEyemedArTier(eyemedTier.tierCode) : undefined,
      materialType: category === 'material' ? mapEyemedMaterialType(eyemedTier.tierCode) : undefined,
    } : undefined,
    spectera: specteraTier ? {
      progressiveTier: category === 'ar_coating' ? undefined : mapSpecteraTier(specteraTier.tierCode),
      arTier: category === 'ar_coating' ? mapSpecteraArTier(specteraTier.tierCode, category) : undefined,
      materialType: category === 'material' ? mapSpecteraMaterialType(specteraTier.tierCode) : undefined,
    } : undefined,
  }
}

/**
 * Map VSP material modifier code
 * VSP codes: AD=Polycarbonate, AB=Trivex, AH=High Index 1.67, AJ=High Index 1.74
 */
function mapVspMaterialModifier(code: string): 'D' | 'T' | 'H' | undefined {
  const upperCode = code.toUpperCase()
  // Direct VSP code mapping
  if (upperCode === 'AD') return 'D'  // Polycarbonate
  if (upperCode === 'AB') return 'T'  // Trivex
  if (upperCode === 'AH' || upperCode === 'AJ') return 'H'  // High index
  // Fallback pattern matching
  if (upperCode.includes('POLY') || upperCode === 'D') return 'D'
  if (upperCode.includes('TRIVEX') || upperCode === 'T') return 'T'
  if (upperCode.includes('HIGH') || upperCode === 'H') return 'H'
  return undefined
}

/**
 * Map EyeMed material type
 */
function mapEyemedMaterialType(code: string): 'polycarbonate' | 'trivex' | 'high_index_167' | 'high_index_174' | undefined {
  const lowerCode = code.toLowerCase()
  if (lowerCode.includes('poly')) return 'polycarbonate'
  if (lowerCode.includes('trivex')) return 'trivex'
  if (lowerCode.includes('1.67') || lowerCode.includes('167')) return 'high_index_167'
  if (lowerCode.includes('1.74') || lowerCode.includes('174')) return 'high_index_174'
  return undefined
}

/**
 * Map Spectera material type
 */
function mapSpecteraMaterialType(code: string): 'polycarbonate' | 'trivex' | 'high_index' | undefined {
  const lowerCode = code.toLowerCase()
  if (lowerCode.includes('poly')) return 'polycarbonate'
  if (lowerCode.includes('trivex')) return 'trivex'
  if (lowerCode.includes('high') || lowerCode.includes('index')) return 'high_index'
  return undefined
}

/**
 * Map Frame to ProductCatalogEntry
 */
function mapFrameToCatalog(frame: {
  sku: string | null
  brand: string
  model: string
  retailPrice: number
  manufacturer: string
}): ProductCatalogEntry {
  // Marchon and Altair are VSP featured brands
  const featuredManufacturers = ['Marchon', 'Altair']
  const isFeaturedBrand = featuredManufacturers.some(m =>
    frame.manufacturer.toLowerCase().includes(m.toLowerCase())
  )

  return {
    sku: frame.sku || '',
    displayName: `${frame.brand} ${frame.model}`,
    category: 'frame',
    retailPrice: frame.retailPrice,
    isActive: true,
    vsp: {
      isFeaturedBrand,
    },
  }
}

/**
 * Map ServicePrice to ProductCatalogEntry
 */
function mapServiceToCatalog(service: {
  sku: string | null
  name: string
  retailPrice: number
  category: string | null
}): ProductCatalogEntry {
  return {
    sku: service.sku || '',
    displayName: service.name,
    category: 'service',
    retailPrice: service.retailPrice,
    isActive: true,
  }
}

/**
 * Map legacy Product to ProductCatalogEntry
 */
function mapLegacyProductToCatalog(product: {
  sku: string | null
  name: string
  basePrice: number
  tierVsp?: string | null
  tierEyemed?: string | null
  tierSpectera?: string | null
  category?: { code: string } | null
}): ProductCatalogEntry {
  const categoryCode = product.category?.code || 'other'
  const category = mapProductCategoryCode(categoryCode)

  return {
    sku: product.sku || '',
    displayName: product.name,
    category,
    retailPrice: product.basePrice,
    isActive: true,
    vsp: product.tierVsp ? {
      baseCode: product.tierVsp,
    } : undefined,
    eyemed: product.tierEyemed ? {
      progressiveTier: mapEyemedTier(product.tierEyemed),
    } : undefined,
    spectera: product.tierSpectera ? {
      progressiveTier: mapSpecteraTier(product.tierSpectera),
    } : undefined,
  }
}

/**
 * Map database lens category to ProductCategory
 */
function mapLensCategoryToProductCategory(dbCategory: string): ProductCategory {
  const categoryMap: Record<string, ProductCategory> = {
    'PROGRESSIVE': 'lens_progressive',
    'SINGLE_VISION': 'lens_sv',
    'SV': 'lens_sv',
    'AR_COATING': 'ar_coating',
    'AR': 'ar_coating',
    'MATERIAL': 'material',
    'PHOTOCHROMIC': 'photochromic',
    'POLARIZED': 'polarized',
    'BLUE_LIGHT': 'blue_light',
    'TINT': 'tint',
  }
  return categoryMap[dbCategory.toUpperCase()] || 'unknown'
}

/**
 * Map product category code to ProductCategory
 */
function mapProductCategoryCode(code: string): ProductCategory {
  const codeMap: Record<string, ProductCategory> = {
    'LENS_SV': 'lens_sv',
    'LENS_PROGRESSIVE': 'lens_progressive',
    'LENS_BIFOCAL': 'lens_bifocal',
    'AR_COATING': 'ar_coating',
    'MATERIAL': 'material',
    'FRAME': 'frame',
    'PHOTOCHROMIC': 'photochromic',
    'POLARIZED': 'polarized',
    'BLUE_LIGHT': 'blue_light',
    'TINT': 'tint',
    'SERVICE': 'service',
  }
  return codeMap[code.toUpperCase()] || 'unknown'
}

/**
 * Map EyeMed tier code to tier name
 */
function mapEyemedTier(code: string): 'standard' | 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5' | undefined {
  const tierMap: Record<string, 'standard' | 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5'> = {
    'STANDARD': 'standard',
    'TIER_1': 'tier_1',
    'TIER_2': 'tier_2',
    'TIER_3': 'tier_3',
    'TIER_4': 'tier_4',
    'TIER_5': 'tier_5',
    '1': 'tier_1',
    '2': 'tier_2',
    '3': 'tier_3',
    '4': 'tier_4',
    '5': 'tier_5',
  }
  return tierMap[code.toUpperCase()] || undefined
}

/**
 * Map EyeMed AR tier code
 */
function mapEyemedArTier(code: string): 'standard' | 'tier_1' | 'tier_2' | 'tier_3' | undefined {
  const tierMap: Record<string, 'standard' | 'tier_1' | 'tier_2' | 'tier_3'> = {
    'STANDARD': 'standard',
    'TIER_1': 'tier_1',
    'TIER_2': 'tier_2',
    'TIER_3': 'tier_3',
    '1': 'tier_1',
    '2': 'tier_2',
    '3': 'tier_3',
  }
  return tierMap[code.toUpperCase()] || undefined
}

/**
 * Map Spectera progressive tier (I-V to tier_i - tier_v)
 */
function mapSpecteraTier(code: string): 'tier_i' | 'tier_ii' | 'tier_iii' | 'tier_iv' | 'tier_v' | undefined {
  const tierMap: Record<string, 'tier_i' | 'tier_ii' | 'tier_iii' | 'tier_iv' | 'tier_v'> = {
    'I': 'tier_i',
    'II': 'tier_ii',
    'III': 'tier_iii',
    'IV': 'tier_iv',
    'V': 'tier_v',
    '1': 'tier_i',
    '2': 'tier_ii',
    '3': 'tier_iii',
    '4': 'tier_iv',
    '5': 'tier_v',
    'TIER_I': 'tier_i',
    'TIER_II': 'tier_ii',
    'TIER_III': 'tier_iii',
    'TIER_IV': 'tier_iv',
    'TIER_V': 'tier_v',
  }
  return tierMap[code.toUpperCase()] || undefined
}

/**
 * Map Spectera AR tier
 */
function mapSpecteraArTier(code: string, category: ProductCategory): 'tier_i' | 'tier_ii' | 'tier_iii' | 'tier_iv' | undefined {
  if (category !== 'ar_coating') return undefined
  const tierMap: Record<string, 'tier_i' | 'tier_ii' | 'tier_iii' | 'tier_iv'> = {
    'I': 'tier_i',
    'II': 'tier_ii',
    'III': 'tier_iii',
    'IV': 'tier_iv',
    '1': 'tier_i',
    '2': 'tier_ii',
    '3': 'tier_iii',
    '4': 'tier_iv',
    'TIER_I': 'tier_i',
    'TIER_II': 'tier_ii',
    'TIER_III': 'tier_iii',
    'TIER_IV': 'tier_iv',
  }
  return tierMap[code.toUpperCase()] || undefined
}
