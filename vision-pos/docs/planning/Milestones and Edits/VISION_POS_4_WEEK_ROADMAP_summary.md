# VISION POS - 4-WEEK DEVELOPMENT ROADMAP (SOLO DEVELOPER)
**Complete Sprint Plan for MVP Foundation**  
**Version:** 1.0  
**Created:** November 3, 2025  
**Developer:** Solo Developer + AI Copilot (Claude Sonnet 4.5)  
**Target:** Functional Core System in 4 Weeks

---

## 📋 EXECUTIVE SUMMARY

### What We're Building
The foundation of an AI-powered vision benefits POS system that will eventually handle:
- Multi-carrier insurance (VSP, EyeMed, Spectera)
- Complex pricing calculations with real-time updates
- 3-layer quote builder (Exam → Frame/Lens → Contacts)
- Package templates for rapid quoting
- Complete quote lifecycle management

### 4-Week Goal
By end of Week 4, you will have:
✅ Authentication system with role-based access
✅ Complete insurance pricing engine (all 3 carriers)
✅ Fully functional 3-layer quote builder UI
✅ Contact lens system with rebates
✅ Package template system (4 pre-built packages)
✅ Real-time pricing calculations (100% accurate)

### Why 4 Weeks is Achievable
- **Next.js + TypeScript** = Rapid development
- **Prisma ORM** = Database abstraction
- **shadcn/ui** = Pre-built components
- **AI Copilot** = Code generation assistance
- **Clear specifications** = No ambiguity
- **Focused scope** = Core features only

---

## 🗓️ WEEK-BY-WEEK BREAKDOWN

### **WEEK 1: Foundation & Authentication**
**Goal:** Working app infrastructure with user management

#### Day 1 - Project Setup
- ✅ Initialize Next.js 14+ with TypeScript
- ✅ Configure Tailwind CSS + shadcn/ui
- ✅ Set up PostgreSQL + Prisma ORM
- ✅ Configure Zustand + TanStack Query
- ✅ Create GitHub repository

#### Day 2 - Database Schema
- ✅ Users, locations, insurance carriers tables
- ✅ Product categories and products tables
- ✅ Run migrations, seed initial data

#### Day 3 - Authentication
- ✅ NextAuth.js implementation
- ✅ Login page with location selector
- ✅ Session management + protected routes

#### Day 4 - User Management
- ✅ Role-based access control (Admin/Manager/Associate)
- ✅ User CRUD operations
- ✅ Admin user management UI

#### Day 5 - Product Formulary
- ✅ Product tier schema (VSP/EyeMed/Spectera)
- ✅ Product list UI with filters
- ✅ Add/edit product forms
- ✅ Seed 20-30 test products

**Week 1 Deliverables:**
- ✅ Working authentication system
- ✅ User management functional
- ✅ Product database foundation ready
- ✅ 20-30 test products loaded

---

### **WEEK 2: Insurance Schemas & Pricing Engine**
**Goal:** Accurate pricing calculations for all 3 carriers

#### Day 1 - Insurance Schema Database
- ✅ Insurance plans, copays, allowances tables
- ✅ Tier mapping tables (VSP K/J/F/O/N, EyeMed 1-5, Spectera 1-3)
- ✅ VSP-specific pricing tables (4 tiers)
- ✅ Lens code hierarchy tables

#### Day 2 - Product Formulary Data Entry
- ✅ Import VSP progressive products (100+ products to tiers)
- ✅ Import VSP AR coating products
- ✅ Import EyeMed progressive products (Tier 1-5)
- ✅ Import EyeMed AR coating products (Tier 1-3)

#### Day 3 - Spectera Schema
- ✅ Spectera pricing tables (Category 1/2/3)
- ✅ Import Spectera progressive products
- ✅ Import Spectera AR coating products (Tier 1-4)
- ✅ Seed test insurance plans (3-5 per carrier)

#### Day 4 - VSP & EyeMed Calculators
- ✅ Build VSP pricing calculator (4-tier rules)
- ✅ Implement lens code stacking
- ✅ Handle child polycarbonate rule
- ✅ Build EyeMed pricing calculator
- ✅ Frame overage with 20% discount
- ✅ Materials copay handling

#### Day 5 - Spectera Calculator & Testing
- ✅ Build Spectera pricing calculator
- ✅ Create unified pricing interface
- ✅ Create 30 test cases (10 per carrier)
- ✅ Validate 100% accuracy

**Week 2 Deliverables:**
- ✅ Complete insurance schema for all 3 carriers
- ✅ 200+ products mapped to tiers
- ✅ Working pricing engine with 100% accuracy
- ✅ API endpoints for pricing calculations

---

### **WEEK 3: Quote Builder UI - Layers 1 & 2**
**Goal:** Functional quote builder for exams and eyeglasses

#### Day 1 - Quote Builder Foundation
- ✅ Layout structure (left nav, center content, right sidebar)
- ✅ Layer navigation component
- ✅ Live pricing sidebar
- ✅ Quote header (patient info, insurance)
- ✅ Auto-save functionality

#### Day 2 - Layer 1 (Exam Services)
- ✅ Exam selection interface
- ✅ Add-ons: iWellness, OptoMap
- ✅ Medical diagnosis picker
- ✅ Exam pricing integration
- ✅ Layer 1 validation

#### Day 3 - Layer 2 (Frame Selection)
- ✅ Frame search/filter component
- ✅ Patient-owned frame option
- ✅ Frame pricing with insurance allowance
- ✅ Overage calculation by carrier
- ✅ POF liability workflow

#### Day 4 - Layer 2 (Lens Config Part 1)
- ✅ Lens type selector (SV/Progressive/Bifocal)
- ✅ Progressive product selector with tier badges
- ✅ Lens material selector
- ✅ Age-based polycarbonate rule

#### Day 5 - Layer 2 (Lens Config Part 2)
- ✅ AR coating selector with tiers
- ✅ Lens enhancements (photochromic, polarized, blue light)
- ✅ Enhancement compatibility validation
- ✅ Complete Layer 2 pricing integration

**Week 3 Deliverables:**
- ✅ Working Layer 1 (Exam) with live pricing
- ✅ Working Layer 2 (Frame/Lens) with full options
- ✅ Real-time pricing sidebar updating
- ✅ Insurance calculations accurate for all carriers

---

### **WEEK 4: Contacts & Package Templates**
**Goal:** Complete quote builder with rapid quoting shortcuts

#### Day 1 - Contact Lens Database
- ✅ Contact lens product tables
- ✅ Rebate program tables
- ✅ Annual supply threshold definitions
- ✅ Populate 50+ contact lens brands

#### Day 2 - Layer 3 (Contact Lens UI)
- ✅ Brand selector grid
- ✅ "Different per eye" toggle
- ✅ Contact lens parameters (power, BC, diameter)
- ✅ Single eye and dual eye modes

#### Day 3 - Contact Lens Pricing
- ✅ Box × price calculation
- ✅ Annual supply discount logic ($30 daily, $10 other)
- ✅ Insurance allowance application
- ✅ Manufacturer rebate detection
- ✅ After-rebate cost display

#### Day 4 - Package Templates Backend
- ✅ Package template database schema
- ✅ Create 4 default packages:
  - Top-Tier Progressive
  - Computer Glasses
  - Sunglass Package
  - Budget Progressive
- ✅ Package template API endpoints

#### Day 5 - Package Templates UI
- ✅ Package selector interface (4 cards)
- ✅ "Apply Package" functionality
- ✅ Auto-populate all 3 layers
- ✅ "Reset to Package" button
- ✅ Package usage tracking

**Week 4 Deliverables:**
- ✅ Complete 3-layer quote builder
- ✅ Contact lens system with rebates
- ✅ Package template system functional
- ✅ End-to-end quote creation in <2 minutes

---

## 🎯 SUCCESS CRITERIA (End of Week 4)

### Functional Requirements Met
- [x] User can log in and select location
- [x] User can create a quote for exam only
- [x] User can create a quote for frame/lens with progressive lenses
- [x] User can create a quote for contact lenses
- [x] User can apply a package template
- [x] Pricing calculates accurately for VSP, EyeMed, and Spectera
- [x] Real-time pricing updates as selections change
- [x] Quotes can be saved as drafts
- [x] System handles patient-owned frames correctly
- [x] Child polycarbonate rule applies automatically

### Technical Requirements Met
- [x] PostgreSQL database with complete schema
- [x] NextAuth.js authentication working
- [x] Prisma ORM with migrations
- [x] Zustand state management
- [x] TanStack Query for API calls
- [x] shadcn/ui components throughout
- [x] TypeScript with strict mode
- [x] 200+ products in database
- [x] 50+ contact lens products in database
- [x] 100% test coverage on pricing calculations

### Performance Requirements
- [x] Quote builder loads in <2 seconds
- [x] Pricing updates in <300ms
- [x] Database queries optimized with indexes
- [x] No memory leaks in React components

---

## 🛠️ TECHNICAL STACK

### Frontend
```
- Next.js 14+ (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui components
- Zustand (state management)
- TanStack Query (server state)
- React Hook Form + Zod (forms)
```

