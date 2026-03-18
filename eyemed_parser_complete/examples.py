#!/usr/bin/env python3
"""
Example Usage Scripts
Demonstrates different ways to use the EyeMed Parser
"""

from eyemed_parser import EyeMedParser, PRODUCT_CATALOG
from pathlib import Path
import json


def example_basic():
    """Most basic usage - process one PDF"""
    print("="*80)
    print("EXAMPLE 1: Basic PDF Processing")
    print("="*80 + "\n")
    
    parser = EyeMedParser('EyeMed_Verbatim_Parser_Database.xlsx')
    results = parser.process_pdf('sample_authorization.pdf')
    parser.print_copay_summary(results)


def example_custom_products():
    """Use custom product list instead of catalog"""
    print("="*80)
    print("EXAMPLE 2: Custom Product List")
    print("="*80 + "\n")
    
    # Define just the products you want to calculate
    my_products = {
        "Varilux X Series": {
            "retail_price": 440,
            "benefit_category": "progressive_tier_4"
        },
        "Crizal Sapphire": {
            "retail_price": 175,
            "benefit_category": "ar_tier_3"
        },
        "Silhouette Frame": {
            "retail_price": 320,
            "benefit_category": "frame"
        }
    }
    
    parser = EyeMedParser('EyeMed_Verbatim_Parser_Database.xlsx')
    results = parser.process_pdf('sample_authorization.pdf', products=my_products)
    
    # Access specific product
    for product_name, calc in results['product_copays'].items():
        print(f"\n{product_name}:")
        print(f"  Retail: ${calc['retail_price']}")
        print(f"  Patient Pays: ${calc['patient_copay']:.2f}")
        print(f"  Insurance Covers: ${calc['retail_price'] - calc['patient_copay']:.2f}")


def example_step_by_step():
    """Manual step-by-step processing for more control"""
    print("="*80)
    print("EXAMPLE 3: Step-by-Step Processing")
    print("="*80 + "\n")
    
    parser = EyeMedParser('EyeMed_Verbatim_Parser_Database.xlsx')
    
    # Step 1: Extract PDF text
    print("Step 1: Extracting PDF text...")
    pdf_text = parser.extract_text_from_pdf('sample_authorization.pdf')
    print(f"  Extracted {len(pdf_text)} characters\n")
    
    # Step 2: Extract benefits with Haiku
    print("Step 2: Calling Haiku API...")
    extracted = parser.extract_benefits_with_haiku(pdf_text)
    print(f"  Found {len(extracted)} benefit categories\n")
    
    # Step 3: Calculate copays
    print("Step 3: Calculating copays...")
    copays = parser.calculate_copays_for_products(extracted, PRODUCT_CATALOG)
    
    # Step 4: Process results
    print("\nResults:")
    for product, calc in copays.items():
        if not calc.get('error'):
            print(f"  {product}: ${calc['patient_copay']:.2f}")


def example_batch_with_progress():
    """Process multiple PDFs with progress tracking"""
    print("="*80)
    print("EXAMPLE 4: Batch Processing with Progress")
    print("="*80 + "\n")
    
    # Find all PDFs
    pdf_dir = Path('pdfs')
    pdf_files = list(pdf_dir.glob('*.pdf'))
    
    print(f"Found {len(pdf_files)} PDFs to process\n")
    
    parser = EyeMedParser('EyeMed_Verbatim_Parser_Database.xlsx')
    
    results_list = []
    
    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"[{i}/{len(pdf_files)}] Processing {pdf_path.name}...")
        
        try:
            results = parser.process_pdf(
                str(pdf_path),
                save_output=True,
                output_path=f"results/{pdf_path.stem}_copays.json"
            )
            
            results_list.append({
                'file': pdf_path.name,
                'status': 'success',
                'products': len(results['product_copays'])
            })
            print(f"  ✓ Success\n")
        
        except Exception as e:
            results_list.append({
                'file': pdf_path.name,
                'status': 'error',
                'error': str(e)
            })
            print(f"  ✗ Error: {e}\n")
    
    # Summary
    successful = sum(1 for r in results_list if r['status'] == 'success')
    print(f"\nCompleted: {successful}/{len(pdf_files)} successful")


