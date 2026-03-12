/**
 * EyeMed Formula Parser
 * Parses benefit strings into structured data for pricing calculation
 *
 * Examples:
 *   "$0 copay" → { type: 'flat_copay', copay: 0 }
 *   "$25 copay" → { type: 'flat_copay', copay: 25 }
 *   "$45" → { type: 'flat_copay', copay: 45 }
 *   "20% off retail price" → { type: 'discount', discountPct: 0.20 }
 *   "$25 copay; 20% off retail price less $120 allowance" → { type: 'copay_plus_overage', ... }
 *   "$0 copay; 20% off balance over $180 allowance" → { type: 'copay_plus_overage', ... }
 *   "Up to $39" → { type: 'up_to_allowance', allowance: 39 }
 */

export type FormulaType =
  | 'flat_copay'
  | 'discount'
  | 'copay_plus_overage'
  | 'up_to_allowance'
  | 'full_coverage'
  | 'unknown'

export interface ParsedFormula {
  type: FormulaType
  copay?: number
  discountPct?: number
  allowance?: number
  overagePct?: number  // What patient pays of overage (1 - discount)
  rawFormula: string
}

/**
 * Parse a benefit formula string into structured data
 */
export function parseFormula(formula: string): ParsedFormula {
  const raw = formula.trim()

  // Handle empty or null
  if (!raw) {
    return { type: 'unknown', rawFormula: raw }
  }

  // Pattern: "$X copay; Y% off balance over $Z allowance"
  // or: "$X copay; Y% off retail price less $Z allowance"
  const overagePattern = /\$(\d+)\s*(?:copay)?[;,]?\s*(\d+)%\s*off\s*(?:balance over|retail price less)\s*\$(\d+)\s*allowance/i
  const overageMatch = raw.match(overagePattern)
  if (overageMatch) {
    return {
      type: 'copay_plus_overage',
      copay: parseInt(overageMatch[1]),
      discountPct: parseInt(overageMatch[2]) / 100,
      allowance: parseInt(overageMatch[3]),
      overagePct: 1 - (parseInt(overageMatch[2]) / 100),
      rawFormula: raw
    }
  }

  // Pattern: "$0 copay; 20% off balance over $180 allowance"
  const zeroOveragePattern = /\$0\s*copay[;,]?\s*(\d+)%\s*off\s*balance\s*over\s*\$(\d+)\s*allowance/i
  const zeroOverageMatch = raw.match(zeroOveragePattern)
  if (zeroOverageMatch) {
    return {
      type: 'copay_plus_overage',
      copay: 0,
      discountPct: parseInt(zeroOverageMatch[1]) / 100,
      allowance: parseInt(zeroOverageMatch[2]),
      overagePct: 1 - (parseInt(zeroOverageMatch[1]) / 100),
      rawFormula: raw
    }
  }

  // Pattern: "X% of balance over $Y allowance" (no copay specified)
  const balanceOverPattern = /(\d+)%\s*(?:of\s*)?balance\s*over\s*\$(\d+)\s*allowance/i
  const balanceOverMatch = raw.match(balanceOverPattern)
  if (balanceOverMatch) {
    return {
      type: 'copay_plus_overage',
      copay: 0,
      overagePct: parseInt(balanceOverMatch[1]) / 100,
      allowance: parseInt(balanceOverMatch[2]),
      rawFormula: raw
    }
  }

  // Pattern: "X% off retail price"
  const discountPattern = /(\d+)%\s*off\s*(?:retail\s*)?(?:price)?/i
  const discountMatch = raw.match(discountPattern)
  if (discountMatch) {
    return {
      type: 'discount',
      discountPct: parseInt(discountMatch[1]) / 100,
      rawFormula: raw
    }
  }

  // Pattern: "Up to $X" or "Up to $X allowance"
  const upToPattern = /up\s*to\s*\$(\d+)/i
  const upToMatch = raw.match(upToPattern)
  if (upToMatch) {
    return {
      type: 'up_to_allowance',
      allowance: parseInt(upToMatch[1]),
      rawFormula: raw
    }
  }

  // Pattern: "$X copay" or just "$X"
  const copayPattern = /\$(\d+)\s*(?:copay)?/i
  const copayMatch = raw.match(copayPattern)
  if (copayMatch && !raw.toLowerCase().includes('allowance')) {
    return {
      type: 'flat_copay',
      copay: parseInt(copayMatch[1]),
      rawFormula: raw
    }
  }

  // Pattern: "100% of balance over $X" (full overage - no discount)
  const fullOveragePattern = /100%\s*(?:of\s*)?balance\s*over\s*\$(\d+)/i
  const fullOverageMatch = raw.match(fullOveragePattern)
  if (fullOverageMatch) {
    return {
      type: 'copay_plus_overage',
      copay: 0,
      overagePct: 1.0,
      allowance: parseInt(fullOverageMatch[1]),
      rawFormula: raw
    }
  }

  return { type: 'unknown', rawFormula: raw }
}

/**
 * Calculate patient cost using a parsed formula
 */
export function calculateFromFormula(
  formula: ParsedFormula,
  retailPrice: number
): { cost: number; note: string } {
  switch (formula.type) {
    case 'flat_copay':
      return {
        cost: formula.copay ?? 0,
        note: formula.copay === 0 ? 'No copay' : `$${formula.copay} copay`
      }

    case 'discount':
      const discountedPrice = retailPrice * (1 - (formula.discountPct ?? 0))
      return {
        cost: discountedPrice,
        note: `${Math.round((formula.discountPct ?? 0) * 100)}% off retail`
      }

    case 'copay_plus_overage': {
      const copay = formula.copay ?? 0
      const allowance = formula.allowance ?? 0
      const overage = Math.max(0, retailPrice - allowance)
      const overageCharge = overage * (formula.overagePct ?? (1 - (formula.discountPct ?? 0.20)))
      const totalCost = copay + overageCharge

      if (copay > 0) {
        return {
          cost: totalCost,
          note: `$${copay} copay + ${Math.round((formula.overagePct ?? 0.80) * 100)}% of overage above $${allowance}`
        }
      }
      return {
        cost: totalCost,
        note: `${Math.round((formula.overagePct ?? 0.80) * 100)}% of balance over $${allowance} allowance`
      }
    }

    case 'up_to_allowance':
      const coverageRemaining = Math.max(0, retailPrice - (formula.allowance ?? 0))
      return {
        cost: coverageRemaining,
        note: coverageRemaining === 0
          ? `Covered (up to $${formula.allowance})`
          : `$${coverageRemaining} over $${formula.allowance} allowance`
      }

    case 'full_coverage':
      return { cost: 0, note: 'Fully covered' }

    default:
      return { cost: retailPrice, note: 'See plan details' }
  }
}

/**
 * Parse and calculate in one step
 */
export function parseAndCalculate(
  formulaString: string,
  retailPrice: number
): { formula: ParsedFormula; cost: number; note: string } {
  const formula = parseFormula(formulaString)
  const { cost, note } = calculateFromFormula(formula, retailPrice)
  return { formula, cost, note }
}
