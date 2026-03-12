import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Test documents
const testDocs = [
  {
    name: 'SS_eyemed.pdf',
    path: '/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cust_93800643_1768495131786_SS_eyemed.pdf'
  },
  {
    name: 'TC_Benefits-Eyemed.pdf',
    path: '/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpygf869vu4l7iv_1769443233666_TC_Benefits-Eyemed.pdf'
  },
  {
    name: 'LM_eyemed-2025.pdf',
    path: '/Users/cmac/let/vision-pos/public/uploads/insurance-docs/cminudpyz0qoge161phfm_1768610228772_LM_eyemed-2025.pdf'
  }
]

async function extractDocument(filePath: string, docName: string) {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`Extracting: ${docName}`)
  console.log('='.repeat(70))

  try {
    // Read PDF as base64
    const fileData = fs.readFileSync(filePath)
    const base64Data = fileData.toString('base64')

    // Call Haiku with vision to extract from PDF
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data
              }
            } as any,
            {
              type: 'text',
              text: `You are extracting vision insurance benefits from an EyeMed insurance document.

Your job: Read the document and extract ALL benefit information, translating EyeMed's terminology into our standard product names.

CRITICAL: EyeMed uses "tier" language (Tier 1, Tier 2, etc.). You must translate these to OUR product names.

Return structured data with clear labels. Only include sections/fields that have values in the document.

Use this format (but SKIP any section with no values):

CARRIER: EyeMed
MEMBER_NAME: [name]
MEMBER_ID: [id]

COPAYS (extract only those mentioned in document):
- examCopay: [amount]
- materialsCopay: [amount]
- singleVision: [amount]
- progressiveStandard: [amount]
- Varilux Comfort: [amount]
- Varilux Physio: [amount]
- Varilux X Series: [amount]
- Varilux XR Series: [amount or formula]
- arStandard: [amount]
- Crizal Easy: [amount]
- Crizal Sapphire: [amount]
- Crizal Prevencia: [amount or formula]
- polycarbonate: [amount]
- polycarbonateChild: [amount - if different from adult]
- trivex: [amount]
- highIndex167: [amount]
- highIndex174: [amount]
- Transitions: [amount]
- polarized: [amount]
- allOtherLensOptions: [amount or "XX% off retail"]
- clExamCopay: [amount]

ALLOWANCES (if mentioned):
- frameAllowance: [amount]
- frameOverageDiscount: [percentage]
- contactAllowance: [amount]

## PRODUCT NAME TRANSLATION GUIDE

**PROGRESSIVE LENSES:**
- "Premium Tier 1" / "Tier 1" / "Premium 1" → "Varilux Comfort"
- "Premium Tier 2" / "Tier 2" / "Premium 2" → "Varilux Physio"
- "Premium Tier 3" / "Tier 3" / "Premium 3" → "Varilux X Series"
- "Premium Tier 4" / "Tier 4" / "Premium 4" → "Varilux XR Series"

**AR COATINGS (Anti-Reflective):**
- "AR Coating Tier 1" / "AR Tier 1" → "Crizal Easy"
- "AR Coating Tier 2" / "AR Tier 2" → "Crizal Sapphire"
- "AR Coating Tier 3" / "AR Tier 3" → "Crizal Prevencia"

## VALUE EXTRACTION RULES

1. "$XX copay" → extract number XX only
2. "$XX.00 copay" → extract as integer XX
3. "Covered" / "No copay" → 0
4. "$XX/eye" → extract XX
5. "$XX-YY" range → extract LOWER value XX
6. "XX% off retail" → keep as string
7. "$XX copay; YY% off less $ZZ allowance" → keep FULL string
8. "N/A" / "Not covered" → skip
9. Age-dependent benefits → use separate fields (polycarbonate vs polycarbonateChild)

Remember: Use OUR product names (Varilux Comfort), NEVER EyeMed's tier codes.`
            }
          ]
        }
      ]
    })

    const extractedText = response.content[0].type === 'text' ? response.content[0].text : ''
    console.log('\n📄 Extracted Data:\n')
    console.log(extractedText)

    // Check for bias
    const exampleNumbers = ['10', '95', '120', '150', '25', '65', '45', '35', '85', '40', '75']
    let suspiciousMatches: Array<{ num: string; count: number }> = []

    for (const num of exampleNumbers) {
      const pattern = new RegExp(`:\\s*${num}([,\\n\\r]|$)`, 'g')
      const matches = extractedText.match(pattern)
      if (matches) {
        suspiciousMatches.push({ num, count: matches.length })
      }
    }

    if (suspiciousMatches.length > 0) {
      console.log('\n⚠️  Potential bias detected - values matching example amounts:')
      suspiciousMatches.forEach(m => console.log(`   - Value ${m.num}: found ${m.count} time(s)`))
    } else {
      console.log('\n✅ No example numbers detected - extraction appears unbiased')
    }

    console.log(`\nTokens used: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output`)

  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error processing ${docName}:`)
      console.error(error.message)
    } else {
      console.error(`❌ Error processing ${docName}:`, error)
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Haiku Extraction Bias Test\n')
  console.log('Testing updated prompt to verify:')
  console.log('  1. No specific dollar amounts in examples')
  console.log('  2. Haiku reads actual document values')
  console.log('  3. Product name translation works')

  for (const doc of testDocs) {
    await extractDocument(doc.path, doc.name)
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ All tests complete')
  console.log('='.repeat(70))
}

runTests().catch(console.error)
