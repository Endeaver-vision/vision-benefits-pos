/**
 * VSP Authorization Types
 *
 * These types represent the extracted data from VSP authorization documents:
 * 1. Auth Form (Patient Record Report) - patient info, copays, allowances, flags
 * 2. Enhancement Form (Lens Enhancement Charges) - two-letter code matrix
 *
 * The extraction uses a two-stage process:
 * - Stage 1: Extract Auth Form → VspAuthFormExtraction
 * - Stage 2: Extract Enhancement Form → VspEnhancementFormExtraction
 * - Merge: Combine into → VspBenefitAuthorization
 */

// =============================================================================
// TWO-LETTER CODE SYSTEM
// =============================================================================

/**
 * VSP uses a two-letter code system for lens pricing:
 * First letter = Progressive tier: K=Standard, J=Comfort DRx, F=Comfort Max, O=Custom, N=Varilux X
 * Second letter = Material: A=CR-39, D=Poly, B=Trivex, H=1.67, J=1.74
 */
export type VspProgressiveTier = 'K' | 'J' | 'F' | 'O' | 'N'
export type VspMaterialCode = 'A' | 'D' | 'B' | 'H' | 'J'

/** Two-letter progressive + material combination codes */
export type VspLensCode =
  | 'KA' | 'KD' | 'KB' | 'KH' | 'KJ'  // K tier (Standard)
  | 'JA' | 'JD' | 'JB' | 'JH' | 'JJ'  // J tier (Premium - Comfort DRx)
  | 'FA' | 'FD' | 'FB' | 'FH' | 'FJ'  // F tier (Premium Adv - Comfort Max)
  | 'OA' | 'OD' | 'OB' | 'OH' | 'OJ'  // O tier (Custom)
  | 'NA' | 'ND' | 'NB' | 'NH' | 'NJ'  // N tier (Custom - Varilux X)

/** AR coating codes */
export type VspArCode = 'QM' | 'QT' | 'QV'

/** Enhancement codes */
export type VspEnhancementCode = 'PR' | 'DA' | 'LF' | 'SP' | 'SW' | 'MN' | 'TA'

/** Polarized add-on codes for progressives */
export type VspPolarizedProgressiveCode = 'KP' | 'JP' | 'FP' | 'NP' | 'OP'

// =============================================================================
// PLAN TYPES
// =============================================================================

export type VspPlanType =
  | 'signature'           // Premium plan - most coverage
  | 'choice'              // Standard plan
  | 'advantage'           // Value plan
  | 'computer_visioncare' // Supplemental computer vision plan
  | 'savings_pass'        // Discount-only plan

export type VspContactLensPattern =
  | 'separate'          // Exam + Materials as separate benefits
  | 'combined'          // Exam And Allowance combined
  | 'covered_in_full'   // Covered in full
  | 'discount'          // Discount-only (Savings Pass)
  | 'none'              // No CL benefit

// =============================================================================
// AUTH FORM EXTRACTION (Stage 1)
// =============================================================================

/**
 * Raw extraction from VSP Patient Record Report (Auth Form)
 * This is what Claude returns from PROMPT 1
 */
export interface VspAuthFormExtraction {
  document_type: 'auth_form'

  // === PATIENT INFO ===
  patient_name: string | null
  patient_dob: string | null
  member_name: string | null
  relationship: string | null
  authorization_number: string | null
  auth_effective_date: string | null
  auth_expiration_date: string | null

  // === PLAN IDENTIFICATION ===
  plan_type: VspPlanType | null
  client_name: string | null
  network: string | null
  lab_use: string | null

  // === ELIGIBILITY ===
  eligibility: {
    exam: boolean
    lens: boolean
    frame: boolean
    contact_lens_exam: boolean
    contacts: boolean
  } | null

  // === COPAYS ===
  exam_copay: number | null
  material_copay: number | null
  routine_retinal_screening: number | string | null  // Could be "lesser of $XX or U&C"

