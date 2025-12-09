/**
 * BenefitAuthorization - Normalized insurance authorization data
 *
 * This is the canonical shape that OCR/vision output gets normalized into.
 * Each carrier has slightly different fields, but they all conform to this base structure.
 * The pricing calculators consume this to determine patient costs.
 *
 * Based on:
 * - /Documents/Supporting Documents/eyemed_dynamic_schema_v1.md
 * - /Documents/Supporting Documents/spectera_dynamic_schema_v3.md
 */

// =============================================================================
// BASE TYPES (shared across all carriers)
// =============================================================================

export interface Patient {
  name: string
  dob: string | null
  age: number | null
  memberId: string
  groupNumber?: string
  relationship?: 'self' | 'spouse' | 'child' | 'other'
}

export interface Plan {
  carrier: 'eyemed' | 'spectera' | 'vsp'
  planId: string
  planName: string
  network?: string // "Select", "Access", "Choice", "Signature", "Insight", etc.
  effectiveDate?: string
  expirationDate?: string
}

export interface FrequencyBenefit {
  count: number        // How many times covered
  periodMonths: number // Per how many months (12 = annual, 24 = biennial)
  lastUsedDate?: string
  nextEligibleDate?: string
}

export interface Frequency {
  exam: FrequencyBenefit
  frame: FrequencyBenefit
  lenses: FrequencyBenefit
  contacts?: FrequencyBenefit
}

// =============================================================================
// EYEMED-SPECIFIC AUTHORIZATION
// Based on eyemed_dynamic_schema_v1.md
// =============================================================================

export interface EyemedCopays {
  // Base copays
  exam: number
  materials: number  // EyeMed has separate materials copay (often $25)

  // Frame
  frameAllowance: number
  frameOverageDiscount: number // e.g., 0.20 = 20% discount off overage (patient pays 80%)

  // Lens copays by type
  lensSv: number        // Single vision
  lensBifocal: number   // Bifocal
  lensTrifocal: number  // Trifocal

  // Progressives by tier (patient copay amounts)
  // EyeMed uses: standard, tier_1, tier_2, tier_3, tier_4, tier_5
  progressiveStandard: number        // Standard progressive (non-premium)
  progressivePremiumTier1: number    // Premium tier 1
  progressivePremiumTier2: number    // Premium tier 2
  progressivePremiumTier3: number    // Premium tier 3
  progressivePremiumTier4: number    // Premium tier 4
  progressivePremiumTier5: number    // Premium tier 5

  // Materials
  materialPolycarbonate: number | 'covered'
  materialPolycarbonateChild: number | 'covered'
  materialHighIndex: number          // General high index
  materialHighIndex167?: number      // 1.67 specifically
  materialHighIndex174?: number      // 1.74 specifically
  materialTrivex: number

  // AR Coatings by tier
  // EyeMed uses: standard, tier_1, tier_2, tier_3
  arStandard: number
  arPremiumTier1: number
  arPremiumTier2: number
  arPremiumTier3: number

  // Enhancements
  photochromic: number
  polarized: number
  blueLightFilter: number
  tint: number
  uvCoating: number | 'covered'
  scratchCoating: number | 'covered'

  // Contact lens (optional - not all plans have)
  contactsConventional?: number
  contactsDisposable?: number
  contactsMedicallyNecessary?: number

  // Contact lens fitting copays
  clFitEligible?: boolean           // Whether CL fitting benefit is eligible
  clFitStandardCopay?: number | 'covered' | null  // Standard fitting copay (may be "covered")
  clFitPremiumCopay?: number | 'covered' | null   // Premium/specialty fitting copay
}

export interface EyemedSpecialRules {
  polycarbonateFreeCbildAgeMax: number  // e.g., 18 - free poly for kids
  progressiveNonadaptPolicy: boolean     // Remake policy for first-time progressive wearers
  secondPairDiscount?: number            // e.g., 0.40 = 40% off second pair
  blueLightIncludedInAr?: boolean        // Some plans include blue light in AR
}

export interface EyemedBenefitAuthorization {
  patient: Patient
  plan: Plan & { carrier: 'eyemed' }
  frequency: Frequency
  copays: EyemedCopays
  specialRules: EyemedSpecialRules
}

// =============================================================================
// SPECTERA-SPECIFIC AUTHORIZATION
// Based on spectera_dynamic_schema_v3.md
// =============================================================================

export interface SpecteraCopays {
  // Exam copays - Spectera has multiple exam types
  examPediatric: number
  examMaternity: number
  examAdult: number
  examContactFitSelection?: number | 'covered'    // Contact fit for selection plans
  examContactFitNonSelection?: string             // Often "100% billed"

  // Materials copay (may be combined or separate depending on plan)
  materials?: number

  // Frame
  frameAllowance: number
  frameOveragePercent: number  // NOTE: This is what PATIENT PAYS, e.g., 0.70 = patient pays 70%

