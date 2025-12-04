# Vision POS: Road to Production

> **Living Document** - Updated as we test and fix
> Last Updated: 2025-12-01

---

## Current Status: PRE-TESTING

**Goal:** Complete a full transaction flow (Customer → Quote → Payment)

---

## Phase 1: Core Transaction Flow (CRITICAL PATH)

| ID | Feature | Status | Notes | Tested By |
|----|---------|--------|-------|-----------|
| 1.1 | Customer search/selection | :grey_question: | | |
| 1.2 | Insurance benefits lookup | :grey_question: | | |
| 1.3 | Quote builder - frame selection | :grey_question: | | |
| 1.4 | Quote builder - lens selection | :grey_question: | | |
| 1.5 | Pricing calculator | :grey_question: | | |
| 1.6 | Quote → Transaction save | :grey_question: | | |

---

## Phase 2: Data Foundation

| ID | Feature | Status | Notes | Tested By |
|----|---------|--------|-------|-----------|
| 2.1 | Customers loaded | :white_check_mark: | 4,056 imported via bulk SQL | Claude |
| 2.2 | Frames inventory | :white_check_mark: | 3,282 frames loaded | Claude |
| 2.3 | Lens products | :white_check_mark: | 169 products (lenses, coatings, materials) | Claude |
| 2.4 | Formulary data (VSP/EyeMed/Spectera) | :warning: | Loaded but VSP AR low (5), insurance_carriers empty | Claude |
| 2.5 | Service prices (CPT codes) | :white_check_mark: | 74 services loaded | Claude |
| 2.6 | Contact lenses | :white_check_mark: | 85 contact lenses loaded | Claude |

---

## Phase 3: Insurance Document Processing

| ID | Feature | Status | Notes | Tested By |
|----|---------|--------|-------|-----------|
| 3.1 | Scanner app loads (port 3003) | :grey_question: | | |
| 3.2 | Camera capture works | :grey_question: | | |
| 3.3 | OCR text extraction | :grey_question: | | |
| 3.4 | GPT benefit parsing | :grey_question: | | |
| 3.5 | Document → Customer linking | :grey_question: | | |
| 3.6 | Verification workflow | :grey_question: | | |

---

## Phase 4: Secondary Features

| ID | Feature | Status | Notes | Tested By |
|----|---------|--------|-------|-----------|
| 4.1 | Dashboard loads | :grey_question: | | |
| 4.2 | Inventory management | :grey_question: | | |
| 4.3 | Customer profile view | :grey_question: | | |
| 4.4 | Reports/analytics | :grey_question: | | |
| 4.5 | Contact lens flow | :grey_question: | | |

---

## Phase 5: Polish & Production

| ID | Feature | Status | Notes | Tested By |
|----|---------|--------|-------|-----------|
| 5.1 | Error handling | :grey_question: | | |
| 5.2 | Loading states | :grey_question: | | |
| 5.3 | Mobile/tablet responsive | :grey_question: | | |
| 5.4 | Authentication flow | :grey_question: | | |
| 5.5 | Role-based permissions | :grey_question: | | |

---

## Issue Log

### Blockers (Prevents core flow)
| ID | Issue | Found | Fixed | Notes |
|----|-------|-------|-------|-------|
| | | | | |

### Bugs (Broken but workaround exists)
| ID | Issue | Found | Fixed | Notes |
|----|-------|-------|-------|-------|
| | | | | |

### Enhancements (Nice to have)
| ID | Issue | Found | Fixed | Notes |
|----|-------|-------|-------|-------|
| | | | | |

---

## Session Log

### 2025-12-01 - Session Start
- [x] Imported 4,056 customers via bulk SQL (fast import)
- [x] Created roadmap document
- [ ] Begin Phase 1 & 2 audit

---

## Data Inventory

### Database Tables (Audited 2025-12-01)
| Table | Count | Status | Notes |
|-------|-------|--------|-------|
| customers | 4,056 | :white_check_mark: | Imported from practice CSV |
| frames | 3,282 | :white_check_mark: | Frame inventory loaded |
| lens_products | 169 | :white_check_mark: | Lenses, coatings, materials |
| contact_lenses | 85 | :white_check_mark: | Contact lens inventory |
| service_prices | 74 | :white_check_mark: | CPT codes, exam fees |
| eyemed_progressive_formulary | 66 | :white_check_mark: | EyeMed progressive tiers |
| eyemed_ar_coating_formulary | 32 | :white_check_mark: | EyeMed AR coating tiers |
| vsp_progressive_formulary | 20 | :white_check_mark: | VSP progressive tiers |
| vsp_ar_coating_formulary | 5 | :warning: | Low count - verify complete |
| spectera_progressive_formulary | 28 | :white_check_mark: | Spectera progressive tiers |
| spectera_ar_coating_formulary | 26 | :white_check_mark: | Spectera AR coating tiers |
| insurance_carriers | 0 | :x: | EMPTY - Need to populate |

---

## Quick Reference

### URLs
- POS App: http://localhost:3000
- Scanner App: http://localhost:3003
- Database: Supabase PostgreSQL

### Key Paths
- Quote Builder: `/quote-builder`
- POS: `/pos`
- Dashboard: `/dashboard`
- Customers: `/customers`

### Commands
```bash
# Start POS app
npm run dev

# Start Scanner app (separate terminal)
npm run dev -- -p 3003

# Run Prisma Studio (DB browser)
npx prisma studio
```

---

## Legend
- :white_check_mark: Working
- :x: Broken
- :construction: In Progress
- :grey_question: Not Tested
- :warning: Works with issues
