import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection and get counts
    const [locationCount, customerCount, lensProductCount, frameCount] = await Promise.all([
      prisma.location.count(),
      prisma.customer.count(),
      prisma.lensProduct.count(),
      prisma.frame.count(),
    ])

    // Get sample data
    const locations = await prisma.location.findMany()

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      stats: {
        locations: locationCount,
        customers: customerCount,
        lensProducts: lensProductCount,
        frames: frameCount
      },
      data: {
        locations: locations.map(l => ({ name: l.name, address: l.address })),
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}