# EyeMed Pattern-Based Extraction Integration

## Overview

EyeMed documents are now extracted using a **209-pattern verbatim database** instead of generic field detection. This provides much higher accuracy and reliability.

## Architecture

```
Document Upload
       ↓
Extraction Dispatcher
       ├─ Detects Carrier (from file path)
       ├─ For EyeMed → Pattern-Based Extraction
       │   └─ Matches against 209 known patterns
       │   └─ Extracts variable values (copays, allowances, %)
       │   └─ Returns structured benefits
       └─ For Other Carriers → Generic Extraction
       ↓
Normalization (Rosetta Stones + Business Rules)
       ↓
Store in Database
```

## Key Files

### Pattern Database
- **`src/lib/data/eyemed-verbatim-patterns.json`** - 209 exact EyeMed benefit patterns organized by category

### Extraction Services
- **`src/lib/services/ocr/eyemed-verbatim-db.ts`** - VerbatimDatabase class and prompt generation
- **`src/lib/services/ocr/eyemed-pattern-extraction.ts`** - Haiku-based pattern matching
- **`src/lib/services/ocr/eyemed-copay-calculator.ts`** - Formula calculator (flat, base+%, allowance+%, percentage-only)
- **`src/lib/services/ocr/extraction-dispatcher.ts`** - Smart routing to appropriate extraction method

### API
- **`src/app/api/documents/[id]/process/route.ts`** - Updated to use dispatcher

### Utilities
- **`scripts/extract-pdf-text.py`** - Python helper for PDF text extraction
- **`scripts/test-eyemed-pattern-extraction.ts`** - Standalone pattern extraction test
- **`scripts/test-api-integration.ts`** - End-to-end API integration test

## How It Works

### 1. Extraction Dispatcher

Routes documents based on file path hints:

```typescript
const dispatchResult = await dispatchExtraction(document.filePath)
// Returns:
// {
//   rawExtraction: RawExtractionResult,
//   nativeExtraction: EyeMedExtractionResult | null,
//   extractionType: 'eyemed-pattern-based' | 'generic'
// }
```

### 2. Pattern-Based Extraction (EyeMed)

For EyeMed documents:

1. **Extract PDF text** using Python helper (PyPDF2)
2. **Send to Haiku** with pattern database (209 patterns grouped by 42 categories)
3. **Haiku matches** exact text patterns and extracts variables
4. **Return structured benefits** with detected formulas

Example output:

```json
{
  "exam": {
    "matched_pattern": "Exam $XX copay",
    "exact_text_found": "Exam $0 copay",
    "category": "EXAM",
    "base_copay": 0,
    "formula_type": "flat_copay"
  },
  "frame": {
    "matched_pattern": "Frame $0 copay; 20% off balance over $XXX allowance",
    "exact_text_found": "Frame $0 copay; 20% off balance over $200 allowance",
    "category": "FRAME",
    "allowance": 200,
    "discount_factor": 0.20,
    "formula_type": "allowance_plus_percentage"
  }
}
```

### 3. Copay Calculation

For each product, calculate patient copay based on retail price:

```typescript
const copay = EyeMedCopayCalculator.calculate(393, benefit)
// { patient_copay: 139.60, formula: "85 + ((393 - 120) × 0.20)" }
```

## Formula Types

| Type | Formula | Example |
|------|---------|---------|
| `flat_copay` | Fixed amount | $185 copay |
| `base_copay_plus_percentage` | Base + (% of amount over allowance) | $85 + 20% over $120 |
| `allowance_plus_percentage` | % of amount over allowance | 20% over $150 allowance |
| `percentage_only` | % of retail price | 35% off retail |

## Testing

### Test 1: Pattern Extraction Only

```bash
npx tsx scripts/test-eyemed-pattern-extraction.ts \
  "public/uploads/insurance-docs/cust_93800643_1768495131786_SS_eyemed.pdf"
```

Output shows:
- ✓ 209-pattern database loaded
- ✓ Benefits matched (8 from this sample)
- ✓ Unrecognized patterns (should be 0)

### Test 2: End-to-End API Integration

Start the server:
```bash
npm run dev
```

