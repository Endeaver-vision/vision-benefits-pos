/**
 * EyeMed Unified Pricing Engine
 *
 * Uses:
 * - eyemed-master-pricing.ts (insurance term → products with retail prices)
 * - benefit-parser.ts (parses pricing formulas)
 * - static-rules.ts (UV surcharge, age rules)
 */

import {
  EYEMED_MASTER_MAP,
  findByInsuranceTerm,
  findProduct,
  Product
} from '../Reference-Docs/Eyemed Only/eyemed-master-pricing'

import {
  parseBenefitString,
  calculateFromBenefit,
  ParsedBenefit
} from '../Reference-Docs/Eyemed Only/benefit-parser'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PatientBenefits {
  patientName: string
  patientAge: number
  memberId?: string
  planName?: string

  // Raw benefit strings from auth PDF
  benefits: Record<string, string>
}

export interface PricedProduct {
  productName: string
  retail: number
  insuranceTerm: string
  benefitString: string
  parsed: ParsedBenefit
  calculatedCost: number
  uvSurcharge: number
  finalPatientCost: number
  notes: string
}

export interface PricingResult {
  patient: PatientBenefits
  products: PricedProduct[]
  errors: string[]
}

// ═══════════════════════════════════════════════════════════════════════════
// STATIC RULES
// ═══════════════════════════════════════════════════════════════════════════

const UV_SURCHARGE = 15
const UV_SURCHARGE_PRODUCTS = [
  'crizal sapphire',
  'crizal rock',
  'crizal ez pro',
  'crizal sunshield'
]

function requiresUVSurcharge(productName: string): boolean {
  const lower = productName.toLowerCase()
  return UV_SURCHARGE_PRODUCTS.some(p => lower.includes(p))
}

function isFreeForChild(product: Product, age: number): boolean {
  return product.ageRule === 'freeUnder19' && age < 19
}

// ═══════════════════════════════════════════════════════════════════════════
// BENEFIT MATCHING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find the benefit string for a product from the patient's benefits
 */
