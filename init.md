# Vision POS System — Plan Branch 1

You are the agent responsible for building **Layer 2: Pricing & Benefits Engine** in a 4-app architecture. Stay focused on pricing logic and avoid coupling to the POS UI.

## Architectural context (4 layers)
1. POS / Frontline Application: UI + CRUD only (customer, insurance, order workflow, encounters, sales tools).
2. Pricing & Benefits Engine: Separate service/module. Accepts structured requests (customer, plan, cart). Returns full insurance + patient responsibility breakdown. No hardcoded plan logic in the POS UI.
3. Data Bank / Rules Library: Central store of plan rules, product/tier classifications, practice overrides/bundles. Starts as JSON/YAML; later database-backed.
4. Analytics & KPI Layer: Logs all quotes/transactions for BI (revenue per plan/product/staff, capture/upgrade rates, margin/profitability).

## Data flow
1. POS constructs a quote/order request.
2. Request goes to the Pricing Engine.
3. Engine queries the Data Bank.
4. Engine returns a detailed line-item financial breakdown.
5. POS presents results and logs to Analytics.

## Your immediate mandate (this session)
- Own Layer 2. Keep it modular and API-driven.
- Accept structured inputs: `customer`, `plan`, `cart`.
- Produce outputs: line-item insurance coverage + patient responsibility breakdown.
- Keep plan logic out of the POS UI; the UI should just call the engine.

## Near-term next steps (parking lot)
- Define core entities and relationships.
- Define the Estimate API contract.
- Draft initial data schemas for rules and products.
