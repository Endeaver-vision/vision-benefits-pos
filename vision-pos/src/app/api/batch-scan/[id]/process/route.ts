import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processInsuranceDocument } from '@/lib/services/ocr'
import { generateTemporaryPriceList } from '@/lib/services/batch-price-generator'

/**
 * POST /api/batch-scan/[id]/process
 * Process all pending documents in a batch job
 *
 * This runs sequentially to avoid overwhelming the GPT API.
 * For large batches, consider implementing a queue system.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const { id: jobId } = await params

    // Get the job
    const job = await prisma.batchScanJob.findUnique({
      where: { id: jobId },
      include: {
        documents: {
          where: { status: 'PENDING' },
          orderBy: { fileName: 'asc' },
        },
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Batch job not found' },
        { status: 404 }
      )
    }

    if (job.status === 'PROCESSING') {
      return NextResponse.json(
        { error: 'Batch job is already processing' },
        { status: 409 }
      )
    }

    if (job.documents.length === 0) {
      return NextResponse.json(
        { error: 'No pending documents to process' },
        { status: 400 }
      )
    }

    // Update job status
    await prisma.batchScanJob.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    })

    const results: Array<{
      documentId: string
      fileName: string
      success: boolean
      carrier?: string
      memberName?: string
      priceCount?: number
      error?: string
    }> = []

    let successCount = 0
    let failCount = 0
    const errors: Array<{ file: string; error: string }> = []

    // Process each document
    for (const doc of job.documents) {
      try {
        // Update document status
        await prisma.batchScanDocument.update({
          where: { id: doc.id },
          data: { status: 'PROCESSING' },
        })

        console.log(`[BatchProcess] Processing: ${doc.fileName}`)

        // Run OCR + GPT extraction using existing pipeline
        // We create a temporary InsuranceDocument record for processing
        const tempDoc = await prisma.insuranceDocument.create({
          data: {
            customerId: 'BATCH_TEMP', // Placeholder - will be cleaned up
            fileName: doc.fileName,
            fileType: doc.fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            filePath: doc.filePath,
            fileSize: doc.fileSize,
            uploadedBy: 'batch-scanner',
            ocrStatus: 'pending',
            gptStatus: 'pending',
          },
        })

        // Process the document
        const result = await processInsuranceDocument(tempDoc.id, doc.filePath)

        if (result.ocrSuccess && result.gptSuccess) {
          // Get the processed document
          const processedDoc = await prisma.insuranceDocument.findUnique({
            where: { id: tempDoc.id },
          })

          // Extract member info from extracted data
          const extractedData = processedDoc?.extractedData as Record<string, unknown> | null
          const patient = extractedData?.patient as Record<string, { value?: string }> | undefined
          const memberName = patient?.memberName?.value || patient?.subscriberName?.value
          const memberId = patient?.memberId?.value || patient?.memberIdNumber?.value

          // Update batch document with extraction results
          await prisma.batchScanDocument.update({
            where: { id: doc.id },
            data: {
              status: 'COMPLETED',
              carrier: processedDoc?.carrier,
              planName: processedDoc?.planName,
              memberName: memberName || null,
              memberId: memberId || null,
              extractedData: processedDoc?.extractedData || {},
              confidenceScore: processedDoc?.confidenceScore,
              processedAt: new Date(),
            },
          })

          // Generate temporary price list
          let priceCount = 0
          if (processedDoc?.carrier && extractedData) {
            try {
              priceCount = await generateTemporaryPriceList(
                doc.id,
                processedDoc.carrier,
                extractedData
              )
            } catch (priceErr) {
              console.error(`[BatchProcess] Price generation failed for ${doc.fileName}:`, priceErr)
              // Don't fail the whole document for price generation errors
            }
          }

          successCount++
          results.push({
            documentId: doc.id,
            fileName: doc.fileName,
            success: true,
            carrier: processedDoc?.carrier || undefined,
            memberName: memberName || undefined,
            priceCount,
          })

        } else {
          // Extraction failed
          await prisma.batchScanDocument.update({
            where: { id: doc.id },
            data: {
              status: 'FAILED',
              errorMessage: result.error || 'Extraction failed',
              processedAt: new Date(),
            },
          })

          failCount++
          errors.push({ file: doc.fileName, error: result.error || 'Extraction failed' })
          results.push({
            documentId: doc.id,
            fileName: doc.fileName,
            success: false,
            error: result.error,
          })
        }

        // Clean up temp document
        await prisma.insuranceDocument.delete({
          where: { id: tempDoc.id },
        }).catch(() => {}) // Ignore if already deleted

      } catch (docError) {
        const errorMsg = docError instanceof Error ? docError.message : 'Unknown error'

        await prisma.batchScanDocument.update({
          where: { id: doc.id },
          data: {
            status: 'FAILED',
            errorMessage: errorMsg,
            processedAt: new Date(),
          },
        })

        failCount++
        errors.push({ file: doc.fileName, error: errorMsg })
        results.push({
          documentId: doc.id,
          fileName: doc.fileName,
          success: false,
          error: errorMsg,
        })
      }

      // Update job progress
      await prisma.batchScanJob.update({
        where: { id: jobId },
        data: {
          processedFiles: { increment: 1 },
          successfulFiles: successCount,
          failedFiles: failCount,
        },
      })
    }

    // Finalize job
    await prisma.batchScanJob.update({
      where: { id: jobId },
      data: {
        status: failCount === job.documents.length ? 'FAILED' : 'COMPLETED',
        completedAt: new Date(),
        errorLog: errors.length > 0 ? errors : undefined,
      },
    })

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      jobId,
      stats: {
        total: job.documents.length,
        successful: successCount,
        failed: failCount,
        durationMs: duration,
      },
      results,
      message: `Processed ${job.documents.length} documents: ${successCount} successful, ${failCount} failed`,
    })

  } catch (error) {
    console.error('[BatchProcess] Error:', error)
    return NextResponse.json(
      {
        error: 'Batch processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/batch-scan/[id]/process
 * Get processing status for a batch job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params

    const job = await prisma.batchScanJob.findUnique({
      where: { id: jobId },
      include: {
        documents: {
          orderBy: { fileName: 'asc' },
          select: {
            id: true,
            fileName: true,
            status: true,
            carrier: true,
            memberName: true,
            confidenceScore: true,
            errorMessage: true,
            processedAt: true,
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Batch job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        name: job.name,
        status: job.status,
        totalFiles: job.totalFiles,
        processedFiles: job.processedFiles,
        successfulFiles: job.successfulFiles,
        failedFiles: job.failedFiles,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        progress: job.totalFiles > 0
          ? Math.round((job.processedFiles / job.totalFiles) * 100)
          : 0,
      },
      documents: job.documents,
    })
  } catch (error) {
    console.error('[BatchProcess] Error getting status:', error)
    return NextResponse.json(
      { error: 'Failed to get batch status' },
      { status: 500 }
    )
  }
}
