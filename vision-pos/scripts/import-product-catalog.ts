/**
 * Import Product Catalog Script
 *
 * Imports all products, services, and their tier mappings:
 * - Product categories
 * - Lens products (progressives, SV, bifocals) with VSP/EyeMed/Spectera tiers
 * - AR coatings with tier mappings
 * - Lens materials (poly, hi-index, etc.)
 * - Exam services
 * - Contact lenses
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// =============================================================================
// PRODUCT CATEGORIES
// =============================================================================
const productCategories = [
  { code: 'EXAMS', name: 'Exams', description: 'Vision and medical exams' },
  { code: 'SINGLE_VISION_LENSES', name: 'Single Vision Lenses', description: 'Single vision spectacle lenses' },
  { code: 'PROGRESSIVE_LENSES', name: 'Progressive Lenses', description: 'Progressive/no-line bifocal lenses' },
  { code: 'LINED_MULTIFOCAL', name: 'Lined Multifocal', description: 'Bifocal and trifocal lenses' },
  { code: 'AR_COATINGS', name: 'AR Coatings', description: 'Anti-reflective coatings' },
  { code: 'LENS_MATERIALS', name: 'Lens Materials', description: 'Polycarbonate, hi-index, trivex' },
  { code: 'PHOTOCHROMIC', name: 'Photochromic', description: 'Transitions and photochromic lenses' },
  { code: 'POLARIZED', name: 'Polarized', description: 'Polarized sun lenses' },
  { code: 'FRAMES', name: 'Frames', description: 'Eyeglass frames' },
  { code: 'CONTACT_FITTING', name: 'Contact Lens Fitting', description: 'Contact lens fitting services' },
  { code: 'CONTACT_LENSES', name: 'Contact Lenses', description: 'Contact lens products' },
  { code: 'LENS_ADDONS', name: 'Lens Add-ons', description: 'Tints, edge polish, etc.' },
  { code: 'MOUNT_FEES', name: 'Mount Fees', description: 'Rimless, drill mount fees' },
  { code: 'SERVICES', name: 'Services', description: 'Other optical services' },
]

// =============================================================================
// EXAM SERVICES
// =============================================================================
const examServices = [
  { name: 'Routine Eye Exam', price: 150, tierVsp: 'EXAM', tierEyemed: 'exam', tierSpectera: 'exam', category: 'EXAMS' },
  { name: 'Contact Lens Exam', price: 175, tierVsp: 'CONTACT_EXAM', tierEyemed: 'cl_exam', tierSpectera: 'cl_exam', category: 'EXAMS' },
  { name: 'Contact Lens Fitting - Standard', price: 75, tierVsp: 'fitting', tierEyemed: 'fitting', tierSpectera: 'fitting', category: 'CONTACT_FITTING' },
  { name: 'Contact Lens Fitting - Specialty', price: 150, tierVsp: 'specialty', tierEyemed: 'specialty', tierSpectera: 'specialty', category: 'CONTACT_FITTING' },
  { name: 'Contact Lens Fitting - Toric', price: 100, tierVsp: 'fitting', tierEyemed: 'fitting', tierSpectera: 'fitting', category: 'CONTACT_FITTING' },
  { name: 'Contact Lens Fitting - Multifocal', price: 125, tierVsp: 'fitting', tierEyemed: 'fitting', tierSpectera: 'fitting', category: 'CONTACT_FITTING' },
]

// =============================================================================
// LENS MATERIALS
// =============================================================================
const lensMaterials = [
  { name: 'CR-39 (Standard Plastic)', price: 0, tierVsp: 'standard', tierEyemed: 'standard', tierSpectera: 'standard', category: 'LENS_MATERIALS' },
  { name: 'Polycarbonate', price: 65, tierVsp: 'AD', tierEyemed: 'polycarbonate', tierSpectera: 'polycarbonate', category: 'LENS_MATERIALS' },
  { name: 'Polycarbonate (Child)', price: 0, tierVsp: 'AD', tierEyemed: 'polycarbonate_child', tierSpectera: 'polycarbonate_child', category: 'LENS_MATERIALS' },
  { name: 'Trivex', price: 85, tierVsp: 'AB', tierEyemed: 'trivex', tierSpectera: 'trivex', category: 'LENS_MATERIALS' },
  { name: 'Hi-Index 1.60', price: 95, tierVsp: 'AH', tierEyemed: 'high_index_160', tierSpectera: 'high_index_166', category: 'LENS_MATERIALS' },
  { name: 'Hi-Index 1.67', price: 125, tierVsp: 'AJ', tierEyemed: 'high_index_167', tierSpectera: 'high_index_167', category: 'LENS_MATERIALS' },
  { name: 'Hi-Index 1.74', price: 195, tierVsp: 'AK', tierEyemed: 'high_index_174', tierSpectera: 'high_index_174', category: 'LENS_MATERIALS' },
]

// =============================================================================
// AR COATINGS
// =============================================================================
const arCoatings = [
  // Basic Tier - VSP QM
  { name: 'Basic AR Coating', manufacturer: 'Generic', price: 45, tierVsp: 'QM', tierEyemed: 'ar_tier_1', tierSpectera: 'ar_I', category: 'AR_COATINGS' },
  { name: 'Unity AR', manufacturer: 'VSP', price: 55, tierVsp: 'QM', tierEyemed: 'ar_tier_1', tierSpectera: 'ar_I', category: 'AR_COATINGS' },

  // Premium Tier - VSP QT
  { name: 'Crizal Easy UV', manufacturer: 'Essilor', price: 85, tierVsp: 'QT', tierEyemed: 'ar_tier_2', tierSpectera: 'ar_II', category: 'AR_COATINGS' },
  { name: 'Crizal Alize UV', manufacturer: 'Essilor', price: 95, tierVsp: 'QT', tierEyemed: 'ar_tier_2', tierSpectera: 'ar_II', category: 'AR_COATINGS' },
  { name: 'ZEISS DuraVision Platinum', manufacturer: 'ZEISS', price: 95, tierVsp: 'QT', tierEyemed: 'ar_tier_2', tierSpectera: 'ar_II', category: 'AR_COATINGS' },
  { name: 'Shamir Glacier Plus', manufacturer: 'Shamir', price: 85, tierVsp: 'QT', tierEyemed: 'ar_tier_2', tierSpectera: 'ar_II', category: 'AR_COATINGS' },

  // Premium Plus Tier - VSP QV
  { name: 'Crizal Sapphire UV', manufacturer: 'Essilor', price: 125, tierVsp: 'QV', tierEyemed: 'ar_tier_3', tierSpectera: 'ar_III', category: 'AR_COATINGS' },
  { name: 'Crizal Prevencia', manufacturer: 'Essilor', price: 135, tierVsp: 'QV', tierEyemed: 'ar_tier_3', tierSpectera: 'ar_III', category: 'AR_COATINGS' },
  { name: 'Crizal Rock', manufacturer: 'Essilor', price: 145, tierVsp: 'QV', tierEyemed: 'ar_tier_3', tierSpectera: 'ar_III', category: 'AR_COATINGS' },
  { name: 'ZEISS DuraVision BlueProtect', manufacturer: 'ZEISS', price: 125, tierVsp: 'QV', tierEyemed: 'ar_tier_3', tierSpectera: 'ar_III', category: 'AR_COATINGS' },
  { name: 'Shamir Glacier Expression', manufacturer: 'Shamir', price: 115, tierVsp: 'QV', tierEyemed: 'ar_tier_3', tierSpectera: 'ar_III', category: 'AR_COATINGS' },
]

// =============================================================================
// PHOTOCHROMIC
// =============================================================================
const photochromic = [
  { name: 'Transitions Signature GEN 8', manufacturer: 'Transitions', price: 95, tierVsp: 'PR', tierEyemed: 'photochromic', tierSpectera: 'photochromic', category: 'PHOTOCHROMIC' },
  { name: 'Transitions XTRActive', manufacturer: 'Transitions', price: 145, tierVsp: 'PS', tierEyemed: 'photochromic', tierSpectera: 'photochromic', category: 'PHOTOCHROMIC' },
  { name: 'Transitions Vantage', manufacturer: 'Transitions', price: 165, tierVsp: 'PS', tierEyemed: 'photochromic', tierSpectera: 'photochromic', category: 'PHOTOCHROMIC' },
  { name: 'ZEISS PhotoFusion X', manufacturer: 'ZEISS', price: 125, tierVsp: 'PR', tierEyemed: 'photochromic', tierSpectera: 'photochromic', category: 'PHOTOCHROMIC' },
  { name: 'Sensity', manufacturer: 'Hoya', price: 95, tierVsp: 'PR', tierEyemed: 'photochromic', tierSpectera: 'photochromic', category: 'PHOTOCHROMIC' },
]

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

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
    headers.forEach((h, i) => {
      row[h] = values[i] || ''
    })
    return row
  })
}

// =============================================================================
// MAIN IMPORT FUNCTION
// =============================================================================
async function main() {
  console.log('🚀 Starting product catalog import...\n')

  // 1. Create product categories
  console.log('📁 Creating product categories...')
  for (const cat of productCategories) {
    await prisma.productCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, description: cat.description },
      create: cat,
    })
  }
  console.log(`   ✅ Created ${productCategories.length} categories\n`)

  // Get category map
  const categories = await prisma.productCategory.findMany()
  const categoryMap = new Map(categories.map(c => [c.code, c.id]))

  // 2. Load lens pricebook and tier mappings from CSV
  console.log('📊 Loading CSV data files...')

  const lensesPath = '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/Lenses_pricebook_final.csv'
  const vspMappingPath = '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/VSP_PRODUCT_CODE_MAPPING.csv'
  const eyemedMappingPath = '/Users/cmac/Documents/Supporting Documents/Prices-pricing-U&C/EYEMED_PRODUCT_TIER_MAPPING.csv'

  const lensesData = parseCSV(fs.readFileSync(lensesPath, 'utf-8'))
  const vspMapping = parseCSV(fs.readFileSync(vspMappingPath, 'utf-8'))
  const eyemedMapping = parseCSV(fs.readFileSync(eyemedMappingPath, 'utf-8'))

  // Build lookup maps
  const vspMap = new Map(vspMapping.map(r => [r.ProductName?.toLowerCase(), r.VSPCode]))
  const eyemedMap = new Map(eyemedMapping.map(r => [r.ProductName?.toLowerCase(), r.EyemedTier]))

  console.log(`   Loaded ${lensesData.length} lenses, ${vspMapping.length} VSP mappings, ${eyemedMapping.length} EyeMed mappings\n`)

  // 3. Import lens products
  console.log('👓 Importing lens products...')
  let lensCount = 0

  for (const lens of lensesData) {
    const name = lens.Name
    const category = lens.Category
    const retail = parseFloat(lens.Retail) || 0
    const wholesale = parseFloat(lens.Wholesale) || 0

    if (!name) continue

    // Determine category code
    let categoryCode = 'SINGLE_VISION_LENSES'
    const nameLower = name.toLowerCase()
    if (nameLower.includes('progressive') || nameLower.includes('varilux') || nameLower.includes('autograph') ||
        nameLower.includes('smartlife') || nameLower.includes('physio')) {
      categoryCode = 'PROGRESSIVE_LENSES'
    } else if (nameLower.includes('bifocal') || nameLower.includes('flat top') || nameLower.includes('trifocal')) {
      categoryCode = 'LINED_MULTIFOCAL'
    }

    // Get tier mappings
    const vspCode = vspMap.get(nameLower) || null
    const eyemedTier = eyemedMap.get(nameLower) || null

    // Map EyeMed tier to Spectera (similar structure)
    let specteraTier = null
    if (eyemedTier) {
      const tierNum = eyemedTier.replace('tier_', '')
      if (tierNum === '1') specteraTier = 'I'
      else if (tierNum === '2') specteraTier = 'II'
      else if (tierNum === '3') specteraTier = 'III'
      else if (tierNum === '4') specteraTier = 'IV'
      else if (tierNum === '5') specteraTier = 'V'
    }

    const sku = `lens-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)}`
    const categoryId = categoryMap.get(categoryCode)

    if (!categoryId) {
      console.log(`   ⚠️ Category not found: ${categoryCode} for ${name}`)
      continue
    }

    await prisma.product.upsert({
      where: { sku },
      update: {
        name,
        basePrice: retail,
        tierVsp: vspCode,
        tierEyemed: eyemedTier,
        tierSpectera: specteraTier,
      },
      create: {
        name,
        sku,
        categoryId,
        basePrice: retail,
        tierVsp: vspCode,
        tierEyemed: eyemedTier,
        tierSpectera: specteraTier,
        active: true,
      },
    })
    lensCount++
  }
  console.log(`   ✅ Imported ${lensCount} lens products\n`)

  // 4. Import exam services
  console.log('🏥 Importing exam services...')
  for (const service of examServices) {
    const categoryId = categoryMap.get(service.category)
    if (!categoryId) continue

    const sku = `svc-${service.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    await prisma.product.upsert({
      where: { sku },
      update: { basePrice: service.price, tierVsp: service.tierVsp, tierEyemed: service.tierEyemed, tierSpectera: service.tierSpectera },
      create: {
        name: service.name,
        sku,
        categoryId,
        basePrice: service.price,
        tierVsp: service.tierVsp,
        tierEyemed: service.tierEyemed,
        tierSpectera: service.tierSpectera,
        active: true,
      },
    })
  }
  console.log(`   ✅ Imported ${examServices.length} exam services\n`)

  // 5. Import lens materials
  console.log('🔬 Importing lens materials...')
  for (const material of lensMaterials) {
    const categoryId = categoryMap.get(material.category)
    if (!categoryId) continue

    const sku = `mat-${material.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    await prisma.product.upsert({
      where: { sku },
      update: { basePrice: material.price, tierVsp: material.tierVsp, tierEyemed: material.tierEyemed, tierSpectera: material.tierSpectera },
      create: {
        name: material.name,
        sku,
        categoryId,
        basePrice: material.price,
        tierVsp: material.tierVsp,
        tierEyemed: material.tierEyemed,
        tierSpectera: material.tierSpectera,
        active: true,
      },
    })
  }
  console.log(`   ✅ Imported ${lensMaterials.length} lens materials\n`)

  // 6. Import AR coatings
  console.log('✨ Importing AR coatings...')
  for (const coating of arCoatings) {
    const categoryId = categoryMap.get(coating.category)
    if (!categoryId) continue

    const sku = `ar-${coating.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    await prisma.product.upsert({
      where: { sku },
      update: { basePrice: coating.price, tierVsp: coating.tierVsp, tierEyemed: coating.tierEyemed, tierSpectera: coating.tierSpectera },
      create: {
        name: coating.name,
        sku,
        categoryId,
        basePrice: coating.price,
        manufacturer: coating.manufacturer,
        tierVsp: coating.tierVsp,
        tierEyemed: coating.tierEyemed,
        tierSpectera: coating.tierSpectera,
        active: true,
      },
    })
  }
  console.log(`   ✅ Imported ${arCoatings.length} AR coatings\n`)

  // 7. Import photochromic
  console.log('🌓 Importing photochromic lenses...')
  for (const photo of photochromic) {
    const categoryId = categoryMap.get(photo.category)
    if (!categoryId) continue

    const sku = `photo-${photo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    await prisma.product.upsert({
      where: { sku },
      update: { basePrice: photo.price, tierVsp: photo.tierVsp, tierEyemed: photo.tierEyemed, tierSpectera: photo.tierSpectera },
      create: {
        name: photo.name,
        sku,
        categoryId,
        basePrice: photo.price,
        manufacturer: photo.manufacturer,
        tierVsp: photo.tierVsp,
        tierEyemed: photo.tierEyemed,
        tierSpectera: photo.tierSpectera,
        active: true,
      },
    })
  }
  console.log(`   ✅ Imported ${photochromic.length} photochromic products\n`)

  // Final summary
  const totalProducts = await prisma.product.count()
  console.log('=' .repeat(50))
  console.log(`🎉 Import complete! Total products in database: ${totalProducts}`)
  console.log('=' .repeat(50))
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
