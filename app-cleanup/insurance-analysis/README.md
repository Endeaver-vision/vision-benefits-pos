# Insurance Analysis & Pricing Documentation

**Complete**: Two-prompt extraction system implemented and verified
**Carriers**: EyeMed (48 docs), VSP (93 docs)
**Last Updated**: February 2026

---

## Quick Navigation

### 🚀 Getting Started
Start here: **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)**
- How to use the two-prompt system
- API routes and examples
- Pricing engine usage
- Testing and troubleshooting

### 📊 Pricing & Terminology Reference
All technical details: **[PRICING_AND_TERMINOLOGY_REFERENCE.md](./PRICING_AND_TERMINOLOGY_REFERENCE.md)**
- VSP material pricing and lens types
- EyeMed benefit terminology variations
- Complete pricing tables and matrices
- Material availability and combinations

---

## System Overview

The vision-pos insurance system uses a **two-prompt architecture**:

```
PDF Document
    ↓
[PROMPT 1: Raw Extraction]
Extract verbatim with carrier detection
    ↓
[PROMPT 2: Normalization]
Map to canonical names using rosetta stones
    ↓
[Database Storage]
Both raw and normalized data preserved
    ↓
[Pricing Engine]
Universal material-centric pricing formula
```

---

## Key Files

### Services
- `/src/lib/services/ocr/prompt-1-raw-extraction.ts` - Raw document reading
- `/src/lib/services/ocr/prompt-2-normalization.ts` - Terminology mapping
- `/src/lib/services/pricing-engine-vsp.ts` - Universal pricing calculations

### Data
- `/src/lib/data/rosetta-eyemed.json` - EyeMed terminology mappings (23KB)
- `/src/lib/data/rosetta-vsp.json` - VSP terminology mappings (13KB)
- `/src/lib/data/business-rules.json` - Pricing rules and validation (29KB)

### Routes
- `POST /api/documents/[id]/process` - Run two-prompt extraction
- `POST /api/documents/[id]/verify` - Create insurance authorization

---

## Pricing Model

### VSP (Fixed Pricing)
```
Single Vision:  PRICE = MATERIAL_PRICE
Bifocal:        PRICE = $30 (plastic only)
Progressive:    PRICE = TIER_BASE + MATERIAL_SURCHARGE
```

**Material Surcharges (Uniform across all tiers):**
- Plastic: $0
- Polycarbonate: $35
- High Index 1.60: +$47
- High Index 1.66: +$78
- High Index 1.71: +$125

### EyeMed (Copay Ranges)
- Uses copay ranges instead of fixed prices
- Age-dependent rules (Polycarbonate, Photochromic)
- Complex benefit tiers (Standard, Tier 1-4)
- Formula-based pricing for some tiers

---

## Testing

Run the pricing engine tests:
```bash
npx tsx scripts/test-pricing-engine.ts
```

Tests all combinations:
- 5 Single Vision materials
- Bifocal edge cases
- 25 Progressive tier + material combinations
- Pricing matrix generation
- Error handling

---

## Data Coverage

**141 Insurance Documents Analyzed**

| Carrier | Documents | Coverage |
|---------|-----------|----------|
| EyeMed | 48 | 11 benefit categories, 100+ terminology variations |
| VSP | 93 | 5 plan types, 80+ product codes, all pricing matrices |

**Key Extractions:**
- ✅ 23KB rosetta stone (EyeMed): All terminology variations from 48 documents
- ✅ 13KB rosetta stone (VSP): All product codes and plan structures from 93 documents
- ✅ 29KB business rules: Complete pricing data and validation rules
- ✅ Universal pricing engine: Material-centric model works for all lens types

---

## Architecture Principles

1. **Separation of Concerns**: Extract (vision task) → Normalize (mapping task) → Calculate (pricing task)
2. **Carrier Flexibility**: Add new carrier by adding rosetta stone JSON (no code changes)
3. **Data-Driven**: All pricing and terminology in JSON files (not hardcoded)
4. **Debuggable**: Both raw and normalized data visible in database
5. **Material-Centric**: Once material selected, pricing is automatic for all lens types

---

## For Developers

### Using the Pricing Engine
```typescript
import { calculateLensPrice } from '@/lib/services/pricing-engine-vsp'

// Single Vision
calculateLensPrice('singleVision', 'highIndex1_66')
// → { price: 83, breakdown: { base: 0, material: 83, treatment: 0 } }

// Progressive
calculateLensPrice('progressive', 'highIndex1_66', { tier: 'F' })
// → { price: 183, breakdown: { base: 105, material: 78, treatment: 0 } }
```

### Processing Documents
```bash
# Process document through both prompts
curl -X POST http://localhost:3000/api/documents/[id]/process

# Create authorization from normalized data
curl -X POST http://localhost:3000/api/documents/[id]/verify
```

---

## Questions?

See **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** for:
- API examples
- Data structure details
- Migration from legacy system
- Troubleshooting
- Future enhancements
