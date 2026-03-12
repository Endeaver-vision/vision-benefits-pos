/**
 * Test VSP Extraction
 *
 * This script tests our new VSP extraction prompts and types on sample documents.
 * It extracts data from both auth and enhancement forms, then merges them.
 *
 * Usage: npx tsx scripts/test-vsp-extraction.ts [authFile] [enhancementFile]
 * Example: npx tsx scripts/test-vsp-extraction.ts SA_vspauth.pdf SA_vsplens.pdf
 */

import fs from 'fs'
import path from 'path'
import type {
  VspAuthFormExtraction,
  VspEnhancementFormExtraction,
} from '@/types/vsp-authorization'
import { mergeVspExtractions, validateVspAuthorization } from '@/lib/services/vsp/vsp-merge-extractions'

// =============================================================================
// EXTRACTION PROMPTS
// =============================================================================

const AUTH_FORM_PROMPT = `You are extracting data from a VSP Patient Record Report (authorization form).
Return ONLY valid JSON — no markdown, no explanation.

Extract these fields (use null if not found):

{
  "document_type": "auth_form",

  "patient_name": "string",
  "patient_dob": "string (MM/DD/YYYY)",
  "member_name": "string (may differ from patient)",
  "relationship": "string (Member, Spouse, Child, etc.)",
  "authorization_number": "string",
  "auth_effective_date": "string (MM/DD/YYYY)",
  "auth_expiration_date": "string (MM/DD/YYYY)",

  "plan_type": "signature" | "choice" | "advantage" | "computer_visioncare" | "savings_pass",
  "client_name": "string (employer name)",
  "network": "string (VSP, Choice, Advantage)",
  "lab_use": "string",

  "eligibility": {
    "exam": boolean,
    "lens": boolean,
    "frame": boolean,
    "contact_lens_exam": boolean,
    "contacts": boolean
  },

  "exam_copay": number,
  "material_copay": number,
  "routine_retinal_screening": number or "lesser of $XX or U&C" pattern,

  "frame_allowance": {
    "wfa_code": "string (e.g., WFA60)",
    "altair_amount": number,
    "non_altair_amount": number,
    "frame_overage_discount": 0.20,
    "easyoptions_wfa_code": "string or null",
    "easyoptions_amount": number or null
  },

  "contact_lens_pattern": "separate" | "combined" | "covered_in_full" | "discount" | "none",
  "cl_exam_copay": number or null,
  "cl_exam_percentage": 0.85,
  "cl_materials_allowance": number or null,
  "cl_combined_allowance": number or null,
  "cl_combined_discount": 0.15,
  "cl_exam_only_responsibility": number or null,
  "cl_easyoptions_allowance": number or null,
  "necessary_cl_copay": number or null,
  "contacts_instead_of": ["lens", "frame"] or null,
  "contacts_frame_next_available": "string (MM/YY)" or null,

  "has_easyoptions": boolean,
  "easyoptions": {
    "contact_lens_upgrade": number or null,
    "frame_upgrade": number or null,
    "photochromic_upgrade": "covered" or null,
    "progressive_upgrade": "covered" or null,
    "ar_upgrade": "covered" or null
  } or null,

  "flags": {
    "has_emc": boolean,
    "emc_type": "essential_medical_eye_care" | "diabetic_eyecare_plus" | null,
    "emc_exam_copay": number or null,
    "is_computer_visioncare": boolean,
    "computer_rx_requirement": "string" or null,
    "has_post_laser": boolean,
    "has_low_vision": boolean,
    "has_vision_therapy": boolean,
    "has_cob_restriction": boolean,
    "cob_rule": "string" or null,
    "value_added_benefits": {
      "same_day_discount": number or null,
      "same_day_40_discount": number or null,
      "within_12_months_discount": number or null,
      "within_12_months_40_discount": number or null,
      "cl_exam_discount": number or null
    } or null
  },

  "eye_health_conditions": {
    "reported_conditions": ["string"] or [],
    "systemic_checked": ["string"] or [],
    "ocular_checked": ["string"] or [],
    "dilation_performed": boolean,
    "pcp_communication": boolean
  },

  "lens_enhancement_summary": {
    "covered": ["list of items marked Covered"],
    "covered_with_copay": ["list of items with copay"],
    "not_covered": ["list of items NOT covered"]
  }
}

EXTRACTION RULES:
1. For plan_type: Look for "Benefit VSP [TYPE] Plan" in PATIENT COVERAGE section
2. For frame_allowance: ALWAYS extract the "non-Altair" or "non-Altair/Marchon" line
3. For EasyOptions amounts: Look for items marked with * suffix
4. For contact patterns:
   - "CL Exam Services" + "CL Materials" = "separate"
   - "Exam And Allowance" = "combined"
   - "Covered in full" = "covered_in_full"
5. For EMC: Look for "Essential Medical Eye Care" or "Diabetic Eyecare Plus Program"
6. For Computer VisionCare: Must have "VSP Computer VisionCare Plan Supplemental"
7. Dollar amounts: Extract number only (no $ sign)
8. Percentages: Convert to decimal (20% → 0.20)`

