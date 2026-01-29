/**
 * Haiku Vision Extraction Service
 *
 * Two-part extraction approach:
 * 1. Open-ended document reading - extract all visible insurance data
 * 2. Catalog assignment - map extracted data to our schema fields
 *
 * This replaces the brittle field-specific JSON extraction that broke
 * on every document variation.
 */

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

// Create client lazily to allow env vars to be loaded first
let _anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
  }
  return _anthropicClient
}

// ============================================================================
// PART 1: Open-Ended Document Reading
// ============================================================================

interface ExtractedDocumentData {
  carrier: string
  memberName: string
  memberId: string
  groupNumber: string
  effectiveDate: string

  // All extracted values as key-value pairs
  // No rigid structure - just what we found
  extractedValues: Record<string, string | number | null>

  // Raw text summary for debugging
  rawSummary: string

  // Confidence and metadata
  confidence: number
  processingCost: number
}

/**
 * Part 1: Read document with Haiku vision - open-ended extraction
 * Returns all insurance benefit data found without rigid path expectations
 */
export async function readDocumentWithHaiku(
  filePath: string
): Promise<ExtractedDocumentData> {

  // Read the file and convert to base64
  const fileBuffer = fs.readFileSync(filePath)
  const base64Data = fileBuffer.toString('base64')

  // Determine media type
  const ext = path.extname(filePath).toLowerCase()
  let mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'application/pdf'
  if (ext === '.pdf') {
    mediaType = 'application/pdf'
  } else if (ext === '.png') {
    mediaType = 'image/png'
  } else if (ext === '.jpg' || ext === '.jpeg') {
    mediaType = 'image/jpeg'
  } else {
    throw new Error(`Unsupported file type: ${ext}`)
  }

  const prompt = `You are reading an insurance benefits document. Extract ALL visible information about vision benefits.

Look for and extract:
- Insurance carrier name (VSP, EyeMed, Spectera, etc.)
- Member name and ID
- Group number
- Effective/authorization date
- ALL copay amounts (exam, materials, contact lens fitting, etc.)
- ALL allowance amounts (frame allowance, contact lens allowance, etc.)
- ALL coverage details (progressive lens tiers, AR coating tiers, etc.)
- Any percentages or discounts mentioned
- Any tier classifications (Tier 1, Tier 2, etc.)

For each value you find, report:
- The exact label/description from the document
- The numeric value or text
- Any qualifying notes (e.g., "up to", "after allowance", etc.)

IMPORTANT: Do not assume or infer values. Only report what is explicitly visible in the document.

Format your response as structured data with clear labels. Use this format:

CARRIER: [carrier name]
MEMBER_NAME: [name]
MEMBER_ID: [id]
GROUP_NUMBER: [group]
EFFECTIVE_DATE: [date]

COPAYS:
- [label]: [amount] [notes]
- [label]: [amount] [notes]

ALLOWANCES:
- [label]: [amount] [notes]

COVERAGE_DETAILS:
- [label]: [value/amount] [notes]

DISCOUNTS:
- [label]: [percentage] [notes]

TIERS:
- [category]: [tier name/level] - [copay/value]

OTHER:
- [any other relevant information]

Be thorough - extract everything visible.`

  const startTime = Date.now()

  const response = await getAnthropicClient().messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ]
  })

  const endTime = Date.now()

  // Calculate approximate cost (Haiku pricing: $0.25/1M input, $1.25/1M output)
  const inputTokens = response.usage?.input_tokens || 0
  const outputTokens = response.usage?.output_tokens || 0
  const processingCost = (inputTokens * 0.25 / 1_000_000) + (outputTokens * 1.25 / 1_000_000)

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

  // Parse the structured response
  const extractedValues = parseHaikuResponse(rawText)

  return {
    carrier: extractedValues['CARRIER'] as string || 'Unknown',
    memberName: extractedValues['MEMBER_NAME'] as string || '',
    memberId: extractedValues['MEMBER_ID'] as string || '',
    groupNumber: extractedValues['GROUP_NUMBER'] as string || '',
    effectiveDate: extractedValues['EFFECTIVE_DATE'] as string || '',
    extractedValues,
    rawSummary: rawText,
    confidence: 0.9, // High confidence with direct vision reading
    processingCost
  }
}

/**
 * Parse Haiku's structured text response into key-value pairs
 */
