// Insurance Document Extraction Service
// Uses Claude Haiku for fast, accurate extraction (with Sonnet fallback option)

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { ExtractedInsuranceData } from '@/types/insurance-document'

// Model selection - can be overridden via environment variable
// Options: 'claude-haiku', 'claude-sonnet', 'gpt-4o-mini', 'gpt-4o'
const EXTRACTION_MODEL = process.env.EXTRACTION_MODEL || 'claude-haiku'

// Lazy singletons
let anthropicClient: Anthropic | null = null
let openaiClient: OpenAI | null = null

function getAnthropicClient() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return anthropicClient
}

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
      "tier4": {"value": 185, "confidence": 0.95},
      "tier5": {"value": 225, "confidence": 0.95}
    },
    "arCopays": {
      "standard": {"value": 0, "confidence": 0.95},
      "tier1": {"value": 0, "confidence": 0.95},
      "tier2": {"value": 85, "confidence": 0.95},
      "tier3": {"value": "DISCOUNT_20", "confidence": 0.95}
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
    },
    "allOtherLensOptions": {"value": "DISCOUNT_20", "confidence": 0.95}
  },
  "decliningBalance": {
    "clStarting": {"value": 150, "confidence": 0.95},
    "clRemaining": {"value": 150, "confidence": 0.95},
    "isUnified": {"value": false, "confidence": 0.95}
  },
  "frame": {
    "promotions": {"extraFramePromotion": {"value": null, "confidence": 0}},
    "allowances": {
      "retailMinAllowance": {"value": 150, "confidence": 0.95},
      "frameOveragePercent": {"value": 20, "confidence": 0.95}
    }
  },
  "clFit": {
    "standardCost": {"value": 55, "confidence": 0.9},
    "premiumCost": {"value": "10% off retail price", "confidence": 0.9}
  },
  "contacts": {
    "contactAllowance": {"value": 130, "confidence": 0.95},
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
    "promotions": {
      "extraFramePromotion": {"value": null, "confidence": 0},
      "frameAllowancePromotionCode": {"value": "WFA84", "confidence": 0.95}
    },
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

### CRITICAL - Handling Discount-Based Benefits (NOT null!):
- **NEVER return null for a copay that exists in the document.**
- When a benefit says "20% off retail price" or "X% off U&C", use the string "DISCOUNT_20" (or appropriate percentage).
- When a benefit says "80% of U&C" (patient pays 80%), use the string "DISCOUNT_20".
- Examples of discount-based benefits that should NOT be null:
  * "Anti Reflective Coating - Premium Tier 3: 20% off retail price" → use "DISCOUNT_20"
  * "Progressive - Premium Tier 4: $85 copay; 20% off retail price less $120 allowance" → use the dollar copay (85)
  * "All Other Lens Options: 20% off retail price" → use "DISCOUNT_20"
  * "Lenticular: 20% off retail price" → use "DISCOUNT_20"
- Only use null when the information is genuinely NOT present in the document.

### VSP-SPECIFIC (when carrier is VSP):
- CRITICAL: Extract ALL two-letter lens enhancement codes from the Lens Enhancement Charges document.
- Codes include: KA, KE, FA, FE, JA, JE, NA, NE, OA, OE, QM, QT, QV, QW, AD, AB, AH, AJ, PR, PS, DA, SW, LF, MN, SP, SQ, SR, RM, CM, BV, SV.
- Format is usually "CODE - Description $XX" or "CODE - Description $XX$YY" (first is SV, second is MF).
- If an item shows "Covered" or "EasyOptions - Covered", set copay to 0.
- Put VSP codes in BOTH "vspLensEnhancements.codes" array AND "vspLensCharges" structured object.
- Extract EasyOptions: enabled, frame upgrade amount, CL upgrade amount, AR/photo/prog covered.
- Extract frame allowances for BOTH Marchon/Altair AND non-Marchon frames, plus upgraded amounts.
- **CRITICAL PROMOTION CODE EXTRACTION**: Look for "Promotion" or "Promotion Code" followed by alphanumeric codes like "WFA84", "WFA142", "WFA40", etc. Extract this EXACT text string as frame.promotions.frameAllowancePromotionCode. Common patterns: "WFA" prefix followed by numbers. This appears near frame allowance information.
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
- **CRITICAL**: Extract Group Number, Benefit Level, and Network type - these appear at the top of EyeMed benefit documents

- **CRITICAL - DO NOT CONFUSE PROGRESSIVE TIERS WITH AR TIERS!**
  These are TWO SEPARATE sections on EyeMed benefits:

  **LENSES SECTION** (contains progressive copays):
  * "Progressive - Standard" → progressiveCopays.standard
  * "Progressive - Premium" or "Progressive - Premium Tier 1" → progressiveCopays.tier1
  * "Progressive - Premium Tier 2" → progressiveCopays.tier2
  * etc.

  **LENS OPTIONS SECTION** (contains AR coating copays):
  * "Anti Reflective Coating - Standard" → arCopays.standard
  * "Anti Reflective Coating - Premium Tier 1" → arCopays.tier1
  * "Anti Reflective Coating - Premium Tier 2" → arCopays.tier2
  * "Anti Reflective Coating - Premium Tier 3" → arCopays.tier3

  **IMPORTANT**: If the document shows ONLY "Progressive - Standard: $20" and "Progressive - Premium: $20"
  (without explicit tier numbers), this means ALL progressives are the SAME copay!
  In this case: progressiveCopays.standard = 20, progressiveCopays.tier1 = 20, tier2 = 20, tier3 = 20, tier4 = 20
  Do NOT copy AR tier values ($45/$57/$68/$100) into progressive tiers!

- Extract progressive tier copays from the LENSES section.
- Extract AR coating tier copays from the LENS OPTIONS section.
- Map to progressiveCopays.standard/tier1/tier2/tier3/tier4/tier5.
- Extract family members if listed.
- **CRITICAL "ALL OTHER LENS OPTIONS" EXTRACTION**: Look for "All Other Lens Options" in the Lens Options section. This is EyeMed's catch-all for products not explicitly listed. It typically shows "20% off retail price" - extract this as copays.allOtherLensOptions with value "DISCOUNT_20". This is NOT null! Examples:
  * "All Other Lens Options: 20% off retail price" → {"value": "DISCOUNT_20", "confidence": 0.95}
  * "All Other Lens Options: 25% off retail price" → {"value": "DISCOUNT_25", "confidence": 0.95}

- **CRITICAL FRAME ALLOWANCE EXTRACTION FOR EYEMED** - YOU MUST ALWAYS create the frame.allowances object!

  **IMPORTANT**: The frame section should ALWAYS be included in the output when processing EyeMed documents.
  Look for the "Frame" line under "BENEFITS" - it will have one of these 3 patterns:

  1. **PATTERN A - Copay with allowance (MOST COMMON)**: "$0 copay; 20% off balance over $150 allowance"
     * Extract "$150" as frame.allowances.retailMinAllowance (the frame allowance)
     * Extract "20" as frame.allowances.frameOveragePercent (discount on overage)
     * This is the MOST COMMON EyeMed format - looks for "over $X allowance"
     * Variations seen: $100, $130, $150, $200, $250 allowances

  2. **PATTERN B - Discount only (NO allowance)**: "35% off retail price" or "40% off retail price"
     * Set frame.allowances.retailMinAllowance = 0 (no allowance exists)
     * Set frame.allowances.frameDiscountPercent = 35 or 40 (the discount percentage)
     * DO NOT set retailMinAllowance to null - set it to 0 explicitly

  3. **PATTERN C - Wholesale format**: "Balance over $250 to $375 Retail, equal to $125 Wholesale"
     * Extract "$250" as frame.allowances.retailMinAllowance
     * Extract "$375" as frame.allowances.retailMaxAllowance
     * Extract "$125" as frame.allowances.wholesaleAllowance

  **NEVER** omit the frame section - if you see a Frame benefit line, ALWAYS populate frame.allowances!

- **CRITICAL CONTACT LENS ALLOWANCE FOR EYEMED** - There are 3 DISTINCT patterns:

  1. **PATTERN A - Copay with allowance (MOST COMMON)**: "$0 copay; XX% off balance over $YYY allowance"
     * Example: "Contacts - Conventional: $0 copay; 15% off balance over $250 allowance"
     * Extract "$250" as contacts.contactAllowance AND decliningBalance.clStarting
     * Extract "15% off balance over $250 allowance" as contacts.conventionalCost
     * Example: "Contacts - Disposable: $0 copay; 100% of balance over $250 allowance"
     * Extract "100% of balance over $250 allowance" as contacts.disposableCost
     * The allowance is the SAME for conventional and disposable - use either to get contactAllowance
     * Variations seen: $100, $120, $130, $150, $200, $250 allowances

  2. **PATTERN B - Discount only (NO allowance)**: "15% off retail price" or "100% of retail price"
     * Set contacts.contactAllowance = 0 (no allowance exists)
     * DO NOT set to null - set to 0 explicitly

  3. **PATTERN C - Declining Balance Table**: Look for "Declining Balance Package" section with table:
     * "Contact Lenses and Contacts Fit and Follow Up$150$150"
     * The first dollar amount is "Starting Balance" = contacts.contactAllowance
     * The second dollar amount is "Remaining Balance" = decliningBalance.clRemaining
     * This format shows allowances as a separate table, NOT inline with "Contacts - Conventional"

  **IMPORTANT**: Extract BOTH conventional and disposable costs separately!
  * Conventional usually has a DISCOUNT (e.g., "15% off balance over $XXX")
  * Disposable usually has NO discount (e.g., "100% of balance over $XXX")
  * Do NOT confuse these - they are different!

- **CRITICAL CL FIT EXTRACTION**: Look for "Contact Lens Fit and Follow-Up" section with:
  * "Fit and Follow-up - Standard" → extract the COPAY amount (e.g., "$40 copay" → 40, or "Up to $40" → 40) as clFit.standardCost
  * "Fit and Follow-up - Premium" → extract value (e.g., "$40 copay; 10% off retail price less $55 allowance")
  * Store as numbers when it's a copay, store as string when it includes discount text
  * These are the patient copays for contact lens fitting exams - ALWAYS extract if present.

- **PACKAGE PLANS**: Some EyeMed plans show "Frame, Lens and Lens Options Package" with:
  * "$0 copay; 20% off balance over $100 allowance" - extract the $100 as a COMBINED package allowance
  * Store in frame.allowances.retailMinAllowance (same field as regular frame allowance)

- **CRITICAL - UNIFIED DECLINING BALANCE PLANS** (e.g., "Humana Medicare 703 PPO 400 Plus"):
  These are SPECIAL plans where ONE unified allowance covers ALL materials (frames, lenses, lens options, AND contacts).

  **How to detect:**
  * Look for "Frame, Lens and Lens Options Package" with "$0 copay" and a single allowance amount
  * The SAME allowance amount appears for contacts (conventional AND disposable)
  * Example: "$0 copay; 20% off balance over $450 allowance" for frame/lens AND "$0 copay; 15% off balance over $450 allowance" for contacts
  * Key indicator: The SAME dollar amount ($450) appears across frame/lens AND contact sections
  * Another indicator: "Plan allows the member to receive either contacts or frame and lens services"

  **How to extract:**
  * Set decliningBalance.isUnified = true
  * Set decliningBalance.totalAllowance = the unified allowance amount (e.g., 450)
  * Set decliningBalance.appliesTo = ["frame", "lens", "lensOptions", "contacts"]
  * Extract overage discounts from each section:
    - Frame/Lens Package: "20% off balance over $450" → overageDiscounts.frameLensPackage = 20
    - Contacts Conventional: "15% off balance over $450" → overageDiscounts.contactsConventional = 15
    - Contacts Disposable: "100% of balance over $450" → overageDiscounts.contactsDisposable = 0 (patient pays 100% = 0% discount)
  * Set decliningBalance.eitherOrRestriction = true if "either contacts or frame and lens services"

  **Example output for unified declining balance:**
  "decliningBalance": {
    "clStarting": {"value": 450, "confidence": 0.95},
    "clRemaining": {"value": 450, "confidence": 0.95},
    "isUnified": {"value": true, "confidence": 0.95},
    "totalAllowance": {"value": 450, "confidence": 0.95},
    "appliesTo": {"value": ["frame", "lens", "lensOptions", "contacts"], "confidence": 0.95},
    "overageDiscounts": {
      "frameLensPackage": {"value": 20, "confidence": 0.95},
      "contactsConventional": {"value": 15, "confidence": 0.95},
      "contactsDisposable": {"value": 0, "confidence": 0.95}
    },
    "eitherOrRestriction": {"value": true, "confidence": 0.95}
  }

  **IMPORTANT**: For unified plans, ALSO set:
  * frame.allowances.retailMinAllowance = totalAllowance (e.g., 450)
  * contacts.contactAllowance = totalAllowance (e.g., 450)
  * copays for frame/lens items should be 0 (they consume from the unified pool)

### Spectera-SPECIFIC:
- Extract progressive tier copays: Tier I, II, III, IV, V.
- Extract AR coating tier copays: Tier I, II, III, IV.
- Frame overage is usually shown as "70% of Balance over $XXX" - extract the allowance amount.
- Contact lens allowance is in "Non-Selection Contact Lenses" section.
- Map Roman numerals to tier numbers: I=1, II=2, III=3, IV=4, V=5.

Now extract the data from this OCR text:
`

/**
 * Extract insurance data using Claude (Haiku or Sonnet)
 */
async function extractWithClaude(ocrText: string, model: string): Promise<string> {
  const modelId = model === 'claude-sonnet'
    ? 'claude-sonnet-4-20250514'
    : 'claude-3-5-haiku-20241022'  // Default to Haiku

  console.log(`🤖 Using Claude ${model} (${modelId}) for extraction...`)

  const message = await getAnthropicClient().messages.create({
    model: modelId,
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `${INSURANCE_EXTRACTION_PROMPT}\n\nOCR TEXT:\n${ocrText}`,
      },
    ],
  })

  // Log token usage
  console.log(`📊 Claude Token Usage: ${message.usage.input_tokens} input, ${message.usage.output_tokens} output`)

  // Extract text from response
  const textBlock = message.content.find(block => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Claude may wrap JSON in markdown code blocks - strip them
  let jsonText = textBlock.text.trim()
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7)
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3)
  }
  if (jsonText.endsWith('```')) {
    jsonText = jsonText.slice(0, -3)
  }

  return jsonText.trim()
}

