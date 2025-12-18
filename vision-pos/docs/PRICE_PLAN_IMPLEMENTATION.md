# Price Plan System - Implementation Plan

## Executive Summary

The price plan system needs to become the **single source of truth** for all patient-specific pricing. Currently, the POS uses the price list correctly, but the Quote Builder bypasses it entirely, calculating prices on-the-fly. This creates inconsistency and makes it impossible to guarantee that scanned authorization prices match what staff sees.

### Goals
1. **Single source of truth** - All pricing flows through `customer_price_lists`
2. **Multi-carrier support** - Patients can have VSP + EyeMed (dual coverage)
3. **Complete coverage** - All VSP codes mapped, all categories priced
4. **Auto-generation** - Price list created automatically on document verification
5. **Visibility everywhere** - Price plan viewable from customer profile AND quote builder

---

## Phase 1: Schema Changes for Multi-Carrier Support

### 1.1 Modify customer_price_lists Unique Constraint

**Current:** `(customerId, productId)` - Only ONE price per product per customer
**New:** `(customerId, productId, insuranceCarrier)` - One price per product per carrier

```prisma
// prisma/schema.prisma
model CustomerPriceList {
  id                  String    @id @default(cuid())
  customerId          String
  productId           String
  authorizationId     String?   // NEW: Link to specific authorization
  authorizationType   String?   // NEW: 'vsp', 'eyemed', 'spectera'
  finalPrice          Float?
  retailPrice         Float
  savings             Float     @default(0)
  insuranceCarrier    String?
  planName            String?
  tier                String?
  validFrom           DateTime?
  validUntil          DateTime?
  customPrice         Float?
  priceOverrideReason String?
  priceOverrideBy     String?
  priceOverrideDate   DateTime?
  active              Boolean   @default(true)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  customer            Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)

  // CHANGED: Include carrier in unique constraint
  @@unique([customerId, productId, insuranceCarrier])
  @@index([customerId])
  @@index([productId])
  @@index([authorizationId])
  @@map("customer_price_lists")
}
```

### 1.2 Migration Script

```sql
-- migrations/YYYYMMDD_add_multi_carrier_support.sql

-- Step 1: Add new columns
ALTER TABLE customer_price_lists
  ADD COLUMN IF NOT EXISTS "authorizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "authorizationType" TEXT;

-- Step 2: Drop old unique constraint
ALTER TABLE customer_price_lists
  DROP CONSTRAINT IF EXISTS "customer_price_lists_customerId_productId_key";

-- Step 3: Add new unique constraint with carrier
ALTER TABLE customer_price_lists
  ADD CONSTRAINT "customer_price_lists_customer_product_carrier_key"
  UNIQUE ("customerId", "productId", "insuranceCarrier");

-- Step 4: Add index on authorizationId
CREATE INDEX IF NOT EXISTS "customer_price_lists_authorizationId_idx"
  ON customer_price_lists ("authorizationId");
```

---

## Phase 2: Complete VSP Code Coverage

### 2.1 Missing Codes to Add

The test authorization is missing these codes that products reference:

| Code | Description | Category | Products Using |
|------|-------------|----------|----------------|
| QV | Premium AR Tier 3 | AR_COATINGS | Crizal Sapphire, Prevencia, Rock |
| NA | Ultra-Premium Progressive | PROGRESSIVE_LENSES | Varilux X Design, XR, Autograph III |
| OA | Super-Premium Progressive | PROGRESSIVE_LENSES | Varilux Physio, Autograph II |
| CA | Computer/Office Progressive | PROGRESSIVE_LENSES | Shamir Office |
| AB | Trivex | LENS_MATERIALS | Trivex |
| AH | Hi-Index 1.60 | LENS_MATERIALS | Hi-Index 1.60 |
| AJ | Hi-Index 1.67 | LENS_MATERIALS | Hi-Index 1.67 |
| AK | Hi-Index 1.74 | LENS_MATERIALS | Hi-Index 1.74 |
| PS | Photochromic Glass | PHOTOCHROMIC | Glass Transitions |
| DA | Polarized | SINGLE_VISION_LENSES | Polarized lenses |

