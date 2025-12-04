// GPT-4o Extraction Service for Insurance Documents
// Migrated from insurance-doc-scanner for Phase 1 integration

import OpenAI from 'openai'
import type { ExtractedInsuranceData } from '@/types/insurance-document'

// Lazy singleton to allow env variables to load first
let openaiClient: OpenAI | null = null

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

const INSURANCE_EXTRACTION_PROMPT = `
You are an AI assistant extracting a complete insurance benefit dataset from OCR text. Return EXACT JSON (no markdown) with fields and confidence 0.0–1.0. Use null if unknown. If you see a lens/enhancement form, treat it as authoritative for enhancements/tier tables. Prefer explicit amounts/tables over guessing; do not return empty arrays unless nothing is present. Dates in YYYY-MM-DD. Money as numbers (no $).

CARRIER DETECTION:
- VSP documents: Look for "VSP", "Patient Record Report", "Lens Enhancement Charges", two-letter codes like KA, FA, QT, AD
- EyeMed documents: Look for "EyeMed", "Member Benefits", "Progressive - Premium Tier", "In-Network Member Cost"
- Spectera documents: Look for "Spectera", "In Network Coverage", "Progressive Lenses: Tier I/II/III/IV/V"

JSON shape:
{
  "patient": {
    "patientName": {"value": string, "confidence": number},
    "memberName": {"value": string, "confidence": number},
    "memberId": {"value": string, "confidence": number},
    "authNumber": {"value": string, "confidence": number},
    "subscriberId": {"value": string, "confidence": number},
    "relationship": {"value": string, "confidence": number},
    "patientBirthDate": {"value": "YYYY-MM-DD" or null, "confidence": number},
    "authEffectiveDate": {"value": "YYYY-MM-DD" or null, "confidence": number},
    "authExpirationDate": {"value": "YYYY-MM-DD" or null, "confidence": number}
  },
  "conditions": {
    "systemic": {
      "highRiskForPrediabetes": {"value": boolean|null, "confidence": number},
      "diabetes": {"value": boolean|null, "confidence": number},
      "hypertension": {"value": boolean|null, "confidence": number},
      "highCholesterol": {"value": boolean|null, "confidence": number}
    },
    "ocular": {
      "diabeticRetinopathy": {"value": boolean|null, "confidence": number},
      "glaucoma": {"value": boolean|null, "confidence": number},
      "amd": {"value": boolean|null, "confidence": number},
      "noneOfThese": {"value": boolean|null, "confidence": number}
    },
    "clinicalActions": {
      "dilationPerformed": {"value": boolean|null, "confidence": number},
      "pcpCommunicationCompletedPlanned": {"value": boolean|null, "confidence": number}
    },
    "patientHistory": {
      "lastWellvisionExamDate": {"value": "YYYY-MM-DD" or null, "confidence": number},
      "dilationIndicated": {"value": string|null, "confidence": number},
      "pcpCommunicationIndicated": {"value": string|null, "confidence": number},
      "reportedConditions": {"value": string|null, "confidence": number},
      "diagnosisCodes": {"value": string[]|null, "confidence": number}
    }
  },
  "eligibility": {
    "examProfServices": {"value": string|null, "confidence": number},
    "lens": {"value": string|null, "confidence": number},
    "frame": {"value": string|null, "confidence": number},
    "contacts": {"value": string|null, "confidence": number},
    "frequency": {
      "examFrequency": {"value": string|null, "confidence": number},
      "lensFrequency": {"value": string|null, "confidence": number},
      "frameFrequency": {"value": string|null, "confidence": number},
      "contactsFrequency": {"value": string|null, "confidence": number}
    }
  },
  "plan": {
    "carrier": {"value": "VSP"|"EyeMed"|"Spectera"|string|null, "confidence": number},
    "benefitPlanName": {"value": string|null, "confidence": number},
    "groupName": {"value": string|null, "confidence": number},
    "groupNumber": {"value": string|null, "confidence": number},
    "network": {"value": string|null, "confidence": number},
    "benefitLevel": {"value": string|null, "confidence": number},
    "clientName": {"value": string|null, "confidence": number},
    "networkLabRequirement": {"value": string|null, "confidence": number},
    "essentialMedicalEyeCareExamCopay": {"value": number|null, "confidence": number}
  },
  "copays": {
    "examCopay": {"value": number|null, "confidence": number},
    "materialsCopay": {"value": number|null, "confidence": number},
    "routineRetinalScreening": {"value": string|null, "confidence": number},
    "singleVisionCopay": {"value": number|null, "confidence": number},
    "bifocalCopay": {"value": number|null, "confidence": number},
    "trifocalCopay": {"value": number|null, "confidence": number},
    "progressiveCopays": {
      "standard": {"value": number|null, "confidence": number},
      "tier1": {"value": number|null, "confidence": number},
      "tier2": {"value": number|null, "confidence": number},
      "tier3": {"value": number|null, "confidence": number},
      "tier4": {"value": number|null, "confidence": number},
      "tier5": {"value": number|null, "confidence": number}
    },
    "arCopays": {
      "standard": {"value": number|null, "confidence": number},
      "tier1": {"value": number|null, "confidence": number},
      "tier2": {"value": number|null, "confidence": number},
      "tier3": {"value": number|null, "confidence": number},
      "tier4": {"value": number|null, "confidence": number}
    },
    "materialCopays": {
      "polycarbonate": {"value": number|"covered"|null, "confidence": number},
      "polycarbonateChild": {"value": number|"covered"|null, "confidence": number},
      "trivex": {"value": number|null, "confidence": number},
      "midIndex": {"value": number|null, "confidence": number},
      "highIndex166": {"value": number|null, "confidence": number},
      "highIndex167": {"value": number|null, "confidence": number},
      "highIndex174": {"value": number|null, "confidence": number}
    },
    "enhancementCopays": {
      "photochromic": {"value": number|null, "confidence": number},
      "polarized": {"value": number|null, "confidence": number},
      "blueLightFilter": {"value": number|null, "confidence": number},
      "tint": {"value": number|null, "confidence": number},
      "uvCoating": {"value": number|null, "confidence": number},
      "scratchCoating": {"value": number|"covered"|null, "confidence": number},
      "edgePolish": {"value": number|null, "confidence": number}
    }
  },
  "vspLensEnhancements": {
    "codes": [
      {
        "code": "string (two-letter code like KA, FA, QT, AD)",
        "description": "string",
        "copaySingleVision": number|null,
        "copayMultifocal": number|null
      }
    ],
    "confidence": number
  },
  "frame": {
    "promotions": {
      "extraFramePromotion": {"value": number|null, "confidence": number}
    },
    "allowances": {
      "altairMarchonFrameAllowance": {"allowance": number|null, "overageDiscount": number|null, "confidence": number},
      "nonAltairMarchonFrameAllowance": {"allowance": number|null, "overageDiscount": number|null, "confidence": number},
      "frameAllowance": {"value": number|null, "confidence": number},
      "frameOveragePercent": {"value": number|null, "confidence": number}
    }
  },
  "contacts": {
    "clExamDiscount": {"value": string|null, "confidence": number},
    "clExamAndMaterialsAllowance": {"value": number|null, "confidence": number},
    "clExamOnlyPatientPaysOver": {"value": number|null, "confidence": number},
    "contactsInsteadOfGlasses": {"value": boolean|null, "confidence": number},
    "nextFrameAvailableDate": {"value": string|null, "confidence": number},
    "selectionContactLensesFit": {"value": string|null, "confidence": number},
    "nonSelectionContactLensesFit": {"value": string|null, "confidence": number},
    "selectionDailyBiweekly": {"value": string|null, "confidence": number},
    "selectionMonthly": {"value": string|null, "confidence": number},
    "necessaryCl": {
      "necessaryClCopay": {"value": number|null, "confidence": number}
    }
  },
  "valueAdded": {
    "additionalPairDiscount": {"value": number|null, "confidence": number},
    "clExam12MonthsDiscount": {"value": number|null, "confidence": number}
  },
  "enhancements": {
    "covered": {"value": string[]|null, "confidence": number},
    "coveredWithAdditionalCopay": {"value": string[]|null, "confidence": number},
    "coveredWithAdditionalCopayOr80Uc": {"value": string[]|null, "confidence": number}
  },
  "disclaimers": {
    "phiConfidentialDisclaimer": {"value": string|null, "confidence": number},
    "coverageDisclaimer": {"value": string|null, "confidence": number}
  },
  "overallConfidence": number,
  "notes": "string"
}

EXTRACTION RULES:

General:
- Return JSON only.
- Use numbers for money, no $.
- Use boolean for checkbox states; null if unknown.
- Dates as YYYY-MM-DD when possible.
- For "covered" or "Covered-in-Full" items, use 0 for the copay value.

VSP-SPECIFIC (when carrier is VSP):
- CRITICAL: Extract ALL two-letter lens enhancement codes (KA, KE, FA, FE, JA, JE, NA, NE, OA, OE, QM, QT, QV, QW, AD, AB, AH, AJ, PR, PS, DA, SW, LF, MN) with their dollar copay amounts.
- For VSP Lens Enhancement Charges documents, the format is usually "CODE - Description $XX" or "CODE - Description $XX$YY" (first is SV, second is MF).
- If an item shows "Covered" or "EasyOptions - Covered", set copay to 0.
- Put VSP codes in "vspLensEnhancements.codes" array.
- Progressive codes: KA/KE (standard), FA/FE (premium 1), JA/JE (premium 2), OA/OE (custom 1), NA/NE (custom 2).
- AR codes: QM (standard), QT (tier 1), QV (tier 2), QW (tier 3).
- Material codes: AD (polycarbonate), AB (trivex), AH (high index 1.67), AJ (high index 1.74).
- Enhancement codes: PR/PS (photochromic), DA (polarized), SW (rimless drill), LF/MN (other).

EyeMed-SPECIFIC:
- Extract progressive tier copays: Standard, Premium Tier 1-4.
- Extract AR coating tier copays: Standard, Premium Tier 1-3.
- Extract frame allowance and overage discount (usually 20%).
- Extract contact lens allowance from "Declining Balance" section if present.
- Map to progressiveCopays.standard/tier1/tier2/tier3/tier4.

Spectera-SPECIFIC:
- Extract progressive tier copays: Tier I, II, III, IV, V.
- Extract AR coating tier copays: Tier I, II, III, IV.
- Frame overage is usually shown as "70% of Balance over $XXX" - extract the allowance amount.
- Contact lens allowance is in "Non-Selection Contact Lenses" section.
- Map Roman numerals to Arabic: I=1, II=2, III=3, IV=4, V=5.
`

