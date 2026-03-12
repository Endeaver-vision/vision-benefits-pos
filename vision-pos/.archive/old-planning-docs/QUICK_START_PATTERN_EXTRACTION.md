# Quick Start: EyeMed Pattern Extraction

## TL;DR

EyeMed documents now use **exact pattern matching** (209 patterns) instead of field guessing.

- **Status**: ✅ Integrated into API
- **Test**: `npx tsx scripts/test-eyemed-pattern-extraction.ts <pdf-path>`
- **Accuracy**: 100% on sample PDF (8/8 benefits matched)
- **Performance**: ~5-7 seconds per document
- **Cost**: ~$0.01-0.02 per document

## What Changed

```
Before: PDF → Generic Extraction → Results (lower accuracy)
After:  PDF → Pattern Matching (209 patterns) → Results (high accuracy)
```

## Files You Need to Know

| File | Purpose |
|------|---------|
| `src/lib/data/eyemed-verbatim-patterns.json` | All 209 patterns |
| `src/lib/services/ocr/extraction-dispatcher.ts` | Routes to pattern extraction for EyeMed |
| `src/app/api/documents/[id]/process/route.ts` | Updated API (uses dispatcher) |
| `EYEMED_PATTERN_EXTRACTION_INTEGRATION.md` | Full documentation |

## One-Line Test

```bash
npx tsx scripts/test-eyemed-pattern-extraction.ts "public/uploads/insurance-docs/cust_93800643_1768495131786_SS_eyemed.pdf"
```

Should output: `Extracted 8 benefits, 0 unrecognized` ✅

## How the Scanner Works Now

1. User uploads EyeMed PDF
2. Dispatcher detects "EyeMed" from filename
3. Pattern extraction runs (matches 209 patterns)
4. Haiku API extracts variable values (copays, allowances, %)
5. Normalization applies business rules
6. Results show:
   - ✅ Extraction Method: `eyemed-pattern-based`
   - ✅ Benefits: 8 matched
   - ✅ Copays: Calculated

## API Integration Points

### Document Processing Endpoint

**Before:**
```typescript
const rawData = await extractRawDocument(filePath)
const normalizedData = await normalizeBenefits(rawData)
```

**After:**
```typescript
const dispatchResult = await dispatchExtraction(filePath)
const rawData = dispatchResult.rawExtraction
const normalizedData = await normalizeBenefits(rawData)
```

### Extraction Method Detection

Check API response to see which method was used:

```javascript
response.json().then(data => {
  console.log(data.extractionMethod)
  // 'eyemed-pattern-based' or 'generic'

  if (data.extractionMethod === 'eyemed-pattern-based') {
    console.log(`Patterns matched: ${data.nativeExtractionStats.patternsMatched}`)
  }
})
```

## Running Tests

### Test 1: Standalone Pattern Extraction
```bash
npx tsx scripts/test-eyemed-pattern-extraction.ts <pdf-path>
```
- ✅ Loads 209 patterns
- ✅ Extracts benefits from PDF
- ✅ Shows which patterns matched

### Test 2: Full API Integration (requires server)
```bash
npm run dev # Terminal 1
npx tsx scripts/test-api-integration.ts # Terminal 2
```
- ✅ Creates test customer
- ✅ Uploads PDF via API
- ✅ Processes through extraction pipeline
- ✅ Verifies results

## Understanding Pattern Matching

### What It Does

1. **Reads PDF text** using PyPDF2
2. **Creates prompt** with all 209 known patterns
3. **Calls Haiku** to match text against patterns
4. **Extracts variables** (copays, allowances, percentages)
5. **Returns benefits** with detected formulas

### Example Pattern Match

```
PDF text: "Frame $0 copay; 20% off balance over $200 allowance"
Pattern:  "Frame $0 copay; 20% off balance over $XXX allowance"
Match:    ✅ YES
Extracted: { allowance: 200, discount_factor: 0.20 }
```

## Copay Calculation

Four formula types:

