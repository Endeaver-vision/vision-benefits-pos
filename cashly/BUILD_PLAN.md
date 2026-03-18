# Build Plan

## Summary
Goal: turn bank statements into financial reports (P&L, Balance Sheet, Cash Flow) for small business owners.
Timeline: 12 weeks from plan finalization.

## MVP Scope
- Upload PDF/CSV/XLS/XLSX statements
- Auto-generate P&L, Balance Sheet, Cash Flow
- Date ranges: monthly/quarterly/yearly + rolling 3/6/12
- Save and recall reports
- Export PDF/CSV
- Basic reconciliation (balance match + variance flags)
- Multi-business accounts per user

## Tech Stack (Proposed)
- Frontend: Next.js (React, TypeScript)
- Backend: Node.js + TypeScript (Fastify or Express)
- DB: Postgres (Prisma ORM)
- Storage: S3-compatible for files and parsed artifacts
- Queue: Redis + BullMQ for parsing/report jobs
- Bank sync: Plaid
- Auth: NextAuth or Clerk
- Hosting: Vercel (FE) + Render/Fly (BE) + managed Postgres

## Core Components
- Ingestion: file upload, email import, bank sync
- Normalization: parsing, dedupe, merchant normalization
- Classification: chart of accounts, rules engine, overrides
- Reporting: P&L, Balance Sheet, Cash Flow, period logic
- Reconciliation: balances vs statement totals
- Export: PDF/CSV/QuickBooks/Xero (MVP: PDF/CSV)
- Audit trail: data lineage and changes

## Phases and Milestones

### Phase 1: Foundations (Weeks 1-3)
- Data model + migrations
- Auth + multi-business scaffolding
- Storage buckets + upload pipeline
- Parsing queue + basic normalization

### Phase 2: Core Engine (Weeks 4-7)
- Transaction normalization + dedupe
- Chart of accounts + rules engine
- Report engine (P&L/BS/CF)
- Period logic (date ranges + rolling windows)

### Phase 3: Product UX (Weeks 8-10)
- Upload -> report flow
- Report views + filters
- Export + scheduled delivery (MVP: manual export)
- Bank sync (Plaid) + reconcile UX

### Phase 4: Hardening + Launch (Weeks 11-12)
- Accuracy QA + reconciliation checks
- Error handling + monitoring
- Beta rollout + polish

## Parallel Workstreams
- Parsing/Normalization vs Frontend UI (Weeks 1-4)
- Reporting engine vs Bank sync integration (Weeks 4-7)
- Export tooling vs Report UI (Weeks 7-9)
- Reconciliation UX vs Scheduled delivery (Weeks 8-10)
- QA/monitoring vs onboarding content (Weeks 10-12)

## Key Risks
- Parsing accuracy on messy PDFs
- Chart of accounts mapping quality
- Bank sync edge cases (partial data, duplicates)

## Success Criteria
- >= 95% parsing success on supported formats
- Report outputs reconcile with statement totals
- End-to-end flow from upload to reports in < 2 minutes
