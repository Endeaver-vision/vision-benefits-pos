'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
  Glasses,
  ArrowLeft,
  Timer,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Code
} from 'lucide-react'

type ScannerStep = 'select-customer' | 'upload' | 'processing' | 'complete'

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
  fileName?: string
  detectedType?: string
  timing?: {
    ocrMs: number
    gptMs: number
    totalMs: number
  }
}

function ScannerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // URL parameters for return flow
  const returnTo = searchParams.get('returnTo')
  const preselectedCustomerId = searchParams.get('customerId')
  const preselectedCustomerName = searchParams.get('customerName')

  const [step, setStep] = useState<ScannerStep>('select-customer')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([])
  const [processingStatus, setProcessingStatus] = useState<{auth: string, lens: string}>({auth: 'pending', lens: 'pending'})
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)
  const [processingElapsed, setProcessingElapsed] = useState(0)
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null)
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set())
  const [showRawData, setShowRawData] = useState(false)

  // Auto-load customer if customerId is provided in URL
  useEffect(() => {
    if (preselectedCustomerId && !selectedCustomer) {
      setIsLoadingCustomer(true)
      fetch(`/api/customers/${preselectedCustomerId}`)
        .then(res => res.json())
        .then(data => {
          // API returns { success: true, data: customer }
          const customerData = data.data || data.customer
          if (data.success && customerData) {
            const customer: Customer = {
              id: customerData.id,
              firstName: customerData.firstName,
              lastName: customerData.lastName,
              email: customerData.email,
              phone: customerData.phone,
              insuranceCarrier: customerData.insuranceCarrier,
            }
            setSelectedCustomer(customer)
            setStep('upload')
          } else {
            setError('Customer not found. Please select manually.')
          }
        })
        .catch(err => {
          console.error('Failed to load customer:', err)
          setError('Failed to load customer. Please select manually.')
        })
        .finally(() => {
          setIsLoadingCustomer(false)
        })
    }
  }, [preselectedCustomerId, selectedCustomer])

  // Processing timer - updates every 100ms while processing or verifying
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if ((step === 'processing' || step === 'verifying') && processingStartTime) {
      interval = setInterval(() => {
        setProcessingElapsed(Math.floor((Date.now() - processingStartTime) / 1000))
      }, 100)
    } else {
      setProcessingElapsed(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [step, processingStartTime])

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
    setProcessingStartTime(Date.now())
    setProcessingElapsed(0)
    setProcessingStatus({auth: 'processing', lens: documents.length > 1 ? 'processing' : 'skipped'})

    // Process all documents in PARALLEL for faster processing
    const processPromises = documents.map(async (doc): Promise<ProcessingResult> => {
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
          console.log(`[Scanner] ${doc.slot} API returned success at ${Date.now()}`)
          setProcessingStatus(prev => ({
            ...prev,
            [doc.slot === 'authorization' ? 'auth' : 'lens']: 'complete'
          }))
          return {
            success: true,
            carrier: result.carrier,
            planName: result.planName,
            confidenceScore: result.confidenceScore,
            extractedData: result.extractedData,
            slot: doc.slot,
            fileName: doc.fileName,
            detectedType: doc.detectedType,
            timing: result.timing,
          }
        } else {
          setProcessingStatus(prev => ({
            ...prev,
            [doc.slot === 'authorization' ? 'auth' : 'lens']: 'error'
          }))
          return {
            success: false,
            error: result.error || 'Processing failed',
            slot: doc.slot,
          }
        }
      } catch (err) {
        setProcessingStatus(prev => ({
          ...prev,
          [doc.slot === 'authorization' ? 'auth' : 'lens']: 'error'
        }))
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Processing failed',
          slot: doc.slot,
        }
      }
    })

    // Wait for all documents to finish processing in parallel
    console.log('[Scanner] Waiting for Promise.all...')
    const results = await Promise.all(processPromises)
    console.log('[Scanner] Promise.all complete, setting results...')

    setProcessingResults(results)
    console.log('[Scanner] Results set, checking auth...')

    // Check if at least one document was processed successfully
    const successfulResults = results.filter(r => r.success)
    if (successfulResults.length === 0) {
      console.log('[Scanner] All documents failed')
      setError('All documents failed to process')
      setIsProcessing(false)
      setProcessingStartTime(null)
      return
    }

    // AUTO-SAVE: Verify documents immediately (no button click needed)
    console.log('[Scanner] Auto-saving - verifying documents...')

    // Sort docs: AUTH first, then LENS (so AUTH creates authorization, LENS merges into it)
    const sortedDocs = [...documents].sort((a, b) => {
      if (a.slot === 'authorization' && b.slot !== 'authorization') return -1
      if (a.slot !== 'authorization' && b.slot === 'authorization') return 1
      return 0
    })

    for (const doc of sortedDocs) {
      // Only verify successfully processed docs
      const docResult = results.find(r => r.slot === doc.slot)
      if (!docResult?.success) continue

      try {
        const response = await fetch(`/api/documents/${doc.documentId}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verifiedBy: 'scanner-ui-auto',
            verificationNotes: `Auto-verified via scanner interface (${doc.slot})`,
          }),
        })

        const verifyResult = await response.json()
        if (!verifyResult.success) {
          console.error(`[Scanner] Failed to save ${doc.slot}:`, verifyResult.error)
        } else {
          console.log(`[Scanner] Saved ${doc.slot} successfully`)
        }
      } catch (err) {
        console.error(`[Scanner] Error saving ${doc.slot}:`, err)
      }
    }

    console.log('[Scanner] Auto-save complete, moving to complete')
    setStep('complete')
    setIsProcessing(false)
    setProcessingStartTime(null)
  }, [])


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
      subtitle={returnTo ? `Scanning for ${preselectedCustomerName || 'customer'}` : "Scan and process insurance cards and authorizations"}
      actions={
        <div className="flex gap-2">
          {returnTo && (
            <Button variant="outline" size="sm" onClick={() => router.push(returnTo)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quote
            </Button>
          )}
          {step !== 'select-customer' && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
          )}
        </div>
      }
    >
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Loading customer from URL */}
        {isLoadingCustomer && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Loading customer...</span>
            </CardContent>
          </Card>
        )}

        {!isLoadingCustomer && getStepIndicator()}

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
              {/* Two-Phase Progress Timer with Fun Facts */}
              {(() => {
                // Phase 1: 0-30s "Extracting insurance data"
                // Phase 2: 30s+ "Building price list"
                const phase1Duration = 30
                const phase2Duration = 35
                const isPhase1 = processingElapsed < phase1Duration
                const phase2Elapsed = Math.max(0, processingElapsed - phase1Duration)

                // Fun facts for Phase 1 - Insurance/Industry facts (doubled)
                const phase1Facts = [
                  "The first eyeglasses were invented in Italy around 1286",
                  "About 75% of adults use some form of vision correction",
                  "Blue light blocking lenses can reduce digital eye strain by up to 50%",
                  "The average person blinks about 15-20 times per minute",
                  "Polarized lenses were invented by Edwin Land in 1936",
                  "Your eyes can distinguish approximately 10 million different colors",
                  "Progressive lenses were invented in 1959 by Bernard Maitenaz",
                  "Anti-reflective coatings can improve light transmission by up to 99%",
                  "The human eye can detect a candle flame from 1.6 miles away",
                  "High-index lenses can be up to 50% thinner than standard plastic",
                  "The cornea is the only tissue in the body that contains no blood vessels",
                  "Newborns don't produce tears until they are 4-13 weeks old",
                  "Eyes are the second most complex organ after the brain",
                  "The eye muscles are the most active muscles in the body",
                  "Reading in dim light won't damage your eyes, but it can cause eye strain",
                  "80% of vision problems worldwide are avoidable or curable",
                  "The eye can process 36,000 pieces of information every hour",
                  "Brown is the most common eye color in the world",
                  "Heterochromia is when someone has two different colored eyes",
                  "Your eyes focus on 50 different objects every second"
                ]

                // Fun facts for Phase 2 - Sales/Product tips (doubled)
                const phase2Facts = [
                  "Photochromic lenses now activate up to 3x faster than 10 years ago",
                  "Patients with digital device use benefit most from blue light protection",
                  "Frame adjustments within 30 days increase customer satisfaction by 40%",
                  "Scratch-resistant coatings can extend lens life by 2-3 years",
                  "UV protection is essential even on cloudy days - 80% of rays penetrate clouds",
                  "Second pair sales increase average ticket value by 35%",
                  "Premium AR coatings reduce glare by up to 99.5%",
                  "Polycarbonate is 10x more impact-resistant than standard plastic",
                  "Proper pupillary distance measurement improves comfort significantly",
                  "Trivex lenses offer the best combination of clarity and impact resistance",
                  "Varilux progressives have been the #1 progressive lens brand for 60+ years",
                  "Crizal coatings block harmful blue-violet light while letting beneficial light through",
                  "Children under 18 should always have polycarbonate or Trivex lenses for safety",
                  "Most people need reading glasses by age 40-45 due to presbyopia",
                  "Transitions lenses block 100% of UVA and UVB rays",
                  "Frame material affects weight, durability, and adjustability",
                  "Titanium frames are the lightest and most durable metal option",
                  "Annual eye exams can detect early signs of diabetes and high blood pressure",
                  "Digital eye strain affects 65% of Americans who use screens daily",
                  "Proper lens cleaning extends AR coating life significantly"
                ]

                // Rotate facts every 10 seconds (slowed down from 5)
                const factIndex = Math.floor(processingElapsed / 10)
                const currentFact = isPhase1
                  ? phase1Facts[factIndex % phase1Facts.length]
                  : phase2Facts[Math.floor(phase2Elapsed / 10) % phase2Facts.length]

                // Calculate progress for current phase
                const phaseProgress = isPhase1
                  ? Math.min((processingElapsed / phase1Duration) * 100, 100)
                  : Math.min((phase2Elapsed / phase2Duration) * 100, 95)

                const phaseRemaining = isPhase1
                  ? Math.max(phase1Duration - processingElapsed, 0)
                  : Math.max(phase2Duration - phase2Elapsed, 0)

                return (
                  <div className="space-y-4 mb-4">
                    {/* Phase Indicator */}
                    <div className="flex items-center justify-center gap-3">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                        isPhase1 ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        <div className={`h-2 w-2 rounded-full ${isPhase1 ? 'bg-blue-400' : 'bg-emerald-400'} animate-pulse`} />
                        {isPhase1 ? 'Phase 1: Extracting Insurance Data' : 'Phase 2: Building Price List'}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{isPhase1 ? processingElapsed : phase2Elapsed}s</span>
                        <span>{phaseRemaining > 0 ? `~${phaseRemaining}s remaining` : 'Almost done...'}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ease-linear rounded-full ${
                            isPhase1 ? 'bg-blue-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${phaseProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Phase Steps */}
                    <div className="flex justify-center gap-2">
                      <div className={`flex items-center gap-1.5 text-xs ${
                        isPhase1 ? 'text-blue-400' : 'text-emerald-400'
                      }`}>
                        <CheckCircle className={`h-3.5 w-3.5 ${!isPhase1 ? 'text-emerald-400' : 'text-blue-400/50'}`} />
                        <span className={!isPhase1 ? 'text-emerald-400' : 'text-muted-foreground'}>Extract</span>
                      </div>
                      <div className="text-muted-foreground/50">→</div>
                      <div className={`flex items-center gap-1.5 text-xs ${
                        !isPhase1 ? 'text-emerald-400' : 'text-muted-foreground/50'
                      }`}>
                        <div className={`h-3.5 w-3.5 rounded-full border ${
                          !isPhase1 ? 'border-emerald-400 bg-emerald-400/20' : 'border-muted-foreground/30'
                        } flex items-center justify-center`}>
                          {!isPhase1 && <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                        </div>
                        <span>Build Prices</span>
                      </div>
                      <div className="text-muted-foreground/50">→</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                        <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
                        <span>Complete</span>
                      </div>
                    </div>

                    {/* Fun Fact Card */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">💡</div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Did you know?</div>
                          <div className="text-sm text-white/90">{currentFact}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
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
                      {(doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'processing' && 'AI is extracting insurance data...'}
                      {(doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'complete' && '✓ Extraction complete - ready for review'}
                      {(doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'error' && 'Processing failed'}
                      {(doc.slot === 'authorization' ? processingStatus.auth : processingStatus.lens) === 'pending' && 'Queued for processing...'}
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

        {step === 'complete' && (
          <div className="space-y-6">
            {/* Success Banner */}
            {(() => {
              const authResult = processingResults.find(r => r.slot === 'authorization' && r.success)
              return (
                <div className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 border border-emerald-500/30 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="h-7 w-7 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {authResult?.carrier?.toUpperCase() || 'INSURANCE'} RECOGNIZED
                      </h2>
                      <p className="text-white/70">
                        {processingResults.filter(r => r.success).length} document{processingResults.filter(r => r.success).length > 1 ? 's' : ''} processed and saved to{' '}
                        <span className="font-semibold text-white">
                          {selectedCustomer?.firstName} {selectedCustomer?.lastName}
                        </span>
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-2xl font-bold text-emerald-400">
                        {Math.round((authResult?.confidenceScore || 0) * 100)}%
                      </div>
                      <div className="text-xs text-white/60">confidence</div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Processing Times */}
            {processingResults.some(r => r.timing) && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Timer className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-medium text-white/90">Processing Times</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {processingResults.filter(r => r.timing).map((result, index) => (
                      <div key={index} className="flex flex-col gap-1">
                        <div className="text-xs text-white/60">
                          {result.detectedType || (result.slot === 'authorization' ? 'Authorization Form' : 'Lens Enhancement Form')}
                        </div>
                        <div className="flex gap-3 text-sm">
                          <span className="text-blue-400">
                            OCR: {((result.timing?.ocrMs || 0) / 1000).toFixed(1)}s
                          </span>
                          <span className="text-purple-400">
                            AI: {((result.timing?.gptMs || 0) / 1000).toFixed(1)}s
                          </span>
                          <span className="text-emerald-400 font-medium">
                            Total: {((result.timing?.totalMs || 0) / 1000).toFixed(1)}s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Benefits Summary - Clean Table Format */}
            {(() => {
              // Get data from both documents
              const authResult = processingResults.find(r => r.slot === 'authorization' && r.success)
              const lensResult = processingResults.find(r => r.slot === 'lens-enhancement' && r.success)

              const authData = authResult?.extractedData as Record<string, unknown> | undefined
              const lensData = lensResult?.extractedData as Record<string, unknown> | undefined

              // Helper to safely get nested values
              const getValue = (obj: unknown, path: string): unknown => {
                if (!obj || typeof obj !== 'object') return null
                const parts = path.split('.')
                let current: unknown = obj
                for (const part of parts) {
                  if (!current || typeof current !== 'object') return null
                  current = (current as Record<string, unknown>)[part]
                }
                if (current && typeof current === 'object' && 'value' in current) {
                  return (current as {value: unknown}).value
                }
                return current
              }

              // Get copays from AUTH document
              const copays = authData?.copays as Record<string, unknown> | undefined
              const examCopay = getValue(copays, 'examCopay')
              const materialsCopay = getValue(copays, 'materialsCopay')

              // Get frame info from AUTH document
              const frame = authData?.frame as Record<string, unknown> | undefined
              const frameAllowance = getValue(frame, 'allowances.nonAltairMarchonFrameAllowance.allowance')
              const overageDiscount = getValue(frame, 'allowances.nonAltairMarchonFrameAllowance.overageDiscount')

              // Get contact lens info from AUTH document
              const contacts = authData?.contacts as Record<string, unknown> | undefined
              const clAllowance = getValue(contacts, 'clExamAndMaterialsAllowance')
              // VSP uses clExamCopay for CL fitting, EyeMed may use clFit.standardCost
              let clFittingCopay = getValue(contacts, 'clExamCopay')
              // If clExamCopay is a string like "lesser of $60 copay...", extract the number
              if (typeof clFittingCopay === 'string') {
                const match = clFittingCopay.match(/\$(\d+)/)
                clFittingCopay = match ? parseInt(match[1], 10) : null
              }
              // Fallback to clFittingCopay if it exists (for other carriers)
              if (clFittingCopay === null) {
                clFittingCopay = getValue(contacts, 'clFittingCopay')
              }

              // Get lens pricing from LENS ENHANCEMENT document (this has the real prices!)
              // Check both root level and inside plan (GPT sometimes nests it differently)
              const lensEnhancementsRoot = lensData?.vspLensEnhancements as Record<string, unknown> | undefined
              const lensEnhancementsPlan = (lensData?.plan as Record<string, unknown>)?.vspLensEnhancements as Record<string, unknown> | undefined
              const lensEnhancements = lensEnhancementsRoot || lensEnhancementsPlan
              const enhancementCodes = (lensEnhancements?.codes || []) as Array<{code: string, description: string, copaySingleVision: number | null, copayMultifocal: number | null}>

              // Get vspLensCharges for fallback pricing (GPT extracts prices here too)
              const lensCharges = lensData?.vspLensCharges as Record<string, unknown> | undefined

              // VSP code to lensCharges mapping
              const codeToChargeMap: Record<string, { path: string, svKey?: string, mfKey?: string }> = {
                // Digital Single Vision (Eyezen, etc.)
                'BA': { path: 'digitalSingleVision.value', svKey: 'value' },
                // Progressives
                'KA': { path: 'progressives.standardK.plastic', mfKey: 'value' },
                'KE': { path: 'progressives.standardK.glass', mfKey: 'value' },
                'FA': { path: 'progressives.premiumF.plastic', mfKey: 'value' },
                'FE': { path: 'progressives.premiumF.glass', mfKey: 'value' },
                'JA': { path: 'progressives.premiumJ.plastic', mfKey: 'value' },
                'JE': { path: 'progressives.premiumJ.glass', mfKey: 'value' },
                'NA': { path: 'progressives.customN', mfKey: 'value' },
                'OA': { path: 'progressives.customO', mfKey: 'value' },
                // AR Coatings
                'QM': { path: 'coatings.arA.value' },
                'QT': { path: 'coatings.arC.value' },
                'QV': { path: 'coatings.arD.value' },
                // Materials
                'AD': { path: 'polycarbonate.baseSv.value', svKey: 'value', mfKey: 'polycarbonate.baseMulti.value' },
                'AB': { path: 'highIndex.trivex160Sv.value', svKey: 'value', mfKey: 'highIndex.trivex160Multi.value' },
                'AH': { path: 'highIndex.hi166Sv.value', svKey: 'value', mfKey: 'highIndex.hi166Multi.value' },
                'AJ': { path: 'highIndex.hi170Sv.value', svKey: 'value', mfKey: 'highIndex.hi170Multi.value' },
                // Photochromic
                'PR': { path: 'photochromic.plasticSv.value', svKey: 'value', mfKey: 'photochromic.plasticMulti.value' },
                // Polarized
                'DA': { path: 'polarized.plasticSv.value', svKey: 'value', mfKey: 'polarized.plasticMulti.value' },
                // Misc
                'SW': { path: 'misc.rimlessDrill.value' },
                'SP': { path: 'misc.edgePolish.value' },
                'LF': { path: 'misc.lightFilter.value' },
                'MN': { path: 'misc.tint.value' },
              }

              // Helper to get nested value from object
              const getNestedValue = (obj: unknown, path: string): number | null => {
                if (!obj || typeof obj !== 'object') return null
                const parts = path.split('.')
                let current: unknown = obj
                for (const part of parts) {
                  if (!current || typeof current !== 'object') return null
                  current = (current as Record<string, unknown>)[part]
                }
                if (typeof current === 'number') return current
                if (current && typeof current === 'object' && 'value' in current) {
                  return (current as { value: number }).value
                }
                return null
              }

              // Helper to get pricing from enhancement codes array, with fallback to lensCharges
              const getPrice = (code: string, type: 'sv' | 'mf'): number | null => {
                // First try enhancement codes
                const item = enhancementCodes.find(c => c.code === code)
                const codePrice = item ? (type === 'sv' ? item.copaySingleVision : item.copayMultifocal) : null
                if (codePrice !== null) return codePrice

                // Fallback to lensCharges mapping
                const mapping = codeToChargeMap[code]
                if (!mapping || !lensCharges) return null

                if (type === 'mf' && mapping.mfKey) {
                  // Try multifocal-specific path first
                  const mfValue = getNestedValue(lensCharges, mapping.mfKey)
                  if (mfValue !== null) return mfValue
                }
                // Fall back to main path
                return getNestedValue(lensCharges, mapping.path)
              }

              // Format price for table display
              const formatPrice = (price: number | null | undefined): string => {
                if (price === null || price === undefined) return '—'
                if (price === 0) return 'Covered'
                return `$${price}`
              }

              const isExpanded = expandedResults.has(0)
              const toggleExpanded = () => {
                const newSet = new Set(expandedResults)
                if (isExpanded) {
                  newSet.delete(0)
                } else {
                  newSet.add(0)
                }
                setExpandedResults(newSet)
              }

              if (!authResult && !lensResult) return null

              // Table row component for consistent styling
              const TableRow = ({ name, copay, isHeader = false }: { name: string, copay: string, isHeader?: boolean }) => (
                <tr className={isHeader ? 'border-b border-white/10' : 'hover:bg-white/5'}>
                  <td className={`py-2 px-3 ${isHeader ? 'font-semibold text-white/70 text-xs uppercase tracking-wide' : 'text-white/90'}`}>
                    {name}
                  </td>
                  <td className={`py-2 px-3 text-right ${isHeader ? 'font-semibold text-white/70 text-xs uppercase' : ''} ${
                    copay === 'Covered' ? 'text-emerald-400 font-medium' :
                    copay === '—' ? 'text-white/30' : 'text-amber-400 font-medium'
                  }`}>
                    {copay}
                  </td>
                </tr>
              )

              return (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                        <CardTitle className="text-base">Benefits Summary</CardTitle>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleExpanded}
                      >
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2">
                    {/* Benefits Overview - Always visible */}
                    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-5 gap-4 text-center">
                        <div>
                          <div className="text-[10px] text-white/50 uppercase tracking-wide">Exam</div>
                          <div className="text-lg font-bold text-emerald-400">
                            {examCopay !== null && examCopay !== undefined ? `$${examCopay}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-white/50 uppercase tracking-wide">Materials</div>
                          <div className="text-lg font-bold text-emerald-400">
                            {materialsCopay !== null && materialsCopay !== undefined ? `$${materialsCopay}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-white/50 uppercase tracking-wide">Frame</div>
                          <div className="text-lg font-bold text-emerald-400">
                            {frameAllowance !== null && frameAllowance !== undefined ? `$${frameAllowance}` : '—'}
                          </div>
                          {overageDiscount !== null && (
                            <div className="text-[9px] text-white/40">{overageDiscount}% off overage</div>
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] text-white/50 uppercase tracking-wide">Contacts</div>
                          <div className="text-lg font-bold text-emerald-400">
                            {clAllowance !== null && clAllowance !== undefined ? `$${clAllowance}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-white/50 uppercase tracking-wide">CL Fit</div>
                          <div className="text-lg font-bold text-emerald-400">
                            {clFittingCopay !== null && clFittingCopay !== undefined ? `$${clFittingCopay}` : '—'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Product Tables - Only shown when expanded */}
                    {isExpanded && enhancementCodes.length > 0 && (
                      <div className="space-y-4">
                        {/* LENS TYPE */}
                        <table className="w-full text-sm">
                          <thead>
                            <TableRow name="Lens Type" copay="Copay" isHeader />
                          </thead>
                          <tbody>
                            <TableRow name="Single Vision" copay="Covered" />
                            <TableRow name="Eyezen" copay={formatPrice(getPrice('BA', 'sv'))} />
                            <TableRow name="FT Bifocal" copay="Covered" />
                            <TableRow name="FT Trifocal" copay="Covered" />
                            <TableRow name="Varilux Comfort DRx" copay={formatPrice(getPrice('JA', 'mf'))} />
                            <TableRow name="Varilux Comfort Max" copay={formatPrice(getPrice('FA', 'mf'))} />
                            <TableRow name="Varilux X Design" copay={formatPrice(getPrice('OA', 'mf'))} />
                          </tbody>
                        </table>

                        {/* LENS MATERIAL */}
                        <table className="w-full text-sm">
                          <thead>
                            <TableRow name="Lens Material" copay="Copay" isHeader />
                          </thead>
                          <tbody>
                            <TableRow name="CR-39 (Plastic)" copay="Covered" />
                            <TableRow name="Polycarbonate" copay={formatPrice(getPrice('AD', 'mf'))} />
                            <TableRow name="Trivex" copay={formatPrice(getPrice('AB', 'mf'))} />
                            <TableRow name="1.67 High Index" copay={formatPrice(getPrice('AH', 'mf'))} />
                            <TableRow name="1.74 High Index" copay={formatPrice(getPrice('AJ', 'mf'))} />
                          </tbody>
                        </table>

                        {/* AR COATINGS */}
                        <table className="w-full text-sm">
                          <thead>
                            <TableRow name="AR Coatings - Crizal" copay="Copay" isHeader />
                          </thead>
                          <tbody>
                            <TableRow name="Crizal Sapphire HR" copay={formatPrice(getPrice('QV', 'mf'))} />
                            <TableRow name="Crizal Rock" copay={formatPrice(getPrice('QV', 'mf'))} />
                            <TableRow name="Crizal EZ Pro" copay={formatPrice(getPrice('QT', 'mf'))} />
                            <TableRow name="Crizal SunShield UV" copay={formatPrice(getPrice('QT', 'mf'))} />
                          </tbody>
                        </table>

                        {/* TRANSITIONS */}
                        <table className="w-full text-sm">
                          <thead>
                            <TableRow name="Transitions" copay="Copay" isHeader />
                          </thead>
                          <tbody>
                            <TableRow name="Transitions Gen S" copay={formatPrice(getPrice('PR', 'mf'))} />
                            <TableRow name="Transitions XtrActive" copay={formatPrice(getPrice('PR', 'mf'))} />
                          </tbody>
                        </table>

                        {/* POLARIZED */}
                        <table className="w-full text-sm">
                          <thead>
                            <TableRow name="Polarized" copay="Copay" isHeader />
                          </thead>
                          <tbody>
                            <TableRow name="Polarized" copay={formatPrice(getPrice('DA', 'mf'))} />
                          </tbody>
                        </table>

                        {/* MOUNT FEES */}
                        <table className="w-full text-sm">
                          <thead>
                            <TableRow name="Mount Fees" copay="Fee" isHeader />
                          </thead>
                          <tbody>
                            <TableRow name="Full Rim" copay="Covered" />
                            <TableRow name="Semi-Rimless" copay="$15" />
                            <TableRow name="Rimless Drill" copay={formatPrice(getPrice('SW', 'mf'))} />
                          </tbody>
                        </table>

                        {/* ADD-ONS */}
                        <table className="w-full text-sm">
                          <thead>
                            <TableRow name="Lens Add-ons" copay="Copay" isHeader />
                          </thead>
                          <tbody>
                            <TableRow name="Tint" copay={formatPrice(getPrice('MN', 'mf'))} />
                            <TableRow name="Essential Blue (Light Filter)" copay={formatPrice(getPrice('LF', 'mf'))} />
                            <TableRow name="Edge Polish" copay={formatPrice(getPrice('SP', 'mf'))} />
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })()}

            {/* Raw Data Viewer - For debugging and verification */}
            <Card className="bg-slate-900/50 border-slate-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-cyan-400" />
                    <CardTitle className="text-sm text-white/70">Raw Extracted Data</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRawData(!showRawData)}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    {showRawData ? 'Hide' : 'View JSON'}
                  </Button>
                </div>
              </CardHeader>
              {showRawData && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {processingResults.map((result, index) => (
                      <div key={index} className="space-y-2">
                        <div className="text-xs font-medium text-white/50 uppercase tracking-wide">
                          {result.slot === 'authorization' ? 'Authorization Document' : 'Lens Enhancement Document'}
                          {result.fileName && <span className="text-white/30 ml-2">({result.fileName})</span>}
                        </div>
                        <pre className="bg-black/50 rounded-lg p-4 text-xs text-green-400 overflow-x-auto max-h-96 overflow-y-auto">
                          {JSON.stringify(result.extractedData, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3 pt-4">
              {returnTo ? (
                <Button size="lg" onClick={() => router.push(returnTo)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Continue to Quote
                </Button>
              ) : (
                <>
                  <Button size="lg" onClick={() => router.push(`/customers/${selectedCustomer?.id}?tab=price-plan`)}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Benefits
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => router.push(`/quote-builder?customerId=${selectedCustomer?.id}`)}>
                    Continue to Quote
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}

export default function ScannerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ScannerContent />
    </Suspense>
  )
}
