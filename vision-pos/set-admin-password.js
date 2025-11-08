const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function setAdminPassword() {
  try {
    const hashedPassword = await bcrypt.hash('Password123', 10)
    
    const user = await prisma.users.update({
      where: { email: 'admin@visioncare.com' },
      data: { 
        passwordHash: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator'
      }
    })
    
    console.log('Admin password set successfully for:', user.email)
  } catch (error) {
    console.error('Error setting password:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

setAdminPassword()