# Insurance Document Extraction Schema

This document defines the comprehensive extraction requirements for each insurance carrier's authorization documents. The pricing engine requires this data to calculate accurate patient copays.

## VSP (Vision Service Plan)

VSP provides TWO document types that must be scanned together:

### Document 1: Patient Record Report (Authorization)

**Patient Information:**
- `patientName` - Full name
- `authorizationNumber` - VSP auth number (e.g., "VSP-123456")
- `dateOfBirth` - Patient DOB
- `authEffectiveDate` - When auth becomes active
- `authExpirationDate` - When auth expires

**Plan Information:**
- `planName` - e.g., "VSP Signature", "VSP Choice", "VSP EasyOptions"
- `planType` - SIGNATURE | CHOICE | ADVANTAGE | ESSENTIALS | OTHER

**Copays:**
- `examCopay` - Exam copay amount (e.g., $10)
- `materialsCopay` - Materials copay amount (e.g., $25)

**Frame Benefits:**
- `frameAllowanceRetail` - Non-featured brand allowance (e.g., $200)
- `frameAllowanceMarchon` - Altair/Marchon featured brand allowance (e.g., $220)
- `frameOverageDiscount` - Discount on amount over allowance (typically 20%)

**Contact Lens Benefits:**
- `contactAllowance` - Total CL allowance (e.g., $150)
- `contactFittingCovered` - Whether fitting is covered

### Document 2: Lens Enhancement Charges (Copay Grid)

This is the CRITICAL document for pricing. Contains two-letter codes with copay amounts.

**Progressive Lens Codes:**
| Code | Description | Single Vision | Multifocal |
|------|-------------|---------------|------------|
| KA/KE | Standard Progressive (K Plastic) | - | $0-$55 |
| FA/FE | Premium Tier 1 (F Plastic) | - | $95-$120 |
| JA/JE | Premium Tier 2 (J Plastic) | - | $95-$105 |
| NA/NE | Custom Tier 1 | - | $150-$175 |
| OA/OE | Custom Tier 2 | - | $150-$175 |

**AR Coating Codes:**
| Code | Description | SV Copay | MF Copay |
|------|-------------|----------|----------|
| QM | Standard AR | $0 | $0 |
| QT | Premium AR Tier 1 | $45-$68 | $45-$68 |
| QV | Premium AR Tier 2 | $57-$75 | $57-$75 |
| QW | Premium AR Tier 3 | $65-$85 | $65-$85 |

**Material Codes:**
| Code | Description | SV Copay | MF Copay |
|------|-------------|----------|----------|
| AD | Polycarbonate | $31-$40 | $35-$40 |
| AB | Trivex | $47-$56 | $56-$60 |
| AH | High Index 1.67 | $67-$98 | $98-$105 |
| AJ | High Index 1.74 | $98-$118 | $118-$125 |

**Enhancement Codes:**
| Code | Description | Copay |
|------|-------------|-------|
| PR | Photochromic (Transitions) | $70-$82 |
| PS | Photochromic SunSync | $70-$82 |
| DA | Polarized | $77-$83 |
| SW | Rimless Drill Mount | $25-$30 |
| LF | Scratch Coating | $0-$15 |
| MN | UV Treatment | $0-$15 |

**Special Plan Variations:**
- **EasyOptions Plans**: Some items show "Covered" or "$0" instead of copay amounts
- **Signature Plans**: May have lower copays across the board
- **Choice Plans**: Standard copay structure

---

## EyeMed

EyeMed provides a single comprehensive benefits document.

### Member Information:
- `memberName` - Full name
- `memberId` - Member ID number
- `dateOfBirth` - DOB
- `socialSecurityNumber` - Last 4 digits (***-**-XXXX)
- `address` - Full address
- `gender` - Male/Female
- `responsibleMember` - Subscriber name if different

### Plan Information:
- `network` - Network name (e.g., "Insight 201 Humana W NEEA Medicare 360", "Humana VCP")
- `groupName` - Group name with ID (e.g., "Humana Medicare 703 PPO 400 Plus (1039192)")
- `benefitLevel` - Benefit level code (e.g., "703", "632", "1")

### Eligibility:
- `examEligible` - Yes/No
- `examEligibleDate` - Date eligible
- `examFrequency` - e.g., "Once every calendar year", "Once every 12 months from date of service"
- `lensesEligible` - Yes/No
- `lensesEligibleDate` - Date eligible
- `lensesFrequency` - Frequency text
- `frameEligible` - Yes/No
- `frameEligibleDate` - Date eligible
- `frameFrequency` - e.g., "Once every 24 months from date of service"
- `contactsEligible` - Yes/No
- `contactsEligibleDate` - Date eligible
- `contactFitEligible` - Yes/No

