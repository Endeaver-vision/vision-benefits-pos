# COMPONENT MIGRATION MAP
**Date:** November 5, 2025  
**Purpose:** Component-by-component migration strategy for master plan alignment  
**Phase:** 0.2 - Pre-Flight Assessment

---

## 📊 EXECUTIVE SUMMARY

### Migration Strategy Overview
Based on the current state audit, we have **17 core components** that need varying levels of changes to align with the master plan. This map categorizes each component by migration type and establishes a dependency-aware implementation order.

### Migration Categories
- **🔴 REBUILD**: Complete redesign required (7 components)
- **🟡 RESTYLE**: Keep logic, update UI only (6 components)  
- **🟢 MINIMAL**: Minor tweaks needed (4 components)

### Estimated Effort Distribution
- **60% effort**: Foundation & core layout components
- **30% effort**: Layer component redesigns
- **10% effort**: Polish & minor updates

---

## 🗺️ COMPONENT DEPENDENCY MAP

### Visual Dependency Flow
```
📱 Quote Builder App (Main Container)
├── 🏗️ Layout Shell (REBUILD)
│   ├── 📍 Header Section (REBUILD)
│   ├── 🧭 Left Navigation (RESTYLE)
│   ├── 📝 Center Content (Container)
│   └── 💰 Right Pricing Sidebar (REBUILD)
│
├── 🎨 Design System Foundation (REBUILD)
│   ├── 🎯 CSS Design Tokens (REBUILD)
│   ├── 🃏 SelectionCard Component (REBUILD)
│   ├── 🔘 Button System (RESTYLE)
│   ├── 📝 Form Input System (RESTYLE)
│   └── 🎨 Typography Classes (REBUILD)
│
├── 📋 Layer Components (Mixed)
│   ├── 👁️ Exam Services Layer (REBUILD)
│   ├── 👓 Eyeglasses Layer (RESTYLE)
│   │   ├── 🖼️ Frame Selection (RESTYLE)
│   │   ├── 🔍 Lens Selection (RESTYLE)
│   │   ├── ✨ Lens Enhancements (MINIMAL)
│   │   ├── 🏥 Insurance Integration (MINIMAL)
│   │   └── 👥 Second Pair Discounts (MINIMAL)
│   ├── 👁️ Contact Lens Layer (REBUILD)
│   ├── 📄 Quote Review Layer (RESTYLE)
│   └── ✅ Quote Finalization Layer (MINIMAL)
│
└── 🔧 Supporting Components (Mixed)
    ├── 🏪 Quote Store (Zustand) (MINIMAL)
    ├── 🎯 Quote Selectors (MINIMAL)
    └── 📘 Type Definitions (MINIMAL)
```

---

## 📋 DETAILED MIGRATION ANALYSIS

### 🔴 REBUILD COMPONENTS (7 components)

#### 1. **CSS Design Tokens** 
**File**: `src/app/globals.css`
**Current State**: Generic shadcn/ui colors
**Master Plan Gap**: 0% color alignment
**Migration Type**: 🔴 REBUILD
**Effort**: 1 prompt
**Priority**: P0 (Highest)
**Dependencies**: None (Foundation)

**Changes Required**:
- Replace all color variables with master plan palette
- Add 4px grid spacing system  
- Add typography scale classes
- Add shadow and radius systems

**Impact**: Affects ALL components (foundation change)

#### 2. **SelectionCard Component**
**File**: NEW - `src/components/ui/selection-card.tsx`
**Current State**: Doesn't exist
**Master Plan Gap**: Missing core pattern
**Migration Type**: 🔴 REBUILD
**Effort**: 1 prompt
**Priority**: P0 (Highest)
**Dependencies**: CSS Design Tokens

**Features Required**:
- Card container with proper spacing
- Header with icon + title + price
- Collapsible content area
- Visual states: default, active, disabled, error
- Master plan colors and animations

**Impact**: Used by ALL layer components

#### 3. **Layout Shell (3-Panel Structure)**
**File**: `src/app/quote-builder/page.tsx` (major restructure)
**Current State**: 2-column grid (1/4 + 3/4)
**Master Plan Gap**: Wrong layout structure (25% aligned)
**Migration Type**: 🔴 REBUILD
**Effort**: 1 prompt
**Priority**: P0 (Highest)
**Dependencies**: CSS Design Tokens

