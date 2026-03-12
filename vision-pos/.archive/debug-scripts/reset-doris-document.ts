import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Reset Doris's document to allow re-verification
  const documentId = 'aee9979f-3c0e-485b-880a-405eee2d26f4'
  
  const updated = await prisma.insuranceDocument.update({
    where: { id: documentId },
    data: {
      isVerified: false,
      verifiedBy: null,
      verifiedAt: null,
      authorizationId: null,
    }
  })
  
  console.log('✓ Document reset for re-verification')
  console.log('Document:', {
    id: updated.id,
    fileName: updated.fileName,
    customerId: updated.customerId,
    isVerified: updated.isVerified,
    authorizationId: updated.authorizationId
  })
}

main().catch(console.error).finally(() => process.exit(0))
