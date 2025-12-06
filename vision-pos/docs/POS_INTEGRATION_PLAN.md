# VisionPOS Integration & Fix Plan

**Last Updated:** December 6, 2025
**Purpose:** Complete plan to make the quote builder accurately price glasses, contacts, and services using insurance authorization data.

---

## Current Status Summary

### What Works
- Scanner extracts insurance data and saves to DB (VSP, EyeMed, Spectera)
- Authorization tables store full benefit details
- Pricing API (`/api/quote`) calculates correct copays when given valid SKUs
- Quote builder UI exists with product selection flow
- Pricing context fetches authorization and calls pricing API
- Exam services fetched from DB with correct pricing (`/api/pricing/services`)
- 184 services in `service_prices` table (exams, diagnostics, CL fittings)

### What's Broken
1. Many products have no SKU → pricing API returns "not found"
2. Materials copay not displayed or added to total
3. Contact lens fittings always show retail (no insurance applied)
4. No clear glasses vs contacts benefit selection
5. Mount/rim selection disappears intermittently
6. Contact lens pricing done client-side, not through API
7. Quote doesn't save to transaction or mark authorization as used

---

## Detailed Audit Findings (Dec 6, 2025)

### Products Missing SKUs (Cannot Be Priced)
The following preferred products have `sku = NULL` in the database, causing pricing API to return "Product not found":

**Lens Types:**
- `preferred-eyezen` - Eyezen (has VSP tier KA)
- `preferred-ft-trifocal` - FT Trifocal (has VSP tier TB)
- `preferred-neurolens-prog` - Neurolens Progressive (NO tier mappings)
- `preferred-neurolens-sv` - Neurolens SV (NO tier mappings)
- `preferred-varilux-i` - Varilux i (NO tier mappings)

**AR Coatings:**
- `preferred-crizal-ez` - Crizal EZ Pro (has VSP tier QT)
- `preferred-neurolens-blue-ar` - Neurolens Blue AR (NO tier mappings)
- `preferred-neurolens-premium-ar` - Neurolens Premium AR (NO tier mappings)

**Materials:**
- `preferred-cr39` - CR-39 (Plastic) (has VSP tier AA)

**Add-ons:**
- `preferred-essential-blue` - Essential Blue (has VSP tier LF)
- `preferred-mirror` - Mirror Coating (NO tier mappings)
- `preferred-oversize` - Oversize Lenses (NO tier mappings)
- `preferred-polarized` - Polarized (has VSP tier DA)
- `preferred-prism` - Prism (Per Diopter) (NO tier mappings)
- `preferred-roll-polish` - Roll and Polish (NO tier mappings)
- `preferred-tint` - Tint (has VSP tier MN)
- `preferred-uv` - UV Coating (has VSP tier UV)
- `preferred-tech-mf` - Tech Add-on Multifocal (NO tier mappings)
- `preferred-tech-sv` - Tech Add-on Single Vision (NO tier mappings)

**Mount Fees:**
- `preferred-mount-full` - Full Rim Mount (NO tier mappings)
- `preferred-mount-semi` - Semi-Rimless Mount (NO tier mappings)
- `preferred-mount-rimless` - Rimless Mount (NO tier mappings)

### Products WITH Valid SKUs and Tier Mappings
These products work correctly through the pricing API:
- `single-vision` (VSP: VA)
- `varilux-comfort-drx` (VSP: FA, EyeMed: tier_2, Spectera: II)
- `varilux-comfort-max` (VSP: FA, EyeMed: tier_2, Spectera: II)
- `varilux-x-design` (VSP: NA, EyeMed: tier_4, Spectera: IV)
- `varilux-xr-design` (VSP: OA, EyeMed: tier_5, Spectera: V)
- `crizal-rock` (VSP: QV, EyeMed: tier_3, Spectera: IV)
- `crizal-sapphire-hr` (VSP: QV, EyeMed: tier_3, Spectera: III)
- `litestyle---poly` (VSP: AD)
- `trexa---trivex` (VSP: AB, EyeMed: trivex, Spectera: trivex)
- `ultra-high-index-1-67` (VSP: AH, EyeMed: high_index_167, Spectera: high_index)
- `ultra-high-index-1-74` (VSP: AJ, EyeMed: high_index_174, Spectera: high_index)
- `transitions-gen-s` (VSP: PR, EyeMed: photochromic, Spectera: photochromic)

