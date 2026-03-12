# Standalone Price List System

## Overview

This is a **completely disconnected from the database** price list generation system that creates clean, carrier-specific pricing for EyeMed, VSP, Spectera, and Cash/Retail.

## Files

### 1. `product-catalog.ts`
Single source of truth for all lens products.

**Contains:**
- All lens types (Single Vision, Progressive, etc.)
- Lens materials (Polycarbonate, High Index, etc.)
- AR coatings (Crizal, Neurolens)
- Photochromics (Transitions)
- Add-ons (Tint, Polarized, etc.)
- Mount fees (Full Rim, Rimless, etc.)

**Structure:**
Each product has:
- `id`, `name`, `category`
- `wholesale`, `retail` prices
- `vspTier`, `eyemedTier`, `specteraTier` (carrier mappings)
- `cashOnly` flag
- Special attributes like `freeUnder18`, `backsideUV`, etc.

**Usage:**
```typescript
import { PRODUCT_CATALOG, getProductsByCarrier } from './product-catalog';

// Get all EyeMed-eligible products
const eyemedProducts = getProductsByCarrier('EYEMED');

// Find a specific product
import { getProductById } from './product-catalog';
const poly = getProductById('poly');
```

### 2. `standalone-pricelist.ts`
Generates complete price lists for each carrier.

**Main Functions:**

#### `generateEyeMedPriceList(auth)`
Creates EyeMed price list with copays based on authorization.

```typescript
const auth: EyeMedAuth = {
  examCopay: 0,
  svCopay: 0,
  progressiveTierCopays: {
    tier2: 35,
    tier3: 50,
    tier4: 75,
    // tier5 omitted = will use tier4 (fallback rule)
  },
  arTierCopays: {
    tier2: 20,
    tier3: 35,
  },
  frameAllowance: 150,
  frameOverageDiscount: 20,
  backsideUVSurcharge: 15,
  photochromicFreeUnder19: true,
  polyFreeUnder18: true,
};

const priceList = generateEyeMedPriceList(auth);
// Returns: {
//   carrier: 'EYEMED',
//   items: [
//     {
//       productId: 'sv',
//       productName: 'Single Vision',
//       category: 'lens_type',
//       retail: 80.0,
//       wholesale: 26.67,
//       tier: 'Standard',
//       copay: 0,
//       rulesApplied: ['EyeMed copay: $0'],
//       notes: ''
//     },
//     ...
//   ],
//   generatedAt: Date
// }
```

#### `generateVSPPriceList()`
Placeholder for VSP (more complex code matrix structure).

#### `generateSpecteraPriceList(auth)`
Similar to EyeMed (tier-based).

#### `generateCashPriceList()`
Shows full retail prices (reference for all patients).

#### `generateAllPriceLists(auth)`
Generates all 4 carrier lists at once.

```typescript
const allLists = generateAllPriceLists(auth);
// Returns: {
//   EYEMED: {...},
//   VSP: {...},
//   SPECTERA: {...},
//   CASH: {...}
// }
```

### 3. `example-usage.ts`
Examples and test cases showing how to use the system.

**Run examples:**
```bash
npx tsx src/lib/pricing/example-usage.ts
```

## How It Works

### Data Flow

```
product-catalog.ts
    ↓
    (all products with tier mappings)
    ↓
standalone-pricelist.ts
    ↓
    (filter by carrier + apply pricing rules)
    ↓
PriceListResult (4 carriers)
```

### Example: Angela Clayton's EyeMed List

1. **Input Auth Data:**
   - Exam: $0 copay
   - Single Vision: $0 copay
   - Progressive Tier 3: $50 copay
   - Tier 5: Not available (falls back to Tier 4)
   - Frame Allowance: $150 with 20% overage discount

2. **Generated List:**
   - Single Vision: $0 copay (covered)
   - Varilux Comfort DRx (Tier 3): $50 copay
   - Varilux X (Tier 5): Falls back to Tier 4 copay
   - Polycarbonate: $0 copay (covered benefit)
   - Crizal Rock (AR Tier 3): $20 copay + $15 backside UV surcharge
   - Frame (<$150): $0 copay (within allowance)
   - Frame ($250): $80 copay (150 allowed, 20% off $100 overage = $80)

## Key Features

### ✓ Tier 5 Fallback Rule
If Tier 5 not in auth, uses Tier 4 copay.

```typescript
if (product.eyemedTier === "Tier 5" && !auth.progressiveTierCopays?.tier5) {
  item.rulesApplied?.push("Tier 5 fallback: use Tier 4 copay");
}
```

### ✓ Backside UV Surcharge
EyeMed requires +$15 for premium AR coatings.

```typescript
if (product.backsideUV && product.category === "ar_coating") {
  const uvSurcharge = auth.backsideUVSurcharge || 15;
  item.rulesApplied?.push(`+$${uvSurcharge} backside UV surcharge`);
}
```

### ✓ Age-Based Free Benefits
- Polycarbonate free under 18
- Photochromics free under 19

### ✓ Audit Trail
Each item includes `rulesApplied[]` showing why that copay was calculated.

### ✓ Cash-Only Products
- Neurolens (SV & Progressive)
- Neurolens AR coatings
- Shows on CASH list only, not on insurance lists

## Integration Plan

### Phase 1 (Current): Standalone Validation
- ✓ Product catalog defined
- ✓ Price list generator working
- ✓ Can generate and inspect prices

### Phase 2: Test with Real Data
- Connect to Angela Clayton's PDF extraction
- Compare generated prices with manual audit
- Validate tier fallback, UV surcharge, age rules

### Phase 3: UI Display
- Create tabs for each carrier (EyeMed | VSP | Spectera | Cash)
- Show items grouped by category
- Display copay, retail, savings

### Phase 4: Database Integration
- Create new `CarrierPriceList` table
- Migrate from `PatientPriceList` (which mixed all carriers)
- Save generated lists to DB for quick lookup

## Testing

Run the example file to verify structure:

```bash
npx tsx src/lib/pricing/example-usage.ts
```

Expected output shows:
- Catalog structure (products + tiers)
- EyeMed price list with copays
- All 4 carrier lists summary
- Patient cost calculations

## Next Steps

1. **Validate with real data:**
   - Use Angela Clayton's auth from PDF
   - Check if CR-39 shows as $0 copay (single vision base)
   - Check if Varilux shows with correct tier

2. **Implement VSP code matrix:**
   - VSP doesn't use tiers - uses product codes (K, J, F, N, O)
   - Material surcharges vary by lens type
   - Requires different calculation logic

3. **Add to API:**
   - Endpoint to generate price list for customer
   - Return all 4 carriers
   - Display in UI tabs

4. **Connect to database:**
   - Save generated lists for performance
   - Allow manual overrides if needed
