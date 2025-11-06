import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { 
  validatePatientOwnedFrame, 
  calculatePOFPricing, 
  createPOFIncident,
  POF_CONFIG,
  type POFCondition,
  type POFFrameInspection 
} from '@/lib/patient-owned-frames'

// Validation schemas
const SetPOFSchema = z.object({
  quoteId: z.string().uuid(),
  frameInspection: z.object({
    condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
    description: z.string().min(10).max(500),
    notes: z.string().optional(),
    inspectedBy: z.string().min(1),
    framePhotos: z.array(z.string()).optional(),
    measurements: z.object({
      bridgeWidth: z.number().optional(),
      lensWidth: z.number().optional(),
      templeLength: z.number().optional()
    }).optional()
  }),
  waiverSigned: z.boolean(),
  customerAcknowledgment: z.string().min(20).max(1000),
  estimatedFrameValue: z.number().min(0).optional(),
  managerOverride: z.object({
    approved: z.boolean(),
    managerId: z.string(),
    reason: z.string(),
    timestamp: z.string().datetime()
  }).optional()
})

const UpdatePOFPricingSchema = z.object({
  quoteId: z.string().uuid(),
  lensCharges: z.number().min(0),
  laborCharges: z.number().min(0).default(0),
  addOnCharges: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(1).default(0.08625)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    switch (action) {
      case 'set_patient_frame':
        return await setPOFQuote(body)
      
      case 'update_pricing':
        return await updatePOFPricing(body)
      
      case 'validate_frame':
        return await validateFrame(body)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: set_patient_frame, update_pricing, or validate_frame' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('POF API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function setPOFQuote(body: unknown) {
  try {
    const data = SetPOFSchema.parse(body)
    
    // Validate the quote exists and is not already completed
    const existingQuote = await prisma.quotes.findUnique({
      where: { id: data.quoteId },
      include: {
        customers: true,
        locations: true
      }
    })

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    if (existingQuote.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot modify completed quote' },
        { status: 400 }
      )
    }

    if (existingQuote.isPatientOwnedFrame) {
      return NextResponse.json(
        { error: 'Quote is already set as patient-owned frame' },
        { status: 400 }
      )
    }

    // Create frame inspection object
    const frameInspection: POFFrameInspection = {
      condition: data.frameInspection.condition as POFCondition,
      description: data.frameInspection.description,
      notes: data.frameInspection.notes,
      inspectedBy: data.frameInspection.inspectedBy,
      inspectedAt: new Date(),
      framePhotos: data.frameInspection.framePhotos,
      measurements: data.frameInspection.measurements
    }

    // Validate the frame condition and compatibility
    const validation = validatePatientOwnedFrame(frameInspection)

    if (!validation.canProceed) {
      // Create incident for rejected frame
      await createPOFIncident({
        quoteId: data.quoteId,
        customerId: existingQuote.customerId,
        userId: data.frameInspection.inspectedBy,
        locationId: existingQuote.locationId,
        incidentType: 'FRAME_DAMAGE',
        severity: 'HIGH',
        title: 'Frame Rejected During Inspection',
        description: `Frame condition: ${frameInspection.condition}. Issues: ${validation.issues.join(', ')}`,
        frameDescription: data.frameInspection.description,
        frameCondition: frameInspection.condition
      })

      return NextResponse.json(
        { 
          error: 'Frame cannot be accepted for lens installation',
          validation,
          frameInspection
        },
        { status: 400 }
      )
    }

    // Check if manager approval is required
    if (validation.requiresManagerApproval && !data.managerOverride) {
      return NextResponse.json(
        { 
          error: 'Manager approval required for this frame condition',
          validation,
          frameInspection,
          requiresManagerApproval: true
        },
        { status: 202 } // Accepted but pending approval
      )
    }

    // Check waiver requirement
    if (!data.waiverSigned) {
      return NextResponse.json(
        { error: 'Customer waiver must be signed before proceeding' },
        { status: 400 }
      )
    }

    // Calculate initial pricing with POF fee
    // Get pricing breakdown from JSON fields
    const eyeglasses = existingQuote.eyeglasses as Record<string, unknown> || {}
    const contacts = existingQuote.contacts as Record<string, unknown> || {}
    
    // Extract existing pricing components
    const lensCharges = (eyeglasses.lensCharges as number) || 0
    const laborCharges = (eyeglasses.laborCharges as number) || 0
    const addOnCharges = (eyeglasses.addOnCharges as number) || 0
    const contactCharges = (contacts.totalPrice as number) || 0
    
    const pofPricing = calculatePOFPricing(
      lensCharges,
      laborCharges,
      addOnCharges + contactCharges,
      0.08625,
      data.estimatedFrameValue
    )

    // Update the quote with POF information
    const updatedQuote = await prisma.quotes.update({
      where: { id: data.quoteId },
      data: {
        isPatientOwnedFrame: true,
        pofInspectionCompleted: true,
        pofConditionAssessment: frameInspection.condition,
        pofWaiverSigned: data.waiverSigned,
        pofFrameDescription: data.frameInspection.description,
        pofFixedFee: POF_CONFIG.FIXED_FEE,
        pofInspectionDate: new Date(),
        pofInspectedBy: data.frameInspection.inspectedBy,
        pofInspectionNotes: data.frameInspection.notes,
        pofFramePhotos: data.frameInspection.framePhotos ? JSON.stringify(data.frameInspection.framePhotos) : null,
        pofWaiverDetails: data.customerAcknowledgment,
        pofManagerOverride: data.managerOverride ? JSON.stringify(data.managerOverride) : null,
        pofWaiverSignedAt: new Date(),
        
        // Update existing eyeglasses JSON with POF structure
        eyeglasses: {
          ...eyeglasses,
          isPOF: true,
          frameCharges: 0, // No frame charge for POF
          fixedFee: POF_CONFIG.FIXED_FEE
        },
        
        // Update totals
        subtotal: pofPricing.subtotal,
        tax: pofPricing.tax,
        total: pofPricing.total,
        
        status: 'POF_PENDING', // New status for POF quotes
        updatedAt: new Date()
      },
      include: {
        customers: true,
        locations: true
      }
    })

    // Log successful POF setup
    console.log(`POF setup completed for quote ${data.quoteId}`, {
      condition: frameInspection.condition,
      fixedFee: POF_CONFIG.FIXED_FEE,
      total: pofPricing.total,
      savings: pofPricing.savings
    })

    return NextResponse.json({
      success: true,
      message: 'Patient-owned frame setup completed successfully',
      quote: updatedQuote,
      frameInspection,
      validation,
      pricing: pofPricing
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: error.issues
        },
        { status: 400 }
      )
    }
    
    console.error('Set POF Error:', error)
    return NextResponse.json(
      { error: 'Failed to set patient-owned frame' },
      { status: 500 }
    )
  }
}

async function updatePOFPricing(body: unknown) {
  try {
    const data = UpdatePOFPricingSchema.parse(body)
    
    const quote = await prisma.quotes.findUnique({
      where: { id: data.quoteId }
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    if (!quote.isPatientOwnedFrame) {
      return NextResponse.json(
        { error: 'Quote is not a patient-owned frame quote' },
        { status: 400 }
      )
    }

    // Calculate new pricing
    const pofPricing = calculatePOFPricing(
      data.lensCharges,
      data.laborCharges,
      data.addOnCharges,
      data.taxRate
    )

    // Update quote with new pricing
    const updatedQuote = await prisma.quotes.update({
      where: { id: data.quoteId },
      data: {
        // Update eyeglasses JSON with new pricing
        eyeglasses: {
          ...(quote.eyeglasses as Record<string, unknown>),
          lensCharges: data.lensCharges,
          laborCharges: data.laborCharges,
          addOnCharges: data.addOnCharges
        },
        subtotal: pofPricing.subtotal,
        tax: pofPricing.tax,
        total: pofPricing.total,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'POF pricing updated successfully',
      quote: updatedQuote,
      pricing: pofPricing
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid input data',
          details: error.issues
        },
        { status: 400 }
      )
    }
    
    console.error('Update POF Pricing Error:', error)
    return NextResponse.json(
      { error: 'Failed to update POF pricing' },
      { status: 500 }
    )
  }
}

async function validateFrame(body: unknown) {
  try {
    const validationData = body as {
      condition: POFCondition
      description: string
      notes?: string
      inspectedBy: string
      framePhotos?: string[]
      measurements?: {
        bridgeWidth?: number
        lensWidth?: number
        templeLength?: number
      }
      prescriptionData?: {
        sphere?: number
        cylinder?: number
        axis?: number
        add?: number
        isProgressive?: boolean
      }
    }

    const frameInspection: POFFrameInspection = {
      condition: validationData.condition,
      description: validationData.description,
      notes: validationData.notes,
      inspectedBy: validationData.inspectedBy,
      inspectedAt: new Date(),
      framePhotos: validationData.framePhotos,
      measurements: validationData.measurements
    }

    const validation = validatePatientOwnedFrame(frameInspection, validationData.prescriptionData)

    return NextResponse.json({
      success: true,
      validation,
      frameInspection,
      config: POF_CONFIG
    })

  } catch (error) {
    console.error('Validate Frame Error:', error)
    return NextResponse.json(
      { error: 'Failed to validate frame' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('quoteId')
    
    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      )
    }

    const quote = await prisma.quotes.findUnique({
      where: { id: quoteId },
      include: {
        customers: true,
        locations: true
      }
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    if (!quote.isPatientOwnedFrame) {
      return NextResponse.json(
        { error: 'Quote is not a patient-owned frame quote' },
        { status: 400 }
      )
    }

    // Get POF incidents for this quote
    const incidents = await prisma.pofIncidents.findMany({
      where: { quoteId },
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      quote,
      incidents,
      config: POF_CONFIG
    })

  } catch (error) {
    console.error('Get POF Error:', error)
    return NextResponse.json(
      { error: 'Failed to get POF information' },
      { status: 500 }
    )
  }
}