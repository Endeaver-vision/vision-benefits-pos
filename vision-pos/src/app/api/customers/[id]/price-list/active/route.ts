/**
 * Active Price List API
 * GET /api/customers/[id]/price-list/active
 *
 * THE SINGLE SOURCE OF TRUTH FOR CUSTOMER PRICING.
 * Returns everything the POS needs from PriceListVersion.extractedData:
 * - Product prices
 * - Exam/materials copays
 * - Frame/contact allowances
 * - Eligibility info
 * - Patient info
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Type for extractedData structure
interface ExtractedData {
  copays?: {
    exam?: number
    material?: number
  }
  frameAllowance?: {
    amount?: number
    altairAmount?: number
    overageDiscount?: number
  }
  contactLens?: {
    examCopay?: number
    necessaryCopay?: number
    materialsAllowance?: number
    pattern?: string
    insteadOf?: string[]
  }
  eligibility?: {
    exam?: boolean
    lens?: boolean
    frame?: boolean
    contacts?: boolean
    contactLensExam?: boolean
  }
  patientInfo?: {
    name?: string
    memberName?: string
    authNumber?: string
    effectiveDate?: string
    expirationDate?: string
  }
  planInfo?: {
    network?: string
    planType?: string
    clientName?: string
  }
  materials?: Record<string, number>
  arCoatings?: Record<string, number>
  lensMatrix?: Record<string, number>
  enhancements?: Record<string, number>
  progressives?: Record<string, number>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: customerId } = await params

    // Find the most recent active price list version for this customer
    const activeVersion = await prisma.priceListVersion.findFirst({
      where: {
        customerId,
        active: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        priceItems: true,
      },
    })

    if (!activeVersion) {
      return NextResponse.json({
        success: true,
        priceList: null,
        message: 'No active price list found. Upload an insurance document to get pricing.',
      })
    }

    // Build prices map: productId -> price (number or tier-based object)
    const prices: Record<string, number | Record<string, number>> = {}

    // Parse extractedData - THE SOURCE OF TRUTH
    const extractedData = activeVersion.extractedData as ExtractedData | null

    // Parse priceListData JSON for SV/MF variance data
    const priceListData = activeVersion.priceListData as Record<string, unknown> | null

    if (priceListData) {
      // VSP-style section-keyed structure
      const sections = ['LENS TYPES', 'MATERIALS', 'AR COATINGS', 'PHOTOCHROMICS', 'ADD-ONS', 'MOUNT FEES']
      for (const section of sections) {
        const sectionData = priceListData[section]
        if (!Array.isArray(sectionData)) continue

        for (const item of sectionData as Array<{
          productId?: string
          patientCost?: number
          copay?: number
          svCopay?: number
          multiCopay?: number
          hasVariance?: boolean
        }>) {
          const productId = item.productId
          if (!productId) continue

          if (item.hasVariance && item.svCopay !== undefined && item.multiCopay !== undefined) {
            prices[productId] = { sv: item.svCopay, mf: item.multiCopay }
          } else if (item.patientCost !== undefined) {
            prices[productId] = item.patientCost
          } else if (item.copay !== undefined) {
            prices[productId] = item.copay
          }
        }
      }

      // Array-based structure
      if (priceListData.categories && Array.isArray(priceListData.categories)) {
        for (const cat of priceListData.categories as Array<{
          name: string
          items: Array<{
            id?: string
            sku?: string
            finalPrice?: number
            copay?: number
            tier?: string
            tierPricing?: Record<string, number>
          }>
        }>) {
          if (cat.items && Array.isArray(cat.items)) {
            for (const item of cat.items) {
              const productId = item.id || item.sku
              if (!productId || prices[productId] !== undefined) continue

              if (item.tierPricing) {
                prices[productId] = item.tierPricing
              } else if (item.tier && item.finalPrice !== undefined) {
                const existing = prices[productId]
                if (typeof existing === 'object') {
                  existing[item.tier] = item.finalPrice
                } else {
                  prices[productId] = { [item.tier]: item.finalPrice }
                }
              } else if (item.finalPrice !== undefined) {
                prices[productId] = item.finalPrice
              } else if (item.copay !== undefined) {
                prices[productId] = item.copay
              }
            }
          }
        }
      }
    }

    // Add prices from priceItems table (fallback)
    for (const item of activeVersion.priceItems) {
      if (prices[item.productId] !== undefined) continue

      const finalPrice = item.finalPrice ? Number(item.finalPrice) : Number(item.retailPrice)

      if (item.tier) {
        const existing = prices[item.productId]
        if (typeof existing === 'object') {
          existing[item.tier] = finalPrice
        } else {
          prices[item.productId] = { [item.tier]: finalPrice }
        }
      } else {
        prices[item.productId] = finalPrice
      }
    }

    // Check lensMatrixData for VSP tier pricing
    const lensMatrixData = activeVersion.lensMatrixData as Record<string, unknown> | null
    if (lensMatrixData) {
      const tiers = ['K', 'J', 'F', 'O', 'N']
      for (const tier of tiers) {
        const tierData = lensMatrixData[tier] as Record<string, number> | undefined
        if (tierData) {
          for (const [productId, price] of Object.entries(tierData)) {
            const existing = prices[productId]
            if (typeof existing === 'object') {
              existing[tier] = price
            } else if (existing === undefined) {
              prices[productId] = { [tier]: price }
            }
          }
        }
      }
    }

    // Build the complete price list response with ALL data from extractedData
    return NextResponse.json({
      success: true,
      priceList: {
        // Identification
        versionId: activeVersion.id,
        carrier: activeVersion.insuranceCarrier,
        planName: activeVersion.planName || extractedData?.planInfo?.planType,

        // Dates
        effectiveDate: extractedData?.patientInfo?.effectiveDate || activeVersion.createdAt.toISOString(),
        expirationDate: extractedData?.patientInfo?.expirationDate || null,

        // === COPAYS (from extractedData.copays) ===
        examCopay: extractedData?.copays?.exam ?? null,
        materialsCopay: extractedData?.copays?.material ?? null,

        // === FRAME BENEFITS ===
        frameAllowance: extractedData?.frameAllowance?.amount ?? null,
        frameAllowanceAltair: extractedData?.frameAllowance?.altairAmount ?? null,
        frameOverageDiscount: extractedData?.frameAllowance?.overageDiscount ?? 0.20,

        // === CONTACT LENS BENEFITS ===
        contactLens: {
          examCopay: extractedData?.contactLens?.examCopay ?? null,
          fittingCopay: extractedData?.contactLens?.examCopay ?? null, // Same for VSP
          materialsAllowance: extractedData?.contactLens?.materialsAllowance ?? null,
          insteadOf: extractedData?.contactLens?.insteadOf ?? ['lens', 'frame'],
        },

        // === ELIGIBILITY ===
        eligibility: {
          exam: extractedData?.eligibility?.exam ?? false,
          lens: extractedData?.eligibility?.lens ?? false,
          frame: extractedData?.eligibility?.frame ?? false,
          contacts: extractedData?.eligibility?.contacts ?? false,
        },

        // === PATIENT INFO ===
        patientInfo: {
          name: extractedData?.patientInfo?.name ?? null,
          memberName: extractedData?.patientInfo?.memberName ?? null,
          authNumber: extractedData?.patientInfo?.authNumber ?? null,
        },

        // === PRODUCT PRICES ===
        prices,
      },
    })
  } catch (error) {
    console.error('Error fetching active price list:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch active price list' },
      { status: 500 }
    )
  }
}
