/**
 * Spectera Authorization Service
 *
 * Converts data from Spectera authorization scans (stored in Prisma) into
 * SpecteraBenefitAuthorization format for the pricing calculator.
 *
 * Flow:
 * 1. Scan Spectera member benefits PDF
 * 2. Extract data and store in SpecteraAuthorization tables
 * 3. This service converts that DB data into SpecteraBenefitAuthorization
 * 4. Pricing calculator uses SpecteraBenefitAuthorization to calculate patient costs
 */

import { SpecteraBenefitAuthorization, SpecteraCopays, SpecteraFrequency, Patient, Plan, FrequencyBenefit } from '@/types/benefit-authorization'

// =============================================================================
// TYPES - What comes from the database (Prisma models)
// =============================================================================

export interface SpecteraAuthorizationData {
  id: string
  customerId: string
  subscriberId: string
  memberName: string
  dateOfBirth: Date | null

  // Plan info
  productName: string | null

  // Service eligibility & frequency
  examEligible: boolean
  examFrequency: string | null
  maternityExamEligible: boolean
  maternityExamFrequency: string | null
  pediatricExamEligible: boolean
  pediatricExamFrequency: string | null

  frameEligible: boolean
  frameFrequency: string | null
  lensesEligible: boolean
  lensesFrequency: string | null

  // Contact lens eligibility
  selectionClDailyEligible: boolean
  selectionClMonthlyEligible: boolean
  nonSelectionClEligible: boolean
  selectionClFitEligible: boolean
  nonSelectionClFitEligible: boolean

  // Professional services copays
  examCopay: number | null
  maternityExamCopay: number | null
  pediatricExamCopay: number | null
  selectionClFitCopay: string | null
  nonSelectionClFitCopay: string | null

  // Frame benefits
  frameAllowance: number | null
  frameOveragePercent: number | null

  // Standard lens copay
  standardLensCopay: number | null

  // Progressive copays by tier (Roman numerals I-V)
  progressiveTier1Copay: number | null
  progressiveTier2Copay: number | null
  progressiveTier3Copay: number | null
  progressiveTier4Copay: number | null
  progressiveTier5Copay: number | null
  progressiveNonFormularyCopay: string | null

  // Other lens types
  blendedBifocalsCopay: string | null
  freeformSvCopay: string | null
  svAsphericCopay: string | null
  mfAsphericCopay: string | null

  // Lens materials
  polycarbonate: string | null
  polycarbonateAdultCopay?: number | null
  polycarbonateChildCopay?: number | null
  trivexCopay?: number | null
  highIndex166: number | null
  highIndex167to173: number | null
  highIndex174Plus: string | null
  highIndex174Copay?: number | null

  // Enhancement copays (from scanner)
  photochromicCopay?: number | null
  polarizedCopay?: number | null
  blueLightFilterCopay?: number | null
  tintCopay?: number | null
  mirrorCoatingCopay?: number | null

  // Contact lens benefits
  selectionClDailyCopay: string | null
  selectionClMonthlyCopay: string | null
  nonSelectionClAllowance: number | null
  nonSelectionClOverage: number | null
  necessaryClCopay: number | null

  // Dates
  dateOfService: Date
  expirationDate: Date | null
  dilatedRetinalExamRequired: boolean
  isActive: boolean

  // Related copays
  arCoatingCopays: SpecteraArCoatingCopayData[]
  lensOptionCopays: SpecteraLensOptionCopayData[]
}

export interface SpecteraArCoatingCopayData {
  tier: string
  copay: string
}

export interface SpecteraLensOptionCopayData {
  optionName: string
  copay: string
}

export interface PatientData {
  firstName: string
  lastName: string
  dateOfBirth: Date | null
  memberId?: string
  groupNumber?: string
}

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert database authorization data to SpecteraBenefitAuthorization format
 */
