import { prisma } from '@/lib/prisma'

async function main() {
  const eyemedAuth = await prisma.eyemedAuthorization.findFirst({
    where: { id: '9c763a2c-6253-4a2c-8e3a-5502b9580c14' }
  })

  if (!eyemedAuth) {
    console.log('EyeMed Auth not found')
    return
  }

  console.log('=== EyeMed Authorization ===')
  console.log('examCopay:', eyemedAuth.examCopay)
  console.log('frameAllowance:', eyemedAuth.frameAllowance)
  console.log('\n=== Progressive Copays ===')
  console.log('Standard:', eyemedAuth.progressiveStandardCopay)
  console.log('Tier 1:', eyemedAuth.progressiveTier1Copay)
  console.log('Tier 2:', eyemedAuth.progressiveTier2Copay)
  console.log('Tier 3:', eyemedAuth.progressiveTier3Copay)
  console.log('Tier 4:', eyemedAuth.progressiveTier4Copay)
  console.log('Tier 5:', eyemedAuth.progressiveTier5Copay)

  console.log('\n=== Material Copays ===')
  console.log('Polycarbonate:', eyemedAuth.polycarbonateAdultCopay)
  console.log('High Index 1.67:', eyemedAuth.highIndex167Copay)
  console.log('High Index 1.74:', eyemedAuth.highIndex174Copay)
  console.log('Photochromic:', eyemedAuth.photochromicCopay)
  console.log('Trivex:', eyemedAuth.trivexCopay)
  console.log('Polarized:', eyemedAuth.polarizedCopay)
  console.log('Tint:', eyemedAuth.tintCopay)

  console.log('\n=== Raw Data ===')
  console.log('copays JSON:', eyemedAuth.copays)
}

main().catch(console.error).finally(() => process.exit(0))
