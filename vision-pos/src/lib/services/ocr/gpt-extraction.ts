// GPT-4o Extraction Service for Insurance Documents
// Updated with comprehensive schema from vision_auth_schema.md

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
You are an AI assistant extracting a complete insurance benefit dataset from OCR text for a vision POS system.
Return EXACT JSON (no markdown) with fields and confidence 0.0–1.0. Use null if unknown.
If you see a lens/enhancement form, treat it as authoritative for enhancements/tier tables.
Prefer explicit amounts/tables over guessing; do not return empty arrays unless nothing is present.
Dates in YYYY-MM-DD. Money as numbers (no $).

## CARRIER DETECTION:
- **VSP documents**: Look for "VSP", "Patient Record Report", "Lens Enhancement Charges", "EasyOptions", two-letter codes like KA, FA, QT, AD
- **EyeMed documents**: Look for "EyeMed", "Member Benefits", "Progressive - Premium Tier", "In-Network Member Cost", "Declining Balance"
- **Spectera documents**: Look for "Spectera", "In Network Coverage", "Progressive Lenses: Tier I/II/III/IV/V"

## EXAMPLE EXTRACTIONS:

### EyeMed Example Output:
{
  "schemaVersion": "1.0",
  "patient": {
    "patientName": {"value": "AMANDA PINTO", "confidence": 0.95},
    "memberName": {"value": "AMANDA PINTO", "confidence": 0.95},
    "memberId": {"value": "22868382200", "confidence": 0.95},
    "authNumber": {"value": null, "confidence": 0},
    "relationship": {"value": "Member", "confidence": 0.9},
    "patientBirthDate": {"value": "1981-05-15", "confidence": 0.95},
    "gender": {"value": "Female", "confidence": 0.9}
  },
  "provider": {
    "providerName": {"value": "INSIGHT EYECARE AND OPTICAL LLC", "confidence": 0.95},
    "providerNpi": {"value": "1205421781", "confidence": 0.95},
    "locationAddress": {"value": "4068 13TH ST, SAINT CLOUD, FL, 34769", "confidence": 0.9},
    "dateOfService": {"value": "2025-05-08", "confidence": 0.95}
  },
  "eligibility": {
    "examProfServices": {"value": "Eligible", "confidence": 0.9},
    "lens": {"value": "Eligible", "confidence": 0.9},
    "frame": {"value": "Eligible", "confidence": 0.9},
    "contacts": {"value": "Eligible", "confidence": 0.9},
    "examEligibleDate": {"value": "2023-01-01", "confidence": 0.85},
    "frequency": {
      "examFrequency": {"value": "Once every 12 months from the date of service", "confidence": 0.9},
      "lensFrequency": {"value": "Once every 12 months from the date of service", "confidence": 0.9},
      "frameFrequency": {"value": "Once every 24 months from the date of service", "confidence": 0.9},
      "contactsFrequency": {"value": "Once every 12 months from the date of service", "confidence": 0.9}
    },
    "restrictions": {
      "contactsOrGlasses": {"value": true, "confidence": 0.9}
    }
  },
  "plan": {
    "carrier": {"value": "EyeMed", "confidence": 0.98},
    "benefitPlanName": {"value": "Humana VCP", "confidence": 0.9},
    "groupName": {"value": "Humana VCP - State of Florida", "confidence": 0.9},
    "groupNumber": {"value": "9798513", "confidence": 0.9},
    "benefitLevel": {"value": "632", "confidence": 0.85}
  },
  "copays": {
    "examCopay": {"value": 10, "confidence": 0.95},
    "singleVisionCopay": {"value": 10, "confidence": 0.95},
    "bifocalCopay": {"value": 10, "confidence": 0.95},
    "trifocalCopay": {"value": 10, "confidence": 0.95},
    "progressiveCopays": {
      "standard": {"value": 70, "confidence": 0.95},
      "tier1": {"value": 80, "confidence": 0.95},
      "tier2": {"value": 104, "confidence": 0.95},
      "tier3": {"value": 145, "confidence": 0.95},
      "tier4": {"value": 185, "confidence": 0.95}
    },
    "arCopays": {
      "standard": {"value": 0, "confidence": 0.95},
      "tier1": {"value": 0, "confidence": 0.95},
      "tier2": {"value": 85, "confidence": 0.95},
      "tier3": {"value": 105, "confidence": 0.95}
    },
    "materialCopays": {
      "polycarbonate": {"value": 25, "confidence": 0.95},
      "polycarbonateChild": {"value": 0, "confidence": 0.95},
      "midIndex": {"value": 55, "confidence": 0.9},
      "highIndex167": {"value": 95, "confidence": 0.9}
    },
    "enhancementCopays": {
      "photochromic": {"value": 88, "confidence": 0.95},
      "polarized": {"value": 66, "confidence": 0.95},
      "tint": {"value": 15, "confidence": 0.9},
      "uvCoating": {"value": 15, "confidence": 0.9},
      "scratchCoating": {"value": 0, "confidence": 0.9},
      "edgePolish": {"value": 14, "confidence": 0.9}
    }
  },
  "decliningBalance": {
    "clStarting": {"value": 150, "confidence": 0.95},
    "clRemaining": {"value": 150, "confidence": 0.95}
  },
  "frame": {
    "promotions": {"extraFramePromotion": {"value": null, "confidence": 0}},
    "allowances": {
      "wholesaleAllowance": {"value": 125, "confidence": 0.9},
      "retailMinAllowance": {"value": 250, "confidence": 0.9},
      "retailMaxAllowance": {"value": 375, "confidence": 0.9},
      "frameOveragePercent": {"value": 20, "confidence": 0.85}
    }
  },
  "clFit": {
    "standardCost": {"value": "85% of amount over remaining balance", "confidence": 0.9},
    "premiumCost": {"value": "85% of amount over remaining balance", "confidence": 0.9}
  },
  "contacts": {
    "conventionalCost": {"value": "100% of amount over remaining balance", "confidence": 0.9},
    "disposableCost": {"value": "100% of amount over remaining balance", "confidence": 0.9},
    "contactsInsteadOfGlasses": {"value": true, "confidence": 0.9},
    "necessaryCl": {"necessaryClCopay": {"value": 0, "confidence": 0.9}}
  },
  "familyMembers": [
    {"name": "PINTO, SAVANNAH", "memberId": "22868382202", "dateOfBirth": "2017-08-17"},
    {"name": "PINTO, WILLIAM", "memberId": "22868382201", "dateOfBirth": "2021-12-22"}
  ],
  "overallConfidence": 0.92,
  "notes": "EyeMed plan with Humana VCP network. Contacts OR glasses restriction applies."
}

