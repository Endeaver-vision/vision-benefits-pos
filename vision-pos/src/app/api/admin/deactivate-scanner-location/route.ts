import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if a specific location ID was provided
    let locationId: string | null = null
    try {
      const body = await request.json()
      locationId = body.locationId
    } catch {
      // No body provided, will search for scanner/default locations
    }

    // Find all locations first
    const allLocations = await prisma.location.findMany({
      select: { id: true, name: true, active: true }
    })

    console.log('All locations:', allLocations)

    let locationToDeactivate = null

    if (locationId) {
      // Deactivate specific location by ID
      locationToDeactivate = allLocations.find(loc => loc.id === locationId)
    } else {
      // Find "Insurance Scanner", "Scanner", or "Default" location
      locationToDeactivate = allLocations.find(loc =>
        loc.name.toLowerCase().includes('scanner') ||
        loc.name.toLowerCase().includes('insurance scanner') ||
        loc.name.toLowerCase() === 'default' ||
        loc.name.toLowerCase().includes('main office')
      )
    }

    if (!locationToDeactivate) {
      return NextResponse.json({
        success: false,
        message: 'No matching location found to deactivate',
        locations: allLocations
      })
    }

    // Deactivate it
    await prisma.location.update({
      where: { id: locationToDeactivate.id },
      data: { active: false }
    })

    // Get updated active locations
    const activeLocations = await prisma.location.findMany({
      where: { active: true },
      select: { id: true, name: true }
    })

    return NextResponse.json({
      success: true,
      message: `Deactivated location: ${locationToDeactivate.name}`,
      deactivated: locationToDeactivate,
      activeLocations
    })
  } catch (error) {
    console.error('Deactivate scanner error:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate location', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Allow unauthenticated GET for debugging
    const allLocations = await prisma.location.findMany({
      select: { id: true, name: true, active: true },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      locations: allLocations,
      activeCount: allLocations.filter(l => l.active).length,
      inactiveCount: allLocations.filter(l => !l.active).length
    })
  } catch (error) {
    console.error('Get locations error:', error)
    return NextResponse.json(
      { error: 'Failed to get locations' },
      { status: 500 }
    )
  }
}
