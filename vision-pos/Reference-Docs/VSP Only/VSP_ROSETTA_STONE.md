# VSP Rosetta Stone - Complete Reference
## Insurance Language Reference for Pricing Engine

**Last Updated:** 2026-03-09
**Sample Size:** 48 auth forms from 35+ unique patients
**Source Directory:** `/Reference-Docs/VSP Only/`
**Rescan Status:** ✅ Complete - All features documented including Post-Laser, Value Added Benefits, Low Vision, Vision Therapy

---

## CRITICAL BUSINESS RULES

### 1. We Do NOT Sell Altair/Marchon Frames
**ALWAYS use the "non-Altair" frame allowance amount.**

Brands we IGNORE (all Marchon/Altair):
- Anne Klein, bebe, Flexon, Nike, Dragon, Ferragamo, Columbia, Lacoste

### 2. Frame Overage Calculation
All plans use: **20% savings on frame overage**
```
Patient Pays = (Frame Retail - Allowance) × 0.80
```

---

## ⚠️ SPECIAL FLAGS REQUIRING NOTIFICATIONS

### 🖥️ Computer VisionCare Plan
**MUST FLAG ON PRICE LIST WITH PROMINENT NOTIFICATION**

When detected: `Benefit VSP Computer VisionCare Plan Supplemental`

**Display Warning:**
```
⚠️ COMPUTER VISION PLAN - RESTRICTIONS APPLY
• Prescription must differ by ±0.50 diopters from everyday eyewear
• Photochromics: NOT COVERED
• Polarized: NOT COVERED
• Lower frame allowance: $90
• No contact lens coverage
```

### 🏥 Essential Medical Eye Care (EMC)
**Two variants observed:**
1. `Essential Medical Eye Care` (most plans)
2. `Diabetic Eyecare Plus Program` (some Choice plans)

**Benefits:**
- Covered-in-full retinal screening for diabetic patients
- Additional exams/services may be available for: Diabetes, Glaucoma, AMD
- May qualify for medical eye care billing (not just routine)

**Eye Health Conditions to Check:**
| Systemic Conditions | Ocular Conditions |
|---------------------|-------------------|
| High Risk for Prediabetes | Diabetic Retinopathy |
| Diabetes | Glaucoma |
| Hypertension | AMD |
| High Cholesterol | |

**Reported Conditions & PCP Communication:**
When patient has diabetes in "Reported Conditions", auth shows:
```
Reported Conditions: Diabetes*
VSP recommends a dilated eye exam for patients with diabetes and requires communicating exam results with the patient's PCP.
```
**This triggers requirement for:**
- Dilated exam (checkbox: "Dilation Performed")
- PCP communication (checkbox: "PCP Communication Completed/Planned")

**Display Note When EMC Present:**
```
ℹ️ EMC ELIGIBLE - Check patient conditions
• Diabetic patients: Retinal imaging covered in full
• Diabetes/Glaucoma/AMD: May qualify for additional services
• If diabetic: Dilated exam recommended + PCP communication required
```

### 💳 Vision Savings Pass (Discount Plan)
**CRITICAL: NOT INSURANCE - Different calculations entirely!**

**Display Warning:**
```
⚠️ DISCOUNT PLAN - NOT INSURANCE
• Patient pays percentage of retail, NOT allowance-based
• Frame: 75% of retail
• Exam: 80% of U&C (or $50 with complete pair)
• No CL allowance - 100% of U&C for materials
```

---

## PLAN TYPES (5 Types Identified)

| Plan Type | Count | Characteristics |
|-----------|-------|-----------------|
| **VSP Signature Plan** | 12 | Highest benefits, $0 exam, $10 material, $155 frame, $155 CL |
| **VSP Choice Plan** | 22 | Mid-tier, $10 exam, $15-25 material, variable frame/CL |
| **VSP Advantage Plan** | 8 | Lower tier, $10 exam, $15 material, no WFA codes shown |
| **VSP Computer VisionCare Plan Supplemental** | 2 | Computer glasses only, $90 frame, limited coverage |
| **VSP Vision Savings Pass** | 1 | DISCOUNT PLAN - NOT INSURANCE! Patient pays % of retail |

