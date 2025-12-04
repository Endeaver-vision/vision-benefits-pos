/**
 * Test Script: EyeMed Pricing Calculator
 *
 * Demonstrates the complete flow:
 * 1. Load EyeMed authorization data (sample patient)
 * 2. Load product catalog with EyeMed tier mappings
 * 3. Calculate patient pricing for selected products
 *
 * Run with: npx tsx scripts/test-eyemed-pricing.ts
 */

import { EyemedPricingCalculator } from '../src/lib/services/pricing-calculator'
import { EyemedBenefitAuthorization } from '../src/types/benefit-authorization'
import { ProductCatalogEntry } from '../src/types/product-catalog'

// =============================================================================
// SAMPLE EYEMED AUTHORIZATION DATA
// =============================================================================

const sampleEyemedAuth: EyemedBenefitAuthorization = {
  patient: {
    name: 'Maria Rodriguez',
    dob: '1978-04-22',
    age: 46,
    memberId: 'EM987654321',
    groupNumber: 'GRP-EYEMED-001',
    relationship: 'self',
  },
  plan: {
    carrier: 'eyemed',
    planId: 'EM-SELECT-2025',
    planName: 'EyeMed Select',
    network: 'Select',
    effectiveDate: '2025-01-01',
    expirationDate: '2025-12-31',
  },
  frequency: {
    exam: { count: 1, periodMonths: 12 },
    frame: { count: 1, periodMonths: 12 },
    lenses: { count: 1, periodMonths: 12 },
  },
  copays: {
    // Base copays
    exam: 10,
    materials: 25,

    // Frame
    frameAllowance: 150,
    frameOverageDiscount: 0.20, // 20% off overage

    // Lens copays
    lensSv: 25,
    lensBifocal: 25,
    lensTrifocal: 25,

    // Progressive tiers (EyeMed 5-tier system)
    progressiveStandard: 65,
    progressivePremiumTier1: 85,
    progressivePremiumTier2: 105,
    progressivePremiumTier3: 120,
    progressivePremiumTier4: 150,
    progressivePremiumTier5: 175,

    // Materials
    materialPolycarbonate: 40,
    materialPolycarbonateChild: 'covered',
    materialHighIndex: 75,
    materialHighIndex167: 90,
    materialHighIndex174: 120,
    materialTrivex: 50,

    // AR coating tiers (EyeMed 3-tier system)
    arStandard: 45,
    arPremiumTier1: 57,
    arPremiumTier2: 68,
    arPremiumTier3: 85,

    // Enhancements
    photochromic: 75,
    polarized: 75,
    blueLightFilter: 25,
    tint: 15,
    uvCoating: 'covered',
    scratchCoating: 'covered',
  },
  specialRules: {
    polycarbonateFreeCbildAgeMax: 18,
    progressiveNonadaptPolicy: true,
    secondPairDiscount: 0.40,
  },
}

// =============================================================================
// SAMPLE PRODUCT CATALOG WITH EYEMED TIER MAPPINGS
// =============================================================================

