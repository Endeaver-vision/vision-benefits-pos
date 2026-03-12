import * as fs from 'fs'
import * as path from 'path'
import pdfParse from 'pdf-parse'

interface CopayExtraction {
  fileName: string
  textSnippet: string
  progressiveTiers: Record<string, string | number | null>
  arTiers: Record<string, string | number | null>
  basicCopays: Record<string, string | number | null>
  materialCopays: Record<string, string | number | null>
  frameInfo: Record<string, string | number | null>
  allOtherLensOptions: string | null
  contactBenefits: Record<string, string | number | null>
  rawPatterns: string[]
}

// Extract numeric value from various formats
function extractNumericValue(text: string): number | string | null {
  if (!text || typeof text !== 'string') return null
  text = text.trim()

  // Covered / free cases
  if (/covered|included|free|$0|no copay/i.test(text)) return 0
  if (/not covered|n\/a|none|—|-$/i.test(text)) return null

  // Simple dollar amount
  const dollarMatch = text.match(/\$(\d+(?:\.\d{2})?)/i)
  if (dollarMatch) return parseInt(dollarMatch[1], 10)

  // Plain number
  const numberMatch = text.match(/^(\d+)/)
  if (numberMatch) return parseInt(numberMatch[1], 10)

  // Formula or complex text - keep as string
  if (text.length > 50 || text.includes('%') || text.includes('less')) {
    return text
  }

  return text
}

// Look for progressive tier patterns in text
function findProgressiveTiers(text: string): Record<string, string | number | null> {
  const tiers: Record<string, string | number | null> = {}

  // Pattern: "Premium Tier 1: $95" or "Tier 1: $95" etc.
  const tierPatterns = [
    { regex: /Premium?\s*Tier\s*1[:\s]*\$?(\d+|covered|free)/gi, field: 'tier1' },
    { regex: /Premium?\s*Tier\s*2[:\s]*\$?(\d+|covered|free)/gi, field: 'tier2' },
    { regex: /Premium?\s*Tier\s*3[:\s]*\$?(\d+|covered|free)/gi, field: 'tier3' },
    { regex: /Premium?\s*Tier\s*4[:\s]*\$?(\d+|covered|free)|[\$\d]+\s*copay[;.]?\s*20%/gi, field: 'tier4' },
    { regex: /Premium?\s*Tier\s*5[:\s]*\$?(\d+|covered|free)/gi, field: 'tier5' },
    { regex: /Standard[:\s]+\$?(\d+|covered|free)/gi, field: 'standard' },
  ]

  for (const pattern of tierPatterns) {
    const matches = [...text.matchAll(pattern.regex)]
    if (matches.length > 0) {
      for (const match of matches) {
        const value = match[0]
        tiers[pattern.field] = extractNumericValue(value)
      }
    }
  }

  return tiers
}

// Look for AR coating tier patterns
function findArTiers(text: string): Record<string, string | number | null> {
  const tiers: Record<string, string | number | null> = {}

  const arPatterns = [
    { regex: /AR.*?Tier\s*1[:\s]*\$?(\d+|covered|free|[\d\$\s%off]+)/gi, field: 'tier1' },
    { regex: /AR.*?Tier\s*2[:\s]*\$?(\d+|covered|free|[\d\$\s%off]+)/gi, field: 'tier2' },
    { regex: /AR.*?Tier\s*3[:\s]*\$?(\d+|covered|free|[\d\$\s%off]+)/gi, field: 'tier3' },
    { regex: /anti-?reflective.*?Tier\s*1[:\s]*\$?(\d+|covered|free|[\d\$\s%off]+)/gi, field: 'tier1' },
    { regex: /anti-?reflective.*?Tier\s*2[:\s]*\$?(\d+|covered|free|[\d\$\s%off]+)/gi, field: 'tier2' },
    { regex: /anti-?reflective.*?Tier\s*3[:\s]*\$?(\d+|covered|free|[\d\$\s%off]+)/gi, field: 'tier3' },
  ]

  for (const pattern of arPatterns) {
    const matches = [...text.matchAll(pattern.regex)]
    if (matches.length > 0) {
      for (const match of matches) {
        const value = match[0]
        tiers[pattern.field] = extractNumericValue(value)
      }
    }
  }

  return tiers
}

