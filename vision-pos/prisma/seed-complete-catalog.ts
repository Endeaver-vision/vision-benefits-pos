import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding complete product catalog...')

  // Create all product categories
  const categories = await Promise.all([
    prisma.productCategory.upsert({
      where: { code: 'PROGRESSIVE_LENSES' },
      update: {},
      create: { name: 'Progressive Lenses', code: 'PROGRESSIVE_LENSES', active: true }
    }),
    prisma.productCategory.upsert({
      where: { code: 'SINGLE_VISION_LENSES' },
      update: {},
      create: { name: 'Single Vision Lenses', code: 'SINGLE_VISION_LENSES', active: true }
    }),
    prisma.productCategory.upsert({
      where: { code: 'LINED_MULTIFOCAL' },
      update: {},
      create: { name: 'Lined Multifocal', code: 'LINED_MULTIFOCAL', active: true }
    }),
    prisma.productCategory.upsert({
      where: { code: 'AR_COATINGS' },
      update: {},
      create: { name: 'AR Coatings', code: 'AR_COATINGS', active: true }
    }),
    prisma.productCategory.upsert({
      where: { code: 'PHOTOCHROMIC' },
      update: {},
      create: { name: 'Photochromic', code: 'PHOTOCHROMIC', active: true }
    }),
    prisma.productCategory.upsert({
      where: { code: 'POLARIZED' },
      update: {},
      create: { name: 'Polarized', code: 'POLARIZED', active: true }
    }),
    prisma.productCategory.upsert({
      where: { code: 'LENS_MATERIALS' },
      update: {},
      create: { name: 'Lens Materials', code: 'LENS_MATERIALS', active: true }
    }),
    prisma.productCategory.upsert({
      where: { code: 'EXAMS' },
      update: {},
      create: { name: 'Exams', code: 'EXAMS', active: true }
    }),
    prisma.productCategory.upsert({
      where: { code: 'EXAM_ADDONS' },
      update: {},
      create: { name: 'Exam Add-ons', code: 'EXAM_ADDONS', active: true }
    }),
    prisma.productCategory.upsert({
      where: { code: 'CONTACT_FITTING' },
      update: {},
      create: { name: 'Contact Lens Fitting', code: 'CONTACT_FITTING', active: true }
    }),
    prisma.productCategory.upsert({
      where: { code: 'LENS_ADDONS' },
      update: {},
      create: { name: 'Lens Add-ons', code: 'LENS_ADDONS', active: true }
    }),
    prisma.productCategory.upsert({
      where: { code: 'MOUNT_FEES' },
      update: {},
      create: { name: 'Mount Fees', code: 'MOUNT_FEES', active: true }
    }),
  ])

  const categoryMap = categories.reduce((acc, cat) => {
    acc[cat.code] = cat.id
    return acc
  }, {} as Record<string, string>)

  console.log('✅ Categories created')

  // Progressive Lenses - Based on VSP, EyeMed, and Spectera schemas
  const progressives = [
    {
      name: 'Varilux X',
      sku: 'VAR-X',
      manufacturer: 'Essilor',
      basePrice: 600.00,
      categoryId: categoryMap.PROGRESSIVE_LENSES,
      tierVsp: 'N',        // VSP Tier N (Custom Level 2 - Highest)
      tierEyemed: 'tier_5', // EyeMed Tier 5 (Top tier)
      tierSpectera: 'V',    // Spectera Tier V (Highest)
      active: true
    },
    {
      name: 'Varilux i',
      sku: 'VAR-I',
      manufacturer: 'Essilor',
      basePrice: 480.00,
      categoryId: categoryMap.PROGRESSIVE_LENSES,
      tierVsp: 'non-formulary', // Not on VSP formulary (cash only)
      tierEyemed: 'tier_5',
      tierSpectera: 'V',
      active: true
    },
    {
      name: 'Varilux Comfort Max',
      sku: 'VAR-CMAX',
      manufacturer: 'Essilor',
      basePrice: 394.00,
      categoryId: categoryMap.PROGRESSIVE_LENSES,
      tierVsp: 'F',        // VSP Tier F (Premium Advanced)
      tierEyemed: 'tier_4', // EyeMed Tier 4 (Advanced)
      tierSpectera: 'III',  // Spectera Tier III
      active: true
    },
    {
      name: 'Varilux Comfort DRx',
      sku: 'VAR-CDRX',
      manufacturer: 'Essilor',
      basePrice: 280.00,
      categoryId: categoryMap.PROGRESSIVE_LENSES,
      tierVsp: 'J',        // VSP Tier J (Premium Standard)
      tierEyemed: 'tier_3', // EyeMed Tier 3 (Upper)
      tierSpectera: 'II',   // Spectera Tier II
      active: true
    },
    {
      name: 'Eyezen',
      sku: 'EYEZEN',
      manufacturer: 'Essilor',
      basePrice: 130.00,
      categoryId: categoryMap.PROGRESSIVE_LENSES,
      tierVsp: 'K',        // VSP Tier K (Standard)
      tierEyemed: 'tier_2', // EyeMed Tier 2 (Mid)
      tierSpectera: 'I',    // Spectera Tier I
      active: true
    },
    {
      name: 'Neurolens Progressive',
      sku: 'NEURO-PROG',
      manufacturer: 'Neurolens',
      basePrice: 700.00,
      categoryId: categoryMap.PROGRESSIVE_LENSES,
      tierVsp: 'non-formulary', // Cash only - not covered
      tierEyemed: 'non-formulary',
      tierSpectera: 'non-formulary',
      active: true
    },
  ]

  // Single Vision Lenses
  const singleVision = [
    {
      name: 'Single Vision',
      sku: 'SV-STD',
      manufacturer: 'Standard',
      basePrice: 80.00,
      categoryId: categoryMap.SINGLE_VISION_LENSES,
      tierVsp: 'standard',
      tierEyemed: 'standard',
      tierSpectera: 'standard',
      active: true
    },
    {
      name: 'Neurolens SV',
      sku: 'NEURO-SV',
      manufacturer: 'Neurolens',
      basePrice: 400.00,
      categoryId: categoryMap.SINGLE_VISION_LENSES,
      tierVsp: 'non-formulary',
      tierEyemed: 'non-formulary',
      tierSpectera: 'non-formulary',
      active: true
    },
  ]

  // Lined Multifocals
  const linedMultifocal = [
    {
      name: 'FT Bifocal',
      sku: 'FT-BI',
      manufacturer: 'Standard',
      basePrice: 182.00,
      categoryId: categoryMap.LINED_MULTIFOCAL,
      tierVsp: 'standard',
      tierEyemed: 'standard',
      tierSpectera: 'standard',
      active: true
    },
    {
      name: 'FT Trifocal',
      sku: 'FT-TRI',
      manufacturer: 'Standard',
      basePrice: 135.00,
      categoryId: categoryMap.LINED_MULTIFOCAL,
      tierVsp: 'standard',
      tierEyemed: 'standard',
      tierSpectera: 'standard',
      active: true
    },
  ]

  // AR Coatings - Crizal (Based on schemas)
  const arCoatings = [
    {
      name: 'Crizal Sapphire',
      sku: 'CRIZ-SAPH',
      manufacturer: 'Essilor',
      basePrice: 187.00,
      categoryId: categoryMap.AR_COATINGS,
      tierVsp: 'QV',       // VSP Tier QV (Premium AR)
      tierEyemed: 'tier_3', // EyeMed Tier 3 AR
      tierSpectera: 'IV',   // Spectera Tier IV AR
      active: true
    },
    {
      name: 'Crizal Prevencia',
      sku: 'CRIZ-PREV',
      manufacturer: 'Essilor',
      basePrice: 187.00,
      categoryId: categoryMap.AR_COATINGS,
      tierVsp: 'QV',
      tierEyemed: 'tier_3',
      tierSpectera: 'IV',
      active: true
    },
    {
      name: 'Crizal Rock',
      sku: 'CRIZ-ROCK',
      manufacturer: 'Essilor',
      basePrice: 158.00,
      categoryId: categoryMap.AR_COATINGS,
      tierVsp: 'QT',       // VSP Tier QT (Mid-tier AR)
      tierEyemed: 'tier_2',
      tierSpectera: 'II',
      active: true
    },
    {
      name: 'Crizal EZ Pro',
      sku: 'CRIZ-EZ',
      manufacturer: 'Essilor',
      basePrice: 111.00,
      categoryId: categoryMap.AR_COATINGS,
      tierVsp: 'QM',       // VSP Tier QM (Basic AR)
      tierEyemed: 'tier_1',
      tierSpectera: 'I',
      active: true
    },
    {
      name: 'Crizal SunShield',
      sku: 'CRIZ-SUN',
      manufacturer: 'Essilor',
      basePrice: 135.00,
      categoryId: categoryMap.AR_COATINGS,
      tierVsp: 'QT',
      tierEyemed: 'tier_2',
      tierSpectera: 'II',
      active: true
    },
    {
      name: 'Neurolens Premium AR',
      sku: 'NEURO-AR-PREM',
      manufacturer: 'Neurolens',
      basePrice: 180.00,
      categoryId: categoryMap.AR_COATINGS,
      tierVsp: 'non-formulary',
      tierEyemed: 'non-formulary',
      tierSpectera: 'non-formulary',
      active: true
    },
    {
      name: 'Neurolens Blue AR',
      sku: 'NEURO-AR-BLUE',
      manufacturer: 'Neurolens',
      basePrice: 180.00,
      categoryId: categoryMap.AR_COATINGS,
      tierVsp: 'non-formulary',
      tierEyemed: 'non-formulary',
      tierSpectera: 'non-formulary',
      active: true
    },
  ]

  // Photochromic (Transitions)
  const photochromic = [
    {
      name: 'Transitions Gen S',
      sku: 'TRANS-GENS',
      manufacturer: 'Transitions',
      basePrice: 167.50,
      categoryId: categoryMap.PHOTOCHROMIC,
      tierVsp: 'PR',       // VSP Photochromic code
      tierEyemed: 'photochromic',
      tierSpectera: 'photochromic',
      active: true
    },
    {
      name: 'Transitions Xtra Active',
      sku: 'TRANS-XTRA',
      manufacturer: 'Transitions',
      basePrice: 167.50,
      categoryId: categoryMap.PHOTOCHROMIC,
      tierVsp: 'PR',
      tierEyemed: 'photochromic',
      tierSpectera: 'photochromic',
      active: true
    },
  ]

  // Polarized
  const polarized = [
    {
      name: 'Polarized',
      sku: 'POL-STD',
      manufacturer: 'Standard',
      basePrice: 129.75,
      categoryId: categoryMap.POLARIZED,
      tierVsp: 'DA',       // VSP Polarized code
      tierEyemed: 'polarized',
      tierSpectera: 'polarized',
      active: true
    },
  ]

  // Lens Materials
  const materials = [
    {
      name: 'CR-39',
      sku: 'MAT-CR39',
      manufacturer: 'Standard',
      basePrice: 0.00,
      categoryId: categoryMap.LENS_MATERIALS,
      tierVsp: 'standard',
      tierEyemed: 'standard',
      tierSpectera: 'standard',
      active: true
    },
    {
      name: 'Polycarbonate',
      sku: 'MAT-POLY',
      manufacturer: 'Standard',
      basePrice: 65.00,
      categoryId: categoryMap.LENS_MATERIALS,
      tierVsp: 'AJ',       // VSP Polycarbonate code
      tierEyemed: 'polycarbonate',
      tierSpectera: 'polycarbonate',
      active: true
    },
    {
      name: 'Trivex',
      sku: 'MAT-TRIVEX',
      manufacturer: 'Standard',
      basePrice: 75.00,
      categoryId: categoryMap.LENS_MATERIALS,
      tierVsp: 'AH',       // VSP Trivex code
      tierEyemed: 'trivex',
      tierSpectera: 'trivex',
      active: true
    },
    {
      name: 'High Index 1.67',
      sku: 'MAT-HI167',
      manufacturer: 'Standard',
      basePrice: 130.00,
      categoryId: categoryMap.LENS_MATERIALS,
      tierVsp: 'AD',       // VSP High Index code
      tierEyemed: 'hi-index',
      tierSpectera: 'hi-index',
      active: true
    },
    {
      name: 'Ultra High Index 1.72',
      sku: 'MAT-HI172',
      manufacturer: 'Standard',
      basePrice: 150.00,
      categoryId: categoryMap.LENS_MATERIALS,
      tierVsp: 'AD',
      tierEyemed: 'hi-index',
      tierSpectera: 'hi-index',
      active: true
    },
  ]

  // Exams
  const exams = [
    {
      name: 'Routine Vision Exam',
      sku: 'EXAM-ROUTINE',
      manufacturer: null,
      basePrice: 100.00,
      categoryId: categoryMap.EXAMS,
      tierVsp: 'covered',
      tierEyemed: 'covered',
      tierSpectera: 'covered',
      active: true
    },
    {
      name: 'Medical Exam',
      sku: 'EXAM-MED',
      manufacturer: null,
      basePrice: 120.00,
      categoryId: categoryMap.EXAMS,
      tierVsp: 'medical',
      tierEyemed: 'medical',
      tierSpectera: 'medical',
      active: true
    },
  ]

  // Exam Add-ons
  const examAddons = [
    {
      name: 'Optomap',
      sku: 'ADDON-OPTO',
      manufacturer: null,
      basePrice: 39.00,
      categoryId: categoryMap.EXAM_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'iWellness',
      sku: 'ADDON-IWELL',
      manufacturer: null,
      basePrice: 19.00,
      categoryId: categoryMap.EXAM_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'OCT Retina/ON',
      sku: 'ADDON-OCT',
      manufacturer: null,
      basePrice: 39.00,
      categoryId: categoryMap.EXAM_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'Visual Field',
      sku: 'ADDON-VF',
      manufacturer: null,
      basePrice: 39.00,
      categoryId: categoryMap.EXAM_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'External Photos',
      sku: 'ADDON-PHOTO',
      manufacturer: null,
      basePrice: 29.00,
      categoryId: categoryMap.EXAM_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'Neuro HA Screen',
      sku: 'ADDON-NEURO',
      manufacturer: null,
      basePrice: 89.00,
      categoryId: categoryMap.EXAM_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'Corneal Thickness',
      sku: 'ADDON-CORNEA',
      manufacturer: null,
      basePrice: 29.00,
      categoryId: categoryMap.EXAM_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'Dry Eye Evaluation',
      sku: 'ADDON-DRY',
      manufacturer: null,
      basePrice: 120.00,
      categoryId: categoryMap.EXAM_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'Myopia Atropine Exam Consult & Follow Up',
      sku: 'ADDON-MYOPIA',
      manufacturer: null,
      basePrice: 350.00,
      categoryId: categoryMap.EXAM_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
  ]

  // Contact Lens Fitting
  const contactFitting = [
    {
      name: 'Sphere CL Fitting',
      sku: 'CL-SPHERE',
      manufacturer: null,
      basePrice: 75.00,
      categoryId: categoryMap.CONTACT_FITTING,
      tierVsp: 'fitting',
      tierEyemed: 'fitting',
      tierSpectera: 'fitting',
      active: true
    },
    {
      name: 'Toric CL Fitting',
      sku: 'CL-TORIC',
      manufacturer: null,
      basePrice: 100.00,
      categoryId: categoryMap.CONTACT_FITTING,
      tierVsp: 'fitting',
      tierEyemed: 'fitting',
      tierSpectera: 'fitting',
      active: true
    },
    {
      name: 'Multifocal Soft Lens Fitting',
      sku: 'CL-MF',
      manufacturer: null,
      basePrice: 150.00,
      categoryId: categoryMap.CONTACT_FITTING,
      tierVsp: 'fitting',
      tierEyemed: 'fitting',
      tierSpectera: 'fitting',
      active: true
    },
    {
      name: 'Monovision CL Fitting',
      sku: 'CL-MONO',
      manufacturer: null,
      basePrice: 120.00,
      categoryId: categoryMap.CONTACT_FITTING,
      tierVsp: 'fitting',
      tierEyemed: 'fitting',
      tierSpectera: 'fitting',
      active: true
    },
    {
      name: 'RGP Fitting',
      sku: 'CL-RGP',
      manufacturer: null,
      basePrice: 350.00,
      categoryId: categoryMap.CONTACT_FITTING,
      tierVsp: 'specialty',
      tierEyemed: 'specialty',
      tierSpectera: 'specialty',
      active: true
    },
    {
      name: 'Specialty CL Fitting',
      sku: 'CL-SPECIALTY',
      manufacturer: null,
      basePrice: 850.00,
      categoryId: categoryMap.CONTACT_FITTING,
      tierVsp: 'specialty',
      tierEyemed: 'specialty',
      tierSpectera: 'specialty',
      active: true
    },
    {
      name: 'Ortho-K Fitting',
      sku: 'CL-ORTHOK',
      manufacturer: null,
      basePrice: 2200.00,
      categoryId: categoryMap.CONTACT_FITTING,
      tierVsp: 'specialty',
      tierEyemed: 'specialty',
      tierSpectera: 'specialty',
      active: true
    },
    {
      name: 'MiSight Fitting and Follow Up',
      sku: 'CL-MISIGHT',
      manufacturer: null,
      basePrice: 1250.00,
      categoryId: categoryMap.CONTACT_FITTING,
      tierVsp: 'specialty',
      tierEyemed: 'specialty',
      tierSpectera: 'specialty',
      active: true
    },
  ]

  // Lens Add-ons
  const lensAddons = [
    {
      name: 'UV Treatment',
      sku: 'ADDON-UV',
      manufacturer: null,
      basePrice: 15.00,
      categoryId: categoryMap.LENS_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'Mirror Coating',
      sku: 'ADDON-MIRROR',
      manufacturer: null,
      basePrice: 45.00,
      categoryId: categoryMap.LENS_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'Tint',
      sku: 'ADDON-TINT',
      manufacturer: null,
      basePrice: 30.00,
      categoryId: categoryMap.LENS_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'Oversize Lenses',
      sku: 'ADDON-OVERSIZE',
      manufacturer: null,
      basePrice: 30.00,
      categoryId: categoryMap.LENS_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'Tech Add-on Single Vision (VSP)',
      sku: 'ADDON-TECH-SV',
      manufacturer: null,
      basePrice: 10.00,
      categoryId: categoryMap.LENS_ADDONS,
      tierVsp: 'tech-addon',
      tierEyemed: 'none',
      tierSpectera: 'none',
      active: true
    },
    {
      name: 'Tech Add-on Multifocal (VSP)',
      sku: 'ADDON-TECH-MF',
      manufacturer: null,
      basePrice: 40.00,
      categoryId: categoryMap.LENS_ADDONS,
      tierVsp: 'tech-addon',
      tierEyemed: 'none',
      tierSpectera: 'none',
      active: true
    },
    {
      name: 'Prism Per Diopter',
      sku: 'ADDON-PRISM',
      manufacturer: null,
      basePrice: 12.00,
      categoryId: categoryMap.LENS_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'Essential Blue',
      sku: 'ADDON-BLUE',
      manufacturer: null,
      basePrice: 40.00,
      categoryId: categoryMap.LENS_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'Roll and Polish',
      sku: 'ADDON-ROLL',
      manufacturer: null,
      basePrice: 30.00,
      categoryId: categoryMap.LENS_ADDONS,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
  ]

  // Mount Fees
  const mountFees = [
    {
      name: 'Full Rim',
      sku: 'MOUNT-FULL',
      manufacturer: null,
      basePrice: 0.00,
      categoryId: categoryMap.MOUNT_FEES,
      tierVsp: 'standard',
      tierEyemed: 'standard',
      tierSpectera: 'standard',
      active: true
    },
    {
      name: 'Semi-Rimless',
      sku: 'MOUNT-SEMI',
      manufacturer: null,
      basePrice: 35.00,
      categoryId: categoryMap.MOUNT_FEES,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
    {
      name: 'Rimless',
      sku: 'MOUNT-RIMLESS',
      manufacturer: null,
      basePrice: 47.00,
      categoryId: categoryMap.MOUNT_FEES,
      tierVsp: 'addon',
      tierEyemed: 'addon',
      tierSpectera: 'addon',
      active: true
    },
  ]

  // Combine all products
  const allProducts = [
    ...progressives,
    ...singleVision,
    ...linedMultifocal,
    ...arCoatings,
    ...photochromic,
    ...polarized,
    ...materials,
    ...exams,
    ...examAddons,
    ...contactFitting,
    ...lensAddons,
    ...mountFees,
  ]

  // Upsert all products
  for (const product of allProducts) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product,
    })
  }

  console.log(`✅ Created ${allProducts.length} products`)
  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
