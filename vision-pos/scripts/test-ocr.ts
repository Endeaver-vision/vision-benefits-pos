/**
 * OCR Service Test Script
 * Run with: npx tsx scripts/test-ocr.ts
 *
 * This script tests the OCR pipeline without touching the database.
 * It demonstrates:
 * 1. Document processing (Google Vision OCR)
 * 2. Carrier detection
 * 3. GPT-4o extraction
 */

// Load environment variables first
import { config } from 'dotenv'
config({ path: '.env.local' })

import * as path from 'path'
import * as fs from 'fs'

// Import OCR services
import { processDocument } from '../src/lib/services/ocr/ocr-service'
import { parseInsuranceDocument, calculateOverallConfidence, getConfidenceLevel } from '../src/lib/services/ocr/gpt-extraction'
import { detectCarrier, detectDocumentType, countNullFields, countLowConfidenceFields } from '../src/lib/services/ocr/carrier-detection'

// Sample document path - adjust as needed
const SAMPLE_DOC = '/Users/cmac/Documents/insurance-doc-scanner/sample-docs/RB_AuthVSP.pdf'

async function main() {
  console.log('🔍 OCR Service Test')
  console.log('=' .repeat(60))

  // Check if sample document exists
  if (!fs.existsSync(SAMPLE_DOC)) {
    console.error(`❌ Sample document not found: ${SAMPLE_DOC}`)
    console.log('\nUsage: Place a PDF or image file and update SAMPLE_DOC path')
    process.exit(1)
  }

  console.log(`\n📄 Processing: ${path.basename(SAMPLE_DOC)}`)
  console.log('-'.repeat(60))

  // Step 1: Run OCR
  console.log('\n1️⃣  Running OCR...')
  const startOCR = Date.now()

  try {
    const ocrResult = await processDocument(SAMPLE_DOC)

    console.log(`   Method: ${ocrResult.method}`)
    console.log(`   Success: ${ocrResult.success}`)
    console.log(`   Pages: ${ocrResult.pageCount || 1}`)
    console.log(`   Text length: ${ocrResult.text?.length || 0} characters`)
    console.log(`   Duration: ${Date.now() - startOCR}ms`)

    if (!ocrResult.success || !ocrResult.text) {
      console.error(`   ❌ OCR failed: ${ocrResult.error}`)
      process.exit(1)
    }

    // Show first 500 chars of OCR text
    console.log('\n   OCR Text Preview:')
    console.log('   ' + '-'.repeat(50))
    console.log('   ' + ocrResult.text.substring(0, 500).replace(/\n/g, '\n   ') + '...')
    console.log('   ' + '-'.repeat(50))

    // Step 2: Detect carrier and document type
    console.log('\n2️⃣  Detecting carrier and document type...')
    const fileName = path.basename(SAMPLE_DOC)
    const carrier = detectCarrier(ocrResult.text, fileName)
    const docType = detectDocumentType(ocrResult.text, fileName)

    console.log(`   Carrier: ${carrier || 'Unknown'}`)
    console.log(`   Document Type: ${docType}`)

    // Step 3: Parse with GPT-4o
    console.log('\n3️⃣  Extracting data with GPT-4o...')
    const startGPT = Date.now()

    const extractedData = await parseInsuranceDocument(ocrResult.text)

    console.log(`   Duration: ${Date.now() - startGPT}ms`)

    // Step 4: Analyze results
    console.log('\n4️⃣  Extraction Results:')
    console.log('-'.repeat(60))

    const overallConfidence = extractedData.overallConfidence || calculateOverallConfidence(extractedData)
    const confidenceLevel = getConfidenceLevel(overallConfidence)
    const nullFields = countNullFields(extractedData)
    const lowConfFields = countLowConfidenceFields(extractedData, 0.7)

    console.log(`   Overall Confidence: ${(overallConfidence * 100).toFixed(1)}% (${confidenceLevel})`)
    console.log(`   Null Fields: ${nullFields}`)
    console.log(`   Low Confidence Fields: ${lowConfFields}`)

    // Show key extracted fields
    console.log('\n   📋 Patient Info:')
    console.log(`      Name: ${extractedData.patient?.patientName?.value || 'N/A'} (${((extractedData.patient?.patientName?.confidence || 0) * 100).toFixed(0)}%)`)
    console.log(`      Member Name: ${extractedData.patient?.memberName?.value || 'N/A'} (${((extractedData.patient?.memberName?.confidence || 0) * 100).toFixed(0)}%)`)
    console.log(`      Auth Number: ${extractedData.patient?.authNumber?.value || 'N/A'} (${((extractedData.patient?.authNumber?.confidence || 0) * 100).toFixed(0)}%)`)
    console.log(`      Effective: ${extractedData.patient?.authEffectiveDate?.value || 'N/A'}`)
    console.log(`      Expiration: ${extractedData.patient?.authExpirationDate?.value || 'N/A'}`)

    console.log('\n   💰 Plan Info:')
    console.log(`      Carrier: ${extractedData.plan?.carrier?.value || 'N/A'}`)
    console.log(`      Plan Name: ${extractedData.plan?.benefitPlanName?.value || 'N/A'}`)
    console.log(`      Client: ${extractedData.plan?.clientName?.value || 'N/A'}`)

    console.log('\n   💵 Copays:')
    console.log(`      Exam: $${extractedData.copays?.examCopay?.value ?? 'N/A'}`)
    console.log(`      Materials: $${extractedData.copays?.materialsCopay?.value ?? 'N/A'}`)

    console.log('\n   🖼️  Frame Benefits:')
    const altair = extractedData.frame?.allowances?.altairMarchonFrameAllowance
    const nonAltair = extractedData.frame?.allowances?.nonAltairMarchonFrameAllowance
    console.log(`      Altair/Marchon: $${altair?.allowance ?? 'N/A'} (${altair?.overageDiscount ?? 'N/A'}% overage)`)
    console.log(`      Non-Altair: $${nonAltair?.allowance ?? 'N/A'} (${nonAltair?.overageDiscount ?? 'N/A'}% overage)`)

    console.log('\n   👁️  Contact Benefits:')
    console.log(`      CL Allowance: $${extractedData.contacts?.clExamAndMaterialsAllowance?.value ?? 'N/A'}`)

    console.log('\n   📝 Notes:')
    console.log(`      ${extractedData.notes || '(none)'}`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ OCR Test Complete!')
    console.log(`   Total time: ${Date.now() - startOCR}ms`)

    // Optionally save the full extracted data to a file
    const outputPath = '/tmp/ocr-test-output.json'
    fs.writeFileSync(outputPath, JSON.stringify(extractedData, null, 2))
    console.log(`\n📁 Full output saved to: ${outputPath}`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
