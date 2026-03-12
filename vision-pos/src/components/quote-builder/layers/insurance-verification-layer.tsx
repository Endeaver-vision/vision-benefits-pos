'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  DollarSign,
  Eye,
  Glasses,
  X,
  FileText,
  RefreshCw,
  ExternalLink,
  Clock
} from 'lucide-react'
import { useQuotePricingContext, SavedPriceListVersion } from '@/contexts/quote-pricing-context'
import { AuthorizationEditor } from '@/components/quote-builder/authorization-editor'
import { InsuranceSummary } from '@/components/quote-builder/insurance-summary'

interface PriceListVersionSummary {
  id: string
  version: number
  versionLabel: string
  insuranceCarrier: string
  planName: string | null
  active: boolean
  createdAt: string
  itemCount: number
}

interface InsuranceVerificationLayerProps {
  customerId: string
  customerName: string
  onNext: () => void
  onBack: () => void
}

type CarrierType = 'vsp' | 'eyemed' | 'spectera' | 'self-pay'

// 48-hour staleness threshold in milliseconds
const STALE_THRESHOLD_HOURS = 48
const STALE_THRESHOLD_MS = STALE_THRESHOLD_HOURS * 60 * 60 * 1000

/**
 * Check if authorization is stale (older than 48 hours)
 */
function isAuthorizationStale(lastVerified: string | null | undefined): boolean {
  if (!lastVerified) return true
  const lastVerifiedDate = new Date(lastVerified)
  const hoursSinceVerified = (Date.now() - lastVerifiedDate.getTime()) / (1000 * 60 * 60)
  return hoursSinceVerified > STALE_THRESHOLD_HOURS
}

/**
 * Format the "last verified" time for display
 */
function formatLastVerified(lastVerified: string | null | undefined): string {
  if (!lastVerified) return 'Unknown'
  const date = new Date(lastVerified)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours === 1) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  // Format as date for older verifications
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

interface VerificationResult {
  success: boolean
  carrier?: string
  planName?: string
  memberId?: string
  examCopay?: number
  materialsCopay?: number
  frameAllowance?: number
  contactAllowance?: number
  message?: string
}

