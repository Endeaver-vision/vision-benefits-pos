/**
 * VSP Product Mapping
 *
 * Maps our product catalog to VSP extraction fields for pricing calculation.
 *
 * FORMULA:
 * Patient Lens Copay = Progressive Tier Base + Material Upgrade + AR Coating + Photochromic + Auth Material Copay
 */

import type { VspMergedAuthorization } from '@/types/vsp-authorization'
import { LENS_TYPES, LENS_MATERIALS, AR_COATINGS, PHOTOCHROMICS, ADD_ONS, MOUNT_FEES, type Product } from './product-catalog'

// =============================================================================
// LENS TYPE → VSP PROGRESSIVE TIER MAPPING
// =============================================================================

export type VspProgressiveField = 'K_standard' | 'J_premium' | 'F_premium_adv' | 'O_custom' | 'N_custom' | 'SV' | 'BA_digital'

export const LENS_TYPE_TO_VSP_PROGRESSIVE: Record<string, VspProgressiveField> = {
  // Single Vision - no progressive copay
  'sv': 'SV',

  // Digital Aspheric SV (Eyezen) - uses BA code from enhancement form
  'eyezen': 'BA_digital',

  // Standard Progressive (K tier)
  'bifocal': 'K_standard',
  'trifocal': 'K_standard',

  // Premium Progressive (J tier) - Varilux Comfort DRx
  'comfortDRx': 'J_premium',

  // Premium Advanced Progressive (F tier) - Varilux Comfort Max
  'comfortMax': 'F_premium_adv',

  // Custom Progressive (O tier) - Varilux X series
  'variluxX': 'O_custom',

  // Non-Formulary - Cash only
  'neurolens_sv': 'SV',
  'neurolens_pal': 'SV', // Will be flagged as cash only
}

// =============================================================================
// LENS MATERIAL → VSP MATERIAL FIELD MAPPING
// =============================================================================

export type VspMaterialField =
  | 'polycarbonate_sv' | 'polycarbonate_multi' | 'polycarbonate_digital'
  | 'trivex_sv' | 'trivex_multi'
  | 'hi_index_167_sv' | 'hi_index_167_multi' | 'hi_index_167_digital'
  | 'hi_index_174_sv' | 'hi_index_174_multi' | 'hi_index_174_digital'
  | 'base' // CR-39, no upgrade cost

export interface MaterialMapping {
  svField: VspMaterialField
  multiField: VspMaterialField
  digitalField?: VspMaterialField  // For Eyezen/digital lenses
}

export const LENS_MATERIAL_TO_VSP: Record<string, MaterialMapping> = {
  'cr39': {
    svField: 'base',
    multiField: 'base',
    digitalField: 'base',
  },
  'poly': {
    svField: 'polycarbonate_sv',
    multiField: 'polycarbonate_multi',
    digitalField: 'polycarbonate_digital',
  },
  'trivex': {
    svField: 'trivex_sv',
    multiField: 'trivex_multi',
    // No digital trivex - falls back to SV
  },
  'hiIndex167': {
    svField: 'hi_index_167_sv',
    multiField: 'hi_index_167_multi',
    digitalField: 'hi_index_167_digital',
  },
  'ultraHi172': {
    svField: 'hi_index_174_sv',  // Map 1.72 to 1.74 field
    multiField: 'hi_index_174_multi',
    digitalField: 'hi_index_174_digital',
  },
}

// =============================================================================
// AR COATING → VSP AR FIELD MAPPING
// =============================================================================

export type VspArField = 'QM_standard' | 'QT_premium_1' | 'QV_premium_2' | 'none'

export const AR_COATING_TO_VSP: Record<string, VspArField> = {
  'none': 'none',
  'crizalEZPro': 'QT_premium_1',      // Mid-tier → QT
  'crizalRock': 'QV_premium_2',       // Premium → QV
  'crizalSapphire': 'QV_premium_2',   // Premium → QV
  'crizalSunShield': 'QT_premium_1',  // Mid-tier → QT
  'neurolens_premium': 'none',        // Cash only
  'neurolens_blue': 'none',           // Cash only
}

// =============================================================================
// PHOTOCHROMIC → VSP FIELD MAPPING
// =============================================================================

