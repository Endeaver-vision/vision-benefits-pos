import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Adding sample products...')

  // Get category IDs
  const lensCategory = await prisma.productCategory.findUnique({ where: { code: 'lenses' } })
  const coatingCategory = await prisma.productCategory.findUnique({ where: { code: 'coatings' } })
  const frameCategory = await prisma.productCategory.findUnique({ where: { code: 'frames' } })

  if (!lensCategory || !coatingCategory || !frameCategory) {
    throw new Error('Categories not found. Run seed first.')
  }

  // Progressive Lenses from VSP Schema
  console.log('👓 Adding progressive lenses...')
  
  const progressives = [
    // VSP Tier K (Standard)
    { name: 'Varilux Comfort', manufacturer: 'Essilor', price: 165.0, vsp: 'K', eyemed: 'tier_3', spectera: 'II' },
    { name: 'ZEISS Progressive Light D', manufacturer: 'ZEISS', price: 155.0, vsp: 'K', eyemed: 'tier_1', spectera: 'I' },
    { name: 'Shamir Genesis HD', manufacturer: 'Shamir', price: 145.0, vsp: 'K', eyemed: 'tier_1', spectera: 'I' },
    
    // VSP Tier J (Premium Standard)
    { name: 'Varilux Comfort 2', manufacturer: 'Essilor', price: 210.0, vsp: 'J', eyemed: 'tier_3', spectera: 'II' },
    { name: 'KODAK Precise', manufacturer: 'KODAK', price: 195.0, vsp: 'J', eyemed: 'tier_2', spectera: 'II' },
    { name: 'Shamir Element', manufacturer: 'Shamir', price: 185.0, vsp: 'J', eyemed: 'tier_1', spectera: 'I' },
    
    // VSP Tier F (Premium Advanced)
    { name: 'Varilux Comfort Max', manufacturer: 'Essilor', price: 265.0, vsp: 'F', eyemed: 'tier_3', spectera: 'III' },
    { name: 'Varilux Physio DRx', manufacturer: 'Essilor', price: 275.0, vsp: 'F', eyemed: 'tier_3', spectera: 'III' },
    { name: 'ZEISS Progressive Light 2 3DV', manufacturer: 'ZEISS', price: 255.0, vsp: 'F', eyemed: 'tier_3', spectera: 'III' },
    
    // VSP Tier O (Custom Level 1)
    { name: 'Varilux Physio W3+', manufacturer: 'Essilor', price: 335.0, vsp: 'O', eyemed: 'tier_4', spectera: 'IV' },
    { name: 'Varilux X Design Technology', manufacturer: 'Essilor', price: 345.0, vsp: 'O', eyemed: 'tier_4', spectera: 'IV' },
    { name: 'ZEISS SmartLife Superb', manufacturer: 'ZEISS', price: 325.0, vsp: 'O', eyemed: 'tier_4', spectera: 'IV' },
    
    // VSP Tier N (Custom Level 2)
    { name: 'Varilux X Fit Technology', manufacturer: 'Essilor', price: 425.0, vsp: 'N', eyemed: 'tier_5', spectera: 'V' },
    { name: 'Varilux XR Design', manufacturer: 'Essilor', price: 435.0, vsp: 'N', eyemed: 'tier_5', spectera: 'V' },
    { name: 'ZEISS SmartLife Individual', manufacturer: 'ZEISS', price: 445.0, vsp: 'N', eyemed: 'tier_5', spectera: 'V' },
  ]

  for (const prog of progressives) {
    await prisma.product.upsert({
      where: { sku: `${prog.manufacturer.toLowerCase()}-${prog.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        name: prog.name,
        sku: `${prog.manufacturer.toLowerCase()}-${prog.name.toLowerCase().replace(/\s+/g, '-')}`,
        categoryId: lensCategory.id,
        manufacturer: prog.manufacturer,
        basePrice: prog.price,
        tierVsp: prog.vsp,
        tierEyemed: prog.eyemed,
        tierSpectera: prog.spectera,
      },
    })
  }

  console.log(`✅ Added ${progressives.length} progressive lenses`)

  // AR Coatings from schema
  console.log('✨ Adding AR coatings...')
  
  const coatings = [
    // Basic Tier
    { name: 'Basic AR', manufacturer: 'Generic', price: 45.0, vsp: 'QM', eyemed: 'tier_1', spectera: 'I' },
    { name: 'Unity AR', manufacturer: 'Plexus', price: 55.0, vsp: 'QM', eyemed: 'tier_1', spectera: 'I' },
    
    // Premium Tier
    { name: 'Crizal Easy', manufacturer: 'Essilor', price: 85.0, vsp: 'QT', eyemed: 'tier_2', spectera: 'II' },
    { name: 'Crizal Prevencia', manufacturer: 'Essilor', price: 95.0, vsp: 'QT', eyemed: 'tier_2', spectera: 'III' },
    
    // Premium Plus Tier
    { name: 'Crizal Sapphire', manufacturer: 'Essilor', price: 125.0, vsp: 'QV', eyemed: 'tier_3', spectera: 'IV' },
    { name: 'Crizal Rock', manufacturer: 'Essilor', price: 135.0, vsp: 'QV', eyemed: 'tier_3', spectera: 'IV' },
  ]

  for (const coating of coatings) {
    await prisma.product.upsert({
      where: { sku: `ar-${coating.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        name: coating.name,
        sku: `ar-${coating.name.toLowerCase().replace(/\s+/g, '-')}`,
        categoryId: coatingCategory.id,
        manufacturer: coating.manufacturer,
        basePrice: coating.price,
        tierVsp: coating.vsp,
        tierEyemed: coating.eyemed,
        tierSpectera: coating.spectera,
      },
    })
  }

  console.log(`✅ Added ${coatings.length} AR coatings`)

  // Sample Frames
  console.log('🕶️ Adding sample frames...')
  
  const frames = [
    { name: 'Ray-Ban Aviator', manufacturer: 'Ray-Ban', price: 185.0 },
    { name: 'Oakley Holbrook', manufacturer: 'Oakley', price: 165.0 },
    { name: 'Persol PO3019S', manufacturer: 'Persol', price: 245.0 },
    { name: 'Warby Parker Haskell', manufacturer: 'Warby Parker', price: 95.0 },
    { name: 'Tom Ford TF5401', manufacturer: 'Tom Ford', price: 325.0 },
  ]

  for (const frame of frames) {
    await prisma.product.upsert({
      where: { sku: `frame-${frame.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        name: frame.name,
        sku: `frame-${frame.name.toLowerCase().replace(/\s+/g, '-')}`,
        categoryId: frameCategory.id,
        manufacturer: frame.manufacturer,
        basePrice: frame.price,
      },
    })
  }

  console.log(`✅ Added ${frames.length} frames`)

  // Add products to both locations
  console.log('🏢 Adding products to locations...')
  
  const products = await prisma.product.findMany()
  const locations = await prisma.location.findMany()

  for (const product of products) {
    for (const location of locations) {
      await prisma.productLocation.upsert({
        where: {
          productId_locationId: {
            productId: product.id,
            locationId: location.id,
          },
        },
        update: {},
        create: {
          productId: product.id,
          locationId: location.id,
          available: true,
        },
      })
    }
  }

  console.log('✅ Products added to all locations')
  console.log('🎉 Sample products seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Product seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })