'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  User,
  ArrowLeft,
  Clock,
  CheckCircle,
  Eye,
  Glasses,
  Shield
} from 'lucide-react'

// Import the simplified layer components
import ExamServicesLayer from '@/components/quote-builder/layers/exam-services-layer-simple'
import { EyeglassesLayerSimple } from '@/components/quote-builder/layers/eyeglasses-layer-simple'
import { SecondPairDiscounts } from '@/components/quote-builder/layers/second-pair-discounts'
import { ContactLensCalculator } from '@/components/quote-builder/layers/contact-lens-calculator'
import { QuoteReviewLayer } from '@/components/quote-builder/layers/quote-review-layer'
import { InsuranceVerificationLayer } from '@/components/quote-builder/layers/insurance-verification-layer'
import { MaterialsConflictBanner } from '@/components/quote-builder/materials-conflict-banner'

// Import pricing context
import { QuotePricingProvider, useQuotePricingContext, usePricingSummary } from '@/contexts/quote-pricing-context'

// Import carrier banner
import { CarrierBanner } from '@/components/quote-builder/carrier-banner'

// Import floating price summary
import { FloatingPriceSummary } from '@/components/quote-builder/floating-price-summary'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  insuranceCarrier?: string
  memberId?: string
}

type QuoteLayer = 'customer' | 'insurance' | 'exam-services' | 'eyeglasses' | 'second-pair' | 'contacts' | 'review'

