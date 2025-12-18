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

// =============================================================================
// EXTENDED NORMALIZATION RESULT (includes new fields from schema)
// =============================================================================

export interface ExtendedNormalizationResult extends NormalizationResult {
  // Provider info (for display, not pricing)
  provider?: {
    name: string | null
    npi: string | null
    locationAddress: string | null
    dateOfService: string | null
  }
  // Restrictions
  restrictions?: {
    contactsOrGlasses: boolean  // Plan allows EITHER contacts OR glasses, not both
    additionalGlassesAllowance: boolean
  }
  // VSP EasyOptions
  easyOptions?: {
    enabled: boolean
    clUpgrade: number | null
    frameUpgrade: number | null
    arCovered: boolean
    photoCovered: boolean
    progCovered: boolean
  }
  // EyeMed declining balance
  decliningBalance?: {
    clStarting: number | null
    clRemaining: number | null
  }
  // Family members on same plan
  familyMembers?: Array<{
    name: string
    memberId: string
    dateOfBirth: string | null
    relationship?: string
  }>
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
  // Base frequency from frequency strings
  const examFreq = parseFrequency(getValue(data.eligibility?.frequency?.examFrequency, null), 12)
  const frameFreq = parseFrequency(getValue(data.eligibility?.frequency?.frameFrequency, null), 24)
  const lensFreq = parseFrequency(getValue(data.eligibility?.frequency?.lensFrequency, null), 12)
  const contactsFreq = parseFrequency(getValue(data.eligibility?.frequency?.contactsFrequency, null), 12)

  // Add eligibility dates if available
  const examEligDate = getValue(data.eligibility?.examEligibleDate, null)
  const frameEligDate = getValue(data.eligibility?.frameEligibleDate, null)
  const lensEligDate = getValue(data.eligibility?.lensEligibleDate, null)
  const contactsEligDate = getValue(data.eligibility?.contactsEligibleDate, null)

  if (examEligDate) examFreq.nextEligibleDate = examEligDate
  if (frameEligDate) frameFreq.nextEligibleDate = frameEligDate
  if (lensEligDate) lensFreq.nextEligibleDate = lensEligDate
  if (contactsEligDate) contactsFreq.nextEligibleDate = contactsEligDate

  return {
    exam: examFreq,
    frame: frameFreq,
    lenses: lensFreq,
    contacts: contactsFreq,
  }
}

/**
 * Extract provider info from extracted data
 */
function extractProvider(data: ExtractedInsuranceData): ExtendedNormalizationResult['provider'] {
  if (!data.provider) return undefined

  return {
    name: getValue(data.provider.providerName, null),
    npi: getValue(data.provider.providerNpi, null),
    locationAddress: getValue(data.provider.locationAddress, null),
    dateOfService: getValue(data.provider.dateOfService, null),
  }
}

/**
 * Extract restrictions from extracted data
 */
function extractRestrictions(data: ExtractedInsuranceData): ExtendedNormalizationResult['restrictions'] {
  if (!data.eligibility?.restrictions) return undefined

  return {
    contactsOrGlasses: getValue(data.eligibility.restrictions.contactsOrGlasses, false) ?? false,
    additionalGlassesAllowance: getValue(data.eligibility.restrictions.additionalGlassesAllowance, false) ?? false,
  }
}

/**
 * Extract VSP EasyOptions from extracted data
 */
function extractEasyOptions(data: ExtractedInsuranceData): ExtendedNormalizationResult['easyOptions'] {
  if (!data.easyOptions) return undefined

  const enabled = getValue(data.easyOptions.enabled, false)
  if (!enabled) return undefined

  return {
    enabled: true,
    clUpgrade: getValue(data.easyOptions.clUpgrade, null),
    frameUpgrade: getValue(data.easyOptions.frameUpgrade, null),
    arCovered: getValue(data.easyOptions.arCovered, false) ?? false,
    photoCovered: getValue(data.easyOptions.photoCovered, false) ?? false,
    progCovered: getValue(data.easyOptions.progCovered, false) ?? false,
  }
}

/**
 * Extract EyeMed declining balance from extracted data
 */
function extractDecliningBalance(data: ExtractedInsuranceData): ExtendedNormalizationResult['decliningBalance'] {
  if (!data.decliningBalance) return undefined

  const starting = getValue(data.decliningBalance.clStarting, null)
  const remaining = getValue(data.decliningBalance.clRemaining, null)

  if (starting === null && remaining === null) return undefined

  return {
    clStarting: starting,
    clRemaining: remaining,
  }
}

