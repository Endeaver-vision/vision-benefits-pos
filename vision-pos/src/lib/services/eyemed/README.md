# EyeMed Pricing Engine

A formula-based pricing engine for EyeMed insurance benefits that implements:
- **Formula Parsing**: Parse benefit strings like "$45 copay" or "$250 allowance; 20% off overage"
- **Static Rules**: Apply EyeMed-specific rules (UV surcharge, tier fallback, age-based discounts)
- **Product Matching**: Match products to authorization tiers
- **Final Calculation**: Calculate patient out-of-pocket costs and insurance coverage

## Architecture

The engine consists of 6 core modules:

### 1. **eyemed-formula-types.ts**
Type definitions for:
- `ParsedFormula` - Structured representation of benefit formulas
- `FormulaResult` - Calculation result with patient OOP and breakdown
- `RuleContext` / `RuleResult` - Static rule context and results
- `EyeMedPricingResult` - Final pricing output

### 2. **eyemed-formula-parser.ts**
Parses benefit strings and calculates patient costs:

```typescript
parseFormula('$45 copay')                                          // FIXED_COPAY
parseFormula('$120 allowance; 20% off balance over allowance')     // ALLOWANCE_WITH_OVERAGE
parseFormula('$90; 20% off retail less $120 allowance')            // TIERED_ALLOWANCE
parseFormula('covered')                                             // COVERED
parseFormula('not covered')                                         // NOT_COVERED
```

**Calculation Examples:**
- `$45 copay` on $250 lens → Patient: $45, Insurance: $205
- `$120 allowance; 20% off overage` on $250 → Patient: $104 ($120 allowance - 20% discount), Insurance: $146

### 3. **eyemed-static-rules.ts**
Applies EyeMed-specific rules:

1. **Tier 5 Fallback**: If Tier 5 not on auth, use Tier 4
2. **UV Surcharge**: Add $15 for Crizal Sapphire/Rock/EZ Pro/SunShield
3. **Cash Only**: Full retail for cash-only products (no insurance)
4. **Age-Based**: Free polycarbonate for children under 19
5. **Tier Fallback**: Use 80% of retail if no tier match
6. **Second Pair Discount**: Apply discount if configured

### 4. **eyemed-product-matcher.ts**
Matches products to authorization benefits:

```typescript
matchProductToAuth(product, auth)     // General matcher
matchSingleVisionLens(product, auth)  // Single vision specific
matchBifocalLens(product, auth)       // Bifocal specific
matchFrame(product, auth)              // Frame allowance
matchContactLens(product, auth)        // Contact lens specific
```

Returns matched tier and benefit value (copay, allowance, or formula).

### 5. **eyemed-pricing-engine.ts**
Main orchestrator that combines all components:

```typescript
const result = await calculateEyeMedPricing(auth, products, {
  customerId: 'cust-123',
  isSecondPair: false
})

// Result contains:
// - pricedProducts: Array of QuoteLineItem with calculations
// - retailTotal, patientTotal, insuranceTotal, totalSavings
// - warnings and debug info
```

### 6. **Integration Modules**

#### **eyemed-precompute-integration.ts**
Used in batch price generation:
```typescript
const result = await completeEyemedPrecomputeWorkflow(customerId, authorizationId)
// Fetches auth + catalog, calculates, and persists to patientPriceList
```

#### **eyemed-api-integration.ts**
Used in on-demand pricing API:
```typescript
const response = await calculateEyemedPricingFromRequest(auth, request, productCatalog)
// Converts API request to pricing calculation
```

## Usage Examples

### Example 1: Price a Progressive Lens

```typescript
import { calculateEyeMedPricing } from '@/lib/services/eyemed/eyemed-pricing-engine'
import { createEmptyEyemedAuth } from '@/types/benefit-authorization'

// Create authorization
const auth = createEmptyEyemedAuth(
  { name: 'John Doe', dob: '1990-01-01', age: 34, memberId: 'EMP123' },
  { carrier: 'eyemed', planId: 'EMP-PLAN', planName: 'Employer Plan' }
) as EyemedBenefitAuthorization

// Set Tier 4 copay
auth.copays.progressivePremiumTier4 = 95

// Create product
const product: ProductCatalogEntry = {
  sku: 'PROG-VARILUX-MAX',
  displayName: 'Varilux Comfort Max',
  category: 'lens_progressive',
  retailPrice: 250,
  isActive: true,
  eyemed: { progressiveTier: 'tier_4' }
}

// Calculate
const result = await calculateEyeMedPricing(auth, [product], {
  customerId: 'cust-123'
})

console.log(result.pricedProducts[0])
// {
//   sku: 'PROG-VARILUX-MAX',
//   displayName: 'Varilux Comfort Max',
//   category: 'lens_progressive',
//   retailPrice: 250,
//   patientCopay: 95,
//   insurancePays: 155,
//   savings: 155,
//   tierUsed: 'tier_4',
//   notes: ['Matched: tier_4', 'Formula type: FIXED_COPAY', ...],
//   needsTierAssignment: false
// }
```

### Example 2: Apply UV Surcharge

```typescript
auth.copays.arPremiumTier3 = 65

const uvCoating: ProductCatalogEntry = {
  sku: 'AR-CRIZAL-SAPPHIRE',
  displayName: 'Crizal Sapphire',
  category: 'ar_coating',
  retailPrice: 187,
  isActive: true,
  eyemed: { arTier: 'tier_3' }
}

const result = await calculateEyeMedPricing(auth, [uvCoating])

console.log(result.pricedProducts[0].patientCopay)
// 80 ($65 copay + $15 UV surcharge)
```