### 2.2 Update price-mapping-service.ts

**File:** `/src/lib/services/price-mapping-service.ts`

Add handlers for missing categories:

```typescript
// === CONTACT LENS FITTING ===
else if (categoryCode === 'CONTACT_FITTING') {
  if (insuranceCarrier === 'VSP') {
    // VSP contact fitting - check contactFittingCovered flag
    if (vspAuth?.contactFittingCovered) {
      customerPrice = 0
      tier = 'covered'
    } else if (vspAuth?.contactLensExamCopay !== null) {
      // Use CL exam copay as fitting copay (common pattern)
      customerPrice = vspAuth.contactLensExamCopay
      tier = 'cl-fitting'
    }
  } else if (insuranceCarrier === 'EYEMED') {
    // Parse clFitStandardCopay or clFitPremiumCopay
    const fitCopay = product.tierEyemed === 'premium'
      ? eyemedAuth?.clFitPremiumCopay
      : eyemedAuth?.clFitStandardCopay
    if (fitCopay) {
      customerPrice = parseFloat(fitCopay.replace(/[^0-9.]/g, '')) || null
      tier = product.tierEyemed || 'standard'
    }
  }
}

// === CONTACT LENS EXAM ===
else if (categoryCode === 'EXAMS' && product.tierVsp === 'CONTACT_EXAM') {
  if (insuranceCarrier === 'VSP' && vspAuth?.contactLensExamCopay !== null) {
    customerPrice = vspAuth.contactLensExamCopay
    tier = 'contact-exam'
  }
}

// === LINED MULTIFOCAL ===
else if (categoryCode === 'LINED_MULTIFOCAL') {
  if (product.tierVsp === 'standard' || product.tierVsp === 'covered' || product.tierVsp === 'COVERED') {
    customerPrice = 0 // Covered with materials copay
    tier = 'covered'
  } else if (product.tierVsp === 'AA' && insuranceCarrier === 'VSP') {
    // AA is standard lined bifocal/trifocal - covered
    customerPrice = 0
    tier = 'covered'
  }
}

// === CR-39 (Standard Plastic) ===
// In LENS_MATERIALS handler, add:
if (product.tierVsp === 'standard') {
  // Standard plastic is covered with materials copay
  customerPrice = 0
  tier = 'covered'
}
```

---

## Phase 3: Quote Builder Integration

### 3.1 Modify Quote Builder Products API

**File:** `/src/app/api/quote-builder/products/route.ts`

Add `customerId` parameter and merge with price list:

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')
  const carrier = searchParams.get('carrier') // Optional: filter by specific carrier

  // ... existing product fetching code ...

  // If customer provided, load their price list
  let priceMap = new Map<string, CustomerPriceEntry>()

  if (customerId) {
    const priceList = await prisma.customerPriceList.findMany({
      where: {
        customerId,
        active: true,
        ...(carrier ? { insuranceCarrier: carrier.toUpperCase() } : {})
      }
    })

    for (const price of priceList) {
      priceMap.set(price.productId, {
        customerPrice: price.customPrice ?? price.finalPrice,
        tier: price.tier,
        needsPricing: price.finalPrice === null && price.customPrice === null,
        hasCustomPrice: price.customPrice !== null,
        carrier: price.insuranceCarrier
      })
    }
  }

  // Merge prices into products
  for (const groupKey of Object.keys(grouped)) {
    grouped[groupKey] = grouped[groupKey].map(product => {
      const priceEntry = priceMap.get(product.id)
      return {
        ...product,
        customerPrice: priceEntry?.customerPrice ?? null,
        insuranceTier: priceEntry?.tier ?? null,
        needsPricing: priceEntry?.needsPricing ?? false,
        hasCustomPrice: priceEntry?.hasCustomPrice ?? false,
        priceSource: priceEntry ? 'price-list' : 'retail'
      }
    })
  }

  return NextResponse.json({
    success: true,
    ...grouped,
    priceListLoaded: priceMap.size > 0,
    productsNeedingPricing: [...priceMap.values()].filter(p => p.needsPricing).length
  })
}
```

### 3.2 Update Eyeglasses Layer to Use Price List

**File:** `/src/components/quote-builder/layers/eyeglasses-layer-simple.tsx`

```typescript
// In fetchProducts function:
const fetchProducts = async () => {
  const url = customerId
    ? `/api/quote-builder/products?customerId=${customerId}`
    : '/api/quote-builder/products'

  const response = await fetch(url)
  // ... rest of fetch logic
}

