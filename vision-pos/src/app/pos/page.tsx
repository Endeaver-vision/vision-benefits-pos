'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  User,
  CreditCard,
  Calculator,
  Glasses,
  Eye,
  Contact,
  Stethoscope,
  ScanLine,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Package,
  Settings
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import PageLayout from '@/components/layout/page-layout'

// =============================================================================
// TYPES
// =============================================================================

interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  insuranceCarrier?: string
  memberId?: string
}

interface CustomerWithAuth extends Customer {
  hasAuthorization: boolean
  carrier?: string
}

interface PosProduct {
  id: string
  sku: string
  name: string
  brand: string
  description: string
  category: 'frames' | 'lenses' | 'contacts' | 'services'
  subcategory: string
  retailPrice: number
  patientPays: number
  insurancePays: number
  tier?: string
  inStock: boolean
  stockQuantity?: number
  manufacturer?: string
}

interface PosService {
  id: string
  sku: string
  name: string
  code?: string
  description?: string
  category: string
  retailPrice: number
  patientPays: number
  insurancePays: number
  isCoveredByVision: boolean
}

interface CartItem {
  id: string
  sku: string
  name: string
  category: string
  quantity: number
  retailPrice: number
  patientPays: number
  insurancePays: number
  total: number
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function POSPage() {
  const router = useRouter()

  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithAuth | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)

  // Product state
  const [activeTab, setActiveTab] = useState('services')
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<PosProduct[]>([])
  const [services, setServices] = useState<PosService[]>([])
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [processingPayment, setProcessingPayment] = useState(false)

  // Hidden product search state
  const [showHiddenSearch, setShowHiddenSearch] = useState(false)
  const [hiddenSearchQuery, setHiddenSearchQuery] = useState('')
  const [hiddenSearchResults, setHiddenSearchResults] = useState<(PosProduct | PosService)[]>([])
  const [hiddenSearchLoading, setHiddenSearchLoading] = useState(false)

  // =============================================================================
  // CUSTOMER SEARCH
  // =============================================================================

  const searchCustomers = useCallback(async (search: string) => {
    if (!search.trim()) {
      setCustomerResults([])
      return
    }

    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(search)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setCustomerResults(data.data || [])
      }
    } catch (error) {
      console.error('Customer search error:', error)
    }
  }, [])

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch && showCustomerSearch) {
        searchCustomers(customerSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [customerSearch, showCustomerSearch, searchCustomers])

  // When customer is selected, check for authorization
  const selectCustomer = async (customer: Customer) => {
    setSelectedCustomer({
      ...customer,
      hasAuthorization: false,
    })
    setShowCustomerSearch(false)
    setCustomerSearch('')

    // Check for active authorization
    try {
      const response = await fetch(`/api/customers/${customer.id}/authorization`)
      if (response.ok) {
        const data = await response.json()
        setSelectedCustomer({
          ...customer,
          hasAuthorization: !!data.authorization,
          carrier: data.carrier,
          insuranceCarrier: data.carrier || customer.insuranceCarrier,
        })
      }
    } catch (error) {
      console.error('Authorization check error:', error)
    }

    // Reload products with customer's pricing
    loadProducts(activeTab, customer.id)
    loadServices(customer.id)
  }

  // =============================================================================
  // PRODUCT & SERVICE LOADING
  // =============================================================================

  const loadProducts = useCallback(async (category: string, customerId?: string) => {
    if (category === 'services') return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('category', category)
      if (customerId) params.append('customerId', customerId)
      if (productSearch) params.append('search', productSearch)
      if (selectedBrand && selectedBrand !== 'all') params.append('brand', selectedBrand)
      params.append('limit', '50')

      const response = await fetch(`/api/pos/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
        setAvailableBrands(data.filters?.brands || [])
      }
    } catch (error) {
      console.error('Product load error:', error)
    } finally {
      setLoading(false)
    }
  }, [productSearch, selectedBrand])

  const loadServices = useCallback(async (customerId?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (customerId) params.append('customerId', customerId)
      if (productSearch) params.append('search', productSearch)
      params.append('limit', '100')

      const response = await fetch(`/api/pos/services?${params}`)
      if (response.ok) {
        const data = await response.json()
        setServices(data.services || [])
      }
    } catch (error) {
      console.error('Services load error:', error)
    } finally {
      setLoading(false)
    }
  }, [productSearch])

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'services') {
      loadServices(selectedCustomer?.id)
    } else {
      loadProducts(activeTab, selectedCustomer?.id)
    }
  }, [activeTab, selectedCustomer?.id, loadProducts, loadServices])

  // Reload on search change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'services') {
        loadServices(selectedCustomer?.id)
      } else {
        loadProducts(activeTab, selectedCustomer?.id)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch, selectedBrand, activeTab, selectedCustomer?.id, loadProducts, loadServices])

  // =============================================================================
  // HIDDEN PRODUCT SEARCH
  // =============================================================================

  const searchHiddenProducts = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setHiddenSearchResults([])
      return
    }

    setHiddenSearchLoading(true)
    try {
      // Search products with includeHidden flag
      const [productsRes, servicesRes] = await Promise.all([
        fetch(`/api/pos/products?search=${encodeURIComponent(query)}&includeHidden=true&category=all&limit=20${selectedCustomer?.id ? `&customerId=${selectedCustomer.id}` : ''}`),
        fetch(`/api/pos/services?search=${encodeURIComponent(query)}&includeHidden=true&limit=20${selectedCustomer?.id ? `&customerId=${selectedCustomer.id}` : ''}`)
      ])

      const results: (PosProduct | PosService)[] = []

      if (productsRes.ok) {
        const data = await productsRes.json()
        results.push(...(data.products || []))
      }

      if (servicesRes.ok) {
        const data = await servicesRes.json()
        results.push(...(data.services || []))
      }

      setHiddenSearchResults(results)
    } catch (error) {
      console.error('Hidden product search error:', error)
    } finally {
      setHiddenSearchLoading(false)
    }
  }, [selectedCustomer?.id])

  // Debounced hidden product search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showHiddenSearch && hiddenSearchQuery) {
        searchHiddenProducts(hiddenSearchQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [hiddenSearchQuery, showHiddenSearch, searchHiddenProducts])

  // =============================================================================
  // CART MANAGEMENT
  // =============================================================================

  const addToCart = (item: PosProduct | PosService) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id)

    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? {
              ...cartItem,
              quantity: cartItem.quantity + 1,
              total: (cartItem.quantity + 1) * cartItem.patientPays
            }
          : cartItem
      ))
    } else {
      setCart([...cart, {
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        quantity: 1,
        retailPrice: item.retailPrice,
        patientPays: item.patientPays,
        insurancePays: item.insurancePays,
        total: item.patientPays
      }])
    }
  }

  const updateCartQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId)
      return
    }

    setCart(cart.map(item =>
      item.id === itemId
        ? {
            ...item,
            quantity: newQuantity,
            total: newQuantity * item.patientPays
          }
        : item
    ))
  }

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId))
  }

  // =============================================================================
  // CHECKOUT
  // =============================================================================

  const processPayment = async () => {
    if (!selectedCustomer || cart.length === 0) return

    setProcessingPayment(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          carrier: selectedCustomer.carrier,
          items: cart.map(item => ({
            sku: item.sku,
            displayName: item.name,
            category: item.category,
            retailPrice: item.retailPrice,
            patientCopay: item.patientPays,
            insurancePays: item.insurancePays,
            quantity: item.quantity,
          })),
          retailTotal,
          patientTotal: subtotal,
          insuranceTotal: totalInsuranceDiscount,
          paymentMethod: 'card',
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Payment successful!\nTransaction ID: ${data.transaction.id}\nTotal: $${data.transaction.total.toFixed(2)}`)
        setCart([])
        setSelectedCustomer(null)
      } else {
        const error = await response.json()
        alert(`Payment failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Payment failed. Please try again.')
    } finally {
      setProcessingPayment(false)
    }
  }

  // =============================================================================
  // CALCULATIONS
  // =============================================================================

  const retailTotal = cart.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0)
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const totalInsuranceDiscount = cart.reduce((sum, item) => sum + (item.insurancePays * item.quantity), 0)
  const tax = subtotal * 0.0875
  const total = subtotal + tax

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <PageLayout
      title="Point of Sale"
      subtitle="Process customer transactions"
      actions={
        <Button variant="outline" size="sm" onClick={() => router.push('/scanner')}>
          <ScanLine className="h-4 w-4 mr-2" />
          Scan Insurance
        </Button>
      }
    >
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer & Products */}
        <div className="lg:col-span-2 space-y-6">

          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-lg">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      {selectedCustomer.email && <div>📧 {selectedCustomer.email}</div>}
                      {selectedCustomer.phone && <div>📞 {selectedCustomer.phone}</div>}
                      <div className="flex items-center gap-2 mt-2">
                        {selectedCustomer.carrier ? (
                          <>
                            <Badge variant="default" className="bg-blue-600">
                              {selectedCustomer.carrier}
                            </Badge>
                            {selectedCustomer.hasAuthorization ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Authorization Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                No Authorization
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline">Cash Patient</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/scanner?customerId=${selectedCustomer.id}`)}
                    >
                      <ScanLine className="h-4 w-4 mr-1" />
                      Scan Auth
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCustomer(null)
                        setCart([])
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerSearch">Search Customer</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="customerSearch"
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value)
                          setShowCustomerSearch(true)
                        }}
                        onFocus={() => setShowCustomerSearch(true)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {showCustomerSearch && customerResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg">
                      {customerResults.map((customer) => (
                        <div
                          key={customer.id}
                          className="p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0"
                          onClick={() => selectCustomer(customer)}
                        >
                          <div className="font-medium">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            {customer.email && <span>{customer.email}</span>}
                            {customer.insuranceCarrier && (
                              <Badge variant="outline" className="text-xs">
                                {customer.insuranceCarrier}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/customers/new')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Customer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product/Service Selection Tabs */}
          <Card>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="services" className="flex items-center gap-1">
                    <Stethoscope className="h-4 w-4" />
                    Exams
                  </TabsTrigger>
                  <TabsTrigger value="frames" className="flex items-center gap-1">
                    <Glasses className="h-4 w-4" />
                    Frames
                  </TabsTrigger>
                  <TabsTrigger value="lenses" className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    Lenses
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="flex items-center gap-1">
                    <Contact className="h-4 w-4" />
                    Contacts
                  </TabsTrigger>
                </TabsList>

                {/* Search & Filter Bar */}
                <div className="flex gap-4 mt-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  {(activeTab === 'frames' || activeTab === 'contacts') && availableBrands.length > 0 && (
                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Brands" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        {availableBrands.slice(0, 50).map(brand => (
                          <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Hidden Product Search - Inconspicuous "more" button */}
                  <Dialog open={showHiddenSearch} onOpenChange={(open) => {
                    setShowHiddenSearch(open)
                    if (!open) {
                      setHiddenSearchQuery('')
                      setHiddenSearchResults([])
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600" title="Search all products">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Find Any Product
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                          Search all products and services including those not shown in the main catalog.
                        </p>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="text"
                            placeholder="Search by name, SKU, brand..."
                            value={hiddenSearchQuery}
                            onChange={(e) => setHiddenSearchQuery(e.target.value)}
                            className="pl-10"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-96 overflow-y-auto space-y-2">
                          {hiddenSearchLoading ? (
                            <div className="text-center py-8 text-gray-500">Searching...</div>
                          ) : hiddenSearchQuery.length < 2 ? (
                            <div className="text-center py-8 text-gray-500">Enter at least 2 characters to search</div>
                          ) : hiddenSearchResults.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No products found</div>
                          ) : (
                            hiddenSearchResults.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-sm truncate">{item.name}</h3>
                                    <Badge variant="outline" className="text-xs">
                                      {item.category}
                                    </Badge>
                                  </div>
                                  {'brand' in item && item.brand && (
                                    <div className="text-xs text-gray-500">{item.brand}</div>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    {selectedCustomer?.hasAuthorization && item.insurancePays > 0 ? (
                                      <>
                                        <span className="font-semibold text-green-600">
                                          ${item.patientPays.toFixed(2)}
                                        </span>
                                        <span className="text-xs line-through text-gray-400">
                                          ${item.retailPrice.toFixed(2)}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="font-medium">${item.retailPrice.toFixed(2)}</span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    addToCart(item)
                                    setShowHiddenSearch(false)
                                    setHiddenSearchQuery('')
                                    setHiddenSearchResults([])
                                  }}
                                  className="ml-4"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Services Tab */}
                <TabsContent value="services" className="mt-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading services...</div>
                    ) : services.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No services found</div>
                    ) : (
                      services.map((service) => (
                        <ProductRow
                          key={service.id}
                          item={service}
                          onAdd={() => addToCart(service)}
                          hasInsurance={!!selectedCustomer?.hasAuthorization}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* Frames Tab */}
                <TabsContent value="frames" className="mt-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading frames...</div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No frames found</div>
                    ) : (
                      products.map((product) => (
                        <ProductRow
                          key={product.id}
                          item={product}
                          onAdd={() => addToCart(product)}
                          hasInsurance={!!selectedCustomer?.hasAuthorization}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* Lenses Tab */}
                <TabsContent value="lenses" className="mt-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading lenses...</div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No lenses found</div>
                    ) : (
                      products.map((product) => (
                        <ProductRow
                          key={product.id}
                          item={product}
                          onAdd={() => addToCart(product)}
                          hasInsurance={!!selectedCustomer?.hasAuthorization}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* Contacts Tab */}
                <TabsContent value="contacts" className="mt-4">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading contacts...</div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No contacts found</div>
                    ) : (
                      products.map((product) => (
                        <ProductRow
                          key={product.id}
                          item={product}
                          onAdd={() => addToCart(product)}
                          hasInsurance={!!selectedCustomer?.hasAuthorization}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Shopping Cart */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Cart is empty
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.name}</h4>
                        <div className="text-xs text-gray-600">
                          {item.insurancePays > 0 ? (
                            <>
                              <span className="text-green-600 font-medium">
                                ${item.patientPays.toFixed(2)}
                              </span>
                              <span className="line-through ml-2 text-gray-400">
                                ${item.retailPrice.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span>${item.patientPays.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="w-16 text-right text-sm font-medium">
                        ${item.total.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Retail Total:</span>
                    <span>${retailTotal.toFixed(2)}</span>
                  </div>
                  {totalInsuranceDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Insurance Covers:</span>
                      <span>-${totalInsuranceDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Patient Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (8.75%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-xl">
                    <span>Patient Pays:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>

                  <Button
                    className="w-full mt-4"
                    size="lg"
                    disabled={!selectedCustomer || processingPayment}
                    onClick={processPayment}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {processingPayment ? 'Processing...' : `Pay $${total.toFixed(2)}`}
                  </Button>

                  {!selectedCustomer && (
                    <p className="text-sm text-orange-600 text-center">
                      Select a customer to continue
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </PageLayout>
  )
}

// =============================================================================
// PRODUCT ROW COMPONENT
// =============================================================================

function ProductRow({
  item,
  onAdd,
  hasInsurance
}: {
  item: PosProduct | PosService
  onAdd: () => void
  hasInsurance: boolean
}) {
  const showDiscount = hasInsurance && item.insurancePays > 0

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm truncate">{item.name}</h3>
          {'inStock' in item && !item.inStock && (
            <Badge variant="outline" className="text-orange-600 text-xs">
              Out of Stock
            </Badge>
          )}
        </div>
        {'brand' in item && item.brand && (
          <div className="text-xs text-gray-500">{item.brand}</div>
        )}
        {'description' in item && item.description && (
          <div className="text-xs text-gray-500 truncate">{item.description}</div>
        )}
        <div className="flex items-center gap-2 mt-1">
          {showDiscount ? (
            <>
              <span className="font-semibold text-green-600">
                ${item.patientPays.toFixed(2)}
              </span>
              <span className="text-xs line-through text-gray-400">
                ${item.retailPrice.toFixed(2)}
              </span>
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                Save ${item.insurancePays.toFixed(2)}
              </Badge>
            </>
          ) : (
            <span className="font-medium">${item.retailPrice.toFixed(2)}</span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        onClick={onAdd}
        disabled={'inStock' in item && !item.inStock}
        className="ml-4"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
