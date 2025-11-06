import { prisma } from './prisma'

// POF Configuration Constants
export const POF_CONFIG = {
  FIXED_FEE: 45.00, // $45 fixed fee for patient-owned frames
  ALLOWED_CONDITIONS: ['EXCELLENT', 'GOOD', 'FAIR'] as const, // POOR frames are rejected
  INSPECTION_REQUIRED: true,
  WAIVER_REQUIRED: true,
  MIN_FRAME_AGE: 0, // No minimum age restriction
  MAX_FRAME_AGE: null, // No maximum age restriction
} as const

export type POFCondition = typeof POF_CONFIG.ALLOWED_CONDITIONS[number] | 'POOR'
export type POFIncidentType = 'FRAME_DAMAGE' | 'FITTING_ISSUE' | 'LENS_INCOMPATIBILITY' | 'LIABILITY_CLAIM' | 'OTHER'
export type POFIncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type POFIncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED'

export interface POFFrameInspection {
  condition: POFCondition
  description: string
  notes?: string
  inspectedBy: string
  inspectedAt: Date
  framePhotos?: string[] // URLs to photos
  measurements?: {
    bridgeWidth?: number
    lensWidth?: number
    templeLength?: number
  }
}

export interface POFValidationResult {
  isValid: boolean
  condition: POFCondition
  issues: string[]
  warnings: string[]
  recommendations: string[]
  canProceed: boolean
  requiresManagerApproval: boolean
}

export interface POFPricingBreakdown {
  frameCharge: number // Always 0 for POF
  fixedFee: number // $45 POF fee
  lensCharges: number
  laborCharges: number
  addOnCharges: number
  subtotal: number
  tax: number
  total: number
  savings: number // Amount saved vs. purchasing new frame
}

/**
 * Validate if a patient-owned frame can be accepted
 */
export function validatePatientOwnedFrame(
  inspection: POFFrameInspection,
  prescriptionData?: {
    sphere?: number
    cylinder?: number
    axis?: number
    add?: number
    isProgressive?: boolean
  }
): POFValidationResult {
  const issues: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []

  // Check frame condition - POOR frames are automatically rejected
  if (inspection.condition === 'POOR') {
    issues.push(`Frame condition "${inspection.condition}" is not acceptable for lens installation`)
  }

  // Frame condition specific validations
  switch (inspection.condition) {
    case 'POOR':
      issues.push('Frame is in poor condition and cannot be used for lens installation')
      issues.push('Risk of frame damage during lens installation is too high')
      break
    
    case 'FAIR':
      warnings.push('Frame condition is fair - increased risk of damage during lens installation')
      warnings.push('Customer should be informed of potential frame replacement costs')
      recommendations.push('Consider recommending frame replacement for better long-term value')
      break
    
    case 'GOOD':
      warnings.push('Frame shows some wear but should be suitable for lens installation')
      break
    
    case 'EXCELLENT':
      // No warnings for excellent frames
      break
  }

  // Check for specific frame issues
  if (inspection.notes) {
    const notes = inspection.notes.toLowerCase()
    
    if (notes.includes('crack') || notes.includes('broken')) {
      issues.push('Frame has structural damage that prevents safe lens installation')
    }
    
    if (notes.includes('bent') || notes.includes('warped')) {
      warnings.push('Frame alignment issues may affect lens installation')
      recommendations.push('Frame adjustment required before lens installation')
    }
    
    if (notes.includes('loose') || notes.includes('wobbly')) {
      warnings.push('Frame joints are loose and may need tightening')
      recommendations.push('Frame repair recommended before lens installation')
    }
  }

  // Prescription compatibility checks
  if (prescriptionData) {
    // High prescription warnings
    if (prescriptionData.sphere && Math.abs(prescriptionData.sphere) > 6.0) {
      warnings.push('High prescription may result in thick lenses - consider frame size limitations')
    }
    
    // Progressive lens compatibility
    if (prescriptionData.isProgressive) {
      warnings.push('Progressive lenses require specific frame measurements for optimal performance')
      recommendations.push('Verify frame height meets progressive lens requirements (minimum 28mm)')
    }
  }

  const canProceed = issues.length === 0
  const requiresManagerApproval = warnings.length > 2 || inspection.condition === 'FAIR'

  return {
    isValid: canProceed,
    condition: inspection.condition,
    issues,
    warnings,
    recommendations,
    canProceed,
    requiresManagerApproval
  }
}

/**
 * Calculate pricing for patient-owned frame quote
 */
