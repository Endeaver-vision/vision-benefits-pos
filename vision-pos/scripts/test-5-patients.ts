/**
 * Test 5 EyeMed Patients - Pricing Validation
 *
 * For each patient:
 * 1. Extract benefits from auth PDF
 * 2. Price key products
 * 3. Manually validate each calculation
 * 4. Report pass/fail
 */

import {
  priceProduct,
  manualValidation,
  PricedProduct
} from './eyemed-pricing-engine'

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT 1: ANGELA CLAYTON (AC)
// DOB: 02/15/1970 (Age ~55)
// Network: Access 101 FF 360
// ═══════════════════════════════════════════════════════════════════════════

const ANGELA_CLAYTON = {
  name: 'Angela Clayton',
  age: 55,
  planName: 'Access 101 FF 360',
  benefits: {
    'Exam': '$0 copay',
    'Retinal Imaging': 'Up to $39',
    'Fit and Follow-up - Standard': '$0 copay',
    'Fit and Follow-up - Premium': '$0 copay; 10% off retail price less $55 allowance',
    'Frame': '$0 copay; 20% off balance over $180 allowance',
    'Single Vision': '$25 copay',
    'Bifocal': '$25 copay',
    'Trifocal': '$25 copay',
    'Progressive - Standard': '$25 copay',
    'Progressive - Premium Tier 4': '$25 copay; 20% off retail price less $120 allowance',
    'Progressive - Premium': '$25 copay; 20% off retail price less $120 allowance',
    'Anti Reflective Coating - Standard': '$45',
    'Anti Reflective Coating - Premium': '20% off retail price',
    'Polycarbonate - Standard - age 19 and over': '$40',
    'Polycarbonate - Standard - under age 19': '$0 copay',
    'Polycarbonate - Standard': '$40',  // For matching
    'Tint - Solid and Gradient': '$15',
    'UV Treatment': '$15',
    'All Other Lens Options': '20% off retail price',
    'Photochromic - Non-Glass': '20% off retail price'  // Falls under "All Other"
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST PRODUCTS - Key items to validate
// ═══════════════════════════════════════════════════════════════════════════

const TEST_PRODUCTS = [
  'Varilux X',           // Progressive Premium Tier 4: $615 retail
  'Varilux Comfort Max', // Progressive Premium Tier 4: $409 retail
  'Varilux Comfort DRx', // Progressive Premium Tier 3: $280 retail
  'Crizal Sapphire',     // AR Premium Tier 3: $187 retail + $15 UV
  'Crizal Rock',         // AR Premium Tier 3: $158 retail + $15 UV
  'Polycarbonate',       // Material: $65 retail
  'Transitions Gen S',   // Photochromic: $160 retail
  'Single Vision'        // Basic lens: $96 retail
]

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT 2: ANDREW HESS (AH)
// DOB: 09/01/1950 (Age ~74)
// Network: Insight 201 Humana W NEEA 360
// ═══════════════════════════════════════════════════════════════════════════

const ANDREW_HESS = {
  name: 'Andrew Hess',
  age: 74,
  planName: 'Insight 201 Humana W NEEA 360',
  benefits: {
    'Exam': '$0 copay',
    'Retinal Imaging': 'Up to $39',
    'Fit and Follow-up - Standard': '$0 copay',
    'Fit and Follow-up - Premium': '10% off retail price',
    'Frame': '$0 copay; 20% off balance over $250 allowance',
    'Single Vision': '$10 copay',
    'Bifocal': '$10 copay',
    'Trifocal': '$10 copay',
    'Lenticular': '20% off retail price',
    'Progressive - Standard': '$75 copay',
    'Progressive - Premium Tier 1': '$100',
    'Progressive - Premium Tier 2': '$110',
    'Progressive - Premium Tier 3': '$125',
    'Progressive - Premium Tier 4': '$90; 20% off retail price less $120 allowance',
    'Progressive - Premium': '$90; 20% off retail price less $120 allowance',  // Alias for matching
    'Anti Reflective Coating - Standard': '$25',
    'Anti Reflective Coating - Premium Tier 1': '$25',
    'Anti Reflective Coating - Premium Tier 2': '$68',
    'Anti Reflective Coating - Premium Tier 3': '20% off retail price',
    'Anti Reflective Coating - Premium': '20% off retail price',  // Alias for matching
    'Photochromic - Non-Glass': '$75',
    'Polycarbonate - Standard - age 19 and over': '$20',
    'Polycarbonate - Standard - under age 19': '$0',
    'Polycarbonate - Standard': '$20',  // For matching
    'Scratch Coating - Standard Plastic': '$0',
    'Tint - Solid and Gradient': '$0',
    'UV Treatment': '$0',
    'All Other Lens Options': '20% off retail price'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT 3: CRUZBEL BLANCO CARRENO (CB)
// DOB: 07/09/2014 (Age ~10 - CHILD, free poly!)
// Network: CIGNA Standard
// ═══════════════════════════════════════════════════════════════════════════

const CRUZBEL_BLANCO = {
  name: 'Cruzbel Blanco Carreno',
  age: 10,  // Under 19 - gets free poly!
  planName: 'CIGNA Standard',
  benefits: {
    'Exam': '$10 copay',
    'Retinal Imaging': 'Up to $39',
    'Fit and Follow-up - Standard': '$40 applied to remaining balance',
    'Fit and Follow-up - Premium': '90% of retail price applied to remaining balance',
    'Frame - Retail': '$0 copay; 20% off balance over $130 allowance',
    'Single Vision': '$20 copay',
    'Bifocal': '$20 copay',
    'Trifocal': '$20 copay',
    'Lenticular': '$20 copay',
    'Progressive - Standard': '$85 copay',
    'Progressive - Premium Tier 1': '$105 copay',
    'Progressive - Premium Tier 2': '$115 copay',
    'Progressive - Premium Tier 3': '$130 copay',
    'Progressive - Premium Tier 4': '$85 copay; 20% off retail price less $120 allowance',
    'Progressive - Premium': '$85 copay; 20% off retail price less $120 allowance',  // Alias
    'Anti Reflective Coating - Standard': '$45',
    'Anti Reflective Coating - Premium Tier 1': '$57',
    'Anti Reflective Coating - Premium Tier 2': '$68',
    'Anti Reflective Coating - Premium Tier 3': '20% off retail price',
    'Anti Reflective Coating - Premium': '20% off retail price',  // Alias
    'Photochromic - Non-Glass': '$75',
    'Polycarbonate - Standard - age 19 and over': '$40',
    'Polycarbonate - Standard - under age 19': '$0 copay',
    'Polycarbonate - Standard': '$0 copay',  // Child gets free
    'Scratch Coating - Standard Plastic': '$15',
    'Tint - Solid and Gradient': '$15',
    'UV Treatment': '$15',
    'All Other Lens Options': '20% off retail price'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT 4: JEAN BIDEGARE (JB)
// DOB: 01/14/1965 (Age ~60)
// Network: Aetna 603
// Note: Polycarbonate is FREE for everyone on this plan!
// ═══════════════════════════════════════════════════════════════════════════

const JEAN_BIDEGARE = {
  name: 'Jean Bidegare',
  age: 60,
  planName: 'Aetna 603',
  benefits: {
    'Exam': '$0 copay',
    'Retinal Imaging': 'Up to $39',
    'Fit and Follow-up - Standard': 'Up to $40',
    'Fit and Follow-up - Premium': '10% off retail price',
    'Frame': '$0 copay; 20% off balance over $160 allowance',
    'Single Vision': '$10 copay',
    'Bifocal': '$10 copay',
    'Trifocal': '$10 copay',
    'Lenticular': '$10 copay',
    'Progressive - Standard': '$75 copay',
    'Progressive - Premium Tier 1': '$95 copay',
    'Progressive - Premium Tier 2': '$105 copay',
    'Progressive - Premium Tier 3': '$120 copay',
    'Progressive - Premium Tier 4': '$75 copay; 20% off retail price less $120 allowance',
    'Progressive - Premium': '$75 copay; 20% off retail price less $120 allowance',  // Alias
    'Anti Reflective Coating - Standard': '$45',
    'Anti Reflective Coating - Premium Tier 1': '$57',
    'Anti Reflective Coating - Premium Tier 2': '$68',
    'Anti Reflective Coating - Premium Tier 3': '20% off retail price',
    'Anti Reflective Coating - Premium': '20% off retail price',  // Alias
    'Photochromic - Non-Glass': '$75',
    'Polycarbonate - Standard': '$0 copay',  // FREE for everyone!
    'Polycarbonate - Standard - age 19 and over': '$0 copay',
    'Scratch Coating - Standard Plastic': '$0 copay',
    'Tint - Solid and Gradient': '$15',
    'UV Treatment': '$15',
    'All Other Lens Options': '20% off retail price'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENT 5: MATTHEW BAKKER (MB)
// DOB: 11/29/1983 (Age ~41)
// Network: Insight 201 Humana W NEEA
// ═══════════════════════════════════════════════════════════════════════════

const MATTHEW_BAKKER = {
  name: 'Matthew Bakker',
  age: 41,
  planName: 'Insight 201 Humana W NEEA',
  benefits: {
    'Exam': '$10 copay',
    'Retinal Imaging': 'Up to $39',
    'Fit and Follow-up - Standard': 'Up to $40',
    'Fit and Follow-up - Premium': '10% off retail price',
    'Frame': '$0 copay; 20% off balance over $130 allowance',
    'Single Vision': '$15 copay',
    'Bifocal': '$15 copay',
    'Trifocal': '$15 copay',
    'Lenticular': '$15 copay',
    'Progressive - Standard': '$30 copay',
    'Progressive - Premium Tier 1': '$110 copay',
    'Progressive - Premium Tier 2': '$120 copay',
    'Progressive - Premium Tier 3': '$135 copay',
    'Progressive - Premium Tier 4': '$90 copay; 20% off retail price less $120 allowance',
    'Progressive - Premium': '$90 copay; 20% off retail price less $120 allowance',  // Alias
    'Anti Reflective Coating - Standard': '$45',
    'Anti Reflective Coating - Premium Tier 1': '$57',
    'Anti Reflective Coating - Premium Tier 2': '$68',
    'Anti Reflective Coating - Premium Tier 3': '20% off retail price',
    'Anti Reflective Coating - Premium': '20% off retail price',  // Alias
    'Photochromic - Non-Glass': '$75',
    'Polycarbonate - Standard': '$40',
    'Polycarbonate - Standard - age 19 and over': '$40',
    'Scratch Coating - Standard Plastic': '$15',
    'Tint - Solid and Gradient': '$15',
    'UV Treatment': '$15',
    'All Other Lens Options': '20% off retail price'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

interface ValidationResult {
  product: string
  retail: number
  insuranceTerm: string
  benefitString: string
  engineResult: number
  manualResult: number
  formula: string
  match: boolean
  error?: string
}

function validateProduct(
  productName: string,
  benefits: Record<string, string>,
  age: number
): ValidationResult {
  const result = priceProduct(productName, benefits, age)

  if (!result) {
    return {
      product: productName,
      retail: 0,
      insuranceTerm: 'NOT FOUND',
      benefitString: 'N/A',
      engineResult: 0,
      manualResult: 0,
      formula: 'Product not in catalog',
      match: false,
      error: 'Product not found in catalog'
    }
  }

  const manual = manualValidation(
    result.productName,
    result.retail,
    result.benefitString,
    age
  )

  const match = Math.abs(result.finalPatientCost - manual.expected) < 0.01

  return {
    product: result.productName,
    retail: result.retail,
    insuranceTerm: result.insuranceTerm,
    benefitString: result.benefitString,
    engineResult: result.finalPatientCost,
    manualResult: manual.expected,
    formula: manual.formula,
    match,
    error: match ? undefined : `Engine: $${result.finalPatientCost.toFixed(2)} vs Manual: $${manual.expected.toFixed(2)}`
  }
}

function runPatientTest(
  patientName: string,
  age: number,
  planName: string,
  benefits: Record<string, string>,
  products: string[]
): { passed: number; failed: number; results: ValidationResult[] } {
  console.log('')
  console.log('═'.repeat(70))
  console.log(`PATIENT: ${patientName} (Age: ${age})`)
  console.log(`PLAN: ${planName}`)
  console.log('═'.repeat(70))

  const results: ValidationResult[] = []
  let passed = 0
  let failed = 0

  for (const product of products) {
    const result = validateProduct(product, benefits, age)
    results.push(result)

    const status = result.match ? '✓' : '✗'
    console.log('')
    console.log(`${status} ${result.product}`)
    console.log(`  Retail: $${result.retail}`)
    console.log(`  Insurance Term: ${result.insuranceTerm}`)
    console.log(`  Benefit: "${result.benefitString}"`)
    console.log(`  Manual Formula: ${result.formula}`)
    console.log(`  Engine Result: $${result.engineResult.toFixed(2)}`)
    console.log(`  Manual Result: $${result.manualResult.toFixed(2)}`)

    if (result.match) {
      passed++
    } else {
      failed++
      console.log(`  ⚠️ MISMATCH: ${result.error}`)
    }
  }

  console.log('')
  console.log('-'.repeat(70))
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`)

  return { passed, failed, results }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔' + '═'.repeat(68) + '╗')
  console.log('║' + ' EYEMED PRICING ENGINE VALIDATION '.padStart(42).padEnd(68) + '║')
  console.log('╚' + '═'.repeat(68) + '╝')

  // Test Patient 1: Angela Clayton
  const patient1 = runPatientTest(
    ANGELA_CLAYTON.name,
    ANGELA_CLAYTON.age,
    ANGELA_CLAYTON.planName,
    ANGELA_CLAYTON.benefits,
    TEST_PRODUCTS
  )

  // Test Patient 2: Andrew Hess
  const patient2 = runPatientTest(
    ANDREW_HESS.name,
    ANDREW_HESS.age,
    ANDREW_HESS.planName,
    ANDREW_HESS.benefits,
    TEST_PRODUCTS
  )

  // Test Patient 3: Cruzbel Blanco (child - tests free poly under 19)
  const patient3 = runPatientTest(
    CRUZBEL_BLANCO.name,
    CRUZBEL_BLANCO.age,
    CRUZBEL_BLANCO.planName,
    CRUZBEL_BLANCO.benefits,
    TEST_PRODUCTS
  )

  // Test Patient 4: Jean Bidegare (free poly for everyone on this plan)
  const patient4 = runPatientTest(
    JEAN_BIDEGARE.name,
    JEAN_BIDEGARE.age,
    JEAN_BIDEGARE.planName,
    JEAN_BIDEGARE.benefits,
    TEST_PRODUCTS
  )

  // Test Patient 5: Matthew Bakker
  const patient5 = runPatientTest(
    MATTHEW_BAKKER.name,
    MATTHEW_BAKKER.age,
    MATTHEW_BAKKER.planName,
    MATTHEW_BAKKER.benefits,
    TEST_PRODUCTS
  )

  // Summary
  console.log('')
  console.log('╔' + '═'.repeat(68) + '╗')
  console.log('║' + ' FINAL RESULTS '.padStart(40).padEnd(68) + '║')
  console.log('╚' + '═'.repeat(68) + '╝')
  console.log('')
  console.log(`Patient 1 (${ANGELA_CLAYTON.name}): ${patient1.passed}/${TEST_PRODUCTS.length} passed`)
  console.log(`Patient 2 (${ANDREW_HESS.name}): ${patient2.passed}/${TEST_PRODUCTS.length} passed`)
  console.log(`Patient 3 (${CRUZBEL_BLANCO.name}): ${patient3.passed}/${TEST_PRODUCTS.length} passed`)
  console.log(`Patient 4 (${JEAN_BIDEGARE.name}): ${patient4.passed}/${TEST_PRODUCTS.length} passed`)
  console.log(`Patient 5 (${MATTHEW_BAKKER.name}): ${patient5.passed}/${TEST_PRODUCTS.length} passed`)

  const totalPassed = patient1.passed + patient2.passed + patient3.passed + patient4.passed + patient5.passed
  const totalProducts = TEST_PRODUCTS.length * 5

  if (totalPassed === totalProducts) {
    console.log('')
    console.log('🎉 ALL TESTS PASSED!')
  } else {
    console.log('')
    console.log(`⚠️ ${totalProducts - totalPassed} tests failed - needs investigation`)
  }
}

main().catch(console.error)