  // === FRAME ALLOWANCE ===
  // CRITICAL: We do NOT sell Altair/Marchon - extract non-Altair amount!
  frame_allowance: {
    wfa_code: string | null            // e.g., "WFA60"
    altair_amount: number | null
    non_altair_amount: number | null   // <-- THIS IS THE ONE WE USE
    frame_overage_discount: number     // Always 0.20 (20%)
    easyoptions_wfa_code: string | null
    easyoptions_amount: number | null
  } | null

  // === CONTACT LENS PATTERN ===
  contact_lens_pattern: VspContactLensPattern | null

  // Pattern A: Separate Exam + Materials
  cl_exam_copay: number | null
  cl_exam_percentage: number | null        // e.g., 0.85 for 85% U&C
  cl_materials_allowance: number | null

  // Pattern B: Combined Exam And Allowance
  cl_combined_allowance: number | null
  cl_combined_discount: number | null      // e.g., 0.15 for 15%
  cl_exam_only_responsibility: number | null

  // Pattern B with EasyOptions
  cl_easyoptions_allowance: number | null

  // Necessary Contact Lenses
  necessary_cl_copay: number | null

  // Contacts Instead Of
  contacts_instead_of: string[] | null     // ["lens", "frame"]
  contacts_frame_next_available: string | null

  // === EASYOPTIONS ===
  has_easyoptions: boolean
  easyoptions: {
    contact_lens_upgrade: number | null
    frame_upgrade: number | null
    photochromic_upgrade: 'covered' | null
    progressive_upgrade: 'covered' | null
    ar_upgrade: 'covered' | null
  } | null

  // === SPECIAL FLAGS ===
  flags: {
    // Essential Medical Eye Care
    has_emc: boolean
    emc_type: 'essential_medical_eye_care' | 'diabetic_eyecare_plus' | null
    emc_exam_copay: number | null

    // Computer VisionCare (affects coverage!)
    is_computer_visioncare: boolean
    computer_rx_requirement: string | null

    // Post-Laser VisionCare
    has_post_laser: boolean

    // Low Vision
    has_low_vision: boolean

    // Vision Therapy (Computer VisionCare only)
    has_vision_therapy: boolean

    // COB Rules
    has_cob_restriction: boolean
    cob_rule: string | null

    // Value Added Benefits
    value_added_benefits: {
      same_day_discount: number | null           // e.g., 0.30 for 30%
      same_day_40_discount: number | null        // e.g., 0.40 for 40%
      within_12_months_discount: number | null   // e.g., 0.20 for 20%
      within_12_months_40_discount: number | null
      cl_exam_discount: number | null            // e.g., 0.15 for 15%
    } | null
  }

  // === EYE HEALTH CONDITIONS ===
  eye_health_conditions: {
    reported_conditions: string[]
    systemic_checked: string[]
    ocular_checked: string[]
    dilation_performed: boolean
    pcp_communication: boolean
  } | null

  // === LENS ENHANCEMENT SUMMARY ===
  lens_enhancement_summary: {
    covered: string[]
    covered_with_copay: string[]
    not_covered: string[]
  } | null
}

// =============================================================================
// ENHANCEMENT FORM EXTRACTION (Stage 2)
// =============================================================================

/**
 * Raw extraction from VSP Lens Enhancement Charges sheet
 * This is what Claude returns from PROMPT 2
 */
export interface VspEnhancementFormExtraction {
  document_type: 'enhancement_form'
  authorization_number: string | null
  patient_name: string | null

  // === PROGRESSIVE LENS BASE COPAYS ===
  progressives: {
    K_standard: number | null
    J_premium: number | null
    F_premium_adv: number | null
    O_custom: number | null
    N_custom: number | null
  }

  // === SINGLE VISION BASE ===
  single_vision_base: number

  // === MATERIAL ADD-ONS ===
  materials: {
    polycarbonate_sv: number | null
    polycarbonate_multi: number | null
    trivex_sv: number | null
    trivex_multi: number | null
    hi_index_167_sv: number | null
    hi_index_167_multi: number | null
    hi_index_174_sv: number | null
    hi_index_174_multi: number | null
  }

  // === FULL MATRIX (Two-Letter Codes) ===
  lens_matrix: {
    // Single Vision
    SV_plastic: number | null
    SV_poly: number | null
    SV_trivex: number | null
    SV_hi167: number | null
    SV_hi174: number | null

    // Progressive K (Standard)
    KA: number | null
    KD: number | null
    KB: number | null
    KH: number | null
    KJ: number | null

    // Progressive J (Premium - Comfort DRx)
    JA: number | null
    JD: number | null
    JB: number | null
    JH: number | null
    JJ: number | null

    // Progressive F (Premium Advanced - Comfort Max)
    FA: number | null
    FD: number | null
    FB: number | null
    FH: number | null
    FJ: number | null

    // Progressive O (Custom)
    OA: number | null
    OD: number | null
    OB: number | null
    OH: number | null
    OJ: number | null

    // Progressive N (Custom - Varilux X)
    NA: number | null
    ND: number | null
    NB: number | null
    NH: number | null
    NJ: number | null
  }

  // === AR COATINGS ===
  ar_coatings: {
    QM_standard: number | null
    QT_premium_1: number | null
    QV_premium_2: number | null
  }

  // === PHOTOCHROMICS ===
  photochromics: {
    PR_plastic: number | null
    PM_glass: number | null
  }

  // === POLARIZED ===
  polarized: {
    DA_sv: number | null
    DA_multi: number | null
    KP: number | null
    JP: number | null
    FP: number | null
    NP: number | null
    OP: number | null
  }

  // === TINTS ===
  tints: {
    MN_plastic_sv: number | null
    MN_plastic_multi: number | null
    MP_gradient_sv: number | null
    MP_gradient_multi: number | null
  }

  // === MIRROR COATINGS ===
  mirror: {
    QP_mirror_solid: number | null
    QR_ski_type: number | null
  }

  // === UV PROTECTION ===
  uv_protection: {
    SV_uv: number | null
    BV_uv_backside: number | null
  }

  // === OVERSIZE ===
  oversize: {
    RM_oversize_plastic: number | null
    RN_oversize_glass: number | null
  }

  // === MISCELLANEOUS ===
  misc: {
    SP_edge_polish: number | null
    SQ_edge_coating: number | null
    SW_rimless: number | null
    LF_light_filter: number | null
    TA_tech_addon: number | null
    IA_near_variable: number | null
    AA_aspheric: number | null
    BA_digital_aspheric: number | null
    CM_custom_measurement: number | null
  }

  // === COVERAGE STATUS ===
  coverage_status: {
    progressives_covered: boolean    // Are K, J, F, O, N all $0?
    ar_covered: boolean              // Are QM, QT, QV all $0?
    photochromics_covered: boolean
    photochromics_not_covered: boolean  // Computer VisionCare
    polarized_not_covered: boolean      // Computer VisionCare
  }
}

// =============================================================================
// MERGED VSP BENEFIT AUTHORIZATION
// =============================================================================

/**
 * Final merged VSP authorization data
 * This is what the pricing engine consumes
 */
export interface VspMergedAuthorization {
  // === PATIENT INFO ===
  patientInfo: {
    name: string
    dob: string | null
    authNumber: string
    effectiveDate: string | null
    expirationDate: string | null
    memberName: string | null
    relationship: string | null
  }

  // === PLAN INFO ===
  planInfo: {
    planType: VspPlanType
    clientName: string | null
    network: string | null
    labUse: string | null
  }

  // === ELIGIBILITY ===
  eligibility: {
    exam: boolean
    lens: boolean
    frame: boolean
    contactLensExam: boolean
    contacts: boolean
  }

  // === COPAYS ===
  copays: {
    exam: number
    material: number
    retinalScreening: number | null
  }

  // === FRAME ALLOWANCE ===
  // CRITICAL: We do NOT sell Altair/Marchon - use non-Altair amount!
  frameAllowance: {
    wfaCode: string | null
    amount: number              // Non-Altair amount
    altairAmount: number | null // For reference only
    overageDiscount: number     // Always 0.20 (20%)
    easyOptionsAmount: number | null
  }

