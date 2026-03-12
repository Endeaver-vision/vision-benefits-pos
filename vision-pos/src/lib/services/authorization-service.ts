/**
 * Unified Authorization Service
 *
 * Fetches authorization data from the database and converts to
 * BenefitAuthorization types for pricing calculations.
 *
 * This is the main entry point for getting patient authorization data.
 */

import { prisma } from '@/lib/prisma'
import {
  BenefitAuthorization,
  EyemedBenefitAuthorization,
  SpecteraBenefitAuthorization,
  VspBenefitAuthorization,
  Patient,
  Plan,
} from '@/types/benefit-authorization'

// =============================================================================
// FETCH ACTIVE AUTHORIZATION FOR CUSTOMER
// =============================================================================

export type CarrierType = 'vsp' | 'eyemed' | 'spectera'

export interface AuthorizationResult {
  authorization: BenefitAuthorization
  authorizationId: string
  carrier: CarrierType
  expirationDate: Date | null
}

/**
 * Get the active authorization for a customer
 * Returns the most recent active authorization from any carrier
 */
export async function getActiveAuthorizationForCustomer(
  customerId: string
): Promise<AuthorizationResult | null> {
  // Query the generic InsuranceAuthorization table
  const auth = await prisma.insuranceAuthorization.findFirst({
    where: {
      customerId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      customer: true,
    },
  })

  if (!auth) return null

  const carrierLower = auth.carrier.toLowerCase() as CarrierType
  const benefitAuth = convertGenericAuthToBenefitAuth(auth)

  return {
    authorization: benefitAuth,
    authorizationId: auth.id,
    carrier: carrierLower,
    expirationDate: auth.expirationDate,
  }
}

/**
 * Get authorization for a specific carrier
 */
