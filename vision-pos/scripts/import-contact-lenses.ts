#!/usr/bin/env npx tsx
/**
 * Import contact lenses from external JSON catalog
 *
 * Usage: npx tsx scripts/import-contact-lenses.ts /path/to/contact-lenses.json
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface SourceLens {
  manufacturer: string
  name: string
  price_per_box: number
  box_size: number
  annual_supply_threshold: {
    both_eyes: number
    per_eye: number
  }
  modality: string
  office_price: number
}

interface SourceData {
  last_updated: string
  contact_lenses: SourceLens[]
  discount_rules: {
    annual_supply_discount: {
      daily: number
      biweekly: number
      monthly: number
    }
  }
}

async function importContactLenses(jsonPath: string) {
  console.log(`\n📦 Importing contact lenses from: ${jsonPath}\n`)

  // Read JSON file
  const rawData = fs.readFileSync(jsonPath, 'utf-8')
  const data: SourceData = JSON.parse(rawData)

  console.log(`Found ${data.contact_lenses.length} lenses in catalog`)
  console.log(`Last updated: ${data.last_updated}`)
  console.log(`Discount rules:`, data.discount_rules.annual_supply_discount)
  console.log('')

  let created = 0
  let updated = 0
  let errors = 0

  for (const lens of data.contact_lenses) {
    try {
      // Map modality from source format
      const modality = lens.modality // already 'daily', 'biweekly', 'monthly'

      // Determine lens type flags
      const isAstigmatism = lens.name.toLowerCase().includes('toric') ||
                            lens.name.toLowerCase().includes('astigmatism')
      const isMultifocal = lens.name.toLowerCase().includes('multifocal') ||
                           lens.name.toLowerCase().includes('bifocal') ||
                           lens.name.toLowerCase().includes('presbyopia')
      const isColor = lens.name.toLowerCase().includes('color')

      // Upsert the lens
      const result = await prisma.contactLens.upsert({
        where: {
          manufacturer_lensName_boxSize: {
            manufacturer: lens.manufacturer,
            lensName: lens.name,
            boxSize: lens.box_size,
          },
        },
        create: {
          manufacturer: lens.manufacturer,
          lensName: lens.name,
          boxSize: lens.box_size,
          retailPrice: lens.price_per_box,
          officePrice: lens.office_price,
          modality: modality,
          annualSupplyBothEyes: lens.annual_supply_threshold.both_eyes,
          annualSupplyPerEye: lens.annual_supply_threshold.per_eye,
          isAstigmatism,
          isMultifocal,
          isColor,
          isDaily: modality === 'daily',
          isWeekly: modality === 'biweekly',
          isMonthly: modality === 'monthly',
          isActive: true,
          showInPos: true,
        },
        update: {
          retailPrice: lens.price_per_box,
          officePrice: lens.office_price,
          modality: modality,
          annualSupplyBothEyes: lens.annual_supply_threshold.both_eyes,
          annualSupplyPerEye: lens.annual_supply_threshold.per_eye,
          isAstigmatism,
          isMultifocal,
          isColor,
          isDaily: modality === 'daily',
          isWeekly: modality === 'biweekly',
          isMonthly: modality === 'monthly',
          isActive: true,
          showInPos: true,
        },
      })

      // Check if it was created or updated
      const existing = await prisma.contactLens.findFirst({
        where: {
          manufacturer: lens.manufacturer,
          lensName: lens.name,
          boxSize: lens.box_size,
        },
      })

      if (existing?.createdAt.getTime() === existing?.updatedAt.getTime()) {
        created++
      } else {
        updated++
      }

      console.log(`✓ ${lens.manufacturer} ${lens.name} (${lens.box_size}-pk)`)
    } catch (error) {
      errors++
      console.error(`✗ Failed: ${lens.manufacturer} ${lens.name}`, error)
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Created: ${created}`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Errors:  ${errors}`)
  console.log(`   Total:   ${data.contact_lenses.length}`)

  // Show current database count
  const totalCount = await prisma.contactLens.count()
  console.log(`\n   Database now has ${totalCount} contact lenses`)
}

async function main() {
  const jsonPath = process.argv[2] || '/Users/cmac/Documents/office-apps-main/Contact_lens_calc/contact-lenses.json'

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`)
    console.log('\nUsage: npx tsx scripts/import-contact-lenses.ts /path/to/contact-lenses.json')
    process.exit(1)
  }

  try {
    await importContactLenses(jsonPath)
  } catch (error) {
    console.error('Import failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
