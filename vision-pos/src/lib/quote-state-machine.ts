/**
 * Week 7 Day 1 - Quote State Machine Implementation
 * 
 * This module handles quote state transitions and business logic for the 7-state quote lifecycle:
 * BUILDING → DRAFT → PRESENTED → SIGNED → COMPLETED → CANCELLED/EXPIRED
 */

// Quote State Definitions
export enum QuoteStatus {
  BUILDING = 'BUILDING',     // Initial state - quote being created/edited
  DRAFT = 'DRAFT',           // Quote saved but not presented yet
  PRESENTED = 'PRESENTED',   // Quote presented to customer
  SIGNED = 'SIGNED',         // Customer signed, awaiting fulfillment
  COMPLETED = 'COMPLETED',   // Fully completed and fulfilled
  CANCELLED = 'CANCELLED',   // Cancelled by staff or customer
  EXPIRED = 'EXPIRED'        // Auto-expired after time limit
}

// Valid state transitions map
export const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  [QuoteStatus.BUILDING]: [
    QuoteStatus.DRAFT,      // Save as draft
    QuoteStatus.PRESENTED,  // Direct presentation (skip draft)
    QuoteStatus.CANCELLED   // Cancel during creation
  ],
  [QuoteStatus.DRAFT]: [
    QuoteStatus.BUILDING,   // Return to editing
    QuoteStatus.PRESENTED,  // Present to customer
    QuoteStatus.CANCELLED,  // Cancel draft
    QuoteStatus.EXPIRED     // Auto-expire (system only)
  ],
  [QuoteStatus.PRESENTED]: [
    QuoteStatus.BUILDING,   // Return to editing after presentation
    QuoteStatus.DRAFT,      // Save changes as draft
    QuoteStatus.SIGNED,     // Customer accepts and signs
    QuoteStatus.CANCELLED,  // Customer/staff cancels
    QuoteStatus.EXPIRED     // Auto-expire (system only)
  ],
  [QuoteStatus.SIGNED]: [
    QuoteStatus.COMPLETED,  // Fulfillment complete
    QuoteStatus.CANCELLED   // Cancel after signing (requires manager approval)
  ],
  [QuoteStatus.COMPLETED]: [
    // Terminal state - no transitions allowed
  ],
  [QuoteStatus.CANCELLED]: [
    // Terminal state - no transitions allowed
  ],
  [QuoteStatus.EXPIRED]: [
    QuoteStatus.BUILDING,   // Reactivate expired quote
    QuoteStatus.DRAFT       // Save reactivated as draft
  ]
}

// State transition reasons
export interface StateTransitionReason {
  reason: string
  category: 'USER_ACTION' | 'SYSTEM_ACTION' | 'BUSINESS_RULE'
  requiresManagerApproval?: boolean
  userComment?: string
}

// Common transition reasons
export const TRANSITION_REASONS = {
  BUILDING_TO_DRAFT: {
    reason: 'Quote saved as draft',
    category: 'USER_ACTION' as const
  },
  BUILDING_TO_PRESENTED: {
    reason: 'Quote presented to customer',
    category: 'USER_ACTION' as const
  },
  DRAFT_TO_PRESENTED: {
    reason: 'Draft quote presented to customer',
    category: 'USER_ACTION' as const
  },
  PRESENTED_TO_SIGNED: {
    reason: 'Customer accepted and signed quote',
    category: 'USER_ACTION' as const
  },
  SIGNED_TO_COMPLETED: {
    reason: 'Quote fulfillment completed',
    category: 'USER_ACTION' as const
  },
  ANY_TO_CANCELLED: {
    reason: 'Quote cancelled',
    category: 'USER_ACTION' as const
  },
  DRAFT_TO_EXPIRED: {
    reason: 'Quote auto-expired after 30 days',
    category: 'SYSTEM_ACTION' as const
  },
  PRESENTED_TO_EXPIRED: {
    reason: 'Presented quote auto-expired',
    category: 'SYSTEM_ACTION' as const
  },
  SIGNED_TO_CANCELLED: {
    reason: 'Signed quote cancelled',
    category: 'BUSINESS_RULE' as const,
    requiresManagerApproval: true
  }
}

