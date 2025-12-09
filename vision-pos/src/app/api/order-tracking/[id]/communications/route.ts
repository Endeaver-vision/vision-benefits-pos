import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { type, message, sentBy, sentByName } = body

    const communication = await prisma.orderCommunication.create({
      data: {
        orderId: id,
        type,
        message,
        sentBy,
        sentByName,
        timestamp: new Date(),
      },
    })

    return NextResponse.json(communication)
  } catch (error) {
    console.error('Error creating communication:', error)
    return NextResponse.json(
      { error: 'Failed to create communication' },
      { status: 500 }
    )
  }
}
