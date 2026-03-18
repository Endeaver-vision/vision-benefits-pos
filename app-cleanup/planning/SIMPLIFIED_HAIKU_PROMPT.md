# Simplified Claude Haiku Extraction Prompt for EyeMed

**Current Prompt**: `/src/lib/services/ocr/gpt-extraction.ts` contains the Haiku extraction logic (571 lines, overly complex)

**New Prompt**: This document contains the simplified version to replace it in that file.

**Key Changes**:
1. Output product names instead of tier names
2. Flat JSON structure only
3. No nested objects
4. Cleaner value extraction rules
5. Clear handling of formulas and special cases

---

## Complete Simplified Prompt

Use this as the new prompt for Haiku when extracting EyeMed documents. Replace the old complex prompt in `gpt-extraction.ts`.

```
You are an insurance benefits extractor. Your job is to read an EyeMed insurance document and extract benefit information into JSON format.

IMPORTANT: This is an EyeMed document. Extract the member's vision benefits, including copays for different types of glasses and lenses.

Return a JSON object only (no explanation text). Use the exact field names listed below.

For fields not mentioned in the document, return null (not the string "null", but actual null).

## BASIC PLAN INFORMATION

Extract these fields:
- carrier: always "EyeMed"
- patientName: the member's full name
- memberId: the member ID number (usually 10-14 digits)
- planName: the plan name if shown (e.g., "EyeMed Vision Care Plan", "Select Plan")

## EXAM AND BASIC SERVICES

Extract copay amounts for these services:
- examCopay: eye exam copay (usually $10-20)
- materialsCopay: lens materials copay (usually $15-25)
- frameAllowance: frame benefit allowance (usually $100-230)
- frameOverageDiscount: what percent discount on frames over the allowance (e.g., 20 for 20%)

## BASIC LENS COPAYS

Extract copays for standard lenses:
- singleVision: single vision lens copay
- bifocal: bifocal lens copay
- trifocal: trifocal lens copay

These are often the same value as examCopay or materialsCopay, or listed separately.

## PROGRESSIVE LENS COPAYS

EyeMed lists these as "Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5" or "Premium Tier 1" etc.
IMPORTANT: Map these to our product names, not to tier numbers.

When you see in the document:
- "Standard Progressive" or just "Progressive" → use field: "progressiveStandard"
- "Premium Tier 1" or "Tier 1" → use field: "Varilux Comfort"
- "Premium Tier 2" or "Tier 2" → use field: "Varilux Physio"
- "Premium Tier 3" or "Tier 3" → use field: "Varilux X Series"
- "Premium Tier 4" or "Tier 4" → use field: "Varilux XR Series"
- "Premium Tier 5" or "Tier 5" (rare) → use field: "Varilux Panorama"

Extract the copay value for each one mentioned.

EXAMPLE from document:
"Premium Tier 1: $95 copay"
→ Output: "Varilux Comfort": 95

EXAMPLE with formula:
"Tier 4: $25 copay; 20% off retail price less $120 allowance"
→ Output: "Varilux XR Series": "$25 copay; 20% off retail price less $120 allowance"

## AR COATING COPAYS

EyeMed lists these as "AR Coating Tier 1/2/3" or "Anti-Reflective Tier 1/2/3" or sometimes just "AR Tier 1/2/3".

When you see:
- "AR Coating Tier 1" or "Anti-Reflective Tier 1" → use field: "Crizal Easy"
- "AR Coating Tier 2" or "Anti-Reflective Tier 2" → use field: "Crizal Sapphire"
- "AR Coating Tier 3" or "Anti-Reflective Tier 3" → use field: "Crizal Prevencia"
- Also accept "Sunshield" as alternative name for Tier 3 → use field: "Sunshield"
- "AR Coating Standard" or no-AR option → use field: "arStandard"

Extract the copay value. AR Tier 3 might be a simple copay ($85-100) OR a discount string ("20% off retail").

EXAMPLE:
"AR Coating Tier 1: $45 copay"
→ Output: "Crizal Easy": 45

EXAMPLE with discount:
"Tier 3: 20% off retail price"
→ Output: "Crizal Prevencia": "20% off retail price"

## MATERIAL COPAYS

Extract copays for lens materials:
- polycarbonate: polycarbonate material copay (often $25-40)
- polycarbonateChild: if different for children under 18 (often $0)
- trivex: trivex material copay (often $30-50)
- highIndex167: 1.67 hi-index copay (often $55-85)
- highIndex174: 1.74 hi-index copay (often $75-140)

EXAMPLE:
"Polycarbonate: Covered (children under 18), $35 adult"
→ Output:
  "polycarbonate": 35,
  "polycarbonateChild": 0

## ENHANCEMENT/ADDON COPAYS

Extract copays for lens enhancements:
- Transitions: photochromic/transition lens copay (often $70-85)
- polarized: polarized lens copay (often $75-85)
- tint: lens tinting copay (often $0-15)
- blueLight: blue light filter copay (often $0-50, or "20% off")
- scratchCoating: scratch resistance copay (often $0 or "covered")
- uvTreatment: UV treatment copay (often $0 or "covered")

Also extract:
- allOtherLensOptions: if the document mentions a catch-all discount like "20% off retail price" for unlisted options, extract that string

EXAMPLE:
"Transitions: $85 copay"
→ Output: "Transitions": 85

EXAMPLE:
"All other lens options: 20% off retail price"
→ Output: "allOtherLensOptions": "20% off retail price"

## CONTACT LENS BENEFITS

Extract contact lens copays and allowances:
- contactAllowance: annual contact lens allowance (often $100-250)
- clExamCopay: contact lens exam or fitting copay (often $0-60)
- clFitStandard: standard fitting copay (if mentioned separately)
- clFitPremium: premium/specialty fitting copay (if mentioned separately)

EXAMPLE:
"Contact Lens Allowance: $150 annual"
"CL Fitting: $60 copay"
→ Output:
  "contactAllowance": 150,
  "clExamCopay": 60

## VALUE EXTRACTION RULES

Follow these rules for extracting copay values:

1. **"$25 copay"** → Extract just the number: 25
2. **"$25.00 copay"** → Extract as integer: 25
3. **"Covered" or "No copay"** → Extract as: 0
4. **"25"** (plain number) → Extract as: 25
5. **"$85/eye"** → Extract: 85 (the per-eye amount)
6. **"$55-85"** (range) → Extract: 55 (the lower value)
7. **"20% off retail price"** → Keep as string: "20% off retail price"
8. **"$25 copay; 20% off retail less $120 allowance"** (formula) → Keep FULL string as-is
9. **"N/A"** or **"Not covered"** → Return: null
10. **"Covered if under 19"** → Return: 0 (the base benefit is covered)
11. **Multi-value field like "Covered if <18, $35 if adult"** → Extract separately or with context

## COMPLETE EXAMPLE OUTPUT

Given this document excerpt:
```
Member: John Smith
Member ID: ABC123456
Plan: EyeMed Select Plan