export type VspPhotochromicField = 'PR_plastic' | 'PM_glass' | 'none'

export const PHOTOCHROMIC_TO_VSP: Record<string, VspPhotochromicField> = {
  'none': 'none',
  'genS': 'PR_plastic',
  'xtraActive': 'PR_plastic',
}

// =============================================================================
// ADD-ONS → VSP FIELD MAPPING
// =============================================================================

export type VspAddOnField =
  | 'DA_sv' | 'DA_multi'  // Polarized
  | 'MN_plastic_sv' | 'MN_plastic_multi'  // Tint
  | 'LF_light_filter'  // Blue Light
  | 'SP_edge_polish'   // Edge Polish
  | 'SW_rimless'       // Rimless Drill
  | 'QP_mirror'        // Mirror Solid
  | 'SV_uv'            // UV Protection
  | 'RM_oversize'      // Oversize Plastic
  | 'none'

export interface AddOnMapping {
  svField: VspAddOnField
  multiField: VspAddOnField
}

export const ADD_ON_TO_VSP: Record<string, AddOnMapping> = {
  'uv': {
    svField: 'SV_uv',
    multiField: 'SV_uv',
  },
  'tint': {
    svField: 'MN_plastic_sv',
    multiField: 'MN_plastic_multi',
  },
  'polarized': {
    svField: 'DA_sv',
    multiField: 'DA_multi',
  },
  'essBlue': {
    svField: 'LF_light_filter',
    multiField: 'LF_light_filter',
  },
  'rollPolish': {
    svField: 'SP_edge_polish',
    multiField: 'SP_edge_polish',
  },
  'mirror': {
    svField: 'QP_mirror',
    multiField: 'QP_mirror',
  },
  'oversize': {
    svField: 'RM_oversize',
    multiField: 'RM_oversize',
  },
}

// =============================================================================
// MOUNT FEES → VSP FIELD MAPPING
// =============================================================================

export const MOUNT_FEE_TO_VSP: Record<string, VspAddOnField> = {
  'fullRim': 'none',
  'semiRimless': 'SP_edge_polish',
  'rimless': 'SW_rimless',
}

// =============================================================================
// PRICING CALCULATOR
// =============================================================================

export interface VspPricingResult {
  productId: string
  productName: string
  category: string
  retail: number

  // Copay breakdown
  progressiveCopay: number
  materialCopay: number
  arCopay: number
  photochromicCopay: number
  addOnCopay: number
  authMaterialCopay: number

  // Final calculation
  totalCopay: number
  patientCost: number

  // Flags
  isCashOnly: boolean
  isNotCovered: boolean
  notes: string[]
}

export interface VspPricingInput {
  lensTypeId: string
  materialId: string
  arCoatingId: string
  photochromicId: string
  addOnIds: string[]
  mountFeeId: string
}

/**
 * Calculate patient cost for a product combination using VSP benefits
 */
