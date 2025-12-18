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
  // Raw OCR data for additional fields not in main columns
  rawPatientReport?: Record<string, unknown> | null
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

  // Build plan tier - NO DEFAULTS, only use scanned data
  const planTier: VspPlanTier = {
    tier: mapPlanTypeToTier(authData.planType),
    progressiveCopays,
    arCopays,
    materialCopays: {
      polycarbonate: materialCopays['AD'] ?? null,
      polycarbonateChild: 'covered',
      trivex: materialCopays['AB'] ?? null,
      highIndex167: materialCopays['AH'] ?? null,
      highIndex174: materialCopays['AJ'] ?? null,
    },
    enhancementCopays: {
      photochromic: enhancementCopays['PR'] ?? null,
      polarized: enhancementCopays['DA'] ?? null,
      blueLightFilter: enhancementCopays['LF'] ?? null,
      tint: enhancementCopays['MN'] ?? null,
      rimlessDrill: enhancementCopays['SW'] ?? null,
      edgePolish: enhancementCopays['SP'] ?? null,
      edgeCoating: enhancementCopays['SQ'] ?? null,
    },
    // Raw enhancement copays keyed by VSP code for tier-based lookups
    lensEnhancementCopays: enhancementCopays,
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
      // NO DEFAULTS - only use scanned data, null if missing
      examWellvision: authData.examCopay,
      materials: authData.materialsCopay,
      frameAllowanceFeatured: authData.frameAllowanceMarchon,
      frameAllowanceNonFeatured: authData.frameAllowanceRetail,
      // Normalize frameOverageDiscount to decimal (0.20 = 20%)
      frameOverageDiscount: authData.frameOverageDiscount !== null
        ? normalizeOverageDiscount(authData.frameOverageDiscount)
        : null,
      contactLensAllowance: authData.contactAllowance,
      contactFittingCovered: authData.contactFittingCovered,
      // Extract contact lens exam copay from raw OCR data
      contactLensExamCopay: extractContactLensExamCopay(authData.rawPatientReport),
    },
    planTier,
    specialRules: {
      pricingRules: buildPricingRules(),
      polycarbonateFreeCbildAgeMax: 18,
    },
  }
}

/**
 * Build copay lookup maps from the lens enhancement data
 * NO DEFAULTS - returns only what was actually scanned
 */
function buildCopayMaps(copays: VspLensEnhancementCopayData[]): {
  progressiveCopays: { [code: string]: number | null }
  arCopays: { [code: string]: number | null }
  materialCopays: { [code: string]: number | null }
  enhancementCopays: { [code: string]: number | null }
} {
  // Start with empty maps - NO DEFAULTS
  const progressiveCopays: { [code: string]: number | null } = {}
  const arCopays: { [code: string]: number | null } = {}
  const materialCopays: { [code: string]: number | null } = {}
  const enhancementCopays: { [code: string]: number | null } = {}

  // If no copays data, return empty maps
  if (!copays || copays.length === 0) {
    return { progressiveCopays, arCopays, materialCopays, enhancementCopays }
  }

  // Progressive base codes (use multifocal copay)
  const progressiveCodes = ['NA', 'OA', 'FA', 'JA', 'KA']

  // AR coating codes
  const arCodes = ['QM', 'QT', 'QV']

  // Material codes (use SV copay for standalone, MF when combined)
  const materialModifierCodes = ['AD', 'AB', 'AH', 'AJ', 'AA', 'BA']

  // Enhancement codes (including mount fees)
  const enhancementCodes = ['PR', 'DA', 'MN', 'MP', 'LF', 'SW', 'SP', 'SQ']

  for (const copay of copays) {
    const code = copay.code
    // Get the copay value - prefer multifocal, fallback to single vision, null if neither
    const copayValue = copay.copayMultifocal ?? copay.copaySingleVision ?? null

    // Progressive lenses
    if (progressiveCodes.includes(code)) {
      progressiveCopays[code] = copayValue
    }
    // AR coatings
    else if (arCodes.includes(code)) {
      arCopays[code] = copayValue
    }
    // Material modifiers
    else if (materialModifierCodes.includes(code)) {
      materialCopays[code] = copayValue
    }
    // Enhancements
    else if (enhancementCodes.includes(code)) {
      enhancementCopays[code] = copayValue
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
 * Normalize frameOverageDiscount to decimal format (0.20 = 20%)
 * Database may store as integer (20 for 20%) or decimal (0.20 for 20%)
 * NO DEFAULT - returns null if no data
 */
function normalizeOverageDiscount(discount: number | null): number | null {
  if (discount === null || discount === undefined) {
    return null // No default - missing is missing
  }
  // If discount > 1, assume it's stored as integer (20 = 20%)
  // If discount <= 1, assume it's already decimal (0.20 = 20%)
  if (discount > 1) {
    return discount / 100
  }
  return discount
}

/**
 * Extract contact lens exam copay from raw OCR patient report
 *
 * Tries multiple sources:
 * 1. contacts.clExamOnlyPatientPaysOver.value (direct numeric extraction)
 * 2. contacts.clExamCopay.value (parse number from text like "lesser of 60 copay or 85% U&C")
 * 3. contacts.clExamDiscount.value (legacy field name)
 *
 * Represents what patient pays for contact lens fitting (e.g., $60)
 */
function extractContactLensExamCopay(rawPatientReport: Record<string, unknown> | null | undefined): number | undefined {
  if (!rawPatientReport) return undefined

  const contacts = rawPatientReport.contacts as Record<string, unknown> | undefined
  if (!contacts) return undefined

  // Try direct numeric field first
  const clExamField = contacts.clExamOnlyPatientPaysOver as { value: number | null; confidence: number } | undefined
  if (clExamField?.value !== null && clExamField?.value !== undefined) {
    return clExamField.value
  }

  // Try clExamCopay field (common field name from GPT extraction)
  const clExamCopay = contacts.clExamCopay as { value: string | number | null; confidence: number } | undefined
  if (clExamCopay?.value) {
    // If it's already a number, return it
    if (typeof clExamCopay.value === 'number') {
      return clExamCopay.value
    }
    // Parse number from text (e.g., "lesser of 60 copay or 85% U&C")
    const match = String(clExamCopay.value).match(/(\d+(?:\.\d{2})?)\s*(?:copay|co-pay)/i)
    if (match) {
      return parseFloat(match[1])
    }
  }

  // Fallback: parse number from clExamDiscount text (legacy field name)
  const clExamDiscount = contacts.clExamDiscount as { value: string | null; confidence: number } | undefined
  if (clExamDiscount?.value) {
    // Look for patterns like "60 copay", "$60", "60.00"
    const match = clExamDiscount.value.match(/(\d+(?:\.\d{2})?)\s*(?:copay|co-pay)/i)
    if (match) {
      return parseFloat(match[1])
    }
  }

  return undefined
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
    frameOverageDiscount: 0.20, // 20% discount stored as decimal
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