### Backend
```
- Next.js API Routes
- PostgreSQL 15+
- Prisma ORM
- NextAuth.js (authentication)
```

### Development Tools
```
- Claude Sonnet 4.5 (AI copilot)
- VS Code
- Git + GitHub
- Postman (API testing)
```

---

## 📊 COMPONENT ARCHITECTURE

### File Structure
```
/app
  /api
    /auth
    /quotes
    /products
    /insurance
    /packages
  /(protected)
    /quotes
      /new
    /analytics
    /admin
  /login

/components
  /quote-builder
    /layer1-exam
    /layer2-frame-lens
    /layer3-contacts
    /packages
    /shared
  /ui (shadcn)

/lib
  /pricing
    vsp-calculator.ts
    eyemed-calculator.ts
    spectera-calculator.ts
    unified-calculator.ts
  /db
    prisma.ts
  /auth
    auth-config.ts

/prisma
  schema.prisma
  /migrations
  /seed
```

### Key Components Built
1. **QuoteBuilderLayout** - Main container with 3-panel layout
2. **LayerNavigation** - Tab navigation between layers
3. **PricingSidebar** - Live pricing display
4. **ExamSelection** - Layer 1 exam interface
5. **FrameSelector** - Frame search and selection
6. **ProgressiveSelector** - Tier-based progressive picker
7. **LensMaterialSelector** - Material options
8. **ARCoatingSelector** - AR coating with tier badges
9. **LensEnhancements** - Photo/polar/blue light
10. **ContactLensSelector** - Brand grid
11. **ContactLensPricing** - CL pricing breakdown
12. **PackageSelector** - 4 package cards
13. **PackageCard** - Individual package display

---

## 💰 PRICING ENGINE ARCHITECTURE

### Calculation Flow
```
1. User selects products
   ↓
2. Frontend calls /api/quotes/calculate
   ↓
3. Backend routes to carrier-specific calculator
   ↓
4. Calculator applies:
   - Base copays
   - Material modifiers (VSP code stacking)
   - Enhancement pricing
   - Frame overage (carrier-specific discount)
   - Age-based rules (child poly = $0)
   ↓
5. Returns itemized breakdown
   ↓
6. Frontend updates sidebar in real-time
```

### Carrier-Specific Rules Implemented

**VSP:**
- 4-tier pricing (Signature, Choice, Advantage, Enhanced Advantage)
- Lens code stacking (Base + Material + Feature)
- 80% U&C calculations for Advantage tier
- Child polycarbonate = $0 (age ≤18)
- EasyOptions program overrides

**EyeMed:**
- 5-tier progressive system (Tier 1-5)
- 3-tier AR coating system
- 20% frame overage discount
- Separate materials copay
- Age-based polycarbonate rule

**Spectera:**
- 3-category progressive system
- 4-tier AR coating system
- 70% patient responsibility on frame overage
- Combined or separate copay structures

---

## 🧪 TESTING STRATEGY

### Unit Tests (30 test cases created)
**VSP Tests (10):**
- Signature tier pricing
- Choice tier pricing
- Advantage tier with 80% U&C
- Enhanced Advantage tier
- Child polycarbonate ($0)
- Lens code stacking
- Frame overage calculation
- EasyOptions override
- Photochromic pricing
- AR coating tiers

**EyeMed Tests (10):**
- Tier 1 progressive pricing
- Tier 5 progressive pricing
- Frame overage with 20% discount
- Materials copay application
- Child polycarbonate rule
- AR coating Tier 1-3
- Photochromic + polarized conflict
- Blue light + AR stacking
- Tint options
- Enhancement combinations

**Spectera Tests (10):**
- Category 1 progressive
- Category 3 progressive
- Frame overage (70% patient)
- AR Tier 1-4 pricing
- Combined copay calculation
- Separate copay calculation
- Enhancement pricing
- Material upgrades
- Lens type variations
- Complete quote calculation

### Integration Tests
- [ ] Complete quote flow (exam → frame/lens → contacts)
- [ ] Package application and customization
- [ ] Draft save and load
- [ ] Pricing updates on selection changes
- [ ] Different per eye contact lens mode
- [ ] Annual supply discount application
- [ ] Manufacturer rebate detection

### Manual Testing Checklist
- [ ] All 3 carriers calculate correctly
- [ ] Package templates apply successfully
- [ ] Contact lens rebates display properly
- [ ] POF liability workflow functions
- [ ] Age-based rules trigger correctly
- [ ] Enhancement compatibility validation works
- [ ] Frame overage calculates per carrier
- [ ] Sidebar updates in real-time

