import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// New Spectrum Vision employees (excluding duplicates)
const employees = [
  { firstName: 'Naomi', lastName: 'Aguilera', username: 'naaguilera', role: 'DOCTOR' },
  { firstName: 'Mary', lastName: "D'Agostino", username: 'madagostino', role: 'ASSOCIATE' },
  { firstName: 'Justin', lastName: 'Hrabinski', username: 'juhrabinski', role: 'DOCTOR' },
  { firstName: 'Michelle', lastName: 'Lawless', username: 'milawless', role: 'ASSOCIATE' },
  { firstName: 'Amy', lastName: 'Leonard', username: 'amleonard', role: 'ASSOCIATE' },
  { firstName: 'Sherry', lastName: 'Miller', username: 'shmiller', role: 'MANAGER' },
  { firstName: 'Shannon', lastName: 'Shumway', username: 'shshumway', role: 'MANAGER' },
  { firstName: 'Joan', lastName: 'Wolf', username: 'jowolf', role: 'ASSOCIATE' },
] as const

async function main() {
  const locationId = 'spectrum_vision_ihb' // Spectrum Vision
  const defaultPassword = 'Vision2020'

  // Hash the password once and reuse
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  console.log('Importing Spectrum Vision employees...\n')

  for (const emp of employees) {
    try {
      const user = await prisma.user.create({
        data: {
          username: emp.username,
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: emp.role,
          passwordHash,
          locationId,
          active: true,
        },
      })
      console.log(`✓ Created: ${user.firstName} ${user.lastName} (${user.username}) - ${user.role}`)
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⚠ Skipped (already exists): ${emp.firstName} ${emp.lastName} (${emp.username})`)
      } else {
        console.error(`✗ Error creating ${emp.firstName} ${emp.lastName}:`, error.message)
      }
    }
  }

  // Show summary
  const userCount = await prisma.user.count()
  console.log(`\n✓ Total users in database: ${userCount}`)

  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: true,
  })
  console.log('\nUsers by role:')
  for (const r of usersByRole) {
    console.log(`  ${r.role}: ${r._count}`)
  }

  const usersByLocation = await prisma.user.groupBy({
    by: ['locationId'],
    _count: true,
  })

  const locations = await prisma.location.findMany()
  console.log('\nUsers by location:')
  for (const loc of usersByLocation) {
    const locationName = locations.find(l => l.id === loc.locationId)?.name || loc.locationId
    console.log(`  ${locationName}: ${loc._count}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
