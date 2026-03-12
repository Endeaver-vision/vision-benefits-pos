/**
 * Price List Versions API
 * GET /api/customers/[id]/price-list/versions - List all versions
 * POST /api/customers/[id]/price-list/versions - Create new version
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getPriceListVersions,
  createPriceListVersion,
  type CreateVersionInput,
  type PriceItem
} from '@/lib/services/price-list-version-service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: customerId } = await params
    const { searchParams } = new URL(request.url)
    const carrier = searchParams.get('carrier') || undefined

    const versions = await getPriceListVersions(customerId, carrier)

    return NextResponse.json({
      success: true,
      versions
    })
  } catch (error) {
    console.error('Error fetching price list versions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: customerId } = await params
    const body = await request.json()

    const {
      carrier,
      authorizationId,
      planName,
      lensMatrixData,
      extractedData,
      priceListData,
      priceItems,
      createdBy
    } = body as {
      carrier: 'VSP' | 'EyeMed' | 'Spectera'
      authorizationId?: string
      planName?: string
      lensMatrixData?: Record<string, unknown>
      extractedData?: Record<string, unknown>
      priceListData?: Record<string, unknown>
      priceItems: PriceItem[]
      createdBy?: string
    }

    if (!carrier || !priceItems || !Array.isArray(priceItems)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: carrier, priceItems' },
        { status: 400 }
      )
    }

    const input: CreateVersionInput = {
      customerId,
      carrier,
      authorizationId,
      planName,
      lensMatrixData,
      extractedData,
      priceListData,
      priceItems,
      createdBy
    }

    const result = await createPriceListVersion(input)

    return NextResponse.json({
      success: true,
      version: result.version,
      itemsCreated: result.itemsCreated
    })
  } catch (error) {
    console.error('Error creating price list version:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create version' },
      { status: 500 }
    )
  }
}
