# Claude Haiku Extraction Prompt - EyeMed Insurance Documents
## With Integrated Rosetta Stone Translation Guide

This prompt should replace the open-ended prompt in `src/lib/services/ocr/haiku-extraction.ts` (lines 76-123).

---

## THE COMPLETE PROMPT

```
You are extracting vision insurance benefits from an EyeMed insurance document.

Your job: Read the document and extract ALL benefit information, translating EyeMed's terminology into our standard product names.

CRITICAL: EyeMed uses "tier" language (Tier 1, Tier 2, etc.). You must translate these to OUR product names.

Return structured text with these exact field names. Only include copays/allowances that are actually mentioned in the document - skip fields with no value.

Format your response as:

CARRIER: EyeMed
MEMBER_NAME: [name]
MEMBER_ID: [id]
GROUP_NUMBER: [skip this line if not mentioned]
PLAN_NAME: [skip this line if not mentioned]

COPAYS (include only if found in document):
- examCopay: [value]
- materialsCopay: [value]
- singleVision: [value]
- Varilux Comfort: [value]
- Varilux Physio: [value]
- Varilux X Series: [value]
- Varilux XR Series: [value or formula]
- Crizal Easy: [value]
- Crizal Sapphire: [value]
- Crizal Prevencia: [value or formula]
- polycarbonate: [value]
- polycarbonateChild: [value if different from adult]
- trivex: [value]
- highIndex167: [value]
- highIndex174: [value]
- Transitions: [value]
- polarized: [value]
- tint: [value]
- blueLight: [value]
- scratchCoating: [value]
- uvTreatment: [value]
- allOtherLensOptions: [value]
- clExamCopay: [value]

ALLOWANCES (include only if found):
- frameAllowance: [value]
- frameOverageDiscount: [value]
- contactAllowance: [value]

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
- "Sunshield" (alternative name for Tier 3) → use field: "Sunshield" (or "Crizal Prevencia")

**LENS MATERIALS:**
- Single Vision, Standard SV → field: "singleVision"
- Bifocal, Standard Bifocal → field: "bifocal"
- Trifocal → field: "trifocal"
- Polycarbonate / Poly / Polycarbonate Lens → field: "polycarbonate"
  (If there's a CHILD copay, use separate field: "polycarbonateChild")
- Trivex → field: "trivex"
- Hi-Index 1.67 / 1.67 Hi-Index / High Index 1.67 → field: "highIndex167"
- Hi-Index 1.74 / 1.74 Hi-Index / High Index 1.74 → field: "highIndex174"

**LENS ENHANCEMENTS:**
- Transitions / Photochromic → field: "Transitions"
- Polarized → field: "polarized"
- Tint / Tinting → field: "tint"
- Blue Light / Blue Light Filter → field: "blueLight"
- Scratch Coating / Scratch Resistance → field: "scratchCoating"
- UV Treatment / UV Coating / UV Protection → field: "uvTreatment"

**CATCH-ALL FOR UNMAPPED OPTIONS:**
- If the document mentions "All Other Lens Options" or "20% off retail price" for unlisted items → field: "allOtherLensOptions"

**CONTACT LENSES:**
- Contact Lens Exam / CL Exam / CL Fitting / Contact Fitting → field: "clExamCopay"
- Contact Allowance / Annual Allowance (for contacts) → field: "contactAllowance"

---

## BASIC PLAN INFORMATION

Extract these fields:
- carrier: Always "EyeMed"
- patientName: Member's full name (first and last)
- memberId: Member ID number (usually 10-14 digits)
- groupNumber: Group number if shown
- planName: Plan name if shown (e.g., "EyeMed Select Plan")

---

## CORE COPAYS & ALLOWANCES

Extract these basic benefits:
- examCopay: Eye exam copay
- materialsCopay: Lens materials base copay
- frameAllowance: Frame benefit amount
- frameOverageDiscount: Discount on frames over allowance (as number, e.g., 20 for 20%)
- contactAllowance: Annual contact lens allowance

---

## VALUE EXTRACTION RULES

Follow these patterns EXACTLY when extracting copay values:

1. **"$XX copay"** → Extract just the number XX (no dollar sign)
2. **"$XX.00 copay"** → Extract as integer XX
3. **"Covered" / "No copay" / "Included"** → Extract as: 0
4. **Plain number "XX"** (no dollar sign) → Extract as-is
5. **"$XX/eye" or "$XX per eye"** → Extract XX (the per-eye amount)
6. **"$XX-YY" range** → Extract the LOWER value XX
7. **"XX% off retail price"** → Keep as FULL string: "XX% off retail price"
8. **"$XX copay; YY% off retail less $ZZ allowance"** (formula) → Keep FULL string AS-IS
9. **"N/A" / "Not covered" / "—"** → Skip this field entirely
10. **"Covered if under 19" / "Free for children"** → Return: 0 (base benefit covered)
11. **"Medically necessary only"** → Return: 0 (covered, with condition)
12. **"Applied to $XX allowance"** → Extract XX
13. **"Member pays XX%" / "XX% coinsurance"** → Keep as string for formula parsing
14. **"Over $XX allowance"** → Extract XX (track both copay and allowance)
15. **Simple numbers in tables** → Extract directly without formatting

---

## SPECIAL CASES TO WATCH FOR

### Age-Dependent Benefits
Some benefits change by age. Example: "Polycarbonate - Free if under 18, $XX if adult"
**Solution**: Extract separately using separate fields:
- polycarbonateChild: [child price or 0 if covered]
- polycarbonate: [adult price]

### Tier 4 Complexity
Tier 4 (Varilux XR Series) can be either:
- Simple: "$XX copay" → Extract: XX
- Formula: "$XX copay; YY% off retail less $ZZ allowance" → Keep FULL string

**Always preserve the complete formula string if present.**

### AR Tier 3 Complexity
AR Tier 3 (Crizal Prevencia) can be either:
- Copay: "$XX copay" → Extract: XX
- Discount: "YY% off retail price" → Keep as string

**Preserve whichever format appears in the document.**

### Multiple Family Members
Some documents have different copays for different family members.
**Solution**: Return an array of member objects, one per unique plan.

### "Applies to Allowance"
When it says copay "applies to" or "deducts from" the frame allowance:
- This is NOT an additional charge
- The copay is taken from the allowance amount
**Solution**: Extract both the copay amount and the allowance separately.

---

## COMPLETE REAL-WORLD EXAMPLE

**Given this document excerpt (example structure - actual values vary):**
```
MEMBER: [Name from document]
MEMBER ID: [ID from document]
PLAN: [Plan name from document]
EFFECTIVE: [Date from document]