// In product display, show customer price if available:
const getDisplayPrice = (product: Product) => {
  if (product.customerPrice !== null) {
    return {
      price: product.customerPrice,
      isInsurancePrice: true,
      tier: product.insuranceTier
    }
  }
  return {
    price: product.price, // retail
    isInsurancePrice: false,
    tier: null
  }
}
```

### 3.3 Create Price Plan Hook

**New file:** `/src/hooks/useCustomerPrices.ts`

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'

interface PriceEntry {
  productId: string
  customerPrice: number | null
  retailPrice: number
  tier: string | null
  carrier: string | null
  needsPricing: boolean
  hasCustomPrice: boolean
}

interface UsePricesResult {
  prices: Map<string, PriceEntry>
  isLoading: boolean
  error: string | null
  hasPriceList: boolean
  productsNeedingPricing: number
  refresh: () => Promise<void>
}

export function useCustomerPrices(
  customerId: string | null,
  carrier?: string | null
): UsePricesResult {
  const [prices, setPrices] = useState<Map<string, PriceEntry>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPrices = useCallback(async () => {
    if (!customerId) {
      setPrices(new Map())
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ customerId })
      if (carrier) params.set('carrier', carrier)

      const response = await fetch(`/api/customers/${customerId}/price-plan?${params}`)
      const data = await response.json()

      if (data.success && data.products) {
        const priceMap = new Map<string, PriceEntry>()
        for (const product of data.products) {
          priceMap.set(product.id, {
            productId: product.id,
            customerPrice: product.customerPrice,
            retailPrice: product.retailPrice,
            tier: product.insuranceTier,
            carrier: product.insuranceCarrier,
            needsPricing: product.customerPrice === null,
            hasCustomPrice: product.customPrice !== null
          })
        }
        setPrices(priceMap)
      }
    } catch (err) {
      setError('Failed to load price list')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [customerId, carrier])

  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  const needsPricing = [...prices.values()].filter(p => p.needsPricing).length

  return {
    prices,
    isLoading,
    error,
    hasPriceList: prices.size > 0,
    productsNeedingPricing: needsPricing,
    refresh: fetchPrices
  }
}
```

---

## Phase 4: Price Plan Visibility in Quote UI

### 4.1 Add Insurance Details Panel to Quote Sidebar

**File:** `/src/components/quote-builder/pricing-sidebar.tsx`

Add collapsible section showing:
- Active carrier and plan name
- Key copays (exam, materials, frame allowance)
- Number of products with pricing vs needing manual entry
- Link to full price plan in customer profile

```typescript
// Add to PricingSidebar component:
<Collapsible>
  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg">
    <div className="flex items-center gap-2">
      <Shield className="h-4 w-4 text-blue-500" />
      <span className="font-medium">Insurance Benefits</span>
    </div>
    <ChevronDown className="h-4 w-4" />
  </CollapsibleTrigger>
  <CollapsibleContent className="p-3 space-y-2">
    <div className="text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Carrier:</span>
        <span className="font-medium">{authorization?.carrier}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Exam Copay:</span>
        <span>${authorization?.examCopay}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Frame Allowance:</span>
        <span>${authorization?.frameAllowance}</span>
      </div>
    </div>
    {productsNeedingPricing > 0 && (
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {productsNeedingPricing} products need manual pricing
        </AlertDescription>
      </Alert>
    )}
    <Button variant="outline" size="sm" asChild>
      <Link href={`/customers/${customerId}?tab=insurance`}>
        View Full Price Plan
      </Link>
    </Button>
  </CollapsibleContent>
</Collapsible>
```

### 4.2 Add Carrier Selector for Dual Coverage

When customer has multiple authorizations (VSP + EyeMed), show a selector:

