/**
 * EyeMed Formula Parser
 *
 * Parses benefit strings from authorizations and calculates patient OOP.
 *
 * Examples of benefit strings this handles:
 * - "$45 copay"
 * - "$120 frame allowance"
 * - "$250 allowance; 20% off balance over allowance"
 * - "$90 progressive; 20% off retail price less $120 allowance"
 * - "covered" / "no copay"
 * - "not covered"
 */

import {
  FormulaType,
  FormulaComponent,
  ParsedFormula,
  FormulaResult,
  FormulaBreakdown,
  ParsingError,
} from './eyemed-formula-types'

/**
 * Parse a benefit string into a structured formula
 */
export function parseFormula(input: string | number | null): ParsedFormula {
  // Handle edge cases
  if (input === null || input === undefined || input === '') {
    return {
      type: FormulaType.COVERED,
      rawInput: input ? String(input) : '',
      components: [],
      description: 'No copay / Covered',
    }
  }

  const raw = String(input).trim().toLowerCase()

  // Detect covered formulas
  if (
    raw === 'covered' ||
    raw === 'no copay' ||
    raw === '$0' ||
    raw === '0' ||
    raw === '$0 copay'
  ) {
    return {
      type: FormulaType.COVERED,
      rawInput: String(input),
      components: [],
      description: 'No copay / Covered',
    }
  }

  // Detect not covered
  if (raw === 'not covered' || raw === 'not applicable' || raw === 'na') {
    return {
      type: FormulaType.NOT_COVERED,
      rawInput: String(input),
      components: [],
      description: 'Not covered',
    }
  }

  // Try to match specific patterns
  // Pattern 1: Simple copay "$45 copay" or "$45"
  const copayMatch = raw.match(/\$?(\d+(?:\.\d{2})?)\s*(?:copay|co-pay)?$/i)
  if (copayMatch) {
    const amount = parseFloat(copayMatch[1])
    return {
      type: FormulaType.FIXED_COPAY,
      rawInput: String(input),
      components: [{ type: 'copay', value: amount, operator: 'fixed' }],
      description: `$${amount} copay`,
    }
  }

  // Pattern 2: Allowance "$250 allowance" or "$250 frame allowance"
  const allowanceSimpleMatch = raw.match(/\$?(\d+(?:\.\d{2})?)\s*(?:frame|material)?\s*allowance/i)
  if (allowanceSimpleMatch) {
    const amount = parseFloat(allowanceSimpleMatch[1])
    return {
      type: FormulaType.ALLOWANCE,
      rawInput: String(input),
      components: [{ type: 'allowance', value: amount }],
      description: `$${amount} allowance`,
    }
  }

  // Pattern 3: Complex formula with allowance + overage discount
  // Examples:
  // "$120 allowance; 20% off balance over $120"
  // "$250 allowance; 20% off overage"
  // "$90 progressive; 20% off balance over allowance"
  const complexMatch = raw.match(
    /\$?(\d+(?:\.\d{2})?)\s*(?:frame|progressive|material)?\s*allowance;?\s*(\d+)%\s*off\s*(?:balance\s*)?(?:over|remaining|the)?(?:\s*\$?(\d+(?:\.\d{2})?))?\s*(?:allowance)?/i
  )
  if (complexMatch) {
    const allowance = parseFloat(complexMatch[1])
    const discountPercent = parseFloat(complexMatch[2])
    const overageThreshold = complexMatch[3] ? parseFloat(complexMatch[3]) : allowance

    return {
      type: FormulaType.ALLOWANCE_WITH_OVERAGE,
      rawInput: String(input),
      components: [
        { type: 'allowance', value: allowance },
        { type: 'discount', value: discountPercent / 100, operator: 'percent', appliesToOverage: true },
      ],
      description: `$${allowance} allowance; ${discountPercent}% off overage`,
    }
  }

  // Pattern 4: Tiered allowance with different amounts
  // "$90 progressive; 20% off retail price less $120 allowance"
  const tieredMatch = raw.match(
    /\$?(\d+(?:\.\d{2})?)\s*(?:progressive|tier)?;?\s*(\d+)%\s*off\s*(?:retail\s*)?(?:less|minus)?\s*\$?(\d+(?:\.\d{2})?)/i
  )
  if (tieredMatch) {
    const copay = parseFloat(tieredMatch[1])
    const discountPercent = parseFloat(tieredMatch[2])
    const allowance = parseFloat(tieredMatch[3])

    return {
      type: FormulaType.TIERED_ALLOWANCE,
      rawInput: String(input),
      components: [
        { type: 'copay', value: copay, operator: 'fixed' },
        { type: 'discount', value: discountPercent / 100, operator: 'percent', appliesToOverage: true },
        { type: 'allowance', value: allowance },
      ],
      description: `$${copay} copay + ${discountPercent}% off retail over $${allowance}`,
    }
  }

  // Pattern 5: Percent of retail
  // "80% of retail" or "20% off retail"
  const percentMatch = raw.match(/(\d+)%\s*(?:of|off)\s*retail/i)
  if (percentMatch) {
    const percent = parseFloat(percentMatch[1])
    const isDiscount = raw.includes('off')
    return {
      type: isDiscount ? FormulaType.PERCENT_OFF_RETAIL : FormulaType.PERCENT_OF_RETAIL,
      rawInput: String(input),
      components: [{ type: 'percentage', value: percent / 100, operator: 'percent' }],
      description: `${percent}% ${isDiscount ? 'off' : 'of'} retail`,
    }
  }

  // If we can't parse it, return as unknown but try to extract a numeric value
  const anyNumberMatch = raw.match(/\$?(\d+(?:\.\d{2})?)/i)
  if (anyNumberMatch) {
    const amount = parseFloat(anyNumberMatch[1])
    return {
      type: FormulaType.COMPLEX_FORMULA,
      rawInput: String(input),
      components: [{ type: 'copay', value: amount, operator: 'fixed' }],
      description: `Unparsed formula (extracted $${amount})`,
    }
  }

  // Completely unparseable
  return {
    type: FormulaType.COMPLEX_FORMULA,
    rawInput: String(input),
    components: [],
    description: `Could not parse: "${input}"`,
  }
}