---

## FRAME ALLOWANCE - COMPLETE MATRIX

### All WFA Codes Observed (Non-Altair Only)

| WFA Code | Amount | Occurrences | Notes |
|----------|--------|-------------|-------|
| WFA35 | $90 | 2 | Computer VisionCare only |
| WFA46 | $120 | 1 | MetLife |
| WFA50 | $130 | 1 | Low tier Guardian |
| WFA57 | $150 | 8 | Common Choice base |
| WFA58 | $150 | 1 | Variant |
| WFA60 | $155 | 12 | Signature standard |
| WFA62 | $160 | 2 | Adventist Health |
| WFA67 | $175 | 1 | (Usually Altair) |
| WFA69 | $180 | 1 | Variant |
| WFA70 | $180 | 1 | LEP PSB |
| WFA76 | $200 | 7 | Higher Choice |
| WFA84 | $220 | 2 | High Choice |
| WFA88* | $230 | 1 | EasyOptions upgrade |
| WFA96* | $250 | 3 | EasyOptions upgrade |
| WFA134* | $350 | 5 | EasyOptions upgrade (highest) |

**Note:** Codes with `*` are EasyOptions upgrade amounts

### Frame Allowance by Plan Type (Non-Altair)

| Plan Type | Base Range | EasyOptions Upgrade |
|-----------|------------|---------------------|
| Signature | $155 | N/A |
| Choice | $130-$220 | $230-$350 |
| Advantage | $150 | N/A |
| Computer | $90 | N/A |
| Savings Pass | 75% off retail | N/A |

### Language Variations

**Standard Format:**
```
WFA## $XXX.00 for non-Altair Eyewear/Marchon frames. Patient receives 20% savings on frame overage.
```

**Variant Format (shorter):**
```
WFA## $XXX.00 for non-Altair/Marchon frames. Patient receives 20% savings on frame overage.
```

**Advantage Plan (no WFA code):**
```
$150.00 for non-Altair Eyewear/Marchon frames. Patient receives 20% savings on frame overage.
```

**EasyOptions Format:**
```
WFA## Frame $XXX.00* for non-Altair Eyewear/Marchon frames. Patient receives 20% savings on frame overage.
```
Note: `*` indicates EasyOptions upgrade amount

---

## CONTACT LENS ALLOWANCE - ALL PATTERNS

### Pattern A: Separate Exam + Materials (Most Common)

**CL Exam Services:**
| Language | Occurrences |
|----------|-------------|
| `Covered in full.` | 1+ (Best coverage!) |
| `Charge the lesser of $10 copay or 85% U&C.` | 13 |
| `Charge the lesser of $40 copay or 85% U&C.` | 10 |
| `Charge the lesser of $50 copay or 85% U&C.` | 2 |
| `Charge the lesser of $60 copay or 85% U&C.` | 14 |

**Note:** "Covered in full" = $0 patient cost for CL exam services!

**CL Materials:**
| Amount | Occurrences |
|--------|-------------|
| $120 | 8 |
| $130 | 1 |
| $150 | 4 |
| $155 | 12 |
| $160 | 2 |
| $180 | 1 |
| $200 | 4 |

### Pattern B: Combined Exam + Materials (5 Files)

**Standard Combined:**
```
Exam And Allowance
Take 15% off CL exam services before applying $150.00 for CL exam services and materials.
If patient receives CL exam services only, patient is responsible for CL exam services over $60.00.
```

**Combined with EasyOptions:**
```
Exam And Allowance
Take 15% off CL exam services before applying $150.00 ($230.00*) for CL exam services and materials.
If patient receives CL exam services only, patient is responsible for CL exam services over $60.00.
```

**Combined Pattern Calculation:**
1. CL Exam retail × 0.85 (15% discount)
2. Remaining allowance = Total allowance - Discounted exam
3. Apply remaining to materials

### Pattern C: Discount Plan (Vision Savings Pass)
```
Contacts: Charge 85% of U&C for contact lens exam service and 100% of U&C for materials.
```
- No allowance - patient pays percentage of full price!

