# EyeMed Extraction: Complete Field Reference

## Current Data Flow (with gaps)

```
PDF Document
    ↓
GPT-4o Vision (extraction)
    ↓
ExtractedInsuranceData (complex nested structure)
    ↓
buildCopaysJson() → flattens to copays JSON
    ↓
InsuranceAuthorization.copays (database)
    ↓
EyemedPricingCalculator → looks for DIFFERENT field names!
    ↓
PatientPriceList (final prices)
```

**THE PROBLEM:**
- Parser saves: `progressiveTier1`, `arTier1`
- Calculator expects: `progressivePremiumTier1`, `arPremiumTier1`

---

## All EyeMed Fields (from 44 documents analyzed)

### 1. Basic Plan Info
| Field | Possible Values | Notes |
|-------|-----------------|-------|
| carrier | "EyeMed" | Always EyeMed |
| patientName | string | Full name |
| memberId | string | Member ID |
| planName | string | Benefit plan name |

### 2. Core Copays
| Field | Value Type | Examples |
|-------|------------|----------|
| examCopay | number | 0, 10, 15, 20 |
| materialsCopay | number | 0, 15, 20, 25 |
| frameAllowance | number | 100, 130, 150, 175, 200, 230 |
| frameOverageDiscount | number (0-1) | 0.20 (= 20% off overage) |

### 3. Basic Lens Copays
| Field | Value Type | Examples |
|-------|------------|----------|
| singleVision | number | 0, 10, 15, 20, 25 |
| bifocal | number | 0, 10, 15, 20, 25 |
| trifocal | number | 0, 10, 15, 20, 25 |

### 4. Progressive Lens Tiers

**VALUE FORMATS (from actual documents):**

| Format | Example | How to Parse |
|--------|---------|--------------|
| Simple copay | "$65 copay" | 65 |
| Simple copay | "65" | 65 |
| Covered | "$0 copay" | 0 |
| Formula | "$25 copay; 20% off retail price less $120 allowance" | Keep full string |
| Discount only | "20% off retail" | "FORMULA:20% off retail" |
| Not covered | null or missing | null |

**FIELDS:**
| Field | Description | Common Values |
|-------|-------------|---------------|
| progressiveStandard | Standard progressive | 0-65 |
| progressiveTier1 | Premium Tier 1 | 55-95 |
| progressiveTier2 | Premium Tier 2 | 80-135 |
| progressiveTier3 | Premium Tier 3 | 105-175 |
| progressiveTier4 | Premium Tier 4 | 20-190 OR formula |
| progressiveTier5 | Premium Tier 5 (rare) | formula |

**TIER 4 COMPLEXITY:**
- Can be simple copay: $20, $95, $145, $175, $185, $190
- Can be formula: "$25 copay; 20% off retail price less $120 allowance"
- Must preserve the full string when it's a formula

### 5. AR Coating Tiers

| Field | Description | Value Types |
|-------|-------------|-------------|
| arStandard | Standard AR | number (0-55) |
| arTier1 | Tier 1 AR | number (35-55) |
| arTier2 | Tier 2 AR | number (55-75) |
| arTier3 | Tier 3 AR | number (85-100) OR "20% off retail" |

**AR TIER 3 COMPLEXITY:**
- Can be simple copay: $85, $100
- Can be discount: "20% off retail price"
- Must handle both

### 6. Material Copays

| Field | Description | Value Types |
|-------|-------------|-------------|
| polycarbonate | Adult poly | number (0-40) |
| polycarbonateChild | Child poly (≤18) | 0 or "covered" |
| trivex | Trivex | number (30-50) |
| highIndex167 | 1.67 Hi-Index | number (55-85) |
| highIndex174 | 1.74 Hi-Index | number (75-140) |

### 7. Enhancement/Addon Copays

| Field | Description | Value Types |
|-------|-------------|-------------|
| photochromic | Transitions/photochromic | number (70-85) |
| polarized | Polarized | number (75-85) |
| tint | Tint | number (0-15) |
| blueLight | Blue light filter | number (0-50) OR "20% off" |
| scratchCoating | Scratch coating | 0 or "covered" |
| uvTreatment | UV coating | 0 or "covered" |

### 8. All Other Lens Options (Catchall)

| Field | Description | Value |
|-------|-------------|-------|
| allOtherLensOptions | Discount for unmapped items | "20% off retail price" |

This is critical - items without a specific tier mapping get 20% off retail.

### 9. Contact Lens Benefits

| Field | Description | Value Types |
|-------|-------------|-------------|
| contactAllowance | Annual allowance | number (100-250) |
| clExamCopay | CL fitting copay | number (0-60) |
| clFitStandard | Standard fitting | number or "covered" |
| clFitPremium | Premium/specialty fitting | number (0-60) |

---

## Value Format Patterns (All 15 from analysis)

