/**
 * EyeMed Verbatim Database Handler (TypeScript Port)
 *
 * Loads and manages 209 exact benefit patterns from EyeMed documents.
 * Uses pattern matching instead of field extraction for reliability.
 */

import patternsData from '@/lib/data/eyemed-verbatim-patterns.json'

export interface VerbatimPatterns {
  version: string
  total_patterns: number
  total_categories: number
  categories: Record<string, string[]>
}

export class EyeMedVerbatimDatabase {
  private patterns: VerbatimPatterns
  private patternsByCategory: Record<string, string[]>

  constructor() {
    this.patterns = patternsData as VerbatimPatterns
    this.patternsByCategory = this.patterns.categories
  }

  /**
   * Get all patterns for a specific category
   */
  getPatternsForCategory(category: string): string[] {
    return this.patternsByCategory[category] || []
  }

  /**
   * Get list of all categories
   */
  getAllCategories(): string[] {
    return Object.keys(this.patternsByCategory).sort()
  }

  /**
   * Total number of patterns
   */
  getTotalPatterns(): number {
    return this.patterns.total_patterns
  }

  /**
   * Total number of categories
   */
  getTotalCategories(): number {
    return this.patterns.total_categories
  }

  /**
   * Format verbatim database as text for Haiku prompt
   * Returns all 209 patterns organized by category
   */
  formatForPrompt(): string {
    let promptText = 'EXACT EYEMED TEXT PATTERNS TO MATCH:\n'
    promptText += '='.repeat(80) + '\n\n'

    // Sort categories for consistent ordering
    const sortedCategories = Object.keys(this.patternsByCategory).sort()

    for (const category of sortedCategories) {
      const patterns = this.patternsByCategory[category]

      // Format category header
      promptText += `## ${category}\n`

      // List all patterns with numbers
      for (let i = 0; i < patterns.length; i++) {
        promptText += `${i + 1}. "${patterns[i]}"\n`
      }

      promptText += '\n'
    }

    return promptText
  }

  /**
   * Search for patterns containing a specific term
   */
  searchPatterns(searchTerm: string): Array<{ category: string; pattern: string }> {
    const results: Array<{ category: string; pattern: string }> = []
    const searchLower = searchTerm.toLowerCase()

    for (const [category, patterns] of Object.entries(this.patternsByCategory)) {
      for (const pattern of patterns) {
        if (pattern.toLowerCase().includes(searchLower)) {
          results.push({ category, pattern })
        }
      }
    }

    return results
  }

  /**
   * Get database statistics
   */
  getStats() {
    return {
      total_patterns: this.getTotalPatterns(),
      total_categories: this.getTotalCategories(),
      categories: this.getAllCategories(),
      patterns_per_category: Object.entries(this.patternsByCategory).reduce(
        (acc, [cat, patterns]) => {
          acc[cat] = patterns.length
          return acc
        },
        {} as Record<string, number>
      ),
    }
  }
}

/**
 * Create the complete Haiku extraction prompt with verbatim patterns
 * This guides Haiku to match exact patterns and extract variable values
 */
export function createEyeMedExtractionPrompt(pdfText: string): string {
  const db = new EyeMedVerbatimDatabase()
  const verbatimPatterns = db.formatForPrompt()

  return `You are an EyeMed benefit parser. Your job is to find benefit lines in the PDF text and match them EXACTLY to the verbatim patterns below.

${verbatimPatterns}

PDF TEXT TO PARSE:
${pdfText}

INSTRUCTIONS:
1. Scan through the PDF text line by line
2. When you find a benefit line, match it EXACTLY to one of the patterns above
3. The pattern structure must match exactly, only dollar amounts and percentages can vary
4. Extract variable values (copays, allowances, percentages)
5. Identify the category each matched pattern belongs to
6. Return structured JSON

MATCHING RULES:
- Match the ENTIRE string structure, not just keywords
- Dollar amounts may vary (e.g., "$85" in pattern can match "$90" in PDF)
- The REST of the text after dollar amounts must match EXACTLY
- Example: "Progressive - Premium Tier 4 $85 copay; 20% off retail price less $120 allowance"
  matches pattern with ANY $XX value for the first copay, but the rest is exact
- Percentages may vary but the formula structure stays the same
- If text doesn't match ANY pattern exactly, mark as "unrecognized"

EXTRACTION EXAMPLES:

If PDF says: "Progressive - Premium Tier 4 $85 copay; 20% off retail price less $120 allowance"
Extract as:
{
  "progressive_tier_4": {
    "matched_pattern": "Progressive - Premium Tier 4 $XX copay; 20% off retail price less $120 allowance",
    "exact_text_found": "Progressive - Premium Tier 4 $85 copay; 20% off retail price less $120 allowance",
    "category": "PROGRESSIVE_TIER_4_WITH_FORMULA",
    "base_copay": 85,
    "allowance": 120,
    "discount_factor": 0.20,
    "formula_type": "base_copay_plus_percentage"
  }
}

If PDF says: "Progressive - Premium Tier 4 $185 copay"
Extract as:
{
  "progressive_tier_4": {
    "matched_pattern": "Progressive - Premium Tier 4 $185 copay",
    "exact_text_found": "Progressive - Premium Tier 4 $185 copay",
    "category": "PROGRESSIVE_TIER_4_FLAT",
    "base_copay": 185,
    "formula_type": "flat_copay"
  }
}

If PDF says: "Frame $0 copay; 20% off balance over $150 allowance"
Extract as:
{
  "frame": {
    "matched_pattern": "Frame $0 copay; 20% off balance over $XXX allowance",
    "exact_text_found": "Frame $0 copay; 20% off balance over $150 allowance",
    "category": "FRAME",
    "allowance": 150,
    "discount_factor": 0.20,
    "formula_type": "allowance_plus_percentage"
  }
}

If PDF says: "Frame 35% off retail price"
Extract as:
{
  "frame": {
    "matched_pattern": "Frame 35% off retail price",
    "exact_text_found": "Frame 35% off retail price",
    "category": "FRAME",
    "discount_factor": 0.35,
    "formula_type": "percentage_only"
  }
}

OUTPUT FORMAT:
Return a JSON object with keys for each benefit type found. Include:
- matched_pattern: Which pattern from the database was matched
- exact_text_found: The actual text from the PDF
- category: The pattern category (e.g., PROGRESSIVE_TIER_4_WITH_FORMULA)
- All extracted values (copays, allowances, discount factors, percentages)
- formula_type: Descriptor of calculation method (flat_copay, base_copay_plus_percentage, allowance_plus_percentage, percentage_only)
- unrecognized: Array of any benefit lines that don't match patterns

Return ONLY valid JSON, no explanations or markdown.`
}
