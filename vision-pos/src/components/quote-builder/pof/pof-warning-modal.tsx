'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  AlertTriangle,
  Shield,
  FileWarning,
  CheckCircle,
  UserCheck
} from 'lucide-react'

interface POFWarningModalProps {
  isOpen: boolean
  onClose: () => void
  onStaffConfirm: () => void
  onPatientAccept: () => void
  patientName: string
}

export function POFWarningModal({ 
  isOpen, 
  onClose, 
  onStaffConfirm, 
  onPatientAccept, 
  patientName 
}: POFWarningModalProps) {
  const [step, setStep] = useState<'staff' | 'patient'>('staff')
  const [staffAcknowledged, setStaffAcknowledged] = useState(false)
  const [patientAcknowledged, setPatientAcknowledged] = useState(false)

  const handleStaffNext = () => {
    if (staffAcknowledged) {
      onStaffConfirm()
      setStep('patient')
    }
  }

  const handlePatientAccept = () => {
    if (patientAcknowledged) {
      onPatientAccept()
      onClose()
    }
  }

  const handleCancel = () => {
    setStep('staff')
    setStaffAcknowledged(false)
    setPatientAcknowledged(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl">
        
        {/* Staff Warning Step */}
        {step === 'staff' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-6 w-6" />
                Staff Alert: Patient-Owned Frame Protocol
              </DialogTitle>
              <DialogDescription>
                Important liability and quality assurance procedures must be followed.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert variant="destructive">
                <FileWarning className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">REQUIRED STAFF ACTIONS:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Complete thorough frame inspection and condition assessment</li>
                      <li>Document all visible damage, wear, or structural concerns</li>
                      <li>Take photographs for liability documentation</li>
                      <li>Verify frame compatibility with prescribed lenses</li>
                      <li>Obtain patient signature on liability waiver</li>
                      <li>Apply $45.00 POF service fee to quote</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">LIABILITY CONSIDERATIONS:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Patient assumes all risk for frame damage during lens installation</li>
                      <li>No warranty coverage for patient-provided frames</li>
                      <li>Frame replacement costs are patient responsibility</li>
                      <li>Quality of fit may be limited by frame condition</li>
                      <li>Adjustments may be restricted based on frame material/age</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="staff-acknowledge"
                  checked={staffAcknowledged}
                  onCheckedChange={setStaffAcknowledged}
                />
                <Label
                  htmlFor="staff-acknowledge"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I acknowledge that I have read and understand the POF protocol requirements and will complete all necessary documentation.
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancel POF Process
              </Button>
              <Button 
                onClick={handleStaffNext}
                disabled={!staffAcknowledged}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Proceed to Patient Waiver
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Patient Liability Waiver Step */}
        {step === 'patient' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-600">
                <Shield className="h-6 w-6" />
                Patient Liability Waiver
              </DialogTitle>
              <DialogDescription>
                {patientName}, please read and acknowledge the following terms for using your own frame.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-semibold text-lg">PATIENT-OWNED FRAME LIABILITY WAIVER</p>
                    
                    <div className="space-y-2">
                      <p className="font-medium">By proceeding with patient-owned frame service, I understand and agree to the following:</p>
                      
                      <div className="space-y-2 text-sm">
                        <p><strong>1. FRAME CONDITION ACCEPTANCE:</strong> I acknowledge that my frame has been inspected and its condition documented. I accept full responsibility for any pre-existing damage, wear, or structural limitations.</p>
                        
                        <p><strong>2. INSTALLATION RISKS:</strong> I understand that lens installation into my frame carries risks including but not limited to frame breakage, cracking, warping, or other damage that may occur during the manufacturing process.</p>
                        
                        <p><strong>3. NO WARRANTY:</strong> I understand that no warranty or guarantee is provided for my frame. The practice warranties only the lenses and lens installation work, not the frame itself.</p>
                        
                        <p><strong>4. REPLACEMENT RESPONSIBILITY:</strong> If my frame is damaged during the lens installation process, I am solely responsible for frame replacement costs. The practice is not liable for frame repair or replacement.</p>
                        
                        <p><strong>5. FITTING LIMITATIONS:</strong> I understand that adjustments and fitting options may be limited based on my frame&apos;s material, age, and condition. Optimal fit cannot be guaranteed.</p>
                        
                        <p><strong>6. SERVICE FEE:</strong> I agree to pay the $45.00 patient-owned frame service fee, which covers inspection, lens installation, and basic adjustments.</p>
                        
                        <p><strong>7. QUALITY CONSIDERATIONS:</strong> I understand that the final product quality may be affected by my frame&apos;s condition and that results may differ from those achieved with new frames.</p>
                        
                        <p><strong>8. PROFESSIONAL RECOMMENDATION:</strong> I acknowledge that the practice may recommend against using my frame if significant risks are identified, and I may choose to proceed against professional advice.</p>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="patient-acknowledge"
                  checked={patientAcknowledged}
                  onCheckedChange={setPatientAcknowledged}
                />
                <Label
                  htmlFor="patient-acknowledge"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I have read, understood, and agree to all terms of this liability waiver. I accept full responsibility for my frame and any associated risks.
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancel and Use Store Frame
              </Button>
              <Button 
                onClick={handlePatientAccept}
                disabled={!patientAcknowledged}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept and Continue
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}