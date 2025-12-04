'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2, FileSearch, Brain, CheckCircle } from 'lucide-react'

interface ProcessingStatusProps {
  documentId?: string
  fileName?: string
  isProcessing: boolean
}

export function ProcessingStatus({ documentId, fileName, isProcessing }: ProcessingStatusProps) {
  const steps = [
    {
      id: 'upload',
      label: 'Document uploaded',
      description: 'File received and validated',
      icon: CheckCircle,
      complete: true,
    },
    {
      id: 'ocr',
      label: 'Running OCR',
      description: 'Extracting text from document using Google Vision',
      icon: FileSearch,
      complete: !isProcessing,
    },
    {
      id: 'ai',
      label: 'AI Analysis',
      description: 'Extracting structured data with GPT-4o',
      icon: Brain,
      complete: !isProcessing,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle className="h-5 w-5 text-success" />
          )}
          {isProcessing ? 'Processing Document' : 'Processing Complete'}
        </CardTitle>
        {fileName && (
          <p className="text-sm text-muted-foreground mt-1">{fileName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <Progress
          value={isProcessing ? 50 : 100}
          variant={isProcessing ? 'default' : 'success'}
          className="h-2"
        />

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = isProcessing && index === 1 // OCR step is active when processing

            return (
              <div key={step.id} className="flex items-start gap-4">
                <div className={`
                  h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all
                  ${step.complete
                    ? 'bg-success/20 text-success'
                    : isActive
                      ? 'bg-primary/20 text-primary'
                      : 'bg-white/10 text-muted-foreground'
                  }
                `}>
                  {isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <p className={`font-medium ${step.complete ? 'text-success' : isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {step.complete && (
                  <CheckCircle className="h-5 w-5 text-success shrink-0 mt-2" />
                )}
              </div>
            )
          })}
        </div>

        {/* Processing Animation */}
        {isProcessing && (
          <div className="text-center py-4">
            <div className="flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              This may take 15-30 seconds depending on document complexity
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
