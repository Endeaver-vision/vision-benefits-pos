'use client'

import { useState, useCallback } from 'react'
import PageLayout from '@/components/layout/page-layout'
import { MultiDocumentUpload, DocumentSlot } from '@/components/scanner'
import { ProcessingStatus } from '@/components/scanner/processing-status'
import { ExtractedDataView } from '@/components/scanner/extracted-data-view'
import { CustomerSelector } from '@/components/scanner/customer-selector'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  User,
  ClipboardList,
  Glasses
} from 'lucide-react'

type ScannerStep = 'select-customer' | 'upload' | 'processing' | 'review' | 'complete'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  insuranceCarrier?: string
}

interface UploadedDocument {
  documentId: string
  fileName: string
  filePath: string
  slot: DocumentSlot
  detectedType?: string
}

interface ProcessingResult {
  success: boolean
  carrier?: string
  planName?: string
  confidenceScore?: number
  extractedData?: Record<string, unknown>
  error?: string
  slot?: DocumentSlot
}

export default function ScannerPage() {
  const [step, setStep] = useState<ScannerStep>('select-customer')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([])
  const [processingStatus, setProcessingStatus] = useState<{auth: string, lens: string}>({auth: 'pending', lens: 'pending'})
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
    setStep('upload')
    setError(null)
  }, [])

  const handleUploadComplete = useCallback(async (documents: UploadedDocument[]) => {
    setUploadedDocuments(documents)
    setStep('processing')
    setIsProcessing(true)
    setError(null)
    setProcessingStatus({auth: 'processing', lens: documents.length > 1 ? 'processing' : 'skipped'})

    const results: ProcessingResult[] = []

    // Process each document
    for (const doc of documents) {
      try {
        setProcessingStatus(prev => ({
          ...prev,
          [doc.slot === 'authorization' ? 'auth' : 'lens']: 'processing'
        }))

        const response = await fetch(`/api/documents/${doc.documentId}/process`, {
          method: 'POST',
        })

        const result = await response.json()

        if (result.success) {
          results.push({
            success: true,
            carrier: result.carrier,
            planName: result.planName,
            confidenceScore: result.confidenceScore,
            extractedData: result.extractedData,
            slot: doc.slot,
          })
          setProcessingStatus(prev => ({
            ...prev,
            [doc.slot === 'authorization' ? 'auth' : 'lens']: 'complete'
          }))
        } else {
          results.push({
            success: false,
            error: result.error || 'Processing failed',
            slot: doc.slot,
          })
          setProcessingStatus(prev => ({
            ...prev,
            [doc.slot === 'authorization' ? 'auth' : 'lens']: 'error'
          }))
        }
      } catch (err) {
        results.push({
          success: false,
          error: err instanceof Error ? err.message : 'Processing failed',
          slot: doc.slot,
        })
        setProcessingStatus(prev => ({
          ...prev,
          [doc.slot === 'authorization' ? 'auth' : 'lens']: 'error'
        }))
      }
    }

    setProcessingResults(results)

    // Check if at least the authorization was processed successfully
    const authResult = results.find(r => r.slot === 'authorization')
    if (authResult?.success) {
      setStep('review')
    } else {
      setError(authResult?.error || 'Authorization document processing failed')
    }

    setIsProcessing(false)
  }, [])

  const handleVerify = useCallback(async () => {
    if (uploadedDocuments.length === 0) return

    setIsProcessing(true)
    setError(null)

    // Verify all documents
    for (const doc of uploadedDocuments) {
      try {
        const response = await fetch(`/api/documents/${doc.documentId}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verifiedBy: 'scanner-ui',
            verificationNotes: `Verified via scanner interface (${doc.slot})`,
          }),
        })

        const result = await response.json()

        if (!result.success) {
          setError(result.error || `Verification failed for ${doc.slot}`)
          setIsProcessing(false)
          return
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed')
        setIsProcessing(false)
        return
      }
    }

    setStep('complete')
    setIsProcessing(false)
  }, [uploadedDocuments])

  const handleReset = useCallback(() => {
    setStep('select-customer')
    setSelectedCustomer(null)
    setUploadedDocuments([])
    setProcessingResults([])
    setProcessingStatus({auth: 'pending', lens: 'pending'})
    setError(null)
    setIsProcessing(false)
  }, [])

  const handleChangeCustomer = useCallback(() => {
    setStep('select-customer')
    setUploadedDocuments([])
    setProcessingResults([])
    setProcessingStatus({auth: 'pending', lens: 'pending'})
    setError(null)
  }, [])

  const getStepIndicator = () => {
    const steps = [
      { key: 'select-customer', label: 'Customer', icon: User },
      { key: 'upload', label: 'Upload', icon: Upload },
      { key: 'processing', label: 'Process', icon: Loader2 },
      { key: 'review', label: 'Review', icon: FileText },
      { key: 'complete', label: 'Complete', icon: CheckCircle },
    ]

    const currentIndex = steps.findIndex(s => s.key === step)

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, index) => {
          const Icon = s.icon
          const isActive = s.key === step
          const isComplete = index < currentIndex

          return (
            <div key={s.key} className="flex items-center">
              <div className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${isActive
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : isComplete
                    ? 'bg-success/20 text-success border border-success/30'
                    : 'bg-white/5 text-muted-foreground border border-white/10'
                }
              `}>
                <Icon className={`h-4 w-4 ${isActive && step === 'processing' ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-px mx-1 ${index < currentIndex ? 'bg-success/50' : 'bg-white/10'}`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <PageLayout
      title="Insurance Document Scanner"
      subtitle="Scan and process insurance cards and authorizations"
      actions={
        step !== 'select-customer' && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Start Over
          </Button>
        )
      }
    >
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {getStepIndicator()}

        {/* Error Display */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive">{error}</span>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Selected Customer Display */}
        {selectedCustomer && step !== 'select-customer' && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedCustomer.email || selectedCustomer.phone || 'No contact info'}
                  </div>
                </div>
                {selectedCustomer.insuranceCarrier && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedCustomer.insuranceCarrier}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleChangeCustomer}>
                Change
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        {step === 'select-customer' && (
          <CustomerSelector onSelect={handleCustomerSelect} />
        )}

        {step === 'upload' && selectedCustomer && (
          <MultiDocumentUpload
            customerId={selectedCustomer.id}
            onUploadComplete={handleUploadComplete}
          />
        )}

        {step === 'processing' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing Documents
              </CardTitle>
              <CardDescription>
                Extracting insurance information from your documents...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show each uploaded document with its status */}
              {uploadedDocuments.map((doc, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    (doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'complete' ? 'bg-success/20' :
                    (doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'error' ? 'bg-destructive/20' :
                    'bg-primary/20'
                  }`}>
                    {(doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : doc.slot === 'authorization' ? (
                      <ClipboardList className="h-5 w-5 text-primary" />
                    ) : (
                      <Glasses className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {doc.fileName}
                      {doc.detectedType && (
                        <Badge variant="outline" className="text-xs">
                          {doc.detectedType}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'processing' && 'Processing...'}
                      {(doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'complete' && 'Extraction complete'}
                      {(doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'error' && 'Processing failed'}
                      {(doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'pending' && 'Waiting...'}
                    </div>
                  </div>
                  {(doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'processing' && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 'review' && processingResults.length > 0 && (
          <div className="space-y-4">
            {/* Carrier Recognition Banner */}
            {(() => {
              const authResult = processingResults.find(r => r.slot === 'authorization' && r.success)
              if (!authResult?.carrier) return null

              const carrierColors: Record<string, string> = {
                'VSP': 'bg-blue-600',
                'VSP Choice': 'bg-blue-600',
                'EyeMed': 'bg-emerald-600',
                'Spectera': 'bg-purple-600',
              }
              const bgColor = carrierColors[authResult.carrier] || 'bg-gray-600'

              return (
                <div className={`${bgColor} rounded-2xl p-6 text-white`}>
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {authResult.carrier.toUpperCase()} RECOGNIZED
                      </div>
                      <div className="text-white/80">
                        {authResult.planName || 'Insurance plan detected'} • {Math.round((authResult.confidenceScore || 0) * 100)}% confidence
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Show results for each document */}
            {processingResults.map((result, index) => (
              <Card key={index} className={result.success ? '' : 'border-destructive/50'}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {result.slot === 'authorization' ? (
                      <ClipboardList className="h-5 w-5 text-primary" />
                    ) : (
                      <Glasses className="h-5 w-5 text-primary" />
                    )}
                    <CardTitle className="text-lg">
                      {result.slot === 'authorization' ? 'Authorization Form' : 'Lens Enhancement Form'}
                    </CardTitle>
                    {result.success ? (
                      <Badge variant="default" className="ml-auto bg-green-600">Processed</Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-auto">Failed</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {result.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">Carrier:</span>
                        <span className="font-medium">{result.carrier || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">Plan:</span>
                        <span className="font-medium">{result.planName || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="font-medium">{Math.round((result.confidenceScore || 0) * 100)}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-destructive text-sm">{result.error}</div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Verify/Reject buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleReset}>
                Reject & Start Over
              </Button>
              <Button onClick={handleVerify} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify & Save
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-2xl">Documents Verified!</CardTitle>
              <CardDescription className="text-base">
                {uploadedDocuments.length} document{uploadedDocuments.length > 1 ? 's have' : ' has'} been processed and saved to{' '}
                <span className="font-semibold text-foreground">
                  {selectedCustomer?.firstName} {selectedCustomer?.lastName}
                </span>&apos;s record.
              </CardDescription>
              <div className="flex justify-center gap-3 pt-4">
                <Button onClick={handleReset}>
                  <Upload className="h-4 w-4 mr-2" />
                  Scan More Documents
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = `/customers/${selectedCustomer?.id}`}
                >
                  View Customer Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  )
}
