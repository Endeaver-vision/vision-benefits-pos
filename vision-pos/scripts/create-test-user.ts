import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    // Get the first location for our test user
    const location = await prisma.location.findFirst()
    
    if (!location) {
      console.error('No location found. Please run the seed script first.')
      return
    }

    // Hash the password
    const hashedPassword = await hashPassword('Password123')

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'admin@visioncare.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        passwordHash: hashedPassword,
        locationId: location.id,
        active: true,
      },
      include: {
        location: true
      }
    })

    console.log('✅ Test user created successfully!')
    console.log('📧 Email:', user.email)
    console.log('🔑 Password: Password123')
    console.log('🏢 Location:', user.location.name)
    console.log('👤 Role:', user.role)
  } catch (error) {
    console.error('❌ Error creating test user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()