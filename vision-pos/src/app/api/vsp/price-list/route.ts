/**
 * VSP Price List API Endpoint
 * POST /api/vsp/price-list
 *
 * Generates a complete price list for all products using VSP benefits.
 * Takes a VspMergedAuthorization and returns copays for each product.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { VspMergedAuthorization } from '@/types/vsp-authorization'
import {
  generateVspPriceList,
  calculateVspPricing,
  type VspPricingInput,
  type VspPriceListItem,
} from '@/lib/pricing/vsp-product-mapping'

interface GeneratePriceListRequest {
  authorization: VspMergedAuthorization
}

interface CalculatePricingRequest {
  authorization: VspMergedAuthorization
  input: VspPricingInput
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a single calculation or full price list
    if ('input' in body) {
      // Single product pricing
      const { authorization, input } = body as CalculatePricingRequest

      if (!authorization || !input) {
        return NextResponse.json(
          { success: false, error: 'authorization and input are required' },
          { status: 400 }
        )
      }

      const result = calculateVspPricing(input, authorization)
      return NextResponse.json({
        success: true,
        pricing: result,
      })
    }

    // Full price list generation
    const { authorization } = body as GeneratePriceListRequest

    if (!authorization) {
      return NextResponse.json(
        { success: false, error: 'authorization is required' },
        { status: 400 }
      )
    }

    const priceList = generateVspPriceList(authorization)

    // Group by section for easier consumption
    const grouped: Record<string, VspPriceListItem[]> = {}
    for (const item of priceList) {
      if (!grouped[item.section]) {
        grouped[item.section] = []
      }
      grouped[item.section].push(item)
    }

    return NextResponse.json({
      success: true,
      patientInfo: {
        name: authorization.patientInfo.name,
        authNumber: authorization.patientInfo.authNumber,
        effectiveDate: authorization.patientInfo.effectiveDate,
        expirationDate: authorization.patientInfo.expirationDate,
      },
      planInfo: {
        planType: authorization.planInfo.planType,
        materialCopay: authorization.copays.material,
        frameAllowance: authorization.frameAllowance.amount,
        hasEasyOptions: authorization.easyOptions?.enabled ?? false,
        isComputerVisioncare: authorization.flags.isComputerVisioncare,
      },
      priceList: grouped,
      summary: {
        totalProducts: priceList.length,
        coveredProducts: priceList.filter(p => !p.isCashOnly && !p.isNotCovered).length,
        cashOnlyProducts: priceList.filter(p => p.isCashOnly).length,
        notCoveredProducts: priceList.filter(p => p.isNotCovered).length,
      },
    })
  } catch (error) {
    console.error('[VSP Price List API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate price list',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
