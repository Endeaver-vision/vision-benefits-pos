/**
 * Seed Services
 *
 * Loads service/fee schedule data from CSV into the ServicePrice table
 *
 * Run with: npx tsx scripts/seed-services.ts
 */

import { PrismaClient, ServiceCategory } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface CsvRow {
  'Service Category': string
  'Service Description': string
  Code: string
  Price: string
  'POS Category': string
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',')

  return lines.slice(1).map(line => {
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

function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null
  const cleaned = priceStr.replace(/[$,]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function determineBillingBucket(serviceCategory: string): string {
  const cat = serviceCategory.toLowerCase()
  if (cat.includes('manual')) return 'B'
  if (cat.includes('non-billable') || cat.includes('admin')) return 'C'
  return 'A' // Default for "Common Services" and "Billable Service"
}

function determineServiceCategory(description: string, posCategory: string): ServiceCategory | null {
  const desc = description.toLowerCase()
  const pos = posCategory.toLowerCase()

  // Use POS Category first if available
  if (pos.includes('exam')) return 'EXAM'
  if (pos.includes('contact lens')) return 'CONTACT_LENS_FIT'
  if (pos.includes('diagnostic')) return 'DIAGNOSTIC'
  if (pos.includes('procedure') || pos.includes('surgery')) return 'PROCEDURE'

  // Fall back to description analysis
  if (desc.includes('exam') || desc.includes('e&m') || desc.includes('ophth')) {
    return 'EXAM'
  }

  if (desc.includes('cl fitting') || desc.includes('contact') && desc.includes('fit')) {
    return 'CONTACT_LENS_FIT'
  }

  if (desc.includes('spectacle') && desc.includes('fitting')) {
    return 'FITTING'
  }

  if (desc.includes('removal') || desc.includes('excision') || desc.includes('injection') ||
      desc.includes('surgery') || desc.includes('closure') || desc.includes('keratoplasty')) {
    return 'PROCEDURE'
  }

  if (desc.includes('visual field') || desc.includes('oct') || desc.includes('tomography') ||
      desc.includes('photography') || desc.includes('topography') || desc.includes('pachymetry') ||
      desc.includes('gonioscopy') || desc.includes('tonometry') || desc.includes('biometry') ||
      desc.includes('angiography') || desc.includes('imaging') || desc.includes('optomap')) {
    return 'DIAGNOSTIC'
  }

  if (desc.includes('consultation') || desc.includes('consult')) {
    return 'CONSULTATION'
  }

  return 'OTHER'
}

function generateSku(description: string, code: string, index: number): string {
  const cleanCode = code?.replace(/[^a-zA-Z0-9]/g, '') || 'NOCODE'
  return `SVC-${cleanCode}-${index}`
}

async function main() {
  console.log('Loading Services/Fee Schedule data...')

  const csvPath = path.join(
    '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C',
    'POS_Fee_Schedule_With_Common_Services_Top.csv'
  )

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCsv(content)

  console.log(`Found ${rows.length} service entries to import`)

  // Clear existing data
  const deleteResult = await prisma.servicePrice.deleteMany({})
  console.log(`Cleared ${deleteResult.count} existing services`)

  let inserted = 0
  let skipped = 0

  // Track unique services to avoid duplicates (same description + code)
  const seen = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const serviceCategory = row['Service Category']?.trim()
    const description = row['Service Description']?.trim()
    const code = row.Code?.trim()
    const price = parsePrice(row.Price)
    const posCategory = row['POS Category']?.trim()

    // Skip empty rows or rows without price
    if (!description || price === null) {
      skipped++
      continue
    }

    // Skip duplicates
    const key = `${description}|${code}`
    if (seen.has(key)) {
      skipped++
      continue
    }
    seen.add(key)

    const billingBucket = determineBillingBucket(serviceCategory)
    const category = determineServiceCategory(description, posCategory)
    const sku = generateSku(description, code, i)

    try {
      await prisma.servicePrice.create({
        data: {
          name: description,
          sku,
          code: code || null,
          retailPrice: price,
          category,
          billingBucket,
          description: posCategory || serviceCategory,
          isActive: true,
        },
      })
      inserted++
    } catch (error) {
      if ((error as Error).message.includes('Unique constraint')) {
        // Try with modified SKU
        try {
          await prisma.servicePrice.create({
            data: {
              name: description,
              sku: `${sku}-${Date.now()}`,
              code: code || null,
              retailPrice: price,
              category,
              billingBucket,
              description: posCategory || serviceCategory,
              isActive: true,
            },
          })
          inserted++
        } catch {
          console.log(`  Skipping duplicate: ${description}`)
          skipped++
        }
      } else {
        console.error(`Error inserting ${description}:`, error)
        skipped++
      }
    }
  }

  console.log(`\nImport complete:`)
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Skipped: ${skipped}`)

  // Summary by billing bucket
  const buckets = await prisma.servicePrice.groupBy({
    by: ['billingBucket'],
    _count: { billingBucket: true },
  })

  console.log(`\nServices by billing bucket:`)
  for (const b of buckets.sort((a, b) => (a.billingBucket || '').localeCompare(b.billingBucket || ''))) {
    const label = b.billingBucket === 'A' ? 'A (Auto)' : b.billingBucket === 'B' ? 'B (Manual)' : 'C (Non-billable)'
    console.log(`  ${label}: ${b._count.billingBucket}`)
  }

  // Summary by category
  const categories = await prisma.servicePrice.groupBy({
    by: ['category'],
    _count: { category: true },
  })

  console.log(`\nServices by category:`)
  for (const c of categories) {
    console.log(`  ${c.category || 'UNCATEGORIZED'}: ${c._count.category}`)
  }

  // Summary by POS category
  const posCats = await prisma.servicePrice.groupBy({
    by: ['description'],
    _count: { description: true },
  })

  console.log(`\nServices by POS category:`)
  for (const p of posCats.sort((a, b) => b._count.description - a._count.description)) {
    console.log(`  ${p.description || 'Uncategorized'}: ${p._count.description}`)
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
