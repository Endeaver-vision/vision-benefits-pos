import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking for orders and creating test alerts...\n')

  // Get active orders
  const orders = await prisma.order.findMany({
    where: {
      status: {
        notIn: ['DELIVERED', 'CANCELLED'],
      },
    },
    include: {
      statusHistory: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
    },
    take: 5,
  })

  console.log(`Found ${orders.length} active orders`)

  if (orders.length === 0) {
    console.log('No active orders to test with. Create an order first!')
    return
  }

  // Create a test alert for the first order
  const testOrder = orders[0]
  
  await prisma.orderAlert.create({
    data: {
      orderId: testOrder.id,
      orderNumber: testOrder.orderNumber,
      stage: testOrder.status,
      alertType: 'STAGE_OVERDUE',
      severity: 'WARNING',
      message: `Test alert: Order ${testOrder.orderNumber} has been in ${testOrder.status} for testing purposes`,
    },
  })

  console.log(`\n✅ Created test alert for order ${testOrder.orderNumber}`)
  console.log(`   Status: ${testOrder.status}`)
  console.log(`   Severity: WARNING`)
  console.log('\nRefresh the order tracking page to see the alert banner!')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
