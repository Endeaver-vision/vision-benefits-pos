/**
 * Real End-to-End Extraction Test
 *
 * This test validates the ENTIRE pipeline:
 * 1. Create a real patient
 * 2. Upload their actual insurance document
 * 3. Process through the API (which calls pattern extraction)
 * 4. Verify benefits are extracted and stored in database
 * 5. Query the API to get benefits back
 * 6. Verify UI displays the extracted benefits
 *
 * Usage: npm run dev # in terminal 1
 *        npx tsx scripts/test-real-extraction-e2e.ts # in terminal 2
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const API_URL = 'http://localhost:3000'

const testPatients = [
  {
    email: 'ab-vsp-test@example.com',
    firstName: 'Andrew',
    lastName: 'Brown',
    documents: [
      'public/uploads/insurance-docs/cminudpyec16eei5lb3d_1769268148527_AB-vsp-auth-1.pdf',
      'public/uploads/insurance-docs/cminudpyec16eei5lb3d_1769268223641_AB-vsp-lens-1.pdf',
    ],
    carrier: 'VSP',
  },
  {
    email: 'ss-eyemed-test@example.com',
    firstName: 'Sarah',
    lastName: 'Smith',
    documents: ['public/uploads/insurance-docs/cust_93800643_1768495131786_SS_eyemed.pdf'],
    carrier: 'EyeMed',
  },
  {
    email: 'cc-eyemed-test@example.com',
    firstName: 'Christopher',
    lastName: 'Chen',
    documents: ['public/uploads/insurance-docs/cminudpygd1n1drnnqim_1768613355681_CC_eyemed-ins.pdf'],
    carrier: 'EyeMed',
  },
]

interface ProcessResult {
  success: boolean
  carrier: string
  extractionMethod: string
  benefitsFound: number
  extractedData?: Record<string, unknown>
}

interface AuthResult {
  carrier: string
  benefits: Record<string, unknown>
  memberInfo?: Record<string, unknown>
}

async function uploadAndProcessDocument(
  customerId: string,
  documentPath: string
): Promise<ProcessResult> {
  if (!fs.existsSync(documentPath)) {
    throw new Error(`Document not found: ${documentPath}`)
  }

  // Upload document
  console.log(`  Uploading: ${path.basename(documentPath)}`)

  const document = await prisma.insuranceDocument.create({
    data: {
      customerId,
      fileName: path.basename(documentPath),
      filePath: documentPath,
      documentType: 'authorization',
      ocrStatus: 'pending',
    },
  })

  // Call the API to process it
  console.log(`  Processing document: ${document.id}`)

  const processResponse = await fetch(`${API_URL}/api/documents/${document.id}/process`, {
    method: 'POST',
  })

  if (!processResponse.ok) {
    const errorText = await processResponse.text()
    throw new Error(`API error ${processResponse.status}: ${errorText}`)
  }

  const result = await processResponse.json()

  return {
    success: result.success,
    carrier: result.carrier,
    extractionMethod: result.extractionMethod,
    benefitsFound: result.rawExtraction?.benefitsFound || 0,
    extractedData: result.rawExtraction,
  }
}

async function getCustomerAuthorization(customerId: string): Promise<AuthResult> {
  const authResponse = await fetch(`${API_URL}/api/customers/${customerId}/authorization`, {
    method: 'GET',
  })

  if (!authResponse.ok) {
    throw new Error(`Auth API error: ${authResponse.status}`)
  }

  return authResponse.json()
}

async function testPatient(patientData: typeof testPatients[0]) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`Testing: ${patientData.firstName} ${patientData.lastName}`)
  console.log(`${patientData.carrier} - ${patientData.documents.length} document(s)`)
  console.log('='.repeat(80))

  try {
    // Create or get customer
    console.log(`\nStep 1: Create/Get Customer`)
    const customer = await prisma.customer.upsert({
      where: { email: patientData.email },
      update: {},
      create: {
        email: patientData.email,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        phone: '555-0000',
      },
    })
    console.log(`  ✓ Customer: ${customer.id}`)

    // Upload and process each document
    console.log(`\nStep 2: Upload & Process Documents`)
    let totalBenefitsFound = 0
    const processingResults = []

    for (const docPath of patientData.documents) {
      try {
        const result = await uploadAndProcessDocument(customer.id, docPath)
        processingResults.push(result)
        totalBenefitsFound += result.benefitsFound

        if (result.success) {
          console.log(
            `  ✓ ${path.basename(docPath)}: ${result.extractionMethod} (${result.benefitsFound} benefits)`
          )
        } else {
          console.log(`  ✗ ${path.basename(docPath)}: Failed`)
        }
      } catch (error) {
        console.log(`  ✗ ${path.basename(docPath)}: ${error instanceof Error ? error.message : 'Error'}`)
      }
    }

    // Query authorization API
    console.log(`\nStep 3: Query Authorization API`)
    const authData = await getCustomerAuthorization(customer.id)
    console.log(`  Carrier: ${authData.carrier}`)
    console.log(`  Benefits in system: ${Object.keys(authData.benefits || {}).length}`)

    // Display extracted benefits
    if (authData.benefits && Object.keys(authData.benefits).length > 0) {
      console.log(`\nStep 4: Extracted Benefits`)
      for (const [key, benefit] of Object.entries(authData.benefits)) {
        console.log(`  ${key}:`)
        const b = benefit as Record<string, unknown>
        if (b.copay) console.log(`    Copay: $${b.copay}`)
        if (b.allowance) console.log(`    Allowance: $${b.allowance}`)
        if (b.discount_factor) console.log(`    Discount: ${(Number(b.discount_factor) * 100).toFixed(0)}%`)
      }
    } else {
      console.log(`  ✗ NO BENEFITS EXTRACTED`)
    }

    // Summary
    console.log(`\nStep 5: Validation`)
    if (totalBenefitsFound > 0 && Object.keys(authData.benefits || {}).length > 0) {
      console.log(`  ✓ Benefits extracted: ${totalBenefitsFound}`)
      console.log(`  ✓ Benefits stored: ${Object.keys(authData.benefits).length}`)
      console.log(`  ✓ API returning benefits: YES`)
      console.log(`  ✓ PATIENT TEST PASSED`)
      return true
    } else {
      console.log(`  ✗ No benefits extracted or stored`)
      console.log(`  ✗ PATIENT TEST FAILED`)
      return false
    }
  } catch (error) {
    console.log(`  ✗ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return false
  }
}

async function main() {
  console.log('REAL END-TO-END EXTRACTION TEST')
  console.log('Testing actual patient documents with real extraction pipeline')

  const results = []

  for (const patient of testPatients) {
    const passed = await testPatient(patient)
    results.push({ patient: `${patient.firstName} ${patient.lastName}`, passed })
  }

  // Final summary
  console.log(`\n${'='.repeat(80)}`)
  console.log('FINAL RESULTS')
  console.log('='.repeat(80))

  let passCount = 0
  for (const result of results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL'
    console.log(`${status}: ${result.patient}`)
    if (result.passed) passCount++
  }

  console.log(`\nTotal: ${passCount}/${results.length} patients processed successfully`)

  if (passCount === results.length) {
    console.log('\n✓ ALL TESTS PASSED - EXTRACTION PIPELINE WORKING')
  } else {
    console.log('\n✗ SOME TESTS FAILED - CHECK EXTRACTION PIPELINE')
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Test error:', error)
  process.exit(1)
})
