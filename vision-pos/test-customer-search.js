const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testCustomers() {
  console.log('🔍 Testing customer database access...\n')
  
  try {
    // Test 1: Get total count
    const totalCount = await prisma.customer.count({ where: { active: true } })
    console.log(`✅ Total active customers: ${totalCount}`)
    
    // Test 2: Get first 5 customers
    const customers = await prisma.customer.findMany({
      where: { active: true },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        insuranceCarrier: true
      }
    })
    
    console.log('\n📋 First 5 customers:')
    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.firstName} ${customer.lastName} (${customer.email || 'No email'})`)
      if (customer.insuranceCarrier) {
        console.log(`   Insurance: ${customer.insuranceCarrier}`)
      }
    })
    
    // Test 3: Search for specific names
    const searchTerms = ['hermione', 'tony', 'leia', 'tyrion']
    
    for (const term of searchTerms) {
      const results = await prisma.customer.findMany({
        where: {
          AND: [
            { active: true },
            {
              OR: [
                { firstName: { contains: term } },
                { lastName: { contains: term } }
              ]
            }
          ]
        },
        take: 3
      })
      
      console.log(`\n🔍 Search results for "${term}": ${results.length} found`)
      results.forEach(customer => {
        console.log(`   - ${customer.firstName} ${customer.lastName}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Database error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCustomers()