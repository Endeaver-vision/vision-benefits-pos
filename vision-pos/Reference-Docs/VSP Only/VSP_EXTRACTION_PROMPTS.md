# VSP Extraction Prompts

## Strategy: Two-Stage Extraction with Merge

1. **Stage 1**: Extract Auth Form → Patient info, plan type, copays, allowances, flags
2. **Stage 2**: Extract Enhancement Form → Lens copay matrix (two-letter codes)
3. **Merge**: Combine both extractions into final `VspBenefitAuthorization`

---

## PROMPT 1: Auth Form Extraction

```
You are extracting data from a VSP Patient Record Report (authorization form).
Return ONLY valid JSON — no markdown, no explanation.

Extract these fields (use null if not found):

{
  "document_type": "auth_form",

  // === PATIENT INFO ===
  "patient_name": "string",
  "patient_dob": "string (MM/DD/YYYY)",
  "member_name": "string (may differ from patient)",
  "relationship": "string (Member, Spouse, Child, etc.)",
  "authorization_number": "string",
  "auth_effective_date": "string (MM/DD/YYYY)",
  "auth_expiration_date": "string (MM/DD/YYYY)",

  // === PLAN IDENTIFICATION ===
  "plan_type": "signature" | "choice" | "advantage" | "computer_visioncare" | "savings_pass",
  "client_name": "string (employer name)",
  "network": "string (VSP, Choice, Advantage)",
  "lab_use": "string",

  // === ELIGIBILITY ===
  "eligibility": {
    "exam": boolean,
    "lens": boolean,
    "frame": boolean,
    "contact_lens_exam": boolean,
    "contacts": boolean
  },

  // === COPAYS ===
  "exam_copay": number,
  "material_copay": number,
  "routine_retinal_screening": number or "lesser of $XX or U&C" pattern,

  // === FRAME ALLOWANCE ===
  // CRITICAL: We do NOT sell Altair/Marchon - extract non-Altair amount!
  "frame_allowance": {
    "wfa_code": "string (e.g., WFA60)",
    "altair_amount": number,
    "non_altair_amount": number,  // <-- THIS IS THE ONE WE USE
    "frame_overage_discount": 0.20,  // Always 20% = 0.20
    "easyoptions_wfa_code": "string or null (e.g., WFA134)",
    "easyoptions_amount": number or null  // If EasyOptions frame upgrade
  },

  // === CONTACT LENS PATTERN ===
  // Determine which pattern applies:
  "contact_lens_pattern": "separate" | "combined" | "covered_in_full" | "discount" | "none",

  // Pattern A: Separate Exam + Materials
  "cl_exam_copay": number or null,  // e.g., 10 from "lesser of $10 copay or 85% U&C"
  "cl_exam_percentage": 0.85,  // Usually 85% U&C
  "cl_materials_allowance": number or null,  // e.g., 155

  // Pattern B: Combined Exam And Allowance
  "cl_combined_allowance": number or null,  // e.g., 150
  "cl_combined_discount": 0.15,  // "Take 15% off CL exam services"
  "cl_exam_only_responsibility": number or null,  // "patient responsible for CL exam over $60"

  // Pattern B with EasyOptions
  "cl_easyoptions_allowance": number or null,  // e.g., 230

  // Necessary Contact Lenses
  "necessary_cl_copay": number or null,

  // Contacts Instead Of
  "contacts_instead_of": ["lens", "frame"] or null,
  "contacts_frame_next_available": "string (MM/YY)" or null,

  // === EASYOPTIONS ===
  "has_easyoptions": boolean,
  "easyoptions": {
    "contact_lens_upgrade": number or null,
    "frame_upgrade": number or null,
    "photochromic_upgrade": "covered" or null,
    "progressive_upgrade": "covered" or null,
    "ar_upgrade": "covered" or null
  } or null,

  // === SPECIAL FLAGS ===
  "flags": {
    // Essential Medical Eye Care
    "has_emc": boolean,
    "emc_type": "essential_medical_eye_care" | "diabetic_eyecare_plus" | null,
    "emc_exam_copay": number or null,

    // Computer VisionCare (IMPORTANT - affects coverage!)
    "is_computer_visioncare": boolean,
    "computer_rx_requirement": "±0.50 diopters from everyday eyewear" or null,

    // Post-Laser VisionCare
    "has_post_laser": boolean,

    // Low Vision
    "has_low_vision": boolean,

    // Vision Therapy (Computer VisionCare only)
    "has_vision_therapy": boolean,

    // COB Rules
    "has_cob_restriction": boolean,
    "cob_rule": "string" or null,  // e.g., "COB rule 9: COB isn't allowed"

    // Value Added Benefits
    "value_added_benefits": {
      "same_day_discount": number or null,  // e.g., 0.30 for 30%
      "same_day_40_discount": number or null,  // e.g., 0.40 for 40%
      "within_12_months_discount": number or null,  // e.g., 0.20
      "within_12_months_40_discount": number or null,
      "cl_exam_discount": number or null  // e.g., 0.15 for 15%
    } or null
  },

  // === EYE HEALTH CONDITIONS ===
  "eye_health_conditions": {
    "reported_conditions": ["Diabetes", "AMD", etc.] or [],
    "systemic_checked": ["Diabetes", "Hypertension", etc.] or [],
    "ocular_checked": ["Glaucoma", "AMD", etc.] or [],
    "dilation_performed": boolean,
    "pcp_communication": boolean
  },

  // === LENS ENHANCEMENT SUMMARY ===
  // From the auth form's LENS ENHANCEMENT DETAILS section
  "lens_enhancement_summary": {
    "covered": ["list of items marked Covered"],
    "covered_with_copay": ["list of items with copay"],
    "not_covered": ["list of items NOT covered"]
  }
}

EXTRACTION RULES:
1. For plan_type: Look for "Benefit VSP [TYPE] Plan" in PATIENT COVERAGE section
2. For frame_allowance: ALWAYS extract the "non-Altair" or "non-Altair/Marchon" line
3. For EasyOptions amounts: Look for items marked with * suffix
4. For contact patterns:
   - "CL Exam Services" + "CL Materials" = "separate"
   - "Exam And Allowance" = "combined"
   - "Covered in full" = "covered_in_full"
   - "Charge XX% of U&C" = "discount" (Savings Pass)
5. For EMC: Look for "Essential Medical Eye Care" or "Diabetic Eyecare Plus Program"
6. For Computer VisionCare: Must have "VSP Computer VisionCare Plan Supplemental"
7. For Value Added Benefits: Extract percentages (30%, 40%, 20%, 15%)
8. Dollar amounts: Extract number only (no $ sign)
9. Percentages: Convert to decimal (20% → 0.20)
```

