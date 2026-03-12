# Vision POS System - Comprehensive Build Plan

## Executive Overview

A 4-column iPad-optimized POS system that integrates directly with the VSP/EyeMed pricing engine, supports multi-pair orders, auto-saves on every interaction, and presents professional quotes for patient signature.

---

## Part 1: Edge Cases & Scenarios

### Patient Scenarios
| Scenario | System Behavior |
|----------|----------------|
| **No insurance (cash)** | Retail prices shown, no carrier banner, no allowances |
| **Expired authorization** | Yellow warning banner, allow quote but flag for review |
| **Under 18** | Auto-apply FREE poly, FREE photochromic (under 19) |
| **EasyOptions (VSP)** | Show enhanced allowances, "Covered" badges on eligible upgrades |
| **No price list exists** | Block product selection, show "Upload Insurance Docs" CTA |
| **Price list > 30 days old** | Warning badge, "Prices may have changed", offer refresh |
| **Contact lens "instead of"** | Frame benefit blocked, show explanation tooltip |
| **Neurolens + insurance items** | Split display: insurance section + cash-only section |

### Product/Inventory Scenarios
| Scenario | System Behavior |
|----------|----------------|
| **Frame out of stock** | Gray overlay, "OUT OF STOCK", offer "Order for Patient" |
| **Frame discontinued** | Warning in saved quote, suggest alternatives |
| **Oversize frame (61mm+)** | Auto-detect from frame data, auto-add oversize fee |
| **Rimless/drill mount** | Auto-add mount fee based on frame type |
| **High Rx special order** | Flag as special order, add lab fee, extended timeline notice |
| **Prism needed** | Show diopter input, calculate per-diopter cost |
| **Invalid lens+material combo** | Disable incompatible options proactively |

---

## Part 2: Human Flow

### Typical Quote Journey (8-12 minutes)
```
1. PATIENT ARRIVES
   └─→ Staff searches patient name
   └─→ System auto-loads insurance + price list
   └─→ Patient banner displays (persists entire session)

2. EXAM SERVICES (if today's visit)
   └─→ Select exam type + add-ons
   └─→ Auto-adds to order summary

3. FRAME SELECTION
   └─→ Browse/search frames
   └─→ Patient tries on frames
   └─→ Select frame → Shows copay after allowance

4. LENS CONFIGURATION
   └─→ Lens Type → Based on Rx needs
   └─→ Material → Based on Rx power
   └─→ Coatings → AR + Photochromic
   └─→ Add-Ons → UV, Tint, Polarized, etc.

5. ADDITIONAL PAIRS (optional)
   └─→ "Add Another Pair" button
   └─→ Second pair discount auto-applies
   └─→ Repeat frame + lens selection

6. CONTACTS (optional)
   └─→ OD/OS parameters
   └─→ Quantity selection
   └─→ Annual supply calculation

7. REVIEW & PRESENT
   └─→ Staff reviews order summary
   └─→ "Present to Patient" button
   └─→ Clean receipt view
   └─→ Discuss savings

8. FINALIZE
   └─→ Patient signs on iPad
   └─→ Print/Email quote
   └─→ Convert to order OR save for later
```

### Key UX Principles
- **Patient banner ALWAYS visible** - Name, DOB, carrier, allowances
- **Order summary ALWAYS visible** - Running total, insurance savings
- **Instant menu switching** - No page loads, no lost state
- **Any selection adjustable** - Go back anytime, update anything
- **Savings prominently displayed** - Justify costs, show value

---

## Part 3: iPad Optimization

### Touch Interface
| Requirement | Implementation |
|-------------|----------------|
| **Tap targets** | Minimum 44×44pt (Apple HIG) |
| **No hover states** | All interactions work on tap |
| **Fat finger protection** | Confirmation for destructive actions |
| **Swipe gestures** | Swipe left on order item to delete |
| **Haptic feedback** | Subtle vibration on selection |

### Layout & Display
| Requirement | Implementation |
|-------------|----------------|
| **Orientation** | Landscape primary, graceful portrait fallback |
| **Keyboard handling** | Input fields shift up, order summary stays visible |
| **Font sizes** | Large enough to show patient from arm's length |
| **Dark mode** | Support for different office lighting |
| **Split view** | Compatible with iPad multitasking |

