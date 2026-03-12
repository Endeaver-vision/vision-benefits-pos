/**
 * EyeMed Benefit String Parser
 *
 * Parses natural language benefit strings into calculation components.
 * This is the "translator" between insurance language and math.
 *
 * Examples:
 *   "$45 copay"                                    → { type: 'flat', copay: 45 }
 *   "20% off retail"                               → { type: 'discount', discount: 0.20 }
 *   "$25 copay; 20% off balance over $120"         → { type: 'copay_plus_overage', copay: 25, allowance: 120, discount: 0.20 }
 *   "Covered"                                      → { type: 'covered' }
 *   "$90; 20% off retail price less $55 allowance" → { type: 'discount_with_allowance', copay: 90, allowance: 55, discount: 0.20 }
 */

export type BenefitType =
  | 'flat'              // Simple copay: "$45"
  | 'discount'          // Discount off retail: "20% off retail"
  | 'copay_plus_overage'// Copay + discounted overage: "$25; 20% off over $120"
  | 'discount_with_allowance' // Discount with allowance offset
  | 'covered'           // Fully covered: "$0" or "Covered"
  | 'not_covered'       // Not covered: "N/A" or "Not covered"
  | 'unknown'           // Could not parse

export interface ParsedBenefit {
  type: BenefitType
  copay?: number
  discount?: number      // 0.0 to 1.0 (e.g., 0.20 for 20%)
  allowance?: number
  rawValue: string       // Original string for debugging
}

/**
 * Parse a benefit string into calculation components
 */
export function parseBenefitString(benefit: string | number | null | undefined): ParsedBenefit {
  // Handle null/undefined
  if (benefit == null) {
    return { type: 'unknown', rawValue: '' }
  }

  // Handle direct numbers
  if (typeof benefit === 'number') {
    if (benefit === 0) {
      return { type: 'covered', copay: 0, rawValue: String(benefit) }
    }
    return { type: 'flat', copay: benefit, rawValue: String(benefit) }
  }

  const raw = String(benefit).trim()
  const lower = raw.toLowerCase()

  // Handle "Covered" or "N/A"
  if (lower === 'covered' || lower === '$0' || lower === '0' || lower === 'included') {
    return { type: 'covered', copay: 0, rawValue: raw }
  }
  if (lower === 'n/a' || lower === 'not covered' || lower === 'na') {
    return { type: 'not_covered', rawValue: raw }
  }

  // Pattern 1: Simple copay "$45" or "$45 copay"
  const simpleCopayMatch = raw.match(/^\$?(\d+(?:\.\d{2})?)\s*(?:copay)?$/i)
  if (simpleCopayMatch) {
    const copay = parseFloat(simpleCopayMatch[1])
    if (copay === 0) {
      return { type: 'covered', copay: 0, rawValue: raw }
    }
    return { type: 'flat', copay, rawValue: raw }
  }

  // Pattern 2: Discount off retail "20% off retail" or "20% discount"
  const discountMatch = raw.match(/(\d+)%\s*(?:off\s*retail|discount)/i)
  if (discountMatch && !raw.includes('over') && !raw.includes('allowance') && !raw.includes('balance')) {
    const discount = parseFloat(discountMatch[1]) / 100
    return { type: 'discount', discount, rawValue: raw }
  }

  // Pattern 3: Copay + overage discount
  // "$25 copay; 20% off balance over $120 allowance"
  // "$25; 20% off over $120"
  const overageMatch = raw.match(/\$?(\d+(?:\.\d{2})?)\s*(?:copay)?[;,]?\s*(\d+)%\s*off\s*(?:balance\s*)?over\s*\$?(\d+(?:\.\d{2})?)/i)
  if (overageMatch) {
    return {
      type: 'copay_plus_overage',
      copay: parseFloat(overageMatch[1]),
      discount: parseFloat(overageMatch[2]) / 100,
      allowance: parseFloat(overageMatch[3]),
      rawValue: raw
    }
  }

  // Pattern 4: Copay + overage (different phrasing)
  // "$0 copay; 20% off balance over $250 allowance"
  const overageMatch2 = raw.match(/\$?(\d+(?:\.\d{2})?)\s*copay[;,]\s*(\d+)%\s*off\s*balance\s*over\s*\$?(\d+(?:\.\d{2})?)/i)
  if (overageMatch2) {
    return {
      type: 'copay_plus_overage',
      copay: parseFloat(overageMatch2[1]),
      discount: parseFloat(overageMatch2[2]) / 100,
      allowance: parseFloat(overageMatch2[3]),
      rawValue: raw
    }
  }

  // Pattern 5: Discount with allowance offset
  // "$90; 20% off retail price less $55 allowance"
  // "20% off retail less $120 allowance"
  const discountAllowanceMatch = raw.match(/(?:\$?(\d+(?:\.\d{2})?)[;,]?\s*)?(\d+)%\s*off\s*(?:retail\s*(?:price\s*)?)?less\s*\$?(\d+(?:\.\d{2})?)/i)
  if (discountAllowanceMatch) {
    return {
      type: 'discount_with_allowance',
      copay: discountAllowanceMatch[1] ? parseFloat(discountAllowanceMatch[1]) : 0,
      discount: parseFloat(discountAllowanceMatch[2]) / 100,
      allowance: parseFloat(discountAllowanceMatch[3]),
      rawValue: raw
    }
  }

  // Pattern 6: Just a dollar amount in a longer string
  // "Exam $10" or "Frame: $130 allowance"
  const dollarMatch = raw.match(/\$(\d+(?:\.\d{2})?)/)
  if (dollarMatch) {
    const value = parseFloat(dollarMatch[1])
    // Check if this looks like an allowance
    if (lower.includes('allowance')) {
      return { type: 'flat', allowance: value, rawValue: raw }
    }
    return { type: 'flat', copay: value, rawValue: raw }
  }

  // Could not parse
  return { type: 'unknown', rawValue: raw }
}

