/**
 * GET /api/pricing/services
 *
 * Returns all exam and fitting services with prices from customer_price_lists.
 *
 * ARCHITECTURE: All prices come from customer_price_lists table (the single source of truth).
 * NO real-time calculation - prices are pre-computed by generatePriceMapping().
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'

interface PricedService {
  sku: string
  name: string
  category: string
  retailPrice: number
  patientPays: number
  insurancePays: number
  savings: number
  pricingMethod: 'copay' | 'tier' | 'retail' | 'fallback'
  tierUsed?: string
  notes?: string
  needsTierAssignment?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const category = searchParams.get('category') // 'exam', 'fitting', or 'all'

    // Get carrier info from authorization
    let carrier: string | null = null
    if (customerId) {
      const authResult = await getActiveAuthorizationForCustomer(customerId)
      carrier = authResult?.carrier?.toUpperCase() || null
    }

    // Fetch services from database
    const whereClause: { isActive: boolean; category?: { in: string[] } } = { isActive: true }
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

    // Fetch pre-computed prices from customer_price_lists
    let priceMap = new Map<string, { finalPrice: number | null; tier: string | null; needsTierAssignment: boolean }>()

    if (customerId) {
      const priceLists = await prisma.customerPriceList.findMany({
        where: {
          customerId,
          active: true,
          insuranceCarrier: carrier || undefined
        }
      })

      for (const pl of priceLists) {
        priceMap.set(pl.productId, {
          finalPrice: pl.customPrice ?? pl.finalPrice,
          tier: pl.tier,
          needsTierAssignment: pl.needsTierAssignment || false
        })
      }
    }

    // Build priced services response
    const pricedExams: PricedService[] = []
    const pricedFittings: PricedService[] = []

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
        // Customer but no price entry - should not happen if prices are generated
        patientPays = service.retailPrice
        pricingMethod = 'retail'
        notes = 'No price in customer price list - run price generation'
        needsTierAssignment = true
      }

      const insurancePays = Math.max(0, service.retailPrice - patientPays)

      const pricedService: PricedService = {
        sku: service.sku || service.id,
        name: service.name,
        category: service.category,
        retailPrice: service.retailPrice,
        patientPays,
        insurancePays,
        savings: insurancePays,
        pricingMethod,
        tierUsed,
        notes,
        needsTierAssignment
      }

      if (service.category === 'EXAM') {
        pricedExams.push(pricedService)
      } else if (service.category === 'CONTACT_LENS_FIT') {
        pricedFittings.push(pricedService)
      }
    }

    const response: Record<string, unknown> = {
      success: true,
      customerId,
      hasInsurance: !!carrier,
      carrier,
    }

    if (!category || category === 'exam' || category === 'all') {
      response.exams = pricedExams
    }

    if (!category || category === 'fitting' || category === 'all') {
      response.fittings = pricedFittings
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
