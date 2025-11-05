const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedFictionalTransactions() {
  console.log('💰 Creating fictional transactions for our characters...')
  
  // Get customers and users/locations first
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
        { firstName: 'Lara', lastName: 'Croft' }
      ]
    }
  })

  // Check if we have users and locations
  const users = await prisma.user.findMany({ take: 1 })
  const locations = await prisma.location.findMany({ take: 1 })
  
  if (users.length === 0 || locations.length === 0) {
    console.log('⚠️ No users or locations found. Creating basic ones first...')
    
    // Create a basic location if none exists
    let location
    if (locations.length === 0) {
      location = await prisma.location.create({
        data: {
          name: 'Main Store',
          address: '123 Vision Street, Eye City, EC 12345',
          phone: '(555) 123-4567'
        }
      })
      console.log('✅ Created basic location')
    } else {
      location = locations[0]
    }
    
    // Create a basic user if none exists
    let user
    if (users.length === 0) {
      user = await prisma.user.create({
        data: {
          email: 'admin@visionpos.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          locationId: location.id
        }
      })
      console.log('✅ Created basic user')
    } else {
      user = users[0]
    }
  }

  // Get the user and location to use
  const user = await prisma.user.findFirst()
  const location = await prisma.location.findFirst()

  const transactionData = [
    {
      customer: 'Hermione Granger',
      subtotal: 380.00,
      tax: 45.00,
      total: 425.00,
      insuranceCarrier: 'Magical Health Services',
      insuranceDiscount: 150.00,
      patientPortion: 275.00,
      status: 'COMPLETED',
      paymentMethod: 'Credit Card'
    },
    {
      customer: 'Sherlock Holmes',
      subtotal: 465.00,
      tax: 55.00,
      total: 520.00,
      insuranceCarrier: 'Victorian Vision Care',
      insuranceDiscount: 100.00,
      patientPortion: 420.00,
      status: 'COMPLETED',
      paymentMethod: 'Cash'
    },
    {
      customer: 'Tony Stark',
      subtotal: 765.00,
      tax: 85.00,
      total: 850.00,
      insuranceCarrier: 'Stark Industries Health',
      insuranceDiscount: 200.00,
      patientPortion: 650.00,
      status: 'COMPLETED',
      paymentMethod: 'Corporate Card'
    },
    {
      customer: 'Diana Prince',
      subtotal: 250.00,
      tax: 30.00,
      total: 280.00,
      insuranceCarrier: 'Amazonian Health Alliance',
      insuranceDiscount: 80.00,
      patientPortion: 200.00,
      status: 'PENDING',
      paymentMethod: 'Credit Card'
    },
    {
      customer: 'Bruce Wayne',
      subtotal: 580.00,
      tax: 70.00,
      total: 650.00,
      insuranceCarrier: 'Wayne Foundation Health',
      insuranceDiscount: 180.00,
      patientPortion: 470.00,
      status: 'COMPLETED',
      paymentMethod: 'Debit Card'
    },
    {
      customer: 'Katniss Everdeen',
      subtotal: 285.00,
      tax: 35.00,
      total: 320.00,
      insuranceCarrier: 'Capitol Health Services',
      insuranceDiscount: 90.00,
      patientPortion: 230.00,
      status: 'PENDING',
      paymentMethod: 'Cash'
    },
    {
      customer: 'Tyrion Lannister',
      subtotal: 1120.00,
      tax: 130.00,
      total: 1250.00,
      insuranceCarrier: 'Iron Throne Health',
      insuranceDiscount: 300.00,
      patientPortion: 950.00,
      status: 'COMPLETED',
      paymentMethod: 'Gold Card'
    },
    {
      customer: 'Lara Croft',
      subtotal: 350.00,
      tax: 40.00,
      total: 390.00,
      insuranceCarrier: 'Adventure Sports Health',
      insuranceDiscount: 110.00,
      patientPortion: 280.00,
      status: 'COMPLETED',
      paymentMethod: 'Credit Card'
    }
  ]

  for (const txnData of transactionData) {
    try {
      // Find the customer
      const customer = customers.find(c => 
        `${c.firstName} ${c.lastName}` === txnData.customer
      )
      
      if (!customer) {
        console.log(`⚠️ Customer ${txnData.customer} not found, skipping transaction`)
        continue
      }

      const transaction = await prisma.transaction.create({
        data: {
          customerId: customer.id,
          userId: user.id,
          locationId: location.id,
          subtotal: txnData.subtotal,
          tax: txnData.tax,
          discount: 0,
          total: txnData.total,
          insuranceCarrier: txnData.insuranceCarrier,
          insuranceDiscount: txnData.insuranceDiscount,
          patientPortion: txnData.patientPortion,
          status: txnData.status,
          paymentMethod: txnData.paymentMethod
        }
      })

      console.log(`✅ Created transaction for: ${txnData.customer} - $${txnData.total} (${transaction.id})`)
    } catch (error) {
      console.log(`⚠️ Skipped transaction for: ${txnData.customer} - ${error.message}`)
    }
  }

  console.log('💰 Fictional transaction seeding completed!')
  await prisma.$disconnect()
}

seedFictionalTransactions().catch(console.error)