'use client'

import { useState } from 'react'
import { POFDetailsForm, POFFrameDetails } from './pof-details-form'
import { POFWarningModal } from './pof-warning-modal'
import { POFSignatureInterface } from './pof-signature-interface'
import { POFIncidentReport } from './pof-incident-report'

interface POFWorkflowProps {
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

type WorkflowStep = 'details' | 'warning' | 'signature' | 'incident' | 'complete'

export function POFWorkflow({
  quoteId,
  customerId,
  customerName,
  staffName,
  isManager,
  onComplete,
  onCancel
}: POFWorkflowProps) {
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

  const handleFrameDetailsNext = () => {
    // Validate frame condition and show appropriate next step
    if (frameDetails.frameCondition === 'POOR') {
      // Poor condition frames need manager review
      setShowIncidentReport(true)
    } else {
      setShowWarningModal(true)
    }
  }

  const handleStaffConfirm = () => {
    // Staff has confirmed POF protocol understanding
    console.log('Staff confirmed POF protocol')
  }

  const handlePatientAccept = async () => {
    // Patient has accepted liability waiver
    setShowWarningModal(false)
    setCurrentStep('signature')
    
    // Apply POF fee to quote
    try {
      await fetch('/api/quotes/patient-frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'set_patient_frame',
          quoteId,
          frameDetails,
          pofFixedFee: 45.00
        }),
      })
    } catch (error) {
      console.error('Error applying POF settings:', error)
    }
  }

  const handleSignatureComplete = (signature: any) => {
    setSignatureData(signature)
    setCurrentStep('complete')
    
    // Complete POF setup
    onComplete({
      frameDetails,
      signatureData: signature,
      pofFeeApplied: true
    })
  }

  const handleIncidentSubmit = (incidentData: any) => {
    setShowIncidentReport(false)
    // After incident report, still allow continuation if manager approves
    setShowWarningModal(true)
  }

  const handleCancel = () => {
    setShowWarningModal(false)
    setShowIncidentReport(false)
    onCancel()
  }

  return (
    <div className="space-y-6">
      {/* Frame Details Form */}
      {currentStep === 'details' && (
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
          frameDetails={frameDetails}
          onSubmit={handleIncidentSubmit}
          onCancel={() => setShowIncidentReport(false)}
          isManager={isManager}
        />
      )}
    </div>
  )
}