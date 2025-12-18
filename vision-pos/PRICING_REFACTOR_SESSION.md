# Pricing Refactor Session - Continue From Here

## What We're Doing
Simplifying the pricing data flow. The goal is: **Scan → Store → Read**. That's it.

## Current Problem
The pricing system is over-engineered:
- Scanned data goes to `vsp_authorizations` + `vsp_lens_enhancement_copays`
- A "Generate Price Plan" button pre-calculates prices into `customer_price_lists` (cache)
- The UI reads from the cache, not the source
- Hardcoded defaults were masking missing data

## What's Done
1. ✅ Deactivated test products (TEST-FRAME-001, TEST-LENS-001)
2. ✅ Removed ALL hardcoded default copays from:
   - `src/lib/services/vsp-authorization-service.ts`
   - `src/lib/services/eyemed-authorization-service.ts`
   - `src/lib/services/spectera-authorization-service.ts`
   - `src/app/api/customers/[id]/benefits/route.ts`
   - `src/app/api/customers/[id]/authorization/route.ts`
   - `src/app/api/documents/[id]/verify/route.ts`
   - `src/app/api/authorizations/intake/route.ts`

Now missing data shows as `null` instead of fake defaults.

## What's Next
3. Remove `customer_price_lists` caching layer
4. Remove "Generate Price Plan" button (`src/app/api/customers/[id]/price-plan/route.ts`)
5. Simplify POS to read directly from authorization tables

## Key Files for Remaining Work
- `src/app/api/customers/[id]/price-plan/route.ts` - generates the cache, DELETE this logic
- `src/components/customers/customer-price-plan.tsx` - reads from cache, REWRITE to read from auth
- `src/components/customers/customer-insurance-pricing.tsx` - uses CustomerPricePlan component

## Database Tables
- **Keep**: `vsp_authorizations`, `vsp_lens_enhancement_copays`, `eyemed_authorizations`, `spectera_authorizations`
- **Remove/Deprecate**: `customer_price_lists` (the cache layer)

## The Simple Flow We Want
1. Scan document → GPT extracts copays → save to authorization tables
2. POS clicks product → look up product's tier code → query authorization for that tier's copay → display price
3. No caching layer. No "generate price plan" step. No defaults.

## Also Added
Supabase MCP at `.mcp.json` - should be available after restart for direct database access.