### Reliability
| Requirement | Implementation |
|-------------|----------------|
| **Auto-lock handling** | Quote persists through sleep/wake |
| **Rotation** | State maintained if accidentally rotated |
| **Offline mode** | IndexedDB cache, sync when reconnected |
| **Session timeout** | Auto-save before timeout, easy resume |

---

## Part 4: Error Handling Philosophy

### Principles
1. **Never block the user completely** - Always provide a path forward
2. **Show errors inline** - No modal popups interrupting flow
3. **Auto-recover when possible** - Retry failed operations silently
4. **Degrade gracefully** - Fall back to retail if insurance pricing fails
5. **Log everything** - Debug info for support team

### Error Matrix
| Error Type | User Experience | Recovery |
|------------|-----------------|----------|
| **Network loss** | "Offline" badge, continue working | Auto-sync when reconnected |
| **API timeout** | "Saving..." indicator, no block | Retry with backoff |
| **Price list missing** | Block products, show CTA | Upload insurance docs |
| **Auth expired** | Yellow banner, allow quote | Flag for manual review |
| **Inventory mismatch** | Toast notification | Update count, suggest alternative |
| **Database write fail** | Queue locally | Retry, never lose data |
| **Session expired** | Auto-save → login → resume | Seamless recovery |

---

## Part 5: Price List Integration

### Data Flow
```
Patient Selected
    ↓
GET /api/customers/:id/price-list/active
    ↓
Response: {
  versionId: "abc123",
  carrier: "VSP",
  effectiveDate: "2025-03-01",
  prices: {
    "comfortMax": 105,
    "poly_F": 35,      ← Material price for F tier
    "poly_K": 35,      ← Material price for K tier
    "crizalRock": 85,
    ...
  }
}
    ↓
Store in Quote Context
    ↓
All product tiles read from this cache
```

### Price List States
| State | UI Treatment |
|-------|--------------|
| **Fresh (<7 days)** | Green checkmark, "Prices current" |
| **Aging (7-30 days)** | Yellow badge, "Prices from [date]" |
| **Stale (>30 days)** | Red warning, "Prices may have changed", refresh button |
| **Missing** | Block products, "Set Up Insurance" CTA |

---

## Part 6: VSP Price Matrix - The Complex Part

### The Challenge
VSP material copays **depend on lens type tier**:
```
SV + Poly           = $35  (SV_poly)
Standard PAL + Poly = $35  (KD - K tier poly)
Comfort DRx + Poly  = $35  (JD - J tier poly)
Comfort Max + Poly  = $35  (FD - F tier poly)
Varilux X + Poly    = $35  (OD - O tier poly)
```
Same material, but price lookup varies by tier.

### Solution Architecture
```
Price List Structure:
{
  // Lens types with their tier
  "lensTypes": {
    "sv": { "tier": "SV", "copay": 0 },
    "comfortDRx": { "tier": "J", "copay": 95 },
    "comfortMax": { "tier": "F", "copay": 105 },
    "variluxX": { "tier": "O", "copay": 150 }
  },

  // Materials with per-tier prices
  "materials": {
    "poly": { "SV": 35, "K": 35, "J": 35, "F": 35, "O": 35 },
    "hiIndex167": { "SV": 83, "K": 78, "J": 78, "F": 78, "O": 78 }
  },

  // AR coatings (same for all tiers)
  "arCoatings": {
    "crizalRock": 85,
    "crizalSapphire": 85
  }
}
```

### UI Behavior
1. User selects **Comfort Max** → Store `currentTier = "F"`
2. Materials menu renders → Read prices from `materials[id][currentTier]`
3. User changes to **Varilux X** → `currentTier = "O"`
4. Material prices **animate/pulse** to show update
5. Order summary **recalculates** with new tier prices
6. Toast: "Prices updated for Varilux X"

---

## Part 7: Persistence & Auto-Save

### Architecture
```
User Interaction
    ↓
Zustand Store (local state)
    ↓
Optimistic UI Update (instant feedback)
    ↓
Debounced API Call (300ms)
    ↓
Database Write
    ↓
Confirmation ("Saved ✓")
```