const sampleProducts: ProductCatalogEntry[] = [
  // Progressives - Tier 5
  {
    sku: 'SHMIR-AUTO-INT',
    displayName: 'Shamir Autograph Intelligence',
    category: 'lens_progressive',
    retailPrice: 587.10,
    eyemed: { progressiveTier: 'tier_5' },
    isActive: true,
  },
  {
    sku: 'VARILUX-XR',
    displayName: 'Varilux XR Design',
    category: 'lens_progressive',
    retailPrice: 672.00,
    eyemed: { progressiveTier: 'tier_5' },
    isActive: true,
  },
  // Progressives - Tier 4
  {
    sku: 'VARILUX-COMFORT-MAX',
    displayName: 'Varilux Comfort Max',
    category: 'lens_progressive',
    retailPrice: 393.30,
    eyemed: { progressiveTier: 'tier_4' },
    isActive: true,
  },
  {
    sku: 'KODAK-UNIQUE-DRO',
    displayName: 'Kodak Unique DRO',
    category: 'lens_progressive',
    retailPrice: 364.50,
    eyemed: { progressiveTier: 'tier_4' },
    isActive: true,
  },
  // Progressives - Tier 3
  {
    sku: 'VARILUX-COMFORT',
    displayName: 'Varilux Comfort',
    category: 'lens_progressive',
    retailPrice: 368.10,
    eyemed: { progressiveTier: 'tier_3' },
    isActive: true,
  },
  // Progressives - Tier 1
  {
    sku: 'SHMIR-GEN-HD',
    displayName: 'Shamir Genesis HD',
    category: 'lens_progressive',
    retailPrice: 221.40,
    eyemed: { progressiveTier: 'tier_1' },
    isActive: true,
  },
  // Progressives - Standard
  {
    sku: 'PALZ-VALUE',
    displayName: 'PALZ Value Progressive',
    category: 'lens_progressive',
    retailPrice: 138.60,
    eyemed: { progressiveTier: 'standard' },
    isActive: true,
  },

  // AR Coatings - Tier 3
  {
    sku: 'CRIZAL-SAPPHIRE',
    displayName: 'Crizal Sapphire HR',
    category: 'ar_coating',
    retailPrice: 180.00,
    eyemed: { arTier: 'tier_3' },
    isActive: true,
  },
  // AR Coatings - Tier 2
  {
    sku: 'CRIZAL-EASY-PRO',
    displayName: 'Crizal Easy Pro',
    category: 'ar_coating',
    retailPrice: 147.50,
    eyemed: { arTier: 'tier_2' },
    isActive: true,
  },
  // AR Coatings - Tier 1
  {
    sku: 'CRIZAL-EASY',
    displayName: 'Crizal Easy',
    category: 'ar_coating',
    retailPrice: 110.00,
    eyemed: { arTier: 'tier_1' },
    isActive: true,
  },
  // AR Coatings - Standard
  {
    sku: 'REFLECTION-FREE',
    displayName: 'Reflection Free',
    category: 'ar_coating',
    retailPrice: 54.60,
    eyemed: { arTier: 'standard' },
    isActive: true,
  },

  // Materials
  {
    sku: 'MAT-POLY',
    displayName: 'Polycarbonate Upgrade',
    category: 'material',
    retailPrice: 55.00,
    eyemed: { materialType: 'polycarbonate' },
    isActive: true,
  },
  {
    sku: 'MAT-HI167',
    displayName: 'High Index 1.67',
    category: 'material',
    retailPrice: 119.00,
    eyemed: { materialType: 'high_index_167' },
    isActive: true,
  },

  // Photochromic
  {
    sku: 'TRANS-GEN-S',
    displayName: 'Transitions GEN S',
    category: 'photochromic',
    retailPrice: 175.00,
    eyemed: { enhancementType: 'photochromic' },
    isActive: true,
  },

  // Frame
  {
    sku: 'FRAME-OAKLEY',
    displayName: 'Oakley Wingspan',
    category: 'frame',
    retailPrice: 275.00,
    eyemed: {},
    isActive: true,
  },
]

// =============================================================================
// TEST SCENARIOS
// =============================================================================

function runTests() {
  const calculator = new EyemedPricingCalculator()

  console.log('='.repeat(80))
  console.log('EYEMED PRICING CALCULATOR TEST')
  console.log('Patient: Maria Rodriguez | Plan: EyeMed Select | Age: 46')
  console.log('='.repeat(80))
  console.log()

  // Build product map
  const productMap = new Map<string, ProductCatalogEntry>()
  sampleProducts.forEach(p => productMap.set(p.sku, p))

  // Test 1: Premium Tier 5 progressive package
  console.log('SCENARIO 1: Premium Tier 5 Progressive Package')
  console.log('-'.repeat(60))
  const scenario1Result = calculator.buildQuote(
    [
      { sku: 'SHMIR-AUTO-INT', retailPrice: 587.10 },
      { sku: 'MAT-HI167', retailPrice: 119.00 },
      { sku: 'CRIZAL-SAPPHIRE', retailPrice: 180.00 },
      { sku: 'TRANS-GEN-S', retailPrice: 175.00 },
    ],
    productMap,
    sampleEyemedAuth
  )
  printQuote(scenario1Result)

  // Test 2: Mid-tier package
  console.log('\nSCENARIO 2: Mid-Tier Package (Tier 3 Progressive)')
  console.log('-'.repeat(60))
  const scenario2Result = calculator.buildQuote(
    [
      { sku: 'VARILUX-COMFORT', retailPrice: 368.10 },
      { sku: 'MAT-POLY', retailPrice: 55.00 },
      { sku: 'CRIZAL-EASY-PRO', retailPrice: 147.50 },
    ],
    productMap,
    sampleEyemedAuth
  )
  printQuote(scenario2Result)

  // Test 3: Budget package with standard progressive
  console.log('\nSCENARIO 3: Budget Package (Standard Progressive)')
  console.log('-'.repeat(60))
  const scenario3Result = calculator.buildQuote(
    [
      { sku: 'PALZ-VALUE', retailPrice: 138.60 },
      { sku: 'MAT-POLY', retailPrice: 55.00 },
      { sku: 'REFLECTION-FREE', retailPrice: 54.60 },
    ],
    productMap,
    sampleEyemedAuth
  )
  printQuote(scenario3Result)

  // Test 4: Frame with overage calculation
  console.log('\nSCENARIO 4: Frame with Overage')
  console.log('-'.repeat(60))
  const frameProduct = productMap.get('FRAME-OAKLEY')!
  const frameResult = calculator.calculateFrame(
    frameProduct,
    sampleEyemedAuth,
    275.00
  )
  console.log(`Frame: ${frameResult.displayName}`)
  console.log(`  Retail Price:      $${frameResult.retailPrice.toFixed(2)}`)
  console.log(`  Frame Allowance:   $${frameResult.allowance.toFixed(2)}`)
  console.log(`  Overage:           $${frameResult.overage.toFixed(2)}`)
  console.log(`  Discount:          ${(frameResult.overageDiscount * 100).toFixed(0)}%`)
  console.log(`  Patient Pays:      $${frameResult.patientCopay.toFixed(2)}`)
  console.log(`  Insurance Pays:    $${frameResult.insurancePays.toFixed(2)}`)
  if (frameResult.notes) console.log(`  Notes: ${frameResult.notes}`)

  // Test 5: Complete order with frame
  console.log('\nSCENARIO 5: Complete Order (Frame + Tier 4 Lenses)')
  console.log('-'.repeat(60))
  const scenario5Result = calculator.buildQuote(
    [
      { sku: 'FRAME-OAKLEY', retailPrice: 275.00 },
      { sku: 'VARILUX-COMFORT-MAX', retailPrice: 393.30 },
      { sku: 'MAT-POLY', retailPrice: 55.00 },
      { sku: 'CRIZAL-SAPPHIRE', retailPrice: 180.00 },
    ],
    productMap,
    sampleEyemedAuth
  )
  printQuote(scenario5Result)

  // Tier comparison
  console.log('\n' + '='.repeat(80))
  console.log('EYEMED TIER COMPARISON (Progressive Copays)')
  console.log('='.repeat(80))
  console.log(`  Standard:  $${sampleEyemedAuth.copays.progressiveStandard}`)
  console.log(`  Tier 1:    $${sampleEyemedAuth.copays.progressivePremiumTier1}`)
  console.log(`  Tier 2:    $${sampleEyemedAuth.copays.progressivePremiumTier2}`)
  console.log(`  Tier 3:    $${sampleEyemedAuth.copays.progressivePremiumTier3}`)
  console.log(`  Tier 4:    $${sampleEyemedAuth.copays.progressivePremiumTier4}`)
  console.log(`  Tier 5:    $${sampleEyemedAuth.copays.progressivePremiumTier5}`)
  console.log()
  console.log('AR Coating Copays:')
  console.log(`  Standard:  $${sampleEyemedAuth.copays.arStandard}`)
  console.log(`  Tier 1:    $${sampleEyemedAuth.copays.arPremiumTier1}`)
  console.log(`  Tier 2:    $${sampleEyemedAuth.copays.arPremiumTier2}`)
  console.log(`  Tier 3:    $${sampleEyemedAuth.copays.arPremiumTier3}`)
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
