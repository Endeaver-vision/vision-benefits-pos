# Two-Prompt Insurance Extraction System - Implementation Guide

**Status**: ✅ COMPLETE
**Last Updated**: February 2026

---

## Overview

The vision-pos insurance document processing system now uses a two-prompt architecture that separates **raw extraction** from **normalization**, enabling accurate processing of multiple insurance carriers (EyeMed, VSP, Spectera) with a single unified pipeline.

---

## Architecture

### Phase 1: Raw Extraction (Prompt 1)
**File**: `/src/lib/services/ocr/prompt-1-raw-extraction.ts`

Reads the PDF document and extracts **exactly what is written** without interpretation:

```
Input: Insurance PDF document
Output: Raw benefit data with member info, benefit names (verbatim), values, and document structure
```

**Key Properties**:
- Extracts member information (name, ID, group, effective date)
- Lists all benefits with EXACT text as written
- Detects carrier using document markers (First American, VSP, Vision Service Plan, etc.)
- Sets carrier confidence (high/medium/low) based on marker count
- Preserves formulas intact (e.g., "$20 copay; 20% off less $120")
- Notes document structure (table format, frequency column, tier breakdown)

### Phase 2: Normalization (Prompt 2)
**File**: `/src/lib/services/ocr/prompt-2-normalization.ts`

Takes raw data and normalizes it using rosetta stones and business rules:

```
Input: Raw extraction + Rosetta stones + Business rules
Output: Normalized benefits with canonical names, product mappings, parsed formulas
```

**Key Properties**:
- Maps terminology to canonical benefit names
- Assigns product names (Varilux, Crizal, etc.)
- Parses formulas into structured components
- Applies business rules (age conditions, tier validation)
- Flags unmapped benefits
- Provides confidence scores per mapping

### Phase 3: Pricing Engine
**File**: `/src/lib/services/pricing-engine-vsp.ts`

Universal pricing function that implements the material-centric model:

```typescript
TOTAL_PRICE = BASE_PRICE + MATERIAL_SURCHARGE + TREATMENT_PRICE
```

Supports all lens types:
- **Single Vision**: Material price only
- **Bifocal**: Fixed $30 (plastic only)
- **Progressive**: Tier base + material surcharge + treatment

---

## Data Files

### Rosetta Stones
**EyeMed** (`/src/lib/data/rosetta-eyemed.json`):
- 48 insurance documents analyzed
- 11 benefit categories
- 100+ terminology variations
- Age-dependent rules (Polycarbonate, Photochromic)
- Tier-to-product mappings

**VSP** (`/src/lib/data/rosetta-vsp.json`):
- 93 insurance documents analyzed
- 5 plan types (Choice, Signature, Advantage, etc.)
- 80+ lens product codes
- WFA frame codes
- Material pricing codes

### Business Rules
**File** (`/src/lib/data/business-rules.json` - 944 lines, 29KB):

**VSP Section**:
- Progressive tiers: K ($55), J ($95), F ($105), N ($175), O ($150)
- Materials: Plastic, Polycarbonate ($35), High Index 1.60 ($47), 1.66 ($78), 1.71 ($125)
- Bifocal: Fixed $30 plastic only
- Treatments: Polarized (+$31), Digital Aspheric (+$10)
- WFA frame codes: $130-$370 range

**EyeMed Section**:
- Progressive tiers: Standard ($0-$135), Tier 1-4 ($30-$185 range)
- Age-dependent rules: Polycarbonate $0 under 19, $20-40 for 19+
- Frame allowances: $100-$450 range with branded partners
- AR coatings: 3-4 tier system
- Validation ranges for copay values

---

## API Routes

### POST `/api/documents/[id]/process`
Processes a document through both prompts.

**Request**:
```bash
POST /api/documents/123/process
```

