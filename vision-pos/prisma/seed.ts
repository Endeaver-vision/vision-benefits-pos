import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create locations
  console.log('📍 Creating locations...')
  const downtown = await prisma.location.upsert({
    where: { name: 'Downtown' },
    update: {},
    create: {
      name: 'Downtown',
      address: '123 Main Street, Downtown Vision Center',
      phone: '(555) 123-4567',
      timezone: 'America/Los_Angeles',
    },
  })

  const westside = await prisma.location.upsert({
    where: { name: 'Westside' },
    update: {},
    create: {
      name: 'Westside',
      address: '456 Oak Avenue, Westside Eye Care',
      phone: '(555) 987-6543',
      timezone: 'America/Los_Angeles',
    },
  })

  console.log(`✅ Created locations: ${downtown.name}, ${westside.name}`)

  // Create insurance carriers
  console.log('🏥 Creating insurance carriers...')
  const vsp = await prisma.insuranceCarrier.upsert({
    where: { code: 'vsp' },
    update: {},
    create: {
      name: 'VSP',
      code: 'vsp',
      config: {
        tiers: ['K', 'J', 'F', 'O', 'N'],
        pricingTiers: ['Signature', 'Choice', 'Advantage', 'Enhanced Advantage']
      },
    },
  })

  const eyemed = await prisma.insuranceCarrier.upsert({
    where: { code: 'eyemed' },
    update: {},
    create: {
      name: 'EyeMed',
      code: 'eyemed',
      config: {
        tiers: ['tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5']
      },
    },
  })

  const spectera = await prisma.insuranceCarrier.upsert({
    where: { code: 'spectera' },
    update: {},
    create: {
      name: 'Spectera',
      code: 'spectera',
      config: {
        tiers: ['I', 'II', 'III', 'IV', 'V']
      },
    },
  })

  console.log(`✅ Created carriers: ${vsp.name}, ${eyemed.name}, ${spectera.name}`)

  // Create product categories
  console.log('📦 Creating product categories...')
  const frames = await prisma.productCategory.upsert({
    where: { code: 'frames' },
    update: {},
    create: {
      name: 'Frames',
      code: 'frames',
      description: 'Eyeglass frames and sunglasses',
    },
  })

  const lenses = await prisma.productCategory.upsert({
    where: { code: 'lenses' },
    update: {},
    create: {
      name: 'Lenses',
      code: 'lenses',
      description: 'Progressive, single vision, and bifocal lenses',
    },
  })

  const coatings = await prisma.productCategory.upsert({
    where: { code: 'coatings' },
    update: {},
    create: {
      name: 'Coatings',
      code: 'coatings',
      description: 'Anti-reflective and protective lens coatings',
    },
  })

  const addons = await prisma.productCategory.upsert({
    where: { code: 'addons' },
    update: {},
    create: {
      name: 'Add-ons',
      code: 'addons',
      description: 'Lens enhancements and special features',
    },
  })

  const contacts = await prisma.productCategory.upsert({
    where: { code: 'contacts' },
    update: {},
    create: {
      name: 'Contacts',
      code: 'contacts',
      description: 'Contact lenses and related products',
    },
  })

  console.log(`✅ Created categories: ${frames.name}, ${lenses.name}, ${coatings.name}, ${addons.name}, ${contacts.name}`)

  // Create admin user
  console.log('👤 Creating admin user...')
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@visionpos.com' },
    update: {},
    create: {
      email: 'admin@visionpos.com',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      locationId: downtown.id,
      passwordHash: '$2a$10$K7L4qqxQlxHbF8RbNr.MNOw7HQwRCkKbVz6K8VgMJsKYfAf5wQ8tK', // 'admin123'
    },
  })

  console.log(`✅ Created admin user: ${adminUser.email}`)

  console.log('🎉 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })