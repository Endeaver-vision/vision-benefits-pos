/**
 * Authorization Sync Script
 *
 * Syncs verified insurance documents from the scanner database
 * to the vision-pos authorization tables.
 *
 * Features:
 * - Pulls only verified documents
 * - Deduplicates based on auth number
 * - Handles all three carriers (VSP, EyeMed, Spectera)
 * - Full audit trail with logging
 * - Idempotent - safe to run multiple times
 * - Dry-run mode for testing
 *
 * Usage:
 *   npx tsx scripts/sync-authorizations.ts              # Normal run
 *   npx tsx scripts/sync-authorizations.ts --dry-run    # Preview only
 *   npx tsx scripts/sync-authorizations.ts --force      # Re-sync all (even already synced)
 *   npx tsx scripts/sync-authorizations.ts --customer=xxx  # Sync specific customer
 */

import { prisma } from '../src/lib/prisma'

// Both scanner and POS use the same Supabase database
// Scanner tables: insurance_documents, insurance_cases, customers
// POS tables: vsp_authorizations, eyemed_authorizations, spectera_authorizations

// =============================================================================
// TYPES
// =============================================================================

interface SyncOptions {
  dryRun: boolean
  force: boolean
  customerId?: string
  verbose: boolean
}

interface SyncResult {
  total: number
  synced: number
  skipped: number
  errors: number
  details: SyncDetail[]
}

interface SyncDetail {
  documentId: string
  fileName: string
  carrier: string
  customerId: string | null
  authNumber: string | null
  status: 'synced' | 'skipped' | 'error'
  reason?: string
  authorizationId?: string
}

