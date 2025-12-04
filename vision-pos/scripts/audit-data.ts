import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function audit() {
  console.log('\n=== LENS PRODUCTS ===')
  const sampleLens = await prisma.lensProduct.findMany({ 
    take: 8,
    include: { carrierTiers: true }
  })
  console.log('Total lens products:', await prisma.lensProduct.count())
  console.log('\nSample lenses with carrier tiers:')
  sampleLens.forEach(l => {
    console.log('  -', l.name, '| Category:', l.category)
    console.log('    Tiers:', l.carrierTiers.map(t => t.carrier + ':' + t.tierCode).join(', ') || 'NONE')
  })
  
  console.log('\n=== VERIFIED INSURANCE DOCS ===')
  const docs = await prisma.insuranceDocument.findMany({ 
    where: { isVerified: true }, 
    take: 2,
    include: { customer: { select: { firstName: true, lastName: true } } }
  })
  console.log('Verified docs count:', docs.length)
  docs.forEach(d => {
    console.log('\nDoc ID:', d.id)
    console.log('  Customer:', d.customer?.firstName, d.customer?.lastName)
    console.log('  Carrier:', d.carrier)
    console.log('  Has extractedData:', !!d.extractedData)
    if (d.extractedData) {
      const data = d.extractedData as Record<string, unknown>
      console.log('  ExtractedData keys:', Object.keys(data))
    }
  })
  
  console.log('\n=== CONTACT LENS CATEGORIES ===')
  const clSample = await prisma.contactLens.findMany({ take: 5 })
  console.log('Sample contact lenses:')
  clSample.forEach(c => {
    console.log('  -', c.manufacturer, c.lensName)
    console.log('    VSP:', c.vspCategory, '| EyeMed:', c.eyemedCategory, '| Spectera:', c.specteraCategory)
    console.log('    Retail:', c.retailPrice, '| BoxSize:', c.boxSize)
  })
  
  console.log('\n=== FORMULARY SAMPLES ===')
  const vspProg = await prisma.vspProgressiveFormulary.findMany({ take: 3 })
  console.log('VSP Progressive samples:')
  vspProg.forEach(f => console.log('  -', f.lensName, '| Tier:', f.tier, '| Code:', f.lensCode))
  
  const eyemedProg = await prisma.eyemedProgressiveFormulary.findMany({ take: 3 })
  console.log('\nEyeMed Progressive samples:')
  eyemedProg.forEach(f => console.log('  -', f.lensName, '| Tier:', f.tier))
  
  await prisma.$disconnect()
}

audit().catch(e => { console.error(e); process.exit(1) })
