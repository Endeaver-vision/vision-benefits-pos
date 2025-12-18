// OCR Service for Insurance Document Processing
// Uses Google Cloud Vision for OCR + GPT for text parsing

import * as fs from 'fs'
import { ImageAnnotatorClient } from '@google-cloud/vision'
import { parseInsuranceDocument } from './gpt-extraction'
import type { ExtractedInsuranceData } from '@/types/insurance-document'

// Lazy singleton for Google Vision client
let visionClient: ImageAnnotatorClient | null = null

function getVisionClient(): ImageAnnotatorClient {
  if (!visionClient) {
    visionClient = new ImageAnnotatorClient()
  }
  return visionClient
}

/**
 * Process document with Google Cloud Vision OCR
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
 * Full pipeline: Google Vision OCR + GPT extraction
 */
export async function processDocumentWithVision(
  filePath: string
): Promise<{
  success: boolean
  extractedData?: ExtractedInsuranceData
  rawText?: string
  error?: string
  timing?: {
    ocrMs: number
    gptMs: number
    totalMs: number
  }
}> {
  console.log('\n========================================')
  console.log('📥 FULL DOCUMENT PROCESSING PIPELINE')
  console.log('========================================')
  console.log('📁 File:', filePath)

  try {
    // Step 1: OCR with Google Vision
    const ocrStart = Date.now()
    const ocrResult = await processDocument(filePath)
    const ocrTime = Date.now() - ocrStart
    console.log(`⏱️ OCR completed in ${ocrTime}ms`)

    if (!ocrResult.success || !ocrResult.text) {
      return {
        success: false,
        error: ocrResult.error || 'OCR failed to extract text',
      }
    }

    console.log(`\n📝 OCR Text Preview (first 300 chars):`)
    console.log(ocrResult.text.substring(0, 300) + '...\n')

    // Step 2: Parse with GPT
    console.log('🤖 Sending OCR text to GPT for parsing...')
    const gptStart = Date.now()
    const extractedData = await parseInsuranceDocument(ocrResult.text)
    const gptTime = Date.now() - gptStart
    console.log(`⏱️ GPT parsing completed in ${gptTime}ms`)

    const totalTime = ocrTime + gptTime
    console.log('✅ Document processed successfully')
    console.log('📊 Carrier:', extractedData.plan?.carrier?.value || 'Unknown')
    console.log(`⏱️ Total time: ${totalTime}ms`)
    console.log('========================================\n')

    return {
      success: true,
      extractedData,
      rawText: ocrResult.text,
      timing: {
        ocrMs: ocrTime,
        gptMs: gptTime,
        totalMs: totalTime,
      },
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
  extractedData?: ExtractedInsuranceData
  rawText?: string
  error?: string
}> {
  const tempPath = `${tempDir}/${Date.now()}-${fileName}`

  try {
    // Write base64 to temp file
    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(tempPath, buffer)

    // Process the document
    const result = await processDocumentWithVision(tempPath)

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
