import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'

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
  console.log('')

  // Get her authorization
  const auth = await prisma.insuranceAuthorization.findFirst({
    where: { customerId: angela.id, isActive: true }
  })

  if (auth) {
    console.log('=== AUTHORIZATION ===')
    console.log('Carrier:', auth.carrier)
    console.log('Plan:', auth.planName)
    console.log('Exam Copay:', auth.examCopay)
    console.log('Materials Copay:', auth.materialsCopay)
    console.log('Frame Allowance:', auth.frameAllowance)
    console.log('')
    console.log('Copays from extraction:')
    const copays = auth.copays as Record<string, unknown> || {}
    for (const [key, value] of Object.entries(copays)) {
      if (value !== null && value !== undefined) {
        console.log('  ', key + ':', value)
      }
    }
    console.log('')
  }

  // Check progressive products specifically
  const progressives = await prisma.$queryRaw<Array<{
    product_name: string
    tier_eyemed: string | null
    retail_price: number
    final_price: number
    pricing_method: string
    tier: string | null
  }>>`
    SELECT
      lp.name as product_name,
      lp."tierEyemed" as tier_eyemed,
      ppl.retail_price,
      ppl.final_price,
      ppl.pricing_method,
      ppl.tier
    FROM patient_price_lists ppl
    JOIN lens_products lp ON ppl.product_id = lp.id
    WHERE ppl.customer_id = ${angela.id}
      AND (lp.name ILIKE '%varilux%' OR lp.name ILIKE '%progressive%' OR lp."tierEyemed" ILIKE '%tier%')
    ORDER BY lp.name
  `

  console.log('=== PROGRESSIVE PRODUCTS ANALYSIS ===')
  for (const p of progressives) {
    const retail = Number(p.retail_price)
    const final = Number(p.final_price)
    console.log(p.product_name)
    console.log('  DB tier_eyemed:', p.tier_eyemed)
    console.log('  Price list tier:', p.tier)
    console.log('  Retail: $' + retail.toFixed(2))
    console.log('  Current Final: $' + final.toFixed(2))
    console.log('  Method:', p.pricing_method)
    console.log('  --- Calculations ---')
    console.log('  Simple 20% off: $' + (retail * 0.80).toFixed(2))
    console.log('  (Retail * 0.80) - $120: $' + Math.max(0, (retail * 0.80) - 120).toFixed(2))
    console.log('  (Retail - $120) * 0.80: $' + Math.max(0, (retail - 120) * 0.80).toFixed(2))
    console.log('')
  }
  console.log('')

  // Get her price list with product names via raw query
  const prices = await prisma.$queryRaw<Array<{
    product_name: string
    retail_price: number
    final_price: number
    pricing_method: string
    tier: string | null
  }>>`
    SELECT
      lp.name as product_name,
      ppl.retail_price,
      ppl.final_price,
      ppl.pricing_method,
      ppl.tier
    FROM patient_price_lists ppl
    JOIN lens_products lp ON ppl.product_id = lp.id
    WHERE ppl.customer_id = ${angela.id}
    ORDER BY ppl.pricing_method, lp.name
  `

  console.log('=== PRICE LIST (' + prices.length + ' items) ===')
  console.log('')

  // Group by pricing method
  const byMethod: Record<string, typeof prices> = {}
  for (const p of prices) {
    const method = p.pricing_method || 'unknown'
    if (!byMethod[method]) byMethod[method] = []
    byMethod[method].push(p)
  }

  for (const [method, items] of Object.entries(byMethod)) {
    console.log('--- ' + method.toUpperCase() + ' (' + items.length + ' items) ---')
    for (const p of items) {
      const retail = Number(p.retail_price)
      const final = Number(p.final_price)
      const savings = retail - final
      const tierInfo = p.tier ? ` [tier: ${p.tier}]` : ''
      console.log('  ' + p.product_name + ': $' + retail.toFixed(2) + ' -> $' + final.toFixed(2) + (savings > 0 ? ' (save $' + savings.toFixed(2) + ')' : '') + tierInfo)
    }
    console.log('')
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
