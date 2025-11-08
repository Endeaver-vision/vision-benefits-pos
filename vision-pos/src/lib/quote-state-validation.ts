/**
 * Week 7 Day 1 - Quote State Transition Validation Service
 * 
 * Business rules and validation logic for quote state transitions
 */

import { PrismaClient } from '@prisma/client'
import { 
  QuoteStatus, 
  QuoteStateMachine, 
  checkStateRequirements,
  StateRequirements 
} from '@/lib/quote-state-machine'

const prisma = new PrismaClient()

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  requiresApproval?: boolean
  approvalReason?: string
  blockedReasons?: string[]
}

export interface ValidationContext {
  currentUser: {
    id: string
    role: string
    locationId: string
  }
  quote: any
  targetStatus: QuoteStatus
  reason?: string
  overrideFlags?: {
    skipSignatureCheck?: boolean
    skipItemValidation?: boolean
    forceManagerApproval?: boolean
  }
}

export class QuoteStateValidationService {
  
  /**
   * Comprehensive validation for quote state transitions
   */
  static async validateStateTransition(context: ValidationContext): Promise<ValidationResult> {
    const { currentUser, quote, targetStatus, overrideFlags = {} } = context
    const currentStatus = quote.status as QuoteStatus
    
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    try {
      // 1. Basic transition validation
      const basicValidation = this.validateBasicTransition(currentStatus, targetStatus)
      if (!basicValidation.isValid) {
        result.errors.push(...basicValidation.errors)
        result.isValid = false
        return result
      }

      // 2. User permissions validation
      const permissionValidation = await this.validateUserPermissions(currentUser, currentStatus, targetStatus)
      if (!permissionValidation.isValid) {
        result.errors.push(...permissionValidation.errors)
        if (permissionValidation.requiresApproval) {
          result.requiresApproval = true
          result.approvalReason = permissionValidation.approvalReason
        } else {
          result.isValid = false
          return result
        }
      }

      // 3. Quote requirements validation
      const requirementsValidation = await this.validateQuoteRequirements(
        quote, 
        targetStatus, 
        overrideFlags
      )
      if (!requirementsValidation.isValid) {
        result.errors.push(...requirementsValidation.errors)
        result.warnings.push(...requirementsValidation.warnings)
        if (requirementsValidation.errors.length > 0) {
          result.isValid = false
        }
      }

      // 4. Business rules validation
      const businessRulesValidation = await this.validateBusinessRules(
        quote, 
        currentStatus, 
        targetStatus, 
        currentUser
      )
      if (!businessRulesValidation.isValid) {
        result.errors.push(...businessRulesValidation.errors)
        result.warnings.push(...businessRulesValidation.warnings)
        if (businessRulesValidation.requiresApproval) {
          result.requiresApproval = true
          result.approvalReason = businessRulesValidation.approvalReason
        }
        if (businessRulesValidation.errors.length > 0 && !businessRulesValidation.requiresApproval) {
          result.isValid = false
        }
      }

      // 5. Time-based validations
      const timeValidation = this.validateTimingRules(quote, currentStatus, targetStatus)
      if (!timeValidation.isValid) {
        result.warnings.push(...timeValidation.warnings)
        // Time validations are typically warnings, not hard blocks
      }

      return result

    } catch (error) {
      console.error('Error during state transition validation:', error)
      result.isValid = false
      result.errors.push('Internal validation error occurred')
      return result
    }
  }

  /**
   * Validate basic state machine rules
   */
  private static validateBasicTransition(
    currentStatus: QuoteStatus, 
    targetStatus: QuoteStatus
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // Check if transition is allowed by state machine
    if (!QuoteStateMachine.canTransitionTo(currentStatus, targetStatus)) {
      result.isValid = false
      result.errors.push(
        `Invalid state transition from ${currentStatus} to ${targetStatus}`
      )
    }

    // Check for redundant transitions
    if (currentStatus === targetStatus) {
      result.warnings.push('Quote is already in the target status')
    }

    return result
  }

