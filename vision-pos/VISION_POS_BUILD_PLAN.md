# Vision POS Build Plan

**Last Updated**: 2026-01-20
**Architecture**: See `vision-pos-architecture.pdf` and `vision-pos-diagram-v5.jsx`

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

**VSP** ⏳ NOT YET TESTED
- GPT extraction schema may need updates
- Tier mappings exist in TypeScript file
- Needs test documents

**Spectera** ⏳ NOT YET TESTED
- GPT extraction schema may need updates
- Tier mappings exist in TypeScript file
- Needs test documents

**Action**: EyeMed ready for production use. Test VSP/Spectera with real documents.

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
- Export to PDF/CSV 🔄 (not yet implemented - optional)

### Implementation: CustomerPricePlan Component
**Location**: `src/components/customers/customer-price-plan.tsx`
**API**: `src/app/api/customers/[id]/price-plan/route.ts`

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