**Changes Required**:
- Replace grid with 3-panel: 160px | fluid | 280px
- Add patient header section
- Restructure responsive behavior
- Mobile stacking pattern

**Impact**: Changes container for all other components

#### 4. **Patient Header Section**
**File**: NEW - `src/components/quote-builder/patient-header.tsx`
**Current State**: Doesn't exist (embedded in main page)
**Master Plan Gap**: Missing master plan requirement
**Migration Type**: 🔴 REBUILD
**Effort**: 1 prompt
**Priority**: P1 (High)
**Dependencies**: Layout Shell

**Features Required**:
- Patient info display (name, email, phone)
- Insurance carrier badge
- Member ID display
- Location and staff badges

**Impact**: New component, no breaking changes

#### 5. **Pricing Sidebar**
**File**: NEW - `src/components/quote-builder/pricing-sidebar.tsx`
**Current State**: Doesn't exist (core master plan requirement)
**Master Plan Gap**: Missing entirely
**Migration Type**: 🔴 REBUILD
**Effort**: 1 prompt
**Priority**: P0 (Highest)
**Dependencies**: CSS Design Tokens, Layout Shell

**Features Required**:
- Live pricing updates
- Collapsible sections (Exam, Materials, Contacts)
- Validation warnings section
- Action buttons (Signature, Print, Complete)
- Master plan pricing colors

**Impact**: Major UX improvement, no breaking changes

#### 6. **Exam Services Layer**
**File**: `src/components/quote-builder/layers/exam-services-layer.tsx`
**Current State**: Complex multi-category cards with checkboxes
**Master Plan Gap**: Wrong pattern (30% aligned)
**Migration Type**: 🔴 REBUILD
**Effort**: 1 prompt
**Priority**: P1 (High)
**Dependencies**: SelectionCard, CSS Design Tokens

**Changes Required**:
- Replace 3 category cards with single SelectionCard
- Replace checkboxes with button selections
- Remove appointment scheduling (separate feature)
- Add patient type and exam type selections
- Simplify to 4 key selections

**Impact**: Keeps all functionality, improves UX

#### 7. **Contact Lens Layer**
**File**: `src/components/quote-builder/layers/contact-lens-layer.tsx`
**Current State**: 5-step wizard with progressive disclosure
**Master Plan Gap**: Too complex (20% aligned)
**Migration Type**: 🔴 REBUILD
**Effort**: 1 prompt
**Priority**: P1 (High)
**Dependencies**: SelectionCard, CSS Design Tokens

**Changes Required**:
- Replace wizard with single-page brand grid
- Use SelectionCard for brand selection
- Simplify parameter entry
- Integrate pricing breakdown
- Remove complex stepper navigation

**Impact**: Keeps functionality, much simpler UX

---

### 🟡 RESTYLE COMPONENTS (6 components)

#### 8. **Left Navigation**
**File**: `src/components/quote-builder/layer-navigation.tsx`
**Current State**: Button list with basic states
**Master Plan Gap**: Close but needs master plan styling (60% aligned)
**Migration Type**: 🟡 RESTYLE
**Effort**: 0.5 prompts
**Priority**: P1 (High)
**Dependencies**: CSS Design Tokens

**Changes Required**:
- Apply master plan colors (purple selection states)
- Enhance visual hierarchy
- Add progress indicators
- Improve icon prominence

**Impact**: Visual only, no functional changes

#### 9. **Button System**
**File**: `src/components/ui/button.tsx`
**Current State**: shadcn/ui default variants
**Master Plan Gap**: Missing master plan states (40% aligned)
**Migration Type**: 🟡 RESTYLE
**Effort**: 0.5 prompts
**Priority**: P2 (Medium)
**Dependencies**: CSS Design Tokens

**Changes Required**:
- Update color variants to use master plan colors
- Add selection state variant
- Update hover/focus states
- Ensure accessibility compliance

**Impact**: App-wide visual consistency

