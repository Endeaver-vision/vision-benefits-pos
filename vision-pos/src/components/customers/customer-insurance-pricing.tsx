'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Edit, Save, X, CreditCard, FileSearch, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import InsuranceSelector, { InsuranceData } from '@/components/insurance-selector'
import CustomerPricePlan from './customer-price-plan'
import { BenefitSummaryCard } from '@/components/insurance'
import { useToast } from '@/components/ui/use-toast'
import { InlineScanner } from '@/components/scanner'

interface Customer {
  id: string
  insuranceCarrier?: string | null
  memberId?: string | null
  groupNumber?: string | null
  eligibilityDate?: string | Date | null
}

interface AuthorizationData {
  id: string
  carrier: string
  planName: string
  patientName?: string
  memberId?: string
  groupNumber?: string
  examCopay: number | null
  materialsCopay: number | null
  frameAllowance: number | null
  frameAllowanceFeatured?: number | null
  contactAllowance: number | null
  expirationDate: string | null
}

interface CustomerInsurancePricingProps {
  customerId: string
  customer: Customer
  onUpdate?: () => void
}

interface BenefitData {
  carrier: string
  planYear: number
  examCopay: number
  examCovered: boolean
  examEligible: boolean
  examNextDate?: string
  materialsCopay: number
  materialsEligible: boolean
  materialsNextDate?: string
  frameAllowance: number
  frameAllowanceUsed: number
  frameAllowanceRemaining: number
  lensAllowance: number
  lensAllowanceUsed: number
  lensAllowanceRemaining: number
  contactAllowance: number
  contactAllowanceUsed: number
  contactAllowanceRemaining: number
  contactFittingCopay: number
  contactsEligible: boolean
  contactsNextDate?: string
}

