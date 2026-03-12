# VSP DYNAMIC PRICING SCHEMA
**Version:** 1.0 - Flexible Architecture  
**Purpose:** Accept any VSP plan's benefit structure and calculate patient costs  
**Last Updated:** October 29, 2025

---

## 🎯 SCHEMA PHILOSOPHY

This schema is **data-driven** and **plan-agnostic**. It does NOT contain hardcoded copay amounts. Instead, it:

1. **Accepts** benefit authorization data as input
2. **Maps** products to their codes using static formularies
3. **Calculates** patient costs using the tier-specific pricing
4. **Outputs** itemized patient quotes

**Key Difference from EyeMed/Spectera:** VSP uses a **4-tier pricing system** (Signature, Choice, Advantage, Enhanced Advantage) where pricing is determined by employer group tier, not product tier. VSP also uses hierarchical lens codes with base + modifier structure.

---

## 📊 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                     INPUT LAYER                              │
│  (Benefit Authorization - Plan & Tier-Specific Data)        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   STATIC MAPPING LAYER                       │
│  (Product Formularies - Code Classifications)                │
│  • Progressive Products → K, J, F, O, N                      │
│  • Material Modifiers → B, H, J, D, P                        │
│  • Lens Codes → AA, BA, DA, FA, JA, KA, NA, OA, etc.         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  CALCULATION ENGINE                          │
│  (Business Logic - How to Calculate Costs)                   │
│  • Tier Lookup (Signature/Choice/Advantage/Enhanced)         │
│  • Base + Modifier Stacking                                  │
│  • U&C Comparison (80% U&C vs Fixed Copay)                   │
│  • Age-Based Rules (Child Polycarbonate)                     │
│  • Special Programs (EasyOptions)                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     OUTPUT LAYER                             │
│  (Patient Quote - Itemized Cost Breakdown)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📥 INPUT DATA STRUCTURE

### BenefitAuthorization Object

```json
{
  "patient": {
    "name": "string",
    "dob": "date",
    "age": "integer",
    "member_id": "string",
    "is_child": "boolean",
    "is_handicapped": "boolean",
    "is_federal_employee": "boolean"
  },
  
  "plan": {
    "plan_id": "string",
    "plan_name": "string",
    "pricing_tier": "string",  // "signature", "choice", "advantage", "enhanced_advantage"
    "network": "string",  // "VSP Signature", "VSP Choice", "VSP Advantage", etc.
    "effective_date": "date"
  },
  
  "frequency": {
    "exam": {"count": "integer", "period_months": "integer"},
    "frame": {"count": "integer", "period_months": "integer"},
    "lenses": {"count": "integer", "period_months": "integer"},
    "contacts": {"count": "integer", "period_months": "integer"}
  },
  
  "copays": {
    "exam": "decimal",
    "materials": "decimal",
    
    "frame_allowance": "decimal",
    "frame_overage_discount": "decimal",  // e.g., 0.20 for 20% off
    
    "lens_pricing_tier": "string",  // "signature", "choice", "advantage", "enhanced_advantage"
    
    "lens_enhancement_pricing": {
      "signature": {
        "progressive_k": {"sv": "decimal|string", "mf": "decimal|string"},
        "progressive_j": {"sv": "decimal|string", "mf": "decimal|string"},
        "progressive_f": {"sv": "decimal|string", "mf": "decimal|string"},
        "progressive_o": {"sv": "decimal|string", "mf": "decimal|string"},
        "progressive_n": {"sv": "decimal|string", "mf": "decimal|string"},
        "material_aspheric": {"sv": "decimal", "mf": "decimal"},
        "material_digital": {"sv": "decimal", "mf": "decimal"},
        "material_polycarbonate": {"sv": "decimal", "mf": "decimal"},
        "material_hi_index_1_60": {"sv": "decimal", "mf": "decimal"},
        "material_hi_index_1_67": {"sv": "decimal", "mf": "decimal"},
        "material_hi_index_1_70": {"sv": "decimal", "mf": "decimal"},
        "polarized_plastic": {"sv": "decimal", "mf": "decimal"},
        "ar_tier_a": {"sv": "decimal|string", "mf": "decimal|string"},
        "ar_tier_c": {"sv": "decimal|string", "mf": "decimal|string"},
        "ar_tier_d": {"sv": "decimal|string", "mf": "decimal|string"},
        "photochromic": {"sv": "decimal", "mf": "decimal"},
        "tint_solid": {"sv": "decimal", "mf": "decimal"},
        "tint_gradient": {"sv": "decimal", "mf": "decimal"},
        "custom_measurements": "decimal",
        "tech_addon": {"sv": "decimal", "mf": "decimal"}
      },
      "choice": {
        // Same structure as signature
      },
      "advantage": {
        // Same structure with "80% U&C" strings where applicable
      },
      "enhanced_advantage": {
        // Same structure as signature
      }
    },
    
    "uc_prices": {
      // Practice's Usual & Customary prices for 80% U&C calculations
      "progressive_k": {"sv": "decimal", "mf": "decimal"},
      "progressive_j": {"sv": "decimal", "mf": "decimal"},
      "progressive_f": {"sv": "decimal", "mf": "decimal"},
      "progressive_o": {"sv": "decimal", "mf": "decimal"},
      "progressive_n": {"sv": "decimal", "mf": "decimal"},
      "material_aspheric": {"sv": "decimal", "mf": "decimal"},
      "material_digital": {"sv": "decimal", "mf": "decimal"},
      "material_polycarbonate": {"sv": "decimal", "mf": "decimal"},
      "material_trivex": {"sv": "decimal", "mf": "decimal"},
      "material_hi_index_1_60": {"sv": "decimal", "mf": "decimal"},
      "material_hi_index_1_67": {"sv": "decimal", "mf": "decimal"},
      "material_hi_index_1_70": {"sv": "decimal", "mf": "decimal"},
      "polarized": {"sv": "decimal", "mf": "decimal"},
      "photochromic": {"sv": "decimal", "mf": "decimal"},
      "ar_coating": {"sv": "decimal", "mf": "decimal"}
    },
    
    "contacts_conventional_allowance": "decimal",
    "contacts_disposable_allowance": "decimal"
  },
  
  "special_rules": {
    "polycarbonate_free_child_age_max": "integer",  // e.g., 18
    "has_easyoptions": "boolean",
    "easyoptions_covered_items": ["string"],  // e.g., ["progressive_f", "ar_coating", "photochromic"]
    "uv_protection_covered": "boolean",  // Plan-specific
    "pricing_rule": "string"  // "lower_of_copay_or_uc", "80_percent_uc", etc.
  }
}
```

---

## 🗄️ STATIC DATA LAYER

### 1. PROGRESSIVE LENS FORMULARY TABLE

