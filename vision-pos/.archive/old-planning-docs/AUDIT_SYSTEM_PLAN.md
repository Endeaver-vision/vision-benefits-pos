# Price List Auditing System - Implementation Plan

**Epic ID**: `vision-pos-6jl`
**Status**: Planning
**Last Updated**: 2026-03-05

## Overview

Building a comprehensive price list auditing system that validates generated price lists for:
- **Accuracy**: Copay/allowance calculations match carrier formulas
- **Completeness**: All products have price entries
- **Consistency**: Same benefits applied uniformly

### Key Principles
- ✓ Automatic triggers after document processing
- ✓ Rule-based validation against carrier formulas
- ✓ Auto-regenerate on failures (up to 3 attempts)
- ✓ Dashboard with pass/fail summary
- ✓ Comprehensive audit trail for compliance

---

## Phased Implementation with Checkpoints

### Phase 1: Database Models & Migrations ⏳ (vision-pos-6jl.1)
**Status**: NOT STARTED
**Estimate**: 240 minutes
**Depends On**: Nothing

#### Deliverables:
- [ ] Add `PriceListAudit` model (tracks audit runs)
- [ ] Add `AuditResult` model (individual validation results)
- [ ] Add `AuditRule` model (audit rule definitions)
- [ ] Add `PriceListRegenerationLog` model (regeneration attempts)
- [ ] Create Prisma migration for all new models
- [ ] Add indexes for common queries (customer_id, authorization_id, status)
- [ ] Add enums: `AuditStatus`, `AuditResultStatus`, `AuditRuleCategory`

#### Files to Modify:
- `prisma/schema.prisma` - Add models & enums
- `prisma/migrations/` - New migration

#### Checkpoint: ✅ Run `npx prisma migrate deploy` successfully

---

### Phase 2: Audit Rules Engine (vision-pos-6jl.2)
**Status**: NOT STARTED
**Estimate**: 360 minutes
**Depends On**: Phase 1 ✓

#### Deliverables:
- [ ] `src/lib/services/audit/audit-rules.ts` - Define all audit rules
- [ ] `src/lib/services/audit/audit-validator.ts` - Execute rules
- [ ] `src/lib/services/audit/vsp-rule-validators.ts` - VSP carrier validators
- [ ] `src/lib/services/audit/eyemed-rule-validators.ts` - EyeMed carrier validators
- [ ] `src/lib/services/audit/spectera-rule-validators.ts` - Spectera carrier validators

#### Audit Rules to Implement:

**ACCURACY (5 rules)**
1. ✓ Frame copay formula matches (for each carrier)
2. ✓ Allowance amounts applied correctly
3. ✓ Frame overage discounts calculated properly
4. ✓ Contact lens declining balance logic correct
5. ✓ Exam copay matches authorization

**COMPLETENESS (5 rules)**
1. ✓ All frames (active & showInPos=true) have price entries
2. ✓ All lens products (active & showInPos=true) have price entries
3. ✓ All services (active & showInPos=true) have price entries
4. ✓ No null final_price for any entry
5. ✓ Savings calculated for all items

**CONSISTENCY (3 rules)**
1. ✓ Same carrier+plan+tier = same pricing rules applied
2. ✓ Tier assignments consistent across product categories
3. ✓ Benefit usage flags match authorization

#### Checkpoint: ✅ All 13 rules have passing unit tests

---

### Phase 3: Audit Service & Execution (vision-pos-6jl.3)
**Status**: NOT STARTED
**Estimate**: 300 minutes
**Depends On**: Phase 2 ✓

#### Deliverables:
- [ ] `src/lib/services/audit-service.ts` - Main service
- [ ] `runAudit(priceListId)` - Execute full audit
- [ ] `runRule(rule, priceList)` - Execute single rule
- [ ] Result aggregation & scoring
- [ ] Error handling & logging

#### Key Functions:

```typescript
// Main entry point
async runAudit(
  customerId: string,
  authorizationId: string
): Promise<AuditRun>

// Rule executor
async runRule(
  rule: AuditRule,
  priceList: PatientPriceList[],
  authorization: InsuranceAuthorization
): Promise<AuditResult[]>

// Calculate pass/fail
calculateAuditScore(results: AuditResult[]): {
  passed: number
  failed: number
  warnings: number
  passRate: number
}
```

#### Checkpoint: ✅ Can run full audit on test customer, get JSON results

---

### Phase 4: Auto-Regeneration Logic (vision-pos-6jl.4)
**Status**: NOT STARTED
**Estimate**: 240 minutes
**Depends On**: Phase 3 ✓

#### Deliverables:
- [ ] `src/lib/services/auto-regeneration-service.ts`
- [ ] Retry logic (max 3 attempts)
- [ ] Integration with existing price list generator
- [ ] Audit ticket creation on final failure
- [ ] Retry state tracking in database