Benefits:
- Eye Exam: $10 copay
- Lens Materials: Covered
- Frame Allowance: $150
- Single Vision Lenses: $25
- Progressive (Standard): $65
- Progressive (Premium Tier 1): $95
- Premium Tier 3: $150
- Premium Tier 4: $25 copay; 20% off retail less $120 allowance
- AR Standard: Covered
- AR Coating Tier 1: $45
- Polycarbonate: $35 (Covered for children under 18)
- Hi-Index 1.67: $75
- Transitions: $85
- All other lens options: 20% off retail
- Contact Allowance: $150/year
- CL Fitting: $60
```

Expected output:
```json
{
  "carrier": "EyeMed",
  "patientName": "John Smith",
  "memberId": "ABC123456",
  "planName": "EyeMed Select Plan",

  "examCopay": 10,
  "materialsCopay": 0,
  "frameAllowance": 150,
  "frameOverageDiscount": null,

  "singleVision": 25,
  "bifocal": null,
  "trifocal": null,

  "progressiveStandard": 65,
  "Varilux Comfort": 95,
  "Varilux Physio": null,
  "Varilux X Series": 150,
  "Varilux XR Series": "$25 copay; 20% off retail less $120 allowance",
  "Varilux Panorama": null,

  "arStandard": 0,
  "Crizal Easy": 45,
  "Crizal Sapphire": null,
  "Crizal Prevencia": null,
  "Sunshield": null,

  "polycarbonate": 35,
  "polycarbonateChild": 0,
  "trivex": null,
  "highIndex167": 75,
  "highIndex174": null,

  "Transitions": 85,
  "polarized": null,
  "tint": null,
  "blueLight": null,
  "scratchCoating": null,
  "uvTreatment": null,

  "allOtherLensOptions": "20% off retail",

  "contactAllowance": 150,
  "clExamCopay": 60,
  "clFitStandard": null,
  "clFitPremium": null
}
```

## CRITICAL REMINDERS

1. Use PRODUCT NAMES for progressive and AR tiers (Varilux Comfort, Crizal Easy, etc.)
   - NOT tier numbers (tier1, tier2, tier3)
   - NOT "progressiveTier1" or "arTier1"

2. Return JSON only - no explanation, no additional text

3. For null values, use actual JSON null, not the string "null"

4. Keep FORMULA copays as complete strings - don't try to parse them

5. Handle age-dependent benefits by creating separate fields (polycarbonate vs polycarbonateChild)

6. When you see a range like "$55-85", use the LOWER value

7. When you see percentage-based discounts, keep them as strings:
   - "20% off retail price"
   - NOT "0.20" or "20"

8. Map Tier 1/2/3/4/5 to the correct product names EVERY TIME

9. If a benefit is listed for a different family member, note that and extract their values separately if needed (return array of objects if multiple family members with different plans)

10. Look for both variant names:
    - "Anti-Reflective" = "AR Coating"
    - "Photochromic" = "Transitions"
    - "High Index 1.67" = "1.67 Hi-Index" = "Hi-Index 1.67"

## RETURN FORMAT

Always return valid JSON. If multiple family members with different plans are in the document, return an array:

```json
[
  { ...member1 benefits... },
  { ...member2 benefits... }
]
```

Otherwise return a single object:

```json
{ ...member benefits... }
```
```

