/**
 * Import Contact Lens Price List CSV into contact_lenses table
 *
 * CSV Format: Manufacture,Lens,Price,Box Size,Needed for Annual Supply (both eyes),Needed for Annual Supply (per eye),Current Office Price
 *
 * Run with: npx tsx scripts/import-contacts.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null
  const parsed = parseFloat(value.replace(/[$,]/g, ''))
  return isNaN(parsed) ? null : parsed
}

function parseInt2(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? null : parsed
}

function detectLensType(lensName: string): {
  isAstigmatism: boolean
  isMultifocal: boolean
  isDaily: boolean
  isWeekly: boolean
  isMonthly: boolean
} {
  const lower = lensName.toLowerCase()

  return {
    isAstigmatism: lower.includes('toric') || lower.includes('astigmatism'),
    isMultifocal: lower.includes('multifocal') || lower.includes('bifocal') || lower.includes('presbyopia'),
    isDaily: lower.includes('1-day') || lower.includes('daily') || lower.includes('1 day') || lower.includes('oneday'),
    isWeekly: lower.includes('weekly') || lower.includes('7 day'),
    isMonthly: !lower.includes('daily') && !lower.includes('1-day') && !lower.includes('1 day') &&
      (lower.includes('monthly') || lower.includes('30 day') ||
        // Most non-daily lenses in 6-pack boxes are monthly
        false),
  }
}

async function importContacts() {
  const csvPath = path.join(
    '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C',
    'Contact Lens _ Price List - Sheet1.csv'
  )

  console.log('Reading CSV from:', csvPath)

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n')

  // Skip header row
  const dataLines = lines.slice(1).filter(line => line.trim())

  console.log(`Found ${dataLines.length} contact lenses to import`)

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

    const [
      manufacturer,
      lensName,
      priceStr,
      boxSizeStr,
      annualBothStr,
      annualPerEyeStr,
      officePriceStr,
    ] = fields

    // Skip if essential fields missing
    if (!manufacturer || !lensName) {
      skipped++
      continue
    }

    try {
      const retailPrice = parseNumber(officePriceStr) || parseNumber(priceStr)
      const wholesaleCost = parseNumber(priceStr) // Using the first price as wholesale
      const boxSize = parseInt2(boxSizeStr) || 1

      // Skip if no retail price
      if (retailPrice === null) {
        console.log(`Skipping "${lensName}" - no price`)
        skipped++
        continue
      }

      const lensType = detectLensType(lensName)

      // Create unique identifier
      const uniqueKey = `${manufacturer.trim()}-${lensName.trim()}-${boxSize}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .substring(0, 100)

      await prisma.contactLens.upsert({
        where: {
          id: uniqueKey, // Using the unique key as id since we don't have a unique constraint
        },
        update: {
          manufacturer: manufacturer.trim(),
          lensName: lensName.trim(),
          boxSize,
          wholesaleCost,
          retailPrice,
          annualSupplyBothEyes: parseInt2(annualBothStr),
          annualSupplyPerEye: parseInt2(annualPerEyeStr),
          ...lensType,
          updatedAt: new Date(),
        },
        create: {
          id: uniqueKey,
          manufacturer: manufacturer.trim(),
          lensName: lensName.trim(),
          boxSize,
          wholesaleCost,
          retailPrice,
          annualSupplyBothEyes: parseInt2(annualBothStr),
          annualSupplyPerEye: parseInt2(annualPerEyeStr),
          ...lensType,
          isActive: true,
        },
      })

      imported++
      if (imported % 20 === 0) {
        console.log(`Imported ${imported} contact lenses...`)
      }
    } catch (error) {
      console.error(`Error importing "${lensName}":`, error)
      errors++
    }
  }

  console.log('\n=== Import Complete ===')
  console.log(`Imported: ${imported}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

importContacts()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
