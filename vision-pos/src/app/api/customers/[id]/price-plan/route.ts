import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveAuthorizationForCustomer } from '@/lib/services/authorization-service'

// GET - Fetch customer price plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get customer
    const customer = await prisma.customer.findUnique({
      where: { id }
    })

    // Get active authorization (VSP/EyeMed/Spectera)
    const authResult = await getActiveAuthorizationForCustomer(id)

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get all products
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: true
      },
      orderBy: [
        { category: { name: 'asc' } },
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

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category.name,
        categoryCode: product.category.code,
        retailPrice: product.basePrice,
        customerPrice: plan?.finalPrice ?? null,
        customPrice: plan?.customPrice ?? null,
        savings: plan ? (product.basePrice - plan.finalPrice) : 0,
        insuranceTier: plan?.tier || null,
        insuranceCarrier: plan?.insuranceCarrier || null,
        hasPricePlan: !!plan,
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

    // Check if this is a bulk generation request
    if (body.action === 'generate-bulk') {
      return await generateBulkPricePlan(id, 'system')
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

    // Upsert price plan
    const pricePlan = await prisma.customerPriceList.upsert({
      where: {
        customerId_productId: {
          customerId: id,
          productId: productId
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

// Helper function to generate bulk price plan using ACTUAL scanned authorization copays
async function generateBulkPricePlan(customerId: string, userId: string) {
  try {
    // Get customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get active authorization with actual scanned copays
    const authResult = await getActiveAuthorizationForCustomer(customerId)

    // Get all active products
    const products = await prisma.product.findMany({
      where: { active: true }
    })

    // Get carrier-specific copays from authorization
    let vspCopays: Map<string, { sv: number | null, mf: number | null }> = new Map()
    let eyemedCopays: Record<string, number | null> = {}
    let specteraCopays: Record<string, number | null> = {}

    if (authResult?.carrier === 'vsp') {
      const vspAuth = await prisma.vspAuthorization.findFirst({
        where: { id: authResult.authorizationId },
        include: { lensEnhancementCopays: true }
      })
      if (vspAuth?.lensEnhancementCopays) {
        for (const copay of vspAuth.lensEnhancementCopays) {
          vspCopays.set(copay.code, {
            sv: copay.copaySingleVision,
            mf: copay.copayMultifocal
          })
        }
      }
    } else if (authResult?.carrier === 'eyemed') {
      const eyemedAuth = await prisma.eyemedAuthorization.findFirst({
        where: { id: authResult.authorizationId },
        include: { arCoatingCopays: true }
      })
      if (eyemedAuth) {
        // Progressive tier copays
        eyemedCopays['standard'] = eyemedAuth.progressiveStandardCopay
        eyemedCopays['tier_1'] = eyemedAuth.progressiveTier1Copay
        eyemedCopays['tier_2'] = eyemedAuth.progressiveTier2Copay
        eyemedCopays['tier_3'] = eyemedAuth.progressiveTier3Copay
        eyemedCopays['tier_4'] = eyemedAuth.progressiveTier4Copay
        eyemedCopays['tier_5'] = eyemedAuth.progressiveTier5Copay
        // Material copays
        eyemedCopays['polycarbonate'] = eyemedAuth.polycarbonateAdultCopay
        eyemedCopays['polycarbonate_child'] = eyemedAuth.polycarbonateChildCopay
        eyemedCopays['photochromic'] = eyemedAuth.photochromicCopay
        eyemedCopays['high_index_160'] = eyemedAuth.highIndex160Copay
        eyemedCopays['high_index_167'] = eyemedAuth.highIndex167Copay
        eyemedCopays['high_index_174'] = eyemedAuth.highIndex174Copay
        eyemedCopays['trivex'] = eyemedAuth.trivexCopay
        eyemedCopays['polarized'] = eyemedAuth.polarizedCopay
        eyemedCopays['tint'] = eyemedAuth.tintCopay
        // AR coating copays from related table
        if (eyemedAuth.arCoatingCopays) {
          for (const ar of eyemedAuth.arCoatingCopays) {
            eyemedCopays[`ar_${ar.tier}`] = ar.copay ? parseFloat(ar.copay) : null
          }
        }
      }
    } else if (authResult?.carrier === 'spectera') {
      const specteraAuth = await prisma.specteraAuthorization.findFirst({
        where: { id: authResult.authorizationId },
        include: { arCoatingCopays: true }
      })
      if (specteraAuth) {
        // Progressive tier copays (Roman numerals I-V)
        specteraCopays['I'] = specteraAuth.progressiveTier1Copay
        specteraCopays['II'] = specteraAuth.progressiveTier2Copay
        specteraCopays['III'] = specteraAuth.progressiveTier3Copay
        specteraCopays['IV'] = specteraAuth.progressiveTier4Copay
        specteraCopays['V'] = specteraAuth.progressiveTier5Copay
        // Material copays
        specteraCopays['polycarbonate'] = specteraAuth.polycarbonateAdultCopay
        specteraCopays['polycarbonate_child'] = specteraAuth.polycarbonateChildCopay
        specteraCopays['photochromic'] = specteraAuth.photochromicCopay
        specteraCopays['high_index_166'] = specteraAuth.highIndex166
        specteraCopays['high_index_167'] = specteraAuth.highIndex167to173
        specteraCopays['high_index_174'] = specteraAuth.highIndex174Copay
        specteraCopays['trivex'] = specteraAuth.trivexCopay
        specteraCopays['polarized'] = specteraAuth.polarizedCopay
        specteraCopays['tint'] = specteraAuth.tintCopay
        // AR coating copays from related table
        if (specteraAuth.arCoatingCopays) {
          for (const ar of specteraAuth.arCoatingCopays) {
            specteraCopays[`ar_${ar.tier}`] = ar.copay ? parseFloat(ar.copay) : null
          }
        }
      }
    }

    // Get all authorization copays and allowances
    let examCopay: number | null = null
    let materialsCopay: number | null = null
    let frameAllowance: number | null = null
    let frameAllowanceFeatured: number | null = null
    let frameOverageDiscount: number | null = null
    let contactAllowance: number | null = null

    if (authResult?.carrier === 'vsp') {
      const vspAuth = await prisma.vspAuthorization.findFirst({
        where: { id: authResult.authorizationId }
      })
      if (vspAuth) {
        examCopay = vspAuth.examCopay
        materialsCopay = vspAuth.materialsCopay
        frameAllowance = vspAuth.frameAllowanceRetail
        frameAllowanceFeatured = vspAuth.frameAllowanceMarchon
        frameOverageDiscount = vspAuth.frameOverageDiscount ? vspAuth.frameOverageDiscount / 100 : null
        contactAllowance = vspAuth.contactAllowance
      }
    } else if (authResult?.carrier === 'eyemed') {
      const eyemedAuth = await prisma.eyemedAuthorization.findFirst({
        where: { id: authResult.authorizationId }
      })
      if (eyemedAuth) {
        examCopay = eyemedAuth.examCopay
        materialsCopay = eyemedAuth.materialsCopay
        frameAllowance = eyemedAuth.frameAllowance
        frameOverageDiscount = eyemedAuth.frameOverageDiscount ? eyemedAuth.frameOverageDiscount / 100 : null
        contactAllowance = eyemedAuth.contactAllowance
      }
    } else if (authResult?.carrier === 'spectera') {
      const specteraAuth = await prisma.specteraAuthorization.findFirst({
        where: { id: authResult.authorizationId }
      })
      if (specteraAuth) {
        examCopay = specteraAuth.examAdultCopay
        materialsCopay = specteraAuth.materialsCopay
        frameAllowance = specteraAuth.frameAllowance
        frameOverageDiscount = specteraAuth.frameOveragePercent ? 1 - (specteraAuth.frameOveragePercent / 100) : null
        contactAllowance = specteraAuth.contactAllowance
      }
    }

    const pricePlansToCreate = []
    const insuranceCarrier = authResult?.carrier.toUpperCase() || null

    // Get all category codes for products
    const categoryMap = new Map<string, string>()
    const categories = await prisma.productCategory.findMany()
    for (const cat of categories) {
      categoryMap.set(cat.id, cat.code)
    }

    for (const product of products) {
      let tier = null
      let customerPrice = product.basePrice // Default to retail
      const categoryCode = product.categoryId ? categoryMap.get(product.categoryId) : null

      if (authResult) {
        // =====================================================
        // EXAMS - Patient pays exam copay
        // =====================================================
        if (categoryCode === 'EXAMS') {
          if (product.tierVsp === 'covered' || product.tierVsp === 'EXAM' || product.name.toLowerCase().includes('routine')) {
            // Routine exam - patient pays exam copay
            customerPrice = examCopay ?? product.basePrice
            tier = 'exam-copay'
          } else if (product.tierVsp === 'CONTACT_EXAM' || product.name.toLowerCase().includes('contact')) {
            // Contact lens exam - typically exam copay or separate CL exam fee
            customerPrice = examCopay ?? product.basePrice
            tier = 'cl-exam-copay'
          } else {
            // Other exams (medical, etc.) - not covered by vision
            tier = 'not-covered'
          }
        }
        // =====================================================
        // SINGLE VISION LENSES - Covered after materials copay
        // =====================================================
        else if (categoryCode === 'SINGLE_VISION_LENSES') {
          if (product.tierVsp === 'standard' || product.tierVsp === 'covered' || !product.tierVsp) {
            // Standard SV lens - covered, patient pays $0 (materials copay applies at checkout)
            customerPrice = 0
            tier = 'covered'
          } else if (product.tierVsp === 'non-formulary') {
            // Non-formulary like Neurolens - patient pays retail
            tier = 'non-formulary'
          } else {
            tier = product.tierVsp
          }
        }
        // =====================================================
        // LINED MULTIFOCAL (Bifocal/Trifocal) - Covered after materials copay
        // =====================================================
        else if (categoryCode === 'LINED_MULTIFOCAL') {
          if (product.tierVsp === 'standard' || product.tierVsp === 'covered') {
            customerPrice = 0
            tier = 'covered'
          }
        }
        // =====================================================
        // PROGRESSIVE LENSES - Use tier-based copay
        // =====================================================
        else if (categoryCode === 'PROGRESSIVE_LENSES') {
          // Progressive tier codes: KA, JA, FA, NA, OA
          if (product.tierVsp && vspCopays.has(product.tierVsp)) {
            const copay = vspCopays.get(product.tierVsp)
            customerPrice = copay?.sv ?? copay?.mf ?? product.basePrice
            tier = product.tierVsp
          } else if (product.tierVsp === 'non-formulary') {
            tier = 'non-formulary'
          }
        }
        // =====================================================
        // LENSES (generic category) - Handle based on tier
        // =====================================================
        else if (categoryCode === 'LENSES') {
          if (product.tierVsp && vspCopays.has(product.tierVsp)) {
            const copay = vspCopays.get(product.tierVsp)
            customerPrice = copay?.sv ?? copay?.mf ?? product.basePrice
            tier = product.tierVsp
          } else if (product.tierVsp === 'STANDARD' || product.tierVsp === 'covered') {
            // Standard lenses covered
            customerPrice = 0
            tier = 'covered'
          }
        }
        // =====================================================
        // CONTACT LENS FITTING - Use CL allowance or fitting rules
        // =====================================================
        else if (categoryCode === 'CONTACT_FITTING' || categoryCode === 'Contact Lens Fitting') {
          if (product.tierVsp === 'fitting' || product.tierVsp === 'standard') {
            // Standard fitting - often covered or reduced with VSP
            // VSP typically gives 15% discount on fitting or covers up to contact allowance
            customerPrice = Math.round(product.basePrice * 0.85) // 15% discount
            tier = 'cl-fitting-discount'
          } else if (product.tierVsp === 'specialty') {
            // Specialty fitting - patient pays more
            customerPrice = product.basePrice
            tier = 'specialty-fitting'
          }
        }
        // =====================================================
        // FRAMES - Use frame allowance
        // =====================================================
        else if (categoryCode === 'FRAMES') {
          if (frameAllowance) {
            const applicableAllowance = frameAllowanceFeatured && product.tierVsp === 'featured'
              ? frameAllowanceFeatured
              : frameAllowance

            if (product.basePrice <= applicableAllowance) {
              customerPrice = 0
            } else {
              const overage = product.basePrice - applicableAllowance
              if (frameOverageDiscount) {
                customerPrice = overage * (1 - frameOverageDiscount)
              } else {
                customerPrice = overage
              }
            }
            tier = 'frame-allowance'
          }
        }
        // =====================================================
        // AR COATINGS - Use tier-based copay (QM, QT, QV codes)
        // =====================================================
        else if (categoryCode === 'AR_COATINGS') {
          if (product.tierVsp && vspCopays.has(product.tierVsp)) {
            const copay = vspCopays.get(product.tierVsp)
            customerPrice = copay?.mf ?? copay?.sv ?? product.basePrice
            tier = product.tierVsp
          }
        }
        // =====================================================
        // LENS MATERIALS - Use tier codes (AD, AB, AH, AJ)
        // =====================================================
        else if (categoryCode === 'LENS_MATERIALS') {
          if (product.tierVsp && vspCopays.has(product.tierVsp)) {
            const copay = vspCopays.get(product.tierVsp)
            customerPrice = copay?.mf ?? copay?.sv ?? product.basePrice
            tier = product.tierVsp
          } else if (product.tierVsp === 'standard') {
            // Standard CR-39 is covered
            customerPrice = 0
            tier = 'covered'
          }
        }
        // =====================================================
        // PHOTOCHROMIC - Use PR code
        // =====================================================
        else if (categoryCode === 'PHOTOCHROMIC' || categoryCode === 'Photochromic') {
          if (product.tierVsp && vspCopays.has(product.tierVsp)) {
            const copay = vspCopays.get(product.tierVsp)
            customerPrice = copay?.mf ?? copay?.sv ?? product.basePrice
            tier = product.tierVsp
          }
        }
        // =====================================================
        // POLARIZED - Use DA code
        // =====================================================
        else if (categoryCode === 'POLARIZED' || categoryCode === 'Polarized') {
          if (product.tierVsp && vspCopays.has(product.tierVsp)) {
            const copay = vspCopays.get(product.tierVsp)
            customerPrice = copay?.mf ?? copay?.sv ?? product.basePrice
            tier = product.tierVsp
          }
        }
        // =====================================================
        // LENS ADD-ONS - Use tier codes if available
        // =====================================================
        else if (categoryCode === 'LENS_ADDONS') {
          if (product.tierVsp && vspCopays.has(product.tierVsp)) {
            const copay = vspCopays.get(product.tierVsp)
            customerPrice = copay?.mf ?? copay?.sv ?? product.basePrice
            tier = product.tierVsp
          }
        }
        // =====================================================
        // MOUNT FEES - Use tier codes (SW for rimless)
        // =====================================================
        else if (categoryCode === 'MOUNT_FEES') {
          if (product.tierVsp && vspCopays.has(product.tierVsp)) {
            const copay = vspCopays.get(product.tierVsp)
            customerPrice = copay?.mf ?? copay?.sv ?? product.basePrice
            tier = product.tierVsp
          } else if (product.tierVsp === 'standard') {
            customerPrice = 0
            tier = 'covered'
          }
        }
        // =====================================================
        // FALLBACK - Use tier-based copay lookup for any other category
        // =====================================================
        else {
          if (insuranceCarrier === 'VSP' && product.tierVsp && vspCopays.has(product.tierVsp)) {
            const copay = vspCopays.get(product.tierVsp)
            customerPrice = copay?.mf ?? copay?.sv ?? product.basePrice
            tier = product.tierVsp
          } else if (insuranceCarrier === 'EYEMED' && product.tierEyemed) {
            const copay = eyemedCopays[product.tierEyemed]
            if (copay !== null && copay !== undefined) {
              customerPrice = copay
              tier = product.tierEyemed
            }
          } else if (insuranceCarrier === 'SPECTERA' && product.tierSpectera) {
            const copay = specteraCopays[product.tierSpectera]
            if (copay !== null && copay !== undefined) {
              customerPrice = copay
              tier = product.tierSpectera
            }
          }
        }
      }

      const savings = product.basePrice - customerPrice

      pricePlansToCreate.push({
        customerId: customerId,
        productId: product.id,
        finalPrice: customerPrice,
        retailPrice: product.basePrice,
        savings: savings > 0 ? savings : 0,
        insuranceCarrier: insuranceCarrier,
        tier: tier,
        active: true
      })
    }

    // Delete existing price plans for this customer
    await prisma.customerPriceList.deleteMany({
      where: { customerId: customerId }
    })

    // Create all new price plans
    await prisma.customerPriceList.createMany({
      data: pricePlansToCreate
    })

    return NextResponse.json({
      success: true,
      message: `Generated price plans for ${pricePlansToCreate.length} products using ${insuranceCarrier || 'cash'} pricing`,
      count: pricePlansToCreate.length,
      carrier: insuranceCarrier
    })

  } catch (error) {
    console.error('Error generating bulk price plan:', error)
    return NextResponse.json(
      { error: 'Failed to generate bulk price plan' },
      { status: 500 }
    )
  }
}

// Helper to check if a category is frames
async function isFrameCategory(categoryId: string): Promise<boolean> {
  const category = await prisma.productCategory.findUnique({
    where: { id: categoryId },
    select: { code: true }
  })
  return category?.code === 'FRAMES'
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

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }

    await prisma.customerPriceList.delete({
      where: {
        customerId_productId: {
          customerId: id,
          productId: productId
        }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting price plan:', error)
    return NextResponse.json(
      { error: 'Failed to delete price plan' },
      { status: 500 }
    )
  }
}
