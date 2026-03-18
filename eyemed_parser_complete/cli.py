#!/usr/bin/env python3
"""
EyeMed Parser CLI
Command-line interface for processing EyeMed authorizations
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

from eyemed_parser import EyeMedParser, PRODUCT_CATALOG
from eyemed_parser.config import VERBATIM_DB_PATH


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Parse EyeMed vision insurance authorizations and calculate patient copays',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process a single PDF
  python cli.py process path/to/authorization.pdf
  
  # Process with custom product list
  python cli.py process auth.pdf --products custom_products.json
  
  # Process multiple PDFs in a directory
  python cli.py batch /path/to/pdfs/
  
  # Show database statistics
  python cli.py stats
  
  # Search for specific patterns
  python cli.py search "Progressive Tier 4"
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # PROCESS command
    process_parser = subparsers.add_parser('process', help='Process a single PDF')
    process_parser.add_argument('pdf_path', help='Path to EyeMed PDF file')
    process_parser.add_argument('--products', '-p', help='Path to custom products JSON file')
    process_parser.add_argument('--output', '-o', help='Output path for results JSON')
    process_parser.add_argument('--no-save', action='store_true', help='Don\'t save results to file')
    process_parser.add_argument('--verbose', '-v', action='store_true', help='Show detailed output')
    
    # BATCH command
    batch_parser = subparsers.add_parser('batch', help='Process multiple PDFs')
    batch_parser.add_argument('directory', help='Directory containing PDF files')
    batch_parser.add_argument('--products', '-p', help='Path to custom products JSON file')
    batch_parser.add_argument('--output-dir', '-o', help='Output directory for results')
    
    # STATS command
    stats_parser = subparsers.add_parser('stats', help='Show verbatim database statistics')
    
    # SEARCH command
    search_parser = subparsers.add_parser('search', help='Search verbatim patterns')
    search_parser.add_argument('term', help='Search term')
    
    # VALIDATE command
    validate_parser = subparsers.add_parser('validate', help='Validate configuration')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Execute command
    try:
        if args.command == 'process':
            process_single(args)
        elif args.command == 'batch':
            process_batch(args)
        elif args.command == 'stats':
            show_stats(args)
        elif args.command == 'search':
            search_patterns(args)
        elif args.command == 'validate':
            validate_config(args)
    
    except Exception as e:
        print(f"❌ Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


def process_single(args):
    """Process a single PDF file"""
    pdf_path = Path(args.pdf_path)
    
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    
    # Load products
    products = load_products(args.products) if args.products else PRODUCT_CATALOG
    
    # Initialize parser
    print(f"Initializing EyeMed Parser...")
    parser = EyeMedParser(VERBATIM_DB_PATH)
    
    # Process PDF
    results = parser.process_pdf(
        str(pdf_path),
        products=products,
        save_output=not args.no_save,
        output_path=args.output
    )
    
    # Print summary
    parser.print_copay_summary(results)
    
    if args.verbose:
        print("\n" + "="*80)
        print("FULL RESULTS (JSON)")
        print("="*80)
        print(json.dumps(results, indent=2))


def process_batch(args):
    """Process multiple PDF files in a directory"""
    directory = Path(args.directory)
    
    if not directory.exists():
        raise FileNotFoundError(f"Directory not found: {directory}")
    
    # Find all PDFs
    pdf_files = list(directory.glob("*.pdf"))
    
    if not pdf_files:
        print(f"⚠ No PDF files found in {directory}")
        return
    
    print(f"Found {len(pdf_files)} PDF files to process\n")
    
    # Load products
    products = load_products(args.products) if args.products else PRODUCT_CATALOG
    
    # Initialize parser
    parser = EyeMedParser(VERBATIM_DB_PATH)
    
    # Output directory
    output_dir = Path(args.output_dir) if args.output_dir else directory / "results"
    output_dir.mkdir(exist_ok=True)
    
    # Process each PDF
    results_summary = []
    
    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"\n[{i}/{len(pdf_files)}] Processing: {pdf_path.name}")
        print("-" * 80)
        
        try:
            # Process
            output_path = output_dir / f"{pdf_path.stem}_copays.json"
            results = parser.process_pdf(
                str(pdf_path),
                products=products,
                save_output=True,
                output_path=str(output_path)
            )
            
            # Track summary
            results_summary.append({
                "file": pdf_path.name,
                "status": "success",
                "benefits_found": results['summary']['benefits_extracted'],
                "products_calculated": results['summary']['products_calculated']
            })
            
            print(f"✓ Saved results to: {output_path}")
        
        except Exception as e:
            print(f"❌ Error processing {pdf_path.name}: {str(e)}")
            results_summary.append({
                "file": pdf_path.name,
                "status": "error",
                "error": str(e)
            })
    
    # Print batch summary
    print("\n" + "="*80)
    print("BATCH PROCESSING SUMMARY")
    print("="*80)
    
    successful = sum(1 for r in results_summary if r['status'] == 'success')
    failed = len(results_summary) - successful
    
    print(f"\nTotal Files: {len(results_summary)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    
    if failed > 0:
        print("\nFailed Files:")
        for r in results_summary:
            if r['status'] == 'error':
                print(f"  • {r['file']}: {r['error']}")
    
    # Save batch summary
    summary_path = output_dir / "batch_summary.json"
    with open(summary_path, 'w') as f:
        json.dump(results_summary, f, indent=2)
    
    print(f"\n✓ Batch summary saved to: {summary_path}")


def show_stats(args):
    """Show verbatim database statistics"""
    from eyemed_parser.verbatim_db import VerbatimDatabase
    
    db = VerbatimDatabase(VERBATIM_DB_PATH)
    stats = db.get_stats()
    
    print("\n" + "="*80)
    print("VERBATIM DATABASE STATISTICS")
    print("="*80 + "\n")
    
    print(f"Total Patterns: {stats['total_patterns']}")
    print(f"Total Categories: {stats['total_categories']}")
    
    print("\nPatterns per Category:")
    for category, count in sorted(stats['patterns_per_category'].items(), key=lambda x: x[1], reverse=True):
        print(f"  {category:<40} {count:>3} patterns")


def search_patterns(args):
    """Search for patterns in verbatim database"""
    from eyemed_parser.verbatim_db import VerbatimDatabase
    
    db = VerbatimDatabase(VERBATIM_DB_PATH)
    results = db.search_patterns(args.term)
    
    print(f"\nFound {len(results)} patterns matching '{args.term}':\n")
    
    for result in results:
        print(f"Category: {result['category']}")
        print(f"Pattern:  {result['pattern']}")
        print()


def validate_config(args):
    """Validate configuration and environment"""
    from eyemed_parser.config import ANTHROPIC_API_KEY, PRODUCT_CATALOG
    
    print("\n" + "="*80)
    print("CONFIGURATION VALIDATION")
    print("="*80 + "\n")
    
    # Check API key
    if ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != 'your-api-key-here':
        print("✓ Anthropic API key configured")
    else:
        print("❌ Anthropic API key not configured")
        print("   Set ANTHROPIC_API_KEY environment variable")
    
    # Check verbatim database
    if Path(VERBATIM_DB_PATH).exists():
        print(f"✓ Verbatim database found: {VERBATIM_DB_PATH}")
    else:
        print(f"❌ Verbatim database not found: {VERBATIM_DB_PATH}")
    
    # Check product catalog
    print(f"✓ Product catalog loaded: {len(PRODUCT_CATALOG)} products")
    
    # Test import
    try:
        from eyemed_parser import EyeMedParser
        print("✓ EyeMed parser module imports successfully")
    except Exception as e:
        print(f"❌ Failed to import parser: {str(e)}")
    
    print("\nConfiguration check complete.")


def load_products(products_path: str):
    """Load custom products from JSON file"""
    with open(products_path, 'r') as f:
        return json.load(f)


if __name__ == "__main__":
    main()
