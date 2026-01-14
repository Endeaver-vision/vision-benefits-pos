/**
 * Carrier Tiers Admin API
 * GET /api/admin/carrier-tiers - Fetch all carrier tier mappings with stats
 * POST /api/admin/carrier-tiers - Create or update a carrier tier mapping
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const carrier = searchParams.get('carrier')
    const productType = searchParams.get('productType')

    // Build where clause
    const where: Record<string, string> = {}
    if (carrier) where.carrier = carrier
    if (productType) where.productType = productType

    // Fetch carrier tiers
    const carrierTiers = await prisma.carrierTier.findMany({
      where,
      orderBy: [
        { productType: 'asc' },
        { carrier: 'asc' },
        { productName: 'asc' }
      ]
    })

    // Fetch stats by carrier
    const stats = await prisma.carrierTier.groupBy({
      by: ['carrier'],
      _count: { id: true }
    })

    // Fetch stats by product type
    const typeStats = await prisma.carrierTier.groupBy({
      by: ['productType'],
      _count: { id: true }
    })

    // Fetch stats by pricing rule
    const ruleStats = await prisma.carrierTier.groupBy({
      by: ['pricingRule'],
      _count: { id: true }
    })

    // Get total lens products count (for coverage calculation)
    const lensProductCount = await prisma.lensProduct.count({ where: { active: true } })

    // Get total service count (for coverage calculation)
    const serviceCount = await prisma.servicePrice.count({ where: { isActive: true } })

    // Get products with tier columns (old system)
    const productsWithTiers = await prisma.product.count({
      where: {
        active: true,
        OR: [
          { tierVsp: { not: null } },
          { tierEyemed: { not: null } },
          { tierSpectera: { not: null } }
        ]
      }
    })

    // Calculate coverage percentages
    const vspCount = stats.find(s => s.carrier === 'VSP')?._count?.id || 0
    const eyemedCount = stats.find(s => s.carrier === 'EYEMED')?._count?.id || 0
    const specteraCount = stats.find(s => s.carrier === 'SPECTERA')?._count?.id || 0

    const totalProductsNeedingTiers = lensProductCount + serviceCount

    const coverage = {
      VSP: {
        mapped: vspCount,
        total: totalProductsNeedingTiers,
        percentage: totalProductsNeedingTiers > 0
          ? Math.round((vspCount / totalProductsNeedingTiers) * 100)
          : 0
      },
      EYEMED: {
        mapped: eyemedCount,
        total: totalProductsNeedingTiers,
        percentage: totalProductsNeedingTiers > 0
          ? Math.round((eyemedCount / totalProductsNeedingTiers) * 100)
          : 0
      },
      SPECTERA: {
        mapped: specteraCount,
        total: totalProductsNeedingTiers,
        percentage: totalProductsNeedingTiers > 0
          ? Math.round((specteraCount / totalProductsNeedingTiers) * 100)
          : 0
      }
    }

    return NextResponse.json({
      success: true,
      data: carrierTiers,
      stats: {
        total: carrierTiers.length,
        byCarrier: stats.reduce((acc, s) => {
          acc[s.carrier] = s._count.id
          return acc
        }, {} as Record<string, number>),
        byProductType: typeStats.reduce((acc, s) => {
          acc[s.productType] = s._count.id
          return acc
        }, {} as Record<string, number>),
        byPricingRule: ruleStats.reduce((acc, s) => {
          acc[s.pricingRule] = s._count.id
          return acc
        }, {} as Record<string, number>),
        coverage,
        legacyMappings: {
          lensCarrierTiers: await prisma.lensCarrierTier.count(),
          productsWithTierColumns: productsWithTiers
        }
      }
    })
  } catch (error) {
    console.error('[Carrier Tiers API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch carrier tiers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productType, productId, productName, carrier, tierCode, tierLabel, pricingRule } = body

    // Validate required fields
    if (!productType || !productId || !productName || !carrier || !tierCode || !pricingRule) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate carrier
    if (!['VSP', 'EYEMED', 'SPECTERA'].includes(carrier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid carrier. Must be VSP, EYEMED, or SPECTERA' },
        { status: 400 }
      )
    }

    // Validate pricing rule
    if (!['TIER_COPAY', '80_UC', 'ALLOWANCE', 'INCLUDED', 'CASH_ONLY'].includes(pricingRule)) {
      return NextResponse.json(
        { success: false, error: 'Invalid pricing rule' },
        { status: 400 }
      )
    }

    // Upsert the carrier tier
    const carrierTier = await prisma.carrierTier.upsert({
      where: {
        productType_productId_carrier: {
          productType,
          productId,
          carrier
        }
      },
      update: {
        tierCode,
        tierLabel,
        pricingRule,
        productName, // Update in case product name changed
        updatedAt: new Date()
      },
      create: {
        productType,
        productId,
        productName,
        carrier,
        tierCode,
        tierLabel,
        pricingRule
      }
    })

    return NextResponse.json({
      success: true,
      data: carrierTier
    })
  } catch (error) {
    console.error('[Carrier Tiers API] Error creating/updating:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save carrier tier' },
      { status: 500 }
    )
  }
}