```sql
CREATE TABLE vsp_progressive_formulary (
    product_id VARCHAR(100) PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    tier VARCHAR(10) NOT NULL,  -- 'K', 'J', 'F', 'O', 'N'
    tier_name VARCHAR(50) NOT NULL,  -- 'Standard', 'Premium', 'Custom'
    is_customizable BOOLEAN DEFAULT FALSE,
    base_code VARCHAR(2) NOT NULL,  -- 'KA', 'JA', 'FA', 'OA', 'NA'
    design_type VARCHAR(50),
    INDEX idx_tier (tier),
    INDEX idx_brand (brand),
    INDEX idx_base_code (base_code)
);
```

**Progressive Tier Classification:**
- **Tier K (Standard)**: Ethos, Hoyalux GP Wide, Image, Ovation, Shamir Genesis HD, synchrony Easy View HD, ZEISS Progressive Light D
- **Tier J (Premium Standard)**: Ethos Plus, Amplitude BKS, Kodak Precise, Shamir Element, Varilux Comfort 2, ZEISS Progressive Light 2 3D
- **Tier F (Premium Advanced)**: Unity Via II, Hoya Array, Shamir Spectrum+, Varilux Comfort Max, Varilux Physio DRx, ZEISS Progressive Light 2 3DV
- **Tier O (Custom Level 1)**: Unity Via Plus II/Mobile II/Wrap II, Array 2, Kodak Unique DRO, Shamir Autograph II+, Varilux Physio W3+, Varilux X Design Technology, ZEISS SmartLife Superb/Plus/Pure
- **Tier N (Custom Level 2)**: Unity Via Elite II/Elite VR, Hoyalux iDMyStyle 3, Hoyalux iD LifeStyle 4, Maui Jim Passport 2.0, Shamir Autograph Intelligence, Shamir Driver Intelligence, Varilux X Fit Technology, Varilux XR Design/Track Technology, ZEISS SmartLife Individual

**Sample Data:**
```sql
INSERT INTO vsp_progressive_formulary VALUES
    ('varilux-x-fit', 'Essilor', 'Varilux X Fit Technology', 'N', 'Custom Level 2', TRUE, 'NA', 'Custom Progressive'),
    ('varilux-x-design', 'Essilor', 'Varilux X Design Technology', 'O', 'Custom Level 1', FALSE, 'OA', 'Custom Progressive'),
    ('varilux-comfort-max', 'Essilor', 'Varilux Comfort Max', 'F', 'Premium Advanced', FALSE, 'FA', 'Premium Progressive'),
    ('varilux-comfort-2', 'Essilor', 'Varilux Comfort 2', 'J', 'Premium Standard', FALSE, 'JA', 'Premium Progressive'),
    ('ethos', 'Plexus', 'Ethos', 'K', 'Standard', FALSE, 'KA', 'Standard Progressive'),
    ('ethos-plus', 'Plexus', 'Ethos Plus', 'J', 'Premium Standard', FALSE, 'JA', 'Premium Progressive'),
    ('unity-via-elite-ii', 'Plexus', 'Unity Via Elite II', 'N', 'Custom Level 2', TRUE, 'NA', 'Custom Progressive'),
    ('unity-via-plus-ii', 'Plexus', 'Unity Via Plus II', 'O', 'Custom Level 1', TRUE, 'OA', 'Custom Progressive'),
    ('unity-via-ii', 'Plexus', 'Unity Via II', 'F', 'Premium Advanced', FALSE, 'FA', 'Premium Progressive'),
    ('zeiss-smartlife-individual', 'ZEISS', 'ZEISS SmartLife Individual', 'N', 'Custom Level 2', TRUE, 'NA', 'Custom Progressive'),
    ('zeiss-smartlife-superb', 'ZEISS', 'ZEISS SmartLife Superb', 'O', 'Custom Level 1', TRUE, 'OA', 'Custom Progressive'),
    ('shamir-autograph-intelligence', 'Shamir', 'Shamir Autograph Intelligence', 'N', 'Custom Level 2', TRUE, 'NA', 'Custom Progressive'),
    ('shamir-autograph-ii-plus', 'Shamir', 'Shamir Autograph II+', 'O', 'Custom Level 1', TRUE, 'OA', 'Custom Progressive'),
    ('shamir-spectrum-plus', 'Shamir', 'Shamir Spectrum+', 'F', 'Premium Advanced', FALSE, 'FA', 'Premium Progressive'),
    ('shamir-element', 'Shamir', 'Shamir Element', 'J', 'Premium Standard', FALSE, 'JA', 'Premium Progressive'),
    ('shamir-genesis-hd', 'Shamir', 'Shamir Genesis HD', 'K', 'Standard', FALSE, 'KA', 'Standard Progressive'),
    ('hoya-idmystyle-3', 'Hoya', 'Hoyalux iDMyStyle 3', 'N', 'Custom Level 2', TRUE, 'NA', 'Custom Progressive'),
    ('hoya-array', 'Hoya', 'Hoya Array', 'F', 'Premium Advanced', FALSE, 'FA', 'Premium Progressive'),
    ('kodak-unique-dro', 'Kodak', 'Kodak Unique DRO', 'O', 'Custom Level 1', FALSE, 'OA', 'Custom Progressive'),
    ('kodak-precise', 'Kodak', 'Kodak Precise', 'J', 'Premium Standard', FALSE, 'JA', 'Premium Progressive');
```

---

### 2. LENS CODE STRUCTURE TABLE

VSP uses a hierarchical code system: **Base Code + Modifier Code(s)**

```sql
CREATE TABLE vsp_lens_codes (
    code VARCHAR(10) PRIMARY KEY,
    code_type VARCHAR(20) NOT NULL,  -- 'base', 'material_modifier', 'feature_modifier'
    description VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    applies_to VARCHAR(20),  -- 'sv', 'mf', 'both'
    can_stack BOOLEAN DEFAULT FALSE,
    INDEX idx_code_type (code_type),
    INDEX idx_category (category)
);
```

**Base Codes:**
- **AA**: Aspheric Plastic 1.50
- **BA**: Digital Aspheric Plastic
- **DA**: Polarized Plastic
- **FA**: Progressive F (Plastic)
- **JA**: Progressive J (Plastic)
- **KA**: Progressive K (Plastic)
- **NA**: Progressive N (Plastic)
- **OA**: Progressive O (Plastic)
- **GA**: Blended Bifocal
- **IA**: Near Variable Focus (Office Progressive)

**Material Modifiers (added to base with +):**
- **+B suffix** (AB, BB, DB, FB, JB, KB, NB, OB): Hi-Index 1.53-1.60/Trivex
- **+H suffix** (AH, BH, DH, FH, JH, KH, NH, OH): Hi-Index 1.66/1.67
- **+J suffix** (AJ, BJ, DJ, FJ, JJ, KJ, NJ, OJ): Hi-Index 1.70+
- **+D suffix** (AD, BD, DD, FD, JD, KD, ND, OD): Polycarbonate
- **+P suffix** (DP, FP, JP, KP, NP, OP): Polarized
- **+E suffix** (AE, FE, JE, KE): Glass/Hi-Index Glass

