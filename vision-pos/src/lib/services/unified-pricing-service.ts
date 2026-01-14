/**
 * Unified Pricing Service
 * 
 * Single source of truth for ALL product pricing across:
 * - Exams & Services
 * - Frames
 * - Lenses (SV, Progressive, Bifocal)
 * - AR Coatings
 * - Materials
 * - Enhancements (Photochromic, Polarized, etc.)
 * - Contact Lenses
 * - Contact Lens Fittings
 * 
 * This service:
 * 1. Fetches products from the database by SKU or category
 * 2. Applies carrier-specific tier discounts/copays from authorization
 * 3. Returns unified pricing breakdown for the quote builder
 */

import { prisma } from '@/lib/prisma'
import { 
  BenefitAuthorization, 
  isVspAuth, 
  isEyemedAuth, 
  isSpecteraAuth 
} from '@/types/benefit-authorization'
import { ProductCategory } from '@/types/product-catalog'

// =============================================================================
// TYPES
// =============================================================================

export interface PricedProduct {
  sku: string
  name: string
  category: ProductCategory
  retailPrice: number
  
  // Insurance calculations
  patientPays: number
  insurancePays: number
  savings: number
  
  // What determined the price
  pricingMethod: 'copay' | 'allowance' | 'tier' | 'percent_of_uc' | 'retail'
  tierUsed?: string
  notes?: string
  warnings?: string[]
}

export interface ExamServiceProduct {
  sku: string
  name: string
  code: string | null
  category: 'EXAM' | 'CONTACT_LENS_FIT' | 'PROCEDURE'
  retailPrice: number
  vspAllowance: number | null
  eyemedAllowance: number | null
  specteraAllowance: number | null
  isCoveredByVision: boolean
}

export interface ContactLensProduct {
  sku: string
  manufacturer: string
  lensName: string
  retailPrice: number
  boxSize: number
  vspCategory: string | null
  eyemedCategory: string | null
  specteraCategory: string | null
  isAstigmatism: boolean
  isMultifocal: boolean
  isDaily: boolean
}

export interface ContactLensPricingResult {
  lensName: string
  pricePerBox: number
  boxesOD: number
  boxesOS: number
  subtotal: number
  
  // Insurance
  allowanceApplied: number
  patientPays: number
  
  // Rebate (if applicable)
  rebate: number
  
  // Annual supply discount
  meetsAnnualSupply: boolean
  annualSupplyDiscount: number
  
  finalPatientPays: number
  
  notes?: string
}

// =============================================================================
// EXAM & SERVICE PRICING
// =============================================================================

/**
 * Get all available exam services from the database
 */
export async function getExamServices(): Promise<ExamServiceProduct[]> {
  const services = await prisma.servicePrice.findMany({
    where: {
      isActive: true,
      category: { in: ['EXAM', 'CONTACT_LENS_FIT', 'PROCEDURE'] },
      showInPos: true,
    },
    orderBy: { posDisplayOrder: 'asc' },
  })
  
  return services.map(s => ({
    sku: s.sku || s.id,
    name: s.name,
    code: s.code,
    category: s.category as 'EXAM' | 'CONTACT_LENS_FIT' | 'PROCEDURE',
    retailPrice: s.retailPrice,
    vspAllowance: s.vspAllowance,
    eyemedAllowance: s.eyemedAllowance,
    specteraAllowance: s.specteraAllowance,
    isCoveredByVision: s.isCoveredByVision,
  }))
}

/**
 * Calculate pricing for exam services
 */
