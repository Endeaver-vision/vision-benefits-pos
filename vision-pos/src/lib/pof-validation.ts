import { z } from 'zod'
import { POF_CONFIG, type POFCondition, type POFFrameInspection } from './patient-owned-frames'

// Validation schemas for POF business rules
export const POFFrameConditionSchema = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR'])

export const POFFrameInspectionSchema = z.object({
  condition: POFFrameConditionSchema,
  description: z.string()
    .min(10, 'Frame description must be at least 10 characters')
    .max(500, 'Frame description cannot exceed 500 characters'),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  inspectedBy: z.string().min(1, 'Inspector ID is required'),
  framePhotos: z.array(z.string().url('Invalid photo URL')).optional(),
  measurements: z.object({
    bridgeWidth: z.number().min(10).max(30).optional(),
    lensWidth: z.number().min(30).max(80).optional(),
    templeLength: z.number().min(120).max(160).optional()
  }).optional()
})

export const POFPrescriptionSchema = z.object({
  sphere: z.number().min(-20).max(20).optional(),
  cylinder: z.number().min(-6).max(6).optional(),
  axis: z.number().min(0).max(180).optional(),
  add: z.number().min(0).max(4).optional(),
  isProgressive: z.boolean().optional(),
  prism: z.object({
    horizontal: z.number().min(0).max(10).optional(),
    vertical: z.number().min(0).max(10).optional()
  }).optional()
})

export const POFWaiverSchema = z.object({
  customerSignature: z.string().min(1, 'Customer signature is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  witnessSignature: z.string().min(1, 'Witness signature is required'),
  witnessName: z.string().min(1, 'Witness name is required'),
  signedAt: z.date(),
  acknowledgments: z.object({
    damageRisk: z.boolean(),
    liabilityRelease: z.boolean(),
    noWarrantyFrames: z.boolean(),
    costResponsibility: z.boolean(),
    conditionAcceptance: z.boolean()
  }),
  customerComments: z.string().max(500).optional()
})

// Business rule validation functions
export interface POFBusinessRule {
  id: string
  name: string
  description: string
  category: 'SAFETY' | 'QUALITY' | 'LIABILITY' | 'BUSINESS'
  severity: 'ERROR' | 'WARNING' | 'INFO'
  validate: (inspection: POFFrameInspection, prescription?: {
    sphere?: number
    cylinder?: number
    axis?: number
    add?: number
    isProgressive?: boolean
    prism?: {
      horizontal?: number
      vertical?: number
    }
  }) => {
    isValid: boolean
    message: string
    recommendation?: string
  }
}

export const POFBusinessRules: POFBusinessRule[] = [
  // Safety Rules
  {
    id: 'FRAME_STRUCTURAL_INTEGRITY',
    name: 'Frame Structural Integrity',
    description: 'Frame must be structurally sound for lens installation',
    category: 'SAFETY',
    severity: 'ERROR',
    validate: (inspection) => {
      const hasCracks = inspection.notes?.toLowerCase().includes('crack') || 
                        inspection.notes?.toLowerCase().includes('broken') ||
                        inspection.description.toLowerCase().includes('crack') ||
                        inspection.description.toLowerCase().includes('broken')
      
      return {
        isValid: !hasCracks,
        message: hasCracks ? 'Frame has structural damage (cracks/breaks)' : 'Frame structure is sound',
        recommendation: hasCracks ? 'Frame replacement recommended for safety' : undefined
      }
    }
  },
  
  {
    id: 'FRAME_CONDITION_ACCEPTABLE',
    name: 'Frame Condition Standards',
    description: 'Frame condition must meet minimum standards',
    category: 'QUALITY',
    severity: 'ERROR',
    validate: (inspection) => {
      const isAcceptable = ['EXCELLENT', 'GOOD', 'FAIR'].includes(inspection.condition)
      
      return {
        isValid: isAcceptable,
        message: isAcceptable ? 
          `Frame condition "${inspection.condition}" is acceptable` : 
          `Frame condition "${inspection.condition}" does not meet standards`,
        recommendation: !isAcceptable ? 'Frame must be in EXCELLENT, GOOD, or FAIR condition' : undefined
      }
    }
  },

  // Prescription Compatibility Rules
  {
    id: 'HIGH_PRESCRIPTION_WARNING',
    name: 'High Prescription Compatibility',
    description: 'Warn for high prescriptions that may affect lens thickness',
    category: 'QUALITY',
    severity: 'WARNING',
    validate: (inspection, prescription) => {
      if (!prescription?.sphere) return { isValid: true, message: 'No prescription data to validate' }
      
      const isHighPrescription = Math.abs(prescription.sphere) > 6.0
      
      return {
        isValid: true, // Warning only
        message: isHighPrescription ? 
          `High prescription detected (${prescription.sphere})` : 
          'Prescription is within normal range',
        recommendation: isHighPrescription ? 
          'Consider frame size limitations for lens thickness' : undefined
      }
    }
  },

  {
    id: 'PROGRESSIVE_LENS_HEIGHT',
    name: 'Progressive Lens Frame Height',
    description: 'Frame height requirements for progressive lenses',
    category: 'QUALITY',
    severity: 'WARNING',
    validate: (inspection, prescription) => {
      if (!prescription?.isProgressive) return { isValid: true, message: 'Not a progressive prescription' }
      
      // Estimate frame height from measurements or notes
      const heightWarnings = inspection.notes?.toLowerCase().includes('small') ||
                            inspection.notes?.toLowerCase().includes('narrow') ||
                            inspection.description.toLowerCase().includes('small')
      
      return {
        isValid: !heightWarnings,
        message: heightWarnings ? 
          'Frame may be too small for progressive lenses' : 
          'Frame appears suitable for progressive lenses',
        recommendation: heightWarnings ? 
          'Verify minimum 28mm frame height for optimal progressive performance' : undefined
      }
    }
  },

  // Business Policy Rules
  {
    id: 'FAIR_CONDITION_APPROVAL',
    name: 'Fair Condition Manager Approval',
    description: 'FAIR condition frames require manager approval',
    category: 'BUSINESS',
    severity: 'WARNING',
    validate: (inspection) => {
      const requiresApproval = inspection.condition === 'FAIR'
      
      return {
        isValid: true, // Business rule, not validation failure
        message: requiresApproval ? 
          'Manager approval required for FAIR condition frames' : 
          'No special approval required',
        recommendation: requiresApproval ? 
          'Obtain manager override before proceeding' : undefined
      }
    }
  },

  {
    id: 'FRAME_VALUE_ASSESSMENT',
    name: 'Frame Value Assessment',
    description: 'Assess if POF fee is reasonable vs frame value',
    category: 'BUSINESS',
    severity: 'INFO',
    validate: (inspection) => {
      // Try to extract brand information for value assessment
      const description = inspection.description.toLowerCase()
      const isDesignerBrand = ['ray-ban', 'oakley', 'versace', 'prada', 'gucci', 'armani']
        .some(brand => description.includes(brand))
      
      const isGenericBrand = ['reading', 'generic', 'drugstore', 'cheap']
        .some(term => description.includes(term))
      
      let message = 'Unable to assess frame value from description'
      let recommendation: string | undefined
      
      if (isDesignerBrand) {
        message = 'Designer brand frame detected - good value for POF service'
      } else if (isGenericBrand) {
        message = 'Lower-value frame detected'
        recommendation = 'Consider if POF fee ($45) provides good value vs frame replacement'
      }
      
      return {
        isValid: true,
        message,
        recommendation
      }
    }
  },

  // Liability Rules
  {
    id: 'DAMAGE_RISK_ASSESSMENT',
    name: 'Frame Damage Risk',
    description: 'Assess risk of frame damage during lens installation',
    category: 'LIABILITY',
    severity: 'WARNING',
    validate: (inspection) => {
      const riskFactors = []
      const notes = inspection.notes?.toLowerCase() || ''
      const description = inspection.description.toLowerCase()
      
      if (inspection.condition === 'FAIR') riskFactors.push('frame condition is fair')
      if (notes.includes('loose') || notes.includes('wobbly')) riskFactors.push('loose joints detected')
      if (notes.includes('bent') || notes.includes('warped')) riskFactors.push('frame alignment issues')
      if (description.includes('old') || notes.includes('old')) riskFactors.push('frame age may increase brittleness')
      
      const hasRiskFactors = riskFactors.length > 0
      
      return {
        isValid: true, // Risk assessment, not validation failure
        message: hasRiskFactors ? 
          `Damage risk factors: ${riskFactors.join(', ')}` : 
          'Low risk of damage during lens installation',
        recommendation: hasRiskFactors ? 
          'Ensure customer acknowledges increased damage risk in waiver' : undefined
      }
    }
  }
]

/**
 * Run all POF business rules validation
 */
export function validatePOFBusinessRules(
  inspection: POFFrameInspection,
  prescription?: {
    sphere?: number
    cylinder?: number
    axis?: number
    add?: number
    isProgressive?: boolean
    prism?: {
      horizontal?: number
      vertical?: number
    }
  }
): {
  errors: POFBusinessRule[]
  warnings: POFBusinessRule[]
  info: POFBusinessRule[]
  allPassed: boolean
  summary: string
} {
  const results = POFBusinessRules.map(rule => ({
    rule,
    result: rule.validate(inspection, prescription)
  }))

  const errors = results.filter(r => r.rule.severity === 'ERROR' && !r.result.isValid)
  const warnings = results.filter(r => r.rule.severity === 'WARNING' && !r.result.isValid)
  const info = results.filter(r => r.rule.severity === 'INFO')

  const allPassed = errors.length === 0
  
  const summary = allPassed ? 
    `POF validation passed. ${warnings.length} warnings, ${info.length} notes.` :
    `POF validation failed. ${errors.length} errors must be resolved.`

  return {
    errors: errors.map(r => r.rule),
    warnings: warnings.map(r => r.rule),
    info: info.map(r => r.rule),
    allPassed,
    summary
  }
}

/**
 * Get detailed validation report
 */
export function getPOFValidationReport(
  inspection: POFFrameInspection,
  prescription?: {
    sphere?: number
    cylinder?: number
    axis?: number
    add?: number
    isProgressive?: boolean
    prism?: {
      horizontal?: number
      vertical?: number
    }
  }
): {
  ruleId: string
  name: string
  category: string
  severity: string
  result: {
    isValid: boolean
    message: string
    recommendation?: string
  }
}[] {
  return POFBusinessRules.map(rule => ({
    ruleId: rule.id,
    name: rule.name,
    category: rule.category,
    severity: rule.severity,
    result: rule.validate(inspection, prescription)
  }))
}

/**
 * Check if POF is recommended based on frame value and condition
 */
export function isPOFRecommended(
  inspection: POFFrameInspection,
  estimatedFrameValue?: number
): {
  isRecommended: boolean
  reason: string
  alternatives?: string[]
} {
  const fixedFee = POF_CONFIG.FIXED_FEE

  // Not recommended if frame is in poor condition
  if (inspection.condition === 'POOR') {
    return {
      isRecommended: false,
      reason: 'Frame condition is too poor for safe lens installation',
      alternatives: ['Frame replacement', 'Frame repair before POF service']
    }
  }

  // Not recommended if estimated value is very low
  if (estimatedFrameValue && estimatedFrameValue < fixedFee) {
    return {
      isRecommended: false,
      reason: `Frame value ($${estimatedFrameValue}) is less than POF fee ($${fixedFee})`,
      alternatives: ['New frame purchase', 'Budget frame options']
    }
  }

  // Conditionally recommended for fair condition
  if (inspection.condition === 'FAIR') {
    return {
      isRecommended: true,
      reason: 'POF service is possible but requires careful handling and manager approval',
      alternatives: ['Frame replacement for better long-term value']
    }
  }

  // Recommended for good/excellent condition
  return {
    isRecommended: true,
    reason: `Frame is in ${inspection.condition.toLowerCase()} condition and suitable for POF service`
  }
}

const pofValidationUtils = {
  POFBusinessRules,
  validatePOFBusinessRules,
  getPOFValidationReport,
  isPOFRecommended,
  POFFrameConditionSchema,
  POFFrameInspectionSchema,
  POFPrescriptionSchema,
  POFWaiverSchema
}

export default pofValidationUtils