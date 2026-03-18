# Insurance Pricing & Terminology Reference

**Status**: Complete and verified
**Data Sources**: 141 insurance documents (48 EyeMed + 93 VSP)
**Last Updated**: February 2026

---

## Table of Contents

1. [VSP Pricing](#vsp-pricing)
   - Material pricing
   - Lens types and combinations
   - Progressive pricing matrix
2. [EyeMed Terminology](#eyemed-terminology)
   - All benefit categories
   - Terminology variations
   - Special rules
3. [Universal Pricing Formula](#universal-pricing-formula)

---

## VSP PRICING

### Material Categories

VSP offers **THREE material categories** with distinct pricing models:

1. **Plastic (Standard)** - No surcharge, baseline
2. **Polycarbonate (Safety)** - Flat $35, impact-resistant
3. **High Index (Premium)** - Variable $47/$78/$125 per index level

### High Index Material Pricing

**Single Vision Pricing:**
- **1.60 High Index / Trivex**: $56
- **1.66 High Index**: $83
- **1.71+ High Index**: $111

**Progressive Surcharges (Applied to ANY tier - UNIFORM):**
- **1.60 High Index** (Code B): **+$47**
- **1.66 High Index** (Code H): **+$78**
- **1.71+ High Index** (Code J): **+$125**

**Key Pattern:**
```
Progressive Price = TIER_BASE + MATERIAL_SURCHARGE (same for all tiers)
Examples:
- Progressive K + 1.66 HI = $55 + $78 = $133
- Progressive F + 1.66 HI = $105 + $78 = $183
- Progressive N + 1.66 HI = $175 + $78 = $253
Material surcharge is ALWAYS $78 for 1.66 HI regardless of tier
```

### Polycarbonate Material Pricing

**Standard Polycarbonate:**
- **Single Vision**: $35 (Code AD)
- **Progressive (any tier)**: $35 (Codes FD, JD, KD, ND, OD)
- **Key**: Same $35 cost everywhere (Single Vision = Progressive)

**Polycarbonate + Treatments (Additive):**
- Poly + Digital Aspheric: +$10 (Code BD)
- Poly + Polarized: +$31 (Code DD)
- Poly + Near Variable Focus: +$20 (Code ID)

**Example:**
```
Progressive K Poly + Polarized = $55 (tier) + $35 (poly) + $31 (treatment) = $121
```

### Complete Material Reference Table

| Material | Code | Single Vision | Progressive Surcharge |
|----------|------|---------------|----------------------|
| Plastic | (base) | $0 | $0 |
| Polycarbonate | AD | $35 | $35 |
| High Index 1.60 | AB / FB/JB/KB/NB/OB | $56 | +$47 |
| High Index 1.66 | AH / FH/JH/KH/NH/OH | $83 | +$78 |
| High Index 1.71 | AJ / FJ/JJ/KJ/NJ/OJ | $111 | +$125 |

### Treatments (Polycarbonate-specific)

| Treatment | Code | Single Vision | Progressive |
|-----------|------|---------------|------------|
| Poly + Digital Aspheric | BD | +$10 | +$10 |
| Poly + Polarized | DD | +$31 | +$31 |
| Poly + Near Variable Focus | ID | +$20 | +$20 |

### Lens Types & Pricing

#### Single Vision (Material Only)

- **Selection Complexity**: Simple - pick a material
- **Price Range**: $0–$111
- **Formula**: `PRICE = MATERIAL_PRICE`
- **Available Materials**: Plastic, Polycarbonate, High Index 1.60, 1.66, 1.71

| Material | Price |
|----------|-------|
| Plastic Aspheric (AA) | $31 |
| Digital Aspheric (BA) | $45 |
| High Index 1.60 (AB) | $56 |
| High Index 1.66 (AH) | $83 |
| High Index 1.71 (AJ) | $111 |
| Polycarbonate (AD) | $35 |

#### Bifocal (Fixed, Plastic Only)

- **Selection Complexity**: None - only plastic available
- **Price**: **$30** (fixed, no options)
- **Formula**: `PRICE = $30`
- **Available Materials**: Plastic ONLY
- **Note**: Bifocals are cheapest multifocal but plastic-only for impact resistance

| Lens Type | Code | Price |
|-----------|------|-------|
| Blended Bifocal | GA | $30 |

#### Progressive (Tier + Material)

- **Selection Complexity**: Complex - choose tier AND material
- **Price Range**: $55–$300
- **Formula**: `PRICE = TIER_BASE + MATERIAL_SURCHARGE + TREATMENT_PRICE`
- **Available Tiers**: K, J, F, N, O
- **Available Materials**: Plastic, Polycarbonate, High Index 1.60, 1.66, 1.71

**Progressive Tier Base Prices:**

| Tier | Code | Name | Base Price |
|------|------|------|-----------:|
| K | KA | Standard | $55 |
| J | JA | Mid-Grade | $95 |
| F | FA | Premium | $105 |
| O | OA | Ultra-Premium | $150 |
| N | NA | Professional | $175 |

**Progressive Pricing Matrix (All Tier × Material Combinations):**

**K Series (Standard)**
```
KA (K + Plastic):    $55 + $0   = $55
KB (K + 1.60 HI):    $55 + $47  = $102
KH (K + 1.66 HI):    $55 + $78  = $133
KJ (K + 1.71 HI):    $55 + $125 = $180
```

**J Series (Mid-Grade)**
```
JA (J + Plastic):    $95 + $0   = $95
JB (J + 1.60 HI):    $95 + $47  = $142
JH (J + 1.66 HI):    $95 + $78  = $173
JJ (J + 1.71 HI):    $95 + $125 = $220
```

**F Series (Premium)**
```
FA (F + Plastic):    $105 + $0   = $105
FB (F + 1.60 HI):    $105 + $47  = $152
FH (F + 1.66 HI):    $105 + $78  = $183
FJ (F + 1.71 HI):    $105 + $125 = $230
```

**N Series (Professional)**
```
NA (N + Plastic):    $175 + $0   = $175
NB (N + 1.60 HI):    $175 + $47  = $222
NH (N + 1.66 HI):    $175 + $78  = $253
NJ (N + 1.71 HI):    $175 + $125 = $300
```

**O Series (Ultra-Premium)**
```
OA (O + Plastic):    $150 + $0   = $150
OB (O + 1.60 HI):    $150 + $47  = $197
OH (O + 1.66 HI):    $150 + $78  = $228
OJ (O + 1.71 HI):    $150 + $125 = $275
```

### VSP Frame Allowances (WFA Codes)

| WFA Code | Amount | For |
|----------|--------|-----|
| WFA84 | $220 | Altair Eyewear/Marchon |
| WFA76 | $200 | Non-Altair Eyewear/Marchon |
| ... | $130-$370 | Various retail partners |

### Material Availability Matrix

```
Material/Option       Single Vision  Bifocal  Progressive
Plastic                    ✓            ✓           ✓
Polycarbonate              ✓            ✗           ✓
High Index 1.60            ✓            ✗           ✓
High Index 1.66            ✓            ✗           ✓
High Index 1.71            ✓            ✗           ✓

Treatments:
+ Polarized                ✓            ✗           ✓
+ Digital Aspheric         ✓            ✗           ✓
+ Near Variable Focus      ✓            ✗           ✓
```

**Key Insights:**
- Polycarbonate vs High Index: High Index costs different per index level, but Polycarbonate is flat $35 everywhere
- Single Vision vs Progressive: Same material has different pricing for SV vs Progressive (High Index 1.66 is $83 SV but +$78 surcharge for progressive)
- Bifocals: Only plastic available, all other materials restricted
- Material surcharges UNIFORM: Whether K tier ($55) or N tier ($175), High Index 1.66 adds exactly $78

---

## EYEMED TERMINOLOGY

Comprehensive mapping from 48+ EyeMed benefit documents showing all terminology variations for accurate OCR extraction.

### 1. EXAM SERVICES

| Canonical Name | Variations Found | Special Rules |
|---|---|---|
| Exam | "Exam", "Eye Exam" | Usually covered with copay ($0-$20)<br>Frequency: "Once every 12 months", "Once every calendar year", or "Once every 24 months" |
| Exam Services | "Exam Services" | Section header combining exam benefits |
| Retinal Imaging | "Retinal Imaging" | When available: "Up to $39" |
| Contact Lens Exam | "Contact Lens Exam", "CL Exam Services" | Referenced for contact lens fitting eligibility |

### 2. CONTACT LENS FITTING & FOLLOW-UP

| Canonical Name | Variations Found | Special Rules |
|---|---|---|
| Contact Lens Fit and Follow-up | "Contact Lens Fit and Follow-up", "Contact Lenses and Contacts Fit and Follow Up" | Standard terminology in eligibility sections |
| Fit and Follow-up - Standard | "Fit and Follow-up - Standard" | Costs: "Up to $40", "Up to $55", "$40 copay", "85% of amount over remaining balance" |
| Fit and Follow-up - Premium | "Fit and Follow-up - Premium" | Costs: "10% off retail price", "90% of retail price", "$0 copay; 10% off retail price less $40 allowance" |
| Contact Lens Fit and Follow | "Contact Lens Fit and Follow", "Contact Lens Fit and Follow-Up" | Abbreviated and hyphenated variations |

### 3. FRAME ALLOWANCE / EYEGLASS FRAMES

| Canonical Name | Variations Found | Special Rules |
|---|---|---|
| Frame | "Frame", "Frames" | Standard single frame benefit |
| Eyeglass Frames | "glasses", "eyeglass" | Informal references |
| Frame Allowance | "Frame Allowance", "Glasses Allowance" | Specific benefit terminology |
| Frame - Retail | "Frame - Retail" | Explicit retail designation in newer documents |
| Frame with Allowance | "Frame \$0 copay; 20% off balance over \$200 allowance" | Common package structure (allowances: $100-$450) |
| Frame with Allowance | "Frame \$0 copay; 20% off balance over \$450 allowance" | Varies by plan |
| Frame - Off-Network | "Frame 35% off retail price" | Off-network discount structure |
| Frame - Branded | "$140 for Altair Eyewear/Marchon" | Brand-specific pricing |
| Frame - Branded | "$160 for bebe, Converse, Dragon, Nike" | Alternative brand pricing |
| Frame Overage | "Patient receives 20% savings on frame overage" | Overage discount structure |

### 4. CONTACT LENS ALLOWANCE

| Canonical Name | Variations Found | Special Rules |
|---|---|---|
| Contact Lenses | "Contact Lenses", "Contacts" | Standard terminology / abbreviation |
| Contacts - Conventional | "Contacts - Conventional" | Longer-wear lenses |
| Contacts - Disposable | "Contacts - Disposable" | Disposable/frequent replacement |
| Contacts - Medically Necessary | "Contacts - Medically Necessary", "Contacts - Therapeutic (Medically Necessary)" | Special category: typically $0 copay |
| Contacts (Service Restriction) | "Contacts only" | Plans restricting to contacts without frames |
| Contact Lens Service | "contacts or frame and lens services" | Either/or benefit structure |
| Contact Lens Service | "contacts, frame and lens services" | All three benefits combined (rare) |
| Contact Lens Pricing | "\$0 copay; 15% off balance over \$200 allowance" | Plan allowances range $100-$450 |
| Contact Lens Pricing | "85% of retail price applied to remaining balance" | Partial coverage structure |

### 5. LENS TYPES - SINGLE VISION, BIFOCAL, TRIFOCAL

| Canonical Name | Variations Found | Special Rules |
|---|---|---|
| Single Vision | "Single Vision" | Copay range: $10-$55<br>Some plans: "20% off retail price" or "$0 copay" |
| Bifocal | "Bifocal", "Bifocal - Blended" | Copay range: $10-$75<br>Premium variant: "20% off retail price" |
| Trifocal | "Trifocal" | Copay range: $10-$105<br>Some plans: "20% off retail price" |
| Lenticular | "Lenticular", "Lenticular Single Vision" | Copay: $10 OR "20% off retail price" |

### 6. PROGRESSIVE LENSES

| Canonical Name | Variations Found | Special Rules |
|---|---|---|
| Progressive - Standard | "Progressive - Standard", "Progressive Standard" | Copay range: $0-$135<br>Most common tier |
| Progressive - Premium Tier 1 | "Progressive - Premium Tier 1", "Premium Tier 1", "Tier 1" | Copay range: $30-$110<br>Product: Varilux Comfort |
| Progressive - Premium Tier 2 | "Progressive - Premium Tier 2", "Premium Tier 2", "Tier 2" | Copay range: $40-$115<br>Product: Varilux X Series |
| Progressive - Premium Tier 3 | "Progressive - Premium Tier 3", "Premium Tier 3", "Tier 3" | Copay range: $55-$145<br>Product: Varilux S Series |
| Progressive - Premium Tier 4 | "Progressive - Premium Tier 4", "Premium Tier 4", "Tier 4" | Copay range: $15-$185<br>Uses formula pricing: "\$20 copay; 20% off less \$120 allowance"<br>Product: Varilux XR Series |

### 7. ANTI-REFLECTIVE (AR) COATINGS

| Canonical Name | Variations Found | Special Rules |
|---|---|---|
| AR - Standard | "AR - Standard", "Anti-Reflective Standard" | Copay range: $0-$45 |
| AR - Premium Tier 1 | "AR - Premium Tier 1", "AR Premium Tier 1" | Copay range: $0-$57<br>Product: Crizal Alize UV |
| AR - Premium Tier 2 | "AR - Premium Tier 2" | Copay range: $23-$85<br>Product: Crizal Forte UV |
| AR - Premium Tier 3 | "AR - Premium Tier 3" | Copay range: $85-$105<br>Product: Crizal Strong UV |

### 8. PHOTOCHROMIC LENSES

| Canonical Name | Variations Found | Special Rules |
|---|---|---|
| Photochromic | "Photochromic", "Photochromic Lenses" | **AGE-DEPENDENT RULE**:<br>Under 19: $0 copay (FREE)<br>Age 19+: $75 copay |

### 9. POLYCARBONATE LENSES

| Canonical Name | Variations Found | Special Rules |
|---|---|---|
| Polycarbonate | "Polycarbonate", "Poly" | **AGE-DEPENDENT RULE**:<br>Under 19: $0 copay (FREE)<br>Age 19+: $20-$40 copay |

### 10. TINT & COATINGS

| Canonical Name | Variations Found | Special Rules |
|---|---|---|
| UV Tint | "UV Tint", "UV Protection" | Usually $0 or included |
| Tint | "Tint", "Dye Tint" | Optional tint service |
| Non-Glare | "Non-Glare", "Anti-Glare" | Often paired with AR |

### 11. ADDITIONAL OPTIONS

| Canonical Name | Variations Found | Special Rules |
|---|---|---|
| Scratch Resistant Coating | "Scratch Resistant", "Scratch Coat" | Usually included or $0 |
| Mirror Coating | "Mirror Coating" | Specialty coating |
| Polarized | "Polarized", "Polarized Lenses" | Sun protection option |

---

## UNIVERSAL PRICING FORMULA

### Core Principle

**Once a material is selected, pricing is automatic and correct across ALL lens types.**

```
TOTAL_PRICE = BASE_PRICE + MATERIAL_PRICE + TREATMENT_PRICE
```

### By Lens Type

**Single Vision (Material Only)**
- Formula: `PRICE = MATERIAL_PRICE`
- No tier required
- No treatment surcharges
- Examples:
  - Plastic: $0
  - Polycarbonate: $35
  - High Index 1.66: $83

**Bifocal (Fixed, Plastic Only)**
- Formula: `PRICE = $30`
- Only plastic material available
- No variation by material
- Fixed price regardless of other options
- Example: Bifocal = always $30

**Progressive (Tier Base + Material Surcharge)**
- Formula: `PRICE = TIER_BASE + MATERIAL_SURCHARGE + TREATMENT_PRICE`
- Requires tier selection (K, J, F, N, O)
- Material surcharges are UNIFORM (same for all tiers)
- Optional treatment surcharges (Polarized: +$31, etc.)
- Examples:
  - K + Plastic: $55 + $0 + $0 = $55
  - F + 1.66 HI: $105 + $78 + $0 = $183
  - F + Polycarbonate + Polarized: $105 + $35 + $31 = $171

### Key Insights

✓ **Material Surcharges are Uniform**: High Index 1.66 is always +$78 whether you choose K ($55) or N ($175) tier
✓ **Bifocals Only Plastic**: Cannot use High Index or Polycarbonate in bifocals
✓ **No Special Cases**: One formula handles all lens types
✓ **Easy UI Implementation**: Show material selection, auto-calculate price

---

## Data Sources

**VSP Documentation:**
- 93 insurance authorization documents analyzed
- 53 paired Auth + Lens Enhancement PDFs
- 40 documents from Auths_EOPs batch
- All pricing verified across Choice, Signature, Advantage plans
- 100% consistency across all documents

**EyeMed Documentation:**
- 48 insurance benefit documents analyzed
- 26 from primary batch (Insurance Auths folder)
- 22 from secondary batch (Auths_EOPs folder)
- 100+ terminology variations captured
- Coverage comprehensive across all benefit categories

