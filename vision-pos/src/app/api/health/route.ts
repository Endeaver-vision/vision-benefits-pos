import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection and get counts
    const [locationCount, userCount, carrierCount, categoryCount, productCount] = await Promise.all([
      prisma.location.count(),
      prisma.user.count(),
      prisma.insuranceCarrier.count(),
      prisma.productCategory.count(),
      prisma.product.count(),
    ])

    // Get sample data
    const locations = await prisma.location.findMany()
    const carriers = await prisma.insuranceCarrier.findMany()
    const sampleProducts = await prisma.product.findMany({
      take: 5,
      include: {
        category: true,
      },
    })
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      stats: {
        locations: locationCount,
        users: userCount,
        carriers: carrierCount,
        categories: categoryCount,
        products: productCount
      },
      data: {
        locations: locations.map(l => ({ name: l.name, address: l.address })),
        carriers: carriers.map(c => ({ name: c.name, code: c.code })),
        sampleProducts: sampleProducts.map(p => ({
          name: p.name,
          manufacturer: p.manufacturer,
          category: p.category.name,
          price: p.basePrice,
          tiers: {
            vsp: p.tierVsp,
            eyemed: p.tierEyemed,
            spectera: p.tierSpectera
          }
        }))
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