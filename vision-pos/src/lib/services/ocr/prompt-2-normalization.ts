/**
 * Prompt 2: Normalization & Mapping
 *
 * Takes raw extracted data from Prompt 1 and normalizes it using rosetta stones
 * and business rules.
 *
 * KEY PRINCIPLES:
 * - Map terminology using rosetta stones
 * - Apply business rules (age conditions, tier ranges)
 * - Parse formulas into structured components
 * - Flag unmapped benefits
 * - Validate against expected ranges
 */

import Anthropic from '@anthropic-ai/sdk'
import rosettaEyemed from '@/lib/data/rosetta-eyemed.json'
import rosettaVSP from '@/lib/data/rosetta-vsp.json'
import businessRules from '@/lib/data/business-rules.json'
import type { RawExtractionResult, RawBenefit } from './prompt-1-raw-extraction'

let _anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
  }
  return _anthropicClient
}

export interface NormalizedBenefit {
  canonicalName: string
  originalText: string
  category: string
  value?: number | string
  valueUnit?: string
  formula?: {
    baseCopay?: number
    discountPercent?: number
    allowance?: number
    rawText: string
  }
  productMapping?: string
  productMappingConfidence?: 'high' | 'medium' | 'low'
  appliedRules?: string[]
  ageDependentValue?: {
    under19?: number | string
    age19Plus?: number | string
  }
  frequency?: string
  eligible?: boolean
  notes?: string
}

export interface MappingResult {
  totalBenefits: number
  successfulMappings: number
  partialMappings: number
  unmappedCount: number
}

export interface ValidationWarning {
  benefitName: string
  warning: string
  severity: 'error' | 'warning' | 'info'
}

export interface NormalizedExtractionResult {
  carrier: string
  carrierConfidence: 'high' | 'medium' | 'low'
  memberInfo: {
    name?: string
    memberId?: string
    groupNumber?: string
    effectiveDate?: string
    dateOfBirth?: string
    planName?: string
  }
  normalizedBenefits: NormalizedBenefit[]
  mappingResults: MappingResult
  appliedBusinessRules: string[]
  unmappedBenefits: Array<{
    originalName: string
    category: string
    value: string
    reason: string
  }>
  validationWarnings: ValidationWarning[]
}

/**
 * Normalize raw extracted data using rosetta stones and business rules
 */