// Inner component that uses the pricing context
function QuoteBuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL parameters for customer persistence
  const urlCustomerId = searchParams.get('customerId')

  // Pricing context
  const {
    setCustomer,
    clearCustomer,
    authorization,
    authorizationLoading,
    materialsConflict,
    pricingSummary,
    pricedItems,
    isCalculating,
    secondPair,
    contactLenses,
  } = useQuotePricingContext()

  // State management
  const [currentLayer, setCurrentLayer] = useState<QuoteLayer>('customer')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)

  // Load customer - URL param takes absolute priority, then sessionStorage, then localStorage
  useEffect(() => {
    // URL param present - ALWAYS fetch, even if selectedCustomer exists
    // This handles returning from scanner with a (possibly different) customer
    if (urlCustomerId) {
      // Skip if we already loaded this exact customer
      if (selectedCustomer?.id === urlCustomerId) {
        return
      }

      setIsLoadingCustomer(true)
      fetch(`/api/customers/${urlCustomerId}`)
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
              memberId: customerData.memberId,
            }
            setSelectedCustomer(customer)
            setCustomer(customer.id, `${customer.firstName} ${customer.lastName}`)
            setCurrentLayer('insurance')
            // Store in both sessionStorage and localStorage for persistence
            const customerJson = JSON.stringify(customer)
            sessionStorage.setItem('selectedCustomer', customerJson)
            localStorage.setItem('quoteBuilderCustomer', customerJson)
          }
        })
        .catch(err => console.error('Error loading customer from URL:', err))
        .finally(() => setIsLoadingCustomer(false))
    }
    // No URL param - try sessionStorage first, then localStorage as fallback
    else if (!selectedCustomer) {
      // Try sessionStorage first (same-tab persistence)
      let storedCustomer = sessionStorage.getItem('selectedCustomer')

      // If not in sessionStorage, try localStorage (cross-session persistence)
      if (!storedCustomer) {
        storedCustomer = localStorage.getItem('quoteBuilderCustomer')
        // If found in localStorage, sync back to sessionStorage
        if (storedCustomer) {
          sessionStorage.setItem('selectedCustomer', storedCustomer)
        }
      }

      if (storedCustomer) {
        try {
          const customer = JSON.parse(storedCustomer)
          setSelectedCustomer(customer)
          // Sync with pricing context
          setCustomer(customer.id, `${customer.firstName} ${customer.lastName}`)
          setCurrentLayer('insurance')
        } catch (error) {
          console.error('Error parsing stored customer:', error)
          // Clear corrupted storage
          sessionStorage.removeItem('selectedCustomer')
          localStorage.removeItem('quoteBuilderCustomer')
        }
      }
    }
  }, [urlCustomerId, selectedCustomer, setCustomer])

  // Search customers
  const searchCustomers = async (search: string) => {
    if (!search.trim()) {
      setCustomerResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(search)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setCustomerResults(data.data || [])
      }
    } catch (error) {
      console.error('Customer search error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    // Sync with pricing context - this triggers authorization fetch
    setCustomer(customer.id, `${customer.firstName} ${customer.lastName}`)
    setCurrentLayer('insurance')
    setCustomerSearch('')
    setCustomerResults([])
    // Persist to both sessionStorage and localStorage for navigation resilience
    const customerJson = JSON.stringify(customer)
    sessionStorage.setItem('selectedCustomer', customerJson)
    localStorage.setItem('quoteBuilderCustomer', customerJson)
  }

  // Handle layer navigation
  const handleLayerChange = (layer: QuoteLayer) => {
    // Only allow navigation if customer is selected
    if (layer !== 'customer' && !selectedCustomer) return

    // Ensure proper flow through insurance step
    if ((layer === 'exam-services' || layer === 'eyeglasses' || layer === 'contacts') && currentLayer === 'customer') {
      setCurrentLayer('insurance')
      return
    }

    setCurrentLayer(layer)
  }

  // Helper functions to check if categories have items
  const hasExamServices = pricedItems.some(item =>
    item.category === 'exam' || item.category === 'service'
  )
  const hasEyeglasses = pricedItems.some(item =>
    item.category === 'frame' || item.category === 'lens' || item.category === 'coating' || item.category === 'addon'
  )
  const hasContacts = contactLenses?.enabled === true

  // Get layer status for navigation
  const getLayerStatus = (layer: QuoteLayer) => {
    switch (layer) {
      case 'customer':
        return selectedCustomer ? 'complete' : 'current'
      case 'insurance':
        if (!selectedCustomer) return 'locked'
        if (currentLayer === 'insurance') return 'current'
        return authorization ? 'complete' : 'available'
      case 'exam-services':
        if (!selectedCustomer) return 'locked'
        if (currentLayer === 'exam-services') return 'current'
        return hasExamServices ? 'complete' : 'available'
      case 'eyeglasses':
        if (!selectedCustomer) return 'locked'
        if (currentLayer === 'eyeglasses') return 'current'
        return hasEyeglasses ? 'complete' : 'available'
      case 'second-pair':
        // Second pair is optional - show as complete when enabled
        if (!selectedCustomer) return 'locked'
        if (currentLayer === 'second-pair') return 'current'
        return secondPair?.enabled ? 'complete' : 'available'
      case 'contacts':
        if (!selectedCustomer) return 'locked'
        if (currentLayer === 'contacts') return 'current'
        return hasContacts ? 'complete' : 'available'
      case 'review':
        return selectedCustomer ? (currentLayer === 'review' ? 'current' : 'available') : 'locked'
      default:
        return 'locked'
    }
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="glass-card border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6 bg-white/30" />
              <div>
                <h1 className="text-2xl font-bold text-white">Quote Builder</h1>
                <p className="text-blue-200">Create comprehensive eyewear quotes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Step Navigation */}
          <div className="lg:col-span-1">
            <Card className="glass-card border-white/20">
              <CardHeader>
                <CardTitle className="text-lg text-white">Quote Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Customer Step */}
                <div
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    currentLayer === 'customer'
                      ? 'bg-blue-500/30 border-blue-400'
                      : getLayerStatus('customer') === 'complete'
                      ? 'bg-emerald-500/30 border-emerald-400'
                      : 'bg-white/10 border-white/20'
                  }`}
                  onClick={() => handleLayerChange('customer')}
                >
                  <div className="flex items-center gap-3">
                    {getLayerStatus('customer') === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <User className="h-5 w-5 text-white/80" />
                    )}
                    <div>
                      <div className="font-medium text-white">Customer</div>
                      <div className="text-xs text-white/60">Select or add customer</div>
                    </div>
                  </div>
                </div>

                {/* Insurance Step */}
                <div
                  className={`p-3 rounded-lg border transition-colors ${
                    getLayerStatus('insurance') === 'locked'
                      ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-60'
                      : currentLayer === 'insurance'
                      ? 'bg-blue-500/30 border-blue-400 cursor-pointer'
                      : authorization
                      ? 'bg-emerald-500/30 border-emerald-400 cursor-pointer'
                      : 'bg-white/10 border-white/20 cursor-pointer'
                  }`}
                  onClick={() => getLayerStatus('insurance') !== 'locked' && handleLayerChange('insurance')}
                >
                  <div className="flex items-center gap-3">
                    {authorization ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Shield className="h-5 w-5 text-white/80" />
                    )}
                    <div>
                      <div className="font-medium text-white">Insurance</div>
                      <div className="text-xs text-white/60">
                        {authorization
                          ? `${authorization.carrier} verified`
                          : 'Verify coverage'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exam Services Step */}
                <div
                  className={`p-3 rounded-lg border transition-colors ${
                    getLayerStatus('exam-services') === 'locked'
                      ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-60'
                      : currentLayer === 'exam-services'
                      ? 'bg-blue-500/30 border-blue-400 cursor-pointer'
                      : getLayerStatus('exam-services') === 'complete'
                      ? 'bg-emerald-500/30 border-emerald-400 cursor-pointer'
                      : 'bg-white/10 border-white/20 cursor-pointer'
                  }`}
                  onClick={() => getLayerStatus('exam-services') !== 'locked' && handleLayerChange('exam-services')}
                >
                  <div className="flex items-center gap-3">
                    {getLayerStatus('exam-services') === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-white/80" />
                    )}
                    <div>
                      <div className="font-medium text-white">Exam Services</div>
                      <div className="text-xs text-white/60">Eye exams & diagnostics</div>
                    </div>
                  </div>
                </div>

                {/* Eyeglasses Step */}
                <div
                  className={`p-3 rounded-lg border transition-colors ${
                    getLayerStatus('eyeglasses') === 'locked'
                      ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-60'
                      : currentLayer === 'eyeglasses'
                      ? 'bg-blue-500/30 border-blue-400 cursor-pointer'
                      : getLayerStatus('eyeglasses') === 'complete'
                      ? 'bg-emerald-500/30 border-emerald-400 cursor-pointer'
                      : 'bg-white/10 border-white/20 cursor-pointer'
                  }`}
                  onClick={() => getLayerStatus('eyeglasses') !== 'locked' && handleLayerChange('eyeglasses')}
                >
                  <div className="flex items-center gap-3">
                    {getLayerStatus('eyeglasses') === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Glasses className="h-5 w-5 text-white/80" />
                    )}
                    <div>
                      <div className="font-medium text-white">Eyeglasses</div>
                      <div className="text-xs text-white/60">Frames, lenses & options</div>
                    </div>
                  </div>
                </div>

                {/* Second Pair Step */}
                <div
                  className={`p-3 rounded-lg border transition-colors ${
                    getLayerStatus('second-pair') === 'locked'
                      ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-60'
                      : currentLayer === 'second-pair'
                      ? 'bg-blue-500/30 border-blue-400 cursor-pointer'
                      : getLayerStatus('second-pair') === 'complete'
                      ? 'bg-emerald-500/30 border-emerald-400 cursor-pointer'
                      : 'bg-white/10 border-white/20 cursor-pointer'
                  }`}
                  onClick={() => getLayerStatus('second-pair') !== 'locked' && handleLayerChange('second-pair')}
                >
                  <div className="flex items-center gap-3">
                    {getLayerStatus('second-pair') === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Glasses className="h-5 w-5 text-amber-400" />
                    )}
                    <div>
                      <div className="font-medium text-white">Second Pair</div>
                      <div className="text-xs text-white/60">Cash discount (optional)</div>
                    </div>
                  </div>
                </div>

                {/* Contact Lenses Step */}
                <div
                  className={`p-3 rounded-lg border transition-colors ${
                    getLayerStatus('contacts') === 'locked'
                      ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-60'
                      : currentLayer === 'contacts'
                      ? 'bg-blue-500/30 border-blue-400 cursor-pointer'
                      : getLayerStatus('contacts') === 'complete'
                      ? 'bg-emerald-500/30 border-emerald-400 cursor-pointer'
                      : 'bg-white/10 border-white/20 cursor-pointer'
                  }`}
                  onClick={() => getLayerStatus('contacts') !== 'locked' && handleLayerChange('contacts')}
                >
                  <div className="flex items-center gap-3">
                    {getLayerStatus('contacts') === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-white/80" />
                    )}
                    <div>
                      <div className="font-medium text-white">Contact Lenses</div>
                      <div className="text-xs text-white/60">Brands, types & parameters</div>
                    </div>
                  </div>
                </div>

                {/* Review Step */}
                <div
                  className={`p-3 rounded-lg border transition-colors ${
                    getLayerStatus('review') === 'locked'
                      ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-60'
                      : currentLayer === 'review'
                      ? 'bg-blue-500/30 border-blue-400 cursor-pointer'
                      : 'bg-white/10 border-white/20 cursor-pointer'
                  }`}
                  onClick={() => getLayerStatus('review') !== 'locked' && handleLayerChange('review')}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-white/80" />
                    <div>
                      <div className="font-medium text-white">Review</div>
                      <div className="text-xs text-white/60">Review quote details</div>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Carrier Banner - Always visible when customer selected */}
            {selectedCustomer && (
              <CarrierBanner
                carrier={authorization?.carrier || null}
                planName={authorization?.planName}
                examCopay={authorization?.examCopay}
                materialsCopay={authorization?.materialsCopay}
                frameAllowance={authorization?.frameAllowance}
                contactAllowance={authorization?.contactAllowance}
                contactFittingCopay={authorization?.contactFittingCopay}
                contactFittingCovered={authorization?.contactFittingCovered}
                glassesContactsExclusive={authorization?.glassesContactsExclusive}
                isLoading={authorizationLoading}
                benefitStructure={authorization?.benefitStructure}
                totalMaterialsCredit={authorization?.totalMaterialsCredit}
                overageDiscountPercent={authorization?.overageDiscountPercent}
              />
            )}

            {/* Customer Info Display */}
            {selectedCustomer && (
              <Card className="glass-card border-white/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-blue-500/30 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-white">
                          {selectedCustomer.firstName} {selectedCustomer.lastName}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-white/70">
                          {selectedCustomer.email && <span>{selectedCustomer.email}</span>}
                          {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                          {selectedCustomer.memberId && (
                            <span className="text-white/50">ID: {selectedCustomer.memberId}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/30 text-white hover:bg-white/10"
                      onClick={() => {
                        setSelectedCustomer(null)
                        clearCustomer()
                        setCurrentLayer('customer')
                        // Clear persisted customer from both storages
                        sessionStorage.removeItem('selectedCustomer')
                        localStorage.removeItem('quoteBuilderCustomer')
                        // Clear URL param by navigating to base URL
                        router.replace('/quote-builder')
                      }}
                    >
                      Change Customer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customer Selection Layer */}
            {currentLayer === 'customer' && (
              <Card className="glass-card border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <User className="h-5 w-5" />
                    Select Customer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="customerSearch" className="block text-sm font-medium mb-2 text-white/80">
                        Search for existing customer
                      </label>
                      <input
                        id="customerSearch"
                        type="text"
                        placeholder="Search by name, email, or member ID..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value)
                          searchCustomers(e.target.value)
                        }}
                        className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-md text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    {loading && (
                      <div className="text-center py-4 text-white/70">
                        <Clock className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Searching customers...
                      </div>
                    )}

                    {customerResults.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <h4 className="text-sm font-medium text-white/80">Search Results:</h4>
                        {customerResults.map((customer) => (
                          <div
                            key={customer.id}
                            className="p-4 border border-white/20 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <div className="font-medium text-white">
                              {customer.firstName} {customer.lastName}
                            </div>
                            <div className="text-sm text-white/70">
                              {customer.email && <span>{customer.email}</span>}
                              {customer.phone && <span className="ml-2">{customer.phone}</span>}
                            </div>
                            {customer.insuranceCarrier && (
                              <div className="mt-1">
                                <Badge variant="outline" className="text-xs border-white/30 text-white/80">
                                  {customer.insuranceCarrier}
                                </Badge>
                                {customer.memberId && (
                                  <span className="text-xs text-white/50 ml-2">
                                    ID: {customer.memberId}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <Separator className="bg-white/20" />

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-white/80">Or create a new customer:</h4>
                      <Button
                        variant="outline"
                        className="w-full border-white/30 text-white hover:bg-white/10"
                        onClick={() => {
                          // Store current quote context
                          sessionStorage.setItem('quoteBuilderContext', 'true')
                          router.push('/customers')
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Add New Customer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Insurance Verification Layer */}
            {currentLayer === 'insurance' && selectedCustomer && (
              <InsuranceVerificationLayer
                customerId={selectedCustomer.id}
                customerName={`${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
                onNext={() => setCurrentLayer('exam-services')}
                onBack={() => setCurrentLayer('customer')}
              />
            )}

            {/* Materials Conflict Banner - shown when both glasses and contacts are in the quote */}
            {selectedCustomer && materialsConflict.hasConflict && (
              <MaterialsConflictBanner />
            )}

            {/* Exam Services Layer */}
            {currentLayer === 'exam-services' && selectedCustomer && (
              <ExamServicesLayer
                onNext={() => setCurrentLayer('eyeglasses')}
                onBack={() => setCurrentLayer('insurance')}
              />
            )}

            {/* Eyeglasses Layer */}
            {currentLayer === 'eyeglasses' && selectedCustomer && (
              <EyeglassesLayerSimple
                onNext={() => setCurrentLayer('second-pair')}
                onBack={() => setCurrentLayer('exam-services')}
                onSkipSecondPair={() => setCurrentLayer('contacts')}
              />
            )}

            {/* Second Pair Layer */}
            {currentLayer === 'second-pair' && selectedCustomer && (
              <SecondPairDiscounts
                onNext={() => setCurrentLayer('contacts')}
                onBack={() => setCurrentLayer('eyeglasses')}
              />
            )}

            {/* Contact Lenses Layer */}
            {currentLayer === 'contacts' && selectedCustomer && (
              <ContactLensCalculator
                onNext={() => setCurrentLayer('review')}
                onBack={() => setCurrentLayer('second-pair')}
              />
            )}

            {/* Review Layer */}
            {currentLayer === 'review' && selectedCustomer && (
              <QuoteReviewLayer
                onEdit={(section) => {
                  if (section === 'customer') setCurrentLayer('customer')
                  else if (section === 'insurance') setCurrentLayer('insurance')
                  else if (section === 'exam-services') setCurrentLayer('exam-services')
                  else if (section === 'eyeglasses') setCurrentLayer('eyeglasses')
                  else if (section === 'second-pair') setCurrentLayer('second-pair')
                  else if (section === 'contacts') setCurrentLayer('contacts')
                }}
                onFinalize={() => {
                  // Complete the quote and go to dashboard
                  console.log('Quote completed!')
                  router.push('/dashboard')
                }}
              />
            )}

          </div>
        </div>
      </div>

      {/* Floating Price Summary */}
      {selectedCustomer && <FloatingPriceSummary />}
    </div>
  )
}

// Main export wraps the content with the pricing provider
export default function QuoteBuilderPage() {
  return (
    <QuotePricingProvider>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <QuoteBuilderContent />
      </Suspense>
    </QuotePricingProvider>
  )
}