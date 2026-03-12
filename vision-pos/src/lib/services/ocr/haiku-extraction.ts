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

  const prompt = `You are extracting vision insurance benefits from an EyeMed insurance document.

Your job: Read the document and extract ALL benefit information, translating EyeMed's terminology into our standard product names.

CRITICAL: EyeMed uses "tier" language (Tier 1, Tier 2, etc.). You must translate these to OUR product names.

Return structured data with clear labels. Extract ALL fields from the benefits table, including:
- All copay amounts (even if $0 or "Covered")
- All percentage discounts
- All enhancement options
- All diagnostic services
Do not skip fields based on importance or value. If it appears in the document's benefits, extract it.

Use this format:

CARRIER: EyeMed
MEMBER_NAME: [name]
MEMBER_ID: [id]
GROUP_NUMBER: [skip if not mentioned]
PLAN_NAME: [skip if not mentioned]

COPAYS (extract all fields mentioned in document, including $0 values):
- examCopay: [amount]
- materialsCopay: [amount]
- singleVision: [amount]
- bifocal: [amount]
- trifocal: [amount]
- progressiveStandard: [amount]
- Varilux Comfort: [amount]
- Varilux Physio: [amount]
- Varilux X Series: [amount]
- Varilux XR Series: [amount or formula]
- Varilux Panorama: [amount]
- arStandard: [amount]
- Crizal Easy: [amount]
- Crizal Sapphire: [amount]
- Crizal Prevencia: [amount or formula]
- Sunshield: [amount]
- polycarbonate: [amount]
- polycarbonateChild: [amount - if different from adult]
- trivex: [amount]
- highIndex167: [amount]
- highIndex174: [amount]
- Transitions: [amount]
- photochromic: [amount]
- polarized: [amount]
- tint: [amount]
- blueLight: [amount]
- scratchCoating: [amount]
- uvTreatment: [amount]
- allOtherLensOptions: [amount or "20% off retail"]
- clExamCopay: [amount]
- clExamStandard: [amount or formula]
- clExamPremium: [amount or formula]
- retinalImaging: [amount or formula]
- fitAndFollowupStandard: [amount or formula]
- fitAndFollowupPremium: [amount or formula]

ALLOWANCES (if mentioned):
- frameAllowance: [amount]
- frameOverageDiscount: [percentage]
- contactAllowance: [amount]

---

## PRODUCT NAME TRANSLATION GUIDE

### EyeMed Tiers → Our Product Names

**PROGRESSIVE LENSES:**
When you see these in the document:
- "Standard Progressive" or "Basic Progressive" → use field: "progressiveStandard"
- "Premium Tier 1" / "Tier 1" / "Premium 1" → use field: "Varilux Comfort"
- "Premium Tier 2" / "Tier 2" / "Premium 2" → use field: "Varilux Physio"
- "Premium Tier 3" / "Tier 3" / "Premium 3" → use field: "Varilux X Series"
- "Premium Tier 4" / "Tier 4" / "Premium 4" → use field: "Varilux XR Series"
- "Premium Tier 5" / "Tier 5" / "Premium 5" → use field: "Varilux Panorama"

**AR COATINGS (Anti-Reflective):**
- "AR Standard" / "No AR" / "Standard AR" → use field: "arStandard"
- "AR Coating Tier 1" / "Anti-Reflective Tier 1" / "AR Tier 1" → use field: "Crizal Easy"
- "AR Coating Tier 2" / "Anti-Reflective Tier 2" / "AR Tier 2" → use field: "Crizal Sapphire"
- "AR Coating Tier 3" / "Anti-Reflective Tier 3" / "AR Tier 3" → use field: "Crizal Prevencia"
- "Sunshield" (alternative for Tier 3) → use field: "Sunshield"

**LENS MATERIALS:**
- Single Vision, Standard SV → "singleVision"
- Bifocal, Standard Bifocal → "bifocal"
- Trifocal → "trifocal"
- Polycarbonate / Poly → "polycarbonate" (use "polycarbonateChild" for child price)
- Trivex → "trivex"
- Hi-Index 1.67 / 1.67 Hi-Index → "highIndex167"
- Hi-Index 1.74 / 1.74 Hi-Index → "highIndex174"

**LENS ENHANCEMENTS:**
- Transitions / Photochromic → "Transitions"
- Photochromic / Photochromic - Non-Glass → "photochromic" (alternative field, sometimes used instead of Transitions)
- Polarized → "polarized"
- Tint / Tint - Solid and Gradient / Tinting → "tint"
- Blue Light / Blue Light Filter → "blueLight"
- Scratch Coating / Scratch Coating - Standard Plastic / Scratch Resistance → "scratchCoating"
- UV Treatment / UV Coating / UV Protection → "uvTreatment"

**CATCH-ALL FOR UNMAPPED:**
- "All Other Lens Options" / "20% off retail price" for unmapped items → "allOtherLensOptions"

**DIAGNOSTIC SERVICES:**
- Retinal Imaging / Fundus Photography / Retinal Photography → "retinalImaging"
- OCT / Optical Coherence Tomography → "oct" (if present)

**CONTACT LENS SERVICES:**
- Contact Lens Exam / CL Exam / Contact Fitting → "clExamCopay"
- Contact Lens Fit and Follow-up - Standard / CL Fitting - Standard → "fitAndFollowupStandard"
- Contact Lens Fit and Follow-up - Premium / CL Fitting - Premium → "fitAndFollowupPremium"
- Fit and Follow-up - Standard / Standard CL Fit → "fitAndFollowupStandard"
- Fit and Follow-up - Premium / Premium CL Fit → "fitAndFollowupPremium"
- Contact Allowance / Annual Contact Allowance → "contactAllowance"

---

## BASIC PLAN INFORMATION
- carrier: Always "EyeMed"
- patientName: Member's full name
- memberId: Member ID number
- groupNumber: Group number if shown
- planName: Plan name if shown

## CORE COPAYS & ALLOWANCES
- examCopay: Eye exam copay
- materialsCopay: Lens materials copay
- frameAllowance: Frame benefit amount
- frameOverageDiscount: Discount on overage (as number)
- contactAllowance: Annual contact lens allowance

---

## VALUE EXTRACTION RULES

1. "$XX copay" → extract number XX only (no dollar sign)
1b. "$XX" (bare dollar amount in table, no copay label) → extract XX
    Examples: "Scratch Coating $15", "Tint $15", "UV Treatment $15", "Retinal Imaging Up to $39"
2. "$XX.00 copay" → extract as integer XX
3. "Covered" / "No copay" / "Included" → 0
4. Plain number "XX" → extract as-is
5. "$XX/eye" or "$XX per eye" → extract XX (per-eye amount)
6. "$XX-YY" range → extract LOWER value XX
7. "XX% off retail" → keep as string "XX% off retail"
8. "$XX copay; YY% off less $ZZ allowance" → keep FULL string
9. "N/A" / "Not covered" → skip this field entirely
10. "Covered if under 19" → 0
11. "Medically necessary only" → 0
12. "Applied to $XX allowance" → extract XX
13. "Member pays XX%" → keep as string
14. "Over $XX allowance" → extract XX
15. Plain numbers in tables → extract directly

---

## SPECIAL CASES

**Age-Dependent Benefits:**
If "Polycarbonate: Free if under 18, \$40 if adult" extract separately:
- "polycarbonateChild": 0
- "polycarbonate": 40

**Tier 4 & AR Tier 3 Complexity:**
- Can be simple copay: "$XX copay" → extract XX
- Can be formula: "$XX copay; YY% off less $ZZ allowance" → keep FULL string
Always preserve the complete formula if present.

**Multiple Family Members:**
If different copays for different members, return an array of member objects.

**"Applies to Allowance":**
Extract both copay amount AND allowance separately - it's not an additional charge.

---

## COMPLETE EXAMPLE

**Example output format (use actual values from document, not these placeholders):**

CARRIER: EyeMed
MEMBER_NAME: [name from document]
MEMBER_ID: [id from document]

COPAYS:
- examCopay: [read actual amount from document]
- Varilux Comfort: [read actual amount for Tier 1 from document]
- Varilux Physio: [read actual amount for Tier 2 from document]
- Varilux X Series: [read actual amount for Tier 3 from document]
- Varilux XR Series: [amount or full formula string from document]
- Crizal Easy: [read actual amount for AR Tier 1 from document]
- Crizal Prevencia: [amount or discount string from document]
- polycarbonate: [adult amount from document]
- polycarbonateChild: [child amount if different from document]
- Transitions: [read actual amount from document]

ALLOWANCES:
- frameAllowance: [read actual amount from document]
- frameOverageDiscount: [read actual percentage from document]

---

## CRITICAL REMINDERS

1. Use OUR product names (Varilux Comfort), NEVER tier codes (progressiveTier1)
2. Return ONLY valid JSON, no explanation text
3. Use actual JSON null, NOT string "null"
4. Keep FORMULA copays as COMPLETE strings
5. Handle age-dependent benefits separately
6. For ranges, use LOWER value
7. Keep percentage discounts as strings
8. Map ALL tier variations correctly
9. If multiple family members, return array
10. Look for alternate names: "Anti-Reflective" = "AR Coating", "Photochromic" = "Transitions"

---

## REFERENCE RANGES (Always Read The Actual Document - Do NOT Copy These)

These are TYPICAL ranges from past documents. Your job is to READ THE ACTUAL DOCUMENT.
Every document is different. Do NOT default to these values.

- examCopay: Usually $0-$20
- frameAllowance: Usually $100-$230
- Varilux Comfort (Tier 1): Usually $55-$95
- Varilux Physio (Tier 2): Usually $80-$135
- Varilux X Series (Tier 3): Usually $105-$175
- Crizal Easy (AR Tier 1): Usually $35-$55
- Crizal Sapphire (AR Tier 2): Usually $55-$75

If you see values wildly outside these ranges (like Tier 1 = $500), double-check you're reading the correct field from the document.

---

## RETURN FORMAT

Single member:
\`\`\`json
{ "carrier": "EyeMed", "patientName": "...", ... }
\`\`\`

Multiple members:
\`\`\`json
[ { "carrier": "EyeMed", "patientName": "Member 1", ... }, { "carrier": "EyeMed", "patientName": "Member 2", ... } ]
\`\`\`
`

  const startTime = Date.now()

  const response = await getAnthropicClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
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

  // Extract top-level fields, handling both memberName and patientName variants
  const memberName = (extractedValues['MEMBER_NAME'] || extractedValues['PATIENT_NAME'] || '') as string
  const memberId = (extractedValues['MEMBER_ID'] || '') as string
  const carrier = (extractedValues['CARRIER'] || 'Unknown') as string

  return {
    carrier,
    memberName,
    memberId,
    groupNumber: extractedValues['GROUP_NUMBER'] as string || '',
    effectiveDate: extractedValues['EFFECTIVE_DATE'] as string || '',
    extractedValues,
    rawSummary: rawText,
    confidence: 0.9, // High confidence with direct vision reading
    processingCost
  }
}

