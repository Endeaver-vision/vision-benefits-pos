const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

// Use the default connection from schema
const prisma = new PrismaClient()

async function setupDatabase() {
  console.log('🔧 Setting up database with proper configuration...\n')
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    // Check/create location first
    let location = await prisma.location.findFirst()
    if (!location) {
      location = await prisma.location.create({
        data: {
          name: 'Main Store',
          address: '123 Vision Street, Eye City, EC 12345',
          phone: '(555) 123-4567'
        }
      })
      console.log('✅ Created location: ' + location.name)
    } else {
      console.log('✅ Found existing location: ' + location.name)
    }

    // Hash password with proper method
    const password = 'demo123'
    console.log('🔐 Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 12)
    console.log('✅ Password hashed successfully')

    // Create/update demo user
    const demoUserData = {
      email: 'demo@visionpos.com',
      passwordHash: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      role: 'ADMIN',
      locationId: location.id,
      active: true
    }

    // Use upsert to create or update
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@visionpos.com' },
      update: {
        passwordHash: hashedPassword,
        active: true
      },
      create: demoUserData
    })
    console.log('✅ Demo user ready: ' + demoUser.email)

    // Create/update admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@visionpos.com' },
      update: {
        passwordHash: hashedPassword,
        active: true
      },
      create: {
        email: 'admin@visionpos.com',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        locationId: location.id,
        active: true
      }
    })
    console.log('✅ Admin user ready: ' + adminUser.email)

    // Verify users can be found and passwords work
    console.log('\n🧪 Testing authentication...')
    
    const testUser = await prisma.user.findUnique({
      where: { email: 'demo@visionpos.com' }
    })
    
    if (testUser && testUser.passwordHash) {
      const isValid = await bcrypt.compare('demo123', testUser.passwordHash)
      console.log('✅ Password verification test:', isValid ? 'PASSED' : 'FAILED')
    }

    console.log('\n🎉 Database setup completed successfully!')
    console.log('=' .repeat(60))
    console.log('🔑 LOGIN CREDENTIALS:')
    console.log('   📧 Email: demo@visionpos.com')
    console.log('   🔑 Password: demo123')
    console.log('   👤 Role: ADMIN')
    console.log('')
    console.log('   📧 Email: admin@visionpos.com')
    console.log('   🔑 Password: demo123')
    console.log('   👤 Role: ADMIN')
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('❌ Setup failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

setupDatabase()
  .then(() => {
    console.log('\n✅ Setup script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Setup script failed:', error)
    process.exit(1)
  })