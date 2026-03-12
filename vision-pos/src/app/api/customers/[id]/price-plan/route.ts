import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { precomputeCustomerPrices } from '@/lib/services/price-list-precompute'

// GET - Fetch customer price plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const statsOnly = searchParams.get('stats') === 'true'

    // Get customer
    const customer = await prisma.customer.findUnique({
      where: { id }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Quick stats-only response for the UI component
    if (statsOnly) {
      const pricePlans = await prisma.patientPriceList.findMany({
        where: {
          customerId: id,
          active: true
        }
      })

      // Get distinct carriers
      const carriers = [...new Set(
        pricePlans
          .map(p => p.insuranceCarrier)
          .filter((c): c is string => c !== null)
      )]

      // Count stats
      const totalProducts = pricePlans.length
      const needsPricingCount = pricePlans.filter(p => p.finalPrice === null).length
      const coveredProducts = pricePlans.filter(p => Number(p.finalPrice) === 0).length
      const pricedProducts = totalProducts - needsPricingCount

      return NextResponse.json({
        success: true,
        stats: {
          totalProducts,
          pricedProducts,
          needsPricingCount,
          coveredProducts,
          carriers
        }
      })
    }

    // Get active authorization
    const authorization = await prisma.insuranceAuthorization.findFirst({
      where: {
        customerId: id,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get all lens products - ordered by displayGroup (everyday first), then displayOrder
    const products = await prisma.lensProduct.findMany({
      where: { active: true },
      orderBy: [
        { displayGroup: 'asc' },  // 'everyday' sorts before 'reserve'
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    // Get customer's existing price plans
    const pricePlans = await prisma.patientPriceList.findMany({
      where: {
        customerId: id,
        active: true
      }
    })

    // Build insurance info from authorization
    const insuranceInfo = authorization ? {
      carrier: authorization.carrier,
      planName: authorization.planName,
      examCopay: authorization.examCopay,
      materialsCopay: authorization.materialsCopay,
      frameAllowance: authorization.frameAllowance,
      contactAllowance: authorization.contactAllowance
    } : null

    // Map products with customer pricing
    const productsWithPricing = products.map(product => {
      const plan = pricePlans.find(p => p.productId === product.id)

      // Get effective price
      const effectivePrice = plan?.finalPrice ? Number(plan.finalPrice) : null

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: formatCategory(product.category),
        categoryCode: product.category,
        categoryDisplayOrder: getCategoryOrder(product.category),
        displayGroup: product.displayGroup,
        displayOrder: product.displayOrder,
        retailPrice: product.basePrice,
        customerPrice: effectivePrice,
        customPrice: null, // Not supported in current schema
        savings: effectivePrice !== null ? Math.max(0, product.basePrice - effectivePrice) : 0,
        insuranceTier: plan?.tier || null,
        insuranceCarrier: plan?.insuranceCarrier || null,
        hasPricePlan: !!plan,
        needsTierAssignment: plan?.needsTierAssignment || false,
        priceOverrideReason: null,
        priceOverrideBy: null,
        priceOverrideDate: null
      }
    })

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        insurance: insuranceInfo
      },
      products: productsWithPricing,
      summary: {
        totalProducts: products.length,
        productsWithPricing: pricePlans.length,
        productsWithOverrides: 0
      },
      authorization: authorization ? {
        carrier: authorization.carrier,
        authorizationId: authorization.id
      } : null
    })

  } catch (error) {
    console.error('Error fetching customer price plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price plan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Generate bulk price plan or update individual price
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if this is a bulk generation request
    if (body.action === 'generate-bulk' || body.action === 'regenerate') {
      // Get customer
      const customer = await prisma.customer.findUnique({
        where: { id }
      })

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      // Get active authorization
      const authorization = await prisma.insuranceAuthorization.findFirst({
        where: {
          customerId: id,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      })

      if (!authorization) {
        return NextResponse.json(
          { error: 'No active insurance authorization found. Please scan an insurance document first.' },
          { status: 400 }
        )
      }

      // Build copays from authorization
      const copays = (authorization.copays as Record<string, unknown>) || {}
      const carrierLower = authorization.carrier.toLowerCase()

      // Build BenefitAuthorization object
      const benefitAuth = {
        carrier: carrierLower,
        plan: {
          carrier: carrierLower,
          planName: authorization.planName || `${authorization.carrier} Plan`,
        },
        patient: { age: null },
        copays: {
          exam: Number(authorization.examCopay) || 0,
          materials: Number(authorization.materialsCopay) || 0,
          frameAllowance: Number(authorization.frameAllowance) || 0,
          frameAllowanceFeatured: Number(authorization.frameAllowance) || 0,
          frameAllowanceNonFeatured: Number(authorization.frameAllowance) || 0,
          contactAllowance: Number(authorization.contactAllowance) || 0,
          clExamCopay: Number(authorization.clExamCopay) || 0,
          ...copays,
        },
      }

      const result = await precomputeCustomerPrices(
        benefitAuth,
        {
          customerId: id,
          authorizationId: authorization.id,
          carrier: authorization.carrier.toUpperCase() as 'VSP' | 'EyeMed' | 'Spectera',
          planName: authorization.planName || `${authorization.carrier} Plan`,
        }
      )

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.errors?.[0] || 'Failed to generate price plan. Please try again or scan your insurance document again.'
        }, { status: 400 })
      }

      return NextResponse.json({
        success: result.success,
        message: `Generated prices for ${authorization.carrier}`,
        stats: {
          totalProducts: result.productsProcessed,
          productsCreated: result.productsCreated,
          productsUpdated: result.productsUpdated,
          productsFailed: result.productsFailed,
          errors: result.errors.length > 0 ? result.errors.slice(0, 5) : [],
          mappedProducts: result.productsCreated
        }
      })
    }

    // Otherwise, it's a single product price override
    const { productId, customPrice, reason } = body

    if (!productId || customPrice === undefined) {
      return NextResponse.json(
        { error: 'productId and customPrice are required' },
        { status: 400 }
      )
    }

    // Get product
    const product = await prisma.lensProduct.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get customer
    const customer = await prisma.customer.findUnique({
      where: { id }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get active authorization
    const authorization = await prisma.insuranceAuthorization.findFirst({
      where: {
        customerId: id,
        isActive: true
      }
    })

    const insuranceCarrier = authorization?.carrier || null

    // Upsert price plan
    const pricePlan = await prisma.patientPriceList.upsert({
      where: {
        customerId_productId_insuranceCarrier: {
          customerId: id,
          productId: productId,
          insuranceCarrier: insuranceCarrier ?? ''
        }
      },
      update: {
        finalPrice: customPrice,
        savings: product.basePrice - customPrice,
        updatedAt: new Date()
      },
      create: {
        customerId: id,
        productId: productId,
        finalPrice: customPrice,
        retailPrice: product.basePrice,
        savings: product.basePrice - customPrice,
        insuranceCarrier: insuranceCarrier,
        authorizationId: authorization?.id,
        active: true
      }
    })

    return NextResponse.json({
      success: true,
      pricePlan
    })

  } catch (error) {
    console.error('Error updating price plan:', error)
    return NextResponse.json(
      { error: 'Failed to update price plan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove price override
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const carrier = searchParams.get('carrier')

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }

    if (carrier) {
      await prisma.patientPriceList.delete({
        where: {
          customerId_productId_insuranceCarrier: {
            customerId: id,
            productId: productId,
            insuranceCarrier: carrier
          }
        }
      })
    } else {
      await prisma.patientPriceList.deleteMany({
        where: {
          customerId: id,
          productId: productId
        }
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting price plan:', error)
    return NextResponse.json(
      { error: 'Failed to delete price plan' },
      { status: 500 }
    )
  }
}

// Helper functions
function formatCategory(category: string): string {
  const map: Record<string, string> = {
    'single_vision': 'Single Vision',
    'progressive': 'Progressive Lenses',
    'bifocal': 'Bifocal',
    'trifocal': 'Trifocal',
    'ar_coating': 'AR Coatings',
    'photochromic': 'Photochromic',
    'material': 'Lens Materials',
    'mount_fee': 'Mount Fees',
    'addon': 'Add-ons',
    'tint': 'Tint',
    'polarized': 'Polarized'
  }
  return map[category] || category
}

function getCategoryOrder(category: string): number {
  // Order: Lens types → AR → Transitions → Materials → Add-ons
  const order: Record<string, number> = {
    // Lens types first
    'single_vision': 1,
    'progressive': 2,
    'bifocal': 3,
    'trifocal': 4,
    // AR coatings
    'ar_coating': 5,
    // Transitions/photochromic
    'photochromic': 6,
    // Materials
    'material': 7,
    // Add-ons last
    'addon': 8,
    'mount_fee': 9,
    'tint': 10,
    'polarized': 11
  }
  return order[category] || 99
}
