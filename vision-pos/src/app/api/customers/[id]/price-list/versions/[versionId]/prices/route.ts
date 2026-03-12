/**
 * Price List Version Prices API
 * GET /api/customers/[id]/price-list/versions/[versionId]/prices
 *
 * Returns full price data from saved version in a format ready for quote builder use.
 * This endpoint transforms the stored price list data into quote-compatible items.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>
}

interface QuoteReadyPriceItem {
  sku: string
  productId: string
  displayName: string
  category: 'exam' | 'frame' | 'lens' | 'coating' | 'addon' | 'contact' | 'service'
  section?: string
  retailPrice: number
  finalPrice: number
  patientPays: number
  insurancePays: number
  savings: number
  tier?: string | null
  copay?: number | null
  notes?: string[]
  isCashOnly?: boolean
  isNotCovered?: boolean
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: customerId, versionId } = await params

    // Fetch version with price items and related product info
    const version = await prisma.priceListVersion.findUnique({
      where: { id: versionId },
      include: {
        priceItems: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                category: true
              }
            }
          }
        }
      }
    })

    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      )
    }

    // Verify version belongs to the correct customer
    if (version.customerId !== customerId) {
      return NextResponse.json(
        { success: false, error: 'Version does not belong to this customer' },
        { status: 403 }
      )
    }

    // Transform price items into quote-ready format
    const priceItems: QuoteReadyPriceItem[] = version.priceItems.map(item => {
      const retailPrice = Number(item.retailPrice)
      const finalPrice = item.finalPrice ? Number(item.finalPrice) : retailPrice
      const savings = Number(item.savings || 0)

      // Map product category to quote category
      let category: QuoteReadyPriceItem['category'] = 'service'
      if (item.product) {
        const productCategory = item.product.category?.toLowerCase() || ''
        if (productCategory.includes('exam')) category = 'exam'
        else if (productCategory.includes('frame')) category = 'frame'
        else if (productCategory.includes('lens') && !productCategory.includes('contact')) category = 'lens'
        else if (productCategory.includes('coating') || productCategory.includes('ar')) category = 'coating'
        else if (productCategory.includes('addon') || productCategory.includes('enhancement')) category = 'addon'
        else if (productCategory.includes('contact')) category = 'contact'
      }

      return {
        sku: item.product?.sku || item.productId,
        productId: item.productId,
        displayName: item.product?.name || item.productId,
        category,
        retailPrice,
        finalPrice,
        patientPays: finalPrice,
        insurancePays: retailPrice - finalPrice,
        savings,
        tier: item.tier
      }
    })

    // Also include any prices stored in the priceListData JSON (for items not in product catalog)
    const priceListData = version.priceListData as Record<string, unknown> | null
    if (priceListData?.categories && Array.isArray(priceListData.categories)) {
      for (const cat of priceListData.categories as Array<{ name: string; items: Array<{
        id?: string
        sku?: string
        name?: string
        retailPrice?: number
        finalPrice?: number
        copay?: number
        tier?: string
        notes?: string[]
        isCashOnly?: boolean
        isNotCovered?: boolean
      }> }>) {
        if (cat.items && Array.isArray(cat.items)) {
          for (const item of cat.items) {
            // Skip if already in priceItems
            const exists = priceItems.some(p => p.productId === item.id || p.sku === item.sku)
            if (exists) continue

            const retailPrice = item.retailPrice ?? 0
            const finalPrice = item.finalPrice ?? retailPrice

            // Determine category from section name
            let category: QuoteReadyPriceItem['category'] = 'service'
            const catName = cat.name?.toLowerCase() || ''
            if (catName.includes('exam')) category = 'exam'
            else if (catName.includes('frame')) category = 'frame'
            else if (catName.includes('lens') && !catName.includes('contact')) category = 'lens'
            else if (catName.includes('coating') || catName.includes('ar')) category = 'coating'
            else if (catName.includes('addon') || catName.includes('enhancement')) category = 'addon'
            else if (catName.includes('contact')) category = 'contact'

            priceItems.push({
              sku: item.sku || item.id || '',
              productId: item.id || item.sku || '',
              displayName: item.name || 'Unknown Item',
              category,
              section: cat.name,
              retailPrice,
              finalPrice,
              patientPays: finalPrice,
              insurancePays: retailPrice - finalPrice,
              savings: retailPrice - finalPrice,
              tier: item.tier,
              copay: item.copay,
              notes: item.notes,
              isCashOnly: item.isCashOnly,
              isNotCovered: item.isNotCovered
            })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      version: {
        id: version.id,
        versionLabel: version.versionLabel,
        carrier: version.insuranceCarrier,
        planName: version.planName,
        createdAt: version.createdAt.toISOString(),
        active: version.active
      },
      priceItems,
      totalItems: priceItems.length
    })
  } catch (error) {
    console.error('Error fetching price list version prices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch version prices' },
      { status: 500 }
    )
  }
}
