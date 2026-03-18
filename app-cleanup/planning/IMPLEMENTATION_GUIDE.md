# EyeMed Extraction Implementation Guide (Claude Haiku)

**Status**: Architecture designed, prompt prepared, ready for implementation

**Goal**: Simplify the Claude Haiku extraction pipeline to output product names directly, eliminating field name mismatches and reducing complexity.

---

## Current State (Broken)

```
PDF Document
  ↓
Haiku (571-line complex prompt)
  ↓
progressiveTier1: 95, arTier1: 45, ...
  ↓
buildCopaysJson() flattens to more field names
  ↓
Database stores: progressiveTier1, arTier1, ...
  ↓
Calculator looks for: progressivePremiumTier1, progressivePremiumTier1, ...
  ↗ ↙ MISMATCH! Fields don't align
  ✗ Prices calculated incorrectly
```

---

## Target State (Fixed)

```
PDF Document
  ↓
Haiku (simplified prompt, ~250 lines)
  ↓
"Varilux X Series": 150, "Crizal Easy": 45, ...
  ↓
Parser validates and stores AS-IS
  ↓
Database stores: exact field names from extraction
  ↓
Calculator looks up products by name
  ↓
✓ Prices calculated correctly
```

---

## Files to Change

### 1. `/src/lib/services/ocr/gpt-extraction.ts` (Contains Claude Haiku extraction logic)

**What**: Replace the `EYE_MED_EXTRACTION_PROMPT` (the 571-line monster) used by Claude Haiku

**Current Location**: Lines ~200-300 (find `const EYE_MED_EXTRACTION_PROMPT`)

**Action**:
1. Delete everything in the old prompt
2. Replace with the content from `/planning/SIMPLIFIED_HAIKU_PROMPT.md`
3. Keep the function signature the same (`extractWithClaude()`)
4. Test that Claude Haiku still returns valid JSON

**Impact**: Claude Haiku will now output product names instead of tier names

### 2. `/src/lib/services/ocr/insurance-parser.ts`

**What**: Simplify `buildCopaysJson()` function

**Current Location**: Lines ~15-98

**Changes Needed**:

The function currently does two jobs:
1. Flattens nested JSON from extraction
2. Renames fields to be "calculator-friendly"

With the new extraction, it should just:
1. Validate the JSON structure
2. Pass it through AS-IS
3. Optionally normalize null values

**Before** (current):
```typescript
export function buildCopaysJson(extractedData: any): Record<string, unknown> {
  // Flattens nested: extractedData.copays.progressiveCopays.tier1
  // Renames: progressiveTier1 → progressivePremiumTier1
  // Complex transformation logic
}
```

**After** (simplified):
```typescript
export function buildCopaysJson(extractedData: any): Record<string, unknown> {
  // Just validate the shape
  if (!extractedData || typeof extractedData !== 'object') {
    return {}
  }

  // Return as-is (already flat from Haiku)
  return extractedData
}
```

**Impact**: Removes the complexity and field name mismatch source

### 3. `/src/lib/services/pricing-calculator.ts`

**What**: Update `getProgressiveCopay()` and `getArCopay()` methods

**Current Location**:
- `getProgressiveCopay()`: Lines ~538-568
- `getArCopay()`: Lines ~576-604

**Changes Needed**:

Currently looks for field names like `progressivePremiumTier1`:
```typescript
case 'tier_2':
  copay = eyemedTiers?.progressiveTier2 ?? auth.copays.progressivePremiumTier2
  break
```

Should look for product names like `"Varilux Physio"`:
```typescript
case 'tier_2':
  // New: look up by product name directly
  copay = auth.copays['Varilux Physio'] ?? null
  break
```

**New lookup pattern**:

```typescript
// Product name mapping for calculator
const EYEMED_TIER_TO_PRODUCT: Record<string, string> = {
  'tier_1': 'Varilux Comfort',
  'tier_2': 'Varilux Physio',
  'tier_3': 'Varilux X Series',
  'tier_4': 'Varilux XR Series',
  'tier_5': 'Varilux Panorama',
  'ar_tier_1': 'Crizal Easy',
  'ar_tier_2': 'Crizal Sapphire',
  'ar_tier_3': 'Crizal Prevencia',
}

private getProgressiveCopay(auth: BenefitAuthorization, tier: string): number | null {
  const productName = EYEMED_TIER_TO_PRODUCT[tier]
  if (!productName) return null

  const rawCopays = auth.copays as Record<string, unknown>
  const copay = rawCopays[productName]

  // Handle formula copays
  if (typeof copay === 'string') {
    // Pass to formula parser
    return this.parseFormulaCopay(copay)
  }

  return typeof copay === 'number' ? copay : null
}
```

**Impact**: Calculator will correctly retrieve product-based copays

### 4. Optional: Add New Mapping Table

**What**: Create database table or constant for tier-to-product mapping

**Location**: Could be in `pricing-calculator.ts` or new `tier-mapping.ts`

**Why**: Centralize the mapping from tier codes to product names

