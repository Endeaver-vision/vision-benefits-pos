# Vision POS Build Plan

**Last Updated**: 2026-01-28
**Architecture**: See `vision-pos-architecture.pdf` and `vision-pos-diagram-v5.jsx`
**Current Focus**: Stage 5.5 - Insurance Verification Gate (Quote Builder entry point)

---

## System Overview

Vision POS is a quote flow and point-of-sale system for optical practices. The system follows a **sequential data flow** to generate accurate patient quotes based on insurance benefits and product catalog.

### 8 Components:

1. **Products & Inventory** (Blue) - DATABASE
2. **Insurance Mapping** (Indigo) - **FILE** (TypeScript mapping file, not database)
3. **Insurance Scanner** (Purple) - Processing + DATABASE (unified authorizations table)
4. **Patient Profile** (Emerald) - DATABASE
5. **Patient Price List** (Teal) - DATABASE
6. **Quote Generation** (Amber) - DATABASE
7. **Order Tracking** (Rose) - DATABASE
8. **Analytics** (Cyan) - DATABASE

---

## Primary Flow (Critical Path)

```
Products → Insurance Mapping → Scanner → Patient Profile → Price List → Quote → Order Tracking → Analytics
```

Each stage must be functional before proceeding to the next.

---

## Stage 1: Products & Inventory

### Functionality Goal
Complete product catalog with cash prices for all products.

### Product Categories (7 Tables):
1. **LensProduct** - Progressive, Single Vision, Bifocals, AR Coatings, Enhancements
2. **LensMaterial** - Polycarbonate, Trivex, High Index (always separate from lens)
3. **Frame** - All frame inventory with stock tracking
4. **ContactLens** - With annualSupplyThreshold field
5. **DryEyeProduct** - Drops, masks, wipes, devices
6. **Nutraceutical** - Vitamins, supplements
7. **Service** - Exams, fittings, adjustments

### Must Have (ALL Products):
- SKU (unique)
- Name
- Brand
- Cash Price (never NULL, never $0)
- Status (Active/Inactive)
- Aliases (JSON array for search)

### UI Verification: /admin/products
**Route**: `/admin/products` or `/products`
**Purpose**: Visual verification of product catalog completeness

**Display Requirements**:
- Total product count by category
- Products missing required fields (highlighted in red)
- Cash price validation (show any $0 or NULL)
- Active/Inactive status filter
- Search and filter by category

### Decision Point: STAGE 1 COMPLETE
**Test**: Query each product table for missing required fields
```sql
SELECT COUNT(*) FROM LensProduct WHERE cashPrice IS NULL OR sku IS NULL OR name IS NULL;
SELECT COUNT(*) FROM LensMaterial WHERE cashPrice IS NULL OR sku IS NULL OR name IS NULL;
SELECT COUNT(*) FROM Frame WHERE cashPrice IS NULL OR sku IS NULL OR name IS NULL;
SELECT COUNT(*) FROM ContactLens WHERE cashPrice IS NULL OR sku IS NULL OR annualSupplyThreshold IS NULL;
SELECT COUNT(*) FROM DryEyeProduct WHERE cashPrice IS NULL OR sku IS NULL OR name IS NULL;
SELECT COUNT(*) FROM Nutraceutical WHERE cashPrice IS NULL OR sku IS NULL OR name IS NULL;
SELECT COUNT(*) FROM Service WHERE cashPrice IS NULL OR sku IS NULL OR name IS NULL;
```
**Result**: All queries return 0
**UI Check**: Navigate to /admin/products → All categories show green checkmarks
**Action**: If PASS → Proceed to Stage 2. If FAIL → Fix product data.

---

## Stage 2: Insurance Mapping ✅ COMPLETE

**Status**: TypeScript mapping file implemented (2026-01-15)
**Architecture**: Single source of truth in `src/lib/data/insurance-tier-mappings.ts`

### Functionality Goal
Map products to insurance tier codes, and tier codes to copay field names in authorization JSON. **No database lookups during pricing** - all mappings are compile-time constants.

---

### Architecture: TypeScript Mapping File

```
PRICE GENERATION FLOW:
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│ INSURANCE-TIER-     │      │  PATIENT AUTH       │      │ PATIENT_PRICE_LIST  │
│ MAPPINGS.TS (FILE)  │  +   │  (unified table)    │  =   │ (personalized)      │
├─────────────────────┤      ├─────────────────────┤      ├─────────────────────┤
│ PRODUCT_TIERS:      │      │ copays JSON:        │      │ John Smith          │
│  "Varilux X":       │      │ {                   │      │ ─────────────────── │
│    eyemed: "tier_3" │      │   progressiveTier3: │      │ Varilux X: $110     │
│                     │      │     110,            │      │ Crizal Rock: $68    │
│ EYEMED_TIER_TO_     │      │   arTier2: 68,      │      │ Polycarbonate: $40  │
│ COPAY:              │      │   polycarbonate: 40,│      │ Trivex: $68 (80%)   │
│  "tier_3" →         │      │   allOtherLens      │      │                     │
│    "progressiveTier3│      │     Options:        │      │                     │
│                     │      │     "DISCOUNT_20"   │      │                     │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
        │                              │                           │
        │  PRECOMPUTE SERVICE          │                           │
        └──────────────►───────────────┘                           │
                              │                                    │
                              └────────────► GENERATES ───────────┘
```

**Key Principle**: Tier mappings in TypeScript file + copays in authorization JSON → patient price list. No database queries for tier lookups.

---

### File Structure

**Location**: `src/lib/data/insurance-tier-mappings.ts`

```typescript
// 1. PRODUCT_TIERS - Maps products to tier codes per carrier
export const PRODUCT_TIERS: Record<string, ProductTierMap> = {
  "Varilux Comfort DRx": {
    vsp: "JA",        // VSP tier code
    eyemed: "tier_3", // EyeMed tier code
    spectera: "III"   // Spectera tier code
  },
  "Polycarbonate": {
    vsp: "AD",
    eyemed: "polycarbonate",
    spectera: "polycarbonate"
  },
  // null = not covered (cash only)
  "Neurolens SV": { vsp: null, eyemed: null, spectera: null },
  // ... 40+ products
};

// 2. TIER_TO_COPAY - Maps tier codes to copay field names
export const EYEMED_TIER_TO_COPAY: CopayFieldMap = {
  "tier_3": "progressiveTier3",     // Look up copays.progressiveTier3
  "ar_tier_3": "DISCOUNT_20_PERCENT", // Special: 20% off retail
  "polycarbonate": "polycarbonate", // Look up copays.polycarbonate
  // ...
};

export const VSP_TIER_TO_COPAY: CopayFieldMap = { /* ... */ };
export const SPECTERA_TIER_TO_COPAY: CopayFieldMap = { /* ... */ };
```

---

### Pricing Methods Explained

| Method | Meaning | When Used |
|--------|---------|-----------|
| `by_tier` | Patient pays copay from authorization JSON | Product has explicit copay value |
| `ins_discount` | Patient pays (100 - X)% of retail | Authorization has "DISCOUNT_XX" string |
| `cash_only` | Patient pays full retail | Product tier is null (not covered) |
| `uc_discount` | 80% fallback (DATA QUALITY ISSUE) | Should be rare - indicates missing data |

**IMPORTANT**: `uc_discount` indicates extraction or mapping issues. A well-functioning system should have ZERO `uc_discount` products.

---

### Special Values in Authorization copays JSON

The GPT extraction stores copays as numbers OR discount strings:

```json
{
  "examCopay": 10,
  "progressiveTier3": 110,
  "arTier3": "DISCOUNT_20",    // String! Patient pays 80% retail
  "allOtherLensOptions": "DISCOUNT_20"  // EyeMed catch-all
}
```

The precompute service handles both:
- Number → use directly as copay
- "DISCOUNT_XX" → calculate (100 - XX)% of retail price

---

### Product Categories (41 products mapped)

**Single Vision**: 5 products (3 covered, 2 cash-only)
**Bifocals**: 2 products (covered)
**Progressives**: 6 products (3 covered, 3 cash-only)
**Materials**: 5 products (4 covered, 1 cash-only)
**AR Coatings**: 7 products (5 covered, 2 cash-only)
**Photochromic**: 2 products (covered)
**Addons**: 11 products (8 covered, 3 cash-only)
**Mount Fees**: 3 products (covered)

---

### Consumer: Price List Precompute Service

**Location**: `src/lib/services/price-list-precompute.ts`

The precompute service:
1. Gets product's tier code from `PRODUCT_TIERS`
2. Maps tier code to copay field via `EYEMED_TIER_TO_COPAY` (etc)
3. Looks up value in authorization's `copays` JSON
4. Handles DISCOUNT_XX strings and allOtherLensOptions fallback
5. Saves to `patient_price_lists` table

```typescript
// Simplified flow
const tierCode = PRODUCT_TIERS[product.name]?.eyemed; // "tier_3"
const copayField = EYEMED_TIER_TO_COPAY[tierCode];    // "progressiveTier3"
const copayValue = auth.copays[copayField];           // 110 or "DISCOUNT_20"

if (typeof copayValue === 'number') {
  finalPrice = copayValue;
  pricingMethod = 'by_tier';
} else if (copayValue?.startsWith('DISCOUNT_')) {
  const percent = parseInt(copayValue.replace('DISCOUNT_', ''));
  finalPrice = retailPrice * (100 - percent) / 100;
  pricingMethod = 'ins_discount';
}
```

---

### Decision Point: STAGE 2 COMPLETE ✅

**Test 1**: TypeScript mapping file compiles without errors
```bash
npx tsc --noEmit src/lib/data/insurance-tier-mappings.ts
```
**Result**: No errors

**Test 2**: All everyday products have tier mappings
```typescript
const products = Object.keys(PRODUCT_TIERS);
console.log(`${products.length} products mapped`); // 41 products
```
**Result**: 41 products mapped

**Test 3**: Tier-to-copay mappings exist for all 3 carriers
```typescript
Object.keys(EYEMED_TIER_TO_COPAY).length  // 20+ mappings
Object.keys(VSP_TIER_TO_COPAY).length     // 20+ mappings
Object.keys(SPECTERA_TIER_TO_COPAY).length // 15+ mappings
```
**Result**: All carriers have complete mappings

**Action**: ✅ COMPLETE → Proceed to Stage 3

---

## Stage 3: Insurance Scanner + Price List Generation ✅ EYEMED COMPLETE

**Status**: EyeMed fully working (2026-01-15), VSP/Spectera not yet tested
**Test Patients**: 5 EyeMed patients available for UI verification (see below)

### Functionality Goal
Extract benefit data from insurance documents AND generate complete patient price list with validation.

### Implementation Status:

**Backend Pipeline** ✅ COMPLETE
- Document upload → `/api/documents/upload` route
- OCR processing → GPT-4o Vision (single call for OCR + extraction)
- GPT-4o extraction → `src/lib/services/ocr/gpt-extraction.ts`
- Authorization creation → unified `insurance_authorizations` table (JSON copays)
- Price precomputation → `src/lib/services/price-list-precompute.ts`
- Patient price list storage → `patient_price_lists` table

**EyeMed Extraction** ✅ VERIFIED WORKING (2026-01-15)
- Copays extracted correctly (including `allOtherLensOptions: "DISCOUNT_20"`)
- Authorization copays JSON populated with all values
- Price precomputation uses `ins_discount` method (NOT `uc_discount` fallback)
- ZERO products falling back to 80% U&C discount

**Key Fix (2026-01-15)**: Updated `/api/documents/[id]/verify/route.ts` to:
- Handle DISCOUNT_XX strings (e.g., "DISCOUNT_20", "DISCOUNT_30")
- Extract `allOtherLensOptions` field from GPT extraction
- Store both numbers AND discount strings in copays JSON

**Scanner UI** ✅ COMPLETE
- Customer selection flow → `/scanner` page
- Multi-document upload
- Real-time processing status
- Extracted benefits display
- Auto-verification trigger

**Admin Review Queue** ✅ COMPLETE
- Pending documents queue → `/admin/scanner` page
- Extraction validation checkpoints (4 checks)
- Price list generation summary
- Verify & Generate Prices action

**Files Updated (2026-01-15):**
- `src/app/api/documents/[id]/verify/route.ts` - Fixed DISCOUNT_XX handling, added allOtherLensOptions
- `src/lib/services/price-list-precompute.ts` - Uses TypeScript mappings, handles ins_discount

---

### Test Patients for UI Verification (EyeMed)

| Customer | Document | Customer ID |
|----------|----------|-------------|
| Marcell Bailey Ebdrup | SS_eyemed.pdf | cust_93800643 |
| Jacquelyn Burke | AP_eyemed.pdf | cust_134599062 |
| Christopher Irvine | GB_eyemed.pdf | cust_123160600 |
| Priscila Pinto | eyemed2025-cs.pdf | cust_132371817 |
| Juan Abadia | ER-eyemed.pdf | cust_99896041 |
| Daniel Dasilveira | DD-INS.pdf | cminudpyls7ymp5h5ta |