interface ExtractedData {
  patient: {
    patientName: { value: string; confidence: number }
    memberName: { value: string; confidence: number }
    authNumber: { value: string; confidence: number }
    relationship: { value: string; confidence: number }
    patientBirthDate: { value: string | null; confidence: number }
    authEffectiveDate: { value: string | null; confidence: number }
    authExpirationDate: { value: string | null; confidence: number }
  }
  eligibility: {
    examProfServices: { value: string | null; confidence: number }
    lens: { value: string | null; confidence: number }
    frame: { value: string | null; confidence: number }
    contacts: { value: string | null; confidence: number }
    frequency: {
      examFrequency: { value: string | null; confidence: number }
      lensFrequency: { value: string | null; confidence: number }
      frameFrequency: { value: string | null; confidence: number }
      contactsFrequency: { value: string | null; confidence: number }
    }
  }
  plan: {
    carrier: { value: string | null; confidence: number }
    benefitPlanName: { value: string | null; confidence: number }
    clientName: { value: string | null; confidence: number }
    networkLabRequirement: { value: string | null; confidence: number }
  }
  copays: {
    examCopay: { value: number | null; confidence: number }
    materialsCopay: { value: number | null; confidence: number }
    routineRetinalScreening: { value: string | null; confidence: number }
  }
  frame: {
    promotions: {
      extraFramePromotion: { value: number | null; confidence: number }
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
    clExamDiscount: { value: string | null; confidence: number }
    clExamAndMaterialsAllowance: { value: number | null; confidence: number }
    contactsInsteadOfGlasses: { value: boolean | null; confidence: number }
    necessaryCl: {
      necessaryClCopay: { value: number | null; confidence: number }
    }
  }
  valueAdded: {
    additionalPairDiscount: { value: number | null; confidence: number }
    clExam12MonthsDiscount: { value: number | null; confidence: number }
  }
  overallConfidence: number
  notes: string
}

// =============================================================================
// MAIN SYNC FUNCTION
// =============================================================================

async function syncAuthorizations(options: SyncOptions): Promise<SyncResult> {
  const result: SyncResult = {
    total: 0,
    synced: 0,
    skipped: 0,
    errors: 0,
    details: []
  }

  console.log('='.repeat(70))
  console.log('Authorization Sync')
  console.log('='.repeat(70))
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`)
  console.log(`Force: ${options.force ? 'Yes (re-sync all)' : 'No (skip existing)'}`)
  if (options.customerId) console.log(`Customer: ${options.customerId}`)
  console.log('')

  try {
    // Build query conditions
    const whereConditions: any = {
      isVerified: true,
      gptStatus: 'completed',
      extractedData: { not: null }
    }

    if (options.customerId) {
      whereConditions.customerId = options.customerId
    }

    // Fetch verified documents from scanner
    console.log('Fetching verified documents from scanner...')
    const documents = await prisma.insuranceDocument.findMany({
      where: whereConditions,
      include: {
        customer: true
      },
      orderBy: { verifiedAt: 'desc' }
    })

    result.total = documents.length
    console.log(`Found ${documents.length} verified documents\n`)

    if (documents.length === 0) {
      console.log('No documents to sync.')
      return result
    }

    // Process each document
    for (const doc of documents) {
      const detail: SyncDetail = {
        documentId: doc.id,
        fileName: doc.fileName,
        carrier: doc.carrier ?? 'unknown',
        customerId: doc.customerId,
        authNumber: null,
        status: 'skipped'
      }

      try {
        // Validate document has required data
        if (!doc.extractedData) {
          detail.status = 'skipped'
          detail.reason = 'No extracted data'
          result.skipped++
          result.details.push(detail)
          continue
        }

        if (!doc.customerId) {
          detail.status = 'skipped'
          detail.reason = 'No customer ID'
          result.skipped++
          result.details.push(detail)
          continue
        }

        // Verify customer exists in POS database
        const posCustomer = await prisma.customer.findUnique({
          where: { id: doc.customerId }
        })

        if (!posCustomer) {
          detail.status = 'skipped'
          detail.reason = 'Customer not found in POS database'
          result.skipped++
          result.details.push(detail)
          continue
        }

        const extractedData = doc.extractedData as unknown as ExtractedData
        const carrier = detectCarrier(doc.carrier, extractedData)
        detail.carrier = carrier
        detail.authNumber = extractedData.patient?.authNumber?.value ?? null

        if (!carrier || carrier === 'unknown') {
          detail.status = 'skipped'
          detail.reason = 'Could not determine carrier'
          result.skipped++
          result.details.push(detail)
          continue
        }

        // Check if already synced (unless force mode)
        if (!options.force) {
          const existing = await checkExistingAuth(doc.customerId, carrier, detail.authNumber)
          if (existing) {
            detail.status = 'skipped'
            detail.reason = `Already exists: ${existing}`
            detail.authorizationId = existing
            result.skipped++
            result.details.push(detail)
            continue
          }
        }

        // For VSP, look for linked lens enhancement document
        let linkedLensDoc: { ocrText: string } | null = null
        if (carrier === 'vsp' && detail.authNumber) {
          // Find lens enhancement doc with same auth number
          const lensDoc = await prisma.insuranceDocument.findFirst({
            where: {
              customerId: doc.customerId,
              carrier: 'VSP',
              rawOcrText: { contains: detail.authNumber },
              id: { not: doc.id }, // Different document
            },
            select: { rawOcrText: true }
          })
          if (lensDoc?.rawOcrText) {
            linkedLensDoc = { ocrText: lensDoc.rawOcrText }
          }
        }

        // Create authorization
        if (options.dryRun) {
          detail.status = 'synced'
          detail.reason = `Would create (dry run)${linkedLensDoc ? ' + lens enhancements' : ''}`
          result.synced++
        } else {
          const authId = await createAuthorization(
            doc.customerId,
            carrier,
            extractedData,
            doc.rawOcrText ?? undefined,
            linkedLensDoc
          )
          detail.status = 'synced'
          detail.authorizationId = authId
          result.synced++
        }

        result.details.push(detail)

      } catch (error) {
        detail.status = 'error'
        detail.reason = error instanceof Error ? error.message : 'Unknown error'
        result.errors++
        result.details.push(detail)
      }
    }

    // Print summary
    printSummary(result, options)

    return result

  } finally {
    await prisma.$disconnect()
    await prisma.$disconnect()
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function detectCarrier(docCarrier: string | null, data: ExtractedData): string {
  // First check document-level carrier
  if (docCarrier) {
    const lower = docCarrier.toLowerCase()
    if (lower.includes('vsp')) return 'vsp'
    if (lower.includes('eyemed')) return 'eyemed'
    if (lower.includes('spectera')) return 'spectera'
  }

  // Then check extracted data
  const planCarrier = data.plan?.carrier?.value?.toLowerCase() ?? ''
  const planName = data.plan?.benefitPlanName?.value?.toLowerCase() ?? ''

  if (planCarrier.includes('vsp') || planName.includes('vsp')) return 'vsp'
  if (planCarrier.includes('eyemed') || planName.includes('eyemed')) return 'eyemed'
  if (planCarrier.includes('spectera') || planName.includes('spectera')) return 'spectera'

  // Check for VSP-specific fields
  if (data.frame?.allowances?.altairMarchonFrameAllowance?.allowance) return 'vsp'

  return 'unknown'
}

async function checkExistingAuth(
  customerId: string,
  carrier: string,
  authNumber: string | null
): Promise<string | null> {
  switch (carrier) {
    case 'vsp': {
      const existing = await prisma.vspAuthorization.findFirst({
        where: authNumber
          ? { customerId, authorizationNumber: authNumber }
          : { customerId, isActive: true }
      })
      return existing?.id ?? null
    }
    case 'eyemed': {
      const existing = await prisma.eyemedAuthorization.findFirst({
        where: authNumber
          ? { customerId, memberId: authNumber }
          : { customerId, isActive: true }
      })
      return existing?.id ?? null
    }
    case 'spectera': {
      const existing = await prisma.specteraAuthorization.findFirst({
        where: authNumber
          ? { customerId, subscriberId: authNumber }
          : { customerId, isActive: true }
      })
      return existing?.id ?? null
    }
    default:
      return null
  }
}

async function createAuthorization(
  customerId: string,
  carrier: string,
  data: ExtractedData,
  ocrText?: string,
  linkedLensDoc?: { ocrText: string } | null
): Promise<string> {
  // Deactivate existing authorizations for this customer/carrier
  await deactivateExisting(customerId, carrier)

  // For VSP, combine OCR text from auth doc and linked lens enhancement doc
  const vspOcrText = carrier === 'vsp'
    ? [ocrText, linkedLensDoc?.ocrText].filter(Boolean).join('\n')
    : undefined

  switch (carrier) {
    case 'vsp':
      return createVspAuth(customerId, data, vspOcrText)
    case 'eyemed':
      return createEyemedAuth(customerId, data)
    case 'spectera':
      return createSpecteraAuth(customerId, data)
    default:
      throw new Error(`Unknown carrier: ${carrier}`)
  }
}

async function deactivateExisting(customerId: string, carrier: string): Promise<void> {
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

async function createVspAuth(customerId: string, data: ExtractedData, ocrText?: string): Promise<string> {
  const planName = data.plan?.benefitPlanName?.value ?? 'VSP Vision'
  const authNumber = data.patient?.authNumber?.value ?? `VSP-${Date.now()}`

  // Parse lens enhancement copays from OCR text if available
  const lensEnhancements = ocrText ? parseVspLensEnhancements(ocrText) : []

  const auth = await prisma.vspAuthorization.create({
    data: {
      customerId,
      authorizationNumber: authNumber,
      planName,
      planType: determinePlanType(planName),
      examCopay: data.copays?.examCopay?.value ?? null,
      materialsCopay: data.copays?.materialsCopay?.value ?? null,
      frameAllowanceRetail: data.frame?.allowances?.nonAltairMarchonFrameAllowance?.allowance ?? null,
      frameAllowanceMarchon: data.frame?.allowances?.altairMarchonFrameAllowance?.allowance ?? null,
      frameOverageDiscount: data.frame?.allowances?.nonAltairMarchonFrameAllowance?.overageDiscount ?? null,
      contactAllowance: data.contacts?.clExamAndMaterialsAllowance?.value ?? null,
      contactFittingCovered: true,
      authDate: data.patient?.authEffectiveDate?.value
        ? new Date(data.patient.authEffectiveDate.value)
        : new Date(),
      expirationDate: data.patient?.authExpirationDate?.value
        ? new Date(data.patient.authExpirationDate.value)
        : null,
      serviceYear: new Date().getFullYear(),
      isActive: true,
      rawPatientReport: data as object,
      rawLensEnhancements: lensEnhancements.length > 0 ? lensEnhancements : undefined,
      // Create lens enhancement copays
      lensEnhancementCopays: lensEnhancements.length > 0 ? {
        create: lensEnhancements
      } : undefined,
    }
  })

  return auth.id
}

/**
 * Parse VSP lens enhancement copays from OCR text
 * Extracts codes like "KA - Progressive K Plastic $55" or "QV - Anti-Reflective D $85$85"
 */
function parseVspLensEnhancements(ocrText: string): Array<{
  code: string
  description: string
  copaySingleVision: number | null
  copayMultifocal: number | null
  isAddonCode: boolean
  baseCode: string | null
}> {
  const enhancements: Array<{
    code: string
    description: string
    copaySingleVision: number | null
    copayMultifocal: number | null
    isAddonCode: boolean
    baseCode: string | null
  }> = []

  // Pattern: CODE - Description $SV$MF or $MF (for multifocal-only like progressives)
  // Examples:
  // "KA - Progressive K Plastic\n$55" -> code: KA, multifocal: 55
  // "QV - Anti-Reflective D\n$85$85" -> code: QV, sv: 85, mf: 85
  // "AD - Polycarbonate\n$35$35" -> code: AD, sv: 35, mf: 35

  const codePattern = /([A-Z]{2})\s*[-–]\s*([^$\n]+?)[\n\s]*\$(\d+)(?:\$(\d+))?/g
  let match

  while ((match = codePattern.exec(ocrText)) !== null) {
    const code = match[1]
    const description = match[2].trim()
    const price1 = parseInt(match[3], 10)
    const price2 = match[4] ? parseInt(match[4], 10) : null

    // Determine if this is single vision, multifocal, or both
    let copaySingleVision: number | null = null
    let copayMultifocal: number | null = null

    // Progressive lenses (K, F, J, N, O categories) are multifocal only
    const isProgressiveCode = /^[KFJNO][A-Z]$/.test(code)
    // Near variable focus (I codes) are also multifocal
    const isNearVariable = /^I[A-Z]$/.test(code)

    if (isProgressiveCode || isNearVariable) {
      copayMultifocal = price1
    } else if (price2 !== null) {
      // Two prices: first is SV, second is MF
      copaySingleVision = price1
      copayMultifocal = price2
    } else {
      // Single price applies to both
      copaySingleVision = price1
      copayMultifocal = price1
    }

    // Determine if this is an add-on code (second letter is D, B, H, J, P for material/progressive add-ons)
    const isAddonCode = /^[FKJNO][DBHJP]$/.test(code) || /^[AB][DBHJ]$/.test(code)
    const baseCode = isAddonCode ? code[0] + 'A' : null

    enhancements.push({
      code,
      description,
      copaySingleVision,
      copayMultifocal,
      isAddonCode,
      baseCode,
    })
  }

  return enhancements
}

async function createEyemedAuth(customerId: string, data: ExtractedData): Promise<string> {
  const auth = await prisma.eyemedAuthorization.create({
    data: {
      customerId,
      memberId: data.patient?.authNumber?.value ?? `EYEMED-${Date.now()}`,
      memberName: data.patient?.patientName?.value ?? '',
      dateOfBirth: data.patient?.patientBirthDate?.value
        ? new Date(data.patient.patientBirthDate.value)
        : null,
      network: data.plan?.networkLabRequirement?.value ?? null,
      groupName: data.plan?.benefitPlanName?.value ?? 'EyeMed Vision',
      groupNumber: null,
      benefitLevel: null,
      examEligible: isEligible(data.eligibility?.examProfServices?.value),
      lensesEligible: isEligible(data.eligibility?.lens?.value),
      frameEligible: isEligible(data.eligibility?.frame?.value),
      contactsEligible: isEligible(data.eligibility?.contacts?.value),
      clFitEligible: true,
      examCopay: data.copays?.examCopay?.value ?? null,
      retinalImagingMax: parseRetinalImaging(data.copays?.routineRetinalScreening?.value),
      frameAllowance: data.frame?.allowances?.altairMarchonFrameAllowance?.allowance
        ?? data.frame?.allowances?.nonAltairMarchonFrameAllowance?.allowance ?? null,
      frameOverageDiscount: data.frame?.allowances?.altairMarchonFrameAllowance?.overageDiscount
        ?? data.frame?.allowances?.nonAltairMarchonFrameAllowance?.overageDiscount ?? null,
      frameCopay: 0,
      singleVisionCopay: 0,
      bifocalCopay: 0,
      trifocalCopay: 0,
      progressiveStandardCopay: 0,
      progressiveTier1Copay: 0,
      progressiveTier2Copay: 0,
      progressiveTier3Copay: 0,
      contactAllowance: data.contacts?.clExamAndMaterialsAllowance?.value ?? null,
      additionalGlassesDiscount: data.valueAdded?.additionalPairDiscount?.value
        ? `${data.valueAdded.additionalPairDiscount.value}%`
        : null,
      dateOfService: data.patient?.authEffectiveDate?.value
        ? new Date(data.patient.authEffectiveDate.value)
        : new Date(),
      expirationDate: data.patient?.authExpirationDate?.value
        ? new Date(data.patient.authExpirationDate.value)
        : null,
      isActive: true,
    }
  })

  return auth.id
}

async function createSpecteraAuth(customerId: string, data: ExtractedData): Promise<string> {
  const auth = await prisma.specteraAuthorization.create({
    data: {
      customerId,
      subscriberId: data.patient?.authNumber?.value ?? `SPECTERA-${Date.now()}`,
      memberName: data.patient?.patientName?.value ?? '',
      dateOfBirth: data.patient?.patientBirthDate?.value
        ? new Date(data.patient.patientBirthDate.value)
        : null,
      productName: data.plan?.benefitPlanName?.value ?? 'Spectera Vision',
      examEligible: isEligible(data.eligibility?.examProfServices?.value),
      examFrequency: data.eligibility?.frequency?.examFrequency?.value ?? null,
      maternityExamEligible: false,
      pediatricExamEligible: false,
      frameEligible: isEligible(data.eligibility?.frame?.value),
      frameFrequency: data.eligibility?.frequency?.frameFrequency?.value ?? null,
      lensesEligible: isEligible(data.eligibility?.lens?.value),
      lensesFrequency: data.eligibility?.frequency?.lensFrequency?.value ?? null,
      selectionClDailyEligible: isEligible(data.eligibility?.contacts?.value),
      selectionClMonthlyEligible: isEligible(data.eligibility?.contacts?.value),
      nonSelectionClEligible: true,
      selectionClFitEligible: true,
      nonSelectionClFitEligible: true,
      examCopay: data.copays?.examCopay?.value ?? null,
      frameAllowance: data.frame?.allowances?.nonAltairMarchonFrameAllowance?.allowance
        ?? data.frame?.allowances?.altairMarchonFrameAllowance?.allowance ?? null,
      frameOveragePercent: 70,
      standardLensCopay: 15,
      nonSelectionClAllowance: data.contacts?.clExamAndMaterialsAllowance?.value ?? null,
      dateOfService: data.patient?.authEffectiveDate?.value
        ? new Date(data.patient.authEffectiveDate.value)
        : new Date(),
      expirationDate: data.patient?.authExpirationDate?.value
        ? new Date(data.patient.authExpirationDate.value)
        : null,
      dilatedRetinalExamRequired: false,
      isActive: true,
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
  return 'CHOICE'
}

function isEligible(value: string | null | undefined): boolean {
  if (!value) return false
  const lower = value.toLowerCase()
  return lower === 'yes' || lower === 'true' || lower === 'eligible'
}

function parseRetinalImaging(value: string | null | undefined): number | null {
  if (!value) return null
  const match = value.match(/(\d+(?:\.\d+)?)/)?.[1]
  return match ? parseFloat(match) : null
}

function printSummary(result: SyncResult, options: SyncOptions): void {
  console.log('\n' + '='.repeat(70))
  console.log('SYNC SUMMARY')
  console.log('='.repeat(70))
  console.log(`Total Documents:  ${result.total}`)
  console.log(`Synced:           ${result.synced}`)
  console.log(`Skipped:          ${result.skipped}`)
  console.log(`Errors:           ${result.errors}`)
  console.log('')

  if (options.verbose || result.errors > 0) {
    console.log('DETAILS:')
    console.log('-'.repeat(70))

    for (const detail of result.details) {
      const status = detail.status === 'synced' ? '✓' : detail.status === 'error' ? '✗' : '○'
      console.log(`${status} ${detail.fileName}`)
      console.log(`  Carrier: ${detail.carrier} | Customer: ${detail.customerId ?? 'N/A'} | Auth#: ${detail.authNumber ?? 'N/A'}`)
      if (detail.reason) console.log(`  Reason: ${detail.reason}`)
      if (detail.authorizationId) console.log(`  Authorization ID: ${detail.authorizationId}`)
      console.log('')
    }
  }

  if (options.dryRun) {
    console.log('** DRY RUN - No changes were made **')
  }
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

async function main() {
  const args = process.argv.slice(2)

  const options: SyncOptions = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    customerId: args.find(a => a.startsWith('--customer='))?.split('=')[1]
  }

  try {
    await syncAuthorizations(options)
  } catch (error) {
    console.error('Sync failed:', error)
    process.exit(1)
  }
}

main()
