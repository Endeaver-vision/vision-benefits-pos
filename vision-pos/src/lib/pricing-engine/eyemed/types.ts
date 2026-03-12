/**
 * EyeMed Pricing Engine Type Definitions
 */

// Product type mapping - determines how pricing is calculated
export type ProductType =
  | 'cash_only'
  | 'medical_billing'
  | 'exam'
  | 'retinal_imaging'
  | 'cl_fit_standard'
  | 'cl_fit_premium'
  | 'cl_fit_specialty'
  | 'lens_sv'
  | 'lens_sv_premium'
  | 'lens_bifocal'
  | 'lens_trifocal'
  | 'progressive_standard'
  | 'progressive_tier_3'
  | 'progressive_tier_4'
  | 'progressive_tier_5'
  | 'material_poly'
  | 'material_hi'
  | 'material_uhi'
  | 'material_trivex'
  | 'material_base'
  | 'ar_standard'
  | 'ar_tier_2'
  | 'ar_tier_3'
  | 'photochromic'
  | 'polarized'
  | 'tint'
  | 'uv_coating'
  | 'mount_included'
  | 'mount_fee'
  | 'lens_addon'

// Product from catalog
export interface Product {
  category: string
  name: string
  retail: number
  type: ProductType
  backsideUvSurcharge?: boolean  // For Crizal products that require UV surcharge
  cashOnly?: boolean
}

// Extracted benefit data from PDF
export interface ExtractedBenefits {
  // Patient info
  patient_name: string | null
  patient_dob: string | null
  patient_age: number | null
  plan_name: string | null
  member_id: string | null

  // Exam
  exam_copay: number | null
  retinal_imaging_fee: number | null

  // Contact lens fitting
  cl_fit_standard: number | null
  cl_fit_standard_type: 'flat' | 'discount' | null
  cl_fit_standard_pct: number | null
  cl_fit_premium: number | null
  cl_fit_premium_type: 'flat' | 'discount' | null
  cl_fit_premium_pct: number | null

  // Frame
  frame_allowance: number | null
  frame_overage_discount: number | null

  // Contact lenses
  contacts_allowance: number | null
  contacts_allowance_type: 'disposable' | 'conventional' | 'both' | null
  contacts_overage_pct: number | null

  // Basic lenses
  lens_sv: number | null
  lens_bifocal: number | null
  lens_trifocal: number | null

  // Progressives
  progressive_standard: number | null
  progressive_tier_1: number | null
  progressive_tier_2: number | null
  progressive_tier_3: number | null
  progressive_tier_4: number | null
  progressive_tier_4_type: 'flat' | 'copay_plus_overage' | null
  progressive_tier_4_copay: number | null
  progressive_tier_4_allowance: number | null
  progressive_tier_4_overage_discount: number | null
  progressive_tier_5: number | null

  // Materials
  material_poly: number | null
  poly_free_under_18: boolean
  material_hi: number | null
  material_hi_type: 'flat' | 'discount' | null
  material_hi_pct: number | null
  material_uhi: number | null
  material_uhi_type: 'flat' | 'discount' | null
  material_uhi_pct: number | null
  material_trivex: number | null
  material_trivex_type: 'flat' | 'discount' | null
  material_trivex_pct: number | null

  // AR coatings
  ar_standard: number | null
  ar_tier_1: number | null
  ar_tier_2: number | null
  ar_tier_2_type: 'flat' | 'discount' | null
  ar_tier_2_pct: number | null
  ar_tier_3: number | null
  ar_tier_3_type: 'flat' | 'discount' | null
  ar_tier_3_pct: number | null

  // Other coatings
  photochromic: number | null
  polarized: number | null
  polarized_type: 'flat' | 'discount' | null
  polarized_pct: number | null
  tint: number | null
  uv_included: boolean
  uv_coating: number | null

  // Add-ons
  addons_flat: number | null
  addons_type: 'flat' | 'discount' | null
  addons_pct: number | null
}

// Pricing result for a single product
export interface PricingResult {
  product: Product
  patientCost: number
  note: string
  breakdown?: {
    baseCopay?: number
    allowance?: number
    discount?: number
    overage?: number
    surcharge?: number
  }
}

// Full price list for a patient
export interface PatientPriceList {
  patient: {
    name: string
    memberId: string
    dob: string
    age: number
    planName: string
  }
  benefits: ExtractedBenefits
  products: PricingResult[]
  generatedAt: string
}

// Static rules configuration
export interface StaticRule {
  name: string
  description: string
  applies: (product: Product, benefits: ExtractedBenefits) => boolean
  modify: (result: PricingResult, product: Product, benefits: ExtractedBenefits) => PricingResult
}