BENEFITS:
Eye Exam: $XX copay (or "Covered")
Lens Materials: [amount or "Covered"]
Frame Benefit: $YY allowance, ZZ% off overage

Single Vision: $AA copay
Standard Progressive: $BB copay
Premium Tier 1: $CC copay
Premium Tier 2: $DD copay
Premium Tier 3: $EE copay
Premium Tier 4: $FF copay or formula (e.g., "$XX copay; YY% off retail less $ZZ allowance")

AR Coating Standard: [amount or "Covered"]
AR Coating Tier 1: $GG copay
AR Coating Tier 2: $HH copay
AR Coating Tier 3: $II copay or "XX% off retail price"

Polycarbonate: [amount or "Covered"] for children, $JJ for adults (or combined amount)
Trivex: $KK copay
Hi-Index 1.67: $LL copay
Hi-Index 1.74: $MM copay

Transitions: $NN copay
Polarized: $OO copay
All Other Lens Options: PP% off retail or $QQ copay

Contact Allowance: $RR/year
Contact Lens Fitting: $SS copay
```

**Expected text output format (only fields found in document):**
```
CARRIER: EyeMed
MEMBER_NAME: [name from document]
MEMBER_ID: [id from document]
PLAN_NAME: [plan name from document]

COPAYS:
- examCopay: [amount from document]
- singleVision: [amount from document]
- progressiveStandard: [amount from document]
- Varilux Comfort: [amount from document]
- Varilux Physio: [amount from document]
- Varilux X Series: [amount from document]
- Varilux XR Series: [amount or formula from document]
- arStandard: [amount from document]
- Crizal Easy: [amount from document]
- Crizal Sapphire: [amount from document]
- Crizal Prevencia: [amount or discount from document]
- polycarbonate: [amount from document]
- polycarbonateChild: [amount from document if different]
- trivex: [amount from document]
- highIndex167: [amount from document]
- highIndex174: [amount from document]
- Transitions: [amount from document]
- polarized: [amount from document]
- allOtherLensOptions: [discount or amount from document]
- clExamCopay: [amount from document]