```typescript
// src/lib/services/tier-mapping.ts
export const EYEMED_TIER_TO_PRODUCT = {
  'standard_sv': 'Single Vision',
  'standard_bf': 'Bifocal',
  'standard': 'progressiveStandard',
  'tier_1': 'Varilux Comfort',
  'tier_2': 'Varilux Physio',
  'tier_3': 'Varilux X Series',
  'tier_4': 'Varilux XR Series',
  'tier_5': 'Varilux Panorama',
  'ar_tier_1': 'Crizal Easy',
  'ar_tier_2': 'Crizal Sapphire',
  'ar_tier_3': 'Crizal Prevencia',
  'polycarbonate': 'Polycarbonate',
  'trivex': 'Trivex',
  'high_index_167': 'Hi-Index 1.67',
  'high_index_174': 'Hi-Index 1.74',
  'photochromic': 'Transitions',
}
```

---

## Implementation Steps

### Phase 1: Update Claude Haiku Extraction Prompt (Low Risk)

1. Open `/src/lib/services/ocr/gpt-extraction.ts` (contains Haiku extraction logic)
2. Find `EYE_MED_EXTRACTION_PROMPT` constant
3. Replace with content from `/planning/SIMPLIFIED_HAIKU_PROMPT.md`
4. Test: Extract one document, verify output has product names
5. **Do NOT merge yet** - need to update parser/calculator first

### Phase 2: Simplify Parser (Medium Risk)

1. Open `/src/lib/services/ocr/insurance-parser.ts`
2. Update `buildCopaysJson()` to pass through without transformation
3. Add validation to ensure output is flat JSON
4. Test: Parse sample extracted data, verify no field name changes

### Phase 3: Update Calculator (High Risk - Test Carefully)

1. Open `/src/lib/services/pricing-calculator.ts`
2. Update `getProgressiveCopay()` to look up by product name
3. Update `getArCopay()` to look up by product name
4. Update `getMaterialCopay()` if needed
5. Add `EYEMED_TIER_TO_PRODUCT` mapping at top of file
6. Handle formula copays correctly
7. **Thoroughly test** before merging

### Phase 4: Integration Testing

1. Create test customer with known EyeMed auth
2. Run full pricing pipeline
3. Compare calculated prices to expected values
4. Run Playwright UI validation tests
5. Verify database has correct copay values

---

## Testing Checklist

Before each phase:

### Extraction Tests
- [ ] Extract from DA_Eyemed-Benefits.pdf
- [ ] Verify output has "Varilux X Series", not "progressiveTier3"
- [ ] Verify all field names are flat (no nested objects)
- [ ] Verify formulas preserved as strings
- [ ] Verify null values are actual JSON null

### Parser Tests
- [ ] Parse extracted data
- [ ] Verify field names unchanged
- [ ] Verify structure matches database schema
- [ ] Verify database insert succeeds

### Calculator Tests
- [ ] Load auth with extracted copays
- [ ] Look up Varilux Comfort product
- [ ] Verify correct copay retrieved
- [ ] Verify formula parsing works
- [ ] Compare calculated price to expected

### UI Tests
- [ ] Load customer price list
- [ ] Verify prices displayed correctly
- [ ] Verify "Not covered" doesn't appear incorrectly
- [ ] Verify insurance discount is calculated

---

## Rollback Plan

If something breaks:

1. **Revert extraction prompt** to old version
2. **Restore parser** to original `buildCopaysJson()`
3. **Restore calculator** to original lookup logic
4. **Verify** authorizations still work

This is safe because the old system was working (albeit with complexities).

---

## Expected Outcomes

After successful implementation:

✓ Haiku output directly matches database fields
✓ Calculator can directly retrieve copays by product name
✓ No field name mismatches
✓ Simpler code (fewer transformations)
✓ Easier to debug
✓ Support for formula copays (Tier 4, AR Tier 3)
✓ All 52+ documents can be extracted
✓ Pricing accuracy improved

---

## Files Reference

All planning documents are in `/planning/`:

- `EYEMED_EXTRACTION_COMPLETE.md` - Analysis of 44 documents (existing)
- `EYEMED_ROSETTA_STONE.md` - Complete product-to-copay mapping
- `SIMPLIFIED_HAIKU_PROMPT.md` - New extraction prompt to use
- `IMPLEMENTATION_GUIDE.md` - This file

---

## Questions to Ask Before Proceeding

1. **Backward Compatibility**: Should we support both old and new extraction formats during transition?
   - Recommended: No, just update everything at once
   - Alternative: Add compatibility layer in calculator

2. **Database Migration**: Do existing authorizations need to be re-extracted?
   - Recommended: Yes, re-run document scanner on all existing auths
   - Alternative: Keep as-is, only new documents use new format

3. **Testing Coverage**: How many documents should be validated?
   - Recommended: At least 5 EyeMed + 5 VSP + 2 Spectera
   - Minimum: 3 EyeMed documents

4. **Deployment Strategy**: Staging or direct to production?
   - Recommended: Staging first, then production
   - Requires: Test data setup, approval before deploy

---

## Success Metrics

✓ All 52 EyeMed test documents extract without errors
✓ Extracted fields match product names 100%
✓ Calculator lookups work for all extracted products
✓ Generated prices match expected copay values
✓ Zero field name mismatches in logs
✓ Code is simpler (fewer lines in parser/calculator)
✓ Tests pass (both unit and E2E)
✓ User verifies correctness on actual documents
