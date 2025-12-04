# Vision Benefits POS - Unified System Integration Plan

## Overview

Consolidate vision-pos, document-scanner, and pricing database into a unified cloud system with seamless user experience.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE (Single Project)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SHARED TABLES (All Apps Access)                                        │
│  ═══════════════════════════════                                        │
│  • Customer                    - Core patient data                      │
│  • CustomerInsurance           - Linked insurance policies              │
│  • CustomerAddress             - Billing/shipping addresses             │
│  • InsuranceDocument           - Scanned cards & auth forms             │
│  • InsuranceCase               - Grouped documents per verification     │
│  • InsuranceCarrier            - VSP, EyeMed, Spectera, etc.           │
│                                                                         │
│  PRICING ENGINE TABLES                                                  │
│  ═════════════════════                                                  │
│  • VspProgressiveFormulary     - VSP lens tiers & pricing              │
│  • VspArCoatingFormulary       - VSP AR coating tiers                  │
│  • EyemedProgressiveFormulary  - EyeMed lens tiers                     │
│  • EyemedArCoatingFormulary    - EyeMed AR coating tiers               │
│  • SpecteraProgressiveFormulary - Spectera lens tiers                  │
│  • SpecteraArCoatingFormulary  - Spectera AR coating tiers             │
│  • PracticeData                - Practice-specific UC prices & bundles │
│  • InsurancePlanBenefit        - Plan allowances, copays, frequencies  │
│                                                                         │
│  PRODUCT CATALOG                                                        │
│  ═══════════════                                                        │
│  • Product                     - Master product list                   │
│  • ProductCategory             - Frames, Lenses, Coatings, etc.        │
│  • ProductInsurancePricing     - Product price per plan/tier           │
│                                                                         │
│  POS-SPECIFIC TABLES                                                    │
│  ═══════════════════                                                    │
│  • Transaction                 - Sales records                         │
│  • TransactionItem             - Line items                            │
│  • Inventory                   - Stock levels per location             │
│  • InventoryMovement           - Stock changes audit trail             │
│  • User                        - Staff accounts                        │
│  • Location                    - Store locations                       │
│  • CustomerPriceList           - Cached customer-specific pricing      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │  Vision POS │ │  Document   │ │   Pricing   │
   │   (Next.js) │ │  Scanner    │ │   Admin     │
   │             │ │  (Next.js)  │ │  (Optional) │
   └─────────────┘ └─────────────┘ └─────────────┘
        │               │
        └───────┬───────┘
                │
    Deployed on Vercel (or similar)
```

---

## User Workflow: Customer Lookup & Verification

### Scenario: Sales Associate Opens POS

```
┌─────────────────────────────────────────────────────────────────┐
│  VISION POS - Customer Lookup                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Search Customer: [_______________________________] [Search]    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Results:                                                │   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │ John Smith | VSP | Member: VSP123456 | ✅ Verified  ││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │ Jane Doe | EyeMed | Member: EM789 | ⚠️ Needs Verify ││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [+ New Customer]                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Status Indicators

| Status | Icon | Meaning | Action |
|--------|------|---------|--------|
| **Verified** | ✅ | Insurance scanned & confirmed | Proceed to pricing |
| **Needs Verification** | ⚠️ | Insurance on file but not verified | Prompt to scan card |
| **No Insurance** | ❌ | No insurance linked | Ask for card or proceed as cash |
| **Expired** | 🔴 | Insurance info expired | Request new card |
| **New Customer** | 🆕 | Just created | Full intake needed |

---

