/**
 * Test Script: VSP Pricing Calculator with Sample Authorization
 *
 * This demonstrates the complete flow:
 * 1. Load VSP authorization data (from sample: ALBERTO BURGOS, Auth# 82317089)
 * 2. Load product catalog with VSP code mappings
 * 3. Calculate patient pricing for selected products
 *
 * Run with: npx tsx scripts/test-vsp-pricing.ts
 */

import { VspPricingCalculator, QuoteResult } from '../src/lib/services/pricing-calculator'
import { VspBenefitAuthorization, VspPlanTier } from '../src/types/benefit-authorization'
import { ProductCatalogEntry, ProductCategory } from '../src/types/product-catalog'

// =============================================================================
// SAMPLE AUTHORIZATION DATA (from ALBERTO BURGOS VSP auth - AB-vsp-lens-1.pdf)
// =============================================================================

const sampleVspAuth: VspBenefitAuthorization = {
  patient: {
    name: 'Alberto Burgos',
    dob: '1985-06-15',
    age: 39,
    memberId: '123456789',
    groupNumber: 'GRP001',
    relationship: 'self',
  },
  plan: {
    carrier: 'vsp',
    planId: '82317089',
    planName: 'VSP Choice Plan',
    network: 'Choice',
    effectiveDate: '2025-01-01',
    expirationDate: '2025-12-31',
  },
  frequency: {
    exam: { count: 1, periodMonths: 12 },
    frame: { count: 1, periodMonths: 24 },
    lenses: { count: 1, periodMonths: 12 },
  },
  copays: {
    examWellvision: 10,
    materials: 25,
    frameAllowanceFeatured: 220,      // Marchon/Altair
    frameAllowanceNonFeatured: 200,   // Other frames
    frameOverageDiscount: 0.20,        // 20% off overage
    contactLensAllowance: 150,
  },
  planTier: {
    tier: 'choice',
    // Progressive copays from AB-vsp-lens-1.pdf
    progressiveCopays: {
      NA: 175,  // Progressive N - Custom tier
      OA: 150,  // Progressive O - Custom tier
      FA: 105,  // Progressive F - Premium tier
      JA: 95,   // Progressive J - Premium tier
      KA: 55,   // Progressive K - Standard tier
    },
    // AR copays from AB-vsp-lens-1.pdf
    arCopays: {
      QM: 41,   // Anti-reflective A
      QT: 68,   // Anti-reflective C
      QV: 85,   // Anti-reflective D (Crizal)
    },
    // Material copays
    materialCopays: {
      polycarbonate: 35,          // AD code
      polycarbonateChild: 'covered',
      trivex: 56,                 // AB code
      highIndex167: 98,           // AH code
      highIndex174: 118,          // AJ code
    },
    // Enhancement copays
    enhancementCopays: {
      photochromic: 75,           // PR code - Transitions
      polarized: 77,              // DA code
      blueLightFilter: 15,        // LF code
      tint: 15,                   // MN code
    },
  },
  specialRules: {
    pricingRules: {
      NA: 'lower_of_copay_or_80_uc',
      OA: 'lower_of_copay_or_80_uc',
      FA: 'lower_of_copay_or_80_uc',
      JA: 'lower_of_copay_or_80_uc',
      KA: 'lower_of_copay_or_80_uc',
      QV: 'lower_of_copay_or_80_uc',
      QT: 'lower_of_copay_or_80_uc',
      QM: 'lower_of_copay_or_80_uc',
    },
    polycarbonateFreeCbildAgeMax: 18,
  },
}

// =============================================================================
// SAMPLE PRODUCT CATALOG WITH VSP CODE MAPPINGS
// =============================================================================

const sampleProducts: ProductCatalogEntry[] = [
  // Progressives
  {
    sku: 'SHMIR-AUTO-INT',
    displayName: 'Shamir Autograph Intelligence',
    category: 'lens_progressive',
    retailPrice: 587.10,
    vsp: { baseCode: 'NA', isFeaturedBrand: false },
    isActive: true,
  },
  {
    sku: 'VARILUX-XR',
    displayName: 'Varilux XR Design',
    category: 'lens_progressive',
    retailPrice: 672.00,
    vsp: { baseCode: 'NA', isFeaturedBrand: false },
    isActive: true,
  },
  {
    sku: 'SHMIR-SPEC',
    displayName: 'Shamir Spectrum+',
    category: 'lens_progressive',
    retailPrice: 274.20,
    vsp: { baseCode: 'FA', isFeaturedBrand: false },
    isActive: true,
  },
  {
    sku: 'SHMIR-ELEM',
    displayName: 'Shamir Element',
    category: 'lens_progressive',
    retailPrice: 277.20,
    vsp: { baseCode: 'JA', isFeaturedBrand: false },
    isActive: true,
  },
  {
    sku: 'SHMIR-GEN-HD',
    displayName: 'Shamir Genesis HD',
    category: 'lens_progressive',
    retailPrice: 221.40,
    vsp: { baseCode: 'KA', isFeaturedBrand: false },
    isActive: true,
  },

  // AR Coatings
  {
    sku: 'CRIZAL-SAPPHIRE',
    displayName: 'Crizal Sapphire HR',
    category: 'ar_coating',
    retailPrice: 180.00,
    vsp: { arCode: 'QV' },
    isActive: true,
  },
  {
    sku: 'CRIZAL-EASY',
    displayName: 'Crizal Easy',
    category: 'ar_coating',
    retailPrice: 110.00,
    vsp: { arCode: 'QM' },
    isActive: true,
  },

  // Materials
  {
    sku: 'MAT-POLY',
    displayName: 'Polycarbonate Upgrade',
    category: 'material',
    retailPrice: 55.00,
    vsp: { materialModifier: 'D' },
    isActive: true,
  },
  {
    sku: 'MAT-HI167',
    displayName: 'High Index 1.67',
    category: 'material',
    retailPrice: 119.00,
    vsp: { materialModifier: 'H' },
    isActive: true,
  },

  // Photochromic
  {
    sku: 'TRANS-GEN-S',
    displayName: 'Transitions GEN S',
    category: 'photochromic',
    retailPrice: 175.00,
    vsp: {},
    isActive: true,
  },

  // Frame (sample)
  {
    sku: 'FRAME-VERSACE',
    displayName: 'Versace VE3298B',
    category: 'frame',
    retailPrice: 350.00,
    vsp: { isFeaturedBrand: false },  // Not Marchon/Altair
    isActive: true,
  },
]