export function calculatePOFPricing(
  lensCharges: number,
  laborCharges: number = 0,
  addOnCharges: number = 0,
  taxRate: number = 0.08625, // Default tax rate
  newFramePrice?: number // For savings calculation
): POFPricingBreakdown {
  const frameCharge = 0 // No frame charge for POF
  const fixedFee = POF_CONFIG.FIXED_FEE
  
  const subtotal = frameCharge + fixedFee + lensCharges + laborCharges + addOnCharges
  const tax = subtotal * taxRate
  const total = subtotal + tax
  
  // Calculate savings vs. purchasing new frame
  const savings = newFramePrice ? newFramePrice : 0

  return {
    frameCharge,
    fixedFee,
    lensCharges,
    laborCharges,
    addOnCharges,
    subtotal,
    tax,
    total,
    savings
  }
}

/**
 * Create POF incident record
 */
export async function createPOFIncident(data: {
  quoteId: string
  customerId: string
  userId: string
  locationId: string
  incidentType: POFIncidentType
  severity: POFIncidentSeverity
  title: string
  description: string
  frameDescription?: string
  frameCondition?: string
  financialImpact?: number
  photosAttached?: boolean
  customerNotified?: boolean
}) {
  return await prisma.pofIncidents.create({
    data: {
      id: crypto.randomUUID(),
      quoteId: data.quoteId,
      customerId: data.customerId,
      userId: data.userId,
      locationId: data.locationId,
      incidentType: data.incidentType,
      severity: data.severity,
      title: data.title,
      description: data.description,
      frameDescription: data.frameDescription,
      frameCondition: data.frameCondition,
      financialImpact: data.financialImpact || 0,
      refundIssued: 0,
      photosAttached: data.photosAttached || false,
      customerNotified: data.customerNotified || false,
      insuranceNotified: false,
      status: 'OPEN',
      updatedAt: new Date(),
    }
  })
}

/**
 * Update POF incident status and resolution
 */
export async function updatePOFIncident(
  incidentId: string,
  updates: {
    status?: POFIncidentStatus
    resolution?: string
    resolvedBy?: string
    financialImpact?: number
    refundIssued?: number
    customerNotified?: boolean
    insuranceNotified?: boolean
  }
) {
  const updateData: Partial<{
    status?: POFIncidentStatus
    resolution?: string
    resolvedBy?: string
    financialImpact?: number
    refundIssued?: number
    customerNotified?: boolean
    insuranceNotified?: boolean
    updatedAt: Date
    resolvedAt?: Date
  }> = {
    ...updates,
    updatedAt: new Date(),
  }

  if (updates.status === 'RESOLVED' && updates.resolvedBy) {
    updateData.resolvedAt = new Date()
  }

  return await prisma.pofIncidents.update({
    where: { id: incidentId },
    data: updateData
  })
}

/**
 * Get POF incidents for a quote
 */
export async function getPOFIncidents(quoteId: string) {
  return await prisma.pofIncidents.findMany({
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
}

/**
 * Get POF statistics for analytics
 */
export async function getPOFStats(
  locationId?: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: {
    isPatientOwnedFrame?: boolean
    locationId?: string
    createdAt?: {
      gte?: Date
      lte?: Date
    }
    status?: string
  } = {
    isPatientOwnedFrame: true
  }
  
  if (locationId) where.locationId = locationId
  if (startDate && endDate) {
    where.createdAt = {
      gte: startDate,
      lte: endDate
    }
  }

  const [
    totalPOFQuotes,
    completedPOFQuotes,
    totalIncidents,
    activeIncidents,
    totalRevenue,
    averageRevenue
  ] = await Promise.all([
    prisma.quotes.count({ where }),
    prisma.quotes.count({ where: { ...where, status: 'COMPLETED' } }),
    prisma.pofIncidents.count({ where: locationId ? { locationId } : {} }),
    prisma.pofIncidents.count({ 
      where: { 
        ...(locationId && { locationId }),
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      }
    }),
    prisma.quotes.aggregate({
      where: { ...where, status: 'COMPLETED' },
      _sum: { total: true }
    }),
    prisma.quotes.aggregate({
      where: { ...where, status: 'COMPLETED' },
      _avg: { total: true }
    })
  ])

  return {
    totalPOFQuotes,
    completedPOFQuotes,
    totalIncidents,
    activeIncidents,
    totalRevenue: totalRevenue._sum.total || 0,
    averageRevenue: averageRevenue._avg.total || 0,
    incidentRate: totalPOFQuotes > 0 ? (totalIncidents / totalPOFQuotes) * 100 : 0
  }
}

const patientOwnedFrameUtils = {
  POF_CONFIG,
  validatePatientOwnedFrame,
  calculatePOFPricing,
  createPOFIncident,
  updatePOFIncident,
  getPOFIncidents,
  getPOFStats
}

export default patientOwnedFrameUtils