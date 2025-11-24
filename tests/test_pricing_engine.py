import json
import unittest
from pathlib import Path

from pricing_engine import quote_order


ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "samples"


def load_sample(name: str):
    return json.loads((SAMPLES / name).read_text())


class PricingEngineTests(unittest.TestCase):
    def test_vsp_sample_totals(self):
        req = load_sample("request_vsp.json")
        result = quote_order(req)
        self.assertAlmostEqual(result["patient_pays"], 330.0)
        self.assertGreaterEqual(len(result["line_items"]), 3)

    def test_spectera_sample_totals(self):
        req = load_sample("request_spectera.json")
        result = quote_order(req)
        # Progressive (280) + AR (95) + exam (20) + frame overage (49) = 444
        self.assertAlmostEqual(result["patient_pays"], 444.0)
        self.assertGreaterEqual(len(result["line_items"]), 3)
        lens_line = next(li for li in result["line_items"] if li["category"] == "lenses")
        self.assertIn("itemized_costs", lens_line)

    def test_eyemed_sample_totals(self):
        req = load_sample("request_eyemed.json")
        result = quote_order(req)
        self.assertAlmostEqual(result["patient_pays"], 158.0)
        self.assertGreaterEqual(len(result["line_items"]), 3)

    def test_contacts_and_addons(self):
        req = load_sample("request_contacts_addons.json")
        result = quote_order(req)
        # 2 boxes * $60 + addon $30 = $150
        self.assertAlmostEqual(result["patient_pays"], 150.0)
        # extras should show up as line items
        categories = {item["category"] for item in result["line_items"]}
        self.assertIn("contacts", categories)
        self.assertIn("addon", categories)

    def test_invalid_provider(self):
        bad_req = {"plan": {"provider": "unknown"}, "cart": [{"type": "exam"}]}
        with self.assertRaises(ValueError):
            quote_order(bad_req)


if __name__ == "__main__":
    unittest.main()