/**
 * Parse Haiku's structured response into key-value pairs
 * Handles both JSON code blocks and text format
 */
function parseHaikuResponse(text: string): Record<string, string | number | null> {
  const result: Record<string, string | number | null> = {}

  // First, try to extract JSON from code blocks (markdown format)
  let jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)

  // If no code block, try to find raw JSON object (starts with { and ends with })
  if (!jsonMatch) {
    // Find the first { and try to parse from there
    const openBrace = text.indexOf('{')
    if (openBrace !== -1) {
      // Try to find the matching closing brace
      let braceCount = 0
      let closePos = -1
      for (let i = openBrace; i < text.length; i++) {
        if (text[i] === '{') braceCount++
        else if (text[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            closePos = i
            break
          }
        }
      }
      if (closePos !== -1) {
        const jsonStr = text.substring(openBrace, closePos + 1)
        jsonMatch = [jsonStr, jsonStr] as any
      }
    }
  }

  if (jsonMatch) {
    try {
      const jsonData = JSON.parse(jsonMatch[1])

      // Flatten the JSON into our expected key structure
      // Convert from: { carrier: "EyeMed", patientName: "John", COPAYS: { singleVision: 10 } }
      // To: { CARRIER: "EyeMed", PATIENT_NAME: "John", COPAYS_SINGLE_VISION: 10 }

      const flattenJson = (obj: any, prefix = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          // Convert camelCase to UPPER_SNAKE_CASE (or keep already uppercase)
          const upperKey = key
            .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase to snake_case
            .toUpperCase()
          const fullKey = prefix ? `${prefix}_${upperKey}` : upperKey

          if (value === null || value === undefined) {
            result[fullKey] = null
          } else if (typeof value === 'object' && !Array.isArray(value)) {
            flattenJson(value, fullKey)
          } else if (Array.isArray(value)) {
            result[fullKey] = JSON.stringify(value)
          } else {
            result[fullKey] = value
          }
        }
      }

      flattenJson(jsonData)
      return result
    } catch (e) {
      // Fall through to text parsing
    }
  }

  // Fall back to text format parsing
  const lines = text.split('\n')
  let currentSection = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Skip markdown code fence markers and JSON headers
    if (trimmed.startsWith('```') || trimmed === '{' || trimmed === '}') continue

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
 * Extract formula components from discount notes
 * Looks for patterns like "20% off retail price less $120 allowance"
 * Returns structured data about which tiers have formula-based pricing
 */
