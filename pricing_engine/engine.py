"""
Pricing & Benefits Engine (Layer 2)

Adapts a structured request (customer, plan, cart, practice_context) into the
provider-specific rules engines housed in `rules_lib/` and returns a patient/insurance
breakdown. This is intentionally decoupled from any POS UI.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

from rules_lib import VspRules, SpecteraRules, EyemedRules


ProviderMap = {
    "vsp": VspRules,
    "spectera": SpecteraRules,
    "eyemed": EyemedRules,
}


class PricingEngine:
    def __init__(self, databank_path: str = "databank") -> None:
        # databank_path reserved for future use (e.g., alternate datasets)
        self.databank_path = databank_path

    def quote(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Compute pricing for a structured request.

        Expected request keys:
        - customer: dict with at least age (for child material rules) and id/member metadata.
        - plan: dict with provider (vsp|spectera|eyemed), product_tier, copays, special_rules.
        - cart: list of line items (exam|frame|lenses|contacts|addon/service).
        - practice_context: optional dict with practice_id (for VSP overrides/bundles).
        """
        self._validate_request(request)
        warnings: List[str] = []

        plan = request.get("plan", {})
        provider_key = (plan.get("provider") or "").lower()
        if provider_key not in ProviderMap:
            raise ValueError(f"Unsupported provider: {provider_key}")

        customer = request.get("customer", {})
        cart = request.get("cart", [])
        practice_context = request.get("practice_context", {})

        benefit_auth = self._build_benefit_auth(customer, plan)
        order, extras, cart_warnings = self._build_order(cart)
        warnings.extend(cart_warnings)

        # Instantiate provider-specific engine
        rule_cls = ProviderMap[provider_key]
        practice_id = practice_context.get("practice_id")
        if provider_key == "vsp" and practice_id:
            engine = rule_cls(benefit_auth, practice_id=practice_id)
        else:
            engine = rule_cls(benefit_auth)

        calc = engine.calculate_total_cost(order)
        extra_line_items, extras_total, extra_warnings = self._calculate_extras(extras)
        warnings.extend(extra_warnings)

        response = {
            "provider": provider_key,
            "patient_pays": calc.get("total_patient_cost", 0) + extras_total,
            "line_items": self._format_line_items(calc.get("itemized_costs", [])) + extra_line_items,
            "applied_rules": self._applied_rules(plan, practice_context),
            "warnings": warnings,
            "raw": {
                "benefit_auth": benefit_auth,
                "order": order,
            },
        }
        return response

    @staticmethod
    def _validate_request(request: Dict[str, Any]) -> None:
        if not isinstance(request, dict):
            raise ValueError("Request must be a JSON object/dict")
        plan = request.get("plan")
        if not isinstance(plan, dict):
            raise ValueError("Missing plan")
        provider = (plan.get("provider") or "").lower()
        if provider not in ProviderMap:
            raise ValueError(f"Unsupported provider: {provider}")
        cart = request.get("cart")
        if not isinstance(cart, list) or not cart:
            raise ValueError("Cart must be a non-empty list")
        for item in cart:
            if not isinstance(item, dict) or "type" not in item:
                raise ValueError("Each cart item must be an object with a 'type'")

    @staticmethod
    def _build_benefit_auth(customer: Dict[str, Any], plan: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "patient": {
                "id": customer.get("id"),
                "name": customer.get("name"),
                "age": customer.get("age"),
                "member_id": customer.get("member_id"),
            },
            "plan": {
                "pricing_tier": plan.get("product_tier"),
                "network_status": plan.get("network_status"),
            },
            "copays": plan.get("copays", {}),
            "special_rules": plan.get("special_rules", {}),
        }

    @staticmethod
    def _build_order(cart: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], List[Dict[str, Any]], List[str]]:
        order: Dict[str, Any] = {}
        extras: List[Dict[str, Any]] = []
        warnings: List[str] = []

        # Track whether we already captured each core type to avoid collisions
        seen = {"exam": False, "frame": False, "lenses": False}

        for item in cart:
            item_type = item.get("type")
            if item_type == "exam" and not seen["exam"]:
                order["exam"] = {"code": item.get("code"), "description": item.get("description")}
                seen["exam"] = True
            elif item_type == "frame" and not seen["frame"]:
                order["frame"] = {
                    "brand": item.get("brand"),
                    "retail_price": item.get("retail_price", 0.0),
                }
                seen["frame"] = True
            elif item_type == "lenses" and not seen["lenses"]:
                lenses: Dict[str, Any] = {}
                # pass through known fields
                for key in ["vision_type", "progressive_product", "ar_coating_product", "material", "prescription"]:
                    if key in item:
                        lenses[key] = item[key]
                # convert enhancements array to keyed flags expected by rules
                for enh in item.get("enhancements", []) or []:
                    lenses[enh] = True
                order["lenses"] = lenses
                seen["lenses"] = True
            elif item_type in {"contacts", "addon", "add-on", "service"}:
                extras.append(item)
            else:
                warnings.append(f"Unsupported or duplicate item ignored: {item}")
        return order, extras, warnings

    @staticmethod
    def _calculate_extras(extras: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], float, List[str]]:
        line_items: List[Dict[str, Any]] = []
        total = 0.0
        warnings: List[str] = []

        for idx, item in enumerate(extras):
            item_type = item.get("type")
            if item_type == "contacts":
                brand = item.get("brand", "Contacts")
                boxes = item.get("boxes", 0)
                box_price = item.get("box_price", 0.0)
                patient_pays = float(box_price) * float(boxes)
                total += patient_pays
                line_items.append(
                    {
                        "id": f"extra_contacts_{idx}",
                        "category": "contacts",
                        "description": f"{brand} ({boxes} boxes @ ${box_price:.2f})",
                        "patient_pays": round(patient_pays, 2),
                    }
                )
                if boxes == 0 or box_price == 0:
                    warnings.append("Contacts item missing box_price or boxes; treated as $0")
            elif item_type in {"addon", "add-on", "service"}:
                desc = item.get("description") or item.get("code") or "Addon"
                retail = float(item.get("retail_price", 0.0))
                total += retail
                line_items.append(
                    {
                        "id": f"extra_addon_{idx}",
                        "category": "addon",
                        "description": desc,
                        "patient_pays": round(retail, 2),
                    }
                )
                if retail == 0:
                    warnings.append(f"Addon '{desc}' has no retail_price; treated as $0")
            else:
                warnings.append(f"Unsupported extra item ignored: {item}")

        return line_items, round(total, 2), warnings

    @staticmethod
    def _format_line_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        formatted = []
        for idx, it in enumerate(items):
            formatted.append(
                {
                    "id": f"li_{idx}",
                    "category": it.get("category"),
                    "description": it.get("description"),
                    "patient_pays": it.get("patient_pays", 0),
                    # passthrough extras if present
                    **{k: v for k, v in it.items() if k not in {"category", "description", "patient_pays"}},
                }
            )
        return formatted

    @staticmethod
    def _applied_rules(plan: Dict[str, Any], practice_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        entries: List[Dict[str, Any]] = []
        if plan.get("provider"):
            entries.append({"type": "plan", "provider": plan.get("provider"), "tier": plan.get("product_tier")})
        if practice_context.get("practice_id"):
            entries.append({"type": "practice", "practice_id": practice_context.get("practice_id")})
        return entries


def quote_order(request: Dict[str, Any]) -> Dict[str, Any]:
    """Functional wrapper for convenience."""
    return PricingEngine().quote(request)
