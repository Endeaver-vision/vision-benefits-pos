import { prisma } from '@/lib/prisma'

async function main() {
  const count = await prisma.insuranceAuthorization.count({
    where: { isActive: true }
  })

  const byCarrier = await prisma.insuranceAuthorization.groupBy({
    by: ['carrier'],
    where: { isActive: true },
    _count: true
  })

  console.log(`Total active authorizations: ${count}`)
  console.log('By carrier:', byCarrier)
}

main()
