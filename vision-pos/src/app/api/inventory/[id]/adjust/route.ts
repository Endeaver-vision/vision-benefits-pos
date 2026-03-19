import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { quantity, productType, reason } = body

    if (typeof quantity !== 'number' || quantity === 0) {
      return NextResponse.json(
        { error: 'Invalid quantity' },
        { status: 400 }
      )
    }

    let updatedItem

    if (productType === 'frames') {
      // Update frame stock
      const frame = await prisma.frame.findUnique({ where: { id } })
      if (!frame) {
        return NextResponse.json({ error: 'Frame not found' }, { status: 404 })
      }

      const newStock = Math.max(0, frame.stockQuantity + quantity)
      updatedItem = await prisma.frame.update({
        where: { id },
        data: { stockQuantity: newStock }
      })
    } else if (productType === 'supplements') {
      // Update supplement stock
      const supplement = await prisma.supplement.findUnique({ where: { id } })
      if (!supplement) {
        return NextResponse.json({ error: 'Supplement not found' }, { status: 404 })
      }

      const newStock = Math.max(0, supplement.stockQuantity + quantity)
      updatedItem = await prisma.supplement.update({
        where: { id },
        data: { stockQuantity: newStock }
      })
    } else if (productType === 'dryeye') {
      // Update dry eye product stock
      const dryEye = await prisma.dryEyeProduct.findUnique({ where: { id } })
      if (!dryEye) {
        return NextResponse.json({ error: 'Dry eye product not found' }, { status: 404 })
      }

      const newStock = Math.max(0, dryEye.stockQuantity + quantity)
      updatedItem = await prisma.dryEyeProduct.update({
        where: { id },
        data: { stockQuantity: newStock }
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid product type' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: `Stock ${quantity > 0 ? 'increased' : 'decreased'} by ${Math.abs(quantity)}`
    })

  } catch (error) {
    console.error('Stock adjustment error:', error)
    return NextResponse.json(
      { error: 'Failed to adjust stock' },
      { status: 500 }
    )
  }
}