// Look for basic copays (exam, materials, frame allowance)
function findBasicCopays(text: string): Record<string, string | number | null> {
  const copays: Record<string, string | number | null> = {}

  const patterns = [
    { regex: /exam.*?copay[:\s]*\$?(\d+|covered|free)/gi, field: 'exam' },
    { regex: /materials?.*?copay[:\s]*\$?(\d+|covered|free)/gi, field: 'materials' },
    { regex: /frame.*?allowance[:\s]*\$?(\d+)/gi, field: 'frameAllowance' },
    { regex: /frame.*?overage[:\s]*(\d+)?%/gi, field: 'frameOverageDiscount' },
    { regex: /single vision[:\s]*\$?(\d+|covered|free)/gi, field: 'singleVision' },
    { regex: /bifocal[:\s]*\$?(\d+|covered|free)/gi, field: 'bifocal' },
    { regex: /trifocal[:\s]*\$?(\d+|covered|free)/gi, field: 'trifocal' },
  ]

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern.regex)]
    if (matches.length > 0) {
      for (const match of matches) {
        const value = match[0]
        copays[pattern.field] = extractNumericValue(value)
      }
    }
  }

  return copays
}

// Look for material copays
function findMaterialCopays(text: string): Record<string, string | number | null> {
  const copays: Record<string, string | number | null> = {}

  const patterns = [
    { regex: /polycarbonate[:\s]*\$?(\d+|covered|free)/gi, field: 'polycarbonate' },
    { regex: /trivex[:\s]*\$?(\d+|covered|free)/gi, field: 'trivex' },
    { regex: /1\.67.*?hi-?index[:\s]*\$?(\d+)/gi, field: 'highIndex167' },
    { regex: /1\.74.*?hi-?index[:\s]*\$?(\d+)/gi, field: 'highIndex174' },
    { regex: /photochromic|transitions?[:\s]*\$?(\d+)/gi, field: 'photochromic' },
    { regex: /polarized[:\s]*\$?(\d+)/gi, field: 'polarized' },
    { regex: /tint[:\s]*\$?(\d+|covered|free)/gi, field: 'tint' },
    { regex: /blue light|blue-light[:\s]*\$?(\d+|covered|free|[\d\$\s%off]+)/gi, field: 'blueLight' },
  ]

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern.regex)]
    if (matches.length > 0) {
      for (const match of matches) {
        const value = match[0]
        copays[pattern.field] = extractNumericValue(value)
      }
    }
  }

  return copays
}

// Look for contact lens benefits
function findContactBenefits(text: string): Record<string, string | number | null> {
  const benefits: Record<string, string | number | null> = {}

  const patterns = [
    { regex: /contact.*?allowance[:\s]*\$?(\d+)/gi, field: 'allowance' },
    { regex: /contact.*?exam|CL.*?exam|fitting.*?exam[:\s]*\$?(\d+|covered|free)/gi, field: 'examCopay' },
  ]

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern.regex)]
    if (matches.length > 0) {
      for (const match of matches) {
        const value = match[0]
        benefits[pattern.field] = extractNumericValue(value)
      }
    }
  }

  return benefits
}

async function extractFromPdf(filePath: string): Promise<CopayExtraction> {
  const fileName = path.basename(filePath)
  const dataBuffer = fs.readFileSync(filePath)
  const data = await pdfParse(dataBuffer)

  const text = data.text.substring(0, 5000) // First 5000 chars should have most benefit info

  // Find all raw patterns for debugging
  const copayPattern = /\$?\d+\s*(?:copay|off|discount|allowance|member)/gi
  const rawPatterns = [...text.matchAll(copayPattern)].map(m => m[0]).slice(0, 20)

  return {
    fileName,
    textSnippet: text.substring(0, 500),
    progressiveTiers: findProgressiveTiers(text),
    arTiers: findArTiers(text),
    basicCopays: findBasicCopays(text),
    materialCopays: findMaterialCopays(text),
    frameInfo: {
      allowance: findBasicCopays(text).frameAllowance,
      overageDiscount: findBasicCopays(text).frameOverageDiscount,
    },
    allOtherLensOptions: text.match(/20%\s*(?:off|discount)/i)?.[0] || null,
    contactBenefits: findContactBenefits(text),
    rawPatterns,
  }
}

