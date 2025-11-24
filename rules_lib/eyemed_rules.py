import json
from typing import Dict, Any, List
from .base import RuleBase

class EyemedRules(RuleBase):
    """
    Eyemed-specific rules engine.
    """

    def __init__(self, benefit_authorization: Dict[str, Any]):
        super().__init__(benefit_authorization)
        self.progressive_formulary = self._load_formulary('eyemed_progressive_formulary.json')
        self.ar_coating_formulary = self._load_formulary('eyemed_ar_coating_formulary.json')

    def _load_formulary(self, filename: str) -> List[Dict[str, Any]]:
        """Loads a formulary from a JSON file in the databank."""
        try:
            with open(f'databank/{filename}', 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

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

    def calculate_frame_cost(self, frame_retail_price: float) -> Dict[str, Any]:
        """
        Calculate the cost of a frame for an Eyemed plan, including allowance and overage.
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
        Calculate the cost of an eye exam for an Eyemed plan.
        """
        exam_copay = self.copays.get("exam", 0)
        return {
            "category": "exam",
            "description": "Routine Eye Exam",
            "patient_pays": exam_copay,
        }

    def calculate_lens_cost(self, order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate the total cost of lenses for an Eyemed plan.
        """
        itemized_costs = []
        total_patient_pays = 0

        # Progressive lenses
        if 'progressive_product' in order:
            prog_tier_info = self._get_progressive_tier(order['progressive_product'])
            if prog_tier_info:
                tier = prog_tier_info.get('tier')
                copay_key = f"progressive_premium_{tier}"
                patient_pays = self.copays.get(copay_key, "Not Covered")

                itemized_costs.append({
                    'category': 'progressive',
                    'description': f"{order['progressive_product']} ({tier})",
                    'patient_pays': patient_pays
                })
                if isinstance(patient_pays, (int, float)):
                    total_patient_pays += patient_pays

        # AR Coating
        if 'ar_coating_product' in order:
            ar_tier_info = self._get_ar_tier(order['ar_coating_product'])
            if ar_tier_info:
                tier = ar_tier_info.get('tier')
                copay_key = f"ar_premium_{tier}"
                patient_pays = self.copays.get(copay_key, "Not Covered")

                itemized_costs.append({
                    'category': 'ar_coating',
                    'description': f"{order['ar_coating_product']} ({tier})",
                    'patient_pays': patient_pays
                })
                if isinstance(patient_pays, (int, float)):
                    total_patient_pays += patient_pays
        
        # Materials
        if 'material' in order:
            material = order['material']
            patient_pays = 0
            description = material
            if material == 'Polycarbonate':
                max_child_age = self.special_rules.get('polycarbonate_free_child_age_max', 18)
                if self.patient.get('age', 99) <= max_child_age:
                    patient_pays = self.copays.get('material_polycarbonate_child', 0)
                    description = "Polycarbonate (Child)"
                else:
                    patient_pays = self.copays.get('material_polycarbonate', "Not Covered")
                    description = "Polycarbonate (Adult)"
            elif 'High-Index' in material:
                patient_pays = self.copays.get('material_high_index', "Not Covered")
            elif material == 'Trivex':
                patient_pays = self.copays.get('material_trivex', "Not Covered")

            itemized_costs.append({
                'category': 'material',
                'description': description,
                'patient_pays': patient_pays
            })
            if isinstance(patient_pays, (int, float)):
                total_patient_pays += patient_pays
        
        # Enhancements
        enhancement_keys = ['photochromic', 'polarized', 'tint', 'uv_coating', 
                              'scratch_coating', 'blue_light_filter']
        for key in enhancement_keys:
            if key in order:
                patient_pays = self.copays.get(key, "Not Covered")
                itemized_costs.append({
                    'category': 'enhancement',
                    'description': key.replace('_', ' ').title(),
                    'patient_pays': patient_pays
                })
                if isinstance(patient_pays, (int, float)):
                    total_patient_pays += patient_pays

        return {
            'category': 'lenses',
            'patient_pays': total_patient_pays,
            'itemized_costs': itemized_costs
        }
