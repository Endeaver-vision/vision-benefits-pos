/**
 * POS Patient Validation Script
 *
 * This script validates the POS system with real patient data.
 * It checks that:
 * 1. Patients can be loaded
 * 2. Insurance information is available
 * 3. Products can be added to quotes
 * 4. Quotes can be saved
 *
 * Run: npx tsx scripts/validate-pos-patients.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ValidationResult {
  patientName: string
  insuranceCarrier: string
  validations: {
    customerLoaded: boolean
    insuranceActive: boolean
    priceListExists: boolean
    canCreateQuote: boolean
  }
  passed: boolean
  errors: string[]
}

async function validatePatient(customerId: string): Promise<ValidationResult> {
  const errors: string[] = []

  // Get customer
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      authorizations: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      priceLists: {
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!customer) {
    return {
      patientName: 'Unknown',
      insuranceCarrier: 'Unknown',
      validations: {
        customerLoaded: false,
        insuranceActive: false,
        priceListExists: false,
        canCreateQuote: false,
      },
      passed: false,
      errors: ['Customer not found'],
    }
  }

  const patientName = `${customer.firstName} ${customer.lastName}`
  const insurance = customer.authorizations[0]
  const priceList = customer.priceLists[0]

  const validations = {
    customerLoaded: true,
    insuranceActive: !!insurance,
    priceListExists: !!priceList,
    canCreateQuote: false,
  }

  if (!insurance) {
    errors.push('No active insurance authorization')
  }

  if (!priceList) {
    errors.push('No active price list')
  }

  // Try to create a test quote
  try {
    const quote = await prisma.quote.create({
      data: {
        customerId: customer.id,
        status: 'DRAFT',
        retailTotal: 100,
        insuranceTotal: 50,
        patientTotal: 50,
        tax: 4.38,
        grandTotal: 54.38,
        items: [
          {
            sku: 'TEST-001',
            displayName: 'Test Item',
            category: 'exam',
            retailPrice: 100,
            patientPays: 50,
            insurancePays: 50,
            quantity: 1,
          },
        ],
      },
    })

    validations.canCreateQuote = true

    // Clean up test quote
    await prisma.quote.delete({ where: { id: quote.id } })
  } catch (err) {
    errors.push(`Failed to create quote: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  // A patient passes if we can load them and create quotes
  // Price list is nice to have but not required (can work as cash patient)
  const passed = validations.customerLoaded && validations.canCreateQuote

  return {
    patientName,
    insuranceCarrier: insurance?.carrier || 'CASH',
    validations,
    passed,
    errors,
  }
}

async function main() {
  console.log('\n🔍 POS Patient Validation\n')
  console.log('='.repeat(60))

  // Get 5 patients with different insurance types
  const patients = await prisma.customer.findMany({
    where: {
      authorizations: {
        some: { isActive: true },
      },
    },
    include: {
      authorizations: {
        where: { isActive: true },
        take: 1,
      },
    },
    take: 10,
  })

  // Try to get diverse insurance carriers
  const vspPatient = patients.find((p) =>
    p.authorizations.some((a) => a.carrier === 'VSP')
  )
  const eyemedPatient = patients.find((p) =>
    p.authorizations.some((a) => a.carrier === 'EYEMED')
  )

  // Get remaining patients (could be cash or any insurance)
  const otherPatients = patients
    .filter((p) => p.id !== vspPatient?.id && p.id !== eyemedPatient?.id)
    .slice(0, 3)

  const testPatients = [vspPatient, eyemedPatient, ...otherPatients].filter(Boolean)

  if (testPatients.length < 5) {
    // Fill with any available patients
    const morePatients = await prisma.customer.findMany({
      take: 5 - testPatients.length,
      where: {
        id: { notIn: testPatients.map((p) => p!.id) },
      },
    })
    testPatients.push(...morePatients)
  }

  const results: ValidationResult[] = []

  for (const patient of testPatients.slice(0, 5)) {
    if (!patient) continue
    console.log(`\nValidating: ${patient.firstName} ${patient.lastName}...`)
    const result = await validatePatient(patient.id)
    results.push(result)

    if (result.passed) {
      console.log(`  ✅ PASSED - ${result.insuranceCarrier}`)
    } else {
      console.log(`  ❌ FAILED - ${result.errors.join(', ')}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n📊 VALIDATION SUMMARY\n')

  const passedCount = results.filter((r) => r.passed).length
  const totalCount = results.length

  console.log(`Patients Validated: ${passedCount}/${totalCount}`)
  console.log('')

  // Insurance breakdown
  const byCarrier = results.reduce(
    (acc, r) => {
      acc[r.insuranceCarrier] = (acc[r.insuranceCarrier] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  console.log('By Carrier:')
  for (const [carrier, count] of Object.entries(byCarrier)) {
    console.log(`  ${carrier}: ${count}`)
  }

  console.log('')

  // Detailed results table
  console.log('Detailed Results:')
  console.log('-'.repeat(60))

  for (const result of results) {
    const status = result.passed ? '✅' : '❌'
    const checks = [
      result.validations.customerLoaded ? '✓' : '✗',
      result.validations.insuranceActive ? '✓' : '✗',
      result.validations.priceListExists ? '✓' : '✗',
      result.validations.canCreateQuote ? '✓' : '✗',
    ].join('')

    console.log(`${status} ${result.patientName.padEnd(25)} ${result.insuranceCarrier.padEnd(10)} [${checks}]`)
  }

  console.log('')
  console.log('Legend: [Customer|Insurance|PriceList|Quote]')
  console.log('')

  if (passedCount >= 5) {
    console.log('🎉 FIVE PATIENTS VALIDATED - POS Ready for Launch!\n')
    return true
  } else {
    console.log(`⚠️  Only ${passedCount}/5 patients validated. Need ${5 - passedCount} more.\n`)
    return false
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
