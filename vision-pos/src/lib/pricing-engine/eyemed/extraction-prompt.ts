/**
 * EyeMed Benefit Extraction Prompt
 * Used with Claude API to extract structured benefit data from PDFs
 */

export const EYEMED_EXTRACTION_PROMPT = `You are reading an EyeMed vision benefit authorization document.
Extract ALL benefit data and return ONLY a valid JSON object — no markdown, no explanation, just raw JSON.

Extract these exact fields (use null if not found):

{
  "patient_name": "string",
  "patient_dob": "string",
  "patient_age": number,
  "plan_name": "string",
  "member_id": "string",

  "exam_copay": number,
  "retinal_imaging_fee": number,

  "cl_fit_standard": number or null,
  "cl_fit_standard_type": "flat" or "discount",
  "cl_fit_standard_pct": number (0.0-1.0) or null,
  "cl_fit_premium": number or null,
  "cl_fit_premium_type": "flat" or "discount",
  "cl_fit_premium_pct": number (0.0-1.0) or null,

  "frame_allowance": number,
  "frame_overage_discount": number (e.g. 0.20 for 20% off),

  "contacts_allowance": number,
  "contacts_allowance_type": "disposable" or "conventional" or "both",
  "contacts_overage_pct": number (patient pays this % of overage, e.g. 1.0 = 100%),

  "lens_sv": number,
  "lens_bifocal": number,
  "lens_trifocal": number,

  "progressive_standard": number or null,
  "progressive_tier_1": number or null,
  "progressive_tier_2": number or null,
  "progressive_tier_3": number or null,
  "progressive_tier_4": number or null,
  "progressive_tier_4_type": "flat" or "copay_plus_overage",
  "progressive_tier_4_copay": number or null,
  "progressive_tier_4_allowance": number or null,
  "progressive_tier_4_overage_discount": number (e.g. 0.20) or null,
  "progressive_tier_5": number or null,

  "material_poly": number or null,
  "poly_free_under_18": true or false,
  "material_hi": number or null,
  "material_hi_type": "flat" or "discount",
  "material_hi_pct": number or null,
  "material_uhi": number or null,
  "material_uhi_type": "flat" or "discount",
  "material_uhi_pct": number or null,
  "material_trivex": number or null,
  "material_trivex_type": "flat" or "discount",
  "material_trivex_pct": number or null,

  "ar_standard": number or null,
  "ar_tier_1": number or null,
  "ar_tier_2": number or null,
  "ar_tier_2_type": "flat" or "discount",
  "ar_tier_2_pct": number (0.0-1.0) or null,
  "ar_tier_3": number or null,
  "ar_tier_3_type": "flat" or "discount",
  "ar_tier_3_pct": number (0.0-1.0) or null,

  "photochromic": number or null,

  "polarized": number or null,
  "polarized_type": "flat" or "discount",
  "polarized_pct": number or null,

  "tint": number or null,
  "uv_included": true or false,
  "uv_coating": number or null,

  "addons_flat": number or null,
  "addons_type": "flat" or "discount",
  "addons_pct": number or null
}

For discount fields: if the plan says "20% off retail" set type="discount" and pct=0.20.
For flat copay fields: set the dollar amount directly.
For progressive Tier 4 that shows "$X copay + 20% off overage above $Y allowance": set type="copay_plus_overage".`

/**
 * Clean and parse JSON response from Claude
 */
export function parseExtractionResponse(response: string): Record<string, unknown> {
  // Strip any markdown fences
  const clean = response
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()

  return JSON.parse(clean)
}
