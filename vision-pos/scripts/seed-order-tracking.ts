import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding order tracking data...')

  // Get some existing customers
  const customers = await prisma.customer.findMany({
    take: 5,
  })

  if (customers.length === 0) {
    console.log('❌ No customers found. Please seed customers first.')
    return
  }

  console.log(`Found ${customers.length} customers`)

  // Create sample orders
  const orders = [
    {
      customerId: customers[0].id,
      orderNumber: `ORD-202512-${String(1).padStart(4, '0')}`,
      status: 'IN_PRODUCTION',
      orderDate: new Date('2025-12-01'),
      estimatedCompletionDate: new Date('2025-12-10'),
      labName: 'Vision Lab Inc',
      labOrderNumber: 'VL-2025-0001',
      subtotal: 432.00,
      taxAmount: 38.88,
      totalAmount: 470.88,
      createdBy: 'system',
      items: {
        create: [
          {
            type: 'FRAME',
            productName: 'Ray-Ban Aviator Classic',
            description: 'Gold finish with standard temples',
            sku: 'RB-AV-GOLD',
            quantity: 1,
            unitPrice: 180.00,
            finalPrice: 180.00,
            status: 'IN_PRODUCTION',
          },
          {
            type: 'LENS',
            productName: 'Progressive Lenses',
            description: 'High Index 1.67 progressive lenses',
            sku: 'LENS-PROG-167',
            lensType: 'Progressive',
            lensCoatings: ['Anti-Reflective', 'Scratch Resistant', 'UV Protection'],
            quantity: 1,
            unitPrice: 252.00,
            finalPrice: 252.00,
            status: 'IN_PRODUCTION',
            customizations: {
              rightSphere: -2.50,
              rightCylinder: -0.75,
              rightAxis: 180,
              rightAdd: 2.00,
              leftSphere: -2.75,
              leftCylinder: -0.50,
              leftAxis: 175,
              leftAdd: 2.00,
              lensMaterial: 'High Index 1.67',
            },
          },
        ],
      },
    },
    {
      customerId: customers[1]?.id || customers[0].id,
      orderNumber: `ORD-202512-${String(2).padStart(4, '0')}`,
      status: 'READY_FOR_PICKUP',
      orderDate: new Date('2025-11-28'),
      estimatedCompletionDate: new Date('2025-12-05'),
      actualCompletionDate: new Date('2025-12-04'),
      labName: 'OptiCraft Labs',
      labOrderNumber: 'OC-2025-0234',
      deliveryMethod: 'PICKUP',
      subtotal: 345.60,
      taxAmount: 31.10,
      totalAmount: 376.70,
      createdBy: 'system',
      items: {
        create: [
          {
            type: 'FRAME',
            productName: 'Oakley Holbrook',
            description: 'Matte Black finish',
            sku: 'OK-HB-MBLK',
            quantity: 1,
            unitPrice: 185.00,
            finalPrice: 185.00,
            status: 'COMPLETED',
          },
          {
            type: 'LENS',
            productName: 'Polarized Sun Lenses',
            description: 'CR-39 material with polarization',
            sku: 'LENS-POL-CR39',
            lensType: 'Single Vision',
            lensCoatings: ['Polarized', 'UV Protection'],
            quantity: 1,
            unitPrice: 160.60,
            finalPrice: 160.60,
            status: 'COMPLETED',
            customizations: {
              rightSphere: -1.50,
              leftSphere: -1.50,
              lensMaterial: 'CR-39',
              tint: 'Gray Gradient',
            },
          },
        ],
      },
    },
    {
      customerId: customers[2]?.id || customers[0].id,
      orderNumber: `ORD-202512-${String(3).padStart(4, '0')}`,
      status: 'SHIPPED',
      orderDate: new Date('2025-11-25'),
      estimatedCompletionDate: new Date('2025-12-03'),
      actualCompletionDate: new Date('2025-12-02'),
      labName: 'Vision Lab Inc',
      labOrderNumber: 'VL-2025-0002',
      deliveryMethod: 'SHIPPING',
      labTrackingNumber: 'USPS-9405-5123-4567-8901',
      labEstimatedDelivery: new Date('2025-12-07'),
      subtotal: 289.99,
      taxAmount: 26.10,
      totalAmount: 316.09,
      createdBy: 'system',
      items: {
        create: [
          {
            type: 'FRAME',
            productName: 'Designer Acetate Frame',
            description: 'Tortoise pattern acetate',
            sku: 'DSG-ACT-TORT',
            quantity: 1,
            unitPrice: 159.99,
            finalPrice: 159.99,
            status: 'COMPLETED',
          },
          {
            type: 'LENS',
            productName: 'Blue Light Computer Lenses',
            description: 'Polycarbonate with blue light filter',
            sku: 'LENS-BL-COMP',
            lensType: 'Single Vision',
            lensCoatings: ['Blue Light Filter', 'Anti-Reflective', 'Scratch Resistant'],
            quantity: 1,
            unitPrice: 130.00,
            finalPrice: 130.00,
            status: 'COMPLETED',
            customizations: {
              rightSphere: -0.75,
              leftSphere: -1.00,
              lensMaterial: 'Polycarbonate',
            },
          },
        ],
      },
    },
    {
      customerId: customers[3]?.id || customers[0].id,
      orderNumber: `ORD-202512-${String(4).padStart(4, '0')}`,
      status: 'SUBMITTED',
      orderDate: new Date('2025-12-05'),
      estimatedCompletionDate: new Date('2025-12-15'),
      labName: 'OptiCraft Labs',
      labOrderNumber: 'OC-2025-0235',
      subtotal: 525.00,
      taxAmount: 47.25,
      totalAmount: 572.25,
      createdBy: 'system',
      items: {
        create: [
          {
            type: 'FRAME',
            productName: 'Titanium Rimless Frame',
            description: 'Gunmetal titanium rimless',
            sku: 'TI-RIM-GNMT',
            quantity: 1,
            unitPrice: 245.00,
            finalPrice: 245.00,
            status: 'PENDING',
          },
          {
            type: 'LENS',
            productName: 'Photochromic Progressive Lenses',
            description: 'Trivex material with photochromic coating',
            sku: 'LENS-PHOTO-PROG-TVX',
            lensType: 'Progressive',
            lensCoatings: ['Photochromic', 'Anti-Reflective', 'Scratch Resistant', 'UV Protection'],
            quantity: 1,
            unitPrice: 280.00,
            finalPrice: 280.00,
            status: 'PENDING',
            customizations: {
              rightSphere: -3.25,
              rightCylinder: -1.00,
              rightAxis: 90,
              rightAdd: 2.25,
              leftSphere: -3.50,
              leftCylinder: -0.75,
              leftAxis: 85,
              leftAdd: 2.25,
              lensMaterial: 'Trivex',
            },
          },
        ],
      },
    },
    {
      customerId: customers[4]?.id || customers[0].id,
      orderNumber: `ORD-202512-${String(5).padStart(4, '0')}`,
      status: 'QUALITY_CHECK',
      orderDate: new Date('2025-11-30'),
      estimatedCompletionDate: new Date('2025-12-08'),
      labName: 'Vision Lab Inc',
      labOrderNumber: 'VL-2025-0003',
      subtotal: 398.00,
      taxAmount: 35.82,
      totalAmount: 483.82,
      createdBy: 'system',
      items: {
        create: [
          {
            type: 'FRAME',
            productName: 'Sports Performance Frame',
            description: 'Red impact-resistant sports frame',
            sku: 'SPT-PERF-RED',
            quantity: 1,
            unitPrice: 198.00,
            finalPrice: 198.00,
            status: 'COMPLETED',
          },
          {
            type: 'LENS',
            productName: 'Impact Resistant Lenses',
            description: 'Polycarbonate with impact resistance',
            sku: 'LENS-IMPACT-PC',
            lensType: 'Single Vision',
            lensCoatings: ['Impact Resistant', 'Anti-Reflective', 'UV Protection'],
            quantity: 1,
            unitPrice: 200.00,
            finalPrice: 200.00,
            status: 'QUALITY_CHECK',
            customizations: {
              rightSphere: -1.75,
              rightCylinder: -0.25,
              rightAxis: 15,
              leftSphere: -2.00,
              leftCylinder: -0.50,
              leftAxis: 170,
              lensMaterial: 'Polycarbonate',
              tint: 'Light Amber',
            },
          },
        ],
      },
    },
  ]

  for (const orderData of orders) {
    // Check if order already exists
    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber: orderData.orderNumber },
    })

    if (existingOrder) {
      console.log(`⏭️  Skipping existing order ${orderData.orderNumber}`)
      continue
    }

    const order = await prisma.order.create({
      data: orderData,
      include: {
        items: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    console.log(
      `✅ Created order ${order.orderNumber} for ${order.customer.firstName} ${order.customer.lastName} - Status: ${order.status}`
    )

    // Add status history entry
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: order.status,
        notes: `Order created and ${order.status === 'SUBMITTED' ? 'submitted to lab' : 'entered into system'}`,
        updatedBy: 'system',
      },
    })

    // Add a communication entry for shipped orders
    if (order.status === 'SHIPPED' && order.labTrackingNumber) {
      await prisma.orderCommunication.create({
        data: {
          orderId: order.id,
          type: 'EMAIL',
          direction: 'OUTBOUND',
          subject: 'Your order has shipped!',
          message: `Your order ${order.orderNumber} has been shipped. Tracking number: ${order.labTrackingNumber}`,
          sentBy: 'system',
        },
      })
    }

    // Add a communication for ready orders
    if (order.status === 'READY_FOR_PICKUP') {
      await prisma.orderCommunication.create({
        data: {
          orderId: order.id,
          type: 'SMS',
          direction: 'OUTBOUND',
          subject: 'Order Ready for Pickup',
          message: `Hi! Your glasses (Order ${order.orderNumber}) are ready for pickup at our office. Please bring your ID.`,
          sentBy: 'system',
        },
      })
    }

    // Add QC check for orders in QC status
    if (order.status === 'QUALITY_CHECK') {
      await prisma.orderQualityCheck.create({
        data: {
          orderId: order.id,
          performedBy: 'system',
          passed: false,
          issues: [],
          notes: 'Checking lens prescription accuracy and frame alignment',
        },
      })
    }
  }

  console.log('✨ Order tracking seed data created successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding order tracking data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
