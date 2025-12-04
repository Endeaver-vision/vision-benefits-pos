/**
 * Seed EyeMed Product Tier Mapping
 *
 * Loads the EYEMED_PRODUCT_TIER_MAPPING.csv into the ProductEyemedTierMapping table
 *
 * Run with: npx tsx scripts/seed-eyemed-product-mapping.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface CsvRow {
  ProductName: string
  Category: string
  EyemedTier: string
  TierDescription: string
  Notes: string
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',')

  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header.trim()] = values[i] || ''
    })

    return row as unknown as CsvRow
  })
}

async function main() {
  console.log('Loading EyeMed Product Tier Mapping...')

  // Read the CSV file
  const csvPath = path.join(
    '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C',
    'EYEMED_PRODUCT_TIER_MAPPING.csv'
  )

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCsv(content)

  console.log(`Found ${rows.length} products to import`)

  // Clear existing mappings
  const deleteResult = await prisma.productEyemedTierMapping.deleteMany({})
  console.log(`Cleared ${deleteResult.count} existing mappings`)

  // Insert new mappings
  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    // Skip empty rows
    if (!row.ProductName || !row.EyemedTier) {
      skipped++
      continue
    }

    try {
      await prisma.productEyemedTierMapping.create({
        data: {
          productName: row.ProductName,
          category: row.Category,
          eyemedTier: row.EyemedTier,
          tierDescription: row.TierDescription,
          notes: row.Notes || null,
          isActive: true,
        },
      })
      inserted++
    } catch (error) {
      // Handle duplicate product names
      if ((error as Error).message.includes('Unique constraint')) {
        console.log(`  Skipping duplicate: ${row.ProductName}`)
        skipped++
      } else {
        throw error
      }
    }
  }

  console.log(`\nImport complete:`)
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Skipped: ${skipped}`)

  // Show summary by category
  const categories = await prisma.productEyemedTierMapping.groupBy({
    by: ['category'],
    _count: { category: true },
  })

  console.log(`\nProducts by category:`)
  for (const cat of categories) {
    console.log(`  ${cat.category}: ${cat._count.category}`)
  }

  // Show summary by EyeMed tier
  const tiers = await prisma.productEyemedTierMapping.groupBy({
    by: ['eyemedTier'],
    _count: { eyemedTier: true },
  })

  console.log(`\nProducts by EyeMed tier:`)
  for (const tier of tiers.sort((a, b) => {
    const order = ['standard', 'tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5']
    return order.indexOf(a.eyemedTier) - order.indexOf(b.eyemedTier)
  })) {
    console.log(`  ${tier.eyemedTier}: ${tier._count.eyemedTier}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
