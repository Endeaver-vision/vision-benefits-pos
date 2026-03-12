/**
 * Test Data for EyeMed Pricing Engine
 * Based on actual extracted benefit documents
 */

import { ExtractedBenefits } from './types'

/**
 * Angela Clayton - Member ID: 20706244103
 * Source: /Reference-Docs/Eyemed Only/EyeMed_AC_Benefits.pdf
 * Plan: Access 101 FF 360
 * Group: SOUTHEASTERN FREIGHT LINES (9909425)
 */
export const ANGELA_CLAYTON_BENEFITS: ExtractedBenefits = {
  // Patient info
  patient_name: 'ANGELA CLAYTON',
  patient_dob: '02/15/1970',
  patient_age: 54,
  plan_name: 'Access 101 FF 360',
  member_id: '20706244103',

  // Exam - $0 copay
  exam_copay: 0,
  retinal_imaging_fee: 39, // Up to $39 allowance

  // Contact lens fitting
  cl_fit_standard: 0, // $0 copay
  cl_fit_standard_type: 'flat',
  cl_fit_standard_pct: null,
  cl_fit_premium: null, // 10% off retail less $55 allowance
  cl_fit_premium_type: 'discount',
  cl_fit_premium_pct: 0.10,

  // Frame - $0 copay + 20% off over $180
  frame_allowance: 180,
  frame_overage_discount: 0.20,

  // Contacts - $130 allowance
  contacts_allowance: 130,
  contacts_allowance_type: 'both',
  contacts_overage_pct: 0.85, // 15% off balance (patient pays 85%)

  // Lenses - $25 copay for standard
  lens_sv: 25,
  lens_bifocal: 25,
  lens_trifocal: 25,

  // Progressives
  progressive_standard: 25,
  progressive_tier_1: null,
  progressive_tier_2: null,
  progressive_tier_3: null,
  progressive_tier_4: null,
  progressive_tier_4_type: 'copay_plus_overage',
  progressive_tier_4_copay: 25,
  progressive_tier_4_allowance: 120,
  progressive_tier_4_overage_discount: 0.20, // 20% off overage
  progressive_tier_5: null,

  // Materials
  material_poly: 40, // $40 for adults
  poly_free_under_18: true, // Free under 19
  material_hi: null,
  material_hi_type: 'discount',
  material_hi_pct: 0.20,
  material_uhi: null,
  material_uhi_type: 'discount',
  material_uhi_pct: 0.20,
  material_trivex: null,
  material_trivex_type: 'discount',
  material_trivex_pct: 0.20,

  // AR coatings
  ar_standard: 45, // Standard AR $45
  ar_tier_1: null,
  ar_tier_2: null,
  ar_tier_2_type: 'discount', // 20% off retail
  ar_tier_2_pct: 0.20,
  ar_tier_3: null,
  ar_tier_3_type: 'discount', // 20% off retail
  ar_tier_3_pct: 0.20,

  // Other
  photochromic: null, // 20% off retail - handled by addons
  polarized: null,
  polarized_type: 'discount',
  polarized_pct: 0.20,

  tint: 15, // $15
  uv_included: false,
  uv_coating: 15, // $15

  // Add-ons - 20% off retail
  addons_flat: null,
  addons_type: 'discount',
  addons_pct: 0.20
}

/**
 * Example benefits for a child (under 18) to test age-based rules
 */
export const CHILD_BENEFITS: ExtractedBenefits = {
  ...ANGELA_CLAYTON_BENEFITS,
  patient_name: 'CHILD PATIENT',
  patient_age: 12,
  poly_free_under_18: true
}
