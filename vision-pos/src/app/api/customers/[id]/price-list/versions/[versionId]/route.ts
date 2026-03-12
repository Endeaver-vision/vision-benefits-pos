/**
 * Price List Version Detail API
 * GET /api/customers/[id]/price-list/versions/[versionId] - Get version details
 * DELETE /api/customers/[id]/price-list/versions/[versionId] - Delete version
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPriceListVersion, deletePriceListVersion } from '@/lib/services/price-list-version-service'

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { versionId } = await params

    const version = await getPriceListVersion(versionId)

    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      version
    })
  } catch (error) {
    console.error('Error fetching price list version:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch version' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { versionId } = await params

    await deletePriceListVersion(versionId)

    return NextResponse.json({
      success: true,
      message: 'Price list version deleted'
    })
  } catch (error) {
    console.error('Error deleting price list version:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete version' },
      { status: 500 }
    )
  }
}
