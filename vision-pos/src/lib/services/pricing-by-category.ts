/**
 * Pricing by Category Service
 *
 * Uses the pricingCategory field on products/services to determine
 * how to calculate patient costs based on authorization data.
 *
 * This replaces the old string-matching approach with deterministic
 * category-based pricing.
 */

import { BenefitAuthorization } from '@/types/benefit-authorization'

// Type guards to check carrier-specific authorization
function isVspAuth(auth: BenefitAuthorization): auth is BenefitAuthorization & { plan: { carrier: 'vsp' } } {
  return auth.plan.carrier === 'vsp'
}

function isEyemedAuth(auth: BenefitAuthorization): auth is BenefitAuthorization & { plan: { carrier: 'eyemed' } } {
  return auth.plan.carrier === 'eyemed'
}

function isSpecteraAuth(auth: BenefitAuthorization): auth is BenefitAuthorization & { plan: { carrier: 'spectera' } } {
  return auth.plan.carrier === 'spectera'
}

export interface PricingResult {
  patientPays: number
  insurancePays: number
  notes?: string
}

/**
 * Calculate service pricing based on pricingCategory
 */
export function calculateServicePricingByCategory(
  pricingCategory: string | null,
  retailPrice: number,
  authorization: BenefitAuthorization | null
): PricingResult {
  // No authorization = patient pays full retail
  if (!authorization) {
    return { patientPays: retailPrice, insurancePays: 0 }
  }

  // No pricing category = patient pays retail (uncategorized)
  if (!pricingCategory) {
    return { patientPays: retailPrice, insurancePays: 0, notes: 'Uncategorized service' }
  }

  switch (pricingCategory) {
    // =========================================================================
    // VISION EXAM - Use exam copay from authorization
    // =========================================================================
    case 'VISION_EXAM': {
      const examCopay = getExamCopay(authorization)
      if (examCopay !== null) {
        return {
          patientPays: examCopay,
          insurancePays: retailPrice - examCopay,
          notes: 'Vision exam covered'
        }
      }
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Exam copay not found' }
    }

    // =========================================================================
    // CONTACT LENS FITTING - Check CL fitting coverage
    // =========================================================================
    case 'CL_FIT_STANDARD': {
      const clFitResult = getCLFitStandardCopay(authorization, retailPrice)
      return clFitResult
    }

    case 'CL_FIT_PREMIUM': {
      const clFitResult = getCLFitPremiumCopay(authorization, retailPrice)
      return clFitResult
    }

    case 'CL_FIT_SPECIALTY':
    case 'CL_FIT_MYOPIA_MGMT': {
      // Specialty and myopia management fittings are typically not covered
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Specialty fitting - not covered' }
    }

    // =========================================================================
    // DIAGNOSTIC / MEDICAL - Patient pays retail (vision insurance doesn't cover)
    // =========================================================================
    case 'DIAGNOSTIC_ADDON':
    case 'MEDICAL_EXAM':
    case 'MEDICAL_OFFICE_VISIT':
    case 'MEDICAL_DIAGNOSTIC':
    case 'MEDICAL_PROCEDURE':
    case 'COMANAGEMENT':
    case 'OPTICIAN_SERVICE': {
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Not covered by vision insurance' }
    }

    // =========================================================================
    // DEFAULT - Unknown category, patient pays retail
    // =========================================================================
    default:
      return { patientPays: retailPrice, insurancePays: 0, notes: `Unknown category: ${pricingCategory}` }
  }
}

/**
 * Get exam copay from authorization (handles VSP/EyeMed/Spectera differences)
 */
function getExamCopay(auth: BenefitAuthorization): number | null {
  if (isVspAuth(auth)) {
    // VSP uses examWellvision
    return (auth.copays as any).examWellvision ?? null
  }

  if (isEyemedAuth(auth)) {
    // EyeMed uses exam
    return (auth.copays as any).exam ?? null
  }

  if (isSpecteraAuth(auth)) {
    // Spectera uses examAdult (or examPediatric for children)
    return (auth.copays as any).examAdult ?? null
  }

  return null
}

/**
 * Get standard CL fitting copay/coverage
 */
function getCLFitStandardCopay(auth: BenefitAuthorization, retailPrice: number): PricingResult {
  if (isVspAuth(auth)) {
    // VSP: Check if CL fitting is covered
    const copays = auth.copays as any
    if (copays.contactFittingCovered === true) {
      return { patientPays: 0, insurancePays: retailPrice, notes: 'CL fitting covered' }
    }
    // If not explicitly covered, patient pays retail
    return { patientPays: retailPrice, insurancePays: 0, notes: 'CL fitting not covered' }
  }

  if (isEyemedAuth(auth)) {
    // EyeMed: Check clFitStandardCopay
    const copays = auth.copays as any
    if (copays.clFitEligible === false) {
      return { patientPays: retailPrice, insurancePays: 0, notes: 'CL fitting not eligible' }
    }
    if (copays.clFitStandardCopay === 'covered' || copays.clFitStandardCopay === 0) {
      return { patientPays: 0, insurancePays: retailPrice, notes: 'CL fitting covered' }
    }
    if (typeof copays.clFitStandardCopay === 'number') {
      return {
        patientPays: copays.clFitStandardCopay,
        insurancePays: retailPrice - copays.clFitStandardCopay,
        notes: 'CL fitting with copay'
      }
    }
    return { patientPays: retailPrice, insurancePays: 0, notes: 'CL fitting copay unknown' }
  }

  if (isSpecteraAuth(auth)) {
    // Spectera: Check examContactFitSelection
    const copays = auth.copays as any
    if (copays.examContactFitSelection === 'covered' || copays.examContactFitSelection === 0) {
      return { patientPays: 0, insurancePays: retailPrice, notes: 'CL fitting covered' }
    }
    if (typeof copays.examContactFitSelection === 'number') {
      return {
        patientPays: copays.examContactFitSelection,
        insurancePays: retailPrice - copays.examContactFitSelection,
        notes: 'CL fitting with copay'
      }
    }
    return { patientPays: retailPrice, insurancePays: 0, notes: 'CL fitting copay unknown' }
  }

  return { patientPays: retailPrice, insurancePays: 0 }
}

/**
 * Get premium CL fitting copay
 */
function getCLFitPremiumCopay(auth: BenefitAuthorization, retailPrice: number): PricingResult {
  if (isEyemedAuth(auth)) {
    const copays = auth.copays as any
    if (copays.clFitPremiumCopay === 'covered' || copays.clFitPremiumCopay === 0) {
      return { patientPays: 0, insurancePays: retailPrice, notes: 'Premium CL fitting covered' }
    }
    if (typeof copays.clFitPremiumCopay === 'number') {
      return {
        patientPays: copays.clFitPremiumCopay,
        insurancePays: retailPrice - copays.clFitPremiumCopay,
        notes: 'Premium CL fitting with copay'
      }
    }
  }

  // VSP and Spectera typically don't have premium CL fit coverage
  return { patientPays: retailPrice, insurancePays: 0, notes: 'Premium CL fitting - patient pays' }
}

/**
 * Calculate frame pricing based on allowance
 */
export function calculateFramePricing(
  retailPrice: number,
  authorization: BenefitAuthorization | null
): PricingResult {
  if (!authorization) {
    return { patientPays: retailPrice, insurancePays: 0 }
  }

  const frameAllowance = getFrameAllowance(authorization)
  const overageDiscount = getFrameOverageDiscount(authorization)

  if (frameAllowance === null) {
    return { patientPays: retailPrice, insurancePays: 0, notes: 'No frame allowance' }
  }

  if (retailPrice <= frameAllowance) {
    // Frame is within allowance - fully covered
    return {
      patientPays: 0,
      insurancePays: retailPrice,
      notes: 'Within frame allowance'
    }
  }

  // Frame exceeds allowance
  const overage = retailPrice - frameAllowance
  const discountedOverage = overage * (1 - overageDiscount)

  return {
    patientPays: discountedOverage,
    insurancePays: frameAllowance + (overage - discountedOverage),
    notes: `Frame overage: $${overage.toFixed(2)}, discount: ${(overageDiscount * 100).toFixed(0)}%`
  }
}