## Workflow: Customer NOT in Database

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  CUSTOMER NOT FOUND                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  No customer found matching "John Doe"                          │
│                                                                 │
│  To create a new customer and verify their insurance:           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  STEP 1: Create Customer Profile                        │   │
│  │  ────────────────────────────────                       │   │
│  │  First Name: [____________]  Last Name: [____________]  │   │
│  │  Phone: [____________]       Email: [____________]      │   │
│  │  Date of Birth: [__/__/____]                            │   │
│  │                                                         │   │
│  │  [Continue →]                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─── OR ───                                                     │
│                                                                 │
│  [Proceed as Cash Patient]   [Cancel]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow: Customer Needs Insurance Verification

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  INSURANCE VERIFICATION REQUIRED                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Customer: John Smith                                           │
│  Insurance: VSP (not verified)                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  To verify insurance and get accurate pricing:          │   │
│  │                                                         │   │
│  │  📷 OPTION 1: Scan Insurance Card                       │   │
│  │  ─────────────────────────────────                      │   │
│  │  [Open Document Scanner]                                │   │
│  │  • Take photo of front & back of insurance card         │   │
│  │  • AI will extract benefits automatically               │   │
│  │  • Review & confirm extracted data                      │   │
│  │                                                         │   │
│  │  ✏️  OPTION 2: Manual Entry                              │   │
│  │  ─────────────────────────────                          │   │
│  │  [Enter Insurance Manually]                             │   │
│  │  • Type in member ID, group number, plan details        │   │
│  │  • Look up benefits in carrier portal                   │   │
│  │                                                         │   │
│  │  💵 OPTION 3: Skip for Now                               │   │
│  │  ─────────────────────────                              │   │
│  │  [Proceed with Retail Pricing]                          │   │
│  │  • Use full retail prices                               │   │
│  │  • Can apply insurance later                            │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Document Scanner Integration

### Embedded Scanner in POS

The document scanner will be accessible directly from the POS:

```
┌─────────────────────────────────────────────────────────────────┐
│  📷 SCAN INSURANCE CARD - John Smith                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │                      │  │                      │            │
│  │   FRONT OF CARD      │  │   BACK OF CARD       │            │
│  │                      │  │                      │            │
│  │  [Click to Upload]   │  │  [Click to Upload]   │            │
│  │       or Drag        │  │       or Drag        │            │
│  │                      │  │                      │            │
│  └──────────────────────┘  └──────────────────────┘            │
│                                                                 │
│  ─── OR ───                                                     │
│                                                                 │
│  📱 [Use Phone Camera]  (Opens mobile-friendly scanner)         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Processing Status:                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ✅ Front uploaded                                       │   │
│  │  ✅ Back uploaded                                        │   │
│  │  ⏳ Processing with AI... (extracting benefits)          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Cancel]                                        [Processing...] │
└─────────────────────────────────────────────────────────────────┘
```

### After AI Processing

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ INSURANCE VERIFIED - John Smith                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Extracted Information:                      Confidence: 94%    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Carrier:        VSP                           [Edit]   │   │
│  │  Member ID:      VSP123456789                  [Edit]   │   │
│  │  Group Number:   GRP-ACME-001                  [Edit]   │   │
│  │  Plan Name:      VSP Choice                    [Edit]   │   │
│  │  Network Tier:   Tier J (Premium)              [Edit]   │   │
│  │  ────────────────────────────────────────────────────   │   │
│  │  BENEFITS:                                              │   │
│  │  Exam Copay:        $0                                  │   │
│  │  Materials Copay:   $25                                 │   │
│  │  Frame Allowance:   $150                                │   │
│  │  Lens Allowance:    Covered in full (Tier J)            │   │
│  │  Contact Allowance: $150                                │   │
│  │  ────────────────────────────────────────────────────   │   │
│  │  Effective:    01/01/2025                               │   │
│  │  Expires:      12/31/2025                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚠️  Please verify this information with the patient            │
│                                                                 │
│  [← Back]              [Confirm & Save]        [Edit Details]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pricing Flow After Verification

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 CUSTOMER PRICING - John Smith (VSP Tier J)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Insurance: VSP Choice | Tier J | Frame Allowance: $150         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PRODUCT              RETAIL    INSURANCE   YOU PAY     │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Ray-Ban RB5154       $189.00   -$150.00    $39.00     │   │
│  │  Varilux Comfort      $350.00   -$350.00    $0.00      │   │
│  │  Crizal Sapphire      $175.00   -$87.50     $87.50     │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  SUBTOTAL             $714.00   -$587.50    $126.50    │   │
│  │  Materials Copay                            +$25.00     │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  TOTAL DUE                                  $151.50    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Edit Order]           [Save Quote]          [Proceed to Pay]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Design

