// OCR Service for Insurance Document Processing
// Uses Google Cloud Vision for OCR (cheap) + GPT for text parsing
// This is much more cost-effective than GPT-4o Vision

import * as fs from 'fs'
import { ImageAnnotatorClient } from '@google-cloud/vision'
import { parseInsuranceDocument } from './gpt-extraction'
import type { ExtractedInsuranceData } from '@/types/insurance-document'

// Lazy singleton for Google Vision client
let visionClient: ImageAnnotatorClient | null = null

function getVisionClient(): ImageAnnotatorClient {
  if (!visionClient) {
    // Uses GOOGLE_APPLICATION_CREDENTIALS environment variable
    visionClient = new ImageAnnotatorClient()
  }
  return visionClient
}

/**
 * Process document with Google Cloud Vision OCR
 * Supports images (PNG, JPG) and PDFs
 */
export async function processDocument(filePath: string): Promise<{
  success: boolean
  text: string
  method: string
  pageCount?: number
  error?: string
}> {
  console.log('\n========================================')
  console.log('📥 PROCESSING DOCUMENT WITH GOOGLE VISION')
  console.log('========================================')
  console.log('📁 File:', filePath)

  try {
    const isPDF = filePath.toLowerCase().endsWith('.pdf')
    const client = getVisionClient()

    let text = ''
    let pageCount = 1

    if (isPDF) {
      // For PDFs, try pdf-parse first for text-based PDFs (faster/cheaper)
      console.log('📄 PDF detected - trying text extraction first...')

      try {
        const pdfParseLib = require('pdf-parse/lib/pdf-parse.js')
        const fileBuffer = fs.readFileSync(filePath)
        const pdfData = await pdfParseLib(fileBuffer)

        if (pdfData.text && pdfData.text.trim().length > 100) {
          // Good enough text content, use it
          text = pdfData.text
          pageCount = pdfData.numpages || 1
          console.log(`📄 PDF text extracted: ${text.length} chars from ${pageCount} pages`)

          return {
            success: true,
            text,
            method: 'pdf-parse',
            pageCount,
          }
        }

        console.log('📄 PDF text extraction insufficient, falling back to Vision OCR...')
      } catch (pdfError) {
        console.log('📄 PDF parse failed, falling back to Vision OCR:', pdfError)
      }

      // Fall back to Google Vision for image-based PDFs
      // Note: Vision API requires GCS for PDFs, so we'll convert pages to images
      // For now, just try document text detection on the file directly
      const fileBuffer = fs.readFileSync(filePath)
      const base64Content = fileBuffer.toString('base64')

      const [result] = await client.documentTextDetection({
        image: { content: base64Content },
      })

      text = result.fullTextAnnotation?.text || ''
      console.log(`🔍 Google Vision OCR: ${text.length} chars extracted`)

    } else {
      // For images, use Google Vision directly
      console.log('🖼️ Image detected - using Google Vision OCR...')

      const [result] = await client.documentTextDetection(filePath)
      text = result.fullTextAnnotation?.text || ''
      console.log(`🔍 Google Vision OCR: ${text.length} chars extracted`)
    }

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        text: '',
        method: 'google-vision',
        error: 'No text could be extracted from the document',
      }
    }

    console.log('✅ OCR completed successfully')
    console.log('========================================\n')

    return {
      success: true,
      text,
      method: 'google-vision',
      pageCount,
    }

  } catch (error) {
    console.error('❌ OCR Error:', error)
    return {
      success: false,
      text: '',
      method: 'google-vision',
      error: `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Full pipeline: OCR + GPT extraction
 * Returns extracted insurance data
 */
export async function processDocumentWithVision(
  filePath: string
): Promise<{
  success: boolean
  extractedData?: ExtractedInsuranceData
  rawText?: string
  error?: string
}> {
  console.log('\n========================================')
  console.log('📥 FULL DOCUMENT PROCESSING PIPELINE')
  console.log('========================================')
  console.log('📁 File:', filePath)

  try {
    // Step 1: OCR with Google Vision
    const ocrResult = await processDocument(filePath)

    if (!ocrResult.success || !ocrResult.text) {
      return {
        success: false,
        error: ocrResult.error || 'OCR failed to extract text',
      }
    }

    console.log(`\n📝 OCR Text Preview (first 300 chars):`)
    console.log(ocrResult.text.substring(0, 300) + '...\n')

    // Step 2: Parse with GPT (uses gpt-4o for text, NOT gpt-4o-vision)
    console.log('🤖 Sending OCR text to GPT for parsing...')

    const extractedData = await parseInsuranceDocument(ocrResult.text)

    console.log('✅ Document processed successfully')
    console.log('📊 Carrier:', extractedData.plan?.carrier?.value || 'Unknown')
    console.log('📊 Confidence:', extractedData.overallConfidence || 'N/A')
    console.log('========================================\n')

    return {
      success: true,
      extractedData,
      rawText: ocrResult.text,
    }

  } catch (error) {
    console.error('❌ Processing Error:', error)
    return {
      success: false,
      error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Process document from base64 string (for API uploads)
 */
export async function processDocumentFromBase64(
  base64Data: string,
  fileName: string,
  tempDir: string = '/tmp'
): Promise<{
  success: boolean
  text: string
  method: string
  pageCount?: number
  error?: string
}> {
  const tempPath = `${tempDir}/${Date.now()}-${fileName}`

  try {
    // Write base64 to temp file
    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(tempPath, buffer)

    // Process the document
    const result = await processDocument(tempPath)

    return result
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath)
      }
    } catch (e) {
      console.error('Failed to clean up temp file:', e)
    }
  }
}
