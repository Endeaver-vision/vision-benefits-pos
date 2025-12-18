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
      // NO DEFAULTS - only show what was actually scanned
      benefits = {
        planYear: new Date().getFullYear(),
        examCopay: vspAuth.examCopay,
        examCovered: vspAuth.examCopay !== null,
        examEligible: vspAuth.examCopay !== null,
        examFrequency: 12,
        materialsCopay: vspAuth.materialsCopay,
        materialsEligible: vspAuth.materialsCopay !== null,
        materialsFrequency: 12,
        frameAllowance: vspAuth.frameAllowanceRetail,
        frameAllowanceFeatured: vspAuth.frameAllowanceMarchon,
        frameOverageDiscount: vspAuth.frameOverageDiscount,
        frameAllowanceUsed: 0,
        frameAllowanceRemaining: vspAuth.frameAllowanceRetail,
        lensAllowance: 0, // VSP covers lenses fully with copay
        lensAllowanceUsed: 0,
        lensAllowanceRemaining: 0,
        contactAllowance: vspAuth.contactAllowance,
        contactAllowanceUsed: 0,
        contactAllowanceRemaining: vspAuth.contactAllowance,
        contactFittingCovered: vspAuth.contactFittingCovered,
        contactFittingCopay: null, // Will be null unless scanned
        contactsEligible: vspAuth.contactAllowance !== null,
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
        // NO DEFAULTS - only show what was actually scanned
        benefits = {
          planYear: new Date().getFullYear(),
          examCopay: eyemedAuth.examCopay,
          examCovered: eyemedAuth.examCopay !== null,
          examEligible: eyemedAuth.examCopay !== null,
          examFrequency: 12,
          materialsCopay: null,
          materialsEligible: true,
          materialsFrequency: 24,
          frameAllowance: eyemedAuth.frameAllowance,
          frameAllowanceUsed: 0,
          frameAllowanceRemaining: eyemedAuth.frameAllowance,
          lensAllowance: 0,
          lensAllowanceUsed: 0,
          lensAllowanceRemaining: 0,
          contactAllowance: eyemedAuth.contactAllowance,
          contactAllowanceUsed: 0,
          contactAllowanceRemaining: eyemedAuth.contactAllowance,
          contactFittingCopay: null,
          contactsEligible: eyemedAuth.contactAllowance !== null,
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
        // NO DEFAULTS - only show what was actually scanned
        benefits = {
          planYear: new Date().getFullYear(),
          examCopay: specteraAuth.examCopay,
          examCovered: specteraAuth.examCopay !== null,
          examEligible: specteraAuth.examCopay !== null,
          examFrequency: 12,
          materialsCopay: null,
          materialsEligible: true,
          materialsFrequency: 24,
          frameAllowance: specteraAuth.frameAllowance,
          frameAllowanceUsed: 0,
          frameAllowanceRemaining: specteraAuth.frameAllowance,
          lensAllowance: 0,
          lensAllowanceUsed: 0,
          lensAllowanceRemaining: 0,
          contactAllowance: specteraAuth.nonSelectionClAllowance,
          contactAllowanceUsed: 0,
          contactAllowanceRemaining: specteraAuth.nonSelectionClAllowance,
          contactFittingCopay: null,
          contactsEligible: specteraAuth.nonSelectionClAllowance !== null,
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
