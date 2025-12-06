import { NextResponse } from 'next/server'
import { checkOrderTimelines, getUnresolvedAlerts, getAlertStats } from '@/lib/order-alerts'

export async function GET() {
  try {
    const [alerts, stats] = await Promise.all([
      getUnresolvedAlerts(),
      getAlertStats(),
    ])

    return NextResponse.json({
      alerts,
      stats,
    })
  } catch (error) {
    console.error('Error fetching order alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order alerts' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const newAlerts = await checkOrderTimelines()

    return NextResponse.json({
      success: true,
      alertsCreated: newAlerts.length,
      alerts: newAlerts,
    })
  } catch (error) {
    console.error('Error checking order timelines:', error)
    return NextResponse.json(
      { error: 'Failed to check order timelines' },
      { status: 500 }
    )
  }
}
