import { NextRequest, NextResponse } from 'next/server'
import { PrescriptionDetails, PrescriptionFilters } from '@/types/prescription'

// Mock prescription data
const mockPrescriptions: PrescriptionDetails[] = [
  {
    id: '1',
    customerId: '1',
    customerName: 'John Smith',
    prescribingDoctor: {
      id: 'dr_001',
      name: 'Dr. Sarah Johnson',
      licenseNumber: 'MD123456',
      practice: 'Vision Care Associates',
      phone: '(555) 123-4567',
      email: 'dr.johnson@visioncare.com'
    },
    rightEye: {
      sphere: -2.25,
      cylinder: -0.75,
      axis: 90,
      addition: 1.25
    },
    leftEye: {
      sphere: -2.50,
      cylinder: -0.50,
      axis: 85,
      addition: 1.25
    },
    pd: {
      total: 62,
      monocular: {
        right: 31,
        left: 31
      },
      near: 59
    },
    measurements: {
      segmentHeight: 18,
      fittingHeight: 15,
      pantoscopicTilt: 8,
      faceCurve: 6,
      vertexDistance: 12
    },
    prescriptionDate: '2024-10-15',
    expirationDate: '2026-10-15',
    prescriptionType: 'progressive',
    notes: 'Patient reports difficulty with computer work. Progressive lenses recommended.',
    specialInstructions: [
      'Consider blue light coating for computer use',
      'Ensure proper fitting height for progressive zone'
    ],
    isValid: true,
    validatedBy: 'system',
    validatedAt: '2024-10-15T10:30:00Z',
    createdAt: '2024-10-15T10:30:00Z',
    updatedAt: '2024-10-15T10:30:00Z',
    createdBy: 'dr_001'
  },
  {
    id: '2',
    customerId: '2',
    customerName: 'Emily Davis',
    prescribingDoctor: {
      id: 'dr_002',
      name: 'Dr. Michael Chen',
      licenseNumber: 'OD789012',
      practice: 'Clear Vision Clinic',
      phone: '(555) 987-6543',
      email: 'dr.chen@clearvision.com'
    },
    rightEye: {
      sphere: -1.75,
      cylinder: -0.25,
      axis: 180
    },
    leftEye: {
      sphere: -1.50,
      cylinder: -0.50,
      axis: 175
    },
    pd: {
      total: 58
    },
    measurements: {
      vertexDistance: 12
    },
    prescriptionDate: '2024-09-20',
    expirationDate: '2026-09-20',
    prescriptionType: 'distance',
    notes: 'Young patient, single vision lenses recommended for distance.',
    isValid: true,
    validatedBy: 'dr_002',
    validatedAt: '2024-09-20T14:15:00Z',
    createdAt: '2024-09-20T14:15:00Z',
    updatedAt: '2024-09-20T14:15:00Z',
    createdBy: 'dr_002'
  },
  {
    id: '3',
    customerId: '3',
    customerName: 'Robert Wilson',
    prescribingDoctor: {
      id: 'dr_001',
      name: 'Dr. Sarah Johnson',
      licenseNumber: 'MD123456',
      practice: 'Vision Care Associates',
      phone: '(555) 123-4567',
      email: 'dr.johnson@visioncare.com'
    },
    rightEye: {
      sphere: +1.25,
      addition: 2.50
    },
    leftEye: {
      sphere: +1.50,
      addition: 2.50
    },
    pd: {
      total: 64,
      near: 60
    },
    measurements: {
      segmentHeight: 20,
      fittingHeight: 18
    },
    prescriptionDate: '2024-08-10',
    expirationDate: '2026-08-10',
    prescriptionType: 'bifocal',
    notes: 'Reading glasses with bifocal for close work.',
    specialInstructions: [
      'Patient prefers traditional bifocal lines',
      'Ensure adequate reading area'
    ],
    isValid: true,
    validatedBy: 'system',
    validatedAt: '2024-08-10T09:45:00Z',
    createdAt: '2024-08-10T09:45:00Z',
    updatedAt: '2024-08-10T09:45:00Z',
    createdBy: 'dr_001'
  },
  {
    id: '4',
    customerId: '4',
    customerName: 'Lisa Anderson',
    prescribingDoctor: {
      id: 'dr_003',
      name: 'Dr. Amanda Rodriguez',
      licenseNumber: 'OD345678',
      practice: 'Family Eye Center',
      phone: '(555) 456-7890',
      email: 'dr.rodriguez@familyeye.com'
    },
    rightEye: {
      sphere: -0.75,
      cylinder: -0.25,
      axis: 45
    },
    leftEye: {
      sphere: -1.00,
      cylinder: -0.25,
      axis: 135
    },
    pd: {
      total: 60
    },
    measurements: {
      vertexDistance: 12
    },
    prescriptionDate: '2023-11-30',
    expirationDate: '2025-11-30',
    prescriptionType: 'computer',
    notes: 'Computer vision syndrome. Anti-reflective coating recommended.',
    specialInstructions: [
      'Blue light filtering essential',
      'Slight reduction in distance power for computer use'
    ],
    isValid: false, // Expires soon
    createdAt: '2023-11-30T16:20:00Z',
    updatedAt: '2023-11-30T16:20:00Z',
    createdBy: 'dr_003'
  }
]

