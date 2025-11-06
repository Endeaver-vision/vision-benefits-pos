'use client'

import { useState } from 'react'
import { POFDetailsForm, POFFrameDetails } from './pof-details-form'
import { POFWarningModal } from './pof-warning-modal'
import { POFSignatureInterface } from './pof-signature-interface'
import { POFIncidentReport } from './pof-incident-report'
import { useNotifications } from '@/components/ui/notification-system'
import { useAsyncOperation, AsyncOperationDisplay } from '@/components/ui/loading-states'

interface POFWorkflowEnhancedProps {
  quoteId: string
  customerId: string
  customerName: string
  staffName: string
  isManager: boolean
  onComplete: (pofData: {
    frameDetails: POFFrameDetails
    signatureData: any
    pofFeeApplied: boolean
  }) => void
  onCancel: () => void
}

type WorkflowStep = 'details' | 'validation' | 'warning' | 'signature' | 'incident' | 'complete'

export function POFWorkflowEnhanced({
  quoteId,
  customerId,
  customerName,
  staffName,
  isManager,
  onComplete,
  onCancel
}: POFWorkflowEnhancedProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('details')
  const [frameDetails, setFrameDetails] = useState<POFFrameDetails>({
    brand: '',
    model: '',
    color: '',
    estimatedValue: 0,
    frameCondition: '',
    description: '',
    photos: [],
    inspectionNotes: ''
  })
  const [signatureData, setSignatureData] = useState<any>(null)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [showIncidentReport, setShowIncidentReport] = useState(false)
  const [validationResults, setValidationResults] = useState<any>(null)

  // Enhanced state management
  const { showSuccess, showError, showWarning, showLoading, dismissNotification } = useNotifications()
  const { 
    operation, 
    startOperation, 
    updateProgress, 
    completeOperation, 
    failOperation, 
    resetOperation 
  } = useAsyncOperation()

  const handleFrameDetailsNext = async () => {
    // Start validation process
    startOperation('Validating Frame', 'Checking frame condition and business rules...')
    
    try {
      updateProgress(25, 'Performing frame inspection validation...')
      
      // Validate frame details with backend
      const response = await fetch('/api/quotes/patient-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate_frame',
          quoteId,
          frameCondition: frameDetails.frameCondition,
          frameDescription: frameDetails.description,
          frameValue: frameDetails.estimatedValue,
          patientAge: 35, // Mock data - would come from customer
          prescriptionType: 'SINGLE_VISION' // Mock data
        })
      })
      
      updateProgress(50, 'Checking business rules compliance...')
      
      if (!response.ok) {
        throw new Error('Frame validation failed')
      }
      
      const result = await response.json()
      setValidationResults(result)
      
      updateProgress(75, 'Reviewing validation results...')
      
      // Check validation results
      if (result.validation && !result.validation.isRecommended) {
        updateProgress(100, 'Frame flagged for manager review')
        
        showWarning(
          'Frame Quality Concern',
          `Frame condition (${frameDetails.frameCondition}) requires manager review. An incident report may be needed.`,
          10000
        )
        
        // Poor condition frames need manager review
        if (frameDetails.frameCondition === 'POOR') {
          setCurrentStep('incident')
          setShowIncidentReport(true)
        } else {
          completeOperation('Validation Complete', 'Frame validated with warnings. Proceed with caution.')
          setTimeout(() => {
            resetOperation()
            setShowWarningModal(true)
          }, 2000)
        }
      } else {
        completeOperation('Frame Validated', 'Frame passed all business rules and quality checks.')
        
        showSuccess(
          'Frame Validation Passed',
          'Frame meets all quality standards. Proceeding to liability waiver.',
          3000
        )
        
        setTimeout(() => {
          resetOperation()
          setShowWarningModal(true)
        }, 2000)
      }
      
    } catch (error) {
      failOperation(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'Frame Validation Failed'
      )
      
      showError(
        'Validation Error',
        'Unable to validate frame. Please check your connection and try again.',
        0
      )
    }
  }

  const handleStaffConfirm = () => {
    showSuccess(
      'Staff Protocol Confirmed',
      'POF procedures acknowledged. Proceeding to patient waiver.',
      3000
    )
  }

  const handlePatientAccept = async () => {
    setShowWarningModal(false)
    
    const loadingId = showLoading(
      'Applying POF Settings',
      'Setting up patient-owned frame configuration...'
    )
    
    try {
      // Apply POF fee to quote
      const response = await fetch('/api/quotes/patient-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_patient_frame',
          quoteId,
          frameDetails,
          pofFixedFee: 45.00,
          waiverAccepted: true,
          staffWitness: staffName
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to apply POF settings')
      }
      
      dismissNotification(loadingId)
      
      showSuccess(
        'POF Settings Applied',
        '$45 service fee added to quote. Proceeding to digital signature.',
        3000
      )
      
      setCurrentStep('signature')
      
    } catch (error) {
      dismissNotification(loadingId)
      
      showError(
        'POF Setup Failed',
        'Unable to apply POF settings. Please try again.',
        0
      )
    }
  }

  const handleSignatureComplete = async (signature: any) => {
    const loadingId = showLoading(
      'Finalizing POF Setup',
      'Saving signature and completing POF workflow...'
    )
    
    try {
      // Save signature data
      const response = await fetch('/api/quotes/patient-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_pof_setup',
          quoteId,
          signatureData: signature,
          frameDetails,
          staffWitness: staffName
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save signature')
      }
      
      dismissNotification(loadingId)
      setSignatureData(signature)
      setCurrentStep('complete')
      
      showSuccess(
        'POF Setup Complete!',
        'Patient-owned frame workflow completed successfully. Returning to quote builder.',
        5000
      )
      
      // Complete POF setup
      setTimeout(() => {
        onComplete({
          frameDetails,
          signatureData: signature,
          pofFeeApplied: true
        })
      }, 2000)
      
    } catch (error) {
      dismissNotification(loadingId)
      
      showError(
        'Signature Save Failed',
        'Unable to save signature. Please try again.',
        0
      )
    }
  }

  const handleIncidentSubmit = async (incidentData: any) => {
    const loadingId = showLoading(
      'Creating Incident Report',
      'Documenting frame condition concerns...'
    )
    
    try {
      const response = await fetch('/api/quotes/patient-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_incident',
          ...incidentData
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create incident report')
      }
      
      dismissNotification(loadingId)
      setShowIncidentReport(false)
      
      showSuccess(
        'Incident Report Created',
        'Frame concerns documented. Manager review completed. Continuing with POF workflow.',
        5000
      )
      
      // After incident report, still allow continuation if manager approves
      setTimeout(() => {
        setShowWarningModal(true)
      }, 1000)
      
    } catch (error) {
      dismissNotification(loadingId)
      
      showError(
        'Incident Report Failed',
        'Unable to create incident report. Please try again.',
        0
      )
    }
  }

  const handleCancel = () => {
    resetOperation()
    setShowWarningModal(false)
    setShowIncidentReport(false)
    
    showWarning(
      'POF Workflow Cancelled',
      'Returning to frame selection. No changes have been saved.',
      3000
    )
    
    onCancel()
  }

  const handleRetry = () => {
    resetOperation()
    setCurrentStep('details')
  }

  return (
    <div className="space-y-6">
      {/* Async Operation Display */}
      {!operation.isIdle && (
        <AsyncOperationDisplay
          operation={operation}
          onRetry={operation.state === 'error' ? handleRetry : undefined}
          onCancel={operation.state === 'error' ? handleCancel : undefined}
        />
      )}

      {/* Frame Details Form */}
      {currentStep === 'details' && operation.isIdle && (
        <POFDetailsForm
          frameDetails={frameDetails}
          onFrameDetailsChange={setFrameDetails}
          onNext={handleFrameDetailsNext}
          onCancel={handleCancel}
        />
      )}

      {/* Digital Signature Interface */}
      {currentStep === 'signature' && (
        <POFSignatureInterface
          patientName={customerName}
          staffName={staffName}
          onSignatureComplete={handleSignatureComplete}
          onCancel={handleCancel}
        />
      )}

      {/* Warning Modal */}
      <POFWarningModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        onStaffConfirm={handleStaffConfirm}
        onPatientAccept={handlePatientAccept}
        patientName={customerName}
      />

      {/* Incident Report (Manager Only) */}
      {showIncidentReport && (
        <POFIncidentReport
          quoteId={quoteId}
          customerId={customerId}
          customerName={customerName}
          frameDetails={{
            brand: frameDetails.brand,
            model: frameDetails.model,
            condition: frameDetails.frameCondition,
            description: frameDetails.description
          }}
          onSubmit={handleIncidentSubmit}
          onCancel={() => setShowIncidentReport(false)}
          isManager={isManager}
        />
      )}
    </div>
  )
}