**Response**:
```json
{
  "success": true,
  "documentId": "123",
  "ocrStatus": "completed",
  "carrier": "EyeMed",
  "carrierConfidence": "high",
  "rawExtraction": {
    "benefitsFound": 28,
    "memberInfo": { "name": "John Doe", "memberId": "EM123456" }
  },
  "normalization": {
    "successfulMappings": 27,
    "totalBenefits": 28,
    "unmappedCount": 1,
    "appliedRules": 3
  },
  "duration": "4200ms",
  "extractionMethod": "two-prompt-v1",
  "message": "Document processed successfully. Ready for verification."
}
```

**Database Storage**:
```json
{
  "extractedData": {
    "raw": { /* Prompt 1 output */ },
    "normalized": { /* Prompt 2 output */ }
  }
}
```

### POST `/api/documents/[id]/verify`
Creates InsuranceAuthorization from normalized data.

**Request**:
```bash
POST /api/documents/123/verify
{
  "verifiedBy": "admin@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "authorizationId": "auth-uuid",
  "carrier": "EYEMED",
  "planName": "EyeMed Plan ABC",
  "copays": {
    "examCopay": 10,
    "materialsCopay": 40,
    "frameAllowance": 150,
    "progressiveTier1": 75
  },
  "priceListCount": 480,
  "message": "Document verified and authorization created"
}
```

---

## Using the Pricing Engine

### Basic Usage

```typescript
import { calculateLensPrice } from '@/lib/services/pricing-engine-vsp'

// Single Vision
const sv = calculateLensPrice('singleVision', 'highIndex1_66')
// Returns: { price: 83, breakdown: { base: 0, material: 83, treatment: 0 } }

// Bifocal
const bf = calculateLensPrice('bifocal', 'plastic')
// Returns: { price: 30, breakdown: { base: 30, material: 0, treatment: 0 } }

// Progressive
const pg = calculateLensPrice('progressive', 'highIndex1_66', { tier: 'F' })
// Returns: { price: 183, breakdown: { base: 105, material: 78, treatment: 0 } }
```

### Material Selection

```typescript
import { getAvailableMaterials } from '@/lib/services/pricing-engine-vsp'

// What materials work for each lens type?
getAvailableMaterials('singleVision')
// Returns: ['plastic', 'polycarbonate', 'highIndex1_60', 'highIndex1_66', 'highIndex1_71']

getAvailableMaterials('bifocal')
// Returns: ['plastic']

getAvailableMaterials('progressive')
// Returns: ['plastic', 'polycarbonate', 'highIndex1_60', 'highIndex1_66', 'highIndex1_71']
```

### Progressive Pricing Matrix

```typescript
import { getProgressivePricingMatrix } from '@/lib/services/pricing-engine-vsp'

const matrix = getProgressivePricingMatrix('highIndex1_66')
// Returns:
// {
//   K: { tier: 'Standard Progressive', basePrice: 55, totalPrice: 133 },
//   J: { tier: 'Mid-Grade Progressive', basePrice: 95, totalPrice: 173 },
//   F: { tier: 'Premium Progressive', basePrice: 105, totalPrice: 183 },
//   N: { tier: 'Professional Progressive', basePrice: 175, totalPrice: 253 },
//   O: { tier: 'Ultra-Premium Progressive', basePrice: 150, totalPrice: 228 }
// }
```

---

## Testing

### Run Pricing Engine Tests

```bash
npx tsx scripts/test-pricing-engine.ts
```

Tests all combinations:
- 5 Single Vision materials
- Bifocal edge cases
- 5 materials × 5 progressive tiers (25 combinations)
- Error handling

### Process Real Documents

```bash
# Get document ID
curl http://localhost:3000/api/documents

# Process document
curl -X POST http://localhost:3000/api/documents/[id]/process

# Verify after processing
curl -X POST http://localhost:3000/api/documents/[id]/verify \
  -H "Content-Type: application/json" \
  -d '{"verifiedBy": "admin"}'
```

---

## Key Design Principles