### VSP Example Output:
{
  "schemaVersion": "1.0",
  "patient": {
    "patientName": {"value": "BRIAN C CARR", "confidence": 0.95},
    "memberName": {"value": "BRIAN C CARR", "confidence": 0.95},
    "authNumber": {"value": "79322305", "confidence": 0.98},
    "relationship": {"value": "Member", "confidence": 0.95},
    "patientBirthDate": {"value": "1967-07-21", "confidence": 0.95},
    "authEffectiveDate": {"value": "2025-10-03", "confidence": 0.95},
    "authExpirationDate": {"value": "2025-11-02", "confidence": 0.95}
  },
  "plan": {
    "carrier": {"value": "VSP", "confidence": 0.98},
    "benefitPlanName": {"value": "VSP Choice Plan", "confidence": 0.95},
    "clientName": {"value": "ANR0499FLX01", "confidence": 0.9},
    "network": {"value": "Choice", "confidence": 0.9},
    "networkLabRequirement": {"value": "Must use plan designated contract laboratory", "confidence": 0.9}
  },
  "eligibility": {
    "examProfServices": {"value": "Eligible", "confidence": 0.9},
    "lens": {"value": "Eligible", "confidence": 0.9},
    "frame": {"value": "Eligible", "confidence": 0.9},
    "contacts": {"value": "Eligible", "confidence": 0.9},
    "frequency": {
      "examFrequency": {"value": "Every year beginning in January", "confidence": 0.9},
      "lensFrequency": {"value": "Every year beginning in January", "confidence": 0.9},
      "frameFrequency": {"value": "Every year beginning in January", "confidence": 0.9},
      "contactsFrequency": {"value": "Every year beginning in January", "confidence": 0.9}
    },
    "restrictions": {
      "contactsOrGlasses": {"value": true, "confidence": 0.9}
    }
  },
  "copays": {
    "examCopay": {"value": 10, "confidence": 0.95},
    "materialsCopay": {"value": 25, "confidence": 0.95},
    "routineRetinalScreening": {"value": "lesser of $39 or U&C", "confidence": 0.9}
  },
  "easyOptions": {
    "enabled": {"value": true, "confidence": 0.95},
    "clUpgrade": {"value": 300, "confidence": 0.95},
    "frameUpgrade": {"value": 350, "confidence": 0.95},
    "arCovered": {"value": true, "confidence": 0.9},
    "photoCovered": {"value": true, "confidence": 0.9},
    "progCovered": {"value": true, "confidence": 0.9}
  },
  "frame": {
    "promotions": {"extraFramePromotion": {"value": null, "confidence": 0}},
    "allowances": {
      "altairMarchonFrameAllowance": {"allowance": 220, "overageDiscount": 20, "confidence": 0.95},
      "nonAltairMarchonFrameAllowance": {"allowance": 200, "overageDiscount": 20, "confidence": 0.95},
      "marchonUpgradedAllowance": {"value": 370, "confidence": 0.9},
      "standardUpgradedAllowance": {"value": 350, "confidence": 0.9}
    }
  },
  "contacts": {
    "clExamCopay": {"value": "lesser of $60 copay or 85% U&C", "confidence": 0.9},
    "clExamAndMaterialsAllowance": {"value": 200, "confidence": 0.95},
    "clAllowanceUpgraded": {"value": 300, "confidence": 0.9},
    "contactsInsteadOfGlasses": {"value": true, "confidence": 0.9},
    "necessaryCl": {"necessaryClCopay": {"value": 25, "confidence": 0.9}}
  },
  "valueAdded": {
    "additionalPairDiscount": {"value": 20, "confidence": 0.9},
    "additionalPairTimeframe": {"value": "within 12 months of routine exam", "confidence": 0.85},
    "clExam12MonthsDiscount": {"value": 15, "confidence": 0.85}
  },
  "vspLensEnhancements": {
    "codes": [
      {"code": "KA", "description": "Progressive Standard Plastic", "copaySingleVision": null, "copayMultifocal": 0},
      {"code": "FA", "description": "Progressive Premium Plastic", "copaySingleVision": null, "copayMultifocal": 105},
      {"code": "JA", "description": "Progressive Premium 2 Plastic", "copaySingleVision": null, "copayMultifocal": 95},
      {"code": "NA", "description": "Progressive Custom 2", "copaySingleVision": null, "copayMultifocal": 175},
      {"code": "OA", "description": "Progressive Custom 1", "copaySingleVision": null, "copayMultifocal": 150},
      {"code": "AD", "description": "Polycarbonate", "copaySingleVision": 35, "copayMultifocal": 35},
      {"code": "AB", "description": "Trivex/1.60 High Index", "copaySingleVision": 56, "copayMultifocal": 60},
      {"code": "AH", "description": "High Index 1.67", "copaySingleVision": 83, "copayMultifocal": 98},
      {"code": "AJ", "description": "High Index 1.70+", "copaySingleVision": 111, "copayMultifocal": 118},
      {"code": "PR", "description": "Photochromic Plastic", "copaySingleVision": 75, "copayMultifocal": 75},
      {"code": "DA", "description": "Polarized Plastic", "copaySingleVision": 57, "copayMultifocal": 77},
      {"code": "QM", "description": "AR Standard", "copaySingleVision": 41, "copayMultifocal": 41},
      {"code": "QT", "description": "AR Tier 1", "copaySingleVision": 68, "copayMultifocal": 68},
      {"code": "QV", "description": "AR Tier 2", "copaySingleVision": 85, "copayMultifocal": 85},
      {"code": "SW", "description": "Rimless Drill", "copaySingleVision": 30, "copayMultifocal": 30},
      {"code": "SP", "description": "Edge Polish", "copaySingleVision": 16, "copayMultifocal": 16}
    ],
    "confidence": 0.95
  },
  "vspLensCharges": {
    "progressives": {
      "standardK": {"plastic": 0, "glass": 0},
      "premiumF": {"plastic": 105, "glass": 110},
      "premiumJ": {"plastic": 95, "glass": 105},
      "customN": 175,
      "customO": 150,
      "customMeasurementAddon": 10
    },
    "polycarbonate": {
      "baseSv": {"value": 35, "confidence": 0.95},
      "baseMulti": {"value": 35, "confidence": 0.95},
      "digitalAddon": {"value": 10, "confidence": 0.9},
      "polarizedAddon": {"value": 31, "confidence": 0.9},
      "progressiveAddon": {"value": 35, "confidence": 0.9}
    },
    "highIndex": {
      "trivex160Sv": {"value": 56, "confidence": 0.95},
      "trivex160Multi": {"value": 60, "confidence": 0.95},
      "hi166Sv": {"value": 83, "confidence": 0.95},
      "hi166Multi": {"value": 98, "confidence": 0.95},
      "hi170Sv": {"value": 111, "confidence": 0.95},
      "hi170Multi": {"value": 118, "confidence": 0.95}
    },
    "photochromic": {
      "glassSv": {"value": 33, "confidence": 0.9},
      "glassMulti": {"value": 41, "confidence": 0.9},
      "plasticSv": {"value": 75, "confidence": 0.95},
      "plasticMulti": {"value": 75, "confidence": 0.95}
    },
    "polarized": {
      "plasticSv": {"value": 57, "confidence": 0.95},
      "plasticMulti": {"value": 77, "confidence": 0.95},
      "glassSv": {"value": 78, "confidence": 0.9},
      "glassMulti": {"value": 101, "confidence": 0.9},
      "progressiveAddon": {"value": 82, "confidence": 0.9}
    },
    "coatings": {
      "scratchA": {"value": 17, "confidence": 0.9},
      "scratchB": {"value": 33, "confidence": 0.9},
      "arA": {"value": 41, "confidence": 0.95},
      "arC": {"value": 68, "confidence": 0.95},
      "arD": {"value": 85, "confidence": 0.95}
    },
    "misc": {
      "edgePolish": {"value": 16, "confidence": 0.95},
      "edgeCoating": {"value": 36, "confidence": 0.9},
      "facets": {"value": 66, "confidence": 0.9},
      "rimlessDrill": {"value": 30, "confidence": 0.95},
      "nearVariableFocus": {"value": 50, "confidence": 0.9},
      "lightFilter": {"value": 15, "confidence": 0.9},
      "blendedBifocal": {"value": 30, "confidence": 0.9}
    },
    "confidence": 0.95
  },
  "overallConfidence": 0.94,
  "notes": "VSP Choice Plan with EasyOptions upgrades. Full lens enhancement charges table extracted."
}