### Shared API Endpoints (accessed by both POS and Scanner)

```
/api/customers
  GET    /                     - Search/list customers
  POST   /                     - Create new customer
  GET    /:id                  - Get customer with insurance status
  PUT    /:id                  - Update customer

/api/customers/:id/insurance
  GET    /                     - Get all insurance records
  POST   /                     - Add insurance record
  PUT    /:insuranceId         - Update insurance record

/api/customers/:id/documents
  GET    /                     - Get all scanned documents
  POST   /                     - Upload new document
  GET    /:docId               - Get document with extracted data
  PUT    /:docId/verify        - Mark document as verified

/api/pricing
  GET    /formulary/:carrier   - Get formulary for carrier
  GET    /calculate            - Calculate pricing for customer + products
  POST   /quote                - Generate and save a quote

/api/products
  GET    /                     - List products with category filter
  GET    /:id/pricing/:carrier - Get product pricing for specific carrier
```

### Scanner-Specific Endpoints

```
/api/scanner
  POST   /upload               - Upload document image
  POST   /process              - Trigger AI extraction
  GET    /status/:jobId        - Check processing status
  POST   /extract              - Manual re-extraction
```

---

## Implementation Phases

### Phase 1: Database Consolidation (Week 1)
- [ ] Create unified Prisma schema with all tables
- [ ] Set up Supabase project (or use existing)
- [ ] Migrate formulary data from local Docker to Supabase
- [ ] Update vision-pos to use new schema
- [ ] Test basic CRUD operations

### Phase 2: Customer Verification UI (Week 2)
- [ ] Build customer search with status indicators
- [ ] Create "Customer Not Found" flow
- [ ] Create "Needs Verification" prompt
- [ ] Add manual insurance entry form
- [ ] Integrate status badges throughout POS

### Phase 3: Scanner Integration (Week 3)
- [ ] Embed scanner component in POS
- [ ] Connect scanner to shared Supabase
- [ ] Build document upload flow
- [ ] Integrate AI extraction (GPT-4 Vision)
- [ ] Create verification review screen
- [ ] Auto-update customer insurance after verification

### Phase 4: Pricing Engine (Week 4)
- [ ] Build pricing calculation API
- [ ] Connect formulary lookups
- [ ] Implement tier-based discounts
- [ ] Create quote builder UI
- [ ] Add price override capabilities
- [ ] Cache customer-specific pricing

### Phase 5: Polish & Deploy (Week 5)
- [ ] End-to-end testing
- [ ] Error handling & edge cases
- [ ] Mobile responsiveness
- [ ] Deploy to Vercel
- [ ] Staff training documentation

---

## Technical Decisions

### Framework
- **Next.js 14+** with App Router for both POS and Scanner
- **Prisma** ORM for database access
- **Supabase** for PostgreSQL hosting + auth (optional)
- **Vercel** for deployment

### Scanner Component Options
1. **Iframe embed** - Scanner as separate app, embedded in POS
2. **Shared component library** - Extract scanner UI as npm package
3. **Monorepo** - Both apps in same repo, shared code

**Recommendation**: Monorepo with shared components (using Turborepo or Nx)

### AI Processing
- **Google Document AI** - OCR and structure extraction
- **GPT-4 Vision** - Intelligent benefit extraction
- Process asynchronously, poll for results

---

## Open Questions

1. **Authentication**: Shared auth across apps? (Supabase Auth recommended)
2. **Mobile scanning**: Native camera access or file upload?
3. **Offline support**: Needed for remote locations?
4. **Multi-location**: Different pricing per location?
5. **Audit trail**: Log all insurance verifications?

---

## Next Steps

1. Review and approve this plan
2. Decide on open questions above
3. Begin Phase 1: Database consolidation

---

## SESSION LOG: December 1, 2025

### COMPLETED TODAY

#### 1. Insurance Carrier Product Mappings ✅
All three carriers now have product-to-tier mappings loaded in the database:

