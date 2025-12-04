import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Update customer insurance information
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const customerId = params.id
    const body = await request.json()

    console.log('[Insurance API] Updating insurance for customer:', customerId)

    const {
      carrier,
      memberId,
      groupNumber,
      eligibilityDate
    } = body

    // Validate required fields
    if (carrier && carrier !== 'None' && !memberId) {
      return NextResponse.json(
        { error: 'Member ID is required when insurance carrier is selected' },
        { status: 400 }
      )
    }

    // Update customer insurance info
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        insuranceCarrier: carrier === 'None' ? null : carrier,
        memberId: carrier === 'None' ? null : memberId,
        groupNumber: carrier === 'None' ? null : groupNumber,
        eligibilityDate: eligibilityDate ? new Date(eligibilityDate) : null
      }
    })

    console.log('[Insurance API] Insurance updated successfully')

    return NextResponse.json({
      success: true,
      data: updatedCustomer
    })

  } catch (error) {
    console.error('[Insurance API] Error updating insurance:', error)
    return NextResponse.json(
      { error: 'Failed to update insurance information', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET - Fetch customer insurance information
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const customerId = params.id

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        insuranceCarrier: true,
        memberId: true,
        groupNumber: true,
        eligibilityDate: true
      }
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        carrier: customer.insuranceCarrier || 'None',
        memberId: customer.memberId || '',
        groupNumber: customer.groupNumber || '',
        eligibilityDate: customer.eligibilityDate?.toISOString().split('T')[0] || ''
      }
    })

  } catch (error) {
    console.error('[Insurance API] Error fetching insurance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insurance information' },
      { status: 500 }
    )
  }
}
