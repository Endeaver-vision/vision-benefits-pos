const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUsers() {
  console.log('🔍 Checking existing users in database...\n')
  
  try {
    const users = await prisma.user.findMany({
      include: {
        location: true
      }
    })

    if (users.length === 0) {
      console.log('❌ No users found in database!')
    } else {
      console.log(`✅ Found ${users.length} users:`)
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName}`)
        console.log(`   📧 Email: ${user.email}`)
        console.log(`   🔑 Has Password: ${user.passwordHash ? 'Yes' : 'No'}`)
        console.log(`   👤 Role: ${user.role}`)
        console.log(`   🏢 Location: ${user.location?.name || 'None'}`)
        console.log(`   ✅ Active: ${user.active}`)
        console.log('')
      })
    }

    const locations = await prisma.location.findMany()
    console.log(`🏢 Available locations: ${locations.length}`)
    locations.forEach((loc, index) => {
      console.log(`${index + 1}. ${loc.name} (${loc.id})`)
    })

  } catch (error) {
    console.error('❌ Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()