export async function normalizeBenefits(
  rawData: RawExtractionResult
): Promise<NormalizedExtractionResult> {
  // Select appropriate rosetta stone
  const rosettaStone =
    rawData.carrier === 'EyeMed'
      ? rosettaEyemed
      : rawData.carrier === 'VSP'
        ? rosettaVSP
        : null

  if (!rosettaStone) {
    return createEmptyResult(rawData)
  }

  // Use Claude to perform the mapping
  const client = getAnthropicClient()

  const prompt = `You are normalizing vision insurance benefits using terminology mappings.

RAW EXTRACTION DATA:
${JSON.stringify(rawData, null, 2)}

ROSETTA STONE (terminology mappings):
${JSON.stringify(rosettaStone, null, 2)}

BUSINESS RULES:
${JSON.stringify(businessRules, null, 2)}

TASK: Normalize the raw benefits by:

1. **Terminology Mapping**: For each raw benefit, find the closest match in the rosetta stone
   - Look for exact matches first
   - Then fuzzy match on terminology variations
   - Assign a confidence score

2. **Product Mapping**: Map normalized benefits to product names
   - EyeMed tiers → Varilux/Crizal product names
   - VSP codes → VSP product names

3. **Business Rule Application**:
   - For EyeMed: Apply age-dependent rules (Polycarbonate, Photochromic)
   - For VSP: Apply material surcharge rules
   - Flag tier-based pricing formulas

4. **Value Parsing**:
   - Extract numeric values from strings (e.g., "\$50" → 50)
   - Parse formulas like "\$20 copay; 20% off less \$120" into components
   - Validate against expected ranges from business rules

5. **Unmapped Benefits**:
   - List any benefits that don't match rosetta stone
   - Explain why they couldn't be mapped

OUTPUT FORMAT: Return ONLY valid JSON (no markdown):

{
  "carrier": "${rawData.carrier}",
  "carrierConfidence": "high" | "medium" | "low",
  "memberInfo": {
    "name": "...",
    "memberId": "...",
    "groupNumber": "...",
    "effectiveDate": "...",
    "dateOfBirth": "...",
    "planName": "..."
  },
  "normalizedBenefits": [
    {
      "canonicalName": "Exam",
      "originalText": "Exam",
      "category": "exam",
      "value": 10,
      "valueUnit": "dollars",
      "productMapping": null,
      "productMappingConfidence": "high",
      "appliedRules": [],
      "frequency": "annual",
      "eligible": true,
      "notes": null
    },
    {
      "canonicalName": "Progressive - Premium Tier 1",
      "originalText": "Progressive - Premium Tier 1",
      "category": "progressive",
      "value": 75,
      "valueUnit": "dollars",
      "productMapping": "Varilux Comfort",
      "productMappingConfidence": "high",
      "appliedRules": [],
      "frequency": null,
      "eligible": true
    },
    {
      "canonicalName": "Progressive - Premium Tier 4",
      "originalText": "Progressive - Premium Tier 4",
      "category": "progressive",
      "formula": {
        "baseCopay": 20,
        "discountPercent": 20,
        "allowance": 120,
        "rawText": "\$20 copay; 20% off retail price less \$120 allowance"
      },
      "productMapping": "Varilux XR Series",
      "productMappingConfidence": "high",
      "appliedRules": ["tier4_formula_parsing"],
      "notes": "Tier 4 uses formula pricing"
    }
  ],
  "mappingResults": {
    "totalBenefits": 28,
    "successfulMappings": 27,
    "partialMappings": 0,
    "unmappedCount": 1
  },
  "appliedBusinessRules": [
    "progressive_tier_validation",
    "age_dependent_benefits_check"
  ],
  "unmappedBenefits": [
    {
      "originalName": "Some Unknown Benefit",
      "category": "other",
      "value": "\$50",
      "reason": "No rosetta stone match found"
    }
  ],
  "validationWarnings": [
    {
      "benefitName": "Tier 4 Progressive",
      "warning": "Uses formula pricing - requires calculation engine",
      "severity": "warning"
    }
  ]
}

CRITICAL REMINDERS:
- Use rosetta stone to find canonical names (exact matches take priority)
- Confidence scores: high (95%+ match), medium (60-95%), low (<60%)
- Keep original text exactly as written
- Parse numeric values and formulas carefully
- Flag unmapped benefits clearly
- Return valid JSON only`

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  })

  // Parse response
  const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

  let jsonStr = responseText
  if (jsonStr.includes('```json')) {
    jsonStr = jsonStr.split('```json')[1].split('```')[0]
  } else if (jsonStr.includes('```')) {
    jsonStr = jsonStr.split('```')[1].split('```')[0]
  }

  try {
    const normalizedData = JSON.parse(jsonStr.trim()) as NormalizedExtractionResult
    return normalizedData
  } catch (error) {
    console.error('Failed to parse normalization response:', error)
    console.error('Raw response:', responseText)
    return createEmptyResult(rawData)
  }
}

function createEmptyResult(rawData: RawExtractionResult): NormalizedExtractionResult {
  return {
    carrier: rawData.carrier,
    carrierConfidence: rawData.carrierConfidence,
    memberInfo: rawData.memberInfo,
    normalizedBenefits: [],
    mappingResults: {
      totalBenefits: rawData.benefits.length,
      successfulMappings: 0,
      partialMappings: 0,
      unmappedCount: rawData.benefits.length
    },
    appliedBusinessRules: [],
    unmappedBenefits: rawData.benefits.map((b) => ({
      originalName: b.benefitName,
      category: b.category,
      value: b.value,
      reason: 'Normalization failed'
    })),
    validationWarnings: [
      {
        benefitName: 'All benefits',
        warning: 'Normalization service error',
        severity: 'error'
      }
    ]
  }
}
