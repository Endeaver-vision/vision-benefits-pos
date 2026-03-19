import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productType, name, brand, sku, wholesaleCost, retailPrice, stockQuantity, category } = body

    if (!name || !retailPrice) {
      return NextResponse.json(
        { error: 'Name and retail price are required' },
        { status: 400 }
      )
    }

    let newProduct

    if (productType === 'frames') {
      // Parse brand and model from name for frames
      const nameParts = name.split(' ')
      const frameBrand = brand || nameParts[0] || 'Unknown'
      const frameModel = nameParts.slice(1).join(' ') || name

      newProduct = await prisma.frame.create({
        data: {
          manufacturer: frameBrand,
          brand: frameBrand,
          model: frameModel,
          color: 'Default',
          sku: sku || null,
          wholesaleCost: wholesaleCost || 0,
          retailPrice: retailPrice,
          stockQuantity: stockQuantity || 0,
          isActive: true
        }
      })
    } else if (productType === 'supplements') {
      newProduct = await prisma.supplement.create({
        data: {
          name,
          brand: brand || null,
          sku: sku || null,
          wholesaleCost: wholesaleCost || null,
          retailPrice,
          stockQuantity: stockQuantity || 0,
          reorderPoint: 5,
          category: category || null,
          isActive: true,
          showInPos: true
        }
      })
    } else if (productType === 'dryeye') {
      newProduct = await prisma.dryEyeProduct.create({
        data: {
          name,
          brand: brand || null,
          sku: sku || null,
          wholesaleCost: wholesaleCost || null,
          retailPrice,
          stockQuantity: stockQuantity || 0,
          reorderPoint: 5,
          category: category || null,
          isActive: true,
          showInPos: true
        }
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid product type' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newProduct,
      message: `${productType === 'frames' ? 'Frame' : productType === 'supplements' ? 'Supplement' : 'Dry eye product'} added successfully`
    }, { status: 201 })

  } catch (error) {
    console.error('Add product error:', error)
    return NextResponse.json(
      { error: 'Failed to add product' },
      { status: 500 }
    )
  }
}