1. **Simple dollar copay**: `$65 copay` → 65
2. **Copay with decimals**: `$25.00 copay` → 25
3. **Covered/included**: `Covered` → 0
4. **Zero copay**: `$0 copay` → 0
5. **Plain number**: `65` → 65
6. **Per eye copay**: `$85/eye` → 85
7. **Up to amount**: `Up to $130 retail` → 130
8. **Percentage discount**: `20% off retail price` → "DISCOUNT_20"
9. **Formula with allowance**: `$25 copay; 20% off retail price less $120 allowance` → full string
10. **Age conditional**: `Covered if under 19` → 0 (with age condition)
11. **Not applicable/listed**: `N/A` → null
12. **Medically necessary**: `Covered if medically necessary` → 0 (with condition)
13. **Range values**: `$55-85` → 55 (use lower)
14. **Member pays**: `Member pays 80%` → formula
15. **Declining balance**: `Applied to $200 allowance` → formula

---

## Exact JSON Structure Needed

The extraction should output a FLAT JSON with numeric values where possible:

```json
{
  "carrier": "EyeMed",
  "patientName": "John Smith",
  "memberId": "ABC123456",
  "planName": "EyeMed Vision Care Plan",

  "examCopay": 10,
  "materialsCopay": 25,
  "frameAllowance": 150,
  "frameOverageDiscount": 20,

  "singleVision": 25,
  "bifocal": 25,
  "trifocal": 25,

  "progressiveStandard": 65,
  "progressiveTier1": 95,
  "progressiveTier2": 120,
  "progressiveTier3": 150,
  "progressiveTier4": 185,

  "arStandard": 0,
  "arTier1": 45,
  "arTier2": 57,
  "arTier3": 85,

  "polycarbonate": 40,
  "polycarbonateChild": 0,
  "trivex": 40,
  "highIndex167": 75,
  "highIndex174": 120,

  "photochromic": 85,
  "polarized": 75,
  "tint": 15,
  "blueLight": 35,
  "scratchCoating": 0,
  "uvTreatment": 0,

  "allOtherLensOptions": "20% off retail price",

  "contactAllowance": 150,
  "clExamCopay": 60,
  "clFitStandard": 0,
  "clFitPremium": 60
}
```

### Special Cases (formulas):

When a tier has a formula instead of simple copay:

```json
{
  "progressiveTier4": "$25 copay; 20% off retail price less $120 allowance"
}
```

The pricing calculator must then parse this formula.

---

## Mapping to Pricing Calculator

| Extraction Field | Pricing Calculator Lookup |
|------------------|---------------------------|
| singleVision | `copays.lensSv` OR `copays.singleVision` |
| bifocal | `copays.lensBifocal` OR `copays.bifocal` |
| progressiveTier1 | `copays.progressivePremiumTier1` OR `copays.progressiveTier1` |
| arTier1 | `copays.arPremiumTier1` OR `copays.arTier1` |
| polycarbonate | `copays.materialPolycarbonate` OR `copays.polycarbonate` |
| allOtherLensOptions | `copays.allOtherLensOptions` (used for 20% fallback) |

The calculator should look for EITHER field name and use whichever exists.

---

## Product → Tier Mapping

Each product in our catalog has a tier assignment:

| Product | EyeMed Tier | Calculator Lookup |
|---------|-------------|-------------------|
| Single Vision | standard_sv | singleVision copay |
| Bifocal | standard_bf | bifocal copay |
| Standard Progressive | standard | progressiveStandard |
| Varilux Comfort | tier_1 | progressiveTier1 |
| Varilux Physio | tier_2 | progressiveTier2 |
| Varilux X Series | tier_3 | progressiveTier3 |
| Varilux XR Series | tier_4 | progressiveTier4 |
| Crizal Easy | ar_tier_1 | arTier1 |
| Crizal Sapphire | ar_tier_2 | arTier2 |
| Crizal Prevencia | ar_tier_3 | arTier3 |
| Polycarbonate | polycarbonate | polycarbonate |
| Hi-Index 1.67 | high_index_167 | highIndex167 |
| Transitions | photochromic | photochromic |
| Sunshield | ar_tier_3 | arTier3 (highest AR) |
| Prism | all_other | allOtherLensOptions (20% off) |
| Oversize | all_other | allOtherLensOptions (20% off) |

---

## Simplified Extraction Prompt

For Haiku to extract EyeMed documents:

```
Extract insurance benefits from this EyeMed document as JSON.

Return these fields with numeric values (just the number, no $ or text):
- carrier, patientName, memberId, planName
- examCopay, materialsCopay, frameAllowance, frameOverageDiscount
- singleVision, bifocal, trifocal
- progressiveStandard, progressiveTier1, progressiveTier2, progressiveTier3, progressiveTier4
- arStandard, arTier1, arTier2, arTier3
- polycarbonate, polycarbonateChild, trivex, highIndex167, highIndex174
- photochromic, polarized, tint, blueLight
- allOtherLensOptions
- contactAllowance, clExamCopay

"$25 copay" → 25
"Covered" → 0
Formulas with semicolons: keep full string
Not listed: null
```

