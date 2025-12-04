/**
 * Import Services Price List CSV into service_prices table
 *
 * CSV Format: Service Short Desc, Service Retail
 *
 * Run with: npx tsx scripts/import-services.ts
 */

import { PrismaClient, ServiceCategory } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null
  const parsed = parseFloat(value.replace(/[$,]/g, ''))
  return isNaN(parsed) ? null : parsed
}

function detectCategory(name: string): ServiceCategory {
  const lower = name.toLowerCase()

  // Exam related
  if (lower.includes('ophth') && lower.includes('service')) return 'EXAM'
  if (lower.includes('e&m level')) return 'EXAM'
  if (lower.includes('consultation')) return 'EXAM'
  if (lower.includes('eye exam')) return 'EXAM'

  // Contact lens fitting
  if (lower.includes('cl fitting') || lower.includes('contact lens fitting')) return 'CONTACT_LENS_FIT'

  // Diagnostic tests
  if (lower.includes('visual field')) return 'DIAGNOSTIC'
  if (lower.includes('oct') || lower.includes('imaging')) return 'DIAGNOSTIC'
  if (lower.includes('topography')) return 'DIAGNOSTIC'
  if (lower.includes('fundus') || lower.includes('photography')) return 'DIAGNOSTIC'
  if (lower.includes('angiography')) return 'DIAGNOSTIC'
  if (lower.includes('tonometry') || lower.includes('tonography')) return 'DIAGNOSTIC'
  if (lower.includes('gonioscopy')) return 'DIAGNOSTIC'
  if (lower.includes('pachymetry')) return 'DIAGNOSTIC'
  if (lower.includes('refraction')) return 'DIAGNOSTIC'
  if (lower.includes('optomap')) return 'DIAGNOSTIC'
  if (lower.includes('biometry')) return 'DIAGNOSTIC'

  // Procedures
  if (lower.includes('foreign body')) return 'PROCEDURE'
  if (lower.includes('removal')) return 'PROCEDURE'
  if (lower.includes('excision')) return 'PROCEDURE'
  if (lower.includes('injection')) return 'PROCEDURE'
  if (lower.includes('punctum') || lower.includes('punctal')) return 'PROCEDURE'
  if (lower.includes('cataract')) return 'PROCEDURE'
  if (lower.includes('keratoplasty')) return 'PROCEDURE'
  if (lower.includes('trichiasis')) return 'PROCEDURE'
  if (lower.includes('dilation of punctum')) return 'PROCEDURE'

  // Spectacle fitting
  if (lower.includes('spectacle')) return 'SPECTACLE_SERVICE'

  // Materials/copays
  if (lower.includes('copay') || lower.includes('material')) return 'OTHER'

  // Administrative
  if (lower.includes('no show') || lower.includes('cancel') || lower.includes('reschedule')) return 'OTHER'
  if (lower.includes('shipping')) return 'OTHER'
  if (lower.includes('after hours')) return 'OTHER'

  // Quality measures (typically $0)
  if (lower.includes('tobacco') || lower.includes('hemoglobin') || lower.includes('a1c')) return 'OTHER'
  if (lower.includes('documented') || lower.includes('assessed')) return 'OTHER'
  if (lower.includes('hospice') || lower.includes('frailty')) return 'OTHER'

  return 'OTHER'
}

async function importServices() {
  const csvPath = path.join(
    '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C',
    'Services price list.csv'
  )

  console.log('Reading CSV from:', csvPath)

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n')

  // Skip header row
  const dataLines = lines.slice(1).filter(line => line.trim())

  console.log(`Found ${dataLines.length} services to import`)

  let imported = 0
  let skipped = 0
  let errors = 0

  // Track unique services by name to avoid duplicates (CSV has many dupes)
  const seenServices = new Map<string, { name: string; price: number; category: ServiceCategory }>()

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

    const [name, priceStr] = fields

    if (!name || name.trim() === '') {
      skipped++
      continue
    }

    const retailPrice = parseNumber(priceStr)

    // Skip entries with no price (quality measures, etc.)
    if (retailPrice === null || retailPrice === 0) {
      skipped++
      continue
    }

    const category = detectCategory(name)
    const trimmedName = name.trim()

    // Track highest price for duplicate services
    const existing = seenServices.get(trimmedName.toLowerCase())
    if (!existing || retailPrice > existing.price) {
      seenServices.set(trimmedName.toLowerCase(), {
        name: trimmedName,
        price: retailPrice,
        category,
      })
    }
  }

  console.log(`Found ${seenServices.size} unique services with prices`)

  // Now import the unique services
  for (const [, service] of seenServices) {
    try {
      // Create unique SKU from name
      const sku = service.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50)

      await prisma.servicePrice.upsert({
        where: {
          sku,
        },
        update: {
          name: service.name,
          category: service.category,
          retailPrice: service.price,
          updatedAt: new Date(),
        },
        create: {
          name: service.name,
          sku,
          category: service.category,
          retailPrice: service.price,
          isActive: true,
        },
      })

      imported++
      if (imported % 20 === 0) {
        console.log(`Imported ${imported} services...`)
      }
    } catch (error) {
      console.error(`Error importing "${service.name}":`, error)
      errors++
    }
  }

  console.log('\n=== Import Complete ===')
  console.log(`Imported: ${imported}`)
  console.log(`Skipped (no price): ${skipped}`)
  console.log(`Errors: ${errors}`)
}

importServices()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
