# Pricing & Benefits Engine (Layer 2)

Standalone module that accepts structured requests (customer, plan, cart) and returns a line-item breakdown of insurance coverage and patient responsibility. It adapts to the provider-specific rules in `rules_lib/` and stays decoupled from the POS UI.

## Request shape
```json
{
  "customer": {"id": "c1", "name": "John Doe", "age": 45, "member_id": "M123"},
  "plan": {
    "provider": "vsp|spectera|eyemed",
    "product_tier": "choice|signature|...",
    "network_status": "in|out",
    "copays": {"exam": 10, "frame_allowance": 150, "frame_overage_discount": 0.2},
    "special_rules": {"polycarbonate_free_child_age_max": 18}
  },
  "cart": [
    {"item_id": "exam1", "type": "exam", "code": "92014", "description": "Comprehensive Exam"},
    {"item_id": "frame1", "type": "frame", "brand": "Ray-Ban", "retail_price": 250},
    {
      "item_id": "lens1",
      "type": "lenses",
      "vision_type": "mf",
      "progressive_product": "Varilux X Fit Technology",
      "ar_coating_product": "Crizal Rock",
      "material": "Polycarbonate",
      "enhancements": ["photochromic"]
    }
  ],
  "practice_context": {"practice_id": "123"}
}
```

## Response shape
```json
{
  "provider": "vsp",
  "patient_pays": 123.45,
  "line_items": [
    {"id": "li_0", "category": "exam", "description": "Routine Eye Exam", "patient_pays": 10},
    {"id": "li_1", "category": "frame", "description": "Frame overage...", "patient_pays": 80, "allowance": 150},
    {"id": "li_2", "category": "lenses", "patient_pays": 33.5, "itemized_costs": [...]}
  ],
  "applied_rules": [
    {"type": "plan", "provider": "vsp", "tier": "choice"},
    {"type": "practice", "practice_id": "123"}
  ],
  "warnings": ["Unsupported or duplicate item ignored: ..."],
  "raw": {"benefit_auth": {..}, "order": {..}}
}
```

## Usage (Python)
```python
from pricing_engine import quote_order

request = {
    "customer": {"age": 45, "member_id": "M123"},
    "plan": {
        "provider": "vsp",
        "product_tier": "choice",
        "copays": {"exam": 10, "frame_allowance": 150, "frame_overage_discount": 0.2},
    },
    "cart": [
        {"type": "exam", "code": "92014"},
        {"type": "frame", "brand": "Ray-Ban", "retail_price": 250},
        {"type": "lenses", "vision_type": "mf", "progressive_product": "Varilux X Fit Technology", "ar_coating_product": "Crizal Rock"}
    ],
    "practice_context": {"practice_id": "123"}
}

quote = quote_order(request)
print(quote)
```

## CLI usage
- From repo root: `python -m pricing_engine.cli --request-file my_request.json --pretty`
- Or inline JSON: `python -m pricing_engine.cli --request-json '{"customer": {...}, "plan": {...}, "cart": [...]}' --pretty`

## HTTP dev server
- Start: `python -m pricing_engine.server` (listens on `0.0.0.0:8000`)
- Health check: `curl http://localhost:8000/health`
- Quote: `curl -X POST http://localhost:8000/quote -H 'Content-Type: application/json' -d @my_request.json`

## Notes
- This module reuses the existing provider rule engines in `rules_lib/`.
- Enhancements in the cart should be passed as an array; the engine sets the flags expected by provider rules.
- Currently supports one exam, one frame, one lenses entry per request; extras are ignored with a warning.
- Contacts/addons are not yet implemented; they will be ignored with a warning until rules are added.
- `practice_id` is honored for VSP to pull practice overrides/bundles when available in `databank/practice_data`.
- If a formulary JSON is malformed (e.g., `spectera_ar_coating_formulary.json` currently has a parse issue), provider lookups will simply return empty and may mark items as "Not Covered".

## Database loader (PostgreSQL in Docker)
If you want the databank in Postgres (e.g., Gemini's `vision-db` container on port 5432):
1. Install deps: `pip install -r pricing_engine/requirements.txt`
2. Set env (defaults in parentheses): `DB_HOST=127.0.0.1`, `DB_PORT=5432`, `DB_USER=postgres`, `DB_PASSWORD=mysecretpassword`, `DB_NAME=vision_automation`.
3. Run loader: `python -m pricing_engine.db_loader`
   - Creates DB if missing, applies `sql_schema.sql`, and loads all JSON formularies + practice_data.
   - Uses `ON CONFLICT DO NOTHING` for safe reruns.
