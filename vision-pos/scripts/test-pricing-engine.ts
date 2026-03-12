/**
 * Test script for EyeMed Pricing Engine
 * Run with: npx tsx scripts/test-pricing-engine.ts
 */

import {
  calculateEyeMedPricing,
  generatePatientPriceList,
  formatCurrency,
  getPriceListSummary,
  EYEMED_PRODUCTS,
  parseFormula,
  calculateFromFormula
} from '../src/lib/pricing-engine/eyemed'
import { ANGELA_CLAYTON_BENEFITS, CHILD_BENEFITS } from '../src/lib/pricing-engine/eyemed/test-data'

console.log('═══════════════════════════════════════════════════════════')
console.log('          EYEMED PRICING ENGINE TEST')
console.log('═══════════════════════════════════════════════════════════\n')

// Test 1: Formula Parser
console.log('📋 TEST 1: Formula Parser')
console.log('─────────────────────────')

const formulas = [
  '$0 copay',
  '$25 copay',
  '$45',
  '20% off retail price',
  '$25 copay; 20% off retail price less $120 allowance',
  '$0 copay; 20% off balance over $180 allowance',
  'Up to $39',
  '100% of balance over $130 allowance'
]

for (const formula of formulas) {
  const parsed = parseFormula(formula)
  console.log(`  "${formula}"`)
  console.log(`    → type: ${parsed.type}, copay: ${parsed.copay ?? 'n/a'}, discount: ${parsed.discountPct ?? 'n/a'}, allowance: ${parsed.allowance ?? 'n/a'}`)
}

console.log()

// Test 2: Angela Clayton Pricing
console.log('📋 TEST 2: Angela Clayton Price List')
console.log('─────────────────────────────────────')
console.log(`Patient: ${ANGELA_CLAYTON_BENEFITS.patient_name}`)
console.log(`Plan: ${ANGELA_CLAYTON_BENEFITS.plan_name}`)
console.log(`Member ID: ${ANGELA_CLAYTON_BENEFITS.member_id}`)
console.log(`Age: ${ANGELA_CLAYTON_BENEFITS.patient_age}\n`)

const results = calculateEyeMedPricing(ANGELA_CLAYTON_BENEFITS)
const summary = getPriceListSummary(results)

// Group by category
const byCategory = new Map<string, typeof results>()
for (const result of results) {
  const cat = result.product.category
  if (!byCategory.has(cat)) byCategory.set(cat, [])
  byCategory.get(cat)!.push(result)
}

for (const [category, items] of byCategory) {
  console.log(`\n┌─ ${category} ─────────────────────────────────────`)
  for (const item of items) {
    const retail = formatCurrency(item.product.retail)
    const patient = formatCurrency(item.patientCost)
    const savings = item.product.retail - item.patientCost
    const savingsStr = savings > 0 ? `(saves ${formatCurrency(savings)})` : ''
    console.log(`│ ${item.product.name.padEnd(35)} ${retail.padStart(8)} → ${patient.padStart(8)}  ${item.note} ${savingsStr}`)
  }
  console.log('└' + '─'.repeat(60))
}

console.log('\n📊 Summary:')
console.log(`  Total products: ${summary.totalProducts}`)
console.log(`  Covered products: ${summary.coveredProducts}`)
console.log(`  Cash only: ${summary.cashOnlyProducts}`)
console.log(`  Total retail value: ${formatCurrency(summary.totalRetailValue)}`)
console.log(`  Total patient cost: ${formatCurrency(summary.totalPatientCost)}`)

// Test 3: Child pricing (poly should be free)
console.log('\n\n📋 TEST 3: Child Pricing (Age-Based Rules)')
console.log('───────────────────────────────────────────')
console.log(`Testing: Polycarbonate for child (age ${CHILD_BENEFITS.patient_age})`)

const childResults = calculateEyeMedPricing(CHILD_BENEFITS)
const polyResult = childResults.find(r => r.product.name === 'Polycarbonate')

if (polyResult) {
  console.log(`  Retail: ${formatCurrency(polyResult.product.retail)}`)
  console.log(`  Patient Cost: ${formatCurrency(polyResult.patientCost)}`)
  console.log(`  Note: ${polyResult.note}`)
  console.log(`  ✓ ${polyResult.patientCost === 0 ? 'PASS: Poly is free for child' : 'FAIL: Poly should be free'}`)
}

// Test 4: UV Surcharge
console.log('\n📋 TEST 4: UV Surcharge on Crizal')
console.log('──────────────────────────────────')

const crizalProducts = results.filter(r =>
  r.product.name.includes('Crizal')
)

for (const result of crizalProducts) {
  console.log(`  ${result.product.name}:`)
  console.log(`    Retail: ${formatCurrency(result.product.retail)}`)
  console.log(`    Patient Cost: ${formatCurrency(result.patientCost)}`)
  console.log(`    Note: ${result.note}`)
  const hasSurcharge = result.note.includes('UV surcharge')
  console.log(`    ✓ ${hasSurcharge ? 'Has UV surcharge' : 'No surcharge detected'}`)
}

// Test 5: Progressive Tier 4 with overage formula
console.log('\n📋 TEST 5: Progressive Tier 4 Overage Calculation')
console.log('──────────────────────────────────────────────────')

const progressives = results.filter(r =>
  r.product.type === 'progressive_tier_4'
)

for (const result of progressives) {
  console.log(`  ${result.product.name}:`)
  console.log(`    Retail: ${formatCurrency(result.product.retail)}`)
  console.log(`    Patient Cost: ${formatCurrency(result.patientCost)}`)
  console.log(`    Note: ${result.note}`)
  if (result.breakdown) {
    console.log(`    Breakdown:`)
    console.log(`      - Base copay: $${result.breakdown.baseCopay ?? 'n/a'}`)
    console.log(`      - Allowance: $${result.breakdown.allowance ?? 'n/a'}`)
    console.log(`      - Overage: $${result.breakdown.overage ?? 'n/a'}`)
    console.log(`      - Discount: ${result.breakdown.discount ? (result.breakdown.discount * 100) + '%' : 'n/a'}`)
  }
}

console.log('\n═══════════════════════════════════════════════════════════')
console.log('                    TESTS COMPLETE')
console.log('═══════════════════════════════════════════════════════════\n')
