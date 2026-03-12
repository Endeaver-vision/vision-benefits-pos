/**
 * Contact Lens Pricing API
 * POST /api/pricing/contact-lenses
 *
 * Calculates contact lens pricing with:
 * - Insurance allowance (VSP, EyeMed, Spectera)
 * - Annual supply discount
 * - Rebates (optional)
 *
 * Uses the unified insurance_authorizations table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateAnnualSupplyThreshold } from '@/lib/contact-lens-utils'

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

// Annual supply discount rules (per manufacturer/modality)
const ANNUAL_SUPPLY_DISCOUNTS: Record<string, number> = {
  daily: 30,      // $30 discount for annual supply of daily lenses
  weekly: 20,     // $20 discount for annual supply of weekly lenses
  biweekly: 10,   // $10 discount for annual supply of bi-weekly
  monthly: 10,    // $10 discount for annual supply of monthly
}

interface ContactLensPricingRequest {
  customerId: string
  lensId: string              // ContactLens ID from database
  boxesRight: number          // Number of boxes for right eye
  boxesLeft: number           // Number of boxes for left eye
  rebateAmount?: number       // Optional manufacturer rebate
  useInsurance?: boolean      // Whether to apply insurance (for materials conflict)
}

interface ContactLensPricingResult {
  success: boolean
  pricing?: {
    // Lens info
    lensId: string
    lensName: string
    manufacturer: string
    modality: string
    boxSize: number

    // Quantity
    boxesRight: number
    boxesLeft: number
    totalBoxes: number

    // Retail pricing
    pricePerBox: number
    retailSubtotal: number

    // Annual supply
    meetsAnnualSupply: boolean
    annualSupplyThreshold: number
    annualSupplyDiscount: number
    subtotalAfterDiscount: number

    // Insurance
    hasInsurance: boolean
    carrier: string | null
    insuranceAllowance: number
    insuranceApplied: number
    subtotalAfterInsurance: number

    // Rebate
    rebateAmount: number
    rebateApplied: number

    // Final
    patientTotal: number
    totalSavings: number
    costPerBox: number

    // Breakdown for display
    breakdown: {
      label: string
      amount: number
      type: 'addition' | 'subtraction' | 'total'
    }[]
  }
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactLensPricingRequest = await request.json()
    const {
      customerId,
      lensId,
      boxesRight,
      boxesLeft,
      rebateAmount = 0,
      useInsurance = true
    } = body

    // Validate request
    if (!customerId) {
      return NextResponse.json<ContactLensPricingResult>(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    if (!lensId) {
      return NextResponse.json<ContactLensPricingResult>(
        { success: false, error: 'Lens ID is required' },
        { status: 400 }
      )
    }

    const totalBoxes = boxesRight + boxesLeft
    if (totalBoxes <= 0) {
      return NextResponse.json<ContactLensPricingResult>(
        { success: false, error: 'At least one box must be selected' },
        { status: 400 }
      )
    }

    // Fetch the contact lens from database
    const lens = await prisma.contactLens.findUnique({
      where: { id: lensId }
    })

    if (!lens) {
      return NextResponse.json<ContactLensPricingResult>(
        { success: false, error: 'Contact lens not found' },
        { status: 404 }
      )
    }

    // Determine modality
    const modality = getModality(lens)

    // Calculate retail pricing
    const pricePerBox = lens.retailPrice
    const retailSubtotal = totalBoxes * pricePerBox

    // Check annual supply threshold using hybrid calculation
    const annualSupplyThreshold = calculateAnnualSupplyThreshold(
      modality,
      lens.boxSize,
      lens.annualSupplyBothEyes
    )
    const meetsAnnualSupply = totalBoxes >= annualSupplyThreshold

    // Calculate annual supply discount
    const annualSupplyDiscount = meetsAnnualSupply
      ? (ANNUAL_SUPPLY_DISCOUNTS[modality as keyof typeof ANNUAL_SUPPLY_DISCOUNTS] || 0)
      : 0

    const subtotalAfterDiscount = retailSubtotal - annualSupplyDiscount

    // Get customer authorization for insurance from unified table
    let insuranceAllowance = 0
    let carrier: string | null = null
    let hasInsurance = false

    if (useInsurance) {
      const auth = await prisma.insuranceAuthorization.findFirst({
        where: {
          customerId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (auth) {
        hasInsurance = true
        carrier = auth.carrier
        const copays = (auth.copays as CopaysJson) || {}
        insuranceAllowance = auth.contactAllowance
          ? Number(auth.contactAllowance)
          : getContactLensAllowance(auth.carrier, copays)
      }
    }

    // Apply insurance (can't exceed subtotal)
    const insuranceApplied = Math.min(insuranceAllowance, subtotalAfterDiscount)
    const subtotalAfterInsurance = subtotalAfterDiscount - insuranceApplied

    // Apply rebate (can't exceed remaining)
    const rebateApplied = Math.min(rebateAmount, subtotalAfterInsurance)
    const patientTotal = Math.max(0, subtotalAfterInsurance - rebateApplied)

    // Calculate total savings
    const totalSavings = retailSubtotal - patientTotal

    // Cost per box
    const costPerBox = totalBoxes > 0 ? patientTotal / totalBoxes : 0

    // Build breakdown for display
    const breakdown: NonNullable<ContactLensPricingResult['pricing']>['breakdown'] = [
      { label: `${totalBoxes} boxes @ $${pricePerBox.toFixed(2)}`, amount: retailSubtotal, type: 'addition' },
    ]

    if (annualSupplyDiscount > 0) {
      breakdown.push({
        label: 'Annual supply discount',
        amount: -annualSupplyDiscount,
        type: 'subtraction'
      })
    }

    if (insuranceApplied > 0) {
      breakdown.push({
        label: `${carrier} allowance`,
        amount: -insuranceApplied,
        type: 'subtraction'
      })
    }

    if (rebateApplied > 0) {
      breakdown.push({
        label: 'Manufacturer rebate',
        amount: -rebateApplied,
        type: 'subtraction'
      })
    }

    breakdown.push({
      label: 'Patient pays',
      amount: patientTotal,
      type: 'total'
    })

    const pricing: ContactLensPricingResult['pricing'] = {
      lensId: lens.id,
      lensName: lens.lensName,
      manufacturer: lens.manufacturer,
      modality,
      boxSize: lens.boxSize,

      boxesRight,
      boxesLeft,
      totalBoxes,

      pricePerBox,
      retailSubtotal,

      meetsAnnualSupply,
      annualSupplyThreshold,
      annualSupplyDiscount,
      subtotalAfterDiscount,

      hasInsurance,
      carrier,
      insuranceAllowance,
      insuranceApplied,
      subtotalAfterInsurance,

      rebateAmount,
      rebateApplied,

      patientTotal,
      totalSavings,
      costPerBox,

      breakdown,
    }

    return NextResponse.json<ContactLensPricingResult>({
      success: true,
      pricing,
    })

  } catch (error) {
    console.error('[Contact Lens Pricing API] Error:', error)
    return NextResponse.json<ContactLensPricingResult>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate pricing'
      },
      { status: 500 }
    )
  }
}

/**
 * Determine contact lens modality from database fields
 */
function getModality(lens: {
  isDaily: boolean
  isWeekly: boolean
  isMonthly: boolean
  modality?: string | null
}): 'daily' | 'weekly' | 'biweekly' | 'monthly' {
  if (lens.isDaily) return 'daily'
  if (lens.isWeekly) {
    // Check modality string to distinguish weekly vs bi-weekly
    // isWeekly flag historically meant bi-weekly, but now we have true weekly lenses
    if (lens.modality === 'weekly') return 'weekly'
    return 'biweekly'
  }
  if (lens.isMonthly) return 'monthly'

  // Fall back to modality string if flags not set
  const mod = lens.modality?.toLowerCase()
  if (mod === 'daily' || mod === 'weekly' || mod === 'biweekly' || mod === 'monthly') {
    return mod as 'daily' | 'weekly' | 'biweekly' | 'monthly'
  }

  // Default to daily if not specified
  return 'daily'
}

/**
 * Get contact lens allowance from copays JSON based on carrier
 */
function getContactLensAllowance(carrier: string, copays: CopaysJson): number {
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
