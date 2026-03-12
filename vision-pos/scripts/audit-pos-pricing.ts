#!/usr/bin/env npx tsx
/**
 * POS Pricing Audit Script
 *
 * Systematically tests all product/carrier/context combinations
 * to find edge cases and pricing gaps.
 *
 * Usage: npx tsx scripts/audit-pos-pricing.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { PRODUCT_CATALOG, getAllProducts, Product } from '../src/lib/pricing/product-catalog'

const prisma = new PrismaClient()

interface PriceListData {
  customerId: string
  customerName: string
  carrier: string
  prices: Record<string, number | Record<string, number>>
  contactLens?: {
    examCopay?: number
    fittingCopay?: number
    materialsAllowance?: number
  }
}

interface AuditResult {
  productId: string
  productName: string
  category: string
  carrier: string
  inPriceList: boolean
  priceListValue: number | Record<string, number> | null
  catalogRetail: number
  hasSvMfVariance: boolean
  issue?: string
}

// Exam services not in product catalog
const EXAM_SERVICES = [
  { id: 'routine-exam', name: 'Routine Vision Exam', category: 'exam', retail: 100 },
  { id: 'medical-exam', name: 'Medical Exam', category: 'exam', retail: 100 },
  { id: 'cl-sphere', name: 'CL Fitting - Sphere', category: 'cl_fitting', retail: 75 },
  { id: 'cl-toric', name: 'CL Fitting - Toric', category: 'cl_fitting', retail: 100 },
  { id: 'cl-multifocal', name: 'CL Fitting - Multifocal', category: 'cl_fitting', retail: 150 },
  { id: 'cl-monovision', name: 'CL Fitting - Monovision', category: 'cl_fitting', retail: 120 },
  { id: 'cl-rgp', name: 'CL Fitting - RGP', category: 'cl_fitting', retail: 350 },
  { id: 'cl-specialty', name: 'CL Fitting - Specialty', category: 'cl_fitting', retail: 850 },
  { id: 'cl-orthok', name: 'CL Fitting - Ortho-K', category: 'cl_fitting', retail: 2200 },
  { id: 'cl-misight', name: 'CL Fitting - MiSight', category: 'cl_fitting', retail: 1250 },
  { id: 'optomap', name: 'Optomap', category: 'diagnostic', retail: 39 },
  { id: 'iwellness', name: 'iWellness', category: 'diagnostic', retail: 19 },
  { id: 'oct-retina', name: 'OCT Retina/ON', category: 'diagnostic', retail: 39 },
  { id: 'visual-field', name: 'Visual Field', category: 'diagnostic', retail: 39 },
  { id: 'external-photos', name: 'External Photos', category: 'diagnostic', retail: 29 },
  { id: 'neuro-ha-screen', name: 'Neuro HA Screen', category: 'diagnostic', retail: 89 },
  { id: 'corneal-thickness', name: 'Corneal Thickness', category: 'diagnostic', retail: 29 },
  { id: 'myopia-atropine', name: 'Myopia Atropine', category: 'diagnostic', retail: 350 },
]

async function loadAllPriceLists(): Promise<PriceListData[]> {
  const versions = await prisma.priceListVersion.findMany({
    where: { active: true },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true } },
      priceItems: true,
    },
  })

  return versions.map(v => {
    const priceListData = v.priceListData as Record<string, unknown> | null
    const extractedData = v.extractedData as Record<string, unknown> | null

    // Build prices map from priceListData and priceItems
    const prices: Record<string, number | Record<string, number>> = {}

    // From priceListData JSON
    if (priceListData) {
      const sections = ['LENS TYPES', 'MATERIALS', 'AR COATINGS', 'PHOTOCHROMICS', 'ADD-ONS', 'MOUNT FEES']
      for (const section of sections) {
        const sectionData = priceListData[section]
        if (!Array.isArray(sectionData)) continue

        for (const item of sectionData as Array<{
          productId?: string
          patientCost?: number
          copay?: number
          svCopay?: number
          multiCopay?: number
          hasVariance?: boolean
        }>) {
          const productId = item.productId
          if (!productId) continue

          if (item.hasVariance && item.svCopay !== undefined && item.multiCopay !== undefined) {
            prices[productId] = { sv: item.svCopay, mf: item.multiCopay }
          } else if (item.patientCost !== undefined) {
            prices[productId] = item.patientCost
          } else if (item.copay !== undefined) {
            prices[productId] = item.copay
          }
        }
      }
    }

    // From priceItems table
    for (const item of v.priceItems) {
      if (prices[item.productId] !== undefined) continue
      const finalPrice = item.finalPrice ? Number(item.finalPrice) : Number(item.retailPrice)
      prices[item.productId] = finalPrice
    }

    // Contact lens data
    const contactLens = extractedData?.contactLens as {
      examCopay?: number
      necessaryCopay?: number
      materialsAllowance?: number
    } | null

    return {
      customerId: v.customer.id,
      customerName: `${v.customer.firstName} ${v.customer.lastName}`,
      carrier: v.insuranceCarrier || 'Unknown',
      prices,
      contactLens: contactLens ? {
        examCopay: contactLens.examCopay,
        fittingCopay: contactLens.examCopay, // Same as examCopay for VSP
        materialsAllowance: contactLens.materialsAllowance,
      } : undefined,
    }
  })
}

function auditPriceList(priceList: PriceListData): AuditResult[] {
  const results: AuditResult[] = []
  const allProducts = getAllProducts()

  // Audit catalog products
  for (const product of allProducts) {
    const priceValue = priceList.prices[product.id]
    const inPriceList = priceValue !== undefined
    const hasSvMfVariance = typeof priceValue === 'object' && priceValue !== null

    let issue: string | undefined

    // Check for potential issues
    if (!inPriceList && !product.cashOnly) {
      // Product should be in price list but isn't
      if (product.id !== 'cr39' && product.id !== 'fullRim' && product.id !== 'none') {
        issue = 'Missing from price list - will fall back to retail'
      }
    }

    if (inPriceList && typeof priceValue === 'number' && priceValue < 0) {
      issue = 'Negative price value'
    }

    // Materials should have SV/MF variance for VSP
    if (priceList.carrier === 'VSP' &&
        product.category === 'lens_material' &&
        product.id !== 'cr39' &&
        !hasSvMfVariance) {
      issue = 'VSP material missing SV/MF variance'
    }

    results.push({
      productId: product.id,
      productName: product.name,
      category: product.category,
      carrier: priceList.carrier,
      inPriceList,
      priceListValue: priceValue ?? null,
      catalogRetail: product.retail,
      hasSvMfVariance,
      issue,
    })
  }

  // Audit exam services
  for (const service of EXAM_SERVICES) {
    let priceValue: number | null = null
    let inPriceList = false
    let issue: string | undefined

    if (service.category === 'cl_fitting') {
      // Standard CL fittings should use contactLens.fittingCopay
      if (['cl-sphere', 'cl-toric', 'cl-multifocal', 'cl-monovision', 'cl-rgp'].includes(service.id)) {
        priceValue = priceList.contactLens?.fittingCopay ?? null
        inPriceList = priceValue !== null
        if (!inPriceList) {
          issue = 'CL fitting copay missing from price list'
        }
      } else {
        // Specialty fittings - should be retail
        priceValue = null
        inPriceList = false
      }
    } else if (service.id === 'routine-exam') {
      // Routine exam - should check if extractedData has exam copay
      // For now, this comes from authorization, not price list
      issue = 'Uses authorization examCopay, not price list'
    } else if (service.category === 'diagnostic') {
      // Diagnostics - not covered, should be retail
      // No issue - this is expected
    }

    results.push({
      productId: service.id,
      productName: service.name,
      category: service.category,
      carrier: priceList.carrier,
      inPriceList,
      priceListValue: priceValue,
      catalogRetail: service.retail,
      hasSvMfVariance: false,
      issue,
    })
  }

  return results
}

async function main() {
  console.log('\n🔍 POS PRICING AUDIT\n')
  console.log('=' .repeat(80))

  // Load all price lists
  const priceLists = await loadAllPriceLists()
  console.log(`\nFound ${priceLists.length} active price lists\n`)

  // Group by carrier
  const byCarrier: Record<string, PriceListData[]> = {}
  for (const pl of priceLists) {
    if (!byCarrier[pl.carrier]) byCarrier[pl.carrier] = []
    byCarrier[pl.carrier].push(pl)
  }

  console.log('Price lists by carrier:')
  for (const [carrier, lists] of Object.entries(byCarrier)) {
    console.log(`  ${carrier}: ${lists.length} customers`)
  }

  // Audit each price list and collect issues
  const allIssues: { customer: string; carrier: string; issue: AuditResult }[] = []
  const coverageByCarrier: Record<string, { total: number; covered: number }> = {}

  for (const priceList of priceLists) {
    const results = auditPriceList(priceList)

    // Track coverage
    if (!coverageByCarrier[priceList.carrier]) {
      coverageByCarrier[priceList.carrier] = { total: 0, covered: 0 }
    }

    for (const result of results) {
      coverageByCarrier[priceList.carrier].total++
      if (result.inPriceList) {
        coverageByCarrier[priceList.carrier].covered++
      }

      if (result.issue) {
        allIssues.push({
          customer: priceList.customerName,
          carrier: priceList.carrier,
          issue: result,
        })
      }
    }
  }

  // Print coverage summary
  console.log('\n' + '=' .repeat(80))
  console.log('COVERAGE SUMMARY')
  console.log('=' .repeat(80))

  for (const [carrier, stats] of Object.entries(coverageByCarrier)) {
    const pct = ((stats.covered / stats.total) * 100).toFixed(1)
    console.log(`\n${carrier}:`)
    console.log(`  Products in price list: ${stats.covered}/${stats.total} (${pct}%)`)
  }

  // Print issues grouped by type
  console.log('\n' + '=' .repeat(80))
  console.log('ISSUES FOUND')
  console.log('=' .repeat(80))

  const issuesByType: Record<string, typeof allIssues> = {}
  for (const item of allIssues) {
    const key = item.issue.issue || 'Unknown'
    if (!issuesByType[key]) issuesByType[key] = []
    issuesByType[key].push(item)
  }

  for (const [issueType, items] of Object.entries(issuesByType)) {
    console.log(`\n📛 ${issueType} (${items.length} occurrences)`)

    // Show unique product/carrier combinations
    const unique = new Map<string, typeof items[0]>()
    for (const item of items) {
      const key = `${item.issue.productId}|${item.carrier}`
      if (!unique.has(key)) unique.set(key, item)
    }

    for (const [_, item] of unique) {
      console.log(`   - ${item.issue.productName} (${item.issue.productId}) [${item.carrier}]`)
    }
  }

  // Product coverage matrix
  console.log('\n' + '=' .repeat(80))
  console.log('PRODUCT COVERAGE MATRIX')
  console.log('=' .repeat(80))

  const carriers = Object.keys(byCarrier)
  const allProductIds = [...getAllProducts().map(p => p.id), ...EXAM_SERVICES.map(s => s.id)]

  // Check which products are covered by which carriers
  const matrix: Record<string, Record<string, boolean>> = {}

  for (const productId of allProductIds) {
    matrix[productId] = {}
    for (const carrier of carriers) {
      // Check if ANY price list for this carrier has this product
      const hasProduct = byCarrier[carrier].some(pl => {
        if (pl.prices[productId] !== undefined) return true
        // Check CL fittings
        if (['cl-sphere', 'cl-toric', 'cl-multifocal', 'cl-monovision', 'cl-rgp'].includes(productId)) {
          return pl.contactLens?.fittingCopay !== undefined
        }
        return false
      })
      matrix[productId][carrier] = hasProduct
    }
  }

  // Print matrix
  console.log(`\n${'Product'.padEnd(25)} | ${carriers.map(c => c.padEnd(10)).join(' | ')}`)
  console.log('-'.repeat(25 + carriers.length * 13))

  for (const productId of allProductIds) {
    const product = getAllProducts().find(p => p.id === productId) || EXAM_SERVICES.find(s => s.id === productId)
    const name = product?.name?.substring(0, 22) || productId
    const row = carriers.map(c => matrix[productId][c] ? '✅'.padEnd(10) : '❌'.padEnd(10)).join(' | ')
    console.log(`${name.padEnd(25)} | ${row}`)
  }

  // Summary
  console.log('\n' + '=' .repeat(80))
  console.log('RECOMMENDATIONS')
  console.log('=' .repeat(80))

  const missingProducts = allProductIds.filter(id =>
    !carriers.every(c => matrix[id][c]) &&
    !['cr39', 'fullRim', 'none', 'medical-exam'].includes(id) &&
    !EXAM_SERVICES.find(s => s.id === id && s.category === 'diagnostic')
  )

  if (missingProducts.length > 0) {
    console.log('\n⚠️  Products not consistently in price lists:')
    for (const id of missingProducts) {
      const product = getAllProducts().find(p => p.id === id) || EXAM_SERVICES.find(s => s.id === id)
      const missingCarriers = carriers.filter(c => !matrix[id][c])
      console.log(`   - ${product?.name || id}: missing from ${missingCarriers.join(', ')}`)
    }
  }

  console.log('\n✅ Products correctly at retail (not vision-covered):')
  console.log('   - medical-exam (billed to medical insurance)')
  console.log('   - All diagnostics (optomap, iwellness, oct-retina, etc.)')
  console.log('   - Specialty CL fittings (cl-specialty, cl-orthok, cl-misight)')

  console.log('\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