/**
 * Extract family members from extracted data
 */
function extractFamilyMembers(data: ExtractedInsuranceData): ExtendedNormalizationResult['familyMembers'] {
  if (!data.familyMembers || data.familyMembers.length === 0) return undefined

  return data.familyMembers.map(member => ({
    name: member.name,
    memberId: member.memberId,
    dateOfBirth: member.dateOfBirth,
    relationship: member.relationship,
  }))
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

  // Check for upgraded allowances from EasyOptions
  const easyOptions = data.easyOptions
  const hasEasyOptionsFrame = easyOptions && getValue(easyOptions.enabled, false) && getValue(easyOptions.frameUpgrade, null)

  if (hasEasyOptionsFrame) {
    // Use upgraded frame allowance from EasyOptions
    auth.copays.frameAllowanceFeatured = getValue(data.frame?.allowances?.marchonUpgradedAllowance, null) ??
                                          getValue(easyOptions!.frameUpgrade, null) ??
                                          featuredAllowance?.allowance ?? 0
    auth.copays.frameAllowanceNonFeatured = getValue(data.frame?.allowances?.standardUpgradedAllowance, null) ??
                                             getValue(easyOptions!.frameUpgrade, null) ??
                                             nonFeaturedAllowance?.allowance ?? auth.copays.frameAllowanceFeatured
  } else {
    auth.copays.frameAllowanceFeatured = featuredAllowance?.allowance ?? 0
    auth.copays.frameAllowanceNonFeatured = nonFeaturedAllowance?.allowance ?? auth.copays.frameAllowanceFeatured
  }
  auth.copays.frameOverageDiscount = featuredAllowance?.overageDiscount ?? 0.20

  // Contact lens info - check for upgraded allowance from EasyOptions
  // Note: GPT sometimes returns clMaterialsAllowance instead of clExamAndMaterialsAllowance
  const getClAllowance = () => {
    const contacts = data.contacts as unknown as Record<string, { value: number | null; confidence: number } | undefined> | undefined
    return getValue(data.contacts?.clExamAndMaterialsAllowance, null) ??
           (contacts?.clMaterialsAllowance?.value ?? null)
  }

  const hasEasyOptionsCl = easyOptions && getValue(easyOptions.enabled, false) && getValue(easyOptions.clUpgrade, null)
  if (hasEasyOptionsCl) {
    const clAllowance = getValue(data.contacts?.clAllowanceUpgraded, null) ??
                        getValue(easyOptions!.clUpgrade, null) ??
                        getClAllowance()
    auth.copays.contactLensAllowance = clAllowance ?? undefined
  } else {
    auth.copays.contactLensAllowance = getClAllowance() ?? undefined
  }
  auth.copays.contactLensExamCopay = getValue(data.contacts?.clExamOnlyPatientPaysOver, null) ?? undefined

  // Determine plan tier from network/plan name
  auth.planTier.tier = detectVspTier(plan.network || plan.planName)

  // Material copays from extracted data - prefer vspLensCharges if available
  const vspCharges = data.vspLensCharges
  const matCopays = data.copays?.materialCopays

  if (vspCharges?.polycarbonate) {
    // Use detailed VSP lens charges
    auth.planTier.materialCopays.polycarbonate = getValue(vspCharges.polycarbonate.baseSv, 0) ?? 0
    auth.planTier.materialCopays.polycarbonateChild = 'covered' // VSP typically covers poly for children
    auth.planTier.materialCopays.trivex = getValue(vspCharges.highIndex?.trivex160Sv, 0) ?? 0
    auth.planTier.materialCopays.highIndex167 = getValue(vspCharges.highIndex?.hi166Sv, 0) ?? 0
    auth.planTier.materialCopays.highIndex174 = getValue(vspCharges.highIndex?.hi170Sv, 0) ?? 0
  } else if (matCopays) {
    // Fall back to standard material copays
    const polyValue = getValue(matCopays.polycarbonate, null)
    auth.planTier.materialCopays.polycarbonate = polyValue === 'covered' ? 'covered' : (polyValue ?? 0)

    const polyChildValue = getValue(matCopays.polycarbonateChild, null)
    auth.planTier.materialCopays.polycarbonateChild = polyChildValue === 'covered' ? 'covered' : (polyChildValue ?? 'covered')

    auth.planTier.materialCopays.trivex = getValue(matCopays.trivex, 0) ?? 0
    auth.planTier.materialCopays.highIndex167 = getValue(matCopays.highIndex167, 0) ?? 0
    auth.planTier.materialCopays.highIndex174 = getValue(matCopays.highIndex174, 0) ?? 0
  }

  // Progressive copays from vspLensCharges
  if (vspCharges?.progressives) {
    const progs = vspCharges.progressives
    if (progs.standardK?.plastic !== undefined) auth.planTier.progressiveCopays['KA'] = progs.standardK.plastic ?? 0
    if (progs.premiumF?.plastic !== undefined) auth.planTier.progressiveCopays['FA'] = progs.premiumF.plastic ?? 0
    if (progs.premiumJ?.plastic !== undefined) auth.planTier.progressiveCopays['JA'] = progs.premiumJ.plastic ?? 0
    if (progs.customN !== undefined) auth.planTier.progressiveCopays['NA'] = progs.customN ?? 0
    if (progs.customO !== undefined) auth.planTier.progressiveCopays['OA'] = progs.customO ?? 0
  }

  // AR copays from vspLensCharges
  if (vspCharges?.coatings) {
    const coatings = vspCharges.coatings
    if (getValue(coatings.arA, null) !== null) auth.planTier.arCopays['QM'] = getValue(coatings.arA, 0) ?? 0
    if (getValue(coatings.arC, null) !== null) auth.planTier.arCopays['QT'] = getValue(coatings.arC, 0) ?? 0
    if (getValue(coatings.arD, null) !== null) auth.planTier.arCopays['QV'] = getValue(coatings.arD, 0) ?? 0
  }

  // Enhancement copays from extracted data - check EasyOptions coverage
  const enhCopays = data.copays?.enhancementCopays
  if (enhCopays) {
    // If EasyOptions covers these, set to 0
    const arCoveredByEasyOptions = easyOptions && getValue(easyOptions.enabled, false) && getValue(easyOptions.arCovered, false)
    const photoCoveredByEasyOptions = easyOptions && getValue(easyOptions.enabled, false) && getValue(easyOptions.photoCovered, false)
    const progCoveredByEasyOptions = easyOptions && getValue(easyOptions.enabled, false) && getValue(easyOptions.progCovered, false)

    auth.planTier.enhancementCopays.photochromic = photoCoveredByEasyOptions ? 0 : (getValue(enhCopays.photochromic, 0) ?? 0)
    auth.planTier.enhancementCopays.polarized = getValue(enhCopays.polarized, 0) ?? 0
    auth.planTier.enhancementCopays.blueLightFilter = getValue(enhCopays.blueLightFilter, 0) ?? 0
    auth.planTier.enhancementCopays.tint = getValue(enhCopays.tint, 0) ?? 0

    // Store EasyOptions coverage info in special rules for progressive handling
    if (progCoveredByEasyOptions) {
      auth.specialRules.pricingRules['progressive'] = 'copay'
    }
    if (arCoveredByEasyOptions) {
      auth.specialRules.pricingRules['ar'] = 'copay'
    }
  } else if (vspCharges) {
    // Use vspLensCharges for enhancements
    if (vspCharges.photochromic) {
      auth.planTier.enhancementCopays.photochromic = getValue(vspCharges.photochromic.plasticSv, 0) ?? 0
    }
    if (vspCharges.polarized) {
      auth.planTier.enhancementCopays.polarized = getValue(vspCharges.polarized.plasticSv, 0) ?? 0
    }
    if (vspCharges.tints) {
      auth.planTier.enhancementCopays.tint = getValue(vspCharges.tints.plasticSolid, 0) ?? 0
    }
    if (vspCharges.misc?.lightFilter) {
      auth.planTier.enhancementCopays.blueLightFilter = getValue(vspCharges.misc.lightFilter, 0) ?? 0
    }
  }

  // Parse enhancements to determine pricing rules
  const enhancementRules = parseVspEnhancementRules(data.enhancements)
  auth.specialRules.pricingRules = { ...auth.specialRules.pricingRules, ...enhancementRules }

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

  // Frame allowance - EyeMed may have wholesale/retail range or single allowance
  const frameAllowances = data.frame?.allowances
  const featuredAllowance = frameAllowances?.altairMarchonFrameAllowance
  const nonFeaturedAllowance = frameAllowances?.nonAltairMarchonFrameAllowance

  // Prefer generic frame allowance, then fall back to featured/non-featured
  auth.copays.frameAllowance = getValue(frameAllowances?.frameAllowance, null) ??
                               getValue(frameAllowances?.retailMinAllowance, null) ??
                               featuredAllowance?.allowance ??
                               nonFeaturedAllowance?.allowance ?? 0

  // EyeMed overage - use frameOveragePercent if available
  const overagePercent = getValue(frameAllowances?.frameOveragePercent, null)
  if (overagePercent !== null) {
    // frameOveragePercent is what patient pays (e.g., 80 = 80%), convert to discount (20%)
    auth.copays.frameOverageDiscount = (100 - overagePercent) / 100
  } else {
    auth.copays.frameOverageDiscount = featuredAllowance?.overageDiscount ?? 0.20
  }

  // Lens copays by type
  auth.copays.lensSv = getValue(data.copays?.singleVisionCopay, 0) ?? 0
  // Bifocal/trifocal - use extracted values if available
  auth.copays.lensBifocal = getValue(data.copays?.bifocalCopay, null) ?? auth.copays.lensSv
  auth.copays.lensTrifocal = getValue(data.copays?.trifocalCopay, null) ?? auth.copays.lensSv

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
    auth.copays.materialHighIndex167 = getValue(matCopays.highIndex167, 0) ?? getValue(matCopays.highIndex166, 0) ?? auth.copays.materialHighIndex
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

  // Contact lens fitting copays
  const clFit = data.clFit
  if (clFit) {
    auth.copays.clFitEligible = true
    const standardCost = getValue(clFit.standardCost, null)
    const premiumCost = getValue(clFit.premiumCost, null)

    // Handle string or number cost values
    if (standardCost !== null) {
      auth.copays.clFitStandardCopay = typeof standardCost === 'number' ? standardCost :
                                        standardCost === '0' ? 0 :
                                        standardCost.toLowerCase().includes('covered') ? 'covered' : null
    }
    if (premiumCost !== null) {
      auth.copays.clFitPremiumCopay = typeof premiumCost === 'number' ? premiumCost :
                                       premiumCost === '0' ? 0 :
                                       premiumCost.toLowerCase().includes('covered') ? 'covered' : null
    }
  }

  // Contact lens materials - check for EyeMed declining balance
  const decliningBalance = data.decliningBalance
  if (decliningBalance) {
    const remaining = getValue(decliningBalance.clRemaining, null)
    if (remaining !== null) {
      // Use remaining balance as contact lens allowance
      auth.copays.contactsConventional = 0  // Full remaining balance applies
      auth.copays.contactsDisposable = 0
    }
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
 * @returns ExtendedNormalizationResult with the authorization, extended fields, or errors
 */
export function normalizeAuthorization(
  extractedData: ExtractedInsuranceData,
  options: NormalizationOptions = {}
): ExtendedNormalizationResult {
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

  // Extract extended fields (common to all carriers)
  const provider = extractProvider(extractedData)
  const restrictions = extractRestrictions(extractedData)
  const familyMembers = extractFamilyMembers(extractedData)

  // Carrier-specific extended fields
  const easyOptions = carrier === 'vsp' ? extractEasyOptions(extractedData) : undefined
  const decliningBalance = carrier === 'eyemed' ? extractDecliningBalance(extractedData) : undefined

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

  // Add warning if contacts_or_glasses restriction is active
  if (restrictions?.contactsOrGlasses) {
    warnings.push('Plan restriction: Patient can choose EITHER contacts OR glasses, not both')
  }

  return {
    success: true,
    authorization,
    carrier,
    confidence: extractedData.overallConfidence || 0,
    warnings,
    errors: [],
    // Extended fields
    provider,
    restrictions,
    easyOptions,
    decliningBalance,
    familyMembers,
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  detectCarrier,
  extractPatient,
  extractFrequency,
  extractProvider,
  extractRestrictions,
  extractEasyOptions,
  extractDecliningBalance,
  extractFamilyMembers,
  normalizeToVsp,
  normalizeToEyemed,
  normalizeToSpectera,
}
