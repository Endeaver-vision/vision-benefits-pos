/**
 * EyeMed Pricing Calculator
 * Core calculation logic for patient out-of-pocket costs
 */

import { Product, ExtractedBenefits, PricingResult } from './types'

// Helper to safely get a number value
const flat = (val: number | null | undefined): number | null =>
  typeof val === 'number' ? val : null

// Helper to get percentage value (defaults to 0)
const pct = (val: number | null | undefined): number =>
  typeof val === 'number' ? val : 0

/**
 * Calculate patient out-of-pocket cost for a single product
 */
export function calculateProductCost(
  product: Product,
  benefits: ExtractedBenefits
): PricingResult {
  const { type, retail } = product
  const b = benefits

  let cost: number
  let note: string
  let breakdown: PricingResult['breakdown'] = {}

  switch (type) {
    case 'cash_only':
      cost = retail
      note = 'Cash only — not covered by vision plan'
      break

    case 'medical_billing':
      cost = retail
      note = 'Billed to medical insurance separately'
      break

    case 'exam':
      cost = flat(b.exam_copay) ?? retail
      note = 'Exam copay'
      breakdown = { baseCopay: cost }
      break

    case 'retinal_imaging':
      cost = flat(b.retinal_imaging_fee) ?? retail
      note = 'Retinal imaging fee'
      break

    case 'cl_fit_standard':
      if (flat(b.cl_fit_standard) !== null) {
        cost = b.cl_fit_standard!
        note = 'Standard CL fitting copay'
      } else if (b.cl_fit_standard_type === 'discount' && b.cl_fit_standard_pct) {
        cost = retail * (1 - b.cl_fit_standard_pct)
        note = `${Math.round(b.cl_fit_standard_pct * 100)}% off retail`
        breakdown = { discount: b.cl_fit_standard_pct }
      } else {
        cost = retail
        note = 'Check plan for CL fit benefit'
      }
      break

    case 'cl_fit_premium':
      if (flat(b.cl_fit_premium) !== null) {
        cost = b.cl_fit_premium!
        note = 'Premium CL fitting copay'
      } else if (b.cl_fit_premium_type === 'discount' && b.cl_fit_premium_pct) {
        cost = retail * (1 - b.cl_fit_premium_pct)
        note = `${Math.round(b.cl_fit_premium_pct * 100)}% off retail`
        breakdown = { discount: b.cl_fit_premium_pct }
      } else {
        cost = retail
        note = 'Check plan for premium CL fit benefit'
      }
      break

    case 'cl_fit_specialty':
      cost = retail
      note = 'Specialty CL — verify with plan'
      break

    case 'lens_sv':
    case 'lens_sv_premium':
      cost = flat(b.lens_sv) ?? retail
      note = 'Single vision lens copay'
      breakdown = { baseCopay: cost }
      break

    case 'lens_bifocal':
      cost = flat(b.lens_bifocal) ?? retail
      note = 'Bifocal lens copay'
      breakdown = { baseCopay: cost }
      break

    case 'lens_trifocal':
      cost = flat(b.lens_trifocal) ?? retail
      note = 'Trifocal lens copay'
      breakdown = { baseCopay: cost }
      break

    case 'progressive_standard':
      cost = flat(b.progressive_standard) ?? retail
      note = 'Progressive standard copay'
      breakdown = { baseCopay: cost }
      break

    case 'progressive_tier_3': {
      const copay = flat(b.progressive_tier_3) ?? flat(b.progressive_standard) ?? retail
      cost = copay
      note = 'Progressive Tier 3 copay'
      breakdown = { baseCopay: cost }
      break
    }

    case 'progressive_tier_4': {
      if (b.progressive_tier_4_type === 'copay_plus_overage') {
        const baseCopay = flat(b.progressive_tier_4_copay) ?? 0
        const allowance = flat(b.progressive_tier_4_allowance) ?? 0
        const discount = pct(b.progressive_tier_4_overage_discount ?? 0.20)
        const overage = Math.max(0, retail - allowance)
        cost = baseCopay + overage * (1 - discount)
        note = `$${baseCopay} copay + ${Math.round((1 - discount) * 100)}% of overage above $${allowance} allowance`
        breakdown = { baseCopay, allowance, discount, overage }
      } else {
        cost = flat(b.progressive_tier_4) ?? retail
        note = 'Progressive Tier 4 copay'
        breakdown = { baseCopay: cost }
      }
      break
    }

    case 'progressive_tier_5': {
      // Tier 5 fallback to Tier 4 if not available
      if (flat(b.progressive_tier_5) !== null) {
        cost = b.progressive_tier_5!
        note = 'Progressive Tier 5 copay'
      } else if (b.progressive_tier_4_type === 'copay_plus_overage') {
        const baseCopay = flat(b.progressive_tier_4_copay) ?? 0
        const allowance = flat(b.progressive_tier_4_allowance) ?? 0
        const discount = pct(b.progressive_tier_4_overage_discount ?? 0.20)
        const overage = Math.max(0, retail - allowance)
        cost = baseCopay + overage * (1 - discount)
        note = `Tier 5 → Tier 4 fallback: $${baseCopay} copay + ${Math.round((1 - discount) * 100)}% overage`
        breakdown = { baseCopay, allowance, discount, overage }
      } else {
        cost = flat(b.progressive_tier_4) ?? retail
        note = 'Progressive Tier 5 → Tier 4 fallback'
        breakdown = { baseCopay: cost }
      }
      break
    }

    case 'material_poly':
      if (b.poly_free_under_18 && (b.patient_age ?? 99) < 18) {
        cost = 0
        note = 'Free — patient under 18'
      } else {
        cost = flat(b.material_poly) ?? retail
        note = 'Polycarbonate copay'
      }
      breakdown = { baseCopay: cost }
      break

    case 'material_hi':
      if (b.material_hi_type === 'discount') {
        const discountPct = pct(b.material_hi_pct ?? 0.20)
        cost = retail * (1 - discountPct)
        note = `${Math.round(discountPct * 100)}% off retail`
        breakdown = { discount: discountPct }
      } else {
        cost = flat(b.material_hi) ?? retail
        note = '1.67 HI copay'
        breakdown = { baseCopay: cost }
      }
      break

    case 'material_uhi':
      if (b.material_uhi_type === 'discount') {
        const discountPct = pct(b.material_uhi_pct ?? 0.20)
        cost = retail * (1 - discountPct)
        note = `${Math.round(discountPct * 100)}% off retail`
        breakdown = { discount: discountPct }
      } else {
        cost = flat(b.material_uhi) ?? retail
        note = '1.72 UHI copay'
        breakdown = { baseCopay: cost }
      }
      break

    case 'material_trivex':
      if (b.material_trivex_type === 'discount') {
        const discountPct = pct(b.material_trivex_pct ?? 0.20)
        cost = retail * (1 - discountPct)
        note = `${Math.round(discountPct * 100)}% off retail`
        breakdown = { discount: discountPct }
      } else {
        cost = flat(b.material_trivex) ?? retail
        note = 'Trivex copay'
        breakdown = { baseCopay: cost }
      }
      break

    case 'material_base':
      cost = 0
      note = 'Included — base material'
      break

    case 'ar_standard':
      cost = flat(b.ar_standard) ?? retail
      note = 'AR standard copay'
      breakdown = { baseCopay: cost }
      break

    case 'ar_tier_2': {
      if (b.ar_tier_2_type === 'discount') {
        const discountPct = pct(b.ar_tier_2_pct ?? 0.20)
        cost = retail * (1 - discountPct)
        note = `${Math.round(discountPct * 100)}% off retail`
        breakdown = { discount: discountPct }
      } else {
        const copay = flat(b.ar_tier_2) ?? flat(b.ar_standard) ?? retail
        cost = copay
        note = 'AR Tier 2 copay'
        breakdown = { baseCopay: cost }
      }
      // UV surcharge handled separately by static rules
      break
    }

    case 'ar_tier_3': {
      if (b.ar_tier_3_type === 'discount') {
        const discountPct = pct(b.ar_tier_3_pct ?? 0.20)
        cost = retail * (1 - discountPct)
        note = `${Math.round(discountPct * 100)}% off retail`
        breakdown = { discount: discountPct }
      } else {
        const copay = flat(b.ar_tier_3) ?? flat(b.ar_standard) ?? retail
        cost = copay
        note = 'AR Tier 3 copay'
        breakdown = { baseCopay: cost }
      }
      // UV surcharge handled separately by static rules
      break
    }

    case 'photochromic':
      cost = flat(b.photochromic) ?? retail
      note = 'Photochromic copay'
      breakdown = { baseCopay: cost }
      break

    case 'polarized':
      if (b.polarized_type === 'discount') {
        const discountPct = pct(b.polarized_pct ?? 0.20)
        cost = retail * (1 - discountPct)
        note = `${Math.round(discountPct * 100)}% off retail`
        breakdown = { discount: discountPct }
      } else {
        cost = flat(b.polarized) ?? retail
        note = 'Polarized copay'
        breakdown = { baseCopay: cost }
      }
      break

    case 'tint':
      cost = flat(b.tint) ?? retail
      note = 'Tint copay'
      breakdown = { baseCopay: cost }
      break

    case 'uv_coating':
      if (b.uv_included) {
        cost = 0
        note = 'Included with plan'
      } else {
        cost = flat(b.uv_coating) ?? retail
        note = 'UV coating fee'
      }
      breakdown = { baseCopay: cost }
      break

    case 'mount_included':
      cost = 0
      note = 'Included'
      break

    case 'mount_fee':
      cost = retail
      note = 'Mount fee — patient pays'
      break

    case 'lens_addon':
      if (b.addons_type === 'discount') {
        const discountPct = pct(b.addons_pct ?? 0.20)
        cost = retail * (1 - discountPct)
        note = `${Math.round(discountPct * 100)}% off retail`
        breakdown = { discount: discountPct }
      } else {
        cost = flat(b.addons_flat) ?? retail
        note = 'Lens add-on fee'
        breakdown = { baseCopay: cost }
      }
      break

    default:
      cost = retail
      note = 'See plan details'
  }

  // Round to 2 decimal places
  cost = Math.round(cost * 100) / 100

  return {
    product,
    patientCost: cost,
    note,
    breakdown
  }
}

/**
 * Calculate costs for all products
 */
export function calculateAllProducts(
  products: Product[],
  benefits: ExtractedBenefits
): PricingResult[] {
  return products.map(product => calculateProductCost(product, benefits))
}
