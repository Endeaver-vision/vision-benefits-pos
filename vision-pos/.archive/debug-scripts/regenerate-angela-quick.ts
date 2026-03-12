import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { precomputeCustomerPrices } from '../src/lib/services/price-list-precompute'

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

  // Get her authorization
  const auth = await prisma.insuranceAuthorization.findFirst({
    where: { customerId: angela.id, isActive: true }
  })

  if (!auth) {
    console.log('No active authorization')
    return
  }

  console.log('Carrier:', auth.carrier)
  console.log('')

  // Build copays from authorization
  const copays = (auth.copays as Record<string, unknown>) || {}
  const carrierLower = auth.carrier.toLowerCase()

  // Build BenefitAuthorization object
  const benefitAuth = {
    carrier: carrierLower,
    plan: {
      carrier: carrierLower,
      planName: auth.planName || `${auth.carrier} Plan`,
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

  console.log('Calling precomputeCustomerPrices...')

  try {
    const result = await precomputeCustomerPrices(
      benefitAuth as any,
      {
        customerId: angela.id,
        authorizationId: auth.id,
        carrier: auth.carrier.toUpperCase() as 'VSP' | 'EyeMed' | 'Spectera',
        planName: auth.planName || `${auth.carrier} Plan`,
      }
    )

    console.log('Result:', JSON.stringify(result, null, 2))
  } catch (err) {
    console.error('Error:', err)
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