#### 10. **Form Input System**
**File**: Multiple files in `src/components/ui/`
**Current State**: shadcn/ui defaults
**Master Plan Gap**: Missing master plan focus states
**Migration Type**: 🟡 RESTYLE
**Effort**: 0.5 prompts
**Priority**: P2 (Medium)
**Dependencies**: CSS Design Tokens

**Changes Required**:
- Purple focus rings
- Master plan border colors
- Consistent height and spacing
- Error state styling

**Impact**: Form consistency across app

#### 11. **Eyeglasses Layer Container**
**File**: `src/components/quote-builder/layers/eyeglasses-layer.tsx`
**Current State**: Good logic, needs visual update
**Master Plan Gap**: Container styling needs update
**Migration Type**: 🟡 RESTYLE
**Effort**: 0.5 prompts
**Priority**: P2 (Medium)
**Dependencies**: SelectionCard, CSS Design Tokens

**Changes Required**:
- Wrap in SelectionCard
- Apply master plan spacing
- Add prominent package buttons
- Keep existing sub-component logic

**Impact**: Visual wrapper, preserves functionality

#### 12. **Frame Selection Sub-component**
**File**: `src/components/quote-builder/layers/frame-selection.tsx`
**Current State**: Functional, needs visual update
**Master Plan Gap**: Needs card-based pattern
**Migration Type**: 🟡 RESTYLE
**Effort**: 0.5 prompts
**Priority**: P2 (Medium)
**Dependencies**: SelectionCard

**Changes Required**:
- Apply SelectionCard pattern
- Master plan colors and spacing
- Keep search and POF logic

**Impact**: Visual update only

#### 13. **Quote Review Layer**
**File**: `src/components/quote-builder/layers/quote-review-layer.tsx`
**Current State**: Good structure, needs visual polish
**Master Plan Gap**: Typography and spacing updates needed
**Migration Type**: 🟡 RESTYLE
**Effort**: 0.5 prompts
**Priority**: P3 (Low)
**Dependencies**: CSS Design Tokens

**Changes Required**:
- Apply master plan typography
- Update price displays
- Improve visual hierarchy
- Keep all functionality

**Impact**: Visual polish

---

### 🟢 MINIMAL COMPONENTS (4 components)

#### 14. **Quote Store (Zustand)**
**File**: `src/store/quote-store.ts`
**Current State**: Well-structured, functional
**Master Plan Gap**: Already well-aligned
**Migration Type**: 🟢 MINIMAL
**Effort**: 0.2 prompts
**Priority**: P3 (Low)
**Dependencies**: None

**Changes Required**:
- Possible minor interface updates
- No major logic changes needed

**Impact**: Minimal, maintains state management

#### 15. **Lens Enhancements Sub-component**
**File**: `src/components/quote-builder/layers/lens-enhancements.tsx`
**Current State**: Good logic, minor styling tweaks
**Master Plan Gap**: Minor visual updates only
**Migration Type**: 🟢 MINIMAL
**Effort**: 0.2 prompts
**Priority**: P3 (Low)
**Dependencies**: CSS Design Tokens

**Changes Required**:
- Apply master plan checkbox/toggle styling
- Update spacing
- Keep all functionality

**Impact**: Minor visual update

#### 16. **Insurance Integration Sub-component**
**File**: `src/components/quote-builder/layers/insurance-integration.tsx`
**Current State**: Functional, minor updates needed
**Master Plan Gap**: Minor styling only
**Migration Type**: 🟢 MINIMAL
**Effort**: 0.2 prompts
**Priority**: P3 (Low)
**Dependencies**: CSS Design Tokens

**Changes Required**:
- Master plan colors for success/error states
- Typography updates

**Impact**: Minor visual polish

#### 17. **Quote Finalization Layer**
**File**: `src/components/quote-builder/layers/quote-finalization-layer.tsx`
**Current State**: Well-structured, minimal changes needed
**Master Plan Gap**: Minor visual updates
**Migration Type**: 🟢 MINIMAL
**Effort**: 0.2 prompts
**Priority**: P3 (Low)
**Dependencies**: CSS Design Tokens

**Changes Required**:
- Master plan colors
- Typography updates
- Keep all functionality

**Impact**: Visual polish only

---

## 🚀 IMPLEMENTATION ORDER & DEPENDENCIES

### Phase 1: Foundation (Blocking Components) - 4 prompts
**Goal**: Establish design system and core layout