  // === CONTACT LENS ===
  contactLens: {
    pattern: VspContactLensPattern
    // Separate pattern
    examCopay: number | null
    examPercentage: number | null
    materialsAllowance: number | null
    // Combined pattern
    combinedAllowance: number | null
    combinedDiscount: number | null
    examOnlyResponsibility: number | null
    // EasyOptions
    easyOptionsAllowance: number | null
    // Necessary CL
    necessaryCopay: number | null
    // Contacts Instead Of
    insteadOf: string[] | null
    frameNextAvailable: string | null
  }

  // === EASYOPTIONS ===
  easyOptions: {
    enabled: boolean
    contactLensUpgrade: number | null
    frameUpgrade: number | null
    photochromicCovered: boolean
    progressiveCovered: boolean
    arCovered: boolean
  } | null

  // === SPECIAL FLAGS ===
  flags: {
    hasEmc: boolean
    emcType: string | null
    emcExamCopay: number | null
    isComputerVisioncare: boolean
    computerRxRequirement: string | null
    hasPostLaser: boolean
    hasLowVision: boolean
    hasVisionTherapy: boolean
    hasCobRestriction: boolean
    cobRule: string | null
    valueAddedBenefits: {
      sameDayDiscount: number | null
      sameDay40Discount: number | null
      within12MonthsDiscount: number | null
      within12Months40Discount: number | null
      clExamDiscount: number | null
    } | null
  }

  // === EYE HEALTH CONDITIONS ===
  eyeHealthConditions: {
    reportedConditions: string[]
    systemicChecked: string[]
    ocularChecked: string[]
    dilationPerformed: boolean
    pcpCommunication: boolean
  } | null

  // === PROGRESSIVE TIER BASE COPAYS ===
  // These are the standalone progressive tier costs (without material)
  progressives: {
    K_standard: number    // Standard Progressive (usually $0)
    J_premium: number     // Premium (Varilux Comfort DRx tier)
    F_premium_adv: number // Premium Advanced (Varilux Comfort Max tier)
    O_custom: number      // Custom
    N_custom: number      // Custom (Varilux X tier)
  }

  // === MATERIAL UPGRADE COPAYS ===
  // These are the material add-on costs (added to progressive base)
  materials: {
    polycarbonate_sv: number
    polycarbonate_multi: number
    trivex_sv: number
    trivex_multi: number
    hi_index_167_sv: number
    hi_index_167_multi: number
    hi_index_174_sv: number
    hi_index_174_multi: number
  }

  // === LENS MATRIX (from Enhancement Form) ===
  // Note: These are the combined two-letter codes, kept for reference
  lensMatrix: {
    // Single Vision
    SV_plastic: number
    SV_poly: number
    SV_trivex: number
    SV_hi167: number
    SV_hi174: number

    // Progressive codes (all combinations)
    [code: string]: number | null
  }

  // === AR COATINGS ===
  arCoatings: {
    QM: number  // Standard AR
    QT: number  // Premium AR Tier 1
    QV: number  // Premium AR Tier 2 (Crizal)
  }

  // === ENHANCEMENTS ===
  enhancements: {
    PR: number  // Photochromic
    DA: number  // Polarized
    LF: number  // Blue Light Filter
    SP: number  // Edge Polish
    SW: number  // Rimless/Drill Mount
    MN: number  // Tint
    TA: number  // Tech Add-on
    IA: number  // Near Variable Focus
    CM: number  // Custom Measurement
    QP: number  // Mirror Solid
    QR: number  // Ski Type
    SV: number  // UV Protection
    RM: number  // Oversize Plastic
  }

  // === POLARIZED PROGRESSIVE ADD-ONS ===
  polarizedProgressives: {
    KP: number
    JP: number
    FP: number
    NP: number
    OP: number
  }

  // === COVERAGE STATUS ===
  coverageStatus: {
    progressivesCovered: boolean
    arCovered: boolean
    photochromicsCovered: boolean
    photochromicsNotCovered: boolean  // Computer VisionCare
    polarizedNotCovered: boolean      // Computer VisionCare
  }
}

