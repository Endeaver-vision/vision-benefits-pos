/**
 * Test Script: Spectera Pricing Calculator
 *
 * Demonstrates the complete flow:
 * 1. Load Spectera authorization data (sample patient)
 * 2. Load product catalog with Spectera tier mappings
 * 3. Calculate patient pricing for selected products
 *
 * Run with: npx tsx scripts/test-spectera-pricing.ts
 */

import { SpecteraPricingCalculator } from '../src/lib/services/pricing-calculator'
import { SpecteraBenefitAuthorization } from '../src/types/benefit-authorization'
import { ProductCatalogEntry } from '../src/types/product-catalog'

// =============================================================================
// SAMPLE SPECTERA AUTHORIZATION DATA
// =============================================================================

const sampleSpecteraAuth: SpecteraBenefitAuthorization = {
  patient: {
    name: 'James Thompson',
    dob: '1990-08-15',
    age: 34,
    memberId: 'SP456789123',
    groupNumber: 'GRP-SPECTERA-001',
    relationship: 'self',
  },
  plan: {
    carrier: 'spectera',
    planId: 'SP-STANDARD-PLUS',
    planName: 'Spectera Standard Plus',
    network: 'Standard',
    effectiveDate: '2025-01-01',
    expirationDate: '2025-12-31',
  },
  frequency: {
    exam: { count: 1, periodMonths: 12 },
    frame: { count: 1, periodMonths: 24 },
    lenses: { count: 1, periodMonths: 12 },
  },
  copays: {
    // Exam copays (Spectera has age-based exams)
    examPediatric: 15,
    examMaternity: 15,
    examAdult: 20,

    // Frame
    frameAllowance: 130,
    frameOveragePercent: 0.70, // Patient pays 70% of overage

    // Lens copays
    lensStandard: 30,

    // Progressive tiers (Spectera uses Roman numerals I-V)
    progressiveTierI: 85,
    progressiveTierII: 130,
    progressiveTierIII: 180,
    progressiveTierIV: 230,
    progressiveTierV: 280,

    // Materials
    materialPolycarbonateAdult: 33,
    materialPolycarbonateChild: 'covered',
    materialHighIndex160166: 53,
    materialHighIndex166173: 63,

    // AR coating tiers (Spectera uses Roman numerals I-IV)
    arTierI: 30,
    arTierII: 50,
    arTierIII: 75,
    arTierIV: 95,

    // Enhancements
    photochromic: 67,
    polarized: '80% billed',
    tint: 14,
    uvCoating: 16,
    scratchCoating: 'covered',
    polishedEdges: 13,
  },
  specialRules: {
    polycarbonateFreeCbildAgeMax: 18,
  },
}

// =============================================================================
// SAMPLE PRODUCT CATALOG WITH SPECTERA TIER MAPPINGS
// =============================================================================

