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

  // Get her price list
  const prices = await prisma.patientPriceList.findMany({
    where: { customerId: angela.id, active: true },
    orderBy: { finalPrice: 'asc' },
    take: 50
  })

  console.log('Total price list entries:', prices.length)
  console.log('')

  // Show with product names
  for (const p of prices) {
    const lens = await prisma.lensProduct.findUnique({ where: { id: p.productId } })
    const name = lens?.name || p.productId
    const category = lens?.category || 'unknown'
    console.log(`${name}: $${p.finalPrice} (retail: $${p.retailPrice}) [${p.tier || 'no tier'}] ${p.pricingMethod || ''} | cat: ${category}`)
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
