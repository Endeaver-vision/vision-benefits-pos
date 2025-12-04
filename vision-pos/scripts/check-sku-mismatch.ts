import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  console.log('=== SERVICE PRICE SKUs ===')
  const services = await prisma.servicePrice.findMany({
    where: { category: { in: ['EXAM', 'CONTACT_LENS_FIT'] } },
    select: { sku: true, name: true, category: true, retailPrice: true }
  })
  console.log('Services with SKUs:')
  services.forEach(s => console.log('  SKU:', s.sku || 'NULL', '|', s.name, '| Price:', s.retailPrice))
  
  console.log('\n=== UI Uses These IDs ===')
  const uiIds = ['routine', 'medical', 'optomap', 'iwellness', 'oct-retina', 'visual-field', 'cl-sphere', 'cl-toric', 'cl-multifocal']
  console.log('UI sends:', uiIds.join(', '))
  
  console.log('\n=== MATCHING CHECK ===')
  const matched = uiIds.filter(id => services.some(s => s.sku === id))
  const unmatched = uiIds.filter(id => !services.some(s => s.sku === id))
  console.log('Matched:', matched.length > 0 ? matched.join(', ') : 'NONE')
  console.log('Unmatched:', unmatched.length > 0 ? unmatched.join(', ') : 'All matched!')
  
  await prisma.$disconnect()
}
check().catch(console.error)
