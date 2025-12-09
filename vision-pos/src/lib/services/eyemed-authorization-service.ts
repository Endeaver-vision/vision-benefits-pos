/**
 * EyeMed Authorization Service
 *
 * Converts data from EyeMed authorization scans (stored in Prisma) into
 * EyemedBenefitAuthorization format for the pricing calculator.
 *
 * Flow:
 * 1. Scan EyeMed member benefits PDF
 * 2. Extract data and store in EyemedAuthorization tables
 * 3. This service converts that DB data into EyemedBenefitAuthorization
 * 4. Pricing calculator uses EyemedBenefitAuthorization to calculate patient costs
 */

import { EyemedBenefitAuthorization, EyemedCopays, Patient, Plan } from '@/types/benefit-authorization'

// =============================================================================
// TYPES - What comes from the database (Prisma models)
// =============================================================================

export interface EyemedAuthorizationData {
  id: string
  customerId: string
  memberId: string
  memberName: string
  dateOfBirth: Date | null

  // Plan info
  network: string | null
  groupName: string | null
  groupNumber: string | null
  benefitLevel: string | null

  // Service eligibility
  examEligible: boolean
  lensesEligible: boolean
  frameEligible: boolean
  contactsEligible: boolean
  clFitEligible: boolean

  // Exam copays
  examCopay: number | null
  retinalImagingMax: number | null

  // CL Fit
  clFitStandardCopay: string | null
  clFitPremiumCopay: string | null

  // Frame benefits
  frameAllowance: number | null
  frameOverageDiscount: number | null
  frameCopay: number | null

  // Lens copays
  singleVisionCopay: number | null
  bifocalCopay: number | null
  trifocalCopay: number | null
  lenticularCopay: string | null

  // Progressive copays by tier
  progressiveStandardCopay: number | null
  progressiveTier1Copay: number | null
  progressiveTier2Copay: number | null
  progressiveTier3Copay: number | null
  progressiveTier4Copay: number | null
  progressiveTier4CopayText?: string | null
  progressiveTier5Copay?: number | null

  // Material copays (from scanner)
  polycarbonateAdultCopay?: number | null
  polycarbonateChildCopay?: number | null
  trivexCopay?: number | null
  highIndex160Copay?: number | null
  highIndex167Copay?: number | null
  highIndex174Copay?: number | null

  // Enhancement copays (from scanner)
  photochromicCopay?: number | null
  polarizedCopay?: number | null
  blueLightFilterCopay?: number | null
  tintCopay?: number | null
  mirrorCoatingCopay?: number | null

  // Contact lens benefits
  contactAllowance: number | null
  contactConventionalOverage: string | null
  contactDisposableOverage: string | null
  contactMedicallyNecessary: string | null

  // Additional glasses
  additionalGlassesAllowance: number | null
  additionalGlassesDiscount: string | null

  // Dates
  dateOfService: Date
  expirationDate: Date | null
  isActive: boolean

  // Related copays
  arCoatingCopays: EyemedArCoatingCopayData[]
  lensOptionCopays: EyemedLensOptionCopayData[]
}

export interface EyemedArCoatingCopayData {
  tier: string
  tierDescription: string | null
  copay: string
}