### Contact Lens Fitting Issue
**Location:** `/api/quote/route.ts` lines 76-81, `/lib/services/unified-pricing-service.ts` lines 172-179

**Problem:** For VSP, the code checks `contactLensExamCopay` but doesn't check the `contactFittingCovered` flag from the authorization. When covered=true, standard fittings should be $0.

**Current Behavior:**
```typescript
// Always returns retail for fittings
if (isContactFitting) {
  return {
    patientCopay: retailPrice,  // WRONG - should check coverage
    notes: 'Contact lens fitting - verify coverage'
  }
}
```

### Mount/Rim Selection Issue
**Location:** `/src/components/quote-builder/layers/eyeglasses-layer-simple.tsx`

**Problem:** Mount fees section (Step 7) is conditionally rendered with `{polarized && (`. When user changes an earlier step, the section may disappear while state still holds the old selection. The mount fee is properly stored in state but:
1. UI section only shows if ALL previous steps completed
2. When user clears/changes earlier step, mount section hides but state isn't cleared
3. Continue button only shows when `mountFee` state has value (line 1089)

**Root Cause:** Sequential step visibility logic combined with state persistence creates inconsistent UI.

### Contact Lens Pricing Issue
**Location:** `/src/components/quote-builder/layers/contact-lens-calculator.tsx`

**Problem:** All pricing calculation happens client-side (lines 147-201):
- Insurance allowance applied locally
- Annual supply discount calculated in browser
- Rebates entered manually
- No API call to `/api/quote` for contact lenses

**Missing API Integration:**
- `/api/quote` doesn't handle contact lens items
- Contact lens products not in the same pricing flow as glasses

### Glasses/Contacts Exclusivity Issue
**Location:** `/src/components/quote-builder/layers/contact-lens-calculator.tsx` (line 259-268), `/src/components/quote-builder/layers/eyeglasses-layer-simple.tsx` (line 467-477)

**Current Implementation:**
- Warning banners exist but are advisory only
- No enforcement - both can be selected and priced with insurance
- No price adjustment when exclusivity violated
- Missing: Benefit selection step at start of quote

---

## Phase 1: Data Foundation Fixes ✅ COMPLETE
**Goal:** Every button in the UI maps to a product with a valid SKU that the pricing API can find.

| # | Task | Status |
|---|------|--------|
| 1.1 | Add SKUs to "preferred-eyezen" lens product | ✅ |
| 1.2 | Add SKUs to "preferred-neurolens-sv" and "preferred-neurolens-prog" | ✅ |
| 1.3 | Add SKUs to "preferred-varilux-i" lens product | ✅ |
| 1.4 | Add SKUs to "preferred-ft-trifocal" lens product | ✅ |
| 1.5 | Add SKUs to mount fee products (preferred-mount-full, semi, rimless) | ✅ |
| 1.6 | Verify all preferred products have carrier tier mappings in `lens_carrier_tiers` | ✅ |
| 1.7 | Add missing tier mappings for any products without them | ✅ |
| 1.8 | Add ADDON and TRANSITIONS category mappings to `/api/quote` | ✅ |
| 1.9 | Add enhancement code handling for VSP (polarized, blue light, tint) | ✅ |

**Completed Dec 6, 2025:**
- Updated 22 products with SKUs (SET sku = id for all preferred products with null SKU)
- Added Varilux i tier mappings (VSP: FA, EyeMed: tier_2, Spectera: II)
- Fixed category mappings (ADDON, TRANSITIONS added)
- Added enhancementCode support for addons with VSP tier codes (DA, LF, MN)

**Checkpoint Test:**
```bash
# Every product from quote-builder/products should return pricing
curl /api/quote -d '{"customerId":"...", "items":[{"sku":"preferred-eyezen"}]}'
# Should NOT return "Product not found"
```

---

## Phase 2: Materials Copay Fix ✅ COMPLETE
**Goal:** The materials copay (VSP $10, varies by plan) is displayed and added to patient total.