```typescript
// In quote header or sidebar:
{customerCarriers.length > 1 && (
  <Select value={activeCarrier} onValueChange={setActiveCarrier}>
    <SelectTrigger>
      <SelectValue placeholder="Select plan" />
    </SelectTrigger>
    <SelectContent>
      {customerCarriers.map(carrier => (
        <SelectItem key={carrier.id} value={carrier.carrier}>
          {carrier.carrier} - {carrier.planName}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

---

## Phase 5: Customer Profile Enhancements

### 5.1 Improve Insurance & Pricing Tab

**File:** `/src/components/customers/customer-insurance-pricing.tsx`

- Add tabs for each carrier if multiple exist
- Show price plan coverage percentage
- Highlight products needing manual pricing
- Add bulk price entry modal for unmapped products

### 5.2 Add Price Plan Detail View

**New file:** `/src/components/customers/price-plan-detail.tsx`

Full-page view showing:
- All products grouped by category
- Customer price vs retail price
- Tier code for each product
- Manual override capability
- Export to PDF option

---

## Phase 6: Auto-Generation Improvements

### 6.1 Ensure Verify Route Handles All Cases

**File:** `/src/app/api/documents/[id]/verify/route.ts`

The verify route already calls `generatePriceMapping()` - verify it handles:
- [ ] Multiple documents for same customer (don't overwrite)
- [ ] Different carriers (create separate price lists)
- [ ] Partial authorizations (don't delete existing prices)

### 6.2 Add Price Plan Regeneration API

**New file:** `/src/app/api/customers/[id]/price-plan/regenerate/route.ts`

```typescript
// POST /api/customers/[id]/price-plan/regenerate
// Force regenerate price plan from current authorization
// Optional: carrier parameter to regenerate only one carrier
```

---

## Implementation Order

### Week 1: Schema & Service Layer
1. [ ] Create migration for multi-carrier support
2. [ ] Update `price-mapping-service.ts` with missing category handlers
3. [ ] Add missing VSP codes (QV, NA, OA, CA, AB, AH, AJ, AK)
4. [ ] Test price generation with complete code set

### Week 2: Quote Builder Integration
5. [ ] Modify `/api/quote-builder/products` to accept customerId
6. [ ] Create `useCustomerPrices` hook
7. [ ] Update eyeglasses layer to show customer prices
8. [ ] Add price source indicator (insurance vs retail)

### Week 3: UI Enhancements
9. [ ] Add insurance details panel to quote sidebar
10. [ ] Add carrier selector for dual coverage
11. [ ] Improve customer profile Insurance & Pricing tab
12. [ ] Add bulk price entry for unmapped products

### Week 4: Testing & Polish
13. [ ] End-to-end testing: scan → verify → price plan → quote
14. [ ] Test dual coverage scenarios
15. [ ] Test manual price overrides
16. [ ] Performance testing with large price lists

---

## Files to Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add authorizationId, authorizationType; change unique constraint |
| `src/lib/services/price-mapping-service.ts` | Add CONTACT_FITTING, CONTACT_EXAM, LINED_MULTIFOCAL handlers |
| `src/app/api/quote-builder/products/route.ts` | Add customerId param, merge price list |
| `src/app/api/customers/[id]/price-plan/route.ts` | Support carrier filter |
| `src/components/quote-builder/layers/eyeglasses-layer-simple.tsx` | Pass customerId, show customer prices |
| `src/components/quote-builder/pricing-sidebar.tsx` | Add insurance details panel |
| `src/components/customers/customer-insurance-pricing.tsx` | Multi-carrier tabs, coverage stats |
| `src/hooks/useCustomerPrices.ts` | New file - shared price hook |

---

## Success Criteria

1. **100% price coverage** - All products have a price (from insurance or marked as manual entry required)
2. **Consistent pricing** - Quote builder shows same prices as POS and customer profile
3. **Multi-carrier support** - Patients with VSP + EyeMed can switch between plans
4. **Auto-generation** - Price list created on document verification without manual intervention
5. **Visibility** - Staff can view and verify price plan from quote builder
6. **Audit trail** - Manual overrides tracked with reason and timestamp