### Quote Lifecycle
```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────────┐
│  DRAFT  │ →  │  SAVED  │ →  │  SENT   │ →  │ ACCEPTED│ →  │ CONVERTED │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └───────────┘
     ↓              ↓              ↓              ↓
  In Progress   Complete but    Emailed/      Patient        Lab Order
   Editable     not presented   Printed       Signed         Created

                        ↓ (after 30 days)
                   ┌─────────┐
                   │ EXPIRED │
                   └─────────┘
```

### URL-Based State
```
/pos?quote=Q-2025-0342

- Quote ID in URL
- Shareable between staff
- Bookmarkable
- Browser back button works
- Refresh preserves state
```

---

## Part 8: Patient Presentation

### Present View Design
```
┌─────────────────────────────────────────────────────────────┐
│                    VISION CENTER                            │
│                  123 Main Street                            │
│                Quote #Q-2025-0342                           │
│                  March 10, 2025                             │
├─────────────────────────────────────────────────────────────┤
│  Patient: John Smith                                        │
│  Insurance: VSP Choice                                      │
├─────────────────────────────────────────────────────────────┤
│  PAIR 1 - Everyday Glasses                                  │
│  ─────────────────────────────────────────────              │
│  Ray-Ban RB5154 - Tortoise                                  │
│    Retail: $185.00                                          │
│    After Allowance: $45.00                      ✓ $140 OFF  │
│                                                             │
│  Varilux Comfort Max Progressive                            │
│  + 1.67 High Index                                          │
│  + Crizal Sapphire HR                                       │
│  + Transitions Gen S                                        │
│    Retail: $680.00                                          │
│    Your Cost: $305.00                           ✓ $375 OFF  │
├─────────────────────────────────────────────────────────────┤
│  SUBTOTAL                                         $350.00   │
│  Insurance Savings                               -$515.00   │
│  Tax                                              $28.00    │
│  ═══════════════════════════════════════════════════════    │
│  YOUR TOTAL                                      $378.00    │
│                                                             │
│  Your insurance saved you $515.00 today!                    │
├─────────────────────────────────────────────────────────────┤
│  Signature: ________________________________                │
│  By signing, I acknowledge this quote.                      │
│  Quote valid for 30 days.                                   │
│         [QR CODE]                                           │
└─────────────────────────────────────────────────────────────┘
```

### Signature Capture
- **Canvas element** for touch drawing
- **Clear button** to retry
- **Stored as** base64 PNG + timestamp + device ID
- **Legal text**: "By signing, I agree to this quote"

### Export Options
| Format | Use Case |
|--------|----------|
| **Print** | Receipt printer or 8.5×11 |
| **Email** | PDF attachment to patient email |
| **PDF Download** | Manual sending |
| **QR Code** | Patient scans to view on phone |

---

## Part 9: Upselling & Behavioral Design

### Smart Badges
| Badge | Logic |
|-------|-------|
| **Most Popular** | Top 20% by sales volume |
| **Best Value** | Highest savings percentage |
| **Recommended** | Based on Rx (high minus → hi-index) |
| **Staff Pick** | Manually flagged by manager |
| **FREE** | No-cost items (poly under 18) |

### Contextual Prompts
| Trigger | Prompt |
|---------|--------|
| After selecting SV | "Consider Eyezen for screen time - reduces digital eye strain" |
| After standard PAL | "Upgrade to Comfort Max for $10 more - wider reading zone" |
| After frame selected | "Add prescription sunglasses as a second pair - 50% off!" |
| After standard AR | "Crizal Rock includes 2-year warranty - only $17 more" |
| After 1 box contacts | "Annual supply saves $40 and you never run out" |

### Tooltips (Long-press on iPad)
| Product | Tooltip |
|---------|---------|
| **Polycarbonate** | "Impact resistant - required for children, recommended for active lifestyles" |
| **1.67 High Index** | "Best for prescriptions over -4.00 or +3.00 - 30% thinner than standard" |
| **Crizal Sapphire** | "Our clearest AR coating - virtually invisible on your lenses" |
| **Transitions Gen S** | "Darkens in 30 seconds, clears in 2 minutes - newest technology" |

---

## Part 10: Technical Build Plan (Beads-Tracked)

### Phase Overview

| Phase | Bead ID | Completion Promise | Priority |
|-------|---------|-------------------|----------|
| 1 | `vision-pos-6pe.1` | `PHASE_1_FOUNDATION_COMPLETE` | P0 |
| 2 | `vision-pos-6pe.2` | `PHASE_2_MENUS_COMPLETE` | P1 |
| 3 | `vision-pos-6pe.3` | `PHASE_3_FEATURES_COMPLETE` | P1 |
| 4 | `vision-pos-6pe.4` | `PHASE_4_QUOTES_COMPLETE` | P1 |
| 5 | `vision-pos-6pe.5` | `PHASE_5_POLISH_COMPLETE` | P2 |
| 6 | `vision-pos-6pe.6` | `PHASE_6_LAUNCH_COMPLETE` | P2 |

### Verification Requirement (ALL PHASES)

**Every phase MUST pass Playwright verification before completion:**
```bash
npx playwright test e2e/pos-phase-N.spec.ts --headed
```

**Verification criteria:**
1. **Clickthrough test** - All UI elements clickable and responsive
2. **Logical flow** - Application behavior makes sense to a user
3. **No dead ends** - Every action has a clear result or feedback
4. **State persistence** - Changes survive navigation and refresh
5. **Visual check** - Layout renders correctly, no broken UI

---

### Phase 1: Foundation
**Bead:** `vision-pos-6pe.1` | **Priority:** P0

**Deliverables:**
- [ ] `/src/app/pos/page.tsx` - Main POS page
- [ ] `/src/components/pos/POSLayout.tsx` - 4-column responsive grid
- [ ] `/src/components/pos/NavigationColumn.tsx` - Menu buttons (left)
- [ ] `/src/components/pos/ProductArea.tsx` - Product tiles (center)
- [ ] `/src/components/pos/PatientBanner.tsx` - Persistent patient info
- [ ] `/src/components/pos/OrderSummary.tsx` - Running totals (right)
- [ ] `/src/components/pos/ActionsColumn.tsx` - Hold/Print/etc (far right)
- [ ] `/src/stores/quote-store.ts` - Zustand store with persist
- [ ] `/src/app/api/quotes/route.ts` - Quote CRUD endpoints
- [ ] Auto-save on every selection change
- [ ] Price list loading on patient select

**Completion Condition:**
```
All components render without errors
Navigation switches menus without page reload
Patient banner persists across menu changes
Order summary updates on item add/remove
Quote auto-saves to database within 500ms of change

PLAYWRIGHT VERIFICATION:
- e2e/pos-phase-1.spec.ts passes
- Click through all navigation buttons
- Add/remove items from order
- Verify auto-save triggers
- Application flow is logical and usable
```

**Ralph Loop:**
```bash
bd update vision-pos-6pe.1 --claim
/ralph-loop "Build Phase 1: Create POSLayout 4-column grid, NavigationColumn, PatientBanner, OrderSummary, ActionsColumn. Set up Zustand quote store with auto-persist. Create /api/quotes endpoints. Test by adding items and verifying auto-save." --completion-promise "PHASE_1_FOUNDATION_COMPLETE"
bd update vision-pos-6pe.1 --status done
```

---

### Phase 2: Core Menus
**Bead:** `vision-pos-6pe.2` | **Priority:** P1 | **Depends on:** Phase 1

**Deliverables:**
- [ ] `/src/components/pos/menus/ExamServicesMenu.tsx`
- [ ] `/src/components/pos/menus/LensTypeMenu.tsx` - With VSP tier indicators
- [ ] `/src/components/pos/menus/MaterialsMenu.tsx` - Tier-based pricing
- [ ] `/src/components/pos/menus/CoatingsMenu.tsx` - AR + Photochromic
- [ ] `/src/components/pos/menus/AddOnsMenu.tsx` - Polarized, tint, etc.
- [ ] VSP tier dependency system (material prices change with lens type)
- [ ] Price animation on tier change
- [ ] All menus wired to OrderSummary

**Completion Condition:**
```
All 5 menus render product tiles with prices from patient price list
Selecting lens type updates material prices for VSP patients
Prices animate/pulse when tier changes
Each selection adds to OrderSummary with correct price
EyeMed patients see flat copays (no tier dependency)
Cash patients see retail prices

PLAYWRIGHT VERIFICATION:
- e2e/pos-phase-2.spec.ts passes
- Click through each menu (Exam, Lens, Material, Coatings, Add-Ons)
- Select products and verify order summary updates
- Change lens tier and verify material prices update
- Test with VSP, EyeMed, and Cash patient scenarios
- Application flow is logical and usable
```

**Ralph Loop:**
```bash
bd update vision-pos-6pe.2 --claim
/ralph-loop "Build Phase 2: Create ExamServicesMenu, LensTypeMenu, MaterialsMenu, CoatingsMenu, AddOnsMenu. Implement VSP tier dependency (lens type changes material prices). Add price animation on tier change. Wire all menus to OrderSummary. Test with VSP, EyeMed, and Cash patients." --completion-promise "PHASE_2_MENUS_COMPLETE"
bd update vision-pos-6pe.2 --status done
```

---

### Phase 3: Complex Features
**Bead:** `vision-pos-6pe.3` | **Priority:** P1 | **Depends on:** Phase 2

**Deliverables:**
- [ ] `/src/components/pos/menus/FramesMenu.tsx` - Search, filter, inventory
- [ ] `/src/components/pos/menus/ContactsMenu.tsx` - OD/OS, brands, qty
- [ ] `/src/components/pos/MultiPairManager.tsx` - Add/manage pairs
- [ ] `/src/components/pos/PackageBuilder.tsx` - Good/Better/Best
- [ ] `/src/components/pos/DiscountModal.tsx` - Percent/fixed with reason
- [ ] `/src/components/pos/NotesModal.tsx` - Per-item and per-order
- [ ] `/src/components/pos/HoldRecall.tsx` - Save for later, retrieve

**Completion Condition:**
```
Frames searchable by brand/model, shows inventory count
Frame allowance applied, overage calculated correctly
Contacts show OD/OS fields, annual supply calculation
"Add Another Pair" creates new pair section
Second pair discount auto-applies (if applicable)
Discounts require reason, show in OrderSummary
Notes attach to items and display in quote
Hold saves quote, Recall retrieves it

PLAYWRIGHT VERIFICATION:
- e2e/pos-phase-3.spec.ts passes
- Search and select frames, verify allowance calculation
- Add contacts with OD/OS parameters
- Add second pair, verify discount applies
- Apply discount with reason, verify it shows
- Hold quote, recall it, verify state restored
- Application flow is logical and usable
```

**Ralph Loop:**
```bash
bd update vision-pos-6pe.3 --claim
/ralph-loop "Build Phase 3: Create FramesMenu with search/filter/inventory, ContactsMenu with OD/OS params. Build MultiPairManager for multiple pairs with discounts. Add PackageBuilder, DiscountModal, NotesModal, HoldRecall. Test frame allowance calculation, multi-pair discounts." --completion-promise "PHASE_3_FEATURES_COMPLETE"
bd update vision-pos-6pe.3 --status done
```

---

### Phase 4: Quote Lifecycle
**Bead:** `vision-pos-6pe.4` | **Priority:** P1 | **Depends on:** Phase 3

**Deliverables:**
- [ ] `/src/app/api/quotes/[id]/route.ts` - Individual quote operations
- [ ] `/src/components/pos/QuoteSearch.tsx` - Search by #, patient, date
- [ ] `/src/components/pos/QuoteHistory.tsx` - Per-patient history
- [ ] `/src/components/pos/PresentView.tsx` - Clean patient-facing view
- [ ] `/src/components/pos/SignatureCapture.tsx` - Touch drawing canvas
- [ ] `/src/lib/pdf/quote-generator.ts` - PDF generation
- [ ] `/src/app/api/quotes/[id]/email/route.ts` - Email quote
- [ ] `/src/app/api/quotes/[id]/print/route.ts` - Print formatting

