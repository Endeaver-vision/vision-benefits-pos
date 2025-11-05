const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function viewTestData() {
  console.log('🔍 Viewing our fictional test data...\n')
  
  // Get customers with their prescriptions and transactions
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { firstName: 'Hermione', lastName: 'Granger' },
        { firstName: 'Sherlock', lastName: 'Holmes' },
        { firstName: 'Tony', lastName: 'Stark' },
        { firstName: 'Diana', lastName: 'Prince' },
        { firstName: 'Bruce', lastName: 'Wayne' },
        { firstName: 'Katniss', lastName: 'Everdeen' },
        { firstName: 'Tyrion', lastName: 'Lannister' },
        { firstName: 'Lara', lastName: 'Croft' },
        { firstName: 'Jean-Luc', lastName: 'Picard' },
        { firstName: 'Indiana', lastName: 'Jones' },
        { firstName: 'Elsa', lastName: 'Arendelle' },
        { firstName: 'Luke', lastName: 'Skywalker' }
      ]
    },
    include: {
      prescriptions: {
        where: { isActive: true }
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { firstName: 'asc' }
  })

  console.log(`📊 FICTIONAL TEST DATA SUMMARY`)
  console.log(`=====================================`)
  console.log(`Total Customers: ${customers.length}`)
  console.log(`Customers with Prescriptions: ${customers.filter(c => c.prescriptions.length > 0).length}`)
  console.log(`Customers with Transactions: ${customers.filter(c => c.transactions.length > 0).length}\n`)

  customers.forEach(customer => {
    const hasPrescrip = customer.prescriptions.length > 0
    const hasTransaction = customer.transactions.length > 0
    const transactionTotal = hasTransaction ? customer.transactions[0].total : 0
    
    console.log(`👤 ${customer.firstName} ${customer.lastName}`)
    console.log(`   📧 ${customer.email}`)
    console.log(`   🏥 ${customer.insuranceCarrier}`)
    console.log(`   👓 Prescription: ${hasPrescrip ? '✅' : '❌'}`)
    console.log(`   💰 Transaction: ${hasTransaction ? `✅ $${transactionTotal}` : '❌'}`)
    console.log(`   📝 ${customer.notes}`)
    console.log('')
  })

  await prisma.$disconnect()
}

viewTestData().catch(console.error)