const ENHANCEMENT_FORM_PROMPT = `You are extracting data from a VSP Lens Enhancement Charges sheet.
Return ONLY valid JSON — no markdown, no explanation.

The form has two columns: "Single Cost" (SV) and "Multi Cost" (Progressive/Bifocal).
Extract copay amounts using VSP's two-letter code system.

{
  "document_type": "enhancement_form",
  "authorization_number": "string (from header)",
  "patient_name": "string (from header)",

  "progressives": {
    "K_standard": number,
    "J_premium": number,
    "F_premium_adv": number,
    "O_custom": number,
    "N_custom": number
  },

  "single_vision_base": 0,

  "materials": {
    "polycarbonate_sv": number,
    "polycarbonate_multi": number,
    "trivex_sv": number,
    "trivex_multi": number,
    "hi_index_167_sv": number,
    "hi_index_167_multi": number,
    "hi_index_174_sv": number,
    "hi_index_174_multi": number
  },

  "lens_matrix": {
    "SV_plastic": number,
    "SV_poly": number,
    "SV_trivex": number,
    "SV_hi167": number,
    "SV_hi174": number,

    "KA": number, "KD": number, "KB": number, "KH": number, "KJ": number,
    "JA": number, "JD": number, "JB": number, "JH": number, "JJ": number,
    "FA": number, "FD": number, "FB": number, "FH": number, "FJ": number,
    "OA": number, "OD": number, "OB": number, "OH": number, "OJ": number,
    "NA": number, "ND": number, "NB": number, "NH": number, "NJ": number
  },

  "ar_coatings": {
    "QM_standard": number,
    "QT_premium_1": number,
    "QV_premium_2": number
  },

  "photochromics": {
    "PR_plastic": number,
    "PM_glass": number
  },

  "polarized": {
    "DA_sv": number,
    "DA_multi": number,
    "KP": number, "JP": number, "FP": number, "NP": number, "OP": number
  },

  "tints": {
    "MN_plastic_sv": number,
    "MN_plastic_multi": number,
    "MP_gradient_sv": number,
    "MP_gradient_multi": number
  },

  "misc": {
    "SP_edge_polish": number,
    "SQ_edge_coating": number,
    "SW_rimless": number,
    "LF_light_filter": number,
    "TA_tech_addon": number,
    "IA_near_variable": number,
    "RM_oversize_plastic": number,
    "RN_oversize_glass": number,
    "AA_aspheric": number,
    "BA_digital_aspheric": number,
    "CM_custom_measurement": number
  },

  "coverage_status": {
    "progressives_covered": boolean,
    "ar_covered": boolean,
    "photochromics_covered": boolean,
    "photochromics_not_covered": boolean,
    "polarized_not_covered": boolean
  }
}

EXTRACTION RULES:
1. $00 or $0 or blank = 0 (covered, no copay)
2. Look for "Covered" header = all items below are $0
3. Look for "Covered With Additional Copay" = items have copays
4. Look for "Not Covered" = item should be flagged
5. If item not found, use null`

// =============================================================================
// EXTRACTION FUNCTIONS
// =============================================================================

async function extractWithClaude(
  pdfBase64: string,
  prompt: string,
  documentName: string
): Promise<{ data: unknown; usage: { input: number; output: number } }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  console.log(`\n📄 Extracting ${documentName}...`)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  const usage = result.usage

  console.log(`   ✓ Tokens: ${usage?.input_tokens} in, ${usage?.output_tokens} out`)

  const text = result.content?.find((b: { type: string }) => b.type === 'text')?.text ?? ''
  const clean = text.replace(/```json|```/g, '').trim()
  const data = JSON.parse(clean)

  return {
    data,
    usage: { input: usage?.input_tokens || 0, output: usage?.output_tokens || 0 },
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = process.argv.slice(2)

  // Default test files
  const authFile = args[0] || 'SA_vspauth.pdf'
  const enhancementFile = args[1] || 'SA_vsplens.pdf'

  const vspDir = '/Users/cmac/let/vision-pos/Reference-Docs/VSP Only'

  const authPath = path.join(vspDir, authFile)
  const enhancementPath = path.join(vspDir, enhancementFile)

  // Check files exist
  if (!fs.existsSync(authPath)) {
    console.error(`❌ Auth file not found: ${authPath}`)
    process.exit(1)
  }
  if (!fs.existsSync(enhancementPath)) {
    console.error(`❌ Enhancement file not found: ${enhancementPath}`)
    process.exit(1)
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('              VSP EXTRACTION TEST')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`Auth Form: ${authFile}`)
  console.log(`Enhancement Form: ${enhancementFile}`)

  // Read PDFs
  const authPdfBase64 = fs.readFileSync(authPath).toString('base64')
  const enhancementPdfBase64 = fs.readFileSync(enhancementPath).toString('base64')

  // Extract auth form
  const authResult = await extractWithClaude(
    authPdfBase64,
    AUTH_FORM_PROMPT,
    'Auth Form'
  )
  const authData = authResult.data as VspAuthFormExtraction

  // Extract enhancement form
  const enhancementResult = await extractWithClaude(
    enhancementPdfBase64,
    ENHANCEMENT_FORM_PROMPT,
    'Enhancement Form'
  )
  const enhancementData = enhancementResult.data as VspEnhancementFormExtraction

  // Merge extractions
  console.log('\n🔀 Merging extractions...')
  const merged = mergeVspExtractions(authData, enhancementData)

  // Validate
  const validation = validateVspAuthorization(merged)

  // Print results
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('                    RESULTS')
  console.log('═══════════════════════════════════════════════════════════')

  console.log('\n📋 PATIENT INFO:')
  console.log(`   Name: ${merged.patientInfo.name}`)
  console.log(`   DOB: ${merged.patientInfo.dob}`)
  console.log(`   Auth #: ${merged.patientInfo.authNumber}`)
  console.log(`   Effective: ${merged.patientInfo.effectiveDate}`)
  console.log(`   Expires: ${merged.patientInfo.expirationDate}`)

  console.log('\n📋 PLAN INFO:')
  console.log(`   Type: ${merged.planInfo.planType}`)
  console.log(`   Client: ${merged.planInfo.clientName}`)
  console.log(`   Network: ${merged.planInfo.network}`)

  console.log('\n💰 COPAYS:')
  console.log(`   Exam: $${merged.copays.exam}`)
  console.log(`   Material: $${merged.copays.material}`)

  console.log('\n🖼️  FRAME ALLOWANCE:')
  console.log(`   Amount: $${merged.frameAllowance.amount} (non-Altair)`)
  console.log(`   Altair: $${merged.frameAllowance.altairAmount}`)
  console.log(`   Overage Discount: ${merged.frameAllowance.overageDiscount * 100}%`)
  if (merged.frameAllowance.easyOptionsAmount) {
    console.log(`   EasyOptions: $${merged.frameAllowance.easyOptionsAmount}`)
  }

  console.log('\n👁️  CONTACT LENS:')
  console.log(`   Pattern: ${merged.contactLens.pattern}`)
  if (merged.contactLens.examCopay !== null) {
    console.log(`   Exam Copay: $${merged.contactLens.examCopay}`)
  }
  if (merged.contactLens.materialsAllowance !== null) {
    console.log(`   Materials Allowance: $${merged.contactLens.materialsAllowance}`)
  }
  if (merged.contactLens.combinedAllowance !== null) {
    console.log(`   Combined Allowance: $${merged.contactLens.combinedAllowance}`)
  }

  console.log('\n⭐ EASYOPTIONS:')
  if (merged.easyOptions?.enabled) {
    console.log('   Enabled: Yes')
    if (merged.easyOptions.photochromicCovered) console.log('   - Photochromic: Covered')
    if (merged.easyOptions.progressiveCovered) console.log('   - Progressive: Covered')
    if (merged.easyOptions.arCovered) console.log('   - AR: Covered')
    if (merged.easyOptions.frameUpgrade) console.log(`   - Frame Upgrade: $${merged.easyOptions.frameUpgrade}`)
    if (merged.easyOptions.contactLensUpgrade) console.log(`   - CL Upgrade: $${merged.easyOptions.contactLensUpgrade}`)
  } else {
    console.log('   Enabled: No')
  }

  console.log('\n🏷️  FLAGS:')
  console.log(`   EMC: ${merged.flags.hasEmc ? `Yes (${merged.flags.emcType})` : 'No'}`)
  console.log(`   Computer VisionCare: ${merged.flags.isComputerVisioncare ? 'Yes' : 'No'}`)
  console.log(`   Post-Laser: ${merged.flags.hasPostLaser ? 'Yes' : 'No'}`)
  console.log(`   Low Vision: ${merged.flags.hasLowVision ? 'Yes' : 'No'}`)
  console.log(`   COB Restriction: ${merged.flags.hasCobRestriction ? `Yes (${merged.flags.cobRule})` : 'No'}`)

  console.log('\n📊 LENS MATRIX (Progressive + Material):')
  const lensMatrix = merged.lensMatrix
  const matrixCodes = ['KA', 'KD', 'KB', 'KH', 'KJ', 'JA', 'JD', 'FH', 'NH']
  for (const code of matrixCodes) {
    const value = lensMatrix[code]
    if (value !== null) {
      console.log(`   ${code}: $${value}`)
    }
  }

  console.log('\n🔲 AR COATINGS:')
  console.log(`   QM (Standard): $${merged.arCoatings.QM}`)
  console.log(`   QT (Premium 1): $${merged.arCoatings.QT}`)
  console.log(`   QV (Premium 2/Crizal): $${merged.arCoatings.QV}`)

  console.log('\n✨ ENHANCEMENTS:')
  console.log(`   PR (Photochromic): $${merged.enhancements.PR}`)
  console.log(`   DA (Polarized): $${merged.enhancements.DA}`)
  console.log(`   LF (Blue Light): $${merged.enhancements.LF}`)
  console.log(`   SP (Edge Polish): $${merged.enhancements.SP}`)
  console.log(`   SW (Rimless): $${merged.enhancements.SW}`)

  console.log('\n✅ COVERAGE STATUS:')
  console.log(`   Progressives Covered: ${merged.coverageStatus.progressivesCovered ? 'Yes' : 'No'}`)
  console.log(`   AR Covered: ${merged.coverageStatus.arCovered ? 'Yes' : 'No'}`)
  console.log(`   Photochromics Covered: ${merged.coverageStatus.photochromicsCovered ? 'Yes' : 'No'}`)
  console.log(`   Photochromics NOT Covered: ${merged.coverageStatus.photochromicsNotCovered ? 'Yes (Computer Vision)' : 'No'}`)
  console.log(`   Polarized NOT Covered: ${merged.coverageStatus.polarizedNotCovered ? 'Yes (Computer Vision)' : 'No'}`)

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('                   VALIDATION')
  console.log('═══════════════════════════════════════════════════════════')
  if (validation.valid) {
    console.log('✅ Authorization is valid')
  } else {
    console.log('❌ Validation errors:')
    validation.errors.forEach((e) => console.log(`   - ${e}`))
  }

  console.log('\n📊 TOKEN USAGE:')
  console.log(`   Auth Form: ${authResult.usage.input} in, ${authResult.usage.output} out`)
  console.log(`   Enhancement: ${enhancementResult.usage.input} in, ${enhancementResult.usage.output} out`)
  console.log(`   Total: ${authResult.usage.input + enhancementResult.usage.input + authResult.usage.output + enhancementResult.usage.output} tokens`)

  // Save raw output for debugging
  const outputDir = '/Users/cmac/let/vision-pos/Reference-Docs/VSP Only/extraction-tests'
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outputFile = path.join(outputDir, `extraction-${timestamp}.json`)
  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      {
        authFile,
        enhancementFile,
        authData,
        enhancementData,
        merged,
        validation,
        usage: {
          authForm: authResult.usage,
          enhancement: enhancementResult.usage,
        },
      },
      null,
      2
    )
  )
  console.log(`\n💾 Full output saved to: ${outputFile}`)
}

main().catch((e) => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
