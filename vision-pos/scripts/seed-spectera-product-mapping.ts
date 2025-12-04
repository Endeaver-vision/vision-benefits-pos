/**
 * Seed Spectera Product Tier Mapping
 *
 * Loads the SPECTERA_PRODUCT_TIER_MAPPING.csv into the ProductSpecteraTierMapping table
 *
 * Run with: npx tsx scripts/seed-spectera-product-mapping.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface CsvRow {
  ProductName: string
  Category: string
  SpecteraTier: string
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
  console.log('Loading Spectera Product Tier Mapping...')

  // Read the CSV file
  const csvPath = path.join(
    '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C',
    'SPECTERA_PRODUCT_TIER_MAPPING.csv'
  )

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCsv(content)

  console.log(`Found ${rows.length} products to import`)

  // Clear existing mappings
  const deleteResult = await prisma.productSpecteraTierMapping.deleteMany({})
  console.log(`Cleared ${deleteResult.count} existing mappings`)

  // Insert new mappings
  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    // Skip empty rows
    if (!row.ProductName || !row.SpecteraTier) {
      skipped++
      continue
    }

    try {
      await prisma.productSpecteraTierMapping.create({
        data: {
          productName: row.ProductName,
          category: row.Category,
          specteraTier: row.SpecteraTier,
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
  const categories = await prisma.productSpecteraTierMapping.groupBy({
    by: ['category'],
    _count: { category: true },
  })

  console.log(`\nProducts by category:`)
  for (const cat of categories) {
    console.log(`  ${cat.category}: ${cat._count.category}`)
  }

  // Show summary by Spectera tier
  const tiers = await prisma.productSpecteraTierMapping.groupBy({
    by: ['specteraTier'],
    _count: { specteraTier: true },
  })

  console.log(`\nProducts by Spectera tier:`)
  for (const tier of tiers.sort((a, b) => {
    const order = ['I', 'II', 'III', 'IV', 'V', 'non_formulary']
    const aIdx = order.indexOf(a.specteraTier)
    const bIdx = order.indexOf(b.specteraTier)
    if (aIdx === -1 && bIdx === -1) return a.specteraTier.localeCompare(b.specteraTier)
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })) {
    console.log(`  ${tier.specteraTier}: ${tier._count.specteraTier}`)
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