function parseHaikuResponse(text: string): Record<string, string | number | null> {
  const result: Record<string, string | number | null> = {}

  const lines = text.split('\n')
  let currentSection = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Check for top-level fields (CARRIER:, MEMBER_NAME:, etc.)
    const topLevelMatch = trimmed.match(/^([A-Z_]+):\s*(.+)$/i)
    if (topLevelMatch && !trimmed.startsWith('-')) {
      const [, key, value] = topLevelMatch
      result[key.toUpperCase()] = value.trim()
      continue
    }

    // Check for section headers (COPAYS:, ALLOWANCES:, etc.)
    const sectionMatch = trimmed.match(/^([A-Z_]+):$/i)
    if (sectionMatch) {
      currentSection = sectionMatch[1].toUpperCase()
      continue
    }

    // Parse list items under sections
    if (trimmed.startsWith('-') && currentSection) {
      const itemText = trimmed.substring(1).trim()

      // Try to extract label and value
      // Pattern: "Label: $XX" or "Label: XX%" or "Label: value (notes)"
      const labelValueMatch = itemText.match(/^([^:]+):\s*\$?([\d.]+)(.*)$/i)
      if (labelValueMatch) {
        const [, label, value, notes] = labelValueMatch
        const cleanLabel = label.trim().replace(/\s+/g, '_').toUpperCase()
        const key = `${currentSection}_${cleanLabel}`

        // Try to parse as number
        const numValue = parseFloat(value)
        result[key] = isNaN(numValue) ? value : numValue

        // Store notes if present
        if (notes.trim()) {
          result[`${key}_NOTES`] = notes.trim()
        }
      } else {
        // Store as text
        const cleanLabel = itemText.split(':')[0].trim().replace(/\s+/g, '_').toUpperCase()
        const key = `${currentSection}_${cleanLabel}`
        result[key] = itemText
      }
    }
  }

  return result
}


// ============================================================================
// PART 2: Catalog Assignment Function
// ============================================================================

interface InsuranceAuthorization {
  carrier: string

  // Member info
  memberName: string
  memberId: string
  groupNumber: string
  effectiveDate: Date | null
  expirationDate: Date | null

  // Core copays
  examCopay: number | null
  materialsCopay: number | null
  clExamCopay: number | null  // Contact lens fitting

  // Allowances
  frameAllowance: number | null
  frameOverageDiscount: number | null
  contactAllowance: number | null

  // VSP Matrix codes (if VSP)
  vspMatrix: Record<string, number> | null

  // EyeMed tiers (if EyeMed)
  eyemedTiers: {
    progressiveStandard: number | null
    progressiveTier1: number | null
    progressiveTier2: number | null
    progressiveTier3: number | null
    progressiveTier4: number | null
    arStandard: number | null
    arTier1: number | null
    arTier2: number | null
    arTier3: number | null
  } | null

  // Raw data for debugging
  rawExtractedData: Record<string, unknown>
}

/**
 * Part 2: Assign extracted values to our catalog schema
 * Maps open-ended extraction results to specific database fields
 */
export function assignToCatalog(
  extracted: ExtractedDocumentData
): InsuranceAuthorization {

  const carrier = normalizeCarrier(extracted.carrier)
  const values = extracted.extractedValues

  // Build the authorization record
  const auth: InsuranceAuthorization = {
    carrier,
    memberName: extracted.memberName,
    memberId: extracted.memberId,
    groupNumber: extracted.groupNumber,
    effectiveDate: parseDate(extracted.effectiveDate),
    expirationDate: null,

    // Core copays - search for common labels
    examCopay: findCopayValue(values, ['exam', 'eye_exam', 'vision_exam', 'comprehensive_exam']),
    materialsCopay: findCopayValue(values, ['materials', 'lens', 'lenses', 'single_vision', 'spectacle']),
    clExamCopay: findClFittingValue(values),

    // Allowances
    frameAllowance: findAllowanceValue(values, ['frame', 'frames', 'eyewear', 'retail_frame']),
    frameOverageDiscount: findPercentageValue(values, ['frame', 'frames', 'overage', 'frame_overage', 'additional']),
    contactAllowance: findAllowanceValue(values, ['contact', 'contacts', 'contact_lens', 'cl_allowance']),

    // Carrier-specific data
    vspMatrix: carrier === 'VSP' ? buildVspMatrix(values) : null,
    eyemedTiers: carrier === 'EyeMed' ? buildEyemedTiers(values) : null,

    rawExtractedData: {
      ...values,
      _rawSummary: extracted.rawSummary,
      _processingCost: extracted.processingCost,
      // Add normalized EyeMed copay fields for precompute compatibility
      ...(carrier === 'EyeMed' ? buildEyemedNormalizedCopays(values) : {})
    }
  }

  return auth
}