export interface EyemedLensOptionCopayData {
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
 * Convert database authorization data to EyemedBenefitAuthorization format
 */
export function convertToEyemedBenefitAuth(
  authData: EyemedAuthorizationData,
  patientData?: PatientData
): EyemedBenefitAuthorization {
  // Build patient info
  const patient: Patient = {
    name: patientData ? `${patientData.firstName} ${patientData.lastName}` : authData.memberName,
    dob: (patientData?.dateOfBirth ?? authData.dateOfBirth)?.toISOString().split('T')[0] ?? null,
    age: calculateAge(patientData?.dateOfBirth ?? authData.dateOfBirth),
    memberId: patientData?.memberId ?? authData.memberId,
    groupNumber: patientData?.groupNumber ?? authData.groupNumber ?? undefined,
    relationship: 'self',
  }

  // Build plan info
  const plan: Plan & { carrier: 'eyemed' } = {
    carrier: 'eyemed',
    planId: authData.memberId,
    planName: authData.groupName ?? 'EyeMed Vision',
    network: authData.network ?? undefined,
    effectiveDate: authData.dateOfService.toISOString().split('T')[0],
    expirationDate: authData.expirationDate?.toISOString().split('T')[0],
  }

  // Parse AR copays
  const arCopays = parseArCopays(authData.arCoatingCopays)

  // Parse lens option copays
  const lensOptions = parseLensOptionCopays(authData.lensOptionCopays)

  // Build copays object
  const copays: EyemedCopays = {
    exam: authData.examCopay ?? 0,
    materials: 0, // EyeMed often includes materials copay in exam or has separate

    frameAllowance: authData.frameAllowance ?? 0,
    frameOverageDiscount: (authData.frameOverageDiscount ?? 20) / 100,

    lensSv: authData.singleVisionCopay ?? 0,
    lensBifocal: authData.bifocalCopay ?? authData.singleVisionCopay ?? 0,
    lensTrifocal: authData.trifocalCopay ?? authData.singleVisionCopay ?? 0,

    progressiveStandard: authData.progressiveStandardCopay ?? 0,
    progressivePremiumTier1: authData.progressiveTier1Copay ?? 0,
    progressivePremiumTier2: authData.progressiveTier2Copay ?? 0,
    progressivePremiumTier3: authData.progressiveTier3Copay ?? 0,
    progressivePremiumTier4: authData.progressiveTier4Copay ?? 0,
    progressivePremiumTier5: authData.progressiveTier5Copay ?? 0,

    // Material copays - prefer direct fields, fall back to parsed lensOptions
    materialPolycarbonate: authData.polycarbonateAdultCopay ?? lensOptions.polycarbonate ?? 40,
    materialPolycarbonateChild: authData.polycarbonateChildCopay === 0 ? 'covered' : (authData.polycarbonateChildCopay ?? 'covered'),
    materialHighIndex: authData.highIndex160Copay ?? lensOptions.highIndex ?? 0,
    materialHighIndex167: authData.highIndex167Copay ?? lensOptions.highIndex ?? 0,
    materialHighIndex174: authData.highIndex174Copay ?? lensOptions.highIndex ?? 0,
    materialTrivex: authData.trivexCopay ?? lensOptions.trivex ?? 0,

    // AR copays from junction table
    arStandard: arCopays.standard ?? 45,
    arPremiumTier1: arCopays.tier_1 ?? 57,
    arPremiumTier2: arCopays.tier_2 ?? 68,
    arPremiumTier3: arCopays.tier_3 ?? 0,

    // Enhancement copays - prefer direct fields, fall back to parsed lensOptions
    photochromic: authData.photochromicCopay ?? lensOptions.photochromic ?? 75,
    polarized: authData.polarizedCopay ?? lensOptions.polarized ?? 0,
    blueLightFilter: authData.blueLightFilterCopay ?? lensOptions.blueLightFilter ?? 0,
    tint: authData.tintCopay ?? lensOptions.tint ?? 15,
    uvCoating: lensOptions.uvCoating ?? 15,
    scratchCoating: lensOptions.scratchCoating ?? 15,

    contactsConventional: authData.contactAllowance ?? undefined,
    contactsDisposable: authData.contactAllowance ?? undefined,
    contactsMedicallyNecessary: 0,

    // CL fitting copays
    clFitEligible: authData.clFitEligible,
    clFitStandardCopay: parseClFitCopay(authData.clFitStandardCopay),
    clFitPremiumCopay: parseClFitCopay(authData.clFitPremiumCopay),
  }

  return {
    patient,
    plan,
    frequency: {
      exam: { count: 1, periodMonths: 12 },
      frame: { count: 1, periodMonths: 12 },
      lenses: { count: 1, periodMonths: 12 },
      contacts: { count: 1, periodMonths: 12 },
    },
    copays,
    specialRules: {
      polycarbonateFreeCbildAgeMax: 18,
      progressiveNonadaptPolicy: true,
      secondPairDiscount: authData.additionalGlassesAllowance ? 0.40 : undefined,
    },
  }
}

/**
 * Parse AR coating copays from database records
 */
function parseArCopays(arCopays: EyemedArCoatingCopayData[]): {
  standard?: number
  tier_1?: number
  tier_2?: number
  tier_3?: number
} {
  const result: { standard?: number; tier_1?: number; tier_2?: number; tier_3?: number } = {}

  for (const ar of arCopays) {
    const numericCopay = parseNumericCopay(ar.copay)
    switch (ar.tier) {
      case 'standard':
        result.standard = numericCopay
        break
      case 'tier_1':
        result.tier_1 = numericCopay
        break
      case 'tier_2':
        result.tier_2 = numericCopay
        break
      case 'tier_3':
        result.tier_3 = numericCopay
        break
    }
  }

  return result
}

/**
 * Parse lens option copays from database records
 */
function parseLensOptionCopays(options: EyemedLensOptionCopayData[]): {
  polycarbonate?: number
  highIndex?: number
  trivex?: number
  photochromic?: number
  polarized?: number
  blueLightFilter?: number
  tint?: number
  uvCoating?: number
  scratchCoating?: number
} {
  const result: Record<string, number | undefined> = {}

  for (const opt of options) {
    const name = opt.optionName.toLowerCase()
    const copay = parseNumericCopay(opt.copay)

    if (name.includes('polycarbonate')) {
      result.polycarbonate = copay
    } else if (name.includes('high') && name.includes('index')) {
      result.highIndex = copay
    } else if (name.includes('trivex')) {
      result.trivex = copay
    } else if (name.includes('photochrom') || name.includes('transition')) {
      result.photochromic = copay
    } else if (name.includes('polarized')) {
      result.polarized = copay
    } else if (name.includes('blue') || name.includes('light')) {
      result.blueLightFilter = copay
    } else if (name.includes('tint')) {
      result.tint = copay
    } else if (name.includes('uv')) {
      result.uvCoating = copay
    } else if (name.includes('scratch')) {
      result.scratchCoating = copay
    }
  }

  return result
}

/**
 * Parse a copay string to number (e.g., "$45", "45", "20% off retail" -> 0)
 */
function parseNumericCopay(copay: string | null): number {
  if (!copay) return 0
  const cleaned = copay.replace(/[$,]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/**
 * Parse CL fitting copay string - can be number, "covered", or null
 */
function parseClFitCopay(copay: string | null): number | 'covered' | null {
  if (!copay) return null
  const lower = copay.toLowerCase().trim()
  if (lower === 'covered' || lower === '$0' || lower === '0') return 'covered'
  const num = parseNumericCopay(copay)
  return num
}

function parseNumericOrZero(value: string | number | null): number {
  if (value === null) return 0
  if (typeof value === 'number') return value
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