export async function getAuthorizationByCarrier(
  customerId: string,
  carrier: CarrierType
): Promise<AuthorizationResult | null> {
  const auth = await prisma.insuranceAuthorization.findFirst({
    where: {
      customerId,
      isActive: true,
      carrier: {
        equals: carrier.toUpperCase(),
        mode: 'insensitive',
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      customer: true,
    },
  })

  if (!auth) return null

  const benefitAuth = convertGenericAuthToBenefitAuth(auth)

  return {
    authorization: benefitAuth,
    authorizationId: auth.id,
    carrier,
    expirationDate: auth.expirationDate,
  }
}

/**
 * Get all authorizations for a customer (across all carriers)
 */
export async function getAllAuthorizationsForCustomer(
  customerId: string
): Promise<AuthorizationResult[]> {
  const auths = await prisma.insuranceAuthorization.findMany({
    where: {
      customerId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      customer: true,
    },
  })

  return auths.map(auth => ({
    authorization: convertGenericAuthToBenefitAuth(auth),
    authorizationId: auth.id,
    carrier: auth.carrier.toLowerCase() as CarrierType,
    expirationDate: auth.expirationDate,
  }))
}

// =============================================================================
// CONVERSION HELPER
// =============================================================================

/**
 * Convert generic InsuranceAuthorization database record to BenefitAuthorization type
 *
 * Handles all three carriers (VSP, EyeMed, Spectera) by parsing the generic
 * database fields and copays JSON into the appropriate benefit type.
 */
function convertGenericAuthToBenefitAuth(
  auth: any & { customer?: any }
): BenefitAuthorization {
  const carrierLower = auth.carrier.toLowerCase()
  const customer = auth.customer

  // Build patient data (common to all carriers)
  const patient: Patient = {
    name: customer
      ? `${customer.firstName} ${customer.lastName}`.trim()
      : 'Unknown',
    dob: customer?.dateOfBirth
      ? customer.dateOfBirth.toISOString().split('T')[0]
      : null,
    age: null, // Age not typically stored; can be calculated if needed
    memberId: auth.memberId || auth.authorizationNumber || 'N/A',
    groupNumber: auth.groupNumber ?? undefined,
  }

  // Build plan data (common to all carriers)
  const basePlan: Plan = {
    planId: auth.id,
    planName: auth.planName || 'Insurance Plan',
    effectiveDate: auth.authDate ? auth.authDate.toISOString().split('T')[0] : undefined,
    expirationDate: auth.expirationDate
      ? auth.expirationDate.toISOString().split('T')[0]
      : undefined,
  }

  // Parse copays from JSON field or individual database fields
  const copaysData = (auth.copays as Record<string, any>) || {}

  // Route to carrier-specific conversion
  switch (carrierLower) {
    case 'vsp':
      return convertToVspAuth(auth, patient, basePlan, copaysData)
    case 'eyemed':
      return convertToEyemedAuth(auth, patient, basePlan, copaysData)
    case 'spectera':
      return convertToSpecteraAuth(auth, patient, basePlan, copaysData)
    default:
      throw new Error(`Unknown carrier: ${carrierLower}`)
  }
}

/**
 * Convert to VSP BenefitAuthorization
 */
function convertToVspAuth(
  auth: any,
  patient: Patient,
  basePlan: Plan,
  copaysData: Record<string, any>
): VspBenefitAuthorization {
  const examCopay = Number(auth.examCopay) || 0
  const materialsCopay = Number(auth.materialsCopay) || 0
  const frameAllowance = Number(auth.frameAllowance) || 0
  const contactAllowance = Number(auth.contactAllowance) || 0
  const clExamCopay = Number(auth.clExamCopay) || 0

  return {
    patient,
    plan: {
      ...basePlan,
      carrier: 'vsp',
    },
    frequency: {
      exam: { count: 1, periodMonths: 12 },
      frame: { count: 1, periodMonths: 24 },
      lenses: { count: 1, periodMonths: 12 },
    },
    copays: {
      examWellvision: examCopay,
      examMedical: examCopay,
      materials: materialsCopay,
      frameAllowanceFeatured: frameAllowance,
      frameAllowanceNonFeatured: frameAllowance,
      frameOverageDiscount: 0.20, // VSP standard is 20% discount
      contactLensAllowance: contactAllowance,
      contactLensExamCopay: clExamCopay,
      contactFittingCovered: clExamCopay === 0,
    },
    planTier: {
      tier: 'choice',
      progressiveCopays: copaysData.progressiveCopays || {},
      arCopays: copaysData.arCopays || {},
      materialCopays: {
        polycarbonate: copaysData.materialPolycarbonate || 0,
        polycarbonateChild: copaysData.materialPolycarbonateChild || 'covered',
        trivex: copaysData.trivex || 0,
        highIndex167: copaysData.highIndex167 || 0,
        highIndex174: copaysData.highIndex174 || 0,
      },
      enhancementCopays: {
        photochromic: copaysData.photochromic || 0,
        polarized: copaysData.polarized || 0,
        blueLightFilter: copaysData.blueLightFilter || 0,
        tint: copaysData.tint || 0,
      },
    },
    specialRules: {
      pricingRules: copaysData.pricingRules || {},
      polycarbonateFreeCbildAgeMax: 18,
    },
  }
}

/**
 * Convert to EyeMed BenefitAuthorization
 */
function convertToEyemedAuth(
  auth: any,
  patient: Patient,
  basePlan: Plan,
  copaysData: Record<string, any>
): EyemedBenefitAuthorization {
  const examCopay = Number(auth.examCopay) || 0
  const materialsCopay = Number(auth.materialsCopay) || 0
  const frameAllowance = Number(auth.frameAllowance) || 0
  const contactAllowance = Number(auth.contactAllowance) || 0

  return {
    patient,
    plan: {
      ...basePlan,
      carrier: 'eyemed',
      network: auth.network || undefined,
    },
    frequency: {
      exam: { count: 1, periodMonths: 12 },
      frame: { count: 1, periodMonths: 12 },
      lenses: { count: 1, periodMonths: 12 },
    },
    copays: {
      exam: examCopay,
      materials: materialsCopay,
      frameAllowance: frameAllowance,
      frameOverageDiscount: Number(auth.frameOverageDiscount) || 0.20,
      lensSv: Number(copaysData.lensSv) || 0,
      lensBifocal: Number(copaysData.lensBifocal) || 0,
      lensTrifocal: Number(copaysData.lensTrifocal) || 0,
      progressiveStandard: Number(copaysData.progressiveStandard) || 0,
      progressivePremiumTier1: Number(copaysData.progressivePremiumTier1) || 0,
      progressivePremiumTier2: Number(copaysData.progressivePremiumTier2) || 0,
      progressivePremiumTier3: Number(copaysData.progressivePremiumTier3) || 0,
      progressivePremiumTier4: Number(copaysData.progressivePremiumTier4) || 0,
      progressivePremiumTier5: Number(copaysData.progressivePremiumTier5) || 0,
      materialPolycarbonate: Number(copaysData.materialPolycarbonate) || 0,
      materialPolycarbonateChild: copaysData.materialPolycarbonateChild || 'covered',
      materialHighIndex: Number(copaysData.materialHighIndex) || 0,
      materialHighIndex167: Number(copaysData.materialHighIndex167) || 0,
      materialHighIndex174: Number(copaysData.materialHighIndex174) || 0,
      materialTrivex: Number(copaysData.materialTrivex) || 0,
      arStandard: Number(copaysData.arStandard) || 0,
      arPremiumTier1: Number(copaysData.arPremiumTier1) || 0,
      arPremiumTier2: Number(copaysData.arPremiumTier2) || 0,
      arPremiumTier3: Number(copaysData.arPremiumTier3) || 0,
      photochromic: Number(copaysData.photochromic) || 0,
      polarized: Number(copaysData.polarized) || 0,
      blueLightFilter: Number(copaysData.blueLightFilter) || 0,
      tint: Number(copaysData.tint) || 0,
      uvCoating: copaysData.uvCoating || 'covered',
      scratchCoating: copaysData.scratchCoating || 'covered',
      contactsConventional: Number(copaysData.contactsConventional) || undefined,
      contactsDisposable: Number(copaysData.contactsDisposable) || undefined,
      contactsMedicallyNecessary: Number(copaysData.contactsMedicallyNecessary) || undefined,
      clFitEligible: auth.clFitEligible !== false,
      clFitStandardCopay: auth.clFitStandardCopay !== null ? Number(auth.clFitStandardCopay) : 0,
      clFitPremiumCopay: auth.clFitPremiumCopay !== null ? Number(auth.clFitPremiumCopay) : 0,
    },
    specialRules: {
      polycarbonateFreeCbildAgeMax: 18,
      progressiveNonadaptPolicy: true,
      secondPairDiscount: copaysData.secondPairDiscount,
      blueLightIncludedInAr: copaysData.blueLightIncludedInAr,
    },
  }
}

/**
 * Convert to Spectera BenefitAuthorization
 */
function convertToSpecteraAuth(
  auth: any,
  patient: Patient,
  basePlan: Plan,
  copaysData: Record<string, any>
): SpecteraBenefitAuthorization {
  const examCopay = Number(auth.examCopay) || 0
  const frameAllowance = Number(auth.frameAllowance) || 0

  return {
    patient,
    plan: {
      ...basePlan,
      carrier: 'spectera',
    },
    frequency: {
      exam: { count: 1, periodMonths: 12 },
      frame: { count: 1, periodMonths: 24 },
      lenses: { count: 1, periodMonths: 12 },
    },
    copays: {
      examPediatric: examCopay,
      examMaternity: examCopay,
      examAdult: examCopay,
      frameAllowance: frameAllowance,
      frameOveragePercent: Number(auth.frameOveragePercent) || 0.70,
      lensStandard: Number(copaysData.lensStandard) || 0,
      progressiveTierI: Number(copaysData.progressiveTierI) || 0,
      progressiveTierII: Number(copaysData.progressiveTierII) || 0,
      progressiveTierIII: Number(copaysData.progressiveTierIII) || 0,
      progressiveTierIV: Number(copaysData.progressiveTierIV) || 0,
      progressiveTierV: Number(copaysData.progressiveTierV) || 0,
      materialPolycarbonateAdult: Number(copaysData.materialPolycarbonateAdult) || 0,
      materialPolycarbonateChild: copaysData.materialPolycarbonateChild || 'covered',
      materialHighIndex160166: Number(copaysData.materialHighIndex160166) || 0,
      materialHighIndex166173: Number(copaysData.materialHighIndex166173) || 0,
      materialTrivex: copaysData.materialTrivex,
      arTierI: Number(copaysData.arTierI) || 0,
      arTierII: Number(copaysData.arTierII) || 0,
      arTierIII: Number(copaysData.arTierIII) || 0,
      arTierIV: Number(copaysData.arTierIV) || 0,
      photochromic: Number(copaysData.photochromic) || 0,
      polarized: copaysData.polarized || 0,
      tint: Number(copaysData.tint) || 0,
      uvCoating: Number(copaysData.uvCoating) || 0,
      scratchCoating: copaysData.scratchCoating || 'covered',
      polishedEdges: Number(copaysData.polishedEdges) || 0,
    },
    specialRules: {
      polycarbonateFreeCbildAgeMax: 18,
      dilatedRetinalExamRequired: auth.dilatedRetinalExamRequired || false,
    },
  }
}

// =============================================================================
// UTILITY: Check if customer has valid authorization
// =============================================================================

export async function hasValidAuthorization(customerId: string): Promise<{
  hasAuth: boolean
  carrier?: CarrierType
  expiresAt?: Date
}> {
  const auth = await getActiveAuthorizationForCustomer(customerId)

  if (!auth) {
    return { hasAuth: false }
  }

  return {
    hasAuth: true,
    carrier: auth.carrier,
    expiresAt: auth.expirationDate ?? undefined,
  }
}
