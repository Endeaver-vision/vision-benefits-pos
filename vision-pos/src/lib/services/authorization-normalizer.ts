/**
 * Authorization Normalizer
 *
 * Transforms raw OCR-extracted insurance data (ExtractedInsuranceData)
 * into the normalized BenefitAuthorization structure used by pricing calculators.
 *
 * Each carrier has different authorization document formats:
 * - VSP: Authorization forms with wellvision exam info, frame allowances, enhancement lists
 * - EyeMed: Benefit summaries with tiered copay schedules
 * - Spectera: Verification forms with tier-based pricing
 *
 * The normalizer detects the carrier and applies carrier-specific mapping logic.
 *
 * Based on:
 * - /Documents/Supporting Documents/eyemed_dynamic_schema_v1.md
 * - /Documents/Supporting Documents/spectera_dynamic_schema_v3.md
 */

import {
  BenefitAuthorization,
  EyemedBenefitAuthorization,
  SpecteraBenefitAuthorization,
  VspBenefitAuthorization,
  Patient,
  Plan,
  Frequency,
  FrequencyBenefit,
  SpecteraFrequency,
  createEmptyEyemedAuth,
  createEmptySpecteraAuth,
  createEmptyVspAuth,
} from '@/types/benefit-authorization'

import {
  ExtractedInsuranceData,
  FieldWithConfidence,
} from '@/types/insurance-document'

// =============================================================================
// TYPES
// =============================================================================

export interface NormalizationResult {
  success: boolean
  authorization?: BenefitAuthorization
  carrier: 'eyemed' | 'spectera' | 'vsp' | 'unknown'
  confidence: number
  warnings: string[]
  errors: string[]
}

