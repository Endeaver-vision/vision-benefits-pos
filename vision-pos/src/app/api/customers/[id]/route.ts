import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/customers/[id] - Get customer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: {
        id: params.id,
        active: true
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 transactions
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: customer
    })
  } catch (error) {
    console.error('Get customer error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      insuranceCarrier,
      memberId,
      groupNumber,
      eligibilityDate,
      address,
      city,
      state,
      zipCode,
      notes
    } = body

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id: params.id, active: true }
    })

    if (!existingCustomer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 })
    }

    // Check for duplicate email if email is being changed
    if (email && email !== existingCustomer.email) {
      const duplicateCustomer = await prisma.customer.findFirst({
        where: {
          email,
          active: true,
          NOT: { id: params.id }
        }
      })

      if (duplicateCustomer) {
        return NextResponse.json({
          success: false,
          error: 'A customer with this email already exists'
        }, { status: 409 })
      }
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        insuranceCarrier,
        memberId,
        groupNumber,
        eligibilityDate: eligibilityDate ? new Date(eligibilityDate) : null,
        address,
        city,
        state,
        zipCode,
        notes
      }
    })

    return NextResponse.json({
      success: true,
      data: customer
    })
  } catch (error) {
    console.error('Update customer error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/customers/[id] - Soft delete customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id, active: true }
    })

    if (!customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 })
    }

    // Soft delete by setting active to false
    await prisma.customer.update({
      where: { id: params.id },
      data: { active: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully'
    })
  } catch (error) {
    console.error('Delete customer error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}