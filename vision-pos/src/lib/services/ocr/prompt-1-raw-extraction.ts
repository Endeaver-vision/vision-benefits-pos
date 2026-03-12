/**
 * Prompt 1: Raw Insurance Document Extraction
 *
 * This service reads insurance documents and extracts all data EXACTLY as written.
 *
 * KEY PRINCIPLES:
 * - Extract verbatim text (no interpretation)
 * - Preserve exact benefit names as they appear
 * - Keep formulas intact
 * - Simple carrier detection by document markers
 * - Flag confidence issues
 *
 * Output: Pure raw data for Prompt 2 normalization
 */

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'

let _anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
  }
  return _anthropicClient
}

// Type definitions for raw extraction output
export interface RawBenefit {
  category: string
  benefitName: string // EXACT text from document
  value: string // EXACT text from document
  frequency?: string
  notes?: string
  eligible?: boolean
}

export interface RawMemberInfo {
  name?: string
  memberId?: string
  groupNumber?: string
  effectiveDate?: string
  dateOfBirth?: string
  planName?: string
}

export interface RawDocumentStructure {
  hasEligibilitySection: boolean
  hasFrequencyColumn: boolean
  hasTierBreakdown: boolean
  usesTableFormat: boolean
  documentType?: string
}

export interface RawExtractionResult {
  carrier: 'EyeMed' | 'VSP' | 'Spectera' | 'Unknown'
  carrierConfidence: 'high' | 'medium' | 'low'
  carrierMarkers: string[]
  memberInfo: RawMemberInfo
  benefits: RawBenefit[]
  documentStructure: RawDocumentStructure
  extractionNotes: string
  errorFlag?: string
}

/**
 * Extract raw data from insurance document
 * Focuses on verbatim extraction without interpretation
 */
export async function extractRawDocument(
  filePath: string
): Promise<RawExtractionResult> {
  const fileBuffer = fs.readFileSync(filePath)
  const base64Data = fileBuffer.toString('base64')

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

  const prompt = `You are extracting raw data from a vision insurance document.

CRITICAL INSTRUCTIONS:
1. Extract VERBATIM - preserve exact text as it appears
2. Do NOT interpret, translate, or normalize
3. Do NOT apply business rules
4. Do NOT assign product names
5. Keep formulas exactly as written

TASK 1: CARRIER DETECTION
Identify the insurance carrier by looking for these EXACT markers:

**EyeMed Indicators:**
- Text containing "First American Administrators"
- Text containing "inFocus" (EyeMed's system name)
- Text containing "EyeMed" branding
- Text containing "EyeMed Vision"
- Benefit structure with tier names (Tier 1, Tier 2, etc.)

**VSP Indicators:**
- Text containing "Vision Service Plan"
- Text containing "VSP" branding
- Text containing "WFA" (frame code system)
- Text containing "Material Code" (progressive lens system)
- Document has separate pages for "Authorization" and "Lens Enhancement"
- Progressive tiers labeled K, J, F, N, O (not numbers)

**Spectera Indicators:**
- Text containing "Spectera"
- Text containing "United Healthcare Vision"
- Benefit tiers using Roman numerals (I, II, III)

Set carrierConfidence to:
- "high" if you find 2+ definitive markers
- "medium" if you find 1 marker or uncertain
- "low" if no clear markers found

TASK 2: EXTRACT MEMBER INFORMATION
Look for and extract EXACTLY as written:
- Member name
- Member ID / Policy Number
- Group number
- Effective date(s)
- Date of birth (if present)
- Plan name (if present)

TASK 3: EXTRACT BENEFITS
For every benefit listed in the document:
1. Note the category (exam, frames, progressive, contacts, etc.)
2. Record the EXACT benefit name as written (don't paraphrase)
3. Record the EXACT value as written (keep formulas intact, e.g., "$20 copay; 20% off less \$120")
4. Note frequency if listed (annual, once per 2 years, etc.)
5. Add any special notes/restrictions

CRITICAL: If a benefit says "$20 copay; 20% off retail price less \$120 allowance",
write it EXACTLY that way. Do NOT simplify to "\$20 copay or discount".

TASK 4: DOCUMENT STRUCTURE
Note the document format:
- Does it have an "Eligibility" section?
- Does it show frequency (annual, once per 2 years, etc.)?
- Does it break down tiers (Tier 1, Tier 2, K, J, etc.)?
- Is the format a table or prose?

TASK 5: VALIDATION
If you encounter any extraction issues, flag them:
- Text too blurry to read clearly
- Benefit structure unusual or unclear
- Missing critical information
- Contradictory information

OUTPUT FORMAT: Return ONLY valid JSON, no markdown formatting:

{
  "carrier": "EyeMed" | "VSP" | "Spectera" | "Unknown",
  "carrierConfidence": "high" | "medium" | "low",
  "carrierMarkers": ["marker1", "marker2", ...],
  "memberInfo": {
    "name": "John Doe",
    "memberId": "EM123456789",
    "groupNumber": "ABC123",
    "effectiveDate": "01/01/2025",
    "dateOfBirth": "01/15/1985",
    "planName": "EyeMed Plan XYZ"
  },
  "benefits": [
    {
      "category": "exam",
      "benefitName": "Exam",
      "value": "\$10 copay",
      "frequency": "Once every calendar year",
      "eligible": true
    },
    {
      "category": "progressive",
      "benefitName": "Progressive - Premium Tier 1",
      "value": "\$75 copay"
    },
    {
      "category": "progressive",
      "benefitName": "Progressive - Premium Tier 4",
      "value": "\$20 copay; 20% off retail price less \$120 allowance",
      "notes": "Complex formula - keep intact"
    }
  ],
  "documentStructure": {
    "hasEligibilitySection": true,
    "hasFrequencyColumn": true,
    "hasTierBreakdown": true,
    "usesTableFormat": true
  },
  "extractionNotes": "Successfully extracted all visible benefits",
  "errorFlag": null
}

IMPORTANT REMINDERS:
- Preserve exact text - no interpretation
- Keep formulas intact
- Don't assign product names
- Flag confidence issues
- Return valid JSON only`

  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: 'claude-opus-4-5-20251101', // Use latest model for vision
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
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

  // Extract JSON from response
  const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

  // Parse JSON - handle potential markdown formatting
  let jsonStr = responseText
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.split('```json')[1].split('```')[0]
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.split('```')[1].split('```')[0]
  }

  try {
    const extractedData = JSON.parse(jsonStr.trim()) as RawExtractionResult
    return extractedData
  } catch (error) {
    console.error('Failed to parse extraction response:', error)
    console.error('Raw response:', responseText)

    return {
      carrier: 'Unknown',
      carrierConfidence: 'low',
      carrierMarkers: [],
      memberInfo: {},
      benefits: [],
      documentStructure: {
        hasEligibilitySection: false,
        hasFrequencyColumn: false,
        hasTierBreakdown: false,
        usesTableFormat: false
      },
      extractionNotes: 'Failed to parse response',
      errorFlag: 'JSON_PARSE_ERROR'
    }
  }
}
