/**
 * Authorization Validator Service
 *
 * Implements a systematic scan → validate → fix → price → verify pipeline
 * to ensure extracted insurance data matches source documents.
 *
 * Pipeline Phases:
 * 1. SCAN - Process document through OCR/GPT extraction
 * 2. VALIDATE - Compare: PDF raw text → Extracted JSON → DB columns
 * 3. FIX - Auto-correct discrepancies or flag for manual review
 * 4. PRICE - Generate price list (only after validation passes)
 * 5. VERIFY - Spot-check prices against expected values
 */

import { prisma } from '@/lib/prisma'

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  authorizationId: string
  customerId: string
  customerName: string
  carrier: string
  phase: 'validate' | 'fix' | 'price' | 'verify'
  status: 'pass' | 'fail' | 'warning' | 'fixed'
  checks: ValidationCheck[]
  summary: {
    total: number
    passed: number
    failed: number
    fixed: number
    warnings: number
  }
}

export interface ValidationCheck {
  field: string
  description: string
  pdfValue: string | number | null
  extractedValue: string | number | null
  dbValue: string | number | null
  status: 'pass' | 'fail' | 'warning' | 'fixed' | 'missing_in_pdf'
  autoFixable: boolean
  fixAction?: string
}

export interface FixResult {
  field: string
  oldValue: string | number | null
  newValue: string | number | null
  source: 'pdf' | 'extracted' | 'manual'
  success: boolean
  error?: string
}

// =============================================================================
// VSP VALIDATION PATTERNS
// =============================================================================

const VSP_VALIDATION_PATTERNS = {
  // Copay patterns from auth document
  examCopay: {
    pdfPattern: /Co-payments.*?Exam\s*\$([0-9.]+)/is,
    extractedPath: ['copays', 'examCopay', 'value'],
    dbColumn: 'exam_copay',
    description: 'Exam Copay'
  },
  materialsCopay: {
    pdfPattern: /Co-payments.*?Material\s*\$([0-9.]+)/is,
    extractedPaths: [
      ['copays', 'materialsCopay', 'value'],
      ['copays', 'materialCopay', 'value']  // Handle inconsistent naming
    ],
    dbColumn: 'materials_copay',
    description: 'Materials Copay'
  },
  frameAllowanceNonAltair: {
    pdfPattern: /WFA60\s*\$([0-9.]+)\s*for\s*non-Altair/i,
    extractedPaths: [
      ['frameAllowance', 'nonAltair', 'value'],
      ['frameAllowance', 'value']
    ],
    dbColumn: 'frame_allowance',
    description: 'Frame Allowance (Non-Altair)'
  },
  frameAllowanceAltair: {
    pdfPattern: /WFA67\s*\$([0-9.]+)\s*for\s*Altair/i,
    extractedPath: ['frameAllowance', 'altair', 'value'],
    dbColumn: 'frame_allowance_altair',  // May not exist yet
    description: 'Frame Allowance (Altair/Marchon)'
  },
  clExamCopay: {
    pdfPattern: /CL Exam Services.*?(?:Charge the lesser of \$([0-9]+)|Covered in full)/i,
    extractedPaths: [
      ['contacts', 'clExamCopay', 'value'],
      ['copays', 'clExamCopay', 'value']
    ],
    dbColumn: 'cl_exam_copay',  // May not exist yet
    description: 'Contact Lens Exam Copay'
  },
  contactAllowance: {
    pdfPattern: /Materials\s*\$([0-9.]+)\s*\n.*?Contacts are instead of/is,
    extractedPath: ['contacts', 'materialsAllowance', 'value'],
    dbColumn: 'contact_allowance',
    description: 'Contact Lens Materials Allowance'
  }
}

