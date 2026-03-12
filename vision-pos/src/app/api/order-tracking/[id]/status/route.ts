import { NextRequest, NextResponse } from 'next/server'

/**
 * Order Status API
 * NOTE: Order model not yet implemented in database schema
 */

/**
 * POST /api/order-tracking/[id]/status
 * Update order status
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Order model not yet implemented
  return NextResponse.json(
    { error: 'Order tracking not yet implemented' },
    { status: 501 }
  )
}