/**
 * Get frame allowance from authorization
 */
function getFrameAllowance(auth: BenefitAuthorization): number | null {
  const copays = auth.copays as any

  if (isVspAuth(auth)) {
    // VSP: Use non-featured allowance (all our frames are non-featured)
    return copays.frameAllowanceNonFeatured ?? copays.frameAllowanceFeatured ?? null
  }

  if (isEyemedAuth(auth)) {
    return copays.frameAllowance ?? null
  }

  if (isSpecteraAuth(auth)) {
    return copays.frameAllowance ?? null
  }

  return null
}

/**
 * Get frame overage discount from authorization
 * Normalizes the value to decimal format (0.20 = 20% off)
 */
function getFrameOverageDiscount(auth: BenefitAuthorization): number {
  const copays = auth.copays as any

  if (isVspAuth(auth)) {
    // VSP: frameOverageDiscount should be a decimal (e.g., 0.20 = 20% off)
    // Handle case where it might be stored as integer (20 = 20%)
    let discount = copays.frameOverageDiscount ?? 0.20
    if (discount > 1) {
      discount = discount / 100
    }
    return discount
  }

  if (isEyemedAuth(auth)) {
    // EyeMed: frameOverageDiscount should be a decimal
    // Handle case where it might be stored as integer
    let discount = copays.frameOverageDiscount ?? 0.20
    if (discount > 1) {
      discount = discount / 100
    }
    return discount
  }

  if (isSpecteraAuth(auth)) {
    // Spectera: frameOveragePercent is what PATIENT PAYS, so discount = 1 - that
    // e.g., frameOveragePercent = 0.80 means patient pays 80%, discount = 20%
    let patientPaysPercent = copays.frameOveragePercent ?? 0.80
    // Handle case where it might be stored as integer (80 = 80%)
    if (patientPaysPercent > 1) {
      patientPaysPercent = patientPaysPercent / 100
    }
    return 1 - patientPaysPercent
  }

  return 0
}

/**
 * Calculate contact lens pricing based on allowance
 */
export function calculateContactLensPricing(
  retailPrice: number,
  authorization: BenefitAuthorization | null
): PricingResult {
  if (!authorization) {
    return { patientPays: retailPrice, insurancePays: 0 }
  }

  const clAllowance = getContactLensAllowance(authorization)

  if (clAllowance === null) {
    return { patientPays: retailPrice, insurancePays: 0, notes: 'No contact lens allowance' }
  }

  if (retailPrice <= clAllowance) {
    return {
      patientPays: 0,
      insurancePays: retailPrice,
      notes: 'Within CL allowance'
    }
  }

  const overage = retailPrice - clAllowance
  return {
    patientPays: overage,
    insurancePays: clAllowance,
    notes: `CL overage: $${overage.toFixed(2)}`
  }
}

/**
 * Get contact lens allowance from authorization
 */
function getContactLensAllowance(auth: BenefitAuthorization): number | null {
  const copays = auth.copays as any

  if (isVspAuth(auth)) {
    return copays.contactLensAllowance ?? null
  }

  if (isEyemedAuth(auth)) {
    // EyeMed has conventional and disposable allowances
    return copays.contactsDisposable ?? copays.contactsConventional ?? null
  }

  if (isSpecteraAuth(auth)) {
    return copays.contactsNonSelectionAllowance ?? null
  }

  return null
}

/**
 * Extended PricingResult with tier information
 */
export interface LensPricingResult extends PricingResult {
  tier?: string
}

/**
 * Calculate lens pricing based on pricingCategory and carrier tier
 *
 * Lens pricing uses a tier-based copay system:
 * - PROGRESSIVE: Uses progressive tier copays (tier_1 through tier_5 for EyeMed, I-V for Spectera, K/J/F/O/N for VSP)
 * - SINGLE_VISION: Uses single vision copay
 * - BIFOCAL: Uses bifocal copay
 * - TRIFOCAL: Uses trifocal copay
 * - AR_COATING: Uses AR coating tier copays
 * - PHOTOCHROMIC: Uses photochromic copay
 * - MATERIAL: Uses material upgrade copay (poly, hi-index, etc.)
 * - LENS_ADDON: Typically patient pays retail (add-ons like UV, tint, etc.)
 * - LAB_SERVICE: Patient pays retail (edging, mounting)
 * - OCCUPATIONAL: Uses occupational/computer lens copay
 */