```
1. CSS Design Tokens (P0) 
   └── Dependencies: None
   └── Blocks: Everything else

2. SelectionCard Component (P0)
   └── Dependencies: CSS Design Tokens
   └── Blocks: All layer components

3. Layout Shell (P0)
   └── Dependencies: CSS Design Tokens
   └── Blocks: Patient Header, Pricing Sidebar

4. Pricing Sidebar (P0)
   └── Dependencies: CSS Design Tokens, Layout Shell
   └── Blocks: Nothing (can work independently)
```

### Phase 2: Core Layer Redesign - 3 prompts
**Goal**: Update the most impactful layer components

```
5. Exam Services Layer (P1)
   └── Dependencies: SelectionCard, CSS Design Tokens
   └── Impact: HIGH (first user interaction)

6. Contact Lens Layer (P1)
   └── Dependencies: SelectionCard, CSS Design Tokens
   └── Impact: HIGH (complex simplification)

7. Patient Header Section (P1)
   └── Dependencies: Layout Shell, CSS Design Tokens
   └── Impact: MEDIUM (visual improvement)
```

### Phase 3: Visual Polish - 3 prompts
**Goal**: Update styling of existing functional components

```
8. Left Navigation (P1)
   └── Dependencies: CSS Design Tokens
   └── Impact: MEDIUM (visual consistency)

9. Button & Form Systems (P2)
   └── Dependencies: CSS Design Tokens
   └── Impact: APP-WIDE (consistency)

10. Eyeglasses Layer + Sub-components (P2)
    └── Dependencies: SelectionCard, CSS Design Tokens
    └── Impact: MEDIUM (visual update)
```

### Phase 4: Final Polish - 2 prompts
**Goal**: Complete remaining visual updates

```
11. Quote Review Layer (P3)
    └── Dependencies: CSS Design Tokens
    └── Impact: LOW (late in flow)

12. Minimal Components (P3)
    └── Dependencies: CSS Design Tokens
    └── Impact: LOW (minor updates)
```

---

## ⚠️ RISK ASSESSMENT BY COMPONENT

### 🔴 HIGH RISK (Potential Breaking Changes)

#### Layout Shell (P0)
**Risk**: Major container changes could break existing positioning
**Mitigation**: Test all layers after layout change
**Rollback Plan**: Keep old layout as backup temporarily

#### Exam Services Layer (P1)
**Risk**: Different data structure could break state management
**Mitigation**: Keep same state interface, only update UI
**Rollback Plan**: Component-level rollback possible

#### Contact Lens Layer (P1)
**Risk**: Simplification might lose existing functionality
**Mitigation**: Map all existing features to new design
**Rollback Plan**: Component-level rollback possible

### 🟡 MEDIUM RISK

#### SelectionCard Component (P0)
**Risk**: New component pattern adoption across app
**Mitigation**: Create comprehensive examples and documentation
**Rollback Plan**: Can coexist with old patterns temporarily

#### Pricing Sidebar (P0)
**Risk**: New component, complex state integration
**Mitigation**: Implement incrementally, test thoroughly
**Rollback Plan**: Can be disabled/hidden if issues

### 🟢 LOW RISK

#### CSS Design Tokens (P0)
**Risk**: Color changes might have unexpected effects
**Mitigation**: Systematic testing, CSS variable fallbacks
**Rollback Plan**: Easy to revert CSS file

#### All MINIMAL and RESTYLE components
**Risk**: Visual-only changes, low functional risk
**Mitigation**: Visual testing, preserve functionality
**Rollback Plan**: Component-level rollback

---

## 📊 EFFORT ESTIMATION

### By Migration Type
```
🔴 REBUILD (7 components):     7.0 prompts (58%)
🟡 RESTYLE (6 components):     3.0 prompts (25%)
🟢 MINIMAL (4 components):     0.8 prompts (7%)
Testing & Integration:         1.2 prompts (10%)
─────────────────────────────────────────────
TOTAL:                        12.0 prompts
```

### By Phase
```
Phase 1 (Foundation):          4.0 prompts (33%)
Phase 2 (Core Layers):         3.0 prompts (25%)
Phase 3 (Visual Polish):       3.0 prompts (25%)
Phase 4 (Final Polish):        2.0 prompts (17%)
─────────────────────────────────────────────
TOTAL:                        12.0 prompts
```

