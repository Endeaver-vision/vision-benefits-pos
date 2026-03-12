import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/documents
 * List all insurance documents with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status') // pending, processing, completed, failed
    const verified = searchParams.get('verified') // true, false
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}

    if (customerId) {
      where.customerId = customerId
    }

    if (status) {
      where.gptStatus = status
    }

    if (verified !== null) {
      where.isVerified = verified === 'true'
    }

    const [documents, total] = await Promise.all([
      prisma.insuranceDocument.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.insuranceDocument.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: documents,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + documents.length < total,
      },
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents
 * Create a new insurance document record
 * This is called by the Scanner app after processing a document
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      customerId,
      fileName,
      fileType,
      filePath,
      fileSize,
      uploadedBy,
      rawOcrText,
      extractedData,
      confidenceScore,
      carrier,
      planName,
    } = body

    if (!customerId || !fileName) {
      return NextResponse.json(
        { error: 'customerId and fileName are required' },
        { status: 400 }
      )
    }

    // Check customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    const document = await prisma.insuranceDocument.create({
      data: {
        customerId,
        fileName,
        fileType: fileType || 'application/pdf',
        filePath: filePath || '',
        fileSize: fileSize || 0,
        uploadedBy: uploadedBy || 'scanner-app',
        rawOcrText,
        ocrStatus: rawOcrText ? 'completed' : 'pending',
        gptStatus: extractedData ? 'completed' : 'pending',
        extractedData: extractedData || {},
        confidenceScore: confidenceScore || null,
        carrier: carrier || null,
        planName: planName || null,
        isVerified: false,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: document,
    })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    )
  }
}