### Necessary Contact Lenses (Medical)
| Language | Occurrences |
|----------|-------------|
| `Criteria applies; see VSP Manual. Copay $10.00.` | 14 |
| `Criteria applies; see VSP Manual. Copay $15.00.` | 13 |
| `Criteria applies; see VSP Manual. Copay $20.00.` | 5 |
| `Criteria applies; see VSP Manual. Copay $25.00.` | 11 |

### "Contacts Instead Of" Rules
| Language | Meaning |
|----------|---------|
| `Contacts are instead of [lens, frame].` | Replaces both lens AND frame benefits |
| `Contacts are instead of [lens, frame]. If contacts chosen, frame will next be available XX/XX.` | Same, with frame frequency reset noted |

---

## EXAM & MATERIAL COPAYS - COMPLETE LIST

### Exam Copays
| Amount | Occurrences | Typical Plan Type |
|--------|-------------|-------------------|
| $0 | 12 | Signature |
| $5 | 2 | Some Choice (UO Regular) |
| $10 | 26 | Most Choice, Advantage |
| $15 | 3 | Individual Plan |
| $25 | 2 | Brasfield & Gorrie |

### Material Copays
| Amount | Occurrences | Typical Plan Type |
|--------|-------------|-------------------|
| $10 | 14 | Signature, some Choice |
| $15 | 13 | Advantage, some Choice |
| $20 | 5 | Some Choice |
| $25 | 13 | Many Choice plans |

### Routine Retinal Screening
**Universal language:**
```
Routine Retinal Screening: Charge the lesser of $39.00 or U&C
```

---

## EASYOPTIONS - COMPLETE REFERENCE

### Identification
Look for this section at top of coverage area:
```
EasyOptions*
Patient has VSP EasyOptions coverage and may select one of the following
Contact Lens Upgrade $XXX.00
Frame Upgrade $XXX.00
Photochromic Upgrade Covered
Progressive Upgrade Covered
```

### Upgrade Amounts Observed

**Contact Lens Upgrade:**
| Amount | Occurrences |
|--------|-------------|
| $200 | 3 |
| $230 | 1 |
| $300 | 5 |

**Frame Upgrade:**
| Amount | Occurrences |
|--------|-------------|
| $230 | 1 |
| $250 | 3 |
| $350 | 5 |

### EasyOptions Selection Rules
Patient picks ONE:
1. **Contact Lens Upgrade** → Higher CL allowance (marked with `*`)
2. **Frame Upgrade** → Higher frame allowance (marked with `*`)
3. **Photochromic Upgrade** → Transitions = $0 copay
4. **Progressive Upgrade** → Premium/Custom progressive = $0 copay
5. **AR Upgrade** (some plans) → AR coating = $0 copay

### Enhancement Form Indicators
- Items covered by EasyOptions show `*` suffix
- Header shows: `EasyOptions*(Covered if selected as VSP EasyOptions)`
- Pricing shows: `$0` for items when EasyOptions applies

---

## SPECIAL PLAN TYPES

### 🖥️ VSP Computer VisionCare Plan Supplemental
**⚠️ REQUIRES PROMINENT FLAG ON PRICE LIST**

- **Purpose:** Computer/occupational glasses ONLY
- **Requirement:** `Prescription must differ by +/-0.50 diopters from everyday eyewear`
- **Frame:** $90 non-Altair (WFA35) - LOWER than standard plans
- **No CL coverage** - contacts section not present
- **Limited enhancements:**
  - ❌ Photochromics = NOT COVERED
  - ❌ Polarized = NOT COVERED
  - ❌ Progressives labeled differently (just "Progressives")
  - ✅ AR Coatings = Covered with copay
  - ✅ Near Variable Focus = Covered
  - ✅ Polycarbonate = Covered with copay

**Detection:** Look for `Benefit VSP Computer VisionCare Plan Supplemental`

### 💳 VSP Vision Savings Pass (DISCOUNT PLAN)
**⚠️ THIS IS NOT INSURANCE - Completely different calculations!**