---

## What Needs to Change

1. **Parser (buildCopaysJson)**: Should output flat field names that match what calculator expects
2. **Calculator**: Should handle both old and new field names for backwards compatibility
3. **Extraction prompt**: Should output simple flat JSON, not nested objects

The goal: **PDF → Flat JSON → Database → Price List** with no ambiguity.

---

## Complete Data Flow (Current System)

### Step 1: PDF → Extraction (gpt-extraction.ts)

GPT-4o Vision reads the PDF and outputs `ExtractedInsuranceData`:

```json
{
  "plan": {
    "carrier": { "value": "EyeMed", "confidence": 0.95 },
    "benefitPlanName": { "value": "Select Plan", "confidence": 0.9 }
  },
  "copays": {
    "examCopay": { "value": 10 },
    "materialsCopay": { "value": 25 },
    "progressiveCopays": {
      "standard": { "value": 65 },
      "tier1": { "value": 95 },
      "tier2": { "value": 120 },
      "tier3": { "value": 150 },
      "tier4": { "value": 185 }
    },
    "arCopays": {
      "standard": { "value": 0 },
      "tier1": { "value": 45 },
      "tier2": { "value": 57 },
      "tier3": { "value": 85 }
    }
  }
}
```

### Step 2: Parser (insurance-parser.ts → buildCopaysJson)

Flattens the nested structure:

```json
{
  "examCopay": 10,
  "materialsCopay": 25,
  "singleVision": 25,
  "progressiveStandard": 65,
  "progressiveTier1": 95,
  "progressiveTier2": 120,
  "progressiveTier3": 150,
  "progressiveTier4": 185,
  "arStandard": 0,
  "arTier1": 45,
  "arTier2": 57,
  "arTier3": 85
}
```

This gets stored in `InsuranceAuthorization.copays` (JSON column).

### Step 3: Pricing Calculator (pricing-calculator.ts)

When building a price list, the calculator receives:
- **Product** with `tierEyemed: "tier_2"` (from LensProduct table)
- **Auth** with `copays` JSON blob

The calculator does:
```typescript
// Line 166-186 in pricing-calculator.ts
case 'lens_progressive':
  if (eyemedMapping?.progressiveTier) {
    // eyemedMapping.progressiveTier = "tier_2"
    const result = this.calculateProgressiveWithFormula(auth, "tier_2", retailPrice)
  }

// Line 538-568 - getProgressiveCopay
private getProgressiveCopay(auth, tier): number | null {
  const rawCopays = auth.copays as Record<string, unknown>

  switch (tier) {
    case 'tier_2':
      // Tries: eyemedTiers?.progressiveTier2 OR auth.copays.progressivePremiumTier2
      copay = eyemedTiers?.progressiveTier2 ?? auth.copays.progressivePremiumTier2
      break
  }
  return copay
}
```

**THE GAP:** Parser saves `progressiveTier2`, calculator looks for `progressivePremiumTier2`.

But notice: calculator ALSO checks `eyemedTiers?.progressiveTier2`, expecting a nested `eyemedTiers` object that doesn't exist!

### Step 4: Price List Storage (price-list-precompute.ts)

The result goes to `PatientPriceList` table:

```sql
INSERT INTO patient_price_lists (
  customer_id,
  product_id,
  final_price,      -- What calculator.patientCopay returned
  retail_price,     -- Retail from product catalog
  savings,          -- retail - final
  tier,             -- "tier_2" (which tier was used)
  pricing_method,   -- "tier_copay" or "formula"
  needs_tier_assignment  -- true if no mapping found
)
```

---

## The Fix: Align Field Names

**Option A: Change Parser to match Calculator expectations**

```javascript
// In buildCopaysJson()
copays.progressivePremiumTier1 = extractValue(progCopays?.tier1)
copays.progressivePremiumTier2 = extractValue(progCopays?.tier2)
// etc.
```

**Option B: Change Calculator to match Parser output**

```javascript
// In getProgressiveCopay()
case 'tier_2':
  copay = rawCopays.progressiveTier2  // Match what parser saves
  break
```

**Option C: Simplify everything - flat extraction straight to database**

Have the extraction output EXACTLY what the calculator needs:

```json
{
  "progressivePremiumTier1": 95,
  "progressivePremiumTier2": 120,
  "arPremiumTier1": 45,
  "arPremiumTier2": 57
}
```

Then parser just passes it through unchanged.

---

## Recommended Approach

1. **Simplify extraction prompt** to output flat JSON with the field names the calculator expects
2. **Parser passes through** the flat JSON to database (minimal transformation)
3. **Calculator reads** directly from the flat copays JSON

This removes all the nested structures and field name mismatches.
