import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readdirSync, statSync } from 'fs'
import path from 'path'

/**
 * GET /api/batch-scan
 * List all batch scan jobs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) {
      where.status = status
    }

    const jobs = await prisma.batchScanJob.findMany({
      where,
      include: {
        documents: {
          select: {
            id: true,
            status: true,
            carrier: true,
            memberName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Add summary stats to each job
    const jobsWithStats = jobs.map(job => ({
      ...job,
      stats: {
        total: job.documents.length,
        pending: job.documents.filter(d => d.status === 'PENDING').length,
        processing: job.documents.filter(d => d.status === 'PROCESSING').length,
        completed: job.documents.filter(d => d.status === 'COMPLETED').length,
        failed: job.documents.filter(d => d.status === 'FAILED').length,
        assigned: job.documents.filter(d => d.status === 'ASSIGNED').length,
      },
    }))

    return NextResponse.json({
      success: true,
      data: jobsWithStats,
    })
  } catch (error) {
    console.error('[BatchScan] Error listing jobs:', error)
    return NextResponse.json(
      { error: 'Failed to list batch scan jobs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/batch-scan
 * Create a new batch scan job from a folder path
 *
 * Body: { folderPath: string, name?: string, createdBy?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { folderPath, name, createdBy } = body

    if (!folderPath) {
      return NextResponse.json(
        { error: 'folderPath is required' },
        { status: 400 }
      )
    }

    // Validate folder exists and scan for files
    let files: string[] = []
    try {
      const entries = readdirSync(folderPath)
      files = entries.filter(file => {
        const ext = path.extname(file).toLowerCase()
        return ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)
      })
    } catch (err) {
      return NextResponse.json(
        { error: `Cannot read folder: ${folderPath}` },
        { status: 400 }
      )
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No PDF or image files found in folder' },
        { status: 400 }
      )
    }

    // Create the batch job
    const job = await prisma.batchScanJob.create({
      data: {
        name: name || `Batch ${new Date().toLocaleDateString()}`,
        folderPath,
        status: 'PENDING',
        totalFiles: files.length,
        createdBy,
      },
    })

    // Create document records for each file
    const documentData = files.map(fileName => {
      const filePath = path.join(folderPath, fileName)
      const stats = statSync(filePath)
      return {
        batchJobId: job.id,
        fileName,
        filePath,
        fileSize: stats.size,
        status: 'PENDING' as const,
      }
    })

    await prisma.batchScanDocument.createMany({
      data: documentData,
    })

    // Get created documents
    const documents = await prisma.batchScanDocument.findMany({
      where: { batchJobId: job.id },
      orderBy: { fileName: 'asc' },
    })

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        name: job.name,
        status: job.status,
        totalFiles: job.totalFiles,
        folderPath: job.folderPath,
      },
      documents: documents.map(d => ({
        id: d.id,
        fileName: d.fileName,
        status: d.status,
      })),
      message: `Created batch job with ${files.length} documents. Call POST /api/batch-scan/${job.id}/process to start processing.`,
    })
  } catch (error) {
    console.error('[BatchScan] Error creating job:', error)
    return NextResponse.json(
      { error: 'Failed to create batch scan job' },
      { status: 500 }
    )
  }
}