export function convertToSpecteraBenefitAuth(
  authData: SpecteraAuthorizationData,
  patientData?: PatientData
): SpecteraBenefitAuthorization {
  // Build patient info
  const patient: Patient = {
    name: patientData ? `${patientData.firstName} ${patientData.lastName}` : authData.memberName,
    dob: (patientData?.dateOfBirth ?? authData.dateOfBirth)?.toISOString().split('T')[0] ?? null,
    age: calculateAge(patientData?.dateOfBirth ?? authData.dateOfBirth),
    memberId: patientData?.memberId ?? authData.subscriberId,
    groupNumber: patientData?.groupNumber ?? undefined,
    relationship: 'self',
  }

  // Build plan info
  const plan: Plan & { carrier: 'spectera' } = {
    carrier: 'spectera',
    planId: authData.subscriberId,
    planName: authData.productName ?? 'Spectera Vision',
    effectiveDate: authData.dateOfService.toISOString().split('T')[0],
    expirationDate: authData.expirationDate?.toISOString().split('T')[0],
  }

  // Parse AR copays
  const arCopays = parseArCopays(authData.arCoatingCopays)

  // Parse lens option copays
  const lensOptions = parseLensOptionCopays(authData.lensOptionCopays)

  // Parse polycarbonate (can be complex like "Covered-in-Full for Ages 0-18" or "$33.00 for Ages 19+")
  const polyInfo = parsePolycarbonate(authData.polycarbonate)

  // Build copays object
  const copays: SpecteraCopays = {
    examPediatric: authData.pediatricExamCopay ?? authData.examCopay ?? 15,
    examMaternity: authData.maternityExamCopay ?? authData.examCopay ?? 15,
    examAdult: authData.examCopay ?? 10,
    examContactFitSelection: authData.selectionClFitCopay === 'Covered-in-Full' ? 'covered' : parseNumericOrUndefined(authData.selectionClFitCopay),
    examContactFitNonSelection: authData.nonSelectionClFitCopay ?? '100% of Billed Charges',

    frameAllowance: authData.frameAllowance ?? 150,
    frameOveragePercent: (authData.frameOveragePercent ?? 70) / 100, // Patient pays this %

    lensStandard: authData.standardLensCopay ?? 15,
    lensBlendedBifocal: authData.blendedBifocalsCopay ?? '80% of Billed Charges',
    lensFreeformSv: authData.freeformSvCopay ?? '80% of Billed Charges',
    lensMfAspheric: authData.mfAsphericCopay ?? '80% of Billed Charges',
    lensSvAspheric: authData.svAsphericCopay ?? '80% of Billed Charges',

    progressiveTierI: authData.progressiveTier1Copay ?? 70,
    progressiveTierII: authData.progressiveTier2Copay ?? 115,
    progressiveTierIII: authData.progressiveTier3Copay ?? 165,
    progressiveTierIV: authData.progressiveTier4Copay ?? 215,
    progressiveTierV: authData.progressiveTier5Copay ?? 265,
    progressiveNonFormulary: authData.progressiveNonFormularyCopay ?? '80% of Billed Charges',

    // Material copays - prefer direct fields, fall back to parsed values
    materialPolycarbonateAdult: authData.polycarbonateAdultCopay ?? polyInfo.adult ?? 33,
    materialPolycarbonateChild: authData.polycarbonateChildCopay === 0 ? 'covered' : (authData.polycarbonateChildCopay ?? polyInfo.child ?? 'covered'),
    materialTrivex: authData.trivexCopay ?? 0,
    materialHighIndex160166: authData.highIndex166 ?? 53,
    materialHighIndex166173: authData.highIndex167to173 ?? 63,
    // If we have a numeric copay, convert it to a display string; otherwise use the existing string
    materialHighIndex174Plus: authData.highIndex174Copay != null
      ? `$${authData.highIndex174Copay}`
      : (authData.highIndex174Plus ?? '80% of Billed Charges'),

    arTierI: arCopays.I ?? 30,
    arTierII: arCopays.II ?? 50,
    arTierIII: arCopays.III ?? 75,
    arTierIV: arCopays.IV ?? 95,
    arNonFormulary: '80% of Billed Charges',

    // Enhancement copays - prefer direct fields, fall back to parsed lensOptions
    photochromic: authData.photochromicCopay ?? lensOptions.photochromic ?? 67,
    polarized: authData.polarizedCopay ?? lensOptions.polarized ?? '80% of Billed Charges',
    tint: authData.tintCopay ?? lensOptions.tint ?? 14,
    uvCoating: lensOptions.uvCoating ?? 16,
    scratchCoating: lensOptions.scratchCoating === 0 ? 'covered' : (lensOptions.scratchCoating ?? 'covered'),
    polishedEdges: lensOptions.polishedEdges ?? 13,
    scratchWarranty1yr: lensOptions.scratchWarranty ?? 10,

    contactsMedicallyNecessary: authData.necessaryClCopay ?? 15,
    contactsSelectionDailyBiweekly: parseContactSelection(authData.selectionClDailyCopay),
    contactsSelectionMonthly: parseContactSelection(authData.selectionClMonthlyCopay),
    contactsNonSelectionAllowance: authData.nonSelectionClAllowance ?? 200,
    contactsNonSelectionOveragePercent: (authData.nonSelectionClOverage ?? 100) / 100,
  }

  // Build frequency
  const frequency: SpecteraFrequency = {
    exam: parseFrequency(authData.examFrequency),
    frame: parseFrequency(authData.frameFrequency),
    lenses: parseFrequency(authData.lensesFrequency),
    examPediatric: authData.pediatricExamEligible ? parseFrequency(authData.pediatricExamFrequency) : undefined,
    examMaternity: authData.maternityExamEligible ? parseFrequency(authData.maternityExamFrequency) : undefined,
  }

  return {
    patient,
    plan,
    frequency,
    copays,
    specialRules: {
      polycarbonateFreeCbildAgeMax: 18,
      dilatedRetinalExamRequired: authData.dilatedRetinalExamRequired,
    },
  }
}

