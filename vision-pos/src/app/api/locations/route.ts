import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    // Auth disabled for development
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const locations = await prisma.location.findMany({
      where: includeInactive ? {} : {
        active: true,
        // Filter out erroneous locations
        NOT: {
          OR: [
            { name: { contains: 'Insurance', mode: 'insensitive' } },
            { name: { equals: 'Default', mode: 'insensitive' } },
            { name: { contains: 'Scanner', mode: 'insensitive' } },
          ]
        }
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        active: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Extract city from address if possible (format: "123 Street, City, State ZIP")
    const locationsWithCity = locations.map(loc => {
      let city = null
      if (loc.address) {
        const parts = loc.address.split(',')
        if (parts.length >= 2) {
          city = parts[1].trim()
        }
      }
      return { ...loc, city }
    })

    return NextResponse.json({ locations: locationsWithCity })
  } catch (error) {
    console.error('Locations API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can deactivate locations
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { id, active } = body

    if (!id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 })
    }

    const location = await prisma.location.update({
      where: { id },
      data: { active: active ?? false }
    })

    return NextResponse.json({ success: true, location })
  } catch (error) {
    console.error('Location update error:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}
