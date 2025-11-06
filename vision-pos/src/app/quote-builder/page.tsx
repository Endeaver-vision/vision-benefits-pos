'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  ArrowLeft,
  Clock
} from 'lucide-react'

// Import the new layout components - Master Plan Design System
import { QuoteNavPanel, QuoteLayer, LayerStatus } from '@/components/quote-builder/layout/quote-nav-panel'
import { CustomerInfoHeader, Customer } from '@/components/quote-builder/layout/customer-info-header'
import { PricingSidebar } from '@/components/quote-builder/layout/pricing-sidebar'

// Import the store for saving
import { useQuoteStore } from '@/store/quote-store'

// Import the layer components
import ExamServicesLayer from '@/components/quote-builder/layers/exam-services-layer'
import EyeglassesLayer from '@/components/quote-builder/layers/eyeglasses-layer'
import ContactLensLayer from '@/components/quote-builder/layers/contact-lens-layer'
import { QuoteReviewLayer } from '@/components/quote-builder/layers/quote-review-layer'
import { QuoteFinalizationLayer } from '@/components/quote-builder/layers/quote-finalization-layer'

export default function QuoteBuilderPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { saveQuote } = useQuoteStore()
  
  // State management
  const [currentLayer, setCurrentLayer] = useState<QuoteLayer>('customer')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  // Check for selected customer from session storage
  useEffect(() => {
    const storedCustomer = sessionStorage.getItem('selectedCustomer')
    if (storedCustomer) {
      try {
        const customer = JSON.parse(storedCustomer)
        setSelectedCustomer(customer)
        setCurrentLayer('exam-services')
        // Clean up session storage
        sessionStorage.removeItem('selectedCustomer')
      } catch (error) {
        console.error('Error parsing stored customer:', error)
      }
    }
  }, [])

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
    setCurrentLayer('exam-services')
    setCustomerSearch('')
    setCustomerResults([])
  }

  // Handle layer navigation with saving
  const handleLayerChange = async (layer: QuoteLayer) => {
    // Only allow navigation if previous layers are complete
    if ((layer === 'exam-services' || layer === 'eyeglasses') && !selectedCustomer) return
    
    // Exam prerequisites validation - require exam services before product selection
    if ((layer === 'eyeglasses' || layer === 'contacts') && currentLayer === 'customer') {
      // Force users to go through exam services first
      setCurrentLayer('exam-services')
      return
    }
    
    // Save current layer data before changing layers
    try {
      await saveQuote()
      console.log('Data saved before layer change from', currentLayer, 'to', layer)
    } catch (error) {
      console.error('Failed to save data before layer change:', error)
      // Continue navigation even if save fails to prevent blocking UX
    }
    
    setCurrentLayer(layer)
  }

  // Get layer status for navigation
  const getLayerStatus = (layer: QuoteLayer): LayerStatus => {
    switch (layer) {
      case 'customer':
        return selectedCustomer ? 'complete' : 'current'
      case 'exam-services':
        return selectedCustomer ? (currentLayer === 'exam-services' ? 'current' : 'available') : 'locked'
      case 'eyeglasses':
        return selectedCustomer ? (currentLayer === 'eyeglasses' ? 'current' : 'available') : 'locked'
      case 'contacts':
        return selectedCustomer ? (currentLayer === 'contacts' ? 'current' : 'available') : 'locked'
      case 'review':
        return selectedCustomer ? (currentLayer === 'review' ? 'current' : 'available') : 'locked'
      case 'finalize':
        return selectedCustomer ? (currentLayer === 'finalize' ? 'current' : 'available') : 'locked'
      default:
        return 'locked'
    }
  }

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header - Master Plan Design System */}
      <div className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="text-neutral-600 hover:text-brand-purple"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold text-brand-purple">Quote Builder</h1>
                <p className="text-neutral-600">Create comprehensive eyewear quotes</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="px-3 py-1 border-brand-purple/30 text-brand-purple">
                {session.user.locationName}
              </Badge>
              <Badge variant="secondary" className="px-3 py-1 bg-brand-purple/10 text-brand-purple">
                {session.user.name}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout - 3-Panel Master Plan Design */}
      <div className="layout-3-panel">
        
        {/* Left Navigation Panel - 160px */}
        <QuoteNavPanel 
          currentLayer={currentLayer}
          onLayerChange={handleLayerChange}
          getLayerStatus={getLayerStatus}
        />
        
        {/* Center Content Panel - Fluid */}
        <div className="bg-white p-6 space-y-6 overflow-y-auto">
          
          {/* Customer Info Header */}
          {selectedCustomer && (
            <CustomerInfoHeader 
              customer={selectedCustomer}
              locationId={session?.user?.locationId}
              onChangeCustomer={() => {
                setSelectedCustomer(null)
                setCurrentLayer('customer')
              }}
            />
          )}
          
          {/* Layer Content */}
          <div className="space-y-6">
            
            {/* Customer Selection Layer */}
            {currentLayer === 'customer' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-brand-purple" />
                    <span>Select Customer</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="customerSearch" className="block text-sm font-medium mb-2">
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
                        className="w-full px-3 py-2 border border-neutral-200 rounded-brand-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-brand-purple"
                      />
                    </div>

                    {loading && (
                      <div className="text-center py-4 text-neutral-500">
                        <Clock className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Searching customers...
                      </div>
                    )}

                    {customerResults.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <h4 className="text-sm font-medium text-neutral-700">Search Results:</h4>
                        {customerResults.map((customer) => (
                          <div
                            key={customer.id}
                            className="p-4 border border-neutral-200 rounded-brand-md cursor-pointer hover:border-brand-purple hover:bg-primary-purple-light transition-colors"
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <div className="font-medium text-neutral-900">
                              {customer.firstName} {customer.lastName}
                            </div>
                            <div className="text-sm text-neutral-600">
                              {customer.email && <span>📧 {customer.email}</span>}
                              {customer.phone && <span className="ml-2">📞 {customer.phone}</span>}
                            </div>
                            {customer.insuranceCarrier && (
                              <div className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {customer.insuranceCarrier}
                                </Badge>
                                {customer.memberId && (
                                  <span className="text-xs text-neutral-500 ml-2">
                                    ID: {customer.memberId}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-neutral-700">Or create a new customer:</h4>
                      <Button 
                        variant="outline" 
                        className="w-full border-brand-purple/30 text-brand-purple hover:bg-brand-purple hover:text-white"
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

            {/* Exam Services Layer */}
            {currentLayer === 'exam-services' && selectedCustomer && (
              <ExamServicesLayer 
                onNext={async () => {
                  await saveQuote()
                  setCurrentLayer('eyeglasses')
                }}
                onBack={async () => {
                  await saveQuote()
                  setCurrentLayer('customer')
                }}
              />
            )}

            {/* Eyeglasses Layer */}
            {currentLayer === 'eyeglasses' && selectedCustomer && (
              <EyeglassesLayer 
                onNext={async () => {
                  await saveQuote()
                  setCurrentLayer('contacts')
                }}
                onBack={async () => {
                  await saveQuote()
                  setCurrentLayer('exam-services')
                }}
              />
            )}

            {/* Contact Lenses Layer */}
            {currentLayer === 'contacts' && selectedCustomer && (
              <ContactLensLayer 
                onNext={async () => {
                  await saveQuote()
                  setCurrentLayer('review')
                }}
                onBack={async () => {
                  await saveQuote()
                  setCurrentLayer('eyeglasses')
                }}
              />
            )}

            {/* Review Layer */}
            {currentLayer === 'review' && selectedCustomer && (
              <QuoteReviewLayer 
                onEdit={(section) => {
                  if (section === 'customer') setCurrentLayer('customer')
                  else if (section === 'exam-services') setCurrentLayer('exam-services')
                  else if (section === 'eyeglasses') setCurrentLayer('eyeglasses')
                  else if (section === 'contacts') setCurrentLayer('contacts')
                }}
                onFinalize={() => {
                  setCurrentLayer('finalize')
                  console.log('Quote finalized!')
                }}
              />
            )}

            {/* Finalize Layer */}
            {currentLayer === 'finalize' && selectedCustomer && (
              <QuoteFinalizationLayer 
                onComplete={() => router.push('/dashboard')}
              />
            )}
            
          </div>
        </div>
        
        {/* Right Pricing Sidebar - 280px */}
        <PricingSidebar 
          customerName={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : ''}
          onGenerateQuote={() => {
            console.log('Generating quote...');
            // TODO: Implement quote generation logic
          }}
          onProceedToCheckout={() => {
            console.log('Proceeding to checkout...');
            setCurrentLayer('review');
          }}
        />
        
      </div>
    </div>
  )
}