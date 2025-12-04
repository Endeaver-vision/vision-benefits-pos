/**
 * Seed VSP Product Code Mapping
 *
 * Loads the VSP_PRODUCT_CODE_MAPPING.csv into the ProductVspCodeMapping table
 *
 * Run with: npx tsx scripts/seed-vsp-product-mapping.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface CsvRow {
  ProductName: string
  Category: string
  VSPCode: string
  VSPCodeDescription: string
  MaterialModifier: string
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
  console.log('Loading VSP Product Code Mapping...')

  // Read the CSV file
  const csvPath = path.join(
    '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C',
    'VSP_PRODUCT_CODE_MAPPING.csv'
  )

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCsv(content)

  console.log(`Found ${rows.length} products to import`)

  // Clear existing mappings
  const deleteResult = await prisma.productVspCodeMapping.deleteMany({})
  console.log(`Cleared ${deleteResult.count} existing mappings`)

  // Insert new mappings
  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    // Skip empty rows
    if (!row.ProductName || !row.VSPCode) {
      skipped++
      continue
    }

    try {
      await prisma.productVspCodeMapping.create({
        data: {
          productName: row.ProductName,
          category: row.Category,
          vspCode: row.VSPCode,
          vspCodeDescription: row.VSPCodeDescription,
          materialModifier: row.MaterialModifier || null,
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
  const categories = await prisma.productVspCodeMapping.groupBy({
    by: ['category'],
    _count: { category: true },
  })

  console.log(`\nProducts by category:`)
  for (const cat of categories) {
    console.log(`  ${cat.category}: ${cat._count.category}`)
  }

  // Show summary by VSP code
  const codes = await prisma.productVspCodeMapping.groupBy({
    by: ['vspCode'],
    _count: { vspCode: true },
  })

  console.log(`\nProducts by VSP code:`)
  for (const code of codes.sort((a, b) => b._count.vspCode - a._count.vspCode).slice(0, 15)) {
    console.log(`  ${code.vspCode}: ${code._count.vspCode}`)
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
