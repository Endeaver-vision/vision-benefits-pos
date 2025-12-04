/**
 * VSP Authorization Service
 *
 * Converts data from VSP authorization scans (stored in Prisma) into
 * VspBenefitAuthorization format for the pricing calculator.
 *
 * Flow:
 * 1. Scan VSP authorization PDF (Patient Record Report + Lens Enhancement Charges)
 * 2. Extract data and store in VspAuthorization + VspLensEnhancementCopay tables
 * 3. This service converts that DB data into VspBenefitAuthorization
 * 4. Pricing calculator uses VspBenefitAuthorization to calculate patient costs
 */

import { VspBenefitAuthorization, VspPlanTier, Patient, Plan } from '@/types/benefit-authorization'

// =============================================================================
// TYPES - What comes from the database (Prisma models)
// =============================================================================

export interface VspAuthorizationData {
  id: string
  customerId: string
  authorizationNumber: string
  planName: string
  planType: 'SIGNATURE' | 'CHOICE' | 'ADVANTAGE' | 'ENHANCED_ADVANTAGE' | 'ESSENTIALS' | 'OTHER'
  examCopay: number | null
  materialsCopay: number | null
  frameAllowanceRetail: number | null
  frameAllowanceMarchon: number | null
  frameOverageDiscount: number | null
  contactAllowance: number | null
  contactFittingCovered: boolean
  authDate: Date
  expirationDate: Date | null
  serviceYear: number | null
  isActive: boolean
  lensEnhancementCopays: VspLensEnhancementCopayData[]
}

