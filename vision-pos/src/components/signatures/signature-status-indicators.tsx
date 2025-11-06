'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  Package, 
  PenTool, 
  AlertCircle,
  User,
  Calendar
} from 'lucide-react'

interface SignatureStatus {
  id: string
  type: 'EXAM' | 'MATERIALS'
  completed: boolean
  signerName?: string
  signerEmail?: string
  timestamp?: Date
  signatureType?: 'signature' | 'typed'
}

interface WorkflowStatus {
  examCompleted: boolean
  materialsCompleted: boolean
  allCompleted: boolean
  nextStep: 'exam' | 'materials' | 'complete'
}

interface SignatureStatusIndicatorsProps {
  signatures: SignatureStatus[]
  workflowStatus: WorkflowStatus
  onRequestSignature: (type: 'EXAM' | 'MATERIALS') => void
  onViewSignature: (signature: SignatureStatus) => void
  className?: string
  compact?: boolean
}

export const SignatureStatusIndicators: React.FC<SignatureStatusIndicatorsProps> = ({
  signatures,
  workflowStatus,
  onRequestSignature,
  onViewSignature,
  className = '',
  compact = false,
}) => {
  const examSignature = signatures.find(s => s.type === 'EXAM')
  const materialsSignature = signatures.find(s => s.type === 'MATERIALS')

  const getStatusBadge = (type: 'EXAM' | 'MATERIALS', signature?: SignatureStatus) => {
    if (signature?.completed) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Signed
        </Badge>
      )
    }

    if (type === 'EXAM' || (type === 'MATERIALS' && workflowStatus.examCompleted)) {
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-600">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
    }

    return (
      <Badge variant="secondary" className="text-muted-foreground">
        <AlertCircle className="h-3 w-3 mr-1" />
        Waiting
      </Badge>
    )
  }

  const getProgressPercentage = () => {
    let completed = 0
    if (workflowStatus.examCompleted) completed += 1
    if (workflowStatus.materialsCompleted) completed += 1
    return (completed / 2) * 100
  }

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp)
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer">
                  {workflowStatus.examCompleted ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-orange-500" />
                  )}
                  <FileText className="h-3 w-3 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exam Services: {workflowStatus.examCompleted ? 'Signed' : 'Pending'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer">
                  {workflowStatus.materialsCompleted ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : workflowStatus.examCompleted ? (
                    <Clock className="h-4 w-4 text-orange-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Package className="h-3 w-3 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Materials: {workflowStatus.materialsCompleted ? 'Signed' : workflowStatus.examCompleted ? 'Pending' : 'Waiting'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {workflowStatus.allCompleted && (
          <Badge variant="default" className="bg-green-500 text-xs">
            Complete
          </Badge>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Signature Status</h3>
            </div>
            <div className="text-sm text-muted-foreground">
              {workflowStatus.allCompleted ? (
                <span className="text-green-600 font-medium">All Complete</span>
              ) : (
                <span>Step {workflowStatus.examCompleted ? '2' : '1'} of 2</span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(getProgressPercentage())}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          {/* Signature Items */}
          <div className="space-y-3">
            {/* Exam Signature */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Exam Services</span>
                    {getStatusBadge('EXAM', examSignature)}
                  </div>
                  {examSignature?.completed && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {examSignature.signerName}
                      {examSignature.signatureType === 'typed' && (
                        <span className="text-blue-600">(Typed)</span>
                      )}
                      {examSignature.timestamp && (
                        <>
                          <Calendar className="h-3 w-3" />
                          {formatTimestamp(examSignature.timestamp)}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {examSignature?.completed ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewSignature(examSignature)}
                  >
                    View
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onRequestSignature('EXAM')}
                  >
                    Sign Now
                  </Button>
                )}
              </div>
            </div>

            {/* Materials Signature */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Materials & Services</span>
                    {getStatusBadge('MATERIALS', materialsSignature)}
                  </div>
                  {materialsSignature?.completed && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <User className="h-3 w-3" />
                      {materialsSignature.signerName}
                      {materialsSignature.signatureType === 'typed' && (
                        <span className="text-blue-600">(Typed)</span>
                      )}
                      {materialsSignature.timestamp && (
                        <>
                          <Calendar className="h-3 w-3" />
                          {formatTimestamp(materialsSignature.timestamp)}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {materialsSignature?.completed ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewSignature(materialsSignature)}
                  >
                    View
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onRequestSignature('MATERIALS')}
                    disabled={!workflowStatus.examCompleted}
                  >
                    {workflowStatus.examCompleted ? 'Sign Now' : 'Waiting for Exam'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Next Steps */}
          {!workflowStatus.allCompleted && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Next Step:</p>
                  <p className="text-blue-800">
                    {workflowStatus.nextStep === 'exam' 
                      ? 'Sign the exam services agreement to authorize examination of your vehicle.'
                      : 'Sign the materials and services agreement to authorize parts and installation.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Completion Message */}
          {workflowStatus.allCompleted && (
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-900">All Signatures Complete!</p>
                  <p className="text-green-800">
                    Both exam services and materials authorizations have been signed. 
                    Work can now proceed as scheduled.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SignatureStatusIndicators