interface FormulaComponents {
  discountPercent: number | null
  allowance: number | null
  appliesToTiers: string[]  // e.g., ['tier_4', 'tier_5', 'premium']
  rawNote: string
}

function extractFormulaComponents(values: Record<string, string | number | null>): FormulaComponents[] {
  const formulas: FormulaComponents[] = []


  for (const [key, value] of Object.entries(values)) {
    const keyLower = key.toLowerCase()

    // Look for DISCOUNTS_ or COVERAGE_DETAILS_ entries with _NOTES suffix that indicate formula pricing
    // Haiku sometimes puts discount info in COVERAGE_DETAILS_ instead of DISCOUNTS_
    const isDiscountOrCoverage = keyLower.startsWith('discounts_') || keyLower.startsWith('coverage_details_')
    if (isDiscountOrCoverage && keyLower.endsWith('_notes') && typeof value === 'string') {
      const note = value.toLowerCase()

      // Check if this note contains formula components
      // Pattern: "X% off retail" and/or "less $Y allowance"
      // The discount percent might be in the note OR in the corresponding value key
      let discountMatch = note.match(/(\d+)%\s*off/i)
      let allowanceMatch = note.match(/(?:less|minus)\s*\$?(\d+)\s*allowance/i)

      // If note mentions "allowance" but no dollar amount, try to find allowance from ALLOWANCES_ section
      if (!allowanceMatch && (note.includes('less') || note.includes('minus')) && note.includes('allowance')) {
        // Look for progressive allowance in ALLOWANCES_ section
        for (const [k, v] of Object.entries(values)) {
          const kLower = k.toLowerCase()
          if (kLower.includes('allowances_') && kLower.includes('progressive') && typeof v === 'number') {
            allowanceMatch = [`less $${v} allowance`, String(v)] as unknown as RegExpMatchArray
            break
          }
        }
        // If still not found, use a common default for EyeMed premium progressive allowance
        if (!allowanceMatch && keyLower.includes('progressive') && keyLower.includes('premium')) {
          // EyeMed typically uses $120 allowance for premium progressives
          allowanceMatch = ['less $120 allowance', '120'] as unknown as RegExpMatchArray
        }
      }

      // If note says "% off" without a number, look for the discount in the corresponding value key
      if (!discountMatch && note.includes('% off')) {
        // Get the base key (remove _NOTES suffix) - try original case first, then uppercase
        const baseKeyOriginal = key.replace(/_NOTES$/i, '')
        const baseKeyUpper = key.toUpperCase().replace(/_NOTES$/, '')

        let discountValue = values[baseKeyOriginal] ?? values[baseKeyUpper]

        // Also try to find a matching key (case-insensitive)
        if (discountValue === undefined) {
          const baseKeyLower = baseKeyOriginal.toLowerCase()
          for (const [k, v] of Object.entries(values)) {
            if (k.toLowerCase() === baseKeyLower && typeof v === 'number') {
              discountValue = v
              break
            }
          }
        }

        if (typeof discountValue === 'number') {
          discountMatch = [`${discountValue}% off`, String(discountValue)] as unknown as RegExpMatchArray
        }
      }


      if (discountMatch || allowanceMatch) {
        // Determine which tiers this applies to
        const appliesToTiers: string[] = []

        // Check note text for tier references
        if (note.includes('tier 4') || note.includes('tier_4') || note.includes('premium tier 4')) {
          appliesToTiers.push('tier_4')
        }
        if (note.includes('tier 5') || note.includes('tier_5')) {
          appliesToTiers.push('tier_5')
        }

        // Check key for tier references
        if (keyLower.includes('tier_4') || keyLower.includes('tier4')) {
          if (!appliesToTiers.includes('tier_4')) appliesToTiers.push('tier_4')
        }
        if (keyLower.includes('tier_5') || keyLower.includes('tier5')) {
          if (!appliesToTiers.includes('tier_5')) appliesToTiers.push('tier_5')
        }

        // IMPORTANT: "Progressive Lenses (Premium)" in EyeMed typically means Tier 4 and above
        // The key pattern is: DISCOUNTS_PROGRESSIVE_LENSES_(PREMIUM)_NOTES
        if (keyLower.includes('progressive') && keyLower.includes('premium') && !keyLower.includes('tier')) {
          // This is a premium progressive discount - applies to tier_4 and tier_5
          if (!appliesToTiers.includes('tier_4')) appliesToTiers.push('tier_4')
          if (!appliesToTiers.includes('tier_5')) appliesToTiers.push('tier_5')
        }

        // Also check if note mentions "premium" without tier (legacy format)
        if (note.includes('premium') && !note.includes('tier') && appliesToTiers.length === 0) {
          appliesToTiers.push('tier_4')
          appliesToTiers.push('tier_5')
        }


        formulas.push({
          discountPercent: discountMatch ? parseInt(discountMatch[1], 10) : null,
          allowance: allowanceMatch ? parseInt(allowanceMatch[1], 10) : null,
          appliesToTiers,
          rawNote: value
        })
      }
    }
  }

  return formulas
}