---

## PROMPT 2: Enhancement Form Extraction

```
You are extracting data from a VSP Lens Enhancement Charges sheet.
Return ONLY valid JSON — no markdown, no explanation.

The form has two columns: "Single Cost" (SV) and "Multi Cost" (Progressive/Bifocal).
Extract copay amounts using VSP's two-letter code system.

{
  "document_type": "enhancement_form",
  "authorization_number": "string (from header)",
  "patient_name": "string (from header)",

  // === PROGRESSIVE LENS BASE COPAYS ===
  // First letter = tier, look at the "Multi Cost" column
  "progressives": {
    "K_standard": number,      // KA - Progressive K Plastic (Multi column)
    "J_premium": number,       // JA - Progressive J Plastic
    "F_premium_adv": number,   // FA - Progressive F Plastic
    "O_custom": number,        // OA - Progressive O Plastic
    "N_custom": number         // NA - Progressive N Plastic
  },

  // === SINGLE VISION BASE ===
  // Standard SV is typically in the material base (no separate code)
  "single_vision_base": 0,  // Usually $0 for base SV

  // === MATERIAL ADD-ONS ===
  // These are ADDED to progressive base (look at Single and Multi columns)
  "materials": {
    "polycarbonate_sv": number,     // AD Single column
    "polycarbonate_multi": number,  // AD Multi column (or KD, JD, etc.)
    "trivex_sv": number,            // AB Single column
    "trivex_multi": number,         // AB Multi column (or KB, JB, etc.)
    "hi_index_167_sv": number,      // AH Single column
    "hi_index_167_multi": number,   // AH Multi column (or KH, JH, etc.)
    "hi_index_174_sv": number,      // AJ Single column
    "hi_index_174_multi": number    // AJ Multi column (or KJ, JJ, etc.)
  },

  // === FULL MATRIX (Two-Letter Codes) ===
  // Format: [Progressive Tier][Material] = copay
  // For covered items ($00), enter 0
  "lens_matrix": {
    // Single Vision row (use "SV" prefix conceptually)
    "SV_plastic": number,    // Base SV CR-39
    "SV_poly": number,       // AD Single
    "SV_trivex": number,     // AB Single
    "SV_hi167": number,      // AH Single
    "SV_hi174": number,      // AJ Single

    // Progressive K (Standard)
    "KA": number,  // K + CR-39 (Progressive K Plastic)
    "KD": number,  // K + Poly
    "KB": number,  // K + Trivex/1.60
    "KH": number,  // K + 1.67
    "KJ": number,  // K + 1.74

    // Progressive J (Premium - Comfort DRx tier)
    "JA": number,
    "JD": number,
    "JB": number,
    "JH": number,
    "JJ": number,

    // Progressive F (Premium Advanced - Comfort Max tier)
    "FA": number,
    "FD": number,
    "FB": number,
    "FH": number,
    "FJ": number,

    // Progressive O (Custom)
    "OA": number,
    "OD": number,
    "OB": number,
    "OH": number,
    "OJ": number,

    // Progressive N (Custom - Varilux X tier)
    "NA": number,
    "ND": number,
    "NB": number,
    "NH": number,
    "NJ": number
  },

  // === AR COATINGS ===
  "ar_coatings": {
    "QM_standard": number,      // Anti-Reflective A
    "QT_premium_1": number,     // Anti-Reflective C
    "QV_premium_2": number      // Anti-Reflective D (Crizal tier)
  },

  // === PHOTOCHROMICS ===
  "photochromics": {
    "PR_plastic": number,       // Photochromatics Plastic
    "PM_glass": number          // Photochromatics Glass (if present)
  },

  // === POLARIZED ===
  "polarized": {
    "DA_sv": number,            // Polarized Plastic A (Single)
    "DA_multi": number,         // Polarized Plastic A (Multi)
    "KP": number,               // Polarized (Progressive K add-on)
    "JP": number,               // Polarized (Progressive J add-on)
    "FP": number,               // Polarized (Progressive F add-on)
    "NP": number,               // Polarized (Progressive N add-on)
    "OP": number                // Polarized (Progressive O add-on)
  },

  // === TINTS ===
  "tints": {
    "MN_plastic_sv": number,    // Plastic Dyes (Single)
    "MN_plastic_multi": number, // Plastic Dyes (Multi)
    "MP_gradient_sv": number,   // Plastic Dyes Gradient (Single)
    "MP_gradient_multi": number // Plastic Dyes Gradient (Multi)
  },

  // === MISCELLANEOUS ===
  "misc": {
    "SP_edge_polish": number,   // High Luster Edge Polish
    "SQ_edge_coating": number,  // Edge Coating
    "SW_rimless": number,       // Rimless Drill
    "LF_light_filter": number,  // Light Filter (Blue Light)
    "TA_tech_addon": number,    // Technical Add On A
    "IA_near_variable": number, // Near Variable Focus
    "RM_oversize_plastic": number, // Oversize Plastic
    "RN_oversize_glass": number,   // Oversize Glass
    "AA_aspheric": number,      // Aspheric
    "BA_digital_aspheric": number, // Digital Aspheric
    "CM_custom_measurement": number // Custom Measurement (for N/O lenses)
  },

  // === COVERAGE STATUS ===
  // What's fully covered ($0) vs requires copay vs not covered
  "coverage_status": {
    "progressives_covered": boolean,  // Are K, J, F, O, N all $0?
    "ar_covered": boolean,            // Are QM, QT, QV all $0?
    "photochromics_covered": boolean,
    "photochromics_not_covered": boolean,  // Computer VisionCare
    "polarized_not_covered": boolean       // Computer VisionCare
  }
}

EXTRACTION RULES:
1. $00 or $0 or blank = 0 (covered, no copay)
2. Look for "Covered" header = all items below are $0
3. Look for "Covered With Additional Copay" = items have copays
4. Look for "Not Covered" = item should be flagged (usually Computer VisionCare)
5. For material add-ons like KD, JD, FD:
   - These are progressive + poly combos
   - Value may be in Multi column only
6. For polarized add-ons (KP, JP, FP, NP, OP):
   - These are standalone add-on codes
   - Multi column only
7. If item not found, use null
8. EasyOptions items marked with * should note "$0 if EasyOptions selected"
```

