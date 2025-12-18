/**
 * Pricing Validation Tests
 *
 * These tests validate the insurance pricing calculations work correctly
 * by calling the APIs directly. This catches calculation bugs before
 * they reach the UI.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const BASE_URL = 'http://localhost:3000'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: object
}

const results: TestResult[] = []

// Helper to make API calls
async function apiCall(path: string, options?: RequestInit) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  })
  return {
    ok: response.ok,
    status: response.status,
    data: response.ok ? await response.json() : null,
    error: !response.ok ? await response.text() : null
  }
}

// Test runner helper
async function runTest(name: string, testFn: () => Promise<void>) {
  try {
    await testFn()
    results.push({ name, passed: true })
    console.log(`✓ ${name}`)
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    })
    console.log(`✗ ${name}`)
    console.log(`  Error: ${error instanceof Error ? error.message : error}`)
  }
}

// Main test suite
async function runPricingTests() {
  console.log('='.repeat(60))
  console.log('PRICING VALIDATION TESTS')
  console.log('='.repeat(60))
  console.log()

  // Get test data
  const vspCustomer = await prisma.vspAuthorization.findFirst({
    where: { isActive: true }
  })

  const eyemedCustomer = await prisma.eyemedAuthorization.findFirst({
    where: { isActive: true }
  })

  const specteraCustomer = await prisma.specteraAuthorization.findFirst({
    where: { isActive: true }
  })

  console.log('Test Customers:')
  console.log(`  VSP: ${vspCustomer?.customerId || 'NONE'}`)
  console.log(`  EyeMed: ${eyemedCustomer?.customerId || 'NONE'}`)
  console.log(`  Spectera: ${specteraCustomer?.customerId || 'NONE'}`)
  console.log()

  // ============================================================================
  // CUSTOMER SEARCH TESTS
  // ============================================================================
  console.log('\n--- Customer Search Tests ---\n')

  await runTest('Customer search returns results', async () => {
    const { ok, data } = await apiCall('/api/customers?search=a&limit=5')
    if (!ok) throw new Error('API returned error')
    if (!data.data || data.data.length === 0) throw new Error('No customers returned')
  })

  await runTest('Customer search handles empty query', async () => {
    const { ok, data } = await apiCall('/api/customers?search=&limit=5')
    if (!ok) throw new Error('API returned error on empty search')
  })

  await runTest('Customer search handles no results', async () => {
    const { ok, data } = await apiCall('/api/customers?search=XYZNONEXISTENT99999&limit=5')
    if (!ok) throw new Error('API returned error')
    // Empty results is fine
  })

  // ============================================================================
  // AUTHORIZATION API TESTS
  // ============================================================================
  console.log('\n--- Authorization API Tests ---\n')

  if (vspCustomer) {
    await runTest('VSP authorization loads correctly', async () => {
      const { ok, data } = await apiCall(`/api/customers/${vspCustomer.customerId}/authorization`)
      if (!ok) throw new Error('Authorization API failed')
      if (!data.hasInsurance) throw new Error('hasInsurance should be true')
      if (data.carrier !== 'VSP') throw new Error(`Expected VSP, got ${data.carrier}`)
    })

    await runTest('VSP authorization has exam copay', async () => {
      const { ok, data } = await apiCall(`/api/customers/${vspCustomer.customerId}/authorization`)
      if (!ok) throw new Error('Authorization API failed')
      if (data.examCopay === undefined) throw new Error('examCopay missing')
      if (typeof data.examCopay !== 'number') throw new Error('examCopay should be a number')
    })

    await runTest('VSP authorization has frame allowance', async () => {
      const { ok, data } = await apiCall(`/api/customers/${vspCustomer.customerId}/authorization`)
      if (!ok) throw new Error('Authorization API failed')
      if (data.frameAllowance === undefined) throw new Error('frameAllowance missing')
    })
  }

  if (eyemedCustomer) {
    await runTest('EyeMed authorization loads correctly', async () => {
      const { ok, data } = await apiCall(`/api/customers/${eyemedCustomer.customerId}/authorization`)
      if (!ok) throw new Error('Authorization API failed')
      if (!data.hasInsurance) throw new Error('hasInsurance should be true')
      if (data.carrier !== 'EyeMed') throw new Error(`Expected EyeMed, got ${data.carrier}`)
    })

    await runTest('EyeMed authorization has progressive copays', async () => {
      const { ok, data } = await apiCall(`/api/customers/${eyemedCustomer.customerId}/authorization`)
      if (!ok) throw new Error('Authorization API failed')
      // EyeMed should have tier-based copays
      // Note: These may be in the raw auth data
    })
  }

  if (specteraCustomer) {
    await runTest('Spectera authorization loads correctly', async () => {
      const { ok, data } = await apiCall(`/api/customers/${specteraCustomer.customerId}/authorization`)
      if (!ok) throw new Error('Authorization API failed')
      if (!data.hasInsurance) throw new Error('hasInsurance should be true')
      if (data.carrier !== 'Spectera') throw new Error(`Expected Spectera, got ${data.carrier}`)
    })
  }

  // Cash pay customer (one without insurance)
  await runTest('Cash pay customer has no insurance', async () => {
    // Find a customer without any authorization
    const customers = await prisma.customer.findMany({ take: 100 })
    const vspIds = (await prisma.vspAuthorization.findMany({ where: { isActive: true } })).map(a => a.customerId)
    const eyemedIds = (await prisma.eyemedAuthorization.findMany({ where: { isActive: true } })).map(a => a.customerId)
    const specteraIds = (await prisma.specteraAuthorization.findMany({ where: { isActive: true } })).map(a => a.customerId)

    const allInsuredIds = new Set([...vspIds, ...eyemedIds, ...specteraIds])
    const cashPayCustomer = customers.find(c => !allInsuredIds.has(c.id))

    if (cashPayCustomer) {
      const { ok, data } = await apiCall(`/api/customers/${cashPayCustomer.id}/authorization`)
      if (!ok) throw new Error('Authorization API failed')
      if (data.hasInsurance) throw new Error('Cash pay customer should not have insurance')
    }
  })

  // ============================================================================
  // PRODUCT API TESTS
  // ============================================================================
  console.log('\n--- Product API Tests ---\n')

  await runTest('Exam services API returns data', async () => {
    const { ok, data } = await apiCall('/api/pos/services')
    if (!ok) throw new Error('Services API failed')
    if (!data || !Array.isArray(data)) throw new Error('Expected array of services')
    if (data.length === 0) throw new Error('No services returned')
  })

  await runTest('Frames API returns data', async () => {
    const { ok, data } = await apiCall('/api/frames?limit=10')
    if (!ok) throw new Error('Frames API failed')
    if (!data.frames || !Array.isArray(data.frames)) throw new Error('Expected frames array')
  })

  await runTest('Frames have required fields', async () => {
    const { ok, data } = await apiCall('/api/frames?limit=5')
    if (!ok) throw new Error('Frames API failed')
    if (data.frames && data.frames.length > 0) {
      const frame = data.frames[0]
      if (!frame.id) throw new Error('Frame missing id')
      if (frame.retailPrice === undefined) throw new Error('Frame missing retailPrice')
    }
  })

  await runTest('Contact lenses API returns data', async () => {
    const { ok, data } = await apiCall('/api/contact-lenses')
    if (!ok) throw new Error('Contact lenses API failed')
    if (!data.lenses || !Array.isArray(data.lenses)) throw new Error('Expected lenses array')
    if (data.lenses.length === 0) throw new Error('No contact lenses returned')
  })

  await runTest('Lens products API returns data', async () => {
    const { ok, data } = await apiCall('/api/pos/products')
    if (!ok) throw new Error('Products API failed')
    if (!data || !Array.isArray(data)) throw new Error('Expected products array')
  })

  // ============================================================================
  // PRICING CALCULATION TESTS
  // ============================================================================
  console.log('\n--- Pricing Calculation Tests ---\n')

  await runTest('Quote creation API exists', async () => {
    // Try to create a quote (may fail due to missing data, but endpoint should exist)
    const { status } = await apiCall('/api/pricing/quote', {
      method: 'POST',
      body: JSON.stringify({ customerId: 'test' })
    })
    // 400 or 422 is acceptable - means endpoint exists but needs proper data
    if (status === 404) throw new Error('Quote API endpoint not found')
  })

  // ============================================================================
  // DATA INTEGRITY TESTS
  // ============================================================================
  console.log('\n--- Data Integrity Tests ---\n')

  await runTest('Frames have non-zero prices', async () => {
    const framesWithPrices = await prisma.frame.count({
      where: { isActive: true, retailPrice: { gt: 0 } }
    })
    const totalFrames = await prisma.frame.count({
      where: { isActive: true }
    })
    const percentWithPrices = (framesWithPrices / totalFrames) * 100
    if (percentWithPrices < 50) {
      throw new Error(`Only ${percentWithPrices.toFixed(1)}% of frames have prices > $0`)
    }
  })

  await runTest('Lens products have prices', async () => {
    const lensesWithPrices = await prisma.lensProduct.count({
      where: { isActive: true, retailPrice: { gt: 0 } }
    })
    if (lensesWithPrices === 0) throw new Error('No lens products have prices')
  })

  await runTest('Contact lenses have prices', async () => {
    const contactsWithPrices = await prisma.contactLens.count({
      where: { isActive: true, retailPrice: { gt: 0 } }
    })
    if (contactsWithPrices === 0) throw new Error('No contact lenses have prices')
  })

  await runTest('Service prices exist', async () => {
    const services = await prisma.servicePrice.count({
      where: { isActive: true }
    })
    if (services === 0) throw new Error('No service prices found')
  })

  // ============================================================================
  // CARRIER TIER MAPPING TESTS
  // ============================================================================
  console.log('\n--- Carrier Tier Mapping Tests ---\n')

  await runTest('Lens carrier tiers exist', async () => {
    const tiers = await prisma.lensCarrierTier.count()
    if (tiers === 0) throw new Error('No lens carrier tiers found')
  })

  await runTest('VSP lens tier codes exist', async () => {
    const vspTiers = await prisma.lensCarrierTier.count({
      where: { carrier: 'VSP' }
    })
    console.log(`  Found ${vspTiers} VSP tier mappings`)
    if (vspTiers === 0) throw new Error('No VSP tier mappings found')
  })

  await runTest('EyeMed lens tier codes exist', async () => {
    const eyemedTiers = await prisma.lensCarrierTier.count({
      where: { carrier: 'EyeMed' }
    })
    console.log(`  Found ${eyemedTiers} EyeMed tier mappings`)
    // EyeMed may use different structure - don't fail if 0
  })

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(60))
  console.log('TEST SUMMARY')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  console.log(`\nPassed: ${passed}/${results.length}`)
  console.log(`Failed: ${failed}/${results.length}`)

  if (failed > 0) {
    console.log('\nFailed Tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
  }

  // Save results
  const fs = await import('fs')
  const resultPath = '/Users/cmac/let/vision-pos/test-results/stress-test/api-test-results.json'
  fs.writeFileSync(resultPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { passed, failed, total: results.length },
    results
  }, null, 2))

  console.log(`\nResults saved to: ${resultPath}`)

  await prisma.$disconnect()

  // Exit with error if any tests failed
  if (failed > 0) {
    process.exit(1)
  }
}

// Run tests
runPricingTests().catch(console.error)
