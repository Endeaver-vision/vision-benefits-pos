/**
 * Insurance Benefits API
 * GET /api/customers/[id]/benefits - Get customer's insurance benefits from authorization
 * POST /api/customers/[id]/benefits - Create/update insurance benefits
 *
 * Uses the unified insurance_authorizations table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Type for the copays JSON structure
interface CopaysJson {
  examCopay?: number
  materialsCopay?: number
  singleVision?: number
  bifocal?: number
  trifocal?: number
  progressiveStandard?: number
  progressiveTier1?: number
  progressiveTier2?: number
  progressiveTier3?: number
  progressiveTier4?: number
  progressiveTier5?: number
  arStandard?: number
  arTier1?: number
  arTier2?: number
  arTier3?: number
  polycarbonate?: number
  polycarbonateChild?: number
  trivex?: number
  highIndex167?: number
  highIndex174?: number
  photochromic?: number
  polarized?: number
  blueLight?: number
  tint?: number
  uvTreatment?: number
  scratchCoating?: number
  [key: string]: number | undefined
}

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

    // Try to find active authorization from unified table
    let benefits = getDefaultBenefits();
    let carrier = customer.insuranceCarrier || 'None';

    // Check unified InsuranceAuthorization table
    const authorization = await prisma.insuranceAuthorization.findFirst({
      where: { customerId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (authorization) {
      carrier = authorization.carrier;
      const copays = (authorization.copays as CopaysJson) || {};

      // Build benefits from unified authorization
      benefits = {
        planYear: new Date().getFullYear(),
        examCopay: authorization.examCopay ? Number(authorization.examCopay) : (copays.examCopay ?? null),
        examCovered: authorization.examCopay !== null || copays.examCopay !== undefined,
        examEligible: authorization.examEligible ?? false,
        examFrequency: 12,
        materialsCopay: authorization.materialsCopay ? Number(authorization.materialsCopay) : (copays.materialsCopay ?? null),
        materialsEligible: authorization.lensesEligible ?? true,
        materialsFrequency: authorization.carrier === 'VSP' ? 12 : 24,
        frameAllowance: authorization.frameAllowance ? Number(authorization.frameAllowance) : null,
        frameAllowanceFeatured: authorization.frameAllowance ? Number(authorization.frameAllowance) : null,
        frameOverageDiscount: 0.20, // Default 20% discount
        frameAllowanceUsed: 0,
        frameAllowanceRemaining: authorization.frameAllowance ? Number(authorization.frameAllowance) : null,
        lensAllowance: 0, // Most plans cover lenses with copay, not allowance
        lensAllowanceUsed: 0,
        lensAllowanceRemaining: 0,
        contactAllowance: authorization.contactAllowance ? Number(authorization.contactAllowance) : null,
        contactAllowanceUsed: 0,
        contactAllowanceRemaining: authorization.contactAllowance ? Number(authorization.contactAllowance) : null,
        contactFittingCovered: false,
        contactFittingCopay: null,
        contactsEligible: authorization.contactsEligible ?? false,
        contactFrequency: 12,
        glassesContactsExclusive: authorization.carrier === 'VSP',
      };
    }

    const response = {
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      carrier,
      memberId: customer.memberId || authorization?.memberId,
      groupNumber: customer.groupNumber,
      eligibilityDate: customer.eligibilityDate,
      planName: authorization?.planName,
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
    examCopay: null as number | null,
    examCovered: false,
    examEligible: false,
    examFrequency: 12,
    materialsCopay: null as number | null,
    materialsEligible: false,
    materialsFrequency: 24,
    frameAllowance: null as number | null,
    frameAllowanceFeatured: null as number | null,
    frameOverageDiscount: 0,
    frameAllowanceUsed: 0,
    frameAllowanceRemaining: null as number | null,
    lensAllowance: 0,
    lensAllowanceUsed: 0,
    lensAllowanceRemaining: 0,
    contactAllowance: null as number | null,
    contactAllowanceUsed: 0,
    contactAllowanceRemaining: null as number | null,
    contactFittingCovered: false,
    contactFittingCopay: null as number | null,
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
