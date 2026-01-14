import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const tier = searchParams.get('tier')
    const carrier = searchParams.get('carrier')

    const where: Prisma.ProductWhereInput = {
      active: true,
    }

    // Filter by category
    if (category) {
      where.category = {
        code: category
      }
    }

    // Filter by insurance tier - now uses carrier_tiers table
    let productIdsWithTier: string[] | null = null
    if (tier && carrier) {
      const tierMappings = await prisma.carrierTier.findMany({
        where: {
          carrier: carrier.toUpperCase(),
          tierCode: tier,
          productType: 'PRODUCT'
        },
        select: { productId: true }
      })
      productIdsWithTier = tierMappings.map(t => t.productId)
      where.id = { in: productIdsWithTier }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        locations: {
          include: {
            location: true
          }
        }
      },
      orderBy: [
        { displayGroup: 'asc' },  // 'everyday' before 'reserve'
        { category: { displayOrder: 'asc' } },
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length
    })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}