export function calculateLensPricingByCategory(
  pricingCategory: string | null,
  retailPrice: number,
  authorization: BenefitAuthorization | null,
  tierCode?: string | null
): LensPricingResult {
  // No authorization = patient pays full retail
  if (!authorization) {
    return { patientPays: retailPrice, insurancePays: 0 }
  }

  // No pricing category = patient pays retail
  if (!pricingCategory) {
    return { patientPays: retailPrice, insurancePays: 0, notes: 'Uncategorized lens' }
  }

  const copays = authorization.copays as any

  switch (pricingCategory) {
    // =========================================================================
    // PROGRESSIVE LENSES - Tier-based copay system
    // =========================================================================
    case 'PROGRESSIVE': {
      const copay = getProgressiveCopay(authorization, tierCode)
      if (copay !== null) {
        return {
          patientPays: copay,
          insurancePays: retailPrice - copay,
          tier: tierCode || undefined,
          notes: tierCode ? `Progressive tier: ${tierCode}` : 'Progressive'
        }
      }
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Progressive copay not found' }
    }

    // =========================================================================
    // SINGLE VISION LENSES
    // =========================================================================
    case 'SINGLE_VISION': {
      const copay = getSingleVisionCopay(authorization)
      if (copay !== null) {
        return {
          patientPays: copay,
          insurancePays: retailPrice - copay,
          notes: 'Single vision'
        }
      }
      return { patientPays: retailPrice, insurancePays: 0, notes: 'SV copay not found' }
    }

    // =========================================================================
    // BIFOCAL LENSES
    // =========================================================================
    case 'BIFOCAL': {
      const copay = getBifocalCopay(authorization)
      if (copay !== null) {
        return {
          patientPays: copay,
          insurancePays: retailPrice - copay,
          notes: 'Bifocal'
        }
      }
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Bifocal copay not found' }
    }

    // =========================================================================
    // TRIFOCAL LENSES
    // =========================================================================
    case 'TRIFOCAL': {
      const copay = getTrifocalCopay(authorization)
      if (copay !== null) {
        return {
          patientPays: copay,
          insurancePays: retailPrice - copay,
          notes: 'Trifocal'
        }
      }
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Trifocal copay not found' }
    }

    // =========================================================================
    // OCCUPATIONAL / COMPUTER LENSES
    // =========================================================================
    case 'OCCUPATIONAL': {
      // Occupational lenses often use progressive tier pricing
      const copay = getProgressiveCopay(authorization, tierCode)
      if (copay !== null) {
        return {
          patientPays: copay,
          insurancePays: retailPrice - copay,
          tier: tierCode || undefined,
          notes: 'Occupational lens'
        }
      }
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Occupational - not covered' }
    }

    // =========================================================================
    // AR COATING - Tier-based copay
    // =========================================================================
    case 'AR_COATING': {
      const copay = getArCoatingCopay(authorization, tierCode)
      if (copay !== null) {
        return {
          patientPays: copay,
          insurancePays: retailPrice - copay,
          tier: tierCode || undefined,
          notes: tierCode ? `AR tier: ${tierCode}` : 'AR coating'
        }
      }
      return { patientPays: retailPrice, insurancePays: 0, notes: 'AR copay not found' }
    }

    // =========================================================================
    // PHOTOCHROMIC (Transitions) - Fixed copay
    // =========================================================================
    case 'PHOTOCHROMIC': {
      const copay = getPhotochromicCopay(authorization)
      if (copay !== null) {
        return {
          patientPays: copay,
          insurancePays: retailPrice - copay,
          notes: 'Photochromic'
        }
      }
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Photochromic copay not found' }
    }

    // =========================================================================
    // POLARIZED - VSP uses DA code
    // =========================================================================
    case 'POLARIZED': {
      const copay = getPolarizedCopay(authorization)
      if (copay !== null) {
        return {
          patientPays: copay,
          insurancePays: retailPrice - copay,
          notes: 'Polarized'
        }
      }
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Polarized copay not found' }
    }

    // =========================================================================
    // MATERIAL UPGRADES (poly, hi-index, trivex)
    // =========================================================================
    case 'MATERIAL': {
      const copay = getMaterialCopay(authorization, tierCode)
      if (copay !== null) {
        return {
          patientPays: copay,
          insurancePays: retailPrice - copay,
          notes: 'Material upgrade'
        }
      }
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Material copay not found' }
    }

    // =========================================================================
    // LENS ADD-ONS (UV, scratch, tint, etc.) - Patient pays retail
    // =========================================================================
    case 'LENS_ADDON': {
      // Check for specific add-on copays (tint, polarized, etc.)
      if (copays.tintCopay !== undefined && copays.tintCopay !== null) {
        // Some carriers have specific add-on copays
        return { patientPays: retailPrice, insurancePays: 0, notes: 'Add-on - patient pays' }
      }
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Lens add-on' }
    }

    // =========================================================================
    // CASH PAY - Products that are never covered by insurance (Eyezen, etc.)
    // =========================================================================
    case 'CASH_PAY': {
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Cash pay only - no insurance coverage' }
    }

    // =========================================================================
    // MOUNT FEES (Full Rim, Semi-Rimless, Rimless/Drill)
    // VSP uses tier codes: 'standard' (covered), 'SW' (rimless drill - $30 copay)
    // Semi-rimless/groove is typically covered by VSP at no additional charge
    // =========================================================================
    case 'MOUNT_FEES': {
      // Standard mount (full rim) is typically covered at no charge
      if (tierCode === 'standard' || tierCode === 'covered') {
        return { patientPays: 0, insurancePays: retailPrice, notes: 'Standard mount - covered' }
      }

      // Semi-rimless / groove mount - VSP typically covers this at no charge
      // It's an intermediate between full rim and rimless drill
      if (tierCode === 'semi_rimless' || tierCode === 'groove') {
        if (isVspAuth(authorization)) {
          // VSP covers semi-rimless at no additional copay (like standard mount)
          return { patientPays: 0, insurancePays: retailPrice, notes: 'Semi-rimless mount - covered' }
        }
        // For other carriers, check for specific copay
        const semiCopay = getLensEnhancementCopay(authorization, tierCode)
        if (semiCopay !== null) {
          return {
            patientPays: semiCopay,
            insurancePays: retailPrice - semiCopay,
            tier: tierCode,
            notes: 'Semi-rimless mount'
          }
        }
        // EyeMed/Spectera may also cover semi-rimless at no charge
        return { patientPays: 0, insurancePays: retailPrice, notes: 'Semi-rimless mount - covered' }
      }

      // For VSP SW (rimless drill) - check enhancement copays first
      if (tierCode === 'SW' || tierCode === 'rimless') {
        // Try to get SW copay from VSP enhancement copays
        const swCopay = getLensEnhancementCopay(authorization, 'SW')
        if (swCopay !== null) {
          return {
            patientPays: swCopay,
            insurancePays: retailPrice - swCopay,
            tier: 'SW',
            notes: 'Rimless drill mount'
          }
        }
        // If no specific copay found, use 80% U&C rule (patient pays 20% of retail)
        if (isVspAuth(authorization)) {
          const copay80Uc = Math.round(retailPrice * 0.2)  // 80% U&C = patient pays 20%
          return {
            patientPays: copay80Uc,
            insurancePays: retailPrice - copay80Uc,
            tier: 'SW',
            notes: 'Rimless drill mount - 80% U&C'
          }
        }
      }

      // Check for specific mount copay from lens enhancement table
      const mountCopay = getLensEnhancementCopay(authorization, tierCode)
      if (mountCopay !== null) {
        return {
          patientPays: mountCopay,
          insurancePays: retailPrice - mountCopay,
          tier: tierCode || undefined,
          notes: `Mount fee: ${tierCode || 'upgrade'}`
        }
      }

      // Default: other mounts - patient pays retail for upgrade
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Mount upgrade - patient pays' }
    }

    // =========================================================================
    // LAB SERVICES - Patient pays retail
    // =========================================================================
    case 'LAB_SERVICE': {
      return { patientPays: retailPrice, insurancePays: 0, notes: 'Lab service - not covered' }
    }

    // =========================================================================
    // DEFAULT - Unknown category, patient pays retail
    // =========================================================================
    default:
      return { patientPays: retailPrice, insurancePays: 0, notes: `Unknown lens category: ${pricingCategory}` }
  }
}

