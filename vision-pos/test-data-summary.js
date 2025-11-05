const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testDataSummary() {
  console.log('🎭 FICTIONAL CHARACTER TEST DATA - COMPLETE SUMMARY')
  console.log('=' .repeat(60))
  
  // Get all fictional characters (unique ones)
  const uniqueCustomers = await prisma.customer.findMany({
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
      prescriptions: { where: { isActive: true } },
      transactions: true
    },
    orderBy: [{ firstName: 'asc' }, { createdAt: 'asc' }]
  })

  // Remove duplicates by keeping only the first occurrence of each name
  const seenNames = new Set()
  const uniqueCharacters = uniqueCustomers.filter(customer => {
    const fullName = `${customer.firstName} ${customer.lastName}`
    if (seenNames.has(fullName)) {
      return false
    }
    seenNames.add(fullName)
    return true
  })

  console.log(`\n📊 OVERVIEW:`)
  console.log(`• Total Unique Characters: ${uniqueCharacters.length}`)
  console.log(`• Characters with Prescriptions: ${uniqueCharacters.filter(c => c.prescriptions.length > 0).length}`)
  console.log(`• Characters with Transactions: ${uniqueCharacters.filter(c => c.transactions.length > 0).length}`)
  
  const totalRevenue = uniqueCharacters
    .flatMap(c => c.transactions)
    .reduce((sum, t) => sum + t.total, 0)
  console.log(`• Total Revenue from Test Data: $${totalRevenue.toFixed(2)}`)

  console.log(`\n🎭 CHARACTER PROFILES:`)
  console.log('-' .repeat(60))

  uniqueCharacters.forEach((character, index) => {
    const hasPrescrip = character.prescriptions.length > 0
    const transactionCount = character.transactions.length
    const totalSpent = character.transactions.reduce((sum, t) => sum + t.total, 0)
    
    console.log(`\n${index + 1}. ${character.firstName} ${character.lastName}`)
    console.log(`   📧 ${character.email}`)
    console.log(`   🏥 ${character.insuranceCarrier}`)
    console.log(`   👓 Prescription: ${hasPrescrip ? '✅' : '❌'}`)
    console.log(`   💰 Transactions: ${transactionCount > 0 ? `${transactionCount} ($${totalSpent.toFixed(2)})` : '❌'}`)
    console.log(`   📝 ${character.notes}`)
    
    if (hasPrescrip) {
      const prescription = character.prescriptions[0]
      console.log(`   🔍 Prescription Type: ${prescription.prescriptionType}`)
      console.log(`   👨‍⚕️ Provider: ${prescription.providerName}`)
    }
  })

  console.log(`\n🧪 TESTING CAPABILITIES:`)
  console.log('-' .repeat(60))
  console.log(`✅ Customer Management - All CRUD operations`)
  console.log(`✅ Prescription Tracking - Multiple prescription types`)
  console.log(`✅ Transaction Processing - Various payment methods`)
  console.log(`✅ Insurance Handling - Different carriers and plans`)
  console.log(`✅ Customer Demographics - Diverse age groups and genders`)
  console.log(`✅ Order Status Tracking - PENDING, COMPLETED statuses`)
  console.log(`✅ Provider Management - Multiple eye care providers`)
  console.log(`✅ Communication Preferences - Email, phone preferences`)

  console.log(`\n🎯 READY FOR TESTING:`)
  console.log('-' .repeat(60))
  console.log(`• Customer Search & Filtering`)
  console.log(`• Prescription Management`)
  console.log(`• Transaction Processing`)
  console.log(`• Insurance Verification`)
  console.log(`• Order Tracking`)
  console.log(`• Reporting & Analytics`)
  console.log(`• Customer Communication`)
  console.log(`• Data Export/Import`)

  await prisma.$disconnect()
}

testDataSummary().catch(console.error)