---

## 🚨 RISK MANAGEMENT

### Technical Risks

**Risk 1: Pricing Calculation Complexity**
- **Impact:** High
- **Likelihood:** Medium
- **Mitigation:** 
  - Build comprehensive test suite first
  - Validate against manual calculations
  - Test with real insurance authorizations

**Risk 2: Performance with Large Product Catalog**
- **Impact:** Medium
- **Likelihood:** Low
- **Mitigation:**
  - Implement pagination
  - Add database indexes
  - Use virtual scrolling for long lists
  - Cache frequently accessed products

**Risk 3: State Management Complexity**
- **Impact:** Medium
- **Likelihood:** Medium
- **Mitigation:**
  - Use Zustand for simplicity
  - Document state structure clearly
  - Implement dev tools for debugging
  - Keep state normalized

### Schedule Risks

**Risk 4: Feature Creep**
- **Impact:** High
- **Likelihood:** High
- **Mitigation:**
  - Strict scope lock for 4 weeks
  - Defer nice-to-haves to Week 5+
  - Track all "future enhancements" separately
  - Focus on core functionality only

**Risk 5: AI Copilot Limitations**
- **Impact:** Low
- **Likelihood:** Medium
- **Mitigation:**
  - Break tasks into small chunks
  - Provide clear context to AI
  - Review all generated code
  - Have fallback plan (write manually)

---

## 📈 POST-WEEK 4 ROADMAP

### Week 5-8: Quote Output & Sales Recording
- Second pair discount system
- Quote output (print/email/PDF)
- Signature capture (tablet workflow)
- Quote state management
- Sales recording and completion

### Week 9-12: Analytics & Admin
- Real-time analytics dashboard
- Staff leaderboards
- Admin product management
- User activity logging
- KPI tracking

### Week 13-16: MVP Polish & Launch
- Bug fixes and refinements
- User acceptance testing
- Staff training materials
- Pilot deployment (3-5 users)
- Production launch prep

### Phase 2 (Months 4-5): Intelligence Layer
- GPT-4o document parser
- Confidence scoring
- Human review interface
- Smart product prompts
- Follow-up system

### Phase 3 (Months 6-8): Inventory System
- Stock tracking
- Low stock alerts
- Reorder workflows
- Transfer between locations
- Frame board management

### Phase 4 (Months 9-12): Advanced Features
- Patient portal
- SMS notifications
- Lab integration
- Appointment system integration
- Mobile app (optional)

---

## 🎓 DEVELOPMENT BEST PRACTICES

### Daily Workflow
1. **Morning:** Review previous day's work
2. **Plan:** Identify today's 2-3 key tasks
3. **Build:** Use AI copilot for rapid development
4. **Test:** Validate each feature before moving on
5. **Commit:** Push working code to GitHub
6. **Document:** Update progress in CHANGELOG.md

### AI Copilot Usage Tips
1. **Be specific:** "Create a Zod schema for exam selection with iWellness and OptoMap booleans"
2. **Provide context:** Share relevant schema, types, existing code
3. **Iterate:** Review generated code, ask for improvements
4. **Test generated code:** Never trust AI output without testing
5. **Learn patterns:** Understand what AI generates, don't just copy

### Code Quality Standards
- **TypeScript strict mode** - No `any` types
- **ESLint + Prettier** - Consistent formatting
- **Component structure** - Keep components under 300 lines
- **Function length** - Keep functions under 50 lines
- **DRY principle** - Extract reusable logic
- **Meaningful names** - No abbreviations, clear intent

### Git Commit Strategy
```
Day 1: feat: initialize Next.js project with Tailwind
Day 1: feat: add Prisma schema for users and locations
Day 1: feat: implement NextAuth.js login flow
Day 2: feat: create insurance schema tables
Day 2: feat: add product tier mapping tables
...
```

---

## 📝 WEEKLY DELIVERABLE CHECKLIST

### Week 1 Checklist
- [ ] Next.js app running locally
- [ ] Can log in with test user
- [ ] Database has users, locations, products tables
- [ ] Can view product list
- [ ] Can add new product (admin only)
- [ ] 20+ test products loaded

### Week 2 Checklist
- [ ] Insurance schema tables created
- [ ] 200+ products mapped to tiers
- [ ] VSP calculator returns accurate prices
- [ ] EyeMed calculator returns accurate prices
- [ ] Spectera calculator returns accurate prices
- [ ] 30 test cases passing

