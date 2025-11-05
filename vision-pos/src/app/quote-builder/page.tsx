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
  Clock,
  CheckCircle,
  Eye,
  Glasses
} from 'lucide-react'

// Import the layer components
import ExamServicesLayer from '@/components/quote-builder/layers/exam-services-layer'
import { EyeglassesLayer } from '@/components/quote-builder/layers/eyeglasses-layer'
import { ContactLensLayer } from '@/components/quote-builder/layers/contact-lens-layer'
import { QuoteReviewLayer } from '@/components/quote-builder/layers/quote-review-layer'
import { QuoteFinalizationLayer } from '@/components/quote-builder/layers/quote-finalization-layer'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  insuranceCarrier?: string
  memberId?: string
}

type QuoteLayer = 'customer' | 'exam-services' | 'eyeglasses' | 'contacts' | 'review' | 'finalize'

export default function QuoteBuilderPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
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

  // Handle layer navigation
  const handleLayerChange = (layer: QuoteLayer) => {
    // Only allow navigation if previous layers are complete
    if ((layer === 'exam-services' || layer === 'eyeglasses') && !selectedCustomer) return
    
    // Exam prerequisites validation - require exam services before product selection
    if ((layer === 'eyeglasses' || layer === 'contacts') && currentLayer === 'customer') {
      // Force users to go through exam services first
      setCurrentLayer('exam-services')
      return
    }
    
    setCurrentLayer(layer)
  }

  // Get layer status for navigation
  const getLayerStatus = (layer: QuoteLayer) => {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quote Builder</h1>
                <p className="text-gray-600">Create comprehensive eyewear quotes</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                {session.user.locationName}
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                {session.user.name}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Step Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quote Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Customer Step */}
                <div 
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    currentLayer === 'customer' 
                      ? 'bg-blue-50 border-blue-200' 
                      : getLayerStatus('customer') === 'complete'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => handleLayerChange('customer')}
                >
                  <div className="flex items-center gap-3">
                    {getLayerStatus('customer') === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <User className="h-5 w-5 text-gray-600" />
                    )}
                    <div>
                      <div className="font-medium">Customer</div>
                      <div className="text-xs text-gray-600">Select or add customer</div>
                    </div>
                  </div>
                </div>

                {/* Exam Services Step */}
                <div 
                  className={`p-3 rounded-lg border transition-colors ${
                    getLayerStatus('exam-services') === 'locked'
                      ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                      : currentLayer === 'exam-services'
                      ? 'bg-blue-50 border-blue-200 cursor-pointer'
                      : 'bg-gray-50 border-gray-200 cursor-pointer'
                  }`}
                  onClick={() => getLayerStatus('exam-services') !== 'locked' && handleLayerChange('exam-services')}
                >
                  <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium">Exam Services</div>
                      <div className="text-xs text-gray-600">Eye exams & diagnostics</div>
                    </div>
                  </div>
                </div>

                {/* Eyeglasses Step */}
                <div 
                  className={`p-3 rounded-lg border transition-colors ${
                    getLayerStatus('eyeglasses') === 'locked'
                      ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                      : currentLayer === 'eyeglasses'
                      ? 'bg-blue-50 border-blue-200 cursor-pointer'
                      : 'bg-gray-50 border-gray-200 cursor-pointer'
                  }`}
                  onClick={() => getLayerStatus('eyeglasses') !== 'locked' && handleLayerChange('eyeglasses')}
                >
                  <div className="flex items-center gap-3">
                    <Glasses className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium">Eyeglasses</div>
                      <div className="text-xs text-gray-600">Frames, lenses & options</div>
                    </div>
                  </div>
                </div>

                {/* Contact Lenses Step */}
                <div 
                  className={`p-3 rounded-lg border transition-colors ${
                    getLayerStatus('contacts') === 'locked'
                      ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                      : currentLayer === 'contacts'
                      ? 'bg-blue-50 border-blue-200 cursor-pointer'
                      : 'bg-gray-50 border-gray-200 cursor-pointer'
                  }`}
                  onClick={() => getLayerStatus('contacts') !== 'locked' && handleLayerChange('contacts')}
                >
                  <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium">Contact Lenses</div>
                      <div className="text-xs text-gray-600">Brands, types & parameters</div>
                    </div>
                  </div>
                </div>

                {/* Review Step */}
                <div 
                  className={`p-3 rounded-lg border transition-colors ${
                    getLayerStatus('review') === 'locked'
                      ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                      : currentLayer === 'review'
                      ? 'bg-blue-50 border-blue-200 cursor-pointer'
                      : 'bg-gray-50 border-gray-200 cursor-pointer'
                  }`}
                  onClick={() => getLayerStatus('review') !== 'locked' && handleLayerChange('review')}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium">Review</div>
                      <div className="text-xs text-gray-600">Review quote details</div>
                    </div>
                  </div>
                </div>

                {/* Finalize Step */}
                <div 
                  className={`p-3 rounded-lg border transition-colors ${
                    getLayerStatus('finalize') === 'locked'
                      ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                      : currentLayer === 'finalize'
                      ? 'bg-blue-50 border-blue-200 cursor-pointer'
                      : 'bg-gray-50 border-gray-200 cursor-pointer'
                  }`}
                  onClick={() => getLayerStatus('finalize') !== 'locked' && handleLayerChange('finalize')}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium">Finalize</div>
                      <div className="text-xs text-gray-600">Complete the quote</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Customer Info Display */}
            {selectedCustomer && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {selectedCustomer.firstName} {selectedCustomer.lastName}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {selectedCustomer.email && <span>📧 {selectedCustomer.email}</span>}
                          {selectedCustomer.phone && <span>📞 {selectedCustomer.phone}</span>}
                        </div>
                        {selectedCustomer.insuranceCarrier && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              {selectedCustomer.insuranceCarrier}
                            </Badge>
                            {selectedCustomer.memberId && (
                              <span className="text-xs text-gray-500 ml-2">
                                ID: {selectedCustomer.memberId}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedCustomer(null)
                        setCurrentLayer('customer')
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Select Customer
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {loading && (
                      <div className="text-center py-4 text-gray-500">
                        <Clock className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Searching customers...
                      </div>
                    )}

                    {customerResults.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <h4 className="text-sm font-medium text-gray-700">Search Results:</h4>
                        {customerResults.map((customer) => (
                          <div
                            key={customer.id}
                            className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <div className="font-medium">
                              {customer.firstName} {customer.lastName}
                            </div>
                            <div className="text-sm text-gray-600">
                              {customer.email && <span>📧 {customer.email}</span>}
                              {customer.phone && <span className="ml-2">📞 {customer.phone}</span>}
                            </div>
                            {customer.insuranceCarrier && (
                              <div className="mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {customer.insuranceCarrier}
                                </Badge>
                                {customer.memberId && (
                                  <span className="text-xs text-gray-500 ml-2">
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
                      <h4 className="text-sm font-medium text-gray-700">Or create a new customer:</h4>
                      <Button 
                        variant="outline" 
                        className="w-full"
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
                onNext={() => setCurrentLayer('eyeglasses')}
                onBack={() => setCurrentLayer('customer')}
              />
            )}

            {/* Eyeglasses Layer */}
            {currentLayer === 'eyeglasses' && selectedCustomer && (
              <EyeglassesLayer />
            )}

            {/* Contact Lenses Layer */}
            {currentLayer === 'contacts' && selectedCustomer && (
              <ContactLensLayer />
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
      </div>
    </div>
  )
}