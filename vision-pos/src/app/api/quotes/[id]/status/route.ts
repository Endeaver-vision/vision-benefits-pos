/**
 * Week 7 Day 1 - Quote Status Management API Endpoint
 * PATCH /api/quotes/:id/status
 * 
 * Handles quote state transitions with validation and business logic
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { 
  QuoteStatus, 
  QuoteStateMachine, 
  checkStateRequirements,
  TRANSITION_REASONS,
  StateTransitionReason 
} from '@/lib/quote-state-machine'

const prisma = new PrismaClient()

interface StatusUpdateRequest {
  newStatus: QuoteStatus
  reason?: string
  userComment?: string
  managerApprovalId?: string
}

interface StatusUpdateResponse {
  success: boolean
  quote?: any
  error?: string
  requiresApproval?: boolean
  approvalId?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<StatusUpdateResponse>> {
  try {
    const { id } = params
    const body: StatusUpdateRequest = await request.json()
    const { newStatus, reason, userComment, managerApprovalId } = body

    // Get current user info (would come from auth middleware in real app)
    const userId = request.headers.get('x-user-id') || 'system'
    const userRole = request.headers.get('x-user-role') || 'SALES_ASSOCIATE'

    // Validate request data
    if (!Object.values(QuoteStatus).includes(newStatus)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid status: ${newStatus}. Valid statuses: ${Object.values(QuoteStatus).join(', ')}` 
        },
        { status: 400 }
      )
    }

    // Get current quote with all required data
    const currentQuote = await prisma.quotes.findUnique({
      where: { id },
      include: {
        customers: true,
        signatures: true,
        users: true
      }
    })

    if (!currentQuote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    const currentStatus = currentQuote.status as QuoteStatus

    // Check if already in target status
    if (currentStatus === newStatus) {
      return NextResponse.json(
        { 
          success: true, 
          quote: currentQuote,
          error: 'Quote is already in the requested status'
        },
        { status: 200 }
      )
    }

    // Check state requirements
    const requirements = checkStateRequirements(currentQuote)

    // Validate state transition
    const validation = QuoteStateMachine.validateTransition(
      currentStatus,
      newStatus,
      requirements,
      userRole
    )

    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.reason 
        },
        { status: 400 }
      )
    }

    // Handle manager approval required
    if (validation.requiresApproval && !managerApprovalId) {
      // Create pending approval request
      const approvalId = await createApprovalRequest({
        quoteId: id,
        fromStatus: currentStatus,
        toStatus: newStatus,
        requestedBy: userId,
        reason: reason || validation.reason || '',
        userComment
      })

      return NextResponse.json({
        success: false,
        requiresApproval: true,
        approvalId,
        error: 'Manager approval required for this status change'
      })
    }

    // Prepare update data
    const now = new Date()
    const updateData: any = {
      status: newStatus,
      previousStatus: currentStatus,
      statusChangedAt: now,
      statusChangedBy: userId,
      statusReason: reason || getDefaultReason(currentStatus, newStatus),
      lastActivityAt: now,
      updatedAt: now
    }

    // Set specific completion flags and timestamps based on new status
    switch (newStatus) {
      case QuoteStatus.DRAFT:
        updateData.draftCreatedAt = now
        break
      
      case QuoteStatus.PRESENTED:
        updateData.presentedAt = now
        updateData.presentationCompleted = true
        break
      
      case QuoteStatus.SIGNED:
        updateData.signedAt = now
        updateData.signaturesCompleted = true
        break
      
      case QuoteStatus.COMPLETED:
        updateData.completedAt = now
        updateData.fulfillmentCompleted = true
        break
      
      case QuoteStatus.CANCELLED:
        updateData.cancelledAt = now
        break
      
      case QuoteStatus.EXPIRED:
        updateData.expiredAt = now
        break

      case QuoteStatus.BUILDING:
        // Reset completion flags when returning to building
        updateData.presentationCompleted = false
        updateData.buildingCompleted = false
        break
    }

    // Update quote in database
    const updatedQuote = await prisma.quotes.update({
      where: { id },
      data: updateData,
      include: {
        customers: true,
        signatures: true,
        users: true
      }
    })

    // Log the state transition
    await logStateTransition({
      quoteId: id,
      fromStatus: currentStatus,
      toStatus: newStatus,
      userId,
      reason: updateData.statusReason,
      userComment,
      managerApprovalId
    })

    // Trigger any necessary side effects
    await handleStatusChangeEffects(updatedQuote, currentStatus, newStatus)

    return NextResponse.json({
      success: true,
      quote: updatedQuote
    })

  } catch (error) {
    console.error('Error updating quote status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Get current quote status without updating
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params

    const quote = await prisma.quotes.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        previousStatus: true,
        statusChangedAt: true,
        statusChangedBy: true,
        statusReason: true,
        lastActivityAt: true,
        buildingCompleted: true,
        presentationCompleted: true,
        signaturesCompleted: true,
        fulfillmentCompleted: true,
        expiredAt: true,
        cancelledAt: true,
        completedAt: true
      }
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Get state requirements for current quote
    const fullQuote = await prisma.quotes.findUnique({
      where: { id },
      include: { signatures: true }
    })

    const requirements = checkStateRequirements(fullQuote)
    const currentStatus = quote.status as QuoteStatus
    const nextValidStates = QuoteStateMachine.getNextValidStates(currentStatus, requirements)

    return NextResponse.json({
      status: quote.status,
      previousStatus: quote.previousStatus,
      statusChangedAt: quote.statusChangedAt,
      statusChangedBy: quote.statusChangedBy,
      statusReason: quote.statusReason,
      lastActivityAt: quote.lastActivityAt,
      completionFlags: {
        building: quote.buildingCompleted,
        presentation: quote.presentationCompleted,
        signatures: quote.signaturesCompleted,
        fulfillment: quote.fulfillmentCompleted
      },
      stateInfo: {
        description: QuoteStateMachine.getStateDescription(currentStatus),
        color: QuoteStateMachine.getStateColor(currentStatus),
        icon: QuoteStateMachine.getStateIcon(currentStatus),
        isTerminal: QuoteStateMachine.isTerminalState(currentStatus),
        canEdit: QuoteStateMachine.canEditQuote(currentStatus),
        requiresCustomerAction: QuoteStateMachine.requiresCustomerAction(currentStatus)
      },
      nextValidStates,
      requirements
    })

  } catch (error) {
    console.error('Error getting quote status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Helper functions

function getDefaultReason(fromStatus: QuoteStatus, toStatus: QuoteStatus): string {
  const key = `${fromStatus}_TO_${toStatus}` as keyof typeof TRANSITION_REASONS
  const defaultReason = TRANSITION_REASONS[key]
  return defaultReason?.reason || `Status changed from ${fromStatus} to ${toStatus}`
}

async function createApprovalRequest(data: {
  quoteId: string
  fromStatus: QuoteStatus
  toStatus: QuoteStatus
  requestedBy: string
  reason: string
  userComment?: string
}): Promise<string> {
  // In a real application, this would create an approval request in a separate table
  // For now, we'll return a mock approval ID
  const approvalId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  console.log('Approval request created:', {
    approvalId,
    ...data
  })
  
  return approvalId
}

async function logStateTransition(data: {
  quoteId: string
  fromStatus: QuoteStatus
  toStatus: QuoteStatus
  userId: string
  reason: string
  userComment?: string
  managerApprovalId?: string
}) {
  // In a real application, this would log to a state transition history table
  console.log('State transition logged:', data)
}

async function handleStatusChangeEffects(
  quote: any, 
  fromStatus: QuoteStatus, 
  toStatus: QuoteStatus
) {
  // Handle side effects of status changes
  switch (toStatus) {
    case QuoteStatus.PRESENTED:
      // Could trigger email notification to customer
      console.log(`Quote ${quote.id} presented to customer ${quote.customers.email}`)
      break
    
    case QuoteStatus.SIGNED:
      // Could trigger fulfillment workflow
      console.log(`Quote ${quote.id} signed, initiating fulfillment`)
      break
    
    case QuoteStatus.COMPLETED:
      // Could trigger follow-up communications
      console.log(`Quote ${quote.id} completed successfully`)
      break
    
    case QuoteStatus.EXPIRED:
      // Could trigger cleanup or archive actions
      console.log(`Quote ${quote.id} expired`)
      break
  }
}

// Export for use in other modules
export { QuoteStatus, QuoteStateMachine, checkStateRequirements }