export interface NormalizationOptions {
  customerId?: string
  patientAge?: number
  fallbackCarrier?: 'eyemed' | 'spectera' | 'vsp'
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract the value from a FieldWithConfidence, with optional default
 */
function getValue<T>(field: FieldWithConfidence<T> | undefined, defaultValue: T): T {
  return field?.value ?? defaultValue
}

/**
 * Parse a frequency string like "12 months" or "24 months" into FrequencyBenefit
 */
function parseFrequency(freqString: string | null, defaultMonths: number = 12): FrequencyBenefit {
  if (!freqString) {
    return { count: 1, periodMonths: defaultMonths }
  }

  const lower = freqString.toLowerCase()

  // Check for common patterns
  if (lower.includes('24') || lower.includes('two year') || lower.includes('biennial')) {
    return { count: 1, periodMonths: 24 }
  }
  if (lower.includes('12') || lower.includes('one year') || lower.includes('annual')) {
    return { count: 1, periodMonths: 12 }
  }

  return { count: 1, periodMonths: defaultMonths }
}

/**
 * Detect carrier from extracted data
 */
function detectCarrier(data: ExtractedInsuranceData): 'eyemed' | 'spectera' | 'vsp' | 'unknown' {
  const carrierValue = getValue(data.plan?.carrier, '')?.toLowerCase() || ''
  const planName = getValue(data.plan?.benefitPlanName, '')?.toLowerCase() || ''
  const clientName = getValue(data.plan?.clientName, '')?.toLowerCase() || ''

  // Check carrier field
  if (carrierValue.includes('vsp') || carrierValue.includes('vision service plan')) {
    return 'vsp'
  }
  if (carrierValue.includes('eyemed') || carrierValue.includes('eye med')) {
    return 'eyemed'
  }
  if (carrierValue.includes('spectera') || carrierValue.includes('united')) {
    return 'spectera'
  }

  // Check plan name
  if (planName.includes('vsp') || planName.includes('signature') || planName.includes('choice') || planName.includes('wellvision')) {
    return 'vsp'
  }
  if (planName.includes('eyemed') || planName.includes('select') || planName.includes('access')) {
    return 'eyemed'
  }
  if (planName.includes('spectera')) {
    return 'spectera'
  }

  // Check client name for hints
  if (clientName.includes('vsp')) return 'vsp'
  if (clientName.includes('eyemed')) return 'eyemed'
  if (clientName.includes('spectera')) return 'spectera'

  return 'unknown'
}

/**
 * Calculate patient age from DOB string
 */
function calculateAge(dobString: string | null): number | null {
  if (!dobString) return null

  try {
    const dob = new Date(dobString)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    return age
  } catch {
    return null
  }
}

/**
 * Extract base patient info common to all carriers
 */
function extractPatient(data: ExtractedInsuranceData, options: NormalizationOptions): Patient {
  const dob = getValue(data.patient?.patientBirthDate, null)

  return {
    name: getValue(data.patient?.patientName, '') || getValue(data.patient?.memberName, ''),
    dob,
    age: options.patientAge ?? calculateAge(dob),
    memberId: getValue(data.patient?.authNumber, ''),
    relationship: parseRelationship(getValue(data.patient?.relationship, '')),
  }
}

function parseRelationship(rel: string): 'self' | 'spouse' | 'child' | 'other' {
  const lower = rel.toLowerCase()
  if (lower.includes('self') || lower.includes('subscriber') || lower.includes('employee')) return 'self'
  if (lower.includes('spouse') || lower.includes('wife') || lower.includes('husband')) return 'spouse'
  if (lower.includes('child') || lower.includes('dependent') || lower.includes('son') || lower.includes('daughter')) return 'child'
  return 'other'
}

/**
 * Extract frequency info common to all carriers
 */
function extractFrequency(data: ExtractedInsuranceData): Frequency {
  return {
    exam: parseFrequency(getValue(data.eligibility?.frequency?.examFrequency, null), 12),
    frame: parseFrequency(getValue(data.eligibility?.frequency?.frameFrequency, null), 24),
    lenses: parseFrequency(getValue(data.eligibility?.frequency?.lensFrequency, null), 12),
    contacts: parseFrequency(getValue(data.eligibility?.frequency?.contactsFrequency, null), 12),
  }
}

// =============================================================================
// VSP NORMALIZER
// =============================================================================

type VspPricingRule = 'copay' | 'lower_of_copay_or_uc' | 'lower_of_copay_or_80_uc' | '80_percent_uc' | 'add_to_base'

function normalizeToVsp(
  data: ExtractedInsuranceData,
  patient: Patient,
  options: NormalizationOptions
): { auth: VspBenefitAuthorization; warnings: string[] } {
  const warnings: string[] = []

  const plan: Plan & { carrier: 'vsp' } = {
    carrier: 'vsp',
    planId: getValue(data.patient?.authNumber, ''),
    planName: getValue(data.plan?.benefitPlanName, 'VSP Plan'),
    network: detectVspNetwork(getValue(data.plan?.benefitPlanName, '')),
    effectiveDate: getValue(data.patient?.authEffectiveDate, undefined) || undefined,
    expirationDate: getValue(data.patient?.authExpirationDate, undefined) || undefined,
  }

  // Start with empty auth and populate
  const auth = createEmptyVspAuth(patient, plan)

  // Update frequency
  auth.frequency = extractFrequency(data)

  // Copays from extracted data
  auth.copays.examWellvision = getValue(data.copays?.examCopay, 0) ?? 0
  auth.copays.materials = getValue(data.copays?.materialsCopay, 0) ?? 0

  // Frame allowances - VSP has featured vs non-featured
  const featuredAllowance = data.frame?.allowances?.altairMarchonFrameAllowance
  const nonFeaturedAllowance = data.frame?.allowances?.nonAltairMarchonFrameAllowance

  auth.copays.frameAllowanceFeatured = featuredAllowance?.allowance ?? 0
  auth.copays.frameAllowanceNonFeatured = nonFeaturedAllowance?.allowance ?? auth.copays.frameAllowanceFeatured
  auth.copays.frameOverageDiscount = featuredAllowance?.overageDiscount ?? 0.20

  // Contact lens info
  auth.copays.contactLensAllowance = getValue(data.contacts?.clExamAndMaterialsAllowance, undefined) || undefined
  auth.copays.contactLensExamCopay = getValue(data.contacts?.clExamOnlyPatientPaysOver, undefined) || undefined

  // Determine plan tier from network/plan name
  auth.planTier.tier = detectVspTier(plan.network || plan.planName)

  // Material copays from extracted data
  const matCopays = data.copays?.materialCopays
  if (matCopays) {
    const polyValue = getValue(matCopays.polycarbonate, null)
    auth.planTier.materialCopays.polycarbonate = polyValue === 'covered' ? 'covered' : (polyValue ?? 0)

    const polyChildValue = getValue(matCopays.polycarbonateChild, null)
    auth.planTier.materialCopays.polycarbonateChild = polyChildValue === 'covered' ? 'covered' : (polyChildValue ?? 'covered')

    auth.planTier.materialCopays.trivex = getValue(matCopays.trivex, 0) ?? 0
    auth.planTier.materialCopays.highIndex167 = getValue(matCopays.highIndex167, 0) ?? 0
    auth.planTier.materialCopays.highIndex174 = getValue(matCopays.highIndex174, 0) ?? 0
  }

  // Enhancement copays from extracted data
  const enhCopays = data.copays?.enhancementCopays
  if (enhCopays) {
    auth.planTier.enhancementCopays.photochromic = getValue(enhCopays.photochromic, 0) ?? 0
    auth.planTier.enhancementCopays.polarized = getValue(enhCopays.polarized, 0) ?? 0
    auth.planTier.enhancementCopays.blueLightFilter = getValue(enhCopays.blueLightFilter, 0) ?? 0
    auth.planTier.enhancementCopays.tint = getValue(enhCopays.tint, 0) ?? 0
  }

  // Parse enhancements to determine pricing rules
  auth.specialRules.pricingRules = parseVspEnhancementRules(data.enhancements)

  // Warnings for missing critical data
  if (!auth.copays.frameAllowanceFeatured) {
    warnings.push('Frame allowance not found - using $0')
  }
  if (!auth.planTier.tier) {
    warnings.push('Could not determine VSP plan tier - defaulting to "choice"')
    auth.planTier.tier = 'choice'
  }

  return { auth, warnings }
}

function detectVspNetwork(planName: string): string {
  const lower = planName.toLowerCase()
  if (lower.includes('signature')) return 'Signature'
  if (lower.includes('choice')) return 'Choice'
  if (lower.includes('advantage')) return 'Advantage'
  if (lower.includes('basic')) return 'Basic'
  return 'Choice' // Default
}

function detectVspTier(networkOrPlan: string): 'signature' | 'choice' | 'advantage' | 'basic' {
  const lower = networkOrPlan.toLowerCase()
  if (lower.includes('signature')) return 'signature'
  if (lower.includes('advantage')) return 'advantage'
  if (lower.includes('basic')) return 'basic'
  return 'choice' // Default
}

function parseVspEnhancementRules(
  enhancements: ExtractedInsuranceData['enhancements']
): { [enhancement: string]: VspPricingRule } {
  const rules: { [enhancement: string]: VspPricingRule } = {}

  // Items in "covered" list = fixed copay
  const covered = getValue(enhancements?.covered, []) || []
  for (const item of covered) {
    rules[item.toLowerCase()] = 'copay'
  }

  // Items in "coveredWithAdditionalCopay" = add to base copay
  const withCopay = getValue(enhancements?.coveredWithAdditionalCopay, []) || []
  for (const item of withCopay) {
    rules[item.toLowerCase()] = 'add_to_base'
  }

  // Items in "coveredWithAdditionalCopayOr80Uc" = lower of copay or 80% U&C
  const or80Uc = getValue(enhancements?.coveredWithAdditionalCopayOr80Uc, []) || []
  for (const item of or80Uc) {
    rules[item.toLowerCase()] = 'lower_of_copay_or_80_uc'
  }

  return rules
}

// =============================================================================
// EYEMED NORMALIZER
// =============================================================================

function normalizeToEyemed(
  data: ExtractedInsuranceData,
  patient: Patient,
  options: NormalizationOptions
): { auth: EyemedBenefitAuthorization; warnings: string[] } {
  const warnings: string[] = []

  const plan: Plan & { carrier: 'eyemed' } = {
    carrier: 'eyemed',
    planId: getValue(data.patient?.authNumber, ''),
    planName: getValue(data.plan?.benefitPlanName, 'EyeMed Plan'),
    network: detectEyemedNetwork(getValue(data.plan?.benefitPlanName, '')),
    effectiveDate: getValue(data.patient?.authEffectiveDate, undefined) || undefined,
    expirationDate: getValue(data.patient?.authExpirationDate, undefined) || undefined,
  }

  const auth = createEmptyEyemedAuth(patient, plan)

  // Update frequency
  auth.frequency = extractFrequency(data)

  // Base copays
  auth.copays.exam = getValue(data.copays?.examCopay, 0) ?? 0
  auth.copays.materials = getValue(data.copays?.materialsCopay, 0) ?? 0

  // Frame allowance - EyeMed typically has single allowance
  const featuredAllowance = data.frame?.allowances?.altairMarchonFrameAllowance
  const nonFeaturedAllowance = data.frame?.allowances?.nonAltairMarchonFrameAllowance

  auth.copays.frameAllowance = featuredAllowance?.allowance ?? nonFeaturedAllowance?.allowance ?? 0
  auth.copays.frameOverageDiscount = featuredAllowance?.overageDiscount ?? 0.20

  // Lens copays by type
  auth.copays.lensSv = getValue(data.copays?.singleVisionCopay, 0) ?? 0
  // Bifocal/trifocal - often same as SV or need extraction
  auth.copays.lensBifocal = auth.copays.lensSv  // Default to SV, update if extracted
  auth.copays.lensTrifocal = auth.copays.lensSv  // Default to SV, update if extracted

  // Progressive tier copays from extracted data
  const progCopays = data.copays?.progressiveCopays
  if (progCopays) {
    auth.copays.progressiveStandard = getValue(progCopays.standard, 0) ?? 0
    auth.copays.progressivePremiumTier1 = getValue(progCopays.tier1, 0) ?? 0
    auth.copays.progressivePremiumTier2 = getValue(progCopays.tier2, 0) ?? 0
    auth.copays.progressivePremiumTier3 = getValue(progCopays.tier3, 0) ?? 0
    auth.copays.progressivePremiumTier4 = getValue(progCopays.tier4, 0) ?? 0
    auth.copays.progressivePremiumTier5 = getValue(progCopays.tier5, 0) ?? 0

    // Check if any tier copays were actually extracted
    const hasProgressiveCopays = [
      auth.copays.progressiveStandard,
      auth.copays.progressivePremiumTier1,
      auth.copays.progressivePremiumTier2,
      auth.copays.progressivePremiumTier3,
      auth.copays.progressivePremiumTier4,
      auth.copays.progressivePremiumTier5,
    ].some(v => v > 0)

    if (!hasProgressiveCopays) {
      warnings.push('Progressive tier copays not found in document - may need manual entry')
    }
  } else {
    warnings.push('Progressive tier copays not extracted from document')
  }

  // AR tier copays
  const arCopays = data.copays?.arCopays
  if (arCopays) {
    auth.copays.arStandard = getValue(arCopays.standard, 0) ?? 0
    auth.copays.arPremiumTier1 = getValue(arCopays.tier1, 0) ?? 0
    auth.copays.arPremiumTier2 = getValue(arCopays.tier2, 0) ?? 0
    auth.copays.arPremiumTier3 = getValue(arCopays.tier3, 0) ?? 0
  }

  // Material copays
  const matCopays = data.copays?.materialCopays
  if (matCopays) {
    const polyValue = getValue(matCopays.polycarbonate, null)
    auth.copays.materialPolycarbonate = polyValue === 'covered' ? 'covered' : (polyValue ?? 0)

    const polyChildValue = getValue(matCopays.polycarbonateChild, null)
    auth.copays.materialPolycarbonateChild = polyChildValue === 'covered' ? 'covered' : (polyChildValue ?? 'covered')

    auth.copays.materialTrivex = getValue(matCopays.trivex, 0) ?? 0

    // High index - use general field, with optional specific tiers
    auth.copays.materialHighIndex = getValue(matCopays.highIndex167, 0) ?? getValue(matCopays.highIndex174, 0) ?? 0
    auth.copays.materialHighIndex167 = getValue(matCopays.highIndex167, 0) ?? auth.copays.materialHighIndex
    auth.copays.materialHighIndex174 = getValue(matCopays.highIndex174, 0) ?? auth.copays.materialHighIndex
  }

  // Enhancement copays
  const enhCopays = data.copays?.enhancementCopays
  if (enhCopays) {
    auth.copays.photochromic = getValue(enhCopays.photochromic, 0) ?? 0
    auth.copays.polarized = getValue(enhCopays.polarized, 0) ?? 0
    auth.copays.blueLightFilter = getValue(enhCopays.blueLightFilter, 0) ?? 0
    auth.copays.tint = getValue(enhCopays.tint, 0) ?? 0

    const uvValue = getValue(enhCopays.uvCoating, 0)
    auth.copays.uvCoating = uvValue === 0 ? 'covered' : uvValue

    const scratchValue = getValue(enhCopays.scratchCoating, 0)
    auth.copays.scratchCoating = scratchValue === 0 ? 'covered' : scratchValue
  }

  // Special rules
  auth.specialRules.polycarbonateFreeCbildAgeMax = 18
  if (patient.age && patient.age <= 18) {
    auth.copays.materialPolycarbonateChild = 'covered'
  }

  return { auth, warnings }
}

function detectEyemedNetwork(planName: string): string {
  const lower = planName.toLowerCase()
  if (lower.includes('select')) return 'Select'
  if (lower.includes('access')) return 'Access'
  if (lower.includes('insight')) return 'Insight'
  return 'Select' // Default
}

// =============================================================================
// SPECTERA NORMALIZER
// =============================================================================

function normalizeToSpectera(
  data: ExtractedInsuranceData,
  patient: Patient,
  options: NormalizationOptions
): { auth: SpecteraBenefitAuthorization; warnings: string[] } {
  const warnings: string[] = []

  const plan: Plan & { carrier: 'spectera' } = {
    carrier: 'spectera',
    planId: getValue(data.patient?.authNumber, ''),
    planName: getValue(data.plan?.benefitPlanName, 'Spectera Plan'),
    effectiveDate: getValue(data.patient?.authEffectiveDate, undefined) || undefined,
    expirationDate: getValue(data.patient?.authExpirationDate, undefined) || undefined,
  }

  const auth = createEmptySpecteraAuth(patient, plan)

  // Update frequency (Spectera has extended frequency types)
  const baseFreq = extractFrequency(data)
  const specteraFreq: SpecteraFrequency = {
    ...baseFreq,
    // Add pediatric/maternity if available from document
  }
  auth.frequency = specteraFreq

  // Exam copays - Spectera has multiple exam types
  // Default all to extracted exam copay, then differentiate if document provides
  const baseExamCopay = getValue(data.copays?.examCopay, 0) ?? 0
  auth.copays.examPediatric = baseExamCopay
  auth.copays.examMaternity = baseExamCopay
  auth.copays.examAdult = baseExamCopay

  // Materials copay (optional in Spectera)
  auth.copays.materials = getValue(data.copays?.materialsCopay, undefined) ?? undefined

  // Frame allowance
  const featuredAllowance = data.frame?.allowances?.altairMarchonFrameAllowance
  const nonFeaturedAllowance = data.frame?.allowances?.nonAltairMarchonFrameAllowance

  auth.copays.frameAllowance = featuredAllowance?.allowance ?? nonFeaturedAllowance?.allowance ?? 0

  // IMPORTANT: Spectera uses frameOveragePercent (what PATIENT PAYS), not discount
  // If document has overage discount 0.20 (20% off), convert to 0.80 (patient pays 80%)
  // But typical Spectera is 70% patient responsibility
  const extractedOverageDiscount = featuredAllowance?.overageDiscount ?? 0.30  // 30% discount = 70% patient pays
  auth.copays.frameOveragePercent = 1 - extractedOverageDiscount  // Convert discount to patient percent

  // Standard lens copay (Spectera uses lensStandard, not lensSv)
  auth.copays.lensStandard = getValue(data.copays?.singleVisionCopay, 0) ?? 0

  // Progressive tier copays (Spectera uses Roman numerals I-V internally, mapped from tier1-tier5)
  const progCopays = data.copays?.progressiveCopays
  if (progCopays) {
    auth.copays.progressiveTierI = getValue(progCopays.tier1, 0) ?? getValue(progCopays.standard, 0) ?? 0
    auth.copays.progressiveTierII = getValue(progCopays.tier2, 0) ?? 0
    auth.copays.progressiveTierIII = getValue(progCopays.tier3, 0) ?? 0
    auth.copays.progressiveTierIV = getValue(progCopays.tier4, 0) ?? 0
    auth.copays.progressiveTierV = getValue(progCopays.tier5, 0) ?? 0

    const hasProgressiveCopays = [
      auth.copays.progressiveTierI,
      auth.copays.progressiveTierII,
      auth.copays.progressiveTierIII,
      auth.copays.progressiveTierIV,
      auth.copays.progressiveTierV,
    ].some(v => v > 0)

    if (!hasProgressiveCopays) {
      warnings.push('Progressive tier copays not found in document - may need manual entry')
    }
  } else {
    warnings.push('Progressive tier copays not extracted from document')
  }

  // AR tier copays (Spectera uses I-IV)
  const arCopays = data.copays?.arCopays
  if (arCopays) {
    auth.copays.arTierI = getValue(arCopays.tier1, 0) ?? getValue(arCopays.standard, 0) ?? 0
    auth.copays.arTierII = getValue(arCopays.tier2, 0) ?? 0
    auth.copays.arTierIII = getValue(arCopays.tier3, 0) ?? 0
    auth.copays.arTierIV = getValue(arCopays.tier3, 0) ?? 0  // Tier IV often same as III if not specified
  }

  // Material copays - Spectera has granular high-index tiers
  const matCopays = data.copays?.materialCopays
  if (matCopays) {
    // Polycarbonate - Adult vs Child
    const polyValue = getValue(matCopays.polycarbonate, null)
    auth.copays.materialPolycarbonateAdult = typeof polyValue === 'number' ? polyValue : 0

    const polyChildValue = getValue(matCopays.polycarbonateChild, null)
    auth.copays.materialPolycarbonateChild = polyChildValue === 'covered' ? 'covered' : (typeof polyChildValue === 'number' ? polyChildValue : 'covered')

    // Trivex
    auth.copays.materialTrivex = getValue(matCopays.trivex, 0) ?? undefined

    // High index - Spectera has multiple tiers: 1.60-1.66, 1.66-1.73, 1.74+
    const hi167 = getValue(matCopays.highIndex167, 0) ?? 0
    const hi174 = getValue(matCopays.highIndex174, 0) ?? 0

    auth.copays.materialHighIndex160166 = hi167
    auth.copays.materialHighIndex166173 = hi174 || hi167  // Use 1.74 if available, else 1.67
    auth.copays.materialHighIndex174Plus = hi174 > 0 ? undefined : '80% billed'  // Often 80% billed for highest index
  }

  // Enhancement copays
  const enhCopays = data.copays?.enhancementCopays
  if (enhCopays) {
    auth.copays.photochromic = getValue(enhCopays.photochromic, 0) ?? 0

    // Polarized may be number or "80% billed"
    const polarizedValue = getValue(enhCopays.polarized, 0)
    auth.copays.polarized = polarizedValue ?? 0

    auth.copays.tint = getValue(enhCopays.tint, 0) ?? 0
    auth.copays.uvCoating = getValue(enhCopays.uvCoating, 0) ?? 0

    const scratchValue = getValue(enhCopays.scratchCoating, 0)
    auth.copays.scratchCoating = scratchValue === 0 ? 'covered' : scratchValue

    // Default polished edges to 0, would need extraction
    auth.copays.polishedEdges = 0
  }

  // Special rules
  auth.specialRules.polycarbonateFreeCbildAgeMax = 18
  if (patient.age && patient.age <= 18) {
    auth.copays.materialPolycarbonateChild = 'covered'
  }

  return { auth, warnings }
}

// =============================================================================
// MAIN NORMALIZER FUNCTION
// =============================================================================

/**
 * Normalize extracted OCR data into a BenefitAuthorization
 *
 * @param extractedData - Raw data from OCR/GPT extraction
 * @param options - Additional context (customer ID, patient age, fallback carrier)
 * @returns NormalizationResult with the authorization or errors
 */
export function normalizeAuthorization(
  extractedData: ExtractedInsuranceData,
  options: NormalizationOptions = {}
): NormalizationResult {
  const errors: string[] = []
  let warnings: string[] = []

  // Detect carrier
  let carrier = detectCarrier(extractedData)

  if (carrier === 'unknown') {
    if (options.fallbackCarrier) {
      carrier = options.fallbackCarrier
      warnings.push(`Could not detect carrier from document - using fallback: ${carrier}`)
    } else {
      return {
        success: false,
        carrier: 'unknown',
        confidence: 0,
        warnings: [],
        errors: ['Could not detect insurance carrier from document. Please specify carrier manually.'],
      }
    }
  }

  // Extract common patient info
  const patient = extractPatient(extractedData, options)

  if (!patient.name && !patient.memberId) {
    errors.push('Could not extract patient name or member ID from document')
  }

  // Normalize based on carrier
  let authorization: BenefitAuthorization | undefined

  try {
    switch (carrier) {
      case 'vsp': {
        const result = normalizeToVsp(extractedData, patient, options)
        authorization = result.auth
        warnings = [...warnings, ...result.warnings]
        break
      }
      case 'eyemed': {
        const result = normalizeToEyemed(extractedData, patient, options)
        authorization = result.auth
        warnings = [...warnings, ...result.warnings]
        break
      }
      case 'spectera': {
        const result = normalizeToSpectera(extractedData, patient, options)
        authorization = result.auth
        warnings = [...warnings, ...result.warnings]
        break
      }
    }
  } catch (error) {
    errors.push(`Failed to normalize ${carrier} authorization: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  if (errors.length > 0) {
    return {
      success: false,
      carrier,
      confidence: extractedData.overallConfidence || 0,
      warnings,
      errors,
    }
  }

  return {
    success: true,
    authorization,
    carrier,
    confidence: extractedData.overallConfidence || 0,
    warnings,
    errors: [],
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  detectCarrier,
  extractPatient,
  extractFrequency,
  normalizeToVsp,
  normalizeToEyemed,
  normalizeToSpectera,
}