**Feature Modifiers:**
- **PR**: Photochromic
- **QM**: Anti-Reflective Coating A
- **QT**: Anti-Reflective Coating C
- **QV**: Anti-Reflective Coating D
- **QQ**: Scratch-Resistant Coating A
- **QS**: Scratch-Resistant Coating B
- **QP**: Mirror Coating
- **QR**: Ski Type Coating
- **MN**: Plastic Dye Solid
- **MP**: Plastic Dye Gradient
- **MR**: Glass Tint Solid
- **MS**: Glass Color Coating Solid
- **MT**: Glass Color Coating Gradient
- **RM**: Oversize (61mm+ Plastic)
- **RN**: Oversize (61mm+ Glass)
- **SP**: High Luster Edge Polish
- **SQ**: Edge Coating
- **SR**: Faceted Lenses
- **SW**: Rimless Drill
- **SV**: UV Protection
- **BV**: UV Protection Backside
- **LF**: Light Filter
- **TA**: Technical Add-on
- **CM**: Custom Measurements

**Sample Data:**
```sql
INSERT INTO vsp_lens_codes VALUES
    ('AA', 'base', 'Aspheric Plastic 1.50', 'lens_base', 'both', FALSE),
    ('BA', 'base', 'Digital Aspheric Plastic', 'lens_base', 'both', FALSE),
    ('KA', 'base', 'Progressive K - Plastic', 'progressive', 'mf', FALSE),
    ('FA', 'base', 'Progressive F - Plastic', 'progressive', 'mf', FALSE),
    ('NA', 'base', 'Progressive N - Plastic', 'progressive', 'mf', FALSE),
    ('AB', 'material_modifier', 'Hi-Index 1.53-1.60/Trivex', 'material', 'both', TRUE),
    ('AH', 'material_modifier', 'Hi-Index 1.66/1.67', 'material', 'both', TRUE),
    ('AD', 'material_modifier', 'Polycarbonate', 'material', 'both', TRUE),
    ('PR', 'feature_modifier', 'Photochromic Plastic', 'photochromic', 'both', TRUE),
    ('QM', 'feature_modifier', 'Anti-Reflective Coating A', 'ar_coating', 'both', TRUE),
    ('QT', 'feature_modifier', 'Anti-Reflective Coating C', 'ar_coating', 'both', TRUE),
    ('QV', 'feature_modifier', 'Anti-Reflective Coating D', 'ar_coating', 'both', TRUE),
    ('CM', 'feature_modifier', 'Custom Measurements', 'enhancement', 'mf', TRUE),
    ('TA', 'feature_modifier', 'Technical Add-on', 'enhancement', 'both', TRUE);
```

---

### 3. AR COATING FORMULARY TABLE

```sql
CREATE TABLE vsp_ar_coating_formulary (
    product_id VARCHAR(100) PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    vsp_tier VARCHAR(10) NOT NULL,  -- 'A', 'C', 'D'
    tier_name VARCHAR(50) NOT NULL,
    code VARCHAR(10) NOT NULL,  -- 'QM', 'QT', 'QV'
    has_blue_light BOOLEAN DEFAULT FALSE,
    warranty_years INTEGER,
    INDEX idx_tier (vsp_tier),
    INDEX idx_brand (brand),
    INDEX idx_code (code)
);
```

**AR Coating Tiers:**
- **Tier A (QM)**: Basic AR coatings
- **Tier C (QT)**: Premium AR coatings (Crizal Easy, Crizal Prevencia)
- **Tier D (QV)**: Premium Plus AR coatings (Crizal Sapphire, Crizal Rock)

**Sample Data:**
```sql
INSERT INTO vsp_ar_coating_formulary VALUES
    ('crizal-rock', 'Essilor', 'Crizal Rock', 'D', 'Premium Plus', 'QV', TRUE, 2),
    ('crizal-sapphire-360', 'Essilor', 'Crizal Sapphire 360', 'D', 'Premium Plus', 'QV', TRUE, 2),
    ('crizal-prevencia', 'Essilor', 'Crizal Prevencia', 'C', 'Premium', 'QT', TRUE, 1),
    ('crizal-easy-pro', 'Essilor', 'Crizal Easy Pro', 'C', 'Premium', 'QT', FALSE, 1),
    ('unity-ar', 'Plexus', 'Unity AR', 'A', 'Basic', 'QM', FALSE, 1);
```

---

### 4. PRICING TIER TABLES

Each of the four pricing tiers has its own pricing table.

#### 4A. VSP SIGNATURE PRICING TABLE

```sql
CREATE TABLE vsp_signature_pricing (
    code VARCHAR(10) NOT NULL,
    vision_type VARCHAR(2) NOT NULL,  -- 'sv' or 'mf'
    vsp_lab_allocation DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    patient_copay DECIMAL(10,2),
    pricing_rule VARCHAR(50) DEFAULT 'lower_of_copay_or_uc',
    PRIMARY KEY (code, vision_type),
    INDEX idx_code (code)
);
```