In another terminal:
```bash
npx tsx scripts/test-api-integration.ts [test-email@example.com]
```

Tests:
1. Creates test customer
2. Uploads EyeMed PDF
3. Calls `/api/documents/[id]/process`
4. Verifies extraction results
5. Cleans up

Expected response:
```json
{
  "success": true,
  "carrier": "EyeMed",
  "extractionMethod": "eyemed-pattern-based",
  "rawExtraction": {
    "benefitsFound": 8
  },
  "nativeExtractionStats": {
    "patternsMatched": 8,
    "unrecognized": 0
  }
}
```

## Scanner UI Integration

The scanner automatically uses the new extraction:

1. **Upload Document** → Dispatcher detects EyeMed
2. **Process** → Pattern extraction runs (no changes needed)
3. **Results** → Shows matched patterns + calculated copays
4. **Benefits Summary** → Displays copay details

The UI already displays extraction method in results page.

## Accuracy Metrics

Current implementation:

| Metric | Value |
|--------|-------|
| Patterns | 209 known patterns |
| Categories | 42 benefit types |
| Accuracy | 100% on sample (8/8 matched) |
| API Calls | 1 per document (Haiku) |
| Cost | ~$0.01-0.02 per document |

## Migration Path

Current carrier support:

- ✅ **EyeMed** - Pattern-based (209 patterns)
- ⏳ **VSP** - Pattern-based (in development)
- ⏳ **Spectera** - Pattern-based (future)
- 🔄 **Other** - Generic extraction (fallback)

## Troubleshooting

### No patterns matched

Check:
1. Is the document actually EyeMed?
2. Check file name contains "eyemed" or "eye-med"
3. Run pattern extraction test directly
4. Check console logs for Haiku response

### "Could not resolve authentication method"

Fix:
1. Ensure `ANTHROPIC_API_KEY` is in `.env.local`
2. Restart the development server

### "File not found" errors

Check:
1. PDF file exists at path
2. File was uploaded successfully
3. Path is accessible to Node.js process

## Performance

- **PDF Text Extraction**: ~1-2 seconds (PyPDF2)
- **Haiku Pattern Matching**: ~2-3 seconds
- **Normalization**: ~1-2 seconds
- **Total**: ~5-7 seconds per document

Tested on sample 3-page EyeMed PDF.

## Next Steps

1. **Test with more EyeMed samples** - Verify accuracy across different tiers/plans
2. **Build VSP pattern database** - Extract patterns from VSP documents
3. **Add Spectera support** - Similar pattern-based approach
4. **Performance tuning** - Optimize if needed
5. **Copay calculator validation** - Verify calculations against known copays

## Code Examples

### Standalone Pattern Matching

```typescript
import { extractEyeMedBenefitsWithPatterns } from '@/lib/services/ocr/eyemed-pattern-extraction'
import { EyeMedCopayCalculator } from '@/lib/services/ocr/eyemed-copay-calculator'

// Extract benefits
const result = await extractEyeMedBenefitsWithPatterns('path/to/pdf.pdf')

// Calculate copay
const copay = EyeMedCopayCalculator.calculate(393, result.benefits.progressive_tier_4)
console.log(`Patient pays: $${copay.patient_copay}`)
```

### Get Database Stats

```typescript
import { getEyeMedDatabaseStats } from '@/lib/services/ocr/eyemed-pattern-extraction'

const stats = getEyeMedDatabaseStats()
console.log(`Total patterns: ${stats.total_patterns}`)
console.log(`Total categories: ${stats.total_categories}`)
```

### Smart Dispatch

```typescript
import { dispatchExtraction } from '@/lib/services/ocr/extraction-dispatcher'

const result = await dispatchExtraction(filePath)

if (result.extractionType === 'eyemed-pattern-based') {
  console.log('Using EyeMed patterns')
  console.log(`Patterns matched: ${result.nativeExtraction?.stats?.total_patterns_matched}`)
} else {
  console.log('Using generic extraction')
}
```

## Questions?

- Check console logs for detailed extraction steps
- Review test scripts for examples
- Examine the 209 patterns in `src/lib/data/eyemed-verbatim-patterns.json`