export function calculateExamServicePricing(
  service: ExamServiceProduct,
  auth: BenefitAuthorization | null
): PricedProduct {
  // No insurance - pay retail
  if (!auth) {
    return {
      sku: service.sku,
      name: service.name,
      category: 'service',
      retailPrice: service.retailPrice,
      patientPays: service.retailPrice,
      insurancePays: 0,
      savings: 0,
      pricingMethod: 'retail',
      notes: 'No insurance',
    }
  }
  
  // Get the appropriate copay based on carrier and service type
  let patientCopay = service.retailPrice
  let pricingMethod: PricedProduct['pricingMethod'] = 'retail'
  let tierUsed: string | undefined
  let notes: string | undefined
  
  if (isVspAuth(auth)) {
    // VSP: Exam has a fixed copay (examWellvision)
    if (service.category === 'EXAM') {
      if (service.name.toLowerCase().includes('routine') || 
          service.name.toLowerCase().includes('comprehensive') ||
          service.code === 'S0620') {
        patientCopay = auth.copays.examWellvision
        pricingMethod = 'copay'
        tierUsed = 'wellvision_exam'
      } else {
        // Medical exam or specialty - may not be covered
        patientCopay = service.retailPrice
        notes = 'Medical/specialty exam - check coverage'
      }
    } else if (service.category === 'CONTACT_LENS_FIT') {
      // VSP contact lens fitting pricing
      // Priority: specific copay amount > covered flag > retail
      if (auth.copays.contactLensExamCopay !== undefined) {
        // Use the specific copay amount from the authorization (e.g., $60)
        patientCopay = auth.copays.contactLensExamCopay
        pricingMethod = 'copay'
        tierUsed = 'contact_lens_exam'
        notes = `Contact lens fitting copay: $${auth.copays.contactLensExamCopay}`
      } else if (auth.copays.contactFittingCovered === true) {
        // Fully covered with no copay
        patientCopay = 0
        pricingMethod = 'copay'
        tierUsed = 'contact_fit_covered'
        notes = 'Contact lens fitting covered by VSP'
      } else {
        // Not covered - full retail
        patientCopay = service.retailPrice
        notes = 'Contact lens fitting not covered'
      }
    }
  } else if (isEyemedAuth(auth)) {
    // EyeMed: Exam copay, separate materials copay
    if (service.category === 'EXAM') {
      patientCopay = auth.copays.exam
      pricingMethod = 'copay'
      tierUsed = 'exam'
    } else if (service.category === 'CONTACT_LENS_FIT') {
      // EyeMed contact fitting - use standard fitting copay
      // clFitStandardCopay can be number, 'covered', or null
      const fitCopay = auth.copays.clFitStandardCopay
      if (fitCopay === 'covered') {
        patientCopay = 0
        pricingMethod = 'copay'
        tierUsed = 'contact_fit_covered'
        notes = 'Contact lens fitting covered by EyeMed'
      } else if (typeof fitCopay === 'number') {
        patientCopay = fitCopay
        pricingMethod = 'copay'
        tierUsed = 'contact_fit_standard'
        notes = `Contact lens fitting copay: $${fitCopay}`
      } else if (auth.copays.clFitEligible) {
        // Eligible but no specific copay - assume included
        patientCopay = 0
        pricingMethod = 'copay'
        tierUsed = 'contact_fit_eligible'
        notes = 'Contact lens fitting included with benefit'
      } else {
        // Not eligible or no coverage
        patientCopay = service.retailPrice
        notes = 'Contact lens fitting not covered'
      }
    }
  } else if (isSpecteraAuth(auth)) {
    // Spectera: Has pediatric, maternity, and adult exam copays
    if (service.category === 'EXAM') {
      // Use adult exam by default (could be enhanced with patient age)
      patientCopay = auth.copays.examAdult
      pricingMethod = 'copay'
      tierUsed = 'exam_adult'
    } else if (service.category === 'CONTACT_LENS_FIT') {
      // Spectera contact fitting
      const fitCopay = auth.copays.examContactFitSelection
      if (fitCopay === 'covered') {
        patientCopay = 0
        pricingMethod = 'copay'
        tierUsed = 'contact_fit_covered'
      } else if (typeof fitCopay === 'number') {
        patientCopay = fitCopay
        pricingMethod = 'copay'
        tierUsed = 'contact_fit'
      } else {
        // Non-selection plan - 100% billed
        patientCopay = service.retailPrice
        notes = 'Non-selection plan - full retail'
      }
    }
  }
  
  const insurancePays = service.retailPrice - patientCopay
  
  return {
    sku: service.sku,
    name: service.name,
    category: 'service',
    retailPrice: service.retailPrice,
    patientPays: patientCopay,
    insurancePays: Math.max(0, insurancePays),
    savings: Math.max(0, insurancePays),
    pricingMethod,
    tierUsed,
    notes,
  }
}

