# Vision POS - Claude Code Instructions

## OPERATING RULES

1. Execute ONE command at a time
2. After completing a command, STOP and report what was done
3. Do NOT chain actions or anticipate next steps
4. Do NOT clear, delete, or modify data beyond what was explicitly requested
5. When in doubt, ASK before doing

## Validation Tools

After processing insurance documents or making API changes, **always validate the UI display**. The only validation that matters is what users see in the browser.

### 1. UI Display Validation (Primary - Use This)
```bash
npx playwright test e2e/validate-insurance-display.spec.ts --headed
```
- Loads actual browser pages and checks rendered DOM
- Validates that insurance values display correctly (not "Not covered")
- This is the ONLY validation that catches display bugs

### 2. API Response Validation
```bash
npx tsx scripts/validate-ui-display.ts
```
- Checks what APIs return vs what's in database
- Faster than Playwright but doesn't catch UI rendering issues

### 3. PDF Extraction Validation
```bash
npx tsx scripts/run-vsp-validation.ts
```
- Validates PDF → Database extraction accuracy
- Does NOT validate UI display

## Critical Lessons Learned

1. **Three-layer validation is required**: PDF → DB → API → UI. Checking only PDF→DB misses API bugs.

2. **VSP CL Exam Copay = Contact Lens Fitting**: These are the same thing with different names. The `clExamCopay` database column is what displays as "CL Fit" in the UI.

3. **After API code changes**: Must restart Next.js server for changes to take effect.

4. **Prisma Decimal fields**: Always wrap in `Number()` when returning from APIs.

## Key Files

- `/src/app/api/customers/[id]/authorization/route.ts` - Returns insurance benefits for UI
- `/src/app/api/customers/[id]/insurance-summary/route.ts` - Returns summary banner data
- `/e2e/validate-insurance-display.spec.ts` - Playwright UI validation tests
- `/scripts/validate-ui-display.ts` - API validation script

## When to Run Validations

- After processing insurance documents → Run UI validation
- After changing API routes → Restart server, then run UI validation
- After extraction code changes → Run all three validations
- Before telling user "X customers processed successfully" → Run UI validation first

## Database Quick Checks

```bash
# List active VSP authorizations
npx tsx -e "
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
prisma.insuranceAuthorization.findMany({
  where: { carrier: 'VSP', isActive: true },
  include: { customer: { select: { firstName: true, lastName: true } } }
}).then(a => console.log(a.map(x => x.customer.firstName + ' ' + x.customer.lastName)))
"
```
