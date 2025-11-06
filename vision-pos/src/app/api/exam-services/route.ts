import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

// GET /api/exam-services - Get all exam services with optional location filter
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    const category = searchParams.get('category')
    const active = searchParams.get('active')

    // Build where clause
    const where: any = {}
    
    if (locationId) {
      where.OR = [
        { locationId: locationId },
        { locationId: null } // Services available at all locations
      ]
    }
    
    if (category) {
      where.category = category
    }
    
    if (active !== null) {
      where.active = active === 'true'
    }

    const examServices = await (prisma as any).examService.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ],
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
      data: examServices
    })

  } catch (error) {
    console.error('Error fetching exam services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exam services' },
      { status: 500 }
    )
  }
}

// POST /api/exam-services - Create new exam service (Admin only)
export async function POST(request: NextRequest) {
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

    // Validate required fields
    if (!name || price === undefined || duration === undefined || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price, duration, category' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['PATIENT_TYPE', 'EXAM_TYPE', 'SCREENERS', 'DIAGNOSTICS', 'ADVANCED', 'CONTACT_FITTING']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    const examService = await (prisma as any).examService.create({
      data: {
        name,
        subtitle: subtitle || null,
        price: parseFloat(price),
        duration: parseInt(duration),
        category,
        insuranceCovered: insuranceCovered || false,
        copay: copay ? parseFloat(copay) : null,
        locationId: locationId || null,
        active: active !== false, // Default to true
        createdBy: session.user.id
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
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating exam service:', error)
    return NextResponse.json(
      { error: 'Failed to create exam service' },
      { status: 500 }
    )
  }
}