import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      where: {
        active: true,
      },
      include: {
        _count: {
          select: {
            users: true,
            products: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      data: locations
    })
  } catch (error) {
    console.error('Locations API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}