export interface VspLensEnhancementCopayData {
  code: string
  description: string
  copaySingleVision: number | null
  copayMultifocal: number | null
  isAddonCode: boolean
  baseCode: string | null
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
 * Convert database authorization data to VspBenefitAuthorization format
 */
export function convertToVspBenefitAuth(
  authData: VspAuthorizationData,
  patientData: PatientData
): VspBenefitAuthorization {
  // Build patient info
  const patient: Patient = {
    name: `${patientData.firstName} ${patientData.lastName}`,
    dob: patientData.dateOfBirth?.toISOString().split('T')[0] ?? null,
    age: patientData.dateOfBirth ? calculateAge(patientData.dateOfBirth) : null,
    memberId: patientData.memberId ?? '',
    groupNumber: patientData.groupNumber,
    relationship: 'self',
  }

  // Build plan info
  const plan: Plan & { carrier: 'vsp' } = {
    carrier: 'vsp',
    planId: authData.authorizationNumber,
    planName: authData.planName,
    network: mapPlanTypeToNetwork(authData.planType),
    effectiveDate: authData.authDate.toISOString().split('T')[0],
    expirationDate: authData.expirationDate?.toISOString().split('T')[0],
  }

  // Build copays lookup maps from lens enhancement data
  const { progressiveCopays, arCopays, materialCopays, enhancementCopays } =
    buildCopayMaps(authData.lensEnhancementCopays)

  // Build plan tier
  const planTier: VspPlanTier = {
    tier: mapPlanTypeToTier(authData.planType),
    progressiveCopays,
    arCopays,
    materialCopays: {
      polycarbonate: materialCopays['AD'] ?? 35,
      polycarbonateChild: 'covered',
      trivex: materialCopays['AB'] ?? 56,
      highIndex167: materialCopays['AH'] ?? 98,
      highIndex174: materialCopays['AJ'] ?? 118,
    },
    enhancementCopays: {
      photochromic: enhancementCopays['PR'] ?? 75,
      polarized: enhancementCopays['DA'] ?? 77,
      blueLightFilter: enhancementCopays['LF'] ?? 15,
      tint: enhancementCopays['MN'] ?? 15,
    },
  }

  return {
    patient,
    plan,
    frequency: {
      exam: { count: 1, periodMonths: 12 },
      frame: { count: 1, periodMonths: 24 },
      lenses: { count: 1, periodMonths: 12 },
    },
    copays: {
      examWellvision: authData.examCopay ?? 10,
      materials: authData.materialsCopay ?? 25,
      frameAllowanceFeatured: authData.frameAllowanceMarchon ?? 220,
      frameAllowanceNonFeatured: authData.frameAllowanceRetail ?? 200,
      frameOverageDiscount: (authData.frameOverageDiscount ?? 20) / 100, // Convert percentage to decimal
      contactLensAllowance: authData.contactAllowance ?? undefined,
    },
    planTier,
    specialRules: {
      pricingRules: buildPricingRules(),
      polycarbonateFreeCbildAgeMax: 18,
    },
  }
}

/**
 * Default VSP Choice tier copays (used when no scanned data exists)
 * Based on standard VSP Choice plan pricing
 */
const DEFAULT_VSP_CHOICE_COPAYS = {
  progressive: {
    'KA': 55,   // Standard progressive
    'JA': 95,   // Premium tier 1
    'FA': 120,  // Premium tier 2
    'OA': 150,  // Premium tier 3
    'NA': 175,  // Premium tier 4
  },
  ar: {
    'QM': 0,    // Standard AR (covered)
    'QT': 45,   // Premium AR tier 1
    'QV': 65,   // Premium AR tier 2
  },
  material: {
    'AD': 35,   // Polycarbonate
    'AB': 56,   // Trivex
    'AH': 98,   // High index 1.67
    'AJ': 118,  // High index 1.74
  },
  enhancement: {
    'PR': 75,   // Photochromic
    'DA': 77,   // Polarized
    'LF': 15,   // Blue light filter
    'MN': 15,   // Tint
  },
}

/**
 * Build copay lookup maps from the lens enhancement data
 * Falls back to default VSP Choice copays when no data exists
 */
function buildCopayMaps(copays: VspLensEnhancementCopayData[]): {
  progressiveCopays: { [code: string]: number }
  arCopays: { [code: string]: number }
  materialCopays: { [code: string]: number }
  enhancementCopays: { [code: string]: number }
} {
  // If no copays data, return defaults
  if (!copays || copays.length === 0) {
    return {
      progressiveCopays: { ...DEFAULT_VSP_CHOICE_COPAYS.progressive },
      arCopays: { ...DEFAULT_VSP_CHOICE_COPAYS.ar },
      materialCopays: { ...DEFAULT_VSP_CHOICE_COPAYS.material },
      enhancementCopays: { ...DEFAULT_VSP_CHOICE_COPAYS.enhancement },
    }
  }

  // Start with defaults, then override with scanned data
  const progressiveCopays: { [code: string]: number } = { ...DEFAULT_VSP_CHOICE_COPAYS.progressive }
  const arCopays: { [code: string]: number } = { ...DEFAULT_VSP_CHOICE_COPAYS.ar }
  const materialCopays: { [code: string]: number } = { ...DEFAULT_VSP_CHOICE_COPAYS.material }
  const enhancementCopays: { [code: string]: number } = { ...DEFAULT_VSP_CHOICE_COPAYS.enhancement }

  // Progressive base codes (use multifocal copay)
  const progressiveCodes = ['NA', 'OA', 'FA', 'JA', 'KA']

  // AR coating codes
  const arCodes = ['QM', 'QT', 'QV']

  // Material codes (use SV copay for standalone, MF when combined)
  const materialModifierCodes = ['AD', 'AB', 'AH', 'AJ', 'AA', 'BA']

  // Enhancement codes
  const enhancementCodes = ['PR', 'DA', 'MN', 'MP', 'LF']

  for (const copay of copays) {
    const code = copay.code

    // Progressive lenses - use multifocal copay
    if (progressiveCodes.includes(code)) {
      progressiveCopays[code] = copay.copayMultifocal ?? copay.copaySingleVision ?? progressiveCopays[code] ?? 0
    }

    // AR coatings - use either copay (they're usually the same for AR)
    else if (arCodes.includes(code)) {
      arCopays[code] = copay.copayMultifocal ?? copay.copaySingleVision ?? arCopays[code] ?? 0
    }

    // Material modifiers - use MF copay for progressives context
    else if (materialModifierCodes.includes(code)) {
      materialCopays[code] = copay.copayMultifocal ?? copay.copaySingleVision ?? materialCopays[code] ?? 0
    }

    // Enhancements
    else if (enhancementCodes.includes(code)) {
      enhancementCopays[code] = copay.copayMultifocal ?? copay.copaySingleVision ?? enhancementCopays[code] ?? 0
    }
  }

  return { progressiveCopays, arCopays, materialCopays, enhancementCopays }
}

/**
 * Build standard VSP pricing rules
 */
function buildPricingRules(): { [enhancement: string]: 'copay' | 'lower_of_copay_or_uc' | 'lower_of_copay_or_80_uc' | '80_percent_uc' | 'add_to_base' } {
  return {
    // Progressives - usually copay or lower of copay/80% U&C
    NA: 'lower_of_copay_or_80_uc',
    OA: 'lower_of_copay_or_80_uc',
    FA: 'lower_of_copay_or_80_uc',
    JA: 'lower_of_copay_or_80_uc',
    KA: 'lower_of_copay_or_80_uc',
    // AR coatings
    QM: 'lower_of_copay_or_80_uc',
    QT: 'lower_of_copay_or_80_uc',
    QV: 'lower_of_copay_or_80_uc',
    // Materials - add to base progressive
    AD: 'add_to_base',
    AH: 'add_to_base',
    AB: 'add_to_base',
    AJ: 'add_to_base',
    // Enhancements
    PR: 'copay',
    DA: 'copay',
    MN: 'copay',
    MP: 'copay',
    LF: 'copay',
  }
}

/**
 * Map plan type enum to tier
 */
function mapPlanTypeToTier(planType: VspAuthorizationData['planType']): VspPlanTier['tier'] {
  switch (planType) {
    case 'SIGNATURE':
      return 'signature'
    case 'CHOICE':
      return 'choice'
    case 'ADVANTAGE':
    case 'ENHANCED_ADVANTAGE':
      return 'advantage'
    case 'ESSENTIALS':
      return 'basic'
    default:
      return 'choice'
  }
}

/**
 * Map plan type to network name
 */
function mapPlanTypeToNetwork(planType: VspAuthorizationData['planType']): string {
  switch (planType) {
    case 'SIGNATURE':
      return 'Signature'
    case 'CHOICE':
      return 'Choice'
    case 'ADVANTAGE':
      return 'Advantage'
    case 'ENHANCED_ADVANTAGE':
      return 'Enhanced Advantage'
    case 'ESSENTIALS':
      return 'Essentials'
    default:
      return 'VSP'
  }
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dob: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

// =============================================================================
// EXAMPLE: Calculate pricing for sample patient
// =============================================================================

/**
 * Example function showing how to calculate pricing for a VSP patient
 *
 * Usage:
 * 1. Get VspAuthorization + VspLensEnhancementCopay from Prisma
 * 2. Get Customer/Patient data from Prisma
 * 3. Call convertToVspBenefitAuth()
 * 4. Pass result to VspPricingCalculator.calculateProduct()
 */
export function exampleUsage() {
  // This would come from Prisma query:
  const mockAuthData: VspAuthorizationData = {
    id: 'auth_123',
    customerId: 'cust_456',
    authorizationNumber: '82317089',
    planName: 'VSP Choice Plan',
    planType: 'CHOICE',
    examCopay: 10,
    materialsCopay: 25,
    frameAllowanceRetail: 200,
    frameAllowanceMarchon: 220,
    frameOverageDiscount: 20,
    contactAllowance: null,
    contactFittingCovered: false,
    authDate: new Date('2025-12-01'),
    expirationDate: new Date('2026-12-01'),
    serviceYear: 2025,
    isActive: true,
    lensEnhancementCopays: [
      { code: 'NA', description: 'Progressive N - Plastic', copaySingleVision: null, copayMultifocal: 175, isAddonCode: false, baseCode: null },
      { code: 'FA', description: 'Progressive F - Plastic', copaySingleVision: null, copayMultifocal: 105, isAddonCode: false, baseCode: null },
      { code: 'QV', description: 'Anti-reflective D', copaySingleVision: 85, copayMultifocal: 85, isAddonCode: false, baseCode: null },
      { code: 'AD', description: 'Polycarbonate', copaySingleVision: 35, copayMultifocal: 35, isAddonCode: false, baseCode: null },
      { code: 'AH', description: 'High-index 1.66/1.67', copaySingleVision: 83, copayMultifocal: 98, isAddonCode: false, baseCode: null },
      { code: 'PR', description: 'Photochromics - Plastic', copaySingleVision: 75, copayMultifocal: 75, isAddonCode: false, baseCode: null },
    ],
  }

  const mockPatientData: PatientData = {
    firstName: 'Alberto',
    lastName: 'Burgos',
    dateOfBirth: new Date('1985-06-15'),
    memberId: '123456789',
    groupNumber: 'GRP001',
  }

  const benefitAuth = convertToVspBenefitAuth(mockAuthData, mockPatientData)

  console.log('VSP Benefit Authorization:')
  console.log(JSON.stringify(benefitAuth, null, 2))

  // Now you can use this with VspPricingCalculator:
  // const calculator = new VspPricingCalculator()
  // const result = calculator.calculateProduct(product, benefitAuth)

  return benefitAuth
}