```typescript
// 1. Flat copay
$0 copay → patient pays $0

// 2. Base copay + percentage
$85 copay + 20% over $120
→ patient pays: $85 + ((price - $120) × 0.20)

// 3. Allowance + percentage
20% off over $150 allowance
→ patient pays: (price - $150) × 0.20

// 4. Percentage only
35% off retail
→ patient pays: price × 0.35
```

## Directory Structure

```
src/lib/
├── data/
│   └── eyemed-verbatim-patterns.json      # 209 patterns
└── services/ocr/
    ├── eyemed-verbatim-db.ts             # Pattern database class
    ├── eyemed-pattern-extraction.ts       # Haiku integration
    ├── eyemed-copay-calculator.ts         # Formula calculator
    └── extraction-dispatcher.ts           # Smart routing

scripts/
├── extract-pdf-text.py                    # PDF helper
├── test-eyemed-pattern-extraction.ts      # Pattern test
└── test-api-integration.ts                # API test

src/app/api/
└── documents/[id]/process/route.ts        # API endpoint (MODIFIED)
```

## Common Operations

### Get Database Stats
```typescript
import { getEyeMedDatabaseStats } from '@/lib/services/ocr/eyemed-pattern-extraction'

const stats = getEyeMedDatabaseStats()
console.log(stats.total_patterns) // 209
console.log(stats.total_categories) // 42
```

### Calculate Copay Manually
```typescript
import { EyeMedCopayCalculator } from '@/lib/services/ocr/eyemed-copay-calculator'

const copay = EyeMedCopayCalculator.calculate(393, {
  base_copay: 85,
  allowance: 120,
  discount_factor: 0.20,
  formula_type: 'base_copay_plus_percentage'
})
console.log(copay.patient_copay) // 139.60
```

### Extract Benefits Standalone
```typescript
import { extractEyeMedBenefitsWithPatterns } from '@/lib/services/ocr/eyemed-pattern-extraction'

const result = await extractEyeMedBenefitsWithPatterns('path/to/pdf.pdf')
console.log(result.benefits) // { exam: {...}, frame: {...}, ... }
```

## Performance Targets

- **PDF Extraction**: 1-2s
- **Haiku API call**: 2-3s
- **Normalization**: 1-2s
- **Total**: ~5-7 seconds

If slower:
1. Check API rate limits
2. Verify internet connection
3. Check PDF file size (large PDFs extract slower)

## Debugging

### Enable Verbose Logging
Console logs show:
```
[EyeMedPatternExtraction] Extracting text from PDF...
[EyeMedPatternExtraction] Extracted 3 pages from PDF
[EyeMedPatternExtraction] Calling Haiku API for pattern matching...
[EyeMedPatternExtraction] Received response from Haiku
[EyeMedPatternExtraction] Extracted 8 benefits, 0 unrecognized
```

### Check Pattern Database
```bash
# See all patterns for a category
grep -A 5 '"EXAM"' src/lib/data/eyemed-verbatim-patterns.json
```

### Verify Copay Calculation
```typescript
const result = EyeMedCopayCalculator.calculate(393, benefit)
console.log(result.calculation_steps) // Shows step-by-step
```

## Rollback (if needed)

If you need to go back to generic extraction:

```typescript
// In extraction-dispatcher.ts, change:
if (detectedCarrier === 'EyeMed') {
  // Comment this out:
  // return eyeMedPatternExtraction(...)

  // Uncomment this:
  return genericExtraction(filePath)
}
```

Then restart the server.

## Questions?

1. See full docs: `EYEMED_PATTERN_EXTRACTION_INTEGRATION.md`
2. Check test scripts for examples: `scripts/test-*.ts`
3. Review pattern database: `src/lib/data/eyemed-verbatim-patterns.json`
4. Check API route: `src/app/api/documents/[id]/process/route.ts`

## Success Indicators ✅

- ✅ Scanner processes EyeMed PDFs without errors
- ✅ Benefits show in results with copay values
- ✅ Extraction method shows as `eyemed-pattern-based`
- ✅ No unrecognized benefits (or very few)
- ✅ Copay calculations match known values

---

**Ready to test?** Run the quick test above! 🚀