/**
 * Build normalized EyeMed copay fields that the precompute expects
 * Maps raw extracted keys like COPAYS_SINGLE_VISION_LENSES to normalized names like singleVision
 * Also searches COVERAGE_DETAILS_ since EyeMed often puts values there
 */
function buildEyemedNormalizedCopays(values: Record<string, string | number | null>): Record<string, number | string | null> {
  const result: Record<string, number | string | null> = {}

  // Helper to find numeric value across COPAYS_, COVERAGE_DETAILS_, and other sections
  const findValue = (terms: string[]): number | null => {
    for (const [key, value] of Object.entries(values)) {
      const keyLower = key.toLowerCase()
      for (const term of terms) {
        if (keyLower.includes(term.toLowerCase())) {
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            const num = parseFloat(value.replace(/[$,]/g, ''))
            if (!isNaN(num)) return num
          }
        }
      }
    }
    return null
  }

  // Single Vision
  const svValue = findValue(['single_vision_lenses', 'single_vision'])
  if (svValue !== null) result['singleVision'] = svValue

  // Bifocal
  const bfValue = findValue(['bifocal_lenses', 'bifocal'])
  if (bfValue !== null) result['bifocal'] = bfValue

  // Trifocal
  const tfValue = findValue(['trifocal_lenses', 'trifocal'])
  if (tfValue !== null) result['trifocal'] = tfValue

  // Polycarbonate - handle age-based pricing
  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    if (keyLower.includes('polycarbonate') && (keyLower.includes('19_and_over') || keyLower.includes('(19_and_over)'))) {
      if (typeof value === 'number') result['polycarbonate'] = value
    }
    if (keyLower.includes('polycarbonate') && (keyLower.includes('under_19') || keyLower.includes('(under_19)'))) {
      if (typeof value === 'number') result['polycarbonateUnder19'] = value
    }
  }

  // Trivex
  const trivexValue = findValue(['trivex'])
  if (trivexValue !== null) result['trivex'] = trivexValue

  // Hi-Index - usually not explicitly listed, uses "All Other" discount

  // Tint - can be in COPAYS_ or COVERAGE_DETAILS_
  const tintValue = findValue(['_tint', 'solid_tint', 'tint_(solid'])
  if (tintValue !== null) result['tint'] = tintValue

  // UV Treatment - can be in COPAYS_ or COVERAGE_DETAILS_
  const uvValue = findValue(['uv_treatment', 'uv_protection'])
  if (uvValue !== null) result['uvTreatment'] = uvValue

  // Scratch Coating - can be in COPAYS_ or COVERAGE_DETAILS_
  const scratchValue = findValue(['scratch_coating', 'scratch'])
  if (scratchValue !== null) result['scratch'] = scratchValue

  // Photochromic / Transitions
  const photoValue = findValue(['transitions', 'photochromic'])
  if (photoValue !== null) result['photochromic'] = photoValue

  // Polarized
  const polarValue = findValue(['polarized'])
  if (polarValue !== null) result['polarized'] = polarValue

  // Check for "Other Lens Options" / "Lens Options" discount (EyeMed's catch-all 20% off)
  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    if (keyLower.includes('lens_options') && !keyLower.includes('progressive')) {
      // This is the 20% off retail discount
      if (typeof value === 'number' && value === 20) {
        result['allOtherLensOptions'] = 'DISCOUNT_20'
      } else if (typeof value === 'string' && value.includes('20')) {
        result['allOtherLensOptions'] = 'DISCOUNT_20'
      }
    }
  }

  // AR Coating - can be in COPAYS_ or COVERAGE_DETAILS_
  const arStandard = findValue(['anti_reflective_coating_(standard)', 'anti_reflective_coating_standard', 'ar_standard'])
  if (arStandard !== null) result['arStandard'] = arStandard

  // Progressive Standard copay (used for tier 1-3 fallback)
  const progressiveStandard = findValue(['progressive_-_standard', 'progressive_standard'])
  if (progressiveStandard !== null) result['progressiveStandard'] = progressiveStandard

  // Progressive Allowance - extract from discount notes (e.g., "20% off retail price less $120 allowance")
  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    if (keyLower.includes('progressive') && keyLower.includes('notes') && typeof value === 'string') {
      // Look for "$XXX allowance" pattern
      const allowanceMatch = value.match(/\$(\d+)\s*allowance/i)
      if (allowanceMatch) {
        result['progressiveAllowance'] = parseInt(allowanceMatch[1], 10)
        console.log(`[EyeMed Extraction] Found progressive allowance: $${allowanceMatch[1]}`)
      }
    }
  }

  return result
}

