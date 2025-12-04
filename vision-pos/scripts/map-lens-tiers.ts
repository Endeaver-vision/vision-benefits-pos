/**
 * Map Lens Products to Insurance Tier Codes
 *
 * This maps our lens products to their appropriate VSP, EyeMed, and Spectera tier codes
 * so the pricing calculator can automatically determine patient copays.
 *
 * VSP uses letter codes: KA, FA, JA, NA, OA (standard to custom progressives)
 * EyeMed uses numbered tiers: standard, tier_1 through tier_5
 * Spectera uses Roman numerals: I, II, III, IV, V
 */

import { prisma } from '../src/lib/prisma'

interface TierMapping {
  name: string // partial match on lens name
  vsp: string | null
  eyemed: string
  spectera: string
}

// Progressive lens tier mappings based on formulary data
const progressiveMappings: TierMapping[] = [
  // Standard progressives (VSP K codes, EyeMed standard, Spectera I)
  { name: 'PALZ Value', vsp: 'KA', eyemed: 'standard', spectera: 'I' },
  { name: 'Kodak Concise', vsp: 'KA', eyemed: 'standard', spectera: 'I' },
  { name: 'Accolade', vsp: 'KA', eyemed: 'standard', spectera: 'I' },
  { name: 'Adaptar', vsp: 'KA', eyemed: 'standard', spectera: 'I' },

  // Premium progressives (VSP F/J codes, EyeMed tier_1-2, Spectera II)
  { name: 'Varilux Comfort', vsp: 'FA', eyemed: 'tier_2', spectera: 'II' },
  { name: 'Varilux Physio', vsp: 'JA', eyemed: 'tier_3', spectera: 'III' },
  { name: 'Essilor Ideal', vsp: 'FA', eyemed: 'tier_2', spectera: 'II' },

  // Custom progressives (VSP N/O codes, EyeMed tier_4-5, Spectera IV-V)
  { name: 'Varilux X Design', vsp: 'NA', eyemed: 'tier_4', spectera: 'IV' },
  { name: 'Varilux XR', vsp: 'OA', eyemed: 'tier_5', spectera: 'V' },
  { name: 'Varilux i design', vsp: 'OA', eyemed: 'tier_5', spectera: 'V' },

  // Essilor digital progressives
  { name: 'Essilor Eyezen', vsp: 'FA', eyemed: 'tier_1', spectera: 'II' },
  { name: 'Essilor Fit', vsp: 'KA', eyemed: 'standard', spectera: 'I' },
  { name: 'Essilor Stylistic', vsp: 'KA', eyemed: 'standard', spectera: 'I' },

  // Zeiss progressives
  { name: 'Zeiss Progressive', vsp: 'FA', eyemed: 'tier_2', spectera: 'II' },
  { name: 'Zeiss Individual', vsp: 'NA', eyemed: 'tier_4', spectera: 'IV' },

  // Hoya progressives
  { name: 'Hoya Lifestyle', vsp: 'FA', eyemed: 'tier_2', spectera: 'II' },
  { name: 'Hoya iD', vsp: 'NA', eyemed: 'tier_4', spectera: 'IV' },

  // Shamir progressives
  { name: 'Shamir Autograph', vsp: 'NA', eyemed: 'tier_4', spectera: 'IV' },
  { name: 'Shamir Genesis', vsp: 'FA', eyemed: 'tier_2', spectera: 'II' },
]

// AR coating tier mappings
const arMappings: TierMapping[] = [
  // Standard AR (VSP QM, EyeMed standard, Spectera I)
  { name: 'Unity', vsp: 'QM', eyemed: 'standard', spectera: 'I' },
  { name: 'TechShield', vsp: 'QM', eyemed: 'standard', spectera: 'I' },

  // Premium AR (VSP QT, EyeMed tier_1-2, Spectera II-III)
  { name: 'Crizal Easy', vsp: 'QT', eyemed: 'tier_1', spectera: 'II' },
  { name: 'Crizal Alize', vsp: 'QT', eyemed: 'tier_2', spectera: 'II' },
  { name: 'Crizal Avance', vsp: 'QT', eyemed: 'tier_2', spectera: 'III' },

  // Ultra-premium AR (VSP QV, EyeMed tier_3, Spectera III-IV)
  { name: 'Crizal Sapphire', vsp: 'QV', eyemed: 'tier_3', spectera: 'III' },
  { name: 'Crizal Prevencia', vsp: 'QV', eyemed: 'tier_3', spectera: 'IV' },
  { name: 'Crizal Rock', vsp: 'QV', eyemed: 'tier_3', spectera: 'IV' },
]

// Material tier mappings
const materialMappings = [
  { name: 'Polycarbonate', vsp: 'AD', eyemed: 'polycarbonate', spectera: 'polycarbonate' },
  { name: 'Trivex', vsp: 'AJ', eyemed: 'trivex', spectera: 'trivex' },
  { name: 'High Index 1.67', vsp: 'AH', eyemed: 'high_index_167', spectera: 'high_index' },
  { name: 'High Index 1.74', vsp: 'AB', eyemed: 'high_index_174', spectera: 'high_index' },
]

// Photochromic mappings
const photochromicMappings = [
  { name: 'Transitions', vsp: 'PR', eyemed: 'photochromic', spectera: 'photochromic' },
  { name: 'Sensity', vsp: 'PR', eyemed: 'photochromic', spectera: 'photochromic' },
]