async function main() {
  const docsDir = '/Users/cmac/let/vision-pos/test-documents/eyemed-only/'
  const files = fs.readdirSync(docsDir)
    .filter(f => f.endsWith('.pdf'))
    .sort()

  console.log(`Processing ${files.length} EyeMed documents...\n`)

  const allExtractions: CopayExtraction[] = []
  const productMapping: Record<string, any> = {}

  for (const file of files) {
    try {
      const filePath = path.join(docsDir, file)
      console.log(`Extracting: ${file}`)

      const extraction = await extractFromPdf(filePath)
      allExtractions.push(extraction)

      // Build product mapping
      if (Object.keys(extraction.progressiveTiers).length > 0) {
        productMapping[file] = {
          progressive: extraction.progressiveTiers,
          ar: extraction.arTiers,
          basic: extraction.basicCopays,
          material: extraction.materialCopays,
        }
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err instanceof Error ? err.message : err)
    }
  }

  // Save detailed extraction results
  fs.writeFileSync(
    '/private/tmp/claude/-Users-cmac-let/4800dd6b-c887-420f-a8d2-be9d3125a356/scratchpad/eyemed-extractions.json',
    JSON.stringify(allExtractions, null, 2)
  )

  // Build summary of all copay values found
  const copayValuesSummary: Record<string, Set<string | number>> = {
    progressiveTier1: new Set(),
    progressiveTier2: new Set(),
    progressiveTier3: new Set(),
    progressiveTier4: new Set(),
    progressiveTier5: new Set(),
    arTier1: new Set(),
    arTier2: new Set(),
    arTier3: new Set(),
    examCopay: new Set(),
    materialsCopay: new Set(),
    frameAllowance: new Set(),
  }

  for (const extraction of allExtractions) {
    Object.entries(extraction.progressiveTiers).forEach(([tier, value]) => {
      if (value !== null) copayValuesSummary[`progressiveTier${tier}`]?.add(String(value))
    })
    Object.entries(extraction.arTiers).forEach(([tier, value]) => {
      if (value !== null) copayValuesSummary[`arTier${tier}`]?.add(String(value))
    })
    Object.entries(extraction.basicCopays).forEach(([field, value]) => {
      if (value !== null && copayValuesSummary[field]) {
        copayValuesSummary[field].add(String(value))
      }
    })
  }

  // Convert to regular objects for JSON
  const summary = Object.fromEntries(
    Object.entries(copayValuesSummary).map(([key, set]) => [
      key,
      Array.from(set).sort((a, b) => {
        const numA = parseInt(a as string)
        const numB = parseInt(b as string)
        return !isNaN(numA) && !isNaN(numB) ? numA - numB : String(a).localeCompare(String(b))
      }),
    ])
  )

  fs.writeFileSync(
    '/private/tmp/claude/-Users-cmac-let/4800dd6b-c887-420f-a8d2-be9d3125a356/scratchpad/eyemed-copay-summary.json',
    JSON.stringify(summary, null, 2)
  )

  console.log('\n✓ Extraction complete')
  console.log(`• Processed ${allExtractions.length} documents`)
  console.log(`• Progressive Tier 1 values found: ${summary.progressiveTier1?.length || 0}`)
  console.log(`• Progressive Tier 2 values found: ${summary.progressiveTier2?.length || 0}`)
  console.log(`• Progressive Tier 3 values found: ${summary.progressiveTier3?.length || 0}`)
  console.log(`• Progressive Tier 4 values found: ${summary.progressiveTier4?.length || 0}`)
  console.log(`• AR Tier 1 values found: ${summary.arTier1?.length || 0}`)
  console.log(`• AR Tier 2 values found: ${summary.arTier2?.length || 0}`)
  console.log(`• AR Tier 3 values found: ${summary.arTier3?.length || 0}`)
}

main().catch(console.error)
