/**
 * End-to-End API Integration Test
 *
 * Tests the complete scanner workflow:
 * 1. Create a test customer
 * 2. Upload an EyeMed document
 * 3. Process the document through the API
 * 4. Verify extraction results
 *
 * Usage: npx tsx scripts/test-api-integration.ts [customer-email]
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface UploadResult {
  documentId: string
  fileName: string
  filePath: string
}

interface ProcessResult {
  success: boolean
  carrier: string
  benefitsFound: number
  extractionMethod: string
  patternsMatched?: number
}

async function createTestCustomer(email: string) {
  console.log(`\n[Test] Creating test customer: ${email}`)

  const customer = await prisma.customer.upsert({
    where: { email },
    update: { email },
    create: {
      email,
      firstName: 'Test',
      lastName: 'Patient',
      phone: '555-0000',
    },
  })

  console.log(`✓ Customer created: ${customer.id}`)
  return customer
}

async function uploadDocument(
  customerId: string,
  pdfPath: string
): Promise<UploadResult> {
  console.log(`\n[Test] Uploading document: ${pdfPath}`)

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`File not found: ${pdfPath}`)
  }

  const fileName = path.basename(pdfPath)
  const uploadDir = path.join(process.cwd(), 'public/uploads/insurance-docs')

  // Copy file to upload directory with unique name
  const timestamp = Date.now()
  const uploadedFileName = `${customerId}_${timestamp}_${fileName}`
  const uploadedPath = path.join(uploadDir, uploadedFileName)

  fs.copyFileSync(pdfPath, uploadedPath)
  console.log(`✓ File copied to: ${uploadedPath}`)

  // Create document record
  const document = await prisma.insuranceDocument.create({
    data: {
      customerId,
      fileName,
      filePath: uploadedPath,
      documentType: 'authorization',
      ocrStatus: 'pending',
    },
  })

  console.log(`✓ Document created: ${document.id}`)

  return {
    documentId: document.id,
    fileName,
    filePath: uploadedPath,
  }
}

async function processDocument(documentId: string): Promise<ProcessResult> {
  console.log(`\n[Test] Processing document: ${documentId}`)

  // Call the API endpoint
  const apiUrl = `http://localhost:3000/api/documents/${documentId}/process`

  let response
  try {
    response = await fetch(apiUrl, { method: 'POST' })
  } catch (err) {
    console.error(`✗ Failed to connect to ${apiUrl}`)
    console.error(`  Make sure the server is running: npm run dev`)
    throw err
  }

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API returned ${response.status}: ${error}`)
  }

  const result = await response.json()

  console.log(`✓ Processing complete`)
  console.log(`  Carrier: ${result.carrier}`)
  console.log(`  Method: ${result.extractionMethod}`)
  console.log(`  Benefits: ${result.rawExtraction.benefitsFound}`)

  if (result.nativeExtractionStats) {
    console.log(`  Pattern Matches: ${result.nativeExtractionStats.patternsMatched}`)
  }

  return {
    success: result.success,
    carrier: result.carrier,
    benefitsFound: result.rawExtraction.benefitsFound,
    extractionMethod: result.extractionMethod,
    patternsMatched: result.nativeExtractionStats?.patternsMatched,
  }
}

async function main() {
  const email = process.argv[2] || `test-${Date.now()}@example.com`
  const samplePdf = 'public/uploads/insurance-docs/cust_93800643_1768495131786_SS_eyemed.pdf'

  console.log('=' + '='.repeat(79))
  console.log('End-to-End API Integration Test')
  console.log('=' + '='.repeat(79))

  try {
    // Step 1: Create customer
    const customer = await createTestCustomer(email)

    // Step 2: Upload document
    const upload = await uploadDocument(customer.id, samplePdf)

    // Step 3: Process document
    const processResult = await processDocument(upload.documentId)

    // Verify results
    console.log('\n' + '='.repeat(80))
    console.log('TEST RESULTS')
    console.log('='.repeat(80))

    if (!processResult.success) {
      console.error('✗ Processing failed')
      process.exit(1)
    }

    console.log(`✓ Processing succeeded`)
    console.log(`✓ Carrier detected: ${processResult.carrier}`)
    console.log(`✓ Benefits extracted: ${processResult.benefitsFound}`)
    console.log(`✓ Extraction method: ${processResult.extractionMethod}`)

    if (processResult.extractionMethod === 'eyemed-pattern-based') {
      console.log(`✓ Pattern matches: ${processResult.patternsMatched}`)

      if (processResult.patternsMatched === 0) {
        console.error('✗ No patterns matched - extraction may have failed')
        process.exit(1)
      }
    }

    console.log('\n✓ All tests passed!')
    console.log(`\nCustomer: ${customer.email} (${customer.id})`)
    console.log(`Document: ${upload.fileName}`)

    // Clean up - delete test customer
    await prisma.customer.delete({ where: { id: customer.id } })
    console.log('\n✓ Cleanup complete')
  } catch (error) {
    console.error('\n✗ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
