# EyeMed Pricing Reference

## Files

### 1. **eyemed-master-pricing.ts** - THE ONE FILE
Everything merged together:
- Insurance terminology (what the auth PDF says)
- Product names (what we sell)
- Retail prices (what we charge)
- Special flags (UV surcharge, cash only, age rules)

### 2. **benefit-parser.ts** - Pricing Formula Parser
Translates insurance pricing language into math:
- "$25 copay; 20% off balance over $120" → `{copay: 25, discount: 0.20, allowance: 120}`

### 3. **static-rules.ts** - Business Rules
- UV surcharge ($15 for Crizal products)
- Free poly under 19
- Tier fallback logic

---

## The Flow

```
AUTH PDF says: "Progressive - Premium Tier 4: $25 copay; 20% off over $120"
                                    ↓
1. eyemed-master-pricing.ts → "Progressive - Premium Tier 4" maps to:
                              - Varilux X ($615)
                              - Varilux Comfort Max ($409)
                                    ↓
2. benefit-parser.ts → parses "$25 copay; 20% off over $120"
                       → {copay: 25, discount: 0.20, allowance: 120}
                                    ↓
3. Calculate: $25 + ($615 - $120) × 0.80 = $421
                                    ↓
4. static-rules.ts → no UV surcharge for progressives
                                    ↓
PATIENT PAYS: $421 for Varilux X
```

---

## Quick Reference

| Insurance Term | Our Products |
|---------------|--------------|
| Progressive - Premium Tier 4 | Varilux X ($615), Varilux Comfort Max ($409) |
| Progressive - Premium Tier 3 | Varilux Comfort DRx ($280) |
| Anti Reflective - Premium Tier 3 | Crizal Sapphire ($187+$15), Crizal Rock ($158+$15) |
| Anti Reflective - Premium Tier 2 | Crizal EZ Pro ($148+$15), Crizal SunShield ($180+$15) |
| Polycarbonate - Standard | Polycarbonate ($65, free under 19) |
| Photochromic - Non-Glass | Transitions Gen S ($160), XtraActive ($160) |