def example_benefit_comparison():
    """Compare benefits across multiple patients"""
    print("="*80)
    print("EXAMPLE 5: Benefit Comparison")
    print("="*80 + "\n")
    
    parser = EyeMedParser('EyeMed_Verbatim_Parser_Database.xlsx')
    
    # Process multiple authorizations
    patients = [
        {'name': 'Patient A', 'file': 'patient_a.pdf'},
        {'name': 'Patient B', 'file': 'patient_b.pdf'},
        {'name': 'Patient C', 'file': 'patient_c.pdf'},
    ]
    
    # Compare single product across patients
    product_name = "Varilux Comfort Max"
    retail_price = 393
    
    print(f"Comparing copays for {product_name} (retail ${retail_price}):\n")
    
    for patient in patients:
        try:
            results = parser.process_pdf(patient['file'], save_output=False)
            
            # Get Progressive Tier 4 benefit
            benefit = results['extracted_benefits'].get('progressive_tier_4')
            
            if benefit:
                from eyemed_parser.calculator import CopayCalculator
                calc = CopayCalculator()
                result = calc.calculate(retail_price, benefit)
                
                print(f"{patient['name']}:")
                print(f"  Copay: ${result['patient_copay']:.2f}")
                print(f"  Benefit: {benefit['exact_text_found'][:60]}...")
                print()
        
        except Exception as e:
            print(f"{patient['name']}: Error - {e}\n")


def example_quote_generation():
    """Generate patient quotes"""
    print("="*80)
    print("EXAMPLE 6: Patient Quote Generation")
    print("="*80 + "\n")
    
    parser = EyeMedParser('EyeMed_Verbatim_Parser_Database.xlsx')
    results = parser.process_pdf('sample_authorization.pdf')
    
    # Generate quote
    print("PATIENT EYEWEAR QUOTE")
    print("="*80)
    print("\nRecommended Package:")
    print()
    
    # Select products for quote
    quote_products = [
        "Varilux Comfort Max",
        "Crizal Sapphire 360",
        "Polycarbonate Lenses",
        "Designer Frame (Mid)"
    ]
    
    total_retail = 0
    total_copay = 0
    
    for product in quote_products:
        if product in results['product_copays']:
            calc = results['product_copays'][product]
            retail = calc['retail_price']
            copay = calc['patient_copay']
            insurance_pays = retail - copay
            
            print(f"{product}")
            print(f"  Retail Price:    ${retail:>7.2f}")
            print(f"  Insurance Pays:  ${insurance_pays:>7.2f}")
            print(f"  Your Cost:       ${copay:>7.2f}")
            print()
            
            total_retail += retail
            total_copay += copay
    
    print("-" * 40)
    print(f"TOTAL RETAIL:        ${total_retail:>7.2f}")
    print(f"TOTAL INSURANCE:     ${total_retail - total_copay:>7.2f}")
    print(f"YOUR TOTAL COST:     ${total_copay:>7.2f}")
    print("\n" + "="*80)


def example_extract_and_save():
    """Extract benefits and save for later use"""
    print("="*80)
    print("EXAMPLE 7: Extract and Save Benefits")
    print("="*80 + "\n")
    
    parser = EyeMedParser('EyeMed_Verbatim_Parser_Database.xlsx')
    
    # Extract only (no calculation)
    pdf_text = parser.extract_text_from_pdf('sample_authorization.pdf')
    extracted = parser.extract_benefits_with_haiku(pdf_text)
    
    # Save extracted benefits
    with open('extracted_benefits.json', 'w') as f:
        json.dump(extracted, f, indent=2)
    
    print("✓ Benefits extracted and saved to: extracted_benefits.json")
    print("\nExtracted Benefits:")
    for key, value in extracted.items():
        if key != 'unrecognized':
            print(f"  • {key}: {value.get('exact_text_found', 'N/A')[:60]}...")
    
    # Later: Load and calculate
    print("\n--- Later ---\n")
    with open('extracted_benefits.json', 'r') as f:
        loaded_benefits = json.load(f)
    
    copays = parser.calculate_copays_for_products(loaded_benefits)
    print("✓ Calculated copays using saved benefits")


if __name__ == "__main__":
    # Run examples
    import sys
    
    examples = {
        '1': ('Basic Usage', example_basic),
        '2': ('Custom Products', example_custom_products),
        '3': ('Step by Step', example_step_by_step),
        '4': ('Batch Processing', example_batch_with_progress),
        '5': ('Benefit Comparison', example_benefit_comparison),
        '6': ('Quote Generation', example_quote_generation),
        '7': ('Extract and Save', example_extract_and_save),
    }
    
    if len(sys.argv) > 1:
        choice = sys.argv[1]
        if choice in examples:
            name, func = examples[choice]
            func()
        else:
            print(f"Invalid example: {choice}")
            print("Available examples:", ", ".join(examples.keys()))
    else:
        print("Available Examples:")
        for key, (name, _) in examples.items():
            print(f"  {key}. {name}")
        print("\nRun with: python examples.py <number>")
