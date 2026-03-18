# VisionPOS

**AI-powered Point of Sale for Optical Practices**

VisionPOS helps optical practices price eyeglasses, contact lenses, and exams with 100% insurance benefit fidelity. Sales associates scan insurance documents, and the system automatically extracts benefits and calculates patient-specific prices.

## Key Features

- **Insurance Document Scanning** - Upload VSP, EyeMed, or Spectera authorization documents. GPT-4o extracts all benefit details.
- **Patient-Specific Pricing** - Every product shows the exact patient copay based on their insurance plan.
- **Quote Builder** - Build quotes for exams, glasses, and contacts with real-time pricing.
- **Materials Benefit Handling** - Automatically detects when patient is using both glasses and contacts benefits (mutually exclusive).
- **Order Tracking** - Full order lifecycle from quote to delivery.

## Supported Insurance Carriers

| Carrier | Progressive Tiers | AR Coating Tiers |
|---------|------------------|------------------|
| VSP | K, J, F, O, N | QM, QT, QV, QW |
| EyeMed | tier_1 - tier_5 | tier_1 - tier_3 |
| Spectera | I - V | tier_1 - tier_4 |

## Quick Start

```bash
cd vision-pos

# Install dependencies
npm install

# Set up database
npm run db:migrate
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL (Supabase) via Prisma
- **AI:** OpenAI GPT-4o for document parsing
- **UI:** React 19, Tailwind CSS, Radix UI

## Documentation

- [`vision-pos/CLAUDE.md`](vision-pos/CLAUDE.md) - AI assistant guide
- [`vision-pos/DEPLOYMENT.md`](vision-pos/DEPLOYMENT.md) - Deployment to Vercel
- [`vision-pos/docs/ARCHITECTURE.md`](vision-pos/docs/ARCHITECTURE.md) - Full architecture & current status

## Project Structure

```
vision-pos/
├── src/app/           # Next.js pages & API routes
├── src/components/    # React components
├── src/lib/services/  # Business logic
├── prisma/            # Database schema
└── docs/              # Documentation
```

## Repository

- **Branch:** `feature/order-tracking-system`
- **Origin:** `Endeaver-vision/vision-benefits-pos`
