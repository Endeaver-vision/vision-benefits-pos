/**
 * Insurance Benefits API
 * GET /api/customers/[id]/benefits - Get customer's insurance benefits from authorization
 * POST /api/customers/[id]/benefits - Create/update insurance benefits
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET - Fetch customer's current insurance benefits from active authorization
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const customerId = params.id;

    console.log('[Benefits API] Fetching benefits for customer:', customerId);

    // Fetch customer with insurance info
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        insuranceCarrier: true,
        memberId: true,
        groupNumber: true,
        eligibilityDate: true,
      },
    });

    if (!customer) {
      console.log('[Benefits API] Customer not found:', customerId);
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log('[Benefits API] Customer found:', customer.firstName, customer.lastName);

    // Try to find active authorization from any carrier
    let benefits = getDefaultBenefits();
    let carrier = customer.insuranceCarrier || 'None';

    // Check VSP authorization
    const vspAuth = await prisma.vspAuthorization.findFirst({
      where: { customerId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (vspAuth) {
      carrier = 'VSP';
      benefits = {
        planYear: new Date().getFullYear(),
        examCopay: vspAuth.examCopay ?? 0,
        examCovered: true,
        examEligible: true,
        examFrequency: 12,
        materialsCopay: vspAuth.materialsCopay ?? 0,
        materialsEligible: true,
        materialsFrequency: 12,
        frameAllowance: vspAuth.frameAllowanceRetail ?? 150,
        frameAllowanceFeatured: vspAuth.frameAllowanceMarchon ?? 220,
        frameOverageDiscount: vspAuth.frameOverageDiscount ?? 20,
        frameAllowanceUsed: 0,
        frameAllowanceRemaining: vspAuth.frameAllowanceRetail ?? 150,
        lensAllowance: 0, // VSP covers lenses fully with copay
        lensAllowanceUsed: 0,
        lensAllowanceRemaining: 0,
        contactAllowance: vspAuth.contactAllowance ?? 150,
        contactAllowanceUsed: 0,
        contactAllowanceRemaining: vspAuth.contactAllowance ?? 150,
        contactFittingCovered: vspAuth.contactFittingCovered ?? false,
        contactFittingCopay: 0, // When covered, no copay
        contactsEligible: true,
        contactFrequency: 12,
        // VSP plans: glasses and contacts are mutually exclusive per benefit period
        glassesContactsExclusive: true,
      };
    }

    // Check EyeMed authorization
    if (!vspAuth) {
      const eyemedAuth = await prisma.eyemedAuthorization.findFirst({
        where: { customerId, isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      if (eyemedAuth) {
        carrier = 'EyeMed';
        benefits = {
          planYear: new Date().getFullYear(),
          examCopay: eyemedAuth.examCopay ?? 0,
          examCovered: true,
          examEligible: true,
          examFrequency: 12,
          materialsCopay: 0,
          materialsEligible: true,
          materialsFrequency: 24,
          frameAllowance: eyemedAuth.frameAllowance ?? 150,
          frameAllowanceUsed: 0,
          frameAllowanceRemaining: eyemedAuth.frameAllowance ?? 150,
          lensAllowance: 0,
          lensAllowanceUsed: 0,
          lensAllowanceRemaining: 0,
          contactAllowance: eyemedAuth.contactAllowance ?? 150,
          contactAllowanceUsed: 0,
          contactAllowanceRemaining: eyemedAuth.contactAllowance ?? 150,
          contactFittingCopay: 0,
          contactsEligible: true,
          contactFrequency: 12,
        };
      }
    }

    // Check Spectera authorization
    if (!vspAuth) {
      const specteraAuth = await prisma.specteraAuthorization.findFirst({
        where: { customerId, isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      if (specteraAuth) {
        carrier = 'Spectera';
        benefits = {
          planYear: new Date().getFullYear(),
          examCopay: specteraAuth.examCopay ?? 0,
          examCovered: true,
          examEligible: true,
          examFrequency: 12,
          materialsCopay: 0,
          materialsEligible: true,
          materialsFrequency: 24,
          frameAllowance: specteraAuth.frameAllowance ?? 130,
          frameAllowanceUsed: 0,
          frameAllowanceRemaining: specteraAuth.frameAllowance ?? 130,
          lensAllowance: 0,
          lensAllowanceUsed: 0,
          lensAllowanceRemaining: 0,
          contactAllowance: 105, // Spectera typical contact allowance
          contactAllowanceUsed: 0,
          contactAllowanceRemaining: 105,
          contactFittingCopay: 0,
          contactsEligible: true,
          contactFrequency: 12,
        };
      }
    }

    const response = {
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      carrier,
      memberId: customer.memberId,
      groupNumber: customer.groupNumber,
      eligibilityDate: customer.eligibilityDate,
      benefits,
    };

    console.log('[Benefits API] Returning benefits for carrier:', carrier);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Benefits API] ERROR:', error);
    console.error('[Benefits API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to fetch insurance benefits', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getDefaultBenefits() {
  return {
    planYear: new Date().getFullYear(),
    examCopay: 0,
    examCovered: false,
    examEligible: false,
    examFrequency: 12,
    materialsCopay: 0,
    materialsEligible: false,
    materialsFrequency: 24,
    frameAllowance: 0,
    frameAllowanceFeatured: 0,
    frameOverageDiscount: 0,
    frameAllowanceUsed: 0,
    frameAllowanceRemaining: 0,
    lensAllowance: 0,
    lensAllowanceUsed: 0,
    lensAllowanceRemaining: 0,
    contactAllowance: 0,
    contactAllowanceUsed: 0,
    contactAllowanceRemaining: 0,
    contactFittingCovered: false,
    contactFittingCopay: 0,
    contactsEligible: false,
    contactFrequency: 12,
    glassesContactsExclusive: false,
  };
}

/**
 * POST - Create or update insurance benefits
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const customerId = params.id;
    const body = await request.json();

    const {
      carrier,
      memberId,
      groupNumber,
      eligibilityDate,
      planYear,
      examCopay,
      examCovered,
      examFrequency,
      materialsCopay,
      materialsFrequency,
      frameAllowance,
      lensAllowance,
      contactAllowance,
      contactFittingCopay,
      contactFrequency,
    } = body;

    // Update customer insurance info
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        insuranceCarrier: carrier,
        memberId: memberId,
        groupNumber: groupNumber,
        eligibilityDate: eligibilityDate ? new Date(eligibilityDate) : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Insurance benefits updated successfully',
      benefits: {
        customerId: updatedCustomer.id,
        carrier: updatedCustomer.insuranceCarrier,
        memberId: updatedCustomer.memberId,
        groupNumber: updatedCustomer.groupNumber,
        eligibilityDate: updatedCustomer.eligibilityDate,
        planYear,
        examCopay,
        examCovered,
        examFrequency,
        materialsCopay,
        materialsFrequency,
        frameAllowance,
        lensAllowance,
        contactAllowance,
        contactFittingCopay,
        contactFrequency,
      },
    });
  } catch (error) {
    console.error('[Benefits API] POST ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to update insurance benefits' },
      { status: 500 }
    );
  }
}
