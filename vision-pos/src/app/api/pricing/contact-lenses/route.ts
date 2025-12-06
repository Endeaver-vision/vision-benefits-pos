/**
 * Contact Lens Pricing API
 * POST /api/pricing/contact-lenses
 *
 * Calculates contact lens pricing with:
 * - Insurance allowance (VSP, EyeMed, Spectera)
 * - Annual supply discount
 * - Rebates (optional)
 *
 * This replaces the client-side calculation in contact-lens-calculator.tsx
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'
import {
  BenefitAuthorization,
  isVspAuth,
  isEyemedAuth,
  isSpecteraAuth,
} from '@/types/benefit-authorization'

// Annual supply discount rules (per manufacturer/modality)
const ANNUAL_SUPPLY_DISCOUNTS = {
  daily: 30,      // $30 discount for annual supply of daily lenses
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

    // Check annual supply threshold
    const annualSupplyThreshold = lens.annualSupplyBothEyes || getDefaultAnnualSupply(modality)
    const meetsAnnualSupply = totalBoxes >= annualSupplyThreshold

    // Calculate annual supply discount
    const annualSupplyDiscount = meetsAnnualSupply
      ? (ANNUAL_SUPPLY_DISCOUNTS[modality as keyof typeof ANNUAL_SUPPLY_DISCOUNTS] || 0)
      : 0

    const subtotalAfterDiscount = retailSubtotal - annualSupplyDiscount

    // Get customer authorization for insurance
    let insuranceAllowance = 0
    let carrier: string | null = null
    let hasInsurance = false

    if (useInsurance) {
      const authResult = await getActiveAuthorizationForCustomer(customerId)

      if (authResult?.authorization) {
        hasInsurance = true
        carrier = authResult.carrier
        insuranceAllowance = getContactLensAllowance(authResult.authorization)
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
    const breakdown: ContactLensPricingResult['pricing']['breakdown'] = [
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
}): 'daily' | 'biweekly' | 'monthly' {
  if (lens.isDaily) return 'daily'
  if (lens.isWeekly) return 'biweekly'
  if (lens.isMonthly) return 'monthly'
  // Default to daily if not specified
  return 'daily'
}

/**
 * Get default annual supply threshold by modality
 */
function getDefaultAnnualSupply(modality: string): number {
  switch (modality) {
    case 'daily':
      return 8  // 8 boxes = 4 per eye = 90 lenses per eye = ~1 year
    case 'biweekly':
      return 4  // 4 boxes = 2 per eye = 12 lenses per eye = ~1 year (26 weeks each)
    case 'monthly':
      return 4  // 4 boxes = 2 per eye = 6 lenses per eye = ~1 year
    default:
      return 8
  }
}

/**
 * Get contact lens allowance from authorization
 */
function getContactLensAllowance(auth: BenefitAuthorization): number {
  if (isVspAuth(auth)) {
    // VSP: contactLensAllowance in copays
    return auth.copays.contactLensAllowance ?? 0
  }

  if (isEyemedAuth(auth)) {
    // EyeMed: Has multiple contact options
    // contactsDisposable is the most common
    const disposable = auth.copays.contactsDisposable ?? 0
    const conventional = auth.copays.contactsConventional ?? 0
    const medicallyNecessary = auth.copays.contactsMedicallyNecessary ?? 0

    // Return the highest available allowance
    return Math.max(disposable, conventional, medicallyNecessary)
  }

  if (isSpecteraAuth(auth)) {
    // Spectera: Has selection and non-selection plans
    // Selection plans have specific allowances per modality
    // Non-selection has a flat allowance

    // Try selection daily/biweekly first
    if (auth.copays.contactsSelectionDailyBiweekly?.amount) {
      return auth.copays.contactsSelectionDailyBiweekly.amount
    }

    // Try selection monthly
    if (auth.copays.contactsSelectionMonthly?.amount) {
      return auth.copays.contactsSelectionMonthly.amount
    }

    // Fall back to non-selection allowance
    if (auth.copays.contactsNonSelectionAllowance) {
      return auth.copays.contactsNonSelectionAllowance
    }

    // Medically necessary
    if (auth.copays.contactsMedicallyNecessary) {
      return auth.copays.contactsMedicallyNecessary
    }

    return 0
  }

  return 0
}
