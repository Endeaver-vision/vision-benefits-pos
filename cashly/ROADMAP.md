# Cashly Roadmap

## Working vision
Ultra-lightweight personal/business finance tool that ingests bank statements
(CSV/XLS), normalizes transactions, auto-categorizes, and generates core reports.

## Assumptions (confirm/change)
- Web-first app with React frontend and API backend.
- CSV/XLS import plus PDF/OCR in MVP.
- Single user, single organization for MVP.

## MVP scope (v0.1)
- Upload CSV/XLS/PDF and parse transactions with column mapping.
- Normalize into a canonical schema (date, amount, description, account, category).
- Basic rules engine for auto-categorization (keywords, amount, account).
- Reports: monthly cash flow, category summary, income vs expense, top merchants.
- Export reports to CSV.

## Next milestones
### v0.2
- Multiple accounts, per-account balances.
- Simple reconciliation helpers (duplicates, pending vs posted).
- Manual edits and category override UI.

### v0.3
- Basic budgeting targets.
- P&L style report with time comparisons.

## Risks
- Statement formats vary widely; needs robust column mapping.
- OCR accuracy for PDFs may require tuning or paid APIs.

## Proposed structure
- `apps/web/` (React UI)
- `apps/api/` (API server)
  - `ingest/` (CSV/XLS parsing, PDF/OCR adapter)
  - `normalize/` (canonical schema)
  - `rules/` (categorization)
  - `reports/` (aggregations)
  - `storage/` (DB)
- `packages/shared/` (schemas/types)
- `data/` (local sample uploads, ignored in git)
- `tests/`
