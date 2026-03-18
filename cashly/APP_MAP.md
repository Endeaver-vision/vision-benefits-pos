# Application Map

This file contains two visual maps:
- Structural architecture (how parts fit together)
- Build map (phases and parallel workstreams)

## Structural Map (Architecture)

```mermaid
flowchart TB
  subgraph User
    U[Web App (Desktop/Mobile)]
  end

  subgraph Frontend
    FE[Next.js UI]
  end

  subgraph Backend
    API[API Server]
    Q[Job Queue]
  end

  subgraph Data
    DB[(Postgres)]
    FS[(Object Storage)]
  end

  subgraph Integrations
    Plaid[Plaid Bank Sync]
    Email[Email Import/Export]
  end

  U --> FE --> API
  API --> DB
  API --> FS
  API --> Q
  Q --> DB
  Q --> FS
  API --> Plaid
  API --> Email

  subgraph Core Services
    Ingest[Ingestion + Parsing]
    Normalize[Normalization + Dedupe]
    Classify[Rules + COA]
    Reports[Report Engine]
    Reconcile[Reconciliation]
    Export[Export/Delivery]
  end

  API --> Ingest --> Normalize --> Classify --> Reports --> Reconcile --> Export
  Ingest --> DB
  Normalize --> DB
  Classify --> DB
  Reports --> DB
  Reconcile --> DB
  Export --> FS
```

## Build Map (Phases + Parallel Streams)

```mermaid
flowchart LR
  subgraph Phase1[Phase 1: Foundations (Weeks 1-3)]
    P1A[Data model + migrations]
    P1B[Auth + multi-business]
    P1C[Storage + upload pipeline]
    P1D[Parsing queue + basic normalization]
  end

  subgraph Phase2[Phase 2: Core Engine (Weeks 4-7)]
    P2A[Normalization + dedupe]
    P2B[COA + rules engine]
    P2C[Report engine (P&L/BS/CF)]
    P2D[Period logic]
  end

  subgraph Phase3[Phase 3: Product UX (Weeks 8-10)]
    P3A[Upload -> report flow]
    P3B[Report views + filters]
    P3C[Export + scheduled delivery]
    P3D[Plaid sync + reconcile UX]
  end

  subgraph Phase4[Phase 4: Hardening (Weeks 11-12)]
    P4A[Accuracy QA]
    P4B[Monitoring + error handling]
    P4C[Beta + polish]
  end

  P1A --> P2A --> P3A --> P4A
  P1B --> P2B --> P3B --> P4B
  P1C --> P2C --> P3C --> P4C
  P1D --> P2D --> P3D --> P4C
```