**Completion Condition:**
```
Quotes have unique IDs (Q-2025-XXXX format)
Quote searchable by number, patient name, date range
Patient sees quote history on their profile
Present View shows clean receipt with savings highlighted
Signature captures touch input, stores as base64 PNG
PDF generates with all line items, totals, signature
Email sends PDF attachment to patient email
Print formats correctly for receipt printer and 8.5x11

PLAYWRIGHT VERIFICATION:
- e2e/pos-phase-4.spec.ts passes
- Create quote, verify ID generated
- Search for quote by number and patient name
- Open Present View, verify clean display
- Draw signature, verify it captures
- Generate PDF, verify content correct
- Full quote lifecycle clickthrough works
- Application flow is logical and usable
```

**Ralph Loop:**
```bash
bd update vision-pos-6pe.4 --claim
/ralph-loop "Build Phase 4: Create quote search, quote history per patient. Build PresentView for patient-facing display. Implement SignatureCapture with touch canvas. Create PDF generator, email sending, print formatting. Test full quote lifecycle from create to signed PDF." --completion-promise "PHASE_4_QUOTES_COMPLETE"
bd update vision-pos-6pe.4 --status done
```

---

### Phase 5: Polish
**Bead:** `vision-pos-6pe.5` | **Priority:** P2 | **Depends on:** Phase 4

**Deliverables:**
- [ ] Upsell prompts (contextual suggestions)
- [ ] Smart badges (Most Popular, Best Value, FREE, Recommended)
- [ ] Long-press tooltips for product info
- [ ] Comprehensive error handling (all scenarios from plan)
- [ ] Offline mode with IndexedDB
- [ ] iPad optimizations (touch targets, orientation, haptics)
- [ ] Performance profiling and optimization
- [ ] Accessibility audit (WCAG compliance)

**Completion Condition:**
```
Upsell prompts appear at appropriate moments
Badges display on qualifying products
Long-press shows helpful tooltips
Network loss shows "Offline" badge, work continues
Reconnection syncs pending changes automatically
Touch targets minimum 44x44pt
Landscape/portrait both work
Lighthouse accessibility score > 90
Page loads in < 2 seconds

PLAYWRIGHT VERIFICATION:
- e2e/pos-phase-5.spec.ts passes
- Trigger upsell prompts, verify they appear
- Verify badges show on correct products
- Long-press elements, verify tooltips
- Simulate offline, verify badge appears
- All touch targets meet 44x44pt minimum
- Test in multiple viewport sizes
- Application flow is logical and usable
```

**Ralph Loop:**
```bash
bd update vision-pos-6pe.5 --claim
/ralph-loop "Build Phase 5: Add upsell prompts, smart badges, tooltips. Implement offline mode with IndexedDB sync. Optimize for iPad (touch targets, orientation). Run accessibility audit, fix issues. Performance profile and optimize. Test offline/online transitions." --completion-promise "PHASE_5_POLISH_COMPLETE"
bd update vision-pos-6pe.5 --status done
```

---

### Phase 6: Testing & Launch
**Bead:** `vision-pos-6pe.6` | **Priority:** P2 | **Depends on:** Phase 5

**Deliverables:**
- [ ] E2E tests for critical flows (Playwright)
- [ ] Test with 5 real patients (VSP, EyeMed, Cash mix)
- [ ] Staff training documentation
- [ ] Soft launch with select patients
- [ ] Bug fixes from soft launch feedback
- [ ] Full production launch

**Completion Condition:**
```
E2E tests pass: new quote, add items, present, sign, export
5 real patients tested:
  - Patient 1: VSP with progressives
  - Patient 2: VSP with contacts
  - Patient 3: EyeMed with frames + lenses
  - Patient 4: Cash patient multi-pair
  - Patient 5: Complex (insurance + cash-only items)
Staff can create quote without assistance
No P0/P1 bugs from soft launch
Production deployed and stable for 24 hours

PLAYWRIGHT VERIFICATION:
- e2e/pos-full-flow.spec.ts passes (comprehensive test)
- All phase tests (1-5) still pass
- Complete end-to-end flow: patient select → quote → sign → export
- Test all 5 patient scenarios with real data
- No console errors during full clickthrough
- Application flow is logical and usable throughout
```

**Ralph Loop:**
```bash
bd update vision-pos-6pe.6 --claim
/ralph-loop "Execute Phase 6: Write E2E Playwright tests for quote creation flow. Test with 5 real patients covering VSP, EyeMed, Cash scenarios. Document training guide. Run soft launch, fix bugs. Deploy to production. Verify stability." --completion-promise "PHASE_6_LAUNCH_COMPLETE"
bd update vision-pos-6pe.6 --status done
```

