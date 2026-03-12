import { prisma } from '@/lib/prisma'

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { firstName: 'Angela', lastName: 'Clayton' }
  })

  if (!customer) {
    console.log('Angela Clayton not found')
    return
  }

  console.log('Customer:', customer.id, customer.firstName, customer.lastName)

  const auth = await prisma.insuranceAuthorization.findFirst({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' }
  })

  if (!auth) {
    console.log('No authorization found')
    return
  }

  console.log('\n=== Authorization ===')
  console.log('ID:', auth.id)
  console.log('Carrier:', auth.carrier)
  console.log('Is Active:', auth.isActive)
  console.log('examCopay:', auth.examCopay)
  console.log('materialsCopay:', auth.materialsCopay)
  console.log('frameAllowance:', auth.frameAllowance)

  if (auth.carrier.toLowerCase() === 'vsp') {
    const vspAuth = await prisma.vspAuthorization.findFirst({
      where: { id: auth.id },
      include: { lensEnhancementCopays: true }
    })
    console.log('\n=== VSP Authorization ===')
    console.log('Found:', vspAuth !== null)
    if (vspAuth) {
      console.log('examCopay:', vspAuth.examCopay)
      console.log('materialsCopay:', vspAuth.materialsCopay)
      console.log('Enhancement copays count:', vspAuth.lensEnhancementCopays?.length || 0)
      if (vspAuth.lensEnhancementCopays && vspAuth.lensEnhancementCopays.length > 0) {
        console.log('\nCopays:')
        for (const c of vspAuth.lensEnhancementCopays) {
          console.log(`  ${c.code}: SV=$${c.copaySingleVision} MF=$${c.copayMultifocal}`)
        }
      }
    }
  }
}

main().catch(console.error).finally(() => process.exit(0))
