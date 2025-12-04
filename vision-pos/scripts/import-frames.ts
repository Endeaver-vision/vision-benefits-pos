/**
 * Import Frames Pricebook CSV into frames table
 *
 * CSV Format: Manufacturer,Brand,Collection,Model,Color,Color Code,Eye,Bridge,Temple,#,Description,UPC,SKU,Retail,Wholesale,Stock
 *
 * Run with: npx tsx scripts/import-frames.ts
 */

import { PrismaClient, FrameGender } from '@prisma/client'
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

function parseGender(description: string | undefined): FrameGender | null {
  if (!description) return null
  const lower = description.toLowerCase()

  if (lower.includes('woman') || lower.includes('women')) return 'WOMENS'
  if (lower.includes('man') || lower.includes('men')) return 'MENS'
  if (lower.includes('kid') || lower.includes('child')) return 'KIDS'
  if (lower.includes('unisex')) return 'UNISEX'

  return null
}

async function importFrames() {
  const csvPath = path.join(
    '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C',
    'frames_pricebook.csv'
  )

  console.log('Reading CSV from:', csvPath)

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n')

  // Skip header row
  const dataLines = lines.slice(1).filter(line => line.trim())

  console.log(`Found ${dataLines.length} frames to import`)

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
      brand,
      collection,
      model,
      color,
      colorCode,
      eyeStr,
      bridgeStr,
      templeStr,
      internalId,
      description,
      upc,
      sku,
      retailStr,
      wholesaleStr,
      stockStr,
    ] = fields

    // Skip if essential fields missing
    if (!brand || !model || !color) {
      skipped++
      continue
    }

    try {
      const retailPrice = parseNumber(retailStr)
      const wholesaleCost = parseNumber(wholesaleStr)
      const stockQuantity = parseInt2(stockStr) || 0

      // Skip if no retail price or wholesale
      if (retailPrice === null || wholesaleCost === null) {
        console.log(`Skipping "${brand} ${model}" - missing price`)
        skipped++
        continue
      }

      // Create unique SKU if not provided
      const frameSku = sku || `${brand}-${model}-${colorCode || color}`.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50)

      // Upsert to handle re-runs
      await prisma.frame.upsert({
        where: {
          sku: frameSku,
        },
        update: {
          manufacturer: manufacturer?.trim() || 'Unknown',
          brand: brand.trim(),
          collection: collection?.trim() || null,
          model: model.trim(),
          color: color.trim(),
          colorCode: colorCode?.trim() || null,
          eyeSize: parseInt2(eyeStr),
          bridge: parseInt2(bridgeStr),
          temple: parseInt2(templeStr),
          upc: upc?.trim() || null,
          internalId: internalId?.trim() || null,
          wholesaleCost,
          retailPrice,
          stockQuantity: stockQuantity >= 0 ? stockQuantity : 0,
          gender: parseGender(description),
          description: description?.trim() || null,
          updatedAt: new Date(),
        },
        create: {
          manufacturer: manufacturer?.trim() || 'Unknown',
          brand: brand.trim(),
          collection: collection?.trim() || null,
          model: model.trim(),
          color: color.trim(),
          colorCode: colorCode?.trim() || null,
          eyeSize: parseInt2(eyeStr),
          bridge: parseInt2(bridgeStr),
          temple: parseInt2(templeStr),
          upc: upc?.trim() || null,
          sku: frameSku,
          internalId: internalId?.trim() || null,
          wholesaleCost,
          retailPrice,
          stockQuantity: stockQuantity >= 0 ? stockQuantity : 0,
          gender: parseGender(description),
          description: description?.trim() || null,
          isActive: true,
        },
      })

      imported++
      if (imported % 100 === 0) {
        console.log(`Imported ${imported} frames...`)
      }
    } catch (error) {
      console.error(`Error importing "${brand} ${model}":`, error)
      errors++
    }
  }

  console.log('\n=== Import Complete ===')
  console.log(`Imported: ${imported}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

importFrames()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