- **Exam:** Patient pays 80% of U&C (or $50 if buying complete pair)
- **Frame:** Patient pays 75% of retail (NO allowance!)
- **Lenses:** Patient pays fixed amounts:
  - Single Vision: $40
  - Bifocal: $60
  - Trifocal: $75
  - Progressive: $60 + lens enhancement fee
- **Contacts:** 85% U&C for exam, 100% U&C for materials (NO allowance!)

**Detection:** Look for `Benefit VSP Vision Savings Pass`

### 🏥 Essential Medical Eye Care (EMC) Programs
**Not a plan type, but a benefit feature on most plans**

Two variants:
1. **Essential Medical Eye Care** - 64 occurrences
2. **Diabetic Eyecare Plus Program** - 8 occurrences

**What it provides:**
- Covered-in-full retinal screening for diabetic patients (without diabetic eye disease)
- Eligibility for additional exams/services for: Diabetes, Glaucoma, AMD
- Potential for medical eye care billing beyond routine

**Detection:** Look for either phrase in the plan section

**Relevant Patient Conditions (from Eye Health Management Conditions section):**
- Systemic: High Risk for Prediabetes, Diabetes, Hypertension, High Cholesterol
- Ocular: Diabetic Retinopathy, Glaucoma, AMD

**Business Impact:**
- If patient has diabetes → Retinal imaging should be FREE
- If patient has diabetes/glaucoma/AMD → May qualify for additional covered services
- Consider flagging on price list when these conditions are checked

---

## LENS ENHANCEMENT FORM - CODE REFERENCE

### Coverage Categories Observed
1. `Covered` - $0 copay
2. `Covered with Additional Copay` - Standard copay applies
3. `Covered with Additional Copay, 80% of U&C to Max` - Lesser of copay or 80% U&C
4. `Not Covered` - Patient pays full retail (Computer VisionCare)

### Progressive Tier Codes
| Code | Name | Typical Copay |
|------|------|---------------|
| K | Standard (Progressive K) | $55 |
| J | Premium (Comfort DRx) | $95 |
| F | Premium (Comfort Max) | $105 |
| O | Custom 1 | $150 |
| N | Custom 2 (Varilux X) | $175 |

### Material Add-On Codes
| Code | Material | Typical Add-On |
|------|----------|----------------|
| A | CR-39 Plastic | Base |
| D | Polycarbonate | $35 |
| B | Trivex/1.60 HI | $47-56 |
| H | 1.67 High Index | $78-98 |
| J | 1.74 High Index | $111-125 |

### AR Coating Codes
| Code | Name | Copay |
|------|------|-------|
| QM | Anti-Reflective A (Standard) | $41 |
| QT | Anti-Reflective C (Premium 1) | $68 |
| QV | Anti-Reflective D (Premium 2) | $85 |

### Other Common Codes
| Code | Description | Copay |
|------|-------------|-------|
| PR | Photochromic/Transitions | $75 |
| DA | Polarized | $57-77 |
| LF | Light Filter (Blue Light) | $15 |
| SW | Rimless Drill Mount | $30 |
| SP | Edge Polish | $16 |
| MN | Plastic Tint | $15 |
| CM | Custom Measurement | $10 |

---

## CLIENT/EMPLOYER NAMES OBSERVED

| Client Name | Plan Type | Notes |
|-------------|-----------|-------|
| DISNEY WORLDWIDE SVCS., INC. | Signature | Most common, high benefits |
| THE GUARDIAN LIFE INSURANCE CO. OF AMERICA | Choice | Variable benefits |
| ANR0499FLX01 | Choice + EasyOptions | High EasyOptions upgrades |
| ACTIVE LOW | Advantage | Lower tier |
| ACTIVE HIGH EO | Choice + EasyOptions | |
| RETIREE HIGH EO | Choice + EasyOptions | |
| RETIREE LOW | Advantage | |
| ADVENTIST HEALTH SYSTEM | Choice | |
| UO REGULAR FT ACTIVE | Choice | Combined CL pattern |
| INDIVIDUAL PLAN FLORIDA | Choice | Has promo brands |
| METLIFE | Choice | Lower frame allowance |
| BRASFIELD & GORRIE EKLY | Choice | $25 exam copay |
| INSPERITY ADVANTAGE - ACTIVES | Advantage | Combined CL pattern |
| CAREINGTON VISION SAVINGS PASS | Savings Pass | Discount plan! |
| CORE ACTIVE | Choice | |
| XPO LOGISTICS, INC. | Choice | |
| LEP PSB MIDCO, LLC | Choice | |

---

## EXTRACTION RULES FOR PRICING ENGINE

### Step 1: Identify Plan Type
```
Look for: "Benefit VSP [TYPE] Plan"
Types: Signature, Choice, Advantage, Computer VisionCare, Vision Savings Pass
```

### Step 2: Check for EasyOptions
```
Look for: "EasyOptions*" section
If present, extract upgrade amounts for Frame and CL
```

### Step 3: Extract Frame Allowance
```
ALWAYS look for: "for non-Altair" line
Extract dollar amount
If EasyOptions, also extract * amount
```

### Step 4: Determine CL Pattern
```
If "CL Exam Services" AND "CL Materials" → Pattern A (Separate)
If "Exam And Allowance" → Pattern B (Combined)
If "Charge XX% of U&C" → Pattern C (Discount)
```

### Step 5: Extract Copays
```
Exam copay: "Exam $XX.XX" or "Exam $0"
Material copay: "Material $XX.XX"
CL exam: "lesser of $XX copay or 85% U&C"
Necessary CL: "Copay $XX.XX"
```

### Step 6: Handle Special Cases
```
- Vision Savings Pass: Use discount calculations, not allowances
- Computer VisionCare: Limited coverage, check "Not Covered" items
- Advantage without WFA codes: Look for amounts without codes
```

---

## CALCULATION EXAMPLES

### Example 1: Signature Plan Frame
- Frame retail: $289
- Allowance (WFA60): $155
- Overage: $289 - $155 = $134
- Patient pays: $134 × 0.80 = **$107.20**

### Example 2: Choice Plan with EasyOptions Frame Upgrade
- Frame retail: $289
- Base allowance (WFA76): $200
- EasyOptions (WFA134): $350
- If upgrade selected: $289 - $350 = -$61 → **$0** (allowance covers it)
- If not selected: ($289 - $200) × 0.80 = **$71.20**

### Example 3: Combined CL Pattern
- CL Exam retail: $95
- Total allowance: $150
- Step 1: $95 × 0.85 = $80.75 (15% off exam)
- Step 2: Remaining: $150 - $80.75 = $69.25
- If CL materials = $180: Patient pays $180 - $69.25 = **$110.75**

### Example 4: Vision Savings Pass Frame
- Frame retail: $289
- Patient pays 75%: $289 × 0.75 = **$216.75**
- (No allowance - completely different calculation!)

---

## PRICE LIST NOTIFICATION REQUIREMENTS

### Mandatory Flags/Banners

| Condition | Flag Type | Display |
|-----------|-----------|---------|
| Computer VisionCare Plan | 🔴 RED BANNER | "COMPUTER VISION PLAN - Rx must differ ±0.50 from everyday glasses. Transitions & Polarized NOT COVERED." |
| Vision Savings Pass | 🔴 RED BANNER | "DISCOUNT PLAN - Not insurance. Patient pays % of retail." |
| EasyOptions Available | 🟡 YELLOW BANNER | "EasyOptions: Patient may upgrade Frame ($XXX), CL ($XXX), or select covered Transitions/Progressive/AR" |
| EMC/Diabetic Program | 🟢 GREEN NOTE | "EMC Eligible - Diabetic retinal imaging covered. Check patient conditions." |
| Patient has Diabetes checked | 🟢 GREEN NOTE | "Diabetic patient - Retinal imaging FREE" |
| Patient under 19 | 🔵 BLUE NOTE | "Child - Check for free polycarbonate" |
| Value Added Benefits | 🎁 INFO SECTION | "Additional Pair: 30-40% same day, 20% within 12 months. CL exam: 15% off 12 months." |
| Post-Laser VisionCare | 🔵 BLUE NOTE | "Post-LASIK patient may use frame allowance for non-Rx sunglasses" |
| Vision Therapy (Computer only) | 🟣 PURPLE NOTE | "Vision Therapy available - see VSP Manual criteria" |
| Low Vision | 🟣 PURPLE NOTE | "Low Vision criteria may apply - see VSP Manual" |
| COB Not Allowed | 🔴 RED WARNING | "COB NOT ALLOWED - Single coverage only. Call VSP 800.615.1883 for exceptions." |
| Reported Condition: Diabetes | 🟢 GREEN NOTE | "Diabetic patient - VSP recommends dilated exam + PCP communication required" |