**Sample Signature Pricing Data (from consolidated tiers document):**
```sql
INSERT INTO vsp_signature_pricing VALUES
    -- Progressives (Signature has very favorable pricing)
    ('KA', 'sv', 30.00, 20.00, 50.00, 'lower_of_copay_or_uc'),
    ('KA', 'mf', 30.00, 20.00, 50.00, 'lower_of_copay_or_uc'),
    ('JA', 'sv', 46.00, 34.00, 80.00, 'lower_of_copay_or_uc'),
    ('JA', 'mf', 46.00, 34.00, 80.00, 'lower_of_copay_or_uc'),
    ('FA', 'sv', 54.00, 36.00, 90.00, 'lower_of_copay_or_uc'),
    ('FA', 'mf', 54.00, 36.00, 90.00, 'lower_of_copay_or_uc'),
    ('OA', 'sv', 75.00, 45.00, 120.00, 'lower_of_copay_or_uc'),
    ('OA', 'mf', 75.00, 45.00, 120.00, 'lower_of_copay_or_uc'),
    ('NA', 'sv', 95.00, 65.00, 160.00, 'lower_of_copay_or_uc'),
    ('NA', 'mf', 95.00, 65.00, 160.00, 'lower_of_copay_or_uc'),
    
    -- Base Lenses
    ('AA', 'sv', 10.00, 13.00, 23.00, 'lower_of_copay_or_uc'),
    ('AA', 'mf', 14.00, 14.00, 28.00, 'lower_of_copay_or_uc'),
    ('BA', 'sv', 26.00, 14.00, 40.00, 'lower_of_copay_or_uc'),
    ('BA', 'mf', 31.00, 14.00, 45.00, 'lower_of_copay_or_uc'),
    ('AD', 'sv', 19.00, 14.00, 33.00, 'lower_of_copay_or_uc'),
    ('AD', 'mf', 19.00, 14.00, 33.00, 'lower_of_copay_or_uc'),
    
    -- Material Modifiers
    ('BB', 'sv', 16.00, 11.00, 27.00, 'add_to_base'),
    ('BB', 'mf', 16.00, 11.00, 27.00, 'add_to_base'),
    ('BH', 'sv', 37.00, 19.00, 56.00, 'add_to_base'),
    ('BH', 'mf', 40.00, 25.00, 65.00, 'add_to_base'),
    ('BJ', 'sv', 57.00, 25.00, 82.00, 'add_to_base'),
    ('BJ', 'mf', NULL, NULL, NULL, 'not_available'),
    ('BD', 'sv', 10.00, 0.00, 10.00, 'add_to_base'),
    ('BD', 'mf', 10.00, 0.00, 10.00, 'add_to_base'),
    
    -- Polarized
    ('DA', 'sv', 36.00, 17.00, 53.00, 'lower_of_copay_or_uc'),
    ('DA', 'mf', 48.00, 23.00, 71.00, 'lower_of_copay_or_uc'),
    ('DD', 'sv', 13.00, 14.00, 27.00, 'add_to_base'),
    ('DD', 'mf', 13.00, 14.00, 27.00, 'add_to_base'),
    
    -- Photochromic
    ('PR', 'sv', 45.00, 25.00, 70.00, 'lower_of_copay_or_uc'),
    ('PR', 'mf', 45.00, 25.00, 70.00, 'lower_of_copay_or_uc'),
    
    -- AR Coatings
    ('QM', 'sv', 21.00, 16.00, 37.00, 'lower_of_copay_or_uc'),
    ('QM', 'mf', 21.00, 16.00, 37.00, 'lower_of_copay_or_uc'),
    ('QT', 'sv', 41.00, 20.00, 61.00, 'lower_of_copay_or_uc'),
    ('QT', 'mf', 41.00, 20.00, 61.00, 'lower_of_copay_or_uc'),
    ('QV', 'sv', 52.00, 23.00, 75.00, 'lower_of_copay_or_uc'),
    ('QV', 'mf', 52.00, 23.00, 75.00, 'lower_of_copay_or_uc'),
    
    -- Enhancements
    ('CM', 'mf', 2.00, 8.00, 10.00, 'lower_of_copay_or_uc'),
    ('TA', 'sv', 8.00, 2.00, 10.00, 'lower_of_copay_or_uc'),
    ('TA', 'mf', 28.00, 12.00, 40.00, 'lower_of_copay_or_uc'),
    ('MN', 'sv', 5.00, 8.00, 13.00, 'lower_of_copay_or_uc'),
    ('MN', 'mf', 5.00, 8.00, 13.00, 'lower_of_copay_or_uc'),
    ('MP', 'sv', 7.00, 8.00, 15.00, 'lower_of_copay_or_uc'),
    ('MP', 'mf', 7.00, 8.00, 15.00, 'lower_of_copay_or_uc'),
    ('RM', 'sv', 5.00, 5.00, 10.00, 'lower_of_copay_or_uc'),
    ('RM', 'mf', 6.00, 6.00, 12.00, 'lower_of_copay_or_uc'),
    ('SW', 'sv', 25.00, 5.00, 30.00, 'lower_of_copay_or_uc'),
    ('SW', 'mf', 25.00, 5.00, 30.00, 'lower_of_copay_or_uc'),
    ('SP', 'sv', 6.00, 8.00, 14.00, 'lower_of_copay_or_uc'),
    ('SP', 'mf', 6.00, 8.00, 14.00, 'lower_of_copay_or_uc');
```

#### 4B. VSP CHOICE PRICING TABLE

```sql
CREATE TABLE vsp_choice_pricing (
    code VARCHAR(10) NOT NULL,
    vision_type VARCHAR(2) NOT NULL,
    vsp_lab_allocation DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    patient_copay DECIMAL(10,2),
    pricing_rule VARCHAR(50) DEFAULT 'lower_of_copay_or_80_uc',
    PRIMARY KEY (code, vision_type),
    INDEX idx_code (code)
);
```

**Sample Choice Pricing Data:**
```sql
INSERT INTO vsp_choice_pricing VALUES
    -- Progressives
    ('KA', 'sv', 28.00, 27.00, 55.00, 'lower_of_copay_or_80_uc'),
    ('KA', 'mf', 28.00, 27.00, 55.00, 'lower_of_copay_or_80_uc'),
    ('JA', 'sv', 46.00, 49.00, 95.00, 'lower_of_copay_or_80_uc'),
    ('JA', 'mf', 46.00, 49.00, 95.00, 'lower_of_copay_or_80_uc'),
    ('FA', 'sv', 54.00, 51.00, 105.00, 'lower_of_copay_or_80_uc'),
    ('FA', 'mf', 54.00, 51.00, 105.00, 'lower_of_copay_or_80_uc'),
    ('OA', 'sv', 79.00, 71.00, 150.00, 'lower_of_copay_or_80_uc'),
    ('OA', 'mf', 79.00, 71.00, 150.00, 'lower_of_copay_or_80_uc'),
    ('NA', 'sv', 95.00, 80.00, 175.00, 'lower_of_copay_or_80_uc'),
    ('NA', 'mf', 95.00, 80.00, 175.00, 'lower_of_copay_or_80_uc'),
    
    -- Base Lenses
    ('AA', 'sv', 10.00, 21.00, 31.00, 'lower_of_copay_or_80_uc'),
    ('AA', 'mf', 14.00, 21.00, 35.00, 'lower_of_copay_or_80_uc'),
    ('BA', 'sv', 24.00, 21.00, 45.00, 'lower_of_copay_or_80_uc'),
    ('BA', 'mf', 34.00, 21.00, 55.00, 'lower_of_copay_or_80_uc'),
    ('AD', 'sv', 14.00, 21.00, 35.00, 'lower_of_copay_or_80_uc'),
    ('AD', 'mf', 14.00, 21.00, 35.00, 'lower_of_copay_or_80_uc'),
    
    -- Material Modifiers
    ('BB', 'sv', 16.00, 12.00, 28.00, 'add_to_base'),
    ('BB', 'mf', 16.00, 12.00, 28.00, 'add_to_base'),
    ('BH', 'sv', 37.00, 21.00, 58.00, 'add_to_base'),
    ('BH', 'mf', 40.00, 28.00, 68.00, 'add_to_base'),
    ('BD', 'sv', 10.00, 0.00, 10.00, 'add_to_base'),
    ('BD', 'mf', 10.00, 0.00, 10.00, 'add_to_base'),
    
    -- Polarized
    ('DA', 'sv', 36.00, 21.00, 57.00, 'lower_of_copay_or_80_uc'),
    ('DA', 'mf', 48.00, 29.00, 77.00, 'lower_of_copay_or_80_uc'),
    
    -- Photochromic
    ('PR', 'sv', 45.00, 30.00, 75.00, 'lower_of_copay_or_80_uc'),
    ('PR', 'mf', 45.00, 30.00, 75.00, 'lower_of_copay_or_80_uc'),
    
    -- AR Coatings
    ('QM', 'sv', 21.00, 20.00, 41.00, 'lower_of_copay_or_80_uc'),
    ('QM', 'mf', 21.00, 20.00, 41.00, 'lower_of_copay_or_80_uc'),
    ('QT', 'sv', 41.00, 27.00, 68.00, 'lower_of_copay_or_80_uc'),
    ('QT', 'mf', 41.00, 27.00, 68.00, 'lower_of_copay_or_80_uc'),
    ('QV', 'sv', 52.00, 33.00, 85.00, 'lower_of_copay_or_80_uc'),
    ('QV', 'mf', 52.00, 33.00, 85.00, 'lower_of_copay_or_80_uc'),
    
    -- Enhancements
    ('CM', 'mf', 2.00, 8.00, 10.00, 'lower_of_copay_or_80_uc'),
    ('TA', 'sv', 8.00, 2.00, 10.00, 'lower_of_copay_or_80_uc'),
    ('TA', 'mf', 28.00, 12.00, 40.00, 'lower_of_copay_or_80_uc'),
    ('MN', 'sv', 5.00, 10.00, 15.00, 'lower_of_copay_or_80_uc'),
    ('MN', 'mf', 5.00, 10.00, 15.00, 'lower_of_copay_or_80_uc'),
    ('MP', 'sv', 7.00, 10.00, 17.00, 'lower_of_copay_or_80_uc'),
    ('MP', 'mf', 7.00, 10.00, 17.00, 'lower_of_copay_or_80_uc'),
    ('SW', 'sv', 25.00, 5.00, 30.00, 'lower_of_copay_or_80_uc'),
    ('SW', 'mf', 25.00, 5.00, 30.00, 'lower_of_copay_or_80_uc');
```