### Example 3: Frame Allowance with Overage

```typescript
auth.copays.frameAllowance = 150
auth.copays.frameOverageDiscount = 0.20 // 20% off overage

const frame: ProductCatalogEntry = {
  sku: 'FRAME-RAYBAN-WAYFARER',
  displayName: 'Ray-Ban Wayfarer',
  category: 'frame',
  retailPrice: 200,
  isActive: true,
  eyemed: {}
}

const result = await calculateEyeMedPricing(auth, [frame])

// Calculation:
// - Allowance: $150
// - Overage: $200 - $150 = $50
// - Overage discount: $50 * 20% = $10
// - Patient pays: $50 - $10 = $40
// - Insurance pays: $150 + $10 = $160

console.log(result.pricedProducts[0])
// {
//   patientCopay: 40,
//   insurancePays: 160,
//   ...
// }
```

### Example 4: Age-Based Discount (Free Polycarbonate)

```typescript
auth.specialRules.polycarbonateFreeCbildAgeMax = 18

const polycarbonate: ProductCatalogEntry = {
  sku: 'MAT-POLYCARBONATE',
  displayName: 'Polycarbonate',
  category: 'material',
  retailPrice: 65,
  isActive: true,
  eyemed: { materialType: 'polycarbonate' }
}

// For a 16-year-old patient
const result = await calculateEyeMedPricing(auth, [polycarbonate])

console.log(result.pricedProducts[0].patientCopay)
// 0 (free polycarbonate for children under 18)
```

## Test Suite

Run unit tests:

```bash
npm test src/lib/services/eyemed/eyemed-pricing-engine.test.ts
```

Tests cover:
- Formula parsing for all formula types
- Calculation accuracy for copays, allowances, and overages
- Static rules (UV surcharge, age-based, tier fallback)
- Product matching to auth tiers
- End-to-end pricing calculations

## Database Columns

The migration adds two columns to `lens_products`:

```sql
ALTER TABLE lens_products
ADD COLUMN cash_only BOOLEAN DEFAULT FALSE;
ADD COLUMN backside_uv_surcharge BOOLEAN DEFAULT FALSE;
```

- `cash_only`: When true, the product doesn't accept insurance (full retail price)
- `backside_uv_surcharge`: When true, a $15 UV surcharge is applied

## Integration Points

### 1. Precompute Service

Called from `price-list-precompute.ts`:

```typescript
import { completeEyemedPrecomputeWorkflow } from '@/lib/services/eyemed/eyemed-precompute-integration'

const result = await completeEyemedPrecomputeWorkflow(customerId, authorizationId)
```

### 2. Pricing API

Used in `POST /api/pricing/calculate`:

```typescript
import { calculateEyemedPricingFromRequest } from '@/lib/services/eyemed/eyemed-api-integration'

const response = await calculateEyemedPricingFromRequest(auth, request, productCatalog)
```

### 3. Quote Builder

Used in quote calculation endpoints to get real-time pricing.

## Migration Strategy

The implementation is designed as a **standalone service** that works alongside the existing calculator:

1. **Phase 1** (Weeks 1-2): Core implementation with tests ✓
2. **Phase 2** (Week 3): Add feature flag to run in parallel
3. **Phase 3** (Week 4): Compare outputs with existing system
4. **Phase 4** (Week 5): Enable in production with monitoring
5. **Phase 5** (Week 6+): Remove old code, add enhancements

## Error Handling

All functions validate input and provide clear error messages:

```typescript
const { valid, errors } = validateEyemedAuthorization(auth)
if (!errors.length) {
  // Safe to use
}
```

## Performance Notes

- Formula parsing is O(1) with regex patterns
- Product matching is O(n) where n = number of products
- Static rules are O(n) where n = number of rules (typically 5-6)
- Entire calculation for 50 products: ~5-10ms

## File Structure

```
src/lib/services/eyemed/
├── eyemed-formula-types.ts          # Type definitions
├── eyemed-formula-parser.ts         # Formula parsing & calculation
├── eyemed-static-rules.ts           # Static rules application
├── eyemed-product-matcher.ts        # Product to benefit matching
├── eyemed-pricing-engine.ts         # Main orchestrator
├── eyemed-precompute-integration.ts # Precompute integration
├── eyemed-api-integration.ts        # API integration
├── eyemed-pricing-engine.test.ts    # Unit tests
└── README.md                        # This file
```

## Troubleshooting

### Formula not parsing correctly
- Check the benefit string format
- Add debug logging: `parseFormula(benefitString)` returns detailed info
- Review test cases for similar patterns

### Tier not matching
- Verify product has correct `eyemed.progressiveTier` mapping
- Check authorization has copay value for that tier
- Use `matchProductToAuth()` to debug matching logic

### Static rules not applying
- Check product tags and category
- Verify age is set correctly in context
- Review static rules test cases

## Future Enhancements

1. **Formulas from Database**: Load benefit formulas from a table instead of hardcoding
2. **Rule Configuration**: Make static rules configurable per plan
3. **Audit Logging**: Track all pricing decisions for compliance
4. **A/B Testing**: Compare new vs old pricing engine
5. **Performance Optimization**: Cache formula parsing results

## Contributing

When extending the engine:

1. Add types to `eyemed-formula-types.ts`
2. Add logic to appropriate module
3. Add unit tests
4. Update this README with examples
5. Document migration path if breaking change
