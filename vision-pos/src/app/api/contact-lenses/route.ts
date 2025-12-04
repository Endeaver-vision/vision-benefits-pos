import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const manufacturer = searchParams.get('manufacturer')
    const search = searchParams.get('search')
    const modality = searchParams.get('modality')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (manufacturer) {
      where.manufacturer = manufacturer
    }

    if (modality) {
      where.modality = modality
    }

    if (search) {
      where.OR = [
        { lensName: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
      ]
    }

    const lenses = await prisma.contactLens.findMany({
      where,
      orderBy: [
        { manufacturer: 'asc' },
        { lensName: 'asc' },
        { boxSize: 'desc' },
      ],
      take: limit,
    })

    // Get unique manufacturers for filtering
    const manufacturers = await prisma.contactLens.findMany({
      where: { isActive: true },
      select: { manufacturer: true },
      distinct: ['manufacturer'],
      orderBy: { manufacturer: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: lenses,
      manufacturers: manufacturers.map(m => m.manufacturer),
      count: lenses.length,
    })
  } catch (error) {
    console.error('Error fetching contact lenses:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact lenses' },
      { status: 500 }
    )
  }
}

// POST - Create new contact lens
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const lens = await prisma.contactLens.create({
      data: {
        manufacturer: body.manufacturer,
        lensName: body.lensName,
        boxSize: body.boxSize,
        retailPrice: body.retailPrice,
        officePrice: body.officePrice || body.retailPrice,
        wholesaleCost: body.wholesaleCost,
        annualSupplyBothEyes: body.annualSupplyBothEyes,
        annualSupplyPerEye: body.annualSupplyPerEye,
        modality: body.modality,
        isDaily: body.modality === 'daily',
        isWeekly: body.modality === 'biweekly',
        isMonthly: body.modality === 'monthly',
        isAstigmatism: body.isAstigmatism || false,
        isMultifocal: body.isMultifocal || false,
        isColor: body.isColor || false,
        isExtendedWear: body.isExtendedWear || false,
        isActive: true,
        showInPos: true,
      },
    })

    return NextResponse.json({ success: true, data: lens })
  } catch (error) {
    console.error('Error creating contact lens:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create contact lens' },
      { status: 500 }
    )
  }
}