  // Lens copays
  lensStandard: number                    // Standard single vision
  lensBlendedBifocal?: number | string    // Often "80% billed"
  lensFreeformSv?: number | string
  lensMfAspheric?: number | string        // Multifocal aspheric
  lensOccupational?: number | string
  lensSvAspheric?: number | string

  // Progressives by tier (I through V) - Roman numerals
  progressiveTierI: number
  progressiveTierII: number
  progressiveTierIII: number
  progressiveTierIV: number
  progressiveTierV: number
  progressiveNonFormulary?: string  // "80% billed"

  // Materials - more granular high-index tiers
  materialPolycarbonateAdult: number
  materialPolycarbonateChild: number | 'covered'
  materialHighIndex160166: number      // 1.60-1.66
  materialHighIndex166173: number      // 1.66-1.73
  materialHighIndex174Plus?: string    // "80% billed"
  materialTrivex?: number

  // AR Coatings by tier (I through IV)
  arTierI: number
  arTierII: number
  arTierIII: number
  arTierIV: number
  arNonFormulary?: string  // "80% billed"

  // Enhancements
  photochromic: number
  polarized: number | string        // May be "80% billed"
  tint: number
  uvCoating: number
  scratchCoating: number | 'covered'
  polishedEdges: number
  scratchWarranty1yr?: number
  edgeCoating?: string              // "80% billed"
  oversizeLenses?: string           // "80% billed"
  miscLensOptions?: string          // "80% billed"
  chemistrieClip?: string           // "100% billed"

  // Contact lens
  contactsMedicallyNecessary?: number
  contactsSelectionDailyBiweekly?: { amount: number; units: string }
  contactsSelectionMonthly?: { amount: number; units: string }
  contactsNonSelectionAllowance?: number
  contactsNonSelectionOveragePercent?: number
}

export interface SpecteraSpecialRules {
  polycarbonateFreeCbildAgeMax: number  // e.g., 18
  retinalScreeningCoverage?: number | 'not covered'  // e.g., 39 or "not covered"
  dilatedRetinalExamRequired?: boolean
  outOfNetworkReimbursement?: {
    exam: number
    frame: number
    lenses: number
  }
}

export interface SpecteraFrequency extends Frequency {
  // Spectera has more detailed frequency options
  examPediatric?: FrequencyBenefit
  examMaternity?: FrequencyBenefit
  contactsSelection?: FrequencyBenefit
  contactsNonSelection?: FrequencyBenefit
}

export interface SpecteraBenefitAuthorization {
  patient: Patient
  plan: Plan & { carrier: 'spectera' }
  frequency: SpecteraFrequency
  copays: SpecteraCopays
  specialRules: SpecteraSpecialRules
}

// =============================================================================
// VSP-SPECIFIC AUTHORIZATION
// =============================================================================

/**
 * VSP uses a code-based system rather than simple tiers.
 * The plan tier (Signature, Choice, Advantage) determines which pricing table to use.
 * Individual lens/AR codes then map to specific copays within that table.
 */
export interface VspCopays {
  // Base copays
  examWellvision: number
  examMedical?: number
  materials: number  // Base materials copay

  // Frame allowances (VSP has featured vs non-featured brands)
  frameAllowanceFeatured: number       // Altair/Marchon brands
  frameAllowanceNonFeatured: number    // Non-featured brands
  frameOverageDiscount: number         // 20% typical discount off overage

  // Contact lens
  contactLensAllowance?: number
  contactLensExamCopay?: number
  contactFittingCovered?: boolean      // If true, standard CL fitting is $0

  // Note: VSP progressive/AR copays are code-based, looked up from tier tables
  // The plan tier (signature/choice/advantage) determines which table to use
}

export interface VspPlanTier {
  tier: 'signature' | 'choice' | 'advantage' | 'basic'

  // Progressive lens codes and their copays for this tier
  // These come from VSP's published enhancement sheets
  progressiveCopays: {
    [code: string]: number  // e.g., "FA": 95, "JA": 120, "KA": 55
  }

  // AR coating codes and their copays for this tier
  arCopays: {
    [code: string]: number  // e.g., "QM": 0, "QT": 45, "QV": 65
  }

  // Material add-on codes
  materialCopays: {
    polycarbonate: number | 'covered'
    polycarbonateChild: number | 'covered'
    trivex: number
    highIndex167: number
    highIndex174: number
  }

  // Enhancement copays
  enhancementCopays: {
    photochromic: number
    polarized: number
    blueLightFilter: number
    tint: number
  }
}

export interface VspSpecialRules {
  // Pricing rule types used in VSP calculations
  pricingRules: {
    [enhancement: string]: 'copay' | 'lower_of_copay_or_uc' | 'lower_of_copay_or_80_uc' | '80_percent_uc' | 'add_to_base'
  }
  polycarbonateFreeCbildAgeMax: number
  examPlusMaterialsDiscount?: number  // Combined exam + materials discount
}