### Exam Copays:
- `examCopay` - Dollar amount (e.g., $0, $10)
- `retinalImagingCost` - e.g., "Up to $39"

### Contact Lens Fit:
- `fitStandardCost` - e.g., "Up to $40", "$0 copay"
- `fitPremiumCost` - e.g., "10% off retail price", "85% of amount over remaining balance"

### Frame Benefits:
- `frameAllowance` - Dollar allowance (e.g., $150, $250, $450)
- `frameOverageDiscount` - Percentage off overage (e.g., 20%, 15%)
- `framePackageDescription` - Full description (e.g., "$0 copay; 20% off balance over $150 allowance")

### Lens Copays (KEY FOR PRICING):
| Lens Type | Example Values |
|-----------|----------------|
| Single Vision | $0, $10 copay |
| Bifocal | $0, $10 copay |
| Trifocal | $0, $10 copay |
| Lenticular | $0, $10 copay |
| Progressive - Standard | $0, $70 copay |
| Progressive - Premium Tier 1 | $0, $80 copay |
| Progressive - Premium Tier 2 | $85, $104 copay |
| Progressive - Premium Tier 3 | $105, $145 copay |
| Progressive - Premium Tier 4 | $145, $185 copay |

### Lens Options Copays:
| Option | Example Values |
|--------|----------------|
| AR Coating - Standard | $0, $45 |
| AR Coating - Premium Tier 1 | $0, $57 |
| AR Coating - Premium Tier 2 | $68, $85 |
| AR Coating - Premium Tier 3 | 20% off retail, $105 |
| Photochromic - Non-Glass | $75, $88 |
| Polycarbonate - Standard (age 19+) | $25, $40 |
| Polycarbonate - Standard (under 19) | $0 copay |
| Scratch Coating - Standard | $0, $15 |
| Tint - Solid/Gradient | $15 |
| UV Treatment | $15 |
| Mid Index | $55 |
| High Index | $95 |
| Edge Polish | $14 |
| Oversize Lens | $14 |
| Polarized | $66 |
| All Other Lens Options | 20% off retail |

### Contact Lens Benefits:
- `contactAllowance` - Dollar allowance (from Declining Balance if present)
- `contactsConventional` - e.g., "$0 copay; 15% off balance over $120 allowance"
- `contactsDisposable` - e.g., "$0 copay; 100% of balance over $120 allowance"
- `contactsMedicallyNecessary` - e.g., "$0 copay"

### Declining Balance (if present):
- `decliningBalanceType` - e.g., "Contact Lenses and Contacts Fit and Follow Up"
- `startingBalance` - e.g., $150
- `remainingBalance` - e.g., $150

---

## Spectera

Spectera provides a single comprehensive benefits document.

### Member Information:
- `memberName` - Full name
- `dateOfBirth` - DOB
- `subscriberId` - Subscriber ID with suffix (e.g., "972465364-05", "001047729-01")
- `productName` - Product codes (e.g., "V1026/V1037/V1043/V1049/V1353/V1358", "C0725")

### Eligibility Frequency:
- `examFrequency` - e.g., "1 every 1 plan year(s)", "2 every 12 month(s)"
- `frameFrequency` - e.g., "1 every 2 plan year(s)", "1 every 24 month(s)"
- `lensesFrequency` - e.g., "1 every 1 plan year(s)", "1 every 12 month(s)"
- `contactLensFrequency` - e.g., "Every 1 plan year(s)"
- `contactFitFrequency` - e.g., "1 every 1 plan year(s)"

### Exam Copays:
- `examCopay` - e.g., $10, $15
- `maternityExamCopay` - e.g., $15 (if different)
- `pediatricExamCopay` - e.g., $15 (if different)

### Contact Lens Fit:
- `selectionContactLensFit` - e.g., "Covered-in-Full"
- `nonSelectionContactLensFit` - e.g., "100% of Billed Charges"

### Frame Benefits:
- `frameAllowance` - Dollar allowance (e.g., $130, $150)
- `frameOveragePercent` - Percent patient pays on overage (e.g., 70%)
- `frameDescription` - e.g., "70.00% of Balance over $150.00 Benefit Allowance"

### Lens Copays (KEY FOR PRICING):

**Standard Lenses:**
- `standardLenses` - e.g., $15, $30

**Progressive Lenses (Tier System I-V):**
| Tier | Example Values |
|------|----------------|
| Tier I | $70, $85 |
| Tier II | $115, $130 |
| Tier III | $165, $180 |
| Tier IV | $215, $230 |
| Tier V | $265, $280 |
| Non-Formulary | 80% of Billed Charges |

