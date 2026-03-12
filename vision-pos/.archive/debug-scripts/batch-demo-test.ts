import fs from 'fs'
import path from 'path'

interface DocumentTest {
  name: string
  filePath: string
  customerId: string
  customerName: string
}

interface TestResult {
  docName: string
  customerId: string
  customerName: string
  status: string
  documentId?: string
  authId?: string
  extractedCarrier?: string
  extractedMemberName?: string
  extractedMemberId?: string
  examCopay?: string | number
  frameAllowance?: string | number
  tier1?: string | number
  tier4?: string | number
  productCount?: number
  errorMessage?: string
}

const BASE_URL = 'http://localhost:3000/api'

const documents: DocumentTest[] = [
  {
    name: 'DA_Eyemed-Benefits.pdf',
    filePath: '/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpy65fd6hfrxt9e_1768608907330_DA_Eyemed-Benefits.pdf',
    customerId: 'cminudpy65fd6hfrxt9e',
    customerName: 'David Anderson'
  },
  {
    name: 'TC_Benefits-Eyemed.pdf',
    filePath: '/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpygf869vu4l7iv_1769443233666_TC_Benefits-Eyemed.pdf',
    customerId: 'cminudpygf869vu4l7iv',
    customerName: 'Thomas Chadwick'
  },
  {
    name: 'SS_eyemed.pdf',
    filePath: '/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cust_93800643_1768495131786_SS_eyemed.pdf',
    customerId: 'cust_93800643',
    customerName: 'Steven Soto'
  },
  {
    name: 'LM_eyemed-2025.pdf',
    filePath: '/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpyz0qoge161phfm_1768610228772_LM_eyemed-2025.pdf',
    customerId: 'cminudpyz0qoge161phfm',
    customerName: 'Lorene Mingione'
  },
  {
    name: 'GB_eyemed.pdf',
    filePath: '/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpycvo1756s326c_1768613356788_GB_eyemed.pdf',
    customerId: 'cminudpycvo1756s326c',
    customerName: 'GB Customer'
  },
  {
    name: 'ES_Eyemed-Benefits.pdf',
    filePath: '/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpz5eyycx1vchw_1768609270089_ES_Eyemed-Benefits.pdf',
    customerId: 'cminudpz5eyycx1vchw',
    customerName: 'ES Customer'
  },
  {
    name: 'AP_eyemed.pdf',
    filePath: '/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpz2mmiy1b7r9hh_1768608797399_AP_eyemed.pdf',
    customerId: 'cminudpz2mmiy1b7r9hh',
    customerName: 'AP Customer'
  },
  {
    name: 'ER-eyemed.pdf',
    filePath: '/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpz3totzr070b3c_1768609269396_ER-eyemed.pdf',
    customerId: 'cminudpz3totzr070b3c',
    customerName: 'ER Customer'
  }
]

async function uploadDocument(filePath: string, customerId: string): Promise<string> {
  const FormData = require('form-data')
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath))
  form.append('customerId', customerId)
  form.append('uploadedBy', 'demo-test')

  const response = await fetch(`${BASE_URL}/documents/upload`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders()
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  const data = (await response.json()) as any
  return data.documentId
}

async function processDocument(documentId: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/documents/${documentId}/process`, {
    method: 'POST'
  })

  if (!response.ok) {
    throw new Error(`Process failed: ${response.statusText}`)
  }

  return await response.json()
}

async function verifyDocument(documentId: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/documents/${documentId}/verify`, {
    method: 'POST'
  })

  if (!response.ok) {
    throw new Error(`Verify failed: ${response.statusText}`)
  }

  const data = (await response.json()) as any
  return data.authorizationId
}

async function getAuthorization(customerId: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/customers/${customerId}/authorization`)

  if (!response.ok) {
    throw new Error(`Get authorization failed: ${response.statusText}`)
  }

  return await response.json()
}

async function getPriceList(customerId: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/customers/${customerId}/price-plan`)

  if (!response.ok) {
    throw new Error(`Get price-plan failed: ${response.statusText}`)
  }

  return await response.json()
}

