/**
 * EyeMed Pattern-Based Extraction Service
 *
 * Replaces generic field extraction with exact pattern matching against 209 known patterns.
 * This approach is much more reliable than trying to guess field locations.
 *
 * Workflow:
 * 1. Use Haiku vision to read PDF
 * 2. Match extracted text against 209 known EyeMed benefit patterns
 * 3. Extract variable values (copays, allowances, percentages)
 * 4. Return structured benefit data for calculator
 */

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createEyeMedExtractionPrompt, EyeMedVerbatimDatabase } from './eyemed-verbatim-db'

const execPromise = promisify(exec)

let _anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return _anthropicClient
}

export interface ExtractedBenefit {
  matched_pattern: string
  exact_text_found: string
  category: string
  base_copay?: number
  copay?: number
  allowance?: number
  discount_factor?: number
  percentage?: number
  formula_type: string
}

export interface EyeMedExtractionResult {
  success: boolean
  carrier: string
  memberInfo?: {
    name?: string
    memberId?: string
    groupNumber?: string
  }
  benefits: Record<string, ExtractedBenefit>
  unrecognized?: string[]
  error?: string
  stats?: {
    total_patterns_matched: number
    total_unrecognized: number
  }
}

/**
 * Extract text from PDF using Python helper script
 */
async function extractPdfText(filePath: string): Promise<string> {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts/extract-pdf-text.py')

    console.log('[EyeMedPatternExtraction] Extracting text from PDF...')
    const { stdout } = await execPromise(`python3 "${scriptPath}" "${filePath}"`)

    const result = JSON.parse(stdout)
    if (result.error) {
      throw new Error(result.error)
    }

    console.log(`[EyeMedPatternExtraction] Extracted ${result.pages} pages from PDF`)
    return result.text
  } catch (error) {
    throw new Error(
      `Failed to extract PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Extract EyeMed benefits using pattern matching approach
 * This is the core extraction that matches against 209 known patterns
 */
export async function extractEyeMedBenefitsWithPatterns(
  filePath: string
): Promise<EyeMedExtractionResult> {
  const client = getAnthropicClient()

  try {
    // Extract text from PDF
    const pdfText = await extractPdfText(filePath)

    // Create prompt using verbatim patterns with actual PDF text
    const prompt = createEyeMedExtractionPrompt(pdfText)

    console.log('[EyeMedPatternExtraction] Calling Haiku API for pattern matching...')

    // Call Haiku with text-based prompt
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    console.log('[EyeMedPatternExtraction] Received response from Haiku')

    // Parse JSON response
    let extractedData: Record<string, unknown>
    try {
      // Clean markdown formatting if present
      let cleanedText = responseText.trim()
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7)
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3)
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3)
      }
      cleanedText = cleanedText.trim()

      extractedData = JSON.parse(cleanedText)
    } catch (e) {
      console.error('[EyeMedPatternExtraction] Failed to parse JSON:', e)
      return {
        success: false,
        carrier: 'EyeMed',
        benefits: {},
        error: `Failed to parse extraction response: ${e instanceof Error ? e.message : 'Unknown error'}`,
      }
    }

    // Transform extracted data into our format
    const benefits: Record<string, ExtractedBenefit> = {}
    const unrecognized: string[] = []

    for (const [key, value] of Object.entries(extractedData)) {
      if (key === 'unrecognized' && Array.isArray(value)) {
        unrecognized.push(...value)
      } else if (value && typeof value === 'object') {
        const benefitObj = value as Record<string, unknown>
        benefits[key] = {
          matched_pattern: (benefitObj.matched_pattern as string) || '',
          exact_text_found: (benefitObj.exact_text_found as string) || '',
          category: (benefitObj.category as string) || '',
          base_copay: benefitObj.base_copay as number | undefined,
          copay: benefitObj.copay as number | undefined,
          allowance: benefitObj.allowance as number | undefined,
          discount_factor: benefitObj.discount_factor as number | undefined,
          percentage: benefitObj.percentage as number | undefined,
          formula_type: (benefitObj.formula_type as string) || 'unknown',
        }
      }
    }

    console.log(
      `[EyeMedPatternExtraction] Extracted ${Object.keys(benefits).length} benefits, ${unrecognized.length} unrecognized`
    )

    return {
      success: true,
      carrier: 'EyeMed',
      benefits,
      unrecognized,
      stats: {
        total_patterns_matched: Object.keys(benefits).length,
        total_unrecognized: unrecognized.length,
      },
    }
  } catch (error) {
    console.error('[EyeMedPatternExtraction] Error:', error)
    return {
      success: false,
      carrier: 'EyeMed',
      benefits: {},
      error: error instanceof Error ? error.message : 'Unknown extraction error',
    }
  }
}

/**
 * Get stats about the verbatim database
 */
export function getEyeMedDatabaseStats() {
  const db = new EyeMedVerbatimDatabase()
  return db.getStats()
}
