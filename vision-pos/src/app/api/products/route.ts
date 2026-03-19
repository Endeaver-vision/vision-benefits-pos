import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const displayGroup = searchParams.get('displayGroup')

    // Build where clause for filtering
    const where: {
      active?: boolean
      category?: string
      displayGroup?: string
    } = {
      active: true,
    }

    if (category) {
      where.category = category
    }

    if (displayGroup) {
      where.displayGroup = displayGroup
    }

    // Query LensProduct table (custom lab products)
    const products = await prisma.lensProduct.findMany({
      where,
      orderBy: [
        { displayGroup: 'asc' },  // 'everyday' before 'reserve'
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    // Transform to match expected interface
    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      basePrice: product.basePrice,
      displayGroup: product.displayGroup,
      displayOrder: product.displayOrder,
      tierVsp: product.tierVsp,
      tierEyemed: product.tierEyemed,
      tierSpectera: product.tierSpectera,
      category: {
        id: product.category,
        name: product.category,
        code: product.category,
        displayOrder: 0
      }
    }))

    return NextResponse.json({
      success: true,
      data: transformedProducts,
      count: transformedProducts.length
    })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, basePrice, tierVsp, tierEyemed, tierSpectera, displayGroup, displayOrder, active } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 })
    }

    // Build update data - only include provided fields
    const updateData: {
      basePrice?: number
      tierVsp?: string | null
      tierEyemed?: string | null
      tierSpectera?: string | null
      displayGroup?: string
      displayOrder?: number
      active?: boolean
    } = {}

    if (basePrice !== undefined) updateData.basePrice = Number(basePrice)
    if (tierVsp !== undefined) updateData.tierVsp = tierVsp
    if (tierEyemed !== undefined) updateData.tierEyemed = tierEyemed
    if (tierSpectera !== undefined) updateData.tierSpectera = tierSpectera
    if (displayGroup !== undefined) updateData.displayGroup = displayGroup
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder)
    if (active !== undefined) updateData.active = active

    const updatedProduct = await prisma.lensProduct.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: updatedProduct
    })
  } catch (error) {
    console.error('Products PATCH error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
