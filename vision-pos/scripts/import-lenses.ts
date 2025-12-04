/**
 * Import Lenses Pricebook CSV into lens_products table
 *
 * CSV Format: Name, Category, Wholesale, Retail, Multiplier
 *
 * Run with: npx tsx scripts/import-lenses.ts
 */

import { PrismaClient, LensCategory } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Map CSV category values to LensCategory enum
function mapCategory(csvCategory: string): LensCategory {
  const category = csvCategory?.toLowerCase().trim()

  switch (category) {
    case 'lens':
      return 'LENS'
    case 'ar':
      return 'AR_COATING'
    case 'transitions':
      return 'TRANSITIONS'
    case 'material':
      return 'MATERIAL'
    case 'addon':
      return 'ADDON'
    case 'service':
      return 'SERVICE'
    default:
      // Default to ADDON for unrecognized categories
      return 'ADDON'
  }
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null
  const parsed = parseFloat(value.replace(/[$,]/g, ''))
  return isNaN(parsed) ? null : parsed
}

async function importLenses() {
  const csvPath = path.join(
    '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C',
    'Lenses_pricebook_final.csv'
  )

  console.log('Reading CSV from:', csvPath)

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n')

  // Skip header row
  const dataLines = lines.slice(1).filter(line => line.trim())

  console.log(`Found ${dataLines.length} lens products to import`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const line of dataLines) {
    // Parse CSV - handle quoted fields
    const matches = line.match(/(?:^|,)("(?:[^"]*(?:""[^"]*)*)"|[^,]*)/g)
    if (!matches) continue

    const fields = matches.map(field => {
      // Remove leading comma and quotes
      let value = field.replace(/^,/, '').trim()
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/""/g, '"')
      }
      return value
    })

    const [name, categoryStr, wholesaleStr, retailStr, multiplierStr] = fields

    if (!name || name.trim() === '') {
      skipped++
      continue
    }

    try {
      const category = mapCategory(categoryStr)
      const wholesaleCost = parseNumber(wholesaleStr)
      const retailPrice = parseNumber(retailStr)
      const multiplier = parseNumber(multiplierStr) || 3.0

      // Skip if no retail price
      if (retailPrice === null) {
        console.log(`Skipping "${name}" - no retail price`)
        skipped++
        continue
      }

      // Upsert to handle re-runs
      await prisma.lensProduct.upsert({
        where: {
          // Use name as unique identifier for now
          sku: name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)
        },
        update: {
          name: name.trim(),
          category,
          wholesaleCost,
          retailPrice,
          multiplier,
          updatedAt: new Date(),
        },
        create: {
          name: name.trim(),
          sku: name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50),
          category,
          wholesaleCost,
          retailPrice,
          multiplier,
          isActive: true,
        },
      })

      imported++
      if (imported % 20 === 0) {
        console.log(`Imported ${imported} products...`)
      }
    } catch (error) {
      console.error(`Error importing "${name}":`, error)
      errors++
    }
  }

  console.log('\n=== Import Complete ===')
  console.log(`Imported: ${imported}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

importLenses()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