#### 4C. VSP ADVANTAGE PRICING TABLE

```sql
CREATE TABLE vsp_advantage_pricing (
    code VARCHAR(10) NOT NULL,
    vision_type VARCHAR(2) NOT NULL,
    vsp_lab_allocation DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    patient_copay VARCHAR(50),  -- Can be amount or "80% U&C"
    pricing_rule VARCHAR(50) DEFAULT 'lower_of_copay_or_80_uc_or_max',
    PRIMARY KEY (code, vision_type),
    INDEX idx_code (code)
);
```

**Sample Advantage Pricing Data:**
```sql
INSERT INTO vsp_advantage_pricing VALUES
    -- Progressives (Base progressive covered, modifiers 80% U&C)
    ('KA', 'sv', 28.00, 27.00, '55.00', 'lower_of_copay_or_80_uc'),
    ('KA', 'mf', 28.00, 27.00, '55.00', 'lower_of_copay_or_80_uc'),
    ('JA', 'sv', 46.00, 49.00, '95.00', 'lower_of_copay_or_80_uc'),
    ('JA', 'mf', 46.00, 49.00, '95.00', 'lower_of_copay_or_80_uc'),
    ('FA', 'sv', 54.00, 51.00, '105.00', 'lower_of_copay_or_80_uc'),
    ('FA', 'mf', 54.00, 51.00, '105.00', 'lower_of_copay_or_80_uc'),
    ('OA', 'sv', 79.00, 71.00, '150.00', 'lower_of_copay_or_80_uc'),
    ('OA', 'mf', 79.00, 71.00, '150.00', 'lower_of_copay_or_80_uc'),
    ('NA', 'sv', 95.00, 80.00, '175.00', 'lower_of_copay_or_80_uc'),
    ('NA', 'mf', 95.00, 80.00, '175.00', 'lower_of_copay_or_80_uc'),
    
    -- Material Modifiers (Most are 80% U&C)
    ('BB', 'sv', 16.00, 12.00, '80% U&C', '80_percent_uc'),
    ('BB', 'mf', 16.00, 12.00, '80% U&C', '80_percent_uc'),
    ('BH', 'sv', 37.00, 21.00, '80% U&C', '80_percent_uc'),
    ('BH', 'mf', 40.00, 28.00, '80% U&C', '80_percent_uc'),
    ('BD', 'sv', 10.00, 0.00, '35.00', 'add_to_base'),  -- Poly is fixed copay
    ('BD', 'mf', 10.00, 0.00, '35.00', 'add_to_base'),
    
    -- Polarized (80% U&C)
    ('DA', 'sv', 36.00, 21.00, '80% U&C', '80_percent_uc'),
    ('DA', 'mf', 48.00, 29.00, '80% U&C', '80_percent_uc'),
    ('DP', 'sv', 51.00, 31.00, '80% U&C', '80_percent_uc_add'),
    ('DP', 'mf', 51.00, 31.00, '80% U&C', '80_percent_uc_add'),
    
    -- Photochromic (80% U&C)
    ('PR', 'sv', 45.00, 30.00, '75.00', 'lower_of_copay_or_80_uc'),
    ('PR', 'mf', 45.00, 30.00, '75.00', 'lower_of_copay_or_80_uc'),
    
    -- AR Coatings (80% U&C)
    ('QM', 'sv', 21.00, 20.00, '68.00', 'lower_of_copay_or_80_uc'),
    ('QM', 'mf', 21.00, 20.00, '68.00', 'lower_of_copay_or_80_uc'),
    ('QT', 'sv', 41.00, 27.00, '68.00', 'lower_of_copay_or_80_uc'),
    ('QT', 'mf', 41.00, 27.00, '68.00', 'lower_of_copay_or_80_uc'),
    ('QV', 'sv', 52.00, 33.00, '85.00', 'lower_of_copay_or_80_uc'),
    ('QV', 'mf', 52.00, 33.00, '85.00', 'lower_of_copay_or_80_uc');
```

#### 4D. VSP ENHANCED ADVANTAGE PRICING TABLE

```sql
CREATE TABLE vsp_enhanced_advantage_pricing (
    code VARCHAR(10) NOT NULL,
    vision_type VARCHAR(2) NOT NULL,
    vsp_lab_allocation DECIMAL(10,2),
    service_fee DECIMAL(10,2),
    patient_copay DECIMAL(10,2),
    pricing_rule VARCHAR(50) DEFAULT 'lower_of_copay_or_80_uc',
    PRIMARY KEY (code, vision_type),
    INDEX idx_code (code)
);
```