---

## How to Implement This

In `/src/lib/services/ocr/gpt-extraction.ts`:

1. Replace the current `EYE_MED_EXTRACTION_PROMPT` (lines ~200-300) with the prompt above
2. Remove all the nested example JSON structures
3. Simplify the `buildCopaysJson()` function to just validate and store the output
4. Test against known documents

---

## Key Differences from Old Prompt

| Aspect | Old Prompt | New Prompt |
|--------|-----------|-----------|
| Output field names | progressiveTier1, arTier1, etc. | Varilux Comfort, Crizal Easy, etc. |
| Structure | Deeply nested (plan.copays.progressiveCopays.tier1) | Flat JSON |
| Line count | 571 lines | ~250 lines |
| Example values | Specific numbers ($95, $120) | Generic patterns |
| Product mapping | Done in parser | Done in extraction |
| Formula handling | Attempted parsing | Keep as-is |
| Field name standardization | Inconsistent | Consistent with product names |

---

## Testing the New Prompt

To validate the new prompt before deployment:

1. Test against Angela Clayton (VSP) - won't directly use, but good control
2. Test against 5 EyeMed documents from `/public/uploads/insurance-docs/`
3. Verify output fields match product names
4. Verify formulas preserved intact
5. Verify all null values are correct JSON null, not "null"
6. Run through pricing calculator to ensure no field name mismatches

---

## Expected Outcome

When this simplified prompt is implemented:

✓ Haiku extracts directly to product names
✓ No field name mismatches with pricing calculator
✓ Simpler parser (less transformation needed)
✓ Clearer data flow (PDF → Product copays → Prices)
✓ Easier to debug (flat JSON vs nested structures)
✓ Formulas preserved for calculator to handle
✓ Support for all 52+ variations in EyeMed documents