async function testDocument(doc: DocumentTest): Promise<TestResult> {
  const result: TestResult = {
    docName: doc.name,
    customerId: doc.customerId,
    customerName: doc.customerName,
    status: 'Processing...'
  }

  try {
    console.log(`\n📄 Processing: ${doc.name}`)

    // Step 1: Upload
    console.log('  1️⃣  Uploading...')
    const documentId = await uploadDocument(doc.filePath, doc.customerId)
    result.documentId = documentId
    console.log(`    ✓ Document ID: ${documentId}`)

    // Step 2: Extract
    console.log('  2️⃣  Extracting...')
    const extractionResult = await processDocument(documentId)
    result.extractedCarrier = extractionResult.carrier
    result.extractedMemberName = extractionResult.memberName
    result.extractedMemberId = extractionResult.memberId
    console.log(`    ✓ Carrier: ${extractionResult.carrier}`)
    console.log(`    ✓ Member: ${extractionResult.memberName} (${extractionResult.memberId})`)

    // Step 3: Verify and create authorization
    console.log('  3️⃣  Verifying & creating authorization...')
    const authId = await verifyDocument(documentId)
    result.authId = authId
    console.log(`    ✓ Authorization ID: ${authId}`)

    // Step 4: Get authorization details
    console.log('  4️⃣  Fetching authorization details...')
    const auth = await getAuthorization(doc.customerId)
    result.examCopay = auth.examCopay
    result.frameAllowance = auth.frameAllowance
    if (auth.copays) {
      result.tier1 = auth.copays['Varilux Comfort'] || auth.copays['progressiveTier1'] || 'N/A'
      result.tier4 = auth.copays['Varilux XR Series'] || auth.copays['progressiveTier4'] || 'N/A'
    }
    console.log(`    ✓ Exam: $${auth.examCopay}, Frame: $${auth.frameAllowance}`)

    // Step 5: Get pricelist count
    console.log('  5️⃣  Checking pricelist generation...')
    const priceList = await getPriceList(doc.customerId)
    result.productCount = priceList.products?.length || 0
    console.log(`    ✓ Products priced: ${result.productCount}`)

    result.status = '✅ Success'
  } catch (error) {
    result.status = '❌ Failed'
    result.errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`    ✗ Error: ${result.errorMessage}`)
  }

  return result
}

async function main() {
  console.log('🚀 Starting Batch Demo Document Testing\n')
  console.log(`Processing ${documents.length} documents...`)
  console.log('=' .repeat(70))

  const results: TestResult[] = []

  for (const doc of documents) {
    const result = await testDocument(doc)
    results.push(result)
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n📊 RESULTS SUMMARY\n')

  // Print table
  console.log('| Doc | Customer | Status | Auth ID | Exam | Frame | Tier1 | Tier4 | Products |')
  console.log('|-----|----------|--------|---------|------|-------|-------|-------|----------|')

  for (const r of results) {
    const authId = r.authId?.substring(0, 8) || 'N/A'
    console.log(
      `| ${r.docName.substring(0, 15).padEnd(15)} | ${r.customerName.substring(0, 8).padEnd(8)} | ${r.status.padEnd(7)} | ${authId.padEnd(7)} | $${String(r.examCopay).padEnd(3)} | $${String(r.frameAllowance).padEnd(5)} | $${String(r.tier1).padEnd(4)} | $${String(r.tier4).padEnd(4)} | ${String(r.productCount).padEnd(3)} |`
    )
  }

  // Summary statistics
  const successful = results.filter(r => r.status.includes('Success')).length
  const totalProducts = results.reduce((sum, r) => sum + (r.productCount || 0), 0)

  console.log('\n📈 Statistics:')
  console.log(`  ✓ Successful: ${successful}/${results.length}`)
  console.log(`  ✓ Total products priced: ${totalProducts}`)
  console.log(`  ✓ Average products per customer: ${(totalProducts / successful).toFixed(0)}`)

  // UI links
  console.log('\n🔗 View Customer Profiles:')
  for (const r of results) {
    if (r.status.includes('Success')) {
      console.log(`  http://localhost:3000/customers/${r.customerId}?tab=price-plan`)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Batch testing complete!\n')

  // Save results to file
  const resultsFile = '/private/tmp/claude/-Users-cmac-let/4800dd6b-c887-420f-a8d2-be9d3125a356/scratchpad/demo-test-results.json'
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2))
  console.log(`Results saved to: ${resultsFile}`)
}

main().catch(console.error)