### Item-Level Flags

| Product | Condition | Flag |
|---------|-----------|------|
| Transitions/Photochromic | Computer VisionCare | ❌ "NOT COVERED on this plan" |
| Polarized | Computer VisionCare | ❌ "NOT COVERED on this plan" |
| Frame over allowance | Always | Show overage calculation: "(Retail - $XXX allowance) × 80% = $YYY" |
| Any item | EasyOptions upgradeable | ⭐ "EasyOptions: $0 if selected" |

### Price Display Rules

1. **Standard items**: Show copay from enhancement form
2. **Frame**: Show allowance AND calculated overage
3. **CL (Separate pattern)**: Show exam copay + materials allowance
4. **CL (Combined pattern)**: Show combined allowance with calculation note
5. **Not Covered items**: Show "CASH ONLY - $XXX retail"
6. **EasyOptions items**: Show both prices (base copay / $0 if EasyOptions selected)

---

## VALIDATION CHECKLIST

Before going live, verify extraction handles:

### Plan Type Detection
- [ ] All 5 plan types correctly identified
- [ ] WFA codes AND non-coded amounts (Advantage plans)
- [ ] Both CL patterns (Separate and Combined)
- [ ] EasyOptions detection and upgrade amounts
- [ ] Vision Savings Pass discount calculations
- [ ] Computer VisionCare limited coverage detection

### Text Parsing
- [ ] Brand promotions (Anne Klein, etc.) - IGNORE these
- [ ] "Altair/Marchon" vs "Altair Eyewear/Marchon" text variants
- [ ] "Essential Medical Eye Care" vs "Diabetic Eyecare Plus Program"
- [ ] WFA codes with and without "Frame" prefix (EasyOptions)
- [ ] "Low Vision Criteria Applies" detection
- [ ] "Post-Laser VisionCare" detection
- [ ] "Vision Therapy Criteria Applies" detection (Computer only)

### Notification System
- [ ] Computer VisionCare banner displays prominently
- [ ] Vision Savings Pass banner displays prominently
- [ ] EasyOptions banner shows upgrade amounts
- [ ] EMC/Diabetic note displays when detected
- [ ] "NOT COVERED" items flagged on Computer VisionCare plans
- [ ] Frame overage calculation shown correctly
- [ ] EasyOptions $0 pricing shown for eligible items
- [ ] Value Added Benefits discount tiers displayed
- [ ] Post-Laser VisionCare note (if detected)

### Coverage Category Parsing
- [ ] "Covered" = $0 copay
- [ ] "Covered with Additional Copay" = Standard copay
- [ ] "Covered with Additional Copay, 80% of U&C" = Lesser of copay or 80% retail
- [ ] "Not Covered" = Full retail (cash only)

### Edge Cases
- [ ] Patient under 19 - flag for free poly
- [ ] Diabetic patient - flag for free retinal imaging
- [ ] Combined CL allowance calculation correct
- [ ] Negative frame overage = $0 (not negative)
- [ ] Advantage plans without WFA codes - extract dollar amounts directly
- [ ] COB/Coordination of Benefits (rare) - flag if detected
- [ ] Interim Benefits (rare) - flag if detected

---

## ADDITIONAL FEATURES (NEWLY DOCUMENTED)