/**
 * Get progressive lens copay from authorization based on tier
 */
function getProgressiveCopay(auth: BenefitAuthorization, tierCode?: string | null): number | null {
  const copays = auth.copays as any

  if (isVspAuth(auth)) {
    // VSP uses letter codes: K, J, F, O, N (standard to premium)
    // The copays are stored in planTier.progressiveCopays keyed by code (e.g., 'FA', 'KA')
    const vspAuth = auth as any
    if (tierCode && vspAuth.planTier?.progressiveCopays) {
      // Try exact tier code first (e.g., 'FA')
      if (vspAuth.planTier.progressiveCopays[tierCode] !== undefined) {
        return vspAuth.planTier.progressiveCopays[tierCode]
      }
      // Try with 'A' suffix (progressive codes are like FA, KA, etc.)
      const codeWithA = tierCode.endsWith('A') ? tierCode : `${tierCode}A`
      if (vspAuth.planTier.progressiveCopays[codeWithA] !== undefined) {
        return vspAuth.planTier.progressiveCopays[codeWithA]
      }
    }
    // Fallback to materials copay for generic progressives
    return copays.materials ?? copays.progressiveCopay ?? copays.lensesMultifocal ?? null
  }

  if (isEyemedAuth(auth)) {
    // EyeMed uses tier_1 through tier_5
    if (tierCode) {
      const tierMap: Record<string, string> = {
        'tier_1': 'progressiveStandardCopay',
        'tier_2': 'progressiveTier2Copay',
        'tier_3': 'progressiveTier3Copay',
        'tier_4': 'progressiveTier4Copay',
        'tier_5': 'progressiveTier5Copay',
      }
      const copayField = tierMap[tierCode.toLowerCase()]
      if (copayField && copays[copayField] !== undefined) {
        return copays[copayField]
      }
    }
    // Default to standard progressive
    return copays.progressiveStandardCopay ?? null
  }

  if (isSpecteraAuth(auth)) {
    // Spectera uses tier I through V (Roman numerals)
    if (tierCode) {
      const tierMap: Record<string, string> = {
        'I': 'progressiveTier1Copay',
        'II': 'progressiveTier2Copay',
        'III': 'progressiveTier3Copay',
        'IV': 'progressiveTier4Copay',
        'V': 'progressiveTier5Copay',
      }
      const copayField = tierMap[tierCode.toUpperCase()]
      if (copayField && copays[copayField] !== undefined) {
        return copays[copayField]
      }
    }
    // Default to tier 1
    return copays.progressiveTier1Copay ?? copays.standardLensCopay ?? null
  }

  return null
}

