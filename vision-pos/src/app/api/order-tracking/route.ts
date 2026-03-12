import { NextRequest, NextResponse } from 'next/server'

/**
 * Order Tracking API
 * NOTE: Order model not yet implemented in database schema
 */

/**
 * GET /api/order-tracking
 * List all orders with optional filtering and pagination
 */
export async function GET() {
  // Order model not yet implemented - return empty response
  return NextResponse.json({
    success: true,
    orders: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  })
}

/**
 * POST /api/order-tracking
 * Create a new order
 */
export async function POST() {
  // Order model not yet implemented
  return NextResponse.json(
    { error: 'Order tracking not yet implemented' },
    { status: 501 }
  )
}
