'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useQuoteStore } from '../../store/quote-store'
import { useAutoSave } from '../../hooks/use-auto-save'
import { 
  Save,
  Clock,
  User,
  Shield
} from 'lucide-react'

interface QuoteHeaderProps {
  className?: string
}

export function QuoteHeader({ className = '' }: QuoteHeaderProps) {
  const {
    quote,
    autoSave,
    updatePatient,
    updateInsurance,
    saveQuote
  } = useQuoteStore()

  // Enable auto-save functionality
  const { isAutoSaveEnabled, isDirty } = useAutoSave({
    enabled: true,
    intervalMs: 30000, // 30 seconds
    onError: (error) => {
      console.error('Auto-save failed:', error)
      // TODO: Show user notification
    }
  })

  const handlePatientChange = (field: string, value: string) => {
    updatePatient({ [field]: value })
  }

  const handleInsuranceChange = (field: string, value: string) => {
    updateInsurance({ [field]: value })
  }

  const handleSave = async () => {
    await saveQuote()
  }

  const getDraftStatus = () => {
    if (isDirty || autoSave.isDirty) return 'Unsaved changes'
    if (autoSave.lastSaved) return 'Saved'
    return 'Draft'
  }

  const getDraftVariant = () => {
    if (isDirty || autoSave.isDirty) return 'destructive' as const
    if (isAutoSaveEnabled) return 'secondary' as const
    return 'outline' as const
  }

  return (
    <div className={`border-b bg-card ${className}`}>
      <div className="container mx-auto px-4 py-4">
        
        {/* Top Row - Title and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">New Quote</h1>
            <Badge variant={getDraftVariant()} className="text-xs">
              {getDraftStatus()}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            {autoSave.lastSaved && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                Saved {autoSave.lastSaved.toLocaleTimeString()}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isAutoSaveEnabled ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Auto-save {autoSave.isDirty || isDirty ? 'pending' : 'active'}
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  Manual save
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          </div>
        </div>

        {/* Form Fields Row */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Patient Information */}
          <Card className="col-span-6">
            <CardContent className="p-4">
              <div className="flex items-center mb-3">
                <User className="h-5 w-5 mr-2 text-primary" />
                <h3 className="font-semibold">Patient Information</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-name">Patient Name</Label>
                  <Input
                    id="patient-name"
                    placeholder="Enter patient name"
                    value={quote.patient.name}
                    onChange={(e) => handlePatientChange('name', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="patient-phone">Phone Number</Label>
                  <Input
                    id="patient-phone"
                    placeholder="(555) 123-4567"
                    value={quote.patient.phone}
                    onChange={(e) => handlePatientChange('phone', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="patient-email">Email Address</Label>
                  <Input
                    id="patient-email"
                    type="email"
                    placeholder="patient@example.com"
                    value={quote.patient.email}
                    onChange={(e) => handlePatientChange('email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance Information */}
          <Card className="col-span-6">
            <CardContent className="p-4">
              <div className="flex items-center mb-3">
                <Shield className="h-5 w-5 mr-2 text-primary" />
                <h3 className="font-semibold">Insurance Information</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insurance-carrier">Insurance Carrier</Label>
                  <Select
                    value={quote.insurance.carrier}
                    onValueChange={(value) => handleInsuranceChange('carrier', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VSP">VSP</SelectItem>
                      <SelectItem value="EyeMed">EyeMed</SelectItem>
                      <SelectItem value="Spectera">Spectera</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="insurance-plan">Plan Name</Label>
                  <Input
                    id="insurance-plan"
                    placeholder="Enter plan name"
                    value={quote.insurance.planName}
                    onChange={(e) => handleInsuranceChange('planName', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="member-id">Member ID</Label>
                  <Input
                    id="member-id"
                    placeholder="Enter member ID"
                    value={quote.insurance.memberId}
                    onChange={(e) => handleInsuranceChange('memberId', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="group-number">Group Number</Label>
                  <Input
                    id="group-number"
                    placeholder="Enter group number"
                    value={quote.insurance.groupNumber || ''}
                    onChange={(e) => handleInsuranceChange('groupNumber', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}