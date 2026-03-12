/**
 * GET /api/pricing/contacts
 * Returns available contact lenses from database
 *
 * POST /api/pricing/contacts
 * Calculate contact lens pricing with insurance
 *
 * Uses the unified insurance_authorizations table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getContactLenses,
  calculateContactLensPricing,
  ContactLensProduct
} from '@/lib/services/unified-pricing-service'

// Type for the copays JSON structure in unified authorization table
interface CopaysJson {
  contactLensAllowance?: number
  contactsDisposable?: number
  contactsConventional?: number
  contactsMedicallyNecessary?: number
  contactsSelectionDailyBiweekly?: { amount?: number }
  contactsSelectionMonthly?: { amount?: number }
  contactsNonSelectionAllowance?: number
  [key: string]: unknown
}

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

    // Get authorization from unified table if customer provided
    let authorization: { carrier: string; copays: CopaysJson; contactAllowance: number | null } | null = null
    let carrier: string | null = null

    if (customerId) {
      const auth = await prisma.insuranceAuthorization.findFirst({
        where: {
          customerId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (auth) {
        carrier = auth.carrier
        const copays = (auth.copays as CopaysJson) || {}
        authorization = {
          carrier: auth.carrier,
          copays,
          contactAllowance: auth.contactAllowance ? Number(auth.contactAllowance) : getContactAllowanceFromCopays(auth.carrier, copays),
        }
      }
    }

    // Calculate pricing - build an authorization-like object for the pricing service
    const pricingAuth = authorization ? {
      plan: { carrier: authorization.carrier },
      copays: { contactLensAllowance: authorization.contactAllowance || 0 }
    } : null

    const pricing = calculateContactLensPricing(
      lens,
      boxesOD || 0,
      boxesOS || 0,
      pricingAuth,
      annualSupplyBoxes
    )

    return NextResponse.json({
      success: true,
      hasInsurance: !!authorization,
      carrier: carrier || null,
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

/**
 * Extract contact lens allowance from copays JSON based on carrier
 */
function getContactAllowanceFromCopays(carrier: string, copays: CopaysJson): number {
  const carrierUpper = carrier.toUpperCase()

  if (carrierUpper === 'VSP') {
    return copays.contactLensAllowance ?? 0
  }

  if (carrierUpper === 'EYEMED') {
    // EyeMed: Has multiple contact options - return highest
    const disposable = copays.contactsDisposable ?? 0
    const conventional = copays.contactsConventional ?? 0
    const medicallyNecessary = copays.contactsMedicallyNecessary ?? 0
    return Math.max(disposable, conventional, medicallyNecessary)
  }

  if (carrierUpper === 'SPECTERA') {
    // Spectera: Try selection first, then non-selection
    if (copays.contactsSelectionDailyBiweekly?.amount) {
      return copays.contactsSelectionDailyBiweekly.amount
    }
    if (copays.contactsSelectionMonthly?.amount) {
      return copays.contactsSelectionMonthly.amount
    }
    if (copays.contactsNonSelectionAllowance) {
      return copays.contactsNonSelectionAllowance
    }
    if (copays.contactsMedicallyNecessary) {
      return copays.contactsMedicallyNecessary
    }
    return 0
  }

  return 0
}
