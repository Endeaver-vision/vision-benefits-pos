/**
 * Seed Contact Lenses
 *
 * Loads contact lens data from CSV into the ContactLens table
 *
 * Run with: npx tsx scripts/seed-contact-lenses.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface CsvRow {
  Manufacture: string
  Lens: string
  Price: string
  'Box Size': string
  'Needed for Annual Supply (both eyes)': string
  ' Needed for Annual Supply (per eye)': string
  'Current Office Price': string
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

function parseInt2(str: string): number | null {
  if (!str) return null
  const num = parseInt(str, 10)
  return isNaN(num) ? null : num
}

function determineLensFlags(lensName: string): {
  isAstigmatism: boolean
  isMultifocal: boolean
  isColor: boolean
  isDaily: boolean
  isWeekly: boolean
  isMonthly: boolean
  isExtendedWear: boolean
} {
  const name = lensName.toLowerCase()

  return {
    isAstigmatism: name.includes('toric') || name.includes('astigmatism'),
    isMultifocal: name.includes('multifocal') || name.includes('bifocal') || name.includes('presbyopia'),
    isColor: name.includes('color'),
    isDaily: name.includes('1-day') || name.includes('1 day') || name.includes('one-day') || name.includes('oneday') || name.includes('dailies'),
    isWeekly: name.includes('2 week') || name.includes('biweekly') || name.includes('oasys') && !name.includes('1 day'),
    isMonthly: name.includes('monthly') || name.includes('30') || name.includes('air optix') || name.includes('biofinity') || name.includes('proclear') && !name.includes('1-day') || name.includes('ultra') || name.includes('vita'),
    isExtendedWear: name.includes('night') || name.includes('day') && name.includes('air optix') || name.includes('extended') || name.includes('purevision'),
  }
}

function determineInsuranceCategories(lensName: string, boxSize: number): {
  vspCategory: string
  eyemedCategory: string
  specteraCategory: string
} {
  const name = lensName.toLowerCase()
  const isDaily = name.includes('1-day') || name.includes('1 day') || name.includes('one-day') || name.includes('oneday') || name.includes('dailies')

  // VSP categories: selection (formulary dailies), non_selection (everything else)
  const vspCategory = isDaily ? 'selection_daily' : 'selection_monthly'

  // EyeMed categories based on replacement schedule
  const eyemedCategory = isDaily ? 'disposable_daily' : 'planned_replacement'

  // Spectera categories
  const specteraCategory = isDaily ? 'daily_biweekly' : 'monthly'

  return { vspCategory, eyemedCategory, specteraCategory }
}

async function main() {
  console.log('Loading Contact Lens data...')

  const csvPath = path.join(
    '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C',
    'Contact Lens _ Price List - Sheet1.csv'
  )

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCsv(content)

  console.log(`Found ${rows.length} contact lens entries to import`)

  // Clear existing data
  const deleteResult = await prisma.contactLens.deleteMany({})
  console.log(`Cleared ${deleteResult.count} existing contact lenses`)

  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    const manufacturer = row.Manufacture?.trim()
    const lensName = row.Lens?.trim()
    const boxSize = parseInt2(row['Box Size'])
    const retailPrice = parsePrice(row.Price)
    const officePrice = parsePrice(row['Current Office Price'])
    const annualBoth = parseInt2(row['Needed for Annual Supply (both eyes)'])
    const annualPerEye = parseInt2(row[' Needed for Annual Supply (per eye)'])

    // Skip invalid rows
    if (!manufacturer || !lensName || !boxSize || retailPrice === null) {
      skipped++
      continue
    }

    const flags = determineLensFlags(lensName)
    const categories = determineInsuranceCategories(lensName, boxSize)

    try {
      await prisma.contactLens.create({
        data: {
          manufacturer,
          lensName,
          boxSize,
          retailPrice,
          officePrice,
          annualSupplyBothEyes: annualBoth,
          annualSupplyPerEye: annualPerEye,
          ...flags,
          ...categories,
          isActive: true,
        },
      })
      inserted++
    } catch (error) {
      if ((error as Error).message.includes('Unique constraint')) {
        console.log(`  Skipping duplicate: ${manufacturer} ${lensName} (${boxSize})`)
        skipped++
      } else {
        console.error(`Error inserting ${lensName}:`, error)
        skipped++
      }
    }
  }

  console.log(`\nImport complete:`)
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Skipped: ${skipped}`)

  // Summary by manufacturer
  const manufacturers = await prisma.contactLens.groupBy({
    by: ['manufacturer'],
    _count: { manufacturer: true },
  })

  console.log(`\nContact lenses by manufacturer:`)
  for (const m of manufacturers.sort((a, b) => b._count.manufacturer - a._count.manufacturer)) {
    console.log(`  ${m.manufacturer}: ${m._count.manufacturer}`)
  }

  // Summary by type
  const dailyCount = await prisma.contactLens.count({ where: { isDaily: true } })
  const monthlyCount = await prisma.contactLens.count({ where: { isMonthly: true } })
  const toricCount = await prisma.contactLens.count({ where: { isAstigmatism: true } })
  const multifocalCount = await prisma.contactLens.count({ where: { isMultifocal: true } })

  console.log(`\nContact lenses by type:`)
  console.log(`  Daily disposable: ${dailyCount}`)
  console.log(`  Monthly: ${monthlyCount}`)
  console.log(`  Toric (astigmatism): ${toricCount}`)
  console.log(`  Multifocal: ${multifocalCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