/**
 * Build normalized EyeMed copay fields that the precompute expects
 * Maps raw extracted keys like COPAYS_SINGLE_VISION_LENSES to normalized names like singleVision
 * Also searches COVERAGE_DETAILS_ since EyeMed often puts values there
 *
 * NEW: Also extracts formula components when present (discount %, allowance)
 * For tiers with formulas, stores structured pricing info
 */
function buildEyemedNormalizedCopays(values: Record<string, string | number | null>): Record<string, number | string | null> {
  const result: Record<string, number | string | null> = {}

  // First, extract any formula components from DISCOUNTS_ notes
  const formulaData = extractFormulaComponents(values)

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

  // Progressive Standard copay (base copay for formulas)
  const progressiveStandard = findValue(['progressive_-_standard', 'progressive_standard', 'progressive_(standard)'])
  if (progressiveStandard !== null) result['progressiveStandard'] = progressiveStandard

  // Store formula components for tiers that have formula-based pricing
  // This allows precompute to apply the correct formula per plan
  for (const formula of formulaData) {
    if (formula.appliesToTiers.length > 0) {
      // Store discount percent if found
      if (formula.discountPercent !== null) {
        for (const tier of formula.appliesToTiers) {
          const key = `${tier}DiscountPercent`
          result[key] = formula.discountPercent
        }
      }

      // Store allowance if found
      if (formula.allowance !== null) {
        for (const tier of formula.appliesToTiers) {
          const key = `${tier}Allowance`
          result[key] = formula.allowance
        }
        // Also store as progressiveAllowance for general use
        if (!result['progressiveAllowance']) {
          result['progressiveAllowance'] = formula.allowance
        }
      }

      // Mark these tiers as having formula-based pricing
      for (const tier of formula.appliesToTiers) {
        result[`${tier}HasFormula`] = 1  // Flag indicating formula pricing
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

    // VARILUX PRODUCT NAME MAPPING (from Haiku extraction prompt)
    // Maps product names directly to tier fields
    if (keyLower.includes('varilux')) {
      if (keyLower.includes('comfort')) {
        tiers.progressiveTier1 = numValue
      } else if (keyLower.includes('physio')) {
        tiers.progressiveTier2 = numValue
      } else if (keyLower.includes('x series') || keyLower.includes('x_series') || keyLower.includes('x-series') || keyLower.includes('xseries')) {
        // X Series matches "x series", "x_series", "x-series", or "xseries"
        tiers.progressiveTier3 = numValue
      } else if (keyLower.includes('xr series') || keyLower.includes('xr_series') || keyLower.includes('xr-series') || keyLower.includes('xrseries')) {
        // XR Series matches "xr series", "xr_series", "xr-series", or "xrseries"
        tiers.progressiveTier4 = numValue
      } else if (keyLower.includes('panorama')) {
        tiers.progressiveTier4 = numValue  // Panorama is sometimes Tier 4
      }
    }

    // CRIZAL PRODUCT NAME MAPPING (from Haiku extraction prompt)
    // Maps AR coating product names directly to AR tier fields
    if (keyLower.includes('crizal')) {
      if (keyLower.includes('easy')) {
        tiers.arTier1 = numValue
      } else if (keyLower.includes('sapphire')) {
        tiers.arTier2 = numValue
      } else if (keyLower.includes('prevencia')) {
        tiers.arTier3 = numValue
      }
    }

    // SUNSHIELD (alternative AR Tier 3)
    if (keyLower.includes('sunshield')) {
      tiers.arTier3 = numValue
    }

    // Progressive tiers - check for COPAYS_PROGRESSIVE patterns (legacy support)
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

    // AR coating tiers - check for COPAYS_ANTI_REFLECTIVE patterns (legacy support)
    if (keyLower.includes('anti_reflective') || keyLower.includes('anti-reflective') || keyLower.includes('ar_coating') || keyLower.includes('ar')) {
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