/**
 * Find copay value by exact key match in COPAYS_ section
 */
function findCopayValueExact(
  values: Record<string, string | number | null>,
  searchTerms: string[]
): number | null {
  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    if (!keyLower.startsWith('copays_')) continue

    for (const term of searchTerms) {
      const termLower = term.toLowerCase()
      // Check if key contains the term (after COPAYS_ prefix)
      const keyWithoutPrefix = keyLower.replace('copays_', '')
      if (keyWithoutPrefix.includes(termLower) || keyWithoutPrefix === termLower) {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
          const num = parseFloat(value.replace(/[$,]/g, ''))
          if (!isNaN(num)) return num
        }
      }
    }
  }
  return null
}

/**
 * Normalize carrier name
 */
function normalizeCarrier(carrier: string): string {
  const upper = carrier.toUpperCase()
  if (upper.includes('VSP')) return 'VSP'
  if (upper.includes('EYEMED')) return 'EyeMed'
  if (upper.includes('SPECTERA')) return 'Spectera'
  if (upper.includes('DAVIS')) return 'Davis Vision'
  return carrier
}

/**
 * Find copay value by searching multiple possible labels
 */
function findCopayValue(
  values: Record<string, string | number | null>,
  searchTerms: string[]
): number | null {
  // First pass - exact category match (COPAYS_ prefix)
  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    if (!keyLower.startsWith('copays_')) continue

    for (const term of searchTerms) {
      if (keyLower.includes(term)) {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
          const num = parseFloat(value.replace(/[$,]/g, ''))
          if (!isNaN(num)) return num
        }
      }
    }
  }

  // Second pass - look in allowances for "fit" and "follow-up" type values
  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    for (const term of searchTerms) {
      if (keyLower.includes(term)) {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
          // Parse "Up to $40" format
          const match = value.match(/\$(\d+(?:\.\d+)?)/);
          if (match) return parseFloat(match[1])
          const num = parseFloat(value.replace(/[$,]/g, ''))
          if (!isNaN(num)) return num
        }
      }
    }
  }

  return null
}

/**
 * Find allowance value by searching multiple possible labels
 */
function findAllowanceValue(
  values: Record<string, string | number | null>,
  searchTerms: string[]
): number | null {
  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    for (const term of searchTerms) {
      if (keyLower.includes(term) && (keyLower.includes('allowance') || keyLower.includes('benefit'))) {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
          const num = parseFloat(value.replace(/[$,]/g, ''))
          if (!isNaN(num)) return num
        }
      }
    }
  }
  return null
}

/**
 * Find CL fitting/exam value - specifically looks for standard fitting cost
 */
function findClFittingValue(values: Record<string, string | number | null>): number | null {
  // First look for standard fitting in ALLOWANCES
  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    if (keyLower.includes('contact_lens_fit') && keyLower.includes('standard')) {
      if (typeof value === 'string') {
        // Parse "Up to $40" format
        const match = value.match(/\$(\d+(?:\.\d+)?)/);
        if (match) return parseFloat(match[1])
      }
      if (typeof value === 'number') return value
    }
  }

  // Then check COPAYS for CL exam
  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    if (keyLower.startsWith('copays_') && (keyLower.includes('cl_exam') || keyLower.includes('contact_lens_exam'))) {
      if (typeof value === 'number') return value
      if (typeof value === 'string') {
        const num = parseFloat(value.replace(/[$,]/g, ''))
        if (!isNaN(num)) return num
      }
    }
  }

  // Fallback to any fitting value
  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    if (keyLower.includes('fit') && !keyLower.includes('premium')) {
      if (typeof value === 'string') {
        const match = value.match(/\$(\d+(?:\.\d+)?)/);
        if (match) return parseFloat(match[1])
      }
      if (typeof value === 'number') return value
    }
  }

  return null
}

