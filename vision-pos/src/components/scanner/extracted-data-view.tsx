'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle,
  XCircle,
  User,
  CreditCard,
  Glasses,
  Eye,
  AlertTriangle,
  Loader2
} from 'lucide-react'

interface ExtractedDataViewProps {
  data: {
    success: boolean
    carrier?: string
    planName?: string
    confidenceScore?: number
    extractedData?: Record<string, unknown>
    error?: string
  }
  onVerify: () => void
  onReject: () => void
  isVerifying: boolean
}

export function ExtractedDataView({ data, onVerify, onReject, isVerifying }: ExtractedDataViewProps) {
  const { carrier, planName, confidenceScore, extractedData } = data

  const getConfidenceVariant = (score: number): 'success' | 'warning' | 'destructive' => {
    if (score >= 0.85) return 'success'
    if (score >= 0.7) return 'warning'
    return 'destructive'
  }

  const getConfidenceLabel = (score: number): string => {
    if (score >= 0.85) return 'High'
    if (score >= 0.7) return 'Medium'
    return 'Low'
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.join(', ')
    return JSON.stringify(value)
  }

  // Extract key data from the extracted data structure
  const patient = extractedData?.patient as Record<string, { value: unknown; confidence: number }> | undefined
  const plan = extractedData?.plan as Record<string, { value: unknown; confidence: number }> | undefined
  const copays = extractedData?.copays as Record<string, { value: unknown; confidence: number }> | undefined
  const frame = extractedData?.frame as Record<string, unknown> | undefined
  const contacts = extractedData?.contacts as Record<string, { value: unknown; confidence: number }> | undefined

  const DataField = ({ label, value, confidence }: { label: string; value: unknown; confidence?: number }) => (
    <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="font-medium">{formatValue(value)}</span>
        {confidence !== undefined && (
          <div className="text-xs text-muted-foreground">
            {(confidence * 100).toFixed(0)}% conf
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {carrier && (
                  <Badge
                    variant={carrier === 'VSP' ? 'blue' : carrier === 'EyeMed' ? 'purple' : 'teal'}
                    size="lg"
                  >
                    {carrier}
                  </Badge>
                )}
                <span>{planName || 'Insurance Document'}</span>
              </CardTitle>
              <CardDescription className="mt-2">
                Review the extracted data below and verify if accurate
              </CardDescription>
            </div>
            {confidenceScore !== undefined && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">Confidence</div>
                <Badge variant={getConfidenceVariant(confidenceScore)} size="lg">
                  {(confidenceScore * 100).toFixed(0)}% {getConfidenceLabel(confidenceScore)}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {confidenceScore !== undefined && (
            <Progress
              value={confidenceScore * 100}
              variant={getConfidenceVariant(confidenceScore)}
              className="h-2"
            />
          )}
          {confidenceScore !== undefined && confidenceScore < 0.7 && (
            <div className="flex items-center gap-2 mt-3 text-warning">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Low confidence - please review carefully</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="patient">
            <TabsList>
              <TabsTrigger value="patient">
                <User className="h-4 w-4 mr-2" />
                Patient
              </TabsTrigger>
              <TabsTrigger value="plan">
                <CreditCard className="h-4 w-4 mr-2" />
                Plan
              </TabsTrigger>
              <TabsTrigger value="copays">
                <CreditCard className="h-4 w-4 mr-2" />
                Copays
              </TabsTrigger>
              <TabsTrigger value="benefits">
                <Glasses className="h-4 w-4 mr-2" />
                Benefits
              </TabsTrigger>
            </TabsList>

            <TabsContent value="patient" className="mt-4">
              <div className="space-y-1">
                <DataField
                  label="Patient Name"
                  value={patient?.patientName?.value}
                  confidence={patient?.patientName?.confidence}
                />
                <DataField
                  label="Member Name"
                  value={patient?.memberName?.value}
                  confidence={patient?.memberName?.confidence}
                />
                <DataField
                  label="Auth Number"
                  value={patient?.authNumber?.value}
                  confidence={patient?.authNumber?.confidence}
                />
                <DataField
                  label="Relationship"
                  value={patient?.relationship?.value}
                  confidence={patient?.relationship?.confidence}
                />
                <DataField
                  label="Birth Date"
                  value={patient?.patientBirthDate?.value}
                  confidence={patient?.patientBirthDate?.confidence}
                />
                <DataField
                  label="Auth Effective"
                  value={patient?.authEffectiveDate?.value}
                  confidence={patient?.authEffectiveDate?.confidence}
                />
                <DataField
                  label="Auth Expiration"
                  value={patient?.authExpirationDate?.value}
                  confidence={patient?.authExpirationDate?.confidence}
                />
              </div>
            </TabsContent>

            <TabsContent value="plan" className="mt-4">
              <div className="space-y-1">
                <DataField
                  label="Carrier"
                  value={plan?.carrier?.value}
                  confidence={plan?.carrier?.confidence}
                />
                <DataField
                  label="Plan Name"
                  value={plan?.benefitPlanName?.value}
                  confidence={plan?.benefitPlanName?.confidence}
                />
                <DataField
                  label="Client Name"
                  value={plan?.clientName?.value}
                  confidence={plan?.clientName?.confidence}
                />
                <DataField
                  label="Network Lab"
                  value={plan?.networkLabRequirement?.value}
                  confidence={plan?.networkLabRequirement?.confidence}
                />
              </div>
            </TabsContent>

            <TabsContent value="copays" className="mt-4">
              <div className="space-y-1">
                <DataField
                  label="Exam Copay"
                  value={copays?.examCopay?.value ? `$${copays.examCopay.value}` : null}
                  confidence={copays?.examCopay?.confidence}
                />
                <DataField
                  label="Materials Copay"
                  value={copays?.materialsCopay?.value ? `$${copays.materialsCopay.value}` : null}
                  confidence={copays?.materialsCopay?.confidence}
                />
                <DataField
                  label="Single Vision Copay"
                  value={copays?.singleVisionCopay?.value ? `$${copays.singleVisionCopay.value}` : null}
                  confidence={copays?.singleVisionCopay?.confidence}
                />
                <DataField
                  label="Routine Retinal Screening"
                  value={copays?.routineRetinalScreening?.value}
                  confidence={copays?.routineRetinalScreening?.confidence}
                />
              </div>
            </TabsContent>

            <TabsContent value="benefits" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Glasses className="h-4 w-4" />
                    Frame Allowances
                  </h4>
                  <div className="space-y-1 pl-6">
                    {frame?.allowances && (
                      <>
                        <DataField
                          label="Altair/Marchon"
                          value={
                            (frame.allowances as Record<string, { allowance?: number; overageDiscount?: number }>)?.altairMarchonFrameAllowance?.allowance
                              ? `$${(frame.allowances as Record<string, { allowance?: number; overageDiscount?: number }>).altairMarchonFrameAllowance.allowance} (${(frame.allowances as Record<string, { allowance?: number; overageDiscount?: number }>).altairMarchonFrameAllowance.overageDiscount}% overage)`
                              : null
                          }
                        />
                        <DataField
                          label="Non-Altair"
                          value={
                            (frame.allowances as Record<string, { allowance?: number; overageDiscount?: number }>)?.nonAltairMarchonFrameAllowance?.allowance
                              ? `$${(frame.allowances as Record<string, { allowance?: number; overageDiscount?: number }>).nonAltairMarchonFrameAllowance.allowance} (${(frame.allowances as Record<string, { allowance?: number; overageDiscount?: number }>).nonAltairMarchonFrameAllowance.overageDiscount}% overage)`
                              : null
                          }
                        />
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Contact Lens Benefits
                  </h4>
                  <div className="space-y-1 pl-6">
                    <DataField
                      label="CL Exam & Materials Allowance"
                      value={contacts?.clExamAndMaterialsAllowance?.value ? `$${contacts.clExamAndMaterialsAllowance.value}` : null}
                      confidence={contacts?.clExamAndMaterialsAllowance?.confidence}
                    />
                    <DataField
                      label="CL Exam Discount"
                      value={contacts?.clExamDiscount?.value}
                      confidence={contacts?.clExamDiscount?.confidence}
                    />
                    <DataField
                      label="Contacts Instead of Glasses"
                      value={contacts?.contactsInsteadOfGlasses?.value}
                      confidence={contacts?.contactsInsteadOfGlasses?.confidence}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onReject} disabled={isVerifying}>
          <XCircle className="h-4 w-4 mr-2" />
          Reject & Re-scan
        </Button>
        <Button onClick={onVerify} disabled={isVerifying} variant="success">
          {isVerifying ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          {isVerifying ? 'Verifying...' : 'Verify & Save'}
        </Button>
      </div>
    </div>
  )
}
