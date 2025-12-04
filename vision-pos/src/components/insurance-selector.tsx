'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Shield, Calendar, CreditCard, Check, X } from 'lucide-react'

export interface InsuranceData {
  carrier: string
  memberId: string
  groupNumber?: string
  eligibilityDate?: string
  copayExam?: number
  copayMaterials?: number
  allowanceFrames?: number
  allowanceLenses?: number
  allowanceContacts?: number
  frequencyExam?: string
  frequencyMaterials?: string
  frequencyContacts?: string
}

interface InsuranceSelectorProps {
  value?: InsuranceData | null
  onChange: (data: InsuranceData | null) => void
  showDetails?: boolean
  compact?: boolean
}

const INSURANCE_CARRIERS = [
  { value: 'VSP', label: 'VSP Vision Care', color: 'bg-blue-500' },
  { value: 'EyeMed', label: 'EyeMed Vision Care', color: 'bg-green-500' },
  { value: 'Spectera', label: 'Spectera', color: 'bg-purple-500' },
  { value: 'Medicare', label: 'Medicare', color: 'bg-red-500' },
  { value: 'Medicaid', label: 'Medicaid', color: 'bg-orange-500' },
  { value: 'Private', label: 'Private Insurance', color: 'bg-gray-500' },
  { value: 'None', label: 'No Insurance / Cash Pay', color: 'bg-slate-500' }
]

const FREQUENCY_OPTIONS = [
  { value: '12', label: 'Every 12 months' },
  { value: '24', label: 'Every 24 months' },
  { value: '36', label: 'Every 36 months' }
]

export default function InsuranceSelector({ 
  value, 
  onChange, 
  showDetails = true,
  compact = false 
}: InsuranceSelectorProps) {
  const [hasInsurance, setHasInsurance] = useState(!!value?.carrier && value.carrier !== 'None')
  const [insuranceData, setInsuranceData] = useState<InsuranceData>(
    value || {
      carrier: '',
      memberId: '',
      groupNumber: '',
      eligibilityDate: '',
      frequencyExam: '12',
      frequencyMaterials: '24',
      frequencyContacts: '12'
    }
  )

  useEffect(() => {
    if (value) {
      setInsuranceData(value)
      setHasInsurance(!!value.carrier && value.carrier !== 'None')
    }
  }, [value])

  const handleToggleInsurance = (enabled: boolean) => {
    setHasInsurance(enabled)
    if (!enabled) {
      const noInsuranceData: InsuranceData = {
        carrier: 'None',
        memberId: '',
        groupNumber: ''
      }
      setInsuranceData(noInsuranceData)
      onChange(noInsuranceData)
    } else {
      const resetData: InsuranceData = {
        carrier: '',
        memberId: '',
        groupNumber: '',
        eligibilityDate: '',
        frequencyExam: '12',
        frequencyMaterials: '24',
        frequencyContacts: '12'
      }
      setInsuranceData(resetData)
      onChange(null)
    }
  }

  const handleUpdate = (field: keyof InsuranceData, fieldValue: string | number) => {
    const updated = { ...insuranceData, [field]: fieldValue }
    setInsuranceData(updated)
    onChange(updated)
  }

  const selectedCarrier = INSURANCE_CARRIERS.find(c => c.value === insuranceData.carrier)

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Quick Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Insurance Coverage</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={hasInsurance ? "default" : "outline"}
              onClick={() => handleToggleInsurance(true)}
            >
              <Check className="h-3 w-3 mr-1" />
              Yes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!hasInsurance ? "default" : "outline"}
              onClick={() => handleToggleInsurance(false)}
            >
              <X className="h-3 w-3 mr-1" />
              No
            </Button>
          </div>
        </div>

        {hasInsurance && (
          <>
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier *</Label>
              <Select 
                value={insuranceData.carrier} 
                onValueChange={(val) => handleUpdate('carrier', val)}
              >
                <SelectTrigger id="carrier">
                  <SelectValue placeholder="Select carrier..." />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_CARRIERS.filter(c => c.value !== 'None').map(carrier => (
                    <SelectItem key={carrier.value} value={carrier.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${carrier.color}`} />
                        {carrier.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="memberId">Member ID *</Label>
                <Input
                  id="memberId"
                  placeholder="12345678"
                  value={insuranceData.memberId}
                  onChange={(e) => handleUpdate('memberId', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupNumber">Group #</Label>
                <Input
                  id="groupNumber"
                  placeholder="GRP123"
                  value={insuranceData.groupNumber || ''}
                  onChange={(e) => handleUpdate('groupNumber', e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle>Insurance Information</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={hasInsurance ? "default" : "outline"}
              onClick={() => handleToggleInsurance(true)}
            >
              <Check className="h-4 w-4 mr-1" />
              Has Insurance
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!hasInsurance ? "default" : "outline"}
              onClick={() => handleToggleInsurance(false)}
            >
              <X className="h-4 w-4 mr-1" />
              Cash Pay
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasInsurance ? (
          <div className="text-center py-6 text-gray-500">
            <CreditCard className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>Customer will pay cash / credit for services</p>
          </div>
        ) : (
          <>
            {/* Carrier Selection */}
            <div className="space-y-2">
              <Label htmlFor="carrier-select">Insurance Carrier *</Label>
              <Select 
                value={insuranceData.carrier} 
                onValueChange={(val) => handleUpdate('carrier', val)}
              >
                <SelectTrigger id="carrier-select">
                  <SelectValue placeholder="Select insurance carrier..." />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_CARRIERS.filter(c => c.value !== 'None').map(carrier => (
                    <SelectItem key={carrier.value} value={carrier.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${carrier.color}`} />
                        {carrier.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCarrier && (
              <Badge className={`${selectedCarrier.color} text-white`}>
                {selectedCarrier.label}
              </Badge>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memberId-input">Member ID *</Label>
                <Input
                  id="memberId-input"
                  placeholder="12345678"
                  value={insuranceData.memberId}
                  onChange={(e) => handleUpdate('memberId', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupNumber-input">Group Number</Label>
                <Input
                  id="groupNumber-input"
                  placeholder="GRP123"
                  value={insuranceData.groupNumber || ''}
                  onChange={(e) => handleUpdate('groupNumber', e.target.value)}
                />
              </div>
            </div>

            {showDetails && (
              <>
                {/* Eligibility Date */}
                <div className="space-y-2">
                  <Label htmlFor="eligibilityDate-input">Eligibility Date</Label>
                  <Input
                    id="eligibilityDate-input"
                    type="date"
                    value={insuranceData.eligibilityDate || ''}
                    onChange={(e) => handleUpdate('eligibilityDate', e.target.value)}
                  />
                </div>

                {/* Benefits Frequencies */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Benefit Frequencies
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="frequencyExam-select">Exam Frequency</Label>
                      <Select 
                        value={insuranceData.frequencyExam || '12'} 
                        onValueChange={(val) => handleUpdate('frequencyExam', val)}
                      >
                        <SelectTrigger id="frequencyExam-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map(freq => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frequencyMaterials-select">Materials Frequency</Label>
                      <Select 
                        value={insuranceData.frequencyMaterials || '24'} 
                        onValueChange={(val) => handleUpdate('frequencyMaterials', val)}
                      >
                        <SelectTrigger id="frequencyMaterials-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map(freq => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frequencyContacts-select">Contacts Frequency</Label>
                      <Select 
                        value={insuranceData.frequencyContacts || '12'} 
                        onValueChange={(val) => handleUpdate('frequencyContacts', val)}
                      >
                        <SelectTrigger id="frequencyContacts-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map(freq => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
