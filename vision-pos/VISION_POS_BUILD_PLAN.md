# Vision POS Build Plan

**Last Updated**: 2026-01-13
**Architecture**: See `vision-pos-architecture.pdf` and `vision-pos-diagram-v5.jsx`

---

## System Overview

Vision POS is a quote flow and point-of-sale system for optical practices. The system follows a **sequential data flow** to generate accurate patient quotes based on insurance benefits and product catalog.

### 8 Components (7 with Databases):

1. **Products & Inventory** (Blue) - DATABASE
2. **Insurance Mapping** (Indigo) - DATABASE
3. **Insurance Scanner** (Purple) - Processing only, NO DATABASE
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

**Status**: All 4 migration steps complete (2026-01-13)
**Result**: 916 tier mappings consolidated into unified `carrier_tiers` table

### Functionality Goal
Single source of truth for all product-to-carrier tier assignments. The scanner reads ONE table.

---

### Architecture: Unified carrier_tiers Table

```
PRICE GENERATION FLOW:
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   CARRIER_TIERS     │      │  PATIENT AUTH       │      │ CUSTOMER_PRICE_LIST │
│   (universal)       │  +   │  (scanned form)     │  =   │ (personalized)      │
├─────────────────────┤      ├─────────────────────┤      ├─────────────────────┤
│ Product: Varilux X  │      │ Patient: John Smith │      │ John Smith          │
│ Carrier: VSP        │      │ Carrier: VSP        │      │ ─────────────────── │
│ Tier: KA            │      │ KA Copay: $95       │      │ Varilux X: $95      │
│                     │      │ Frame Allow: $150   │      │ Frame: $150 allow   │
│ Product: Crizal     │      │ Exam Copay: $10     │      │ Crizal: $55         │
│ Carrier: VSP        │      │ QV Copay: $55       │      │ Exam: $10           │
│ Tier: QV            │      │                     │      │                     │
│                     │      │                     │      │                     │
│ Product: Exam       │      │                     │      │                     │
│ Carrier: VSP        │      │                     │      │                     │
│ Tier: exam_copay    │      │                     │      │                     │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
        │                              │                           │
        │         SCANNER             │                           │
        └──────────────►──────────────┘                           │
                              │                                    │
                              └────────────► GENERATES ───────────┘
```

**Key Principle**: Scanner reads carrier_tiers + patient authorization → outputs customer_price_list. One table to maintain. One table to query.

---

### Database Schema: carrier_tiers

```sql
CREATE TABLE carrier_tiers (
  id              TEXT PRIMARY KEY,

  -- Product reference (polymorphic)
  productType     TEXT NOT NULL,  -- 'LENS', 'SERVICE', 'MATERIAL', 'ADDON'
  productId       TEXT NOT NULL,  -- FK to lens_products, service_prices, or products
  productName     TEXT NOT NULL,  -- Denormalized for easy queries

  -- Carrier assignment
  carrier         TEXT NOT NULL,  -- 'VSP', 'EYEMED', 'SPECTERA'
  tierCode        TEXT NOT NULL,  -- e.g., 'KA', 'tier_3', 'exam_copay', '80_uc'
  tierLabel       TEXT,           -- Human readable: "Progressive Tier 2"

  -- Pricing rule
  pricingRule     TEXT NOT NULL,  -- 'TIER_COPAY', '80_UC', 'ALLOWANCE', 'INCLUDED', 'CASH_ONLY'

  -- Timestamps
  createdAt       TIMESTAMP DEFAULT NOW(),
  updatedAt       TIMESTAMP,

  UNIQUE(productType, productId, carrier)
);

CREATE INDEX idx_carrier_tiers_carrier ON carrier_tiers(carrier);
CREATE INDEX idx_carrier_tiers_lookup ON carrier_tiers(carrier, tierCode);
```

---

### Pricing Rules Explained

| pricingRule | Meaning | Example |
|-------------|---------|---------|
| `TIER_COPAY` | Patient pays copay from auth form | Progressive KA → $95 copay |
| `80_UC` | Patient pays 80% of retail (U&C) | Specialty lens → 80% of $400 = $320 |
| `ALLOWANCE` | Apply allowance, patient pays overage | Frame $250, allowance $150 → $100 |
| `INCLUDED` | Covered at $0 copay | Roll & polish, basic adjustments |
| `CASH_ONLY` | Not covered, full retail | Optomap, Neurolens, specialty CL fits |

---

### Products Requiring Tier Mapping

**Lens Products** (complex tier codes):
- Progressives: VSP (JA, KA, LA, MA, NA, OA), EyeMed (tier_1-5), Spectera (I-V)
- Single Vision: VSP (AA, BA), EyeMed (standard, digital_sv), Spectera (standard)
- AR Coatings: VSP (QM, QP, QR, QT, QV), EyeMed (Standard, Tier1-3), Spectera (tier_I-V)
- Materials: VSP (AD, BH, BJ), EyeMed (polycarbonate, high_index), Spectera (same)
- Photochromic: VSP (DA, FA, GA, PR), EyeMed (photochromic), Spectera (photochromic)
- Polarized: VSP (MP, MN), EyeMed (polarized), Spectera (polarized)

**Services** (simple mappings):
- Routine Vision Exam → `exam_copay` (all carriers)
- Refraction → `exam_copay` (included with exam)
- CL Fitting (Sphere, Toric, Multifocal, Monovision) → `cl_fitting_copay` (VSP), `CASH_ONLY` (EyeMed/Spectera)
- Optomap, OCT, Visual Fields → `CASH_ONLY` (all carriers)

---

### Migration Plan

**Step 1**: Create new `carrier_tiers` table
- **STATUS: COMPLETE** (2026-01-13)
- Created `carrier_tiers` table via Supabase migration
- Added to Prisma schema as `CarrierTier` model
- Indexes created: carrier, carrier+tierCode, productType+carrier
- Unique constraint: productType + productId + carrier

**Step 2**: Migrate existing data
- **STATUS: COMPLETE** (2026-01-13)
- FROM `lens_carrier_tiers` (389 rows) → carrier_tiers ✓
- FROM `products.tierVsp/tierEyemed/tierSpectera` columns → carrier_tiers ✓
- FROM `service_prices.tierVsp/tierEyemed/tierSpectera` columns → carrier_tiers ✓

**Migration Results:**
| Carrier | Total Mappings |
|---------|----------------|
| VSP | 327 |
| EyeMed | 325 |
| Spectera | 264 |
| **TOTAL** | **916** |

**By Product Type & Pricing Rule:**
- LENS: 637 (TIER_COPAY: 633, 80_UC: 4)
- SERVICE: 144 (TIER_COPAY: 28, CASH_ONLY: 116)
- ADDON: 120 (TIER_COPAY: 76, 80_UC: 30, INCLUDED: 14)
- MATERIAL: 15 (TIER_COPAY: 15)

**Step 3**: Update scanner to read from `carrier_tiers` only
- **STATUS: COMPLETE** (2026-01-13)
- Updated all API routes to read tier codes from `carrier_tiers` table
- Removed all reads from `product.tierVsp/tierEyemed/tierSpectera` columns
- Removed all reads from `service_prices.tierVsp/tierEyemed/tierSpectera` columns
- Removed relation include on `lensCarrierTiers`

**Files Updated:**
- `src/lib/services/price-mapping-service.ts` - Main price generation, now uses `buildCarrierTierMap()` helper
- `src/app/api/pricing/calculate/route.ts` - Uses `prisma.carrierTier.findMany()` for tier lookups
- `src/app/api/customers/[id]/insurance-summary/route.ts` - Updated `getTierProductMappings()`
- `src/app/api/quote-builder/products/route.ts` - Uses `getVspTierProductIds()` for cash-pay detection
- `src/app/api/pricing/services/route.ts` - Uses `getServiceTierMappings()` helper
- `src/lib/services/unified-pricing-service.ts` - Updated lens lookup to query carrier_tiers

**Step 4**: Drop old tier columns and `lens_carrier_tiers` table
- **STATUS: COMPLETE** (2026-01-13)
- Removed columns from `Product` model: tierVsp, tierEyemed, tierSpectera
- Removed columns from `ServicePrice` model: tierVsp, tierEyemed, tierSpectera
- Removed `LensCarrierTier` model entirely (junction table)
- Removed `carrierTiers` relation from `LensProduct` model
- Updated all TypeScript code to use `carrier_tiers` table queries

**Files Updated for Step 4:**
- `prisma/schema.prisma` - Removed tier columns and LensCarrierTier model
- `src/app/api/admin/carrier-tiers/route.ts` - Removed legacy mapping stats
- `src/app/api/customers/[id]/price-plan/route.ts` - Updated tier lookup
- `src/app/api/health/route.ts` - Removed tier display
- `src/app/api/pos/products/route.ts` - Updated lens tier fallback lookup
- `src/app/api/products/route.ts` - Updated tier filtering
- `src/app/api/quote/route.ts` - Updated product/lens tier lookups
- `src/lib/services/price-list-precompute.ts` - Updated lens tier fetching

---

### UI Verification: /admin/carrier-tiers
**Route**: `/admin/carrier-tiers`
**Purpose**: Visual verification of carrier tier mappings
**STATUS: IMPLEMENTED** (2026-01-13)

