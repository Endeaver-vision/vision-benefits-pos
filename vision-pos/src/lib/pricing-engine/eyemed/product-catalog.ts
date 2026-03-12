/**
 * EyeMed Product Catalog
 * Master price list with product types for pricing calculation
 */

import { Product } from './types'

export const EYEMED_PRODUCTS: Product[] = [
  // ─── EXAM SERVICES ─────────────────────────────────────────────────────────
  { category: 'EXAM SERVICES', name: 'Routine Vision Exam', retail: 100, type: 'exam' },
  { category: 'EXAM SERVICES', name: 'Medical Exam', retail: 100, type: 'medical_billing' },

  // ─── EXAM ADD-ONS ──────────────────────────────────────────────────────────
  { category: 'EXAM ADD-ONS', name: 'Optomap', retail: 39, type: 'retinal_imaging' },
  { category: 'EXAM ADD-ONS', name: 'iWellness', retail: 19, type: 'cash_only' },
  { category: 'EXAM ADD-ONS', name: 'OCT Retina/ON', retail: 39, type: 'medical_billing' },
  { category: 'EXAM ADD-ONS', name: 'Visual Field', retail: 39, type: 'medical_billing' },
  { category: 'EXAM ADD-ONS', name: 'External Photos', retail: 29, type: 'medical_billing' },
  { category: 'EXAM ADD-ONS', name: 'Neuro HA Screen', retail: 89, type: 'cash_only' },
  { category: 'EXAM ADD-ONS', name: 'Corneal Thickness', retail: 29, type: 'medical_billing' },
  { category: 'EXAM ADD-ONS', name: 'Myopia Atropine Exam Consult & Follow Up', retail: 350, type: 'cash_only' },

  // ─── CONTACT LENS FITTING ──────────────────────────────────────────────────
  { category: 'CONTACT LENS FITTING', name: 'Sphere', retail: 75, type: 'cl_fit_standard' },
  { category: 'CONTACT LENS FITTING', name: 'Toric', retail: 100, type: 'cl_fit_standard' },
  { category: 'CONTACT LENS FITTING', name: 'Multifocal Soft Lens', retail: 150, type: 'cl_fit_premium' },
  { category: 'CONTACT LENS FITTING', name: 'Monovision', retail: 120, type: 'cl_fit_standard' },
  { category: 'CONTACT LENS FITTING', name: 'RGP', retail: 350, type: 'cl_fit_specialty' },
  { category: 'CONTACT LENS FITTING', name: 'Specialty CL', retail: 850, type: 'cl_fit_specialty' },
  { category: 'CONTACT LENS FITTING', name: 'Ortho-K', retail: 2200, type: 'cl_fit_specialty' },
  { category: 'CONTACT LENS FITTING', name: 'MiSight Fitting', retail: 1250, type: 'cl_fit_specialty' },

  // ─── LENS TYPE ─────────────────────────────────────────────────────────────
  { category: 'LENS TYPE', name: 'Neurolens SV', retail: 400, type: 'cash_only' },
  { category: 'LENS TYPE', name: 'Neurolens Progressive', retail: 700, type: 'cash_only' },
  { category: 'LENS TYPE', name: 'Eyezen', retail: 144, type: 'lens_sv_premium' },
  { category: 'LENS TYPE', name: 'FT Bifocal', retail: 182, type: 'lens_bifocal' },
  { category: 'LENS TYPE', name: 'FT Trifocal', retail: 155, type: 'lens_trifocal' },
  { category: 'LENS TYPE', name: 'Single Vision', retail: 96, type: 'lens_sv' },
  { category: 'LENS TYPE', name: 'Varilux Comfort DRx', retail: 280, type: 'progressive_tier_3' },
  { category: 'LENS TYPE', name: 'Varilux Comfort Max', retail: 409, type: 'progressive_tier_4' },
  { category: 'LENS TYPE', name: 'Varilux i', retail: 480, type: 'cash_only' },
  { category: 'LENS TYPE', name: 'Varilux X', retail: 615, type: 'progressive_tier_4' },
  { category: 'LENS TYPE', name: 'Stellest', retail: 500, type: 'progressive_tier_4' },
  { category: 'LENS TYPE', name: 'Sequel Single Vision', retail: 350, type: 'cash_only' },
  { category: 'LENS TYPE', name: 'Sequel Progressive', retail: 536, type: 'cash_only' },

  // ─── LENS MATERIAL ─────────────────────────────────────────────────────────
  { category: 'LENS MATERIAL', name: 'Polycarbonate', retail: 65, type: 'material_poly' },
  { category: 'LENS MATERIAL', name: '1.67 High Index', retail: 130, type: 'material_hi' },
  { category: 'LENS MATERIAL', name: '1.72 Ultra High Index', retail: 150, type: 'material_uhi' },
  { category: 'LENS MATERIAL', name: 'Trivex', retail: 75, type: 'material_trivex' },
  { category: 'LENS MATERIAL', name: 'CR-39 (base)', retail: 0, type: 'material_base' },

  // ─── AR COATINGS ───────────────────────────────────────────────────────────
  { category: 'AR COATINGS', name: 'Neurolens Premium AR', retail: 180, type: 'cash_only' },
  { category: 'AR COATINGS', name: 'Neurolens Blue AR', retail: 180, type: 'cash_only' },
  {
    category: 'AR COATINGS',
    name: 'Crizal Sapphire',
    retail: 187,
    type: 'ar_tier_3',
    backsideUvSurcharge: true  // Requires $15 UV surcharge
  },
  {
    category: 'AR COATINGS',
    name: 'Crizal Rock',
    retail: 158,
    type: 'ar_tier_3',
    backsideUvSurcharge: true  // Requires $15 UV surcharge
  },
  {
    category: 'AR COATINGS',
    name: 'Crizal EZ Pro',
    retail: 148,
    type: 'ar_tier_2',
    backsideUvSurcharge: true  // Requires $15 UV surcharge
  },
  {
    category: 'AR COATINGS',
    name: 'Crizal SunShield',
    retail: 180,
    type: 'ar_tier_2',
    backsideUvSurcharge: true  // Requires $15 UV surcharge
  },

  // ─── TRANSITIONS ───────────────────────────────────────────────────────────
  { category: 'TRANSITIONS', name: 'Transitions Gen S', retail: 160, type: 'photochromic' },
  { category: 'TRANSITIONS', name: 'Transitions XtraActive', retail: 160, type: 'photochromic' },

  // ─── POLARIZED ─────────────────────────────────────────────────────────────
  { category: 'POLARIZED', name: 'Polarized', retail: 180, type: 'polarized' },

  // ─── MOUNT FEE ─────────────────────────────────────────────────────────────
  { category: 'MOUNT FEE', name: 'Full Rim', retail: 0, type: 'mount_included' },
  { category: 'MOUNT FEE', name: 'Semi-Rimless', retail: 35, type: 'mount_fee' },
  { category: 'MOUNT FEE', name: 'Rimless', retail: 45, type: 'mount_fee' },

  // ─── LENS ADD-ONS ──────────────────────────────────────────────────────────
  { category: 'LENS ADD-ONS', name: 'UV Coating', retail: 16, type: 'uv_coating' },
  { category: 'LENS ADD-ONS', name: 'Mirror', retail: 55, type: 'lens_addon' },
  { category: 'LENS ADD-ONS', name: 'Tint', retail: 30, type: 'tint' },
  { category: 'LENS ADD-ONS', name: 'Oversize Lenses (61mm+)', retail: 30, type: 'lens_addon' },
  { category: 'LENS ADD-ONS', name: 'Tech Add-on Single Vision', retail: 10, type: 'lens_addon' },
  { category: 'LENS ADD-ONS', name: 'Tech Add-on Multifocal', retail: 40, type: 'lens_addon' },
  { category: 'LENS ADD-ONS', name: 'Prism Per Diopter', retail: 15, type: 'lens_addon' },
  { category: 'LENS ADD-ONS', name: 'Essential Blue', retail: 40, type: 'lens_addon' },
  { category: 'LENS ADD-ONS', name: 'Roll and Polish', retail: 30, type: 'lens_addon' },
]

// Get products by category
export function getProductsByCategory(category: string): Product[] {
  return EYEMED_PRODUCTS.filter(p => p.category === category)
}

// Get all unique categories
export function getCategories(): string[] {
  return [...new Set(EYEMED_PRODUCTS.map(p => p.category))]
}

// Find product by name
export function findProduct(name: string): Product | undefined {
  return EYEMED_PRODUCTS.find(p => p.name.toLowerCase() === name.toLowerCase())
}
