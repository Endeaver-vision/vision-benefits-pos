import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// GET /api/exam-services/[id] - Get single exam service
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const examService = await (prisma as any).examService.findUnique({
      where: { id: params.id },
      include: {
        location: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!examService) {
      return NextResponse.json({ error: 'Exam service not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: examService
    })

  } catch (error) {
    console.error('Error fetching exam service:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exam service' },
      { status: 500 }
    )
  }
}

// PUT /api/exam-services/[id] - Update exam service (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or manager
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      name, 
      subtitle, 
      price, 
      duration, 
      category, 
      insuranceCovered, 
      copay, 
      locationId,
      active 
    } = body

    // Validate category if provided
    if (category) {
      const validCategories = ['PATIENT_TYPE', 'EXAM_TYPE', 'SCREENERS', 'DIAGNOSTICS', 'ADVANCED', 'CONTACT_FITTING']
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: 'Invalid category' },
          { status: 400 }
        )
      }
    }

    // Check if exam service exists
    const existingService = await (prisma as any).examService.findUnique({
      where: { id: params.id }
    })

    if (!existingService) {
      return NextResponse.json({ error: 'Exam service not found' }, { status: 404 })
    }

    // Update exam service
    const examService = await (prisma as any).examService.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(subtitle !== undefined && { subtitle: subtitle || null }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(duration !== undefined && { duration: parseInt(duration) }),
        ...(category && { category }),
        ...(insuranceCovered !== undefined && { insuranceCovered }),
        ...(copay !== undefined && { copay: copay ? parseFloat(copay) : null }),
        ...(locationId !== undefined && { locationId: locationId || null }),
        ...(active !== undefined && { active }),
        updatedBy: session.user.id
      },
      include: {
        location: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: examService
    })

  } catch (error) {
    console.error('Error updating exam service:', error)
    return NextResponse.json(
      { error: 'Failed to update exam service' },
      { status: 500 }
    )
  }
}

// DELETE /api/exam-services/[id] - Delete exam service (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Check if exam service exists
    const existingService = await (prisma as any).examService.findUnique({
      where: { id: params.id }
    })

    if (!existingService) {
      return NextResponse.json({ error: 'Exam service not found' }, { status: 404 })
    }

    // Soft delete by setting active to false instead of hard delete
    await (prisma as any).examService.update({
      where: { id: params.id },
      data: { 
        active: false,
        updatedBy: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Exam service deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting exam service:', error)
    return NextResponse.json(
      { error: 'Failed to delete exam service' },
      { status: 500 }
    )
  }
}