export function calculateVspPricing(
  input: VspPricingInput,
  auth: VspMergedAuthorization
): VspPricingResult {
  const notes: string[] = []
  let isCashOnly = false
  let isNotCovered = false

  // Get products
  const lensType = LENS_TYPES.find(p => p.id === input.lensTypeId)
  const material = LENS_MATERIALS.find(p => p.id === input.materialId)
  const arCoating = AR_COATINGS.find(p => p.id === input.arCoatingId)
  const photochromic = PHOTOCHROMICS.find(p => p.id === input.photochromicId)
  const addOns = input.addOnIds.map(id => ADD_ONS.find(p => p.id === id)).filter(Boolean) as Product[]
  const mountFee = MOUNT_FEES.find(p => p.id === input.mountFeeId)

  if (!lensType || !material) {
    throw new Error('Lens type and material are required')
  }

  // Check for cash only products
  if (lensType.cashOnly) {
    isCashOnly = true
    notes.push(`${lensType.name} is cash only`)
  }
  if (arCoating?.cashOnly) {
    isCashOnly = true
    notes.push(`${arCoating.name} is cash only`)
  }

  // Determine if this is SV or multifocal
  // Eyezen is a Digital Aspheric SV lens - uses SV material copays
  const isSingleVision = input.lensTypeId === 'sv' || input.lensTypeId === 'neurolens_sv' || input.lensTypeId === 'eyezen'

  // ========== LENS TYPE COPAY ==========
  // ALWAYS use enhancement form values - they are the source of truth
  // EasyOptions coverage is already reflected in the enhancement form copays
  let progressiveCopay = 0
  const progressiveField = LENS_TYPE_TO_VSP_PROGRESSIVE[input.lensTypeId]

  // Digital Aspheric (Eyezen) - uses BA enhancement code, NOT progressive tier
  if (progressiveField === 'BA_digital') {
    progressiveCopay = auth.enhancements.BA ?? 0
  } else if (!isSingleVision && progressiveField && progressiveField !== 'SV') {
    // Regular progressives use progressive tier copays
    const progressiveTierMap: Record<string, 'K' | 'J' | 'F' | 'O' | 'N'> = {
      'K_standard': 'K',
      'J_premium': 'J',
      'F_premium_adv': 'F',
      'O_custom': 'O',
      'N_custom': 'N',
    }
    const tier = progressiveTierMap[progressiveField]
    if (tier) {
      progressiveCopay = getProgressiveValue(auth, tier)
    }
  }

  // ========== MATERIAL COPAY ==========
  let materialCopay = 0
  const materialMapping = LENS_MATERIAL_TO_VSP[input.materialId]
  const isDigitalLens = input.lensTypeId === 'eyezen'
  if (materialMapping && materialMapping.svField !== 'base') {
    // Digital lenses (Eyezen) use digital material copays if available
    let fieldKey: VspMaterialField
    if (isDigitalLens && materialMapping.digitalField) {
      fieldKey = materialMapping.digitalField
    } else if (isSingleVision) {
      fieldKey = materialMapping.svField
    } else {
      fieldKey = materialMapping.multiField
    }
    materialCopay = getMaterialValue(auth, fieldKey) ?? 0
  }

  // ========== AR COATING COPAY ==========
  // ALWAYS use enhancement form values - they are the source of truth
  let arCopay = 0
  const arField = AR_COATING_TO_VSP[input.arCoatingId]
  if (arField && arField !== 'none') {
    arCopay = getArValue(auth, arField) ?? 0
  }

  // ========== PHOTOCHROMIC COPAY ==========
  // ALWAYS use enhancement form values - they are the source of truth
  let photochromicCopay = 0
  const photoField = PHOTOCHROMIC_TO_VSP[input.photochromicId]
  if (photoField && photoField !== 'none') {
    // Check Computer VisionCare restriction
    if (auth.flags.isComputerVisioncare && auth.coverageStatus.photochromicsNotCovered) {
      isNotCovered = true
      notes.push('Photochromics NOT COVERED (Computer VisionCare)')
      photochromicCopay = photochromic?.retail ?? 0 // Full retail
    } else {
      photochromicCopay = auth.enhancements.PR ?? 0
    }
  }

  // ========== ADD-ON COPAYS ==========
  let addOnCopay = 0
  for (const addOn of addOns) {
    const addOnMapping = ADD_ON_TO_VSP[addOn.id]
    if (addOnMapping) {
      const fieldKey = isSingleVision ? addOnMapping.svField : addOnMapping.multiField

      // Check polarized restriction for Computer VisionCare
      if (addOn.id === 'polarized' && auth.flags.isComputerVisioncare && auth.coverageStatus.polarizedNotCovered) {
        isNotCovered = true
        notes.push('Polarized NOT COVERED (Computer VisionCare)')
        addOnCopay += addOn.retail // Full retail
        continue
      }

      const copay = getAddOnValue(auth, fieldKey, isSingleVision)
      addOnCopay += copay ?? 0
    }
  }

  // ========== MOUNT FEE ==========
  if (mountFee && mountFee.id !== 'fullRim') {
    const mountField = MOUNT_FEE_TO_VSP[mountFee.id]
    if (mountField && mountField !== 'none') {
      const copay = getAddOnValue(auth, mountField, isSingleVision)
      addOnCopay += copay ?? 0
    }
  }

  // ========== AUTH MATERIAL COPAY ==========
  const authMaterialCopay = auth.copays.material ?? 0

  // ========== CALCULATE TOTALS ==========
  const totalCopay = progressiveCopay + materialCopay + arCopay + photochromicCopay + addOnCopay + authMaterialCopay

  // Calculate retail total
  const retail = (lensType?.retail ?? 0) +
                 (material?.retail ?? 0) +
                 (arCoating?.retail ?? 0) +
                 (photochromic?.retail ?? 0) +
                 addOns.reduce((sum, a) => sum + (a.retail ?? 0), 0) +
                 (mountFee?.retail ?? 0)

  // Patient cost = total copay (if using insurance) or retail (if cash only)
  const patientCost = isCashOnly ? retail : totalCopay

  return {
    productId: `${input.lensTypeId}-${input.materialId}-${input.arCoatingId}`,
    productName: [lensType?.name, material?.name, arCoating?.name, photochromic?.name]
      .filter(Boolean)
      .join(' + '),
    category: 'lens_package',
    retail,
    progressiveCopay,
    materialCopay,
    arCopay,
    photochromicCopay,
    addOnCopay,
    authMaterialCopay,
    totalCopay,
    patientCost,
    isCashOnly,
    isNotCovered,
    notes,
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get progressive tier base copay from the progressives section
 * K tier = Standard (usually $0)
 * J tier = Premium (Comfort DRx)
 * F tier = Premium Advanced (Comfort Max)
 * O tier = Custom
 * N tier = Custom (Varilux X)
 */
function getProgressiveValue(auth: VspMergedAuthorization, tier: 'K' | 'J' | 'F' | 'O' | 'N'): number {
  // Use the dedicated progressives section, not lens_matrix
  const progressiveMap: Record<string, number> = {
    'K': auth.progressives.K_standard ?? 0,
    'J': auth.progressives.J_premium ?? 0,
    'F': auth.progressives.F_premium_adv ?? 0,
    'O': auth.progressives.O_custom ?? 0,
    'N': auth.progressives.N_custom ?? 0,
  }
  return progressiveMap[tier] ?? 0
}

/**
 * Get material upgrade copay from lens_matrix (single source of truth)
 *
 * lens_matrix structure:
 * - SV_poly, SV_trivex, SV_hi167, SV_hi174 (Single Vision materials)
 * - KD, KB, KH, KJ (Progressive material upgrades - same across all tiers)
 *
 * For SV: use SV_* values directly
 * For Multi: use K* values (material upgrade only, add to progressive base)
 */
function getMaterialValue(auth: VspMergedAuthorization, field: VspMaterialField): number {
  if (field === 'base') return 0

  // Map material fields to lens_matrix keys or materials section
  const materialMap: Record<VspMaterialField, number> = {
    'base': 0,
    // Single Vision - use SV_* values from lens_matrix
    'polycarbonate_sv': auth.lensMatrix.SV_poly ?? 0,
    'trivex_sv': auth.lensMatrix.SV_trivex ?? 0,
    'hi_index_167_sv': auth.lensMatrix.SV_hi167 ?? 0,
    'hi_index_174_sv': auth.lensMatrix.SV_hi174 ?? 0,
    // Multifocal - use K* values (same across all progressive tiers)
    'polycarbonate_multi': auth.lensMatrix.KD ?? 0,
    'trivex_multi': auth.lensMatrix.KB ?? 0,
    'hi_index_167_multi': auth.lensMatrix.KH ?? 0,
    'hi_index_174_multi': auth.lensMatrix.KJ ?? 0,
    // Digital (Eyezen) - use dedicated digital material copays
    'polycarbonate_digital': auth.materials.polycarbonate_digital ?? 0,
    'hi_index_167_digital': auth.materials.hi_index_167_digital ?? 0,
    'hi_index_174_digital': auth.materials.hi_index_174_digital ?? 0,
  }

  return materialMap[field] ?? 0
}

/**
 * Get AR coating copay from extraction
 */
function getArValue(auth: VspMergedAuthorization, field: VspArField): number {
  const arMap: Record<VspArField, number> = {
    'none': 0,
    'QM_standard': auth.arCoatings.QM ?? 0,
    'QT_premium_1': auth.arCoatings.QT ?? 0,
    'QV_premium_2': auth.arCoatings.QV ?? 0,
  }
  return arMap[field] ?? 0
}

/**
 * Get add-on copay from extraction
 * NEVER return 0 unless the enhancement form explicitly shows $0
 */
function getAddOnValue(auth: VspMergedAuthorization, field: VspAddOnField, isSv: boolean): number {
  const addOnMap: Record<VspAddOnField, number> = {
    'none': 0,
    'DA_sv': auth.enhancements.DA ?? 0,
    'DA_multi': auth.enhancements.DA ?? 0,
    'MN_plastic_sv': auth.enhancements.MN ?? 0,
    'MN_plastic_multi': auth.enhancements.MN ?? 0,
    'LF_light_filter': auth.enhancements.LF ?? 0,
    'SP_edge_polish': auth.enhancements.SP ?? 0,
    'SW_rimless': auth.enhancements.SW ?? 0,
    'QP_mirror': auth.enhancements.QP ?? 0,
    'SV_uv': auth.enhancements.SV ?? 0,
    'RM_oversize': auth.enhancements.RM ?? 0,
  }
  return addOnMap[field] ?? 0
}

// =============================================================================
// GENERATE FULL PRICE LIST
// =============================================================================

export interface VspPriceListItem {
  section: string
  productId: string
  productName: string
  retail: number
  copay: number
  patientCost: number
  // For items with SV/Multi variance
  svCopay?: number
  multiCopay?: number
  hasVariance?: boolean
  notes: string[]
  isCashOnly: boolean
  isNotCovered: boolean
}

/**
 * Generate a complete price list for all products using VSP benefits
 */
export function generateVspPriceList(auth: VspMergedAuthorization): VspPriceListItem[] {
  const priceList: VspPriceListItem[] = []

  // Common material for examples
  const defaultMaterial = 'poly'
  const defaultAr = 'crizalSapphire'

  // ========== LENS TYPES ==========
  for (const lens of LENS_TYPES) {
    if (lens.cashOnly) {
      priceList.push({
        section: 'LENS TYPES',
        productId: lens.id,
        productName: lens.name,
        retail: lens.retail,
        copay: 0,
        patientCost: lens.retail,
        notes: ['Cash only - not covered by VSP'],
        isCashOnly: true,
        isNotCovered: false,
      })
      continue
    }

    const result = calculateVspPricing({
      lensTypeId: lens.id,
      materialId: 'cr39', // Base material for lens type comparison
      arCoatingId: 'none',
      photochromicId: 'none',
      addOnIds: [],
      mountFeeId: 'fullRim',
    }, auth)

    priceList.push({
      section: 'LENS TYPES',
      productId: lens.id,
      productName: lens.name,
      retail: lens.retail,
      copay: result.progressiveCopay + result.authMaterialCopay,
      patientCost: result.patientCost,
      notes: result.notes,
      isCashOnly: result.isCashOnly,
      isNotCovered: result.isNotCovered,
    })
  }

  // ========== MATERIALS (with SV/Multi variance) ==========
  for (const material of LENS_MATERIALS) {
    if (material.id === 'cr39') continue // Skip base material

    // Calculate SV copay
    const svResult = calculateVspPricing({
      lensTypeId: 'sv',
      materialId: material.id,
      arCoatingId: 'none',
      photochromicId: 'none',
      addOnIds: [],
      mountFeeId: 'fullRim',
    }, auth)

    // Calculate Multi copay (use K tier as reference since material upgrades are same across tiers)
    const multiResult = calculateVspPricing({
      lensTypeId: 'bifocal', // K tier progressive
      materialId: material.id,
      arCoatingId: 'none',
      photochromicId: 'none',
      addOnIds: [],
      mountFeeId: 'fullRim',
    }, auth)

    const svCopay = svResult.materialCopay
    const multiCopay = multiResult.materialCopay
    const hasVariance = svCopay !== multiCopay

    priceList.push({
      section: 'MATERIALS',
      productId: material.id,
      productName: material.name,
      retail: material.retail,
      copay: svCopay, // Default to SV for backwards compatibility
      patientCost: svCopay,
      svCopay,
      multiCopay,
      hasVariance,
      notes: material.freeUnder18 ? ['FREE under 18'] : [],
      isCashOnly: false,
      isNotCovered: false,
    })
  }

  // ========== AR COATINGS ==========
  for (const ar of AR_COATINGS) {
    if (ar.id === 'none') continue

    if (ar.cashOnly) {
      priceList.push({
        section: 'AR COATINGS',
        productId: ar.id,
        productName: ar.name,
        retail: ar.retail,
        copay: 0,
        patientCost: ar.retail,
        notes: ['Cash only'],
        isCashOnly: true,
        isNotCovered: false,
      })
      continue
    }

    const result = calculateVspPricing({
      lensTypeId: 'sv',
      materialId: 'cr39',
      arCoatingId: ar.id,
      photochromicId: 'none',
      addOnIds: [],
      mountFeeId: 'fullRim',
    }, auth)

    priceList.push({
      section: 'AR COATINGS',
      productId: ar.id,
      productName: ar.name,
      retail: ar.retail,
      copay: result.arCopay,
      patientCost: result.arCopay,
      notes: result.notes,
      isCashOnly: false,
      isNotCovered: false,
    })
  }

  // ========== PHOTOCHROMICS ==========
  for (const photo of PHOTOCHROMICS) {
    if (photo.id === 'none') continue

    const result = calculateVspPricing({
      lensTypeId: 'sv',
      materialId: 'cr39',
      arCoatingId: 'none',
      photochromicId: photo.id,
      addOnIds: [],
      mountFeeId: 'fullRim',
    }, auth)

    priceList.push({
      section: 'PHOTOCHROMICS',
      productId: photo.id,
      productName: photo.name,
      retail: photo.retail,
      copay: result.photochromicCopay,
      patientCost: result.photochromicCopay,
      notes: result.notes,
      isCashOnly: result.isCashOnly,
      isNotCovered: result.isNotCovered,
    })
  }

  // ========== ADD-ONS (some have SV/Multi variance) ==========
  // Items that can vary: tint, polarized
  const addOnsWithVariance = ['tint', 'polarized']

  for (const addOn of ADD_ONS) {
    const svResult = calculateVspPricing({
      lensTypeId: 'sv',
      materialId: 'cr39',
      arCoatingId: 'none',
      photochromicId: 'none',
      addOnIds: [addOn.id],
      mountFeeId: 'fullRim',
    }, auth)

    // Check for variance on items that can differ
    let svCopay: number | undefined
    let multiCopay: number | undefined
    let hasVariance = false

    if (addOnsWithVariance.includes(addOn.id)) {
      const multiResult = calculateVspPricing({
        lensTypeId: 'bifocal', // K tier progressive
        materialId: 'cr39',
        arCoatingId: 'none',
        photochromicId: 'none',
        addOnIds: [addOn.id],
        mountFeeId: 'fullRim',
      }, auth)

      svCopay = svResult.addOnCopay
      multiCopay = multiResult.addOnCopay
      hasVariance = svCopay !== multiCopay
    }

    priceList.push({
      section: 'ADD-ONS',
      productId: addOn.id,
      productName: addOn.name,
      retail: addOn.retail,
      copay: svResult.addOnCopay,
      patientCost: svResult.addOnCopay,
      svCopay,
      multiCopay,
      hasVariance,
      notes: svResult.notes,
      isCashOnly: svResult.isCashOnly,
      isNotCovered: svResult.isNotCovered,
    })
  }

  // ========== MOUNT FEES ==========
  for (const mount of MOUNT_FEES) {
    if (mount.id === 'fullRim') continue

    const result = calculateVspPricing({
      lensTypeId: 'sv',
      materialId: 'cr39',
      arCoatingId: 'none',
      photochromicId: 'none',
      addOnIds: [],
      mountFeeId: mount.id,
    }, auth)

    priceList.push({
      section: 'MOUNT FEES',
      productId: mount.id,
      productName: mount.name,
      retail: mount.retail,
      copay: result.addOnCopay,
      patientCost: result.addOnCopay,
      notes: [],
      isCashOnly: false,
      isNotCovered: false,
    })
  }

  return priceList
}
