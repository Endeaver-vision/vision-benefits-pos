# VisionPOS Integration Context Document

**Purpose:** This document provides complete context for implementing the integration between insurance authorization scanning and point-and-click POS pricing.

**Problem Statement:** The scanner successfully extracts insurance data and saves it to the database. The POS menus exist. But there's no bridge connecting them - the menus use hardcoded pricing instead of querying the patient's actual insurance benefits.

---

## Table of Contents

1. [Current System Architecture](#1-current-system-architecture)
2. [The Integration Gap](#2-the-integration-gap)
3. [Data Flow Diagram](#3-data-flow-diagram)
4. [Database Schema (Key Tables)](#4-database-schema-key-tables)
5. [Existing Services & Types](#5-existing-services--types)
6. [What Needs to Be Built](#6-what-needs-to-be-built)
7. [Implementation Approach](#7-implementation-approach)

---

## 1. Current System Architecture

### What Exists and Works

#### Scanner System (`/src/app/scanner/page.tsx`)
- **Flow:** Select Customer → Upload Document → GPT Processing → Review → Verify & Save
- **Output:** Creates carrier-specific authorization records in database
- **Carriers Supported:** VSP, EyeMed, Spectera

#### Authorization Storage (Prisma Models)
Each carrier has its own authorization table with full benefit details:

**VSP:** `VspAuthorization` + `VspLensEnhancementCopay`
- Plan type (Signature, Choice, Advantage)
- Exam/materials copays
- Frame allowances (retail vs Marchon)
- Contact allowance
- Lens enhancement copays by VSP code

**EyeMed:** `EyemedAuthorization` + `EyemedArCoatingCopay` + `EyemedLensOptionCopay`
- Exam/materials copays
- Frame allowance + overage discount %
- Progressive tiers 1-5 copays
- AR coating tiers 1-3 copays
- Material copays (poly, hi-index, trivex)

**Spectera:** `SpecteraAuthorization` + `SpecteraArCoatingCopay` + `SpecteraLensOptionCopay`
- Exam copays (pediatric, maternity, adult)
- Frame allowance + overage %
- Progressive tiers I-V copays
- AR coating tiers I-IV copays
- Contact lens allowances (selection vs non-selection)

#### Product Catalogs
- `LensProduct` with `LensCarrierTier` → maps each lens to carrier tier codes
- `Frame` with retail prices
- `ContactLens` with carrier categories
- `ServicePrice` with carrier allowances

#### Pricing Services (Exist but not connected to UI)
- `/src/lib/services/pricing-calculator.ts` → Full pricing engine
- `/src/lib/services/unified-pricing-service.ts` → Product lookup + pricing
- `/src/app/api/pricing/calculate/route.ts` → API endpoint (POST with customerId + products)

#### Quote Store (`/src/store/quote-store.ts`)
- Zustand store for quote state
- Has `InsuranceInfo` but only basic fields (carrier, planName, memberId)
- **Problem:** `getExamServicesPricing()` uses HARDCODED prices (lines 316-361)

---

## 2. The Integration Gap

### Current State
```
Scanner → processes document → saves to DB (VspAuthorization, etc.)
                                        ↓
                                  [DATA SITS HERE]

POS Menus → hardcoded pricing → wrong patient prices
```

### Target State
```
Scanner → DB (authorization data)
              ↓
        [Start New Quote]
              ↓
        Load patient's active authorization into QUOTE SESSION
              ↓
POS Menus → query session → call pricing API → correct prices
```

### What's Missing

1. **Quote Session Initialization**
   - No action to load authorization when starting a quote
   - Quote store doesn't hold full authorization data

2. **Authorization Context in Quote Store**
   - `InsuranceInfo` type is too minimal
   - Missing: copays, allowances, tier pricing, special rules

3. **Pricing Resolver Connection**
   - Product menus don't call the pricing API
   - Each selection should query: "What does THIS patient pay for THIS product?"

4. **Quote ↔ Authorization Link**
   - `Quote.authorizationId` exists but not used
   - Need to mark authorization as used when quote converts to order

---

## 3. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              QUOTE SESSION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

[1] NEW QUOTE INITIATED
         │
         ▼
┌─────────────────────┐     ┌─────────────────────────────────────────────┐
│  Select Customer    │────▶│  Query: Get customer's active authorization │
│  (existing patient) │     │  Tables: VspAuthorization OR                │
│                     │     │          EyemedAuthorization OR             │
│                     │     │          SpecteraAuthorization              │
└─────────────────────┘     └─────────────────────────────────────────────┘
                                          │
                                          ▼
                            ┌─────────────────────────────────────────────┐
                            │  QUOTE SESSION CONTEXT (Zustand Store)      │
                            │─────────────────────────────────────────────│
                            │  customerId: "clxyz..."                     │
                            │  authorizationId: "clyaz..."                │
                            │  carrier: "EyeMed"                          │
                            │  patientAge: 42                             │
                            │                                             │
                            │  // Full authorization data                 │
                            │  authorization: {                           │
                            │    examCopay: 20,                           │
                            │    frameAllowance: 150,                     │
                            │    frameOverageDiscount: 0.20,              │
                            │    progressiveTier1Copay: 65,               │
                            │    progressiveTier2Copay: 85,               │
                            │    progressiveTier3Copay: 105,              │
                            │    arTier1Copay: 25,                        │
                            │    ...etc                                   │
                            │  }                                          │
                            └─────────────────────────────────────────────┘
                                          │
                                          ▼
[2] ASSOCIATE CLICKS PRODUCT IN MENU
         │
         ▼
┌─────────────────────┐     ┌─────────────────────────────────────────────┐
│  "Varilux X Design" │────▶│  POST /api/pricing/calculate                │
│  (Progressive lens) │     │  Body: {                                    │
│                     │     │    customerId: "clxyz...",                  │
│                     │     │    products: [{                             │
│                     │     │      sku: "PROG-VARILUX-X",                 │
│                     │     │      productType: "progressive",            │
│                     │     │      retailPrice: 394.00                    │
│                     │     │    }]                                       │
│                     │     │  }                                          │
└─────────────────────┘     └─────────────────────────────────────────────┘
                                          │
                                          ▼
                            ┌─────────────────────────────────────────────┐
                            │  PRICING ENGINE (existing)                  │
                            │─────────────────────────────────────────────│
                            │  1. Load customer's verified InsuranceDoc   │
                            │  2. Normalize to BenefitAuthorization       │
                            │  3. Look up product tier:                   │
                            │     LensCarrierTier where                   │
                            │       carrier="EyeMed" → "tier_4"           │
                            │  4. Get copay from authorization:           │
                            │     progressiveTier4Copay = $130            │
                            │  5. Return:                                 │
                            │     { retailPrice: 394,                     │
                            │       patientCopay: 130,                    │
                            │       insurancePays: 264,                   │
                            │       tierUsed: "tier_4" }                  │
                            └─────────────────────────────────────────────┘
                                          │
                                          ▼
[3] UI DISPLAYS CORRECT PRICE
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────┐                                       │
│  │  Varilux X Design                │                                       │
│  │  ─────────────────────           │                                       │
│  │  Retail: $394.00                 │                                       │
│  │  Insurance pays: $264.00         │                                       │
│  │  ───────────────────────         │                                       │
│  │  PATIENT PAYS: $130.00           │  ← This is what the associate sees    │
│  │  (EyeMed Tier 4)                 │                                       │
│  │                    [Add to Quote]│                                       │
│  └──────────────────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
[4] QUOTE ACCUMULATES
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  QUOTE SUMMARY                                                              │
│  ────────────────                                                           │
│  Exam                    Retail $275    Patient $20   (EyeMed exam copay)   │
│  Frame - Ray-Ban RB5154  Retail $250    Patient $120  (overage after $150)  │
│  Varilux X Design        Retail $394    Patient $130  (tier 4 copay)        │
│  Crizal Sapphire AR      Retail $187    Patient $85   (tier 3 copay)        │
│  Polycarbonate           Retail $65     Patient $0    (child = free)        │
│  ──────────────────────────────────────────────────────────────────────────│
│  RETAIL TOTAL:           $1,171                                             │
│  INSURANCE PAYS:         $816                                               │
│  PATIENT RESPONSIBILITY: $355                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema (Key Tables)

### Authorization Tables

```prisma
model VspAuthorization {
  id                    String   @id @default(cuid())
  customerId            String
  authorizationNumber   String   @unique
  planName              String
  planType              VspPlanType  // SIGNATURE, CHOICE, ADVANTAGE, etc.

  // Copays
  examCopay             Float?
  materialsCopay        Float?

  // Frame
  frameAllowanceRetail  Float?
  frameAllowanceMarchon Float?   // Higher allowance for featured brands
  frameOverageDiscount  Float?   // e.g., 0.20 = 20% off overage

  // Contacts
  contactAllowance      Float?
  contactFittingCovered Boolean

  // Status
  isActive              Boolean  @default(true)
  usedForOrder          Boolean  @default(false)

  // Related copays (code-based)
  lensEnhancementCopays VspLensEnhancementCopay[]
}

model VspLensEnhancementCopay {
  id                String   @id
  authorizationId   String
  code              String   // "FA", "JA", "KA", "QM", "QT", etc.
  description       String
  copaySingleVision Float?
  copayMultifocal   Float?
  isAddonCode       Boolean  // Add-on vs base code
  baseCode          String?  // Parent code if addon
}
```

```prisma
model EyemedAuthorization {
  id                       String   @id @default(cuid())
  customerId               String
  memberId                 String

  // Copays
  examCopay                Float?

  // Frame
  frameAllowance           Float?
  frameOverageDiscount     Float?   // e.g., 0.20 = 20% off overage

  // Progressive copays by tier
  progressiveStandardCopay Float?
  progressiveTier1Copay    Float?
  progressiveTier2Copay    Float?
  progressiveTier3Copay    Float?
  progressiveTier4Copay    Float?
  progressiveTier5Copay    Float?

  // Material copays
  polycarbonateAdultCopay  Float?
  polycarbonateChildCopay  Float?   // Often $0 for under 18
  highIndex160Copay        Float?
  highIndex167Copay        Float?
  highIndex174Copay        Float?
  trivexCopay              Float?

  // Enhancement copays
  photochromicCopay        Float?
  polarizedCopay           Float?
  blueLightFilterCopay     Float?
  tintCopay                Float?

  // Status
  isActive                 Boolean  @default(true)
  usedForOrder             Boolean  @default(false)

  // Related copays
  arCoatingCopays          EyemedArCoatingCopay[]
}

model EyemedArCoatingCopay {
  id              String   @id
  authorizationId String
  tier            String   // "standard", "tier_1", "tier_2", "tier_3"
  copay           String   // Can be number or "80% of U&C"
}
```

```prisma
model SpecteraAuthorization {
  id                    String   @id @default(cuid())
  customerId            String
  subscriberId          String

  // Exam copays (Spectera has multiple)
  examCopay             Float?   // Adult
  pediatricExamCopay    Float?
  maternityExamCopay    Float?

  // Frame
  frameAllowance        Float?
  frameOveragePercent   Float?   // e.g., 0.70 = patient pays 70%

  // Progressive copays by tier (Roman numerals)
  progressiveTier1Copay Float?   // Tier I
  progressiveTier2Copay Float?   // Tier II
  progressiveTier3Copay Float?   // Tier III
  progressiveTier4Copay Float?   // Tier IV
  progressiveTier5Copay Float?   // Tier V

  // Material copays
  polycarbonateAdultCopay Float?
  polycarbonateChildCopay Float?
  highIndex166Copay       Float?
  highIndex174Copay       Float?

  // Status
  isActive              Boolean  @default(true)
  usedForOrder          Boolean  @default(false)

  // Related copays
  arCoatingCopays       SpecteraArCoatingCopay[]
}
```

### Product-to-Tier Mapping

```prisma
model LensProduct {
  id           String   @id @default(cuid())
  name         String
  category     LensCategory  // LENS, AR_COATING, TRANSITIONS, MATERIAL, etc.
  retailPrice  Float

  // Links to tier mappings
  carrierTiers LensCarrierTier[]
}

model LensCarrierTier {
  id            String   @id
  lensProductId String
  carrier       String   // "VSP", "EyeMed", "Spectera"
  tierCode      String   // "FA", "tier_4", "III", etc.
  tierLabel     String?  // Human readable
  patientCopay  Float?   // Optional pre-calculated copay

  lensProduct   LensProduct @relation(...)

  @@unique([lensProductId, carrier])
}
```

---

## 5. Existing Services & Types

### Type: `BenefitAuthorization` (`/src/types/benefit-authorization.ts`)

This is the **normalized authorization format** consumed by the pricing engine:

```typescript
export type BenefitAuthorization =
  | EyemedBenefitAuthorization
  | SpecteraBenefitAuthorization
  | VspBenefitAuthorization

// Each carrier type has:
// - patient: { name, dob, age, memberId }
// - plan: { carrier, planId, planName, network }
// - frequency: { exam, frame, lenses, contacts }
// - copays: { ... carrier-specific copay structure }
// - specialRules: { polycarbonateFreeCbildAgeMax, etc. }
```

### Service: `unified-pricing-service.ts`

Key functions:
- `getExamServices()` → Returns all exam services from DB
- `calculateExamServicePricing(service, auth)` → Returns patient price with insurance
- `getContactLenses(filters?)` → Returns contact lens products
- `calculateContactLensPricing(lens, boxesOD, boxesOS, auth)` → Returns pricing
- `lookupProduct(sku)` → Finds product across all tables

### API: `/api/pricing/calculate` (POST)

**Request:**
```json
{
  "customerId": "clxyz...",
  "products": [
    {
      "sku": "PROG-VARILUX-X",
      "productType": "progressive",
      "retailPrice": 394.00,
      "isFeaturedBrand": false
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "customerId": "clxyz...",
    "carrier": "EyeMed",
    "planName": "Vision Access",
    "items": [
      {
        "sku": "PROG-VARILUX-X",
        "productName": "Varilux X Design",
        "retailPrice": 394.00,
        "patientCopay": 130.00,
        "insurancePays": 264.00,
        "savings": 264.00,
        "tierUsed": "tier_4"
      }
    ],
    "summary": {
      "retailTotal": 394.00,
      "patientTotal": 155.00,
      "insuranceTotal": 264.00,
      "totalSavings": 264.00,
      "examCopay": 20.00,
      "materialsCopay": 25.00
    }
  }
}
```

### Quote Store (`/src/store/quote-store.ts`)

**Current `InsuranceInfo` type (INSUFFICIENT):**
```typescript
interface InsuranceInfo {
  carrier: 'VSP' | 'EyeMed' | 'Spectera' | ''
  planName: string
  memberId: string
  groupNumber?: string
  effectiveDate?: string
  copayExam?: number
  copayMaterials?: number
  allowanceFrame?: number
  allowanceLens?: number
  allowanceContact?: number
}
```

**Problem:** This is too basic. Missing all the tier copays, special rules, etc.

---

## 6. What Needs to Be Built

### Integration Point 1: Expanded Quote Session Context

**Goal:** Quote store holds full authorization data needed for pricing.

**Approach:** Either:
- **Option A:** Store the full `BenefitAuthorization` in quote state
- **Option B:** Store just `authorizationId` and fetch on-demand
- **Option C:** Store key pricing fields inline (copays, allowances, tiers)

**Recommended:** Option A or B. The pricing API already handles the heavy lifting.

### Integration Point 2: Quote Initialization API

**Goal:** When starting a quote, load the customer's active authorization.

**New API:** `GET /api/customers/[id]/active-authorization`

```typescript
// Response
{
  "hasAuthorization": true,
  "authorizationType": "eyemed",
  "authorizationId": "clyaz...",
  "carrier": "EyeMed",
  "planName": "Vision Access",
  "summary": {
    "examCopay": 20,
    "frameAllowance": 150,
    "materialsCopay": 25,
    "progressiveTiers": { "1": 65, "2": 85, "3": 105, "4": 130, "5": 155 },
    "arTiers": { "1": 25, "2": 55, "3": 85 }
  },
  // Optional: full authorization object for local caching
  "fullAuthorization": { ... }
}
```

### Integration Point 3: Quote Store Actions

**New actions needed:**
```typescript
// Load authorization into quote session
initializeQuoteWithAuthorization: (customerId: string, auth: ActiveAuthorizationResponse) => void

// Update to use real pricing
calculateItemPrice: async (product: ProductSelection) => PricedProduct

// Clear when starting new quote
resetQuoteSession: () => void
```

### Integration Point 4: Product Selection Components

**Goal:** Each product menu calls the pricing API when displaying options or adding to quote.

**Pattern:**
```typescript
// When displaying a product option
const displayPrice = await calculatePatientPrice(product.sku, quoteSession)

// When adding to quote
const pricedItem = await addProductToQuote(product, quoteSession)
```

### Integration Point 5: Real-time Price Display

**Goal:** Every product card shows "Patient pays: $X" based on their insurance.

**Implementation:**
- Products load with retail price
- On mount or when auth changes, fetch patient pricing
- Display: "Retail $394 → Patient pays $130"

---

## 7. Implementation Approach

### Phase 1: Authorization Loading

1. Create `GET /api/customers/[id]/active-authorization` endpoint
2. Query all three authorization tables for customer
3. Return most recent active authorization
4. Include carrier type and key summary fields

### Phase 2: Quote Session Enhancement

1. Expand quote store with authorization context
2. Add `initializeQuote(customerId)` action that:
   - Fetches customer
   - Fetches active authorization
   - Populates quote session

### Phase 3: Pricing Integration

1. Create a React hook: `useProductPricing(sku, quoteSession)`
2. Calls `/api/pricing/calculate` with quote context
3. Returns `{ loading, price, error }`

### Phase 4: UI Updates

1. Update exam service selection to use real copays
2. Update frame selection to use real allowance + overage
3. Update lens selection to use real tier copays
4. Update AR coating selection to use real tier copays
5. Update contact lens selection to use real allowances

### Phase 5: Quote Finalization

1. When quote converts to order:
   - Link `Quote.authorizationId`
   - Mark authorization `usedForOrder = true`
   - Create proper `Transaction` with insurance details

---

## Summary

The pieces exist:
- Scanner works ✓
- Database stores authorization data ✓
- Pricing engine exists ✓
- Quote store exists ✓
- UI menus exist ✓

The gap is the **connection layer**:
- Quote session needs to load authorization on start
- Product menus need to call pricing API
- UI needs to display insurance-adjusted prices

The pricing API (`/api/pricing/calculate`) already does the hard work. The implementation is about:
1. Loading the right authorization into the quote session
2. Calling the pricing API when products are selected
3. Displaying the results in the UI