export default function CustomerInsurancePricing({
  customerId,
  customer,
  onUpdate
}: CustomerInsurancePricingProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null)
  const [benefitData, setBenefitData] = useState<BenefitData | null>(null)
  const [loadingBenefits, setLoadingBenefits] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [authData, setAuthData] = useState<AuthorizationData | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(false)
  const [generatingPrices, setGeneratingPrices] = useState(false)
  const [pricePlanKey, setPricePlanKey] = useState(0) // Used to force refresh CustomerPricePlan
  const { toast } = useToast()

  useEffect(() => {
    // Initialize insurance data from customer
    if (customer) {
      setInsuranceData({
        carrier: customer.insuranceCarrier || 'None',
        memberId: customer.memberId || '',
        groupNumber: customer.groupNumber || '',
        eligibilityDate: customer.eligibilityDate
          ? new Date(customer.eligibilityDate).toISOString().split('T')[0]
          : ''
      })
    }
  }, [customer])

  // Function to fetch authorization data
  const fetchAuthorization = async () => {
    setLoadingAuth(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/authorization`)
      const data = await response.json()

      if (data.success && data.authorization) {
        setAuthData({
          id: data.authorization.id,
          carrier: data.authorization.carrier,
          planName: data.authorization.planName || 'Unknown Plan',
          patientName: data.authorization.patientName,
          memberId: data.authorization.memberId,
          groupNumber: data.authorization.groupNumber,
          examCopay: data.authorization.examCopay,
          materialsCopay: data.authorization.materialsCopay,
          frameAllowance: data.authorization.frameAllowance,
          frameAllowanceFeatured: data.authorization.frameAllowanceFeatured,
          contactAllowance: data.authorization.contactAllowance,
          expirationDate: data.authorization.expirationDate
        })
      } else {
        setAuthData(null)
      }
    } catch (error) {
      console.error('Error fetching authorization:', error)
      setAuthData(null)
    } finally {
      setLoadingAuth(false)
    }
  }

  // Fetch authorization data from authorization tables (VSP, EyeMed, Spectera)
  useEffect(() => {
    if (customerId) {
      fetchAuthorization()
    }
  }, [customerId])

  useEffect(() => {
    // Fetch benefit data if customer has insurance
    if (customer.insuranceCarrier && customer.insuranceCarrier !== 'None') {
      fetchBenefits()
    }
  }, [customer.insuranceCarrier, customerId])

  const fetchBenefits = async () => {
    setLoadingBenefits(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/benefits`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Benefits API error:', response.status, errorData)
        throw new Error(errorData.error || `Failed to fetch benefits (${response.status})`)
      }
      
      const data = await response.json()
      
      if (data.benefits) {
        setBenefitData({
          carrier: data.carrier,
          planYear: data.benefits.planYear,
          examCopay: data.benefits.examCopay,
          examCovered: data.benefits.examCovered,
          examEligible: true, // Default to eligible for now
          materialsCopay: data.benefits.materialsCopay,
          materialsEligible: true,
          frameAllowance: data.benefits.frameAllowance,
          frameAllowanceUsed: data.benefits.frameAllowanceUsed,
          frameAllowanceRemaining: data.benefits.frameAllowanceRemaining,
          lensAllowance: data.benefits.lensAllowance,
          lensAllowanceUsed: data.benefits.lensAllowanceUsed,
          lensAllowanceRemaining: data.benefits.lensAllowanceRemaining,
          contactAllowance: data.benefits.contactAllowance,
          contactAllowanceUsed: data.benefits.contactAllowanceUsed,
          contactAllowanceRemaining: data.benefits.contactAllowanceRemaining,
          contactFittingCopay: data.benefits.contactFittingCopay,
          contactsEligible: true,
        })
      }
    } catch (error) {
      console.error('Error fetching benefits:', error)
      // Don't show error toast for benefits - it's not critical
      // But we'll silently fail and not show the benefit card
    } finally {
      setLoadingBenefits(false)
    }
  }

  const handleSave = async () => {
    if (!insuranceData) return

    setSaving(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/insurance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(insuranceData)
      })

      const result = await response.json()

      // Check if HTTP response was successful
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update insurance')
      }

      // Check if API returned success
      if (result.success) {
        toast({
          title: 'Insurance Updated',
          description: 'Customer insurance information has been saved.'
        })
        setIsEditing(false)
        if (onUpdate) onUpdate()
        // Refresh benefits after updating insurance
        fetchBenefits()
      } else {
        throw new Error(result.error || 'Failed to update insurance')
      }
    } catch (error) {
      console.error('Error saving insurance:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update insurance',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset to original customer data
    setInsuranceData({
      carrier: customer.insuranceCarrier || 'None',
      memberId: customer.memberId || '',
      groupNumber: customer.groupNumber || '',
      eligibilityDate: customer.eligibilityDate 
        ? new Date(customer.eligibilityDate).toISOString().split('T')[0]
        : ''
    })
    setIsEditing(false)
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCarrierBadgeColor = (carrier: string) => {
    const colors: Record<string, string> = {
      'VSP': 'bg-blue-500',
      'EyeMed': 'bg-green-500',
      'Spectera': 'bg-purple-500',
      'Medicare': 'bg-red-500',
      'Medicaid': 'bg-orange-500',
      'Private': 'bg-gray-500',
      'None': 'bg-slate-500'
    }
    return colors[carrier] || 'bg-gray-500'
  }

  // Generate price plan from authorization data
  const handleGeneratePricePlan = async () => {
    setGeneratingPrices(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/price-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-bulk' })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: 'Price Plan Generated',
          description: `Mapped ${result.stats?.mappedProducts || 0} products. ${result.stats?.missingPrices || 0} need manual pricing.`
        })
        // Force refresh the CustomerPricePlan component
        setPricePlanKey(prev => prev + 1)
      } else {
        throw new Error(result.error || 'Failed to generate price plan')
      }
    } catch (error) {
      console.error('Error generating price plan:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate price plan',
        variant: 'destructive'
      })
    } finally {
      setGeneratingPrices(false)
    }
  }

  // Check if customer has insurance - either from customer record OR from authorization tables
  const hasInsurance = (customer.insuranceCarrier && customer.insuranceCarrier !== 'None') || authData !== null

  // Get effective carrier name (from customer record or authorization)
  const effectiveCarrier = customer.insuranceCarrier && customer.insuranceCarrier !== 'None'
    ? customer.insuranceCarrier
    : authData?.carrier?.toUpperCase() || null

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'N/A'
    return `$${amount.toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      {/* Insurance Information Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <CardTitle>Insurance Information</CardTitle>
            </div>
            {!isEditing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Insurance
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <InsuranceSelector
                value={insuranceData}
                onChange={setInsuranceData}
                showDetails={true}
                compact={false}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !insuranceData?.carrier || 
                    (insuranceData.carrier !== 'None' && !insuranceData.memberId)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Insurance'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {loadingAuth ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>Loading insurance information...</p>
                </div>
              ) : hasInsurance ? (
                <div className="space-y-4">
                  <div>
                    <Badge className={`${getCarrierBadgeColor(effectiveCarrier || 'None')} text-white mb-4`}>
                      {effectiveCarrier || 'Insurance'}
                    </Badge>
                    {authData?.planName && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {authData.planName}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Insurance Carrier</p>
                      <p className="text-base">{effectiveCarrier}</p>
                    </div>
                    {(customer.memberId || authData?.memberId) && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Member ID</p>
                        <p className="text-base">{customer.memberId || authData?.memberId}</p>
                      </div>
                    )}
                    {(customer.groupNumber || authData?.groupNumber) && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Group Number</p>
                        <p className="text-base">{customer.groupNumber || authData?.groupNumber}</p>
                      </div>
                    )}
                    {customer.eligibilityDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Eligibility Date</p>
                        <p className="text-base">{formatDate(customer.eligibilityDate)}</p>
                      </div>
                    )}
                  </div>

                  {/* Show copays and allowances from authorization */}
                  {authData && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-foreground">Plan Benefits</p>
                        <Button
                          size="sm"
                          onClick={handleGeneratePricePlan}
                          disabled={generatingPrices}
                          className="flex items-center gap-2"
                        >
                          {generatingPrices ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          {generatingPrices ? 'Generating...' : 'Generate Price Plan'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground">Exam Copay</p>
                          <p className="text-lg font-semibold text-emerald-400">{formatCurrency(authData.examCopay)}</p>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground">Materials Copay</p>
                          <p className="text-lg font-semibold text-blue-400">{formatCurrency(authData.materialsCopay)}</p>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground">Frame Allowance</p>
                          <p className="text-lg font-semibold text-amber-400">{formatCurrency(authData.frameAllowance)}</p>
                          {authData.frameAllowanceFeatured && authData.frameAllowanceFeatured !== authData.frameAllowance && (
                            <p className="text-xs text-amber-400/70">Featured: {formatCurrency(authData.frameAllowanceFeatured)}</p>
                          )}
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground">Contact Allowance</p>
                          <p className="text-lg font-semibold text-purple-400">{formatCurrency(authData.contactAllowance)}</p>
                        </div>
                      </div>
                      {authData.expirationDate && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Authorization expires: {formatDate(authData.expirationDate)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">No insurance information on file</p>
                  <p className="text-sm">Customer is set up for cash/credit payment</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Benefit Summary - Only show if customer has insurance */}
      {hasInsurance && benefitData && !isEditing && (
        <BenefitSummaryCard benefit={benefitData} />
      )}

      {/* Show loading state for benefits */}
      {hasInsurance && loadingBenefits && !isEditing && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p>Loading benefit information...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Plan Section */}
      <CustomerPricePlan key={pricePlanKey} customerId={customerId} />

      {/* Insurance Document Scanner Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-emerald-600" />
              <CardTitle>Insurance Document Scanner</CardTitle>
            </div>
            <Button
              size="sm"
              variant={showScanner ? "default" : "outline"}
              onClick={() => setShowScanner(!showScanner)}
            >
              {showScanner ? 'Hide Scanner' : 'Scan Document'}
            </Button>
          </div>
        </CardHeader>
        {showScanner && (
          <CardContent>
            <InlineScanner
              customerId={customerId}
              onDocumentProcessed={async (result) => {
                if (result.success) {
                  toast({
                    title: 'Document Processed',
                    description: `${result.carrier || 'Insurance'} document scanned successfully. Generating price plan...`
                  })
                  // Refresh authorization and benefits after scanning
                  await fetchAuthorization()
                  fetchBenefits()
                  // Auto-generate price plan after scanning
                  await handleGeneratePricePlan()
                  if (onUpdate) onUpdate()
                }
              }}
              onClose={() => setShowScanner(false)}
            />
          </CardContent>
        )}
      </Card>
    </div>
  )
}