/**
 * Get single vision copay
 */
function getSingleVisionCopay(auth: BenefitAuthorization): number | null {
  const copays = auth.copays as any

  if (isVspAuth(auth)) {
    // VSP single vision uses materials copay
    return copays.materials ?? copays.lensSingleVision ?? 0
  }

  if (isEyemedAuth(auth)) {
    return copays.singleVisionCopay ?? 0
  }

  if (isSpecteraAuth(auth)) {
    return copays.standardLensCopay ?? 0
  }

  return null
}

/**
 * Get bifocal copay
 */
function getBifocalCopay(auth: BenefitAuthorization): number | null {
  const copays = auth.copays as any

  if (isVspAuth(auth)) {
    // VSP bifocal uses materials copay
    return copays.materials ?? copays.lensBifocal ?? copays.lensesMultifocal ?? null
  }

  if (isEyemedAuth(auth)) {
    return copays.bifocalCopay ?? null
  }

  if (isSpecteraAuth(auth)) {
    // Spectera often uses standard lens copay for bifocals
    return copays.standardLensCopay ?? null
  }

  return null
}

/**
 * Get trifocal copay
 */
function getTrifocalCopay(auth: BenefitAuthorization): number | null {
  const copays = auth.copays as any

  if (isVspAuth(auth)) {
    // VSP trifocal uses materials copay
    return copays.materials ?? copays.lensTrifocal ?? copays.lensesMultifocal ?? null
  }

  if (isEyemedAuth(auth)) {
    return copays.trifocalCopay ?? null
  }

  if (isSpecteraAuth(auth)) {
    return copays.standardLensCopay ?? null
  }

  return null
}

