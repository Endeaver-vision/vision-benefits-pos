import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params

    // Get unique price list generations by authorization/carrier combo
    // Group by authorizationId, carrier, and creation time window
    const priceLists = await prisma.patientPriceList.findMany({
      where: { customerId: id },
      select: {
        id: true,
        authorizationId: true,
        insuranceCarrier: true,
        planName: true,
        active: true,
        createdAt: true,
        authorization: {
          select: {
            id: true,
            carrier: true,
            planName: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Group by authorization to create history entries
    const historyMap = new Map<string, {
      id: string
      authorizationId: string | null
      carrier: string
      planName: string
      createdAt: Date
      productCount: number
      active: boolean
    }>()

    for (const priceList of priceLists) {
      const key = priceList.authorizationId || `no-auth-${priceList.insuranceCarrier}`

      if (!historyMap.has(key)) {
        historyMap.set(key, {
          id: priceList.authorizationId || priceList.id,
          authorizationId: priceList.authorizationId,
          carrier: priceList.insuranceCarrier || priceList.authorization?.carrier || 'Unknown',
          planName: priceList.planName || priceList.authorization?.planName || 'Unknown Plan',
          createdAt: priceList.createdAt || new Date(),
          productCount: 1,
          active: priceList.active ?? true
        })
      } else {
        const existing = historyMap.get(key)!
        existing.productCount++
        // A list is active if any of its products are active
        if (priceList.active) existing.active = true
      }
    }

    // Convert to array and sort by date
    const history = Array.from(historyMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(h => ({
        id: h.id,
        authorizationId: h.authorizationId,
        carrier: h.carrier,
        planName: h.planName,
        createdAt: h.createdAt.toISOString(),
        productCount: h.productCount,
        active: h.active
      }))

    return NextResponse.json({
      success: true,
      history
    })
  } catch (error) {
    console.error('Error fetching price list history:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch price list history' },
      { status: 500 }
    )
  }
}

// Activate a specific price list (deactivate others)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { authorizationId } = body

    if (!authorizationId) {
      return NextResponse.json(
        { success: false, error: 'Authorization ID required' },
        { status: 400 }
      )
    }

    // Deactivate all price lists for this customer
    await prisma.patientPriceList.updateMany({
      where: { customerId: id },
      data: { active: false }
    })

    // Activate the selected authorization's price lists
    await prisma.patientPriceList.updateMany({
      where: {
        customerId: id,
        authorizationId: authorizationId
      },
      data: { active: true }
    })

    return NextResponse.json({
      success: true,
      message: 'Price list activated'
    })
  } catch (error) {
    console.error('Error activating price list:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to activate price list' },
      { status: 500 }
    )
  }
}
