import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'
import { generatePriceMapping } from '@/lib/services/price-mapping-service'

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
      const pricePlans = await prisma.customerPriceList.findMany({
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
      const coveredProducts = pricePlans.filter(p => p.finalPrice === 0).length
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

    // Get active authorization (VSP/EyeMed/Spectera)
    const authResult = await getActiveAuthorizationForCustomer(id)

    // Get all products - ordered by displayTier (everyday first), category displayOrder, then product displayOrder
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: true
      },
      orderBy: [
        { displayTier: 'asc' },  // 'everyday' sorts before 'reserve'
        { category: { displayOrder: 'asc' } },
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    // Get customer's existing price plans
    const pricePlans = await prisma.customerPriceList.findMany({
      where: { 
        customerId: id,
        active: true
      }
    })

    // Build insurance info from authorization - use type-safe access
    const insuranceInfo = authResult ? (() => {
      const carrier = authResult.carrier.toUpperCase()
      const copays = authResult.authorization.copays as Record<string, unknown>

      // Different carriers have different property names
      let examCopay: number | null = null
      let materialsCopay: number | null = null
      let frameAllowance: number | null = null
      let contactAllowance: number | null = null

      if (authResult.carrier === 'vsp') {
        examCopay = (copays?.examWellvision as number) ?? null
        materialsCopay = (copays?.materials as number) ?? null
        frameAllowance = (copays?.frameAllowanceNonFeatured as number) ?? null
        contactAllowance = (copays?.contactAllowance as number) ?? null
      } else if (authResult.carrier === 'eyemed') {
        examCopay = (copays?.exam as number) ?? null
        materialsCopay = (copays?.materials as number) ?? null
        frameAllowance = (copays?.frameAllowance as number) ?? null
        contactAllowance = (copays?.contactAllowance as number) ?? null
      } else if (authResult.carrier === 'spectera') {
        examCopay = (copays?.examAdult as number) ?? null
        materialsCopay = (copays?.materials as number) ?? null
        frameAllowance = (copays?.frameAllowance as number) ?? null
        contactAllowance = (copays?.contactAllowance as number) ?? null
      }

      return {
        carrier,
        planName: authResult.authorization.plan.planName,
        examCopay,
        materialsCopay,
        frameAllowance,
        contactAllowance
      }
    })() : null

    // Map products with customer pricing
    const productsWithPricing = products.map(product => {
      const plan = pricePlans.find(p => p.productId === product.id)

      // Calculate effective price (custom price takes precedence)
      const effectivePrice = plan?.customPrice ?? plan?.finalPrice ?? null

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category.name,
        categoryCode: product.category.code,
        categoryDisplayOrder: product.category.displayOrder,
        displayTier: product.displayTier,  // 'everyday' or 'reserve'
        displayOrder: product.displayOrder,
        retailPrice: product.basePrice,
        customerPrice: effectivePrice,
        customPrice: plan?.customPrice ?? null,
        savings: effectivePrice !== null ? Math.max(0, product.basePrice - effectivePrice) : 0,
        insuranceTier: plan?.tier || null,
        insuranceCarrier: plan?.insuranceCarrier || null,
        hasPricePlan: !!plan,
        needsTierAssignment: plan?.needsTierAssignment || false,  // True if using 80% retail fallback
        priceOverrideReason: plan?.priceOverrideReason || null,
        priceOverrideBy: plan?.priceOverrideBy || null,
        priceOverrideDate: plan?.priceOverrideDate || null
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
        productsWithOverrides: pricePlans.filter(p => p.customPrice !== null).length
      },
      authorization: authResult ? {
        carrier: authResult.carrier,
        authorizationId: authResult.authorizationId
      } : null
    })

  } catch (error) {
    console.error('Error fetching customer price plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price plan' },
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

    // Check if this is a bulk generation or regeneration request
    if (body.action === 'generate-bulk' || body.action === 'regenerate') {
      // Use the centralized price mapping service
      const result = await generatePriceMapping(id)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to generate price mappings' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Generated ${result.totalProducts} prices for ${result.carrier || 'no insurance'} (${result.mappedProducts} tier-based, ${result.fallbackProducts} fallback)`,
        stats: {
          totalProducts: result.totalProducts,
          tierBasedProducts: result.mappedProducts,
          fallbackProducts: result.fallbackProducts,
          missingKeyProducts: result.missingKeyProducts
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
    const product = await prisma.product.findUnique({
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
    const authResult = await getActiveAuthorizationForCustomer(id)

    // Calculate insurance tier for this product
    let tier = null
    let insuranceCarrier = null

    if (authResult) {
      insuranceCarrier = authResult.carrier.toUpperCase()

      // Get tier based on carrier
      if (insuranceCarrier === 'VSP') {
        tier = product.tierVsp
      } else if (insuranceCarrier === 'EYEMED') {
        tier = product.tierEyemed
      } else if (insuranceCarrier === 'SPECTERA') {
        tier = product.tierSpectera
      }
    }

    // Upsert price plan - use new unique constraint that includes insuranceCarrier
    const pricePlan = await prisma.customerPriceList.upsert({
      where: {
        customerId_productId_insuranceCarrier: {
          customerId: id,
          productId: productId,
          insuranceCarrier: insuranceCarrier ?? ''  // Empty string for cash pay
        }
      },
      update: {
        customPrice: customPrice,
        finalPrice: customPrice,
        savings: product.basePrice - customPrice,
        priceOverrideReason: reason || null,
        priceOverrideBy: 'admin',
        priceOverrideDate: new Date(),
        updatedAt: new Date()
      },
      create: {
        customerId: id,
        productId: productId,
        finalPrice: customPrice,
        retailPrice: product.basePrice,
        savings: product.basePrice - customPrice,
        insuranceCarrier: insuranceCarrier,
        tier: tier,
        customPrice: customPrice,
        priceOverrideReason: reason || null,
        priceOverrideBy: 'admin',
        priceOverrideDate: new Date(),
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
      { error: 'Failed to update price plan' },
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
    const carrier = searchParams.get('carrier')  // Optional carrier filter

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }

    if (carrier) {
      // Delete specific carrier's price
      await prisma.customerPriceList.delete({
        where: {
          customerId_productId_insuranceCarrier: {
            customerId: id,
            productId: productId,
            insuranceCarrier: carrier
          }
        }
      })
    } else {
      // Delete all prices for this product (all carriers)
      await prisma.customerPriceList.deleteMany({
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