export async function parseInsuranceDocument(
  ocrText: string
): Promise<ExtractedInsuranceData> {
  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: INSURANCE_EXTRACTION_PROMPT,
        },
        {
          role: 'user',
          content: `OCR TEXT:\n${ocrText}`,
        },
      ],
      temperature: 0.1, // Low temperature for more deterministic output
      response_format: { type: 'json_object' },
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error('No response from GPT-4o')
    }

    // Parse the JSON response
    const parsed = JSON.parse(response) as ExtractedInsuranceData

    // Basic validation (ensure we have some core fields)
    if (!parsed.patient || !parsed.plan) {
      throw new Error('Invalid response structure from GPT-4o')
    }

    return parsed
  } catch (error) {
    console.error('Error parsing insurance document with GPT:', error)
    throw new Error(
      `GPT parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Calculate overall confidence score from individual field confidences
 */
export function calculateOverallConfidence(
  data: ExtractedInsuranceData
): number {
  // Average all numeric confidences in the structure
  const collect = (obj: unknown, acc: number[] = []): number[] => {
    if (!obj || typeof obj !== 'object') return acc
    for (const val of Object.values(obj)) {
      if (
        val &&
        typeof val === 'object' &&
        'confidence' in val &&
        typeof (val as { confidence: unknown }).confidence === 'number'
      ) {
        acc.push((val as { confidence: number }).confidence)
      } else if (val && typeof val === 'object') {
        collect(val, acc)
      }
    }
    return acc
  }
  const confidences = collect(data)
  if (!confidences.length) return 0
  return confidences.reduce((a, b) => a + b, 0) / confidences.length
}

/**
 * Determine confidence level category
 */
export function getConfidenceLevel(
  confidence: number
): 'high' | 'medium' | 'low' {
  if (confidence >= 0.9) return 'high'
  if (confidence >= 0.7) return 'medium'
  return 'low'
}
