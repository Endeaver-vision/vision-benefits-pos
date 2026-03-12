/**
 * Test VSP Pricer for a single patient
 * Usage: npx tsx scripts/test-vsp-patient.ts <auth_pdf> <lens_pdf>
 */

import fs from 'fs'
import path from 'path'

const VSP_DIR = './public/uploads/insurance-docs/vsp'

// Define 5 test patients with their PDF pairs
const PATIENTS = [
  {
    name: 'Christopher Lutz (CL)',
    auth: 'cust_christopher_lutz_1769268251567_CL_vspauth.pdf',
    lens: 'cust_christopher_lutz_1769268274347_CL_vsplens.pdf',
  },
  {
    name: 'SM',
    auth: 'cminudpyypdtbojot85p_1769610234316_SM_vspauth.pdf',
    lens: 'cminudpyypdtbojot85p_1769610260440_SM_vsplens.pdf',
  },
  {
    name: 'SA',
    auth: 'cmkskn5ro0002jp5tqwjfule4_1769274982909_SA_Auth-VSP.pdf',
    lens: 'cmkskn5ro0002jp5tqwjfule4_1769275009067_SA_Lens-Enhancement-VSP.pdf',
  },
  {
    name: 'MK',
    auth: 'cmkskkrmp0000jp5tdxia6s0a_1769274871267_MK_Auth-VSP.pdf',
    lens: 'cmkskkrmp0000jp5tdxia6s0a_1769274897161_MK_Lens-Enhancement-VSP.pdf',
  },
  {
    name: 'TR',
    auth: 'cmip8umq001zajp8iot18ykcl_1769443325873_TR_Auth-VSP.pdf',
    lens: 'cmip8umq001zajp8iot18ykcl_1769443326401_TR_Lens-Enhancement-VSP.pdf',
  },
]

// Retail prices from FINAL_PRODUCT_PRICELIST.csv
const RETAIL_PRICES: Record<string, number> = {
  // Lens Types
  'Single Vision': 80,
  'Eyezen': 130,
  'FT Bifocal': 182,
  'Varilux Comfort DRx': 280,
  'Varilux Comfort Max': 394,
  'Varilux X': 600,
  // Materials
  'Polycarbonate': 65,
  'Trivex': 75,
  '1.67': 130,
  '1.72': 150,
  // AR Coatings
  'Crizal Sapphire': 187,
  'Crizal Rock': 158,
  'Crizal EZ Pro': 111,
  // Transitions
  'Transitions Gen S': 160,
  'Transitions Xtra Active': 160,
  // Polarized
  'Polarized': 180,
  // Mount
  'Semi-Rimless': 35,
  'Rimless': 45,
  // Add-ons
  'Tint': 30,
}

