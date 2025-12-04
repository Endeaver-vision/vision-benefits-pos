/**
 * End-to-End Test
 *
 * Tests the full flow from PDF extraction → Authorization storage → Quote calculation
 * Uses real extracted data from the insurance-doc-scanner
 */

import { prisma } from '../src/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

const VISION_POS_URL = 'http://localhost:3000'

interface ExtractedInsuranceData {
  patient: {
    patientName: { value: string; confidence: number }
    memberName: { value: string; confidence: number }
    authNumber: { value: string; confidence: number }
    relationship: { value: string; confidence: number }
    patientBirthDate: { value: string; confidence: number }
    authEffectiveDate: { value: string; confidence: number }
    authExpirationDate: { value: string; confidence: number }
  }
  eligibility: Record<string, unknown>
  plan: {
    carrier: { value: string; confidence: number }
    benefitPlanName: { value: string; confidence: number }
    clientName: { value: string; confidence: number }
    networkLabRequirement: { value: string | null; confidence: number }
  }
  copays: {
    examCopay: { value: number; confidence: number }
    materialsCopay: { value: number; confidence: number }
    routineRetinalScreening: { value: string; confidence: number }
  }
  frame: {
    promotions: { extraFramePromotion: { value: number; confidence: number } }
    allowances: {
      altairMarchonFrameAllowance: { allowance: number; overageDiscount: number; confidence: number }
      nonAltairMarchonFrameAllowance: { allowance: number; overageDiscount: number; confidence: number }
    }
  }
  contacts: {
    clExamDiscount: { value: string | null; confidence: number }
    clExamAndMaterialsAllowance: { value: number; confidence: number }
    contactsInsteadOfGlasses: { value: boolean; confidence: number }
    necessaryCl: { necessaryClCopay: { value: number; confidence: number } }
  }
  valueAdded: Record<string, unknown>
  overallConfidence: number
  notes: string
}

interface AnalysisResult {
  fileName: string
  carrier: string
  docType: string
  ocrSuccess: boolean
  extractionSuccess: boolean
  errors: string[]
  ocrText: string
  textLength: number
  extractedData: ExtractedInsuranceData
}

async function loadAnalysisResults(): Promise<AnalysisResult[]> {
  const analysisPath = '/Users/cmac/Documents/insurance-doc-scanner/analysis-results.json'

  if (!fs.existsSync(analysisPath)) {
    throw new Error('Analysis results not found. Run the scanner first.')
  }

  const data = fs.readFileSync(analysisPath, 'utf-8')
  return JSON.parse(data)
}

