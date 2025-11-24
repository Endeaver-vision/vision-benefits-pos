import json
import os
from typing import Dict, Any, List, Optional

try:
    import psycopg2
    import psycopg2.extras
except ModuleNotFoundError:
    psycopg2 = None  # Optional; falls back to JSON databank
from .base import RuleBase

class VspRules(RuleBase):
    """
    VSP-specific rules engine.
    """

    def __init__(self, benefit_authorization: Dict[str, Any], practice_id: str = None):
        super().__init__(benefit_authorization)
        self.conn = self._connect_db()

        self.progressive_formulary = self._load_progressive_formulary()
        self.ar_coating_formulary = self._load_ar_coating_formulary()
        self.pricing_tier = self.plan.get('pricing_tier', 'choice') # Default to choice
        self.uc_prices = self.copays.get('uc_prices', {})
        self.bundles = []

        if practice_id:
            self._load_practice_data(practice_id)

        # In a real system, this would be in a database.
        # For now, we'll store the pricing tables in memory.
        self.pricing_tables = {
            'signature': {
                'KA': {'sv': 50.00, 'mf': 50.00, 'rule': 'lower_of_copay_or_uc'},
                'JA': {'sv': 80.00, 'mf': 80.00, 'rule': 'lower_of_copay_or_uc'},
                'FA': {'sv': 90.00, 'mf': 90.00, 'rule': 'lower_of_copay_or_uc'},
                'OA': {'sv': 120.00, 'mf': 120.00, 'rule': 'lower_of_copay_or_uc'},
                'NA': {'sv': 160.00, 'mf': 160.00, 'rule': 'lower_of_copay_or_uc'},
                'AA': {'sv': 23.00, 'mf': 28.00, 'rule': 'lower_of_copay_or_uc'},
                'BA': {'sv': 40.00, 'mf': 45.00, 'rule': 'lower_of_copay_or_uc'},
                'AD': {'sv': 33.00, 'mf': 33.00, 'rule': 'lower_of_copay_or_uc'},
                'AB': {'sv': 27.00, 'mf': 27.00, 'rule': 'add_to_base'},
                'AH': {'sv': 56.00, 'mf': 65.00, 'rule': 'add_to_base'},
                'AJ': {'sv': 82.00, 'mf': None, 'rule': 'not_available'},
                'DA': {'sv': 53.00, 'mf': 71.00, 'rule': 'lower_of_copay_or_uc'},
                'DD': {'sv': 27.00, 'mf': 27.00, 'rule': 'add_to_base'},
                'PR': {'sv': 70.00, 'mf': 70.00, 'rule': 'lower_of_copay_or_uc'},
                'QM': {'sv': 37.00, 'mf': 37.00, 'rule': 'lower_of_copay_or_uc'},
                'QT': {'sv': 61.00, 'mf': 61.00, 'rule': 'lower_of_copay_or_uc'},
                'QV': {'sv': 75.00, 'mf': 75.00, 'rule': 'lower_of_copay_or_uc'},
                'SV': {'sv': 15.00, 'mf': 15.00, 'rule': 'lower_of_copay_or_uc'},
                'MN': {'sv': 13.00, 'mf': 13.00, 'rule': 'lower_of_copay_or_uc'},
                'MP': {'sv': 15.00, 'mf': 15.00, 'rule': 'lower_of_copay_or_uc'},
                'RM': {'sv': 10.00, 'mf': 12.00, 'rule': 'lower_of_copay_or_uc'},
                'SW': {'sv': 30.00, 'mf': 30.00, 'rule': 'lower_of_copay_or_uc'},
                'SP': {'sv': 14.00, 'mf': 14.00, 'rule': 'lower_of_copay_or_uc'},
            },
            'choice': {
                'KA': {'sv': 55.00, 'mf': 55.00, 'rule': 'lower_of_copay_or_80_uc'},
                'JA': {'sv': 95.00, 'mf': 95.00, 'rule': 'lower_of_copay_or_80_uc'},
                'FA': {'sv': 105.00, 'mf': 105.00, 'rule': 'lower_of_copay_or_80_uc'},
                'OA': {'sv': 150.00, 'mf': 150.00, 'rule': 'lower_of_copay_or_80_uc'},
                'NA': {'sv': 175.00, 'mf': 175.00, 'rule': 'lower_of_copay_or_80_uc'},
                'AA': {'sv': 31.00, 'mf': 35.00, 'rule': 'lower_of_copay_or_80_uc'},
                'BA': {'sv': 45.00, 'mf': 55.00, 'rule': 'lower_of_copay_or_80_uc'},
                'AD': {'sv': 35.00, 'mf': 35.00, 'rule': 'lower_of_copay_or_80_uc'},
                'AB': {'sv': 28.00, 'mf': 28.00, 'rule': 'add_to_base'},
                'AH': {'sv': 58.00, 'mf': 68.00, 'rule': 'add_to_base'},
                'DA': {'sv': 57.00, 'mf': 77.00, 'rule': 'lower_of_copay_or_80_uc'},
                'PR': {'sv': 75.00, 'mf': 75.00, 'rule': 'lower_of_copay_or_80_uc'},
                'QM': {'sv': 41.00, 'mf': 41.00, 'rule': 'lower_of_copay_or_80_uc'},
                'QT': {'sv': 68.00, 'mf': 68.00, 'rule': 'lower_of_copay_or_80_uc'},
                'QV': {'sv': 85.00, 'mf': 85.00, 'rule': 'lower_of_copay_or_80_uc'},
                'SV': {'sv': 16.00, 'mf': 16.00, 'rule': 'lower_of_copay_or_80_uc'},
                'MN': {'sv': 15.00, 'mf': 15.00, 'rule': 'lower_of_copay_or_80_uc'},
                'MP': {'sv': 17.00, 'mf': 17.00, 'rule': 'lower_of_copay_or_80_uc'},
            }
        }
        self.material_codes = {
            "Polycarbonate": "AD",
            "Trivex": "AB",
            "Hi-Index 1.60": "AB",
            "Hi-Index 1.67": "AH",
            "Hi-Index 1.70": "AJ",
        }
        self.enhancement_codes = {
            "uv_coating": "SV",
            "solid_tint": "MN",
            "gradient_tint": "MP",
            "oversized": "RM",
            "rimless_drill": "SW",
            "edge_polish": "SP",
            "photochromic": "PR",
            "polarized": "DA",
        }
    
    def __del__(self):
        if getattr(self, "conn", None):
            try:
                self.conn.close()
            except Exception:
                pass

    def _connect_db(self) -> Optional["psycopg2.extensions.connection"]:
        """Attempt to open a DB connection using env vars; return None on failure."""
        if psycopg2 is None:
            return None
        try:
            return psycopg2.connect(
                dbname=os.getenv("DB_NAME", "vision_automation"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", "mysecretpassword"),
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432"),
            )
        except Exception:
            return None

    def _load_progressive_formulary(self) -> List[Dict[str, Any]]:
        """Loads the VSP progressive formulary from DB, falling back to JSON."""
        if self.conn:
            try:
                with self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute("SELECT * FROM vsp_progressive_formulary")
                    return [dict(row) for row in cur.fetchall()]
            except Exception:
                pass
        try:
            with open('databank/vsp_progressive_formulary.json', 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _load_ar_coating_formulary(self) -> List[Dict[str, Any]]:
        """Loads the VSP AR coating formulary from DB, falling back to JSON."""
        if self.conn:
            try:
                with self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute("SELECT * FROM vsp_ar_coating_formulary")
                    return [dict(row) for row in cur.fetchall()]
            except Exception:
                pass
        try:
            with open('databank/vsp_ar_coating_formulary.json', 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _load_practice_data(self, practice_id: str):
        """Loads practice-specific data from DB, falling back to JSON."""
        if self.conn:
            try:
                with self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    cur.execute("SELECT * FROM practice_data WHERE practice_id = %s", (practice_id,))
                    practice_data = cur.fetchone()
                    if practice_data:
                        practice_uc_prices = practice_data.get('vsp_uc_prices', {}) or {}
                        for code, vision_types in practice_uc_prices.items():
                            if code not in self.uc_prices:
                                self.uc_prices[code] = {}
                            self.uc_prices[code].update(vision_types)
                        self.bundles = practice_data.get('vsp_bundles', []) or []
                        return
            except Exception:
                pass

        # Fallback to JSON file
        try:
            with open(f'databank/practice_data/practice_{practice_id}.json', 'r') as f:
                practice_data = json.load(f)
                practice_uc_prices = practice_data.get('uc_prices', {}).get('vsp', {}) or {}
                for code, vision_types in practice_uc_prices.items():
                    if code not in self.uc_prices:
                        self.uc_prices[code] = {}
                    self.uc_prices[code].update(vision_types)
                self.bundles = practice_data.get('bundles', []) or []
        except (FileNotFoundError, json.JSONDecodeError):
            pass

    def _get_progressive_tier(self, product_name: str) -> Dict[str, Any]:
        """Looks up a progressive lens in the formulary."""
        for lens in self.progressive_formulary:
            if lens['product_name'].lower() == product_name.lower():
                return lens
        return {}

    def _get_ar_tier(self, product_name: str) -> Dict[str, Any]:
        """Looks up an AR coating in the formulary."""
        for coating in self.ar_coating_formulary:
            if coating['product_name'].lower() == product_name.lower():
                return coating
        return {}

    def _get_pricing_for_code(self, code: str, vision_type: str) -> Dict[str, Any]:
        """Gets the pricing for a given code and vision type from the pricing table."""
        tier_table = self.pricing_tables.get(self.pricing_tier, {})
        code_pricing = tier_table.get(code, {})
        price = code_pricing.get(vision_type)
        rule = code_pricing.get('rule')
        return {'price': price, 'rule': rule}

    def _calculate_patient_pays(self, price: float, rule: str, code: str, vision_type: str) -> float:
        """Calculates the patient pays amount based on the pricing rule."""
        if price is None:
            return 0.0

        if rule == 'lower_of_copay_or_80_uc':
            uc_price = self.uc_prices.get(code, {}).get(vision_type, price)
            return min(price, uc_price * 0.8)
        elif rule == 'lower_of_copay_or_uc':
            uc_price = self.uc_prices.get(code, {}).get(vision_type, price)
            return min(price, uc_price)
        elif rule == 'add_to_base' or rule == 'not_available':
            return price
        return 0.0

    def _check_for_bundle(self, order: Dict[str, Any]) -> Dict[str, Any]:
        """Checks if the order matches any of the practice's bundles."""
        for bundle in self.bundles:
            bundle_items = bundle.get("items", [])
            order_items = self._get_order_items(order)
            
            if all(item in order_items for item in bundle_items):
                return bundle
        return {}

    def _get_order_items(self, order: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extracts a list of items from an order."""
        items = []
        if "frame" in order:
            items.append({"type": "frame", "brand": order["frame"].get("brand", "Generic")})
        if "lenses" in order:
            lenses = order["lenses"]
            if "material" in lenses:
                items.append({"type": "lenses", "material": lenses["material"]})
            if "enhancement" in lenses:
                items.append({"type": "lenses", "enhancement": lenses["enhancement"]})
        return items

    def calculate_total_cost(self, order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate the total patient cost for a complete order, checking for bundles first.
        """
        matched_bundle = self._check_for_bundle(order)
        if matched_bundle:
            return {
                "total_patient_cost": matched_bundle["bundle_price"],
                "bundle_applied": matched_bundle["bundle_name"],
                "itemized_costs": []
            }
        
        return super().calculate_total_cost(order)


    def calculate_frame_cost(self, frame_retail_price: float) -> Dict[str, Any]:
        """
        Calculate the cost of a frame for a VSP plan, including allowance and overage.
        """
        allowance = self.copays.get("frame_allowance", 0)
        overage_discount = self.copays.get("frame_overage_discount", 0.20) # Default to 20%

        if frame_retail_price <= allowance:
            return {
                "category": "frame",
                "description": "Frame within allowance",
                "allowance": allowance,
                "overage": 0,
                "patient_pays": 0,
            }
        else:
            overage = frame_retail_price - allowance
            discount_amount = overage * overage_discount
            patient_pays = overage - discount_amount

            return {
                "category": "frame",
                "description": f"Frame overage: ${overage:.2f} with {overage_discount:.0%} discount",
                "allowance": allowance,
                "overage": overage,
                "patient_pays": round(patient_pays, 2),
                "discount_amount": round(discount_amount, 2),
            }

    def calculate_exam_cost(self) -> Dict[str, Any]:
        """
        Calculate the cost of an eye exam for a VSP plan.
        """
        exam_copay = self.copays.get("exam", 0)
        return {
            "category": "exam",
            "description": "Routine Eye Exam",
            "patient_pays": exam_copay,
        }

    def calculate_lens_cost(self, order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate the total cost of lenses for a VSP plan.
        """
        itemized_costs = []
        total_patient_pays = 0
        vision_type = order.get('vision_type', 'sv')
        base_lens_code = 'AA' # Default to Aspheric Plastic 1.50

        # Progressive Lenses (sets the base code)
        if 'progressive_product' in order:
            prog_tier_info = self._get_progressive_tier(order['progressive_product'])
            if prog_tier_info:
                base_lens_code = prog_tier_info.get('base_code')
                pricing = self._get_pricing_for_code(base_lens_code, vision_type)
                patient_pays = self._calculate_patient_pays(pricing.get('price'), pricing.get('rule'), base_lens_code, vision_type)
                
                itemized_costs.append({
                    'category': 'progressive',
                    'description': f"{order['progressive_product']} ({prog_tier_info.get('tier')})",
                    'patient_pays': patient_pays
                })
                total_patient_pays += patient_pays

        # Material
        if 'material' in order:
            material = order['material']
            material_code = self.material_codes.get(material)
            if material_code:
                # VSP materials are modifiers to the base lens, so we look for a modified code
                modified_code = base_lens_code[0] + material_code[1]
                pricing = self._get_pricing_for_code(modified_code, vision_type)
                patient_pays = self._calculate_patient_pays(pricing.get('price'), pricing.get('rule'), modified_code, vision_type)
                itemized_costs.append({
                    'category': 'material',
                    'description': material,
                    'patient_pays': patient_pays
                })
                total_patient_pays += patient_pays

        # AR Coating
        if 'ar_coating_product' in order:
            ar_tier_info = self._get_ar_tier(order['ar_coating_product'])
            if ar_tier_info:
                ar_code = ar_tier_info.get('code')
                pricing = self._get_pricing_for_code(ar_code, vision_type)
                patient_pays = self._calculate_patient_pays(pricing.get('price'), pricing.get('rule'), ar_code, vision_type)
                
                itemized_costs.append({
                    'category': 'ar_coating',
                    'description': f"{order['ar_coating_product']} ({ar_tier_info.get('vsp_tier')})",
                    'patient_pays': patient_pays
                })
                total_patient_pays += patient_pays

        # Other Enhancements
        for enhancement, code in self.enhancement_codes.items():
            if enhancement in order:
                pricing = self._get_pricing_for_code(code, vision_type)
                patient_pays = self._calculate_patient_pays(pricing.get('price'), pricing.get('rule'), code, vision_type)
                itemized_costs.append({
                    'category': 'enhancement',
                    'description': enhancement.replace('_', ' ').title(),
                    'patient_pays': patient_pays
                })
                total_patient_pays += patient_pays
        
        # Prism is often a flat fee or per-diopter. VSP docs are complex here.
        # For now, we'll assume a flat fee if present in copays.
        if 'prism' in order:
             prism_cost = self.copays.get('prism', 0.0)
             itemized_costs.append({
                    'category': 'enhancement',
                    'description': 'Prism',
                    'patient_pays': prism_cost
                })
             total_patient_pays += prism_cost


        return {
            'category': 'lenses',
            'patient_pays': total_patient_pays,
            'itemized_costs': itemized_costs
        }