// State requirements checker
export interface StateRequirements {
  hasRequiredSignatures: boolean
  hasValidItems: boolean
  hasCustomerInfo: boolean
  hasPaymentInfo: boolean
  allItemsFulfilled: boolean
}

export function checkStateRequirements(quote: any): StateRequirements {
  return {
    hasRequiredSignatures: quote.examSignatureCompleted && quote.materialsSignatureCompleted,
    hasValidItems: (quote.examServices?.length > 0 || quote.eyeglasses?.items?.length > 0 || quote.contacts?.items?.length > 0),
    hasCustomerInfo: quote.patientInfo?.firstName && quote.patientInfo?.lastName,
    hasPaymentInfo: quote.insuranceInfo || quote.patientResponsibility > 0,
    allItemsFulfilled: quote.fulfillmentCompleted
  }
}

// State transition validator
export class QuoteStateMachine {
  static canTransitionTo(currentStatus: QuoteStatus, targetStatus: QuoteStatus): boolean {
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || []
    return allowedTransitions.includes(targetStatus)
  }

  static validateTransition(
    currentStatus: QuoteStatus,
    targetStatus: QuoteStatus,
    requirements: StateRequirements,
    userRole: string = 'SALES_ASSOCIATE'
  ): { valid: boolean; reason?: string; requiresApproval?: boolean } {
    // Check if transition is allowed
    if (!this.canTransitionTo(currentStatus, targetStatus)) {
      return {
        valid: false,
        reason: `Invalid transition from ${currentStatus} to ${targetStatus}`
      }
    }

    // State-specific validation rules
    switch (targetStatus) {
      case QuoteStatus.DRAFT:
        if (!requirements.hasValidItems) {
          return {
            valid: false,
            reason: 'Quote must have at least one service or product before saving as draft'
          }
        }
        break

      case QuoteStatus.PRESENTED:
        if (!requirements.hasCustomerInfo) {
          return {
            valid: false,
            reason: 'Customer information is required before presenting quote'
          }
        }
        if (!requirements.hasValidItems) {
          return {
            valid: false,
            reason: 'Quote must have services or products before presentation'
          }
        }
        break

      case QuoteStatus.SIGNED:
        if (!requirements.hasRequiredSignatures) {
          return {
            valid: false,
            reason: 'All required signatures must be completed before marking as signed'
          }
        }
        if (!requirements.hasPaymentInfo) {
          return {
            valid: false,
            reason: 'Payment information is required before marking as signed'
          }
        }
        break

      case QuoteStatus.COMPLETED:
        if (currentStatus !== QuoteStatus.SIGNED) {
          return {
            valid: false,
            reason: 'Quote must be signed before completing'
          }
        }
        if (!requirements.allItemsFulfilled) {
          return {
            valid: false,
            reason: 'All items must be fulfilled before completing quote'
          }
        }
        break

      case QuoteStatus.CANCELLED:
        // Manager approval required for cancelling signed quotes
        if (currentStatus === QuoteStatus.SIGNED && userRole !== 'MANAGER') {
          return {
            valid: true,
            requiresApproval: true,
            reason: 'Manager approval required to cancel signed quote'
          }
        }
        break
    }

    return { valid: true }
  }

  static getNextValidStates(currentStatus: QuoteStatus, requirements: StateRequirements): QuoteStatus[] {
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || []
    
    return allowedTransitions.filter(targetStatus => {
      const validation = this.validateTransition(currentStatus, targetStatus, requirements)
      return validation.valid || validation.requiresApproval
    })
  }

  static getStateDescription(status: QuoteStatus): string {
    switch (status) {
      case QuoteStatus.BUILDING:
        return 'Quote is being created or edited'
      case QuoteStatus.DRAFT:
        return 'Quote saved as draft, not yet presented'
      case QuoteStatus.PRESENTED:
        return 'Quote presented to customer, awaiting response'
      case QuoteStatus.SIGNED:
        return 'Customer signed quote, awaiting fulfillment'
      case QuoteStatus.COMPLETED:
        return 'Quote fully completed and fulfilled'
      case QuoteStatus.CANCELLED:
        return 'Quote cancelled by customer or staff'
      case QuoteStatus.EXPIRED:
        return 'Quote expired due to time limit'
      default:
        return 'Unknown status'
    }
  }

