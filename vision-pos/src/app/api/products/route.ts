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
    
    // Filter by insurance tier
    if (tier && carrier) {
      switch (carrier.toLowerCase()) {
        case 'vsp':
          where.tierVsp = tier
          break
        case 'eyemed':
          where.tierEyemed = tier
          break
        case 'spectera':
          where.tierSpectera = tier
          break
      }
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
        { category: { name: 'asc' } },
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