**How to verify in UI:**
1. Go to `/customers/[customerId]?tab=price-plan`
2. Check "Insurance & Pricing" tab
3. Verify products show:
   - `by_tier` for products with explicit copays
   - `ins_discount` for products using allOtherLensOptions
   - `cash_only` for uncovered products
   - **NO** `uc_discount` (if you see this, there's a bug)

---

### Process Flow:
1. **Upload** → Insurance document (PDF/image)
2. **Extract** → GPT-4o extracts benefit data (including DISCOUNT_XX strings)
3. **Store** → Save to unified `insurance_authorizations` table (JSON copays)
4. **Generate** → Build patient price list using TypeScript tier mappings
5. **Validate** → Automated checks (pricing method distribution)
6. **Review** → Human visual inspection in customer profile

### Extraction Data Points:
- Member ID, Group Number, Plan Name
- Exam Copay, Materials Copay, Frame Allowance
- Progressive lens copays (Standard, Tier 1-5)
- Material copays (Polycarbonate adult/child, Trivex, High Index)
- Enhancement copays (Photochromic, Polarized, AR Coatings, Tint, Blue Light Filter)
- **allOtherLensOptions** - EyeMed catch-all (typically "DISCOUNT_20")

### Automated Redundancy Checkpoints:

**Checkpoint 1: Copays JSON Populated**
```sql
-- Verify authorization has copays JSON with values
SELECT
  id,
  carrier,
  copays->>'progressiveTier3' as prog_tier3,
  copays->>'allOtherLensOptions' as all_other
FROM insurance_authorizations
WHERE customer_id = '[customer_id]' AND is_active = true;
```
**Result**: copays JSON has expected fields (numbers or "DISCOUNT_XX" strings)

**Checkpoint 2: Price List Generated**
```sql
-- Verify price list has entries
SELECT COUNT(*) as total_products
FROM patient_price_lists
WHERE customer_id = '[customer_id]' AND active = true;
```
**Result**: total_products > 0 (should be ~41 for lens products)

**Checkpoint 3: Pricing Method Distribution (THE KEY TEST)**
```sql
-- Verify NO products using uc_discount (bad fallback)
SELECT
  pricing_method,
  COUNT(*) as count
FROM patient_price_lists
WHERE customer_id = '[customer_id]' AND active = true
GROUP BY pricing_method
ORDER BY count DESC;
```
**Expected Result**:
| pricing_method | count | meaning |
|---------------|-------|---------|
| `by_tier` | 17 | Products with explicit copay |
| `ins_discount` | 13 | Products using DISCOUNT_XX |
| `cash_only` | 11 | Products not covered |
| `uc_discount` | **0** | ⚠️ If > 0, there's a bug! |

**CRITICAL**: `uc_discount` count MUST be 0. If you see `uc_discount` products, the extraction or mapping is broken.

### Human Visual Inspection UI:

**Section 1: Extracted Benefits**
```
✓ Exam Copay: $10
✓ Frame Allowance: $150
✓ Progressive Tier 1: $105
✓ Progressive Tier 2: $115
⚠ Progressive Tier 3: NOT FOUND (will use 80% retail)
✓ Polycarbonate: $40
✓ Photochromic: $75
```

**Section 2: Price List Summary**
```
Generated 250 product prices:
✓ 185 products: Tier-based pricing (74%)
⚠ 65 products: 80% retail fallback (26%)

Common Products Preview:
✓ Varilux X-Series → $115 (Tier 2)
✓ Crizal Sapphire → $85 (Premium AR)
⚠ Zeiss DriveSafe → $96 (80% retail - no tier mapping)
```

**Section 3: Action Buttons**
- [Approve & Save] - Proceed to patient profile
- [Edit Copays] - Manually adjust extracted values
- [Rescan Document] - Start over
- [Flag for Review] - Save but mark for later verification

### Decision Point: STAGE 3 STATUS

**EyeMed** ✅ COMPLETE (2026-01-15)
- All 3 checkpoints PASS
- 0 products with `uc_discount`
- Test patients verified (see table above)

**VSP** 🔄 IN PROGRESS - Two-Document Handling
- GPT extraction schema updated for two-document flow
- Tier mappings exist in TypeScript file
- Test documents available (57 files in Test Documents/Insurance Auths/VSP/)
- See **Stage 3.1: VSP Two-Document Authorization** below

**Spectera** ⏳ NOT YET TESTED
- GPT extraction schema may need updates
- Tier mappings exist in TypeScript file
- Needs test documents

**Action**: EyeMed ready for production use. VSP two-document handling in progress.

---

## Stage 3.1: VSP Two-Document Authorization ✅ COMPLETE

**Status**: Implementation complete (2026-01-21)
**Challenge**: VSP requires TWO separate documents that must be paired and merged
**Solution**: Implemented two-document pairing with Auth# as linking key

### VSP Document Structure

VSP authorizations consist of TWO document types that must be processed together:

#### Document Type 1: VSP PATIENT RECORD REPORT (Auth Document)
**Identifier**: Contains "VSP PATIENT RECORD REPORT" or "VSP.com" header
**Content**:
- **Auth Number** (KEY FOR PAIRING) - e.g., "82317089"
- Patient/Member Info: Name, DOB, Member ID, Group
- Exam Benefits: Exam copay, WellVision Exam details
- Frame Benefits: WFA (Wholesale Frame Allowance) codes, Featured/Non-Featured amounts
- Contact Lens: Materials allowance, fitting coverage
- Eligibility: Valid from/to dates
- EasyOptions: Upgrade features if applicable

**Sample Extracted Fields**:
```json
{
  "authNumber": "82317089",
  "memberName": "John Smith",
  "memberId": "123456789",
  "examCopay": 10,
  "frameAllowanceFeatured": 200,
  "frameAllowanceNonFeatured": 120,
  "contactAllowance": 150,
  "eligibleFrom": "01/01/2026",
  "eligibleTo": "12/31/2026",
  "easyOptions": {
    "frameUpgrade": true,
    "clUpgrade": false,
    "progressiveCovered": true,
    "arCovered": true,
    "photochromicCovered": true
  }
}
```

#### Document Type 2: VSP Lens Enhancement Charges (Lens Document)
**Identifier**: Contains "VSP Lens Enhancement Charges" or table of two-letter codes
**Content**:
- **Auth Number** (same as Document 1 - used for pairing)
- Patient Name (confirmation)
- Two-letter code table with Single Vision and Multifocal costs

**Sample Layout**:
```
Auth# 82317089                    SMITH, JOHN

Code  Description                Single    Multi
──────────────────────────────────────────────────
KA    Standard Progressive        N/A       $0
FA    Premium Progressive F       N/A       $75
JA    Premium Progressive J       N/A       $95
NA    Custom Progressive          N/A       $175
QM    AR Coating Tier A           $0        $0
QT    AR Coating Tier C           $35       $35
QV    AR Coating Tier D           $65       $65
AD    Polycarbonate               $35       $35
AB    Hi-Index 1.60               $60       $60
AH    Hi-Index 1.67               $80       $80
PR    Photochromic (plastic)      $82       $82
PM    Photochromic (glass)        $25       $25
DA    Polarized                   $75       $75
UV    UV Protection               $0        $0
```

---

### VSP Two-Letter Code Mapping

| Code | Category | Description | Maps To |
|------|----------|-------------|---------|
| **Progressives** |
| KA/KE | Progressive | Standard Progressive | progressiveStandard |
| FA/FE | Progressive | Premium F (Varilux Comfort) | progressiveTier1 |
| JA/JE | Progressive | Premium J (Varilux Physio) | progressiveTier2 |
| NA | Progressive | Custom (Varilux X) | progressiveTier3 |
| OA | Progressive | Ultra Custom | progressiveTier4 |
| **AR Coatings** |
| QM | AR Coating | Tier A (Basic) | arStandard |
| QT | AR Coating | Tier C (Mid) | arTier1 |
| QV | AR Coating | Tier D (Premium) | arTier2 |
| **Materials** |
| AD | Material | Polycarbonate | polycarbonate |
| AB | Material | Hi-Index 1.60 | highIndex160 |
| AH | Material | Hi-Index 1.67 | highIndex167 |
| AJ | Material | Hi-Index 1.74 | highIndex174 |
| **Photochromic** |
| PR | Photochromic | Transitions (plastic) | photochromic |
| PM | Photochromic | Photochromic (glass) | photochromicGlass |
| **Other** |
| DA/DE | Polarized | Polarized lenses | polarized |
| UV | Treatment | UV Protection | uvTreatment |
| TN | Tint | Solid tint | tint |
| GR | Tint | Gradient tint | tintGradient |

---

### Pairing Strategy

**Auth# is the linking key** - Both documents contain the same Auth# that must match.

```
┌─────────────────────────┐     ┌─────────────────────────┐
│ PATIENT RECORD REPORT   │     │ LENS ENHANCEMENT CHARGES│
│ Auth# 82317089          │     │ Auth# 82317089          │
│ ───────────────────     │     │ ───────────────────     │
│ Patient info            │     │ Two-letter codes        │
│ Frame allowances        │     │ Single/Multi costs      │
│ CL allowance            │     │                         │
│ Eligibility dates       │     │                         │
└───────────┬─────────────┘     └───────────┬─────────────┘
            │                               │
            └───────────────┬───────────────┘
                            ▼
              ┌─────────────────────────────┐
              │ MERGED VSP AUTHORIZATION     │
              │ ─────────────────────────── │
              │ Auth#: 82317089             │
              │ Patient: John Smith         │
              │ Exam Copay: $10             │
              │ Frame Allowance: $200       │
              │ Progressive KA: $0 (Multi)  │
              │ Progressive FA: $75 (Multi) │
              │ AR QM: $0                   │
              │ AR QT: $35                  │
              │ Poly AD: $35                │
              │ Photochromic PR: $82        │
              └─────────────────────────────┘
```

---

### Implementation Plan

#### Step 1: Document Type Detection ✅
Update GPT extraction to identify document type:
- `vsp-auth`: Contains "VSP PATIENT RECORD REPORT" or member eligibility
- `vsp-lens`: Contains two-letter code table

**Location**: `src/lib/services/ocr/gpt-extraction.ts`

#### Step 2: Auth# Extraction ✅
Extract Auth# from both document types for pairing:
- Auth document: Usually in header or near patient info
- Lens document: Usually in top-left corner

**Extraction Pattern**:
```typescript
authNumber: string // 8-digit number, e.g., "82317089"
```

#### Step 3: Document Pairing Logic ✅
When uploading VSP documents:
1. First document uploaded → Create pending authorization with partial data
2. Check if matching Auth# exists in pending state
3. If match found → Merge data from both documents
4. If no match → Hold as pending, wait for paired document

**Database Fields**:
```sql
-- Added to insurance_authorizations
vsp_auth_number VARCHAR(20),     -- The Auth# for pairing
vsp_document_type VARCHAR(20),   -- 'auth' or 'lens' or 'complete'
vsp_pending_pair BOOLEAN,        -- Waiting for second document
```

#### Step 4: Merged Copays JSON Structure ✅
After pairing, the copays JSON contains:

```json
{
  // From Auth Document
  "examCopay": 10,
  "frameAllowanceFeatured": 200,
  "frameAllowanceNonFeatured": 120,
  "contactAllowance": 150,

  // From Lens Document (two-letter codes with values)
  "KA": 0,          // Standard Progressive (Multi)
  "FA": 75,         // Premium Progressive F (Multi)
  "JA": 95,         // Premium Progressive J (Multi)
  "NA": 175,        // Custom Progressive (Multi)
  "QM": 0,          // AR Tier A
  "QT": 35,         // AR Tier C
  "QV": 65,         // AR Tier D
  "AD": 35,         // Polycarbonate
  "AB": 60,         // Hi-Index 1.60
  "AH": 80,         // Hi-Index 1.67
  "PR": 82,         // Photochromic Transitions
  "DA": 75,         // Polarized
  "UV": 0,          // UV Protection

  // EasyOptions flags
  "easyOptionsFrameUpgrade": true,
  "easyOptionsProgressiveCovered": true,
  "easyOptionsARCovered": true,
  "easyOptionsPhotochromicCovered": true
}
```

#### Step 5: Price List Generation ✅
Use VSP_TIER_TO_COPAY mapping to convert two-letter codes to price list:

```typescript
// In insurance-tier-mappings.ts
export const VSP_TIER_TO_COPAY: Record<string, string> = {
  "KA": "KA",   // Maps directly to copays.KA
  "FA": "FA",   // Maps directly to copays.FA
  "JA": "JA",   // etc.
  "NA": "NA",
  "QM": "QM",
  "QT": "QT",
  "QV": "QV",
  "AD": "AD",
  "AB": "AB",
  "AH": "AH",
  "PR": "PR",
  "DA": "DA",
  "UV": "UV",
}
```

---

### EasyOptions Handling

Some VSP plans include "EasyOptions" which provide additional covered upgrades:

| EasyOption | Effect |
|------------|--------|
| Frame Upgrade | Higher frame allowance |
| CL Upgrade | Higher contact lens allowance |
| Progressive Covered | Standard progressive at $0 |
| AR Covered | Basic AR coating at $0 |
| Photochromic Covered | Transitions at $0 |

**When EasyOptions are present**:
- Override the lens document copay with $0 for covered items
- Display "EasyOptions" badge in UI

---

### Either/Or Restriction (VSP-Specific)

VSP always has materials exclusivity:
- **"Contacts are instead of [lens, frame]"**
- Patient must choose: Eyeglasses OR Contact Lenses for the benefit year
- If contacts selected, eyeglasses priced at retail

This is handled by the `eitherOrRestriction` field (already implemented in declining balance work).

---

### Test Documents Available

**Location**: `/Users/cmac/let/vision-pos/Test Documents/Insurance Auths/VSP/`
**Count**: 57 files (paired auth + lens documents)

**Sample Pairs**:
| Auth Document | Lens Document | Auth# |
|---------------|---------------|-------|
| AB-vsp-auth-1.pdf | AB-vsp-lens-1.pdf | To extract |
| TR_Auth-VSP.pdf | TR_Lens-Enhancement-VSP.pdf | To extract |
| EH-exam-bene.pdf | EH-lens-bene.pdf | To extract |
| MS_zvsp_cl.pdf | (single doc with EasyOptions) | To extract |

---

### Decision Point: STAGE 3.1 COMPLETE

**Test 1**: Document type detection works
```
Upload vsp-auth document → GPT returns documentType: "vsp-auth"
Upload vsp-lens document → GPT returns documentType: "vsp-lens"
```
**Result**: Both document types correctly identified

**Test 2**: Auth# extraction works
```
Upload AB-vsp-auth-1.pdf → authNumber extracted
Upload AB-vsp-lens-1.pdf → same authNumber extracted
```
**Result**: Auth# matches between paired documents

**Test 3**: Document pairing works
```
1. Upload vsp-auth → Creates pending authorization
2. Upload vsp-lens with same Auth# → Merges into complete authorization
3. Query database → Single authorization with all data
```
**Result**: Merged authorization has data from both documents

**Test 4**: Price list generates correctly
```sql
SELECT pricing_method, COUNT(*) FROM patient_price_lists
WHERE customer_id = '[vsp_customer_id]'
GROUP BY pricing_method;
```
**Expected Result**:
| pricing_method | count |
|----------------|-------|
| by_tier | 20+ |
| cash_only | 10+ |
| uc_discount | **0** |

**Test 5**: EasyOptions applied correctly
```
For EasyOptions patient:
- Standard progressive → $0 (not lens document value)
- Basic AR → $0 (not lens document value)
```
**Result**: EasyOptions overrides applied

**Action**: If ALL PASS → VSP support complete. If FAIL → Fix document pairing/extraction.

---

## Stage 3.2: VSP Price List Issues (2026-01-26)

**Status**: IN PROGRESS - Fixing tier mapping and copay extraction issues
**Issue**: Patient price lists showing 20% fallback (`uc_discount`) instead of proper copay values

### Root Cause Analysis

When testing VSP patients (Susan McCrae), the price list showed incorrect 20% discount for many products that should have specific copay values.

**Why 20% fallback is triggered:**

1. **`materialsCopay` is NULL** in copays JSON
   - Products with tier "COVERED" map to `materialsCopay` field
   - If `materialsCopay` is null, lookup fails → 20% fallback
   - Affects: Single Vision, Bifocal, Trifocal

2. **Invalid tier codes in product catalog**
   - Some products have tier codes that aren't standard VSP codes
   - Example: "TA" (Tech Add-On), "SV", "PS" are not in VSP lens enhancement tables
   - When tier code doesn't exist in patient's extracted data → 20% fallback

3. **Wrong tier assignments for products**
   - Bifocals use "COVERED" tier but should use "GA" (Blended Bifocal = $30)
   - Products mapped to wrong VSP codes

### Products Affected (Examples)

| Product | Current Tier | Problem | Correct Tier |
|---------|-------------|---------|--------------|
| Single Vision | COVERED | materialsCopay=null | Keep COVERED, fix extraction |
| Flat Top 28 Bifocal | COVERED | Should use blended | GA |
| Trifocal | COVERED | Should use blended | GA |
| Transitions XTRActive | PS | PS not in VSP codes | PR |
| Tech Add-Ons | TA | Invalid code | Remove or map to addon |
| UV Protection | SV | Invalid code | UV or null |

### Fixes Required

**Fix 1: Extract and save `materialsCopay` for VSP**
- VSP "Materials Copay" is typically $25 for lenses
- Must be extracted from auth document and saved to copays JSON
- Location: `src/lib/services/ocr/insurance-parser.ts`

**Fix 2: Update product tier mappings**
- Change Bifocal/Trifocal from "COVERED" to "GA"
- Change Transitions XTRActive from "PS" to "PR"
- Remove or fix invalid codes (TA, SV)
- Location: `src/lib/data/insurance-tier-mappings.ts`

**Fix 3: Regenerate affected price lists**
- After fixes, regenerate price lists for VSP patients
- Verify `uc_discount` count drops to 0

### Decision Point: STAGE 3.2 COMPLETE

**Test 1**: `materialsCopay` is extracted and saved
```sql
SELECT copays->>'materialsCopay' FROM insurance_authorizations
WHERE carrier = 'VSP' AND is_active = true;
```
**Result**: Should return value (typically 25), not null

**Test 2**: Price list has no `uc_discount` fallback
```sql
SELECT pricing_method, COUNT(*) FROM patient_price_lists
WHERE customer_id = '[vsp_customer_id]' AND active = true
GROUP BY pricing_method;
```
**Result**: `uc_discount` count should be 0

**Test 3**: Products use correct copay values
- Single Vision → materialsCopay ($25)
- Bifocal → GA code ($30)
- Transitions → PR code (from patient data)

---

## Stage 3.3: VSP Extraction Robustness (2026-01-26)

**Status**: COMPLETE - Post-processing implemented and tested
**Fix Date**: 2026-01-26
**Issue Resolved**: VSP extraction was non-deterministic; LLM missed codes on different runs

### Root Cause Analysis

VSP lens enhancement documents have a specific OCR format that GPT extraction sometimes misses:

**OCR Format (Multi-line)**:
```
QP - Mirror Solid
$49$49

SW - Rimless Drill Mount
$65$65

LF - Light Filter
$30$30
```

**Problems Identified:**
1. **Code and prices on separate lines** - Code on line N, prices on line N+1
2. **Concatenated prices** - No space between SV/MF prices: `$49$49`
3. **Auth number not extracted** - Required for two-document pairing
4. **LLM non-determinism** - Different codes missed on each run

### VSP Two-Letter Codes to Extract

All of these codes MUST be extracted from lens enhancement documents:

| Code | Description | Typical Format |
|------|-------------|----------------|
| LF | Light Filter | "LF - Light Filter $30$30" |
| TA | Technical Add-On | "TA - Technical Add On $40$40" |
| SV | UV Protection | "SV - UV Protection $15$15" |
| QP | Mirror Coating | "QP - Mirror Solid $49$49" |
| MN | Solid Tint | "MN - Solid Tint $25$25" |
| SW | Rimless Drill Mount | "SW - Rimless Drill $65$65" |
| GA | Blended Bifocal | "GA - Blended Bifocal $30$30" |
| BA | Basic Bifocal | "BA - Lined Bifocal $0$0" |
| WFA | Frame Allowance | "WFA73 $190.00 for Featured" |

### Solution: Robust Post-Processing

Added `postProcessVspCodes()` function in `gpt-extraction.ts` that:

1. **Scans OCR text line-by-line** looking for two-letter code patterns
2. **Checks next line for prices** in format `$XX$YY` or `$XX $YY`
3. **Extracts auth number** from pattern `Auth# XXXXXXXX`
4. **Extracts frame allowances** from WFA codes
5. **Never overwrites existing values** - only fills in missing data

**Code Location**: `src/lib/services/ocr/gpt-extraction.ts` - `postProcessVspCodes()`

### Test Results (Susan McCrae - 2026-01-26)

**Before Fix**: 8 products with `uc_discount` (20% fallback)
**After Fix**: 1 product with `uc_discount` (compound tier issue)

| Product | Before | After |
|---------|--------|-------|
| Rimless (drill mount) | uc_discount | by_tier $30 ✓ |
| Mirror - Solid Color | uc_discount | by_tier $49 ✓ |
| Light Filter (VSP LF) | uc_discount | by_tier $15 ✓ |
| Solid Tint | uc_discount | by_tier $15 ✓ |
| UV Protection | uc_discount | by_tier $16 ✓ |
| Technical Add-On | uc_discount | by_tier $40 ✓ |

Post-processing extracted **66 additional codes** from OCR that LLM missed, bringing total from 15 to 81 codes.

### Key Fix: Auth Number Extraction

VSP document pairing requires Auth# to link auth + lens documents:

```typescript
// Extract Auth# for document pairing
const authNumMatch = ocrText.match(/Auth\s*#?\s*(\d{8})/i)
if (authNumMatch) {
  parsed.patient.authNumber = { value: authNumMatch[1], confidence: 0.95 }
}
```

Without auth number, lens document codes never merge into authorization.

### Products Still Showing Incorrect Pricing

| Product | Issue | Root Cause |
|---------|-------|------------|
| Rimless Mounting | 20% fallback | SW code not in copays JSON |
| Mirror Solid Color | 20% fallback | QP code not in copays JSON |
| Frame Allowance | Missing | WFA codes not extracted |
| Crizal Sunshield UV | Wrong tier | Should be Tier D ($95 SV / $105 MF) |

### Crizal Sunshield UV Pricing (Reference)

User confirmed correct pricing for Crizal Sunshield UV (Tier D):
- Single Vision: $95
- Multifocal: $105

This maps to VSP tier code **QV** (AR Coating Tier D).

### Remaining Issue: Compound Tiers

One product still uses `uc_discount`: **Crizal Sunshield Mirrors UV** with tier "QV+QP".

Compound tiers (combining two codes like "QV+QP") need special handling:
- Option 1: Sum individual copays (QV=$85 + QP=$49 = $134)
- Option 2: Simplify product tier to single code (e.g., just "QP")

This is a tier mapping configuration issue, not an extraction issue.

---

## Stage 3.5: VSP Material SV/MF Pricing ✅ COMPLETE

**Status**: COMPLETE (2026-01-27)
**Issue Resolved**: Materials have different copays for Single Vision vs Multifocal lenses

### Problem Statement

VSP lens enhancement documents show TWO copay columns for materials:
- **Single Vision column**: Lower copay (e.g., Hi-Index 1.67 = $83)
- **Multifocal column**: Higher copay (e.g., Hi-Index 1.67 = $98)

Products were only mapped to one tier code, causing incorrect pricing when SV vs MF mattered.

### Solution: Duplicate Products with SV/MF Variants

Created separate products for each material variant:

| Material | SV Product | MF Product | SV Tier | MF Tier |
|----------|-----------|------------|---------|---------|
| Polycarbonate | Polycarbonate (Single Vision) | Polycarbonate (Multifocal) | AD_SV | AD |
| Trivex | Trivex (Single Vision) | Trivex (Multifocal) | AB_SV | AB |
| Hi-Index 1.67 | Hi-Index 1.67 (Single Vision) | Hi-Index 1.67 (Multifocal) | AH_SV | AH |
| Hi-Index 1.74 | Hi-Index 1.74 (Single Vision) | Hi-Index 1.74 (Multifocal) | AJ_SV | AJ |

### Tier Mapping Updates

Added SV tier codes that map to `_sv` copay fields:

```typescript
// In insurance-tier-mappings.ts
export const VSP_TIER_TO_COPAY: Record<string, string> = {
  // Multifocal (standard)
  "AD": "AD",
  "AB": "AB",
  "AH": "AH",
  "AJ": "AJ",

  // Single Vision variants (map to _sv fields)
  "AD_SV": "AD_sv",
  "AB_SV": "AB_sv",
  "AH_SV": "AH_sv",
  "AJ_SV": "AJ_sv",
}
```

### Database: 8 New Material Products

Created 8 new products (4 SV + 4 MF variants):
- `displayGroup`: 'everyday' (appears in standard quote flow)
- `category`: 'material' (lowercase for consistency)
- `tierVsp`: SV or MF tier code
- `isActive`: true

Old generic products (Polycarbonate, Trivex, Hi-Index 1.67) deactivated.

### Quote Builder: Side-by-Side Display

Updated `eyeglasses-layer-simple.tsx` to show both SV and MF prices in a 3-column layout:

```
┌─────────────────┬──────────────────┬──────────────────────┐
│ Material        │ Single Vision    │ Progressive/Bifocal  │
├─────────────────┼──────────────────┼──────────────────────┤
│ Polycarbonate   │ $31              │ $35                  │
│ Trivex          │ $55              │ $60                  │
│ Hi-Index 1.67   │ $83              │ $98                  │
│ Hi-Index 1.74   │ $119             │ $143                 │
└─────────────────┴──────────────────┴──────────────────────┘
```

User clicks the appropriate column to select that variant.

### Files Modified

- `src/lib/data/insurance-tier-mappings.ts` - Added SV tier codes and mappings
- `src/components/quote-builder/layers/eyeglasses-layer-simple.tsx` - Grouped materials UI
- Database: Created 8 material product variants

### Decision Point: STAGE 3.5 COMPLETE ✅

**Test 1**: Both SV and MF prices display in quote builder
**Result**: 3-column layout shows Material | SV Price | MF Price

**Test 2**: Selecting SV vs MF adds correct product to quote
**Result**: Correct tier applied, correct copay used

**Test 3**: Price list shows separate SV/MF entries
**Result**: Both variants appear with distinct prices

---

## Stage 3.6: VSP Products Tab Display ✅ COMPLETE

**Status**: COMPLETE (2026-01-28)
**Issue Resolved**: Products tab was not useful for VSP customers due to matrix-based pricing

### Problem Statement

VSP uses combined progressive+material codes (e.g., "NJ" = Varilux X + Hi-Index 1.74 = $125), not additive pricing. The Products tab needed special handling to show:
- Materials that require matrix lookup (not individual prices)
- Add-ons with different SV/MF pricing (Polarized, Tech Add-On)
- Flat add-ons with single price

### VSP Products Tab Display Rules

| Category | Products | Display Method |
|----------|----------|----------------|
| **Lens Materials** | Polycarbonate | Show locked $35 price (flat across all) |
| | Trivex, Hi-Index 1.67, Hi-Index 1.74 | Show "See Matrix" badge (copay depends on progressive tier) |
| | CR-39 | Show $0 (covered) or matrix price |
| **Dependent Add-ons** | Polarized (DA) | SV: $57 / MF: $77 |
| | Technical Add-On (TA) | SV: $10 / MF: $40 |
| **Flat Add-ons** | AR Coatings (QM, QT, QV) | Single price (same SV/MF) |
| | Photochromic (PR) | Single price |
| | Light Filter (LF) | Single price |
| | Tint (MN) | Single price |
| | Blue Light | Single price |
| **Other** | Progressive Lenses | As-is (tier-based) |
| | Single Vision | As-is |
| | Mount Fees | As-is |

### VSP Two-Letter Codes Reference

**Dependent Add-ons (different SV vs MF)**:
| Code | Description | SV Copay | MF Copay |
|------|-------------|----------|----------|
| DA | Polarized | $57 | $77 |
| TA | Technical Add-On | $10 | $40 |
| AB | Trivex | $56 | $60 |
| AH | Hi-Index 1.67 | $83 | $98 |
| AJ | Hi-Index 1.74 | $111 | $118 |

**Flat Add-ons (same SV = MF)**:
| Code | Description | Copay |
|------|-------------|-------|
| AD | Polycarbonate | $35 |
| QM | Basic AR | $0 |
| QT | Standard AR | $35 |
| QV | Premium AR | $85 |
| PR | Photochromic | $75 |
| LF | Light Filter | $15 |
| MN | Tint | $15 |

### Implementation

**File**: `src/components/customers/customer-insurance-pricing.tsx`

**Changes**:
1. Detect VSP carrier and get copays from authorization
2. For materials (Trivex, Hi-Index): Show "See Matrix" badge instead of price
3. For Polycarbonate: Show locked $35 price
4. For Polarized/Tech Add-On: Show SV/MF split (e.g., "SV: $57 / MF: $77")
5. For flat add-ons: Show single copay value

### Decision Point: STAGE 3.6 COMPLETE ✅

**Test 1**: VSP customer products tab shows "See Matrix" for dependent materials
**Result**: Trivex, Hi-Index 1.67, Hi-Index 1.74 show "See Matrix" badge

**Test 2**: Polarized and Tech Add-On show SV/MF split pricing
**Result**: "SV: $57 / MF: $77" format displays correctly

**Test 3**: Flat add-ons show single price
**Result**: AR coatings, photochromic show single copay value

**Test 4**: Polycarbonate shows $35 (flat price)
**Result**: Locked price displays correctly

---

## Stage 3.7: Extraction Architecture Overhaul (CRITICAL)

**Status**: IN PROGRESS (2026-01-28)
**Priority**: CRITICAL - Current extraction system is fundamentally broken

### What Failed: Field-Specific JSON Extraction

The previous approach used rigid JSON path matching to extract insurance data:

```typescript
// FAILED APPROACH - Hardcoded paths break on every new document
function extractFrameAllowance(extracted) {
  // VSP path - doesn't work for EyeMed
  return getNestedValue(extracted, 'frame.allowances.altairMarchonFrameAllowance.allowance')
}

function extractContactAllowance(extracted) {
  // Another VSP-specific path
  return getNestedValue(extracted, 'contacts.clExamAndMaterialsAllowance.value')
}
```

**Problems Encountered:**
1. **Every new document breaks extraction** - Paths are carrier-specific and even vary within same carrier
2. **GPT outputs inconsistent JSON structure** - Same field appears at different paths on different runs
3. **Maintenance nightmare** - Every new path variation requires code changes
4. **False confidence** - Data extracts to `raw_extracted_data` correctly but verify route can't find it

**Specific Failures (Angela Clayton - EyeMed):**
| Field | Expected | Extraction Path Used | Actual Path in Data | Result |
|-------|----------|---------------------|---------------------|--------|
| Frame allowance | $180 | `frame.allowances.altairMarchonFrameAllowance.allowance` | `frame.allowances.retailMinAllowance.value` | NULL ❌ |
| Contact allowance | $130 | `contacts.clExamAndMaterialsAllowance.value` | `contacts.contactAllowance.value` | NULL ❌ |
| Materials copay | $25 | `copays.materialsCopay` | `copays.singleVisionCopay.value` | NULL ❌ |
| CL Fit | $0 | Not extracted | `clFit.standardCost.value` | "Not covered" ❌ |

**Conclusion:** Field-specific JSON extraction is architecturally flawed. The system cannot scale.

---

### New Approach: Two-Part Open-Ended Extraction

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ PART 1: OPEN-ENDED READ (Haiku)                                         │
│ ────────────────────────────────────────────────────────────────────── │
│ Input: Raw document (PDF/image) - NO OCR STEP                           │
│ Prompt: "Read this insurance document. Extract ALL benefit information  │
│          you can find. Return as plain text summary."                   │
│ Output: Unstructured text with all extracted values                     │
│                                                                         │
│ Example output:                                                         │
│ "This is an EyeMed plan for Angela Clayton. Exam copay is $0.           │
│  Frame allowance is $180 with 20% off overage. Contact lens allowance   │
│  is $130. Materials copay for single vision is $25. CL fitting is       │
│  covered at $0 for standard fits..."                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PART 2: CATALOG ASSIGNMENT (Haiku)                                      │
│ ────────────────────────────────────────────────────────────────────── │
│ Input: Part 1 output + Our copay field catalog                          │
│ Prompt: "Given this extracted text and our field catalog, assign        │
│          values to each field. If a field is not mentioned, mark null." │
│                                                                         │
│ Field Catalog:                                                          │
│ - examCopay: number (patient pays for routine exam)                     │
│ - materialsCopay: number (patient pays for basic lenses)                │
│ - frameAllowance: number (insurance pays toward frame)                  │
│ - contactAllowance: number (insurance pays toward contacts)             │
│ - clFitCopay: number (patient pays for contact lens fitting)            │
│ - [EyeMed specific fields...]                                           │
│ - [VSP specific fields...]                                              │
│                                                                         │
│ Output: Structured JSON with our exact field names                      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Benefits:**
1. **Open-ended read captures everything** - No rigid paths to miss data
2. **Catalog assignment maps to OUR schema** - Consistent output regardless of input format
3. **Carrier-agnostic Part 1** - Same prompt works for VSP, EyeMed, Spectera
4. **Carrier-specific Part 2** - Catalog includes all fields we need per carrier
5. **Easier debugging** - Can see exactly what was extracted vs how it was assigned

---

### Eliminating OCR: Accuracy vs Cost Trade-off

**Current Flow (Broken):**
```
PDF → Google Vision OCR → GPT-4o extraction (rigid JSON paths) → Storage
```

**New Flow (Reliable):**
```
PDF → Haiku Vision (open-ended read) → Haiku (catalog assignment) → Storage
```

**Cost Reality:**
- Haiku vision (processing images directly) costs MORE than OCR → text processing
- Two Haiku calls per document adds cost
- **This is a trade-off: higher cost for a system that actually works**

**Why it's worth it:**
- Current system extracts data but can't use it (wrong paths = NULL values)
- A working system at higher cost beats a broken system at lower cost
- Accuracy is the priority - cost optimization comes later

---

### Implementation Plan

**Step 1: Build Haiku Vision Reader**
- Direct PDF/image input to Haiku
- Open-ended extraction prompt
- Returns unstructured text summary

**Step 2: Build Catalog Assignment Function**
- Takes extracted text + field catalog
- Maps values to our schema fields
- Handles carrier-specific fields

**Step 3: Update Verify Route**
- Remove all hardcoded path lookups
- Use assigned values directly
- Simplify to just reading the structured output

**Step 4: Test Accuracy and Document Cost**
- Process 20 documents with new approach
- Compare accuracy to old approach (target: 95%+ vs current ~20%)
- Document actual cost per document

---

### Decision Point: STAGE 3.7 COMPLETE

**Test 1**: Open-ended read captures all values
```
Process Angela Clayton document → Check extracted text includes:
- Exam copay $0
- Frame allowance $180
- Contact allowance $130
- Materials copay $25
- CL Fit $0
```
**Result**: All values present in extracted text

**Test 2**: Catalog assignment maps correctly
```
Run assignment on extracted text → Check JSON output:
- examCopay: 0
- frameAllowance: 180
- contactAllowance: 130
- materialsCopay: 25
- clFitCopay: 0
```
**Result**: All fields populated with correct values

**Test 3**: End-to-end accuracy
```
Process 10 EyeMed documents → Compare to manual extraction
```
**Result**: 95%+ accuracy (vs current ~20% for affected fields)

**Test 4**: Cost is acceptable for accuracy gained
```
Calculate cost for 100 documents with new approach
```
**Result**: Cost documented, accuracy justifies expense

**Action**: If ALL PASS → Deploy new extraction architecture

---

## Stage 3.8: EyeMed Extraction Patterns Reference (NEW)

**Status**: COMPLETE (2026-01-30)
**Priority**: CRITICAL - Required for accurate EyeMed extraction
**Reference Document**: `/planning/EYEMED_PRICING_PATTERNS.md`

### Problem Statement

EyeMed documents use BOTH simple copays AND formulas (e.g., `$25 copay; 20% off retail price less $120 allowance`). The previous extraction system treated these as either/or instead of combining them, causing incorrect pricing.

### Pattern Library Overview

Analysis of 33+ EyeMed authorization documents revealed:

**8 Plan Types Identified:**
| Type | Name | Characteristics |
|------|------|-----------------|
| 1 | Tiered+Simple | 5-tier progressives, most have simple copays |
| 2 | Tiered+Formula | Tier 4/5 use formulas instead of copays |
| 3 | Simplified Tier | Only 1-2 tiers (Standard, Premium) |
| 4 | Discount-Only | "20% off retail price" for everything |
| 5 | Package-Based | Contact lens packages with declining balance |
| 6 | Declining Balance Partial | Some benefits from shared pool |
| 7 | Pure Declining Balance | ALL benefits from declining balance |
| 8 | Discount+Simplified | Discount (80%) + simplified tier structure |

**15 Value Format Patterns:**
| Pattern | Example | Meaning |
|---------|---------|---------|
| 1 | `$25` | Simple copay |
| 2 | `$0` | Fully covered |
| 3 | `20% off retail price` | Discount percentage |
| 4 | `$25 copay; 20% off retail price less $120 allowance` | **FORMULA (CRITICAL)** |
| 5 | `$0 up to age 18; $75 19 and over` | Age-based conditional |
| 6 | `100% of retail price` | NOT covered |
| 7 | `Not Covered` | Explicit exclusion |
| 8 | `Up to $200` | Allowance cap |
| 9 | `20% discount on balance over allowance` | Overage discount |
| 10 | `Standard Contact Lens Fit and Follow-up` | Package reference |
| 11 | `Not Applicable` | N/A |
| 12 | `Included in Exam` | Bundled |
| 13 | `$55 applied to remaining balance` | Declining balance |
| 14 | `5% of retail price applied to remaining balance` | Percent of balance |
| 15 | `85% of amount over remaining balance` | Overage on balance |

### Critical Formula Pattern (THE KEY FIX)

**Pattern 4** is the most critical - it's why Angela Clayton's pricing was wrong:

```
$25 copay; 20% off retail price less $120 allowance
```

**Parsed structure:**
- `copay`: $25 (patient pays upfront)
- `discountPercent`: 20 (applied to overage)
- `allowance`: $120 (insurance covers first $120)

**Calculation for $600 progressive:**
```
Overage = $600 - $120 = $480
Discounted = $480 × 0.80 = $384
Patient pays = $25 + $384 = $409
```

### Regex Patterns for Extraction

```javascript
const EYEMED_PATTERNS = {
  // Pattern 1: Simple copay
  simpleCopay: /^\$(\d+(?:\.\d{2})?)$/,

  // Pattern 3: Discount only
  discountOnly: /^(\d+)%\s+off\s+retail\s+price$/i,

  // Pattern 4: Formula with allowance (CRITICAL)
  formulaWithAllowance: /^\$(\d+(?:\.\d{2})?)\s*(?:copay)?;\s*(\d+)%\s+off\s+retail\s+price\s+less\s+\$(\d+)\s+allowance$/i,

  // Pattern 5: Age-based
  ageBased: /^\$(\d+)\s+up\s+to\s+age\s+(\d+);\s+\$(\d+)\s+(\d+)\s+and\s+over$/i,

  // Pattern 6: Not covered (100%)
  notCovered: /^100%\s+of\s+retail\s+price$/i,

  // Pattern 13: Applied to remaining balance
  appliedToBalance: /^\$(\d+)\s+applied\s+to\s+remaining\s+balance$/i,

  // Pattern 14: Percent applied to balance
  percentAppliedToBalance: /^(\d+)%\s+of\s+retail\s+price\s+applied\s+to\s+remaining\s+balance$/i,
};
```

### Key Discoveries

1. **Tier 4 can be formula OR simple copay** - VB_Benefits.pdf shows Tier 4 = $185 (no formula)
2. **"copay" word is optional** - Some formulas omit it: `$25; 20% off...`
3. **Allowance amounts vary** - Seen: $40, $55, $120, $130, $145, $155, $200, $250
4. **Some plans don't split polycarbonate by age** - Just show one price
5. **`100% of retail price` = NO coverage** - Not "100% covered"
6. **Pure declining balance plans** exist with completely different structure
7. **New field names**: Glass, Oversize Lens, Prism, Bifocal-Blended, Frame-Retail

### Integration with Extraction Architecture

The Stage 3.7 two-part extraction must handle all 15 patterns:

**Part 1 (Open-ended read)** should capture the raw text exactly as written:
```
"Progressive Tier 4: $25 copay; 20% off retail price less $120 allowance"
```

**Part 2 (Catalog assignment)** must parse the value using the regex patterns and store structured data:
```json
{
  "progressiveTier4": {
    "type": "formula",
    "copay": 25,
    "discountPercent": 20,
    "allowance": 120
  }
}
```

### Files Reference

| File | Purpose |
|------|---------|
| `/test-documents/eyemed-only/EYEMED_PRICING_PATTERNS.md` | Complete pattern library with all 33+ documents analyzed |
| `src/lib/services/ocr/gpt-extraction.ts` | Extraction implementation |
| `src/lib/services/pricing-calculator.ts` | Formula calculation implementation |
| `src/lib/data/insurance-tier-mappings.ts` | Product-to-tier mappings |

### Decision Point: STAGE 3.8 COMPLETE

**Test 1**: Pattern library covers all EyeMed formats
```
Review 10 random EyeMed documents → All value formats match documented patterns
```
**Result**: 33 documents analyzed, 8 plan types, 15 value patterns identified

**Test 2**: Extraction handles formula pattern correctly
```
Process document with Tier 4 formula → copays JSON contains structured formula data
```
**Result**: Formula parsed into copay, discountPercent, allowance fields

**Test 3**: Price calculation uses formula correctly
```
$600 retail, Tier 4 formula ($25; 20% off less $120) → Patient pays $409
```
**Result**: Calculation matches expected value

**Action**: Pattern library complete. Use as reference for extraction implementation.

---

## Stage 3.4: Authorization Data Persistence (NEW)

**Status**: NOT YET IMPLEMENTED
**Priority**: HIGH - User pain point (re-scanning documents)

### Problem Statement

Currently, users must re-scan insurance documents when:
1. Authorization expires and is renewed
2. Price list needs regeneration
3. System needs to re-extract data

### Requirements

**Requirement 1: Store Raw Extraction Data**
- Save GPT extraction JSON separately from authorization
- Allow re-processing without re-scanning
- Store OCR text for debugging

**Database Changes**:
```sql
ALTER TABLE insurance_authorizations ADD COLUMN
  raw_extraction JSONB,        -- Full GPT extraction response
  ocr_text TEXT,               -- Raw OCR text for debugging
  extraction_model VARCHAR(50), -- "gpt-4o-2024-05-13"
  extraction_timestamp TIMESTAMP; -- When extraction occurred
```

**Requirement 2: Price History with Timestamps**
- Date alone is insufficient when user scans multiple times per day
- Add full timestamp to price list records

**Database Changes**:
```sql
ALTER TABLE patient_price_lists ADD COLUMN
  generated_at TIMESTAMP DEFAULT NOW(),  -- Full timestamp (not just date)
  source_document_id UUID,               -- Link to source document
  extraction_version VARCHAR(20);        -- Track extraction algorithm version
```

**Requirement 3: Price List History UI**
- Show all price lists for customer (not just active)
- Display generation timestamp
- Allow comparison between versions
- Show source document for each list

### Benefits

1. **No re-scanning** - Re-process from stored extraction data
2. **Audit trail** - Full history of all price lists
3. **Debugging** - Access to OCR text when extraction fails
4. **Versioning** - Track which extraction algorithm generated each list

### Decision Point: STAGE 3.4 COMPLETE

**Test 1**: Raw extraction stored
```sql
SELECT raw_extraction, ocr_text FROM insurance_authorizations
WHERE id = '[auth_id]';
```
**Result**: Both fields populated

**Test 2**: Price history has timestamps
```sql
SELECT generated_at, source_document_id FROM patient_price_lists
WHERE customer_id = '[customer_id]' ORDER BY generated_at DESC;
```
**Result**: Full timestamps (not just dates), multiple entries visible

**Test 3**: Regenerate without re-scan
```
1. Call regenerate API with existing auth_id
2. New price list created from stored extraction
3. No document upload required
```
**Result**: Price list regenerated successfully

---

## Stage 4: Patient Profile ✅ COMPLETE

**Status**: Complete - customer profile shows insurance and price list

### Functionality Goal
Link authorization and price list to patient record.

### Must Have:
- Customer demographics complete ✅ (existing `/customers/[id]` page)
- Authorization linked to customer ✅ (database relations exist)
- Price list linked to customer ✅ (database relations exist)
- Customer profile displays:
  - Active insurance info ✅ (`CustomerInsurancePricing` component)
  - Authorization details ✅ (carrier, copays, allowances displayed)
  - Price list status ✅ (`CustomerPricePlan` component)

**Files Implementing Stage 4:**
- `src/components/customers/customer-profile.tsx` - Main profile with tabs
- `src/components/customers/customer-insurance-pricing.tsx` - Insurance + authorization display
- `src/app/api/customers/[id]/authorization/route.ts` - Authorization API

### Decision Point: STAGE 4 COMPLETE ✅
**Test**: Navigate to customer profile page → "Insurance & Pricing" tab
**Result 1**: Authorization displays with carrier, copays, allowances ✅
**Result 2**: Price list accessible via CustomerPricePlan ✅
**Result 3**: Patient can be selected for quote building (New Quote button) ✅

---

## Stage 5: Patient Price List (Display & Access) ✅ COMPLETE

**Status**: Complete - implemented in `CustomerPricePlan` component
**Updated**: 2026-01-20 - UI Consolidation for clarity

### Functionality Goal
Provide access to patient-specific pricing for quote building.

### Must Have:
- Price list accessible from customer profile ✅ ("Price List" tab - now FIRST/default tab)
- Prices match generated values from Stage 3 ✅
- Search/filter functionality ✅ (search + category + carrier filters)
- Manual price override capability (with audit trail) ✅ (override modal with reason)
- Price list history (view old/inactive lists) ✅
- Export to CSV ✅ (implemented 2026-01-27)

### Implementation: CustomerPricePlan Component
**Location**: `src/components/customers/customer-price-plan.tsx`
**API**: `src/app/api/customers/[id]/price-plan/route.ts`

### Export Functionality (Added 2026-01-27)
**Feature**: Export CSV button next to "Regenerate Prices"
**Location**: `src/components/customers/customer-insurance-pricing.tsx`
**Output**: CSV file with columns: Product, Category, SKU, Retail Price, Customer Price, Savings, Tier, Carrier
**Filename**: `price-list-{customername}-{date}.csv`

### Unified Price List UI (Updated 2026-01-27)
**Change**: Merged insurance benefits and products into ONE card (not separate cards)
**Layout**: Insurance header → Benefits row → Products/History tabs (all in same card)
**Result**: Benefits section flows directly into product list, no visual separation

### UI Layout (Consolidated - 2026-01-20):

**Tab Order** (Price List is default):
1. **Price List** (default) - Main pricing view
2. Benefits Detail - Full copay breakdown
3. Price List History - Old/inactive lists

**Price List Layout**:
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏥 EyeMed - Humana VCP | Member: 22868382200                        │
├─────────────────────────────────────────────────────────────────────┤
│ BENEFITS SUMMARY ROW:                                               │
│ Exam: $10 | CL Fit: $40 | Materials: $10 | Frame: $250-375 | CL: $150 │
├─────────────────────────────────────────────────────────────────────┤
│ [Search products...]                            [Filter: All ▼]     │
├─────────────────────────────────────────────────────────────────────┤
│ PRODUCTS (not "Everyday" - just "Products")                         │
│ ┌─────────────────┬─────────┬───────────────────┬─────────────────┐│
│ │ Product         │ Retail  │ You Pay           │ Savings         ││
│ ├─────────────────┼─────────┼───────────────────┼─────────────────┤│
│ │ Single Vision   │ $45     │ $10 copay         │ $35             ││
│ │ Prog Tier 1     │ $195    │ $80 copay         │ $115            ││
│ │ Polycarbonate   │ $85     │ $25 copay         │ $60             ││
│ │ Hi-Index 1.67   │ $125    │ 20% off ($100)    │ $25             ││
│ │ Trivex          │ $85     │ 20% off ($68)     │ $17             ││
│ └─────────────────┴─────────┴───────────────────┴─────────────────┘│
│                                                                     │
│ CONTACT LENSES (special display for allowance-based pricing)        │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ $150 allowance, then patient pays 100% of overage               ││
│ │ CL Fitting: 85% of amount over allowance (15% discount)         ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**Key Display Rules**:
1. **"You Pay" column shows context**, not just numbers:
   - `$10 copay` - explicit copay from tier
   - `20% off ($80)` - when DISCOUNT_20 applies (show calculated amount)
   - `$150 allowance + overage` - for allowance-based items like contacts
   - Never show "N/A" for extracted values - show actual benefit text

2. **Benefits Summary Row** (compact, always visible):
   - Exam Copay
   - CL Fit Copay (next to exam - both are service copays)
   - Materials Copay
   - Frame Allowance (show range if min/max)
   - Contact Lens Allowance

3. **Price List History** (new tab):
   - Shows all price lists for customer (active + inactive)
   - Date created, carrier, status, product count
   - Can view/compare old lists
   - Old lists auto-deactivated when new auth scanned (same carrier)

**Special Pricing Values** (from insurance auth):
- `"DISCOUNT_20"` → Display as "20% off" with calculated price
- `"100% of amount over remaining balance"` → Patient pays full overage
- `"85% of amount over remaining balance"` → Patient pays 85% of overage (15% discount)
- `null` → Show as "At retail" (not "N/A")

### Decision Point: STAGE 5 COMPLETE ✅
**Test 1**: View price list in customer profile → "Price List" tab (first tab) ✅
**Test 2**: Search for products by name ✅
**Test 3**: Generate price plan from authorization ✅
**Test 4**: Override individual product price ✅
**Test 5**: View price list history (old/inactive lists) ✅
**Test 6**: Benefits summary row displays correctly ✅

---

## Stage 5.5: Insurance Verification Gate (NEW)

**Status**: IN PROGRESS (2026-01-28)
**Priority**: HIGH - Required before quote building

### Functionality Goal

Create a verification gate in the Quote Builder that displays insurance benefits, verifies data freshness, and provides clear paths forward (proceed to quote, re-scan, or self-pay).

### Why This Gate?

1. **EyeMed**: Simple product price list mapped from authorization
2. **VSP**: Matrix-based pricing mapped from two-page authorizations
3. **Both require**: Clear display of benefits before quoting to ensure accurate pricing

### Insurance Verification Gate Requirements

**Display (from Patient Profile - READ ONLY):**
- Carrier (VSP, EyeMed, Spectera)
- Plan Name
- Exam Copay
- Materials Copay
- Frame Allowance (show range if Featured/Non-Featured)
- Contact Lens Allowance
- CL Fit Copay (Contact Lens Fitting copay)
- Last Verified timestamp

**Staleness Check:**
- **48-hour threshold**: If authorization verified > 48 hours ago, show warning
- Warning message: "Insurance last verified X days ago. Re-scan recommended."
- Warning does NOT block quote - user can proceed anyway

**Actions:**
1. **[Proceed to Quote]** - Continue with current insurance benefits
2. **[Go to Scanner]** - Redirect to `/scanner` page to re-scan documents
3. **[Self-Pay]** - Always available, bypasses insurance entirely

### Data Flow (CRITICAL)

```
┌─────────────────────────────────────────────────────────────────────┐
│ PATIENT PROFILE (Source of Truth)                                   │
│ ─────────────────────────────────────────────────────────────────── │
│ • insurance_authorizations table                                    │
│ • patient_price_lists table                                         │
│ • Authorization copays JSON                                         │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ READ ONLY (no regeneration!)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ INSURANCE VERIFICATION GATE (Quote Builder Entry Point)            │
│ ─────────────────────────────────────────────────────────────────── │
│ • Displays benefits from authorization                              │
│ • Checks staleness (48-hour warning)                               │
│ • Provides action buttons                                          │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🏥 VSP - Choice Plan                    Last Verified: 2 days ago │
│ │ ────────────────────────────────────────────────────────────────  │
│ │ ⚠️ Insurance benefits may be outdated. Re-scan recommended.      │
│ │                                                                   │
│ │ Exam: $10 | Materials: $25 | Frame: $200 | CL: $150 | CL Fit: $40│
│ │                                                                   │
│ │ [Proceed to Quote]  [Go to Scanner]  [Self-Pay]                  │
│ └─────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
         [Quote Builder]   [/scanner]     [Quote Builder]
         (with insurance)  (re-scan)      (self-pay mode)
```

### Implementation Plan

**Component Location**: `src/components/quote-builder/insurance-verification-gate.tsx`

**API Data Source**:
- `/api/customers/[id]/authorization` - Get authorization details
- `/api/customers/[id]/insurance-summary` - Get copay summary

**No New APIs**: Uses existing patient profile APIs (read-only)

### UI Specification

```
┌─────────────────────────────────────────────────────────────────────┐
│ SELECT INSURANCE                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ● VSP - Choice Plan                                                │
│   Member: 123456789 | Group: 00012345                              │
│   Last Verified: Jan 26, 2026 at 3:45 PM                           │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────────┐│
│   │ ⚠️ Insurance verified 2 days ago. Re-scan for latest benefits.││
│   └───────────────────────────────────────────────────────────────┘│
│                                                                     │
│   BENEFITS SUMMARY:                                                 │
│   ┌─────────┬────────────┬─────────┬─────────┬────────┐           │
│   │ Exam    │ Materials  │ Frame   │ CL      │ CL Fit │           │
│   │ $10     │ $25        │ $200    │ $150    │ $40    │           │
│   └─────────┴────────────┴─────────┴─────────┴────────┘           │
│                                                                     │
│   [Proceed with VSP]    [Re-scan Documents]                        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ ○ EyeMed (no active authorization)                                 │
│   [Scan Documents]                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ ○ Self-Pay (No Insurance)                                          │
│   Patient pays retail prices                                        │
│   [Continue as Self-Pay]                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Staleness Logic

```typescript
const STALE_THRESHOLD_HOURS = 48;

function isAuthorizationStale(authorization: { updatedAt: Date }): boolean {
  const hoursSinceUpdate = (Date.now() - authorization.updatedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceUpdate > STALE_THRESHOLD_HOURS;
}
```

### Decision Point: STAGE 5.5 COMPLETE

**Test 1**: Insurance gate displays benefits from patient profile
```
Navigate to Quote Builder → Select customer with VSP authorization
```
**Result**: Benefits summary shows Exam, Materials, Frame, CL, CL Fit copays

**Test 2**: Staleness warning appears for old authorizations
```
Navigate to Quote Builder → Select customer with authorization > 48 hours old
```
**Result**: Warning banner appears: "Insurance verified X days ago..."

**Test 3**: Scanner redirect works
```
Click [Go to Scanner] or [Re-scan Documents]
```
**Result**: Navigates to /scanner page with customer pre-selected

**Test 4**: Self-pay bypasses insurance
```
Select "Self-Pay" option → Proceed to quote
```
**Result**: Quote builder loads in self-pay mode (retail prices)

**Test 5**: Data is read-only (no regeneration)
```
Verify no API calls to regenerate price lists when entering gate
```
**Result**: Only GET requests to authorization/summary APIs

**Action**: If ALL PASS → Gate complete, proceed with quote building

---

### Insurance Summary Component (Updated 2026-01-27)

**Location**: `src/components/quote-builder/insurance-summary.tsx`

**UI Improvements**:
- Header: "Insurance Copays" with plan name inline (unified appearance)
- Tier details toggle: "Lens & Enhancement Copays" with item count
- Tier copays flow naturally from base copays (not visually separate sections)
- Consistent emerald color for copay values

**Design Principle**: Benefits and copays appear as ONE unified section, not separate components.

---

## Stage 6: Quote Generation (THE GOSPEL)

### Functionality Goal
Build accurate quotes following service workflow with proper insurance coverage rules. **This is where everything comes together.**

---

### Quote Builder Layers (Sequential):

#### **Layer 1: Exam (REQUIRED FIRST)**

**Routine Vision Exam** (INSURANCE COVERED)
- Comprehensive eye exam
- **Includes refraction** (not charged separately)
- Price from CustomerPriceList (exam copay)
- Example: EyeMed exam copay = $10

**Screening Services** (CASH PAY - Optional)
- Retinal imaging, OCT scan, Visual field test
- Price = retail cash (no insurance)
- Patient can opt in/out

**EXAM REVIEW CHECKPOINT** - Patient must approve exam costs before proceeding to products
- Display exam quote summary
- Show covered vs. cash pay breakdown
- Calculate exam total
- Actions: [Go Back & Edit] [Save Exam Quote] [Proceed to Products]
- Database save: status = EXAM_ONLY

---

#### **Layer 2-5: Product Selection** (After Exam Approval)

**Layer 2: Routine Services** (COVERED)
- Standard adjustments, basic lens cleaning
- Price from CustomerPriceList (may be $0)

**Layer 3: Contact Lens Fitting** (COVERED if applicable)
- Separate from exam copay
- Price from CustomerPriceList (CL fitting copay)
- Only if patient selecting contacts

**Layer 4a: Eyeglasses** (COVERED with allowance)
- Lenses (Progressive/SV/Bifocal)
- Material (Polycarbonate, Trivex, High Index)
- AR Coating
- Enhancements (Photochromic, Polarized, Tint)
- Frame (allowance applied, patient pays overage)
- All prices from CustomerPriceList

**Layer 4b: Contact Lenses** (COVERED - Alternative to eyeglasses)
- Annual supply selection
- Calculate boxes needed
- Price from CustomerPriceList
- **IMPORTANT**: Materials benefit exclusivity - patient chooses eyeglasses OR contacts (not both with insurance)

**Layer 5: Add-on Services** (CASH PAY)
- Second pair, warranties, specialty services
- Price = retail cash (no insurance)

---

### Database Structure:

**Quote Table** (Header)
- `quoteNumber` - Auto-generated (Q-YYYYMMDD-XXXX)
- `customerId` - Patient reference
- `status` - EXAM_ONLY, DRAFT, SENT, ACCEPTED, CONVERTED, EXPIRED
- `quoteType` - EXAM_ONLY, EYEWEAR, CONTACTS, FULL_SERVICE
- `subtotalInsurance` - Insurance-covered items
- `subtotalCashPay` - Cash-pay items
- `totalAmount` - Final total
- `createdAt`, `updatedAt` - Timestamps (auto-save updates)
- `authorizationId` - Insurance reference

**QuoteItem Table** (Line Items)
- `quoteId` - Foreign key to Quote
- `productId`, `productType`, `productName`, `sku`
- `quantity`, `unitPrice`, `lineTotal`
- `isCoveredByInsurance` - true/false
- `tier` - "Progressive Tier 2", "Standard AR", null if cash
- `pricingRule` - "Tier-Based", "80% U&C", "Cash Pay Only"
- `retailPrice`, `savings` - For insurance comparison
- `quoteSection` - EXAM, EYEWEAR, CONTACTS, ADDON_SERVICES
- `sortOrder` - Display order

---

### Auto-Save Logic:

**Saves automatically:**
1. After exam approval → status = EXAM_ONLY
2. After adding each product → updates Quote totals
3. Every 30 seconds (debounced)
4. When navigating between layers
5. Before closing quote builder

**Each save:**
- Adds/updates QuoteItem
- Recalculates Quote totals (insurance + cash subtotals)
- Updates `updatedAt` timestamp

---

### Critical Pricing Rules (THE GOSPEL):

**RULE #1**: Covered services use CustomerPriceList, cash services use retail price
```typescript
if (service.isCoveredByInsurance) {
  price = customerPriceList.find(p => p.productId === service.id)?.finalPrice
} else {
  price = service.retailPrice // Cash pay
}
```

**RULE #2**: Refraction is INCLUDED in routine exam (never charge separately)

**RULE #3**: Materials benefit is exclusive (eyeglasses OR contacts, not both)

**RULE #4**: 80% fallback is VALID when:
- Product has no tier mapping (`eyemedTier = NULL`)
- Product is "Not Covered"
- Pricing rule is "80% U&C"

**RULE #5**: Frame allowance must be applied correctly
```
Frame retail: $250
Frame allowance: $150
Patient pays: $100 (overage as separate line item)
```

**RULE #6**: All prices from CustomerPriceList must match exactly (no recalculation)

---

### Quote Display Format:

```
QUOTE #Q-20260113-0042
Patient: John Smith | EyeMed Select Plus | Member: ABC123456

=== COVERED BY INSURANCE ===
Routine Vision Exam (includes refraction)        $10.00
Varilux X-Series Progressive                    $115.00
Crizal Sapphire AR Coating                       $85.00
Polycarbonate Material                           $40.00
Transitions Photochromic                         $75.00
Frame: Ray-Ban RB5154                           $250.00
  Frame Allowance                              -$150.00
  Frame Overage                                 $100.00
                                   Insurance:   $425.00

=== NOT COVERED - CASH PAY ===
Optomap Retinal Imaging                          $39.00
OCT Scan                                         $75.00
                                    Cash Pay:   $114.00

Subtotal:                                       $539.00
Tax (7%):                                        $37.73
─────────────────────────────────────────────────────
TOTAL:                                          $576.73

Retail Value (no insurance): $1,420.00
Your Savings: $843.27 (59%)
```

---

### Decision Point: STAGE 6 COMPLETE

**Test 1**: Exam checkpoint works
```
1. Select exam + screening services
2. Review exam quote (approval screen displays)
3. Click "Proceed to Products"
4. Query database
```
```sql
SELECT status, subtotal FROM Quote WHERE id = [quote_id];
```
**Result**: status = EXAM_ONLY → changes to DRAFT when products added

**Test 2**: Auto-save works
```
1. Add Varilux lens
2. Wait 2 seconds
3. Query QuoteItem count
```
**Result**: Item saved immediately, Quote totals recalculated

**Test 3**: Covered vs. cash pricing correct
```sql
SELECT
  qi.productName,
  qi.unitPrice,
  CASE WHEN qi.isCoveredByInsurance THEN 'Insurance' ELSE 'Cash' END as source
FROM QuoteItem qi
WHERE qi.quoteId = [test_quote_id];
```
**Result**: Exam/lenses/frame show "Insurance", screening shows "Cash"

**Test 4**: Prices match CustomerPriceList exactly
```sql
SELECT
  qi.productName,
  qi.unitPrice as quote_price,
  cpl.finalPrice as price_list_price,
  CASE WHEN qi.unitPrice = cpl.finalPrice THEN '✅' ELSE '❌' END as match
FROM QuoteItem qi
JOIN CustomerPriceList cpl ON cpl.productId = qi.productId
WHERE qi.quoteId = [test_quote_id] AND qi.isCoveredByInsurance = true;
```
**Result**: ALL rows show ✅ (perfect match)

**Test 5**: Materials benefit exclusivity enforced
```
Try to add both eyeglasses AND contacts with insurance
```
**Result**: System prompts "Materials benefit already used. Contacts will be cash pay. Continue?"

**Test 6**: Quote totals calculate correctly
```
Manual calculation:
  Exam: $10
  Lenses/coatings: $315
  Frame overage: $100
  Screening: $114
  Tax (7%): $37.73
  Total: $576.73
```
**Result**: Displayed total matches manual calculation exactly

---

**GOSPEL CHECK** (ALL must pass):
- ✅ Exam checkpoint exists (patient approves before products)
- ✅ All insurance prices from CustomerPriceList (not calculated)
- ✅ Cash pay services use retail price
- ✅ Auto-save works (quote persists)
- ✅ Materials benefit exclusivity enforced
- ✅ Frame allowance applied correctly
- ✅ Totals accurate

**Action**:
- If ALL TESTS PASS + GOSPEL CHECK ✅ → Proceed to Stage 7
- If ANY FAIL → **STOP. Fix quote builder. This is the gospel - must be perfect.**

---

## Stage 7: Order Tracking

### Functionality Goal
Track orders from quote conversion through patient pickup with 8-day timeline.

### 8 Status States (Timeline):
**Day 0 (Same day as quote):**
1. Invoiced
2. Order placed

**Day 1:**
3. Shipped to vendor

**Days 2-6 (5 days):**
4. Vendor processing

**Day 7:**
5. Vendor shipped

**Day 8 (Combined same day):**
6. Received
7. QC
8. Patient notified

**Total: 8 business days**

### Must Have Features:
- Click to update status
- Edit capability (move back if wrong stage)
- Notes section for each status update
- Vendor specification field
- Timestamp when status changes
- QC checklist (stage 7):
  - Correct frame ✓
  - Correct vision type (multifocal, SV near, SV distance) ✓
  - Frame and lenses in good condition ✓
  - Rx verified by auto lensometer within tolerance ✓
- Patient notification method (stage 8):
  - Left message
  - Spoke with patient
  - Texted with confirmation
  - Texted without confirmation
- Order views:
  - **Active orders** (not confirmed pickup)
  - **Orders waiting to be picked up** (confirmed notification)
- Timeline tracking:
  - Orders on schedule
  - Orders delayed

### Database Schema:

**Order Table:**
- `orderNumber` - Auto-generated (O-YYYYMMDD-XXXX)
- `quoteId` - Foreign key to Quote
- `customerId` - Patient reference
- `status` - Current status (1-8)
- `vendorName` - Vendor specification
- `createdAt` - Order creation timestamp
- `expectedDeliveryDate` - Day 8 calculated date
- `isDelayed` - Boolean (behind timeline)
- `isPickupConfirmed` - Boolean (patient notification confirmed)
- `totalAmount` - Order total

**OrderItem Table:**
- `orderId` - Foreign key to Order
- `productId`, `productName`, `sku`
- `quantity`, `unitPrice`, `lineTotal`

**OrderStatusHistory Table:**
- `orderId` - Foreign key to Order
- `status` - Status (1-8)
- `statusName` - "Invoiced", "Order placed", etc.
- `timestamp` - When status changed
- `notes` - Optional notes for this status
- `updatedBy` - Staff member

**OrderQC Table:**
- `orderId` - Foreign key to Order (one-to-one)
- `correctFrame` - Boolean
- `correctVisionType` - Boolean
- `visionType` - "Multifocal", "SV Near", "SV Distance"
- `goodCondition` - Boolean
- `rxVerifiedLensometer` - Boolean
- `qcPassedAt` - Timestamp
- `qcBy` - Staff member

**OrderNotification Table:**
- `orderId` - Foreign key to Order (one-to-one)
- `notificationMethod` - "Left message", "Spoke with patient", "Texted with confirmation", "Texted without confirmation"
- `notifiedAt` - Timestamp
- `notifiedBy` - Staff member

### Decision Point: STAGE 7 COMPLETE
**Test 1**: Create order from quote
- Order auto-generates number
- Order items match quote items
- Expected delivery date calculated (8 business days)

**Test 2**: Update order status
- Status changes from 1 → 2 → 3, etc.
- Timestamp recorded in OrderStatusHistory
- Notes save correctly

**Test 3**: QC checklist
- All checkboxes functional
- QC data saves to OrderQC table

**Test 4**: Patient notification
- Notification method saves
- Confirmed = moves to "waiting to be picked up"
- Not confirmed = stays in "active orders"

**Test 5**: Timeline tracking
- Orders on day 9+ flagged as delayed
- Dashboard shows on-time vs delayed

**Action**: If ALL PASS → Proceed to Stage 8. If FAIL → Fix order tracking.

---

## Stage 8: Analytics

### Functionality Goal
Track business metrics, system performance, and industry KPIs.

### Analytics Categories:

**Sales Metrics:**
- Total revenue by period (day, week, month, year)
- Insurance vs cash pay breakdown
- Average transaction value

**Product Metrics:**
- Top selling products
- Inventory levels

**Quote Metrics:**
- Conversion rate (DRAFT → ACCEPTED → CONVERTED)
- Average quote value
- Time to conversion

**Order Metrics:**
- Percent of orders completed within 8-day timeline
- Percent of orders delayed (outside timeline)
- Average days to completion
- Orders currently behind schedule
- Orders by status (1-8)

**Customer Metrics:**
- New customers by period
- Insurance carrier breakdown (VSP, EyeMed, Spectera)

**Industry KPIs (Capture Rates):**
- Retinal image screening
- OCT screening
- Visual field screening
- Frame capture rate
- Lens capture rate
- Second pair sales
- Neurolens capture
- Annual supply contact lens sales

**Medical Diagnostics:**
- Medical diagnostics testing (general)
- Medical fundus photos
- Medical OCTs (macula and optic nerve)
- Anterior segment photos
- Medical visual fields

### Database Schema:

**AnalyticsSnapshot Table** (daily aggregates):
- `date` - Date of snapshot
- `totalRevenue` - Daily revenue
- `insuranceRevenue` - Insurance portion
- `cashRevenue` - Cash portion
- `transactionCount` - Number of sales
- `newCustomers` - New customers added
- `quotesCreated` - Quotes created
- `quotesConverted` - Quotes converted to orders
- `ordersCreated` - Orders placed
- `ordersCompleted` - Orders delivered
- `ordersOnTime` - Orders within 8 days
- `ordersDelayed` - Orders past 8 days

**ProductAnalytics Table** (aggregated):
- `productId` - Foreign key to product
- `productName`, `productType`
- `unitsSold` - Total units
- `revenue` - Total revenue
- `period` - "daily", "weekly", "monthly", "yearly"

**KPICaptureRate Table** (daily):
- `date` - Date of capture
- `totalExams` - Total exams performed
- `retinalScreeningCount` - Retinal images sold
- `octScreeningCount` - OCT scans sold
- `visualFieldCount` - Visual fields sold
- `framesCaptured` - Frames sold
- `lensesCaptured` - Lenses sold
- `secondPairCount` - Second pairs sold
- `neurolensCount` - Neurolens sold
- `annualSupplyCLCount` - Annual supply CL sold
- `medicalDiagnosticsCount` - Medical diagnostics
- `medicalFundusCount` - Medical fundus photos
- `medicalOCTCount` - Medical OCTs
- `anteriorSegmentCount` - Anterior segment photos
- `medicalVisualFieldCount` - Medical visual fields

### Decision Point: STAGE 8 COMPLETE
**Test 1**: Sales metrics display
- Revenue totals calculate correctly
- Insurance vs cash breakdown accurate

**Test 2**: Order timeline analytics
- Percent on-time vs delayed displays
- Current delayed orders list shows

**Test 3**: Industry KPI capture rates
- Capture rates calculate correctly (sold / total exams)
- Medical diagnostics tracked separately

**Test 4**: Product analytics
- Top products display
- Revenue by product accurate

**Action**: If ALL PASS → System complete. If FAIL → Fix analytics queries.

---

## Build Order Summary

```
STAGE 1: Products & Inventory
    ↓ (verify all products have cash prices)
STAGE 2: Insurance Mapping
    ↓ (verify all products have tier assignments)
STAGE 3: Scanner + Price List Generation
    ↓ (verify extraction + 3 automated checks + human review)
STAGE 4: Patient Profile
    ↓ (verify authorization linked to customer)
STAGE 5: Patient Price List Display
    ↓ (verify price list accessible)
STAGE 6: Quote Generation
    ↓ (verify quote builder pricing)
STAGE 7: Order Tracking
    ↓ (verify order conversion)
STAGE 8: Analytics
    ↓ (verify metrics)
COMPLETE
```

---

## Critical Success Factors

1. **Complete Product Data**: Every product must have cash price and tier assignments for all carriers
2. **100% Data Fidelity**: Scanner must extract AND store ALL copay data
3. **Automated + Human Validation**: 3 automated checkpoints + human visual inspection before approval
4. **Accurate Price Calculation**: Price list must use tier-based pricing when mappings exist
5. **Sequential Validation**: Each stage must pass decision point before proceeding

---

## Validation Workflow (CRITICAL)

**The only validation that matters is what users see in the browser.**

### Three-Layer Validation

```
PDF → Database → API → UI Display
     ↑            ↑        ↑
   Layer 1    Layer 2   Layer 3 (MOST IMPORTANT)
```

Validating only Layer 1 (PDF → DB) will miss bugs where data is stored correctly but displayed incorrectly.

### Validation Commands

**Layer 3: UI Display Validation (USE THIS)**
```bash
npx playwright test e2e/validate-insurance-display.spec.ts --headed
```
- Loads actual browser and checks rendered DOM
- Validates insurance values display correctly (not "Not covered")
- This catches ALL display bugs

**Layer 2: API Response Validation**
```bash
npx tsx scripts/validate-ui-display.ts
```
- Checks what APIs return vs database values
- Faster but doesn't catch UI rendering issues

**Layer 1: PDF Extraction Validation**
```bash
npx tsx scripts/run-vsp-validation.ts
```
- Validates PDF → Database extraction
- Does NOT validate display

### When to Run Validations

| After This Action | Run This Validation |
|-------------------|---------------------|
| Processing insurance documents | UI Display (Layer 3) |
| Changing API routes | Restart server, then UI Display (Layer 3) |
| Extraction code changes | All three layers |
| Before reporting "X customers processed" | UI Display (Layer 3) |

### Key Files

- `/e2e/validate-insurance-display.spec.ts` - Playwright UI tests
- `/scripts/validate-ui-display.ts` - API validation script
- `/src/app/api/customers/[id]/authorization/route.ts` - Authorization API
- `/src/app/api/customers/[id]/insurance-summary/route.ts` - Summary banner API

### Lessons Learned

1. **VSP CL Exam Copay = Contact Lens Fitting** - Same value, different names. The `clExamCopay` DB column displays as "CL Fit" in UI.

2. **Prisma Decimal fields need `Number()` conversion** - Always wrap Decimal values in `Number()` when returning from APIs.

3. **After API changes, restart Next.js server** - Code changes don't take effect until server restarts.

---

## Stage 7: Insurance Verification Framework ✅ COMPLETE

**Status**: Implementation complete (2026-01-28)
**Purpose**: Systematic testing and validation of insurance extraction and pricing accuracy

### Components Implemented

1. **Database Schema** - Verification tracking tables
   - `verification_runs` - Track each verification run with status and summary
   - `verification_results` - Per-field results (expected vs extracted vs database)
   - `expected_values` - Ground truth values from PDFs

2. **Verification Pipeline** (`scripts/verify-insurance-pipeline.ts`)
   - Loads expected values from JSON files
   - Compares against database authorization data
   - Verifies VSP matrix codes and EyeMed tier pricing
   - Records pass/fail/warning status for each field
   - Generates summary reports

3. **Export Tools** (`scripts/export-verification-results.ts`)
   - CSV export for agent review
   - JSON export for programmatic access
   - HTML dashboard for visual audit

4. **Test Data Structure**
   ```
   /test-documents/
   ├── vsp/
   │   ├── auth/           # VSP authorization PDFs
   │   ├── lens/           # VSP lens enhancement PDFs
   │   └── expected/       # Expected values JSON files
   ├── eyemed/
   │   ├── benefits/       # EyeMed benefits PDFs
   │   └── expected/       # Expected values JSON files
   └── eops/               # End-of-period statements for final verification
   ```

### Usage

```bash
# Run VSP verification
npx tsx scripts/verify-insurance-pipeline.ts --carrier=VSP --format=json

# Run EyeMed verification
npx tsx scripts/verify-insurance-pipeline.ts --carrier=EyeMed --format=json

# Export results for agent review
npx tsx scripts/export-verification-results.ts --latest --format=csv

# Export HTML dashboard
npx tsx scripts/export-verification-results.ts --latest --format=html
```

### Verification Workflow

1. **Create Expected Values** - Manually extract values from PDFs into JSON files
2. **Run Verification** - Compare expected values against database
3. **Review Results** - Export CSV/HTML for agent verification
4. **Audit** - User spot-checks random samples against source PDFs
5. **EOP Validation** - Final proof using actual insurance company EOPs

### Current Test Coverage

- **VSP**: 5 customers with expected values (Susan McCrae, Tyler Richards, Sarah Rivera, Maritza Kuzian, Tamara Carr)
- **EyeMed**: 5 customers with expected values (Yuenmei Kwan, Thomas Chadwick, Joseph Hernandez, Emilia A'bell, Steven Zhang)

### Last Verification Run Results (2026-01-28)

**VSP**: 209 pass, 0 fail, 33 warnings (86.4% pass rate)
- Warnings are null values for fields not in all PDFs (expected behavior)

**EyeMed**: 15 pass, 0 fail, 0 warnings (100% pass rate)
- All base copays verified correctly

### Decision Point: STAGE 7 COMPLETE

**Test 1**: Verification runs without errors
```bash
npx tsx scripts/verify-insurance-pipeline.ts --carrier=ALL
```
**Result**: Runs complete with summary output

**Test 2**: Export generates valid files
```bash
ls reports/verification-results-*.csv
ls reports/verification-results-*.html
```
**Result**: Files exist and contain verification data

**Test 3**: No critical failures in expected fields
- Base copays (examCopay, materialsCopay, frameAllowance) all pass
- Matrix codes match expected values

---

## Stage 8: EyeMed Pricing Accuracy Fixes ✅ COMPLETE

**Status**: Implementation complete (2026-01-29)
**Purpose**: Fix EyeMed price list generation to correctly apply tier-based copays and discounts

### Issues Identified

1. **Extraction Normalization Missing** - Haiku extraction stored raw field names like `COPAYS_SINGLE_VISION_LENSES` but precompute expected normalized names like `singleVision`
2. **Missing Tier Mapping** - `high_index_174` was not in EYEMED_TIER_TO_COPAY
3. **Wrong Tier Assignment** - Technical Add-On had `eyemed: "all_other_lens_options"` but is VSP-only
4. **Database Tier Codes** - Hi-Index products had NULL tierEyemed values

### Fixes Implemented

1. **haiku-extraction.ts** - Added `buildEyemedNormalizedCopays()` function
   - Maps raw extracted keys to normalized field names
   - Flexible search across COPAYS_, COVERAGE_DETAILS_, and other sections
   - Handles "All Other Lens Options" 20% discount detection
   - Output now includes normalized copays for precompute compatibility

2. **insurance-tier-mappings.ts** - Updated tier mappings
   - Added `high_index_174: "DISCOUNT_20_PERCENT"` to EYEMED_TIER_TO_COPAY
   - Changed Technical Add-On to `eyemed: null` (VSP-only product)
   - Changed Hi-Index 1.72 to `eyemed: "all_other_lens_options"`

3. **Database Updates** - Updated lens_products table
   - Hi-Index 1.74: tierEyemed = "high_index_174"
   - Hi-Index 1.72: tierEyemed = "all_other_lens_options"
   - Technical Add-On: tierEyemed = null

### Pricing Categories (EyeMed)

| Category | Products | Pricing Method |
|----------|----------|----------------|
| `ins_benefit` | Single Vision, Bifocal, Trifocal, Polycarbonate, AR coatings, Transitions | Fixed copay from authorization |
| `ins_discount` | Hi-Index 1.67/1.72/1.74, Prism, Oversize (when covered Rx) | 20% off retail ("All Other Lens Options") |
| `cash_only` | Neurolens, Sequel, Stellest, Varilux I design, Technical Add-On | Full retail price |

### Verification Results (Angela Clayton - EyeMed)

After fixes:
- 12 cash_only products correctly identified
- 23 ins_discount products (20% off retail)
- 11 by_tier products with correct copays ($25 SV, $25 Bifocal, $40 Poly, etc.)

### Customer Selection Persistence Fix

Also fixed patient selection not persisting when navigating away:
- Added localStorage as backup to sessionStorage
- Updated quote-builder/page.tsx, customer-profile.tsx, customer-management.tsx
- Customer selection now survives browser refresh and tab navigation

### Decision Point: STAGE 8 COMPLETE

**Test 1**: EyeMed extraction produces normalized copay fields
```bash
npx tsx scripts/reprocess-angela.ts
# Output shows: singleVision: 25, bifocal: 25, polycarbonate: 40, etc.
```

**Test 2**: Price list shows correct pricing methods
- Visit customer profile > Price List tab
- Hi-Index products show "ins_discount" (not "cash_only")
- Technical Add-On shows "cash_only"

**Test 3**: Customer selection persists across navigation
- Select customer in Quote Builder
- Navigate away and return
- Customer is still selected

---

## Gate Checks (Go/No-Go)

- **Stage 1 Gate**: Zero products with NULL cash prices
- **Stage 2 Gate**: Zero products with NULL tier assignments
- **Stage 3 Gate**: All 3 automated checks PASS + human approval
- **Stage 4 Gate**: Authorization and price list linked to customer
- **Stage 5 Gate**: Price list accessible and displays correct prices
- **Stage 6 Gate**: Quote prices match CustomerPriceList exactly
- **Stage 7 Gate**: Orders auto-create from CONVERTED quotes
- **Stage 8 Gate**: Analytics display correct aggregated data

**Rule**: Do not proceed past a gate until all tests pass.

---

## Simplified Decision Tree

```
Start
  ↓
Products complete? → NO → Fix product data → Test again
  ↓ YES
Insurance mappings complete? → NO → Fix tier assignments → Test again
  ↓ YES
Scanner + Price List validated? → NO → Fix extraction/generation → Test again
  ↓ YES
Patient profile linked? → NO → Fix linkage → Test again
  ↓ YES
Price list accessible? → NO → Fix display → Test again
  ↓ YES
Quotes functional? → NO → Fix quote builder → Test again
  ↓ YES
Orders tracking? → NO → Fix order creation → Test again
  ↓ YES
Analytics working? → NO → Fix queries → Test again
  ↓ YES
LAUNCH READY
```

---

## Pricing Rules Reference (AUTHORITATIVE)

**Created:** 2026-01-29

### Three Pricing Categories

Every product falls into ONE of these categories:

#### 1. Insurance Benefit (`ins_benefit`)
Pricing defined by the member's insurance plan. Includes:
- **Flat copays** - e.g., Single Vision: $25
- **Tiered copays** - e.g., Progressive Tier 3: $110
- **Allowances** - e.g., Frame: $180 allowance, 20% off overage
- **Plan discounts** - e.g., "All Other Lens Options: 20% off retail"
- **Complex formulas** - e.g., Progressive Premium: $25 copay + 80% of (retail - $120 allowance)

**Rule:** If a product is a lens or lens option and NOT explicitly listed in the plan, it falls under "All Other Lens Options" and gets the plan's discount (typically 20% off retail for EyeMed).

#### 2. Provider Contract Discount (`contract_discount`)
Discounts we are contractually obligated to provide when part of a covered order. This is NOT an insurance benefit - it's our agreement with the carrier.

**Products in this category:**
- Oversize Lenses
- Prism

**Rule:** These get 20% off retail ONLY when bundled with a covered pair of glasses. If the patient is paying cash for everything, no contract discount applies.

**Flag:** `requiresCoveredRx: true`

#### 3. Cash Only (`cash_only`)
Products completely outside insurance. Patient pays full retail. No discounts.

**Products in this category:**
- Neurolens SV
- Neurolens Progressive
- Neurolens Premium AR
- Neurolens Blue AR
- Sequel Single Vision
- Sequel PAL
- Varilux I design
- Stellest

**Rule:** These are NEVER covered by insurance. Always full retail price regardless of carrier or plan.

---

### Pricing Methods Reference

| Method | Description | Example |
|--------|-------------|---------|
| `copay` | Flat dollar copay from plan | SV: $25 |
| `copay_plus_allowance` | Copay + percentage of amount over allowance | Progressive Premium: $25 + 80% of (retail - $120) |
| `ins_discount` | Percentage discount defined by insurance plan | All Other: 20% off |
| `allowance` | Dollar allowance, discount on overage | Frame: $180 allowance, 20% off overage |
| `contract_discount` | Provider contract discount (requires covered Rx) | Oversize: 20% off with covered glasses |
| `cash_only` | Full retail, no coverage | Neurolens: $700 |
| `covered` | $0 - fully covered by plan | Exam: $0 copay |

---

### EyeMed Specific Rules

#### "All Other Lens Options"
This is EyeMed's catch-all benefit. ANY lens option not explicitly listed gets this discount (typically 20% off retail).

**Applies to:**
- Materials not listed (Trivex, Hi-Index variants)
- AR coatings not in Standard tier
- Photochromic lenses
- Polarized lenses
- Blue light filters
- Specialty progressives not in tier list
- Edge treatments
- Tints beyond basic
- Any other lens enhancement

**Does NOT apply to:**
- Cash-only products (Neurolens, Sequel, Varilux I design, Stellest)
- Contract discount products when Rx is not covered

#### Progressive Premium Formula
Many EyeMed plans use: `$25 copay + 80% of (retail - $120 allowance)`

```
if (retail <= allowance) {
  patientPays = copay  // Just the copay, nothing extra
} else {
  overage = retail - allowance
  patientPays = copay + (overage * 0.80)
}
```

**Example:** Varilux Comfort Max @ $393.30 retail
- Copay: $25
- Allowance: $120
- Overage: $393.30 - $120 = $273.30
- Patient pays for overage: $273.30 × 0.80 = $218.64
- **Total: $25 + $218.64 = $243.64**

#### Age-Based Pricing
- **Polycarbonate (under 19):** $0 copay
- **Polycarbonate (19 and over):** $40 copay

System must check patient age and apply correct copay.

---

### Implementation Checklist

When building/updating pricing:

- [ ] Check if product is in "Cash Only" list → full retail
- [ ] Check if product is in "Contract Discount" list → 20% off IF covered Rx
- [ ] Otherwise, look up insurance benefit
- [ ] If no specific benefit found, use "All Other Lens Options" discount
- [ ] For complex formulas, implement copay + allowance + discount logic
- [ ] Check patient age for age-based copays

---

## Pricing Example: Angela Clayton (EyeMed)

**Member ID:** 20706244103 | **DOB:** 02/15/1970 (Age 55) | **Network:** Access 101 FF 360

### Benefits from Document

| Category | Benefit |
|----------|---------|
| Exam | $0 copay |
| Frame | $0 copay; 20% off balance over $180 allowance |
| Single Vision / Bifocal / Trifocal | $25 copay |
| Progressive - Standard | $25 copay |
| Progressive - Premium / Tier 4 | $25 copay + 80% of (retail - $120 allowance) |
| AR Coating - Standard | $45 |
| AR Coating - Premium | 20% off retail |
| Polycarbonate (age 19+) | $40 |
| Polycarbonate (under 19) | $0 |
| Scratch / Tint / UV | $15 |
| All Other Lens Options | 20% off retail |

### Calculated Price List

| Product | Retail | Patient Pays | Method |
|---------|--------|--------------|--------|
| **LENSES** |
| Single Vision | $80 | **$25** | copay |
| Essilor Eyezen+ | $129 | **$103** | ins_discount (All Other) |
| Flat Top 28 | $126 | **$25** | copay |
| Varilux Comfort DRx | $254 | **$132** | copay_plus_allowance |
| Varilux Comfort Max | $393 | **$244** | copay_plus_allowance |
| Varilux X Design | $600 | **$409** | copay_plus_allowance |
| Varilux I design | $480 | $480 | cash_only |
| Sequel PAL | $535 | $535 | cash_only |
| Neurolens Progressive | $700 | $700 | cash_only |
| **MATERIALS** |
| CR-39 (Standard) | $0 | **$0** | covered |
| Polycarbonate | $65 | **$40** | copay (age 19+) |
| Trivex | $85 | **$68** | ins_discount (All Other) |
| Hi-Index 1.67 | $125 | **$100** | ins_discount (All Other) |
| Hi-Index 1.74 | $175 | **$140** | ins_discount (All Other) |
| Hi-Index 1.72 | $150 | **$120** | ins_discount (All Other) |
| **AR COATINGS** |
| Crizal Easy Pro | $148 | **$118** | ins_discount (Premium AR) |
| Crizal Rock | $145 | **$116** | ins_discount (Premium AR) |
| Crizal Sapphire HR | $180 | **$144** | ins_discount (Premium AR) |
| Crizal Sunshield UV | $178 | **$15** | copay (UV Treatment) |
| Neurolens AR | $180 | $180 | cash_only |
| **PHOTOCHROMIC** |
| Transitions GEN S | $175 | **$140** | ins_discount (All Other) |
| Transitions XTRActive | $145 | **$116** | ins_discount (All Other) |
| **MOUNT FEES** |
| Full Rim | $0 | **$0** | covered |
| Semi Rimless | $35 | **$28** | ins_discount (All Other) |
| Rimless (drill) | $47 | **$38** | ins_discount (All Other) |
| **ADDONS** |
| UV Protection | $15 | **$15** | copay |
| Solid Tint | $18 | **$15** | copay |
| Essential Blue Series | $30 | **$24** | ins_discount (All Other) |
| Polarized | $156 | **$125** | ins_discount (All Other) |
| Oversize | $30 | **$24** | contract_discount |
| Prism | $8 | **$7** | contract_discount |

---

## Future Phase: Alpha/Beta Testing Infrastructure

### Price Accuracy Monitoring

**Error Tracking System**
Track when calculated prices are incorrect and need manual adjustment:
- Log price overrides with reason codes (extraction error, tier mismatch, formula issue)
- Dashboard showing products with frequent overrides
- Alert when same product fails for multiple customers (indicates tier mapping issue)
- Track correction patterns to improve extraction prompts

**Fallback Price Tracking**
Monitor how often fallback pricing is used:
- Count of products using "all_other_lens_options" 20% discount as fallback
- Count of products with no tier mapping (80% retail fallback)
- Percentage of orders with at least one fallback-priced item
- Flag products that should have tier mappings but don't

### Data Capture System

**Testing Phase Data Collection**
During alpha/beta, capture data to validate and improve the system:
- Log every extraction with raw OCR text + extracted JSON
- Store expected vs actual prices for each order
- Capture user corrections and reason codes
- Track time spent on manual adjustments per order

**EOP Validation**
Compare our calculated prices against actual EOPs (Explanation of Payment):
- Upload EOP documents after insurance processes claims
- Match our price list prices to EOP line items
- Flag discrepancies for investigation
- Build confidence scores for carrier/plan combinations

**Metrics to Track**
- Extraction accuracy rate by carrier
- Price calculation accuracy rate by product category
- Time saved vs manual pricing
- Manual intervention rate per order
- User satisfaction scores

---

**End of Build Plan**