async function mapLensTiers() {
  console.log('='.repeat(60))
  console.log('Mapping Lens Products to Insurance Tier Codes')
  console.log('='.repeat(60))

  try {
    // Get all lens products
    const lensProducts = await prisma.lensProduct.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' }
    })

    console.log(`\nFound ${lensProducts.length} active lens products`)

    let mappedCount = 0
    let unmappedCount = 0

    for (const product of lensProducts) {
      const productNameLower = product.name.toLowerCase()
      let tierCodes: { vsp: string | null, eyemed: string | null, spectera: string | null } = {
        vsp: null,
        eyemed: null,
        spectera: null
      }

      // Try to find a matching mapping based on category
      if (product.category === 'LENS') {
        // Check progressive mappings
        for (const mapping of progressiveMappings) {
          if (productNameLower.includes(mapping.name.toLowerCase())) {
            tierCodes = { vsp: mapping.vsp, eyemed: mapping.eyemed, spectera: mapping.spectera }
            break
          }
        }
      } else if (product.category === 'AR_COATING') {
        for (const mapping of arMappings) {
          if (productNameLower.includes(mapping.name.toLowerCase())) {
            tierCodes = { vsp: mapping.vsp, eyemed: mapping.eyemed, spectera: mapping.spectera }
            break
          }
        }
      } else if (product.category === 'MATERIAL') {
        for (const mapping of materialMappings) {
          if (productNameLower.includes(mapping.name.toLowerCase())) {
            tierCodes = { vsp: mapping.vsp, eyemed: mapping.eyemed, spectera: mapping.spectera }
            break
          }
        }
      } else if (product.category === 'TRANSITIONS') {
        for (const mapping of photochromicMappings) {
          if (productNameLower.includes(mapping.name.toLowerCase())) {
            tierCodes = { vsp: mapping.vsp, eyemed: mapping.eyemed, spectera: mapping.spectera }
            break
          }
        }
      }

      // If we found at least one mapping, create/update the tier records
      if (tierCodes.vsp || tierCodes.eyemed || tierCodes.spectera) {
        mappedCount++

        // Delete existing tier mappings
        await prisma.lensCarrierTier.deleteMany({
          where: { lensProductId: product.id }
        })

        // Create new tier mappings
        const tierData = []

        if (tierCodes.vsp) {
          tierData.push({
            lensProductId: product.id,
            carrier: 'VSP',
            tierCode: tierCodes.vsp,
            tierLabel: getVspTierLabel(tierCodes.vsp),
          })
        }

        if (tierCodes.eyemed) {
          tierData.push({
            lensProductId: product.id,
            carrier: 'EyeMed',
            tierCode: tierCodes.eyemed,
            tierLabel: getEyemedTierLabel(tierCodes.eyemed),
          })
        }

        if (tierCodes.spectera) {
          tierData.push({
            lensProductId: product.id,
            carrier: 'Spectera',
            tierCode: tierCodes.spectera,
            tierLabel: getSpecteraTierLabel(tierCodes.spectera),
          })
        }

        if (tierData.length > 0) {
          await prisma.lensCarrierTier.createMany({ data: tierData })
        }

        console.log(`  ✓ ${product.name}: VSP=${tierCodes.vsp || '-'} EyeMed=${tierCodes.eyemed || '-'} Spectera=${tierCodes.spectera || '-'}`)
      } else {
        unmappedCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`Mapped: ${mappedCount} products`)
    console.log(`Unmapped: ${unmappedCount} products (will use retail pricing)`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('Error mapping lens tiers:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

function getVspTierLabel(code: string): string {
  const labels: Record<string, string> = {
    'KA': 'Standard Progressive',
    'FA': 'Premium Progressive',
    'JA': 'Premium Progressive',
    'NA': 'Custom Progressive',
    'OA': 'Custom Progressive',
    'QM': 'Standard AR',
    'QT': 'Premium AR',
    'QV': 'Ultra-Premium AR',
    'AD': 'Polycarbonate',
    'AH': 'High Index 1.67',
    'AB': 'High Index 1.74',
    'AJ': 'Trivex',
    'PR': 'Photochromic',
  }
  return labels[code] || code
}

function getEyemedTierLabel(code: string): string {
  const labels: Record<string, string> = {
    'standard': 'Standard',
    'tier_1': 'Premium Tier 1',
    'tier_2': 'Premium Tier 2',
    'tier_3': 'Premium Tier 3',
    'tier_4': 'Premium Tier 4',
    'tier_5': 'Premium Tier 5',
    'polycarbonate': 'Polycarbonate',
    'trivex': 'Trivex',
    'high_index_167': 'High Index 1.67',
    'high_index_174': 'High Index 1.74',
    'photochromic': 'Photochromic',
  }
  return labels[code] || code
}

function getSpecteraTierLabel(code: string): string {
  const labels: Record<string, string> = {
    'I': 'Tier I',
    'II': 'Tier II',
    'III': 'Tier III',
    'IV': 'Tier IV',
    'V': 'Tier V',
    'polycarbonate': 'Polycarbonate',
    'trivex': 'Trivex',
    'high_index': 'High Index',
    'photochromic': 'Photochromic',
  }
  return labels[code] || code
}

mapLensTiers()