/**
 * Parse AR coating copays from database records
 */
function parseArCopays(arCopays: SpecteraArCoatingCopayData[]): {
  I?: number
  II?: number
  III?: number
  IV?: number
} {
  const result: { I?: number; II?: number; III?: number; IV?: number } = {}

  for (const ar of arCopays) {
    const numericCopay = parseNumericCopay(ar.copay)
    switch (ar.tier) {
      case 'I':
        result.I = numericCopay
        break
      case 'II':
        result.II = numericCopay
        break
      case 'III':
        result.III = numericCopay
        break
      case 'IV':
        result.IV = numericCopay
        break
    }
  }

  return result
}

/**
 * Parse lens option copays from database records
 */
function parseLensOptionCopays(options: SpecteraLensOptionCopayData[]): {
  photochromic?: number
  polarized?: number | string
  tint?: number
  uvCoating?: number
  scratchCoating?: number
  polishedEdges?: number
  scratchWarranty?: number
} {
  const result: Record<string, number | string | undefined> = {}

  for (const opt of options) {
    const name = opt.optionName.toLowerCase()
    const copay = opt.copay.includes('%') ? opt.copay : parseNumericCopay(opt.copay)

    if (name.includes('photochrom')) {
      result.photochromic = typeof copay === 'number' ? copay : 67
    } else if (name.includes('polarized')) {
      result.polarized = copay
    } else if (name.includes('tint')) {
      result.tint = typeof copay === 'number' ? copay : 14
    } else if (name.includes('uv')) {
      result.uvCoating = typeof copay === 'number' ? copay : 16
    } else if (name.includes('scratch') && name.includes('coating')) {
      result.scratchCoating = typeof copay === 'number' ? copay : 0
    } else if (name.includes('polish') || name.includes('roll')) {
      result.polishedEdges = typeof copay === 'number' ? copay : 13
    } else if (name.includes('warranty')) {
      result.scratchWarranty = typeof copay === 'number' ? copay : 10
    }
  }

  return result
}

/**
 * Parse polycarbonate value (can have age conditions)
 */
function parsePolycarbonate(value: string | null): { adult?: number; child?: number | 'covered' } {
  if (!value) return { adult: 33, child: 'covered' }

  const lower = value.toLowerCase()

  if (lower.includes('covered-in-full') && lower.includes('0-18')) {
    // "Covered-in-Full for Ages 0-18"
    // Try to extract adult price
    const adultMatch = value.match(/\$(\d+(?:\.\d+)?)\s*for\s*Ages?\s*19/i)
    return {
      adult: adultMatch ? parseFloat(adultMatch[1]) : 33,
      child: 'covered',
    }
  }

  if (lower.includes('covered')) {
    return { adult: 0, child: 'covered' }
  }

  const numericValue = parseNumericCopay(value)
  return { adult: numericValue, child: 'covered' }
}

/**
 * Parse contact selection string (e.g., "$15.00 for up to 8 Boxes")
 */
function parseContactSelection(value: string | null): { amount: number; units: string } | undefined {
  if (!value) return undefined

  const match = value.match(/\$?([\d.]+)\s*(?:for\s*)?(?:up\s*to\s*)?(\d+)\s*Boxes?/i)
  if (match) {
    return {
      amount: parseFloat(match[1]),
      units: `up to ${match[2]} boxes`,
    }
  }

  return undefined
}

/**
 * Parse frequency string (e.g., "1 every 1 plan year(s)", "2 every 12 month(s)")
 */
function parseFrequency(freq: string | null): FrequencyBenefit {
  if (!freq) return { count: 1, periodMonths: 12 }

  const match = freq.match(/(\d+)\s*every\s*(\d+)\s*(plan\s*year|month)/i)
  if (match) {
    const count = parseInt(match[1], 10)
    const period = parseInt(match[2], 10)
    const unit = match[3].toLowerCase()

    return {
      count,
      periodMonths: unit.includes('year') ? period * 12 : period,
    }
  }

  return { count: 1, periodMonths: 12 }
}

/**
 * Parse a copay string to number
 */
function parseNumericCopay(copay: string | null): number {
  if (!copay) return 0
  const cleaned = copay.replace(/[$,]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseNumericOrUndefined(value: string | null): number | undefined {
  if (!value) return undefined
  const num = parseNumericCopay(value)
  return num > 0 ? num : undefined
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dob: Date | null): number | null {
  if (!dob) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}
