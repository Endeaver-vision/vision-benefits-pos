import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createPricingCalculator,
  PricingResult,
  FramePricingResult,
} from '@/lib/services/pricing-calculator'
import { normalizeAuthorization } from '@/lib/services/authorization-normalizer'
import { ExtractedInsuranceData } from '@/types/insurance-document'
import { ProductCatalogEntry } from '@/types/product-catalog'

export interface PricingRequest {
  customerId: string
  products: Array<{
    sku: string
    productType: 'progressive' | 'ar_coating' | 'frame' | 'lens_sv' | 'material' | 'photochromic' | 'polarized' | 'blue_light' | 'tint' | 'other'
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

    // Get customer with verified insurance document
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
      include: {
        insuranceDocuments: {
          where: { isVerified: true },
          orderBy: { verifiedAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    const warnings: string[] = []
    let carrier: string | null = null
    let planName: string | null = null
    let examCopay = 0
    let materialsCopay = 0

    // Check for verified insurance document with extracted data
    const verifiedDoc = customer.insuranceDocuments[0]

    if (!verifiedDoc || !verifiedDoc.extractedData) {
      // No verified insurance - calculate at retail prices
      warnings.push('No verified insurance document found - pricing at retail')

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

    // Normalize the extracted data into a BenefitAuthorization
    const extractedData = verifiedDoc.extractedData as unknown as ExtractedInsuranceData

    // Calculate patient age if we have DOB
    let patientAge: number | undefined
    if (customer.dateOfBirth) {
      const today = new Date()
      const dob = new Date(customer.dateOfBirth)
      patientAge = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        patientAge--
      }
    }

    const normResult = normalizeAuthorization(extractedData, {
      customerId: body.customerId,
      patientAge,
      fallbackCarrier: (verifiedDoc.carrier?.toLowerCase() as 'eyemed' | 'spectera' | 'vsp') || undefined,
    })

    if (!normResult.success || !normResult.authorization) {
      // Normalization failed - use retail pricing
      warnings.push(...normResult.errors)
      warnings.push('Could not normalize insurance data - pricing at retail')

      const items = body.products.map(product => ({
        sku: product.sku,
        productName: product.productName || product.sku,
        retailPrice: product.retailPrice,
        patientCopay: product.retailPrice,
        insurancePays: 0,
        savings: 0,
        notes: 'Insurance normalization failed',
      }))

      const retailTotal = items.reduce((sum, item) => sum + item.retailPrice, 0)

      return NextResponse.json({
        success: true,
        data: {
          customerId: body.customerId,
          carrier: verifiedDoc.carrier,
          planName: verifiedDoc.planName,
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

    // Add normalization warnings
    warnings.push(...normResult.warnings)

    const auth = normResult.authorization
    carrier = auth.plan.carrier
    planName = auth.plan.planName

    // Get copays from authorization
    if (auth.plan.carrier === 'vsp') {
      examCopay = (auth as typeof auth & { copays: { examWellvision: number } }).copays.examWellvision
      materialsCopay = auth.copays.materials || 0
    } else if (auth.plan.carrier === 'eyemed') {
      examCopay = (auth as typeof auth & { copays: { exam: number } }).copays.exam
      materialsCopay = (auth as typeof auth & { copays: { materials: number } }).copays.materials
    } else if (auth.plan.carrier === 'spectera') {
      // Use adult exam copay by default
      examCopay = (auth as typeof auth & { copays: { examAdult: number } }).copays.examAdult
      materialsCopay = (auth as typeof auth & { copays: { materials?: number } }).copays.materials || 0
    }

    // Create carrier-specific pricing calculator
    const calculator = createPricingCalculator(auth)

    // Calculate pricing for each product
    const items: PricingResponse['items'] = []

    for (const product of body.products) {
      // Create a minimal ProductCatalogEntry for the calculator
      const catalogEntry: ProductCatalogEntry = {
        sku: product.sku,
        displayName: product.productName || product.sku,
        category: mapProductType(product.productType),
        retailPrice: product.retailPrice,
        isActive: true,
        // Map brand to tier if we have formulary data (future enhancement)
        vsp: product.isFeaturedBrand !== undefined ? { isFeaturedBrand: product.isFeaturedBrand } : undefined,
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
    default:
      return 'other'
  }
}