**Display Requirements**:
- Summary cards showing mapping counts per carrier (VSP, EyeMed, Spectera)
- Products missing mappings (highlighted in red)
- Filter by: carrier, productType, pricingRule
- Ability to view/edit individual tier assignments ✅
- Export to CSV for audit ✅
- Coverage percentage indicator (e.g., "VSP: 95% mapped") ✅

**Tabs**:
1. **Overview** - Summary stats and coverage percentages ✅
2. **By Carrier** - Filter view per carrier (VSP, EyeMed, Spectera tabs) ✅
3. **Missing Mappings** - Products needing tier assignments ✅
4. **Bulk Edit** - Assign tiers to multiple products (future)

**Edit Functionality** (2026-01-13):
- Edit modal with tier code, tier label, and pricing rule fields
- Carrier-specific tier code suggestions (VSP: KA, JA, QV... | EyeMed: tier_1-5 | Spectera: tier_I-V)
- Pricing rules: TIER_COPAY, 80_UC, ALLOWANCE, INCLUDED, CASH_ONLY
- Save via POST API with upsert logic

**Files Created**:
- `src/app/admin/carrier-tiers/page.tsx` - Admin UI page with edit modal
- `src/app/api/admin/carrier-tiers/route.ts` - API endpoint for CRUD operations

### Decision Point: STAGE 2 COMPLETE

**Test 1**: All lens products have tier mappings for all 3 carriers
```sql
SELECT lp.name,
  COUNT(CASE WHEN ct.carrier = 'VSP' THEN 1 END) as vsp,
  COUNT(CASE WHEN ct.carrier = 'EYEMED' THEN 1 END) as eyemed,
  COUNT(CASE WHEN ct.carrier = 'SPECTERA' THEN 1 END) as spectera
FROM lens_products lp
LEFT JOIN carrier_tiers ct ON ct.productId = lp.id AND ct.productType = 'LENS'
GROUP BY lp.id, lp.name
HAVING COUNT(CASE WHEN ct.carrier = 'VSP' THEN 1 END) = 0
    OR COUNT(CASE WHEN ct.carrier = 'EYEMED' THEN 1 END) = 0
    OR COUNT(CASE WHEN ct.carrier = 'SPECTERA' THEN 1 END) = 0;
```
**Result**: Query returns 0 rows (all products mapped)

**Test 2**: All covered services have tier mappings
```sql
SELECT sp.name
FROM service_prices sp
WHERE sp.category IN ('EXAM', 'CONTACT_LENS_FIT')
  AND NOT EXISTS (
    SELECT 1 FROM carrier_tiers ct
    WHERE ct.productId = sp.id AND ct.productType = 'SERVICE'
  );
```
**Result**: Query returns 0 rows

**Test 3**: Scanner can query single table
```sql
-- This single query returns all tier info for a carrier
SELECT productType, productName, tierCode, tierLabel, pricingRule
FROM carrier_tiers
WHERE carrier = 'VSP'
ORDER BY productType, productName;
```
**Result**: Returns all VSP mappings in one query

**UI Check**: Navigate to /admin/carrier-tiers → All 3 carriers show 100% coverage
**Action**: If ALL PASS → Proceed to Stage 3. If FAIL → Fix tier assignments.

---

## Stage 3: Insurance Scanner + Price List Generation 🔄 IN PROGRESS

**Status**: Backend complete, admin review UI added (2026-01-14)
**Remaining**: End-to-end testing

### Functionality Goal
Extract benefit data from insurance documents AND generate complete patient price list with validation.

### Implementation Status:

**Backend Pipeline** ✅ COMPLETE
- Document upload → `/api/documents/upload` route
- OCR processing → integrated with OpenAI Vision
- GPT-4o extraction → `src/lib/services/ocr/gpt-extraction.ts`
- Authorization creation → all 3 carriers (VSP, EyeMed, Spectera)
- Price precomputation → `src/lib/services/price-list-precompute.ts`
- Customer price list storage → `customer_price_lists` table

**Scanner UI** ✅ COMPLETE
- Customer selection flow → `/scanner` page
- Multi-document upload
- Real-time processing status
- Extracted benefits display
- Auto-verification trigger

**Admin Review Queue** ✅ COMPLETE (2026-01-14)
- Pending documents queue → `/admin/scanner` page
- Extraction validation checkpoints (4 checks):
  - Carrier detected ✓
  - Patient info extracted ✓
  - Copays extracted ✓
  - Confidence threshold (70%) ✓
- Price list generation summary (when verified)
- Low confidence warnings (< 70%)
- Verify & Generate Prices action

**Files Created/Updated:**
- `src/app/admin/scanner/page.tsx` - Admin scanner queue UI
- `src/app/api/customers/[id]/precompute-prices/route.ts` - Added GET for stats
- `src/app/api/documents/[id]/verify/route.ts` - Verification + price generation

