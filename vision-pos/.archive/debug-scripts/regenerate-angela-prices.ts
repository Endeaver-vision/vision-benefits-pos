import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { precomputeCustomerPrices } from '../src/lib/services/price-list-precompute'

const prisma = new PrismaClient()

async function main() {
  // Find Angela
  const angela = await prisma.customer.findFirst({
    where: { firstName: 'Angela', lastName: 'Clayton' }
  })

  if (!angela) {
    console.log('Angela not found')
    return
  }

  console.log('Customer:', angela.firstName, angela.lastName, '(ID:', angela.id + ')')

  // Find her active authorization
  const auth = await prisma.insuranceAuthorization.findFirst({
    where: { customerId: angela.id, isActive: true }
  })

  if (!auth) {
    console.log('No active authorization found')
    return
  }

  console.log('Authorization:', auth.id)
  console.log('Carrier:', auth.carrier)
  console.log('')

  // Show copays with formula components
  const copays = auth.copays as Record<string, unknown>
  console.log('=== FORMULA COMPONENTS IN AUTH ===')
  console.log('progressiveStandard:', copays.progressiveStandard)
  console.log('tier4HasFormula:', copays.tier4HasFormula)
  console.log('tier4DiscountPercent:', copays.tier4DiscountPercent)
  console.log('tier4Allowance:', copays.tier4Allowance)
  console.log('progressiveAllowance:', copays.progressiveAllowance)
  console.log('')

  // Build benefit auth for precompute
  const benefitAuth = {
    carrier: auth.carrier,
    plan: {
      carrier: auth.carrier,
      planName: auth.planName || 'EyeMed Plan',
    },
    patient: { age: null },
    copays: {
      exam: Number(auth.examCopay) || 0,
      materials: Number(auth.materialsCopay) || 0,
      frameAllowance: Number(auth.frameAllowance) || 0,
      frameAllowanceFeatured: Number(auth.frameAllowance) || 0,
      frameAllowanceNonFeatured: Number(auth.frameAllowance) || 0,
      contactAllowance: Number(auth.contactAllowance) || 0,
      clExamCopay: Number(auth.clExamCopay) || 0,
      ...copays,
    },
  }

  console.log('=== REGENERATING PRICE LIST ===')
  const result = await precomputeCustomerPrices(
    benefitAuth,
    {
      customerId: angela.id,
      authorizationId: auth.id,
      carrier: auth.carrier as 'VSP' | 'EyeMed' | 'Spectera',
      planName: auth.planName || undefined,
    }
  )

  console.log('Products created:', result.productsCreated)
  console.log('Products updated:', result.productsUpdated)
  console.log('')

  // Show some tier 4 products to verify formula pricing
  console.log('=== TIER 4 PROGRESSIVE PRICES (Should use formula) ===')
  const tier4Products = await prisma.patientPriceList.findMany({
    where: {
      customerId: angela.id,
      pricingMethod: { contains: 'formula' }
    },
    take: 10
  })

  for (const p of tier4Products) {
    // Need to look up product name from productId
    const lens = await prisma.lensProduct.findUnique({ where: { id: p.productId } })
    const name = lens?.name || p.productId
    console.log(`${name}: $${p.finalPrice} (retail: $${p.retailPrice})`)
    if (p.pricingMethod) console.log(`  Method: ${p.pricingMethod}`)
    if (p.tier) console.log(`  Tier: ${p.tier}`)
  }

  // If no formula products, show by tier
  if (tier4Products.length === 0) {
    console.log('(No formula pricing found, looking by tier...)')
    const tierProducts = await prisma.patientPriceList.findMany({
      where: {
        customerId: angela.id,
        tier: { in: ['tier_4', 'tier_5'] }
      },
      take: 10
    })
    for (const p of tierProducts) {
      const lens = await prisma.lensProduct.findUnique({ where: { id: p.productId } })
      const name = lens?.name || p.productId
      console.log(`${name}: $${p.finalPrice} (retail: $${p.retailPrice}) [tier: ${p.tier}]`)
    }
  }

  // Also show some sample progressives across tiers for comparison
  console.log('')
  console.log('=== SAMPLE PROGRESSIVES BY TIER ===')
  // Get products with tiers
  const tieredProducts = await prisma.patientPriceList.findMany({
    where: {
      customerId: angela.id,
      tier: { not: null }
    },
    orderBy: { finalPrice: 'asc' },
    take: 15
  })

  for (const p of tieredProducts) {
    const lens = await prisma.lensProduct.findUnique({ where: { id: p.productId } })
    const name = lens?.name || p.productId
    console.log(`${name}: $${p.finalPrice} (retail: $${p.retailPrice}) [${p.tier}] ${p.pricingMethod || ''}`)
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
