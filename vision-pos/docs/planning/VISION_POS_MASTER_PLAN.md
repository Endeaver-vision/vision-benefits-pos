# VISION BENEFITS POS - MASTER PLANNING DOCUMENT
**Project:** AI-Powered Vision Benefits Point of Sale System  
**Version:** 1.0 - Complete Planning Phase  
**Date:** October 30, 2025  
**Status:** Ready for Architecture & Development

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Core Product Vision](#core-product-vision)
3. [Complete Feature List](#complete-feature-list)
4. [All 20 Edge Cases - Approved Solutions](#all-20-edge-cases)
5. [UI/UX Specifications](#uiux-specifications)
6. [Analytics & Reporting Requirements](#analytics--reporting)
7. [User Roles & Permissions](#user-roles--permissions)
8. [Data Requirements](#data-requirements)
9. [Phased Rollout Plan](#phased-rollout-plan)
10. [Technical Requirements](#technical-requirements)
11. [Success Criteria](#success-criteria)

---

## EXECUTIVE SUMMARY

### What We're Building
An intelligent point-of-sale system that automatically reads vision insurance authorization documents via GPT-4o, calculates accurate patient costs across VSP/EyeMed/Spectera carriers, and enables non-optical staff to confidently generate quotes and complete sales.

### Why It Matters
- **Current Pain:** Staff juggling 5+ lists to determine progressive tiers, manually reading PDFs, calculating complex insurance benefits
- **Solution:** AI reads documents, system knows product tiers, real-time calculation with built-in safeguards
- **Result:** <30 second quote generation, zero insurance expertise required, 100% pricing accuracy

### Who It's For
- **Primary Users:** Sales associates with minimal optical experience
- **Secondary Users:** Managers (oversight, corrections, analytics)
- **Admin Users:** System configuration, product catalog management
- **Locations:** 2 offices (Downtown, Westside)

### Key Innovation
GPT-4o document intelligence + dynamic pricing schemas + bulletproof validation = Staff confidence + Patient trust + Revenue growth

---

## CORE PRODUCT VISION

### The Problem We're Solving
1. **Complex Insurance Rules** - Different copays, allowances, overages per carrier/plan
2. **Product Tier Confusion** - 100+ progressive lenses across 5 tiers, staff can't memorize
3. **Manual PDF Reading** - Error-prone, time-consuming benefit extraction
4. **Calculation Errors** - Complex math with frame overages, second pairs, contact lens rebates
5. **Staff Training Gap** - New staff overwhelmed, takes months to become proficient

### The Solution Stack
```
LAYER 1: Document Intelligence
└─ GPT-4o reads authorization PDFs
└─ Extracts copays, allowances, tiers with confidence scoring
└─ Human review for low-confidence extractions

LAYER 2: Pricing Engine
└─ Dynamic schemas (VSP, EyeMed, Spectera)
└─ Static product formularies (progressive tiers, AR tiers)
└─ Real-time calculation with validation rules

LAYER 3: User Interface
└─ Simple Mode (guided wizard for beginners)
└─ Advanced Mode (full control for experienced staff)
└─ Package templates (Top-Tier, Computer, Sunglass)
└─ Smart prompts (gentle upsell suggestions)

LAYER 4: Business Intelligence
└─ Real-time analytics dashboard
└─ Staff leaderboards (gamification)
└─ KPI tracking (iWellness capture, second pair conversion)
└─ Manager tools (corrections, voids, follow-ups)
```

---

## COMPLETE FEATURE LIST

### ✅ KEEP FROM EXISTING SYSTEM
- Real-time quote calculation (price updates as selections change)
- Backend price chart with plan-specific overrides
- Itemized breakdown display
- UI hints and gates (prevent impossible product combinations)
- Contact lens calculator (box → discount → insurance → rebate → final cost)
- Three distinct sale types (Exam, Frame/Lens, Contact Lenses)

### ❌ REMOVE FROM EXISTING SYSTEM
- Broken benefits parser (legacy system)
- localStorage-only persistence (replace with cloud database)
- Complex PPP manual override system (simplify dramatically)
- Feature flag mess (clean slate)

### ➕ NEW FEATURES (MUST-HAVE)

#### **1. Authentication & Multi-Location**
- Login system with user preferences
- Location-based product filtering (Downtown vs Westside inventory)
- Role-based access: Salesperson, Manager, Admin
- User activity logging

#### **2. AI Document Intelligence (GPT-4o)**
- Upload authorization PDF
- AI extracts: copays, allowances, plan name, network tier, special benefits
- Confidence scoring (High >90%, Medium 70-89%, Low <70%)
- Human review interface for medium/low confidence
- Manual override always available

#### **3. Quote Management System**
- Save quotes with patient info (before sale completion)
- Retrieve quotes by patient name/ID
- Remote quote prep (upload insurance before patient arrives)
- Quote states: Building, Draft, Presented, Signed, Completed, Cancelled, Expired
- 30-day expiration with extension option
- Multiple quotes per patient allowed

#### **4. Analytics & Sales Tracking**
- Real-time dashboard (updates as sales complete)
- Track separately: Exams | Frames/Lenses | Contact Lenses
- KPIs: Exam count, Pediatric exams, iWellness capture rate, OptoMap capture rate, CL fittings, Frame sales, Second pair conversion, Annual supply sales
- Staff leaderboards (gamification)
- Manager override capability (fix accidental entries)
- Export: Excel, CSV, PDF, Print-friendly

#### **5. Patient-Owned Frame Handling**
- Special selection: "Patient Supplied Frame"
- Frame mounting fee: $45
- Enter frame details (brand, style, material, condition)
- Two-step liability waiver:
  - Staff verbal warning (checkbox + initials)
  - Patient signature on final agreement
- Frame breakage incident tracking

#### **6. Product Catalog Management (Admin)**
- Add/remove/edit products post-launch
- Update progressive tier assignments
- Update AR coating tiers
- Change pricing (base + plan overrides)
- Location-specific product availability
- Changes propagate immediately

#### **7. Progressive/AR Tier System**
- Automatic tier lookup from formulary database
- Staff enters product name → system knows tier
- No more juggling multiple lists
- 100+ progressives mapped across VSP/EyeMed/Spectera tiers
- 30+ AR coatings mapped across tiers

#### **8. Smart Product Prompts (Configurable)**
- Admin sets up "gentle nudges"
- Example: Staff selects Crizal Easy → "Consider Crizal Rock, only $20 more"
- Toast notifications (5-second, non-blocking)
- Track acceptance rates per prompt and per staff member
- Manager can enable/disable specific prompts
- No permanent dismissal by staff (ensures consistency)

#### **9. Package Templates**
- Quick-select bundles: Top-Tier Progressive, Computer Pair, Sunglass Pair, Budget Progressive
- Admin configures: name, auto-selected products, pricing tier
- Staff can modify after applying (fully customizable)
- System tracks: package used + modifications made
- Analytics show most popular packages

#### **10. Second/Third Pair Discounts**
- Same-day purchase: 50% off retail (cash only)
- Within 30 days: 30% off retail (cash only)
- System auto-detects eligibility from purchase history
- Duplication button (copy lens config, choose new frame)
- Manager can override for edge cases (with reason logged)
- Track conversion rate (% of first pairs that add second)

#### **11. Signature Capture**
- Two-device workflow: Computer (staff) + Tablet (patient)
- QR code for easy tablet access
- Two separate signatures: Exam agreement + Materials agreement
- Fallback: Mouse signature or typed name
- No storage of signatures (not required for compliance)

#### **12. Patient-Facing Quote Output**
- Branded quote sheet (logo, colors, contact info)
- Itemized by category: Exam, Frame/Lens, Contacts, Second Pair
- Multi-format: Screen display, Print, Email PDF
- Professional layout (not homemade looking)
- Valid for 30 days (printed on quote)

#### **13. Follow-Up System**
- Manager queue of incomplete quotes
- Log contact attempts: Call, Email, SMS
- Track outcomes: Interested, Not interested, Can't reach
- Manual process (no auto-emails to avoid spam)
- Set follow-up reminders
- Convert to completed sale when patient returns

#### **14. Incomplete Sale Recovery**
- Draft quotes auto-saved
- Manager dashboard: "5 incomplete quotes today"
- Email quote functionality
- Track: Created date, last modified, expires date

---

## ALL 20 EDGE CASES - APPROVED SOLUTIONS

### 🔴 CRITICAL (System Architecture)

#### **1. QUOTE LIFECYCLE STATES**

**States:**
```
1. BUILDING - Staff actively creating quote
2. DRAFT - Saved incomplete, follow-up later
3. PRESENTED - Shown to patient, awaiting decision  
4. SIGNED - Patient signature captured, awaiting payment
5. COMPLETED - Payment processed, in analytics
6. CANCELLED - Patient declined (reason logged)
7. EXPIRED - Draft >30 days old (can refresh)
```

**Transitions:**
- BUILDING → DRAFT (save for later)
- BUILDING → PRESENTED (show to patient)
- PRESENTED → BUILDING (patient wants changes)
- PRESENTED → SIGNED (capture signature)
- SIGNED → BUILDING (patient changed mind before paying)
- SIGNED → COMPLETED (process payment)
- Any state → CANCELLED (patient declines)
- DRAFT → EXPIRED (30 days pass)

**Editing Completed Sales (Manager Only):**
- System creates correction entry (e.g., #1234-C1)
- Side-by-side comparison shown
- Manager enters reason for correction
- Analytics: Original remains + Correction applied = Net
- Full audit trail
- Alternative: Void and re-enter

---

#### **2. MULTIPLE QUOTES PER PATIENT**

**Approved:** YES, unlimited quotes per patient

**Implementation:**
- Each quote has optional description ("Progressive sunglasses", "Computer pair")
- System suggests description based on selections
- Search by patient shows all quotes sorted by status
- Can compare up to 3 quotes side-by-side

**Display:**
```
ACTIVE QUOTES (3)
├─ Quote #1234 - DRAFT - Progressive Glasses - $532
├─ Quote #1256 - SIGNED - Sunglass Pair - $245  
└─ Quote #1289 - EXPIRED - Contact Lenses - $240

COMPLETED SALES (5) - [View History]
```

---

#### **3. SALE MODIFICATION & VOIDS**

**Two Manager Tools:**

**A. EDIT (for corrections):**
- Wrong product, pricing error, forgot item
- Creates correction entry linked to original
- Manager enters reason
- Calculates $ difference
- Analytics: Net = Original + Correction
- Restrictions: Manager only, <30 days, full audit trail

**B. VOID (for mistakes):**
- Duplicate entry, never actually happened
- Manager enters reason + refund amount
- Status → VOIDED
- Removed from analytics immediately
- Cannot un-void (must create new sale)
- Restrictions: Manager/Admin only, <90 days

**Analytics Impact:**
```
Gross Sales: $10,450
Corrections: +$125
Voids: -$350
─────────────────
Net Sales: $10,225
```

---

#### **4. OPTOMAP vs iWELLNESS**

**Relationship:** NOT mutually exclusive, can select both

**OptoMap:** Ultra-wide retinal imaging - $39  
**iWellness:** OCT screening - $39

**Patient can get:**
- Neither (opt out)
- iWellness only
- OptoMap only
- Both iWellness AND OptoMap

**"Required" Handling:**
- Admin setting per location: ☐ Require OptoMap for all exams
- If enabled: Pre-checked, staff must provide reason to opt-out
- Reasons: Patient refused, Insurance doesn't cover, Medical reason, Other

**Analytics:**
- Track separately
- iWellness capture rate
- OptoMap capture rate
- Both screenings rate

---

#### **5. AI EXTRACTION - LOW CONFIDENCE**

**Confidence Tiers:**
```
≥90% = HIGH (Green)
  → Auto-apply, staff can review but not required

70-89% = MEDIUM (Yellow)
  → Show with ⚠️, staff MUST review before using

<70% = LOW (Red)
  → Flag for manual entry, show AI guess as suggestion
```

**Review Interface:**
- Field-by-field confidence scores
- Click to edit any field
- "Approve All" or approve individually
- Can always switch to manual entry
- Re-scan option if PDF quality poor

**Learning System (Future):**
- Track corrections to improve AI
- Manager sees AI accuracy report

---

### 🟡 MODERATE (UI/UX Workflows)

#### **6. FOLLOW-UP SYSTEM**

**Manager Follow-Up Queue:**
- Shows all incomplete quotes (DRAFT status)
- Sorted by age (oldest first)
- Filters: Location, Date range

**Follow-Up Actions:**
- [Call] - Log phone call, outcome, notes
- [Email] - Pre-populated email with quote attached
- [SMS] - Quick text (future/optional)
- [Mark Done] - Remove from queue with reason

**Contact Attempt Tracking:**
```
Follow-up Log:
• 10/26 - Called, no answer, left VM
• 10/28 - Emailed quote
• 10/30 - Called, patient scheduled appointment
```

**Reminders:**
- Staff can set: "Follow up in 3 days"
- Manager dashboard shows: "5 quotes need follow-up"
- Manual process (no auto-emails)

---

#### **7. SECOND PAIR TIMING VERIFICATION**

**System Auto-Detects Eligibility:**
- When staff creates new quote, system checks: "Last sale within 30 days?"
- If YES: Show banner "🎉 Second Pair Discount Available! Patient purchased 15 days ago. Eligible for 30% off."

**Discount Application:**

**Same Transaction (Same Day = 50%):**
- Staff clicks [+ Add Second Pair]
- System: Cash pricing, 50% discount, duplication of first pair lenses
- Patient chooses different frame

**Separate Transaction (Within 30 Days = 30%):**
- Banner appears automatically
- Staff clicks [Apply Discount]
- System: Cash pricing, 30% discount
- Links to original sale

**Manual Override (Manager):**
- For edge cases (patient >30 days, extend courtesy)
- Enter reason
- Enter discount %
- Full audit log

**Third Pair:** Same rules as second pair

---

#### **8. PACKAGE CUSTOMIZATION**

**Packages = Starting Points, Fully Editable**

**When staff clicks package:**
- Auto-selects all products in package
- Price calculates
- Staff CAN modify any selection
- Price updates real-time

**Package Label:**
- Shows: "Started with: Top-Tier Progressive"
- Even if modified
- Analytics track: Package used + modifications made

**Analytics:**
```
Top-Tier Progressive: 45 uses
  28 modified (62%)
  17 used as-is (38%)
  
Common modifications:
  • 15 changed Hi-Index → Poly (save $78)
  • 8 removed Transitions (save $75)
```

**[Reset to Package] Button:**
- If staff experiments, can restore original

---

#### **9. SMART PROMPTS - STAFF OVERRIDE**

**Prompt Behavior:**
- Toast notification (5 seconds, auto-dismiss)
- Three buttons: [Switch to Better Product] [Keep Original] [Dismiss]

**No Permanent Dismissal by Staff:**
- Prompts appear every time (ensures consistency)
- Prevents staff from gaming system

**Manager Can Disable Globally:**
- Admin panel: Enable/disable specific prompts
- View performance metrics per prompt

**Tracking:**
```
Prompt: Crizal Easy → Crizal Rock
Shown: 45 times
Accepted: 12 (27%)
Dismissed: 33 (73%)
Revenue from prompt: $240
```

**Staff Leaderboard:**
- Sarah: 40% prompt acceptance rate 🏆
- Mike: 28%
- Jessica: 23%

**Optional: Reason Tracking (Phase 2):**
- "Why keeping Crizal Easy?"
- Patient price-sensitive, Doesn't see value, etc.
- Helps improve prompts

---

#### **10. CONTACT LENS - DIFFERENT PER EYE**

**Toggle: ☐ Different lenses per eye**

**When OFF (default):**
```
Brand: Acuvue Oasys
Price per Box: $45
Number of Boxes: 6
Total: $270
```

**When ON:**
```
RIGHT EYE (OD):
  Brand: Acuvue Oasys
  Price per Box: $45
  Boxes: 3
  Subtotal OD: $135

LEFT EYE (OS):
  Brand: Biofinity Toric
  Price per Box: $52
  Boxes: 3
  Subtotal OS: $156

Total: $291
```

**Insurance Handling:**
- Apply to TOTAL (not split per eye)
- Insurance: $150 → applies to $291 total
- Simpler for staff and patient

**Rebate Handling:**
- Per brand
- OD: Acuvue → $40 rebate
- OS: Biofinity → No rebate
- Total rebate: $40

**Quote Display:**
- Clearly shows OD vs OS breakdown
- Final cost per box averages across all

---

### 🟢 LOWER PRIORITY (Important but Resolvable During Implementation)

#### **11. PATIENT-OWNED FRAME - LIABILITY**

**Two-Step Liability Process:**

**Step 1: Staff Warning (Before Quote)**
```
□ I have verbally informed patient:
  "The lens mounting process is intense and can
  cause frame breakage, especially with acetate
  or plastic frames that may be brittle. If your
  frame breaks during mounting, you are
  responsible for replacement."

Staff Initials: [___]
Date: 10/30/25

Cannot proceed without checkbox + initials
```

**Step 2: Patient Signature (Final Quote)**
```
PATIENT-OWNED FRAME ACKNOWLEDGMENT:

I understand and acknowledge:
• Lens mounting may damage/break my frame
• [Your Vision Center] not responsible for damage
• I have been advised to consider new frame
• Frame mounting fee ($45) non-refundable

[Patient Signature Pad]
```

**Frame Details Collected:**
- Brand, Model, Color (optional)
- Material: Plastic/Metal
- Condition: Excellent, Good, Fair, Poor

**If Frame Breaks:**
- Staff logs incident report
- Photos optional
- Patient notified
- Resolution tracked: Purchased new frame, Provided different frame, Refunded (manager discretion), Pending

**Analytics:**
- Track breakage rate by material
- Example: Plastic 10% breakage, Metal 0%
- Helps identify risk patterns

---

#### **12. NEW vs ESTABLISHED PATIENT**

**System Auto-Suggests:**
- Staff searches patient name
- If found: "ESTABLISHED" (last visit shown)
- If not found: "NEW PATIENT"

**No Automatic Expiration:**
- Once in system = always established
- Even if 5 years since last visit

**Alert for Old Patients:**
- If last visit >3 years: "⚠️ Patient hasn't visited since 2020. Please verify contact info."

**Pre-Fill for Established:**
- Insurance on file
- Contact info (with last verified date)
- Previous prescription (reference)
- Last exam date

**Staff Can Override:**
- Toggle still visible
- Can manually select "New" if needed

---

#### **13. PEDIATRIC EXAMS - SPECIAL HANDLING**

**Auto-Detection:**
- Age ≤17 = PEDIATRIC (hardcoded, not configurable)

**Automatic Adjustments:**
```
👶 PEDIATRIC PATIENT (Age: 12)

Automatic adjustments:
✓ Polycarbonate lenses FREE (safety requirement)
✓ Scratch coating included
✓ UV protection included
```

**Lens Material:**
- Polycarbonate pre-selected, shows $0
- Can upgrade: Trivex (+$30), Hi-Index (+$78)

**Parent/Guardian Signature Required:**
```
I am the parent/legal guardian of [Patient Name]
and authorize this purchase.

Parent/Guardian Name: [___]
Relationship: [Mother ▼]
[Signature Pad]
```

**Exam Tests:**
- Most tests appropriate for pediatric
- Age-appropriate notes displayed
- Some tests warned (Visual Field may be difficult for young children)

**Pricing:**
- Same as adult exams (unless specified otherwise)

**Analytics:**
- Track pediatric exams separately
- Age distribution: 0-5, 6-12, 13-17
- 100% poly compliance tracked

---

#### **14. MEDICAL vs VISION EXAM**

**Must Choose One:**
- Routine Vision Exam
- Medical Exam

**Cannot be both simultaneously**

**Difference:**
- Routine: Preventive, vision insurance, copay
- Medical: Diagnosed condition, medical insurance, deductible

**Mid-Exam Conversion:**
```
Staff can convert Routine → Medical:

[Convert to Medical Exam]
  ↓
Reason: [Glaucoma suspect, elevated IOP]
Diagnosis codes: [365.04 - Glaucoma suspect]
  ↓
Audit log: "Exam #1234 converted from Routine
to Medical by [Staff] on 10/30/25 at 2:30pm"
```

**Insurance Handling:**
- Vision insurance: Covers routine
- Medical insurance: Covers medical (diagnosis required)
- Patient may need to provide medical insurance info

**Quote Display:**
- Clear label: "Routine Vision Exam" or "Medical Eye Exam"
- Shows reason/diagnosis if medical

**Billing:**
- Staff enters basic info
- Billing dept handles complex medical coding (Option B from discussion)

---

#### **15. ANNUAL SUPPLY DISCOUNT**

**Fixed Dollar Discounts:**
- Daily disposables (annual): **$30 discount**
- All other wear cycles (annual): **$10 discount**
- NO partial discounts
- NO percentage discounts (margins too low)

**Annual Supply Definitions (per eye):**
```
Monthly: 2 boxes per eye (4 total for both eyes)
Bi-weekly: 2 twelve-packs per eye (4 total)
Weekly: 2 twenty-four packs per eye (4 total)
Daily: 4 ninety-packs per eye (8 total for both eyes)
```

**System Logic:**
1. Determine wear cycle from brand
2. Check if boxes meet annual threshold
3. If YES:
   - Daily? Apply $30
   - Other? Apply $10
4. If NO: No discount

**Different Lenses Per Eye:**
- One annual supply discount per patient purchase
- Not per eye
- OD: Dailies (4 packs) + OS: Dailies (4 packs) = **$30 total** (not $60)

**UI:**
```
Brand: Dailies Total1 (Daily)
Number of Boxes: 8 ninety-packs

Retail: 8 × $65 = $520.00
✓ Annual Supply Discount: -$30.00
Subtotal: $490.00

Additional Savings: [$30.00] (auto-filled)
```

**Admin Configuration:**
```
Annual Supply Discounts:
  Daily disposables: [$30.00]
  All other wear cycles: [$10.00]

Thresholds:
  Monthly: [2] boxes per eye
  Bi-weekly: [2] twelve-packs per eye
  Weekly: [2] twenty-four packs per eye
  Daily: [4] ninety-packs per eye
```

---

### 🔵 FUTURE (Inventory-Related)

#### **16. LOW STOCK ALERTS (Feature Toggle)**

**At Launch: DISABLED**
- Inventory system exists in database
- Feature toggle: OFF by default
- Staff see all products, no stock info
- No alerts or warnings

**Post-Launch: When Inventory Data Ready**
- Admin enters inventory counts (manual or CSV import)
- Flip toggle to ENABLED
- Stock alerts activate

**When Enabled:**
```
🟢 IN STOCK (5+ units) - No warning
🟡 LOW STOCK (1-4 units) - Yellow banner
🔴 OUT OF STOCK (0 units) - Red banner, can proceed as backorder
```

**Backorder Handling:**
- Quote marked: STATUS = "Backorder"
- Expected delivery date required
- Patient signature acknowledges delay
- Manager dashboard shows backorder queue

**Alternative Suggestions:**
- [View Alternatives] button
- Shows similar frames in stock
- One-click switch

**Inventory Reservation:**
- When quote → PRESENTED or SIGNED
- Option to reserve for 7 days
- Auto-releases if expired/cancelled

**Phased Rollout:**
- Can enable per category (Frames first, then CLs, then materials)
- Gradual inventory data entry

---

#### **17. LOCATION-SPECIFIC PRODUCTS**

**Product Tagging:**
- Each product: available_locations: ["downtown", "westside"] or ["all"]

**Staff See Only Their Location:**
- Sarah logs in → Downtown
- Product catalog filters: Show only Downtown + "all" products

**Transfer Between Locations:**
- Manager feature
- Transfer inventory from one location to another
- Log: Reason, date, who requested
- Track in-transit inventory

**Cross-Location Sales:**
- Transfer frame to patient's location
- Ship to patient from other location
- Send patient to other location (quote transfers)

**Admin Product Management:**
```
Product: Ray-Ban RB5228

Available Locations:
☑ Downtown
☑ Westside
☐ All Locations (universal)

Current Inventory:
Downtown: [5] units
Westside: [3] units
```

**Analytics:**
- By location or combined
- Top sellers per location

---

#### **18. SIGNATURE PARTIAL COMPLETION**

**Two Separate Signatures:**

**Signature 1: Exam Agreement (Check-In)**
```
Exam Services:
• Routine Exam: $10
• iWellness: $39
• OptoMap: $39
• CL Fitting: $80
Total: $168

[Patient Signature]
```
Status: exam_completed = TRUE

**Signature 2: Materials Agreement (After Exam)**
```
Exam Services: $168 ✓ (already signed)

Materials:
• Frame/Lens: $532
• Contact Lenses: $240
Total: $772

[Patient Signature]
```
Status: materials_completed = TRUE

**Patient "Thinks About It" Scenario:**
- Exam completes (in analytics)
- Materials stays SAVED (follow-up queue)
- Two independent completion flags

**Single Quote, Two Stages:**
```
Quote #1234:
  exam_completed: true
  materials_completed: false
  
Analytics:
  Exam count: +1 ✓
  Exam revenue: +$168 ✓
  Materials: Pending (not counted yet)
```

**Payment Tracking:**
- Separate payment records
- Payment 1: Exam services, completed
- Payment 2: Materials, pending

---

#### **19. CASH vs INSURANCE SWITCHING**

**Plan Selector Always Visible:**
```
Plan: [VSP Signature ▼]
  • VSP Signature
  • EyeMed Access
  • Spectera
  • Cash (No Insurance)
```

**When Staff Switches:**
```
System prompts:
⚠️ SWITCH TO CASH PRICING?

VSP Price: $542
Cash Price: $1,047
⚠️ Cash is $505 MORE than VSP

Continue with cash?
[Cancel] [Switch to Cash]
```

**Reverse (Cash → Insurance):**
```
✓ SWITCH TO INSURANCE

Cash: $1,047
VSP: $542 (saves $505!) ✓

⚠️ Authorization required
[Upload PDF] [Enter Manually] [Cancel]
```

**What Changes:**
- ✓ All pricing recalculated
- ✓ Product selections preserved
- Only pricing changes, not selections

**Smart Alert:**
```
💡 INSURANCE SAVINGS ALERT

Patient could save $505 with VSP.
Recommend verifying eligibility.

[Check Insurance] [Continue Cash]
```

---

#### **20. VOIDED SALES - ANALYTICS**

**Void Workflow:**
```
Manager voids sale #1234:

Reason:
○ Duplicate entry
○ Entered by mistake
○ Patient returned all items
○ Never actually completed
○ Other: [___]

Refund issued?
○ Yes - Full refund ($940)
○ Yes - Partial: [$___]
○ No refund

[Confirm Void]
```

**Immediate Analytics Impact:**
- Real-time removal from counts/revenue
- Status: "completed" → "voided"
- Full audit trail

**Voided Sales Log:**
```
VOIDED SALES - Last 30 Days

Sale #1234 - $940
Voided by: Manager Jane
Reason: Duplicate entry
Refund: $940
Date: 10/30/25 4:15pm
```

**Reports:**
```
Gross Sales: $34,870 (150 sales)
Corrections: +$125
Voids: -$1,482
───────────────────
Net Sales: $33,513 (148 sales)

Void Rate: 1.3%
```

**Restrictions:**
- Manager/Admin only
- Cannot void >90 days old
- Requires reason
- Cannot un-void
- High-value warning

---

## UI/UX SPECIFICATIONS

### Design System

#### **Color Palette**
```
PRIMARY (Purple/Blue):
  Main: #5B4ECC
  Hover: #7C3AED
  Light: #E1F5FF

SECONDARY (Teal):
  Accent: #06B6D4

SUCCESS (Green):
  Main: #10B981

WARNING (Amber):
  Main: #F59E0B

DANGER (Red):
  Main: #EF4444

NEUTRAL:
  Dark Text: #1F2937
  Medium Gray: #9CA3AF
  Light Gray: #E5E7EB
  Off-White BG: #F9FAFB

PRICING:
  Price Text: #059669 (teal-green, stands out)
```

#### **Typography**
```
HEADINGS:
  Card Titles: 20px Bold, Dark Gray
  Section Headers: 14px UPPERCASE, Medium Gray, Letter-spacing

BODY:
  Regular: 14px Normal, Dark Gray
  Prices: 16px Semibold, Teal-Green
  Hints: 13px Italic, Medium Gray

BUTTONS:
  Label: 14px Semibold
  Price on button: 12px Normal
```

#### **Spacing**
```
CARDS:
  Padding: 24px
  Gap between cards: 16px

SECTIONS:
  Margin between: 20px
  Divider line: 1px solid light gray

BUTTONS:
  Padding: 12px 16px
  Gap between: 8px
  Border radius: 8px

INPUTS:
  Height: 40px
  Padding: 10px 12px
  Border radius: 6px
```

#### **Interactive States**
```
BUTTONS:
  Default: White bg, Gray border
  Hover: Light purple bg, Purple border
  Selected: Purple bg, White text, Shadow
  Disabled: Gray bg, Gray text

INPUTS:
  Default: White bg, Gray border
  Focus: Purple ring, Purple border
  Error: Red ring, Red border
```

### Layout Structure

```
┌───────────────────────────────────────────────┐
│  🏥 YOUR VISION CENTER                        │
│  Location: Downtown ▼  Staff: Sarah ▼        │
└───────────────────────────────────────────────┘
┌─────────────────────────────┬─────────────────┐
│  QUOTE BUILDER              │  💰 PRICE       │
│                             │     SUMMARY     │
│  ┌─────────────────────┐   │                 │
│  │ 1️⃣ EXAM SERVICES    │   │  Exam: $10      │
│  │ ☑ Include Exam      │   │  iWellness: $39 │
│  │ ━━━━━━━━━━━━━━━━━━  │   │  Materials: $483│
│  │ Patient Type:       │   │  ─────────────  │
│  │ [New] [Established] │   │  TOTAL: $532    │
│  │                     │   │                 │
│  │ Exam Type:          │   │  [Signature ✍️] │
│  │ [Routine] [Medical] │   │  [Print 🖨️]     │
│  │                     │   │  [Complete ✓]   │
│  │ Screeners:          │   │                 │
│  │ ☑ iWellness $39     │   │  ⚠️ Need lens   │
│  │ ☑ OptoMap $39       │   │     material    │
│  └─────────────────────┘   └─────────────────┘
│                             
│  ┌─────────────────────┐
│  │ 2️⃣ FRAME & LENSES   │
│  │ ☑ Include Glasses   │
│  │ ━━━━━━━━━━━━━━━━━━  │
│  │ Quick Packages:     │
│  │ [⭐ Top-Tier]        │
│  │ [💻 Computer]       │
│  │ [🕶️ Sunglass]       │
│  └─────────────────────┘
│
│  ┌─────────────────────┐
│  │ 3️⃣ CONTACT LENSES   │
│  │ ☐ Include Contacts  │
│  └─────────────────────┘
│
│  [+ Add Second Pair (50% off)]
└─────────────────────────────┘
```

### Card-Based Components

#### **Exam Card**
```
┌─────────────────────────────────────────────┐
│  📋 EXAMS                          $0.00    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│  PATIENT TYPE                               │
│  ┌─────────────┐  ┌─────────────┐         │
│  │ New Patient │  │ Established │  ✓      │
│  └─────────────┘  └─────────────┘         │
│                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│  EXAM TYPE                                  │
│  ┌──────────────┐  ┌──────────────┐       │
│  │ Routine Exam │  │ Medical Exam │  ✓    │
│  │    $10       │  │    $100      │       │
│  └──────────────┘  └──────────────┘       │
│                                             │
│  💡 Cash exam fee is $100                  │
│                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│  SCREENERS                                  │
│  ┌─────────────┐  ┌──────────────────────┐│
│  │ ✓ iWellness │  │ ✓ OptoMap (UWF)      ││
│  │    $39      │  │    $39                ││
│  └─────────────┘  └──────────────────────┘│
│                                             │
│  DIAGNOSTICS                                │
│  ┌────────┐ ┌──────────┐ ┌──────────┐    │
│  │ OCT    │ │ Visual   │ │ External │    │
│  │ $85    │ │ Field $55│ │ Photos   │    │
│  └────────┘ └──────────┘ └──────────┘    │
│                                             │
│  🔬 CONTACT LENS EXAM                      │
│  ☑ Include CL Exam                         │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Spherical │ │  Toric   │ │Monovision│  │
│  │  $60     │ │  $80     │ │  $80     │  │
│  └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────┘
```

#### **Frame/Lens Card**
```
┌─────────────────────────────────────────────┐
│  👓 FRAME & LENSES                 $0.00    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│  QUICK PACKAGES                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ ⭐ Top-  │ │💻 Computer│ │🕶️ Sun-  │  │
│  │   Tier   │ │   Pair    │ │  glass   │  │
│  └──────────┘ └──────────┘ └──────────┘  │
│                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│  FRAME                                      │
│  Brand/Model: [________________]           │
│  Retail Price: [$______]                   │
│                                             │
│  Frame Allowance: $150                     │
│  Patient Pays: $40 (overage with 20% off) │
│                                             │
│  Mount: [Full-Rim] [Semi-Rimless] [Rimless]│
│                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│  LENSES                                     │
│  Lens Category:                             │
│  [Single Vision] [Multifocal] ✓            │
│                                             │
│  Lens Type:                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Varilux  │ │ Varilux  │ │ Varilux  │  │
│  │    X     │ │Comfort DRx│ │   Max    │  │
│  │  $175    │ │  $120     │ │  $135    │  │
│  └──────────┘ └──────────┘ └──────────┘  │
│                                             │
│  Material:                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │   Poly   │ │Hi-Index  │ │  Trivex  │  │
│  │Carbonate │ │   1.67    │ │          │  │
│  │   $31    │ │   $78     │ │   $76    │  │
│  └──────────┘ └──────────┘ └──────────┘  │
│                                             │
│  ☐ Pediatric (Poly included FREE)          │
│                                             │
│  AR Coating:                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Crizal  │ │  Crizal  │ │  Crizal  │  │
│  │ Sapphire │ │   Rock    │ │   Easy   │  │
│  │  $182    │ │   $85     │ │   $117   │  │
│  └──────────┘ └──────────┘ └──────────┘  │
│                                             │
│  Transitions:                               │
│  [Gen S $75] [XtraActive $100] [None]     │
│                                             │
│  ☐ Polarized $130                          │
│                                             │
│  Add-Ons:                                   │
│  ☐ UV $40  ☐ Mirror $70  ☐ Tint $50       │
│  ☐ Blue Light $50  ☐ Tech Add-on $40      │
└─────────────────────────────────────────────┘
```

#### **Contact Lens Card**
```
┌─────────────────────────────────────────────┐
│  👁️ CONTACT LENSES                 $0.00   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│  SELECT BRAND                               │
│  ┌────────┐ ┌────────┐ ┌────────┐         │
│  │ Acuvue │ │Biofinity│ │  Air   │         │
│  │  Oasys │ │         │ │ Optix  │         │
│  └────────┘ └────────┘ └────────┘         │
│                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐         │
│  │Dailies │ │Precision│ │ Ultra  │         │
│  │ Total1 │ │   1     │ │        │         │
│  └────────┘ └────────┘ └────────┘         │
│                                             │
│  [Clariti] [Other...]                      │
│                                             │
│  ☐ Different lenses per eye                │
│                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│  PRICING BREAKDOWN                          │
│                                             │
│  Price per Box:        Number of Boxes:    │
│  [$45.00]              [6]                 │
│                                             │
│  Total Cost: $270.00                       │
│                                             │
│  Additional Savings:   Insurance Benefit:  │
│  [$40.00]              [$150.00]           │
│                                             │
│  In-Office Total: $80.00                   │
│                                             │
│  Manufacturer Rebate:  After Rebate:       │
│  [$80.00]              [$0.00]             │
│                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│  💰 FINAL COST PER BOX: $0.00              │
└─────────────────────────────────────────────┘
```

### Price Summary Sidebar

```
┌─────────────────────────────┐
│  💰 PRICE SUMMARY           │
│  ━━━━━━━━━━━━━━━━━━━━━━━  │
│                             │
│  Exam Services:             │
│  • Exam Copay.........$10   │
│  • iWellness..........$39   │
│  • OptoMap............$39   │
│  • CL Fitting.........$80   │
│  Subtotal............$168   │
│                             │
│  Frame & Lenses:            │
│  • Frame..............$40   │
│  • Varilux X.........$175   │
│  • Hi-Index 1.67......$78   │
│  • Crizal Rock........$85   │
│  • Transitions........$75   │
│  • Rimless Mount......$30   │
│  Subtotal............$483   │
│                             │
│  Contact Lenses:            │
│  • 6 boxes.............$0   │
│  Subtotal..............$0   │
│                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━  │
│                             │
│  TOTAL                      │
│  PATIENT PAYS              │
│  $651.00                   │
│                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━  │
│                             │
│  ⚠️ Gating Issues:          │
│  • Need lens material       │
│                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━  │
│                             │
│  [✍️ Signature]             │
│  [🖨️ Print Quote]           │
│  [✓ Complete Sale]          │
│  (disabled until gated)     │
│                             │
└─────────────────────────────┘
```

### Patient-Facing Quote Output

```
╔═══════════════════════════════════════╗
║   YOUR VISION CENTER                  ║
║   123 Main St | (555) 123-4567       ║
║   www.yourvisioncenter.com           ║
╠═══════════════════════════════════════╣
║                                       ║
║  QUOTE FOR: John Smith                ║
║  DATE: October 30, 2025               ║
║  QUOTE #: 2025-1234                   ║
║  VALID UNTIL: November 29, 2025       ║
║                                       ║
╠═══════════════════════════════════════╣
║  EXAM SERVICES                        ║
║  ─────────────────────────────        ║
║  Routine Eye Exam.............$10     ║
║  iWellness Scan...............$39     ║
║  OptoMap Retinal Image........$39     ║
║  Contact Lens Fitting (Toric)..$80    ║
║                          ─────────    ║
║  Exam Subtotal...............$168     ║
║                                       ║
╠═══════════════════════════════════════╣
║  FRAME & LENSES                       ║
║  ─────────────────────────────        ║
║  Frame: Ray-Ban RB5228            $40 ║
║    (Retail $250, Allowance $150,      ║
║     Overage $100 @ 60% = $40)         ║
║                                       ║
║  Progressive Lens: Varilux X..$175    ║
║  Material: Hi-Index 1.67.......$78    ║
║  AR Coating: Crizal Rock.......$85    ║
║  Transitions Gen S.............$75    ║
║  Rimless Mounting..............$30    ║
║                          ─────────    ║
║  Frame/Lens Subtotal.........$483     ║
║                                       ║
╠═══════════════════════════════════════╣
║  CONTACT LENSES                       ║
║  ─────────────────────────────        ║
║  Acuvue Oasys for Astigmatism         ║
║  6 boxes @ $45/box............$270    ║
║  Annual supply discount.......-$10    ║
║  Insurance allowance.........-$150    ║
║  Manufacturer rebate..........-$80    ║
║                          ─────────    ║
║  Contact Lens Subtotal.........$30    ║
║                                       ║
╠═══════════════════════════════════════╣
║  TOTAL DUE TODAY.............$681     ║
╠═══════════════════════════════════════╣
║                                       ║
║  Insurance: VSP Signature             ║
║  Member ID: 123456789                 ║
║                                       ║
║  This quote is valid for 30 days.     ║
║  Questions? Call (555) 123-4567       ║
║                                       ║
╚═══════════════════════════════════════╝
```

### Toast Notifications (Smart Prompts)

```
┌──────────────────────────────────────┐
│ 💡 Consider Crizal Rock              │
│ Better scratch resistance, only $20  │
│ more. Your patients will thank you!  │
│ [Switch to Rock] [Keep Easy]         │
└──────────────────────────────────────┘

Auto-dismisses in 5 seconds
Non-blocking (doesn't stop workflow)
```

---

## ANALYTICS & REPORTING

### Key Performance Indicators (KPIs)

#### **Exam Metrics**
```
TRACK SEPARATELY:

Exam Type Breakdown:
├─ Comprehensive Exams (existing patients)
├─ New Patient Exams
├─ Medical Exams (vs routine)
└─ Cash Pay Exams (no insurance)

Exam Add-Ons:
├─ Contact Lens Fittings (by type: Sphere, Toric, RGP, Specialty, Myopia Mgmt)
├─ iWellness Screenings (COUNT + CAPTURE RATE)
├─ OptoMap Screenings (COUNT + CAPTURE RATE)
├─ OCT Scans
├─ Visual Field Tests
└─ Pediatric Exams (age ≤17)

Revenue:
├─ Total Exam Revenue
├─ Average Exam Revenue
└─ Exam Revenue by Type
```

#### **Materials Metrics**
```
Frame Sales:
├─ Total Frame Count
├─ Patient-Owned Frames (separate count)
├─ Average Frame Retail Price
└─ Frame Revenue (after insurance)

Lens Sales:
├─ Total Lens Pair Count
├─ Progressive vs SV vs Bifocal breakdown
├─ Premium Tier % (Varilux X, etc.)
├─ Average Lens Revenue
└─ Total Lens Revenue

Second Pair:
├─ Second Pair Count
├─ Second Pair Revenue
├─ Second Pair Conversion Rate (% of first pairs)
└─ Same-day (50%) vs 30-day (30%) breakdown
```

#### **Contact Lens Metrics**
```
CL Sales:
├─ Total CL Sales Count
├─ Annual Supply Count (FLAG THESE!)
├─ Average CL Sale Amount
├─ Total CL Revenue
└─ Brand Breakdown (top sellers)

Annual Supply Conversion:
└─ % of CL sales that are annual supply (GOAL: 50%+)
```

#### **Diagnostic Screening Metrics**
```
iWellness:
├─ Count
├─ Capture Rate (% of exams)
└─ Revenue

OptoMap:
├─ Count
├─ Capture Rate (% of exams)
└─ Revenue

Combined:
└─ Both iWellness + OptoMap rate
```

### Dashboard Views

#### **Daily Summary (Front Desk)**
```
┌─────────────────────────────────────────┐
│  TODAY'S PERFORMANCE - Downtown         │
│  Wednesday, October 30, 2025           │
├─────────────────────────────────────────┤
│  EXAMS                                  │
│  Comprehensive: 12                     │
│  New Patient: 3                        │
│  Pediatric: 2                          │
│  Contact Lens Fittings: 5              │
│  iWellness: 8 (67% capture) 📈         │
│  OptoMap: 10 (83% capture) 🎯          │
│                                         │
│  MATERIALS                              │
│  Frame/Lens Pairs: 9                   │
│  Second Pairs: 4 (44% conversion!) 🎯  │
│  Contact Lens Sales: 6                 │
│  Annual Supplies: 4 (67%)              │
│                                         │
│  REVENUE                                │
│  Exams: $1,240                         │
│  Materials: $4,567                     │
│  Contacts: $890                        │
│  ─────────────────                     │
│  TOTAL: $6,697                         │
└─────────────────────────────────────────┘
```

#### **Staff Leaderboard (Gamification)**
```
🏆 LEADERBOARD - This Week

┌─────┬──────────┬───────┬──────────┬─────────┐
│ Rank│   Name   │ Sales │  Revenue │  iWell% │
├─────┼──────────┼───────┼──────────┼─────────┤
│  🥇 │  Sarah   │  23   │  $12.4K  │   78%   │
│  🥈 │  Mike    │  19   │  $10.1K  │   71%   │
│  🥉 │  Jessica │  17   │   $9.3K  │   65%   │
│  4  │  David   │  15   │   $8.2K  │   60%   │
└─────┴──────────┴───────┴──────────┴─────────┘

View: [My Stats] [Team Stats] [Location Compare]
```

#### **Manager Weekly/Monthly View**
```
WEEK OF OCT 23-30, 2025
Both Locations Combined

┌─────────────┬─────────┬─────────┬─────────┐
│   METRIC    │ THIS WK │ LAST WK │ CHANGE  │
├─────────────┼─────────┼─────────┼─────────┤
│ Exams       │   67    │   59    │ +13.6%  │
│ Pediatric   │   12    │    8    │ +50%    │
│ iWellness   │   45    │   38    │ +18.4%  │
│ OptoMap     │   56    │   48    │ +16.7%  │
│ CL Fits     │   23    │   21    │ +9.5%   │
├─────────────┼─────────┼─────────┼─────────┤
│ Frames      │   54    │   48    │ +12.5%  │
│ Second Pair │   22    │   15    │ +46.7%  │
│ CL Annual   │   18    │   16    │ +12.5%  │
├─────────────┼─────────┼─────────┼─────────┤
│ Total Rev   │ $34.5K  │ $29.8K  │ +15.8%  │
└─────────────┴─────────┴─────────┴─────────┘

TOP PERFORMERS:
👤 Sarah: 18 exams, 15 materials, $8.2K
👤 Mike: 15 exams, 12 materials, $6.9K
```

### Date Range Selector (QuickBooks Style)
```
┌─────────────────────────────────┐
│  View: [Today ▼]                │
│    • Today                      │
│    • This Week                  │
│    • This Month                 │
│    • Last Month                 │
│    • Year to Date               │
│    • Custom Range...            │
│                                 │
│  Compare to:                    │
│  □ Same period last year        │
│  □ Previous period              │
└─────────────────────────────────┘
```

### Export Options
```
[Export ▼]
  ├─ Excel (.xlsx)
  ├─ CSV
  ├─ PDF Report
  └─ Print-Friendly Summary
```

---

## USER ROLES & PERMISSIONS

### Role Definitions

#### **Salesperson (Front Desk)**
**Can:**
- Create quotes
- Complete sales
- Capture patient signatures
- View their own sales history
- View today's team performance
- Save quotes for later
- Print/email quotes

**Cannot:**
- Edit completed sales
- Void sales
- See other staff's detailed stats
- Access admin settings
- Manage product catalog

---

#### **Manager**
**Can (Everything Salesperson can, plus):**
- Edit completed sales (with reason + audit trail)
- Void sales (with reason + refund tracking)
- View all sales (all staff, both locations)
- Access follow-up queue (incomplete quotes)
- Run analytics reports
- Export data (Excel, CSV, PDF)
- Review AI-extracted benefits (low confidence)
- Override discounts manually
- Transfer inventory between locations
- View staff performance metrics
- Access voided sales log

**Cannot:**
- Change system-level settings
- Add/remove users
- Manage product catalog
- Configure smart prompts

---

#### **Admin**
**Can (Everything Manager can, plus):**
- Manage users (add, edit, remove, assign roles)
- Manage product catalog (add/edit/remove products)
- Assign product tiers (progressive, AR)
- Configure package templates
- Configure smart prompts (enable/disable, edit messages)
- Manage location settings
- Configure annual supply discounts
- Toggle inventory system on/off
- Access audit logs
- System-level configuration

**Cannot:**
- Nothing (full access)

---

### Permission Matrix

```
┌──────────────────────────┬────────┬─────────┬───────┐
│ Feature                  │ Sales  │ Manager │ Admin │
├──────────────────────────┼────────┼─────────┼───────┤
│ Create Quote             │   ✓    │    ✓    │   ✓   │
│ Complete Sale            │   ✓    │    ✓    │   ✓   │
│ View Own Stats           │   ✓    │    ✓    │   ✓   │
│ Edit Completed Sale      │   ✗    │    ✓    │   ✓   │
│ Void Sale                │   ✗    │    ✓    │   ✓   │
│ View All Sales           │   ✗    │    ✓    │   ✓   │
│ Run Reports              │   ✗    │    ✓    │   ✓   │
│ Follow-Up Queue          │   Own  │   All   │  All  │
│ Manual Discount Override │   ✗    │    ✓    │   ✓   │
│ Review AI Extractions    │   ✗    │    ✓    │   ✓   │
│ Manage Users             │   ✗    │    ✗    │   ✓   │
│ Manage Products          │   ✗    │    ✗    │   ✓   │
│ Configure Prompts        │   ✗    │    ✗    │   ✓   │
│ System Settings          │   ✗    │    ✗    │   ✓   │
└──────────────────────────┴────────┴─────────┴───────┘
```

---

## DATA REQUIREMENTS

### What Needs to Be Stored

#### **Users & Authentication**
```
users:
  user_id (UUID)
  email (unique)
  password_hash
  first_name
  last_name
  role (salesperson, manager, admin)
  location (downtown, westside, both)
  is_active (boolean)
  last_login
  created_at
  updated_at
```

#### **Patients**
```
patients:
  patient_id (UUID)
  first_name
  last_name
  date_of_birth (calculate age dynamically)
  email
  phone
  is_pediatric (calculated: age ≤17)
  created_at
  updated_at
```

#### **Insurance Authorizations**
```
insurance_authorizations:
  authorization_id (UUID)
  patient_id (FK)
  carrier (VSP, EyeMed, Spectera)
  plan_name (VSP Signature, EyeMed Access, etc.)
  network_tier
  
  // Extracted benefits
  exam_copay (decimal)
  materials_copay (decimal)
  frame_allowance (decimal)
  frame_overage_discount (0.20 = 20%)
  contact_allowance (decimal)
  lens_pricing_tier
  
  // Special benefits (JSONB)
  special_benefits (JSON: UV coating, AR allowance, etc.)
  
  // Document metadata
  original_pdf_url (S3 path)
  extraction_confidence (0-1.0)
  requires_review (boolean)
  reviewed_by (user_id)
  reviewed_at
  
  effective_date
  expiration_date
  service_frequency (12_month, 24_month, calendar_year)
  last_service_date
  
  created_at
  updated_at
```

#### **Quotes**
```
quotes:
  quote_id (UUID)
  authorization_id (FK, nullable)
  patient_id (FK)
  
  // Quote details
  quote_date
  expiration_date (quote_date + 30 days)
  status (building, draft, presented, signed, completed, cancelled, expired)
  description (optional: "Progressive sunglasses")
  
  // Services (JSONB for flexibility)
  include_exam (boolean)
  exam_selections (JSON)
  exam_cost (decimal)
  exam_completed (boolean)
  exam_signature_captured_at
  
  include_glasses (boolean)
  frame_selections (JSON)
  lens_selections (JSON)
  glasses_cost (decimal)
  
  include_contacts (boolean)
  contact_selections (JSON)
  contact_cost (decimal)
  materials_completed (boolean)
  materials_signature_captured_at
  
  include_second_pair (boolean)
  second_pair_selections (JSON)
  second_pair_cost (decimal)
  
  // Totals
  subtotal (decimal)
  tax (decimal)
  total_patient_responsibility (decimal)
  
  // Metadata
  calculation_details (JSON: which rules applied)
  validation_warnings (JSON)
  package_template_used (nullable)
  package_modified (boolean)
  
  created_by (user_id)
  location (downtown, westside)
  created_at
  updated_at
```

#### **Sales (Completed Quotes)**
```
sales:
  sale_id (UUID)
  quote_id (FK)
  patient_id (FK)
  authorization_id (FK, nullable)
  
  sale_date
  sale_status (completed, voided)
  
  // What was sold (denormalized for reporting)
  exam_revenue (decimal)
  glasses_revenue (decimal)
  contacts_revenue (decimal)
  second_pair_revenue (decimal)
  total_revenue (decimal)
  
  // Counts for analytics
  exam_count (0 or 1)
  exam_type (comprehensive, new_patient, medical, cash)
  pediatric_exam (boolean)
  iwellness_count (0 or 1)
  optomap_count (0 or 1)
  cl_fitting_count (0 or 1)
  cl_fitting_type (sphere, toric, etc.)
  
  frame_count (0, 1, 2, 3 - includes second/third pairs)
  patient_owned_frame (boolean)
  
  lens_pair_count (0, 1, 2, 3)
  progressive_count (0, 1, 2, 3)
  premium_progressive_count (0, 1, 2, 3)
  
  contact_lens_sale (boolean)
  annual_supply (boolean)
  
  second_pair_count (0, 1, 2)
  second_pair_discount_type (same_day_50, thirty_day_30, manual_override)
  
  // Payment
  payment_method (credit, debit, cash, check)
  amount_collected (decimal)
  
  // Audit
  voided (boolean)
  voided_at
  voided_by (user_id)
  void_reason
  refund_amount (decimal)
  
  created_by (user_id)
  location
  created_at
  updated_at
```

#### **Products**
```
products:
  product_id (VARCHAR PK)
  product_name
  category (frame, progressive, ar_coating, material, enhancement, contact_lens)
  
  // Pricing
  retail_price (decimal, can be null for catalog items)
  
  // Tier assignments
  vsp_tier (K, J, F, N, O, etc.)
  eyemed_tier (1-5, standard)
  spectera_tier (I-V)
  
  // Location availability
  available_locations (ARRAY: ['downtown', 'westside'] or ['all'])
  
  // For contact lenses
  wear_cycle (monthly, biweekly, weekly, daily)
  boxes_per_eye_annual (2, 4, etc.)
  
  // Metadata
  manufacturer
  sku
  is_active (boolean)
  created_at
  updated_at
```

#### **Inventory** (Future)
```
inventory:
  inventory_id (UUID)
  product_id (FK)
  location (downtown, westside)
  
  quantity (integer, NULL if not tracking)
  reorder_point (integer)
  reorder_quantity (integer)
  
  last_counted_at
  last_updated_at
```

#### **Package Templates**
```
package_templates:
  template_id (UUID)
  template_name ("Top-Tier Progressive")
  description
  icon (emoji or image)
  
  // Auto-selections (JSONB)
  auto_select_products (JSON)
  
  // Display
  show_for_plans (ARRAY: ['VSP', 'EyeMed', 'Spectera', 'Cash'])
  staff_hint
  
  is_active (boolean)
  display_order (integer)
  created_at
  updated_at
```

#### **Smart Prompts**
```
smart_prompts:
  prompt_id (UUID)
  prompt_name ("Upsell Crizal Easy → Rock")
  
  // Trigger
  trigger_product_id (FK)
  trigger_condition (when selected)
  
  // Suggested alternative
  suggest_product_id (FK)
  
  // Message
  message_text
  
  // Performance tracking
  shown_count (integer)
  accepted_count (integer)
  dismissed_count (integer)
  
  is_active (boolean)
  created_at
  updated_at
```

#### **Audit Log**
```
audit_log:
  log_id (BIGSERIAL PK)
  entity_type (patient, quote, sale, product, user, etc.)
  entity_id (UUID)
  action (create, update, delete, void, review, etc.)
  user_id (FK)
  changes (JSONB: old and new values)
  ip_address
  timestamp
  
  INDEX on (entity_type, entity_id)
  INDEX on timestamp
  INDEX on user_id
```

#### **Follow-Up Log**
```
follow_up_log:
  log_id (UUID)
  quote_id (FK)
  
  action_type (call, email, sms)
  outcome (answered_interested, answered_not_interested, no_answer_vm, no_answer, wrong_number)
  notes (text)
  next_follow_up_date (nullable)
  
  performed_by (user_id)
  performed_at
```

#### **POF Breakage Incidents**
```
pof_breakage_incidents:
  incident_id (UUID)
  sale_id (FK)
  
  frame_brand
  frame_model
  frame_material (plastic, metal)
  frame_condition_assessment (excellent, good, fair, poor)
  
  breakage_stage (fitting, mounting, adjustment)
  breakage_type (temple, bridge, rim, complete)
  
  photos (ARRAY of S3 URLs)
  
  patient_notified_at
  notified_by (user_id)
  patient_response (accepted, upset_but_acknowledged, requested_manager)
  
  resolution (purchased_new_frame, provided_different_frame, refunded, pending)
  resolution_notes
  
  created_at
```

---

## PHASED ROLLOUT PLAN

### Phase 1: Core POS (Months 1-3) - LAUNCH

**Goal:** Functional POS system for daily sales

**Must-Have Features:**
- ✅ Login & location assignment
- ✅ Product catalog with tier assignments (VSP, EyeMed, Spectera)
- ✅ Quote builder (3-layer: Exam, Frame/Lens, Contacts)
- ✅ Package templates (4-5 pre-configured)
- ✅ Second pair workflow (50% same day, 30% within 30 days)
- ✅ Real-time pricing calculation
- ✅ Patient-owned frame handling (liability waiver)
- ✅ Signature capture (two-device workflow)
- ✅ Print/email quotes
- ✅ Complete sale recording
- ✅ Real-time analytics dashboard
- ✅ Staff leaderboard
- ✅ Basic admin (add/edit products manually)

**Inventory Status:** Database ready, feature DISABLED

**Success Criteria:**
- Staff can generate quote in <30 seconds
- 100% pricing accuracy on test cases
- No training required for simple quotes
- Analytics update in real-time

---

### Phase 2: Intelligence & Polish (Months 4-5)

**Goal:** Make system smarter and more powerful

**Features:**
- ✅ GPT-4o document parser (upload PDF → extract benefits)
- ✅ Confidence scoring + human review interface
- ✅ Smart product prompts (configurable upsells)
- ✅ Incomplete sale recovery (follow-up queue)
- ✅ Quote follow-up system (email/call tracking)
- ✅ Advanced analytics (comparisons, trends, year-over-year)
- ✅ Export to Excel/CSV/PDF

**Inventory Status:** Manual entry interface available, tracking can begin

**Success Criteria:**
- >90% AI extraction accuracy
- >25% smart prompt acceptance rate
- Follow-up queue reduces abandoned quotes by 30%
- Managers love analytics

---

### Phase 3: Inventory & Scaling (Months 6-8)

**Goal:** Operational excellence

**Features:**
- ✅ Full inventory management (stock tracking)
- ✅ Low stock alerts (3-tier: in stock, low, out)
- ✅ Reorder workflows
- ✅ Transfer between locations
- ✅ Receiving/logging shipments
- ✅ Backorder management
- ✅ Frame board management (what's on display)

**Inventory Status:** ENABLED (once data entered)

**Success Criteria:**
- Zero stock-outs on popular items
- Automated reorder suggestions
- Transfer workflow takes <2 minutes

---

### Phase 4: Advanced Features (Months 9-12)

**Goal:** Nice-to-haves and optimization

**Features:**
- Patient portal (view quotes online)
- SMS notifications
- Appointment system integration
- Lab order integration
- Advanced AI suggestions (predictive upsells)
- Predictive analytics (forecast demand)
- Mobile app for staff
- Barcode scanning (receiving inventory)

**Success Criteria:**
- Patient satisfaction >90%
- Staff efficiency +50% vs. pre-system
- Manager dashboard is indispensable

---

## TECHNICAL REQUIREMENTS

### Minimum Technical Stack

**Frontend:**
- React 18+ with TypeScript
- Tailwind CSS + Shadcn/ui
- State: Zustand or Redux Toolkit
- Forms: React Hook Form + Zod
- API: TanStack Query

**Backend:**
- Node.js (TypeScript) OR Python (FastAPI)
- REST API with OpenAPI spec

**Database:**
- PostgreSQL 15+
- Redis (caching)
- S3 or equivalent (PDF storage)

**AI:**
- OpenAI GPT-4o API

**Infrastructure:**
- Cloud hosting (AWS/GCP/Azure)
- CDN (CloudFront/Cloudflare)
- Monitoring (Sentry + DataDog)

---

## SUCCESS CRITERIA

### Quantitative Metrics

**Performance:**
- Quote generation time: <30 seconds average
- Document processing time: <10 seconds
- API response time: <500ms (p95)
- System uptime: >99.5%

**Accuracy:**
- Benefit extraction accuracy: >95%
- Pricing calculation accuracy: 100%
- Validation error rate: <1% false positives

**User Adoption:**
- Daily active users: >80% of staff
- Quotes per user per day: >10
- User error rate: <5%
- Net Promoter Score (NPS): >50

**Business Impact:**
- Quote-to-order conversion: >60%
- Time savings vs. manual: >80% reduction
- Training time to proficiency: <2 hours
- Support tickets per week: <10
- iWellness capture rate: >70%
- Second pair conversion rate: >40%
- Annual supply conversion: >50%

### Qualitative Success

**Staff Feedback:**
- "I can confidently quote any patient now"
- "This is so much faster than before"
- "The leaderboard motivates me"
- "I love the package buttons"

**Manager Feedback:**
- "Analytics are exactly what I need"
- "Follow-up queue saves us money"
- "I can trust the system is accurate"

**Patient Feedback:**
- "The quote was clear and professional"
- "Staff knew exactly what I needed"
- "Checkout was fast"

---

## OUTSTANDING QUESTIONS / DECISIONS NEEDED

### Before Architecture Phase

1. **Tech Stack Preference:**
   - Backend: Node.js or Python?
   - Deployment: AWS, GCP, or Azure?
   - Existing infrastructure to integrate with?

2. **Insurance Document Upload:**
   - Who uploads? (Front desk at check-in, or pre-appointment?)
   - Where stored? (S3, database, both?)
   - Retention policy? (How long keep PDFs?)

3. **Medical Exam Billing:**
   - Does billing dept handle all medical coding?
   - Or does staff need diagnosis code picker?
   - Integration with practice management system?

4. **Pricing Sources:**
   - Do you have existing price lists in digital format?
   - Or manual entry required for all products?
   - How often do prices change?

5. **Lab Integration:**
   - Which labs do you use?
   - Do they have APIs?
   - Or manual order submission?

6. **EHR/Practice Management:**
   - Existing system to integrate with?
   - Patient data import/export needed?
   - Appointment system integration?

7. **Payment Processing:**
   - Credit card terminal integration?
   - Square/Stripe API?
   - Or just record payment method (process elsewhere)?

8. **Budget & Timeline:**
   - Development budget available?
   - Target launch date?
   - Phased rollout acceptable or all-at-once?

---

## APPENDIX

### Glossary

**AR:** Anti-Reflective coating  
**CL:** Contact Lenses  
**Copay:** Patient's fixed cost for covered service  
**Overage:** Amount frame/lens cost exceeds insurance allowance  
**POF:** Patient-Owned Frame  
**Progressive:** Multifocal lens (no visible line)  
**Tier:** Product quality classification (affects pricing)  
**UCR:** Usual, Customary, and Reasonable (pricing standard)

### Reference Documents

All schema files, manuals, and analysis documents are available in:
`/mnt/project/`

Key files:
- `vsp_dynamic_schema_v1.md` - VSP pricing schema
- `eyemed_dynamic_schema_v1.md` - EyeMed pricing schema
- `spectera_dynamic_schema_v3.md` - Spectera pricing schema
- `VSP_Manual_Plain_text.txt` - Full VSP provider manual
- `Eyemed__tiers_manual_consolidated_.txt` - EyeMed tiers
- `Spectera_Consolidated_Tiers_and_Manual2025.txt` - Spectera tiers

---

## DOCUMENT STATUS

**✅ COMPLETE - READY FOR ARCHITECTURE PHASE**

This master planning document represents the complete output of our planning session. All 20 edge cases have been resolved, all features specified, and all UI/UX decisions documented.

**Next Steps:**
1. Review this document with stakeholders
2. Resolve outstanding questions
3. Begin technical architecture phase:
   - Complete database schema design
   - API endpoint specification
   - Authentication system design
   - Tech stack finalization
   - Development timeline with sprint breakdown

**Document Control:**
- Version: 1.0
- Last Updated: October 30, 2025
- Created by: Planning Session with Claude
- Status: Approved for Architecture Phase
- Next Review: After technical architecture complete

---

**This document is the single source of truth for the Vision Benefits POS project.**