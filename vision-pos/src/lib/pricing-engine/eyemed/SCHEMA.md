# EyeMed Pricing - Elemental Schema

## The Core Concept

```
PRODUCT NAME → TIER → PLAN BENEFIT → PATIENT COST
```

That's it. Everything else is implementation detail.

---

## 1. PRODUCT TIERS (Static - never changes per plan)

### Progressives: 5 Tiers + Standard

| Tier | Products |
|------|----------|
| **standard** | Basic progressives, older designs |
| **tier_1** | Adaptar, Ideal, Natural, Hoya Select 13, Kodak Easy |
| **tier_2** | Ideal Advanced, Kodak Precise, Shamir FirstPAL, Hoya Select 17 |
| **tier_3** | Varilux Comfort 2, Varilux Comfort DRx, Hoya Amplitude HD3, Nikon Presio I |
| **tier_4** | Varilux Comfort Max, Varilux Physio DRx, Hoya iD LifeStyle 2, Kodak Unique, Shamir Autograph III |
| **tier_5** | Varilux X Design, Varilux X 4D, Varilux XR, Hoya iD MyStyle 3, Shamir Autograph Intelligence, Zeiss SmartLife |

### AR Coatings: 3 Tiers + Standard

| Tier | Products |
|------|----------|
| **standard** | Basic AR, backside AR |
| **tier_1** | Crizal Kids UV, Blue Shield AR, Hoya Premium |
| **tier_2** | Crizal Easy, Crizal Prevencia Kids, Hi Vision, Zeiss BlueProtect |
| **tier_3** | Crizal Sapphire 360, Crizal Rock, Crizal Prevencia, Hoya Recharge, Zeiss DuraVision Platinum |

---

## 2. BENEFIT LOOKUP (Dynamic - varies per plan)

Read these fields from the authorization PDF:

```
exam_copay                    → "Exam: $10 copay"
progressive_standard          → "Standard Progressive: $0"
progressive_premium_tier_1    → "Premium Tier 1: $60"
progressive_premium_tier_2    → "Premium Tier 2: $85"
progressive_premium_tier_3    → "Premium Tier 3: $110"
progressive_premium_tier_4    → "Premium Tier 4: $135" or "$25 copay; 20% off balance over $120 allowance"
progressive_premium_tier_5    → "Premium Tier 5: $160" or falls back to tier_4

ar_standard                   → "Standard AR: $45"
ar_premium_tier_2             → "Premium AR Tier 2: 20% off retail"
ar_premium_tier_3             → "Premium AR Tier 3: 20% off retail"

material_poly                 → "$40" (adult) or "Covered" (under 19)
material_hi                   → "20% off retail"
```

---

## 3. CALCULATION RULES

### Simple Copay
```
Patient pays = copay amount
```

### Allowance + Overage
```
Patient pays = copay + (retail - allowance) × (1 - discount)

Example: "$25 copay; 20% off balance over $120 allowance"
- Retail: $350
- Copay: $25
- Allowance: $120
- Overage: $350 - $120 = $230
- Discount: 20%
- Patient pays: $25 + ($230 × 0.80) = $25 + $184 = $209
```

### Discount Off Retail
```
Patient pays = retail × (1 - discount)

Example: "20% off retail"
- Retail: $187
- Discount: 20%
- Patient pays: $187 × 0.80 = $149.60
```

---

## 4. STATIC RULES (Always Apply)

1. **Poly Free Under 19**: If patient age < 19, polycarbonate = $0
2. **Tier 5 Fallback**: If tier_5 not on auth, use tier_4 pricing
3. **UV Surcharge**: Crizal Sapphire, Rock, EZ Pro, SunShield → add $15
4. **Cash Only**: Some products have no insurance pricing → full retail

---

## 5. THE ALGORITHM

```javascript
function calculatePatientCost(productName, retailPrice, benefits, patientAge) {
  // Step 1: Find the tier
  const tier = PRODUCT_TO_TIER[productName.toLowerCase()]

  // Step 2: Get the benefit for that tier
  const benefit = benefits[`progressive_premium_${tier}`] || benefits.progressive_standard

  // Step 3: Parse the benefit string
  const parsed = parseBenefitString(benefit)

  // Step 4: Calculate
  if (parsed.type === 'flat_copay') {
    return parsed.copay
  } else if (parsed.type === 'discount') {
    return retailPrice * (1 - parsed.discount)
  } else if (parsed.type === 'copay_plus_overage') {
    const overage = Math.max(0, retailPrice - parsed.allowance)
    return parsed.copay + (overage * (1 - parsed.discount))
  }

  // Step 5: Apply static rules
  // ... UV surcharge, age rules, etc.
}
```

---

## 6. PRODUCT LOOKUP TABLE

The key missing piece - map product names to tiers:

```typescript
export const PROGRESSIVE_TIERS: Record<string, string> = {
  // Tier 5
  'varilux x design': 'tier_5',
  'varilux x 4d': 'tier_5',
  'varilux x fit': 'tier_5',
  'varilux xr design': 'tier_5',
  'varilux physio w3+': 'tier_5',
  'hoya id mystyle 3': 'tier_5',
  'shamir autograph intelligence': 'tier_5',
  'zeiss smartlife superb': 'tier_5',

  // Tier 4
  'varilux comfort max': 'tier_4',
  'varilux comfort enhanced': 'tier_4',
  'varilux physio drx': 'tier_4',
  'hoya id lifestyle 2': 'tier_4',
  'kodak unique': 'tier_4',
  'shamir autograph iii': 'tier_4',

  // Tier 3
  'varilux comfort 2': 'tier_3',
  'varilux comfort drx': 'tier_3',
  'hoya amplitude hd3': 'tier_3',
  'nikon presio i': 'tier_3',

  // Tier 2
  'ideal advanced': 'tier_2',
  'kodak precise': 'tier_2',
  'shamir firstpal': 'tier_2',

  // Tier 1
  'adaptar': 'tier_1',
  'ideal': 'tier_1',
  'natural': 'tier_1',
  'hoya select 13': 'tier_1'
}

export const AR_TIERS: Record<string, string> = {
  // Tier 3
  'crizal sapphire 360': 'tier_3',
  'crizal sapphire hr': 'tier_3',
  'crizal rock': 'tier_3',
  'crizal prevencia': 'tier_3',
  'hoya recharge': 'tier_3',
  'zeiss duravision platinum': 'tier_3',

  // Tier 2
  'crizal easy': 'tier_2',
  'crizal prevencia kids': 'tier_2',
  'zeiss duravision blueprotect': 'tier_2',

  // Tier 1
  'crizal kids uv': 'tier_1',
  'hoya premium coating': 'tier_1',

  // Standard
  'standard ar': 'standard'
}
```

---

## Summary

The whole system is:

1. **FORMULARY** (static): Product → Tier mapping
2. **AUTHORIZATION** (dynamic): Tier → Benefit string
3. **PARSER**: Benefit string → calculation components
4. **CALCULATOR**: Components + Retail → Patient cost
5. **RULES**: Age, UV surcharge, fallbacks

That's the elemental version.