---

## PROMPT 3: Data Merge Strategy

After extracting both documents, merge into final structure:

```typescript
interface VspBenefitAuthorization {
  // From Auth Form
  patientInfo: {
    name: string;
    dob: string;
    authNumber: string;
    effectiveDate: string;
    expirationDate: string;
  };

  planInfo: {
    planType: 'signature' | 'choice' | 'advantage' | 'computer_visioncare' | 'savings_pass';
    clientName: string;
    network: string;
  };

  copays: {
    exam: number;
    material: number;
    retinalScreening: number;
  };

  frameAllowance: {
    wfaCode: string;
    amount: number;  // Non-Altair!
    overageDiscount: number;
    easyOptionsAmount?: number;
  };

  contactLens: {
    pattern: 'separate' | 'combined' | 'covered_in_full' | 'discount' | 'none';
    examCopay?: number;
    materialsAllowance?: number;
    combinedAllowance?: number;
    easyOptionsAllowance?: number;
    necessaryCopay?: number;
  };

  easyOptions?: {
    contactLensUpgrade?: number;
    frameUpgrade?: number;
    photochromicCovered?: boolean;
    progressiveCovered?: boolean;
    arCovered?: boolean;
  };

  flags: {
    hasEmc: boolean;
    emcType?: string;
    isComputerVisioncare: boolean;
    hasPostLaser: boolean;
    hasLowVision: boolean;
    hasCobRestriction: boolean;
    cobRule?: string;
    valueAddedBenefits?: {
      sameDayDiscount?: number;
      within12MonthsDiscount?: number;
      clExamDiscount?: number;
    };
  };

  // From Enhancement Form
  lensMatrix: {
    // Progressives + Materials
    [code: string]: number;  // e.g., "KA": 0, "KD": 33, "JH": 72
  };

  arCoatings: {
    QM: number;
    QT: number;
    QV: number;
  };

  enhancements: {
    PR: number;  // Photochromic
    DA: number;  // Polarized
    LF: number;  // Blue Light
    SP: number;  // Edge Polish
    SW: number;  // Rimless
    MN: number;  // Tint
  };

  coverageStatus: {
    progressivesCovered: boolean;
    arCovered: boolean;
    photochromicsNotCovered: boolean;
    polarizedNotCovered: boolean;
  };
}
```

