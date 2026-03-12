import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAngela() {
  const doc = await prisma.insuranceDocument.findFirst({
    where: { customer: { firstName: 'Angela', lastName: 'Clayton' } },
    orderBy: { createdAt: 'desc' }
  })

  if (!doc) {
    console.log('No document found')
    return
  }

  const extractedData = doc.extractedData as Record<string, unknown>
  console.log('Raw extracted keys (COPAYS_):')
  const rawValues = (extractedData._rawExtractedValues || {}) as Record<string, unknown>
  for (const [key, value] of Object.entries(rawValues)) {
    if (key.startsWith('COPAYS_')) {
      console.log('  ', key, ':', value)
    }
  }
  console.log('')
  console.log('Normalized fields at top level:')
  console.log('  singleVision:', extractedData.singleVision)
  console.log('  bifocal:', extractedData.bifocal)
  console.log('  polycarbonate:', extractedData.polycarbonate)
  console.log('  polycarbonateUnder19:', extractedData.polycarbonateUnder19)
  console.log('  tint:', extractedData.tint)
  console.log('  uvTreatment:', extractedData.uvTreatment)
  console.log('  scratch:', extractedData.scratch)
  console.log('  arStandard:', extractedData.arStandard)
  console.log('  allOtherLensOptions:', extractedData.allOtherLensOptions)
}

checkAngela().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