### Week 3 Checklist
- [ ] Can create exam quote
- [ ] Can select frame with insurance
- [ ] Can configure progressive lens
- [ ] Can add AR coating
- [ ] Can add enhancements
- [ ] Sidebar shows live pricing
- [ ] POF workflow functions

### Week 4 Checklist
- [ ] Can select contact lenses
- [ ] Different per eye mode works
- [ ] Annual supply discount applies
- [ ] Rebates display correctly
- [ ] Can apply package template
- [ ] All 4 packages work
- [ ] Complete quote in <2 min

---

## 🏆 SUCCESS METRICS

### Quantitative Goals (End of Week 4)
- **Code Quality:** 0 TypeScript errors, 0 ESLint errors
- **Test Coverage:** 100% on pricing calculations
- **Performance:** Quote builder loads in <2 seconds
- **Pricing Accuracy:** 100% match with manual calculations
- **Database:** 200+ products, 50+ contact lenses, 4 packages
- **Components:** 30+ React components built

### Qualitative Goals
- **Code Maintainability:** Other developers can understand code
- **User Experience:** Intuitive navigation, clear pricing display
- **Reliability:** No crashes, graceful error handling
- **Scalability:** Architecture supports future features

---

## 📞 SUPPORT & RESOURCES

### Documentation References
- `/mnt/project/VISION_POS_MASTER_PLAN.md` - Complete feature specifications
- `/mnt/project/vsp_dynamic_schema_v1.md` - VSP pricing rules
- `/mnt/project/eyemed_dynamic_schema_v1.md` - EyeMed pricing rules
- `/mnt/project/spectera_dynamic_schema_v3.md` - Spectera pricing rules
- `/mnt/project/VSP_All_Manuals_and_Tiers_Consolidated.txt` - VSP formulary data
- `/mnt/project/Eyemed__tiers_manual_consolidated_.txt` - EyeMed formulary data
- `/mnt/project/Spectera_Consolidated_Tiers_and_Manual2025.txt` - Spectera formulary data

### External Resources
- Next.js Docs: https://nextjs.org/docs
- Prisma Docs: https://www.prisma.io/docs
- shadcn/ui: https://ui.shadcn.com
- Zustand: https://github.com/pmndrs/zustand
- TanStack Query: https://tanstack.com/query

---

## 🚀 GETTING STARTED

### Day 0 Prep (Before Week 1)
1. **Install Prerequisites:**
   ```bash
   node --version  # Ensure Node 18+
   npm install -g pnpm  # Package manager
   ```

2. **Create Development Accounts:**
   - GitHub account for version control
   - Supabase account (free PostgreSQL) OR local Postgres
   - Vercel account (for eventual deployment)

3. **Set Up IDE:**
   - VS Code with extensions:
     - ESLint
     - Prettier
     - Prisma
     - Tailwind CSS IntelliSense
     - GitHub Copilot (if available)

4. **Review Documentation:**
   - Read VISION_POS_MASTER_PLAN.md thoroughly
   - Skim insurance schema documents
   - Understand pricing calculation requirements

### Week 1, Day 1 - First Commands
```bash
# Create Next.js app
npx create-next-app@latest vision-pos --typescript --tailwind --app

# Install dependencies
cd vision-pos
pnpm add @prisma/client prisma zustand @tanstack/react-query
pnpm add next-auth @auth/prisma-adapter
pnpm add zod react-hook-form @hookform/resolvers

# Install shadcn/ui
npx shadcn-ui@latest init

# Initialize Prisma
npx prisma init

# Start development server
pnpm dev
```

---

## 📄 CHANGELOG

**Version 1.0 (November 3, 2025)**
- Initial 4-week roadmap created
- Week 1: Foundation & Authentication planned
- Week 2: Insurance Schemas & Pricing Engine planned
- Week 3: Quote Builder UI (Layers 1 & 2) planned
- Week 4: Contacts & Package Templates planned
- All deliverables defined
- Success criteria established
- Risk management included

---

## ✅ FINAL CHECKLIST

Before starting Week 1:
- [ ] Read this entire document
- [ ] Review VISION_POS_MASTER_PLAN.md
- [ ] Set up development environment
- [ ] Create GitHub repository
- [ ] Install all prerequisites
- [ ] Clear your calendar for focused work
- [ ] Commit to 8 hours/day for 4 weeks

**You are ready to build! Start with Week 1, Day 1. Good luck! 🚀**

---

**Document Control:**
- Version: 1.0
- Created: November 3, 2025
- Created by: Planning Session with Claude Sonnet 4.5
- Status: Ready for Development
- Next Review: End of Week 1

---

**This document is your roadmap to a working Vision POS system in 4 weeks.**
