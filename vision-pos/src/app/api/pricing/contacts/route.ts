/**
 * GET /api/pricing/contacts
 * Returns available contact lenses from database
 * 
 * POST /api/pricing/contacts
 * Calculate contact lens pricing with insurance
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  getContactLenses, 
  calculateContactLensPricing, 
  ContactLensProduct 
} from '@/lib/services/unified-pricing-service'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isAstigmatism = searchParams.get('isAstigmatism')
    const isMultifocal = searchParams.get('isMultifocal')
    const isDaily = searchParams.get('isDaily')
    const manufacturer = searchParams.get('manufacturer')
    
    const filters: Parameters<typeof getContactLenses>[0] = {}
    if (isAstigmatism !== null) filters.isAstigmatism = isAstigmatism === 'true'
    if (isMultifocal !== null) filters.isMultifocal = isMultifocal === 'true'
    if (isDaily !== null) filters.isDaily = isDaily === 'true'
    if (manufacturer) filters.manufacturer = manufacturer
    
    const lenses = await getContactLenses(filters)
    
    // Group by manufacturer for easier UI display
    const byManufacturer = lenses.reduce((acc, lens) => {
      if (!acc[lens.manufacturer]) acc[lens.manufacturer] = []
      acc[lens.manufacturer].push(lens)
      return acc
    }, {} as Record<string, ContactLensProduct[]>)
    
    return NextResponse.json({
      success: true,
      total: lenses.length,
      manufacturers: Object.keys(byManufacturer),
      lenses,
      byManufacturer,
    })
    
  } catch (error) {
    console.error('[Contact Lens API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact lenses' },
      { status: 500 }
    )
  }
}

interface ContactLensPricingRequest {
  customerId: string
  lensId: string  // Contact lens SKU/ID
  boxesOD: number
  boxesOS: number
  annualSupplyBoxes?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactLensPricingRequest = await request.json()
    const { customerId, lensId, boxesOD, boxesOS, annualSupplyBoxes } = body
    
    if (!lensId) {
      return NextResponse.json(
        { success: false, error: 'lensId is required' },
        { status: 400 }
      )
    }
    
    // Find the lens
    const lenses = await getContactLenses()
    const lens = lenses.find(l => l.sku === lensId)
    
    if (!lens) {
      return NextResponse.json(
        { success: false, error: 'Contact lens not found' },
        { status: 404 }
      )
    }
    
    // Get authorization if customer provided
    let authorization = null
    if (customerId) {
      const authResult = await getActiveAuthorizationForCustomer(customerId)
      authorization = authResult?.authorization || null
    }
    
    // Calculate pricing
    const pricing = calculateContactLensPricing(
      lens,
      boxesOD || 0,
      boxesOS || 0,
      authorization,
      annualSupplyBoxes
    )
    
    return NextResponse.json({
      success: true,
      hasInsurance: !!authorization,
      carrier: authorization?.plan.carrier || null,
      lens: {
        sku: lens.sku,
        manufacturer: lens.manufacturer,
        lensName: lens.lensName,
        boxSize: lens.boxSize,
        isAstigmatism: lens.isAstigmatism,
        isMultifocal: lens.isMultifocal,
        isDaily: lens.isDaily,
      },
      pricing,
    })
    
  } catch (error) {
    console.error('[Contact Lens Pricing API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to calculate pricing' },
      { status: 500 }
    )
  }
}