### Process Flow:
1. **Upload** → Insurance document (PDF/image)
2. **Extract** → GPT-4o extracts benefit data
3. **Store** → Save to authorization database (VSP, EyeMed, or Spectera table)
4. **Generate** → Build patient price list (all products)
5. **Validate** → Automated redundancy checks
6. **Review** → Human visual inspection

### Extraction Data Points:
- Member ID, Group Number, Plan Name
- Exam Copay, Materials Copay, Frame Allowance
- Progressive lens copays (Standard, Tier 1-5)
- Material copays (Polycarbonate adult/child, Trivex, High Index)
- Enhancement copays (Photochromic, Polarized, AR Coatings, Tint, Blue Light Filter)
- Special rules (frame overage, age-based rules)

### Automated Redundancy Checkpoints:

**Checkpoint 1: Extraction Completeness**
```sql
-- Verify all critical copay fields populated
SELECT
  CASE
    WHEN progressiveTier1Copay IS NULL THEN 'MISSING: Progressive Tier 1'
    WHEN progressiveTier2Copay IS NULL THEN 'MISSING: Progressive Tier 2'
    WHEN polycarbonateAdultCopay IS NULL THEN 'MISSING: Polycarbonate'
    WHEN photochromicCopay IS NULL THEN 'MISSING: Photochromic'
    ELSE 'COMPLETE'
  END AS validation_status
FROM EyemedAuthorization
WHERE id = [auth_id];
```
**Result**: Status = "COMPLETE"

**Checkpoint 2: Price List Completeness**
```sql
-- Verify all products have prices
SELECT COUNT(*) as missing_prices
FROM CustomerPriceList
WHERE customerId = [customer_id]
  AND authorizationId = [auth_id]
  AND finalPrice IS NULL;
```
**Result**: missing_prices = 0

**Checkpoint 3: Tier-Based Pricing Ratio**
```sql
-- Verify most products use tier-based pricing
SELECT
  COUNT(*) as total_products,
  SUM(CASE WHEN needsTierAssignment = false THEN 1 ELSE 0 END) as tier_based,
  SUM(CASE WHEN needsTierAssignment = true THEN 1 ELSE 0 END) as fallback_80pct,
  ROUND(100.0 * SUM(CASE WHEN needsTierAssignment = false THEN 1 ELSE 0 END) / COUNT(*), 1) as tier_based_percentage
FROM CustomerPriceList
WHERE customerId = [customer_id];
```
**Result**: tier_based_percentage > 70%

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

### Decision Point: STAGE 3 COMPLETE
**Automated Check**: All 3 redundancy checkpoints PASS
**Human Check**: Staff clicks "Approve & Save"
**Action**: If BOTH PASS → Proceed to Stage 4. If FAIL → Fix and regenerate.

---

## Stage 4: Patient Profile

### Functionality Goal
Link authorization and price list to patient record.

### Must Have:
- Customer demographics complete
- Authorization linked to customer
- Price list linked to customer
- Customer profile displays:
  - Active insurance info
  - Authorization details
  - Price list status

### Decision Point: STAGE 4 COMPLETE
**Test**: Navigate to customer profile page
**Result 1**: Authorization displays in Insurance tab
**Result 2**: Price list displays (250+ products)
**Result 3**: Patient can be selected for quote building
**Action**: If PASS → Proceed to Stage 5. If FAIL → Fix profile linkage.

---

## Stage 5: Patient Price List (Display & Access)

### Functionality Goal
Provide access to patient-specific pricing for quote building.

### Must Have:
- Price list accessible from customer profile
- Prices match generated values from Stage 3
- Search/filter functionality
- Manual price override capability (with audit trail)
- Export to PDF/CSV

### UI Verification: /customers/[id]/price-list
**Route**: `/customers/[id]/price-list` (accessible from customer profile)
**Purpose**: Visual verification of patient-specific pricing

**Display Requirements**:
- Customer name and insurance info header
- Price list generation date and authorization source
- Product categories with expandable sections
- Columns: Product Name, Retail Price, Insurance Price, Savings, Pricing Rule
- Visual indicators for pricing rule (Tier-Based ✓, 80% U&C ⚠, Cash Only ✗)
- Search and filter by product name/category
- Export to PDF button
- "Regenerate Prices" button (triggers new price list from authorization)

**Summary Stats**:
- Total products priced
- Tier-based pricing count (%)
- Fallback pricing count (%)
- Cash-only count

### Decision Point: STAGE 5 COMPLETE
**Test 1**: View price list in customer profile
**Test 2**: Search for "Varilux" products
**Test 3**: Verify prices match Stage 3 generated values
**UI Check**: Navigate to /customers/[id]/price-list → All products display with correct pricing rules
**Action**: If PASS → Proceed to Stage 6. If FAIL → Fix price list display.

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
