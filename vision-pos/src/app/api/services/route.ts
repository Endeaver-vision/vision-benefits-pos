import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const services = await prisma.servicePrice.findMany({
      where: {
        isActive: true,
        showInPos: true
      },
      orderBy: [
        { category: 'asc' },
        { posDisplayOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: services,
      count: services.length
    })
  } catch (error) {
    console.error('Services API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, retailPrice, tierVsp, tierEyemed, tierSpectera, isActive, posDisplayOrder } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Service ID is required'
      }, { status: 400 })
    }

    // Build update data - only include provided fields
    const updateData: {
      retailPrice?: number
      tierVsp?: string | null
      tierEyemed?: string | null
      tierSpectera?: string | null
      isActive?: boolean
      posDisplayOrder?: number
    } = {}

    if (retailPrice !== undefined) updateData.retailPrice = Number(retailPrice)
    if (tierVsp !== undefined) updateData.tierVsp = tierVsp
    if (tierEyemed !== undefined) updateData.tierEyemed = tierEyemed
    if (tierSpectera !== undefined) updateData.tierSpectera = tierSpectera
    if (isActive !== undefined) updateData.isActive = isActive
    if (posDisplayOrder !== undefined) updateData.posDisplayOrder = Number(posDisplayOrder)

    const updatedService = await prisma.servicePrice.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: updatedService
    })
  } catch (error) {
    console.error('Services PATCH error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