async function testPatient(patientIndex: number) {
  const patient = PATIENTS[patientIndex]
  if (!patient) {
    console.error(`Invalid patient index: ${patientIndex}`)
    process.exit(1)
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`PATIENT ${patientIndex + 1}: ${patient.name}`)
  console.log(`${'='.repeat(60)}\n`)

  const authPath = path.join(VSP_DIR, patient.auth)
  const lensPath = path.join(VSP_DIR, patient.lens)

  if (!fs.existsSync(authPath)) {
    console.error(`Auth PDF not found: ${authPath}`)
    return { success: false, error: 'Auth PDF not found' }
  }
  if (!fs.existsSync(lensPath)) {
    console.error(`Lens PDF not found: ${lensPath}`)
    return { success: false, error: 'Lens PDF not found' }
  }

  const authBase64 = fs.readFileSync(authPath).toString('base64')
  const lensBase64 = fs.readFileSync(lensPath).toString('base64')

  console.log('Step 1: Extracting VSP documents...')

  // Call the extraction API
  const extractResponse = await fetch('http://localhost:3000/api/vsp/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      authFormBase64: authBase64,
      enhancementFormBase64: lensBase64,
      mode: 'full',
    }),
  })

  if (!extractResponse.ok) {
    const error = await extractResponse.text()
    console.error('Extraction failed:', error)
    return { success: false, error: `Extraction failed: ${error}` }
  }

  const extractResult = await extractResponse.json()

  if (!extractResult.success) {
    console.error('Extraction error:', extractResult.errors)
    return { success: false, error: extractResult.errors }
  }

  const auth = extractResult.authorization
  console.log(`\n✓ Extracted: ${auth.patientInfo.name}`)
  console.log(`  Auth #: ${auth.patientInfo.authNumber}`)
  console.log(`  Plan: ${auth.planInfo.planType}`)
  console.log(`  Frame Allowance: $${auth.frameAllowance.amount}`)
  console.log(`  Material Copay: $${auth.copays.material}`)

  console.log('\nStep 2: Generating price list...')

  // Call the price list API
  const priceResponse = await fetch('http://localhost:3000/api/vsp/price-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorization: auth }),
  })

  if (!priceResponse.ok) {
    const error = await priceResponse.text()
    console.error('Price list generation failed:', error)
    return { success: false, error: `Price list failed: ${error}` }
  }

  const priceResult = await priceResponse.json()

  if (!priceResult.success) {
    console.error('Price list error:', priceResult.error)
    return { success: false, error: priceResult.error }
  }

  console.log(`\n✓ Generated ${priceResult.summary.totalProducts} products`)
  console.log(`  Covered: ${priceResult.summary.coveredProducts}`)
  console.log(`  Cash Only: ${priceResult.summary.cashOnlyProducts}`)

  console.log('\nStep 3: Validating prices...')

  // Output key pricing data for validation
  console.log('\n--- EXTRACTED COPAY DATA ---')
  console.log('Progressive Tiers:')
  console.log(`  K (Standard): $${auth.progressives.K_standard}`)
  console.log(`  J (Premium): $${auth.progressives.J_premium}`)
  console.log(`  F (Premium Adv): $${auth.progressives.F_premium_adv}`)
  console.log(`  O (Custom): $${auth.progressives.O_custom}`)
  console.log(`  N (Custom): $${auth.progressives.N_custom}`)

  console.log('\nMaterial Upgrades:')
  console.log(`  Poly SV: $${auth.materials.polycarbonate_sv}`)
  console.log(`  Poly Multi: $${auth.materials.polycarbonate_multi}`)
  console.log(`  Trivex SV: $${auth.materials.trivex_sv}`)
  console.log(`  Trivex Multi: $${auth.materials.trivex_multi}`)
  console.log(`  1.67 SV: $${auth.materials.hi_index_167_sv}`)
  console.log(`  1.67 Multi: $${auth.materials.hi_index_167_multi}`)

  console.log('\nAR Coatings:')
  console.log(`  QM (Standard): $${auth.arCoatings.QM}`)
  console.log(`  QT (Premium 1): $${auth.arCoatings.QT}`)
  console.log(`  QV (Premium 2): $${auth.arCoatings.QV}`)

  console.log('\nEnhancements:')
  console.log(`  PR (Photochromic): $${auth.enhancements.PR}`)
  console.log(`  DA (Polarized): $${auth.enhancements.DA}`)

  console.log('\nCoverage Status:')
  console.log(`  Progressives Covered: ${auth.coverageStatus.progressivesCovered}`)
  console.log(`  AR Covered: ${auth.coverageStatus.arCovered}`)
  console.log(`  Photochromics Covered: ${auth.coverageStatus.photochromicsCovered}`)
  console.log(`  Photochromics NOT Covered: ${auth.coverageStatus.photochromicsNotCovered}`)
  console.log(`  Polarized NOT Covered: ${auth.coverageStatus.polarizedNotCovered}`)

  // Output sample prices for key products
  console.log('\n--- SAMPLE CALCULATED PRICES ---')
  const priceList = priceResult.priceList

  for (const section of Object.keys(priceList)) {
    console.log(`\n${section}:`)
    const items = priceList[section]
    for (const item of items) {
      if (item.isNotCovered) {
        console.log(`  ${item.productName}: NOT COVERED (retail: $${item.retail})`)
      } else if (item.isCashOnly) {
        console.log(`  ${item.productName}: CASH $${item.retail}`)
      } else if (item.hasVariance) {
        // Show SV and Multi columns for items with variance
        console.log(`  ${item.productName}: SV $${item.svCopay} | Multi $${item.multiCopay} (retail: $${item.retail})`)
      } else {
        console.log(`  ${item.productName}: $${item.copay} (retail: $${item.retail})`)
      }
    }
  }

  // Save full results for analysis
  const outputPath = `./scripts/output/patient-${patientIndex + 1}-${patient.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`
  fs.mkdirSync('./scripts/output', { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify({
    patient: patient.name,
    authorization: auth,
    priceList: priceResult.priceList,
    summary: priceResult.summary,
  }, null, 2))
  console.log(`\n✓ Full results saved to: ${outputPath}`)

  return { success: true, auth, priceList: priceResult.priceList }
}

// Main execution
const patientIndex = parseInt(process.argv[2] || '0')
testPatient(patientIndex).then(result => {
  if (result.success) {
    console.log('\n✓ Patient test completed successfully')
  } else {
    console.error('\n✗ Patient test failed:', result.error)
    process.exit(1)
  }
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