#### Flow:
```
Audit Fails
  ↓
Log Regeneration Attempt #1
  ↓
Call existing price list generation
  ↓
Re-run Audit
  ↓
If Still Failing & Attempts < 3
  └─ Log Attempt #2
If Attempts == 3 & Still Failing
  └─ Create Audit Ticket for manual review
```

#### Checkpoint: ✅ Can trigger regeneration and re-audit from CLI

---

### Phase 5: Audit Dashboard & API Routes (vision-pos-6jl.5)
**Status**: NOT STARTED
**Estimate**: 300 minutes
**Depends On**: Phase 3 ✓

#### API Routes:
- [ ] `POST /api/audits/trigger` - Manual trigger
- [ ] `GET /api/audits/history/:customerId` - Audit history
- [ ] `GET /api/audits/:auditId/results` - Detailed results
- [ ] `POST /api/audits/:auditId/regenerate` - Force regeneration
- [ ] `GET /api/audits/dashboard` - Dashboard data (summary + recent audits)

#### Dashboard Components:
- [ ] `AuditDashboard.tsx` - Main dashboard
- [ ] `AuditResultsTable.tsx` - Detailed findings
- [ ] `AuditSummaryCard.tsx` - Pass/fail overview
- [ ] `AuditStatusBadge.tsx` - Status indicator
- [ ] `AuditIssuesList.tsx` - Issue list with details

#### Dashboard Features:
- Summary metrics (total audits, pass rate, blocking issues)
- Recent audits with status
- Detailed findings per audit
- Manual regeneration trigger
- Export functionality (CSV/PDF)
- Filter by status, carrier, date range

#### Checkpoint: ✅ Dashboard loads and displays test audit data

---

### Phase 6: Integration with Document Processing (vision-pos-6jl.6)
**Status**: NOT STARTED
**Estimate**: 180 minutes
**Depends On**: Phase 3 ✓, Phase 5 ✓

#### Integration Points:

1. **After Document Extraction** (`src/app/api/documents/[id]/process/route.ts`)
   ```typescript
   // After price list is generated
   await triggerAudit(customerId, authorizationId)
   ```

2. **After Price List Generation** (existing price list service)
   ```typescript
   // Emit event that audit system can listen to
   emitter.emit('pricelist:generated', { customerId, authorizationId })
   ```

3. **In Document Upload Flow** (`src/app/api/documents/upload/route.ts`)
   - Track audit ID in response
   - Show audit status to user

#### Checkpoint: ✅ Audit triggered automatically after document processing

---

### Phase 7: Testing & Validation (vision-pos-6jl.7)
**Status**: NOT STARTED
**Estimate**: 240 minutes
**Depends On**: Phase 5 ✓, Phase 6 ✓

#### Testing:
- [ ] Unit tests for each audit rule (13 tests)
- [ ] Integration tests for audit service
- [ ] End-to-end test: document upload → audit → dashboard
- [ ] Test regeneration retry logic
- [ ] Test with different carriers (VSP, EyeMed, Spectera)
- [ ] Test edge cases (null values, missing products, etc.)

#### Validation Approaches:
1. Manual: Upload test documents, verify audit results
2. Automated: Run test suite
3. Dashboard: Verify UI displays results correctly

#### Checkpoint: ✅ All tests pass, 100% critical path coverage

---

## Dependency Graph

```
Phase 1: DB Models
    ↓
Phase 2: Audit Rules Engine
    ↓
Phase 3: Audit Service
    ├─→ Phase 4: Auto-Regeneration
    │
    ├─→ Phase 5: Dashboard & API
    │       ↓
    │   Phase 6: Integration with Docs
    │       ↓
    │   Phase 7: Testing
    │
    └─→ Phase 6 & 7 (can start after Phase 5)
```

## Context Windows & Beads

Using **Beads** to track progress across context windows:
- Each phase has its own Beads task ID (vision-pos-6jl.1 through 6jl.7)
- Dependencies tracked: Phase X blocks Phase X+1
- Checkpoints defined: Must complete before next phase
- Progress persisted in dolt database (survives context resets)

## Success Criteria

✅ **Phase 1**: Schema deployed, Prisma client runs without error
✅ **Phase 2**: 13 audit rules defined, all have passing unit tests
✅ **Phase 3**: Can run audit on test customer and get JSON results
✅ **Phase 4**: Auto-regeneration works with retry logic
✅ **Phase 5**: Dashboard loads and displays test data
✅ **Phase 6**: Audit triggers automatically after document processing
✅ **Phase 7**: All tests pass with >90% coverage

---

## Next Step

→ **Start Phase 1: Database Models & Migrations**

Run: `bd open vision-pos-6jl.1` to start working on Phase 1