/**
 * Extract insurance data using OpenAI (GPT-4o or GPT-4o-mini)
 */
async function extractWithOpenAI(ocrText: string, model: string): Promise<string> {
  const modelId = model === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini'

  console.log(`🤖 Using OpenAI ${modelId} for extraction...`)

  const completion = await getOpenAIClient().chat.completions.create({
    model: modelId,
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

  // Log token usage
  const usage = completion.usage
  if (usage) {
    console.log(`📊 OpenAI Token Usage: ${usage.prompt_tokens} input, ${usage.completion_tokens} output`)
  }

  return completion.choices[0]?.message?.content || ''
}

export async function parseInsuranceDocument(
  ocrText: string
): Promise<ExtractedInsuranceData> {
  try {
    const startTime = Date.now()
    let response: string | null = null
    let modelUsed = EXTRACTION_MODEL

    // Route to appropriate model
    if (EXTRACTION_MODEL.startsWith('claude')) {
      response = await extractWithClaude(ocrText, EXTRACTION_MODEL)
    } else {
      response = await extractWithOpenAI(ocrText, EXTRACTION_MODEL)
    }

    const duration = Date.now() - startTime
    console.log(`📊 Extraction completed in ${duration}ms using ${modelUsed}`)

    if (!response) {
      throw new Error(`No response from ${modelUsed}`)
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

    // Post-processing: Extract EyeMed allowances directly from OCR if GPT missed them
    if (parsed.plan?.carrier?.value?.toUpperCase() === 'EYEMED') {
      const postProcessed = postProcessEyeMedAllowances(parsed, ocrText)
      return postProcessed
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

/**
 * Post-process EyeMed extractions to fill in missing allowances
 * GPT-4o-mini sometimes misses the frame.allowances structure
 * This function parses the OCR text directly to extract these values
 */
function postProcessEyeMedAllowances(
  parsed: ExtractedInsuranceData,
  ocrText: string
): ExtractedInsuranceData {
  // Pattern A: "$X copay; Y% off balance over $Z allowance"
  // Examples: "$0 copay; 20% off balance over $150 allowance"
  const frameAllowancePattern = /Frame\s*\n?\s*\$\d+\s*copay;\s*(\d+)%\s*off\s*balance\s*over\s*\$(\d+)\s*allowance/i

  // Pattern B: "X% off retail price" (discount only, no allowance)
  const frameDiscountPattern = /Frame\s*\n?\s*(\d+)%\s*off\s*retail\s*price/i

  // Pattern C: "Balance over $X to $Y Retail, equal to $Z Wholesale"
  const frameWholesalePattern = /Frame\s*\n?\s*Balance\s*over\s*\$(\d+)\s*to\s*\$(\d+)\s*Retail[^$]*\$(\d+)\s*Wholesale/i

  // Contact lens patterns
  const contactAllowancePattern = /Contacts?\s*-?\s*(?:Conventional|Disposable)\s*\n?\s*\$\d+\s*copay;\s*\d+%\s*off\s*balance\s*over\s*\$(\d+)\s*allowance/i

  // Declining Balance table pattern
  const decliningBalancePattern = /Contact\s*Lenses?\s*(?:and\s*)?(?:Contacts?\s*)?Fit\s*(?:and\s*Follow[- ]?up)?\s*\$(\d+)\s*\$(\d+)/i

  // Check if frame allowance is missing
  const hasFrameAllowance = parsed.frame?.allowances?.retailMinAllowance !== undefined &&
                           parsed.frame?.allowances?.retailMinAllowance !== null

  if (!hasFrameAllowance) {
    console.log('[PostProcess] Frame allowance missing, attempting OCR extraction...')

    // Try Pattern A first (most common)
    let match = ocrText.match(frameAllowancePattern)
    if (match) {
      const overagePercent = parseInt(match[1], 10)
      const allowance = parseInt(match[2], 10)
      console.log(`[PostProcess] Found frame allowance pattern A: $${allowance}, ${overagePercent}% overage`)

      if (!parsed.frame) {
        parsed.frame = {} as ExtractedInsuranceData['frame']
      }
      if (!parsed.frame.allowances) {
        parsed.frame.allowances = {} as ExtractedInsuranceData['frame']['allowances']
      }
      parsed.frame.allowances.retailMinAllowance = { value: allowance, confidence: 0.9 }
      parsed.frame.allowances.frameOveragePercent = { value: overagePercent, confidence: 0.9 }
    } else {
      // Try Pattern B (discount only)
      match = ocrText.match(frameDiscountPattern)
      if (match) {
        const discountPercent = parseInt(match[1], 10)
        console.log(`[PostProcess] Found frame discount pattern B: ${discountPercent}% off retail (no allowance)`)

        if (!parsed.frame) {
          parsed.frame = {} as ExtractedInsuranceData['frame']
        }
        if (!parsed.frame.allowances) {
          parsed.frame.allowances = {} as ExtractedInsuranceData['frame']['allowances']
        }
        parsed.frame.allowances.retailMinAllowance = { value: 0, confidence: 0.9 }
        parsed.frame.allowances.frameDiscountPercent = { value: discountPercent, confidence: 0.9 }
      } else {
        // Try Pattern C (wholesale)
        match = ocrText.match(frameWholesalePattern)
        if (match) {
          const retailMin = parseInt(match[1], 10)
          const retailMax = parseInt(match[2], 10)
          const wholesale = parseInt(match[3], 10)
          console.log(`[PostProcess] Found frame wholesale pattern C: $${retailMin}-$${retailMax} retail, $${wholesale} wholesale`)

          if (!parsed.frame) {
            parsed.frame = {} as ExtractedInsuranceData['frame']
          }
          if (!parsed.frame.allowances) {
            parsed.frame.allowances = {} as ExtractedInsuranceData['frame']['allowances']
          }
          parsed.frame.allowances.retailMinAllowance = { value: retailMin, confidence: 0.9 }
          parsed.frame.allowances.retailMaxAllowance = { value: retailMax, confidence: 0.9 }
          parsed.frame.allowances.wholesaleAllowance = { value: wholesale, confidence: 0.9 }
        }
      }
    }
  }

  // Check if contact allowance is missing
  const hasContactAllowance = parsed.contacts?.contactAllowance?.value !== undefined &&
                             parsed.contacts?.contactAllowance?.value !== null

  if (!hasContactAllowance) {
    console.log('[PostProcess] Contact allowance missing, attempting OCR extraction...')

    // Try contact allowance pattern
    let match = ocrText.match(contactAllowancePattern)
    if (match) {
      const allowance = parseInt(match[1], 10)
      console.log(`[PostProcess] Found contact allowance: $${allowance}`)

      if (!parsed.contacts) {
        parsed.contacts = {} as ExtractedInsuranceData['contacts']
      }
      parsed.contacts.contactAllowance = { value: allowance, confidence: 0.9 }

      // Also set declining balance
      if (!parsed.decliningBalance) {
        parsed.decliningBalance = {} as ExtractedInsuranceData['decliningBalance']
      }
      parsed.decliningBalance.clStarting = { value: allowance, confidence: 0.9 }
      parsed.decliningBalance.clRemaining = { value: allowance, confidence: 0.9 }
    } else {
      // Try declining balance table pattern
      match = ocrText.match(decliningBalancePattern)
      if (match) {
        const startingBalance = parseInt(match[1], 10)
        const remainingBalance = parseInt(match[2], 10)
        console.log(`[PostProcess] Found declining balance: starting $${startingBalance}, remaining $${remainingBalance}`)

        if (!parsed.contacts) {
          parsed.contacts = {} as ExtractedInsuranceData['contacts']
        }
        parsed.contacts.contactAllowance = { value: startingBalance, confidence: 0.9 }

        if (!parsed.decliningBalance) {
          parsed.decliningBalance = {} as ExtractedInsuranceData['decliningBalance']
        }
        parsed.decliningBalance.clStarting = { value: startingBalance, confidence: 0.9 }
        parsed.decliningBalance.clRemaining = { value: remainingBalance, confidence: 0.9 }
      }
    }
  }

  return parsed
}