// =============================================================================
// CONTACT LENS PRICING
// =============================================================================

/**
 * Get available contact lenses from the database
 */
export async function getContactLenses(filters?: {
  isAstigmatism?: boolean
  isMultifocal?: boolean
  isDaily?: boolean
  manufacturer?: string
}): Promise<ContactLensProduct[]> {
  const where: Record<string, unknown> = {
    isActive: true,
    showInPos: true,
  }
  
  if (filters?.isAstigmatism !== undefined) where.isAstigmatism = filters.isAstigmatism
  if (filters?.isMultifocal !== undefined) where.isMultifocal = filters.isMultifocal
  if (filters?.isDaily !== undefined) where.isDaily = filters.isDaily
  if (filters?.manufacturer) where.manufacturer = filters.manufacturer
  
  const lenses = await prisma.contactLens.findMany({
    where,
    orderBy: [{ manufacturer: 'asc' }, { lensName: 'asc' }],
  })
  
  return lenses.map(l => ({
    sku: l.id, // Contact lenses use ID as SKU
    manufacturer: l.manufacturer,
    lensName: l.lensName,
    retailPrice: l.retailPrice,
    boxSize: l.boxSize,
    vspCategory: l.vspCategory,
    eyemedCategory: l.eyemedCategory,
    specteraCategory: l.specteraCategory,
    isAstigmatism: l.isAstigmatism,
    isMultifocal: l.isMultifocal,
    isDaily: l.isDaily,
  }))
}

/**
 * Calculate contact lens pricing with insurance
 */
export function calculateContactLensPricing(
  lens: ContactLensProduct,
  boxesOD: number,
  boxesOS: number,
  auth: BenefitAuthorization | null,
  annualSupplyBoxes?: number // How many boxes = annual supply
): ContactLensPricingResult {
  const totalBoxes = boxesOD + boxesOS
  const subtotal = totalBoxes * lens.retailPrice
  
  // Calculate annual supply (typically 4 boxes per eye for monthly, 8 for biweekly, etc.)
  const defaultAnnualSupply = lens.isDaily ? 8 : 4 // 4 boxes per eye for non-dailies
  const annualSupplyPerEye = annualSupplyBoxes || defaultAnnualSupply
  const meetsAnnualSupply = boxesOD >= annualSupplyPerEye && boxesOS >= annualSupplyPerEye
  
  // Annual supply discount (typically 10-15% from manufacturers)
  const annualSupplyDiscount = meetsAnnualSupply ? subtotal * 0.10 : 0
  
  // No insurance
  if (!auth) {
    return {
      lensName: lens.lensName,
      pricePerBox: lens.retailPrice,
      boxesOD,
      boxesOS,
      subtotal,
      allowanceApplied: 0,
      patientPays: subtotal - annualSupplyDiscount,
      rebate: 0,
      meetsAnnualSupply,
      annualSupplyDiscount,
      finalPatientPays: subtotal - annualSupplyDiscount,
    }
  }
  
  // Calculate insurance allowance
  let allowance = 0
  let notes: string | undefined
  
  if (isVspAuth(auth)) {
    // VSP: Contact lens allowance (either contacts OR glasses, not both)
    allowance = auth.copays.contactLensAllowance || 0
    notes = 'VSP contact allowance'
  } else if (isEyemedAuth(auth)) {
    // EyeMed: Disposable or conventional contacts allowance
    if (lens.isDaily || lens.eyemedCategory === 'disposable_daily') {
      allowance = auth.copays.contactsDisposable || 0
      notes = 'EyeMed disposable allowance'
    } else {
      allowance = auth.copays.contactsConventional || 0
      notes = 'EyeMed conventional allowance'
    }
  } else if (isSpecteraAuth(auth)) {
    // Spectera: Selection vs non-selection plans
    const dailyBenefit = auth.copays.contactsSelectionDailyBiweekly
    const monthlyBenefit = auth.copays.contactsSelectionMonthly
    
    if (lens.isDaily && dailyBenefit) {
      allowance = dailyBenefit.amount
      notes = `Spectera ${dailyBenefit.units} allowance`
    } else if (monthlyBenefit) {
      allowance = monthlyBenefit.amount
      notes = `Spectera ${monthlyBenefit.units} allowance`
    } else {
      // Non-selection plan allowance
      allowance = auth.copays.contactsNonSelectionAllowance || 0
      notes = 'Spectera non-selection allowance'
    }
  }
  
  // Apply allowance (can't exceed subtotal)
  const allowanceApplied = Math.min(allowance, subtotal)
  const afterInsurance = subtotal - allowanceApplied
  const afterAnnualDiscount = afterInsurance - annualSupplyDiscount
  
  // Manufacturer rebate (placeholder - would need rebate data)
  const rebate = 0
  
  const finalPatientPays = Math.max(0, afterAnnualDiscount - rebate)
  
  return {
    lensName: lens.lensName,
    pricePerBox: lens.retailPrice,
    boxesOD,
    boxesOS,
    subtotal,
    allowanceApplied,
    patientPays: afterInsurance,
    rebate,
    meetsAnnualSupply,
    annualSupplyDiscount,
    finalPatientPays,
    notes,
  }
}