| Carrier | Table | Products | Tier System |
|---------|-------|----------|-------------|
| **VSP** | `product_vsp_code_mapping` | 120 | Letter codes (NA, FA, JA, KA, QV, etc.) |
| **EyeMed** | `product_eyemed_tier_mapping` | 121 | Numbered (standard, tier_1 through tier_5) |
| **Spectera** | `product_spectera_tier_mapping` | 121 | Roman numerals (I, II, III, IV, V) |

#### 2. Pricing Calculators Tested ✅
All three carrier pricing calculators are working. Test scripts created:
- `scripts/test-vsp-pricing.ts`
- `scripts/test-eyemed-pricing.ts`
- `scripts/test-spectera-pricing.ts`

**Sample Results (Same Package Across All Carriers):**
```
Package: Shamir Autograph Intelligence + Hi-Index 1.67 + Crizal Sapphire + Transitions
Retail: $1,061.10

VSP:      Patient pays $433.00 | Insurance pays $628.10
EyeMed:   Patient pays $425.00 | Insurance pays $636.10
Spectera: Patient pays $495.00 | Insurance pays $566.10
```

#### 3. VSP Authorization Schema ✅
Added Prisma models for storing VSP authorization data:
- `VspAuthorization` - Patient record report (copays, allowances)
- `VspLensEnhancementCopay` - Per-code copays from auth

#### 4. Seed Scripts Created ✅
- `scripts/seed-vsp-product-mapping.ts`
- `scripts/seed-eyemed-product-mapping.ts`
- `scripts/seed-spectera-product-mapping.ts`

---

### IN PROGRESS - RESUME HERE

#### Contact Lens & Services Database
**Status:** Schema design started, not completed

**Files to use:**
- Contact lenses: `/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/Contact Lens _ Price List - Sheet1.csv`
  - 87 contact lens products (Alcon, Cooper, J&J, B&L)
  - Fields: Manufacturer, Lens name, Price, Box Size, Annual Supply qty

- Services: `/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/Master_Fee_Schedule_ABC.csv`
  - ~398 services (exams, procedures, fittings, etc.)
  - Fields: Category, Description, Code, Original Price, Final Price

**Next actions:**
1. Add `ContactLens` model to Prisma schema
2. Add `Service` model to Prisma schema
3. Create seed scripts to load both
4. Add insurance tier mappings for contact lenses (VSP/EyeMed/Spectera)

---

### TODO - NOT STARTED

1. **EyeMed & Spectera Authorization Schemas** - Similar to VSP, store auth data
2. **PDF Extraction Service** - Parse authorization PDFs to populate auth tables
3. **UI Components** - Build frontend for scanning/pricing
4. **Frame Database** - Load frames from `frames_pricebook.csv` (419KB file)

---

### KEY FILES REFERENCE

**Product Tier Mapping CSVs:**
- `/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/VSP_PRODUCT_CODE_MAPPING.csv`
- `/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/EYEMED_PRODUCT_TIER_MAPPING.csv`
- `/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/SPECTERA_PRODUCT_TIER_MAPPING.csv`

**Source Price Data:**
- `/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/Lenses_pricebook_final.csv` (169 lens products)
- `/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/Contact Lens _ Price List - Sheet1.csv` (87 CLs)
- `/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/Master_Fee_Schedule_ABC.csv` (398 services)
- `/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/frames_pricebook.csv` (frames)

**Sample VSP Authorization (for testing):**
- `/Users/cmac/Documents/sample-docs/Insurance Auths/AB-vsp-auth-1.pdf` (Patient Record Report)
- `/Users/cmac/Documents/sample-docs/Insurance Auths/AB-vsp-lens-1.pdf` (Lens Enhancement Charges)

**Schema Files:**
- `/Users/cmac/Documents/Supporting Documents/vsp_dynamic_schema_v1.md`
- `/Users/cmac/Documents/Supporting Documents/eyemed_dynamic_schema_v1.md`
- `/Users/cmac/Documents/Supporting Documents/spectera_dynamic_schema_v3.md`
