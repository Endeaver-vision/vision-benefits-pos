import argparse
import json
from rules_lib import VspRules, SpecteraRules, EyemedRules

def main():
    parser = argparse.ArgumentParser(description="A command-line tool to test the pricing engine.")
    parser.add_argument("--provider", choices=['vsp', 'spectera', 'eyemed'], help="The insurance provider.")
    parser.add_argument("--benefits", help="A JSON string of the benefit authorization data.")
    parser.add_argument("--order", help="A JSON string of the order data.")
    parser.add_argument("--practice-id", help="The ID of the practice to use for overrides.")
    parser.add_argument("--test-bundle", action="store_true", help="Run a test for a predefined bundle.")
    args = parser.parse_args()

    provider = args.provider
    if args.test_bundle:
        provider = 'vsp'
        args.practice_id = '123'
    
    if not provider:
        parser.error("the following arguments are required: --provider (unless --test-bundle is used)")


    # --- Sample Data ---
    sample_benefits = {
        'vsp': {
            "patient": {"name": "John Doe", "age": 45},
            "plan": {"pricing_tier": "choice"},
            "copays": {
                "exam": 10,
                "frame_allowance": 150,
                "frame_overage_discount": 0.20,
                "uc_prices": {
                    "NA": {"mf": 200},
                    "QV": {"mf": 100}
                }
            }
        },
        'spectera': {
            "patient": {"name": "Jane Doe", "age": 35},
            "plan": {},
            "copays": {
                "exam_adult": 20,
                "frame_allowance": 130,
                "frame_overage_percent": 0.70,
                "progressive_tier_v": 280.00,
                "ar_tier_iv": 95.00
            }
        },
        'eyemed': {
            "patient": {"name": "Jim Doe", "age": 50},
            "plan": {},
            "copays": {
                "exam": 15,
                "frame_allowance": 120,
                "frame_overage_discount": 0.20,
                "progressive_premium_tier_5": 160.00,
                "ar_premium_tier_3": 95.00
            }
        }
    }

    sample_orders = {
        'vsp': {
            "exam": {},
            "frame": {"retail_price": 250.00, "brand": "Ray-Ban"},
            "lenses": {
                "vision_type": "mf",
                "progressive_product": "Varilux X Fit Technology",
                "ar_coating_product": "Crizal Rock"
            }
        },
        'spectera': {
             "exam": {},
             "frame": {"retail_price": 200.00},
             "lenses": {
                "progressive_product": "Varilux X Design",
                "ar_coating_product": "Crizal Sapphire HR"
             }
        },
        'eyemed': {
            "exam": {},
            "frame": {"retail_price": 180.00},
            "lenses": {
                "progressive_product": "Varilux X Design",
                "ar_coating_product": "Crizal Sapphire HR"
            }
        }
    }

    bundle_order = {
        "frame": {"brand": "Generic Kids"},
        "lenses": {
            "material": "Polycarbonate",
            "enhancement": "scratch_coating"
        }
    }

    if args.test_bundle:
        order = bundle_order
        benefits = sample_benefits['vsp']
    else:
        benefits = json.loads(args.benefits) if args.benefits else sample_benefits[provider]
        order = json.loads(args.order) if args.order else sample_orders[provider]


    provider_map = {
        'vsp': VspRules,
        'spectera': SpecteraRules,
        'eyemed': EyemedRules
    }

    rule_engine_class = provider_map[provider]
    if args.practice_id and provider == 'vsp':
        engine = rule_engine_class(benefits, practice_id=args.practice_id)
    else:
        engine = rule_engine_class(benefits)
    
    total_cost = engine.calculate_total_cost(order)

    print("--- Pricing Engine Test ---")
    print(f"Provider: {provider.upper()}")
    if args.practice_id:
        print(f"Practice ID: {args.practice_id}")
    if args.test_bundle:
        print("Testing bundle functionality.")
    print("\n--- Benefit Authorization ---")
    print(json.dumps(benefits, indent=2))
    print("\n--- Order ---")
    print(json.dumps(order, indent=2))
    print("\n--- Calculated Costs ---")
    print(json.dumps(total_cost, indent=2))
    print("\n--- End of Test ---")


if __name__ == "__main__":
    main()
