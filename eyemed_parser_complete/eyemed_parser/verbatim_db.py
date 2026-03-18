"""
Verbatim Database Handler
Loads and formats the 209-string verbatim database for Haiku prompts
"""

import pandas as pd
from typing import Dict, List
from pathlib import Path


class VerbatimDatabase:
    """Manages the EyeMed verbatim pattern database"""
    
    def __init__(self, db_path: str):
        """Load verbatim database from Excel"""
        self.df = pd.read_excel(db_path)
        self.patterns_by_category = self._group_by_category()
        
    def _group_by_category(self) -> Dict[str, List[str]]:
        """Group patterns by category for easy lookup"""
        grouped = {}
        for category in self.df['Category'].unique():
            patterns = self.df[
                self.df['Category'] == category
            ]['Exact_EyeMed_Text'].tolist()
            grouped[category] = patterns
        return grouped
    
    def format_for_prompt(self) -> str:
        """
        Format verbatim database as text for Haiku prompt
        Returns all 209 patterns organized by category
        """
        prompt_text = "EXACT EYEMED TEXT PATTERNS TO MATCH:\n"
        prompt_text += "="*80 + "\n\n"
        
        # Sort categories for consistent ordering
        for category in sorted(self.patterns_by_category.keys()):
            patterns = self.patterns_by_category[category]
            
            # Format category header
            prompt_text += f"## {category}\n"
            
            # List all patterns with numbers
            for i, pattern in enumerate(patterns, 1):
                prompt_text += f'{i}. "{pattern}"\n'
            
            prompt_text += "\n"
        
        return prompt_text
    
    def get_patterns_for_category(self, category: str) -> List[str]:
        """Get all patterns for a specific category"""
        return self.patterns_by_category.get(category, [])
    
    def get_all_categories(self) -> List[str]:
        """Get list of all pattern categories"""
        return list(self.patterns_by_category.keys())
    
    def pattern_count(self) -> int:
        """Total number of patterns in database"""
        return len(self.df)
    
    def category_count(self) -> int:
        """Total number of categories"""
        return len(self.patterns_by_category)
    
    def search_patterns(self, search_term: str) -> List[Dict[str, str]]:
        """
        Search for patterns containing a specific term
        Returns list of {category, pattern} dicts
        """
        results = []
        search_lower = search_term.lower()
        
        for _, row in self.df.iterrows():
            if search_lower in row['Exact_EyeMed_Text'].lower():
                results.append({
                    'category': row['Category'],
                    'pattern': row['Exact_EyeMed_Text']
                })
        
        return results
    
    def get_stats(self) -> Dict[str, any]:
        """Get database statistics"""
        return {
            'total_patterns': self.pattern_count(),
            'total_categories': self.category_count(),
            'categories': self.get_all_categories(),
            'patterns_per_category': {
                cat: len(patterns) 
                for cat, patterns in self.patterns_by_category.items()
            }
        }


def create_extraction_prompt(verbatim_db: VerbatimDatabase, pdf_text: str) -> str:
    """
    Create the complete Haiku prompt for benefit extraction
    Uses the verbatim database to guide exact pattern matching
    """
    
    verbatim_patterns = verbatim_db.format_for_prompt()
    
    prompt = f"""You are an EyeMed benefit parser. Your job is to find benefit lines in the PDF text and match them EXACTLY to the verbatim patterns below.

{verbatim_patterns}

PDF TEXT TO PARSE:
{pdf_text}

INSTRUCTIONS:
1. Scan through the PDF text line by line
2. When you find a benefit line, match it EXACTLY to one of the patterns above
3. The pattern structure must match exactly, only dollar amounts can vary
4. Extract variable values (copays, allowances, percentages)
5. Identify the category each matched pattern belongs to
6. Return structured JSON

MATCHING RULES:
- Match the ENTIRE string structure, not just keywords
- Dollar amounts may vary (e.g., "$85" in pattern can match "$90" in PDF)
- The REST of the text after dollar amounts must match EXACTLY
- Example: "Progressive - Premium Tier 4 $85 copay; 20% off retail price less $120 allowance"
  matches pattern with ANY $XX value for the first copay, but the rest is exact
- If text doesn't match ANY pattern exactly, mark as "unrecognized"

EXTRACTION EXAMPLES:

If PDF says: "Progressive - Premium Tier 4 $85 copay; 20% off retail price less $120 allowance"
Extract as:
{{
  "progressive_tier_4": {{
    "matched_pattern": "Progressive - Premium Tier 4 $XX copay; 20% off retail price less $120 allowance",
    "exact_text_found": "Progressive - Premium Tier 4 $85 copay; 20% off retail price less $120 allowance",
    "category": "PROGRESSIVE_TIER_4_WITH_FORMULA",
    "base_copay": 85,
    "allowance": 120,
    "discount_factor": 0.20,
    "formula_type": "base_copay_plus_percentage"
  }}
}}

If PDF says: "Progressive - Premium Tier 4 $185 copay"
Extract as:
{{
  "progressive_tier_4": {{
    "matched_pattern": "Progressive - Premium Tier 4 $185 copay",
    "exact_text_found": "Progressive - Premium Tier 4 $185 copay",
    "category": "PROGRESSIVE_TIER_4_FLAT",
    "base_copay": 185,
    "formula_type": "flat_copay"
  }}
}}

If PDF says: "Frame $0 copay; 20% off balance over $150 allowance"
Extract as:
{{
  "frame": {{
    "matched_pattern": "Frame $0 copay; 20% off balance over $XXX allowance",
    "exact_text_found": "Frame $0 copay; 20% off balance over $150 allowance",
    "category": "FRAME",
    "allowance": 150,
    "discount_factor": 0.20,
    "formula_type": "allowance_plus_percentage"
  }}
}}

If PDF says: "Frame 35% off retail price"
Extract as:
{{
  "frame": {{
    "matched_pattern": "Frame 35% off retail price",
    "exact_text_found": "Frame 35% off retail price",
    "category": "FRAME",
    "discount_factor": 0.35,
    "formula_type": "percentage_only"
  }}
}}

OUTPUT FORMAT:
Return a JSON object with keys for each benefit type found. Include:
- matched_pattern: Which pattern from the database was matched
- exact_text_found: The actual text from the PDF
- category: The pattern category (e.g., PROGRESSIVE_TIER_4_WITH_FORMULA)
- All extracted values (copays, allowances, discount factors)
- formula_type: Descriptor of calculation method
- unrecognized: Array of any benefit lines that don't match patterns

Return ONLY valid JSON, no explanations or markdown.
"""
    
    return prompt


if __name__ == "__main__":
    # Test the database loader
    db = VerbatimDatabase("../EyeMed_Verbatim_Parser_Database.xlsx")
    
    print("Database Stats:")
    stats = db.get_stats()
    print(f"Total Patterns: {stats['total_patterns']}")
    print(f"Total Categories: {stats['total_categories']}")
    
    print("\nSample patterns for PROGRESSIVE_TIER_4_WITH_FORMULA:")
    patterns = db.get_patterns_for_category('PROGRESSIVE_TIER_4_WITH_FORMULA')
    for p in patterns[:3]:
        print(f"  - {p}")
