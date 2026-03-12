/**
 * Save VSP Price List API
 * POST /api/vsp/save-price-list
 *
 * Saves a VSP price list to the database as a new version
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPriceListVersion, type PriceItem } from '@/lib/services/price-list-version-service'

interface VspSavePriceListRequest {
  customerId: string
  authorizationId?: string
  planName?: string
  authorization: {
    patientInfo?: {
      name?: string
      authNumber?: string
    }
    lensMatrix?: Record<string, number>
    progressives?: Record<string, number>
    materials?: Record<string, number>
    arCoatings?: Record<string, number>
    [key: string]: unknown
  }
  priceList: Record<string, Array<{
    productId: string
    productName: string
    section: string
    retail: number
    copay: number
    patientCost: number
    svCopay?: number
    multiCopay?: number
    hasVariance?: boolean
    notes: string[]
    isCashOnly: boolean
    isNotCovered: boolean
  }>>
  createdBy?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as VspSavePriceListRequest

    const {
      customerId,
      authorizationId,
      planName,
      authorization,
      priceList,
      createdBy
    } = body

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId is required' },
        { status: 400 }
      )
    }

    if (!priceList || Object.keys(priceList).length === 0) {
      return NextResponse.json(
        { success: false, error: 'priceList is required' },
        { status: 400 }
      )
    }

    // Flatten price list sections into individual items
    const priceItems: PriceItem[] = []
    for (const section of Object.keys(priceList)) {
      for (const item of priceList[section]) {
        priceItems.push({
          productId: item.productId,
          productName: item.productName,
          section: item.section,
          retailPrice: item.retail,
          finalPrice: item.patientCost,
          copay: item.copay,
          svCopay: item.svCopay,
          multiCopay: item.multiCopay,
          hasVariance: item.hasVariance,
          notes: item.notes,
          isCashOnly: item.isCashOnly,
          isNotCovered: item.isNotCovered
        })
      }
    }

    // Extract lens matrix for storage
    const lensMatrixData = {
      lensMatrix: authorization.lensMatrix,
      progressives: authorization.progressives,
      materials: authorization.materials,
      arCoatings: authorization.arCoatings
    }

    const result = await createPriceListVersion({
      customerId,
      carrier: 'VSP',
      authorizationId,
      planName,
      lensMatrixData,
      extractedData: authorization,
      priceListData: priceList,
      priceItems,
      createdBy
    })

    return NextResponse.json({
      success: true,
      version: result.version,
      itemsCreated: result.itemsCreated,
      message: `Price list saved as ${result.version.versionLabel}`
    })
  } catch (error) {
    console.error('Error saving VSP price list:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save price list' },
      { status: 500 }
    )
  }
}