function findBenefitForProduct(
  productName: string,
  benefits: Record<string, string>
): { insuranceTerm: string; benefitString: string } | null {
  // First, find what insurance term this product maps to
  const productInfo = findProduct(productName)
  if (!productInfo) {
    return null
  }

  const { insuranceTerm } = productInfo

  // Get the entry from master map to find match patterns
  const categoryData = EYEMED_MASTER_MAP[productInfo.category as keyof typeof EYEMED_MASTER_MAP]
  if (!categoryData) return null

  const termEntry = categoryData[insuranceTerm]
  if (!termEntry) return null

  // Look through the patient's benefits for a matching term
  for (const matchPattern of termEntry.match) {
    const normalizedPattern = matchPattern.toLowerCase()

    for (const [benefitKey, benefitValue] of Object.entries(benefits)) {
      const normalizedKey = benefitKey.toLowerCase()

      if (normalizedKey.includes(normalizedPattern) ||
          normalizedPattern.includes(normalizedKey)) {
        return { insuranceTerm: benefitKey, benefitString: benefitValue }
      }
    }
  }

  // Try direct match on insurance term name
  for (const [benefitKey, benefitValue] of Object.entries(benefits)) {
    const normalizedKey = benefitKey.toLowerCase()
    const normalizedTerm = insuranceTerm.toLowerCase()

    if (normalizedKey.includes(normalizedTerm) ||
        normalizedTerm.includes(normalizedKey)) {
      return { insuranceTerm: benefitKey, benefitString: benefitValue }
    }
  }

  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PRICING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate price for a single product
 */
export function priceProduct(
  productName: string,
  benefits: Record<string, string>,
  patientAge: number
): PricedProduct | null {
  const productInfo = findProduct(productName)
  if (!productInfo) {
    return null
  }

  const { product, insuranceTerm } = productInfo

  // Check if cash only
  if (product.cashOnly) {
    return {
      productName: product.name,
      retail: product.retail,
      insuranceTerm: 'Cash Only',
      benefitString: 'Not covered',
      parsed: { type: 'not_covered', rawValue: 'Cash Only' },
      calculatedCost: product.retail,
      uvSurcharge: 0,
      finalPatientCost: product.retail,
      notes: 'Cash only - not covered by insurance'
    }
  }

  // Check age rule (free poly under 19)
  if (isFreeForChild(product, patientAge)) {
    return {
      productName: product.name,
      retail: product.retail,
      insuranceTerm,
      benefitString: 'Covered (under 19)',
      parsed: { type: 'covered', copay: 0, rawValue: 'Free under 19' },
      calculatedCost: 0,
      uvSurcharge: 0,
      finalPatientCost: 0,
      notes: `Free for patients under 19 (age: ${patientAge})`
    }
  }

  // Find the benefit string
  const benefitMatch = findBenefitForProduct(productName, benefits)
  if (!benefitMatch) {
    // Fallback: check for "All Other Lens Options" which is usually 20% off
    const fallback = benefits['All Other Lens Options'] || benefits['all other lens options']
    if (fallback) {
      const parsed = parseBenefitString(fallback)
      const result = calculateFromBenefit(parsed, product.retail)
      const uvSurcharge = requiresUVSurcharge(product.name) ? UV_SURCHARGE : 0

      return {
        productName: product.name,
        retail: product.retail,
        insuranceTerm: 'All Other Lens Options (fallback)',
        benefitString: fallback,
        parsed,
        calculatedCost: result.cost,
        uvSurcharge,
        finalPatientCost: result.cost + uvSurcharge,
        notes: `Fallback to "All Other Lens Options": ${result.note}`
      }
    }

    return {
      productName: product.name,
      retail: product.retail,
      insuranceTerm: 'Not found',
      benefitString: 'N/A',
      parsed: { type: 'unknown', rawValue: 'No matching benefit found' },
      calculatedCost: product.retail,
      uvSurcharge: 0,
      finalPatientCost: product.retail,
      notes: 'No matching benefit found - check auth PDF'
    }
  }

  // Parse the benefit string and calculate
  const parsed = parseBenefitString(benefitMatch.benefitString)
  const result = calculateFromBenefit(parsed, product.retail)
  const uvSurcharge = requiresUVSurcharge(product.name) ? UV_SURCHARGE : 0

  return {
    productName: product.name,
    retail: product.retail,
    insuranceTerm: benefitMatch.insuranceTerm,
    benefitString: benefitMatch.benefitString,
    parsed,
    calculatedCost: result.cost,
    uvSurcharge,
    finalPatientCost: result.cost + uvSurcharge,
    notes: result.note + (uvSurcharge > 0 ? ` + $${uvSurcharge} UV surcharge` : '')
  }
}

/**
 * Price multiple products for a patient
 */
export function pricePatient(
  patient: PatientBenefits,
  productNames: string[]
): PricingResult {
  const products: PricedProduct[] = []
  const errors: string[] = []

  for (const name of productNames) {
    const result = priceProduct(name, patient.benefits, patient.patientAge)
    if (result) {
      products.push(result)
    } else {
      errors.push(`Product not found: ${name}`)
    }
  }

  return { patient, products, errors }
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function formatPricingResult(result: PricingResult): string {
  const lines: string[] = []

  lines.push('═'.repeat(70))
  lines.push(`PATIENT: ${result.patient.patientName} (Age: ${result.patient.patientAge})`)
  if (result.patient.planName) lines.push(`PLAN: ${result.patient.planName}`)
  lines.push('═'.repeat(70))

  for (const p of result.products) {
    lines.push('')
    lines.push(`📦 ${p.productName}`)
    lines.push(`   Retail: $${p.retail.toFixed(2)}`)
    lines.push(`   Insurance Term: ${p.insuranceTerm}`)
    lines.push(`   Benefit: "${p.benefitString}"`)
    lines.push(`   Parsed: ${JSON.stringify(p.parsed)}`)
    lines.push(`   Calculation: ${p.notes}`)
    if (p.uvSurcharge > 0) {
      lines.push(`   Base cost: $${p.calculatedCost.toFixed(2)} + UV: $${p.uvSurcharge}`)
    }
    lines.push(`   → PATIENT PAYS: $${p.finalPatientCost.toFixed(2)}`)
  }

  if (result.errors.length > 0) {
    lines.push('')
    lines.push('ERRORS:')
    for (const e of result.errors) {
      lines.push(`  ⚠️ ${e}`)
    }
  }

  lines.push('')
  lines.push('═'.repeat(70))

  return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL VALIDATION HELPER
// ═══════════════════════════════════════════════════════════════════════════

export function manualValidation(
  productName: string,
  retail: number,
  benefitString: string,
  patientAge: number
): { expected: number; formula: string } {
  const parsed = parseBenefitString(benefitString)
  const uvSurcharge = requiresUVSurcharge(productName) ? UV_SURCHARGE : 0

  let expected: number
  let formula: string

  switch (parsed.type) {
    case 'covered':
      expected = 0 + uvSurcharge
      formula = `$0 (covered)${uvSurcharge ? ` + $${uvSurcharge} UV` : ''}`
      break

    case 'flat':
      expected = (parsed.copay ?? retail) + uvSurcharge
      formula = `$${parsed.copay} copay${uvSurcharge ? ` + $${uvSurcharge} UV` : ''}`
      break

    case 'discount':
      const discountedPrice = retail * (1 - (parsed.discount ?? 0))
      expected = discountedPrice + uvSurcharge
      formula = `$${retail} × ${(1 - (parsed.discount ?? 0)).toFixed(2)} = $${discountedPrice.toFixed(2)}${uvSurcharge ? ` + $${uvSurcharge} UV` : ''}`
      break

    case 'copay_plus_overage': {
      const copay = parsed.copay ?? 0
      const allowance = parsed.allowance ?? 0
      const discount = parsed.discount ?? 0
      const overage = Math.max(0, retail - allowance)
      const discountedOverage = overage * (1 - discount)
      expected = copay + discountedOverage + uvSurcharge
      formula = `$${copay} + ($${retail} - $${allowance}) × ${(1 - discount).toFixed(2)} = $${copay} + $${overage} × ${(1 - discount).toFixed(2)} = $${copay} + $${discountedOverage.toFixed(2)} = $${(copay + discountedOverage).toFixed(2)}${uvSurcharge ? ` + $${uvSurcharge} UV` : ''}`
      break
    }

    case 'discount_with_allowance': {
      const copay2 = parsed.copay ?? 0
      const allowance2 = parsed.allowance ?? 0
      const discount2 = parsed.discount ?? 0
      const base2 = Math.max(0, retail - allowance2)
      const discountedBase2 = base2 * (1 - discount2)
      expected = copay2 + discountedBase2 + uvSurcharge
      formula = `$${copay2} + ($${retail} - $${allowance2}) × ${(1 - discount2).toFixed(2)} = $${copay2} + $${base2} × ${(1 - discount2).toFixed(2)} = $${copay2} + $${discountedBase2.toFixed(2)} = $${(copay2 + discountedBase2).toFixed(2)}${uvSurcharge ? ` + $${uvSurcharge} UV` : ''}`
      break
    }

    default:
      expected = retail + uvSurcharge
      formula = `Full retail: $${retail}${uvSurcharge ? ` + $${uvSurcharge} UV` : ''}`
  }

  return { expected: Math.round(expected * 100) / 100, formula }
}