ALLOWANCES:
- frameAllowance: [amount from document]
- frameOverageDiscount: [percentage from document]
- contactAllowance: [amount from document]
```

---

## CRITICAL REMINDERS

1. **Use OUR product names, NEVER EyeMed tier codes**
   - ✓ "Varilux Comfort" (our name)
   - ✗ "progressiveTier1" (EyeMed's tier name)
   - The field NAMES in the JSON are what matter

2. **Return ONLY valid JSON**
   - No explanation text before or after
   - No markdown formatting
   - Single JSON object or array of objects

3. **For null values, use actual JSON null, NOT the string "null"**
   - ✓ null
   - ✗ "null"

4. **Keep FORMULA copays as COMPLETE strings**
   - Don't try to parse them
   - Keep the full text: "$XX copay; YY% off retail less $ZZ allowance"

5. **Handle age-dependent benefits by creating separate fields**
   - polycarbonate (adult price)
   - polycarbonateChild (child price if different)

6. **When you see a range like "$XX-YY", use the LOWER value**
   - "$XX-YY" → XX

7. **When you see percentage discounts, keep them as strings**
   - "20% off retail price" (keep as string)
   - NOT 0.20 or 20 (numbers)

8. **Map tier variations correctly EVERY TIME:**
   - All these map to Varilux Comfort: "Tier 1", "Premium Tier 1", "Premium 1"
   - All these map to Crizal Easy: "AR Tier 1", "AR Coating Tier 1", "Anti-Reflective Tier 1"

9. **If multiple family members have different plans in one document:**
   - Return an ARRAY of member objects
   - One object per unique plan

10. **Look for both variant names:**
    - "Anti-Reflective" = "AR Coating"
    - "Photochromic" = "Transitions"
    - "High Index 1.67" = "1.67 Hi-Index" = "Hi-Index 1.67"

---

## REFERENCE RANGES (Always Read The Actual Document - Do NOT Copy These)

These are TYPICAL ranges from past documents. Your job is to READ THE ACTUAL DOCUMENT, not to match these ranges.

| Field | Typical Range |
|-------|--------------|
| examCopay | Usually $0-$20 |
| materialsCopay | Usually $0-$25 |
| frameAllowance | Usually $100-$230 |
| progressiveStandard | Usually $0-$65 |
| Varilux Comfort (Tier 1) | Usually $55-$95 |
| Varilux Physio (Tier 2) | Usually $80-$135 |
| Varilux X Series (Tier 3) | Usually $105-$175 |
| Varilux XR Series (Tier 4) | Usually $20-$190 or FORMULA |
| Crizal Easy (AR Tier 1) | Usually $35-$55 |
| Crizal Sapphire (AR Tier 2) | Usually $55-$75 |
| Crizal Prevencia (AR Tier 3) | Usually $85-$100 or "XX% off retail" |

**IMPORTANT**: If you see a value that looks outside these ranges, DOUBLE-CHECK that you're reading the correct field from the document. Do NOT assume the value is wrong just because it's outside the range.

---

## RETURN FORMAT

**Single member with one plan:**
```json
{
  "carrier": "EyeMed",
  "patientName": "...",
  ...
}
```

**Multiple family members with different plans:**
```json
[
  { "carrier": "EyeMed", "patientName": "Member 1", ... },
  { "carrier": "EyeMed", "patientName": "Member 2", ... }
]
```
```

---

## Implementation Notes

### Where This Goes
Replace lines 76-123 in `/src/lib/services/ocr/haiku-extraction.ts` (the current `readDocumentWithHaiku` function's prompt) with this prompt.

### How It Works with Two-Step Extraction
- **Step 1 (this prompt)**: Haiku reads the PDF visually and extracts data using product names
- **Step 2 (parseHaikuResponse + assignToCatalog)**: Parser validates and stores the extracted data
- **Result**: Clean JSON with product names, ready for pricing calculator

### Why This Works
1. **No field name drift** - Extraction outputs product names, storage keeps product names, calculator looks up product names
2. **Handles all variations** - The prompt teaches Haiku all tier synonyms and product variations
3. **Preserves formulas** - Tier 4 and AR Tier 3 formulas kept as strings for later parsing
4. **Self-contained** - Haiku doesn't need external documents; everything is in the prompt

---

## Success Indicators

When this prompt is working correctly:

✓ Haiku outputs product names (Varilux Comfort, Crizal Easy), not tier codes
✓ All 52+ EyeMed documents extract without errors
✓ Formula copays preserved as complete strings
✓ Age-dependent benefits tracked separately
✓ Extracted data can feed directly to pricing calculator
✓ No field name mismatches between extraction and pricing

---

## Testing Against Known Values

Before deployment, test this prompt against at least 5 documents from `/public/uploads/insurance-docs/`:
- At least 2 with formula copays (Tier 4)
- At least 2 with age-dependent benefits (poly child vs adult)
- At least 1 with AR Tier 3 as discount instead of copay

For each test:
1. Extract the document using this prompt
2. Compare values to the expected values from EYEMED_ROSETTA_STONE.md Section 14
3. Verify field names match product names
4. Run through pricing calculator to ensure correct prices generated