// =============================================================================
// UNIFIED PRODUCT LOOKUP
// =============================================================================

export interface ProductLookupResult {
  found: boolean
  product?: {
    sku: string
    name: string
    category: ProductCategory
    retailPrice: number
    source: 'service' | 'lens' | 'frame' | 'contact' | 'legacy'
    carrierTiers?: {
      vsp?: string
      eyemed?: string
      spectera?: string
    }
  }
}

/**
 * Look up a product by SKU across all product tables
 */
export async function lookupProduct(sku: string): Promise<ProductLookupResult> {
  // Try ServicePrice first
  const service = await prisma.servicePrice.findFirst({
    where: { OR: [{ sku }, { id: sku }] },
  })
  if (service) {
    return {
      found: true,
      product: {
        sku: service.sku || service.id,
        name: service.name,
        category: 'service',
        retailPrice: service.retailPrice,
        source: 'service',
      },
    }
  }
  
  // Try LensProduct
  const lens = await prisma.lensProduct.findFirst({
    where: { OR: [{ sku }, { id: sku }] },
  })
  if (lens) {
    // Fetch tier mappings from unified carrier_tiers table
    const tiers = await prisma.carrierTier.findMany({
      where: { productId: lens.id }
    })
    return {
      found: true,
      product: {
        sku: lens.sku || lens.id,
        name: lens.name,
        category: mapLensCategory(lens.category),
        retailPrice: lens.retailPrice,
        source: 'lens',
        carrierTiers: {
          vsp: tiers.find(t => t.carrier === 'VSP')?.tierCode,
          eyemed: tiers.find(t => t.carrier === 'EYEMED')?.tierCode,
          spectera: tiers.find(t => t.carrier === 'SPECTERA')?.tierCode,
        },
      },
    }
  }
  
  // Try Frame
  const frame = await prisma.frame.findFirst({
    where: { OR: [{ sku }, { id: sku }] },
  })
  if (frame) {
    return {
      found: true,
      product: {
        sku: frame.sku || frame.id,
        name: `${frame.brand} ${frame.model}`,
        category: 'frame',
        retailPrice: frame.retailPrice,
        source: 'frame',
      },
    }
  }
  
  // Try ContactLens
  const contact = await prisma.contactLens.findFirst({
    where: { id: sku },
  })
  if (contact) {
    return {
      found: true,
      product: {
        sku: contact.id,
        name: `${contact.manufacturer} ${contact.lensName}`,
        category: 'contact',
        retailPrice: contact.retailPrice,
        source: 'contact',
        carrierTiers: {
          vsp: contact.vspCategory || undefined,
          eyemed: contact.eyemedCategory || undefined,
          spectera: contact.specteraCategory || undefined,
        },
      },
    }
  }
  
  return { found: false }
}