### Conservative Buffer (Add 25%)
```
Base Estimate:                12.0 prompts
Buffer for issues:             3.0 prompts
Conservative Total:           15.0 prompts
```

---

## 🎯 SUCCESS CRITERIA BY COMPONENT

### Foundation Components (Phase 1)
- **CSS Design Tokens**: 100% master plan colors implemented
- **SelectionCard**: Reusable pattern working in all contexts
- **Layout Shell**: 3-panel layout responsive on all devices
- **Pricing Sidebar**: Real-time updates, all sections functional

### Layer Components (Phase 2)
- **Exam Services**: Single card with 4 selections, no functionality lost
- **Contact Lens**: Brand grid working, simplified from 5-step wizard
- **Patient Header**: Clean display of patient/insurance info

### Polish Components (Phase 3-4)
- **Visual Consistency**: All components use master plan colors
- **Interactive States**: Hover, focus, selection states working
- **Typography**: Master plan typography scale applied
- **Accessibility**: No regressions, improved where possible

### Integration Testing
- **Functional Preservation**: All existing features still work
- **Performance**: No performance regressions
- **Mobile**: Responsive layout works on all device sizes
- **State Management**: Zustand store integration intact

---

## 🚦 GO/NO-GO DECISION CRITERIA

### ✅ GREEN LIGHT INDICATORS
- Foundation components (Phase 1) working perfectly
- No breaking changes in state management
- Mobile layout responsive
- All pricing calculations preserved

### ⚠️ YELLOW LIGHT INDICATORS  
- Minor visual inconsistencies (can be polished later)
- Non-critical animations missing
- Some edge case styling issues

### 🛑 RED LIGHT INDICATORS
- Any functionality lost or broken
- Major layout issues on mobile
- Pricing calculations incorrect
- State management corrupted

---

## 📋 IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Current state audit complete ✅
- [ ] Component migration map complete ✅
- [ ] Design tokens defined and ready
- [ ] SelectionCard component specification ready
- [ ] Master plan reference materials accessible

### Phase 1 Checklist
- [ ] CSS Design Tokens implemented
- [ ] SelectionCard component created and tested
- [ ] Layout Shell restructured to 3-panel
- [ ] Pricing Sidebar created and integrated
- [ ] Mobile responsive layout working

### Phase 2 Checklist
- [ ] Exam Services Layer redesigned
- [ ] Contact Lens Layer simplified
- [ ] Patient Header Section created
- [ ] All core functionality preserved

### Phase 3 Checklist
- [ ] Left Navigation restyled
- [ ] Button and Form systems updated
- [ ] Eyeglasses Layer visual updates applied
- [ ] Visual consistency achieved

### Phase 4 Checklist
- [ ] Quote Review Layer polished
- [ ] All minimal components updated
- [ ] Final testing completed
- [ ] Documentation updated

### Post-Implementation
- [ ] All functionality regression tested
- [ ] Performance benchmarks met
- [ ] Accessibility compliance verified
- [ ] Mobile testing on real devices
- [ ] Stakeholder approval received

---

## 🎯 RECOMMENDED NEXT STEPS

Based on this component migration analysis:

### Immediate Next Steps (Phase 1.1)
1. **Start with CSS Design Tokens** - Foundation that everything depends on
2. **Create SelectionCard component** - Core pattern for all layers
3. **Test integration** - Ensure new tokens work with existing components

### Early Validation
- Apply design tokens to one existing component as proof-of-concept
- Create SelectionCard examples to validate pattern
- Get stakeholder feedback on visual direction

### Risk Mitigation
- Keep existing components working during migration
- Implement feature toggles for new vs old components
- Test each phase thoroughly before proceeding

### Success Metrics
- **Visual Alignment**: Progressive improvement toward 95% master plan match
- **Functionality Preservation**: 100% existing features working
- **Performance**: No regressions, target <2s load time
- **Team Velocity**: Maintain development speed throughout migration

---

**This migration map provides a clear, dependency-aware path to achieve master plan alignment while minimizing risk and preserving all existing functionality.**