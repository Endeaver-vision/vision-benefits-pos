import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const docId = '7fd107b7-8b20-45a7-adb4-28e8fb9112b3'

  const doc = await prisma.insuranceDocument.update({
    where: { id: docId },
    data: {
      isVerified: false,
      authorizationId: null,
      verifiedBy: null,
      verifiedAt: null,
    }
  })

  console.log('✓ Document marked as unverified')
  console.log('ID:', doc.id)
  console.log('Verified:', doc.isVerified)
}

main().catch(console.error).finally(() => process.exit(0))
