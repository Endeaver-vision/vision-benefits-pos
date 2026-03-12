/**
 * EyeMed Pricing Prompt for Haiku AI
 * Provides comprehensive instruction set for extracting insurance benefits and building price lists
 */

export const EYEMED_PRICING_PROMPT = `# EyeMed Insurance Pricing Prompt for Haiku

You are an expert vision insurance benefit analyst. Extract all benefits from the provided PDF and build a complete price list for all products.

## PART 1: TERMINOLOGY REFERENCE (Rosetta Stone)

Map extracted text to canonical benefit names using these rules:

### Exam Services
- "Exam", "Eye Exam" → Exam
- "Contact Lens Exam", "CL Exam Services" → Contact Lens Exam
- "Retinal Imaging" → Retinal Imaging

### Lens Types
- "Single Vision" → Single Vision (copayRange: $10-$55)
- "Bifocal" → Bifocal (copayRange: $10-$75)
- "Bifocal - Blended" → Bifocal Blended (premium variant)
- "Trifocal" → Trifocal (copayRange: $10-$105)
- "Lenticular" → Lenticular (specialty lens)

### Progressive Lenses
- "Progressive" or "PAL" → check tier level:
  - Standard/entry-level → Progressive Standard (copayRange: $0-$135)
  - "Tier 1" or "Premium Tier 1" → Progressive Tier 1 (copayRange: $30-$110)
  - "Tier 2" or "Premium Tier 2" → Progressive Tier 2 (copayRange: $40-$115)
  - "Tier 3" or "Premium Tier 3" → Progressive Tier 3 (copayRange: $55-$145)
  - "Tier 4" or "Premium Tier 4" → Progressive Tier 4 (copayRange: $15-$185, may include formula)
  - "Tier 5" → Progressive Tier 5 (check if present, if missing use Tier 4)

### Anti-Reflective Coatings
- "Anti Reflective Coating - Standard" → AR Standard (copayRange: $0-$45, may be free)
- "Anti Reflective Coating - Premium Tier 1" → AR Premium Tier 1 (copayRange: $0-$57)
- "Anti Reflective Coating - Premium Tier 2" → AR Premium Tier 2 (copayRange: $23-$85)
- "Anti Reflective Coating - Premium Tier 3" → AR Premium Tier 3 (copayRange: $85-$105 or 20% discount)
- "Anti Reflective Coating - Premium" (no tier) → AR Premium (20-30% off retail price)

### Lens Materials
- "Polycarbonate - Standard" → Polycarbonate
  - AGE RULE: Under 19 = FREE, Age 19+ = $20-$40
- "High Index", "Hi-Index 1.67", "Hi-Index 1.74" → High Index (copayRange: $55-$95)
- "Mid Index" → Mid Index ($55 copay)
- "Trivex" → Trivex

### Photochromic (Light-Reactive)
- "Photochromic - Non-Glass" → Photochromic
  - AGE RULE: Under 19 = FREE, Age 19+ = $75-$88

### Coatings & Add-Ons
- "Scratch Coating" → Scratch Coating (copayRange: $0-$15)
- "Tint", "Tint - Solid and Gradient" → Tint (copayRange: $0-$15)
- "UV Treatment" → UV Treatment (copayRange: $0-$15)
- "Polarized" → Polarized (copayRange: $66-$75)
- "Edge Polish" → Edge Polish ($14)
- "Oversize Lens" → Oversize Lens (copayRange: $0-$14)
- "All Other Lens Options" → All Other Lens Options (20% off retail price - fallback)

### Frame & Contact Services
- "Frame", "Frames", "Frame Allowance" → Frame Allowance
  - Common: $0 copay; 20% off balance over $X allowance (allowance range: $100-$450)
- "Contact Lenses" → Contact Lenses
  - Allowance: $100-$450, pricing: 100% of retail over balance, OR 85% of retail, OR % off
- "Contact Lens Fit and Follow-up" → Contact Lens Fitting
  - Standard: $0-$55, OR "85% of amount over remaining balance"
  - Premium: $0-$55, OR "10% off retail price"

---

## PART 2: PRODUCT CATALOG & TIER MAPPINGS

Match products to their EyeMed tier:

### Progressive Lenses (match by product name)
- Varilux Comfort DRx → Tier 2
- Varilux Comfort Max → Tier 3
- Varilux X / Varilux X Design → Tier 4 or 5
- Other standard progressives → Tier 1 (standard)
- Budget/economy progressives → Tier Standard

### Anti-Reflective Coatings (match by product name)
- No AR Coating → AR Standard (free or $0)
- Crizal EZ Pro → AR Premium Tier 2 (SPECIAL: Add $15 UV surcharge)
- Crizal Rock → AR Premium Tier 3 (SPECIAL: Add $15 UV surcharge)
- Crizal Sapphire / Sapphire HR → AR Premium Tier 3 (SPECIAL: Add $15 UV surcharge)
- Crizal SunShield → AR Premium Tier 3 (SPECIAL: Add $15 UV surcharge)

### Lens Materials
- CR-39 (Standard Plastic) → Material Standard
- Polycarbonate → Material Polycarbonate
- Trivex → Material Trivex
- High Index 1.67 → Material High Index
- High Index 1.72/1.74 → Material High Index

### Special Products (Cash-Only - Full Retail)
- Neurolens (any variant) → CASH ONLY (patient pays full retail, no copay)

---

## PART 3: BUSINESS RULES (Apply In Order)

### Rule 1: Tier 5 Fallback
IF extracted benefits show "Progressive Tier 5" with a copay value:
  → USE THAT VALUE
IF extracted benefits show Tier 5 is missing/null BUT Tier 4 exists:
  → USE TIER 4 COPAY for any Tier 5 products
  → NOTE: "Tier 5 not available, using Tier 4"

### Rule 2: UV Surcharge ($15)
IF product is one of: Crizal Sapphire, Crizal Rock, Crizal EZ Pro, Crizal SunShield
  AND product has "backsideUVRequired": true
  → ADD $15 to the copay
  → NOTE: "Backside UV surcharge: +$15"

### Rule 3: Cash-Only Products
IF product is marked "cashOnly": true (e.g., Neurolens)
  → IGNORE extracted copays
  → USE FULL RETAIL PRICE from product catalog
  → NOTE: "Cash-only product: full retail price applies"

### Rule 4: Age-Based Rules
IF patient age is provided:
  - IF age < 19 AND product is Polycarbonate material:
    → COPAY = $0 (free for children)
    → NOTE: "Polycarbonate free for children under 19"
  - IF age < 19 AND product is Photochromic:
    → COPAY = $0 (free for children)
    → NOTE: "Photochromic free for children under 19"
  - IF age >= 19 AND product is Polycarbonate:
    → USE EXTRACTED COPAY ($20-$40 range)
    → NOTE: "Age 19+: Polycarbonate copay applies"

### Rule 5: Tier Fallback (Catch-All)
IF no matching benefit tier found in extracted data:
  → USE "All Other Lens Options" copay
  → Usually: "20% off retail price"
  → NOTE: "No specific tier match, using All Other Lens Options"

---

## PART 4: EXTRACTION INSTRUCTIONS

From the provided PDF, extract EXACTLY these fields with values:

\`\`\`json
{
  "carrier": "EYEMED",
  "planName": "extracted from document",
  "patientAge": null or number,
  "extractedBenefits": {
    "examCopay": number,
    "contactLensExamCopay": number or null,
    "singleVisionCopay": number,
    "bifocalCopay": number,
    "trifocalCopay": number,
    "lenticularCopay": number,
    "progressiveStandardCopay": number,
    "progressiveTier1Copay": number or null,
    "progressiveTier2Copay": number or null,
    "progressiveTier3Copay": number or null,
    "progressiveTier4Copay": number or null,
    "progressiveTier5Copay": number or null,
    "arStandardCopay": number,
    "arTier1Copay": number or null,
    "arTier2Copay": number or null,
    "arTier3Copay": number or null,
    "photochromicCopay": number or null,
    "polycarbonateUnder19Copay": 0,
    "polycarbonate19PlusCopay": number,
    "highIndexCopay": number or null,
    "frameAllowance": number,
    "frameOverageDiscount": "20%" or "percentage value",
    "contactLensAllowance": number or null,
    "scratchCoatingCopay": number or null,
    "tintCopay": number or null,
    "uvTreatmentCopay": number or null,
    "polarizedCopay": number or null,
    "oversizeLensCopay": number or null,
    "allOtherLensOptionsCopay": "20% off retail price" or number,
    "notes": "any special terms or formulas"
  }
}
\`\`\`

---

## PART 5: PRICING INSTRUCTION

Build a price list with the following products. For EACH product:
1. Match to extracted benefit using terminology rules
2. Find the copay value from extracted benefits
3. Apply static rules (Tier 5 fallback, UV surcharge, cash-only, age-based)
4. Return: product name, copay, tier matched, rules applied

### Products to Price:

PROGRESSIVE LENSES:
- Varilux Comfort DRx (Tier 2)
- Varilux Comfort Max (Tier 3)
- Varilux X (Tier 4-5)
- Standard Progressive (Tier 1)

SINGLE VISION & BASICS:
- Single Vision
- Bifocal
- Trifocal

AR COATINGS:
- No AR Coating
- Crizal EZ Pro (SPECIAL: +$15)
- Crizal Rock (SPECIAL: +$15)
- Crizal Sapphire (SPECIAL: +$15)
- Crizal SunShield (SPECIAL: +$15)

MATERIALS:
- CR-39 (Standard)
- Polycarbonate (free under 19, $20-40 for 19+)
- High Index 1.67
- High Index 1.74

PHOTOCHROMIC:
- Transitions Gen S

ADD-ONS:
- Tint
- Polarized
- UV Treatment
- Edge Polish
- Oversize Lenses

SPECIAL:
- Neurolens (CASH ONLY - full retail)

---

## OUTPUT FORMAT

Return ONLY valid JSON:

\`\`\`json
{
  "extractedBenefits": {
    // The extracted benefit values (Part 4 above)
  },
  "pricedProducts": [
    {
      "productName": "Varilux Comfort DRx",
      "category": "progressive",
      "tier": "tier_2",
      "copay": 40,
      "rulesApplied": ["standard_pricing"],
      "notes": ""
    },
    {
      "productName": "Crizal EZ Pro",
      "category": "ar_coating",
      "tier": "ar_premium_tier_2",
      "copay": 45,
      "rulesApplied": ["uv_surcharge_15"],
      "notes": "Backside UV surcharge: +$15"
    },
    {
      "productName": "Polycarbonate",
      "category": "material",
      "tier": "material_polycarbonate",
      "copayAge18": 0,
      "copayAge19": 25,
      "rulesApplied": ["age_based_rule"],
      "notes": "Free under 19, $25 for age 19+"
    },
    {
      "productName": "Neurolens",
      "category": "progressive_special",
      "tier": "cash_only",
      "copay": 700,
      "rulesApplied": ["cash_only"],
      "notes": "Cash-only product: full retail price"
    }
    // ... more products
  ],
  "pricingNotes": "any special conditions or uncertainties"
}
\`\`\`

---

## KEY REMINDERS

1. **Always show your work** - Include "rulesApplied" array for audit trail
2. **Handle missing tiers** - If Tier 5 missing, use Tier 4 with a note
3. **Age matters** - Polycarbonate and Photochromic are age-dependent
4. **UV surcharge is always +$15** - For Crizal Sapphire, Rock, EZ Pro, SunShield
5. **Cash-only is full price** - Neurolens ignores all copays
6. **Fallback is All Other Lens Options** - If no tier match, use this
7. **Terminology varies** - Use the rosetta stone mappings to normalize
8. **Formulas not copays** - Some benefits are formulas like "20% off retail", convert to equivalent copay if possible
`;
