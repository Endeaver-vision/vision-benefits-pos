/**
 * Test the Elemental EyeMed Pricing Engine
 *
 * Tests the simplified flow:
 *   PRODUCT → TIER → BENEFIT → COST
 */

import {
  getProgressiveTier,
  getARTier,
  requiresUVSurcharge
} from '../src/lib/pricing-engine/eyemed/formulary'

import {
  parseBenefitString,
  parseAndCalculate
} from '../src/lib/pricing-engine/eyemed/benefit-parser'

// Angela Clayton's benefits (from her auth PDF)
const ANGELA_BENEFITS = {
  exam: '$0 copay',
  progressive_standard: '$25 copay',
  progressive_premium_tier_1: '$60',
  progressive_premium_tier_2: '$85',
  progressive_premium_tier_3: '$110',
  progressive_premium_tier_4: '$25 copay; 20% off balance over $120 allowance',
  progressive_premium_tier_5: null, // Falls back to tier_4

  ar_standard: '$45',
  ar_premium_tier_1: '$60',
  ar_premium_tier_2: '20% off retail',
  ar_premium_tier_3: '20% off retail',

  material_poly_adult: '$40',
  material_poly_child: 'Covered',
  material_hi: '20% off retail',

  photochromic: '20% off retail',
  polarized: '20% off retail'
}

const PATIENT_AGE = 54 // Angela is 54, so poly is NOT free

console.log('═══════════════════════════════════════════════════════════════')
console.log('ELEMENTAL EYEMED PRICING TEST')
console.log('Patient: Angela Clayton, Age 54')
console.log('═══════════════════════════════════════════════════════════════')
console.log('')

// Test products with retail prices
const testProducts = [
  // Progressives
  { name: 'Varilux X Design', retail: 350, category: 'progressive' },
  { name: 'Varilux Comfort Max', retail: 295, category: 'progressive' },
  { name: 'Varilux Comfort DRx', retail: 250, category: 'progressive' },

  // AR Coatings
  { name: 'Crizal Sapphire 360', retail: 187, category: 'ar' },
  { name: 'Crizal Rock', retail: 175, category: 'ar' },
  { name: 'Standard AR', retail: 65, category: 'ar' },

  // Materials
  { name: 'Polycarbonate', retail: 60, category: 'material' },
  { name: 'Hi-Index 1.67', retail: 120, category: 'material' }
]

function calculateProductCost(product: { name: string; retail: number; category: string }) {
  const { name, retail, category } = product
  let tier: string
  let benefitKey: string
  let benefitValue: string | null

  if (category === 'progressive') {
    tier = getProgressiveTier(name)
    benefitKey = tier === 'standard'
      ? 'progressive_standard'
      : `progressive_premium_${tier}`
    benefitValue = (ANGELA_BENEFITS as any)[benefitKey]

    // Tier 5 fallback
    if (benefitValue === null && tier === 'tier_5') {
      benefitKey = 'progressive_premium_tier_4'
      benefitValue = ANGELA_BENEFITS.progressive_premium_tier_4
    }
  } else if (category === 'ar') {
    tier = getARTier(name)
    benefitKey = tier === 'standard'
      ? 'ar_standard'
      : `ar_premium_${tier}`
    benefitValue = (ANGELA_BENEFITS as any)[benefitKey]
  } else if (category === 'material') {
    if (name.toLowerCase().includes('poly')) {
      tier = 'poly'
      benefitKey = PATIENT_AGE < 19 ? 'material_poly_child' : 'material_poly_adult'
      benefitValue = (ANGELA_BENEFITS as any)[benefitKey]
    } else {
      tier = 'hi-index'
      benefitKey = 'material_hi'
      benefitValue = ANGELA_BENEFITS.material_hi
    }
  } else {
    tier = 'unknown'
    benefitKey = 'unknown'
    benefitValue = null
  }

  // Parse and calculate
  const result = parseAndCalculate(benefitValue, retail)

  // Apply static rules (UV surcharge for Crizal)
  let uvSurcharge = 0
  if (requiresUVSurcharge(name)) {
    uvSurcharge = 15
  }

  const finalCost = result.cost + uvSurcharge

  return {
    name,
    retail,
    tier,
    benefitKey,
    benefitValue,
    baseCost: result.cost,
    uvSurcharge,
    finalCost,
    note: result.note + (uvSurcharge > 0 ? ' + $15 UV surcharge' : '')
  }
}