/**
 * Calculate patient OOP (out-of-pocket) given a formula and retail price
 */
export function calculateFormulaResult(
  parsed: ParsedFormula,
  retailPrice: number
): FormulaResult {
  const breakdown: FormulaBreakdown = {
    step1_retailPrice: retailPrice,
    step2_allowanceOrCopay: 'TBD',
    step5_patientResponsibility: 0,
    notes: [],
  }

  let patientOop = 0
  let insurancePays = 0

  switch (parsed.type) {
    case FormulaType.FIXED_COPAY: {
      const copay = parsed.components[0]?.value ?? 0
      breakdown.step2_allowanceOrCopay = copay
      patientOop = Math.min(copay, retailPrice) // Can't pay more than retail
      insurancePays = Math.max(0, retailPrice - patientOop)
      breakdown.notes.push(`Patient pays fixed copay of $${copay}`)
      break
    }

    case FormulaType.ALLOWANCE: {
      const allowance = parsed.components[0]?.value ?? 0
      breakdown.step2_allowanceOrCopay = allowance
      insurancePays = Math.min(allowance, retailPrice)
      patientOop = Math.max(0, retailPrice - insurancePays)
      breakdown.notes.push(`Insurance covers up to $${allowance} allowance`)
      if (patientOop > 0) {
        breakdown.notes.push(`Patient pays overage of $${patientOop}`)
      }
      break
    }

    case FormulaType.ALLOWANCE_WITH_OVERAGE: {
      const allowance = parsed.components[0]?.value ?? 0
      const discountComponent = parsed.components[1]
      const discountPercent = discountComponent?.value ?? 0.20

      breakdown.step2_allowanceOrCopay = allowance
      insurancePays = Math.min(allowance, retailPrice)

      const overage = Math.max(0, retailPrice - allowance)
      breakdown.step3_overage = overage

      // Apply discount to overage
      const overageAfterDiscount = overage * (1 - discountPercent)
      breakdown.step4_overageDiscount = overage - overageAfterDiscount

      patientOop = insurancePays === allowance ? overageAfterDiscount : overage
      if (overage > 0) {
        insurancePays += breakdown.step4_overageDiscount
      }

      breakdown.notes.push(`Insurance covers $${allowance} allowance`)
      if (overage > 0) {
        breakdown.notes.push(
          `Overage of $${overage} discounted by ${discountPercent * 100}% = $${overageAfterDiscount}`
        )
      }
      break
    }

    case FormulaType.TIERED_ALLOWANCE: {
      const copay = parsed.components[0]?.value ?? 0
      const discountPercent = parsed.components[1]?.value ?? 0.20
      const allowance = parsed.components[2]?.value ?? 0

      breakdown.step2_allowanceOrCopay = copay

      if (retailPrice <= allowance) {
        // Below allowance: patient pays copay
        patientOop = copay
        insurancePays = retailPrice - copay
      } else {
        // Above allowance: patient pays copay + discounted overage
        const overage = retailPrice - allowance
        breakdown.step3_overage = overage
        const discountedOverage = overage * (1 - discountPercent)
        breakdown.step4_overageDiscount = overage - discountedOverage

        patientOop = copay + discountedOverage
        insurancePays = allowance - copay + breakdown.step4_overageDiscount
      }

      breakdown.notes.push(`Patient copay: $${copay}`)
      breakdown.notes.push(`Allowance: $${allowance}`)
      break
    }

    case FormulaType.PERCENT_OF_RETAIL: {
      const percent = parsed.components[0]?.value ?? 0.8
      insurancePays = retailPrice * percent
      patientOop = retailPrice - insurancePays
      breakdown.notes.push(`Insurance pays ${percent * 100}% of $${retailPrice} = $${insurancePays}`)
      break
    }

    case FormulaType.PERCENT_OFF_RETAIL: {
      const discountPercent = parsed.components[0]?.value ?? 0.2
      const discount = retailPrice * discountPercent
      patientOop = retailPrice - discount
      insurancePays = discount
      breakdown.notes.push(`${discountPercent * 100}% discount applied to retail`)
      break
    }

    case FormulaType.COVERED:
      patientOop = 0
      insurancePays = retailPrice
      breakdown.notes.push('Product fully covered')
      break

    case FormulaType.NOT_COVERED:
      patientOop = retailPrice
      insurancePays = 0
      breakdown.notes.push('Product not covered')
      break

    default:
      // For unparseable/complex formulas, assume copay of 0
      patientOop = 0
      insurancePays = retailPrice
      breakdown.notes.push('Could not parse formula - assuming covered')
  }

  breakdown.step5_patientResponsibility = patientOop

  return {
    formulaType: parsed.type,
    parsedFormula: parsed,
    retailPrice,
    patientOop: Math.round(patientOop * 100) / 100,
    insurancePays: Math.round(insurancePays * 100) / 100,
    breakdown,
    notes: breakdown.notes,
  }
}

/**
 * Convenience function: parse + calculate in one call
 */
export function parseAndCalculate(
  input: string | number | null,
  retailPrice: number
): FormulaResult {
  const parsed = parseFormula(input)
  return calculateFormulaResult(parsed, retailPrice)
}