---

### Quick Reference

**Start a Phase:**
```bash
bd update vision-pos-6pe.N --claim
/ralph-loop "[prompt]" --completion-promise "PHASE_N_COMPLETE"
```

**Complete a Phase:**
```bash
bd update vision-pos-6pe.N --status done
```

**Check Progress:**
```bash
bd list                     # All issues
bd ready                    # What's ready to work on
bd show vision-pos-6pe      # Epic overview
bd children vision-pos-6pe  # All phases
```

**Cancel a Loop:**
```bash
/cancel-ralph
```

---

### File Structure (Final)

```
src/
├── app/
│   ├── pos/
│   │   └── page.tsx                 # Main POS page
│   └── api/
│       └── quotes/
│           ├── route.ts             # CRUD
│           └── [id]/
│               ├── route.ts         # Individual quote
│               ├── email/route.ts   # Email quote
│               └── print/route.ts   # Print quote
├── components/
│   └── pos/
│       ├── POSLayout.tsx
│       ├── NavigationColumn.tsx
│       ├── ProductArea.tsx
│       ├── PatientBanner.tsx
│       ├── OrderSummary.tsx
│       ├── ActionsColumn.tsx
│       ├── MultiPairManager.tsx
│       ├── PackageBuilder.tsx
│       ├── DiscountModal.tsx
│       ├── NotesModal.tsx
│       ├── HoldRecall.tsx
│       ├── QuoteSearch.tsx
│       ├── QuoteHistory.tsx
│       ├── PresentView.tsx
│       ├── SignatureCapture.tsx
│       └── menus/
│           ├── ExamServicesMenu.tsx
│           ├── LensTypeMenu.tsx
│           ├── MaterialsMenu.tsx
│           ├── CoatingsMenu.tsx
│           ├── AddOnsMenu.tsx
│           ├── FramesMenu.tsx
│           └── ContactsMenu.tsx
├── stores/
│   └── quote-store.ts               # Zustand with persist
└── lib/
    └── pdf/
        └── quote-generator.ts       # PDF generation
```

---

## UI Screen Designs

### Navigation Menu (Column 1)
```
├── Exam Services      → Routine exams, diagnostics, CL fittings
├── Lens Type          → SV, Eyezen, Bifocal, Progressives, Neurolens
├── Material           → CR-39, Poly, Trivex, 1.60, 1.67, 1.72
├── Coatings           → AR (None/EZPro/Rock/Sapphire) + Photochromic
├── Add-Ons            → Polarized, Tint, Mirror, UV, Blue Light, etc.
├── Contacts           → Brand search, OD/OS params, quantity
├── Frames             → Search/filter, inventory, frame allowance
├── Settings           → Tax, discounts, printer
└── Scan               → Barcode scanner
```

### 4-Column Layout
```
┌──────────┬────────────────────────────┬─────────────────┬──────────┐
│NAVIGATION│     PRODUCT SELECTION      │  ORDER SUMMARY  │ ACTIONS  │
│  (thin)  │        (large)             │    (medium)     │  (thin)  │
│          │                            │                 │          │
│ Menu     │  Large touch-friendly      │ Patient banner  │ Hold     │
│ buttons  │  product tiles with        │ Line items      │ Discount │
│          │  prices from price list    │ Running totals  │ Notes    │
│          │                            │ Add Pair button │ Print    │
│          │                            │                 │ Email    │
│          │                            │                 │ Checkout │
└──────────┴────────────────────────────┴─────────────────┴──────────┘
```

---

## Summary

| Aspect | Approach |
|--------|----------|
| **Layout** | 4-column: Nav / Products / Summary / Actions |
| **Persistence** | Auto-save every click, DB-backed, URL state |
| **Pricing** | Pre-calculated price lists, VSP tier dependency handling |
| **iPad** | Touch-optimized, offline capable, landscape primary |
| **Errors** | Inline warnings, auto-recovery, never block user |
| **Upselling** | Smart badges, contextual prompts, comparison mode |
| **Output** | Present view, signature, print/email/PDF |
| **Timeline** | ~30 days for production-ready system |