/**
 * Find percentage value
 */
function findPercentageValue(
  values: Record<string, string | number | null>,
  searchTerms: string[]
): number | null {
  // Look in DISCOUNTS_ prefix first
  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    if (!keyLower.startsWith('discounts_')) continue

    for (const term of searchTerms) {
      if (keyLower.includes(term)) {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
          const match = value.match(/(\d+)%?/)
          if (match) return parseInt(match[1])
        }
      }
    }
  }

  // Also check COPAYS_ with "off balance" notes
  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    for (const term of searchTerms) {
      if (keyLower.includes(term) && keyLower.includes('notes')) {
        if (typeof value === 'string' && value.includes('off balance')) {
          const match = value.match(/(\d+)%/)
          if (match) return parseInt(match[1])
        }
      }
    }
  }

  return null
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Build VSP matrix from extracted values
 */
function buildVspMatrix(values: Record<string, string | number | null>): Record<string, number> {
  const matrix: Record<string, number> = {}

  // VSP matrix codes: KA, JA, FA, OA, NA, KD, JD, FD, OD, ND, etc.
  const matrixCodes = [
    'KA', 'JA', 'FA', 'OA', 'NA',  // CR-39
    'KD', 'JD', 'FD', 'OD', 'ND',  // Poly
    'KH', 'JH', 'FH', 'OH', 'NH',  // 1.67
    'KJ', 'JJ', 'FJ', 'OJ', 'NJ',  // 1.74
    'QM', 'QT', 'QV',              // AR coatings
    'PR', 'LF', 'DA', 'TA'         // Add-ons
  ]

  for (const code of matrixCodes) {
    for (const [key, value] of Object.entries(values)) {
      if (key.toUpperCase().includes(code)) {
        if (typeof value === 'number') {
          matrix[code] = value
        } else if (typeof value === 'string') {
          const num = parseFloat(value.replace(/[$,]/g, ''))
          if (!isNaN(num)) matrix[code] = num
        }
      }
    }
  }

  return matrix
}

/**
 * Build EyeMed tier structure from extracted values
 */
function buildEyemedTiers(values: Record<string, string | number | null>): InsuranceAuthorization['eyemedTiers'] {
  const tiers: InsuranceAuthorization['eyemedTiers'] = {
    progressiveStandard: null,
    progressiveTier1: null,
    progressiveTier2: null,
    progressiveTier3: null,
    progressiveTier4: null,
    arStandard: null,
    arTier1: null,
    arTier2: null,
    arTier3: null
  }

  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()
    let numValue: number | null = null

    // Skip _NOTES keys
    if (keyLower.endsWith('_notes')) continue

    if (typeof value === 'number') {
      numValue = value
    } else if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[$,]/g, ''))
      if (!isNaN(num)) numValue = num
    }

    if (numValue === null) continue

    // Progressive tiers - check for COPAYS_PROGRESSIVE patterns
    if (keyLower.includes('progressive')) {
      if (keyLower.includes('standard') && !keyLower.includes('tier')) {
        tiers.progressiveStandard = numValue
      } else if (keyLower.includes('tier_1') || keyLower.includes('tier1') || keyLower.match(/tier.?1/)) {
        tiers.progressiveTier1 = numValue
      } else if (keyLower.includes('tier_2') || keyLower.includes('tier2') || keyLower.match(/tier.?2/)) {
        tiers.progressiveTier2 = numValue
      } else if (keyLower.includes('tier_3') || keyLower.includes('tier3') || keyLower.match(/tier.?3/)) {
        tiers.progressiveTier3 = numValue
      } else if (keyLower.includes('tier_4') || keyLower.includes('tier4') || keyLower.match(/tier.?4/)) {
        tiers.progressiveTier4 = numValue
      }
    }

    // AR coating tiers - check for COPAYS_ANTI_REFLECTIVE patterns
    if (keyLower.includes('anti_reflective') || keyLower.includes('anti-reflective') || keyLower.includes('ar_coating')) {
      if (keyLower.includes('standard') && !keyLower.includes('tier')) {
        tiers.arStandard = numValue
      } else if (keyLower.includes('tier_1') || keyLower.includes('tier1') || keyLower.match(/tier.?1/)) {
        tiers.arTier1 = numValue
      } else if (keyLower.includes('tier_2') || keyLower.includes('tier2') || keyLower.match(/tier.?2/)) {
        tiers.arTier2 = numValue
      } else if (keyLower.includes('tier_3') || keyLower.includes('tier3') || keyLower.match(/tier.?3/)) {
        tiers.arTier3 = numValue
      }
    }
  }

  return tiers
}