  static isTerminalState(status: QuoteStatus): boolean {
    return [QuoteStatus.COMPLETED, QuoteStatus.CANCELLED].includes(status)
  }

  static canEditQuote(status: QuoteStatus): boolean {
    return [QuoteStatus.BUILDING, QuoteStatus.DRAFT].includes(status)
  }

  static requiresCustomerAction(status: QuoteStatus): boolean {
    return [QuoteStatus.PRESENTED].includes(status)
  }

  static getStateColor(status: QuoteStatus): string {
    switch (status) {
      case QuoteStatus.BUILDING:
        return 'blue'
      case QuoteStatus.DRAFT:
        return 'gray'
      case QuoteStatus.PRESENTED:
        return 'yellow'
      case QuoteStatus.SIGNED:
        return 'purple'
      case QuoteStatus.COMPLETED:
        return 'green'
      case QuoteStatus.CANCELLED:
        return 'red'
      case QuoteStatus.EXPIRED:
        return 'orange'
      default:
        return 'gray'
    }
  }

  static getStateIcon(status: QuoteStatus): string {
    switch (status) {
      case QuoteStatus.BUILDING:
        return '🔨'
      case QuoteStatus.DRAFT:
        return '📝'
      case QuoteStatus.PRESENTED:
        return '👥'
      case QuoteStatus.SIGNED:
        return '✍️'
      case QuoteStatus.COMPLETED:
        return '✅'
      case QuoteStatus.CANCELLED:
        return '❌'
      case QuoteStatus.EXPIRED:
        return '⏰'
      default:
        return '❓'
    }
  }
}

// Auto-expiration logic
export class QuoteExpirationManager {
  static readonly DEFAULT_EXPIRATION_DAYS = 30

  static shouldExpire(quote: any): boolean {
    const now = new Date()
    const lastActivity = new Date(quote.lastActivityAt || quote.updatedAt)
    const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    
    // Check if quote is in expirable state
    const expirableStates = [QuoteStatus.DRAFT, QuoteStatus.PRESENTED]
    const canExpire = expirableStates.includes(quote.status as QuoteStatus)
    
    // Check if expiration period has passed
    const expirationDays = quote.autoExpireAfterDays || this.DEFAULT_EXPIRATION_DAYS
    const hasExpired = daysSinceActivity >= expirationDays
    
    return canExpire && hasExpired && !quote.expireNotificationSent
  }

  static shouldSendExpirationWarning(quote: any): boolean {
    const now = new Date()
    const lastActivity = new Date(quote.lastActivityAt || quote.updatedAt)
    const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    
    // Send warning 3 days before expiration
    const expirationDays = quote.autoExpireAfterDays || this.DEFAULT_EXPIRATION_DAYS
    const warningThreshold = expirationDays - 3
    
    const expirableStates = [QuoteStatus.DRAFT, QuoteStatus.PRESENTED]
    const canExpire = expirableStates.includes(quote.status as QuoteStatus)
    
    return canExpire && daysSinceActivity >= warningThreshold && !quote.expireNotificationSent
  }

  static getExpirationDate(quote: any): Date {
    const lastActivity = new Date(quote.lastActivityAt || quote.updatedAt)
    const expirationDays = quote.autoExpireAfterDays || this.DEFAULT_EXPIRATION_DAYS
    
    const expirationDate = new Date(lastActivity)
    expirationDate.setDate(expirationDate.getDate() + expirationDays)
    
    return expirationDate
  }

  static getDaysUntilExpiration(quote: any): number {
    const now = new Date()
    const expirationDate = this.getExpirationDate(quote)
    const timeDiff = expirationDate.getTime() - now.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
    
    return Math.max(0, daysDiff)
  }
}

// State transition history tracking
export interface StateTransitionHistoryEntry {
  id: string
  quoteId: string
  fromStatus: QuoteStatus
  toStatus: QuoteStatus
  reason: string
  reasonCategory: string
  userId: string
  userComment?: string
  requiresApproval: boolean
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedBy?: string
  approvedAt?: Date
  rejectionReason?: string
  createdAt: Date
}

export const QuoteStateSystem = {
  QuoteStatus,
  QuoteStateMachine,
  QuoteExpirationManager,
  VALID_TRANSITIONS,
  TRANSITION_REASONS,
  checkStateRequirements
}

export default QuoteStateSystem