// =============================================================================
// TEST SCENARIOS
// =============================================================================

function runTests() {
  const calculator = new VspPricingCalculator()

  console.log('=' .repeat(80))
  console.log('VSP PRICING CALCULATOR TEST')
  console.log('Patient: Alberto Burgos | Plan: VSP Choice | Auth# 82317089')
  console.log('=' .repeat(80))
  console.log()

  // Build product map
  const productMap = new Map<string, ProductCatalogEntry>()
  sampleProducts.forEach(p => productMap.set(p.sku, p))

  // Test 1: Premium progressive with AR coating
  console.log('SCENARIO 1: Premium Progressive Package')
  console.log('-'.repeat(60))
  const scenario1Result = calculator.buildQuote(
    [
      { sku: 'SHMIR-AUTO-INT', retailPrice: 587.10 },
      { sku: 'MAT-HI167', retailPrice: 119.00 },
      { sku: 'CRIZAL-SAPPHIRE', retailPrice: 180.00 },
      { sku: 'TRANS-GEN-S', retailPrice: 175.00 },
    ],
    productMap,
    sampleVspAuth
  )
  printQuote(scenario1Result)

  // Test 2: Standard progressive package
  console.log('\nSCENARIO 2: Standard Progressive Package')
  console.log('-'.repeat(60))
  const scenario2Result = calculator.buildQuote(
    [
      { sku: 'SHMIR-GEN-HD', retailPrice: 221.40 },
      { sku: 'MAT-POLY', retailPrice: 55.00 },
      { sku: 'CRIZAL-EASY', retailPrice: 110.00 },
    ],
    productMap,
    sampleVspAuth
  )
  printQuote(scenario2Result)

  // Test 3: Frame calculation with overage
  console.log('\nSCENARIO 3: Frame with Overage')
  console.log('-'.repeat(60))
  const frameProduct = productMap.get('FRAME-VERSACE')!
  const frameResult = calculator.calculateFrame(
    frameProduct,
    sampleVspAuth,
    350.00,
    false // Not featured brand
  )
  console.log(`Frame: ${frameResult.displayName}`)
  console.log(`  Retail Price:      $${frameResult.retailPrice.toFixed(2)}`)
  console.log(`  Frame Allowance:   $${frameResult.allowance.toFixed(2)}`)
  console.log(`  Overage:           $${frameResult.overage.toFixed(2)}`)
  console.log(`  Discount:          ${(frameResult.overageDiscount * 100).toFixed(0)}%`)
  console.log(`  Patient Pays:      $${frameResult.patientCopay.toFixed(2)}`)
  console.log(`  Insurance Pays:    $${frameResult.insurancePays.toFixed(2)}`)
  console.log(`  Total Savings:     $${frameResult.savings.toFixed(2)}`)
  if (frameResult.notes) console.log(`  Notes: ${frameResult.notes}`)

  // Test 4: Complete order with frame
  console.log('\nSCENARIO 4: Complete Order (Frame + Lenses)')
  console.log('-'.repeat(60))
  const scenario4Result = calculator.buildQuote(
    [
      { sku: 'FRAME-VERSACE', retailPrice: 350.00 },
      { sku: 'SHMIR-SPEC', retailPrice: 274.20 },
      { sku: 'MAT-POLY', retailPrice: 55.00 },
      { sku: 'CRIZAL-SAPPHIRE', retailPrice: 180.00 },
    ],
    productMap,
    sampleVspAuth
  )
  printQuote(scenario4Result)

  console.log('\n' + '='.repeat(80))
  console.log('Summary: VSP pricing uses CODE-BASED lookups from patient authorization.')
  console.log('The copays come directly from the Lens Enhancement Charges document.')
  console.log('No need for tier lookup tables - the auth has exact patient prices.')
  console.log('='.repeat(80))
}

function printQuote(quote: QuoteResult) {
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
                `Code: ${item.tierUsed || 'N/A'}`)
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
