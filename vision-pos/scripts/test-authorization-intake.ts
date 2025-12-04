/**
 * Test the Authorization Intake API
 *
 * Simulates what the insurance-doc-scanner would POST after extracting data
 */

import { prisma } from '../src/lib/prisma'

const VISION_POS_URL = 'http://localhost:3000'

async function testIntakeAPI() {
  console.log('='.repeat(60))
  console.log('Testing Authorization Intake API')
  console.log('='.repeat(60))

  try {
    // Step 1: Create a test customer
    console.log('\n1. Creating test customer...')

    let customer = await prisma.customer.findFirst({
      where: { email: 'intake-test@example.com' }
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName: 'Alberto',
          lastName: 'Burgos',
          email: 'intake-test@example.com',
          phone: '555-0199',
          dateOfBirth: new Date('1978-04-24'),
          gender: 'MALE',
          address: '123 Test St, Melbourne, FL 32935',
          zipCode: '32935',
          createdBy: 'test-script',
          updatedBy: 'test-script',
        }
      })
      console.log(`   Created customer: ${customer.id}`)
    } else {
      console.log(`   Found existing customer: ${customer.id}`)
    }

    // Step 2: Simulate VSP extracted data (from analysis-results.json)
    console.log('\n2. Preparing VSP authorization data...')

    const vspExtractedData = {
      patient: {
        patientName: { value: 'ALBERTO T BURGOS', confidence: 1 },
        memberName: { value: 'ALBERTO T BURGOS', confidence: 1 },
        authNumber: { value: '82317089', confidence: 1 },
        relationship: { value: 'Member', confidence: 1 },
        patientBirthDate: { value: '1978-04-24', confidence: 1 },
        authEffectiveDate: { value: '2025-10-13', confidence: 1 },
        authExpirationDate: { value: '2025-11-12', confidence: 1 },
      },
      eligibility: {
        examProfServices: { value: 'YES', confidence: 1 },
        lens: { value: 'YES', confidence: 1 },
        frame: { value: 'YES', confidence: 1 },
        contacts: { value: 'YES', confidence: 1 },
        frequency: {
          examFrequency: { value: 'Every year beginning in January.', confidence: 1 },
          lensFrequency: { value: 'Every year beginning in January.', confidence: 1 },
          frameFrequency: { value: 'Every other year beginning in January.', confidence: 1 },
          contactsFrequency: { value: 'Every year beginning in January.', confidence: 1 },
        },
      },
      plan: {
        carrier: { value: 'VSP', confidence: 1 },
        benefitPlanName: { value: 'VSP Choice Plan', confidence: 1 },
        clientName: { value: 'THE GUARDIAN LIFE INSURANCE CO. OF AMERICA', confidence: 1 },
        networkLabRequirement: { value: 'Must use plan designated contract laboratory.', confidence: 1 },
        essentialMedicalEyeCareExamCopay: { value: null, confidence: 0 },
      },
      copays: {
        examCopay: { value: 10, confidence: 1 },
        materialsCopay: { value: 25, confidence: 1 },
        routineRetinalScreening: { value: 'Charge the lesser of 39.00 or U&C', confidence: 1 },
      },
      frame: {
        promotions: {
          extraFramePromotion: { value: 20, confidence: 1 },
        },
        allowances: {
          altairMarchonFrameAllowance: {
            allowance: 220,
            overageDiscount: 20,
            confidence: 1,
          },
          nonAltairMarchonFrameAllowance: {
            allowance: 200,
            overageDiscount: 20,
            confidence: 1,
          },
        },
      },
      contacts: {
        clExamDiscount: { value: 'Charge the lesser of 60 copay or 85% U&C', confidence: 1 },
        clExamAndMaterialsAllowance: { value: 200, confidence: 1 },
        clExamOnlyPatientPaysOver: { value: null, confidence: 0 },
        contactsInsteadOfGlasses: { value: true, confidence: 1 },
        nextFrameAvailableDate: { value: null, confidence: 0 },
        necessaryCl: {
          necessaryClCopay: { value: 25, confidence: 1 },
        },
      },
      valueAdded: {
        additionalPairDiscount: { value: 20, confidence: 1 },
        clExam12MonthsDiscount: { value: 15, confidence: 1 },
      },
      overallConfidence: 1,
      notes: '',
    }

    // Lens enhancement copays from the lens document
    const vspLensEnhancements = [
      { code: 'KA', description: 'Progressive K Plastic (Standard)', copaySingleVision: null, copayMultifocal: 55, isAddonCode: false },
      { code: 'FA', description: 'Progressive F Plastic (Premium)', copaySingleVision: null, copayMultifocal: 105, isAddonCode: false },
      { code: 'JA', description: 'Progressive J Plastic (Premium)', copaySingleVision: null, copayMultifocal: 95, isAddonCode: false },
      { code: 'NA', description: 'Progressive N Plastic (Custom)', copaySingleVision: null, copayMultifocal: 175, isAddonCode: false },
      { code: 'OA', description: 'Progressive O Plastic (Custom)', copaySingleVision: null, copayMultifocal: 150, isAddonCode: false },
      { code: 'QM', description: 'Anti-Reflective A', copaySingleVision: 41, copayMultifocal: 41, isAddonCode: true, baseCode: 'VA' },
      { code: 'QT', description: 'Anti-Reflective C', copaySingleVision: 68, copayMultifocal: 68, isAddonCode: true, baseCode: 'VA' },
      { code: 'QV', description: 'Anti-Reflective D', copaySingleVision: 85, copayMultifocal: 85, isAddonCode: true, baseCode: 'VA' },
      { code: 'AD', description: 'Polycarbonate', copaySingleVision: 35, copayMultifocal: 35, isAddonCode: true },
      { code: 'PR', description: 'Photochromatics Plastic', copaySingleVision: 75, copayMultifocal: 75, isAddonCode: true },
    ]

    // Step 3: POST to intake API
    console.log('\n3. POSTing to intake API...')

    const intakePayload = {
      customerId: customer.id,
      carrier: 'vsp',
      extractedData: vspExtractedData,
      vspLensEnhancements,
      sourceFileName: 'AB-vsp-auth-1.pdf',
    }

    const response = await fetch(`${VISION_POS_URL}/api/authorizations/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intakePayload),
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Intake API failed')
    }

    console.log(`   ✓ Authorization created: ${result.authorizationId}`)

    // Step 4: Verify authorization was stored
    console.log('\n4. Verifying stored authorization...')

    const auth = await prisma.vspAuthorization.findUnique({
      where: { id: result.authorizationId },
      include: { lensEnhancementCopays: true },
    })

    if (!auth) {
      throw new Error('Authorization not found in database')
    }

    console.log('   ✓ Authorization found in database:')
    console.log(`     - Auth Number: ${auth.authorizationNumber}`)
    console.log(`     - Plan: ${auth.planName} (${auth.planType})`)
    console.log(`     - Exam Copay: $${auth.examCopay}`)
    console.log(`     - Materials Copay: $${auth.materialsCopay}`)
    console.log(`     - Frame Allowance (Marchon): $${auth.frameAllowanceMarchon}`)
    console.log(`     - Frame Allowance (Other): $${auth.frameAllowanceRetail}`)
    console.log(`     - Contact Allowance: $${auth.contactAllowance}`)
    console.log(`     - Lens Enhancement Copays: ${auth.lensEnhancementCopays.length}`)

    // Step 5: Test the quote API with this authorization
    console.log('\n5. Testing quote calculation with new authorization...')

    const { getActiveAuthorizationForCustomer } = await import('../src/lib/services/authorization-service')
    const authResult = await getActiveAuthorizationForCustomer(customer.id)

    if (authResult) {
      console.log(`   ✓ Authorization service found auth for carrier: ${authResult.carrier}`)

      const { createPricingCalculator } = await import('../src/lib/services/pricing-calculator')
      const calculator = createPricingCalculator(authResult.authorization)

      // Test with a progressive lens
      const testItems = [{ sku: 'TEST-LENS', retailPrice: 450 }]
      const productMap = new Map()
      productMap.set('TEST-LENS', {
        sku: 'TEST-LENS',
        displayName: 'Premium Progressive Lens',
        category: 'lens_progressive' as const,
        retailPrice: 450,
        isActive: true,
        vsp: { baseCode: 'FA', materialModifier: 'D' as const },
      })

      const quote = calculator.buildQuote(testItems, productMap, authResult.authorization)

      console.log('\n   Quote Result:')
      console.log('   ' + '-'.repeat(50))
      console.log(`   Product: Premium Progressive Lens`)
      console.log(`   Retail: $${quote.retailTotal.toFixed(2)}`)
      console.log(`   Patient Pays: $${quote.patientTotal.toFixed(2)}`)
      console.log(`   Insurance Pays: $${quote.insuranceTotal.toFixed(2)}`)
      console.log(`   Savings: $${quote.totalSavings.toFixed(2)}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✓ Authorization Intake Test PASSED')
    console.log('='.repeat(60))

    // Cleanup
    console.log('\nCleaning up...')
    await prisma.vspLensEnhancementCopay.deleteMany({
      where: { authorization: { customerId: customer.id } }
    })
    await prisma.vspAuthorization.deleteMany({ where: { customerId: customer.id } })
    await prisma.customer.deleteMany({ where: { email: 'intake-test@example.com' } })
    console.log('Done!')

  } catch (error) {
    console.error('\n✗ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testIntakeAPI()
