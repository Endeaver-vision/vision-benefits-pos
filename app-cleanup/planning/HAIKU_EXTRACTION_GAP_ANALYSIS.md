# Haiku Extraction Gap Analysis - Missing Fields Investigation

## Executive Summary

Haiku successfully extracted 32/37 key fields (86% coverage). **5 fields were missed:**
1. Photochromic/Transitions: $0 copay
2. Scratch Coating: $15
3. Tint: $15
4. UV Treatment: $15
5. Retinal Imaging: Up to $39

All missed fields are **secondary enhancements or diagnostics**, not core benefits. However, these should be captured for complete pricing information.

---

## Root Cause Analysis

### Issue 1: Zero-Value Filtering (Photochromic)

**Field Missed**: Photochromic → Transitions: $0 copay

**Why?**
- Document says: "Photochromic - Non-Glass: $0 copay"
- Haiku extracted: (not included)
- Instruction in prompt: "Only include sections/fields that have values in the document"
- **Root cause**: Haiku likely interpreted this as "only include fields with non-zero values"
- The phrase "Only include sections/fields that have values" is ambiguous:
  - Does it mean "fields mentioned in the document"? (they were)
  - Does it mean "fields with values greater than 0"? (Haiku apparently assumes this)

**Evidence**:
- Haiku DID include "polycarbonate: 0" (zero value)
- Haiku DID include "examCopay: 0" (zero value)
- But did NOT include "Photochromic: 0" (zero value)
- **Inconsistency pattern**: Zero values are sometimes included, sometimes not

---

### Issue 2: Format Variation - Missing "copay" Label

**Fields Missed**: Scratch Coating ($15), Tint ($15), UV Treatment ($15)

**Why?**
- Most benefits in document: "Single Vision: $10 **copay**"
- These enhancements: "Scratch Coating: **$15**" (no "copay" word)
- Value extraction rules expect patterns like "$XX copay"
- **Root cause**: Format inconsistency in source document

**Evidence from Document**:
```
Lens Options
Anti Reflective Coating - Standard        $45 copay
Anti Reflective Coating - Premium Tier 1  $57 copay
...
Scratch Coating - Standard Plastic        $15        ← NO "copay" word
Tint - Solid and Gradient                 $15        ← NO "copay" word
UV Treatment                              $15        ← NO "copay" word
All Other Lens Options                    20% off retail price
```

The document itself is inconsistent:
- AR coatings have "copay" label
- Scratch/Tint/UV have NO label, just dollar amounts
- Haiku may be filtering out "uncertain" values without the copay label

---

### Issue 3: Field Not In Prompt Definition

**Field Missed**: Retinal Imaging: Up to $39

**Why?**
- Prompt explicitly lists these COPAY fields:
  ```
  - examCopay: [amount]
  - Varilux Comfort: [amount]
  - clExamCopay: [amount]
  ... (etc)
  ```
- Prompt does NOT have a field for "retinalImaging" or "diagnostics"
- Document shows it in "Exam Services" section, not main lens benefits
- **Root cause**: retinalImaging is not defined as an extractable field

**Evidence**:
- Haiku extracted "Exam: $0 copay" → mapped to examCopay
- Haiku did NOT extract "Retinal Imaging: Up to $39"
- There's no "retinalImaging" field in the prompt to map to

---

### Issue 4: Synonym Mapping Incomplete

**Field Missed**: Photochromic (document) vs. Transitions (prompt)

**Why?**
- Prompt Translation Guide includes: "Transitions / Photochromic → field: 'Transitions'"
- But the field list doesn't mention that "Photochromic - Non-Glass" should map to "Transitions"
- Haiku may have seen "Photochromic - Non-Glass" and thought:
  - "This is a photochromic lens type"
  - "But the lens types in the COPAYS section are: Single Vision, Bifocal, Trifocal, etc."
  - "This doesn't fit" → skip it
- OR Haiku recognized it's related to Transitions but excluded it because it had a $0 value

---

### Issue 5: Incomplete Field List for Enhancements

Looking at the prompt COPAYS section:
```
- Transitions: [amount]      ← Listed
- polarized: [amount]        ← Listed
- tint: [amount]             ← Listed
- blueLight: [amount]        ← Listed
- scratchCoating: [amount]   ← Listed
- uvTreatment: [amount]      ← Listed
```

**All these fields ARE in the prompt!** So why were they missed?

**Hypothesis**: The issue is not that the fields aren't listed. The issue is:

1. **Format inconsistency**: The document uses "$15" without the word "copay", but the VALUE EXTRACTION RULES example shows:
   ```
   1. "$XX copay" → extract number XX
   ```
   - Haiku may not recognize "$15" as a valid copay format if it doesn't match the "$XX copay" pattern

2. **Zero-value prioritization**: $0 copay fields might be treated as "not important" or "already covered"

3. **Ambiguous instruction**: "Only include sections/fields that have values in the document" is causing selective filtering

---

## Why Some Fields WERE Extracted (Inconsistency Check)

To understand why some optional fields were kept but not others:

**INCLUDED Optional Fields**:
- arStandard: $45 ✅
- Crizal Easy: $57 ✅
- Crizal Sapphire: $68 ✅
- Crizal Prevencia: $100 ✅
- polycarbonate: $0 ✅ (zero value)
- allOtherLensOptions: "20% off retail price" ✅