**Sample Enhanced Advantage Pricing Data:**
```sql
INSERT INTO vsp_enhanced_advantage_pricing VALUES
    -- Progressives (Fixed copays)
    ('KA', 'sv', 28.00, 27.00, 55.00, 'lower_of_copay_or_80_uc'),
    ('KA', 'mf', 28.00, 27.00, 55.00, 'lower_of_copay_or_80_uc'),
    ('JA', 'sv', 46.00, 49.00, 95.00, 'lower_of_copay_or_80_uc'),
    ('JA', 'mf', 46.00, 49.00, 95.00, 'lower_of_copay_or_80_uc'),
    ('FA', 'sv', 54.00, 51.00, 105.00, 'lower_of_copay_or_80_uc'),
    ('FA', 'mf', 54.00, 51.00, 105.00, 'lower_of_copay_or_80_uc'),
    ('OA', 'sv', 79.00, 71.00, 150.00, 'lower_of_copay_or_80_uc'),
    ('OA', 'mf', 79.00, 71.00, 150.00, 'lower_of_copay_or_80_uc'),
    ('NA', 'sv', 95.00, 80.00, 175.00, 'lower_of_copay_or_80_uc'),
    ('NA', 'mf', 95.00, 80.00, 175.00, 'lower_of_copay_or_80_uc'),
    
    -- Base Lenses
    ('AA', 'sv', 10.00, 21.00, 31.00, 'lower_of_copay_or_80_uc'),
    ('AA', 'mf', 14.00, 21.00, 35.00, 'lower_of_copay_or_80_uc'),
    ('BA', 'sv', 24.00, 21.00, 45.00, 'lower_of_copay_or_80_uc'),
    ('BA', 'mf', 34.00, 21.00, 55.00, 'lower_of_copay_or_80_uc'),
    ('AD', 'sv', 14.00, 21.00, 35.00, 'lower_of_copay_or_80_uc'),
    ('AD', 'mf', 14.00, 21.00, 35.00, 'lower_of_copay_or_80_uc'),
    
    -- Material Modifiers (Fixed copays)
    ('NB', 'sv', 25.00, 22.00, 47.00, 'add_to_base'),
    ('NB', 'mf', 25.00, 22.00, 47.00, 'add_to_base'),
    ('NH', 'sv', 48.00, 30.00, 78.00, 'add_to_base'),
    ('NH', 'mf', 48.00, 30.00, 78.00, 'add_to_base'),
    ('NJ', 'sv', 77.00, 48.00, 125.00, 'add_to_base'),
    ('NJ', 'mf', 77.00, 48.00, 125.00, 'add_to_base'),
    ('ND', 'sv', 15.00, 20.00, 35.00, 'add_to_base'),
    ('ND', 'mf', 15.00, 20.00, 35.00, 'add_to_base'),
    ('NP', 'sv', 51.00, 31.00, 82.00, 'add_to_base'),
    ('NP', 'mf', 51.00, 31.00, 82.00, 'add_to_base'),
    
    -- Polarized
    ('DA', 'sv', 36.00, 21.00, 57.00, 'lower_of_copay_or_80_uc'),
    ('DA', 'mf', 48.00, 29.00, 77.00, 'lower_of_copay_or_80_uc'),
    
    -- Photochromic
    ('PR', 'sv', 45.00, 30.00, 75.00, 'lower_of_copay_or_80_uc'),
    ('PR', 'mf', 45.00, 30.00, 75.00, 'lower_of_copay_or_80_uc'),
    
    -- AR Coatings
    ('QM', 'sv', 21.00, 20.00, 41.00, 'lower_of_copay_or_80_uc'),
    ('QM', 'mf', 21.00, 20.00, 41.00, 'lower_of_copay_or_80_uc'),
    ('QT', 'sv', 41.00, 27.00, 68.00, 'lower_of_copay_or_80_uc'),
    ('QT', 'mf', 41.00, 27.00, 68.00, 'lower_of_copay_or_80_uc'),
    ('QV', 'sv', 52.00, 33.00, 85.00, 'lower_of_copay_or_80_uc'),
    ('QV', 'mf', 52.00, 33.00, 85.00, 'lower_of_copay_or_80_uc'),
    
    -- Enhancements
    ('CM', 'mf', 2.00, 8.00, 10.00, 'lower_of_copay_or_80_uc'),
    ('TA', 'sv', 8.00, 2.00, 10.00, 'lower_of_copay_or_80_uc'),
    ('TA', 'mf', 28.00, 12.00, 40.00, 'lower_of_copay_or_80_uc'),
    ('MN', 'sv', 5.00, 10.00, 15.00, 'lower_of_copay_or_80_uc'),
    ('MN', 'mf', 5.00, 10.00, 15.00, 'lower_of_copay_or_80_uc'),
    ('MP', 'sv', 7.00, 10.00, 17.00, 'lower_of_copay_or_80_uc'),
    ('MP', 'mf', 7.00, 10.00, 17.00, 'lower_of_copay_or_80_uc'),
    ('SW', 'sv', 25.00, 5.00, 30.00, 'lower_of_copay_or_80_uc'),
    ('SW', 'mf', 25.00, 5.00, 30.00, 'lower_of_copay_or_80_uc');
```

---

## 🔧 CALCULATION ENGINE

### Business Rules & Logic

#### 1. PRICING TIER DETERMINATION

```python
def get_pricing_tier(benefit_auth):
    """
    Determine which pricing tier applies to this patient
    
    Returns: 'signature', 'choice', 'advantage', or 'enhanced_advantage'
    """
    return benefit_auth['plan']['pricing_tier']
```

#### 2. BASE + MODIFIER CODE STACKING

VSP uses a hierarchical system where base codes can be combined with modifiers:

```python
def calculate_lens_cost(base_code, modifiers, vision_type, pricing_tier, uc_prices):
    """
    Calculate total lens cost including base + all modifiers
    
    Args:
        base_code: str - Base lens code (e.g., 'BA', 'NA', 'FA')
        modifiers: list - List of modifier codes (e.g., ['BH', 'PR', 'QV'])
        vision_type: str - 'sv' or 'mf'
        pricing_tier: str - Patient's pricing tier
        uc_prices: dict - Practice U&C prices
    
    Returns:
        dict: {
            'base_cost': decimal,
            'modifier_costs': [decimal],
            'total_cost': decimal,
            'calculation_details': str
        }
    """
    
    # Get base cost
    base_price = get_tier_pricing(base_code, vision_type, pricing_tier)
    base_cost = calculate_final_price(base_price, uc_prices.get(base_code), pricing_tier)
    
    # Calculate each modifier
    modifier_costs = []
    for modifier in modifiers:
        mod_price = get_tier_pricing(modifier, vision_type, pricing_tier)
        mod_cost = calculate_final_price(mod_price, uc_prices.get(modifier), pricing_tier)
        modifier_costs.append(mod_cost)
    
    return {
        'base_cost': base_cost,
        'modifier_costs': modifier_costs,
        'total_cost': base_cost + sum(modifier_costs),
        'codes_used': [base_code] + modifiers
    }
```