// ============================================================================
// Combined extraction function for easy use
// ============================================================================

export async function extractInsuranceDocument(
  filePath: string
): Promise<InsuranceAuthorization> {
  // Part 1: Read document
  const extracted = await readDocumentWithHaiku(filePath)

  // Part 2: Assign to catalog
  const authorization = assignToCatalog(extracted)

  return authorization
}


// ============================================================================
// Database Processing Function (replaces old OCR + GPT pipeline)
// ============================================================================

interface ProcessResult {
  success: boolean
  carrier: string | null
  extractedData: Record<string, unknown> | null
  error: string | null
  processingCost: number
}

/**
 * Process an insurance document using Haiku vision
 * This replaces the old OCR + GPT pipeline
 *
 * @param documentId - The database document ID
 * @param filePath - Path to the PDF/image file
 */
export async function processDocumentWithHaiku(
  documentId: string,
  filePath: string
): Promise<ProcessResult> {
  // Import prisma dynamically to avoid circular deps
  const { prisma } = await import('@/lib/prisma')

  try {
    // Mark as processing
    await prisma.insuranceDocument.update({
      where: { id: documentId },
      data: {
        ocrStatus: 'processing',
        gptStatus: 'processing',
      },
    })

    console.log(`[Haiku] Processing document: ${filePath}`)

    // Part 1: Read document with Haiku vision
    const extracted = await readDocumentWithHaiku(filePath)

    console.log(`[Haiku] Extracted carrier: ${extracted.carrier}`)
    console.log(`[Haiku] Processing cost: $${extracted.processingCost.toFixed(4)}`)

    // Part 2: Assign to catalog
    const authorization = assignToCatalog(extracted)

    // Build extracted data in format compatible with verify route and precompute
    // The precompute looks for normalized field names like singleVision, bifocal, etc.
    const normalizedCopays = authorization.carrier === 'EyeMed'
      ? buildEyemedNormalizedCopays(extracted.extractedValues)
      : {}

    const extractedData = {
      // Store the assigned values directly at top level for easy access
      carrier: authorization.carrier,
      memberName: authorization.memberName,
      memberId: authorization.memberId,
      groupNumber: authorization.groupNumber,
      examCopay: authorization.examCopay,
      materialsCopay: authorization.materialsCopay,
      clExamCopay: authorization.clExamCopay,
      frameAllowance: authorization.frameAllowance,
      frameOverageDiscount: authorization.frameOverageDiscount,
      contactAllowance: authorization.contactAllowance,

      // Normalized copay fields for precompute compatibility
      // These are the field names the tier mappings expect
      ...normalizedCopays,

      // Carrier-specific data
      vspMatrix: authorization.vspMatrix,
      eyemedTiers: authorization.eyemedTiers,

      // Raw data for debugging
      _rawExtractedValues: extracted.extractedValues,
      _rawSummary: extracted.rawSummary,
      _processingCost: extracted.processingCost,
      _extractionMethod: 'haiku-vision-v1',
    }

    // Update document with extracted data
    await prisma.insuranceDocument.update({
      where: { id: documentId },
      data: {
        ocrStatus: 'completed',
        gptStatus: 'completed',
        carrier: authorization.carrier,
        extractedData: extractedData,
        confidenceScore: extracted.confidence,
      },
    })

    return {
      success: true,
      carrier: authorization.carrier,
      extractedData,
      error: null,
      processingCost: extracted.processingCost,
    }

  } catch (error) {
    console.error('[Haiku] Processing error:', error)

    // Mark as failed
    await prisma.insuranceDocument.update({
      where: { id: documentId },
      data: {
        ocrStatus: 'failed',
        gptStatus: 'failed',
        ocrError: error instanceof Error ? error.message : 'Unknown error',
        gptError: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return {
      success: false,
      carrier: null,
      extractedData: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingCost: 0,
    }
  }
}