  /**
   * Validate user permissions for state transitions
   */
  private static async validateUserPermissions(
    user: { id: string; role: string; locationId: string },
    currentStatus: QuoteStatus,
    targetStatus: QuoteStatus
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // Role-based permissions
    switch (targetStatus) {
      case QuoteStatus.CANCELLED:
        if (currentStatus === QuoteStatus.SIGNED) {
          // Only managers can cancel signed quotes
          if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
            result.requiresApproval = true
            result.approvalReason = 'Manager approval required to cancel signed quote'
            result.isValid = false
          }
        }
        break

      case QuoteStatus.COMPLETED:
        // Only staff with fulfillment permissions can mark as completed
        if (!['MANAGER', 'ADMIN', 'FULFILLMENT_SPECIALIST'].includes(user.role)) {
          result.errors.push('Insufficient permissions to mark quote as completed')
          result.isValid = false
        }
        break

      case QuoteStatus.EXPIRED:
        // Only system or managers can manually expire quotes
        if (user.id !== 'system' && !['MANAGER', 'ADMIN'].includes(user.role)) {
          result.errors.push('Only managers can manually expire quotes')
          result.isValid = false
        }
        break
    }

    return result
  }

  /**
   * Validate quote requirements for target status
   */
  private static async validateQuoteRequirements(
    quote: any,
    targetStatus: QuoteStatus,
    overrideFlags: any = {}
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    const requirements = checkStateRequirements(quote)

    switch (targetStatus) {
      case QuoteStatus.DRAFT:
        if (!requirements.hasValidItems && !overrideFlags.skipItemValidation) {
          result.errors.push('Quote must contain at least one service or product')
        }
        if (!requirements.hasCustomerInfo) {
          result.warnings.push('Customer information is incomplete')
        }
        break

      case QuoteStatus.PRESENTED:
        if (!requirements.hasValidItems) {
          result.errors.push('Cannot present quote without services or products')
        }
        if (!requirements.hasCustomerInfo) {
          result.errors.push('Customer information is required before presenting quote')
        }
        if (quote.total <= 0) {
          result.errors.push('Quote total must be greater than zero')
        }
        break

      case QuoteStatus.SIGNED:
        if (!requirements.hasRequiredSignatures && !overrideFlags.skipSignatureCheck) {
          result.errors.push('All required signatures must be completed')
        }
        if (!requirements.hasPaymentInfo) {
          result.errors.push('Payment information is required before marking as signed')
        }
        if (!quote.presentedAt) {
          result.warnings.push('Quote was not formally presented to customer')
        }
        break

      case QuoteStatus.COMPLETED:
        if (!requirements.allItemsFulfilled) {
          result.errors.push('All quote items must be fulfilled before completion')
        }
        if (currentStatus !== QuoteStatus.SIGNED) {
          result.errors.push('Quote must be signed before marking as completed')
        }
        break
    }

    return result
  }

  /**
   * Validate business rules specific to quote transitions
   */
  private static async validateBusinessRules(
    quote: any,
    currentStatus: QuoteStatus,
    targetStatus: QuoteStatus,
    user: any
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // Insurance validation rules
    if (targetStatus === QuoteStatus.SIGNED) {
      if (quote.insuranceInfo?.carrier && !quote.insuranceInfo?.verified) {
        result.warnings.push('Insurance information has not been verified')
      }
    }

    // POF (Patient Owned Frame) specific validations
    if (quote.isPatientOwnedFrame) {
      if (targetStatus === QuoteStatus.SIGNED) {
        if (!quote.pofInspectionCompleted) {
          result.errors.push('Patient-owned frame inspection must be completed before signing')
        }
        if (!quote.pofWaiverSigned) {
          result.errors.push('Patient-owned frame waiver must be signed')
        }
      }
    }

    // Second pair validations
    if (quote.isSecondPair) {
      if (targetStatus === QuoteStatus.PRESENTED || targetStatus === QuoteStatus.SIGNED) {
        // Verify original quote exists and is completed
        const originalQuote = await prisma.quotes.findUnique({
          where: { id: quote.secondPairOf }
        })
        
        if (!originalQuote || originalQuote.status !== QuoteStatus.COMPLETED) {
          result.errors.push('Original quote must be completed before processing second pair')
        }
      }
    }

    // Financial validations
    if (targetStatus === QuoteStatus.SIGNED) {
      if (quote.total > 10000) { // High-value quote threshold
        if (user.role === 'SALES_ASSOCIATE') {
          result.requiresApproval = true
          result.approvalReason = 'Manager approval required for high-value quotes over $10,000'
        }
      }
    }

    // Location-specific rules
    if (user.locationId !== quote.locationId && !['ADMIN', 'MANAGER'].includes(user.role)) {
      result.warnings.push('You are modifying a quote from a different location')
    }

    return result
  }

  /**
   * Validate timing and expiration rules
   */
  private static validateTimingRules(
    quote: any,
    currentStatus: QuoteStatus,
    targetStatus: QuoteStatus
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    const now = new Date()
    const createdAt = new Date(quote.createdAt)
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

    // Warn about old quotes
    if (targetStatus === QuoteStatus.PRESENTED && daysSinceCreation > 7) {
      result.warnings.push('This quote is over 7 days old. Consider reviewing pricing and availability.')
    }

    // Check for near-expiration
    if ([QuoteStatus.DRAFT, QuoteStatus.PRESENTED].includes(currentStatus)) {
      const expirationDays = quote.autoExpireAfterDays || 30
      const daysUntilExpiration = expirationDays - daysSinceCreation
      
      if (daysUntilExpiration <= 3 && daysUntilExpiration > 0) {
        result.warnings.push(`Quote will expire in ${daysUntilExpiration} days`)
      }
    }

    // Business hours validation for certain transitions
    const businessHours = this.isBusinessHours()
    if (!businessHours && targetStatus === QuoteStatus.SIGNED) {
      result.warnings.push('Signing quote outside of business hours')
    }

    return result
  }

  /**
   * Check if current time is within business hours
   */
  private static isBusinessHours(): boolean {
    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
    
    // Business hours: Monday-Friday 8 AM - 7 PM, Saturday 9 AM - 5 PM
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday-Friday
      return hour >= 8 && hour < 19
    } else if (dayOfWeek === 6) { // Saturday
      return hour >= 9 && hour < 17
    }
    
    return false // Sunday or outside hours
  }

  /**
   * Get validation summary for UI display
   */
  static getValidationSummary(result: ValidationResult): string {
    if (result.isValid) {
      if (result.warnings.length > 0) {
        return `Valid with ${result.warnings.length} warnings`
      }
      return 'Valid transition'
    }

    if (result.requiresApproval) {
      return 'Requires manager approval'
    }

    return `Blocked: ${result.errors.length} errors`
  }

  /**
   * Check if quote can be edited in current state
   */
  static canEditQuote(status: QuoteStatus): boolean {
    return QuoteStateMachine.canEditQuote(status)
  }

  /**
   * Get recommended next actions for quote
   */
  static getRecommendedActions(quote: any): string[] {
    const status = quote.status as QuoteStatus
    const requirements = checkStateRequirements(quote)
    const actions: string[] = []

    switch (status) {
      case QuoteStatus.BUILDING:
        if (!requirements.hasValidItems) {
          actions.push('Add services or products to quote')
        }
        if (!requirements.hasCustomerInfo) {
          actions.push('Complete customer information')
        }
        if (requirements.hasValidItems && requirements.hasCustomerInfo) {
          actions.push('Save as draft or present to customer')
        }
        break

      case QuoteStatus.DRAFT:
        actions.push('Present quote to customer')
        if (!requirements.hasCustomerInfo) {
          actions.push('Complete customer information before presenting')
        }
        break

      case QuoteStatus.PRESENTED:
        actions.push('Collect required signatures')
        if (!requirements.hasRequiredSignatures) {
          actions.push('Complete exam signature')
          actions.push('Complete materials signature')
        }
        break

      case QuoteStatus.SIGNED:
        actions.push('Fulfill quote items')
        if (!requirements.allItemsFulfilled) {
          actions.push('Process order fulfillment')
        }
        break

      case QuoteStatus.COMPLETED:
        actions.push('Quote is fully completed')
        break

      case QuoteStatus.EXPIRED:
        actions.push('Reactivate quote to continue')
        break

      case QuoteStatus.CANCELLED:
        actions.push('Quote is cancelled - no further action needed')
        break
    }

    return actions
  }
}

export default QuoteStateValidationService