// Utility functions
function isExpired(expirationDate: string): boolean {
  return new Date(expirationDate) < new Date()
}

function isExpiringSoon(expirationDate: string, daysThreshold = 90): boolean {
  const expDate = new Date(expirationDate)
  const today = new Date()
  const diffTime = expDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= daysThreshold && diffDays > 0
}

function validatePrescription(prescription: PrescriptionDetails): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check expiration
  if (isExpired(prescription.expirationDate)) {
    errors.push('Prescription has expired')
  }
  
  // Validate sphere values
  if (Math.abs(prescription.rightEye.sphere) > 20) {
    errors.push('Right eye sphere value out of range')
  }
  if (Math.abs(prescription.leftEye.sphere) > 20) {
    errors.push('Left eye sphere value out of range')
  }
  
  // Validate cylinder values
  if (prescription.rightEye.cylinder && Math.abs(prescription.rightEye.cylinder) > 6) {
    errors.push('Right eye cylinder value out of range')
  }
  if (prescription.leftEye.cylinder && Math.abs(prescription.leftEye.cylinder) > 6) {
    errors.push('Left eye cylinder value out of range')
  }
  
  // Validate axis values
  if (prescription.rightEye.axis && (prescription.rightEye.axis < 0 || prescription.rightEye.axis > 180)) {
    errors.push('Right eye axis value out of range (0-180)')
  }
  if (prescription.leftEye.axis && (prescription.leftEye.axis < 0 || prescription.leftEye.axis > 180)) {
    errors.push('Left eye axis value out of range (0-180)')
  }
  
  // Validate PD
  if (prescription.pd.total && (prescription.pd.total < 45 || prescription.pd.total > 80)) {
    errors.push('Total PD value out of range (45-80mm)')
  }
  
  // Check if cylinder is present but axis is missing
  if (prescription.rightEye.cylinder && prescription.rightEye.cylinder !== 0 && !prescription.rightEye.axis) {
    errors.push('Right eye cylinder specified but axis missing')
  }
  if (prescription.leftEye.cylinder && prescription.leftEye.cylinder !== 0 && !prescription.leftEye.axis) {
    errors.push('Left eye cylinder specified but axis missing')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const filters: PrescriptionFilters = {
      doctorId: searchParams.get('doctorId') || undefined,
      prescriptionType: searchParams.get('prescriptionType')?.split(',') || undefined,
      validityStatus: (searchParams.get('validityStatus') as 'valid' | 'expired' | 'expiring_soon') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as 'prescriptionDate' | 'expirationDate' | 'customerName') || 'prescriptionDate',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }
    
    if (filters.dateRange) {
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      if (startDate && endDate) {
        filters.dateRange = { start: startDate, end: endDate }
      }
    }
    
    let filteredPrescriptions = [...mockPrescriptions]
    
    // Apply filters
    if (filters.doctorId) {
      filteredPrescriptions = filteredPrescriptions.filter(p => p.prescribingDoctor.id === filters.doctorId)
    }
    
    if (filters.prescriptionType && filters.prescriptionType.length > 0) {
      filteredPrescriptions = filteredPrescriptions.filter(p => 
        filters.prescriptionType!.includes(p.prescriptionType)
      )
    }
    
    if (filters.validityStatus) {
      filteredPrescriptions = filteredPrescriptions.filter(p => {
        switch (filters.validityStatus) {
          case 'valid':
            return !isExpired(p.expirationDate) && !isExpiringSoon(p.expirationDate)
          case 'expired':
            return isExpired(p.expirationDate)
          case 'expiring_soon':
            return isExpiringSoon(p.expirationDate)
          default:
            return true
        }
      })
    }
    
    if (filters.customerId) {
      filteredPrescriptions = filteredPrescriptions.filter(p => p.customerId === filters.customerId)
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredPrescriptions = filteredPrescriptions.filter(p =>
        p.customerName.toLowerCase().includes(searchLower) ||
        p.prescribingDoctor.name.toLowerCase().includes(searchLower) ||
        p.prescribingDoctor.practice.toLowerCase().includes(searchLower) ||
        p.notes?.toLowerCase().includes(searchLower)
      )
    }
    
    if (filters.dateRange) {
      const { start, end } = filters.dateRange
      filteredPrescriptions = filteredPrescriptions.filter(p => {
        const prescDate = new Date(p.prescriptionDate)
        return prescDate >= new Date(start) && prescDate <= new Date(end)
      })
    }
    
    // Sort prescriptions
    filteredPrescriptions.sort((a, b) => {
      let comparison = 0
      
      switch (filters.sortBy) {
        case 'prescriptionDate':
          comparison = new Date(a.prescriptionDate).getTime() - new Date(b.prescriptionDate).getTime()
          break
        case 'expirationDate':
          comparison = new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
          break
        case 'customerName':
          comparison = a.customerName.localeCompare(b.customerName)
          break
        default:
          comparison = new Date(a.prescriptionDate).getTime() - new Date(b.prescriptionDate).getTime()
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison
    })
    
    // Apply pagination
    const page = Math.max(1, filters.page || 1)
    const limit = Math.max(1, Math.min(filters.limit || 20, 100))
    const skip = (page - 1) * limit
    const paginatedPrescriptions = filteredPrescriptions.slice(skip, skip + limit)
    
    // Add validation status to each prescription
    const prescriptionsWithValidation = paginatedPrescriptions.map(prescription => {
      const validation = validatePrescription(prescription)
      return {
        ...prescription,
        isValid: validation.isValid,
        validationErrors: validation.errors,
        isExpired: isExpired(prescription.expirationDate),
        isExpiringSoon: isExpiringSoon(prescription.expirationDate)
      }
    })
    
    // Calculate stats
    const totalPages = Math.ceil(filteredPrescriptions.length / limit)
    const stats = {
      total: filteredPrescriptions.length,
      valid: filteredPrescriptions.filter(p => !isExpired(p.expirationDate)).length,
      expired: filteredPrescriptions.filter(p => isExpired(p.expirationDate)).length,
      expiringSoon: filteredPrescriptions.filter(p => isExpiringSoon(p.expirationDate)).length,
      byType: filteredPrescriptions.reduce((acc, p) => {
        acc[p.prescriptionType] = (acc[p.prescriptionType] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byDoctor: filteredPrescriptions.reduce((acc, p) => {
        acc[p.prescribingDoctor.name] = (acc[p.prescribingDoctor.name] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
    
    return NextResponse.json({
      success: true,
      data: prescriptionsWithValidation,
      pagination: {
        page,
        limit,
        total: filteredPrescriptions.length,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      stats
    })
  } catch (error) {
    console.error('Prescriptions API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const prescriptionData = await request.json()
    
    // Validate required fields
    const requiredFields = ['customerId', 'customerName', 'prescribingDoctor', 'rightEye', 'leftEye', 'prescriptionDate', 'expirationDate', 'prescriptionType']
    const missingFields = requiredFields.filter(field => !prescriptionData[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 })
    }
    
    // Create new prescription
    const newPrescription: PrescriptionDetails = {
      id: (mockPrescriptions.length + 1).toString(),
      ...prescriptionData,
      isValid: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: prescriptionData.prescribingDoctor.id
    }
    
    // Validate the prescription
    const validation = validatePrescription(newPrescription)
    newPrescription.isValid = validation.isValid
    
    // In a real implementation, this would save to database
    mockPrescriptions.push(newPrescription)
    
    return NextResponse.json({
      success: true,
      data: {
        ...newPrescription,
        validationErrors: validation.errors
      },
      message: validation.isValid 
        ? 'Prescription created successfully' 
        : 'Prescription created with validation warnings'
    })
  } catch (error) {
    console.error('Error creating prescription:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create prescription'
    }, { status: 500 })
  }
}