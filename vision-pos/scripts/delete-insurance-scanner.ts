import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // First, find all locations
  const locations = await prisma.location.findMany({
    select: { id: true, name: true, active: true }
  })

  console.log('Current locations:')
  locations.forEach(loc => console.log(`  - ${loc.name} (id: ${loc.id}, active: ${loc.active})`))

  // Find "Insurance Scanner" or similar
  const toDelete = locations.find(loc =>
    loc.name.toLowerCase().includes('scanner') ||
    loc.name.toLowerCase().includes('insurance scanner')
  )

  if (toDelete) {
    console.log(`\nDeactivating location: ${toDelete.name} (${toDelete.id})`)

    // Instead of deleting, set active to false (safer)
    await prisma.location.update({
      where: { id: toDelete.id },
      data: { active: false }
    })

    console.log('Location deactivated successfully')
  } else {
    console.log('\nNo "Insurance Scanner" location found')
  }

  // Show updated list
  const updated = await prisma.location.findMany({
    where: { active: true },
    select: { id: true, name: true }
  })

  console.log('\nActive locations after update:')
  updated.forEach(loc => console.log(`  - ${loc.name}`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
