/**
 * Activate Price List Version API
 * PUT /api/customers/[id]/price-list/versions/[versionId]/activate
 */

import { NextRequest, NextResponse } from 'next/server'
import { activatePriceListVersion } from '@/lib/services/price-list-version-service'

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: customerId, versionId } = await params

    await activatePriceListVersion(customerId, versionId)

    return NextResponse.json({
      success: true,
      message: 'Version activated successfully'
    })
  } catch (error) {
    console.error('Error activating price list version:', error)
    const message = error instanceof Error ? error.message : 'Failed to activate version'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