async function testEndToEnd() {
  console.log('='.repeat(70))
  console.log('END-TO-END TEST: PDF → Authorization → Quote')
  console.log('='.repeat(70))

  try {
    // Step 1: Load real extraction results
    console.log('\n1. Loading extraction results from scanner...')
    const results = await loadAnalysisResults()

    const vspAuth = results.find(r => r.carrier === 'VSP' && r.docType === 'auth')
    if (!vspAuth) {
      throw new Error('No VSP auth document found in analysis results')
    }

    console.log(`   Found: ${vspAuth.fileName}`)
    console.log(`   Patient: ${vspAuth.extractedData.patient.patientName.value}`)
    console.log(`   Auth#: ${vspAuth.extractedData.patient.authNumber.value}`)

    // Step 2: Create or find test customer
    console.log('\n2. Setting up test customer...')

    let customer = await prisma.customer.findFirst({
      where: { email: 'e2e-test@example.com' }
    })

    if (!customer) {
      const dob = vspAuth.extractedData.patient.patientBirthDate.value
      const [firstName, ...lastParts] = vspAuth.extractedData.patient.patientName.value.split(' ')
      const lastName = lastParts.join(' ')

      customer = await prisma.customer.create({
        data: {
          firstName,
          lastName,
          email: 'e2e-test@example.com',
          phone: '555-0100',
          dateOfBirth: new Date(dob),
          gender: 'MALE',
          address: '123 Test St, Melbourne, FL 32935',
          zipCode: '32935',
          createdBy: 'e2e-test',
          updatedBy: 'e2e-test',
        }
      })
      console.log(`   Created customer: ${customer.id}`)
    } else {
      console.log(`   Found existing customer: ${customer.id}`)
    }

    // Step 3: Post to intake API
    console.log('\n3. Posting to Authorization Intake API...')

    const vspLensEnhancements = [
      { code: 'KA', description: 'Progressive K Plastic (Standard)', copaySingleVision: null, copayMultifocal: 55, isAddonCode: false },
      { code: 'FA', description: 'Progressive F Plastic (Premium)', copaySingleVision: null, copayMultifocal: 105, isAddonCode: false },
      { code: 'NA', description: 'Progressive N Plastic (Custom)', copaySingleVision: null, copayMultifocal: 175, isAddonCode: false },
      { code: 'QM', description: 'Anti-Reflective A', copaySingleVision: 41, copayMultifocal: 41, isAddonCode: true },
      { code: 'QT', description: 'Anti-Reflective C', copaySingleVision: 68, copayMultifocal: 68, isAddonCode: true },
      { code: 'QV', description: 'Anti-Reflective D', copaySingleVision: 85, copayMultifocal: 85, isAddonCode: true },
      { code: 'AD', description: 'Polycarbonate', copaySingleVision: 35, copayMultifocal: 35, isAddonCode: true },
      { code: 'PR', description: 'Photochromatics Plastic', copaySingleVision: 75, copayMultifocal: 75, isAddonCode: true },
    ]

    const intakePayload = {
      customerId: customer.id,
      carrier: 'vsp',
      extractedData: vspAuth.extractedData,
      vspLensEnhancements,
      sourceFileName: vspAuth.fileName,
    }

    const intakeResponse = await fetch(`${VISION_POS_URL}/api/authorizations/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intakePayload),
    })

    const intakeResult = await intakeResponse.json()

    if (!intakeResult.success) {
      throw new Error(intakeResult.error || 'Intake API failed')
    }

    console.log(`   ✓ Authorization created: ${intakeResult.authorizationId}`)

    // Step 4: Verify authorization via API
    console.log('\n4. Verifying authorization via API...')

    const authResponse = await fetch(`${VISION_POS_URL}/api/customers/${customer.id}/authorization`)
    const authResult = await authResponse.json()

    if (authResult.success && authResult.authorization) {
      console.log(`   ✓ Authorization found:`)
      console.log(`     - Carrier: ${authResult.authorization.carrier}`)
      console.log(`     - Plan: ${authResult.authorization.planName}`)
      console.log(`     - Exam Copay: $${authResult.authorization.examCopay}`)
      console.log(`     - Frame Allowance: $${authResult.authorization.frameAllowance}`)
    } else {
      console.log(`   ⚠ Authorization not found via API`)
    }

    // Step 5: Test Quote API with products
    console.log('\n5. Testing Quote API with products...')

    // Get some real products from the database
    const lensProducts = await prisma.lensProduct.findMany({
      where: { isActive: true },
      take: 3,
      include: { carrierTiers: true }
    })

    const frames = await prisma.frame.findMany({
      where: { isActive: true },
      take: 1
    })

    const items = [
      ...lensProducts.map(p => ({ sku: p.sku!, retailPrice: p.retailPrice })),
      ...frames.map(f => ({ sku: f.sku!, retailPrice: f.retailPrice }))
    ].filter(i => i.sku)

    if (items.length === 0) {
      console.log('   ⚠ No products found in database, using mock items')
      items.push(
        { sku: 'PROG-TEST', retailPrice: 350 },
        { sku: 'AR-TEST', retailPrice: 150 },
        { sku: 'FRAME-TEST', retailPrice: 250 }
      )
    }

    console.log(`   Testing with ${items.length} items:`)
    items.forEach(i => console.log(`     - ${i.sku}: $${i.retailPrice}`))

    const quoteResponse = await fetch(`${VISION_POS_URL}/api/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: customer.id,
        items
      }),
    })

    const quoteResult = await quoteResponse.json()

    if (quoteResult.success) {
      console.log(`\n   ✓ Quote calculated:`)
      console.log(`     - Carrier: ${quoteResult.quote.carrier || 'Cash'}`)
      console.log(`     - Plan: ${quoteResult.quote.planName}`)
      console.log('     - Items:')
      quoteResult.quote.items.forEach((item: { displayName: string; retailPrice: number; patientCopay: number; tierUsed?: string }) => {
        console.log(`       ${item.displayName}: Retail $${item.retailPrice} → Patient $${item.patientCopay} (tier: ${item.tierUsed || 'n/a'})`)
      })
      console.log(`     - Retail Total: $${quoteResult.quote.retailTotal}`)
      console.log(`     - Patient Pays: $${quoteResult.quote.patientTotal}`)
      console.log(`     - Insurance Pays: $${quoteResult.quote.insuranceTotal}`)
      console.log(`     - Total Savings: $${quoteResult.quote.totalSavings}`)
    } else {
      console.log(`   ✗ Quote failed: ${quoteResult.error}`)
    }

    // Step 6: Summary
    console.log('\n' + '='.repeat(70))
    console.log('END-TO-END TEST COMPLETE')
    console.log('='.repeat(70))
    console.log('\nSummary:')
    console.log(`  1. PDF extracted data loaded from: ${vspAuth.fileName}`)
    console.log(`  2. Customer created: ${customer.firstName} ${customer.lastName} (${customer.id})`)
    console.log(`  3. Authorization created: ${intakeResult.authorizationId}`)
    console.log(`  4. Quote API calculated pricing for ${items.length} items`)
    console.log(`  5. Patient pays: $${quoteResult.quote?.patientTotal ?? 'N/A'}`)

    // Cleanup
    console.log('\nCleaning up test data...')
    await prisma.vspLensEnhancementCopay.deleteMany({
      where: { authorization: { customerId: customer.id } }
    })
    await prisma.vspAuthorization.deleteMany({ where: { customerId: customer.id } })
    await prisma.customer.deleteMany({ where: { email: 'e2e-test@example.com' } })
    console.log('Done!')

  } catch (error) {
    console.error('\n✗ End-to-end test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testEndToEnd()
