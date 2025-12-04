import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Contact lens data from CSV - /Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/Contact Lens _ Price List - Sheet1.csv
// Prices are from 1800 Contacts reference
const contactLensData = [
  // Alcon Products
  { manufacturer: 'Alcon', lensName: 'PRECISION1® ONE-DAY CONTACT LENSES', price: 85.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },
  { manufacturer: 'Alcon', lensName: 'PRECISION1® ONE-DAY CONTACT LENSES', price: 37.99, boxSize: 30, annualBoth: 24, annualPer: 12, modality: 'daily' },
  { manufacturer: 'Alcon', lensName: 'PRECISION1® for Astigmatism', price: 114.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isAstigmatism: true },
  { manufacturer: 'Alcon', lensName: 'PRECISION1® for Astigmatism', price: 49.99, boxSize: 30, annualBoth: 24, annualPer: 12, modality: 'daily', isAstigmatism: true },
  { manufacturer: 'Alcon', lensName: 'DAILIES TOTAL1®', price: 132.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },
  { manufacturer: 'Alcon', lensName: 'DAILIES TOTAL1®', price: 54.99, boxSize: 30, annualBoth: 24, annualPer: 12, modality: 'daily' },
  { manufacturer: 'Alcon', lensName: 'DAILIES TOTAL1® for Astigmatism', price: 152.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isAstigmatism: true },
  { manufacturer: 'Alcon', lensName: 'DAILIES TOTAL1® for Astigmatism', price: 62.99, boxSize: 30, annualBoth: 24, annualPer: 12, modality: 'daily', isAstigmatism: true },
  { manufacturer: 'Alcon', lensName: 'DAILIES TOTAL1® Multifocal', price: 160.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isMultifocal: true },
  { manufacturer: 'Alcon', lensName: 'DAILIES TOTAL1® Multifocal', price: 69.99, boxSize: 30, annualBoth: 24, annualPer: 12, modality: 'daily', isMultifocal: true },
  { manufacturer: 'Alcon', lensName: 'PRECISION7', price: 69.99, boxSize: 12, annualBoth: 4, annualPer: 2, modality: 'biweekly' },
  { manufacturer: 'Alcon', lensName: 'PRECISION7', price: 119.99, boxSize: 27, annualBoth: 2, annualPer: 1, modality: 'biweekly' },
  { manufacturer: 'Alcon', lensName: 'Precision 7 for Astigmatism', price: 82.99, boxSize: 12, annualBoth: 4, annualPer: 12, modality: 'biweekly', isAstigmatism: true },
  { manufacturer: 'Alcon', lensName: 'Precision 7 for Astigmatism', price: 139.99, boxSize: 27, annualBoth: 2, annualPer: 1, modality: 'biweekly', isAstigmatism: true },
  { manufacturer: 'Alcon', lensName: 'AIR OPTIX® plus HydraGlyde®', price: 73.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly' },
  { manufacturer: 'Alcon', lensName: 'AIR OPTIX® plus HydraGlyde® for Astigmatism', price: 93.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isAstigmatism: true },
  { manufacturer: 'Alcon', lensName: 'TOTAL30®', price: 78.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly' },
  { manufacturer: 'Alcon', lensName: 'TOTAL30® for Astigmatism', price: 83.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isAstigmatism: true },
  { manufacturer: 'Alcon', lensName: 'TOTAL30® MultiFocal', price: 116.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isMultifocal: true },
  { manufacturer: 'Alcon', lensName: 'Dailies Colors', price: 94.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isColor: true },
  { manufacturer: 'Alcon', lensName: 'Dailies Aqua Comfort Plus Multifocal', price: 136.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isMultifocal: true },
  { manufacturer: 'Alcon', lensName: 'Dailies Aqua Comfort Plus Toric', price: 118.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isAstigmatism: true },
  { manufacturer: 'Alcon', lensName: 'Aqua Comfort Plus Dailies 8.7', price: 92.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },
  { manufacturer: 'Alcon', lensName: 'Air Optix Bifocal', price: 120.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isMultifocal: true },
  { manufacturer: 'Alcon', lensName: 'Air Optix Night & Day', price: 126.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isExtendedWear: true },
  { manufacturer: 'Alcon', lensName: 'Air Optix Colors', price: 132.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isColor: true },

  // Cooper Vision Products
  { manufacturer: 'Cooper', lensName: 'Avaira Vitality Toric', price: 53.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'biweekly', isAstigmatism: true },
  { manufacturer: 'Cooper', lensName: 'Proclear Toric', price: 106.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isAstigmatism: true },
  { manufacturer: 'Cooper', lensName: 'Proclear 1-Day', price: 100.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },
  { manufacturer: 'Cooper', lensName: 'Proclear', price: 72.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly' },
  { manufacturer: 'Cooper', lensName: 'Proclear Multifocal', price: 126.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isMultifocal: true },
  { manufacturer: 'Cooper', lensName: 'Fresh Day 1 Day Toric', price: 97.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isAstigmatism: true },
  { manufacturer: 'Cooper', lensName: 'Aquaclear Multifocal Toric', price: 179.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isMultifocal: true, isAstigmatism: true },
  { manufacturer: 'Cooper', lensName: 'Fresh Day 1 Day', price: 79.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },
  { manufacturer: 'Cooper', lensName: 'Aquaclear XR', price: 74.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly' },
  { manufacturer: 'Cooper', lensName: 'Fresh Day 1 Day Multifocal', price: 99.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isMultifocal: true },
  { manufacturer: 'Cooper', lensName: 'Biomedics 55 Premier', price: 52.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'biweekly' },
  { manufacturer: 'Cooper', lensName: 'Proclear Toric Bifocals', price: 196.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isMultifocal: true, isAstigmatism: true },
  { manufacturer: 'Cooper', lensName: 'Aqua Clear Premium', price: 68.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly' },
  { manufacturer: 'Cooper', lensName: 'Biofinity Toric XR', price: 164.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isAstigmatism: true },
  { manufacturer: 'Cooper', lensName: 'Aqua Clear Toric', price: 70.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isAstigmatism: true },
  { manufacturer: 'Cooper', lensName: 'Aqua Clear Toric XR', price: 164.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isAstigmatism: true },
  { manufacturer: 'Cooper', lensName: 'Reveal 1-Day Toric', price: 112.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isAstigmatism: true },
  { manufacturer: 'Cooper', lensName: 'Aqua Clear Multifocal', price: 96.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isMultifocal: true },
  { manufacturer: 'Cooper', lensName: 'Aqua Clear', price: 60.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly' },
  { manufacturer: 'Cooper', lensName: 'Proclear XR MF', price: 199.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isMultifocal: true },
  { manufacturer: 'Cooper', lensName: 'Reveal 1-Day Premium', price: 112.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },
  { manufacturer: 'Cooper', lensName: 'Proclear Toric XR', price: 195.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isAstigmatism: true },
  { manufacturer: 'Cooper', lensName: 'Avaira Vitality', price: 42.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'biweekly' },
  { manufacturer: 'Cooper', lensName: 'MiSight', price: 300.00, boxSize: 180, annualBoth: 4, annualPer: 2, modality: 'daily' },
  { manufacturer: 'Cooper', lensName: 'MiSight', price: 150.00, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },
  { manufacturer: 'Cooper', lensName: 'Reveal Bifocal', price: 154.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isMultifocal: true },
  { manufacturer: 'Cooper', lensName: 'Aqua Clear 110', price: 42.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly' },

  // Johnson & Johnson Vision Products
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue Oasys Multifocal', price: 64.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'biweekly', isMultifocal: true },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue Vita', price: 83.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly' },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue Oasys Transitions', price: 65.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'biweekly' },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue 2', price: 56.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'biweekly' },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue 1 Day Moist', price: 106.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue 1 Day Moist Bifocal', price: 139.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isMultifocal: true },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue 1 Day Moist Toric', price: 124.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isAstigmatism: true },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Max 1 Day Multifocal Toric', price: 65.25, boxSize: 30, annualBoth: 24, annualPer: 12, modality: 'daily', isMultifocal: true, isAstigmatism: true },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Max 1 Day Multifocal', price: 181.50, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isMultifocal: true },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue Oasys 1 Day', price: 116.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue Oasys 1 Day Toric', price: 139.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isAstigmatism: true },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue Oasys', price: 97.99, boxSize: 12, annualBoth: 4, annualPer: 2, modality: 'biweekly' },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue Oasys', price: 195.98, boxSize: 24, annualBoth: 2, annualPer: 1, modality: 'biweekly' },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue Oasys Toric', price: 69.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'biweekly', isAstigmatism: true },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue Vita Toric', price: 88.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isAstigmatism: true },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue 1 Day Max', price: 138.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },
  { manufacturer: 'Johnson & Johnson Vision', lensName: 'Acuvue 1 Day TruEye', price: 151.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },

  // Bausch & Lomb Products
  { manufacturer: 'Bausch & Lomb', lensName: 'Infuse Toric', price: 158.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isAstigmatism: true },
  { manufacturer: 'Bausch & Lomb', lensName: 'Soflens Multifocal', price: 79.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isMultifocal: true },
  { manufacturer: 'Bausch & Lomb', lensName: 'Biotrue ONEday', price: 83.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },
  { manufacturer: 'Bausch & Lomb', lensName: 'Soflens 38 EW', price: 43.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'biweekly', isExtendedWear: true },
  { manufacturer: 'Bausch & Lomb', lensName: 'Soflens Toric', price: 72.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isAstigmatism: true },
  { manufacturer: 'Bausch & Lomb', lensName: 'PureVision Bifocal', price: 101.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isMultifocal: true },
  { manufacturer: 'Bausch & Lomb', lensName: 'INFUSE One-Day Toric', price: 158.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isAstigmatism: true },
  { manufacturer: 'Bausch & Lomb', lensName: 'PureVision', price: 92.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly' },
  { manufacturer: 'Bausch & Lomb', lensName: 'Biotrue ONEday for Presbyopia', price: 117.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isMultifocal: true },
  { manufacturer: 'Bausch & Lomb', lensName: 'Biotrue ONEday Toric', price: 102.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily', isAstigmatism: true },
  { manufacturer: 'Bausch & Lomb', lensName: 'Ultra Bifocal', price: 101.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isMultifocal: true },
  { manufacturer: 'Bausch & Lomb', lensName: 'Ultra', price: 71.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly' },
  { manufacturer: 'Bausch & Lomb', lensName: 'Ultra Toric', price: 84.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isAstigmatism: true },
  { manufacturer: 'Bausch & Lomb', lensName: 'Ultra Toric Bifocal', price: 158.99, boxSize: 6, annualBoth: 4, annualPer: 2, modality: 'monthly', isMultifocal: true, isAstigmatism: true },
  { manufacturer: 'Bausch & Lomb', lensName: 'Soflens Dailies', price: 71.99, boxSize: 90, annualBoth: 8, annualPer: 4, modality: 'daily' },
]

async function seedContactLenses() {
  console.log('🔵 Starting contact lens data seed...')

  let created = 0
  let updated = 0
  let skipped = 0

  for (const lens of contactLensData) {
    try {
      // Check if lens already exists (same manufacturer, name, and box size)
      const existing = await prisma.contactLens.findFirst({
        where: {
          manufacturer: lens.manufacturer,
          lensName: lens.lensName,
          boxSize: lens.boxSize
        }
      })

      const lensData = {
        manufacturer: lens.manufacturer,
        lensName: lens.lensName,
        boxSize: lens.boxSize,
        retailPrice: lens.price,
        officePrice: lens.price, // Same as retail for now
        annualSupplyBothEyes: lens.annualBoth,
        annualSupplyPerEye: lens.annualPer,
        modality: lens.modality,
        isDaily: lens.modality === 'daily',
        isWeekly: lens.modality === 'biweekly',
        isMonthly: lens.modality === 'monthly',
        isAstigmatism: lens.isAstigmatism || false,
        isMultifocal: lens.isMultifocal || false,
        isColor: lens.isColor || false,
        isExtendedWear: lens.isExtendedWear || false,
        isActive: true,
        showInPos: true,
      }

      if (existing) {
        // Update existing record
        await prisma.contactLens.update({
          where: { id: existing.id },
          data: lensData
        })
        updated++
      } else {
        // Create new record
        await prisma.contactLens.create({
          data: lensData
        })
        created++
      }
    } catch (error) {
      console.error(`Error processing ${lens.manufacturer} ${lens.lensName}:`, error)
      skipped++
    }
  }

  console.log(`✅ Contact lens seed complete:`)
  console.log(`   - Created: ${created}`)
  console.log(`   - Updated: ${updated}`)
  console.log(`   - Skipped: ${skipped}`)
  console.log(`   - Total products: ${contactLensData.length}`)
}

// Run the seed
seedContactLenses()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
