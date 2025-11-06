'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  AlertTriangle,
  Camera,
  FileText,
  DollarSign,
  Shield,
  Upload,
  User,
  Calendar
} from 'lucide-react'

interface POFIncidentData {
  quoteId: string
  customerId: string
  incidentType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  frameDescription: string
  frameCondition: string
  financialImpact: number
  refundIssued: boolean
  photosAttached: boolean
  customerNotified: boolean
  insuranceNotified: boolean
  resolution: string
  preventiveMeasures: string
}

interface POFIncidentReportProps {
  quoteId: string
  customerId: string
  customerName: string
  frameDetails?: {
    brand: string
    model: string
    condition: string
    description: string
  }
  onSubmit: (incidentData: POFIncidentData) => void
  onCancel: () => void
  isManager: boolean
}

const incidentTypes = [
  { value: 'FRAME_DAMAGE', label: 'Frame Damage During Installation' },
  { value: 'FRAME_BREAKAGE', label: 'Frame Breakage' },
  { value: 'POOR_FIT', label: 'Poor Fit/Alignment Issues' },
  { value: 'LENS_COMPATIBILITY', label: 'Lens Compatibility Problems' },
  { value: 'CUSTOMER_COMPLAINT', label: 'Customer Complaint' },
  { value: 'QUALITY_ISSUE', label: 'Quality/Workmanship Issue' },
  { value: 'MATERIAL_FAILURE', label: 'Frame Material Failure' },
  { value: 'ADJUSTMENT_PROBLEM', label: 'Adjustment Difficulties' },
  { value: 'OTHER', label: 'Other' }
]

const severityLevels = [
  { value: 'LOW', label: 'Low', description: 'Minor issue, easily resolved', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', description: 'Moderate issue requiring attention', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', description: 'Significant issue with customer impact', color: 'bg-orange-100 text-orange-800' },
  { value: 'CRITICAL', label: 'Critical', description: 'Severe issue requiring immediate action', color: 'bg-red-100 text-red-800' }
]

export function POFIncidentReport({ 
  quoteId,
  customerId,
  customerName,
  frameDetails,
  onSubmit, 
  onCancel,
  isManager 
}: POFIncidentReportProps) {
  const [incidentData, setIncidentData] = useState<POFIncidentData>({
    quoteId,
    customerId,
    incidentType: '',
    severity: 'LOW',
    title: '',
    description: '',
    frameDescription: frameDetails?.description || '',
    frameCondition: frameDetails?.condition || '',
    financialImpact: 0,
    refundIssued: false,
    photosAttached: false,
    customerNotified: false,
    insuranceNotified: false,
    resolution: '',
    preventiveMeasures: ''
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const updateField = (field: keyof POFIncidentData, value: any) => {
    setIncidentData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = () => {
    const errors: string[] = []
    
    if (!incidentData.incidentType) errors.push('Incident type is required')
    if (!incidentData.title.trim()) errors.push('Incident title is required')
    if (!incidentData.description.trim()) errors.push('Incident description is required')
    if (!incidentData.frameDescription.trim()) errors.push('Frame description is required')
    if (incidentData.financialImpact < 0) errors.push('Financial impact cannot be negative')
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    
    try {
      // Call the API to create the incident
      const response = await fetch('/api/quotes/patient-frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_incident',
          ...incidentData
        }),
      })
      
      if (response.ok) {
        onSubmit(incidentData)
      } else {
        console.error('Failed to create incident report')
      }
    } catch (error) {
      console.error('Error creating incident report:', error)
    }
  }

  if (!isManager) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">Manager Access Required</p>
              <p className="text-sm">
                POF incident reports can only be created by managers. Please contact your manager to report this incident.
              </p>
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={onCancel}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          POF Incident Report
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Document patient-owned frame incidents for liability tracking and quality improvement.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Please correct the following:</p>
                <ul className="list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Incident Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>Customer:</strong> {customerName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <strong>Quote ID:</strong> {quoteId}
            </span>
          </div>
        </div>

        {/* Incident Type and Severity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Incident Type *</Label>
            <Select
              value={incidentData.incidentType}
              onValueChange={(value) => updateField('incidentType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                {incidentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Severity Level *</Label>
            <Select
              value={incidentData.severity}
              onValueChange={(value: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => updateField('severity', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {severityLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={level.color}>
                        {level.label}
                      </Badge>
                      <span className="text-sm">{level.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Incident Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Incident Title *</Label>
          <Input
            id="title"
            value={incidentData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Brief summary of the incident"
          />
        </div>

        {/* Incident Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Detailed Description *</Label>
          <Textarea
            id="description"
            value={incidentData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Provide a detailed description of what happened, when it occurred, and any relevant circumstances"
            rows={4}
          />
        </div>

        {/* Frame Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="frameDescription">Frame Description *</Label>
            <Textarea
              id="frameDescription"
              value={incidentData.frameDescription}
              onChange={(e) => updateField('frameDescription', e.target.value)}
              placeholder="Brand, model, color, material, size"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="frameCondition">Frame Condition</Label>
            <Input
              id="frameCondition"
              value={incidentData.frameCondition}
              onChange={(e) => updateField('frameCondition', e.target.value)}
              placeholder="Condition at time of incident"
            />
          </div>
        </div>

        {/* Financial Impact */}
        <div className="space-y-2">
          <Label htmlFor="financialImpact">Financial Impact</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="financialImpact"
              type="number"
              min="0"
              step="0.01"
              value={incidentData.financialImpact || ''}
              onChange={(e) => updateField('financialImpact', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="pl-9"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="refundIssued"
                checked={incidentData.refundIssued}
                onCheckedChange={(checked) => updateField('refundIssued', checked === true)}
              />
              <Label htmlFor="refundIssued" className="text-sm">
                Refund issued to customer
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="photosAttached"
                checked={incidentData.photosAttached}
                onCheckedChange={(checked) => updateField('photosAttached', checked === true)}
              />
              <Label htmlFor="photosAttached" className="text-sm">
                Photos of incident attached
              </Label>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="customerNotified"
                checked={incidentData.customerNotified}
                onCheckedChange={(checked) => updateField('customerNotified', checked === true)}
              />
              <Label htmlFor="customerNotified" className="text-sm">
                Customer has been notified
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="insuranceNotified"
                checked={incidentData.insuranceNotified}
                onCheckedChange={(checked) => updateField('insuranceNotified', checked === true)}
              />
              <Label htmlFor="insuranceNotified" className="text-sm">
                Insurance company notified
              </Label>
            </div>
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <Label htmlFor="resolution">Resolution / Action Taken</Label>
          <Textarea
            id="resolution"
            value={incidentData.resolution}
            onChange={(e) => updateField('resolution', e.target.value)}
            placeholder="Describe the resolution or action taken to address this incident"
            rows={3}
          />
        </div>

        {/* Preventive Measures */}
        <div className="space-y-2">
          <Label htmlFor="preventiveMeasures">Preventive Measures</Label>
          <Textarea
            id="preventiveMeasures"
            value={incidentData.preventiveMeasures}
            onChange={(e) => updateField('preventiveMeasures', e.target.value)}
            placeholder="What steps can be taken to prevent similar incidents in the future?"
            rows={2}
          />
        </div>

        {/* Photo Upload */}
        <div className="space-y-2">
          <Label>Incident Photos</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Upload photos documenting the incident
            </p>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Choose Photos
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              JPG, PNG up to 5MB each. Multiple photos recommended.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700">
            <FileText className="h-4 w-4 mr-2" />
            Submit Incident Report
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}