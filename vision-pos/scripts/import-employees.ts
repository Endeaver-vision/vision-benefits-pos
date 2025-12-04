import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Employee data from CSV with role assignments
const employees = [
  { firstName: 'Jennifer', lastName: 'Bubendorf', username: 'jebubendorf', role: 'MANAGER' },
  { firstName: 'Conceirge', lastName: 'Center', username: 'cocenter', role: 'ASSOCIATE' },
  { firstName: 'Richard', lastName: 'Claveria', username: 'riclaveria', role: 'ASSOCIATE' },
  { firstName: 'Becky', lastName: 'Crockett', username: 'becrockett', role: 'DOCTOR' },
  { firstName: 'Krysta', lastName: 'Crockett', username: 'krcrockett', role: 'ASSOCIATE' },
  { firstName: 'Vince Lethner', lastName: 'Gomez', username: 'vigomez', role: 'ASSOCIATE' },
  { firstName: 'Alicia', lastName: 'Hamilton', username: 'alhamilton', role: 'ASSOCIATE' },
  { firstName: 'Allison', lastName: 'LaRue', username: 'allarue', role: 'DOCTOR' },
  { firstName: 'Alexandra', lastName: 'Reyes Santos', username: 'alreyessantos', role: 'ASSOCIATE' },
  { firstName: 'Carl', lastName: 'Ritch', username: 'caritch', role: 'ADMIN' },
  { firstName: 'Enid', lastName: 'Romero', username: 'enromero', role: 'ADMIN' },
  { firstName: 'Billing', lastName: 'Solaris', username: 'bisolaris', role: 'ASSOCIATE' },
  { firstName: 'Rhonda', lastName: 'Velez', username: 'rhvelez', role: 'ASSOCIATE' },
] as const

async function main() {
  const locationId = 'cmi990a9l00000b065hm0sb0a' // Insight Eyecare and Optical
  const defaultPassword = 'Vision2020'

  // Hash the password once and reuse
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  console.log('Importing employees...\n')

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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
