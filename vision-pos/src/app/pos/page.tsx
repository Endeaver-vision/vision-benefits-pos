'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  User, 
  CreditCard,
  Calculator,
  Package,
  ArrowLeft
} from 'lucide-react'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  insuranceCarrier?: string
  memberId?: string
}

interface Product {
  id: string
  name: string
  sku?: string
  manufacturer?: string
  basePrice: number
  tierVsp?: string
  tierEyemed?: string
  tierSpectera?: string
  category: {
    name: string
    code: string
  }
}

interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
  insuranceDiscount: number
  total: number
}

export default function POSPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // State management
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  // Search customers
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

  // Search products
  const searchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (productSearch) params.append('search', productSearch)
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory)
      params.append('limit', '20')

      const response = await fetch(`/api/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProductResults(data.data || [])
      }
    } catch (error) {
      console.error('Product search error:', error)
    } finally {
      setLoading(false)
    }
  }, [productSearch, selectedCategory])

  // Load products on mount and search changes
  useEffect(() => {
    if (session) {
      searchProducts()
    }
  }, [session, searchProducts])

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch && showCustomerSearch) {
        searchCustomers(customerSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [customerSearch, showCustomerSearch, searchCustomers])

  // Calculate insurance discount based on customer and product
  const calculateInsuranceDiscount = (product: Product): number => {
    if (!selectedCustomer?.insuranceCarrier) return 0

    const carrier = selectedCustomer.insuranceCarrier.toLowerCase()
    let tier = ''

    switch (carrier) {
      case 'vsp':
        tier = product.tierVsp || ''
        break
      case 'eyemed':
        tier = product.tierEyemed || ''
        break
      case 'spectera':
        tier = product.tierSpectera || ''
        break
    }

    // Simple discount calculation - in real app this would be more complex
    if (tier) {
      return product.basePrice * 0.2 // 20% insurance discount
    }
    return 0
  }

  // Add product to cart
  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id)
    const insuranceDiscount = calculateInsuranceDiscount(product)
    const unitPrice = product.basePrice - insuranceDiscount

    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              total: (item.quantity + 1) * unitPrice
            }
          : item
      ))
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        unitPrice,
        insuranceDiscount,
        total: unitPrice
      }])
    }
  }

  // Update cart item quantity
  const updateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart(cart.map(item =>
      item.product.id === productId
        ? {
            ...item,
            quantity: newQuantity,
            total: newQuantity * item.unitPrice
          }
        : item
    ))
  }

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId))
  }

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
  const totalInsuranceDiscount = cart.reduce((sum, item) => sum + (item.insuranceDiscount * item.quantity), 0)
  const tax = subtotal * 0.0875 // 8.75% tax rate
  const total = subtotal + tax

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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
          <div className="h-6 w-px bg-neutral-300" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
            <p className="text-gray-600">Process customer transactions</p>
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
                    <h3 className="font-medium">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </h3>
                    <div className="text-sm text-gray-600">
                      {selectedCustomer.email && <div>📧 {selectedCustomer.email}</div>}
                      {selectedCustomer.insuranceCarrier && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{selectedCustomer.insuranceCarrier}</Badge>
                          {selectedCustomer.memberId && (
                            <span className="text-xs">ID: {selectedCustomer.memberId}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerSearch">Search Customer</Label>
                    <Input
                      id="customerSearch"
                      type="text"
                      placeholder="Search by name, email, or member ID..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value)
                        setShowCustomerSearch(true)
                      }}
                      onFocus={() => setShowCustomerSearch(true)}
                    />
                  </div>
                  
                  {showCustomerSearch && customerResults.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {customerResults.map((customer) => (
                        <div
                          key={customer.id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                          onClick={(e) => {
                            console.log('Customer clicked:', customer)
                            e.preventDefault()
                            e.stopPropagation()
                            setSelectedCustomer(customer)
                            setShowCustomerSearch(false)
                            setCustomerSearch('')
                          }}
                        >
                          <div className="font-medium">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {customer.email && <span>📧 {customer.email}</span>}
                            {customer.insuranceCarrier && (
                              <Badge variant="outline" className="ml-2">
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
                    onClick={() => router.push('/customers')}
                  >
                    Add New Customer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="productSearch">Search Products</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="productSearch"
                        type="text"
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="frames">Frames</SelectItem>
                        <SelectItem value="lenses">Lenses</SelectItem>
                        <SelectItem value="coatings">Coatings</SelectItem>
                        <SelectItem value="addons">Add-ons</SelectItem>
                        <SelectItem value="contacts">Contacts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Product Results */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">Searching products...</div>
                  ) : productResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No products found</div>
                  ) : (
                    productResults.map((product) => {
                      const insuranceDiscount = calculateInsuranceDiscount(product)
                      const finalPrice = product.basePrice - insuranceDiscount
                      
                      return (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{product.name}</h3>
                              <Badge variant="outline">{product.category.name}</Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              {product.manufacturer && <span>{product.manufacturer}</span>}
                              {product.sku && <span className="ml-2">SKU: {product.sku}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-medium">${finalPrice.toFixed(2)}</span>
                              {insuranceDiscount > 0 && (
                                <>
                                  <span className="text-sm line-through text-gray-400">
                                    ${product.basePrice.toFixed(2)}
                                  </span>
                                  <Badge variant="destructive" className="text-xs">
                                    -${insuranceDiscount.toFixed(2)}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addToCart(product)}
                            className="ml-4"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
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
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.product.name}</h4>
                        <div className="text-xs text-gray-600">
                          ${item.unitPrice.toFixed(2)} each
                          {item.insuranceDiscount > 0 && (
                            <span className="text-green-600 ml-1">
                              (${item.insuranceDiscount.toFixed(2)} off)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFromCart(item.product.id)}
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
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {totalInsuranceDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Insurance Discount:</span>
                      <span>-${totalInsuranceDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax (8.75%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  
                  <Button 
                    className="w-full mt-4" 
                    size="lg"
                    disabled={!selectedCustomer}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Process Payment
                  </Button>
                  
                  {!selectedCustomer && (
                    <p className="text-sm text-gray-500 text-center">
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
  )
}