import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find Doris's document
  const doc = await prisma.insuranceDocument.findFirst({
    where: {
      customerId: 'cminudpy65fd6hfrxt9e'
    },
    orderBy: { createdAt: 'desc' }
  })

  if (!doc) {
    console.log('No documents found for Doris')
    process.exit(1)
  }

  console.log('Found document:', doc.id, doc.fileName)
  console.log('Current status:', doc.ocrStatus)
  
  // Reset the document to pending
  await prisma.insuranceDocument.update({
    where: { id: doc.id },
    data: {
      ocrStatus: 'pending',
      gptStatus: 'pending',
      extractedData: null,
      ocrError: null,
      gptError: null
    }
  })

  console.log('Document reset. Reprocess with:')
  console.log('curl -X POST http://localhost:3000/api/documents/' + doc.id + '/process')
}

main().catch(console.error).finally(() => process.exit(0))