## EXTRACTION RULES:

### General:
- Return JSON only, no markdown fencing.
- Use numbers for money, no $.
- Use boolean for checkbox states; null if unknown.
- Dates as YYYY-MM-DD when possible.
- For "covered" or "Covered-in-Full" items, use 0 for the copay value.
- Always include schemaVersion: "1.0"
- IMPORTANT: If the document is ONLY a lens enhancement/pricing table (no patient info), you MUST still return valid JSON with the lens data in vspLensEnhancements and/or vspLensCharges. Set plan.carrier to the detected carrier.

### VSP-SPECIFIC (when carrier is VSP):
- CRITICAL: Extract ALL two-letter lens enhancement codes from the Lens Enhancement Charges document.
- Codes include: KA, KE, FA, FE, JA, JE, NA, NE, OA, OE, QM, QT, QV, QW, AD, AB, AH, AJ, PR, PS, DA, SW, LF, MN, SP, SQ, SR, RM, CM, BV, SV.
- Format is usually "CODE - Description $XX" or "CODE - Description $XX$YY" (first is SV, second is MF).
- If an item shows "Covered" or "EasyOptions - Covered", set copay to 0.
- Put VSP codes in BOTH "vspLensEnhancements.codes" array AND "vspLensCharges" structured object.
- Extract EasyOptions: enabled, frame upgrade amount, CL upgrade amount, AR/photo/prog covered.
- Extract frame allowances for BOTH Marchon/Altair AND non-Marchon frames, plus upgraded amounts.
- Progressive codes: KA/KE (standard K), FA/FE (premium F), JA/JE (premium J), OA/OE (custom O), NA/NE (custom N).
- AR codes: QM (standard A), QT (tier C), QV (tier D), QW (tier 3).
- Material codes: AD (polycarbonate), AB (trivex/1.60), AH (high index 1.67), AJ (high index 1.70+).
- Enhancement codes: PR/PS (photochromic), DA/DE (polarized), SW (rimless drill), LF (light filter), MN/MP (tint).
- IMPORTANT CONTACT LENS EXTRACTION: Look for "CL Materials" or "CL Exam and Materials" followed by a dollar amount (e.g., "CL Materials$200.00" or "CL Materials $200"). Extract this as contacts.clExamAndMaterialsAllowance. The value is the contact lens allowance amount. This is often found near "Contacts are instead of [lens, frame]" text.
- CRITICAL CL FITTING COPAY EXTRACTION: Look for any of these phrases and extract the dollar amount as contacts.clExamCopay:
  * "CL Exam Services Charge" followed by copay amount (e.g., "lesser of $60 copay or 85% U&C" → extract 60)
  * "Contact Lens Fitting" with a copay amount
  * "CL Fitting Fee" or "CL Fitting Copay"
  * "Contact Lens Exam" with copay
  * "CL Exam Copay"
  * Any text mentioning contact lens exam/fitting with a dollar amount
  * If it says "lesser of $XX copay or XX% U&C", extract the dollar amount (XX) as the copay value
  * This is the patient's out-of-pocket cost for a contact lens fitting exam - ALWAYS extract this if present

