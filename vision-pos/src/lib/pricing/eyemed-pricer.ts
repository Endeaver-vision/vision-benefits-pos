/**
 * EyeMed Pricing Utility
 *
 * Shared pricing logic for both standalone EyeMed pricer and inline pricer.
 * CRITICAL: Any changes here affect BOTH systems - ensure price fidelity is maintained.
 */

export interface ExtractedBenefits {
  patient_name?: string
  patient_dob?: string
  patient_age?: number
  plan_name?: string
  member_id?: string
  exam_copay?: number
  retinal_imaging_fee?: number
  cl_fit_standard?: number
  cl_fit_standard_type?: string
  cl_fit_standard_pct?: number
  cl_fit_premium?: number
  cl_fit_premium_type?: string
  cl_fit_premium_pct?: number
  cl_fit_premium_allowance?: number
  frame_allowance?: number
  frame_overage_discount?: number
  contacts_allowance?: number
  contacts_allowance_type?: string
  contacts_overage_pct?: number
  lens_sv?: number
  lens_bifocal?: number
  lens_trifocal?: number
  progressive_standard?: number
  progressive_tier_1?: number
  progressive_tier_2?: number
  progressive_tier_3?: number
  progressive_tier_4?: number
  progressive_tier_4_type?: string
  progressive_tier_4_copay?: number
  progressive_tier_4_allowance?: number
  progressive_tier_4_overage_discount?: number
  progressive_tier_5?: number
  material_poly?: number
  poly_free_under_18?: boolean
  material_hi?: number
  material_hi_type?: string
  material_hi_pct?: number
  material_uhi?: number
  material_uhi_type?: string
  material_uhi_pct?: number
  material_trivex?: number
  material_trivex_type?: string
  material_trivex_pct?: number
  ar_standard?: number
  ar_tier_1?: number
  ar_tier_2?: number
  ar_tier_3?: number
  ar_premium_pct?: number
  photochromic?: number
  polarized?: number
  polarized_type?: string
  polarized_pct?: number
  tint?: number
  uv_included?: boolean
  uv_coating?: number
  addons_flat?: number
  addons_type?: string
  addons_pct?: number
  [key: string]: string | number | boolean | null | undefined
}

export interface Product {
  category: string
  name: string
  retail: number
  type: string
}

export interface PricedProduct extends Product {
  patientCost: number
  note: string
}