function mapLensCategory(dbCategory: string): ProductCategory {
  switch (dbCategory) {
    case 'LENS':
    case 'SINGLE_VISION':
      return 'lens_sv'
    case 'PROGRESSIVE':
      return 'lens_progressive'
    case 'BIFOCAL':
      return 'lens_bifocal'
    case 'AR_COATING':
      return 'ar_coating'
    case 'MATERIAL':
      return 'material'
    case 'PHOTOCHROMIC':
      return 'photochromic'
    case 'POLARIZED':
      return 'polarized'
    default:
      return 'other'
  }
}

// =============================================================================
// CONTACT LENS FITTING LOOKUP
// =============================================================================

export interface ContactLensFitting {
  sku: string
  name: string
  retailPrice: number
  fittingType: 'sphere' | 'toric' | 'multifocal' | 'rgp' | 'specialty' | 'other'
  pricingCategory: string | null
}

/**
 * Get contact lens fitting services
 */
export async function getContactLensFittings(): Promise<ContactLensFitting[]> {
  const fittings = await prisma.servicePrice.findMany({
    where: {
      isActive: true,
      category: 'CONTACT_LENS_FIT',
      showInPos: true,
    },
    orderBy: { retailPrice: 'asc' },
  })
  
  return fittings.map(f => ({
    sku: f.sku || f.id,
    name: f.name,
    retailPrice: f.retailPrice,
    fittingType: detectFittingType(f.name),
    pricingCategory: f.pricingCategory,
  }))
}

function detectFittingType(name: string): ContactLensFitting['fittingType'] {
  const lower = name.toLowerCase()
  if (lower.includes('sphere') || lower.includes('soft')) return 'sphere'
  if (lower.includes('toric') || lower.includes('astig')) return 'toric'
  if (lower.includes('multifocal') || lower.includes('bifocal')) return 'multifocal'
  if (lower.includes('rgp') || lower.includes('rigid')) return 'rgp'
  if (lower.includes('specialty') || lower.includes('scleral') || lower.includes('ortho')) return 'specialty'
  return 'other'
}

/**
 * Calculate fitting fee pricing
 * Only CL_FIT_STANDARD gets insurance copay
 * Specialty, Premium, and Myopia Management fittings are full retail
 */
export function calculateFittingPricing(
  fitting: ContactLensFitting,
  auth: BenefitAuthorization | null
): PricedProduct {
  // Check if this is a specialty/premium fitting that doesn't get insurance coverage
  const pricingCat = fitting.pricingCategory
  const isSpecialtyFitting = pricingCat === 'CL_FIT_SPECIALTY' ||
                              pricingCat === 'CL_FIT_PREMIUM' ||
                              pricingCat === 'CL_FIT_MYOPIA_MGMT'

  // Specialty fittings are NOT covered by insurance - patient pays full retail
  if (isSpecialtyFitting) {
    return {
      sku: fitting.sku,
      name: fitting.name,
      category: 'service',
      retailPrice: fitting.retailPrice,
      patientPays: fitting.retailPrice,
      insurancePays: 0,
      savings: 0,
      pricingMethod: 'retail',
      notes: 'Specialty fitting - not covered by insurance',
    }
  }

  // Standard fittings go through normal insurance pricing
  const service: ExamServiceProduct = {
    sku: fitting.sku,
    name: fitting.name,
    code: null,
    category: 'CONTACT_LENS_FIT',
    retailPrice: fitting.retailPrice,
    vspAllowance: null,
    eyemedAllowance: null,
    specteraAllowance: null,
    isCoveredByVision: true,
  }

  return calculateExamServicePricing(service, auth)
}