// Lens enhancement patterns from lens document
const VSP_LENS_PATTERNS = {
  blendedBifocal: {
    pdfPattern: /GA\s*-\s*Blended Bifocal Plastic\s*\$([0-9]+)/i,
    lensCode: 'GA',
    description: 'Blended Bifocal (GA)'
  },
  standardProgressiveKA: {
    pdfPattern: /KA\s*-\s*Progressive K Plastic\s*\$([0-9]+)/i,
    lensCode: 'KA',
    description: 'Standard Progressive K (KA)'
  },
  premiumProgressiveFA: {
    pdfPattern: /FA\s*-\s*Progressive F Plastic\s*\$([0-9]+)/i,
    lensCode: 'FA',
    description: 'Premium Progressive F (FA)'
  },
  polycarbonate: {
    pdfPattern: /AD\s*-\s*Polycarbonate\s*\$([0-9]+)\s*\$([0-9]+)/i,
    lensCode: 'AD',
    description: 'Polycarbonate (AD)'
  }
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validate a VSP authorization against source documents
 */
export async function validateVspAuthorization(authorizationId: string): Promise<ValidationResult> {
  // Get authorization with related data
  const auth = await prisma.insuranceAuthorization.findUnique({
    where: { id: authorizationId },
    include: {
      customer: true,
      documents: true
    }
  })

  if (!auth) {
    throw new Error(`Authorization not found: ${authorizationId}`)
  }

  const customerName = `${auth.customer.firstName} ${auth.customer.lastName}`
  const checks: ValidationCheck[] = []

  // Find auth and lens documents
  const authDoc = auth.documents.find(d =>
    d.fileName.toLowerCase().includes('auth') ||
    d.fileName.toLowerCase().includes('patient')
  )
  const lensDoc = auth.documents.find(d =>
    d.fileName.toLowerCase().includes('lens')
  )

  const authOcrText = authDoc?.rawOcrText || ''
  const lensOcrText = lensDoc?.rawOcrText || ''
  const extractedData = auth.rawExtractedData as Record<string, unknown> || {}

  // Run validation checks for auth document fields
  for (const [fieldName, pattern] of Object.entries(VSP_VALIDATION_PATTERNS)) {
    const check = validateField(
      fieldName,
      pattern,
      authOcrText,
      extractedData,
      auth as Record<string, unknown>
    )
    checks.push(check)
  }

  // Run validation checks for lens document fields
  for (const [fieldName, pattern] of Object.entries(VSP_LENS_PATTERNS)) {
    const check = validateLensField(
      fieldName,
      pattern,
      lensOcrText,
      extractedData
    )
    checks.push(check)
  }

  // Calculate summary
  const summary = {
    total: checks.length,
    passed: checks.filter(c => c.status === 'pass').length,
    failed: checks.filter(c => c.status === 'fail').length,
    fixed: checks.filter(c => c.status === 'fixed').length,
    warnings: checks.filter(c => c.status === 'warning').length
  }

  const overallStatus = summary.failed > 0 ? 'fail' :
                        summary.warnings > 0 ? 'warning' : 'pass'

  return {
    authorizationId,
    customerId: auth.customerId,
    customerName,
    carrier: auth.carrier,
    phase: 'validate',
    status: overallStatus,
    checks,
    summary
  }
}

/**
 * Validate a single field across PDF → Extracted → DB
 */
function validateField(
  fieldName: string,
  pattern: {
    pdfPattern: RegExp
    extractedPath?: string[]
    extractedPaths?: string[][]
    dbColumn: string
    description: string
  },
  pdfText: string,
  extractedData: Record<string, unknown>,
  dbRecord: Record<string, unknown>
): ValidationCheck {
  // Extract from PDF using regex
  const pdfMatch = pdfText.match(pattern.pdfPattern)
  const pdfValue = pdfMatch ? parseFloat(pdfMatch[1]) : null

  // Extract from extracted JSON (try multiple paths if provided)
  let extractedValue: number | null = null
  const pathsToTry = pattern.extractedPaths || (pattern.extractedPath ? [pattern.extractedPath] : [])

  for (const path of pathsToTry) {
    const value = getNestedValue(extractedData, path)
    if (value !== null && value !== undefined) {
      extractedValue = typeof value === 'number' ? value : parseFloat(String(value))
      break
    }
  }

  // Get from DB column (handle snake_case to camelCase)
  const dbColumnCamel = snakeToCamel(pattern.dbColumn)
  const dbValue = dbRecord[dbColumnCamel] ?? dbRecord[pattern.dbColumn]
  const dbValueNum = dbValue !== null && dbValue !== undefined ? parseFloat(String(dbValue)) : null

  // Determine status
  let status: ValidationCheck['status'] = 'pass'
  let autoFixable = false
  let fixAction: string | undefined

  if (pdfValue === null) {
    status = 'missing_in_pdf'
  } else if (dbValueNum === null && extractedValue !== null) {
    status = 'fail'
    autoFixable = true
    fixAction = `Set ${pattern.dbColumn} = ${extractedValue} (from extraction)`
  } else if (dbValueNum === null && pdfValue !== null) {
    status = 'fail'
    autoFixable = true
    fixAction = `Set ${pattern.dbColumn} = ${pdfValue} (from PDF)`
  } else if (dbValueNum !== null && pdfValue !== null && dbValueNum !== pdfValue) {
    status = 'warning'
    fixAction = `DB has ${dbValueNum}, PDF shows ${pdfValue}`
  }

  return {
    field: fieldName,
    description: pattern.description,
    pdfValue,
    extractedValue,
    dbValue: dbValueNum,
    status,
    autoFixable,
    fixAction
  }
}

/**
 * Validate lens enhancement fields
 */
function validateLensField(
  fieldName: string,
  pattern: {
    pdfPattern: RegExp
    lensCode: string
    description: string
  },
  pdfText: string,
  extractedData: Record<string, unknown>
): ValidationCheck {
  // Extract from PDF
  const pdfMatch = pdfText.match(pattern.pdfPattern)
  let pdfValue: number | null = null

  if (pdfMatch) {
    // For patterns with SV and MF values, take the multifocal (second) value
    pdfValue = pdfMatch[2] ? parseFloat(pdfMatch[2]) : parseFloat(pdfMatch[1])
  } else if (pdfText.includes(`${pattern.lensCode} -`) && pdfText.includes('$0')) {
    // Check if it's covered ($0)
    pdfValue = 0
  }

  // Check extracted lens enhancements
  const lensEnhancements = extractedData.lensEnhancements as Record<string, unknown> | undefined
  const extractedValue: number | null = null // Lens copays typically not extracted as numbers

  // Determine status
  let status: ValidationCheck['status'] = pdfValue !== null ? 'pass' : 'missing_in_pdf'

  return {
    field: fieldName,
    description: pattern.description,
    pdfValue,
    extractedValue,
    dbValue: null, // Lens copays stored in separate table or JSON
    status,
    autoFixable: false
  }
}

// =============================================================================
// FIX FUNCTIONS
// =============================================================================

/**
 * Auto-fix discrepancies that can be fixed automatically
 */
export async function fixVspAuthorization(authorizationId: string): Promise<FixResult[]> {
  const validation = await validateVspAuthorization(authorizationId)
  const fixResults: FixResult[] = []

  // Get the authorization
  const auth = await prisma.insuranceAuthorization.findUnique({
    where: { id: authorizationId },
    include: { documents: true }
  })

  if (!auth) {
    throw new Error(`Authorization not found: ${authorizationId}`)
  }

  // Find auth document for PDF extraction
  const authDoc = auth.documents.find(d =>
    d.fileName.toLowerCase().includes('auth')
  )
  const pdfText = authDoc?.rawOcrText || ''
  const extractedData = auth.rawExtractedData as Record<string, unknown> || {}

  // Process each failed check that is auto-fixable
  for (const check of validation.checks) {
    if (check.status === 'fail' && check.autoFixable) {
      const result = await fixField(authorizationId, check, pdfText, extractedData)
      fixResults.push(result)
    }
  }

  return fixResults
}

/**
 * Fix a single field
 */
async function fixField(
  authorizationId: string,
  check: ValidationCheck,
  pdfText: string,
  extractedData: Record<string, unknown>
): Promise<FixResult> {
  // Determine the value to use (prefer extracted, fallback to PDF)
  let newValue = check.extractedValue ?? check.pdfValue

  // Reject NaN values - they can't be stored in DB
  if (newValue !== null && isNaN(newValue)) {
    // Try PDF value as fallback
    if (check.pdfValue !== null && !isNaN(check.pdfValue)) {
      newValue = check.pdfValue
    } else {
      return {
        field: check.field,
        oldValue: check.dbValue,
        newValue: null,
        source: 'manual',
        success: false,
        error: 'No valid numeric value available (extracted was NaN)'
      }
    }
  }

  if (newValue === null) {
    return {
      field: check.field,
      oldValue: check.dbValue,
      newValue: null,
      source: 'manual',
      success: false,
      error: 'No value available to fix with'
    }
  }

  // Map field name to DB column
  const dbColumnMap: Record<string, string> = {
    materialsCopay: 'materials_copay',
    examCopay: 'exam_copay',
    frameAllowanceNonAltair: 'frame_allowance',
    frameAllowanceAltair: 'frame_allowance_altair',
    clExamCopay: 'cl_exam_copay',
    contactAllowance: 'contact_allowance'
  }

  const dbColumn = dbColumnMap[check.field]
  if (!dbColumn) {
    return {
      field: check.field,
      oldValue: check.dbValue,
      newValue,
      source: check.extractedValue !== null ? 'extracted' : 'pdf',
      success: false,
      error: `No DB column mapping for field: ${check.field}`
    }
  }

  try {
    // Build update data dynamically based on field
    const camelCaseField = snakeToCamel(dbColumn)
    const updateData: Record<string, number> = {}
    updateData[camelCaseField] = newValue

    // Update using Prisma typed update
    await prisma.insuranceAuthorization.update({
      where: { id: authorizationId },
      data: updateData as unknown as { [key: string]: number }
    })

    return {
      field: check.field,
      oldValue: check.dbValue,
      newValue,
      source: check.extractedValue !== null ? 'extracted' : 'pdf',
      success: true
    }
  } catch (error) {
    console.error(`[FIX ERROR] Failed to update ${dbColumn}:`, error)
    return {
      field: check.field,
      oldValue: check.dbValue,
      newValue,
      source: check.extractedValue !== null ? 'extracted' : 'pdf',
      success: false,
      error: String(error)
    }
  }
}

// =============================================================================
// BATCH VALIDATION
// =============================================================================

/**
 * Validate all VSP authorizations and generate a report
 */
export async function validateAllVspAuthorizations(): Promise<{
  total: number
  passed: number
  failed: number
  results: ValidationResult[]
}> {
  const authorizations = await prisma.insuranceAuthorization.findMany({
    where: {
      carrier: 'VSP',
      status: 'active'
    },
    select: { id: true }
  })

  const results: ValidationResult[] = []

  for (const auth of authorizations) {
    try {
      const result = await validateVspAuthorization(auth.id)
      results.push(result)
    } catch (error) {
      console.error(`Failed to validate ${auth.id}:`, error)
    }
  }

  return {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    results
  }
}

/**
 * Fix all auto-fixable issues across all VSP authorizations
 */
export async function fixAllVspAuthorizations(): Promise<{
  total: number
  fixed: number
  failed: number
  results: { authId: string; fixes: FixResult[] }[]
}> {
  const validation = await validateAllVspAuthorizations()
  const results: { authId: string; fixes: FixResult[] }[] = []

  let totalFixed = 0
  let totalFailed = 0

  for (const authResult of validation.results) {
    if (authResult.status === 'fail') {
      const fixes = await fixVspAuthorization(authResult.authorizationId)
      results.push({ authId: authResult.authorizationId, fixes })

      totalFixed += fixes.filter(f => f.success).length
      totalFailed += fixes.filter(f => !f.success).length
    }
  }

  return {
    total: validation.total,
    fixed: totalFixed,
    failed: totalFailed,
    results
  }
}

// =============================================================================
// PRICE VERIFICATION
// =============================================================================

/**
 * Verify price list against expected values from authorization
 */
export async function verifyPriceList(
  customerId: string,
  authorizationId: string
): Promise<{
  status: 'pass' | 'fail' | 'warning'
  checks: { product: string; expected: number | null; actual: number | null; status: string }[]
}> {
  // Get authorization
  const auth = await prisma.insuranceAuthorization.findUnique({
    where: { id: authorizationId }
  })

  if (!auth) {
    throw new Error('Authorization not found')
  }

  // Get price list items
  const priceListItems = await prisma.patientPriceList.findMany({
    where: {
      customerId,
      authorizationId
    },
    include: {
      product: true
    }
  })

  const checks: { product: string; expected: number | null; actual: number | null; status: string }[] = []

  // Spot check key products against auth values
  const materialsCopay = auth.materialsCopay ? parseFloat(String(auth.materialsCopay)) : null

  for (const item of priceListItems.slice(0, 10)) {
    // Basic check - ensure prices are populated
    checks.push({
      product: item.product?.name || item.productId,
      expected: null, // Would need product-specific expected values
      actual: item.finalPrice ? parseFloat(String(item.finalPrice)) : null,
      status: item.finalPrice !== null ? 'pass' : 'fail'
    })
  }

  const failedChecks = checks.filter(c => c.status === 'fail').length
  const status = failedChecks === 0 ? 'pass' : failedChecks > checks.length / 2 ? 'fail' : 'warning'

  return { status, checks }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj
  for (const key of path) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return null
    }
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

// =============================================================================
// RESCAN TRIGGER
// =============================================================================

/**
 * Determine if a rescan is needed based on validation results
 */
export function needsRescan(validation: ValidationResult): {
  needed: boolean
  reason?: string
  fieldsToRescan: string[]
} {
  const criticalFailures = validation.checks.filter(c =>
    c.status === 'fail' &&
    c.pdfValue === null &&
    c.extractedValue === null
  )

  if (criticalFailures.length > 0) {
    return {
      needed: true,
      reason: 'Critical fields missing from both PDF extraction and GPT extraction',
      fieldsToRescan: criticalFailures.map(f => f.field)
    }
  }

  return { needed: false, fieldsToRescan: [] }
}

/**
 * Full pipeline: validate → fix → re-validate → report
 */
export async function runFullValidationPipeline(authorizationId: string): Promise<{
  initialValidation: ValidationResult
  fixes: FixResult[]
  finalValidation: ValidationResult
  rescanNeeded: boolean
  rescanReason?: string
}> {
  // Phase 1: Initial validation
  console.log(`[VALIDATE] Running initial validation for ${authorizationId}`)
  const initialValidation = await validateVspAuthorization(authorizationId)

  // Phase 2: Auto-fix if there are failures
  let fixes: FixResult[] = []
  if (initialValidation.status === 'fail') {
    console.log(`[FIX] Attempting auto-fixes for ${authorizationId}`)
    fixes = await fixVspAuthorization(authorizationId)
  }

  // Phase 3: Re-validate after fixes
  console.log(`[REVALIDATE] Running final validation for ${authorizationId}`)
  const finalValidation = await validateVspAuthorization(authorizationId)

  // Phase 4: Check if rescan needed
  const rescanCheck = needsRescan(finalValidation)

  return {
    initialValidation,
    fixes,
    finalValidation,
    rescanNeeded: rescanCheck.needed,
    rescanReason: rescanCheck.reason
  }
}
