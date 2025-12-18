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
  lensOptionCopays?: SpecteraLensOptionCopayData[] // Optional - may not exist in older schemas
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

  // Parse lens option copays (may not exist in older schemas)
  const lensOptions = parseLensOptionCopays(authData.lensOptionCopays ?? [])

  // Parse polycarbonate (can be complex like "Covered-in-Full for Ages 0-18" or "$33.00 for Ages 19+")
  const polyInfo = parsePolycarbonate(authData.polycarbonate)

  // Build copays object - NO DEFAULTS, only use scanned data
  const copays: SpecteraCopays = {
    examPediatric: authData.pediatricExamCopay ?? authData.examCopay,
    examMaternity: authData.maternityExamCopay ?? authData.examCopay,
    examAdult: authData.examCopay,
    examContactFitSelection: authData.selectionClFitCopay === 'Covered-in-Full' ? 'covered' : parseNumericOrNull(authData.selectionClFitCopay),
    examContactFitNonSelection: authData.nonSelectionClFitCopay,

    frameAllowance: authData.frameAllowance,
    frameOveragePercent: authData.frameOveragePercent !== null
      ? authData.frameOveragePercent / 100
      : null, // Patient pays this %

    lensStandard: authData.standardLensCopay,
    lensBlendedBifocal: authData.blendedBifocalsCopay,
    lensFreeformSv: authData.freeformSvCopay,
    lensMfAspheric: authData.mfAsphericCopay,
    lensSvAspheric: authData.svAsphericCopay,

    progressiveTierI: authData.progressiveTier1Copay,
    progressiveTierII: authData.progressiveTier2Copay,
    progressiveTierIII: authData.progressiveTier3Copay,
    progressiveTierIV: authData.progressiveTier4Copay,
    progressiveTierV: authData.progressiveTier5Copay,
    progressiveNonFormulary: authData.progressiveNonFormularyCopay,

    // Material copays - prefer direct fields, fall back to parsed values, null if neither
    materialPolycarbonateAdult: authData.polycarbonateAdultCopay ?? polyInfo.adult ?? null,
    materialPolycarbonateChild: authData.polycarbonateChildCopay === 0 ? 'covered' : (authData.polycarbonateChildCopay ?? polyInfo.child ?? null),
    materialTrivex: authData.trivexCopay ?? null,
    materialHighIndex160166: authData.highIndex166,
    materialHighIndex166173: authData.highIndex167to173,
    // If we have a numeric copay, convert it to a display string; otherwise use the existing string
    materialHighIndex174Plus: authData.highIndex174Copay != null
      ? `$${authData.highIndex174Copay}`
      : authData.highIndex174Plus,

    arTierI: arCopays.I ?? null,
    arTierII: arCopays.II ?? null,
    arTierIII: arCopays.III ?? null,
    arTierIV: arCopays.IV ?? null,
    arNonFormulary: null,

    // Enhancement copays - prefer direct fields, fall back to parsed lensOptions, null if neither
    photochromic: authData.photochromicCopay ?? lensOptions.photochromic ?? null,
    polarized: authData.polarizedCopay ?? lensOptions.polarized ?? null,
    tint: authData.tintCopay ?? lensOptions.tint ?? null,
    uvCoating: lensOptions.uvCoating ?? null,
    scratchCoating: lensOptions.scratchCoating === 0 ? 'covered' : (lensOptions.scratchCoating ?? null),
    polishedEdges: lensOptions.polishedEdges ?? null,
    scratchWarranty1yr: lensOptions.scratchWarranty ?? null,

    contactsMedicallyNecessary: authData.necessaryClCopay,
    contactsSelectionDailyBiweekly: parseContactSelection(authData.selectionClDailyCopay),
    contactsSelectionMonthly: parseContactSelection(authData.selectionClMonthlyCopay),
    contactsNonSelectionAllowance: authData.nonSelectionClAllowance,
    contactsNonSelectionOveragePercent: authData.nonSelectionClOverage !== null
      ? authData.nonSelectionClOverage / 100
      : null,
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
 * NO DEFAULTS - only returns what was actually found
 */
function parseLensOptionCopays(options: SpecteraLensOptionCopayData[]): {
  photochromic?: number | null
  polarized?: number | string | null
  tint?: number | null
  uvCoating?: number | null
  scratchCoating?: number | null
  polishedEdges?: number | null
  scratchWarranty?: number | null
} {
  const result: Record<string, number | string | null | undefined> = {}

  for (const opt of options) {
    const name = opt.optionName.toLowerCase()
    const copay = opt.copay.includes('%') ? opt.copay : parseNumericCopay(opt.copay)

    if (name.includes('photochrom')) {
      result.photochromic = typeof copay === 'number' ? copay : null
    } else if (name.includes('polarized')) {
      result.polarized = copay
    } else if (name.includes('tint')) {
      result.tint = typeof copay === 'number' ? copay : null
    } else if (name.includes('uv')) {
      result.uvCoating = typeof copay === 'number' ? copay : null
    } else if (name.includes('scratch') && name.includes('coating')) {
      result.scratchCoating = typeof copay === 'number' ? copay : null
    } else if (name.includes('polish') || name.includes('roll')) {
      result.polishedEdges = typeof copay === 'number' ? copay : null
    } else if (name.includes('warranty')) {
      result.scratchWarranty = typeof copay === 'number' ? copay : null
    }
  }

  return result
}

/**
 * Parse polycarbonate value (can have age conditions)
 * NO DEFAULTS - returns null if no data
 */
function parsePolycarbonate(value: string | null): { adult?: number | null; child?: number | 'covered' | null } {
  if (!value) return { adult: null, child: null }

  const lower = value.toLowerCase()

  if (lower.includes('covered-in-full') && lower.includes('0-18')) {
    // "Covered-in-Full for Ages 0-18"
    // Try to extract adult price
    const adultMatch = value.match(/\$(\d+(?:\.\d+)?)\s*for\s*Ages?\s*19/i)
    return {
      adult: adultMatch ? parseFloat(adultMatch[1]) : null,
      child: 'covered',
    }
  }

  if (lower.includes('covered')) {
    return { adult: 0, child: 'covered' }
  }

  const numericValue = parseNumericCopay(value)
  return { adult: numericValue, child: null }
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
 * Returns null if no data - NO DEFAULTS
 */
function parseFrequency(freq: string | null): FrequencyBenefit | null {
  if (!freq) return null

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

  return null
}

/**
 * Parse a copay string to number
 * Returns null if no valid number - NO DEFAULTS
 */
function parseNumericCopay(copay: string | null): number | null {
  if (!copay) return null
  const cleaned = copay.replace(/[$,]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseNumericOrNull(value: string | null): number | null {
  if (!value) return null
  return parseNumericCopay(value)
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
