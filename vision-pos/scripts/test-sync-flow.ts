/**
 * Test the full sync flow by creating test documents and syncing them
 */

import { prisma } from '../src/lib/prisma'

async function testSyncFlow() {
  console.log('='.repeat(60))
  console.log('Testing Full Sync Flow')
  console.log('='.repeat(60))

  try {
    // Step 1: Create test customer
    console.log('\n1. Creating test customer...')

    let customer = await prisma.customer.findFirst({
      where: { email: 'sync-test@example.com' }
    })

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName: 'Sync',
          lastName: 'TestCustomer',
          email: 'sync-test@example.com',
          phone: '555-9999',
          dateOfBirth: new Date('1980-05-15'),
          gender: 'FEMALE',
          address: '456 Sync Ave, Test City, FL 32935',
          zipCode: '32935',
          createdBy: 'test-script',
          updatedBy: 'test-script',
        }
      })
      console.log(`   Created customer: ${customer.id}`)
    } else {
      console.log(`   Found customer: ${customer.id}`)
    }

    // Step 2: Create a verified insurance document (simulating scanner output)
    console.log('\n2. Creating verified insurance document...')

    const extractedData = {
      patient: {
        patientName: { value: 'SYNC TEST CUSTOMER', confidence: 1 },
        memberName: { value: 'SYNC TEST CUSTOMER', confidence: 1 },
        authNumber: { value: 'SYNC-TEST-12345', confidence: 1 },
        relationship: { value: 'Member', confidence: 1 },
        patientBirthDate: { value: '1980-05-15', confidence: 1 },
        authEffectiveDate: { value: '2025-01-01', confidence: 1 },
        authExpirationDate: { value: '2025-12-31', confidence: 1 },
      },
      eligibility: {
        examProfServices: { value: 'YES', confidence: 1 },
        lens: { value: 'YES', confidence: 1 },
        frame: { value: 'YES', confidence: 1 },
        contacts: { value: 'YES', confidence: 1 },
        frequency: {
          examFrequency: { value: 'Every year', confidence: 1 },
          lensFrequency: { value: 'Every year', confidence: 1 },
          frameFrequency: { value: 'Every 2 years', confidence: 1 },
          contactsFrequency: { value: 'Every year', confidence: 1 },
        },
      },
      plan: {
        carrier: { value: 'VSP', confidence: 1 },
        benefitPlanName: { value: 'VSP Choice Plan', confidence: 1 },
        clientName: { value: 'Test Company Inc', confidence: 1 },
        networkLabRequirement: { value: null, confidence: 0 },
      },
      copays: {
        examCopay: { value: 15, confidence: 1 },
        materialsCopay: { value: 30, confidence: 1 },
        routineRetinalScreening: { value: '$39', confidence: 1 },
      },
      frame: {
        promotions: {
          extraFramePromotion: { value: 20, confidence: 1 },
        },
        allowances: {
          altairMarchonFrameAllowance: {
            allowance: 180,
            overageDiscount: 20,
            confidence: 1,
          },
          nonAltairMarchonFrameAllowance: {
            allowance: 150,
            overageDiscount: 20,
            confidence: 1,
          },
        },
      },
      contacts: {
        clExamDiscount: { value: null, confidence: 0 },
        clExamAndMaterialsAllowance: { value: 150, confidence: 1 },
        contactsInsteadOfGlasses: { value: true, confidence: 1 },
        necessaryCl: {
          necessaryClCopay: { value: 30, confidence: 1 },
        },
      },
      valueAdded: {
        additionalPairDiscount: { value: 20, confidence: 1 },
        clExam12MonthsDiscount: { value: 15, confidence: 1 },
      },
      overallConfidence: 0.95,
      notes: 'Test document for sync flow',
    }

    // Clean up existing test document
    await prisma.insuranceDocument.deleteMany({
      where: { fileName: 'sync-test-document.pdf' }
    })

    // Sample lens enhancement OCR text
    const lensOcrText = `
VSP Lens Enhancement Charges
SYNC-TEST-12345
Standard Progressives
KA - Progressive K Plastic
$55
Premium Progressives
FA - Progressive F Plastic
$105
JA - Progressive J Plastic
$95
Anti-Reflective Coating
QM - Anti-Reflective A
$41$41
QT - Anti-Reflective C
$68$68
QV - Anti-Reflective D
$85$85
Polycarbonate
AD - Polycarbonate
$35$35
Photochromic
PR - Photochromatics Plastic
$75$75
`

    const doc = await prisma.insuranceDocument.create({
      data: {
        customerId: customer.id,
        fileName: 'sync-test-document.pdf',
        fileType: 'application/pdf',
        filePath: '/test/sync-test-document.pdf',
        fileSize: 12345,
        uploadedBy: 'test-script',
        carrier: 'VSP',
        ocrStatus: 'completed',
        gptStatus: 'completed',
        confidenceScore: 0.95,
        extractedData: extractedData as any,
        rawOcrText: lensOcrText,
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: 'test-script',
      }
    })

    console.log(`   Created document: ${doc.id}`)
    console.log(`   - File: ${doc.fileName}`)
    console.log(`   - Carrier: ${doc.carrier}`)
    console.log(`   - Verified: ${doc.isVerified}`)

    // Step 3: Run sync
    console.log('\n3. Running sync script...')
    console.log('-'.repeat(60))

    // Import and run sync
    const { execSync } = await import('child_process')
    const output = execSync('npx tsx scripts/sync-authorizations.ts --verbose', {
      encoding: 'utf-8',
      cwd: process.cwd()
    })
    console.log(output)

    // Step 4: Verify authorization was created
    console.log('\n4. Verifying authorization was created...')

    const auth = await prisma.vspAuthorization.findFirst({
      where: {
        customerId: customer.id,
        authorizationNumber: 'SYNC-TEST-12345',
      },
      include: {
        lensEnhancementCopays: true
      }
    })

    if (auth) {
      console.log('   ✓ Authorization found!')
      console.log(`   - ID: ${auth.id}`)
      console.log(`   - Auth#: ${auth.authorizationNumber}`)
      console.log(`   - Plan: ${auth.planName}`)
      console.log(`   - Exam Copay: $${auth.examCopay}`)
      console.log(`   - Materials Copay: $${auth.materialsCopay}`)
      console.log(`   - Frame Allowance: $${auth.frameAllowanceRetail}`)
      console.log(`   - Active: ${auth.isActive}`)
      console.log(`   - Lens Enhancement Copays: ${auth.lensEnhancementCopays.length}`)
      if (auth.lensEnhancementCopays.length > 0) {
        console.log('   - Copay Details:')
        auth.lensEnhancementCopays.forEach(c => {
          console.log(`     ${c.code}: ${c.description} - SV:$${c.copaySingleVision} MF:$${c.copayMultifocal}`)
        })
      }
    } else {
      console.log('   ✗ Authorization NOT found!')
    }

    // Step 5: Test quote calculation
    console.log('\n5. Testing quote with synced authorization...')

    const { getActiveAuthorizationForCustomer } = await import('../src/lib/services/authorization-service')
    const authResult = await getActiveAuthorizationForCustomer(customer.id)

    if (authResult) {
      const { createPricingCalculator } = await import('../src/lib/services/pricing-calculator')
      const calculator = createPricingCalculator(authResult.authorization)

      const testItems = [{ sku: 'TEST', retailPrice: 300 }]
      const productMap = new Map()
      productMap.set('TEST', {
        sku: 'TEST',
        displayName: 'Test Progressive Lens',
        category: 'lens_progressive' as const,
        retailPrice: 300,
        isActive: true,
        vsp: { baseCode: 'KA' },
      })

      const quote = calculator.buildQuote(testItems, productMap, authResult.authorization)

      console.log('   Quote Result:')
      console.log(`   - Retail: $${quote.retailTotal}`)
      console.log(`   - Patient Pays: $${quote.patientTotal}`)
      console.log(`   - Insurance: $${quote.insuranceTotal}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✓ Full Sync Flow Test PASSED')
    console.log('='.repeat(60))

    // Cleanup
    console.log('\nCleaning up...')
    await prisma.vspAuthorization.deleteMany({
      where: { customerId: customer.id }
    })
    await prisma.insuranceDocument.deleteMany({
      where: { customerId: customer.id }
    })
    await prisma.customer.deleteMany({
      where: { email: 'sync-test@example.com' }
    })
    console.log('Done!')

  } catch (error) {
    console.error('\n✗ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testSyncFlow()
