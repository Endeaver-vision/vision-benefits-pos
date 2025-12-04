/**
 * Test script for the Quote API flow
 *
 * Tests the full flow:
 * 1. Create a test customer
 * 2. Create a test authorization for that customer
 * 3. Call the quote API to get pricing
 */

import { prisma } from '../src/lib/prisma'

async function testQuoteFlow() {
  console.log('='.repeat(60))
  console.log('Testing Quote API Flow')
  console.log('='.repeat(60))

  try {
    // Step 1: Create or find a test customer
    console.log('\n1. Setting up test customer...')

    let customer = await prisma.customer.findFirst({
      where: { email: 'test-quote@example.com' }
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName: 'Test',
          lastName: 'QuoteCustomer',
          email: 'test-quote@example.com',
          phone: '555-0123',
          dateOfBirth: new Date('1985-06-15'),
          gender: 'MALE',
          address: '123 Test St, Test City, CA 90210',
          zipCode: '90210',
          createdBy: 'test-script',
          updatedBy: 'test-script',
        }
      })
      console.log(`   Created customer: ${customer.id}`)
    } else {
      console.log(`   Found existing customer: ${customer.id}`)
    }

    // Step 2: Create a VSP authorization for this customer
    console.log('\n2. Setting up VSP authorization...')

    // First, clear any existing auth for this customer
    await prisma.vspLensEnhancementCopay.deleteMany({
      where: {
        authorization: { customerId: customer.id }
      }
    })
    await prisma.vspAuthorization.deleteMany({
      where: { customerId: customer.id }
    })

    const vspAuth = await prisma.vspAuthorization.create({
      data: {
        customerId: customer.id,
        authorizationNumber: 'TEST-AUTH-001',
        planName: 'VSP Choice',
        planType: 'CHOICE',
        examCopay: 10,
        materialsCopay: 25,
        frameAllowanceRetail: 150,
        frameAllowanceMarchon: 180,
        frameOverageDiscount: 20,
        contactAllowance: 150,
        contactFittingCovered: true,
        authDate: new Date(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        serviceYear: new Date().getFullYear(),
        isActive: true,
        lensEnhancementCopays: {
          create: [
            { code: 'NA', description: 'Standard Progressive', copaySingleVision: 0, copayMultifocal: 55, isAddonCode: false },
            { code: 'FA', description: 'Premium Progressive Tier 1', copaySingleVision: 0, copayMultifocal: 80, isAddonCode: false },
            { code: 'JA', description: 'Premium Progressive Tier 2', copaySingleVision: 0, copayMultifocal: 120, isAddonCode: false },
            { code: 'QV', description: 'Standard AR Coating', copaySingleVision: 41, copayMultifocal: 41, isAddonCode: true, baseCode: 'VA' },
            { code: 'XV', description: 'Premium AR Coating', copaySingleVision: 57, copayMultifocal: 57, isAddonCode: true, baseCode: 'VA' },
          ]
        }
      },
      include: {
        lensEnhancementCopays: true
      }
    })

    console.log(`   Created VSP authorization: ${vspAuth.id}`)
    console.log(`   - Plan: ${vspAuth.planName}`)
    console.log(`   - Exam Copay: $${vspAuth.examCopay}`)
    console.log(`   - Materials Copay: $${vspAuth.materialsCopay}`)
    console.log(`   - Frame Allowance: $${vspAuth.frameAllowanceRetail}`)
    console.log(`   - Lens Enhancement Copays: ${vspAuth.lensEnhancementCopays.length}`)

    // Step 3: Create a test product
    console.log('\n3. Setting up test product...')

    let product = await prisma.product.findFirst({
      where: { sku: 'TEST-PROG-001' }
    })

    if (!product) {
      // Get progressive lenses category
      const progressiveCategory = await prisma.productCategory.findFirst({
        where: { code: 'PROGRESSIVE_LENSES' }
      })

      product = await prisma.product.create({
        data: {
          sku: 'TEST-PROG-001',
          name: 'Varilux Comfort Max',
          categoryId: progressiveCategory?.id ?? 'cmiale76600050bwwp57m0mja',
          basePrice: 350,
          active: true,
          tierVsp: 'FA', // Premium Progressive Tier 1
        }
      })
      console.log(`   Created product: ${product.sku}`)
    } else {
      console.log(`   Found existing product: ${product.sku}`)
    }

    // Step 4: Test the authorization service directly
    console.log('\n4. Testing authorization service...')

    const { getActiveAuthorizationForCustomer } = await import('../src/lib/services/authorization-service')
    const authResult = await getActiveAuthorizationForCustomer(customer.id)

    if (authResult) {
      console.log(`   ✓ Found authorization for carrier: ${authResult.carrier}`)
      console.log(`   - Plan Name: ${authResult.authorization.plan.planName}`)
      console.log(`   - Exam Copay: $${authResult.authorization.copays.exam}`)
      console.log(`   - Materials Copay: $${authResult.authorization.copays.materials}`)
    } else {
      console.log('   ✗ No authorization found!')
      return
    }

    // Step 5: Test the pricing calculator
    console.log('\n5. Testing pricing calculator...')

    const { createPricingCalculator } = await import('../src/lib/services/pricing-calculator')
    const calculator = createPricingCalculator(authResult.authorization)

    const testItems = [
      { sku: 'TEST-PROG-001', retailPrice: 350 }
    ]

    const productMap = new Map()
    productMap.set('TEST-PROG-001', {
      sku: 'TEST-PROG-001',
      displayName: 'Varilux Comfort Max',
      category: 'lens_progressive' as const,
      retailPrice: 350,
      isActive: true,
      vsp: {
        baseCode: 'FA',
        materialModifier: 'D' as const,
      }
    })

    const quote = calculator.buildQuote(testItems, productMap, authResult.authorization)

    console.log('\n   Quote Results:')
    console.log('   ' + '-'.repeat(50))
    for (const item of quote.items) {
      console.log(`   ${item.displayName}`)
      console.log(`     Retail: $${item.retailPrice.toFixed(2)}`)
      console.log(`     Patient Copay: $${item.patientCopay.toFixed(2)}`)
      console.log(`     Insurance Pays: $${item.insurancePays.toFixed(2)}`)
      console.log(`     Savings: $${item.savings.toFixed(2)}`)
      if (item.tierUsed) console.log(`     Tier: ${item.tierUsed}`)
    }
    console.log('   ' + '-'.repeat(50))
    console.log(`   Total Retail: $${quote.retailTotal.toFixed(2)}`)
    console.log(`   Patient Total: $${quote.patientTotal.toFixed(2)}`)
    console.log(`   Insurance Total: $${quote.insuranceTotal.toFixed(2)}`)
    console.log(`   Total Savings: $${quote.totalSavings.toFixed(2)}`)

    console.log('\n' + '='.repeat(60))
    console.log('✓ Quote API Flow Test PASSED')
    console.log('='.repeat(60))

    // Cleanup
    console.log('\nCleaning up test data...')
    await prisma.product.deleteMany({ where: { sku: 'TEST-PROG-001' } })
    await prisma.vspLensEnhancementCopay.deleteMany({
      where: { authorization: { customerId: customer.id } }
    })
    await prisma.vspAuthorization.deleteMany({ where: { customerId: customer.id } })
    await prisma.customer.deleteMany({ where: { email: 'test-quote@example.com' } })
    console.log('Done!')

  } catch (error) {
    console.error('\n✗ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testQuoteFlow()
