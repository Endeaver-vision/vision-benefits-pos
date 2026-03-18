/**
 * VSP Extraction Merge Service
 *
 * Merges auth form and enhancement form extractions into a single
 * VspMergedAuthorization object for the pricing engine.
 */

import type {
  VspAuthFormExtraction,
  VspEnhancementFormExtraction,
  VspMergedAuthorization,
} from '@/types/vsp-authorization'

/**
 * Default values for when extraction returns null
 */
const DEFAULTS = {
  copay: 0,
  discount: 0.20,
}

/**
 * Merge auth form and enhancement form extractions into unified authorization
 */
export function mergeVspExtractions(
  authForm: VspAuthFormExtraction,
  enhancementForm: VspEnhancementFormExtraction
): VspMergedAuthorization {
  // Validate authorization numbers match (if both present)
  if (
    authForm.authorization_number &&
    enhancementForm.authorization_number &&
    authForm.authorization_number !== enhancementForm.authorization_number
  ) {
    console.warn(
      `Auth number mismatch: ${authForm.authorization_number} vs ${enhancementForm.authorization_number}`
    )
  }

  return {
    // === PATIENT INFO ===
    patientInfo: {
      name: authForm.patient_name || enhancementForm.patient_name || 'Unknown',
      dob: authForm.patient_dob,
      authNumber: authForm.authorization_number || enhancementForm.authorization_number || '',
      effectiveDate: authForm.auth_effective_date,
      expirationDate: authForm.auth_expiration_date,
      memberName: authForm.member_name,
      relationship: authForm.relationship,
    },

    // === PLAN INFO ===
    planInfo: {
      planType: authForm.plan_type || 'choice',
      clientName: authForm.client_name,
      network: authForm.network,
      labUse: authForm.lab_use,
    },

    // === ELIGIBILITY ===
    eligibility: {
      exam: authForm.eligibility?.exam ?? true,
      lens: authForm.eligibility?.lens ?? true,
      frame: authForm.eligibility?.frame ?? true,
      contactLensExam: authForm.eligibility?.contact_lens_exam ?? false,
      contacts: authForm.eligibility?.contacts ?? false,
    },

    // === COPAYS ===
    copays: {
      exam: authForm.exam_copay ?? 0,
      material: authForm.material_copay ?? 0,
      retinalScreening:
        typeof authForm.routine_retinal_screening === 'number'
          ? authForm.routine_retinal_screening
          : null,
    },

    // === FRAME ALLOWANCE ===
    // CRITICAL: We do NOT sell Altair/Marchon - use non-Altair amount!
    frameAllowance: {
      wfaCode: authForm.frame_allowance?.wfa_code || null,
      amount: authForm.frame_allowance?.non_altair_amount ?? 0,
      altairAmount: authForm.frame_allowance?.altair_amount ?? null,
      overageDiscount: authForm.frame_allowance?.frame_overage_discount ?? DEFAULTS.discount,
      easyOptionsAmount: authForm.frame_allowance?.easyoptions_amount ?? null,
    },

    // === CONTACT LENS ===
    contactLens: {
      pattern: authForm.contact_lens_pattern || 'none',
      // Separate pattern
      examCopay: authForm.cl_exam_copay,
      examPercentage: authForm.cl_exam_percentage,
      materialsAllowance: authForm.cl_materials_allowance,
      // Combined pattern
      combinedAllowance: authForm.cl_combined_allowance,
      combinedDiscount: authForm.cl_combined_discount,
      examOnlyResponsibility: authForm.cl_exam_only_responsibility,
      // EasyOptions
      easyOptionsAllowance: authForm.cl_easyoptions_allowance,
      // Necessary CL
      necessaryCopay: authForm.necessary_cl_copay,
      // Contacts Instead Of
      insteadOf: authForm.contacts_instead_of,
      frameNextAvailable: authForm.contacts_frame_next_available,
    },

    // === EASYOPTIONS ===
    easyOptions: authForm.has_easyoptions
      ? {
          enabled: true,
          contactLensUpgrade: authForm.easyoptions?.contact_lens_upgrade ?? null,
          frameUpgrade: authForm.easyoptions?.frame_upgrade ?? null,
          photochromicCovered: authForm.easyoptions?.photochromic_upgrade === 'covered',
          progressiveCovered: authForm.easyoptions?.progressive_upgrade === 'covered',
          arCovered: authForm.easyoptions?.ar_upgrade === 'covered',
        }
      : null,

    // === SPECIAL FLAGS ===
    flags: {
      hasEmc: authForm.flags?.has_emc ?? false,
      emcType: authForm.flags?.emc_type ?? null,
      emcExamCopay: authForm.flags?.emc_exam_copay ?? null,
      isComputerVisioncare: authForm.flags?.is_computer_visioncare ?? false,
      computerRxRequirement: authForm.flags?.computer_rx_requirement ?? null,
      hasPostLaser: authForm.flags?.has_post_laser ?? false,
      hasLowVision: authForm.flags?.has_low_vision ?? false,
      hasVisionTherapy: authForm.flags?.has_vision_therapy ?? false,
      hasCobRestriction: authForm.flags?.has_cob_restriction ?? false,
      cobRule: authForm.flags?.cob_rule ?? null,
      valueAddedBenefits: authForm.flags?.value_added_benefits
        ? {
            sameDayDiscount: authForm.flags.value_added_benefits.same_day_discount,
            sameDay40Discount: authForm.flags.value_added_benefits.same_day_40_discount,
            within12MonthsDiscount: authForm.flags.value_added_benefits.within_12_months_discount,
            within12Months40Discount:
              authForm.flags.value_added_benefits.within_12_months_40_discount,
            clExamDiscount: authForm.flags.value_added_benefits.cl_exam_discount,
          }
        : null,
    },

    // === EYE HEALTH CONDITIONS ===
    eyeHealthConditions: authForm.eye_health_conditions
      ? {
          reportedConditions: authForm.eye_health_conditions.reported_conditions || [],
          systemicChecked: authForm.eye_health_conditions.systemic_checked || [],
          ocularChecked: authForm.eye_health_conditions.ocular_checked || [],
          dilationPerformed: authForm.eye_health_conditions.dilation_performed ?? false,
          pcpCommunication: authForm.eye_health_conditions.pcp_communication ?? false,
        }
      : null,

    // === LENS MATRIX (from Enhancement Form) ===
    lensMatrix: {
      // Single Vision
      SV_plastic: enhancementForm.lens_matrix?.SV_plastic ?? 0,
      SV_poly: enhancementForm.lens_matrix?.SV_poly ?? 0,
      SV_trivex: enhancementForm.lens_matrix?.SV_trivex ?? 0,
      SV_hi167: enhancementForm.lens_matrix?.SV_hi167 ?? 0,
      SV_hi174: enhancementForm.lens_matrix?.SV_hi174 ?? 0,

      // Progressive K (Standard)
      KA: enhancementForm.lens_matrix?.KA ?? null,
      KD: enhancementForm.lens_matrix?.KD ?? null,
      KB: enhancementForm.lens_matrix?.KB ?? null,
      KH: enhancementForm.lens_matrix?.KH ?? null,
      KJ: enhancementForm.lens_matrix?.KJ ?? null,

      // Progressive J (Premium - Comfort DRx)
      JA: enhancementForm.lens_matrix?.JA ?? null,
      JD: enhancementForm.lens_matrix?.JD ?? null,
      JB: enhancementForm.lens_matrix?.JB ?? null,
      JH: enhancementForm.lens_matrix?.JH ?? null,
      JJ: enhancementForm.lens_matrix?.JJ ?? null,

      // Progressive F (Premium Advanced - Comfort Max)
      FA: enhancementForm.lens_matrix?.FA ?? null,
      FD: enhancementForm.lens_matrix?.FD ?? null,
      FB: enhancementForm.lens_matrix?.FB ?? null,
      FH: enhancementForm.lens_matrix?.FH ?? null,
      FJ: enhancementForm.lens_matrix?.FJ ?? null,

      // Progressive O (Custom)
      OA: enhancementForm.lens_matrix?.OA ?? null,
      OD: enhancementForm.lens_matrix?.OD ?? null,
      OB: enhancementForm.lens_matrix?.OB ?? null,
      OH: enhancementForm.lens_matrix?.OH ?? null,
      OJ: enhancementForm.lens_matrix?.OJ ?? null,

      // Progressive N (Custom - Varilux X)
      NA: enhancementForm.lens_matrix?.NA ?? null,
      ND: enhancementForm.lens_matrix?.ND ?? null,
      NB: enhancementForm.lens_matrix?.NB ?? null,
      NH: enhancementForm.lens_matrix?.NH ?? null,
      NJ: enhancementForm.lens_matrix?.NJ ?? null,
    },

    // === AR COATINGS ===
    arCoatings: {
      QM: enhancementForm.ar_coatings?.QM_standard ?? 0,
      QT: enhancementForm.ar_coatings?.QT_premium_1 ?? 0,
      QV: enhancementForm.ar_coatings?.QV_premium_2 ?? 0,
    },

    // === ENHANCEMENTS ===
    enhancements: {
      PR: enhancementForm.photochromics?.PR_plastic ?? 0,
      DA:
        enhancementForm.polarized?.DA_sv ?? enhancementForm.polarized?.DA_multi ?? 0,
      LF: enhancementForm.misc?.LF_light_filter ?? 0,
      SP: enhancementForm.misc?.SP_edge_polish ?? 0,
      SW: enhancementForm.misc?.SW_rimless ?? 0,
      MN:
        enhancementForm.tints?.MN_plastic_sv ?? enhancementForm.tints?.MN_plastic_multi ?? 0,
      TA: enhancementForm.misc?.TA_tech_addon ?? 0,
      IA: enhancementForm.misc?.IA_near_variable ?? 0,
      CM: enhancementForm.misc?.CM_custom_measurement ?? 0,
      QP: (enhancementForm as any).mirror?.QP_mirror_solid ?? 0,
      QR: (enhancementForm as any).mirror?.QR_ski_type ?? 0,
      SV: (enhancementForm as any).uv_protection?.SV_uv ?? 0,
      RM: (enhancementForm as any).oversize?.RM_oversize_plastic ?? 0,
      AA: enhancementForm.misc?.AA_aspheric ?? 0,
      BA: enhancementForm.misc?.BA_digital_aspheric ?? 0,
    },

    // === POLARIZED PROGRESSIVE ADD-ONS ===
    polarizedProgressives: {
      KP: enhancementForm.polarized?.KP ?? 0,
      JP: enhancementForm.polarized?.JP ?? 0,
      FP: enhancementForm.polarized?.FP ?? 0,
      NP: enhancementForm.polarized?.NP ?? 0,
      OP: enhancementForm.polarized?.OP ?? 0,
    },

    // === PROGRESSIVE TIER BASE COPAYS (from Enhancement Form) ===
    progressives: {
      K_standard: enhancementForm.progressives?.K_standard ?? 0,
      J_premium: enhancementForm.progressives?.J_premium ?? 0,
      F_premium_adv: enhancementForm.progressives?.F_premium_adv ?? 0,
      O_custom: enhancementForm.progressives?.O_custom ?? 0,
      N_custom: enhancementForm.progressives?.N_custom ?? 0,
    },

    // === MATERIAL UPGRADE COPAYS (from Enhancement Form) ===
    materials: {
      polycarbonate_sv: enhancementForm.materials?.polycarbonate_sv ?? 0,
      polycarbonate_multi: enhancementForm.materials?.polycarbonate_multi ?? 0,
      trivex_sv: enhancementForm.materials?.trivex_sv ?? 0,
      trivex_multi: enhancementForm.materials?.trivex_multi ?? 0,
      hi_index_167_sv: enhancementForm.materials?.hi_index_167_sv ?? 0,
      hi_index_167_multi: enhancementForm.materials?.hi_index_167_multi ?? 0,
      hi_index_174_sv: enhancementForm.materials?.hi_index_174_sv ?? 0,
      hi_index_174_multi: enhancementForm.materials?.hi_index_174_multi ?? 0,
    },

    // === COVERAGE STATUS ===
    coverageStatus: {
      progressivesCovered: enhancementForm.coverage_status?.progressives_covered ?? false,
      arCovered: enhancementForm.coverage_status?.ar_covered ?? false,
      photochromicsCovered: enhancementForm.coverage_status?.photochromics_covered ?? false,
      photochromicsNotCovered:
        enhancementForm.coverage_status?.photochromics_not_covered ?? false,
      polarizedNotCovered: enhancementForm.coverage_status?.polarized_not_covered ?? false,
    },
  }
}

