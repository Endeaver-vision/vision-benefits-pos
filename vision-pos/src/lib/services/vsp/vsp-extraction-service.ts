/**
 * VSP Extraction Service
 *
 * Handles extraction of VSP authorization data from PDF documents using Claude.
 * Supports both auth forms and enhancement forms.
 */

import type {
  VspAuthFormExtraction,
  VspEnhancementFormExtraction,
  VspMergedAuthorization,
  VspExtractionResult,
} from '@/types/vsp-authorization'
import { mergeVspExtractions, validateVspAuthorization } from './vsp-merge-extractions'

// =============================================================================
// EXTRACTION PROMPTS
// =============================================================================

export const AUTH_FORM_PROMPT = `You are extracting data from a VSP Patient Record Report (authorization form).
Return ONLY valid JSON — no markdown, no explanation.

Extract these fields (use null if not found):

{
  "document_type": "auth_form",

  "patient_name": "string",
  "patient_dob": "string (MM/DD/YYYY)",
  "member_name": "string (may differ from patient)",
  "relationship": "string (Member, Spouse, Child, etc.)",
  "authorization_number": "string",
  "auth_effective_date": "string (MM/DD/YYYY)",
  "auth_expiration_date": "string (MM/DD/YYYY)",

  "plan_type": "signature" | "choice" | "advantage" | "computer_visioncare" | "savings_pass",
  "client_name": "string (employer name)",
  "network": "string (VSP, Choice, Advantage)",
  "lab_use": "string",

  "eligibility": {
    "exam": boolean,
    "lens": boolean,
    "frame": boolean,
    "contact_lens_exam": boolean,
    "contacts": boolean
  },

  "exam_copay": number,
  "material_copay": number,
  "routine_retinal_screening": number or "lesser of $XX or U&C" pattern,

  "frame_allowance": {
    "wfa_code": "string (e.g., WFA60)",
    "altair_amount": number,
    "non_altair_amount": number,
    "frame_overage_discount": 0.20,
    "easyoptions_wfa_code": "string or null",
    "easyoptions_amount": number or null
  },

  "contact_lens_pattern": "separate" | "combined" | "covered_in_full" | "discount" | "none",
  "cl_exam_copay": number or null,
  "cl_exam_percentage": 0.85,
  "cl_materials_allowance": number or null,
  "cl_combined_allowance": number or null,
  "cl_combined_discount": 0.15,
  "cl_exam_only_responsibility": number or null,
  "cl_easyoptions_allowance": number or null,
  "necessary_cl_copay": number or null,
  "contacts_instead_of": ["lens", "frame"] or null,
  "contacts_frame_next_available": "string (MM/YY)" or null,

  "has_easyoptions": boolean,
  "easyoptions": {
    "contact_lens_upgrade": number or null,
    "frame_upgrade": number or null,
    "photochromic_upgrade": "covered" or null,
    "progressive_upgrade": "covered" or null,
    "ar_upgrade": "covered" or null
  } or null,

  "flags": {
    "has_emc": boolean,
    "emc_type": "essential_medical_eye_care" | "diabetic_eyecare_plus" | null,
    "emc_exam_copay": number or null,
    "is_computer_visioncare": boolean,
    "computer_rx_requirement": "string" or null,
    "has_post_laser": boolean,
    "has_low_vision": boolean,
    "has_vision_therapy": boolean,
    "has_cob_restriction": boolean,
    "cob_rule": "string" or null,
    "value_added_benefits": {
      "same_day_discount": number or null,
      "same_day_40_discount": number or null,
      "within_12_months_discount": number or null,
      "within_12_months_40_discount": number or null,
      "cl_exam_discount": number or null
    } or null
  },

  "eye_health_conditions": {
    "reported_conditions": ["string"] or [],
    "systemic_checked": ["string"] or [],
    "ocular_checked": ["string"] or [],
    "dilation_performed": boolean,
    "pcp_communication": boolean
  },

  "lens_enhancement_summary": {
    "covered": ["list of items marked Covered"],
    "covered_with_copay": ["list of items with copay"],
    "not_covered": ["list of items NOT covered"]
  }
}

EXTRACTION RULES:
1. For plan_type: Look for "Benefit VSP [TYPE] Plan" in PATIENT COVERAGE section
2. For frame_allowance: ALWAYS extract the "non-Altair" or "non-Altair/Marchon" line
3. For EasyOptions amounts: Look for items marked with * suffix
4. For contact patterns:
   - "CL Exam Services" + "CL Materials" = "separate"
   - "Exam And Allowance" = "combined"
   - "Covered in full" = "covered_in_full"
5. For EMC: Look for "Essential Medical Eye Care" or "Diabetic Eyecare Plus Program"
6. For Computer VisionCare: Must have "VSP Computer VisionCare Plan Supplemental"
7. Dollar amounts: Extract number only (no $ sign)
8. Percentages: Convert to decimal (20% → 0.20)`