/**
 * Get AR coating copay based on tier
 */
function getArCoatingCopay(auth: BenefitAuthorization, tierCode?: string | null): number | null {
  const copays = auth.copays as any

  if (isVspAuth(auth)) {
    // VSP AR codes are stored in planTier.arCopays keyed by code (e.g., 'QM', 'QT', 'QV')
    const vspAuth = auth as any
    if (tierCode && vspAuth.planTier?.arCopays) {
      if (vspAuth.planTier.arCopays[tierCode] !== undefined) {
        return vspAuth.planTier.arCopays[tierCode]
      }
    }
    // Fallback to generic AR copay
    return copays.arCoatingCopay ?? null
  }

  if (isEyemedAuth(auth)) {
    // EyeMed uses AR tiers
    if (tierCode && copays.arCoatingTierCopays) {
      return copays.arCoatingTierCopays[tierCode] ?? null
    }
    return copays.arCoatingCopay ?? null
  }

  if (isSpecteraAuth(auth)) {
    if (tierCode && copays.arCoatingTierCopays) {
      return copays.arCoatingTierCopays[tierCode] ?? null
    }
    return copays.arCoatingCopay ?? null
  }

  return null
}

/**
 * Get photochromic copay
 */
function getPhotochromicCopay(auth: BenefitAuthorization): number | null {
  const copays = auth.copays as any

  if (isVspAuth(auth)) {
    // VSP photochromic copay - check both named property and raw code map
    const vspAuth = auth as any
    // Check named property first
    if (vspAuth.planTier?.enhancementCopays?.photochromic !== undefined) {
      return vspAuth.planTier.enhancementCopays.photochromic
    }
    // Check raw code-keyed map (PR = photochromic plastic)
    if (vspAuth.planTier?.lensEnhancementCopays?.PR !== undefined) {
      return vspAuth.planTier.lensEnhancementCopays.PR
    }
    return copays.photochromicCopay ?? null
  }

  if (isEyemedAuth(auth)) {
    return copays.photochromicCopay ?? null
  }

  if (isSpecteraAuth(auth)) {
    return copays.photochromicCopay ?? null
  }

  return null
}

/**
 * Get polarized copay - VSP uses DA code
 */
function getPolarizedCopay(auth: BenefitAuthorization): number | null {
  const copays = auth.copays as any

  if (isVspAuth(auth)) {
    const vspAuth = auth as any
    // Check named property first
    if (vspAuth.planTier?.enhancementCopays?.polarized !== undefined) {
      return vspAuth.planTier.enhancementCopays.polarized
    }
    // Check raw code-keyed map (DA = polarized plastic)
    if (vspAuth.planTier?.lensEnhancementCopays?.DA !== undefined) {
      return vspAuth.planTier.lensEnhancementCopays.DA
    }
    return copays.polarizedCopay ?? null
  }

  if (isEyemedAuth(auth)) {
    return copays.polarizedCopay ?? null
  }

  if (isSpecteraAuth(auth)) {
    return copays.polarizedCopay ?? null
  }

  return null
}

/**
 * Get material upgrade copay (poly, hi-index, trivex)
 *
 * materialType can be:
 * - A VSP tier code (AD, AB, AH, AJ) - used when coming from lens_carrier_tiers
 * - A descriptive name containing keywords like 'poly', '1.67', 'trivex'
 *
 * VSP planTier.materialCopays structure:
 *   { polycarbonate: number, trivex: number, highIndex167: number, highIndex174: number }
 */