const sampleProducts: ProductCatalogEntry[] = [
  // Progressives - Tier V
  {
    sku: 'SHMIR-AUTO-INT',
    displayName: 'Shamir Autograph Intelligence',
    category: 'lens_progressive',
    retailPrice: 587.10,
    spectera: { progressiveTier: 'V' },
    isActive: true,
  },
  {
    sku: 'VARILUX-XR',
    displayName: 'Varilux XR Design',
    category: 'lens_progressive',
    retailPrice: 672.00,
    spectera: { progressiveTier: 'V' },
    isActive: true,
  },
  // Progressives - Tier IV
  {
    sku: 'VARILUX-PHYSIO',
    displayName: 'Varilux Physio extensee',
    category: 'lens_progressive',
    retailPrice: 525.90,
    spectera: { progressiveTier: 'IV' },
    isActive: true,
  },
  {
    sku: 'KODAK-UNIQUE-DRO',
    displayName: 'Kodak Unique DRO',
    category: 'lens_progressive',
    retailPrice: 364.50,
    spectera: { progressiveTier: 'IV' },
    isActive: true,
  },
  // Progressives - Tier III
  {
    sku: 'VARILUX-COMFORT-MAX',
    displayName: 'Varilux Comfort Max',
    category: 'lens_progressive',
    retailPrice: 393.30,
    spectera: { progressiveTier: 'III' },
    isActive: true,
  },
  {
    sku: 'KODAK-UNIQUE',
    displayName: 'Kodak Unique',
    category: 'lens_progressive',
    retailPrice: 312.00,
    spectera: { progressiveTier: 'III' },
    isActive: true,
  },
  // Progressives - Tier II
  {
    sku: 'VARILUX-COMFORT',
    displayName: 'Varilux Comfort',
    category: 'lens_progressive',
    retailPrice: 368.10,
    spectera: { progressiveTier: 'II' },
    isActive: true,
  },
  // Progressives - Tier I
  {
    sku: 'SHMIR-ELEMENT',
    displayName: 'Shamir Element',
    category: 'lens_progressive',
    retailPrice: 277.20,
    spectera: { progressiveTier: 'I' },
    isActive: true,
  },
  {
    sku: 'NATURAL-DIGITAL',
    displayName: 'Natural Digital',
    category: 'lens_progressive',
    retailPrice: 271.20,
    spectera: { progressiveTier: 'I' },
    isActive: true,
  },

  // AR Coatings - Tier IV
  {
    sku: 'CRIZAL-SAPPHIRE',
    displayName: 'Crizal Sapphire HR',
    category: 'ar_coating',
    retailPrice: 180.00,
    spectera: { arTier: 'IV' },
    isActive: true,
  },
  // AR Coatings - Tier III
  {
    sku: 'CRIZAL-EASY-PRO',
    displayName: 'Crizal Easy Pro',
    category: 'ar_coating',
    retailPrice: 147.50,
    spectera: { arTier: 'III' },
    isActive: true,
  },
  // AR Coatings - Tier II
  {
    sku: 'CRIZAL-EASY',
    displayName: 'Crizal Easy',
    category: 'ar_coating',
    retailPrice: 110.00,
    spectera: { arTier: 'II' },
    isActive: true,
  },
  // AR Coatings - Tier I
  {
    sku: 'SHARPVIEW-PLUS',
    displayName: 'SharpView+',
    category: 'ar_coating',
    retailPrice: 110.40,
    spectera: { arTier: 'I' },
    isActive: true,
  },

  // Materials
  {
    sku: 'MAT-POLY',
    displayName: 'Polycarbonate Upgrade',
    category: 'material',
    retailPrice: 55.00,
    spectera: { materialType: 'polycarbonate' },
    isActive: true,
  },
  {
    sku: 'MAT-HI167',
    displayName: 'High Index 1.67',
    category: 'material',
    retailPrice: 119.00,
    spectera: { materialType: 'high_index' },
    isActive: true,
  },

  // Photochromic
  {
    sku: 'TRANS-GEN-S',
    displayName: 'Transitions GEN S',
    category: 'photochromic',
    retailPrice: 175.00,
    spectera: {},
    isActive: true,
  },

  // Frame
  {
    sku: 'FRAME-RAYBAN',
    displayName: 'Ray-Ban RB5154',
    category: 'frame',
    retailPrice: 220.00,
    spectera: {},
    isActive: true,
  },
]

// =============================================================================
// TEST SCENARIOS
// =============================================================================

function runTests() {
  const calculator = new SpecteraPricingCalculator()

  console.log('='.repeat(80))
  console.log('SPECTERA PRICING CALCULATOR TEST')
  console.log('Patient: James Thompson | Plan: Spectera Standard Plus | Age: 34')
  console.log('='.repeat(80))
  console.log()

  // Build product map
  const productMap = new Map<string, ProductCatalogEntry>()
  sampleProducts.forEach(p => productMap.set(p.sku, p))

  // Test 1: Premium Tier V progressive package
  console.log('SCENARIO 1: Premium Tier V Progressive Package')
  console.log('-'.repeat(60))
  const scenario1Result = calculator.buildQuote(
    [
      { sku: 'SHMIR-AUTO-INT', retailPrice: 587.10 },
      { sku: 'MAT-HI167', retailPrice: 119.00 },
      { sku: 'CRIZAL-SAPPHIRE', retailPrice: 180.00 },
      { sku: 'TRANS-GEN-S', retailPrice: 175.00 },
    ],
    productMap,
    sampleSpecteraAuth
  )
  printQuote(scenario1Result)

  // Test 2: Mid-tier package (Tier III)
  console.log('\nSCENARIO 2: Mid-Tier Package (Tier III Progressive)')
  console.log('-'.repeat(60))
  const scenario2Result = calculator.buildQuote(
    [
      { sku: 'VARILUX-COMFORT-MAX', retailPrice: 393.30 },
      { sku: 'MAT-POLY', retailPrice: 55.00 },
      { sku: 'CRIZAL-EASY-PRO', retailPrice: 147.50 },
    ],
    productMap,
    sampleSpecteraAuth
  )
  printQuote(scenario2Result)

  // Test 3: Budget package (Tier I)
  console.log('\nSCENARIO 3: Budget Package (Tier I Progressive)')
  console.log('-'.repeat(60))
  const scenario3Result = calculator.buildQuote(
    [
      { sku: 'SHMIR-ELEMENT', retailPrice: 277.20 },
      { sku: 'MAT-POLY', retailPrice: 55.00 },
      { sku: 'SHARPVIEW-PLUS', retailPrice: 110.40 },
    ],
    productMap,
    sampleSpecteraAuth
  )
  printQuote(scenario3Result)

  // Test 4: Frame with overage (Spectera uses 70% patient responsibility)
  console.log('\nSCENARIO 4: Frame with Overage (70% Patient Responsibility)')
  console.log('-'.repeat(60))
  const frameProduct = productMap.get('FRAME-RAYBAN')!
  const frameResult = calculator.calculateFrame(
    frameProduct,
    sampleSpecteraAuth,
    220.00
  )
  console.log(`Frame: ${frameResult.displayName}`)
  console.log(`  Retail Price:      $${frameResult.retailPrice.toFixed(2)}`)
  console.log(`  Frame Allowance:   $${frameResult.allowance.toFixed(2)}`)
  console.log(`  Overage:           $${frameResult.overage.toFixed(2)}`)
  console.log(`  Patient Pays:      ${((1 - frameResult.overageDiscount) * 100).toFixed(0)}% of overage`)
  console.log(`  Patient Copay:     $${frameResult.patientCopay.toFixed(2)}`)
  console.log(`  Insurance Pays:    $${frameResult.insurancePays.toFixed(2)}`)
  if (frameResult.notes) console.log(`  Notes: ${frameResult.notes}`)

  // Test 5: Complete order with frame
  console.log('\nSCENARIO 5: Complete Order (Frame + Tier II Lenses)')
  console.log('-'.repeat(60))
  const scenario5Result = calculator.buildQuote(
    [
      { sku: 'FRAME-RAYBAN', retailPrice: 220.00 },
      { sku: 'VARILUX-COMFORT', retailPrice: 368.10 },
      { sku: 'MAT-POLY', retailPrice: 55.00 },
      { sku: 'CRIZAL-EASY', retailPrice: 110.00 },
    ],
    productMap,
    sampleSpecteraAuth
  )
  printQuote(scenario5Result)

  // Tier comparison
  console.log('\n' + '='.repeat(80))
  console.log('SPECTERA TIER COMPARISON (Progressive Copays - Roman Numerals)')
  console.log('='.repeat(80))
  console.log(`  Tier I:    $${sampleSpecteraAuth.copays.progressiveTierI}`)
  console.log(`  Tier II:   $${sampleSpecteraAuth.copays.progressiveTierII}`)
  console.log(`  Tier III:  $${sampleSpecteraAuth.copays.progressiveTierIII}`)
  console.log(`  Tier IV:   $${sampleSpecteraAuth.copays.progressiveTierIV}`)
  console.log(`  Tier V:    $${sampleSpecteraAuth.copays.progressiveTierV}`)
  console.log()
  console.log('AR Coating Copays:')
  console.log(`  Tier I:    $${sampleSpecteraAuth.copays.arTierI}`)
  console.log(`  Tier II:   $${sampleSpecteraAuth.copays.arTierII}`)
  console.log(`  Tier III:  $${sampleSpecteraAuth.copays.arTierIII}`)
  console.log(`  Tier IV:   $${sampleSpecteraAuth.copays.arTierIV}`)
  console.log()
  console.log('Key Spectera Difference: Frame overage = 70% patient responsibility')
  console.log('(vs EyeMed 20% discount / VSP 20% discount)')
  console.log('='.repeat(80))
}

function printQuote(quote: { planName: string; examCopay?: number; materialsCopay?: number; items: Array<{ displayName: string; retailPrice: number; patientCopay: number; insurancePays: number; tierUsed?: string; notes?: string }>; retailTotal: number; patientTotal: number; insuranceTotal: number; totalSavings: number; warnings?: string[] }) {
  console.log(`Plan: ${quote.planName}`)
  console.log(`Exam Copay: $${quote.examCopay?.toFixed(2) ?? 'N/A'}`)
  console.log(`Materials Copay: $${quote.materialsCopay?.toFixed(2) ?? 'N/A'}`)
  console.log()

  console.log('Items:')
  for (const item of quote.items) {
    console.log(`  ${item.displayName}`)
    console.log(`    Retail: $${item.retailPrice.toFixed(2)} | ` +
                `Patient: $${item.patientCopay.toFixed(2)} | ` +
                `Insurance: $${item.insurancePays.toFixed(2)} | ` +
                `Tier: ${item.tierUsed || 'N/A'}`)
    if (item.notes) console.log(`    Note: ${item.notes}`)
  }

  console.log()
  console.log(`TOTALS:`)
  console.log(`  Retail Total:     $${quote.retailTotal.toFixed(2)}`)
  console.log(`  Patient Pays:     $${quote.patientTotal.toFixed(2)}`)
  console.log(`  Insurance Pays:   $${quote.insuranceTotal.toFixed(2)}`)
  console.log(`  Total Savings:    $${quote.totalSavings.toFixed(2)}`)

  if (quote.warnings && quote.warnings.length > 0) {
    console.log(`\n  Warnings:`)
    quote.warnings.forEach(w => console.log(`    - ${w}`))
  }
}

// Run the tests
runTests()