### EyeMed-SPECIFIC:
- Extract progressive tier copays: Standard, Premium Tier 1-4.
- Extract AR coating tier copays: Standard, Premium Tier 1-3.
- Extract frame allowance and overage discount (usually 20%).
- Extract declining balance for contacts: cl_starting and cl_remaining.
- Map to progressiveCopays.standard/tier1/tier2/tier3/tier4.
- Extract family members if listed.
- Look for wholesale/retail frame allowance ranges.

### Spectera-SPECIFIC:
- Extract progressive tier copays: Tier I, II, III, IV, V.
- Extract AR coating tier copays: Tier I, II, III, IV.
- Frame overage is usually shown as "70% of Balance over $XXX" - extract the allowance amount.
- Contact lens allowance is in "Non-Selection Contact Lenses" section.
- Map Roman numerals to tier numbers: I=1, II=2, III=3, IV=4, V=5.

Now extract the data from this OCR text:
`

export async function parseInsuranceDocument(
  ocrText: string
): Promise<ExtractedInsuranceData> {
  try {
    // Use gpt-4o-mini - fast and reliable for text extraction
    // gpt-5-nano was too slow (70-170s per doc), gpt-4o-mini is typically 5-15s
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
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
      response_format: { type: 'json_object' },
    })

    // Log token usage for performance analysis
    const usage = completion.usage
    if (usage) {
      console.log(`📊 GPT Token Usage: ${usage.prompt_tokens} input, ${usage.completion_tokens} output, ${usage.total_tokens} total`)
    }

    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error('No response from GPT')
    }

    // Parse the JSON response
    const parsed = JSON.parse(response) as ExtractedInsuranceData

    // Basic validation - must have EITHER patient/plan info OR lens enhancement data
    // VSP Lens Enhancement Charges documents may not have patient info
    const hasPatientInfo = parsed.patient && (
      parsed.patient.patientName?.value ||
      parsed.patient.memberName?.value ||
      parsed.patient.authNumber?.value
    )
    const hasPlanInfo = parsed.plan && parsed.plan.carrier?.value
    const hasLensEnhancements = parsed.vspLensEnhancements?.codes?.length || parsed.vspLensCharges
    const hasCopayData = parsed.copays && (
      parsed.copays.progressiveCopays ||
      parsed.copays.arCopays ||
      parsed.copays.examCopay?.value !== undefined
    )

    if (!hasPatientInfo && !hasPlanInfo && !hasLensEnhancements && !hasCopayData) {
      console.error('GPT response missing required data:', {
        hasPatientInfo,
        hasPlanInfo,
        hasLensEnhancements,
        hasCopayData,
        responseKeys: Object.keys(parsed)
      })
      throw new Error('Invalid response structure from GPT - no extractable data found')
    }

    // If this is a lens-only document, ensure we at least mark it as VSP
    if (!hasPlanInfo && hasLensEnhancements) {
      if (!parsed.plan) {
        parsed.plan = {} as ExtractedInsuranceData['plan']
      }
      if (!parsed.plan.carrier) {
        parsed.plan.carrier = { value: 'VSP', confidence: 0.9 }
      }
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
 * Extract insurance data directly from an image using GPT-5 Nano vision
 * This eliminates the need for Google Cloud Vision OCR
 */
export async function extractFromImage(
  base64Image: string,
  mimeType: string = 'image/png'
): Promise<ExtractedInsuranceData> {
  try {
    console.log('🤖 Sending image directly to GPT-5 Nano for extraction...')

    // Use gpt-4o-mini for image extraction
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: INSURANCE_EXTRACTION_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the insurance benefit data from this document image:',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error('No response from GPT-5 Nano')
    }

    // Parse the JSON response
    const parsed = JSON.parse(response) as ExtractedInsuranceData

    // Basic validation - must have EITHER patient/plan info OR lens enhancement data
    const hasPatientInfo = parsed.patient && (
      parsed.patient.patientName?.value ||
      parsed.patient.memberName?.value ||
      parsed.patient.authNumber?.value
    )
    const hasPlanInfo = parsed.plan && parsed.plan.carrier?.value
    const hasLensEnhancements = parsed.vspLensEnhancements?.codes?.length || parsed.vspLensCharges
    const hasCopayData = parsed.copays && (
      parsed.copays.progressiveCopays ||
      parsed.copays.arCopays ||
      parsed.copays.examCopay?.value !== undefined
    )

    if (!hasPatientInfo && !hasPlanInfo && !hasLensEnhancements && !hasCopayData) {
      console.error('GPT-5 Nano response missing required data:', {
        hasPatientInfo,
        hasPlanInfo,
        hasLensEnhancements,
        hasCopayData,
        responseKeys: Object.keys(parsed)
      })
      throw new Error('Invalid response structure from GPT-5 Nano - no extractable data found')
    }

    // If this is a lens-only document, ensure we at least mark it as VSP
    if (!hasPlanInfo && hasLensEnhancements) {
      if (!parsed.plan) {
        parsed.plan = {} as ExtractedInsuranceData['plan']
      }
      if (!parsed.plan.carrier) {
        parsed.plan.carrier = { value: 'VSP', confidence: 0.9 }
      }
    }

    console.log('✅ GPT-5 Nano extraction complete')
    return parsed
  } catch (error) {
    console.error('Error extracting from image with GPT-5 Nano:', error)
    throw new Error(
      `GPT-5 Nano extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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
