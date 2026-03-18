"""
EyeMed Copay Calculator
Applies formulas to calculate patient copays based on extracted benefits and retail prices
"""

from typing import Dict, Any, Optional
import math


class CopayCalculator:
    """Calculates patient copays using extracted EyeMed benefit formulas"""
    
    @staticmethod
    def calculate(
        retail_price: float,
        benefit_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate patient copay based on benefit formula and retail price
        
        Args:
            retail_price: Your retail price for the product
            benefit_data: Extracted benefit information from Haiku
            
        Returns:
            Dict with calculation details and final copay
        """
        
        if not benefit_data:
            return {
                "error": "No benefit data provided",
                "patient_copay": None
            }
        
        formula_type = benefit_data.get('formula_type', 'unknown')
        category = benefit_data.get('category', 'unknown')
        
        # Route to appropriate formula based on type
        if formula_type == 'flat_copay':
            return CopayCalculator._flat_copay(retail_price, benefit_data)
        
        elif formula_type == 'base_copay_plus_percentage':
            return CopayCalculator._base_plus_percentage(retail_price, benefit_data)
        
        elif formula_type == 'allowance_plus_percentage':
            return CopayCalculator._allowance_plus_percentage(retail_price, benefit_data)
        
        elif formula_type == 'percentage_only':
            return CopayCalculator._percentage_only(retail_price, benefit_data)
        
        elif 'copay' in benefit_data and formula_type == 'simple':
            # Simple fixed copay (like Single Vision $25 copay)
            return CopayCalculator._flat_copay(retail_price, benefit_data)
        
        else:
            return {
                "error": f"Unknown formula type: {formula_type}",
                "formula_type": formula_type,
                "category": category,
                "patient_copay": None
            }
    
    @staticmethod
    def _flat_copay(retail_price: float, benefit_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simple flat copay (e.g., Progressive Tier 4 $185 copay, or Single Vision $25 copay)
        Patient pays only the copay amount, no additional calculation
        """
        copay = benefit_data.get('base_copay') or benefit_data.get('copay', 0)
        
        return {
            "retail_price": retail_price,
            "eyemed_benefit": benefit_data.get('exact_text_found', ''),
            "formula": f"Flat copay: ${copay}",
            "calculation_steps": [
                f"Patient pays fixed amount: ${copay}"
            ],
            "patient_copay": round(copay, 2),
            "formula_type": "flat_copay"
        }
    
    @staticmethod
    def _base_plus_percentage(retail_price: float, benefit_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Base copay + percentage formula
        Example: Progressive Tier 4 $85 copay; 20% off retail price less $120 allowance
        Formula: base_copay + ((retail - allowance) * discount_factor)
        
        Note: "20% off" means patient gets 20% OFF, so patient PAYS 80%
        But the formula already accounts for this - we calculate 20% of the excess amount
        which is what the patient pays in addition to the base copay
        """
        base_copay = benefit_data.get('base_copay', 0)
        allowance = benefit_data.get('allowance', 0)
        discount_factor = benefit_data.get('discount_factor', 0)
        
        # Calculate excess over allowance
        excess = max(0, retail_price - allowance)
        
        # Patient pays: base copay + (percentage of excess)
        additional_cost = excess * discount_factor
        total_copay = base_copay + additional_cost
        
        return {
            "retail_price": retail_price,
            "eyemed_benefit": benefit_data.get('exact_text_found', ''),
            "formula": f"{base_copay} + (({retail_price} - {allowance}) × {discount_factor})",
            "calculation_steps": [
                f"Base copay: ${base_copay}",
                f"Retail price: ${retail_price}",
                f"Less allowance: ${allowance}",
                f"Excess amount: ${excess}",
                f"Patient pays {discount_factor*100}% of excess: ${excess} × {discount_factor} = ${additional_cost:.2f}",
                f"Total: ${base_copay} + ${additional_cost:.2f} = ${total_copay:.2f}"
            ],
            "patient_copay": round(total_copay, 2),
            "formula_type": "base_copay_plus_percentage"
        }
    
    @staticmethod
    def _allowance_plus_percentage(retail_price: float, benefit_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Allowance with percentage overage (e.g., Frame allowances)
        Example: Frame $0 copay; 20% off balance over $150 allowance
        Formula: if retail > allowance: (retail - allowance) * discount_factor else: 0
        """
        allowance = benefit_data.get('allowance', 0)
        discount_factor = benefit_data.get('discount_factor', 0)
        
        if retail_price <= allowance:
            return {
                "retail_price": retail_price,
                "eyemed_benefit": benefit_data.get('exact_text_found', ''),
                "formula": "Fully covered by allowance",
                "calculation_steps": [
                    f"Retail price: ${retail_price}",
                    f"Allowance: ${allowance}",
                    f"Price within allowance: ${0}"
                ],
                "patient_copay": 0.00,
                "formula_type": "allowance_plus_percentage"
            }
        
        excess = retail_price - allowance
        copay = excess * discount_factor
        
        return {
            "retail_price": retail_price,
            "eyemed_benefit": benefit_data.get('exact_text_found', ''),
            "formula": f"({retail_price} - {allowance}) × {discount_factor}",
            "calculation_steps": [
                f"Retail price: ${retail_price}",
                f"Allowance: ${allowance}",
                f"Excess: ${excess}",
                f"Patient pays {discount_factor*100}% of excess: ${excess} × {discount_factor} = ${copay:.2f}"
            ],
            "patient_copay": round(copay, 2),
            "formula_type": "allowance_plus_percentage"
        }
    
    @staticmethod
    def _percentage_only(retail_price: float, benefit_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Percentage of retail only (e.g., Frame 35% off retail price)
        Patient pays the percentage specified
        """
        discount_factor = benefit_data.get('discount_factor', 0)
        copay = retail_price * discount_factor
        
        return {
            "retail_price": retail_price,
            "eyemed_benefit": benefit_data.get('exact_text_found', ''),
            "formula": f"{retail_price} × {discount_factor}",
            "calculation_steps": [
                f"Retail price: ${retail_price}",
                f"Patient pays {discount_factor*100}% of retail",
                f"${retail_price} × {discount_factor} = ${copay:.2f}"
            ],
            "patient_copay": round(copay, 2),
            "formula_type": "percentage_only"
        }


def calculate_product_copays(
    extracted_benefits: Dict[str, Any],
    products: Dict[str, Dict[str, Any]]
) -> Dict[str, Dict[str, Any]]:
    """
    Calculate copays for multiple products based on extracted benefits
    
    Args:
        extracted_benefits: Benefits extracted from PDF by Haiku
        products: Product catalog with retail prices and benefit categories
        
    Returns:
        Dict mapping product names to copay calculations
    """
    results = {}
    calculator = CopayCalculator()
    
    for product_name, product_info in products.items():
        retail_price = product_info['retail_price']
        benefit_category = product_info['benefit_category']
        
        # Get the extracted benefit for this category
        benefit_data = extracted_benefits.get(benefit_category)
        
        if not benefit_data:
            results[product_name] = {
                "product_name": product_name,
                "retail_price": retail_price,
                "error": f"Benefit category '{benefit_category}' not found in authorization",
                "patient_copay": None
            }
            continue
        
        # Calculate copay
        calculation = calculator.calculate(retail_price, benefit_data)
        calculation['product_name'] = product_name
        calculation['benefit_category'] = benefit_category
        
        results[product_name] = calculation
    
    return results


if __name__ == "__main__":
    # Test calculations
    
    # Test 1: Progressive Tier 4 with formula
    benefit_tier4_formula = {
        "exact_text_found": "Progressive - Premium Tier 4 $85 copay; 20% off retail price less $120 allowance",
        "category": "PROGRESSIVE_TIER_4_WITH_FORMULA",
        "base_copay": 85,
        "allowance": 120,
        "discount_factor": 0.20,
        "formula_type": "base_copay_plus_percentage"
    }
    
    calc = CopayCalculator()
    result = calc.calculate(393, benefit_tier4_formula)
    print("Test 1 - Progressive Tier 4 with formula:")
    print(f"  Retail: $393")
    print(f"  Patient Copay: ${result['patient_copay']}")
    print(f"  Formula: {result['formula']}")
    print()
    
    # Test 2: Frame with allowance
    benefit_frame = {
        "exact_text_found": "Frame $0 copay; 20% off balance over $150 allowance",
        "category": "FRAME",
        "allowance": 150,
        "discount_factor": 0.20,
        "formula_type": "allowance_plus_percentage"
    }
    
    result = calc.calculate(320, benefit_frame)
    print("Test 2 - Frame with allowance:")
    print(f"  Retail: $320")
    print(f"  Patient Copay: ${result['patient_copay']}")
    print(f"  Formula: {result['formula']}")
    print()
    
    # Test 3: Flat copay
    benefit_flat = {
        "exact_text_found": "Progressive - Premium Tier 4 $185 copay",
        "category": "PROGRESSIVE_TIER_4_FLAT",
        "base_copay": 185,
        "formula_type": "flat_copay"
    }
    
    result = calc.calculate(393, benefit_flat)
    print("Test 3 - Flat copay:")
    print(f"  Retail: $393")
    print(f"  Patient Copay: ${result['patient_copay']}")
    print(f"  Formula: {result['formula']}")
