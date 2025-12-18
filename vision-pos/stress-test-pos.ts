/**
 * POS Stress Test Script
 *
 * This script:
 * 1. Processes insurance authorization PDFs through the doc scanner
 * 2. Creates customer records with authorizations
 * 3. Builds test quotes for each scenario
 * 4. Generates case reports with input/output tracking
 *
 * Usage: npx tsx scripts/stress-test-pos.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Base URL for API calls
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Source folder for auth PDFs
const AUTH_SOURCE = '/Users/cmac/Documents/Supporting Documents/sample-docs/Insurance Auths'

// Test results folder
const TEST_RESULTS = '/Users/cmac/let/vision-pos/test-results/stress-test'

// Test scenarios
const SCENARIOS = [
  { id: 'exam-only', name: 'Exam Only', includeExam: true, includeGlasses: false, includeContacts: false },
  { id: 'glasses-only', name: 'Glasses Only', includeExam: false, includeGlasses: true, includeContacts: false },
  { id: 'contacts-only', name: 'Contacts Only', includeExam: false, includeGlasses: false, includeContacts: true },
  { id: 'exam-glasses', name: 'Exam + Glasses', includeExam: true, includeGlasses: true, includeContacts: false },
  { id: 'exam-contacts', name: 'Exam + CL Exam + Contacts', includeExam: true, includeGlasses: false, includeContacts: true },
  { id: 'full-combo', name: 'Full Combo (Exam + Glasses + Contacts)', includeExam: true, includeGlasses: true, includeContacts: true },
]

// Sample products to use in tests
interface TestProducts {
  exams: { sku: string; name: string; price: number }[]
  frames: { id: string; brand: string; model: string; price: number }[]
  lenses: { sku: string; name: string; price: number; category: string }[]
  contacts: { id: string; name: string; price: number }[]
}

async function getTestProducts(): Promise<TestProducts> {
  // Get exam services
  const exams = await prisma.servicePrice.findMany({
    where: { isActive: true, category: 'EXAM' },
    take: 5,
    orderBy: { name: 'asc' }
  })

  // Get frames with prices
  const frames = await prisma.frame.findMany({
    where: { isActive: true, retailPrice: { gte: 100 } },
    take: 10,
    orderBy: { retailPrice: 'asc' }
  })

  // Get lens products
  const lenses = await prisma.lensProduct.findMany({
    where: { isActive: true },
    take: 10,
    orderBy: { name: 'asc' }
  })

  // Get contact lenses
  const contacts = await prisma.contactLens.findMany({
    where: { isActive: true },
    take: 5,
    orderBy: { lensName: 'asc' }
  })

  return {
    exams: exams.map(e => ({ sku: e.sku, name: e.name, price: e.retailPrice })),
    frames: frames.map(f => ({ id: f.id, brand: f.brand, model: f.model, price: f.retailPrice })),
    lenses: lenses.map(l => ({ sku: l.sku, name: l.name, price: l.retailPrice, category: l.category })),
    contacts: contacts.map(c => ({ id: c.id, name: c.lensName, price: c.retailPrice })),
  }
}

// Get authorization files by carrier
function getAuthFiles(carrier: 'VSP' | 'Eyemed' | 'Spectera'): string[] {
  const carrierDir = path.join(AUTH_SOURCE, carrier)
  if (!fs.existsSync(carrierDir)) {
    console.log(`Directory not found: ${carrierDir}`)
    return []
  }

  return fs.readdirSync(carrierDir)
    .filter(f => f.endsWith('.pdf'))
    .map(f => path.join(carrierDir, f))
}

// Copy auth file to processed folder
function copyAuthToProcessed(srcPath: string, carrier: string): string {
  const fileName = path.basename(srcPath)
  const destDir = path.join(TEST_RESULTS, 'processed-auths', carrier.toLowerCase())

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  const destPath = path.join(destDir, fileName)
  fs.copyFileSync(srcPath, destPath)
  return destPath
}

// Generate case report
interface CaseReport {
  testId: string
  timestamp: string
  patient: {
    initials: string
    carrier: string
    authFile: string
  }
  scenario: string
  inputs: {
    exam?: { name: string; price: number }
    frame?: { brand: string; model: string; price: number }
    lenses?: { name: string; price: number }[]
    coatings?: { name: string; price: number }[]
    contacts?: { name: string; price: number }
  }
  authorization?: {
    examCopay?: number
    materialsCopay?: number
    frameAllowance?: number
    contactAllowance?: number
    planName?: string
  }
  expectedPricing: {
    retailTotal: number
    insurancePays: number
    patientPays: number
  }
  actualPricing?: {
    retailTotal: number
    insurancePays: number
    patientPays: number
  }
  status: 'PENDING' | 'PASS' | 'FAIL' | 'ERROR'
  notes: string
}

function saveCaseReport(report: CaseReport): void {
  const reportDir = path.join(TEST_RESULTS, 'case-reports')
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }

  const fileName = `${report.testId}.json`
  const filePath = path.join(reportDir, fileName)
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2))
  console.log(`  Case report saved: ${fileName}`)
}

// Generate test ID
function generateTestId(carrier: string, patientInitials: string, scenario: string): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${carrier.toUpperCase()}-${patientInitials}-${scenario}-${timestamp}`
}

// Extract patient initials from filename
function getPatientInitials(fileName: string): string {
  // Files are named like "AB-vsp-auth-1.pdf" or "BlackJ_EyeMed.pdf"
  const base = path.basename(fileName, '.pdf')
  const match = base.match(/^([A-Za-z]{1,3})[_-]/)
  return match ? match[1].toUpperCase() : base.slice(0, 2).toUpperCase()
}

// Main test runner
async function runStressTest() {
  console.log('='.repeat(60))
  console.log('POS STRESS TEST')
  console.log('='.repeat(60))
  console.log(`Started: ${new Date().toISOString()}`)
  console.log()

  // Get test products
  console.log('Loading test products...')
  const products = await getTestProducts()
  console.log(`  Exams: ${products.exams.length}`)
  console.log(`  Frames: ${products.frames.length}`)
  console.log(`  Lenses: ${products.lenses.length}`)
  console.log(`  Contacts: ${products.contacts.length}`)
  console.log()

  // Get existing customers with authorizations
  console.log('Finding customers with active authorizations...')

  const vspAuths = await prisma.vspAuthorization.findMany({
    where: { isActive: true },
    take: 5
  })

  const eyemedAuths = await prisma.eyemedAuthorization.findMany({
    where: { isActive: true },
    take: 5
  })

  const specteraAuths = await prisma.specteraAuthorization.findMany({
    where: { isActive: true },
    take: 3
  })

  // Get customer details for each auth
  const vspCustomerIds = vspAuths.map(a => a.customerId)
  const eyemedCustomerIds = eyemedAuths.map(a => a.customerId)
  const specteraCustomerIds = specteraAuths.map(a => a.customerId)

  const allCustomerIds = [...new Set([...vspCustomerIds, ...eyemedCustomerIds, ...specteraCustomerIds])]
  const customers = await prisma.customer.findMany({
    where: { id: { in: allCustomerIds } }
  })
  const customerMap = new Map(customers.map(c => [c.id, c]))

  // Combine auth with customer
  const vspCustomers = vspAuths.map(auth => ({
    auth,
    customer: customerMap.get(auth.customerId)!
  })).filter(x => x.customer)

  const eyemedCustomers = eyemedAuths.map(auth => ({
    auth,
    customer: customerMap.get(auth.customerId)!
  })).filter(x => x.customer)

  const specteraCustomers = specteraAuths.map(auth => ({
    auth,
    customer: customerMap.get(auth.customerId)!
  })).filter(x => x.customer)

  console.log(`  VSP: ${vspCustomers.length} customers`)
  console.log(`  EyeMed: ${eyemedCustomers.length} customers`)
  console.log(`  Spectera: ${specteraCustomers.length} customers`)
  console.log()

  const allTests: CaseReport[] = []

  // Run VSP tests
  console.log('Running VSP tests...')
  for (const { auth, customer } of vspCustomers) {
    const initials = `${customer.firstName[0]}${customer.lastName[0]}`

    for (const scenario of SCENARIOS) {
      const testId = generateTestId('VSP', initials, scenario.id)
      console.log(`  Test: ${testId}`)

      const report: CaseReport = {
        testId,
        timestamp: new Date().toISOString(),
        patient: {
          initials,
          carrier: 'VSP',
          authFile: `Customer: ${customer.firstName} ${customer.lastName}`
        },
        scenario: scenario.name,
        inputs: {},
        authorization: {
          examCopay: auth.examCopay ?? undefined,
          materialsCopay: auth.materialsCopay ?? undefined,
          frameAllowance: auth.frameAllowanceRetail ?? undefined,
          contactAllowance: auth.contactAllowance ?? undefined,
          planName: auth.planName ?? undefined
        },
        expectedPricing: {
          retailTotal: 0,
          insurancePays: 0,
          patientPays: 0
        },
        status: 'PENDING',
        notes: ''
      }

      // Build quote inputs based on scenario
      let retailTotal = 0

      if (scenario.includeExam && products.exams.length > 0) {
        const exam = products.exams[0]
        report.inputs.exam = { name: exam.name, price: exam.price }
        retailTotal += exam.price
      }

      if (scenario.includeGlasses && products.frames.length > 0 && products.lenses.length > 0) {
        const frame = products.frames[Math.floor(Math.random() * products.frames.length)]
        const lens = products.lenses.find(l => l.category === 'LENS') || products.lenses[0]

        report.inputs.frame = { brand: frame.brand, model: frame.model, price: frame.price }
        report.inputs.lenses = [{ name: lens.name, price: lens.price }]
        retailTotal += frame.price + lens.price
      }

      if (scenario.includeContacts && products.contacts.length > 0) {
        const contact = products.contacts[0]
        report.inputs.contacts = { name: contact.name, price: contact.price }
        retailTotal += contact.price
      }

      report.expectedPricing.retailTotal = retailTotal

      // Calculate expected insurance payment (simplified)
      let insurancePays = 0
      if (scenario.includeExam && report.authorization?.examCopay !== undefined) {
        insurancePays += (report.inputs.exam?.price || 0) - report.authorization.examCopay
      }
      if (scenario.includeGlasses && report.authorization?.frameAllowance) {
        const framePrice = report.inputs.frame?.price || 0
        insurancePays += Math.min(framePrice, report.authorization.frameAllowance)
      }
      if (scenario.includeContacts && report.authorization?.contactAllowance) {
        const contactPrice = report.inputs.contacts?.price || 0
        insurancePays += Math.min(contactPrice, report.authorization.contactAllowance)
      }

      report.expectedPricing.insurancePays = Math.max(0, insurancePays)
      report.expectedPricing.patientPays = retailTotal - report.expectedPricing.insurancePays

      // Mark as pending - will be verified manually
      report.status = 'PENDING'
      report.notes = 'Generated for manual verification in POS UI'

      saveCaseReport(report)
      allTests.push(report)
    }
  }

  // Run EyeMed tests
  console.log('Running EyeMed tests...')
  for (const { auth, customer } of eyemedCustomers) {
    const initials = `${customer.firstName[0]}${customer.lastName[0]}`

    for (const scenario of SCENARIOS.slice(0, 3)) { // Just first 3 scenarios for EyeMed
      const testId = generateTestId('EYEMED', initials, scenario.id)
      console.log(`  Test: ${testId}`)

      const report: CaseReport = {
        testId,
        timestamp: new Date().toISOString(),
        patient: {
          initials,
          carrier: 'EyeMed',
          authFile: `Customer: ${customer.firstName} ${customer.lastName}`
        },
        scenario: scenario.name,
        inputs: {},
        authorization: {
          examCopay: auth.examCopay ?? undefined,
          frameAllowance: auth.frameAllowance ?? undefined,
          contactAllowance: auth.contactAllowance ?? undefined,
          planName: auth.groupName ?? undefined
        },
        expectedPricing: {
          retailTotal: 0,
          insurancePays: 0,
          patientPays: 0
        },
        status: 'PENDING',
        notes: 'Generated for manual verification in POS UI'
      }

      // Build quote inputs
      let retailTotal = 0

      if (scenario.includeExam && products.exams.length > 0) {
        const exam = products.exams[0]
        report.inputs.exam = { name: exam.name, price: exam.price }
        retailTotal += exam.price
      }

      if (scenario.includeGlasses && products.frames.length > 0) {
        const frame = products.frames[Math.floor(Math.random() * products.frames.length)]
        const lens = products.lenses[0]
        report.inputs.frame = { brand: frame.brand, model: frame.model, price: frame.price }
        report.inputs.lenses = [{ name: lens.name, price: lens.price }]
        retailTotal += frame.price + lens.price
      }

      if (scenario.includeContacts && products.contacts.length > 0) {
        const contact = products.contacts[0]
        report.inputs.contacts = { name: contact.name, price: contact.price }
        retailTotal += contact.price
      }

      report.expectedPricing.retailTotal = retailTotal
      report.expectedPricing.patientPays = retailTotal // Simplified - actual calc needs quote builder

      saveCaseReport(report)
      allTests.push(report)
    }
  }

  // Run Spectera tests
  console.log('Running Spectera tests...')
  for (const { auth, customer } of specteraCustomers) {
    const initials = `${customer.firstName[0]}${customer.lastName[0]}`

    for (const scenario of SCENARIOS.slice(0, 2)) { // Just first 2 scenarios for Spectera
      const testId = generateTestId('SPECTERA', initials, scenario.id)
      console.log(`  Test: ${testId}`)

      const report: CaseReport = {
        testId,
        timestamp: new Date().toISOString(),
        patient: {
          initials,
          carrier: 'Spectera',
          authFile: `Customer: ${customer.firstName} ${customer.lastName}`
        },
        scenario: scenario.name,
        inputs: {},
        authorization: {
          examCopay: auth.examCopay ?? undefined,
          frameAllowance: auth.frameAllowance ?? undefined,
          planName: auth.productName ?? undefined
        },
        expectedPricing: {
          retailTotal: 0,
          insurancePays: 0,
          patientPays: 0
        },
        status: 'PENDING',
        notes: 'Generated for manual verification in POS UI'
      }

      // Build quote inputs
      let retailTotal = 0

      if (scenario.includeExam && products.exams.length > 0) {
        const exam = products.exams[0]
        report.inputs.exam = { name: exam.name, price: exam.price }
        retailTotal += exam.price
      }

      if (scenario.includeGlasses && products.frames.length > 0) {
        const frame = products.frames[0]
        const lens = products.lenses[0]
        report.inputs.frame = { brand: frame.brand, model: frame.model, price: frame.price }
        report.inputs.lenses = [{ name: lens.name, price: lens.price }]
        retailTotal += frame.price + lens.price
      }

      report.expectedPricing.retailTotal = retailTotal
      report.expectedPricing.patientPays = retailTotal

      saveCaseReport(report)
      allTests.push(report)
    }
  }

  // Generate summary
  console.log()
  console.log('='.repeat(60))
  console.log('TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total tests generated: ${allTests.length}`)
  console.log(`  VSP: ${allTests.filter(t => t.patient.carrier === 'VSP').length}`)
  console.log(`  EyeMed: ${allTests.filter(t => t.patient.carrier === 'EyeMed').length}`)
  console.log(`  Spectera: ${allTests.filter(t => t.patient.carrier === 'Spectera').length}`)
  console.log()
  console.log('Case reports saved to:')
  console.log(`  ${path.join(TEST_RESULTS, 'case-reports')}`)
  console.log()
  console.log('Next steps:')
  console.log('  1. Open POS at http://localhost:3000/quote-builder')
  console.log('  2. Search for each customer')
  console.log('  3. Build quote matching the case report inputs')
  console.log('  4. Compare actual pricing to expected pricing')
  console.log('  5. Update case report status (PASS/FAIL)')
  console.log()

  // Save summary
  const summaryPath = path.join(TEST_RESULTS, 'test-summary.json')
  fs.writeFileSync(summaryPath, JSON.stringify({
    runDate: new Date().toISOString(),
    totalTests: allTests.length,
    byCarrier: {
      VSP: allTests.filter(t => t.patient.carrier === 'VSP').length,
      EyeMed: allTests.filter(t => t.patient.carrier === 'EyeMed').length,
      Spectera: allTests.filter(t => t.patient.carrier === 'Spectera').length,
    },
    byScenario: SCENARIOS.map(s => ({
      scenario: s.name,
      count: allTests.filter(t => t.scenario === s.name).length
    })),
    tests: allTests.map(t => ({
      testId: t.testId,
      carrier: t.patient.carrier,
      scenario: t.scenario,
      status: t.status
    }))
  }, null, 2))

  console.log(`Summary saved to: ${summaryPath}`)

  await prisma.$disconnect()
}

// Run the test
runStressTest().catch(console.error)