/**
 * Calculate patient cost from parsed benefit and retail price
 */
export function calculateFromBenefit(
  parsed: ParsedBenefit,
  retailPrice: number
): { cost: number; note: string } {
  switch (parsed.type) {
    case 'covered':
      return { cost: 0, note: 'Covered' }

    case 'not_covered':
      return { cost: retailPrice, note: 'Not covered - full retail' }

    case 'flat':
      return {
        cost: parsed.copay ?? retailPrice,
        note: `$${parsed.copay} copay`
      }

    case 'discount': {
      const discount = parsed.discount ?? 0
      const cost = retailPrice * (1 - discount)
      return {
        cost: Math.round(cost * 100) / 100,
        note: `${Math.round(discount * 100)}% off retail`
      }
    }

    case 'copay_plus_overage': {
      const copay = parsed.copay ?? 0
      const allowance = parsed.allowance ?? 0
      const discount = parsed.discount ?? 0
      const overage = Math.max(0, retailPrice - allowance)
      const discountedOverage = overage * (1 - discount)
      const cost = copay + discountedOverage

      return {
        cost: Math.round(cost * 100) / 100,
        note: `$${copay} copay + ${Math.round((1 - discount) * 100)}% of overage above $${allowance}`
      }
    }

    case 'discount_with_allowance': {
      const copay = parsed.copay ?? 0
      const allowance = parsed.allowance ?? 0
      const discount = parsed.discount ?? 0
      // Discount applied to (retail - allowance)
      const base = Math.max(0, retailPrice - allowance)
      const discounted = base * (1 - discount)
      const cost = copay + discounted

      return {
        cost: Math.round(cost * 100) / 100,
        note: `${Math.round(discount * 100)}% off (retail - $${allowance} allowance)`
      }
    }

    case 'unknown':
    default:
      return {
        cost: retailPrice,
        note: `Could not parse: "${parsed.rawValue}"`
      }
  }
}

// Export combined function for convenience
export function parseAndCalculate(
  benefitString: string | number | null | undefined,
  retailPrice: number
): { cost: number; note: string; parsed: ParsedBenefit } {
  const parsed = parseBenefitString(benefitString)
  const result = calculateFromBenefit(parsed, retailPrice)
  return { ...result, parsed }
}
