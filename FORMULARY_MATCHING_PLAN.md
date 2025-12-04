# Comprehensive Formulary Matching Plan

## Vision Benefits POS - Complete Insurance Pricing Architecture

**Version:** 1.0
**Created:** December 1, 2025
**Status:** Planning Phase

---

## Executive Summary

This document outlines the complete architecture for matching:
1. **Carrier Formularies** (what products exist in each tier)
2. **Patient-Specific Benefits** (what the patient's plan covers)
3. **Practice Products** (what you actually sell)

The goal is accurate, real-time patient quotes that correctly apply insurance benefits.

---

## Current State Analysis

### What Exists
| Component | Status | Notes |
|-----------|--------|-------|
| Progressive Formularies | ✅ Complete | 114 products across VSP/EyeMed/Spectera |
| AR Coating Formularies | ✅ Complete | 63 products across all carriers |
| Customer Insurance Model | ✅ Basic | Carrier, member ID, group stored |
| Pricing Calculator | ⚠️ Partial | Core logic exists, gaps in application |
| Benefit Authorization Types | ✅ Designed | TypeScript types defined |
| Frame Tier Mappings | ❌ Missing | No carrier-specific frame tiers |
| Material Tier Mappings | ❌ Missing | Poly, Hi-Index not mapped to carriers |
| Enhancement Mappings | ❌ Missing | Photochromic, polarized not mapped |
| Frequency Tracking | ❌ Missing | No usage history |
| Eligibility Enforcement | ❌ Missing | No blocking of ineligible benefits |

### What's Missing for Complete Solution
1. **Unified Product-to-Tier Mapping** - Connect YOUR products to carrier tier codes
2. **Benefit Plan Database** - Store actual plan copays, not just types
3. **VSP Pricing Tables** - 4 network tiers (Signature/Choice/Advantage/Enhanced)
4. **Lens Code Stacking** - VSP's Base + Material + Feature modifier system
5. **Usage Tracking** - When benefits were last used
6. **Eligibility Calculator** - Next eligible dates

---

## Architecture Design

### Layer 1: Static Formulary Data (What Products Exist)

These tables map **industry products** to **carrier tier codes**. They rarely change (updated annually when carriers publish new formularies).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CARRIER FORMULARY TABLES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  VSP FORMULARIES                                                             │
│  ───────────────                                                             │
│  vsp_progressive_formulary    → Lens → K/J/F/O/N tier + base code           │
│  vsp_ar_coating_formulary     → AR → A/C/D tier + code (QM/QT/QV)           │
│  vsp_lens_codes               → All codes + descriptions + stacking rules   │
│  vsp_material_formulary       → Poly/Trivex/Hi-Index → modifier codes       │
│  vsp_enhancement_formulary    → Photochromic/Tint/etc → feature codes       │
│                                                                              │
│  EYEMED FORMULARIES                                                          │
│  ─────────────────                                                           │
│  eyemed_progressive_formulary → Lens → tier_1 through tier_5                │
│  eyemed_ar_coating_formulary  → AR → standard/tier_1/tier_2/tier_3          │
│  eyemed_material_formulary    → Poly/Hi-Index → category                    │
│  eyemed_enhancement_formulary → Photochromic/Polarized → category           │
│                                                                              │
│  SPECTERA FORMULARIES                                                        │
│  ───────────────────                                                         │
│  spectera_progressive_formulary → Lens → I/II/III/IV/V                      │
│  spectera_ar_coating_formulary  → AR → I/II/III/IV                          │
│  spectera_material_formulary    → Poly/Hi-Index → category                  │
│  spectera_enhancement_formulary → Photochromic/Polarized → category         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer 2: Carrier Pricing Tables (What Each Tier Costs)

These tables define **patient copay amounts** for each tier. VSP is unique because pricing varies by **network tier** (employer's plan), not just product tier.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CARRIER PRICING TABLES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  VSP NETWORK PRICING (4 tables - one per network)                           │
│  ─────────────────────────────────────────────────                          │
│  vsp_signature_pricing        → Best pricing, lower copays                  │
│  vsp_choice_pricing           → Standard pricing                            │
│  vsp_advantage_pricing        → 80% U&C for many items                      │
│  vsp_enhanced_advantage_pricing → Enhanced benefits                         │
│                                                                              │
│  Structure per table:                                                        │
│  ┌────────────┬─────────────┬───────────┬─────────────┬───────────────┐     │
│  │ code       │ vision_type │ lab_alloc │ service_fee │ patient_copay │     │
│  ├────────────┼─────────────┼───────────┼─────────────┼───────────────┤     │
│  │ KA         │ mf          │ 30.00     │ 20.00       │ 50.00         │     │
│  │ NA         │ mf          │ 95.00     │ 65.00       │ 160.00        │     │
│  │ QV         │ mf          │ 52.00     │ 23.00       │ 75.00         │     │
│  └────────────┴─────────────┴───────────┴─────────────┴───────────────┘     │
│                                                                              │
│  EYEMED PLAN PRICING                                                         │
│  ───────────────────                                                         │
│  eyemed_plan_pricing          → Plan name + category + tier → copay         │
│                                                                              │
│  Structure:                                                                  │
│  ┌──────────────┬────────────┬────────┬─────────────────┐                   │
│  │ plan_name    │ category   │ tier   │ patient_copay   │                   │
│  ├──────────────┼────────────┼────────┼─────────────────┤                   │
│  │ EyeMed Core  │ progressive│ tier_3 │ 110.00          │                   │
│  │ EyeMed Plus  │ progressive│ tier_3 │ 85.00           │                   │
│  │ EyeMed Core  │ ar_coating │ tier_3 │ 95.00           │                   │
│  └──────────────┴────────────┴────────┴─────────────────┘                   │
│                                                                              │
│  SPECTERA PLAN PRICING                                                       │
│  ─────────────────────                                                       │
│  spectera_plan_pricing        → Plan name + category + tier → copay         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer 3: Practice Product Mapping (Your Products → Carrier Tiers)

This is the **critical bridge** - mapping YOUR specific products to carrier formularies.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PRACTICE PRODUCT MAPPING                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  product_carrier_mapping                                                     │
│  ──────────────────────                                                      │
│  Links YOUR products (by SKU) to carrier-specific tier codes                │
│                                                                              │
│  ┌────────────┬──────────┬──────────────┬─────────────┬───────────────┐     │
│  │ product_id │ carrier  │ tier_code    │ base_code   │ is_formulary  │     │
│  ├────────────┼──────────┼──────────────┼─────────────┼───────────────┤     │
│  │ LENS-001   │ VSP      │ N            │ NA          │ true          │     │
│  │ LENS-001   │ EyeMed   │ tier_5       │ null        │ true          │     │
│  │ LENS-001   │ Spectera │ V            │ null        │ true          │     │
│  │ AR-003     │ VSP      │ D            │ QV          │ true          │     │
│  │ AR-003     │ EyeMed   │ tier_3       │ null        │ true          │     │
│  │ MAT-POLY   │ VSP      │ material     │ AD          │ true          │     │
│  │ FRAME-RB01 │ VSP      │ featured     │ null        │ true          │     │
│  │ FRAME-GEN  │ VSP      │ non_featured │ null        │ true          │     │
│  └────────────┴──────────┴──────────────┴─────────────┴───────────────┘     │
│                                                                              │
│  Key fields:                                                                 │
│  • product_id: FK to your products table                                    │
│  • carrier: VSP, EyeMed, Spectera                                           │
│  • tier_code: The tier this product falls into for this carrier             │
│  • base_code: VSP-specific lens code (KA, NA, QV, etc.)                     │
│  • is_formulary: true if in carrier formulary, false if non-formulary       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer 4: Patient Benefit Storage (What the Patient's Plan Covers)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PATIENT BENEFIT STORAGE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  customer_insurance (existing - enhanced)                                    │
│  ─────────────────────────────────────────                                   │
│  • carrier, planName, memberId, groupNumber                                 │
│  • networkTier (VSP: signature/choice/advantage/enhanced_advantage)         │
│  • effectiveDate, expirationDate                                            │
│  • benefitAuthorizationId (FK to detailed benefits)                         │
│                                                                              │
│  benefit_authorization (NEW - stores parsed benefits)                        │
│  ────────────────────────────────────────────────────                        │
│  • id, customerId, insuranceId                                              │
│  • sourceType: 'scanned_card', 'manual_entry', 'api_verification'           │
│  • verifiedAt, verifiedBy                                                   │
│  • copays: JSONB (full BenefitAuthorization structure)                      │
│  • allowances: JSONB (frame, lens, contact allowances)                      │
│  • frequencies: JSONB (exam, frame, lens frequencies)                       │
│  • specialRules: JSONB (child poly, age rules, etc.)                        │
│                                                                              │
│  benefit_usage (NEW - tracks when benefits used)                             │
│  ───────────────────────────────────────────────                             │
│  • id, customerId, insuranceId                                              │
│  • benefitType: 'exam', 'frame', 'lens', 'contacts'                         │
│  • usedDate, transactionId                                                  │
│  • allowanceUsed, copayPaid                                                 │
│  • nextEligibleDate (calculated)                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Layer 5: Pricing Calculation Engine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PRICING CALCULATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INPUT                                                                       │
│  ─────                                                                       │
│  • Customer ID                                                              │
│  • Selected Products (array of product_ids with quantities)                 │
│  • Patient age (for age-based rules)                                        │
│                                                                              │
│  STEP 1: Load Patient Benefits                                              │
│  ─────────────────────────────                                              │
│  • Get customer_insurance for this customer                                 │
│  • Get benefit_authorization (copays, allowances, frequencies)              │
│  • Get benefit_usage (what's been used this period)                         │
│  • Determine: carrier, networkTier, planName                                │
│                                                                              │
│  STEP 2: Check Eligibility                                                  │
│  ─────────────────────────                                                  │
│  For each product category:                                                  │
│  • Look up last usage date                                                  │
│  • Compare to frequency rule                                                │
│  • Calculate: isEligible, nextEligibleDate                                  │
│  • If not eligible: add warning, use retail price                           │
│                                                                              │
│  STEP 3: Map Products to Tiers                                              │
│  ─────────────────────────────                                              │
│  For each product:                                                           │
│  • Look up product_carrier_mapping for this carrier                         │
│  • Get tier_code and base_code                                              │
│  • If no mapping: mark as non-formulary (80% U&C or retail)                 │
│                                                                              │
│  STEP 4: Calculate Per-Product Cost                                         │
│  ─────────────────────────────────                                          │
│                                                                              │
│  IF carrier == VSP:                                                          │
│    • Get pricing from vsp_{networkTier}_pricing table                       │
│    • Look up by base_code + vision_type                                     │
│    • Apply pricing_rule:                                                    │
│      - 'lower_of_copay_or_uc': min(copay, U&C price)                        │
│      - '80_percent_uc': U&C × 0.80                                          │
│      - 'add_to_base': add to base lens cost                                 │
│    • Stack modifiers: base + material + features                            │
│    • Apply special rules (child poly = $0)                                  │
│                                                                              │
│  IF carrier == EyeMed:                                                       │
│    • Get copay from benefit_authorization.copays.progressive_{tier}         │
│    • Add material copay if applicable                                       │
│    • Add AR coating copay by tier                                           │
│    • Add enhancement copays (photochromic, polarized, etc.)                 │
│    • Apply age rules (child poly covered)                                   │
│    • Apply overage discount for frames                                      │
│                                                                              │
│  IF carrier == Spectera:                                                     │
│    • Similar to EyeMed but with Roman numeral tiers                         │
│    • 70% overage responsibility (vs 80% for EyeMed)                         │
│    • Different enhancement copay structures                                 │
│                                                                              │
│  STEP 5: Calculate Frame Cost                                               │
│  ───────────────────────────                                                │
│  • Get frame retail price                                                   │
│  • Get frame allowance (VSP: featured vs generic)                           │
│  • Calculate overage = max(0, retail - allowance)                           │
│  • Apply overage discount (VSP: 20%, EyeMed: 20%, Spectera: 30%)           │
│  • Patient pays = overage × (1 - discount)                                  │
│                                                                              │
│  STEP 6: Sum and Apply Copays                                               │
│  ─────────────────────────────                                              │
│  • Add exam copay if exam included                                          │
│  • Add materials copay (EyeMed/Spectera)                                   │
│  • Sum all product costs                                                    │
│  • Generate itemized breakdown                                              │
│                                                                              │
│  OUTPUT                                                                      │
│  ──────                                                                      │
│  {                                                                           │
│    customerId, carrier, planName, networkTier,                              │
│    items: [                                                                  │
│      {                                                                       │
│        productId, productName, category,                                    │
│        retailPrice, tierUsed, baseCode,                                     │
│        patientCopay, insurancePays, savings,                                │
│        isEligible, eligibilityNote,                                         │
│        calculationDetails: "Tier N (NA) @ Signature = $160"                 │
│      }                                                                       │
│    ],                                                                        │
│    summary: {                                                                │
│      retailTotal, patientTotal, insuranceTotal,                             │
│      examCopay, materialsCopay, totalSavings                                │
│    },                                                                        │
│    eligibility: {                                                            │
│      exam: { eligible: true, lastUsed: null, nextEligible: null },          │
│      frame: { eligible: false, lastUsed: "2024-06-15", nextEligible: "2026-06-15" }│
│    },                                                                        │
│    warnings: ["Frame benefit not eligible until 2026-06-15"]                │
│  }                                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Additions

### New Tables Required

```sql
-- ============================================================================
-- LAYER 1: STATIC FORMULARY DATA
-- ============================================================================

-- VSP Material Formulary (materials mapped to VSP codes)
CREATE TABLE vsp_material_formulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_type VARCHAR(50) NOT NULL,  -- 'polycarbonate', 'hi_index_1.67', etc.
    material_name VARCHAR(100) NOT NULL,
    base_modifier VARCHAR(10) NOT NULL,  -- 'D' for poly, 'H' for hi-index, etc.
    applies_to VARCHAR(20) NOT NULL,     -- 'sv', 'mf', 'both'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- VSP Enhancement Formulary (features mapped to VSP codes)
CREATE TABLE vsp_enhancement_formulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enhancement_type VARCHAR(50) NOT NULL,  -- 'photochromic', 'polarized', 'tint_solid'
    enhancement_name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,              -- 'PR', 'DA', 'MN', etc.
    applies_to VARCHAR(20) NOT NULL,
    can_stack BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- EyeMed Material Formulary
CREATE TABLE eyemed_material_formulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_type VARCHAR(50) NOT NULL,
    material_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,    -- 'standard', 'impact_resistant', 'high_index'
    requires_age_check BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- EyeMed Enhancement Formulary
CREATE TABLE eyemed_enhancement_formulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enhancement_type VARCHAR(50) NOT NULL,
    enhancement_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    mutually_exclusive_with JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Spectera Material Formulary
CREATE TABLE spectera_material_formulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_type VARCHAR(50) NOT NULL,
    material_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    requires_age_check BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Spectera Enhancement Formulary
CREATE TABLE spectera_enhancement_formulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enhancement_type VARCHAR(50) NOT NULL,
    enhancement_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    mutually_exclusive_with JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- LAYER 2: CARRIER PRICING TABLES
-- ============================================================================

-- VSP Signature Network Pricing
CREATE TABLE vsp_signature_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL,
    vision_type VARCHAR(2) NOT NULL,  -- 'sv' or 'mf'
    vsp_lab_allocation DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    patient_copay DECIMAL(10,2),
    pricing_rule VARCHAR(50) DEFAULT 'lower_of_copay_or_uc',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, vision_type)
);

-- VSP Choice Network Pricing
CREATE TABLE vsp_choice_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL,
    vision_type VARCHAR(2) NOT NULL,
    vsp_lab_allocation DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    patient_copay DECIMAL(10,2),
    pricing_rule VARCHAR(50) DEFAULT 'lower_of_copay_or_80_uc',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, vision_type)
);

-- VSP Advantage Network Pricing
CREATE TABLE vsp_advantage_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL,
    vision_type VARCHAR(2) NOT NULL,
    vsp_lab_allocation DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    patient_copay VARCHAR(50),  -- Can be amount or "80% U&C"
    pricing_rule VARCHAR(50) DEFAULT 'lower_of_copay_or_80_uc_or_max',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, vision_type)
);

-- VSP Enhanced Advantage Network Pricing
CREATE TABLE vsp_enhanced_advantage_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL,
    vision_type VARCHAR(2) NOT NULL,
    vsp_lab_allocation DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    patient_copay DECIMAL(10,2),
    pricing_rule VARCHAR(50) DEFAULT 'lower_of_copay_or_80_uc',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, vision_type)
);

-- VSP Lens Codes Reference
CREATE TABLE vsp_lens_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) PRIMARY KEY,
    code_type VARCHAR(20) NOT NULL,      -- 'base', 'material_modifier', 'feature_modifier'
    description VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    applies_to VARCHAR(20),              -- 'sv', 'mf', 'both'
    can_stack BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- EyeMed Plan Pricing (copays by plan and tier)
CREATE TABLE eyemed_plan_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,       -- 'progressive', 'ar_coating', 'material', 'enhancement'
    tier VARCHAR(20) NOT NULL,
    patient_copay DECIMAL(10,2),
    is_covered BOOLEAN DEFAULT FALSE,    -- For items that are "covered in full"
    is_percent_billed BOOLEAN DEFAULT FALSE,
    percent_billed DECIMAL(5,2),         -- e.g., 80 for "80% of billed"
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(plan_name, category, tier)
);

-- Spectera Plan Pricing
CREATE TABLE spectera_plan_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    tier VARCHAR(20) NOT NULL,
    patient_copay DECIMAL(10,2),
    is_covered BOOLEAN DEFAULT FALSE,
    is_percent_billed BOOLEAN DEFAULT FALSE,
    percent_billed DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(plan_name, category, tier)
);

-- ============================================================================
-- LAYER 3: PRACTICE PRODUCT MAPPING
-- ============================================================================

-- Map YOUR products to carrier tier codes
CREATE TABLE product_carrier_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    carrier VARCHAR(20) NOT NULL,        -- 'VSP', 'EyeMed', 'Spectera'
    tier_code VARCHAR(20) NOT NULL,      -- 'N', 'tier_5', 'V', 'featured', etc.
    base_code VARCHAR(10),               -- VSP-specific: 'NA', 'QV', 'AD', etc.
    is_formulary BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, carrier)
);

-- ============================================================================
-- LAYER 4: PATIENT BENEFIT STORAGE
-- ============================================================================

-- Parsed benefit authorization data
CREATE TABLE benefit_authorization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    insurance_id UUID REFERENCES customer_insurance(id),
    source_type VARCHAR(50) NOT NULL,    -- 'scanned_card', 'manual_entry', 'api_verification'
    source_document_id UUID REFERENCES insurance_documents(id),

    -- VSP-specific
    network_tier VARCHAR(50),            -- 'signature', 'choice', 'advantage', 'enhanced_advantage'

    -- Copay data (stored as JSONB for flexibility)
    copays JSONB NOT NULL,               -- Full copay structure per carrier
    allowances JSONB NOT NULL,           -- Frame, lens, contact allowances
    frequencies JSONB NOT NULL,          -- Exam, frame, lens frequency rules
    special_rules JSONB,                 -- Child poly, age rules, etc.

    -- Verification
    verified_at TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    confidence_score DECIMAL(5,2),

    -- Validity
    effective_date DATE NOT NULL,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Benefit usage tracking
CREATE TABLE benefit_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    insurance_id UUID REFERENCES customer_insurance(id),
    benefit_type VARCHAR(50) NOT NULL,   -- 'exam', 'frame', 'lens', 'contacts'
    used_date DATE NOT NULL,
    transaction_id UUID REFERENCES transactions(id),

    -- What was used
    allowance_used DECIMAL(10,2),
    copay_paid DECIMAL(10,2),
    products_applied JSONB,              -- List of product IDs this applied to

    -- Eligibility calculation
    frequency_months INTEGER NOT NULL,
    next_eligible_date DATE NOT NULL,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- LAYER 5: PRACTICE CONFIGURATION
-- ============================================================================

-- Practice-specific U&C prices (for VSP 80% U&C calculations)
CREATE TABLE practice_uc_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    uc_price_sv DECIMAL(10,2),           -- Single vision price
    uc_price_mf DECIMAL(10,2),           -- Multifocal price
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_product_carrier_mapping_carrier ON product_carrier_mapping(carrier);
CREATE INDEX idx_product_carrier_mapping_product ON product_carrier_mapping(product_id);
CREATE INDEX idx_benefit_authorization_customer ON benefit_authorization(customer_id);
CREATE INDEX idx_benefit_usage_customer ON benefit_usage(customer_id);
CREATE INDEX idx_benefit_usage_type_date ON benefit_usage(benefit_type, used_date);
CREATE INDEX idx_vsp_signature_code ON vsp_signature_pricing(code);
CREATE INDEX idx_vsp_choice_code ON vsp_choice_pricing(code);
CREATE INDEX idx_eyemed_plan_pricing_plan ON eyemed_plan_pricing(plan_name);
CREATE INDEX idx_spectera_plan_pricing_plan ON spectera_plan_pricing(plan_name);
```

---

## Implementation Phases

### Phase 1: Data Foundation (Week 1-2)

**Goal:** Create all database tables and populate with formulary data

1. **Create new tables** (migrations)
   - VSP material/enhancement formularies
   - EyeMed/Spectera material/enhancement formularies
   - VSP network pricing tables (4 tables)
   - EyeMed/Spectera plan pricing tables
   - Product carrier mapping table
   - Benefit authorization & usage tables
   - Practice U&C prices table

2. **Import formulary data**
   - VSP progressive formulary (from Supporting Documents)
   - VSP AR coating formulary
   - VSP lens codes reference
   - VSP network pricing data
   - EyeMed progressive/AR formularies
   - Spectera progressive/AR formularies

3. **Map existing products**
   - Review current LensProduct table
   - Create product_carrier_mapping entries for each
   - Identify products not in formularies

### Phase 2: Benefit Storage (Week 2-3)

**Goal:** Store patient-specific benefits properly

1. **Enhance customer_insurance table**
   - Add network_tier field for VSP
   - Add benefit_authorization_id FK

2. **Build benefit_authorization import**
   - Connect to InsuranceDocument extraction
   - Manual entry form for benefits
   - Validation rules

3. **Implement benefit_usage tracking**
   - Track on transaction completion
   - Calculate next eligible dates
   - API to query usage history

### Phase 3: Pricing Calculator Rewrite (Week 3-4)

**Goal:** Complete, accurate pricing calculations

1. **VSP pricing engine**
   - Network tier selection (Signature/Choice/Advantage/Enhanced)
   - Lens code lookup and stacking
   - 80% U&C calculations
   - Frame featured brand logic

2. **EyeMed pricing engine**
   - Tier-based copay lookup
   - Overage discount application
   - Materials copay logic

3. **Spectera pricing engine**
   - Roman numeral tier lookup
   - 70% overage responsibility
   - Age-based copay rules

4. **Common functionality**
   - Eligibility checking
   - Non-formulary handling
   - Child polycarbonate rules

### Phase 4: Quote Builder Integration (Week 4-5)

**Goal:** End-to-end quote workflow

1. **Quote builder UI**
   - Product selection
   - Real-time pricing display
   - Insurance breakdown view

2. **Eligibility warnings**
   - Show ineligible benefits
   - Next eligible date display
   - Allow override with reason

3. **Quote save and print**
   - Save quote to database
   - Generate printable quote
   - Convert to transaction

### Phase 5: Testing & Validation (Week 5-6)

**Goal:** Ensure accuracy across all carriers and plans

1. **Unit tests**
   - Each carrier pricing engine
   - Edge cases (child, high-index, non-formulary)

2. **Integration tests**
   - Full quote flow
   - Eligibility enforcement
   - Usage tracking

3. **Real-world validation**
   - Test with actual patient benefits
   - Compare to manual calculations
   - Adjust formulas as needed

---

## Data Requirements

### From Insurance Carriers

1. **VSP**
   - Current formulary PDF (progressive/AR listings)
   - Network pricing sheets (Signature, Choice, Advantage, Enhanced)
   - Lens code reference guide
   - Frame featured brand list

2. **EyeMed**
   - Progressive tier list
   - AR coating tier list
   - Standard copay schedules by plan

3. **Spectera**
   - Progressive tier list (Tiers I-V)
   - AR coating tier list (Tiers I-IV)
   - Standard copay schedules by plan

### From Practice

1. **Product inventory mapping**
   - Which progressives you sell → map to carrier tiers
   - Which AR coatings you sell → map to carrier tiers
   - Which materials you offer → map to carrier codes

2. **U&C prices**
   - Your usual and customary prices for each product
   - Used for VSP 80% U&C calculations

3. **Frame brands**
   - Which are VSP featured brands (Altair/Marchon)
   - Which are non-featured

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Quote accuracy | 99% match to manual calculation |
| Formulary coverage | 95% of products mapped to all carriers |
| Eligibility accuracy | 100% correct next-eligible dates |
| Quote generation time | < 2 seconds |
| Staff training time | < 1 hour |

---

## Open Questions for Discussion

1. **How do you currently verify VSP network tier?**
   - Is it on the card? From the eligibility check?
   - Do you have a list of employer groups and their tiers?

2. **Do you sell non-formulary products?**
   - How do you price them today?
   - Should system warn when selecting non-formulary?

3. **How are benefits currently tracked?**
   - Paper records? Memory? External system?
   - How do you know if a patient is eligible?

4. **Featured brand frame handling for VSP:**
   - Do you track which frames are featured vs generic?
   - Different allowance amounts?

5. **Practice-specific agreements:**
   - Any special arrangements with carriers?
   - Custom copay schedules?

---

## Next Steps

1. **Review this plan** - Does this match your understanding?
2. **Prioritize phases** - What's most urgent?
3. **Gather data** - Formulary PDFs, pricing sheets, product list
4. **Begin Phase 1** - Create database migrations

---

*Document created by Vision Benefits POS Development Team*