console.log('STEP 1: PRODUCT → TIER LOOKUP')
console.log('─────────────────────────────────────────────────────────────────')
for (const product of testProducts) {
  const tier = product.category === 'progressive'
    ? getProgressiveTier(product.name)
    : product.category === 'ar'
      ? getARTier(product.name)
      : 'N/A'
  console.log(`  ${product.name.padEnd(25)} → ${tier}`)
}
console.log('')

console.log('STEP 2: BENEFIT PARSING')
console.log('─────────────────────────────────────────────────────────────────')
const testBenefits = [
  '$45 copay',
  '20% off retail',
  '$25 copay; 20% off balance over $120 allowance',
  'Covered',
  '$0'
]
for (const benefit of testBenefits) {
  const parsed = parseBenefitString(benefit)
  console.log(`  "${benefit}"`)
  console.log(`     → type: ${parsed.type}, copay: ${parsed.copay ?? '-'}, discount: ${parsed.discount ?? '-'}, allowance: ${parsed.allowance ?? '-'}`)
}
console.log('')

console.log('STEP 3: FULL CALCULATION')
console.log('─────────────────────────────────────────────────────────────────')
for (const product of testProducts) {
  const result = calculateProductCost(product)
  console.log(`\n  ${result.name}`)
  console.log(`     Retail: $${result.retail}`)
  console.log(`     Tier: ${result.tier}`)
  console.log(`     Benefit: "${result.benefitValue}" (${result.benefitKey})`)
  console.log(`     Calculation: ${result.note}`)
  console.log(`     → Patient pays: $${result.finalCost.toFixed(2)}`)
}

console.log('')
console.log('═══════════════════════════════════════════════════════════════')
console.log('VALIDATION CHECKS')
console.log('═══════════════════════════════════════════════════════════════')

const checks = [
  {
    product: 'Varilux X Design',
    expected: 209,
    description: 'Tier 5 → fallback to Tier 4: $25 + ($350-$120)×0.80 = $25 + $184 = $209'
  },
  {
    product: 'Varilux Comfort Max',
    expected: 165,
    description: 'Tier 4: $25 + ($295-$120)×0.80 = $25 + $140 = $165'
  },
  {
    product: 'Crizal Sapphire 360',
    expected: 164.60,
    description: 'Tier 3 AR (20% off $187) + $15 UV = $149.60 + $15 = $164.60'
  },
  {
    product: 'Polycarbonate',
    expected: 40,
    description: 'Adult poly: $40 copay'
  }
]

let allPassed = true
for (const check of checks) {
  const product = testProducts.find(p => p.name === check.product)!
  const result = calculateProductCost(product)
  const passed = Math.abs(result.finalCost - check.expected) < 0.01
  const status = passed ? '✓' : '✗'
  allPassed = allPassed && passed

  console.log(`  ${status} ${check.product}`)
  console.log(`    Expected: $${check.expected}`)
  console.log(`    Got:      $${result.finalCost.toFixed(2)}`)
  console.log(`    ${check.description}`)
  console.log('')
}

console.log('═══════════════════════════════════════════════════════════════')
if (allPassed) {
  console.log('ALL TESTS PASSED ✓')
} else {
  console.log('SOME TESTS FAILED ✗')
  process.exit(1)
}
console.log('═══════════════════════════════════════════════════════════════')