// Product catalog - comprehensive list of all products
export const EYEMED_PRODUCTS: Product[] = [
  // EXAM SERVICES
  { category: "EXAM SERVICES", name: "Routine Vision Exam", retail: 100, type: "exam" },
  { category: "EXAM SERVICES", name: "Medical Exam", retail: 100, type: "medical_billing" },

  // EXAM ADD-ONS
  { category: "EXAM ADD-ONS", name: "Optomap", retail: 39, type: "retinal_imaging" },
  { category: "EXAM ADD-ONS", name: "iWellness", retail: 19, type: "cash_only" },
  { category: "EXAM ADD-ONS", name: "OCT Retina/ON", retail: 39, type: "medical_billing" },
  { category: "EXAM ADD-ONS", name: "Visual Field", retail: 39, type: "medical_billing" },
  { category: "EXAM ADD-ONS", name: "External Photos", retail: 29, type: "medical_billing" },
  { category: "EXAM ADD-ONS", name: "Neuro HA Screen", retail: 89, type: "cash_only" },
  { category: "EXAM ADD-ONS", name: "Corneal Thickness", retail: 29, type: "medical_billing" },
  { category: "EXAM ADD-ONS", name: "Myopia Atropine Exam Consult & Follow Up", retail: 350, type: "cash_only" },

  // CONTACT LENS FITTING
  { category: "CONTACT LENS FITTING", name: "Sphere", retail: 75, type: "cl_fit_standard" },
  { category: "CONTACT LENS FITTING", name: "Toric", retail: 100, type: "cl_fit_standard" },
  { category: "CONTACT LENS FITTING", name: "Multifocal Soft Lens", retail: 150, type: "cl_fit_premium" },
  { category: "CONTACT LENS FITTING", name: "Monovision", retail: 120, type: "cl_fit_standard" },
  { category: "CONTACT LENS FITTING", name: "RGP", retail: 350, type: "cl_fit_specialty" },
  { category: "CONTACT LENS FITTING", name: "Specialty CL", retail: 850, type: "cl_fit_specialty" },
  { category: "CONTACT LENS FITTING", name: "Ortho-K", retail: 2200, type: "cl_fit_specialty" },
  { category: "CONTACT LENS FITTING", name: "MiSight Fitting", retail: 1250, type: "cl_fit_specialty" },

  // LENS TYPE
  { category: "LENS TYPE", name: "Single Vision", retail: 96, type: "lens_sv" },
  { category: "LENS TYPE", name: "Eyezen", retail: 144, type: "lens_sv_premium" },
  { category: "LENS TYPE", name: "FT Bifocal", retail: 182, type: "lens_bifocal" },
  { category: "LENS TYPE", name: "FT Trifocal", retail: 155, type: "lens_trifocal" },
  { category: "LENS TYPE", name: "Varilux Comfort DRx", retail: 280, type: "progressive_tier_3" },
  { category: "LENS TYPE", name: "Varilux Comfort Max", retail: 409, type: "progressive_tier_4" },
  { category: "LENS TYPE", name: "Varilux X", retail: 615, type: "progressive_tier_4" },
  { category: "LENS TYPE", name: "Stellest", retail: 500, type: "progressive_tier_4" },
  { category: "LENS TYPE", name: "Neurolens SV", retail: 400, type: "cash_only" },
  { category: "LENS TYPE", name: "Neurolens Progressive", retail: 700, type: "cash_only" },
  { category: "LENS TYPE", name: "Varilux i", retail: 480, type: "cash_only" },
  { category: "LENS TYPE", name: "Sequel Single Vision", retail: 350, type: "cash_only" },
  { category: "LENS TYPE", name: "Sequel Progressive", retail: 536, type: "cash_only" },

  // LENS MATERIAL
  { category: "LENS MATERIAL", name: "CR-39 (base)", retail: 0, type: "material_base" },
  { category: "LENS MATERIAL", name: "Polycarbonate", retail: 65, type: "material_poly" },
  { category: "LENS MATERIAL", name: "1.67 High Index", retail: 130, type: "material_hi" },
  { category: "LENS MATERIAL", name: "1.72 Ultra High Index", retail: 150, type: "material_uhi" },
  { category: "LENS MATERIAL", name: "Trivex", retail: 75, type: "material_trivex" },

  // AR COATINGS
  { category: "AR COATINGS", name: "Crizal EZ Pro", retail: 148, type: "ar_tier_2" },
  { category: "AR COATINGS", name: "Crizal SunShield", retail: 180, type: "ar_tier_3" },
  { category: "AR COATINGS", name: "Crizal Sapphire", retail: 187, type: "ar_tier_3" },
  { category: "AR COATINGS", name: "Crizal Rock", retail: 158, type: "ar_tier_3" },
  { category: "AR COATINGS", name: "Neurolens Premium AR", retail: 180, type: "cash_only" },
  { category: "AR COATINGS", name: "Neurolens Blue AR", retail: 180, type: "cash_only" },

  // TRANSITIONS
  { category: "TRANSITIONS", name: "Transitions Gen S", retail: 160, type: "photochromic" },
  { category: "TRANSITIONS", name: "Transitions XtraActive", retail: 160, type: "photochromic" },

  // POLARIZED
  { category: "POLARIZED", name: "Polarized", retail: 180, type: "polarized" },

  // MOUNT FEE
  { category: "MOUNT FEE", name: "Full Rim", retail: 0, type: "mount_included" },
  { category: "MOUNT FEE", name: "Semi-Rimless", retail: 35, type: "mount_fee" },
  { category: "MOUNT FEE", name: "Rimless", retail: 45, type: "mount_fee" },

  // LENS ADD-ONS
  { category: "LENS ADD-ONS", name: "UV Coating", retail: 16, type: "uv_coating" },
  { category: "LENS ADD-ONS", name: "Tint", retail: 30, type: "tint" },
  { category: "LENS ADD-ONS", name: "Mirror", retail: 55, type: "lens_addon" },
  { category: "LENS ADD-ONS", name: "Oversize Lenses (61mm+)", retail: 30, type: "lens_addon" },
  { category: "LENS ADD-ONS", name: "Tech Add-on Single Vision", retail: 10, type: "lens_addon" },
  { category: "LENS ADD-ONS", name: "Tech Add-on Multifocal", retail: 40, type: "lens_addon" },
  { category: "LENS ADD-ONS", name: "Prism Per Diopter", retail: 15, type: "lens_addon" },
  { category: "LENS ADD-ONS", name: "Essential Blue", retail: 40, type: "lens_addon" },
  { category: "LENS ADD-ONS", name: "Roll and Polish", retail: 30, type: "lens_addon" },
]

