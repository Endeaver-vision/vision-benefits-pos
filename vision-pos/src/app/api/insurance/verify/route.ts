import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/insurance/verify
 *
 * Verifies insurance information and creates/updates an authorization
 * for the customer if verification is successful.
 */

interface VerifyRequest {
  customerId: string
  carrier: 'vsp' | 'eyemed' | 'spectera'
  memberId: string
  groupNumber?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json()
    const { customerId, carrier, memberId, groupNumber } = body

    if (!customerId || !carrier || !memberId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerId, carrier, memberId' },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // In a real implementation, this would call the carrier's API to verify eligibility
    // For now, we'll simulate a verification and create/update the authorization

    // Simulated carrier-specific plan data
    const planData = getSimulatedPlanData(carrier, memberId)

    if (!planData) {
      return NextResponse.json({
        success: false,
        error: 'Unable to verify insurance. Member ID not found or plan is not active.'
      })
    }

    // Create or update authorization based on carrier
    let authorizationId: string

    if (carrier === 'vsp') {
      const existingAuth = await prisma.vspAuthorization.findFirst({
        where: { customerId, memberId }
      })

      if (existingAuth) {
        await prisma.vspAuthorization.update({
          where: { id: existingAuth.id },
          data: {
            planName: planData.planName,
            groupNumber: groupNumber || null,
            examCopay: planData.examCopay,
            materialsCopay: planData.materialsCopay,
            frameAllowance: planData.frameAllowance,
            frameOverageDiscount: planData.frameOverageDiscount,
            contactAllowance: planData.contactAllowance,
            effectiveDate: new Date(),
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            isActive: true,
            verifiedAt: new Date(),
          }
        })
        authorizationId = existingAuth.id
      } else {
        const newAuth = await prisma.vspAuthorization.create({
          data: {
            customerId,
            memberId,
            planName: planData.planName,
            groupNumber: groupNumber || null,
            examCopay: planData.examCopay,
            materialsCopay: planData.materialsCopay,
            frameAllowance: planData.frameAllowance,
            frameOverageDiscount: planData.frameOverageDiscount,
            contactAllowance: planData.contactAllowance,
            effectiveDate: new Date(),
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
            verifiedAt: new Date(),
          }
        })
        authorizationId = newAuth.id
      }
    } else if (carrier === 'eyemed') {
      const existingAuth = await prisma.eyemedAuthorization.findFirst({
        where: { customerId, memberId }
      })

      if (existingAuth) {
        await prisma.eyemedAuthorization.update({
          where: { id: existingAuth.id },
          data: {
            planName: planData.planName,
            groupNumber: groupNumber || null,
            examCopay: planData.examCopay,
            materialsCopay: planData.materialsCopay,
            frameAllowance: planData.frameAllowance,
            contactAllowance: planData.contactAllowance,
            effectiveDate: new Date(),
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
            verifiedAt: new Date(),
          }
        })
        authorizationId = existingAuth.id
      } else {
        const newAuth = await prisma.eyemedAuthorization.create({
          data: {
            customerId,
            memberId,
            planName: planData.planName,
            groupNumber: groupNumber || null,
            examCopay: planData.examCopay,
            materialsCopay: planData.materialsCopay,
            frameAllowance: planData.frameAllowance,
            contactAllowance: planData.contactAllowance,
            effectiveDate: new Date(),
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
            verifiedAt: new Date(),
          }
        })
        authorizationId = newAuth.id
      }
    } else if (carrier === 'spectera') {
      const existingAuth = await prisma.specteraAuthorization.findFirst({
        where: { customerId, memberId }
      })

      if (existingAuth) {
        await prisma.specteraAuthorization.update({
          where: { id: existingAuth.id },
          data: {
            planName: planData.planName,
            groupNumber: groupNumber || null,
            examCopay: planData.examCopay,
            materialsCopay: planData.materialsCopay,
            frameAllowance: planData.frameAllowance,
            contactAllowance: planData.contactAllowance,
            effectiveDate: new Date(),
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
            verifiedAt: new Date(),
          }
        })
        authorizationId = existingAuth.id
      } else {
        const newAuth = await prisma.specteraAuthorization.create({
          data: {
            customerId,
            memberId,
            planName: planData.planName,
            groupNumber: groupNumber || null,
            examCopay: planData.examCopay,
            materialsCopay: planData.materialsCopay,
            frameAllowance: planData.frameAllowance,
            contactAllowance: planData.contactAllowance,
            effectiveDate: new Date(),
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
            verifiedAt: new Date(),
          }
        })
        authorizationId = newAuth.id
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported carrier' },
        { status: 400 }
      )
    }

    // Update customer with insurance info
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        insuranceCarrier: carrier.toUpperCase(),
        memberId,
        groupNumber: groupNumber || null,
      }
    })

    return NextResponse.json({
      success: true,
      authorizationId,
      carrier: carrier.toUpperCase(),
      planName: planData.planName,
      memberId,
      examCopay: planData.examCopay,
      materialsCopay: planData.materialsCopay,
      frameAllowance: planData.frameAllowance,
      contactAllowance: planData.contactAllowance,
    })

  } catch (error) {
    console.error('Insurance verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error during insurance verification' },
      { status: 500 }
    )
  }
}

/**
 * Simulates carrier plan data based on carrier and member ID
 * In production, this would call real carrier APIs
 */
function getSimulatedPlanData(carrier: string, memberId: string) {
  // Simulate some "invalid" member IDs for testing
  if (memberId.toLowerCase().includes('invalid') || memberId === '000000') {
    return null
  }

  switch (carrier) {
    case 'vsp':
      return {
        planName: 'VSP Choice',
        examCopay: 25,
        materialsCopay: 25,
        frameAllowance: 150,
        frameOverageDiscount: 20,
        contactAllowance: 150,
      }
    case 'eyemed':
      return {
        planName: 'EyeMed Access',
        examCopay: 10,
        materialsCopay: 25,
        frameAllowance: 130,
        frameOverageDiscount: null,
        contactAllowance: 130,
      }
    case 'spectera':
      return {
        planName: 'Spectera Standard',
        examCopay: 15,
        materialsCopay: 20,
        frameAllowance: 120,
        frameOverageDiscount: null,
        contactAllowance: 120,
      }
    default:
      return null
  }
}
