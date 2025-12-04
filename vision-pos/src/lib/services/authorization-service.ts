/**
 * Unified Authorization Service
 *
 * Fetches authorization data from the database and converts to
 * BenefitAuthorization types for pricing calculations.
 *
 * This is the main entry point for getting patient authorization data.
 */

import { prisma } from '@/lib/prisma'
import { BenefitAuthorization } from '@/types/benefit-authorization'
import { convertToVspBenefitAuth, VspAuthorizationData, PatientData } from './vsp-authorization-service'
import { convertToEyemedBenefitAuth, EyemedAuthorizationData } from './eyemed-authorization-service'
import { convertToSpecteraBenefitAuth, SpecteraAuthorizationData } from './spectera-authorization-service'

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
  // Try to find active authorization from each carrier
  const [vspAuth, eyemedAuth, specteraAuth] = await Promise.all([
    getVspAuthorization(customerId),
    getEyemedAuthorization(customerId),
    getSpecteraAuthorization(customerId),
  ])

  // Return the most recently created active authorization
  const auths = [vspAuth, eyemedAuth, specteraAuth].filter(Boolean) as AuthorizationResult[]

  if (auths.length === 0) return null

  // Sort by most recent and return
  auths.sort((a, b) => {
    const dateA = a.authorization.plan.effectiveDate ?? ''
    const dateB = b.authorization.plan.effectiveDate ?? ''
    return dateB.localeCompare(dateA)
  })

  return auths[0]
}

/**
 * Get authorization for a specific carrier
 */
export async function getAuthorizationByCarrier(
  customerId: string,
  carrier: CarrierType
): Promise<AuthorizationResult | null> {
  switch (carrier) {
    case 'vsp':
      return getVspAuthorization(customerId)
    case 'eyemed':
      return getEyemedAuthorization(customerId)
    case 'spectera':
      return getSpecteraAuthorization(customerId)
    default:
      throw new Error(`Unknown carrier: ${carrier}`)
  }
}

/**
 * Get all authorizations for a customer (across all carriers)
 */
export async function getAllAuthorizationsForCustomer(
  customerId: string
): Promise<AuthorizationResult[]> {
  const [vspAuth, eyemedAuth, specteraAuth] = await Promise.all([
    getVspAuthorization(customerId),
    getEyemedAuthorization(customerId),
    getSpecteraAuthorization(customerId),
  ])

  return [vspAuth, eyemedAuth, specteraAuth].filter(Boolean) as AuthorizationResult[]
}

// =============================================================================
// CARRIER-SPECIFIC FETCH FUNCTIONS
// =============================================================================

async function getVspAuthorization(customerId: string): Promise<AuthorizationResult | null> {
  const auth = await prisma.vspAuthorization.findFirst({
    where: {
      customerId,
      isActive: true,
    },
    include: {
      lensEnhancementCopays: true,
    },
    orderBy: {
      authDate: 'desc',
    },
  })

  if (!auth) return null

  // Get customer data for patient info
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  })

  if (!customer) return null

  const patientData: PatientData = {
    firstName: customer.firstName,
    lastName: customer.lastName,
    dateOfBirth: customer.dateOfBirth,
    memberId: auth.authorizationNumber,
  }

  const authData: VspAuthorizationData = {
    id: auth.id,
    customerId: auth.customerId,
    authorizationNumber: auth.authorizationNumber,
    planName: auth.planName,
    planType: auth.planType,
    examCopay: auth.examCopay,
    materialsCopay: auth.materialsCopay,
    frameAllowanceRetail: auth.frameAllowanceRetail,
    frameAllowanceMarchon: auth.frameAllowanceMarchon,
    frameOverageDiscount: auth.frameOverageDiscount,
    contactAllowance: auth.contactAllowance,
    contactFittingCovered: auth.contactFittingCovered,
    authDate: auth.authDate,
    expirationDate: auth.expirationDate,
    serviceYear: auth.serviceYear,
    isActive: auth.isActive,
    lensEnhancementCopays: auth.lensEnhancementCopays.map(c => ({
      code: c.code,
      description: c.description,
      copaySingleVision: c.copaySingleVision,
      copayMultifocal: c.copayMultifocal,
      isAddonCode: c.isAddonCode,
      baseCode: c.baseCode,
    })),
  }

  return {
    authorization: convertToVspBenefitAuth(authData, patientData),
    authorizationId: auth.id,
    carrier: 'vsp',
    expirationDate: auth.expirationDate,
  }
}

async function getEyemedAuthorization(customerId: string): Promise<AuthorizationResult | null> {
  const auth = await prisma.eyemedAuthorization.findFirst({
    where: {
      customerId,
      isActive: true,
    },
    include: {
      arCoatingCopays: true,
      lensOptionCopays: true,
    },
    orderBy: {
      dateOfService: 'desc',
    },
  })

  if (!auth) return null

  // Get customer data for patient info
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  })

  const authData: EyemedAuthorizationData = {
    id: auth.id,
    customerId: auth.customerId,
    memberId: auth.memberId,
    memberName: auth.memberName,
    dateOfBirth: auth.dateOfBirth,
    network: auth.network,
    groupName: auth.groupName,
    groupNumber: auth.groupNumber,
    benefitLevel: auth.benefitLevel,
    examEligible: auth.examEligible,
    lensesEligible: auth.lensesEligible,
    frameEligible: auth.frameEligible,
    contactsEligible: auth.contactsEligible,
    clFitEligible: auth.clFitEligible,
    examCopay: auth.examCopay,
    retinalImagingMax: auth.retinalImagingMax,
    clFitStandardCopay: auth.clFitStandardCopay,
    clFitPremiumCopay: auth.clFitPremiumCopay,
    frameAllowance: auth.frameAllowance,
    frameOverageDiscount: auth.frameOverageDiscount,
    frameCopay: auth.frameCopay,
    singleVisionCopay: auth.singleVisionCopay,
    bifocalCopay: auth.bifocalCopay,
    trifocalCopay: auth.trifocalCopay,
    lenticularCopay: auth.lenticularCopay,
    progressiveStandardCopay: auth.progressiveStandardCopay,
    progressiveTier1Copay: auth.progressiveTier1Copay,
    progressiveTier2Copay: auth.progressiveTier2Copay,
    progressiveTier3Copay: auth.progressiveTier3Copay,
    progressiveTier4Copay: auth.progressiveTier4Copay,
    progressiveTier4CopayText: auth.progressiveTier4CopayText,
    progressiveTier5Copay: auth.progressiveTier5Copay,
    // Material copays from scanner
    polycarbonateAdultCopay: auth.polycarbonateAdultCopay,
    polycarbonateChildCopay: auth.polycarbonateChildCopay,
    trivexCopay: auth.trivexCopay,
    highIndex160Copay: auth.highIndex160Copay,
    highIndex167Copay: auth.highIndex167Copay,
    highIndex174Copay: auth.highIndex174Copay,
    // Enhancement copays from scanner
    photochromicCopay: auth.photochromicCopay,
    polarizedCopay: auth.polarizedCopay,
    blueLightFilterCopay: auth.blueLightFilterCopay,
    tintCopay: auth.tintCopay,
    mirrorCoatingCopay: auth.mirrorCoatingCopay,
    contactAllowance: auth.contactAllowance,
    contactConventionalOverage: auth.contactConventionalOverage,
    contactDisposableOverage: auth.contactDisposableOverage,
    contactMedicallyNecessary: auth.contactMedicallyNecessary,
    additionalGlassesAllowance: auth.additionalGlassesAllowance,
    additionalGlassesDiscount: auth.additionalGlassesDiscount,
    dateOfService: auth.dateOfService,
    expirationDate: auth.expirationDate,
    isActive: auth.isActive,
    arCoatingCopays: auth.arCoatingCopays.map(c => ({
      tier: c.tier,
      tierDescription: c.tierDescription,
      copay: c.copay,
    })),
    lensOptionCopays: auth.lensOptionCopays.map(c => ({
      optionName: c.optionName,
      copay: c.copay,
    })),
  }

  const patientData = customer ? {
    firstName: customer.firstName,
    lastName: customer.lastName,
    dateOfBirth: customer.dateOfBirth,
    memberId: auth.memberId,
    groupNumber: auth.groupNumber ?? undefined,
  } : undefined

  return {
    authorization: convertToEyemedBenefitAuth(authData, patientData),
    authorizationId: auth.id,
    carrier: 'eyemed',
    expirationDate: auth.expirationDate,
  }
}

async function getSpecteraAuthorization(customerId: string): Promise<AuthorizationResult | null> {
  const auth = await prisma.specteraAuthorization.findFirst({
    where: {
      customerId,
      isActive: true,
    },
    include: {
      arCoatingCopays: true,
      lensOptionCopays: true,
    },
    orderBy: {
      dateOfService: 'desc',
    },
  })

  if (!auth) return null

  // Get customer data for patient info
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  })

  const authData: SpecteraAuthorizationData = {
    id: auth.id,
    customerId: auth.customerId,
    subscriberId: auth.subscriberId,
    memberName: auth.memberName,
    dateOfBirth: auth.dateOfBirth,
    productName: auth.productName,
    examEligible: auth.examEligible,
    examFrequency: auth.examFrequency,
    maternityExamEligible: auth.maternityExamEligible,
    maternityExamFrequency: auth.maternityExamFrequency,
    pediatricExamEligible: auth.pediatricExamEligible,
    pediatricExamFrequency: auth.pediatricExamFrequency,
    frameEligible: auth.frameEligible,
    frameFrequency: auth.frameFrequency,
    lensesEligible: auth.lensesEligible,
    lensesFrequency: auth.lensesFrequency,
    selectionClDailyEligible: auth.selectionClDailyEligible,
    selectionClMonthlyEligible: auth.selectionClMonthlyEligible,
    nonSelectionClEligible: auth.nonSelectionClEligible,
    selectionClFitEligible: auth.selectionClFitEligible,
    nonSelectionClFitEligible: auth.nonSelectionClFitEligible,
    examCopay: auth.examCopay,
    maternityExamCopay: auth.maternityExamCopay,
    pediatricExamCopay: auth.pediatricExamCopay,
    selectionClFitCopay: auth.selectionClFitCopay,
    nonSelectionClFitCopay: auth.nonSelectionClFitCopay,
    frameAllowance: auth.frameAllowance,
    frameOveragePercent: auth.frameOveragePercent,
    standardLensCopay: auth.standardLensCopay,
    progressiveTier1Copay: auth.progressiveTier1Copay,
    progressiveTier2Copay: auth.progressiveTier2Copay,
    progressiveTier3Copay: auth.progressiveTier3Copay,
    progressiveTier4Copay: auth.progressiveTier4Copay,
    progressiveTier5Copay: auth.progressiveTier5Copay,
    progressiveNonFormularyCopay: auth.progressiveNonFormularyCopay,
    blendedBifocalsCopay: auth.blendedBifocalsCopay,
    freeformSvCopay: auth.freeformSvCopay,
    svAsphericCopay: auth.svAsphericCopay,
    mfAsphericCopay: auth.mfAsphericCopay,
    polycarbonate: auth.polycarbonate,
    polycarbonateAdultCopay: auth.polycarbonateAdultCopay,
    polycarbonateChildCopay: auth.polycarbonateChildCopay,
    trivexCopay: auth.trivexCopay,
    highIndex166: auth.highIndex166,
    highIndex167to173: auth.highIndex167to173,
    highIndex174Plus: auth.highIndex174Plus,
    highIndex174Copay: auth.highIndex174Copay,
    // Enhancement copays from scanner
    photochromicCopay: auth.photochromicCopay,
    polarizedCopay: auth.polarizedCopay,
    blueLightFilterCopay: auth.blueLightFilterCopay,
    tintCopay: auth.tintCopay,
    mirrorCoatingCopay: auth.mirrorCoatingCopay,
    selectionClDailyCopay: auth.selectionClDailyCopay,
    selectionClMonthlyCopay: auth.selectionClMonthlyCopay,
    nonSelectionClAllowance: auth.nonSelectionClAllowance,
    nonSelectionClOverage: auth.nonSelectionClOverage,
    necessaryClCopay: auth.necessaryClCopay,
    dateOfService: auth.dateOfService,
    expirationDate: auth.expirationDate,
    dilatedRetinalExamRequired: auth.dilatedRetinalExamRequired,
    isActive: auth.isActive,
    arCoatingCopays: auth.arCoatingCopays.map(c => ({
      tier: c.tier,
      copay: c.copay,
    })),
    lensOptionCopays: auth.lensOptionCopays.map(c => ({
      optionName: c.optionName,
      copay: c.copay,
    })),
  }

  const patientData = customer ? {
    firstName: customer.firstName,
    lastName: customer.lastName,
    dateOfBirth: customer.dateOfBirth,
    memberId: auth.subscriberId,
  } : undefined

  return {
    authorization: convertToSpecteraBenefitAuth(authData, patientData),
    authorizationId: auth.id,
    carrier: 'spectera',
    expirationDate: auth.expirationDate,
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