export const ENHANCEMENT_FORM_PROMPT = `You are extracting data from a VSP Lens Enhancement Charges sheet.
Return ONLY valid JSON — no markdown, no explanation.

The form has two columns: "Single Cost" (SV) and "Multi Cost" (Progressive/Bifocal).
Extract copay amounts using VSP's two-letter code system.

{
  "document_type": "enhancement_form",
  "authorization_number": "string (from header)",
  "patient_name": "string (from header)",

  "progressives": {
    "K_standard": number,
    "J_premium": number,
    "F_premium_adv": number,
    "O_custom": number,
    "N_custom": number
  },

  "single_vision_base": 0,

  "materials": {
    "polycarbonate_sv": number,
    "polycarbonate_multi": number,
    "trivex_sv": number,
    "trivex_multi": number,
    "hi_index_167_sv": number,
    "hi_index_167_multi": number,
    "hi_index_174_sv": number,
    "hi_index_174_multi": number
  },

  "lens_matrix": {
    "SV_plastic": number,
    "SV_poly": number,
    "SV_trivex": number,
    "SV_hi167": number,
    "SV_hi174": number,

    "KA": number, "KD": number, "KB": number, "KH": number, "KJ": number,
    "JA": number, "JD": number, "JB": number, "JH": number, "JJ": number,
    "FA": number, "FD": number, "FB": number, "FH": number, "FJ": number,
    "OA": number, "OD": number, "OB": number, "OH": number, "OJ": number,
    "NA": number, "ND": number, "NB": number, "NH": number, "NJ": number
  },

  "ar_coatings": {
    "QM_standard": number,
    "QT_premium_1": number,
    "QV_premium_2": number
  },

  "photochromics": {
    "PR_plastic": number,
    "PM_glass": number
  },

  "polarized": {
    "DA_sv": number,
    "DA_multi": number,
    "KP": number, "JP": number, "FP": number, "NP": number, "OP": number
  },

  "tints": {
    "MN_plastic_sv": number,
    "MN_plastic_multi": number,
    "MP_gradient_sv": number,
    "MP_gradient_multi": number
  },

  "mirror": {
    "QP_mirror_solid": number,
    "QR_ski_type": number
  },

  "uv_protection": {
    "SV_uv": number,
    "BV_uv_backside": number
  },

  "oversize": {
    "RM_oversize_plastic": number,
    "RN_oversize_glass": number
  },

  "misc": {
    "SP_edge_polish": number,
    "SQ_edge_coating": number,
    "SW_rimless": number,
    "LF_light_filter": number,
    "TA_tech_addon": number,
    "IA_near_variable": number,
    "AA_aspheric": number,
    "BA_digital_aspheric": number,
    "CM_custom_measurement": number
  },

  "coverage_status": {
    "progressives_covered": boolean,
    "ar_covered": boolean,
    "photochromics_covered": boolean,
    "photochromics_not_covered": boolean,
    "polarized_not_covered": boolean
  }
}

EXTRACTION RULES:
1. $00 or $0 or blank = 0 (covered, no copay)
2. Look for "Covered" header = all items below are $0
3. Look for "Covered With Additional Copay" = items have copays
4. Look for "Not Covered" = item should be flagged
5. If item not found, use null`

// =============================================================================
// EXTRACTION FUNCTIONS
// =============================================================================

interface ClaudeExtractionResult<T> {
  data: T
  usage: { input_tokens: number; output_tokens: number }
}

/**
 * Extract data from a PDF using Claude
 */
async function extractWithClaude<T>(
  pdfBase64: string,
  prompt: string
): Promise<ClaudeExtractionResult<T>> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  const usage = result.usage

  const text = result.content?.find((b: { type: string }) => b.type === 'text')?.text ?? ''
  const clean = text.replace(/```json|```/g, '').trim()
  const data = JSON.parse(clean) as T

  return {
    data,
    usage: { input_tokens: usage?.input_tokens || 0, output_tokens: usage?.output_tokens || 0 },
  }
}

/**
 * Extract VSP auth form data from a PDF
 */
export async function extractVspAuthForm(
  pdfBase64: string
): Promise<ClaudeExtractionResult<VspAuthFormExtraction>> {
  return extractWithClaude<VspAuthFormExtraction>(pdfBase64, AUTH_FORM_PROMPT)
}

/**
 * Extract VSP enhancement form data from a PDF
 */
export async function extractVspEnhancementForm(
  pdfBase64: string
): Promise<ClaudeExtractionResult<VspEnhancementFormExtraction>> {
  return extractWithClaude<VspEnhancementFormExtraction>(pdfBase64, ENHANCEMENT_FORM_PROMPT)
}

/**
 * Full extraction: extract both forms and merge into a single authorization
 */
export async function extractVspAuthorization(
  authFormBase64: string,
  enhancementFormBase64: string
): Promise<VspExtractionResult> {
  const errors: string[] = []

  try {
    // Extract auth form
    const authResult = await extractVspAuthForm(authFormBase64)

    // Extract enhancement form
    const enhancementResult = await extractVspEnhancementForm(enhancementFormBase64)

    // Merge extractions
    const authorization = mergeVspExtractions(authResult.data, enhancementResult.data)

    // Validate
    const validation = validateVspAuthorization(authorization)
    if (!validation.valid) {
      errors.push(...validation.errors)
    }

    return {
      success: true,
      authorization,
      authFormRaw: JSON.stringify(authResult.data),
      enhancementFormRaw: JSON.stringify(enhancementResult.data),
      usage: {
        authForm: authResult.usage,
        enhancementForm: enhancementResult.usage,
        total: {
          input_tokens: authResult.usage.input_tokens + enhancementResult.usage.input_tokens,
          output_tokens: authResult.usage.output_tokens + enhancementResult.usage.output_tokens,
        },
      },
      errors,
    }
  } catch (error) {
    return {
      success: false,
      authorization: null,
      authFormRaw: null,
      enhancementFormRaw: null,
      usage: {
        authForm: null,
        enhancementForm: null,
        total: { input_tokens: 0, output_tokens: 0 },
      },
      errors: [error instanceof Error ? error.message : 'Unknown extraction error'],
    }
  }
}