// =============================================================================
// EXTRACTION RESULT TYPES
// =============================================================================

/**
 * API response from VSP auth form extraction
 */
export interface VspAuthFormExtractionResponse {
  success: boolean
  benefits: VspAuthFormExtraction | null
  raw: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  } | null
  error: string | null
}

/**
 * API response from VSP enhancement form extraction
 */
export interface VspEnhancementFormExtractionResponse {
  success: boolean
  benefits: VspEnhancementFormExtraction | null
  raw: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  } | null
  error: string | null
}

/**
 * Combined extraction result after merging both documents
 */
export interface VspExtractionResult {
  success: boolean
  authorization: VspMergedAuthorization | null
  authFormRaw: string | null
  enhancementFormRaw: string | null
  usage: {
    authForm: { input_tokens: number; output_tokens: number } | null
    enhancementForm: { input_tokens: number; output_tokens: number } | null
    total: { input_tokens: number; output_tokens: number }
  }
  errors: string[]
}

// =============================================================================
// PRODUCT MAPPING TYPES
// =============================================================================

/**
 * Maps our product catalog tiers to VSP codes
 */
export interface VspProductMapping {
  vspTier: string             // e.g., "K (Standard)", "J (Premium)"
  vspProgressiveCode: VspProgressiveTier | null  // K, J, F, O, N
  vspMaterialCodes: {
    cr39: string              // e.g., "KA"
    poly: string              // e.g., "KD"
    trivex: string            // e.g., "KB"
    hi167: string             // e.g., "KH"
    hi174: string             // e.g., "KJ"
  } | null
}

/**
 * Calculated pricing result for a single product
 */
export interface VspPricedProduct {
  productId: string
  productName: string
  retailPrice: number
  insuranceAllowance: number
  copay: number
  patientCost: number
  notes: string[]             // e.g., ["EasyOptions applied", "Not covered - Computer Vision"]
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the VSP code for a progressive tier + material combination
 */
export function getVspLensCode(
  progressiveTier: VspProgressiveTier,
  materialCode: VspMaterialCode
): VspLensCode {
  return `${progressiveTier}${materialCode}` as VspLensCode
}

/**
 * Parse a VSP code into tier and material
 */
export function parseVspLensCode(code: string): {
  progressiveTier: VspProgressiveTier
  materialCode: VspMaterialCode
} | null {
  if (code.length !== 2) return null

  const tier = code[0] as VspProgressiveTier
  const material = code[1] as VspMaterialCode

  const validTiers: VspProgressiveTier[] = ['K', 'J', 'F', 'O', 'N']
  const validMaterials: VspMaterialCode[] = ['A', 'D', 'B', 'H', 'J']

  if (!validTiers.includes(tier) || !validMaterials.includes(material)) {
    return null
  }

  return { progressiveTier: tier, materialCode: material }
}

/**
 * Get material name from VSP material code
 */
export function getVspMaterialName(code: VspMaterialCode): string {
  const names: Record<VspMaterialCode, string> = {
    'A': 'CR-39 (Plastic)',
    'D': 'Polycarbonate',
    'B': 'Trivex/1.60',
    'H': '1.67 High Index',
    'J': '1.74 High Index',
  }
  return names[code]
}

/**
 * Get progressive tier name from VSP tier code
 */
export function getVspProgressiveTierName(code: VspProgressiveTier): string {
  const names: Record<VspProgressiveTier, string> = {
    'K': 'Standard Progressive',
    'J': 'Premium (Comfort DRx)',
    'F': 'Premium Advanced (Comfort Max)',
    'O': 'Custom',
    'N': 'Custom (Varilux X)',
  }
  return names[code]
}

/**
 * Get AR coating name from VSP AR code
 */
export function getVspArCoatingName(code: VspArCode): string {
  const names: Record<VspArCode, string> = {
    'QM': 'Standard AR',
    'QT': 'Premium AR Tier 1',
    'QV': 'Premium AR Tier 2 (Crizal)',
  }
  return names[code]
}
