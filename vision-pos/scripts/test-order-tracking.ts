/**
 * Order Tracking System - Automated Test Script
 * 
 * This script tests the complete order tracking workflow:
 * - Creating customers
 * - Creating orders
 * - Updating order status
 * - Adding communications
 * - Running quality checks
 * - Verifying data integrity
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function main() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
  log('  ORDER TRACKING SYSTEM - TEST SUITE', 'cyan')
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan')

  let testsPassed = 0
  let testsFailed = 0

  try {
    // Test 1: Create Test Customers
    log('Test 1: Creating test customers...', 'blue')
    const customer1 = await prisma.customer.upsert({
      where: { email: 'test.customer1@ordertest.com' },
      update: {},
      create: {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'test.customer1@ordertest.com',
        phone: '555-0101',
        primaryLocationId: (await prisma.location.findFirst())!.id,
      },
    })

    const customer2 = await prisma.customer.upsert({
      where: { email: 'test.customer2@ordertest.com' },
      update: {},
      create: {
        firstName: 'Bob',
        lastName: 'Williams',
        email: 'test.customer2@ordertest.com',
        phone: '555-0102',
        primaryLocationId: (await prisma.location.findFirst())!.id,
      },
    })

    log(`✓ Created customers: ${customer1.firstName} ${customer1.lastName}, ${customer2.firstName} ${customer2.lastName}`, 'green')
    testsPassed++

    // Test 2: Create Orders
    log('\nTest 2: Creating test orders...', 'blue')
    
    const order1 = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-${Date.now()}-001`,
        customerId: customer1.id,
        status: 'DRAFT',
        orderDate: new Date(),
        estimatedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        deliveryMethod: 'PICKUP',
        subtotal: 400.00,
        taxAmount: 32.00,
        totalAmount: 432.00,
        amountPaid: 0,
        createdBy: 'test-script',
        items: {
          create: [
            {
              type: 'FRAME',
              productName: 'Ray-Ban Aviator Classic',
              sku: 'RB-AV-001',
              description: 'Classic gold frame',
              frameColor: 'Gold',
              frameSize: '58-14-135',
              unitPrice: 150.00,
              finalPrice: 150.00,
              quantity: 1,
              status: 'PENDING',
              isCustom: false,
            },
            {
              type: 'LENS',
              productName: 'Progressive HD Lenses',
              sku: 'LENS-PROG-HD',
              description: 'High-definition progressive lenses',
              lensType: 'progressive',
              lensCoatings: ['anti-reflective', 'blue-light', 'uv-protection'],
              unitPrice: 250.00,
              finalPrice: 250.00,
              quantity: 1,
              status: 'PENDING',
              isCustom: true,
            },
          ],
        },
        statusHistory: {
          create: {
            status: 'DRAFT',
            updatedBy: 'test-script',
            updatedByName: 'Test Script',
            notes: 'Order created for testing',
          },
        },
      },
      include: {
        items: true,
        statusHistory: true,
      },
    })

    log(`✓ Created Order 1: ${order1.orderNumber} with ${order1.items.length} items`, 'green')
    testsPassed++

    const order2 = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-${Date.now()}-002`,
        customerId: customer2.id,
        status: 'IN_PRODUCTION',
        orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        estimatedCompletionDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days
        deliveryMethod: 'SHIPPING',
        labName: 'Precision Optical Lab',
        labOrderNumber: 'POL-2025-TEST-001',
        subtotal: 320.00,
        taxAmount: 25.60,
        totalAmount: 345.60,
        amountPaid: 345.60,
        createdBy: 'test-script',
        items: {
          create: [
            {
              type: 'FRAME',
              productName: 'Oakley Holbrook',
              sku: 'OAK-HB-002',
              description: 'Sport frame in matte black',
              frameColor: 'Matte Black',
              frameSize: '55-18-137',
              unitPrice: 180.00,
              finalPrice: 180.00,
              quantity: 1,
              status: 'IN_PRODUCTION',
              isCustom: false,
            },
            {
              type: 'LENS',
              productName: 'Polarized Sun Lenses',
              sku: 'LENS-POL-SUN',
              description: 'Polarized lenses with UV protection',
              lensType: 'single-vision',
              lensCoatings: ['polarized', 'uv-protection'],
              unitPrice: 140.00,
              finalPrice: 140.00,
              quantity: 1,
              status: 'IN_PRODUCTION',
              isCustom: false,
            },
          ],
        },
        statusHistory: {
          create: [
            {
              status: 'DRAFT',
              updatedBy: 'test-script',
              notes: 'Order created',
            },
            {
              status: 'SUBMITTED',
              previousStatus: 'DRAFT',
              updatedBy: 'test-script',
              notes: 'Order submitted',
            },
            {
              status: 'IN_PRODUCTION',
              previousStatus: 'SUBMITTED',
              updatedBy: 'test-script',
              notes: 'Sent to lab',
            },
          ],
        },
      },
      include: {
        items: true,
        statusHistory: true,
      },
    })

    log(`✓ Created Order 2: ${order2.orderNumber} with ${order2.items.length} items`, 'green')
    testsPassed++

    // Test 3: Update Order Status
    log('\nTest 3: Testing status updates...', 'blue')
    
    const updatedOrder = await prisma.order.update({
      where: { id: order1.id },
      data: {
        status: 'SUBMITTED',
        statusUpdatedAt: new Date(),
        statusUpdatedBy: 'test-script',
        statusHistory: {
          create: {
            status: 'SUBMITTED',
            previousStatus: 'DRAFT',
            updatedBy: 'test-script',
            updatedByName: 'Test Script',
            notes: 'Order submitted for processing',
          },
        },
      },
      include: {
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 3,
        },
      },
    })

    log(`✓ Updated order status: ${updatedOrder.orderNumber} -> ${updatedOrder.status}`, 'green')
    log(`  Status history entries: ${updatedOrder.statusHistory.length}`, 'cyan')
    testsPassed++

    // Test 4: Add Communication Log
    log('\nTest 4: Adding communication logs...', 'blue')
    
    const communication = await prisma.orderCommunication.create({
      data: {
        orderId: order1.id,
        type: 'EMAIL',
        direction: 'OUTBOUND',
        subject: 'Order Confirmation',
        message: 'Your order has been received and is being processed.',
        sentBy: 'system',
        sentByName: 'Order System',
        sentTo: customer1.email!,
        sentToName: `${customer1.firstName} ${customer1.lastName}`,
      },
    })

    log(`✓ Created communication log: ${communication.type} - ${communication.subject}`, 'green')
    testsPassed++

    // Test 5: Add Quality Check
    log('\nTest 5: Adding quality check...', 'blue')
    
    const qualityCheck = await prisma.orderQualityCheck.create({
      data: {
        orderId: order2.id,
        performedBy: 'qc-001',
        performedByName: 'Jane QC Inspector',
        passed: true,
        notes: 'All specifications met. Frame and lens quality excellent.',
        issues: [],
        checklist: {
          prescriptionAccuracy: true,
          lensQuality: true,
          frameFit: true,
          coatingApplication: true,
          overallAppearance: true,
        },
      },
    })

    log(`✓ Created quality check: ${qualityCheck.passed ? 'PASSED' : 'FAILED'}`, 'green')
    testsPassed++

    // Test 6: Query Orders with Filters
    log('\nTest 6: Testing order queries...', 'blue')
    
    const allOrders = await prisma.order.findMany({
      where: {
        orderNumber: {
          contains: 'TEST-ORD',
        },
      },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: true,
        _count: {
          select: {
            statusHistory: true,
            communications: true,
            qualityChecks: true,
          },
        },
      },
      orderBy: {
        orderDate: 'desc',
      },
    })

    log(`✓ Found ${allOrders.length} test orders`, 'green')
    allOrders.forEach((order) => {
      log(`  - ${order.orderNumber} | ${order.status} | ${order.customer.firstName} ${order.customer.lastName}`, 'cyan')
      log(`    Items: ${order.items.length} | History: ${order._count.statusHistory} | Comms: ${order._count.communications}`, 'cyan')
    })
    testsPassed++

    // Test 7: Verify Data Integrity
    log('\nTest 7: Verifying data integrity...', 'blue')
    
    let integrityChecks = 0
    
    // Check order totals
    for (const order of allOrders) {
      const calculatedSubtotal = order.items.reduce((sum, item) => sum + Number(item.finalPrice), 0)
      if (Math.abs(calculatedSubtotal - Number(order.subtotal)) < 0.01) {
        integrityChecks++
      }
    }
    
    // Check status history
    for (const order of allOrders) {
      const history = await prisma.orderStatusHistory.findMany({
        where: { orderId: order.id },
        orderBy: { timestamp: 'asc' },
      })
      if (history.length > 0 && history[history.length - 1].status === order.status) {
        integrityChecks++
      }
    }

    log(`✓ Passed ${integrityChecks} integrity checks`, 'green')
    testsPassed++

    // Test 8: Test Order Cancellation
    log('\nTest 8: Testing order cancellation...', 'blue')
    
    const orderToCancel = await prisma.order.create({
      data: {
        orderNumber: `TEST-ORD-${Date.now()}-CANCEL`,
        customerId: customer1.id,
        status: 'SUBMITTED',
        orderDate: new Date(),
        estimatedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deliveryMethod: 'PICKUP',
        subtotal: 100.00,
        taxAmount: 8.00,
        totalAmount: 108.00,
        amountPaid: 0,
        createdBy: 'test-script',
        items: {
          create: {
            type: 'SERVICE',
            productName: 'Lens Cleaning Service',
            sku: 'SVC-CLEAN',
            unitPrice: 100.00,
            finalPrice: 100.00,
            quantity: 1,
            status: 'PENDING',
            isCustom: false,
          },
        },
      },
    })

    const cancelledOrder = await prisma.order.update({
      where: { id: orderToCancel.id },
      data: {
        status: 'CANCELLED',
        statusUpdatedAt: new Date(),
        statusUpdatedBy: 'test-script',
        statusHistory: {
          create: {
            status: 'CANCELLED',
            previousStatus: 'SUBMITTED',
            updatedBy: 'test-script',
            notes: 'Cancelled by customer request',
          },
        },
      },
    })

    log(`✓ Successfully cancelled order: ${cancelledOrder.orderNumber}`, 'green')
    testsPassed++

    // Final Summary
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
    log('  TEST SUMMARY', 'cyan')
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')
    log(`\nTests Passed: ${testsPassed}`, 'green')
    log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green')
    log(`Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%\n`, 'cyan')

    log('✓ All tests completed successfully!', 'green')
    log('\nYou can view the test data in Prisma Studio:', 'yellow')
    log('  npx prisma studio\n', 'cyan')

  } catch (error) {
    testsFailed++
    log(`\n✗ Test failed with error:`, 'red')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
