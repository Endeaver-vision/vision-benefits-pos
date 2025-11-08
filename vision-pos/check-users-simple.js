const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    const users = await prisma.users.findMany()
    console.log('Users found:', users.map(u => ({ 
      id: u.id, 
      email: u.email, 
      firstName: u.firstName,
      lastName: u.lastName,
      hasPasswordHash: !!u.passwordHash 
    })))
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()