/**
 * Create a merged authorization from just the auth form
 * (when enhancement form is not available)
 */
export function createPartialVspAuthorization(
  authForm: VspAuthFormExtraction
): Omit<VspMergedAuthorization, 'lensMatrix' | 'arCoatings' | 'enhancements' | 'polarizedProgressives' | 'coverageStatus'> {
  // Use the merge function with empty enhancement form defaults
  const emptyEnhancement: VspEnhancementFormExtraction = {
    document_type: 'enhancement_form',
    authorization_number: authForm.authorization_number,
    patient_name: authForm.patient_name,
    progressives: {
      K_standard: null,
      J_premium: null,
      F_premium_adv: null,
      O_custom: null,
      N_custom: null,
    },
    single_vision_base: 0,
    materials: {
      polycarbonate_sv: null,
      polycarbonate_multi: null,
      trivex_sv: null,
      trivex_multi: null,
      hi_index_167_sv: null,
      hi_index_167_multi: null,
      hi_index_174_sv: null,
      hi_index_174_multi: null,
    },
    lens_matrix: {
      SV_plastic: null,
      SV_poly: null,
      SV_trivex: null,
      SV_hi167: null,
      SV_hi174: null,
      KA: null, KD: null, KB: null, KH: null, KJ: null,
      JA: null, JD: null, JB: null, JH: null, JJ: null,
      FA: null, FD: null, FB: null, FH: null, FJ: null,
      OA: null, OD: null, OB: null, OH: null, OJ: null,
      NA: null, ND: null, NB: null, NH: null, NJ: null,
    },
    ar_coatings: {
      QM_standard: null,
      QT_premium_1: null,
      QV_premium_2: null,
    },
    photochromics: {
      PR_plastic: null,
      PM_glass: null,
    },
    polarized: {
      DA_sv: null,
      DA_multi: null,
      KP: null,
      JP: null,
      FP: null,
      NP: null,
      OP: null,
    },
    tints: {
      MN_plastic_sv: null,
      MN_plastic_multi: null,
      MP_gradient_sv: null,
      MP_gradient_multi: null,
    },
    mirror: {
      QP_mirror_solid: null,
      QR_ski_type: null,
    },
    uv_protection: {
      SV_uv: null,
      BV_uv_backside: null,
    },
    oversize: {
      RM_oversize_plastic: null,
      RN_oversize_glass: null,
    },
    misc: {
      SP_edge_polish: null,
      SQ_edge_coating: null,
      SW_rimless: null,
      LF_light_filter: null,
      TA_tech_addon: null,
      IA_near_variable: null,
      AA_aspheric: null,
      BA_digital_aspheric: null,
      CM_custom_measurement: null,
    },
    coverage_status: {
      progressives_covered: false,
      ar_covered: false,
      photochromics_covered: false,
      photochromics_not_covered: false,
      polarized_not_covered: false,
    },
  }

  const merged = mergeVspExtractions(authForm, emptyEnhancement)
  const { lensMatrix, arCoatings, enhancements, polarizedProgressives, coverageStatus, ...partial } = merged
  return partial
}

/**
 * Validate that required fields are present
 */
export function validateVspAuthorization(
  auth: VspMergedAuthorization
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!auth.patientInfo.name || auth.patientInfo.name === 'Unknown') {
    errors.push('Patient name is required')
  }

  if (!auth.patientInfo.authNumber) {
    errors.push('Authorization number is required')
  }

  if (auth.frameAllowance.amount <= 0) {
    errors.push('Frame allowance must be greater than 0')
  }

  // Check if lens matrix has any values
  const hasLensMatrix = Object.values(auth.lensMatrix).some(
    (v) => v !== null && v !== undefined
  )
  if (!hasLensMatrix) {
    errors.push('Enhancement form data is missing (no lens matrix)')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
