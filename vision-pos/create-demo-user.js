const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function createDemoUser() {
  console.log('🔐 Creating demo user with credentials...\n')
  
  try {
    // Hash the password
    const password = 'demo123'
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Get the location
    const location = await prisma.location.findFirst()
    if (!location) {
      throw new Error('No location found in database')
    }

    // Check if demo user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'demo@visionpos.com' }
    })

    if (existingUser) {
      // Update existing user with password
      const updatedUser = await prisma.user.update({
        where: { email: 'demo@visionpos.com' },
        data: {
          passwordHash: hashedPassword,
          active: true
        }
      })
      console.log('✅ Updated existing demo user with password')
    } else {
      // Create new demo user
      const newUser = await prisma.user.create({
        data: {
          email: 'demo@visionpos.com',
          passwordHash: hashedPassword,
          firstName: 'Demo',
          lastName: 'User',
          role: 'ADMIN',
          locationId: location.id,
          active: true
        }
      })
      console.log('✅ Created new demo user')
    }

    // Also update the existing admin user
    await prisma.user.update({
      where: { email: 'admin@visionpos.com' },
      data: {
        passwordHash: hashedPassword,
        active: true
      }
    })

    console.log('\n🎉 Demo credentials created successfully!')
    console.log('=' .repeat(50))
    console.log('📧 Email: demo@visionpos.com')
    console.log('🔑 Password: demo123')
    console.log('👤 Role: ADMIN')
    console.log('🏢 Location: ' + location.name)
    console.log('=' .repeat(50))
    console.log('\nAlternative credentials:')
    console.log('📧 Email: admin@visionpos.com')
    console.log('🔑 Password: demo123')
    console.log('👤 Role: ADMIN')
    console.log('🏢 Location: ' + location.name)
    console.log('=' .repeat(50))

  } catch (error) {
    console.error('❌ Error creating demo user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDemoUser()