import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export type SignatureType = 'EXAM' | 'MATERIALS'

export interface SignatureData {
  quoteId: string
  signatureType: SignatureType
  signatureData: string // Base64 encoded signature image
  signerName: string
  signerRole?: string
  ipAddress?: string
  userAgent?: string
  deviceInfo?: string
  signatureWidth?: number
  signatureHeight?: number
}

export interface SignatureValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface SignatureWorkflowStatus {
  examSignatureRequired: boolean
  materialsSignatureRequired: boolean
  examSignatureCompleted: boolean
  materialsSignatureCompleted: boolean
  canCaptureExamSignature: boolean
  canCaptureMaterialsSignature: boolean
  workflowComplete: boolean
  nextStep?: 'EXAM_SIGNATURE' | 'MATERIALS_SIGNATURE' | 'COMPLETE'
}

export class SignatureService {
  /**
   * Signature Capture Workflow Design
   * 
   * WORKFLOW RULES:
   * 1. Exam signature can be captured once exam services are configured
   * 2. Materials signature can be captured once eyeglasses/contacts are configured
   * 3. Both signatures are independent - can be captured in any order
   * 4. Each signature type can only have one valid signature per quote
   * 5. Signatures can be invalidated and recaptured if needed
   * 6. Complete audit trail is maintained for compliance
   * 
   * VALIDATION RULES:
   * - Signature data must be valid base64 image
   * - Signer name must match patient name (configurable)
   * - No duplicate valid signatures of same type
   * - Quote must exist and be in valid state
   * - Signature data must meet minimum quality requirements
   */

  /**
   * Get signature workflow status for a quote
   */
  async getSignatureWorkflowStatus(quoteId: string): Promise<SignatureWorkflowStatus> {
    const quote = await prisma.quotes.findUnique({
      where: { id: quoteId },
      include: {
        signatures: {
          where: { isValid: true },
          orderBy: { timestamp: 'desc' }
        }
      }
    })

    if (!quote) {
      throw new Error('Quote not found')
    }

    // Parse quote data to determine requirements
    const examServices = quote.examServices as any
    const eyeglasses = quote.eyeglasses as any
    const contacts = quote.contacts as any

    const examSignatureRequired = examServices && Object.keys(examServices).length > 0
    const materialsSignatureRequired = 
      (eyeglasses && Object.keys(eyeglasses).length > 0) ||
      (contacts && Object.keys(contacts).length > 0)

    // Check existing signatures
    const examSignature = quote.signatures.find(s => s.signatureType === 'EXAM')
    const materialsSignature = quote.signatures.find(s => s.signatureType === 'MATERIALS')

    const examSignatureCompleted = !!examSignature
    const materialsSignatureCompleted = !!materialsSignature

    // Determine what can be captured next
    const canCaptureExamSignature = examSignatureRequired && !examSignatureCompleted
    const canCaptureMaterialsSignature = materialsSignatureRequired && !materialsSignatureCompleted

    const workflowComplete = 
      (!examSignatureRequired || examSignatureCompleted) &&
      (!materialsSignatureRequired || materialsSignatureCompleted)

    let nextStep: 'EXAM_SIGNATURE' | 'MATERIALS_SIGNATURE' | 'COMPLETE' | undefined

    if (!workflowComplete) {
      if (canCaptureExamSignature) {
        nextStep = 'EXAM_SIGNATURE'
      } else if (canCaptureMaterialsSignature) {
        nextStep = 'MATERIALS_SIGNATURE'
      }
    } else {
      nextStep = 'COMPLETE'
    }

    return {
      examSignatureRequired,
      materialsSignatureRequired,
      examSignatureCompleted,
      materialsSignatureCompleted,
      canCaptureExamSignature,
      canCaptureMaterialsSignature,
      workflowComplete,
      nextStep
    }
  }

  /**
   * Validate signature data before capture
   */
  async validateSignature(data: SignatureData): Promise<SignatureValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate quote exists
    const quote = await prisma.quotes.findUnique({
      where: { id: data.quoteId },
      include: {
        signatures: {
          where: { 
            signatureType: data.signatureType,
            isValid: true 
          }
        }
      }
    })

    if (!quote) {
      errors.push('Quote not found')
      return { isValid: false, errors, warnings }
    }

    // Check for existing valid signature of same type
    if (quote.signatures.length > 0) {
      errors.push(`A valid ${data.signatureType.toLowerCase()} signature already exists for this quote`)
    }

    // Validate signature data format
    if (!data.signatureData) {
      errors.push('Signature data is required')
    } else if (!this.isValidBase64Image(data.signatureData)) {
      errors.push('Invalid signature data format')
    }

    // Validate signer name
    if (!data.signerName || data.signerName.trim().length < 2) {
      errors.push('Signer name must be at least 2 characters')
    }

    // Validate signature type is appropriate for quote content
    const workflowStatus = await this.getSignatureWorkflowStatus(data.quoteId)
    
    if (data.signatureType === 'EXAM' && !workflowStatus.canCaptureExamSignature) {
      if (workflowStatus.examSignatureCompleted) {
        errors.push('Exam signature already completed')
      } else if (!workflowStatus.examSignatureRequired) {
        errors.push('Exam signature not required for this quote')
      }
    }

    if (data.signatureType === 'MATERIALS' && !workflowStatus.canCaptureMaterialsSignature) {
      if (workflowStatus.materialsSignatureCompleted) {
        errors.push('Materials signature already completed')
      } else if (!workflowStatus.materialsSignatureRequired) {
        errors.push('Materials signature not required for this quote')
      }
    }

    // Validate signature quality (basic checks)
    if (data.signatureData && this.isValidBase64Image(data.signatureData)) {
      const signatureQuality = this.assessSignatureQuality(data.signatureData)
      if (signatureQuality.isEmpty) {
        warnings.push('Signature appears to be empty or very simple')
      }
      if (signatureQuality.tooSmall) {
        warnings.push('Signature appears to be very small')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Capture a signature
   */
  async captureSignature(data: SignatureData): Promise<{
    success: boolean
    signatureId?: string
    errors?: string[]
    warnings?: string[]
  }> {
    // Validate signature first
    const validation = await this.validateSignature(data)
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings
      }
    }

    try {
      // Generate signature hash for integrity
      const signatureHash = this.generateSignatureHash(data.signatureData)

      // Create signature record
      const signature = await prisma.signatures.create({
        data: {
          id: crypto.randomUUID(),
          quoteId: data.quoteId,
          signatureType: data.signatureType,
          signatureData: data.signatureData,
          signerName: data.signerName.trim(),
          signerRole: data.signerRole?.trim(),
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          deviceInfo: data.deviceInfo,
          signatureWidth: data.signatureWidth,
          signatureHeight: data.signatureHeight,
          signatureHash,
          nameVerified: false // Will be verified separately if needed
        }
      })

      // Update quote signature completion flags
      await this.updateQuoteSignatureFlags(data.quoteId)

      return {
        success: true,
        signatureId: signature.id,
        warnings: validation.warnings
      }
    } catch (error) {
      console.error('Error capturing signature:', error)
      return {
        success: false,
        errors: ['Failed to save signature. Please try again.']
      }
    }
  }

  /**
   * Get signatures for a quote
   */
  async getQuoteSignatures(quoteId: string) {
    const signatures = await prisma.signatures.findMany({
      where: { quoteId },
      orderBy: { timestamp: 'desc' }
    })

    return signatures.map(sig => ({
      ...sig,
      // Don't expose full signature data in list view for performance
      signatureData: `${sig.signatureData.substring(0, 50)}...`
    }))
  }

  /**
   * Get full signature details
   */
  async getSignatureDetails(signatureId: string) {
    return await prisma.signatures.findUnique({
      where: { id: signatureId },
      include: {
        quotes: {
          select: {
            id: true,
            quoteNumber: true,
            status: true
          }
        }
      }
    })
  }

  /**
   * Invalidate a signature
   */
  async invalidateSignature(
    signatureId: string, 
    reason: string, 
    invalidatedBy: string
  ): Promise<boolean> {
    try {
      const signature = await prisma.signatures.update({
        where: { id: signatureId },
        data: {
          isValid: false,
          invalidatedAt: new Date(),
          invalidatedBy,
          invalidationReason: reason
        }
      })

      // Update quote signature flags
      await this.updateQuoteSignatureFlags(signature.quoteId)

      return true
    } catch (error) {
      console.error('Error invalidating signature:', error)
      return false
    }
  }

  /**
   * Verify signer name matches patient
   */
  async verifySignerName(signatureId: string, verifiedBy: string): Promise<boolean> {
    try {
      await prisma.signatures.update({
        where: { id: signatureId },
        data: {
          nameVerified: true,
          nameVerifiedAt: new Date(),
          nameVerifiedBy: verifiedBy
        }
      })
      return true
    } catch (error) {
      console.error('Error verifying signer name:', error)
      return false
    }
  }

  /**
   * Private helper methods
   */

  private isValidBase64Image(data: string): boolean {
    try {
      // Check if it's a data URL
      if (!data.startsWith('data:image/')) {
        return false
      }

      // Extract base64 part
      const base64Part = data.split(',')[1]
      if (!base64Part) {
        return false
      }

      // Validate base64
      const buffer = Buffer.from(base64Part, 'base64')
      return buffer.length > 0
    } catch {
      return false
    }
  }

  private assessSignatureQuality(signatureData: string): {
    isEmpty: boolean
    tooSmall: boolean
  } {
    // Basic quality assessment
    // In a real implementation, you might decode the image and analyze pixels
    const base64Part = signatureData.split(',')[1] || ''
    
    return {
      isEmpty: base64Part.length < 1000, // Very rough heuristic
      tooSmall: base64Part.length < 2000 // Very rough heuristic
    }
  }

  private generateSignatureHash(signatureData: string): string {
    return crypto.createHash('sha256').update(signatureData).digest('hex')
  }

  private async updateQuoteSignatureFlags(quoteId: string): Promise<void> {
    // Get current valid signatures
    const signatures = await prisma.signatures.findMany({
      where: {
        quoteId,
        isValid: true
      }
    })

    const examSignature = signatures.find(s => s.signatureType === 'EXAM')
    const materialsSignature = signatures.find(s => s.signatureType === 'MATERIALS')

    // Update quote flags
    await prisma.quotes.update({
      where: { id: quoteId },
      data: {
        examSignatureCompleted: !!examSignature,
        materialsSignatureCompleted: !!materialsSignature,
        examSignedAt: examSignature?.timestamp,
        materialsSignedAt: materialsSignature?.timestamp,
        updatedAt: new Date()
      }
    })
  }
}

export const signatureService = new SignatureService()