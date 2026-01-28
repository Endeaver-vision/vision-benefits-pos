# Vision POS Build Plan

**Last Updated**: 2026-01-27
**Architecture**: See `vision-pos-architecture.pdf` and `vision-pos-diagram-v5.jsx`
**Current Focus**: Stage 3 - Scanner + Price List Generation (VSP material SV/MF pricing complete)

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

**End of Build Plan**
