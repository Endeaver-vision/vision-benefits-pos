const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedFictionalOrders() {
  console.log('📦 Creating fictional orders for our characters...')
  
  // Get customers and their prescriptions
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
    },
    include: {
      prescriptions: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  })

  const frameData = [
    {
      customer: 'Hermione Granger',
      frameType: 'PRESCRIPTION',
      frameBrand: 'Ray-Ban',
      frameModel: 'RB5154 Clubmaster',
      frameColor: 'Tortoise',
      frameSize: '49-21-140',
      lensType: 'Progressive',
      lensMaterial: 'High-Index 1.67',
      lensCoating: 'Anti-Reflective, UV Protection',
      orderDate: new Date('2024-01-16'),
      expectedCompletionDate: new Date('2024-01-23'),
      totalCost: 425.00,
      status: 'COMPLETED',
      notes: 'Rush order for back-to-school. Premium progressive lenses for studying.'
    },
    {
      customer: 'Sherlock Holmes',
      frameType: 'PRESCRIPTION',
      frameBrand: 'Oliver Peoples',
      frameModel: 'Gregory Peck',
      frameColor: 'Black',
      frameSize: '47-23-150',
      lensType: 'Single Vision',
      lensMaterial: 'Standard Plastic',
      lensCoating: 'Anti-Reflective',
      orderDate: new Date('2024-02-11'),
      expectedCompletionDate: new Date('2024-02-18'),
      totalCost: 520.00,
      status: 'COMPLETED',
      notes: 'Classic detective style. Patient very particular about vintage aesthetics.'
    },
    {
      customer: 'Tony Stark',
      frameType: 'PRESCRIPTION',
      frameBrand: 'Tom Ford',
      frameModel: 'TF5146',
      frameColor: 'Gunmetal',
      frameSize: '54-18-145',
      lensType: 'Single Vision',
      lensMaterial: 'High-Index 1.74',
      lensCoating: 'Blue Light Blocking, Anti-Reflective, Scratch Resistant',
      orderDate: new Date('2024-01-21'),
      expectedCompletionDate: new Date('2024-01-28'),
      totalCost: 850.00,
      status: 'COMPLETED',
      notes: 'Premium tech glasses with advanced coatings. Expense is not a concern.'
    },
    {
      customer: 'Diana Prince',
      frameType: 'SAFETY',
      frameBrand: 'Oakley',
      frameModel: 'Ballistic M Frame',
      frameColor: 'Black',
      frameSize: '131-15-125',
      lensType: 'Plano',
      lensMaterial: 'Polycarbonate',
      lensCoating: 'Impact Resistant, UV Protection',
      orderDate: new Date('2024-03-02'),
      expectedCompletionDate: new Date('2024-03-09'),
      totalCost: 280.00,
      status: 'IN_PRODUCTION',
      notes: 'Military-grade safety glasses. Impact resistance is critical.'
    },
    {
      customer: 'Bruce Wayne',
      frameType: 'PRESCRIPTION',
      frameBrand: 'Persol',
      frameModel: 'PO3108V',
      frameColor: 'Black',
      frameSize: '49-22-145',
      lensType: 'Single Vision',
      lensMaterial: 'Trivex',
      lensCoating: 'Night Vision Compatible, Anti-Reflective',
      orderDate: new Date('2024-02-26'),
      expectedCompletionDate: new Date('2024-03-05'),
      totalCost: 650.00,
      status: 'READY_FOR_PICKUP',
      notes: 'Custom tactical lenses. Discreet professional appearance required.'
    },
    {
      customer: 'Katniss Everdeen',
      frameType: 'SPORTS',
      frameBrand: 'Maui Jim',
      frameModel: 'Makoa Reader',
      frameColor: 'Tortoise',
      frameSize: '63-15-130',
      lensType: 'Plano',
      lensMaterial: 'Polycarbonate',
      lensCoating: 'Polarized, UV Protection, Anti-Glare',
      orderDate: new Date('2024-03-11'),
      expectedCompletionDate: new Date('2024-03-18'),
      totalCost: 320.00,
      status: 'ORDERED',
      notes: 'Sports frames for outdoor activities. Maximum UV protection needed.'
    },
    {
      customer: 'Tyrion Lannister',
      frameType: 'READING',
      frameBrand: 'Cartier',
      frameModel: 'CT0005O',
      frameColor: 'Gold',
      frameSize: '55-17-140',
      lensType: 'Reading',
      lensMaterial: 'High-Index 1.67',
      lensCoating: 'Anti-Reflective, Blue Light Blocking',
      orderDate: new Date('2024-01-31'),
      expectedCompletionDate: new Date('2024-02-07'),
      totalCost: 1250.00,
      status: 'COMPLETED',
      notes: 'Luxury reading glasses. Gold frame matches personal style preference.'
    },
    {
      customer: 'Lara Croft',
      frameType: 'SPORTS',
      frameBrand: 'Wiley X',
      frameModel: 'Vapor',
      frameColor: 'Matte Black',
      frameSize: '71-15-125',
      lensType: 'Single Vision',
      lensMaterial: 'Polycarbonate',
      lensCoating: 'Impact Resistant, Anti-Fog, UV Protection',
      orderDate: new Date('2024-02-16'),
      expectedCompletionDate: new Date('2024-02-23'),
      totalCost: 390.00,
      status: 'COMPLETED',
      notes: 'Adventure-proof eyewear. Must withstand extreme conditions.'
    }
  ]

  for (const orderData of frameData) {
    try {
      // Find the customer
      const customer = customers.find(c => 
        `${c.firstName} ${c.lastName}` === orderData.customer
      )
      
      if (!customer) {
        console.log(`⚠️ Customer ${orderData.customer} not found, skipping order`)
        continue
      }

      // Get prescription ID if it exists
      const prescriptionId = customer.prescriptions.length > 0 ? customer.prescriptions[0].id : null

      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          prescriptionId: prescriptionId,
          frameType: orderData.frameType,
          frameBrand: orderData.frameBrand,
          frameModel: orderData.frameModel,
          frameColor: orderData.frameColor,
          frameSize: orderData.frameSize,
          lensType: orderData.lensType,
          lensMaterial: orderData.lensMaterial,
          lensCoating: orderData.lensCoating,
          orderDate: orderData.orderDate,
          expectedCompletionDate: orderData.expectedCompletionDate,
          totalCost: orderData.totalCost,
          status: orderData.status,
          notes: orderData.notes
        }
      })

      console.log(`✅ Created order for: ${orderData.customer} - ${orderData.frameBrand} ${orderData.frameModel} (${order.id})`)
    } catch (error) {
      console.log(`⚠️ Skipped order for: ${orderData.customer} (may already exist or validation error)`)
    }
  }

  console.log('📦 Fictional order seeding completed!')
  await prisma.$disconnect()
}

seedFictionalOrders().catch(console.error)