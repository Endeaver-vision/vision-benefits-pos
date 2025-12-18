/**
 * Authorization Intake API
 *
 * Receives extracted insurance data from the insurance-doc-scanner
 * and stores it in the appropriate carrier-specific authorization tables.
 *
 * Flow:
 * 1. Scanner extracts data from PDF → ExtractedInsuranceData
 * 2. Scanner POSTs to this endpoint
 * 3. This endpoint determines carrier and maps to Prisma model
 * 4. Authorization stored in VspAuthorization, EyemedAuthorization, or SpecteraAuthorization
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// =============================================================================
// TYPES - Match the insurance-doc-scanner ExtractedInsuranceData structure
// =============================================================================

interface FieldWithConfidence<T> {
  value: T
  confidence: number
}

interface ExtractedInsuranceData {
  patient: {
    patientName: FieldWithConfidence<string>
    memberName: FieldWithConfidence<string>
    authNumber: FieldWithConfidence<string>
    relationship: FieldWithConfidence<string>
    patientBirthDate: FieldWithConfidence<string | null>
    authEffectiveDate: FieldWithConfidence<string | null>
    authExpirationDate: FieldWithConfidence<string | null>
  }
  eligibility: {
    examProfServices: FieldWithConfidence<string | null>
    lens: FieldWithConfidence<string | null>
    frame: FieldWithConfidence<string | null>
    contacts: FieldWithConfidence<string | null>
    frequency: {
      examFrequency: FieldWithConfidence<string | null>
      lensFrequency: FieldWithConfidence<string | null>
      frameFrequency: FieldWithConfidence<string | null>
      contactsFrequency: FieldWithConfidence<string | null>
    }
  }
  plan: {
    carrier: FieldWithConfidence<string | null>
    benefitPlanName: FieldWithConfidence<string | null>
    clientName: FieldWithConfidence<string | null>
    networkLabRequirement: FieldWithConfidence<string | null>
    essentialMedicalEyeCareExamCopay: FieldWithConfidence<number | null>
  }
  copays: {
    examCopay: FieldWithConfidence<number | null>
    materialsCopay: FieldWithConfidence<number | null>
    routineRetinalScreening: FieldWithConfidence<string | null>
  }
  frame: {
    promotions: {
      extraFramePromotion: FieldWithConfidence<number | null>
    }
    allowances: {
      altairMarchonFrameAllowance: {
        allowance: number | null
        overageDiscount: number | null
        confidence: number
      }
      nonAltairMarchonFrameAllowance: {
        allowance: number | null
        overageDiscount: number | null
        confidence: number
      }
    }
  }
  contacts: {
    clExamDiscount: FieldWithConfidence<string | null>
    clExamAndMaterialsAllowance: FieldWithConfidence<number | null>
    clExamOnlyPatientPaysOver: FieldWithConfidence<number | null>
    contactsInsteadOfGlasses: FieldWithConfidence<boolean | null>
    nextFrameAvailableDate: FieldWithConfidence<string | null>
    necessaryCl: {
      necessaryClCopay: FieldWithConfidence<number | null>
    }
  }
  valueAdded: {
    additionalPairDiscount: FieldWithConfidence<number | null>
    clExam12MonthsDiscount: FieldWithConfidence<number | null>
  }
  overallConfidence: number
  notes: string
}

// Lens enhancement charges from VSP - separate document
interface VspLensEnhancement {
  code: string
  description: string
  copaySingleVision: number | null
  copayMultifocal: number | null
  isAddonCode?: boolean
  baseCode?: string
}

// EyeMed-specific copay data
interface EyemedCopayData {
  progressiveStandardCopay?: number
  progressiveTier1Copay?: number
  progressiveTier2Copay?: number
  progressiveTier3Copay?: number
  progressiveTier4Copay?: string
  singleVisionCopay?: number
  bifocalCopay?: number
  trifocalCopay?: number
  arCoatingCopays?: Array<{ tier: string; tierDescription?: string; copay: string }>
  lensOptionCopays?: Array<{ optionName: string; copay: string }>
}

// Spectera-specific copay data
interface SpecteraCopayData {
  standardLensCopay?: number
  progressiveTier1Copay?: number
  progressiveTier2Copay?: number
  progressiveTier3Copay?: number
  progressiveTier4Copay?: number
  progressiveTier5Copay?: number
  arCoatingCopays?: Array<{ tier: string; copay: string }>
  lensOptionCopays?: Array<{ optionName: string; copay: string }>
}

// Request body type
interface IntakeRequest {
  customerId: string
  carrier: 'vsp' | 'eyemed' | 'spectera'
  extractedData: ExtractedInsuranceData
  // Carrier-specific extensions
  vspLensEnhancements?: VspLensEnhancement[]
  eyemedCopays?: EyemedCopayData
  specteraCopays?: SpecteraCopayData
  // Source document info
  documentId?: string
  sourceFileName?: string
}

interface IntakeResponse {
  success: boolean
  authorizationId?: string
  carrier?: string
  customerId?: string
  error?: string
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: IntakeRequest = await request.json()

    // Validate required fields
    if (!body.customerId) {
      return NextResponse.json<IntakeResponse>(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    if (!body.carrier) {
      return NextResponse.json<IntakeResponse>(
        { success: false, error: 'Carrier is required (vsp, eyemed, or spectera)' },
        { status: 400 }
      )
    }

    if (!body.extractedData) {
      return NextResponse.json<IntakeResponse>(
        { success: false, error: 'Extracted data is required' },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId }
    })

    if (!customer) {
      return NextResponse.json<IntakeResponse>(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Deactivate any existing active authorizations for this customer/carrier
    await deactivateExistingAuthorizations(body.customerId, body.carrier)

    // Create authorization based on carrier
    let authorizationId: string

    switch (body.carrier) {
      case 'vsp':
        authorizationId = await createVspAuthorization(body)
        break
      case 'eyemed':
        authorizationId = await createEyemedAuthorization(body)
        break
      case 'spectera':
        authorizationId = await createSpecteraAuthorization(body)
        break
      default:
        return NextResponse.json<IntakeResponse>(
          { success: false, error: `Unknown carrier: ${body.carrier}` },
          { status: 400 }
        )
    }

    return NextResponse.json<IntakeResponse>({
      success: true,
      authorizationId,
      carrier: body.carrier,
      customerId: body.customerId,
    })

  } catch (error) {
    console.error('Authorization intake error:', error)
    return NextResponse.json<IntakeResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process authorization',
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function deactivateExistingAuthorizations(customerId: string, carrier: string) {
  switch (carrier) {
    case 'vsp':
      await prisma.vspAuthorization.updateMany({
        where: { customerId, isActive: true },
        data: { isActive: false }
      })
      break
    case 'eyemed':
      await prisma.eyemedAuthorization.updateMany({
        where: { customerId, isActive: true },
        data: { isActive: false }
      })
      break
    case 'spectera':
      await prisma.specteraAuthorization.updateMany({
        where: { customerId, isActive: true },
        data: { isActive: false }
      })
      break
  }
}

async function createVspAuthorization(body: IntakeRequest): Promise<string> {
  const data = body.extractedData

  // Determine plan type from plan name
  const planName = data.plan.benefitPlanName?.value ?? 'VSP Vision'
  const planType = determinePlanType(planName)

  const auth = await prisma.vspAuthorization.create({
    data: {
      customerId: body.customerId,
      authorizationNumber: data.patient.authNumber?.value ?? `VSP-${Date.now()}`,
      planName,
      planType,
      examCopay: data.copays.examCopay?.value,
      materialsCopay: data.copays.materialsCopay?.value,
      frameAllowanceRetail: data.frame.allowances.nonAltairMarchonFrameAllowance?.allowance,
      frameAllowanceMarchon: data.frame.allowances.altairMarchonFrameAllowance?.allowance,
      frameOverageDiscount: data.frame.allowances.nonAltairMarchonFrameAllowance?.overageDiscount,
      contactAllowance: data.contacts.clExamAndMaterialsAllowance?.value,
      contactFittingCovered: true, // Typically covered for VSP
      authDate: data.patient.authEffectiveDate?.value
        ? new Date(data.patient.authEffectiveDate.value)
        : new Date(),
      expirationDate: data.patient.authExpirationDate?.value
        ? new Date(data.patient.authExpirationDate.value)
        : null,
      serviceYear: new Date().getFullYear(),
      isActive: true,
      rawPatientReport: data as object,
      // Create lens enhancement copays if provided
      lensEnhancementCopays: body.vspLensEnhancements ? {
        create: body.vspLensEnhancements.map(le => ({
          code: le.code,
          description: le.description,
          copaySingleVision: le.copaySingleVision,
          copayMultifocal: le.copayMultifocal,
          isAddonCode: le.isAddonCode ?? false,
          baseCode: le.baseCode,
        }))
      } : undefined,
    }
  })

  return auth.id
}

async function createEyemedAuthorization(body: IntakeRequest): Promise<string> {
  const data = body.extractedData
  const copays = body.eyemedCopays ?? {}

  const auth = await prisma.eyemedAuthorization.create({
    data: {
      customerId: body.customerId,
      memberId: data.patient.authNumber?.value ?? `EYEMED-${Date.now()}`,
      memberName: data.patient.patientName?.value ?? '',
      dateOfBirth: data.patient.patientBirthDate?.value
        ? new Date(data.patient.patientBirthDate.value)
        : null,
      network: data.plan.networkLabRequirement?.value ?? null,
      groupName: data.plan.benefitPlanName?.value ?? 'EyeMed Vision',
      groupNumber: null,
      benefitLevel: null,

      // Eligibility
      examEligible: data.eligibility.examProfServices?.value === 'YES' || data.eligibility.examProfServices?.value === 'Yes',
      lensesEligible: data.eligibility.lens?.value === 'YES' || data.eligibility.lens?.value === 'Yes',
      frameEligible: data.eligibility.frame?.value === 'YES' || data.eligibility.frame?.value === 'Yes',
      contactsEligible: data.eligibility.contacts?.value === 'YES' || data.eligibility.contacts?.value === 'Yes',
      clFitEligible: true,

      // Copays
      examCopay: data.copays.examCopay?.value,
      retinalImagingMax: parseFloat(data.copays.routineRetinalScreening?.value?.replace(/[^0-9.]/g, '') ?? '39'),

      // Frame
      frameAllowance: data.frame.allowances.altairMarchonFrameAllowance?.allowance
        ?? data.frame.allowances.nonAltairMarchonFrameAllowance?.allowance,
      frameOverageDiscount: data.frame.allowances.altairMarchonFrameAllowance?.overageDiscount
        ?? data.frame.allowances.nonAltairMarchonFrameAllowance?.overageDiscount,
      frameCopay: 0,

      // Lens copays - NO DEFAULTS
      singleVisionCopay: copays.singleVisionCopay ?? null,
      bifocalCopay: copays.bifocalCopay ?? null,
      trifocalCopay: copays.trifocalCopay ?? null,

      // Progressive copays - NO DEFAULTS
      progressiveStandardCopay: copays.progressiveStandardCopay ?? null,
      progressiveTier1Copay: copays.progressiveTier1Copay ?? null,
      progressiveTier2Copay: copays.progressiveTier2Copay ?? null,
      progressiveTier3Copay: copays.progressiveTier3Copay ?? null,
      progressiveTier4Copay: copays.progressiveTier4Copay ?? null,

      // Contacts
      contactAllowance: data.contacts.clExamAndMaterialsAllowance?.value,

      // Additional glasses
      additionalGlassesAllowance: null,
      additionalGlassesDiscount: data.valueAdded.additionalPairDiscount?.value
        ? `${data.valueAdded.additionalPairDiscount.value}%`
        : null,

      // Dates
      dateOfService: data.patient.authEffectiveDate?.value
        ? new Date(data.patient.authEffectiveDate.value)
        : new Date(),
      expirationDate: data.patient.authExpirationDate?.value
        ? new Date(data.patient.authExpirationDate.value)
        : null,
      isActive: true,

      // AR coating copays
      arCoatingCopays: copays.arCoatingCopays ? {
        create: copays.arCoatingCopays.map(ar => ({
          tier: ar.tier,
          tierDescription: ar.tierDescription ?? null,
          copay: ar.copay,
        }))
      } : undefined,

      // Lens option copays
      lensOptionCopays: copays.lensOptionCopays ? {
        create: copays.lensOptionCopays.map(opt => ({
          optionName: opt.optionName,
          copay: opt.copay,
        }))
      } : undefined,
    }
  })

  return auth.id
}

async function createSpecteraAuthorization(body: IntakeRequest): Promise<string> {
  const data = body.extractedData
  const copays = body.specteraCopays ?? {}

  const auth = await prisma.specteraAuthorization.create({
    data: {
      customerId: body.customerId,
      subscriberId: data.patient.authNumber?.value ?? `SPECTERA-${Date.now()}`,
      memberName: data.patient.patientName?.value ?? '',
      dateOfBirth: data.patient.patientBirthDate?.value
        ? new Date(data.patient.patientBirthDate.value)
        : null,
      productName: data.plan.benefitPlanName?.value ?? 'Spectera Vision',

      // Eligibility
      examEligible: data.eligibility.examProfServices?.value === 'YES' || data.eligibility.examProfServices?.value === 'Yes',
      examFrequency: data.eligibility.frequency.examFrequency?.value,
      maternityExamEligible: false,
      maternityExamFrequency: null,
      pediatricExamEligible: false,
      pediatricExamFrequency: null,
      frameEligible: data.eligibility.frame?.value === 'YES' || data.eligibility.frame?.value === 'Yes',
      frameFrequency: data.eligibility.frequency.frameFrequency?.value,
      lensesEligible: data.eligibility.lens?.value === 'YES' || data.eligibility.lens?.value === 'Yes',
      lensesFrequency: data.eligibility.frequency.lensFrequency?.value,

      // Contact lens eligibility
      selectionClDailyEligible: data.eligibility.contacts?.value === 'YES' || data.eligibility.contacts?.value === 'Yes',
      selectionClMonthlyEligible: data.eligibility.contacts?.value === 'YES' || data.eligibility.contacts?.value === 'Yes',
      nonSelectionClEligible: true,
      selectionClFitEligible: true,
      nonSelectionClFitEligible: true,

      // Copays
      examCopay: data.copays.examCopay?.value,

      // Frame
      frameAllowance: data.frame.allowances.nonAltairMarchonFrameAllowance?.allowance
        ?? data.frame.allowances.altairMarchonFrameAllowance?.allowance,
      frameOveragePercent: null, // NO DEFAULT - must be extracted from document

      // Lens copays - NO DEFAULTS
      standardLensCopay: copays.standardLensCopay ?? null,
      progressiveTier1Copay: copays.progressiveTier1Copay,
      progressiveTier2Copay: copays.progressiveTier2Copay,
      progressiveTier3Copay: copays.progressiveTier3Copay,
      progressiveTier4Copay: copays.progressiveTier4Copay,
      progressiveTier5Copay: copays.progressiveTier5Copay,

      // Contacts
      nonSelectionClAllowance: data.contacts.clExamAndMaterialsAllowance?.value,

      // Dates
      dateOfService: data.patient.authEffectiveDate?.value
        ? new Date(data.patient.authEffectiveDate.value)
        : new Date(),
      expirationDate: data.patient.authExpirationDate?.value
        ? new Date(data.patient.authExpirationDate.value)
        : null,
      dilatedRetinalExamRequired: false,
      isActive: true,

      // AR coating copays
      arCoatingCopays: copays.arCoatingCopays ? {
        create: copays.arCoatingCopays.map(ar => ({
          tier: ar.tier,
          copay: ar.copay,
        }))
      } : undefined,

      // Lens option copays
      lensOptionCopays: copays.lensOptionCopays ? {
        create: copays.lensOptionCopays.map(opt => ({
          optionName: opt.optionName,
          copay: opt.copay,
        }))
      } : undefined,
    }
  })

  return auth.id
}

function determinePlanType(planName: string): 'SIGNATURE' | 'CHOICE' | 'ADVANTAGE' | 'ENHANCED_ADVANTAGE' | 'ESSENTIALS' {
  const lower = planName.toLowerCase()
  if (lower.includes('signature')) return 'SIGNATURE'
  if (lower.includes('choice')) return 'CHOICE'
  if (lower.includes('enhanced') && lower.includes('advantage')) return 'ENHANCED_ADVANTAGE'
  if (lower.includes('advantage')) return 'ADVANTAGE'
  if (lower.includes('essential')) return 'ESSENTIALS'
  return 'CHOICE' // Default
}

// =============================================================================
// GET - Retrieve authorizations for a customer
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')
  const carrier = searchParams.get('carrier')

  if (!customerId) {
    return NextResponse.json(
      { success: false, error: 'Customer ID is required' },
      { status: 400 }
    )
  }

  try {
    const authorizations = []

    if (!carrier || carrier === 'vsp') {
      const vspAuths = await prisma.vspAuthorization.findMany({
        where: { customerId, isActive: true },
        include: { lensEnhancementCopays: true },
        orderBy: { authDate: 'desc' },
      })
      authorizations.push(...vspAuths.map(a => ({ ...a, carrier: 'vsp' })))
    }

    if (!carrier || carrier === 'eyemed') {
      const eyemedAuths = await prisma.eyemedAuthorization.findMany({
        where: { customerId, isActive: true },
        include: { arCoatingCopays: true, lensOptionCopays: true },
        orderBy: { dateOfService: 'desc' },
      })
      authorizations.push(...eyemedAuths.map(a => ({ ...a, carrier: 'eyemed' })))
    }

    if (!carrier || carrier === 'spectera') {
      const specteraAuths = await prisma.specteraAuthorization.findMany({
        where: { customerId, isActive: true },
        include: { arCoatingCopays: true, lensOptionCopays: true },
        orderBy: { dateOfService: 'desc' },
      })
      authorizations.push(...specteraAuths.map(a => ({ ...a, carrier: 'spectera' })))
    }

    return NextResponse.json({
      success: true,
      authorizations,
    })

  } catch (error) {
    console.error('Get authorizations error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve authorizations' },
      { status: 500 }
    )
  }
}
