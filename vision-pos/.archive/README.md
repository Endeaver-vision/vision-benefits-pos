# Archive Directory

This directory contains old, duplicate, and obsolete files that are no longer actively used but kept for reference. Nothing here should be deleted without careful review.

## Structure

### `/old-planning-docs`
Outdated planning and documentation files from earlier development phases:
- `AGENTS.md` - Old AI agent specifications
- `AUDIT_SYSTEM_PLAN.md` - Initial audit system planning
- `EYEMED_PATTERN_EXTRACTION_INTEGRATION.md` - Pattern extraction design docs
- `EYEMED_TERMINOLOGY_MAPPING.md` - Old terminology research
- `INTEGRATION_COMPLETE.md` - Completed integration notes
- `QUICK_START_PATTERN_EXTRACTION.md` - Old quick start guide

**Status:** These documents may contain valuable historical context, but have been superseded by current CLAUDE.md and active development plans.

### `/debug-scripts`
One-off debugging and testing scripts used during development:
- `check-angela*.ts` - Angela Clayton patient debugging
- `check-auths.ts` - Authorization debugging
- `regenerate-angela*.ts` - Price regeneration tests
- `reprocess-doris.ts`, `reset-doris.ts` - Doris patient debugging
- `extract-*.ts` - PDF extraction research scripts
- `inspect-*.ts` - PDF inspection scripts
- `test-*.ts` - Ad-hoc testing scripts
- `batch-demo-test.*` - Demo/batch processing tests

**Status:** These are development utilities. Keep for reference, but not actively used.

### `/old-reports`
Historical data exports and reports:
- `price-list-export*.json` - Old price list snapshots (v1, v2, v3)
- `verification-report-*.json` - Old verification reports
- `verification-results-*.csv` - Old test results
- `patient-price-lists-eyemed.csv` - Old patient price export
- `/planning-csvs` - Old planning directory with price list CSVs

**Status:** Old data snapshots. Keep for comparison, but not current.

### `/build-artifacts`
Build outputs and test runner artifacts:
- `playwright-report/` - Old Playwright test results
- `test-results/` - Old test output
- `screenshots/` - Old test screenshots
- `playwright-test-output.log` - Old test logs

**Status:** Generated files from test runs. Can be safely deleted if disk space is needed.

## When to Clean

Safe to delete:
- `/build-artifacts` - These are regenerated on every test run
- Old report JSON/CSV files - Use current data instead

Keep for reference:
- `/debug-scripts` - May contain useful patterns or debugging techniques
- `/old-planning-docs` - May contain valuable design decisions or context

## Current Active Files

Main documentation:
- `CLAUDE.md` - Current operating procedures
- Active planning documents (in user's local Claude.ai plans)

Current implementation:
- `/src` - Active source code
- `/e2e` - Active end-to-end tests
- `.env.local`, `.env.production` - Current environment configs
- Active scripts in `/scripts`
