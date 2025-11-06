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
import { 
  Camera,
  AlertTriangle,
  Shield,
  DollarSign,
  Upload
} from 'lucide-react'

export interface POFFrameDetails {
  brand: string
  model: string
  color: string
  estimatedValue: number
  frameCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | ''
  description: string
  photos: string[]
  inspectionNotes: string
}

interface POFDetailsFormProps {
  frameDetails: POFFrameDetails
  onFrameDetailsChange: (details: POFFrameDetails) => void
  onNext: () => void
  onCancel: () => void
}

const frameConditions = [
  { value: 'EXCELLENT', label: 'Excellent', description: 'Like new, no visible wear' },
  { value: 'GOOD', label: 'Good', description: 'Minor wear, fully functional' },
  { value: 'FAIR', label: 'Fair', description: 'Moderate wear, may need adjustments' },
  { value: 'POOR', label: 'Poor', description: 'Significant wear, may affect fitting' }
]

export function POFDetailsForm({ 
  frameDetails, 
  onFrameDetailsChange, 
  onNext, 
  onCancel 
}: POFDetailsFormProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const updateDetail = (field: keyof POFFrameDetails, value: any) => {
    onFrameDetailsChange({
      ...frameDetails,
      [field]: value
    })
  }

  const validateForm = () => {
    const errors: string[] = []
    
    if (!frameDetails.brand.trim()) errors.push('Frame brand is required')
    if (!frameDetails.model.trim()) errors.push('Frame model is required')
    if (!frameDetails.color.trim()) errors.push('Frame color is required')
    if (!frameDetails.frameCondition) errors.push('Frame condition assessment is required')
    if (frameDetails.estimatedValue <= 0) errors.push('Frame value must be greater than $0')
    if (!frameDetails.description.trim()) errors.push('Frame description is required')
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      onNext()
    }
  }

  const getConditionBadgeColor = (condition: string) => {
    switch (condition) {
      case 'EXCELLENT': return 'bg-green-100 text-green-800'
      case 'GOOD': return 'bg-blue-100 text-blue-800'
      case 'FAIR': return 'bg-yellow-100 text-yellow-800'
      case 'POOR': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Patient-Owned Frame Details
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Please provide detailed information about the patient's frame for inspection and liability documentation.
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

        {/* Frame Identification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Frame Brand *</Label>
            <Input
              id="brand"
              value={frameDetails.brand}
              onChange={(e) => updateDetail('brand', e.target.value)}
              placeholder="e.g., Ray-Ban, Oakley, Prada"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model/Style *</Label>
            <Input
              id="model"
              value={frameDetails.model}
              onChange={(e) => updateDetail('model', e.target.value)}
              placeholder="e.g., Aviator, Wayfarer, RB2132"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="color">Color *</Label>
            <Input
              id="color"
              value={frameDetails.color}
              onChange={(e) => updateDetail('color', e.target.value)}
              placeholder="e.g., Black, Tortoise, Silver"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Estimated Value *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="value"
                type="number"
                min="0"
                step="0.01"
                value={frameDetails.estimatedValue || ''}
                onChange={(e) => updateDetail('estimatedValue', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Frame Condition Assessment */}
        <div className="space-y-2">
          <Label>Frame Condition Assessment *</Label>
          <Select
            value={frameDetails.frameCondition}
            onValueChange={(value) => updateDetail('frameCondition', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frame condition" />
            </SelectTrigger>
            <SelectContent>
              {frameConditions.map((condition) => (
                <SelectItem key={condition.value} value={condition.value}>
                  <div className="flex items-center gap-2">
                    <Badge className={getConditionBadgeColor(condition.value)}>
                      {condition.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {condition.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Frame Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Detailed Description *</Label>
          <Textarea
            id="description"
            value={frameDetails.description}
            onChange={(e) => updateDetail('description', e.target.value)}
            placeholder="Describe the frame style, material, size, any visible wear or damage, special features, etc."
            rows={3}
          />
        </div>

        {/* Photo Upload Section */}
        <div className="space-y-2">
          <Label>Frame Photos (Recommended)</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Upload photos of the frame for documentation
            </p>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Choose Photos
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              JPG, PNG up to 5MB each. Multiple photos recommended.
            </p>
          </div>
          {frameDetails.photos.length > 0 && (
            <div className="text-sm text-green-600">
              {frameDetails.photos.length} photo(s) uploaded
            </div>
          )}
        </div>

        {/* Inspection Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Staff Inspection Notes</Label>
          <Textarea
            id="notes"
            value={frameDetails.inspectionNotes}
            onChange={(e) => updateDetail('inspectionNotes', e.target.value)}
            placeholder="Additional notes from frame inspection (damage, concerns, adjustments needed, etc.)"
            rows={2}
          />
        </div>

        {/* POF Fee Notice */}
        <Alert>
          <DollarSign className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Patient-Owned Frame Service Fee: $45.00</p>
              <p className="text-sm">
                This fixed fee covers frame inspection, fitting adjustments, and installation of lenses into patient-provided frames.
                This fee will be added to the quote total.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleNext}>
            Continue to Liability Waiver
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}