### 1. Separation of Concerns
- **Prompt 1**: Vision/reading task (extract what's written)
- **Prompt 2**: Mapping/normalization task (apply rules)
- **Engine**: Calculation task (apply pricing formula)

### 2. Carrier Flexibility
- Add new carrier: Just add rosetta stone JSON
- No prompt surgery required
- Supports unlimited carriers

### 3. Debuggability
- Raw extraction visible in database
- Can re-run normalization without re-reading PDF
- Can test rosetta stone changes independently
- Pricing breakdown shows all components

### 4. Data-Driven
- Rosetta stones are data files (not hardcoded)
- Business rules are centralized in JSON
- Terminology updates don't touch code

### 5. Material-Centric Pricing
- Once material is selected, pricing is automatic
- Material surcharges are uniform across progressive tiers
- No special cases needed
- Easy to understand and maintain

---

## File Structure

```
/src/lib/
├── data/
│   ├── rosetta-eyemed.json          ← EyeMed terminology mappings
│   ├── rosetta-vsp.json              ← VSP terminology mappings
│   └── business-rules.json           ← All pricing and business logic
├── services/
│   ├── ocr/
│   │   ├── prompt-1-raw-extraction.ts
│   │   ├── prompt-2-normalization.ts
│   │   ├── haiku-extraction.ts (legacy)
│   │   └── index.ts
│   ├── pricing-engine-vsp.ts
│   └── price-list-precompute.ts
└── prisma.ts

/src/app/api/
├── documents/
│   ├── [id]/
│   │   ├── process/
│   │   │   └── route.ts (updated for two-prompt)
│   │   └── verify/
│   │       └── route.ts (updated for normalized data)
│   ├── route.ts
│   └── upload/
│       └── route.ts

/docs/insurance-analysis/
├── README.md
├── IMPLEMENTATION_GUIDE.md (this file)
├── eyemed/
│   └── terminology-mapping.md
├── vsp/
│   ├── 01-material-pricing.md
│   └── 02-lens-types-pricing.md
└── patterns/
    └── 01-unified-pricing-pattern.md

/scripts/
└── test-pricing-engine.ts
```

---

## Migration from Legacy System

The two-prompt system is **backwards compatible** with legacy Haiku extraction data.

### Automatic Fallback
If `extractedData` doesn't have `{ raw, normalized }` structure:
1. Verify route detects legacy format
2. Uses legacy extraction helper functions
3. Creates authorization as before
4. No data loss

### To Migrate Existing Documents
1. Run processing route again on old documents
2. Two-prompt system will process them correctly
3. Database will update with both raw and normalized data

---

## Troubleshooting

### Document fails to process
**Check**:
- File exists at `document.filePath`
- File is PDF or image
- Anthropic API key set

**Debug**:
```bash
curl http://localhost:3000/api/documents/[id]/process | jq .
```

### Unmapped benefits
**Check**:
- Rosetta stone has terminology variations
- Benefit name matches one of variations (case-insensitive)
- Carrier was correctly detected

**Add new variation**:
Edit rosetta stone JSON file and re-run normalization.

### Incorrect copay extraction
**Check**:
- Raw extraction captured benefit value correctly
- Normalized mapping found canonical name
- Value parsing handled formatting correctly

**Debug**:
```bash
# Check raw extraction
curl http://localhost:3000/api/documents/[id] | jq .extractedData.raw.benefits

# Check normalization
curl http://localhost:3000/api/documents/[id] | jq .extractedData.normalized.normalizedBenefits
```

---

## Future Enhancements

1. **EyeMed Pricing Engine**: Create equivalent material-centric model for EyeMed copay ranges
2. **Spectera Support**: Add Spectera rosetta stone and pricing rules
3. **Real-Time Updates**: Webhook to update rosetta stones when insurance changes
4. **Advanced Matching**: Use embeddings to improve terminology matching confidence
5. **Formula Solver**: Automatic calculation of formula-based benefits
6. **PDF Parsing**: Extract benefit tables directly from PDF structure

---

## Reference

- **Pricing Pattern**: See `/docs/insurance-analysis/patterns/01-unified-pricing-pattern.md`
- **VSP Pricing**: See `/docs/insurance-analysis/vsp/02-lens-types-pricing.md`
- **EyeMed Terminology**: See `/docs/insurance-analysis/eyemed/terminology-mapping.md`
- **Business Rules**: See `/src/lib/data/business-rules.json`