### 🌟 Post-Laser VisionCare
**Appears on:** Most Signature plans, some Choice plans
**Language:**
```
Post-Laser VisionCare: Patients who had laser correction surgery can use their frame benefit for non-prescription, ready-made sunglasses.
```

**Business Impact:**
- Patient had LASIK/PRK surgery
- Can use frame allowance for non-Rx sunglasses
- Should flag on price list if detected

---

### 👁️ Low Vision
**Appears on:** Most plans (38+ occurrences)
**Language:**
```
Low Vision Criteria Applies see VSP Manual.
```

**Business Impact:**
- Criteria in VSP Manual - not on auth form
- May qualify for additional low vision services/devices
- Generally informational; specific criteria apply

---

### 🎁 Value Added Benefits (Additional Pair Discounts)
**Appears on:** Most plans
**Multiple discount tiers observed:**

| Discount | Timing | Language |
|----------|--------|----------|
| **30%** | Same day | `30% complete additional pair of glasses, including non-prescription plano sunglasses and blue light filtering glasses, from the same VSP doctor on the same day of the routine exam.` |
| **40%** | Same day | `40% complete additional pair of glasses, including non-prescription plano sunglasses and blue light filtering glasses, from the same VSP doctor on the same day of the routine exam.` |
| **40%** | Within 12 months | `40% off complete additional pair of prescription glasses, including lens enhancements, within 12 months from the same VSP doctor who performed routine exam.` |
| **20%** | Within 12 months | `20% complete additional pair of glasses, including non-prescription plano sunglasses and blue light filtering glasses, from a VSP doctor within 12 months of routine exam.` |
| **15%** | CL Exam Discount | `15% contact lens exam services from a VSP doctor for 12 months on or following date of routine exam.` |

**Display on Price List:**
```
🎁 VALUE ADDED BENEFITS
• Same Day: 30-40% off additional pair
• Within 12 months: 20-40% off additional pair
• CL Exam Discount: 15% off within 12 months
```

---

### 🧠 Vision Therapy
**Appears on:** Computer VisionCare Plan ONLY (2 occurrences)
**Language:**
```
Vision Therapy Criteria Applies see VSP Manual.
```

**Business Impact:**
- Only available on Computer VisionCare supplemental plans
- Criteria in VSP Manual
- Rare benefit - flag if present

---

### 📋 Coverage Type: "80% of U&C"
**Appears on:** Advantage plans
**New coverage category identified:**
```
Covered with Additional Copay, 80% of U&C
```

**Items affected (Advantage plans):**
- Glass Color Coatings
- High Index
- Mirror/Ski Type Coating
- Near Variable Focus
- Polarized
- Polycarbonate add-on for specific lens types
- Aspheric (plastic & digital)
- Blended Bifocal

**Calculation:**
```
Patient Pays = lesser of (Copay) or (Retail × 0.80)
```

---

### ⚠️ RARE EDGE CASES (May appear on some auths)

#### Coordination of Benefits (COB)
**Occurrences:** Rare - seen on INDIVIDUAL PLAN FLORIDA
**Exact language found:**
```
Coordination of Benefits: COB rule 9: COB isn't allowed. Call VSP at 800.615.1883 for client exceptions and specific instructions.
```
**Business Impact:**
- COB is NOT allowed for this plan
- Patient cannot combine with another vision plan
- Must call VSP for exceptions
- **⚠️ FLAG ON PRICE LIST: "COB NOT ALLOWED - Single coverage only"**

#### Interim Benefits
**Occurrences:** Very rare (~1 in sample)
**If detected:** Patient may have different coverage during waiting period

#### MetLife Special Handling
**Occurrences:** Very rare (~1 in sample)
**If detected:**
```
Metlife Vision member: Please refer to Metlife Vision, not VSP...
```
**Business Impact:** May need to redirect to different carrier processing

---

## DOCUMENT INVENTORY

**Total Files in VSP Only:** 93
**Auth Forms:** 48
**Enhancement Forms:** ~45
**Patients with Complete Pairs:** ~35
**Incomplete (missing 1 doc):** 4 (EH, RB, LS_auth orphan, MS_zvsp_cl orphan)
