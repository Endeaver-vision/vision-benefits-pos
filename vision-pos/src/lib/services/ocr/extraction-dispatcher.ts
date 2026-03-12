/**
 * Extraction Dispatcher
 *
 * Routes document extraction to the appropriate service based on carrier:
 * - EyeMed: Uses pattern-based extraction (209 known patterns)
 * - VSP: Uses pattern-based extraction (once implemented)
 * - Spectera: Uses generic extraction
 * - Unknown: Uses generic extraction with carrier detection
 *
 * This allows us to migrate carriers to pattern-based extraction gradually
 * without breaking the existing API contract.
 */

import { RawExtractionResult } from './prompt-1-raw-extraction'
import { extractRawDocument } from './prompt-1-raw-extraction'
import {
  extractEyeMedBenefitsWithPatterns,
  ExtractedBenefit,
  EyeMedExtractionResult,
} from './eyemed-pattern-extraction'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'

const execPromise = promisify(exec)

/**
 * Detect carrier from file path or document content
 */
async function detectCarrier(filePath: string): Promise<'EyeMed' | 'VSP' | 'Spectera' | 'Unknown'> {
  const lowerPath = filePath.toLowerCase()

  // Check file name for carrier hints first (fastest)
  if (lowerPath.includes('eyemed') || lowerPath.includes('eye-med')) {
    return 'EyeMed'
  }
  if (lowerPath.includes('vsp') || lowerPath.includes('vision-service')) {
    return 'VSP'
  }
  if (lowerPath.includes('spectera')) {
    return 'Spectera'
  }

  // If filename doesn't have carrier marker and it's a PDF, try to detect from content
  if (lowerPath.endsWith('.pdf')) {
    try {
      const scriptPath = path.join(process.cwd(), 'scripts/extract-pdf-text.py')
      const { stdout } = await execPromise(`python3 "${scriptPath}" "${filePath}"`)
      const result = JSON.parse(stdout)

      if (result.text) {
        const textLower = result.text.toLowerCase()
        if (textLower.includes('eyemed')) {
          return 'EyeMed'
        }
        if (textLower.includes('vsp') || textLower.includes('vision service')) {
          return 'VSP'
        }
        if (textLower.includes('spectera')) {
          return 'Spectera'
        }
      }
    } catch (err) {
      console.log('[Dispatcher] Could not extract PDF text for carrier detection')
    }
  }

  return 'Unknown'
}

/**
 * Convert EyeMed pattern extraction result to RawExtractionResult format
 * This maintains compatibility with the existing pipeline
 */
function convertEyeMedToRawFormat(eyeMedResult: EyeMedExtractionResult): RawExtractionResult {
  // Build benefits array from extracted benefits
  const benefits = Object.entries(eyeMedResult.benefits).map(([key, benefit]) => ({
    category: key,
    benefitName: benefit.exact_text_found.split('$')[0].trim() || benefit.category,
    value: benefit.exact_text_found,
    notes: `Formula: ${benefit.formula_type}`,
  }))

  return {
    carrier: 'EyeMed',
    carrierConfidence: 'high',
    carrierMarkers: ['Pattern database match'],
    memberInfo: eyeMedResult.memberInfo || {},
    benefits,
    documentStructure: {
      hasEligibilitySection: false,
      hasFrequencyColumn: false,
      hasTierBreakdown: false,
      usesTableFormat: false,
      documentType: 'Insurance Authorization',
    },
    extractionNotes: `Pattern-based extraction: ${eyeMedResult.stats?.total_patterns_matched || 0} benefits matched from 209-pattern database`,
  }
}

/**
 * Dispatch extraction to appropriate service
 *
 * Returns both the raw extraction AND the typed benefit data
 * (for EyeMed, includes the pattern matches which are more useful)
 */
export async function dispatchExtraction(filePath: string) {
  const detectedCarrier = await detectCarrier(filePath)

  console.log(`[Dispatcher] Detected carrier: ${detectedCarrier}`)
  console.log(`[Dispatcher] File: ${filePath}`)

  // Use pattern-based extraction for EyeMed
  if (detectedCarrier === 'EyeMed') {
    console.log('[Dispatcher] Using EyeMed pattern-based extraction...')

    const eyeMedResult = await extractEyeMedBenefitsWithPatterns(filePath)

    if (!eyeMedResult.success) {
      throw new Error(`EyeMed extraction failed: ${eyeMedResult.error}`)
    }

    // Return both formats: raw (for backward compatibility) and typed (native)
    return {
      rawExtraction: convertEyeMedToRawFormat(eyeMedResult),
      nativeExtraction: eyeMedResult,
      extractionType: 'eyemed-pattern-based',
    }
  }

  // Fall back to generic extraction for other carriers
  console.log('[Dispatcher] Using generic extraction...')
  const rawResult = await extractRawDocument(filePath)

  return {
    rawExtraction: rawResult,
    nativeExtraction: null,
    extractionType: 'generic',
  }
}
