# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VisionPOS is an AI-powered point-of-sale system for optical practices. It handles vision insurance verification (VSP, EyeMed, Spectera), quote building for eyewear/contact lenses, customer management, and real-time pricing calculations with insurance benefits.

**Key User Context:** The primary users are sales associates with minimal optical experience. The system must be reliable - bugs directly impact sales staff during customer transactions.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint

# Database
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database (tsx prisma/seed.ts)
npm run db:studio    # Open Prisma Studio GUI

# Testing (Playwright)
npx playwright test                    # Run all tests
npx playwright test tests/e2e/pos.spec.ts  # Run single test file
npx playwright test --ui               # Interactive test runner
```

## Architecture

### Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **UI Components:** Radix UI primitives with custom shadcn/ui-style components
- **State:** Zustand for global state, React Query for server state
- **Database:** PostgreSQL via Prisma ORM (Supabase hosted)
- **Auth:** NextAuth.js with credentials provider
- **AI:** OpenAI GPT-4o for insurance document parsing

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # REST API endpoints
│   │   ├── customers/     # Customer CRUD, search, authorization
│   │   ├── pricing/       # Insurance pricing calculations
│   │   ├── pos/           # POS product endpoints
│   │   ├── quote-builder/ # Quote management
│   │   └── insurance/     # Insurance document processing
│   ├── quote-builder/     # Main quote building UI
│   ├── pos/               # Point of sale interface
│   ├── customers/         # Customer management pages
│   ├── scanner/           # Insurance card scanner
│   └── dashboard/         # Analytics dashboard
├── components/
│   ├── ui/                # Reusable UI components (button, card, input, etc.)
│   ├── customers/         # Customer-specific components
│   └── quote-builder/     # Quote builder components
├── lib/
│   ├── prisma.ts          # Prisma client singleton
│   ├── auth.ts            # NextAuth configuration
│   └── services/          # Business logic services
├── providers/             # React context providers
├── services/              # Service layer (customer search, etc.)
├── store/                 # Zustand stores
├── types/                 # TypeScript type definitions
└── hooks/                 # Custom React hooks
```

### Database Schema (Prisma)
Key models in `prisma/schema.prisma`:
- **Customer** - Patient records with insurance info, visit history, analytics fields
- **InsuranceDocument** - Scanned insurance cards with OCR/GPT extraction
- **VspAuthorization / EyemedAuthorization / SpecteraAuthorization** - Carrier-specific benefit data
- **LensProduct / Frame / ContactLens / ServicePrice** - Product catalog with carrier tier mappings
- **LensCarrierTier** - Maps products to insurance tier codes (VSP: K/J/F/O/N, EyeMed: tier_1-5, Spectera: I-V)
- **Transaction** - Completed sales

### Insurance Pricing Engine
The system calculates patient copays based on:
1. **Carrier** (VSP, EyeMed, Spectera)
2. **Plan type** and benefit allowances
3. **Product tier** assignments from formulary tables
4. Patient-specific authorization data

Insurance schemas are documented in `docs/insurance-schemas/`.

### API Patterns
- API routes use Next.js Route Handlers in `src/app/api/`
- Customer search: `/api/customers?search=query` - uses case-insensitive `contains` matching
- Authorization: `/api/customers/[id]/authorization` - fetches patient's insurance benefits

## Testing
Playwright tests exist in `tests/`:
- `tests/e2e/` - End-to-end tests (auth, quote-builder, pos, insurance-flow)
- `tests/api/` - API integration tests
- `tests/visual/` - Visual regression tests

Run tests before deployment. The test suite covers critical paths like customer search and quote building.

## Important Patterns

### Theme System
Dark mode first with light mode toggle. Theme controlled via CSS class on `<html>` element. See `src/components/ui/theme-toggle.tsx` for self-contained theme toggle (doesn't require provider context).

### Customer Search
Uses case-insensitive search across firstName, lastName, email, phone, insuranceCarrier, memberId. Search is in `/api/customers/route.ts`.

### Insurance Document Processing
1. Upload image to `/api/documents/upload`
2. OCR extraction extracts raw text
3. GPT-4o parses structured benefit data
4. Data stored in carrier-specific authorization tables

## Environment Variables
Required in `.env.local`:
- `POSTGRES_PRISMA_URL` - Pooled Postgres connection
- `POSTGRES_URL_NON_POOLING` - Direct Postgres connection
- `NEXTAUTH_SECRET` - NextAuth encryption key
- `OPENAI_API_KEY` - For insurance document parsing