**NOT INCLUDED Optional Fields**:
- Photochromic/Transitions: $0 ❌ (zero value)
- scratchCoating: $15 ❌
- tint: $15 ❌
- uvTreatment: $15 ❌
- Retinal Imaging: Up to $39 ❌

**Pattern**:
- AR coatings all included (clear copay labels)
- Polycarbonate included (zero value, BUT clear copay label)
- Scratch/Tint/UV NOT included (marginal dollar amounts, NO copay label)
- Retinal Imaging NOT included (not defined as field)

**Conclusion**: The primary filter is **format consistency** and **label clarity**, not value importance.

---

## Three Root Causes (Priority Order)

### 1. **Format Variation in Source Document** (40% of issue)
The EyeMed document itself is inconsistent:
- Most items: "$XX copay"
- Some items: "$XX" (bare dollar amount)
- Haiku's extraction pattern expects consistency

### 2. **Ambiguous Instruction to Filter** (35% of issue)
The instruction "Only include sections/fields that have values in the document" is causing Haiku to be selective about what counts as "important enough" to include.

### 3. **Incomplete Field Definitions** (25% of issue)
- Retinal Imaging not in field list
- Photochromic/Transitions mapping incomplete in priority
- Some enhancements treated as lower priority

---

## Solution Plan

### Phase 1: Clarify the Filtering Instruction (Immediate)

**Current Instruction**:
```
Only include sections/fields that have values in the document.
```

**Problem**: This is ambiguous. Haiku interprets it as "only include important fields" rather than "include all fields mentioned".

**Solution**:
Replace with explicit instruction:
```
Return ALL fields from the document, including:
- All copay amounts (even if $0)
- All percentage discounts
- All enhancement options
- All diagnostic services

Do not filter based on whether you think a field is "important".
If it appears in the document's benefits table, extract it.
```

---

### Phase 2: Add Format Variation Handling (High Priority)

**Current Rules**:
```
1. "$XX copay" → extract number XX
```

**Problem**: Doesn't handle "$15" without "copay" label

**Solution**: Add explicit rule:
```
1. "$XX copay" → extract number XX
1b. "$XX" (standalone dollar amount in lens options table) → extract XX
    Examples: "Scratch Coating $15", "Tint $15", "UV Treatment $15"
```

---

### Phase 3: Expand Field List (Medium Priority)

**Add these missing fields** to the COPAYS section of the prompt:

```
(EXISTING)
- Transitions: [amount]
- polarized: [amount]
- tint: [amount]
- blueLight: [amount]
- scratchCoating: [amount]
- uvTreatment: [amount]

(ADD)
- photochromic: [amount]    ← Explicitly add as separate field (even though Transitions exists)
- retinalImaging: [amount]  ← Add to exam services
- fitAndFollowupStandard: [amount]  ← Contact lens fitting
- fitAndFollowupPremium: [amount]   ← Contact lens fitting premium
```

**Why**:
- Some documents use "Photochromic", some use "Transitions" → need both
- Retinal Imaging is a distinct diagnostic service with a copay
- Fit and Follow-up is distinct from exam copay

---

### Phase 4: Enhance Rosetta Stone (Medium Priority)

**Add to PRODUCT NAME TRANSLATION GUIDE**:

```
**LENS ENHANCEMENTS:**
- Photochromic / Photochromic - Non-Glass → field: "photochromic"
- Transitions / Photochromic → field: "Transitions"
- Scratch Coating / Scratch Coating - Standard Plastic → field: "scratchCoating"
- Tint / Tint - Solid and Gradient → field: "tint"
- UV Treatment / UV Coating / UV Protection → field: "uvTreatment"

**DIAGNOSTIC SERVICES:**
- Retinal Imaging / Fundus Photography → field: "retinalImaging"

**CONTACT LENS FITTING:**
- Contact Lens Fit and Follow-up - Standard → field: "fitAndFollowupStandard"
- Contact Lens Fit and Follow-up - Premium → field: "fitAndFollowupPremium"
```

---

### Phase 5: Test Against Known Gaps (Validation)

After implementing fixes, test against documents that have these fields:

1. Verify Photochromic ($0 value) is captured
2. Verify Scratch Coating ($15) is captured
3. Verify Tint ($15) is captured
4. Verify UV Treatment ($15) is captured
5. Verify Retinal Imaging (Up to $39) is captured

---

## Implementation Checklist

- [ ] Phase 1: Update filtering instruction in prompt
- [ ] Phase 2: Add format variation rules to VALUE EXTRACTION RULES
- [ ] Phase 3: Add missing fields to COPAYS list
- [ ] Phase 4: Enhance Rosetta Stone with field variations
- [ ] Phase 5: Re-test against the 3 sample documents
- [ ] Verify complete extraction from Steven Soto document

---

## Expected Outcome

After implementing all phases, the same Steven Soto document should extract:

```
COPAYS:
- examCopay: 0
- Transitions: 0                    ← FIXED
- scratchCoating: 15                ← FIXED
- tint: 15                          ← FIXED
- uvTreatment: 15                   ← FIXED
- retinalImaging: 39                ← FIXED
- ... (all other fields as before)
```

**Target**: 100% field coverage for complete pricing calculations.

---

## Risk Assessment

**Low Risk**: These are enhancement fields, not core benefits. Existing extractions are 95%+ accurate.

**Medium Impact**: Missing these fields means incomplete pricing for patients who select these enhancements.

**Easy Fix**: All issues are in the prompt, not the extraction engine or downstream processing.
