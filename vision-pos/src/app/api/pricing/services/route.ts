/**
 * GET /api/pricing/services
 *
 * Returns all exam and fitting services with prices from patient_price_lists.
 *
 * ARCHITECTURE: All prices come from patient_price_lists table (the single source of truth).
 * Uses the unified insurance_authorizations table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface PricedService {
  id: string
  sku: string
  name: string
  category: string
  retailPrice: number
  wholesaleCost: number | null
  patientPays: number
  insurancePays: number
  savings: number
  pricingMethod: 'copay' | 'tier' | 'retail' | 'fallback'
  tierUsed?: string
  notes?: string
  needsTierAssignment?: boolean
  // Insurance tier mappings from carrier_tiers table
  tierVsp: string | null
  tierEyemed: string | null
  tierSpectera: string | null
}

// Helper to get tier codes from service_prices fields (tierVsp, tierEyemed, tierSpectera)
function getServiceTierMappingsFromServices(
  services: Array<{ id: string; tierVsp: string | null; tierEyemed: string | null; tierSpectera: string | null }>
): Map<string, { vsp: string | null; eyemed: string | null; spectera: string | null }> {
  const result = new Map<string, { vsp: string | null; eyemed: string | null; spectera: string | null }>()

  for (const service of services) {
    result.set(service.id, {
      vsp: service.tierVsp,
      eyemed: service.tierEyemed,
      spectera: service.tierSpectera
    })
  }

  return result
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const category = searchParams.get('category') // 'exam', 'fitting', or 'all'

    // Get carrier info and copays from unified authorization table
    let carrier: string | null = null
    let examCopay: number | null = null
    let clExamCopay: number | null = null
    if (customerId) {
      const auth = await prisma.insuranceAuthorization.findFirst({
        where: {
          customerId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      carrier = auth?.carrier?.toUpperCase() || null
      examCopay = auth?.examCopay ? Number(auth.examCopay) : null
      clExamCopay = auth?.clExamCopay ? Number(auth.clExamCopay) : null

      // Use carrier-specific defaults if copay not extracted
      if (examCopay === null && carrier) {
        const defaultExamCopays: Record<string, number> = {
          'VSP': 10,
          'EYEMED': 10,
          'SPECTERA': 15,
        }
        examCopay = defaultExamCopays[carrier] ?? null
      }
      if (clExamCopay === null && carrier) {
        const defaultClCopays: Record<string, number> = {
          'VSP': 60,
          'EYEMED': 0, // Often covered
          'SPECTERA': 0,
        }
        clExamCopay = defaultClCopays[carrier] ?? null
      }
    }

    // Fetch services from database - only those visible in POS
    const whereClause: { isActive: boolean; showInPos: boolean; category?: { in: string[] } } = {
      isActive: true,
      showInPos: true  // Only return services selectable in quote builder
    }
    if (category === 'exam') {
      whereClause.category = { in: ['EXAM'] }
    } else if (category === 'fitting') {
      whereClause.category = { in: ['CONTACT_LENS_FIT'] }
    }
    // 'all' or undefined = fetch all services

    const services = await prisma.servicePrice.findMany({
      where: whereClause,
      orderBy: [{ category: 'asc' }, { posDisplayOrder: 'asc' }, { name: 'asc' }]
    })

    // Get tier mappings from service fields (tierVsp, tierEyemed, tierSpectera)
    const tierMappings = getServiceTierMappingsFromServices(services)

    // Fetch pre-computed prices from patient_price_lists
    let priceMap = new Map<string, { finalPrice: number | null; tier: string | null; needsTierAssignment: boolean }>()

    if (customerId) {
      const priceLists = await prisma.patientPriceList.findMany({
        where: {
          customerId,
          active: true,
          insuranceCarrier: carrier || undefined
        }
      })

      for (const pl of priceLists) {
        priceMap.set(pl.productId, {
          finalPrice: pl.finalPrice ? Number(pl.finalPrice) : null,
          tier: pl.tier,
          needsTierAssignment: pl.needsTierAssignment || false
        })
      }
    }

    // Build priced services response - grouped by category
    const servicesByCategory: Record<string, PricedService[]> = {
      EXAM: [],
      DIAGNOSTIC: [],
      CONTACT_LENS_FIT: [],
      PROCEDURE: [],
      SPECTACLE_SERVICE: [],
      FITTING: [],
      OTHER: []
    }

    for (const service of services) {
      const priceEntry = priceMap.get(service.id)

      let patientPays: number
      let pricingMethod: PricedService['pricingMethod']
      let tierUsed: string | undefined
      let notes: string | undefined
      let needsTierAssignment = false

      if (priceEntry && priceEntry.finalPrice !== null) {
        // Use pre-computed price from price list
        patientPays = priceEntry.finalPrice
        tierUsed = priceEntry.tier || undefined
        needsTierAssignment = priceEntry.needsTierAssignment

        if (needsTierAssignment) {
          pricingMethod = 'fallback'
          notes = 'Using fallback pricing (80% retail)'
        } else if (priceEntry.tier) {
          pricingMethod = priceEntry.tier.includes('copay') ? 'copay' : 'tier'
        } else {
          pricingMethod = 'copay'
        }
      } else if (!customerId) {
        // No customer - return retail
        patientPays = service.retailPrice
        pricingMethod = 'retail'
        notes = 'No customer selected'
      } else {
        // Customer but no price entry - use copay from authorization if available
        if (service.category === 'EXAM' && examCopay !== null) {
          // Use exam copay from insurance authorization
          patientPays = examCopay
          pricingMethod = 'copay'
          notes = 'Exam copay from insurance authorization'
        } else if (service.category === 'CONTACT_LENS_FIT' && clExamCopay !== null) {
          // Use CL fitting copay from insurance authorization
          patientPays = clExamCopay
          pricingMethod = 'copay'
          notes = 'CL fitting copay from insurance authorization'
        } else {
          // Fall back to retail
          patientPays = service.retailPrice
          pricingMethod = 'retail'
          notes = 'No price in customer price list - run price generation'
          needsTierAssignment = true
        }
      }

      const insurancePays = Math.max(0, service.retailPrice - patientPays)

      // Get tier codes from carrier_tiers lookup
      const serviceTiers = tierMappings.get(service.id) || { vsp: null, eyemed: null, spectera: null }

      const pricedService: PricedService = {
        id: service.id,
        sku: service.sku || service.id,
        name: service.name,
        category: service.category as string,
        retailPrice: service.retailPrice,
        wholesaleCost: service.wholesaleCost,
        patientPays,
        insurancePays,
        savings: insurancePays,
        pricingMethod,
        tierUsed,
        notes,
        needsTierAssignment,
        tierVsp: serviceTiers.vsp,
        tierEyemed: serviceTiers.eyemed,
        tierSpectera: serviceTiers.spectera
      }

      // Add to appropriate category
      if (servicesByCategory[service.category]) {
        servicesByCategory[service.category].push(pricedService)
      } else {
        servicesByCategory.OTHER.push(pricedService)
      }
    }

    const response: Record<string, unknown> = {
      success: true,
      customerId,
      hasInsurance: !!carrier,
      carrier,
      // Legacy fields for backward compatibility
      exams: servicesByCategory.EXAM,
      fittings: servicesByCategory.CONTACT_LENS_FIT,
      // New grouped structure
      services: servicesByCategory
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Pricing Services API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}
