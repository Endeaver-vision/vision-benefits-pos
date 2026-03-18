"""
EyeMed Parser - Main Module
Orchestrates PDF extraction, Haiku API calls, and copay calculations
"""

import json
import anthropic
from typing import Dict, Any, Optional, List
from pathlib import Path
import PyPDF2
import io

from .config import ANTHROPIC_API_KEY, HAIKU_MODEL, MAX_TOKENS, PRODUCT_CATALOG
from .verbatim_db import VerbatimDatabase, create_extraction_prompt
from .calculator import calculate_product_copays, CopayCalculator


class EyeMedParser:
    """Main parser class that handles end-to-end PDF processing"""
    
    def __init__(self, verbatim_db_path: str, api_key: Optional[str] = None):
        """
        Initialize parser with verbatim database and API credentials
        
        Args:
            verbatim_db_path: Path to verbatim database Excel file
            api_key: Anthropic API key (uses config if not provided)
        """
        self.verbatim_db = VerbatimDatabase(verbatim_db_path)
        self.api_key = api_key or ANTHROPIC_API_KEY
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.calculator = CopayCalculator()
        
        print(f"✓ Loaded verbatim database: {self.verbatim_db.pattern_count()} patterns")
        print(f"✓ Anthropic client initialized")
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extract text content from PDF file
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Extracted text content
        """
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                
                if not text.strip():
                    raise ValueError("No text extracted from PDF")
                
                return text
        
        except Exception as e:
            raise Exception(f"Failed to extract PDF text: {str(e)}")
    
    def extract_benefits_with_haiku(self, pdf_text: str) -> Dict[str, Any]:
        """
        Send PDF text to Haiku for benefit extraction using verbatim patterns
        
        Args:
            pdf_text: Extracted text from PDF
            
        Returns:
            Structured benefit data extracted by Haiku
        """
        # Create prompt using verbatim database
        prompt = create_extraction_prompt(self.verbatim_db, pdf_text)
        
        try:
            # Call Haiku API
            response = self.client.messages.create(
                model=HAIKU_MODEL,
                max_tokens=MAX_TOKENS,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Parse JSON response
            response_text = response.content[0].text
            
            # Clean any markdown formatting
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            # Parse JSON
            extracted_benefits = json.loads(response_text)
            
            return extracted_benefits
        
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse Haiku response as JSON: {str(e)}\nResponse: {response_text}")
        
        except Exception as e:
            raise Exception(f"Haiku API call failed: {str(e)}")
    
    def calculate_copays_for_products(
        self,
        extracted_benefits: Dict[str, Any],
        products: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Dict[str, Dict[str, Any]]:
        """
        Calculate patient copays for products using extracted benefits
        
        Args:
            extracted_benefits: Benefits extracted from PDF
            products: Product catalog (uses default if not provided)
            
        Returns:
            Dict mapping product names to copay calculations
        """
        if products is None:
            products = PRODUCT_CATALOG
        
        return calculate_product_copays(extracted_benefits, products)
    
    def process_pdf(
        self,
        pdf_path: str,
        products: Optional[Dict[str, Dict[str, Any]]] = None,
        save_output: bool = True,
        output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Complete end-to-end processing: PDF -> Extraction -> Calculation
        
        Args:
            pdf_path: Path to EyeMed PDF authorization
            products: Product catalog to calculate copays for
            save_output: Whether to save results to JSON file
            output_path: Where to save output (default: same dir as PDF)
            
        Returns:
            Complete results with extracted benefits and calculated copays
        """
        print(f"\n{'='*80}")
        print(f"PROCESSING: {Path(pdf_path).name}")
        print(f"{'='*80}\n")
        
        # Step 1: Extract PDF text
        print("Step 1: Extracting PDF text...")
        pdf_text = self.extract_text_from_pdf(pdf_path)
        print(f"  ✓ Extracted {len(pdf_text)} characters")
        
        # Step 2: Extract benefits with Haiku
        print("\nStep 2: Calling Haiku API for benefit extraction...")
        extracted_benefits = self.extract_benefits_with_haiku(pdf_text)
        print(f"  ✓ Extracted {len(extracted_benefits)} benefit categories")
        
        # Show extracted benefits
        print("\n  Extracted Benefits:")
        for key, value in extracted_benefits.items():
            if key != 'unrecognized':
                benefit_text = value.get('exact_text_found', 'N/A')
                print(f"    • {key}: {benefit_text[:80]}...")
        
        if 'unrecognized' in extracted_benefits and extracted_benefits['unrecognized']:
            print(f"\n  ⚠ Unrecognized benefits: {len(extracted_benefits['unrecognized'])}")
            for item in extracted_benefits['unrecognized']:
                print(f"    - {item}")
        
        # Step 3: Calculate copays
        print("\nStep 3: Calculating patient copays...")
        copay_results = self.calculate_copays_for_products(extracted_benefits, products)
        print(f"  ✓ Calculated copays for {len(copay_results)} products")
        
        # Compile complete results
        results = {
            "pdf_file": str(Path(pdf_path).name),
            "processing_date": None,  # Could add timestamp
            "extracted_benefits": extracted_benefits,
            "product_copays": copay_results,
            "summary": {
                "benefits_extracted": len([k for k in extracted_benefits.keys() if k != 'unrecognized']),
                "products_calculated": len(copay_results),
                "unrecognized_benefits": len(extracted_benefits.get('unrecognized', []))
            }
        }
        
        # Save to file if requested
        if save_output:
            if output_path is None:
                pdf_stem = Path(pdf_path).stem
                output_path = Path(pdf_path).parent / f"{pdf_stem}_copays.json"
            
            with open(output_path, 'w') as f:
                json.dump(results, f, indent=2)
            
            print(f"\n✓ Results saved to: {output_path}")
        
        return results
    
    def print_copay_summary(self, results: Dict[str, Any]):
        """Print a formatted summary of calculated copays"""
        print(f"\n{'='*80}")
        print("COPAY SUMMARY")
        print(f"{'='*80}\n")
        
        copays = results['product_copays']
        
        for product_name, calc in copays.items():
            if calc.get('error'):
                print(f"✗ {product_name}")
                print(f"  Error: {calc['error']}\n")
                continue
            
            print(f"✓ {product_name}")
            print(f"  Retail: ${calc['retail_price']:.2f}")
            print(f"  Patient Copay: ${calc['patient_copay']:.2f}")
            print(f"  EyeMed Benefit: {calc['eyemed_benefit'][:70]}...")
            print(f"  Formula: {calc['formula']}")
            print()


def quick_process(pdf_path: str, verbatim_db_path: str) -> Dict[str, Any]:
    """
    Convenience function for quick processing
    
    Args:
        pdf_path: Path to EyeMed PDF
        verbatim_db_path: Path to verbatim database
        
    Returns:
        Complete results
    """
    parser = EyeMedParser(verbatim_db_path)
    results = parser.process_pdf(pdf_path)
    parser.print_copay_summary(results)
    return results


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python -m eyemed_parser.parser <path_to_pdf>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    db_path = "EyeMed_Verbatim_Parser_Database.xlsx"
    
    results = quick_process(pdf_path, db_path)