/**
 * Calculate patient cost for a single product based on extracted benefits
 * CRITICAL: This function must remain identical to the original pricer logic
 */
export function calcPatientCost(product: Product, benefits: ExtractedBenefits): { cost: number; note: string } {
  const { type, retail } = product
  const b = benefits

  const pct = (val: number | undefined | null) => (typeof val === "number" ? val : 0)
  const flat = (val: number | undefined | null) => (typeof val === "number" ? val : null)

  switch (type) {
    case "cash_only":
      return { cost: retail, note: "Cash only" }

    case "medical_billing":
      return { cost: retail, note: "Medical insurance" }

    case "exam":
      return { cost: flat(b.exam_copay) ?? retail, note: "Exam copay" }

    case "retinal_imaging":
      return { cost: flat(b.retinal_imaging_fee) ?? retail, note: "Retinal imaging" }

    case "cl_fit_standard":
      if (flat(b.cl_fit_standard) !== null) {
        return { cost: b.cl_fit_standard!, note: "CL fit copay" }
      }
      if (b.cl_fit_standard_type === "discount" && b.cl_fit_standard_pct) {
        const cost = retail * (1 - b.cl_fit_standard_pct)
        return { cost, note: `${Math.round(b.cl_fit_standard_pct * 100)}% off` }
      }
      return { cost: retail, note: "Check plan" }

    case "cl_fit_premium": {
      const premAllowance = flat(b.cl_fit_premium_allowance) ?? 0
      const premDiscount = pct(b.cl_fit_premium_pct ?? 0.10)
      if (premAllowance > 0 || b.cl_fit_premium_type === "discount") {
        const remainder = Math.max(0, retail - premAllowance)
        const cost = remainder * (1 - premDiscount)
        return { cost, note: `${Math.round(premDiscount * 100)}% off over $${premAllowance}` }
      }
      if (flat(b.cl_fit_premium) !== null) {
        return { cost: b.cl_fit_premium!, note: "Premium CL fit copay" }
      }
      return { cost: retail, note: "Check plan" }
    }

    case "cl_fit_specialty":
      return { cost: retail, note: "Specialty - verify" }

    case "lens_sv":
    case "lens_sv_premium":
      return { cost: flat(b.lens_sv) ?? retail, note: "SV copay" }

    case "lens_bifocal":
      return { cost: flat(b.lens_bifocal) ?? retail, note: "Bifocal copay" }

    case "lens_trifocal":
      return { cost: flat(b.lens_trifocal) ?? retail, note: "Trifocal copay" }

    case "progressive_tier_3":
    case "progressive_tier_4": {
      if (b.progressive_tier_4_type === "copay_plus_overage") {
        const base = flat(b.progressive_tier_4_copay) ?? 0
        const allowance = flat(b.progressive_tier_4_allowance) ?? 0
        const discount = pct(b.progressive_tier_4_overage_discount ?? 0.20)
        const overage = Math.max(0, retail - allowance)
        const cost = base + overage * (1 - discount)
        return { cost, note: `$${base} + ${Math.round((1 - discount) * 100)}% over $${allowance}` }
      }
      const copay = flat(b.progressive_tier_4) ?? flat(b.progressive_tier_3) ?? flat(b.progressive_standard) ?? retail
      return { cost: copay, note: "Progressive copay" }
    }

    case "material_poly":
      if (b.poly_free_under_18 && (b.patient_age ?? 99) < 19) {
        return { cost: 0, note: "Free under 19" }
      }
      return { cost: flat(b.material_poly) ?? retail, note: "Poly copay" }

    case "material_hi": {
      // "All Other Lens Options" = 20% off retail by default
      const hiCopay = flat(b.material_hi)
      if (hiCopay !== null) return { cost: hiCopay, note: "HI copay" }
      const hiPct = pct(b.material_hi_pct ?? 0.20)
      return { cost: retail * (1 - hiPct), note: `${Math.round(hiPct * 100)}% off` }
    }

    case "material_uhi": {
      const uhiCopay = flat(b.material_uhi)
      if (uhiCopay !== null) return { cost: uhiCopay, note: "UHI copay" }
      const uhiPct = pct(b.material_uhi_pct ?? 0.20)
      return { cost: retail * (1 - uhiPct), note: `${Math.round(uhiPct * 100)}% off` }
    }

    case "material_trivex": {
      const trivexCopay = flat(b.material_trivex)
      if (trivexCopay !== null) return { cost: trivexCopay, note: "Trivex copay" }
      const trivexPct = pct(b.material_trivex_pct ?? 0.20)
      return { cost: retail * (1 - trivexPct), note: `${Math.round(trivexPct * 100)}% off` }
    }

    case "material_base":
      return { cost: 0, note: "Included" }

    case "ar_tier_2": {
      const ar2Copay = flat(b.ar_tier_2)
      if (ar2Copay !== null) return { cost: ar2Copay, note: "AR Tier 2 copay" }
      const ar2Pct = pct(b.ar_premium_pct ?? 0.20)
      return { cost: retail * (1 - ar2Pct), note: `${Math.round(ar2Pct * 100)}% off` }
    }

    case "ar_tier_3": {
      const ar3Copay = flat(b.ar_tier_3)
      if (ar3Copay !== null) return { cost: ar3Copay, note: "AR Tier 3 copay" }
      const ar3Pct = pct(b.ar_premium_pct ?? 0.20)
      return { cost: retail * (1 - ar3Pct), note: `${Math.round(ar3Pct * 100)}% off` }
    }

    case "photochromic":
      return { cost: flat(b.photochromic) ?? retail, note: "Photochromic copay" }

    case "polarized": {
      // "All Other Lens Options" = 20% off retail by default
      const polCopay = flat(b.polarized)
      if (polCopay !== null) return { cost: polCopay, note: "Polarized copay" }
      const polPct = pct(b.polarized_pct ?? 0.20)
      return { cost: retail * (1 - polPct), note: `${Math.round(polPct * 100)}% off` }
    }

    case "tint":
      return { cost: flat(b.tint) ?? retail, note: "Tint copay" }

    case "uv_coating":
      if (b.uv_included) return { cost: 0, note: "Included" }
      return { cost: flat(b.uv_coating) ?? retail, note: "UV coating" }

    case "mount_included":
      return { cost: 0, note: "Included" }

    case "mount_fee":
      return { cost: retail, note: "Mount fee" }

    case "lens_addon": {
      // "All Other Lens Options" = 20% off retail by default
      const addonCopay = flat(b.addons_flat)
      if (addonCopay !== null) return { cost: addonCopay, note: "Add-on copay" }
      const addonPct = pct(b.addons_pct ?? 0.20)
      return { cost: retail * (1 - addonPct), note: `${Math.round(addonPct * 100)}% off` }
    }

    default:
      return { cost: retail, note: "See plan" }
  }
}

/**
 * Price all products in the catalog using extracted benefits
 */
export function priceAllProducts(benefits: ExtractedBenefits): PricedProduct[] {
  return EYEMED_PRODUCTS.map(p => {
    const { cost, note } = calcPatientCost(p, benefits)
    return { ...p, patientCost: Math.round(cost * 100) / 100, note }
  })
}

/**
 * Get unique categories from product list
 */
export function getCategories(): string[] {
  return [...new Set(EYEMED_PRODUCTS.map(p => p.category))]
}
