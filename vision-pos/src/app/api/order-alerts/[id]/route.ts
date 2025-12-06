import { NextRequest, NextResponse } from 'next/server'
import { acknowledgeAlert, resolveAlert } from '@/lib/order-alerts'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, userId, userName, notes } = body

    if (action === 'acknowledge') {
      const alert = await acknowledgeAlert(id, userName || userId || 'unknown')
      return NextResponse.json({ success: true, alert })
    }

    if (action === 'resolve') {
      const alert = await resolveAlert(id, userName || userId || 'unknown', notes)
      return NextResponse.json({ success: true, alert })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "acknowledge" or "resolve".' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating alert:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}