---

## Mapping to Product Catalog

| Our Product | VSP Code | How to Calculate Patient Cost |
|-------------|----------|-------------------------------|
| Varilux Comfort DRx + Poly | JD | `lensMatrix.JD + material_copay` |
| Varilux Comfort Max + 1.67 | FH | `lensMatrix.FH + material_copay` |
| Crizal Sapphire HR | QV | `arCoatings.QV` (if not covered) |
| Transitions Gen S | PR | `enhancements.PR` |
| Polarized | DA | `enhancements.DA` (or "NOT COVERED") |

---

## Special Cases

### 1. Computer VisionCare
```javascript
if (flags.isComputerVisioncare) {
  // Mark as NOT COVERED:
  // - Photochromics (PR)
  // - Polarized (DA)
  // - Progressives (use Near Variable Focus instead)
  showBanner("COMPUTER VISION PLAN - Rx must differ ±0.50")
}
```

### 2. EasyOptions
```javascript
if (easyOptions?.photochromicCovered) {
  // PR copay = $0 if patient selects this upgrade
  showAltPrice("PR", 0, "EasyOptions selected")
}
```

### 3. Signature Plan (Everything Covered)
```javascript
if (planType === 'signature' && coverageStatus.progressivesCovered) {
  // All progressives = $0 base
  // Only pay for material add-ons
}
```
