import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
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
  console.log('ID:', angela.id)
  console.log('')

  // Find Varilux products in catalog
  const variluxProducts = await prisma.lensProduct.findMany({
    where: { name: { contains: 'Varilux' }, active: true }
  })

  console.log('Varilux products in catalog:', variluxProducts.length)

  // Check if any have price list entries for Angela
  for (const v of variluxProducts) {
    const price = await prisma.patientPriceList.findFirst({
      where: { customerId: angela.id, productId: v.id }
    })

    if (price) {
      console.log(`${v.name}: $${price.finalPrice} (retail: $${v.basePrice}) [${price.tier || 'no tier'}] ${price.pricingMethod || ''}`)
    } else {
      console.log(`${v.name}: NO PRICE ENTRY (retail: $${v.basePrice}) tier: ${v.tierEyemed}`)
    }
  }

  console.log('')
  console.log('=== Total price list entries for Angela ===')
  const total = await prisma.patientPriceList.count({
    where: { customerId: angela.id }
  })
  console.log('Total:', total)

  const active = await prisma.patientPriceList.count({
    where: { customerId: angela.id, active: true }
  })
  console.log('Active:', active)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