**Other Lens Types:**
- `blendedBifocals` - e.g., "80% of Billed Charges"
- `freeformSVLenses` - e.g., "80% of Billed Charges"
- `mfAsphericLenses` - e.g., "80% of Billed Charges"
- `svAsphericLenses` - e.g., "80% of Billed Charges"

### Lens Materials:
| Material | Example Values |
|----------|----------------|
| Polycarbonate (under 19) | Covered-in-Full |
| Polycarbonate (19+) | $33 |
| High Index ≤1.66 | $53 |
| High Index 1.66-1.73 | $63 |
| High Index ≥1.74 | 80% of Billed Charges |

### Lens Options (AR Coating Tier System I-IV):
| Option | Example Values |
|--------|----------------|
| AR Coating - Tier I | $30 |
| AR Coating - Tier II | $50 |
| AR Coating - Tier III | $75 |
| AR Coating - Tier IV | $95 |
| AR Coating - Non-Formulary | 80% of Billed Charges |
| Photochromic | $67 |
| Polarized | 80% of Billed Charges |
| Scratch Coating | Covered-in-Full |
| Tint | $14 |
| UV Coating | $16 |
| Polished Edges | $13 |
| One Year Scratch Warranty | $10 |

### Contact Lens Benefits:
- `contactAllowance` - Non-selection allowance (e.g., $105, $200)
- `selectionDailyBiweekly` - e.g., "$30.00 for up to 4 Boxes", "$15.00 for up to 8 Boxes"
- `selectionMonthly` - e.g., "$30.00 for up to 2 Boxes", "$15.00 for up to 4 Boxes"
- `nonSelectionDescription` - e.g., "100.00% of Balance over $105.00 Benefit Allowance"
- `necessaryContactLenses` - e.g., "$30.00", "$15.00"

---

## Extraction Priority for Pricing Engine

### Critical Fields (Must Extract):

**All Carriers:**
1. Member name and ID
2. Date of birth
3. Exam copay
4. Frame allowance
5. Frame overage discount/percent
6. Contact lens allowance

**VSP Specific:**
1. ALL lens enhancement codes with copay amounts
2. Single Vision vs Multifocal pricing where different
3. Plan type (affects default copays)
4. Featured brand allowance (Marchon/Altair)

**EyeMed Specific:**
1. Progressive tier copays (Standard through Tier 4)
2. AR coating tier copays (Standard through Tier 3)
3. Material copays (polycarbonate, high index)
4. Photochromic copay
5. Declining balance amounts

**Spectera Specific:**
1. Progressive tier copays (I through V)
2. AR coating tier copays (I through IV)
3. Material copays with age considerations
4. Photochromic copay
5. Standard lens copay

### Secondary Fields (Nice to Have):
- Service eligibility dates
- Service frequencies
- Family member information
- Provider/location details
- Network information

---

## Data Structure for Database Storage

### VSP Lens Enhancement Copays Table Structure:
```
vsp_lens_enhancement_copays:
  - vspAuthorizationId (FK)
  - code (KA, FA, QT, AD, etc.)
  - description
  - copaySingleVision (nullable)
  - copayMultifocal (nullable)
  - isAddonCode (boolean)
  - baseCode (nullable, for addon codes)
```

### EyeMed Lens Copays (JSON in authorization):
```json
{
  "lenses": {
    "singleVision": 10,
    "bifocal": 10,
    "trifocal": 10,
    "progressiveStandard": 70,
    "progressiveTier1": 80,
    "progressiveTier2": 104,
    "progressiveTier3": 145,
    "progressiveTier4": 185
  },
  "arCoating": {
    "standard": 0,
    "tier1": 0,
    "tier2": 85,
    "tier3": 105
  },
  "materials": {
    "polycarbonateAdult": 25,
    "polycarbonateChild": 0,
    "midIndex": 55,
    "highIndex": 95
  },
  "enhancements": {
    "photochromic": 88,
    "polarized": 66,
    "tint": 15,
    "uvTreatment": 15
  }
}
```

### Spectera Lens Copays (JSON in authorization):
```json
{
  "lenses": {
    "standard": 15,
    "progressiveTierI": 70,
    "progressiveTierII": 115,
    "progressiveTierIII": 165,
    "progressiveTierIV": 215,
    "progressiveTierV": 265,
    "nonFormulary": "80%"
  },
  "arCoating": {
    "tierI": 30,
    "tierII": 50,
    "tierIII": 75,
    "tierIV": 95,
    "nonFormulary": "80%"
  },
  "materials": {
    "polycarbonateChild": 0,
    "polycarbonateAdult": 33,
    "highIndexLow": 53,
    "highIndexMid": 63,
    "highIndexHigh": "80%"
  },
  "enhancements": {
    "photochromic": 67,
    "polarized": "80%",
    "scratchCoating": 0,
    "tint": 14,
    "uvCoating": 16
  }
}
```
