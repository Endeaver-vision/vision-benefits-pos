import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Upload directory - use absolute path
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'insurance-docs')

/**
 * POST /api/documents/upload
 * Upload a document file and create a pending document record
 *
 * Accepts multipart/form-data with:
 * - file: The document file (PDF, JPG, PNG)
 * - customerId: The customer ID to associate with
 * - uploadedBy: Staff ID or name
 * - caseId: Optional case ID for batch uploads
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const customerId = formData.get('customerId') as string | null
    const uploadedBy = formData.get('uploadedBy') as string | null

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId is required' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: ${file.type}. Allowed: PDF, JPG, PNG`,
        },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Check customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFileName = `${customerId}_${timestamp}_${sanitizedName}`
    const filePath = path.join(UPLOAD_DIR, uniqueFileName)

    // Write file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create document record
    const document = await prisma.insuranceDocument.create({
      data: {
        customerId,
        fileName: file.name,
        fileType: file.type,
        filePath: filePath,
        fileSize: file.size,
        uploadedBy: uploadedBy || 'api-upload',
        ocrStatus: 'pending',
        gptStatus: 'pending',
        isVerified: false,
      },
    })

    return NextResponse.json({
      success: true,
      documentId: document.id,
      fileName: document.fileName,
      filePath: document.filePath,
      status: 'pending',
      message: 'Document uploaded. Call /api/documents/[id]/process to extract data.',
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    )
  }
}
