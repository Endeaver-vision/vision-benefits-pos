import { NextRequest, NextResponse } from 'next/server'
import { PrescriptionDetails } from '@/types/prescription'

function validatePrescription(prescription: PrescriptionDetails): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check expiration
  if (new Date(prescription.expirationDate) < new Date()) {
    errors.push('Prescription has expired')
  }
  
  // Validate sphere values
  if (Math.abs(prescription.rightEye.sphere) > 20) {
    errors.push('Right eye sphere value out of range')
  }
  if (Math.abs(prescription.leftEye.sphere) > 20) {
    errors.push('Left eye sphere value out of range')
  }
  
  // Additional validations...
  return {
    isValid: errors.length === 0,
    errors
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // In a real implementation, this would query the database
    // For now, return a mock prescription
    const prescription: PrescriptionDetails = {
      id,
      customerId: '1',
      customerName: 'Sample Customer',
      prescribingDoctor: {
        id: 'dr_001',
        name: 'Dr. Sample Doctor',
        licenseNumber: 'MD123456',
        practice: 'Sample Practice',
        phone: '(555) 123-4567',
        email: 'doctor@sample.com'
      },
      rightEye: {
        sphere: -2.25,
        cylinder: -0.75,
        axis: 90
      },
      leftEye: {
        sphere: -2.50,
        cylinder: -0.50,
        axis: 85
      },
      pd: {
        total: 62
      },
      measurements: {},
      prescriptionDate: '2024-10-15',
      expirationDate: '2026-10-15',
      prescriptionType: 'distance',
      isValid: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'dr_001'
    }
    
    const validation = validatePrescription(prescription)
    
    return NextResponse.json({
      success: true,
      data: {
        ...prescription,
        validationErrors: validation.errors
      }
    })
  } catch (error) {
    console.error('Error fetching prescription:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch prescription'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const updateData = await request.json()
    
    // In a real implementation, this would update the database
    const updatedPrescription: PrescriptionDetails = {
      ...updateData,
      id,
      updatedAt: new Date().toISOString()
    }
    
    const validation = validatePrescription(updatedPrescription)
    updatedPrescription.isValid = validation.isValid
    
    return NextResponse.json({
      success: true,
      data: {
        ...updatedPrescription,
        validationErrors: validation.errors
      },
      message: 'Prescription updated successfully'
    })
  } catch (error) {
    console.error('Error updating prescription:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update prescription'
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    // In a real implementation, this would delete from database
    // For now, just return success
    
    return NextResponse.json({
      success: true,
      message: 'Prescription deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting prescription:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete prescription'
    }, { status: 500 })
  }
}