const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testCustomerAccess() {
  console.log('🧪 Testing customer database access...\n')
  
  try {
    // Get a few fictional customers
    const customers = await prisma.customer.findMany({
      take: 5,
      orderBy: { firstName: 'asc' }
    })

    console.log(`✅ Found ${customers.length} customers in database`)
    
    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.firstName} ${customer.lastName} (ID: ${customer.id})`)
      console.log(`   📧 ${customer.email || 'No email'}`)
      console.log(`   📞 ${customer.phone || 'No phone'}`)
      console.log(`   🏥 ${customer.insuranceCarrier || 'No insurance'}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error accessing customers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCustomerAccess()