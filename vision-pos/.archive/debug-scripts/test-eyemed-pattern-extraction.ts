/**
 * Test script for EyeMed pattern-based extraction
 *
 * Usage: npx tsx scripts/test-eyemed-pattern-extraction.ts [path-to-pdf]
 */

import { extractEyeMedBenefitsWithPatterns, getEyeMedDatabaseStats } from '@/lib/services/ocr/eyemed-pattern-extraction'
import { EyeMedCopayCalculator } from '@/lib/services/ocr/eyemed-copay-calculator'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  const pdfPath = process.argv[2]

  if (!pdfPath) {
    console.log('Usage: npx tsx scripts/test-eyemed-pattern-extraction.ts <path-to-pdf>')
    console.log('')
    console.log('Example test PDFs:')
    console.log('  npx tsx scripts/test-eyemed-pattern-extraction.ts public/uploads/insurance-docs/cust_93800643_1768495131786_SS_eyemed.pdf')
    process.exit(1)
  }

  if (!fs.existsSync(pdfPath)) {
    console.error(`File not found: ${pdfPath}`)
    process.exit(1)
  }

  console.log('='.repeat(80))
  console.log('EyeMed Pattern-Based Extraction Test')
  console.log('='.repeat(80))
  console.log('')

  // Show database stats
  console.log('DATABASE STATS:')
  const stats = getEyeMedDatabaseStats()
  console.log(`  Total patterns: ${stats.total_patterns}`)
  console.log(`  Total categories: ${stats.total_categories}`)
  console.log(`  Sample categories: ${stats.categories.slice(0, 5).join(', ')}`)
  console.log('')

  // Run extraction
  console.log(`EXTRACTING: ${path.basename(pdfPath)}`)
  console.log('')

  const result = await extractEyeMedBenefitsWithPatterns(pdfPath)

  if (!result.success) {
    console.error('EXTRACTION FAILED:')
    console.error(result.error)
    process.exit(1)
  }

  // Display results
  console.log('EXTRACTION RESULTS:')
  console.log(`  Carrier: ${result.carrier}`)
  console.log(`  Benefits matched: ${result.stats?.total_patterns_matched || 0}`)
  console.log(`  Unrecognized: ${result.stats?.total_unrecognized || 0}`)
  console.log('')

  if (Object.keys(result.benefits).length > 0) {
    console.log('EXTRACTED BENEFITS:')
    for (const [key, benefit] of Object.entries(result.benefits)) {
      console.log(`  ${key}:`)
      console.log(`    Category: ${benefit.category}`)
      console.log(`    Text: ${benefit.exact_text_found}`)
      console.log(`    Formula: ${benefit.formula_type}`)
      if (benefit.base_copay !== undefined) console.log(`    Base Copay: $${benefit.base_copay}`)
      if (benefit.allowance !== undefined) console.log(`    Allowance: $${benefit.allowance}`)
      if (benefit.discount_factor !== undefined)
        console.log(`    Discount: ${(benefit.discount_factor * 100).toFixed(0)}%`)
      console.log('')
    }
  }

  if (result.unrecognized && result.unrecognized.length > 0) {
    console.log('UNRECOGNIZED BENEFITS:')
    for (const item of result.unrecognized) {
      console.log(`  - ${item}`)
    }
    console.log('')
  }

  // Sample copay calculation
  console.log('SAMPLE COPAY CALCULATIONS:')
  const sampleProducts = {
    'Varilux Comfort Max': {
      retail_price: 393,
      benefit_category: 'progressive_tier_4',
    },
    'Crizal Sapphire': {
      retail_price: 150,
      benefit_category: 'ar_sapphire',
    },
  }

  for (const [productName, productInfo] of Object.entries(sampleProducts)) {
    const benefit = result.benefits[productInfo.benefit_category]
    if (benefit) {
      const copay = EyeMedCopayCalculator.calculate(productInfo.retail_price, benefit)
      console.log(`  ${productName} ($${productInfo.retail_price}):`)
      console.log(`    Patient pays: $${copay.patient_copay}`)
      console.log(`    Formula: ${copay.formula}`)
    }
  }

  console.log('')
  console.log('✓ Test complete')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
