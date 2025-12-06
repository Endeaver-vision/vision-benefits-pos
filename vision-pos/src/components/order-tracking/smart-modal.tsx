'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
interface SmartModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: StatusUpdateData) => void
  currentStage: string
  nextStage: string
  orderNumber: string
}

export interface StatusUpdateData {
  note: string
  metadata?: Record<string, string | boolean | number>
}

const STAGE_PROMPTS: Record<string, {
  title: string
  description: string
  fields?: Array<{
    name: string
    type: 'text' | 'checkbox' | 'radio' | 'textarea'
    label: string
    placeholder?: string
    options?: string[]
    required?: boolean
  }>
}> = {
  'CONFIRMED': {
    title: 'Order Placed',
    description: 'Confirm order has been placed with vendor',
    fields: [
      { name: 'vendor', type: 'text', label: 'Vendor Name', placeholder: 'e.g., VSP Global' },
      { name: 'orderConfirmation', type: 'text', label: 'Vendor Order #', placeholder: 'Vendor confirmation number' }
    ]
  },
  'SHIPPED_TO_VENDOR': {
    title: 'Shipped to Vendor',
    description: 'Items sent to vendor for processing',
    fields: [
      { name: 'trackingNumber', type: 'text', label: 'Tracking Number', placeholder: 'USPS/UPS/FedEx tracking #', required: true },
      { name: 'carrier', type: 'radio', label: 'Shipping Carrier', options: ['USPS', 'UPS', 'FedEx', 'Other'] }
    ]
  },
  'VENDOR_PROCESSING': {
    title: 'Vendor Processing',
    description: 'Order is being processed by vendor',
    fields: [
      { name: 'estimatedCompletion', type: 'text', label: 'Estimated Completion Date', placeholder: 'e.g., 12/15/2025' }
    ]
  },
  'VENDOR_SHIPPED': {
    title: 'Vendor Shipped',
    description: 'Vendor has shipped the order back',
    fields: [
      { name: 'returnTrackingNumber', type: 'text', label: 'Return Tracking Number', placeholder: 'Tracking # from vendor', required: true },
      { name: 'expectedDelivery', type: 'text', label: 'Expected Delivery Date', placeholder: 'e.g., 12/20/2025' }
    ]
  },
  'RECEIVED': {
    title: 'Order Received',
    description: 'Items received from vendor',
    fields: [
      { name: 'allItemsPresent', type: 'checkbox', label: 'All items present and accounted for' },
      { name: 'packagingCondition', type: 'radio', label: 'Package Condition', options: ['Excellent', 'Good', 'Damaged'] }
    ]
  },
  'QUALITY_CHECK': {
    title: 'Quality Check',
    description: 'Perform quality inspection',
    fields: [
      { name: 'qcPassed', type: 'checkbox', label: 'Quality check passed' },
      { name: 'issues', type: 'textarea', label: 'Issues Found (if any)', placeholder: 'Document any quality issues...' }
    ]
  },
  'PATIENT_NOTIFIED': {
    title: 'Patient Notified',
    description: 'Customer has been notified',
    fields: [
      { name: 'notificationMethod', type: 'radio', label: 'Notification Method', options: ['SMS', 'Email', 'Phone Call', 'In Person'], required: true },
      { name: 'pickupDate', type: 'text', label: 'Scheduled Pickup Date', placeholder: 'e.g., 12/25/2025' }
    ]
  }
}

export function SmartModal({ isOpen, onClose, onConfirm, nextStage, orderNumber }: SmartModalProps) {
  const [formData, setFormData] = useState<Record<string, string | boolean | number>>({})
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const stageConfig = STAGE_PROMPTS[nextStage] || {
    title: 'Update Status',
    description: 'Add a note about this status change'
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await onConfirm({
      note,
      metadata: formData
    })
    setIsSubmitting(false)
    setFormData({})
    setNote('')
    onClose()
  }

  const handleFieldChange = (name: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const isValid = () => {
    if (!note.trim()) return false
    
    // Check required fields
    const requiredFields = stageConfig.fields?.filter(f => f.required) || []
    for (const field of requiredFields) {
      if (!formData[field.name]) return false
    }
    
    return true
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{stageConfig.title}</DialogTitle>
          <DialogDescription>
            Order #{orderNumber} • {stageConfig.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stage-Specific Fields */}
          {stageConfig.fields?.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>

              {field.type === 'text' && (
                <Input
                  id={field.name}
                  placeholder={field.placeholder}
                  value={typeof formData[field.name] === 'string' ? formData[field.name] as string : ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                />
              )}

              {field.type === 'textarea' && (
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  value={typeof formData[field.name] === 'string' ? formData[field.name] as string : ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  rows={3}
                />
              )}

              {field.type === 'checkbox' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={field.name}
                    checked={typeof formData[field.name] === 'boolean' ? formData[field.name] as boolean : false}
                    onCheckedChange={(checked) => handleFieldChange(field.name, !!checked)}
                  />
                  <label htmlFor={field.name} className="text-sm cursor-pointer">
                    {field.label}
                  </label>
                </div>
              )}

              {field.type === 'radio' && field.options && (
                <div className="space-y-2">
                  {field.options.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`${field.name}-${option}`}
                        name={field.name}
                        value={option}
                        checked={formData[field.name] === option}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className="h-4 w-4 cursor-pointer"
                      />
                      <Label htmlFor={`${field.name}-${option}`} className="cursor-pointer font-normal">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Note Field (Always Required) */}
          <div className="space-y-2">
            <Label htmlFor="note">
              Notes <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="note"
              placeholder="Document this status change..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Required: Explain what happened at this stage
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid() || isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Confirm Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