function getMaterialCopay(auth: BenefitAuthorization, materialType?: string | null): number | null {
  const copays = auth.copays as any

  if (isVspAuth(auth)) {
    // VSP materials are in planTier.materialCopays with named properties
    const vspAuth = auth as any
    const matCopays = vspAuth.planTier?.materialCopays

    if (materialType) {
      const matUpper = materialType.toUpperCase()
      const matLower = materialType.toLowerCase()

      // First try direct tier code lookup (AD, AB, AH, AJ)
      // These come from lens_carrier_tiers when a product is selected
      if (matUpper === 'AD') {
        // Polycarbonate
        return matCopays?.polycarbonate ?? copays.polycarbonateAdultCopay ?? 35
      }
      if (matUpper === 'AB') {
        // Trivex / Hi-Index 1.60 & Below
        return matCopays?.trivex ?? copays.trivexCopay ?? 56
      }
      if (matUpper === 'AH') {
        // Hi-Index 1.66/1.67
        return matCopays?.highIndex167 ?? copays.highIndex167Copay ?? 98
      }
      if (matUpper === 'AJ') {
        // Hi-Index 1.71+
        return matCopays?.highIndex174 ?? copays.highIndex174Copay ?? 118
      }

      // Fall back to keyword matching (for descriptive material names)
      if (matCopays) {
        if (matLower.includes('poly')) {
          return matCopays.polycarbonate ?? copays.polycarbonateAdultCopay ?? 35
        }
        if (matLower.includes('167') || matLower.includes('1.67')) {
          return matCopays.highIndex167 ?? copays.highIndex167Copay ?? 98
        }
        if (matLower.includes('174') || matLower.includes('1.74')) {
          return matCopays.highIndex174 ?? copays.highIndex174Copay ?? 118
        }
        if (matLower.includes('trivex') || matLower.includes('1.60')) {
          return matCopays.trivex ?? copays.trivexCopay ?? 56
        }
      }
    }
    return copays.materials ?? copays.materialCopay ?? null
  }

  // Common material copays for EyeMed/Spectera
  if (materialType) {
    const matLower = materialType.toLowerCase()
    if (matLower.includes('poly')) {
      return copays.polycarbonateAdultCopay ?? copays.polycarbonateCopay ?? null
    }
    if (matLower.includes('167') || matLower.includes('1.67')) {
      return copays.highIndex167Copay ?? copays.highIndexCopay ?? null
    }
    if (matLower.includes('174') || matLower.includes('1.74')) {
      return copays.highIndex174Copay ?? copays.highIndexCopay ?? null
    }
    if (matLower.includes('trivex')) {
      return copays.trivexCopay ?? null
    }
  }

  // Generic material copay
  return copays.materials ?? copays.materialCopay ?? null
}

/**
 * Get lens enhancement copay from authorization by tier code
 * This includes mount fees (SW for rimless drill), edge treatments, etc.
 */
function getLensEnhancementCopay(auth: BenefitAuthorization, tierCode?: string | null): number | null {
  if (!tierCode) return null

  const copays = auth.copays as any

  if (isVspAuth(auth)) {
    // VSP enhancement copays are typically in planTier.lensEnhancementCopays
    const vspAuth = auth as any
    const enhCopays = vspAuth.planTier?.lensEnhancementCopays

    if (enhCopays) {
      // Check for tier code copays (e.g., 'SW' for rimless drill)
      const copay = enhCopays[tierCode]
      if (copay !== undefined && copay !== null) {
        // Copay could be a number or an object with sv/mf values
        if (typeof copay === 'number') {
          return copay
        }
        if (typeof copay === 'object') {
          // Return single vision copay by default
          return copay.sv ?? copay.mf ?? null
        }
      }
    }

    // Fallback: check for specific named copays
    if (tierCode === 'SW' || tierCode.toLowerCase().includes('rimless')) {
      return copays.rimlessDrillCopay ?? copays.drillMountCopay ?? null
    }
  }

  if (isEyemedAuth(auth) || isSpecteraAuth(auth)) {
    // EyeMed/Spectera may have enhancement copays in a different structure
    const enhCopays = copays.enhancementCopays || copays.lensEnhancementCopays
    if (enhCopays && enhCopays[tierCode] !== undefined) {
      return enhCopays[tierCode]
    }
  }

  return null
}
