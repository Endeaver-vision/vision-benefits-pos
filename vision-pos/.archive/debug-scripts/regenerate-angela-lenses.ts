import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { createPricingCalculator } from '../src/lib/services/pricing-calculator'

const prisma = new PrismaClient()

async function main() {
  const angela = await prisma.customer.findFirst({
    where: { firstName: 'Angela', lastName: 'Clayton' }
  })

  if (!angela) {
    console.log('Angela not found')
    return
  }

  console.log('Customer:', angela.firstName, angela.lastName)

  const auth = await prisma.insuranceAuthorization.findFirst({
    where: { customerId: angela.id, isActive: true }
  })

  if (!auth) {
    console.log('No active authorization')
    return
  }

  console.log('Carrier:', auth.carrier)
  const copays = auth.copays as Record<string, unknown>

  // Build BenefitAuthorization object
  const benefitAuth = {
    carrier: auth.carrier.toLowerCase(),
    plan: {
      carrier: auth.carrier.toLowerCase(),
      planName: auth.planName || `${auth.carrier} Plan`,
    },
    patient: { age: null },
    copays: {
      exam: Number(auth.examCopay) || 0,
      materials: Number(auth.materialsCopay) || 0,
      frameAllowance: Number(auth.frameAllowance) || 0,
      frameOverageDiscount: 0.2,
      ...copays,
    },
    specialRules: {
      polycarbonateFreeCbildAgeMax: 18,
      progressiveNonadaptPolicy: true,
    },
    frequency: {
      exam: { count: 1, periodMonths: 12 },
      frame: { count: 1, periodMonths: 12 },
      lenses: { count: 1, periodMonths: 12 },
    },
  }

  const calculator = createPricingCalculator(benefitAuth as any)

  // Get lens products only
  const lensProducts = await prisma.lensProduct.findMany({
    where: { active: true }
  })

  console.log(`Processing ${lensProducts.length} lens products...`)

  // Map category for calculator
  function mapCategory(dbCategory: string): string {
    const mapping: Record<string, string> = {
      'single_vision': 'lens_sv',
      'progressive': 'lens_progressive',
      'bifocal': 'lens_bifocal',
      'trifocal': 'lens_trifocal',
      'ar_coating': 'ar_coating',
      'photochromic': 'photochromic',
      'material': 'material',
      'mount_fee': 'mount_fee',
      'addon': 'addon',
      'tint': 'tint',
      'polarized': 'polarized',
      'blue_light': 'blue_light',
    }
    return mapping[dbCategory] || dbCategory
  }

  let updated = 0
  let failed = 0

  for (const lens of lensProducts) {
    try {
      // Build product object for calculator
      const product = {
        sku: lens.sku || lens.id,
        displayName: lens.name,
        category: mapCategory(lens.category || 'lens'),
        retailPrice: lens.basePrice,
        eyemed: lens.tierEyemed ? {
          progressiveTier: lens.tierEyemed,
          arTier: lens.tierEyemed,
          materialType: mapMaterialType(lens.category, lens.name)
        } : undefined,
        vsp: lens.tierVsp ? { tier: lens.tierVsp } : undefined,
        spectera: lens.tierSpectera ? { tier: lens.tierSpectera } : undefined,
      }

      const result = calculator.calculateProduct(product as any, benefitAuth as any)

      // Determine if needs tier assignment
      const needsTierAssignment = result.warnings?.some(w =>
        w.includes('using retail') ||
        w.includes('80%') ||
        w.includes('No tier mapping')
      ) ?? false

      // Upsert to patient_price_lists
      await prisma.patientPriceList.upsert({
        where: {
          customerId_productId_insuranceCarrier: {
            customerId: angela.id,
            productId: lens.id,
            insuranceCarrier: auth.carrier,
          },
        },
        create: {
          customerId: angela.id,
          productId: lens.id,
          authorizationId: auth.id,
          finalPrice: result.patientCopay,
          retailPrice: result.retailPrice,
          savings: result.savings,
          insuranceCarrier: auth.carrier,
          planName: auth.planName,
          tier: result.tierUsed,
          pricingMethod: result.notes || 'tier_copay',
          needsTierAssignment,
          active: true,
        },
        update: {
          authorizationId: auth.id,
          finalPrice: result.patientCopay,
          retailPrice: result.retailPrice,
          savings: result.savings,
          planName: auth.planName,
          tier: result.tierUsed,
          pricingMethod: result.notes || 'tier_copay',
          needsTierAssignment,
          active: true,
          updatedAt: new Date(),
        },
      })

      updated++
    } catch (err) {
      failed++
      console.error(`Failed for ${lens.name}:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`Done: ${updated} updated, ${failed} failed`)
}

function mapMaterialType(category: string | null, name: string): string | undefined {
  if (category !== 'material') return undefined
  const nameLower = name.toLowerCase()
  if (nameLower.includes('polycarbonate')) return 'polycarbonate'
  if (nameLower.includes('trivex')) return 'trivex'
  if (nameLower.includes('1.74') || nameLower.includes('hi-index 1.74')) return 'high_index_174'
  if (nameLower.includes('1.67') || nameLower.includes('hi-index 1.67')) return 'high_index_167'
  if (nameLower.includes('cr-39') || nameLower.includes('plastic')) return 'cr39'
  return undefined
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
