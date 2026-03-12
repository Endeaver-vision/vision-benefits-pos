import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { createPricingCalculator } from '../src/lib/services/pricing-calculator'

const prisma = new PrismaClient()

async function main() {
  // Get Angela's authorization
  const angela = await prisma.customer.findFirst({
    where: { firstName: 'Angela', lastName: 'Clayton' }
  })

  if (!angela) {
    console.log('Angela not found')
    return
  }

  const auth = await prisma.insuranceAuthorization.findFirst({
    where: { customerId: angela.id, isActive: true }
  })

  if (!auth) {
    console.log('No active authorization')
    return
  }

  console.log('Carrier:', auth.carrier)
  const copays = auth.copays as Record<string, unknown>
  console.log('')
  console.log('Extracted copays:')
  console.log('  singleVision:', copays.singleVision)
  console.log('  bifocal:', copays.bifocal)
  console.log('  polycarbonate:', copays.polycarbonate)
  console.log('  eyemedTiers:', JSON.stringify(copays.eyemedTiers))
  console.log('  allOtherLensOptions:', copays.allOtherLensOptions)
  console.log('')

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

  console.log('Creating calculator...')
  const calculator = createPricingCalculator(benefitAuth as any)
  console.log('Calculator type:', calculator.constructor.name)
  console.log('')

  // Test Single Vision
  const svProduct = {
    sku: 'TEST-SV',
    displayName: 'Single Vision',
    category: 'lens_sv' as const,
    retailPrice: 80.40,
    eyemed: null
  }

  console.log('=== Single Vision ($80.40 retail) ===')
  const svResult = calculator.calculateProduct(svProduct as any, benefitAuth as any)
  console.log('  Patient copay:', svResult.patientCopay)
  console.log('  Savings:', svResult.savings)
  console.log('  Tier used:', svResult.tierUsed)
  console.log('  Warnings:', svResult.warnings)
  console.log('')

  // Test Bifocal
  const bfProduct = {
    sku: 'TEST-BF',
    displayName: 'Bifocal',
    category: 'lens_bifocal' as const,
    retailPrice: 126,
    eyemed: null
  }

  console.log('=== Bifocal ($126 retail) ===')
  const bfResult = calculator.calculateProduct(bfProduct as any, benefitAuth as any)
  console.log('  Patient copay:', bfResult.patientCopay)
  console.log('  Savings:', bfResult.savings)
  console.log('  Tier used:', bfResult.tierUsed)
  console.log('  Warnings:', bfResult.warnings)
  console.log('')

  // Test Polycarbonate
  const polyProduct = {
    sku: 'TEST-POLY',
    displayName: 'Polycarbonate',
    category: 'material' as const,
    retailPrice: 65,
    eyemed: { materialType: 'polycarbonate' }
  }

  console.log('=== Polycarbonate ($65 retail) ===')
  const polyResult = calculator.calculateProduct(polyProduct as any, benefitAuth as any)
  console.log('  Patient copay:', polyResult.patientCopay)
  console.log('  Savings:', polyResult.savings)
  console.log('  Tier used:', polyResult.tierUsed)
  console.log('  Notes:', (polyResult as any).notes)
  console.log('')

  // Test AR Standard
  const arProduct = {
    sku: 'TEST-AR',
    displayName: 'AR Coating Standard',
    category: 'ar_coating' as const,
    retailPrice: 89,
    eyemed: { arTier: 'standard' }
  }

  console.log('=== AR Coating Standard ($89 retail) ===')
  const arResult = calculator.calculateProduct(arProduct as any, benefitAuth as any)
  console.log('  Patient copay:', arResult.patientCopay)
  console.log('  Savings:', arResult.savings)
  console.log('  Tier used:', arResult.tierUsed)
  console.log('  Notes:', arResult.notes)
  console.log('')

  // Test AR without tier (should fall back to "all other lens options" discount)
  const arNoTierProduct = {
    sku: 'TEST-AR-NO-TIER',
    displayName: 'AR Coating Premium',
    category: 'ar_coating' as const,
    retailPrice: 150,
    eyemed: { arTier: 'tier_2' }  // tier_2 is null in Angela's data
  }

  console.log('=== AR Coating Tier 2 - null in plan ($150 retail) ===')
  const arNoTierResult = calculator.calculateProduct(arNoTierProduct as any, benefitAuth as any)
  console.log('  Patient copay:', arNoTierResult.patientCopay)
  console.log('  Savings:', arNoTierResult.savings)
  console.log('  Tier used:', arNoTierResult.tierUsed)
  console.log('  Notes:', arNoTierResult.notes)
  console.log('')

  // Test Progressive Tier 4 (formula)
  const progT4Product = {
    sku: 'TEST-PROG-T4',
    displayName: 'Varilux X Design',
    category: 'lens_progressive' as const,
    retailPrice: 600,
    eyemed: { progressiveTier: 'tier_4' }
  }

  console.log('=== Progressive Tier 4 - Formula ($600 retail) ===')
  const progT4Result = calculator.calculateProduct(progT4Product as any, benefitAuth as any)
  console.log('  Patient copay:', progT4Result.patientCopay)
  console.log('  Savings:', progT4Result.savings)
  console.log('  Tier used:', progT4Result.tierUsed)
  console.log('  Notes:', progT4Result.notes)
  console.log('')

  // Test Tint
  const tintProduct = {
    sku: 'TEST-TINT',
    displayName: 'Tint',
    category: 'tint' as const,
    retailPrice: 30,
    eyemed: null
  }

  console.log('=== Tint ($30 retail) ===')
  const tintResult = calculator.calculateProduct(tintProduct as any, benefitAuth as any)
  console.log('  Patient copay:', tintResult.patientCopay)
  console.log('  Savings:', tintResult.savings)
  console.log('  Tier used:', tintResult.tierUsed)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