#### 3. PRICING RULE APPLICATION

```python
def calculate_final_price(tier_price, uc_price, pricing_tier):
    """
    Apply the pricing rule for the specific tier
    
    Args:
        tier_price: dict or str - Pricing from tier table (can be amount or "80% U&C")
        uc_price: decimal - Practice's usual & customary price
        pricing_tier: str - Patient's pricing tier
    
    Returns:
        decimal - Final patient cost
    """
    
    # Handle "80% U&C" pricing
    if isinstance(tier_price, str) and "80% U&C" in tier_price:
        return uc_price * 0.80
    
    # Handle fixed copay with pricing rule
    copay = tier_price['patient_copay']
    pricing_rule = tier_price['pricing_rule']
    
    if pricing_rule == 'lower_of_copay_or_uc':
        # Signature: Lower of copay or U&C
        return min(copay, uc_price)
    
    elif pricing_rule == 'lower_of_copay_or_80_uc':
        # Choice/Enhanced Advantage: Lower of copay or 80% U&C
        return min(copay, uc_price * 0.80)
    
    elif pricing_rule == '80_percent_uc':
        # Advantage: 80% of U&C
        return uc_price * 0.80
    
    elif pricing_rule == 'add_to_base':
        # Modifier that adds to base cost
        return copay
    
    else:
        return copay
```

#### 4. SPECIAL RULES APPLICATION

```python
def apply_special_rules(lens_selection, benefit_auth):
    """
    Apply special pricing rules based on patient characteristics
    
    Args:
        lens_selection: dict - Selected lenses and enhancements
        benefit_auth: dict - Benefit authorization object
    
    Returns:
        dict - Updated pricing with special rules applied
    """
    
    pricing = lens_selection['pricing'].copy()
    
    # Rule 1: Child Polycarbonate Pricing
    if benefit_auth['patient']['is_child'] or benefit_auth['patient']['is_handicapped']:
        if 'polycarbonate' in lens_selection['materials']:
            pricing['material_cost'] = 0.00
            pricing['notes'].append('Polycarbonate covered for children/handicapped patients')
    
    # Rule 2: EasyOptions Program
    if benefit_auth['special_rules']['has_easyoptions']:
        covered_items = benefit_auth['special_rules']['easyoptions_covered_items']
        for item in covered_items:
            if item in lens_selection:
                pricing[f'{item}_cost'] = 0.00
                pricing['notes'].append(f'{item} covered under EasyOptions')
    
    # Rule 3: UV Protection Plan-Specific
    if 'uv_protection' in lens_selection:
        if benefit_auth['special_rules']['uv_protection_covered']:
            pricing['uv_cost'] = 0.00
            pricing['notes'].append('UV protection covered under this plan')
    
    # Rule 4: Federal Employee Pricing
    if benefit_auth['patient']['is_federal_employee']:
        # Federal employees may have different polycarbonate pricing
        pricing['notes'].append('Federal employee pricing applied')
    
    return pricing
```

#### 5. PROGRESSIVE TIER LOOKUP

```python
def get_progressive_tier(product_name):
    """
    Look up progressive tier from formulary
    
    Args:
        product_name: str - Name of progressive lens
    
    Returns:
        dict: {
            'tier': str - 'K', 'J', 'F', 'O', 'N',
            'tier_name': str - 'Standard', 'Premium', 'Custom',
            'base_code': str - 'KA', 'JA', 'FA', 'OA', 'NA'
        }
    """
    
    query = """
        SELECT tier, tier_name, base_code, is_customizable
        FROM vsp_progressive_formulary
        WHERE product_name = %s OR product_id = %s
    """
    
    result = db.execute(query, (product_name, product_name.lower().replace(' ', '-')))
    
    return result
```

#### 6. AR COATING TIER LOOKUP

```python
def get_ar_tier(product_name):
    """
    Look up AR coating tier from formulary
    
    Args:
        product_name: str - Name of AR coating
    
    Returns:
        dict: {
            'tier': str - 'A', 'C', 'D',
            'tier_name': str - 'Basic', 'Premium', 'Premium Plus',
            'code': str - 'QM', 'QT', 'QV'
        }
    """
    
    query = """
        SELECT vsp_tier, tier_name, code
        FROM vsp_ar_coating_formulary
        WHERE product_name = %s OR product_id = %s
    """
    
    result = db.execute(query, (product_name, product_name.lower().replace(' ', '-')))
    
    return result
```

---

## 📤 OUTPUT DATA STRUCTURE

### PatientQuote Object

```json
{
  "quote_id": "string",
  "timestamp": "datetime",
  "patient": {
    "name": "string",
    "member_id": "string"
  },
  
  "plan_details": {
    "plan_name": "string",
    "pricing_tier": "string",
    "network": "string"
  },
  
  "exam": {
    "copay": "decimal",
    "covered": "boolean"
  },
  
  "frame": {
    "allowance": "decimal",
    "selected_frame_cost": "decimal",
    "overage": "decimal",
    "patient_cost": "decimal"
  },
  
  "lenses": {
    "vision_type": "string",  // "single_vision" or "multifocal"
    
    "base_lens": {
      "type": "string",  // "standard", "aspheric", "digital", "progressive_k", etc.
      "code": "string",  // "AA", "BA", "KA", etc.
      "tier": "string",  // For progressives: "K", "J", "F", "O", "N"
      "product_name": "string",
      "vsp_lab_allocation": "decimal",
      "service_fee": "decimal",
      "patient_copay": "decimal"
    },
    
    "materials": {
      "material_type": "string",  // "plastic", "polycarbonate", "hi_index_1.67", etc.
      "code": "string",  // "AD", "BH", "NB", etc.
      "vsp_lab_allocation": "decimal",
      "service_fee": "decimal",
      "patient_copay": "decimal",
      "special_pricing": "boolean"  // Child/handicapped flag
    },
    
    "ar_coating": {
      "product_name": "string",
      "tier": "string",  // "A", "C", "D"
      "code": "string",  // "QM", "QT", "QV"
      "vsp_lab_allocation": "decimal",
      "service_fee": "decimal",
      "patient_copay": "decimal"
    },
    
    "photochromic": {
      "type": "string",  // "transitions", "xtractive", etc.
      "code": "string",  // "PR"
      "vsp_lab_allocation": "decimal",
      "service_fee": "decimal",
      "patient_copay": "decimal"
    },
    
    "polarized": {
      "type": "string",
      "code": "string",  // "DA", "DP", etc.
      "vsp_lab_allocation": "decimal",
      "service_fee": "decimal",
      "patient_copay": "decimal"
    },
    
    "enhancements": [
      {
        "type": "string",  // "tint", "oversize", "edge_polish", "rimless", etc.
        "code": "string",
        "vsp_lab_allocation": "decimal",
        "service_fee": "decimal",
        "patient_copay": "decimal"
      }
    ],
    
    "total_lens_cost": "decimal"
  },
  
  "summary": {
    "exam_cost": "decimal",
    "frame_cost": "decimal",
    "lens_cost": "decimal",
    "total_patient_responsibility": "decimal"
  },
  
  "calculation_details": {
    "pricing_tier_used": "string",
    "uc_prices_used": "object",
    "pricing_rules_applied": ["string"],
    "special_rules_applied": ["string"]
  },
  
  "notes": ["string"]
}
```

---

## 🔄 COMPLETE WORKFLOW EXAMPLE

### Scenario: Enhanced Advantage Patient

**Patient:** Alberto Burgos  
**Age:** 45  
**Plan:** VSP Enhanced Advantage  
**Network:** Enhanced Advantage

**Selection:**
- Exam
- Frame: $250 retail
- Progressive N (Varilux X)
- Hi-Index 1.67
- Crizal Rock (AR Tier D)
- Transitions Gen S
- Rimless mount

**Step 1: Input Authorization**
```json
{
  "patient": {
    "name": "Alberto Burgos",
    "age": 45,
    "is_child": false
  },
  "plan": {
    "pricing_tier": "enhanced_advantage"
  },
  "copays": {
    "exam": 10,
    "frame_allowance": 150,
    "lens_pricing_tier": "enhanced_advantage"
  }
}
```

**Step 2: Look Up Products**
- Varilux X → Progressive Tier N → Base Code NA
- Hi-Index 1.67 → Material Modifier NH
- Crizal Rock → AR Tier D → Code QV
- Transitions → Photochromic → Code PR
- Rimless → Enhancement → Code SW

**Step 3: Get Pricing (Enhanced Advantage)**
- NA (multifocal): $175
- NH (modifier): $78
- QV (multifocal): $85
- PR (multifocal): $75
- SW (multifocal): $30
- TA (tech add-on): $40 (automatic for multifocal with enhancements)

**Step 4: Calculate Total**
```
Exam: $10
Frame: $150 allowance, $250 retail → $100 overage
Lenses:
  Base (NA): $175
  Material (NH): $78
  AR (QV): $85
  Photochromic (PR): $75
  Rimless (SW): $30
  Tech Add-on (TA): $40
  Subtotal: $483

TOTAL: $10 + $100 + $483 = $593
```

**Step 5: Generate Quote**
```json
{
  "exam": {"copay": 10},
  "frame": {
    "allowance": 150,
    "selected_frame_cost": 250,
    "overage": 100,
    "patient_cost": 100
  },
  "lenses": {
    "base_lens": {
      "type": "progressive_n",
      "code": "NA",
      "product_name": "Varilux X Fit Technology",
      "patient_copay": 175
    },
    "materials": {
      "material_type": "hi_index_1.67",
      "code": "NH",
      "patient_copay": 78
    },
    "ar_coating": {
      "product_name": "Crizal Rock",
      "code": "QV",
      "patient_copay": 85
    },
    "photochromic": {
      "type": "transitions",
      "code": "PR",
      "patient_copay": 75
    },
    "enhancements": [
      {"type": "rimless", "code": "SW", "patient_copay": 30},
      {"type": "tech_addon", "code": "TA", "patient_copay": 40}
    ],
    "total_lens_cost": 483
  },
  "summary": {
    "total_patient_responsibility": 593
  }
}
```

---

## 🎯 KEY IMPLEMENTATION NOTES

### 1. **Tier-Based vs Product-Based Pricing**

Unlike EyeMed and Spectera which tier products, VSP tiers **employer groups**. The same product (e.g., Varilux X) has different patient costs based on whether the patient is on Signature, Choice, Advantage, or Enhanced Advantage.

### 2. **Code Stacking System**

VSP's hierarchical code system requires:
- Base code determination
- Material modifier selection
- Feature modifier addition
- Proper cost stacking

Example: Digital Aspheric in 1.67 Hi-Index = BA + BH

### 3. **80% U&C Complexity**

Advantage network uses "80% U&C" for many items, requiring:
- Storage of practice U&C prices
- Real-time comparison calculations
- Clear display of which pricing applied

### 4. **Special Program Integration**

EasyOptions and similar programs provide $0 copays for specific items. System must:
- Check benefit auth for program enrollment
- Override pricing for covered items
- Document special coverage in quote

### 5. **Age-Based Rules**

Child/handicapped patients receive $0 polycarbonate across all tiers. System must:
- Verify age or handicapped status
- Override polycarbonate pricing
- Maintain normal pricing for other items

### 6. **Pricing Rule Variations**

Four different pricing rules across tiers:
- **Signature**: Lower of copay or U&C
- **Choice**: Lower of copay or 80% U&C
- **Advantage**: 80% U&C (or fixed for some items)
- **Enhanced Advantage**: Lower of copay or 80% U&C

---

## 📋 VALIDATION CHECKLIST

When implementing this schema, validate:

- [ ] All four pricing tiers load correctly
- [ ] Progressive tier lookup matches VSP formulary
- [ ] AR coating tier lookup matches VSP formulary
- [ ] Code stacking produces correct totals
- [ ] 80% U&C calculations work properly
- [ ] Child polycarbonate rule applies correctly
- [ ] EasyOptions overrides function
- [ ] U&C vs copay comparison logic works
- [ ] All lens codes map to correct descriptions
- [ ] Service fees and lab allocations are informational only
- [ ] Tech add-on applies automatically where needed
- [ ] Oversize charges apply correctly (61mm+ frames)
- [ ] Rimless/semirimless charges apply correctly
- [ ] Glass lens options price correctly
- [ ] Tint options (solid/gradient) work correctly
- [ ] Photochromic pricing matches tier

---

## 🚀 NEXT STEPS

1. **Populate Complete Formulary Tables**
   - Add all progressive lenses from VSP Product Index
   - Add all AR coating products
   - Verify all lens codes and descriptions

2. **Build Calculation Engine**
   - Implement pricing rule logic
   - Build code stacking system
   - Create U&C comparison functions

3. **Create API Endpoints**
   - POST /vsp/calculate-quote
   - GET /vsp/progressive-formulary
   - GET /vsp/ar-coating-formulary
   - GET /vsp/pricing-tiers

4. **Testing**
   - Test all four pricing tiers
   - Validate against known patient quotes
   - Test edge cases (child poly, EasyOptions, etc.)

---

**End of VSP Dynamic Pricing Schema v1.0**