export interface VspBenefitAuthorization {
  patient: Patient
  plan: Plan & { carrier: 'vsp' }
  frequency: Frequency
  copays: VspCopays
  planTier: VspPlanTier
  specialRules: VspSpecialRules
}

// =============================================================================
// UNION TYPE - Use this in the pricing engine
// =============================================================================

export type BenefitAuthorization =
  | EyemedBenefitAuthorization
  | SpecteraBenefitAuthorization
  | VspBenefitAuthorization

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isEyemedAuth(auth: BenefitAuthorization): auth is EyemedBenefitAuthorization {
  return auth.plan.carrier === 'eyemed'
}

export function isSpecteraAuth(auth: BenefitAuthorization): auth is SpecteraBenefitAuthorization {
  return auth.plan.carrier === 'spectera'
}

export function isVspAuth(auth: BenefitAuthorization): auth is VspBenefitAuthorization {
  return auth.plan.carrier === 'vsp'
}

// =============================================================================
// HELPER - Create empty/default authorization for a carrier
// =============================================================================

export function createEmptyEyemedAuth(patient: Patient, plan: Omit<Plan, 'carrier'>): EyemedBenefitAuthorization {
  return {
    patient,
    plan: { ...plan, carrier: 'eyemed' },
    frequency: {
      exam: { count: 1, periodMonths: 12 },
      frame: { count: 1, periodMonths: 12 },
      lenses: { count: 1, periodMonths: 12 },
    },
    copays: {
      exam: 0,
      materials: 0,
      frameAllowance: 0,
      frameOverageDiscount: 0.20,  // 20% discount = patient pays 80%
      lensSv: 0,
      lensBifocal: 0,
      lensTrifocal: 0,
      progressiveStandard: 0,
      progressivePremiumTier1: 0,
      progressivePremiumTier2: 0,
      progressivePremiumTier3: 0,
      progressivePremiumTier4: 0,
      progressivePremiumTier5: 0,
      materialPolycarbonate: 0,
      materialPolycarbonateChild: 'covered',
      materialHighIndex: 0,
      materialTrivex: 0,
      arStandard: 0,
      arPremiumTier1: 0,
      arPremiumTier2: 0,
      arPremiumTier3: 0,
      photochromic: 0,
      polarized: 0,
      blueLightFilter: 0,
      tint: 0,
      uvCoating: 'covered',
      scratchCoating: 'covered',
    },
    specialRules: {
      polycarbonateFreeCbildAgeMax: 18,
      progressiveNonadaptPolicy: true,
    },
  }
}

export function createEmptySpecteraAuth(patient: Patient, plan: Omit<Plan, 'carrier'>): SpecteraBenefitAuthorization {
  return {
    patient,
    plan: { ...plan, carrier: 'spectera' },
    frequency: {
      exam: { count: 1, periodMonths: 12 },
      frame: { count: 1, periodMonths: 24 },
      lenses: { count: 1, periodMonths: 12 },
    },
    copays: {
      examPediatric: 0,
      examMaternity: 0,
      examAdult: 0,
      frameAllowance: 0,
      frameOveragePercent: 0.70,  // Patient pays 70% of overage
      lensStandard: 0,
      progressiveTierI: 0,
      progressiveTierII: 0,
      progressiveTierIII: 0,
      progressiveTierIV: 0,
      progressiveTierV: 0,
      materialPolycarbonateAdult: 0,
      materialPolycarbonateChild: 'covered',
      materialHighIndex160166: 0,
      materialHighIndex166173: 0,
      arTierI: 0,
      arTierII: 0,
      arTierIII: 0,
      arTierIV: 0,
      photochromic: 0,
      polarized: 0,
      tint: 0,
      uvCoating: 0,
      scratchCoating: 'covered',
      polishedEdges: 0,
    },
    specialRules: {
      polycarbonateFreeCbildAgeMax: 18,
    },
  }
}

export function createEmptyVspAuth(patient: Patient, plan: Omit<Plan, 'carrier'>): VspBenefitAuthorization {
  return {
    patient,
    plan: { ...plan, carrier: 'vsp' },
    frequency: {
      exam: { count: 1, periodMonths: 12 },
      frame: { count: 1, periodMonths: 24 },
      lenses: { count: 1, periodMonths: 12 },
    },
    copays: {
      examWellvision: 0,
      materials: 0,
      frameAllowanceFeatured: 0,
      frameAllowanceNonFeatured: 0,
      frameOverageDiscount: 0.20,
    },
    planTier: {
      tier: 'choice',
      progressiveCopays: {},
      arCopays: {},
      materialCopays: {
        polycarbonate: 0,
        polycarbonateChild: 'covered',
        trivex: 0,
        highIndex167: 0,
        highIndex174: 0,
      },
      enhancementCopays: {
        photochromic: 0,
        polarized: 0,
        blueLightFilter: 0,
        tint: 0,
      },
    },
    specialRules: {
      pricingRules: {},
      polycarbonateFreeCbildAgeMax: 18,
    },
  }
}
