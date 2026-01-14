import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { passed, notes, performedBy, performedByName } = body

    const qualityCheck = await prisma.orderQualityCheck.create({
      data: {
        orderId: id,
        passed,
        notes,
        performedBy,
        performedByName,
        performedAt: new Date(),
      },
    })

    return NextResponse.json(qualityCheck)
  } catch (error) {
    console.error('Error creating quality check:', error)
    return NextResponse.json(
      { error: 'Failed to create quality check' },
      { status: 500 }
    )
  }
}