export function InsuranceVerificationLayer({
  customerId,
  customerName,
  onNext,
  onBack
}: InsuranceVerificationLayerProps) {
  const router = useRouter()

  // Get authorization from pricing context
  const {
    authorization,
    authorizationLoading,
    setCustomer,
    refreshAuthorization,
    useSavedPriceList,
    activePriceListVersion,
    enableSavedPriceListMode,
    disableSavedPriceListMode
  } = useQuotePricingContext()

  // Local state
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierType | null>(null)
  const [memberId, setMemberId] = useState('')
  const [groupNumber, setGroupNumber] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [isSelfPay, setIsSelfPay] = useState(false)
  const [isChangingInsurance, setIsChangingInsurance] = useState(false)

  // Track the authorization ID to detect when a NEW authorization comes in
  const [lastAuthId, setLastAuthId] = useState<string | null>(null)

  // Saved price list versions
  const [priceListVersions, setPriceListVersions] = useState<PriceListVersionSummary[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)

  // Initialize from existing authorization
  useEffect(() => {
    if (authorization) {
      // Only run initialization logic if this is a different authorization
      const isNewAuth = authorization.id !== lastAuthId

      if (isNewAuth) {
        setLastAuthId(authorization.id)
        setSelectedCarrier(authorization.carrier.toLowerCase() as CarrierType)
        setVerificationResult({
          success: true,
          carrier: authorization.carrier,
          planName: authorization.planName,
          examCopay: authorization.examCopay || undefined,
          materialsCopay: authorization.materialsCopay || undefined,
          frameAllowance: authorization.frameAllowance || undefined,
          contactAllowance: authorization.contactAllowance || undefined,
        })
        // If we were changing insurance and got a NEW one, exit change mode
        if (isChangingInsurance) {
          setIsChangingInsurance(false)
        }
      }
    }
  }, [authorization, isChangingInsurance, lastAuthId])

  // Sync customer with pricing context
  useEffect(() => {
    if (customerId && customerName) {
      setCustomer(customerId, customerName)
    }
  }, [customerId, customerName, setCustomer])

  // Fetch saved price list versions for this customer
  useEffect(() => {
    if (!customerId) return

    const fetchVersions = async () => {
      setVersionsLoading(true)
      try {
        const response = await fetch(`/api/customers/${customerId}/price-list/versions`)
        const data = await response.json()
        if (data.success && data.versions) {
          setPriceListVersions(data.versions)
        }
      } catch (error) {
        console.error('Failed to fetch price list versions:', error)
      } finally {
        setVersionsLoading(false)
      }
    }

    fetchVersions()
  }, [customerId])

  // Handle selecting a saved price list version
  const handleSelectPriceListVersion = async (versionId: string) => {
    if (versionId === 'none') {
      disableSavedPriceListMode()
    } else {
      await enableSavedPriceListMode(customerId, versionId)
    }
  }

  const handleVerifyInsurance = async () => {
    if (!selectedCarrier || selectedCarrier === 'self-pay') {
      setIsSelfPay(true)
      setVerificationResult({
        success: true,
        message: 'Self-pay selected - no insurance verification needed'
      })
      return
    }

    if (!memberId.trim()) {
      setVerificationResult({
        success: false,
        message: 'Please enter a member ID'
      })
      return
    }

    setIsVerifying(true)
    setVerificationResult(null)

    try {
      // Call insurance validation API
      const response = await fetch('/api/insurance/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          carrier: selectedCarrier,
          memberId: memberId.trim(),
          groupNumber: groupNumber.trim() || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        setVerificationResult({
          success: true,
          carrier: data.carrier,
          planName: data.planName,
          memberId: data.memberId,
          examCopay: data.examCopay,
          materialsCopay: data.materialsCopay,
          frameAllowance: data.frameAllowance,
          contactAllowance: data.contactAllowance,
        })
      } else {
        setVerificationResult({
          success: false,
          message: data.error || 'Insurance verification failed. Please check the information and try again.'
        })
      }
    } catch (error) {
      console.error('Verification error:', error)
      setVerificationResult({
        success: false,
        message: 'Unable to verify insurance. Please try again or proceed with self-pay.'
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSelfPay = () => {
    setSelectedCarrier('self-pay')
    setIsSelfPay(true)
    setShowManualEntry(false)
    setVerificationResult({
      success: true,
      message: 'Self-pay selected - retail pricing will be used'
    })
  }

  // Navigate to scanner page with return URL (includes customerId for persistence)
  const handleOpenScanner = () => {
    const returnUrl = encodeURIComponent(`/quote-builder?customerId=${customerId}`)
    const encodedName = encodeURIComponent(customerName)
    router.push(`/scanner?customerId=${customerId}&customerName=${encodedName}&returnTo=${returnUrl}`)
  }

  // Handle changing insurance - show options even when authorization exists
  const handleChangeInsurance = () => {
    setIsChangingInsurance(true)
    setVerificationResult(null)
    setSelectedCarrier(null)
    setMemberId('')
    setGroupNumber('')
    setIsSelfPay(false)
  }

  // Cancel changing insurance - go back to showing current authorization
  const handleCancelChangeInsurance = () => {
    setIsChangingInsurance(false)
    setShowManualEntry(false)
  }

  const canProceed = verificationResult?.success || authorization || isSelfPay

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5 text-blue-400" />
            Insurance Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/70">
            Verify the patient's insurance to calculate accurate pricing and benefits.
          </p>
        </CardContent>
      </Card>

      {/* Current Authorization Status */}
      {authorizationLoading ? (
        <Card className="glass-card border-white/20">
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-white/70">Checking existing insurance authorization...</p>
          </CardContent>
        </Card>
      ) : authorization && !isChangingInsurance ? (
        <Card className={`glass-card ${isAuthorizationStale(authorization.lastVerified) ? 'border-yellow-400/30' : 'border-emerald-400/30'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Active Authorization Found
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Last Verified Badge */}
                <Badge variant="outline" className="border-white/30 text-white/70">
                  <Clock className="h-3 w-3 mr-1" />
                  Verified {formatLastVerified(authorization.lastVerified)}
                </Badge>
                <Badge className="bg-emerald-500/30 text-emerald-300">
                  {authorization.carrier.toUpperCase()}
                </Badge>
                <AuthorizationEditor
                  customerId={customerId}
                  authorization={{
                    id: authorization.id,
                    carrier: authorization.carrier,
                    planName: authorization.planName,
                    examCopay: authorization.examCopay,
                    materialsCopay: authorization.materialsCopay,
                    frameAllowance: authorization.frameAllowance,
                    frameOverageDiscount: authorization.frameOverageDiscount,
                    contactAllowance: authorization.contactAllowance,
                  }}
                  onUpdate={() => {
                    // Refresh authorization data after update
                    refreshAuthorization()
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Staleness Warning Banner */}
            {isAuthorizationStale(authorization.lastVerified) && (
              <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-yellow-300 text-sm font-medium">
                    Insurance benefits may be outdated
                  </p>
                  <p className="text-yellow-200/70 text-xs">
                    Last verified {formatLastVerified(authorization.lastVerified)}. Consider re-scanning for the latest benefits.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenScanner}
                  className="border-yellow-400/50 text-yellow-300 hover:bg-yellow-500/20"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Re-scan
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-white/60 mb-1">Plan Name</div>
                <div className="text-white font-medium">{authorization.planName}</div>
              </div>
              {authorization.examCopay !== null && (
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-xs text-white/60 mb-1 flex items-center gap-1">
                    <Eye className="h-3 w-3" /> Exam Copay
                  </div>
                  <div className="text-emerald-400 font-bold text-lg">
                    ${authorization.examCopay}
                  </div>
                </div>
              )}
              {authorization.materialsCopay !== null && (
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-xs text-white/60 mb-1 flex items-center gap-1">
                    <Glasses className="h-3 w-3" /> Materials Copay
                  </div>
                  <div className="text-emerald-400 font-bold text-lg">
                    ${authorization.materialsCopay}
                  </div>
                </div>
              )}
              {authorization.frameAllowance !== null && (
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-xs text-white/60 mb-1">Frame Allowance</div>
                  <div className="text-emerald-400 font-bold text-lg">
                    ${authorization.frameAllowance}
                  </div>
                </div>
              )}
              {authorization.contactAllowance !== null && (
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-xs text-white/60 mb-1">Contact Allowance</div>
                  <div className="text-emerald-400 font-bold text-lg">
                    ${authorization.contactAllowance}
                  </div>
                </div>
              )}
              {authorization.contactFittingCopay !== null && authorization.contactFittingCopay !== undefined && (
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-xs text-white/60 mb-1">CL Fitting Copay</div>
                  <div className="text-emerald-400 font-bold text-lg">
                    ${authorization.contactFittingCopay}
                  </div>
                </div>
              )}
            </div>

            {/* Tier Details - Expandable Insurance Summary */}
            <InsuranceSummary customerId={customerId} className="mt-4" />

            {/* Saved Price List Version Selector */}
            {priceListVersions.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-400/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-blue-400" />
                      <span className="font-medium text-white">Use Saved Price List</span>
                    </div>
                    <p className="text-sm text-white/60">
                      Apply pre-calculated prices from a previously saved version
                    </p>
                  </div>
                  <Select
                    value={activePriceListVersion?.id || 'none'}
                    onValueChange={handleSelectPriceListVersion}
                  >
                    <SelectTrigger className="w-56 bg-white/10 border-blue-400/50 text-white">
                      <SelectValue placeholder="Select version..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Dynamic Pricing</SelectItem>
                      {priceListVersions.map((version) => (
                        <SelectItem key={version.id} value={version.id}>
                          {version.versionLabel} - {version.insuranceCarrier}
                          {version.active && ' (Active)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {useSavedPriceList && activePriceListVersion && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                    <span className="text-blue-300">
                      Using {activePriceListVersion.versionLabel} prices
                    </span>
                    <Badge variant="outline" className="ml-2 text-blue-300 border-blue-400/50">
                      {activePriceListVersion.carrier}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={onBack} variant="outline" className="border-white/30 text-white">
                Back
              </Button>
              <Button
                variant="outline"
                onClick={handleChangeInsurance}
                className="border-yellow-400/50 text-yellow-300 hover:bg-yellow-500/20"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Change Insurance
              </Button>
              <Button onClick={onNext} className="flex-1">
                Continue with This Insurance
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Changing Insurance Banner */}
          {isChangingInsurance && authorization && (
            <Card className="glass-card border-yellow-400/30 bg-yellow-500/10">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-white font-medium">Changing Insurance</p>
                      <p className="text-sm text-white/60">
                        Current: {authorization.carrier.toUpperCase()} - {authorization.planName}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelChangeInsurance}
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Authorization - Show Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scan Document Option */}
            <Card
              className="glass-card cursor-pointer transition-colors border-white/20 hover:border-emerald-400/50"
              onClick={handleOpenScanner}
            >
              <CardContent className="py-8 text-center">
                <Shield className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center justify-center gap-2">
                  Scan Insurance Document
                  <ExternalLink className="h-4 w-4 text-white/40" />
                </h3>
                <p className="text-sm text-white/60">
                  Opens scanner with review & verification
                </p>
                <p className="text-xs text-white/50 mt-2">
                  Upload authorization and benefit documents
                </p>
              </CardContent>
            </Card>

            {/* Manual Entry Option */}
            <Card
              className={`glass-card cursor-pointer transition-colors ${
                showManualEntry ? 'border-blue-400' : 'border-white/20 hover:border-blue-400/50'
              }`}
              onClick={() => setShowManualEntry(true)}
            >
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Enter Manually</h3>
                <p className="text-sm text-white/60">
                  Type in insurance carrier and member information
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Manual Entry Form */}
          {showManualEntry && (
            <Card className="glass-card border-blue-400/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white">Enter Insurance Information</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowManualEntry(false)}
                    className="text-white/60 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Insurance Carrier</Label>
                    <Select
                      value={selectedCarrier || ''}
                      onValueChange={(value) => setSelectedCarrier(value as CarrierType)}
                    >
                      <SelectTrigger className="bg-white/10 border-white/30 text-white">
                        <SelectValue placeholder="Select carrier..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vsp">VSP</SelectItem>
                        <SelectItem value="eyemed">EyeMed</SelectItem>
                        <SelectItem value="spectera">Spectera</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Member ID</Label>
                    <Input
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      placeholder="Enter member ID..."
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Group Number (Optional)</Label>
                    <Input
                      value={groupNumber}
                      onChange={(e) => setGroupNumber(e.target.value)}
                      placeholder="Enter group number..."
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>

                {/* Verification Result */}
                {verificationResult && (
                  <div className={`p-4 rounded-lg ${
                    verificationResult.success
                      ? 'bg-emerald-500/20 border border-emerald-400/50'
                      : 'bg-red-500/20 border border-red-400/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      {verificationResult.success ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      )}
                      <span className={verificationResult.success ? 'text-emerald-300' : 'text-red-300'}>
                        {verificationResult.success
                          ? verificationResult.planName || 'Insurance verified'
                          : verificationResult.message}
                      </span>
                    </div>

                    {verificationResult.success && verificationResult.examCopay !== undefined && (
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-white/60">Exam Copay:</span>
                          <span className="ml-2 text-emerald-300 font-medium">
                            ${verificationResult.examCopay}
                          </span>
                        </div>
                        {verificationResult.materialsCopay !== undefined && (
                          <div>
                            <span className="text-white/60">Materials:</span>
                            <span className="ml-2 text-emerald-300 font-medium">
                              ${verificationResult.materialsCopay}
                            </span>
                          </div>
                        )}
                        {verificationResult.frameAllowance !== undefined && (
                          <div>
                            <span className="text-white/60">Frame:</span>
                            <span className="ml-2 text-emerald-300 font-medium">
                              ${verificationResult.frameAllowance}
                            </span>
                          </div>
                        )}
                        {verificationResult.contactAllowance !== undefined && (
                          <div>
                            <span className="text-white/60">Contacts:</span>
                            <span className="ml-2 text-emerald-300 font-medium">
                              ${verificationResult.contactAllowance}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleVerifyInsurance}
                    disabled={!selectedCarrier || selectedCarrier === 'self-pay' || isVerifying}
                    className="flex-1"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Verify Insurance
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Self-Pay Option */}
          <Card
            className={`glass-card cursor-pointer transition-colors ${
              isSelfPay
                ? 'border-yellow-400/50 bg-yellow-500/10'
                : 'border-white/20 hover:border-yellow-400/30'
            }`}
            onClick={handleSelfPay}
          >
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">Self-Pay / No Insurance</h3>
                  <p className="text-sm text-white/60">
                    Patient will pay retail prices without insurance benefits
                  </p>
                </div>
                {isSelfPay && (
                  <CheckCircle className="h-6 w-6 text-yellow-400" />
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Navigation */}
      {!authorization && (
        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline" className="border-white/30 text-white">
            Back
          </Button>
          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="flex-1"
          >
            {canProceed ? 'Continue to Exam Services' : 'Verify Insurance to Continue'}
          </Button>
        </div>
      )}
    </div>
  )
}