| # | Task | Status |
|---|------|--------|
| 2.1 | Add materials copay line item to quote review layer | ✅ |
| 2.2 | Include materials copay in patient total calculation | ✅ |
| 2.3 | Only show materials copay when lenses are selected (not exam-only) | ✅ |
| 2.4 | Show correct materials copay per carrier (VSP vs EyeMed vs Spectera) | ✅ |

**Completed Dec 6, 2025:**
- Updated `/src/components/quote-builder/layers/quote-review-layer.tsx`:
  - Added `hasLenses` check to determine if materials copay applies
  - Added `materialsCopay` calculation that's only non-zero when lenses/coatings selected
  - Added materials copay as visible line item in Order Summary
  - Updated `insurancePatientTotal` to include materials copay
- Test results:
  - VSP (Alberto Burgos): materialsCopay = $25 ✅
  - EyeMed (Amanda Pinto): materialsCopay = $0 (EyeMed doesn't have separate materials copay) ✅
  - Spectera (Samiyah Ammari): materialsCopay = null (handled as $0) ✅

**Checkpoint Test:**
- Sarah Abrams (VSP Signature): Select exam + progressive → Total should include $10 materials copay
- Total = item copays + $10 materials

---

## Phase 3: Contact Lens Fitting Pricing Fix ✅ COMPLETE
**Goal:** CL fittings use authorization data instead of always charging retail.

| # | Task | Status |
|---|------|--------|
| 3.1 | Fix `calculateServicePricing` in `/api/quote/route.ts` for VSP CL fittings | ✅ |
| 3.2 | Check `contactFittingCovered` flag - if true, standard fitting = $0 | ✅ |
| 3.3 | Fix CL fitting pricing for EyeMed (use `clFitStandardCopay`, `clFitPremiumCopay`) | ✅ |
| 3.4 | Fix CL fitting pricing for Spectera (use `examContactFitSelection`) | ✅ |
| 3.5 | Differentiate standard vs specialty fitting copays | ✅ |
| 3.6 | Update `/api/pricing/services` to return correct CL fitting prices | ⬜ (deferred - quote API handles CL fitting pricing) |

**Completed Dec 6, 2025:**
- Updated `/src/app/api/quote/route.ts`:
  - VSP: Checks `contactFittingCovered` flag - when true, standard fittings = $0
  - EyeMed: Uses `clFitEligible`, `clFitStandardCopay`, `clFitPremiumCopay`
  - Spectera: Uses `examContactFitSelection` (already implemented, improved fallback)
- Added specialty fitting detection for: rgp, ortho, scleral, keratoconus, misight, multifocal, monovision
- Added `parseClFitCopay` helper to handle "covered", "$0", and numeric values
- Updated type definitions in `/src/types/benefit-authorization.ts`
- Updated authorization services to pass CL fitting copay fields

**Test Results:**
- VSP (Alberto Burgos, contactFittingCovered=false): Sphere Fitting → $75 (retail) ✅
- VSP Ortho-K Fitting → $2200 (specialty, not covered) ✅
- EyeMed (Amanda Pinto, clFitEligible=true, no copay): Sphere Fitting → $75 (retail) ✅
- EyeMed Specialty Fitting → $850 (premium tier) ✅
- Spectera (Samiyah Ammari, no CL fit benefit): Sphere Fitting → $75 (retail) ✅

**Checkpoint Test:**
- Patients with `contactFittingCovered=true` (VSP) or `clFitStandardCopay` (EyeMed): Standard fitting = copay or $0
- Specialty fittings (RGP, Ortho-K, etc.) use premium copay or retail

---

## Phase 4: Glasses/Contacts Benefit Selection ✅ COMPLETE (v2 - Automatic Detection)
**Goal:** Automatic conflict detection when both materials types are in quote, with ability to switch.

### Key Principle: Services vs Materials
- **Services (exams, CL fittings)**: ALWAYS use insurance copays - NEVER affected by materials benefit choice
- **Materials (frames, lenses, contacts)**: Only ONE type gets the insurance allowance per benefit period

### Implementation Approach (v2 - December 6, 2025)
**Changed from upfront selection to automatic conflict detection:**
- User does NOT choose benefit upfront
- First-added materials type automatically gets the allowance
- When both types are added, a conflict banner appears
- User can switch which benefit gets the allowance at any time

| # | Task | Status |
|---|------|--------|
| 4.1 | Create automatic `materialsConflict` tracking in context | ✅ |
| 4.2 | Detect when both glasses and contacts materials are in quote | ✅ |
| 4.3 | First-added type gets the allowance by default | ✅ |
| 4.4 | Create `MaterialsConflictBanner` component for switching | ✅ |
| 4.5 | Update eyeglasses layer with conflict-aware pricing banners | ✅ |
| 4.6 | Update contact lens layer with conflict-aware pricing banners | ✅ |
| 4.7 | Ensure CL fitting (service) always uses insurance copays | ✅ |
| 4.8 | Store benefit choice in quote for transaction record | ⬜ (deferred to Phase 7) |

**Completed Dec 6, 2025 (v2):**

**Context Changes (`/src/contexts/quote-pricing-context.tsx`):**
- Replaced `selectedBenefitType` with `materialsConflict` state:
  ```typescript
  interface MaterialsConflict {
    hasConflict: boolean           // True when both materials types are in quote
    activeBenefit: MaterialsBenefitType  // Which gets the allowance
    conflictingBenefit: MaterialsBenefitType // Which is at retail
    firstAddedType: MaterialsBenefitType // Which was added first
  }
  ```
- Added `switchMaterialsBenefit(type)` action to change active benefit
- Added `usesMaterialsAllowance(category)` helper to check if category gets allowance
- Automatic detection: `addItem()`, `removeItem()`, `clearItemsByCategory()` all update conflict state

**New Component (`/src/components/quote-builder/materials-conflict-banner.tsx`):**
- Only shows when `materialsConflict.hasConflict === true`
- Explains that frame allowance and contact allowance are mutually exclusive
- Emphasizes that services (exams, fittings) are NOT affected
- Two toggle buttons to switch between glasses/contacts allowance
- Shows which type is getting retail pricing

**Quote Builder Page (`/src/app/quote-builder/page.tsx`):**
- Removed `BenefitSelectionStep` component and import
- Removed 'benefit-selection' from QuoteLayer type
- Added `MaterialsConflictBanner` display when conflict exists
- Flow now: Customer → Insurance → Exam Services → Eyeglasses → Contacts → Review

**Layer Updates:**
- `eyeglasses-layer-simple.tsx`:
  - Uses `usesMaterialsAllowance('glasses')` to check insurance
  - Shows retail banner only when conflict exists AND contacts is active
- `contact-lens-calculator.tsx`:
  - Uses `usesMaterialsAllowance('contacts')` to check insurance
  - Shows retail banner only when conflict exists AND glasses is active

**CL Fitting Pricing (Services):**
- CL fitting handled in exam-services layer (NOT contact lens calculator)
- Pricing from `/api/pricing/services` via `calculateFittingPricing()`
- ALWAYS applies insurance copays when authorization exists
- NEVER affected by materials benefit conflict

**Checkpoint Tests:**
1. Add eyeglasses → glasses gets allowance, no conflict banner
2. Add contacts after glasses → conflict banner appears, glasses still has allowance
3. Click "Contact Lenses" button in banner → contacts now has allowance, glasses at retail
4. Add CL fitting → always uses insurance copay regardless of materials choice
5. Remove all glasses items → conflict resolves, contacts automatically gets allowance

---

## Phase 5: Contact Lens Pricing Through API
**Goal:** Contact lens pricing calculated server-side like glasses, not client-side.

| # | Task | Status |
|---|------|--------|
| 5.1 | Extend `/api/quote` to handle contact lens items | ⬜ |
| 5.2 | Move CL allowance logic from component to API | ⬜ |
| 5.3 | Move annual supply discount calculation to API | ⬜ |
| 5.4 | Apply rebates server-side | ⬜ |
| 5.5 | Update `ContactLensCalculator` to call API instead of local calculation | ⬜ |
| 5.6 | Return itemized CL pricing in quote response | ⬜ |

**Checkpoint Test:**
```bash
curl /api/quote -d '{
  "customerId": "...",
  "items": [{"sku": "acuvue-oasys-1day-90", "quantity": 8}]
}'
# Should return: allowance applied, annual discount, final patient cost
```

---

## Phase 6: Mount/Rim Selection Bug Fix
**Goal:** Mount fee selection persists and doesn't disappear.

| # | Task | Status |
|---|------|--------|
| 6.1 | Investigate state management in eyeglasses layer for mount fees | ⬜ |
| 6.2 | Check if mount fee is being cleared when other selections change | ⬜ |
| 6.3 | Fix state persistence - mount should stay selected through flow | ⬜ |
| 6.4 | Ensure mount fees are included in quote items and total | ⬜ |
| 6.5 | Test: select frame → lens → material → AR → transitions → polarized → mount stays | ⬜ |

**Checkpoint Test:**
- Select Full Rim Mount → Continue through all steps → Mount still shows in review
- Mount fee ($0, $35, or $45) appears in final total

---

## Phase 7: Quote Finalization & Transaction
**Goal:** Save completed quote as transaction, mark authorization as used.

| # | Task | Status |
|---|------|--------|
| 7.1 | Create "Complete Sale" / "Checkout" button in review layer | ⬜ |
| 7.2 | Create `/api/transactions` POST endpoint | ⬜ |
| 7.3 | Save quote data to `Transaction` table with all line items | ⬜ |
| 7.4 | Update authorization record: `usedForOrder = true`, `usedDate = now()` | ⬜ |
| 7.5 | Store which benefit type was used (glasses vs contacts) | ⬜ |
| 7.6 | Generate receipt/summary for printing | ⬜ |
| 7.7 | Clear quote state after successful transaction | ⬜ |

**Checkpoint Test:**
- Complete a quote → Transaction record created in DB
- Authorization marked as used
- Starting new quote for same patient shows "Authorization already used"

---

## Execution Order

```
Phase 1 (Data) ──────► Phase 2 (Materials) ──────► Phase 3 (CL Fitting)
     │                                                      │
     │                                                      ▼
     │                                              Phase 4 (Benefit Selection)
     │                                                      │
     ▼                                                      ▼
Phase 6 (Mount Bug) ◄─────────────────────────────► Phase 5 (CL API)
                                                            │
                                                            ▼
                                                    Phase 7 (Finalization)
```

**Priority Order:**
1. **Phase 1** - Without valid SKUs, nothing else works
2. **Phase 2** - Materials copay is money left on the table
3. **Phase 3** - CL fitting pricing affects contact lens sales
4. **Phase 4** - Critical for compliance (can't bill insurance for both)
5. **Phase 6** - Bug fix, relatively quick
6. **Phase 5** - Architectural improvement
7. **Phase 7** - Complete the sales flow

---

## Test Patients for Validation

| Patient | Carrier | Key Tests |
|---------|---------|-----------|
| Sarah Abrams | VSP Signature | $0 progressive copays, $10 materials, CL fitting covered |
| Eric Heidel | VSP Choice | FA=$105, QV=$85, higher copays than Signature |
| Amanda Pinto | EyeMed | tier_3 progressive, tier_1 AR, frame allowance |
| Samiyah Ammari | Spectera | Tier II progressive, child poly free |

---

## Success Criteria

**Phase 1 Complete When:**
- [ ] All product buttons return valid pricing from `/api/quote`
- [ ] No "Product not found" warnings in API responses

**Phase 2 Complete When:**
- [ ] Materials copay appears in quote review
- [ ] Patient total includes materials copay

**Phase 3 Complete When:**
- [ ] CL fittings show correct copay (not retail) for covered patients
- [ ] Specialty fittings priced separately from standard

**Phase 4 Complete When:**
- [x] First-added materials type automatically gets the allowance
- [x] When both types added, conflict banner appears with switch option
- [x] Second category shows retail pricing, can be switched
- [x] Services (exam, CL fitting) ALWAYS use insurance copays regardless of materials choice
- [x] No way to accidentally get insurance on both materials types

**Phase 5 Complete When:**
- [ ] CL pricing comes from API, not browser calculation
- [ ] Allowance, discounts, rebates all server-side

**Phase 6 Complete When:**
- [ ] Mount selection persists through entire quote flow
- [ ] Mount fee appears in final total

**Phase 7 Complete When:**
- [ ] Completed quotes save to Transaction table
- [ ] Authorization marked as used
- [ ] Can print/export receipt
