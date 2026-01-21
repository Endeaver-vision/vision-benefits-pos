'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from '@/components/ui/textarea'
import {
  Shield, Edit, Save, X, FileSearch, Sparkles, Loader2, RefreshCw,
  DollarSign, Clock, CheckCircle, AlertTriangle, History
} from 'lucide-react'
import InsuranceSelector, { InsuranceData } from '@/components/insurance-selector'
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
  frameAllowanceMin?: number | null
  frameAllowanceMax?: number | null
  contactAllowance: number | null
  isContactDecliningBalance?: boolean
  contactFittingCopay?: number | string | null
  contactLensCost?: string | null
  expirationDate: string | null
  copays?: Record<string, number | string | null>
}

interface Product {
  id: string
  name: string
  sku: string | null
  category: string
  categoryCode: string
  retailPrice: number
  customerPrice: number | null
  savings: number
  insuranceTier: string | null
  insuranceCarrier: string | null
  hasPricePlan: boolean
  pricingMethod?: string | null
  needsTierAssignment: boolean
}

interface PriceListHistory {
  id: string
  authorizationId: string | null
  carrier: string
  planName: string
  createdAt: string
  productCount: number
  active: boolean
}

interface CustomerInsurancePricingProps {
  customerId: string
  customer: Customer
  onUpdate?: () => void
}

export default function CustomerInsurancePricing({
  customerId,
  customer,
  onUpdate
}: CustomerInsurancePricingProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [authData, setAuthData] = useState<AuthorizationData | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(false)
  const [generatingPrices, setGeneratingPrices] = useState(false)

  // Products state
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Price list history
  const [priceListHistory, setPriceListHistory] = useState<PriceListHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Override modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [overridePrice, setOverridePrice] = useState('')
  const [overrideReasonPreset, setOverrideReasonPreset] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [savingOverride, setSavingOverride] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
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

  // Fetch authorization data
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
          frameAllowanceMin: data.authorization.frameAllowanceMin,
          frameAllowanceMax: data.authorization.frameAllowanceMax,
          contactAllowance: data.authorization.contactAllowance,
          isContactDecliningBalance: data.authorization.isContactDecliningBalance,
          contactFittingCopay: data.authorization.contactFittingCopay,
          contactLensCost: data.authorization.contactLensCost,
          expirationDate: data.authorization.expirationDate,
          copays: data.authorization.copays
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

  // Fetch products/price list
  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/price-plan`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoadingProducts(false)
    }
  }

  // Fetch price list history
  const fetchHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/price-plan/history`)
      if (response.ok) {
        const data = await response.json()
        setPriceListHistory(data.history || [])
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Activate a price list
  const activatePriceList = async (authorizationId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/price-plan/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationId })
      })
      if (response.ok) {
        toast({ title: 'Price List Activated', description: 'The selected price list is now active.' })
        await fetchHistory()
        await fetchProducts()
      } else {
        throw new Error('Failed to activate')
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to activate price list', variant: 'destructive' })
    }
  }

  useEffect(() => {
    if (customerId) {
      fetchAuthorization()
      fetchProducts()
    }
  }, [customerId])

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
      if (result.success) {
        toast({ title: 'Insurance Updated', description: 'Customer insurance information has been saved.' })
        setIsEditing(false)
        if (onUpdate) onUpdate()
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to update insurance', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save insurance information', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
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
          description: `Mapped ${result.stats?.mappedProducts || 0} products.`
        })
        await fetchProducts()
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

  const openOverrideModal = (product: Product) => {
    setSelectedProduct(product)
    setOverridePrice(product.customerPrice?.toString() || product.retailPrice.toString())
    setOverrideReason('')
    setOverrideReasonPreset('')
    setOverrideModalOpen(true)
  }

  const saveOverride = async () => {
    if (!selectedProduct) return
    const price = parseFloat(overridePrice)
    if (isNaN(price) || price < 0) {
      toast({ title: 'Error', description: 'Please enter a valid price', variant: 'destructive' })
      return
    }
    const reason = overrideReasonPreset === 'custom' ? overrideReason : overrideReasonPreset

    setSavingOverride(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/price-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          customPrice: price,
          reason: reason
        })
      })
      if (response.ok) {
        await fetchProducts()
        setOverrideModalOpen(false)
        toast({ title: 'Price Updated', description: `${selectedProduct.name} price set to $${price.toFixed(2)}` })
      } else {
        toast({ title: 'Error', description: 'Failed to save price override', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save price override', variant: 'destructive' })
    } finally {
      setSavingOverride(false)
    }
  }

  // Helpers
  const formatPrice = (price: number | null) => {
    if (price === null) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
  }

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getCarrierColor = (carrier: string | null) => {
    switch (carrier?.toUpperCase()) {
      case 'VSP': return 'bg-blue-600'
      case 'EYEMED': return 'bg-emerald-600'
      case 'SPECTERA': return 'bg-purple-600'
      default: return 'bg-gray-600'
    }
  }

  // Format special pricing values for display
  const formatYouPay = (product: Product): { text: string; subtext?: string; color: string } => {
    if (product.customerPrice === null) {
      return { text: 'At retail', subtext: formatPrice(product.retailPrice), color: 'text-amber-400' }
    }

    // Check if using discount pricing
    if (product.pricingMethod === 'ins_discount' || product.needsTierAssignment) {
      const discountPercent = Math.round((1 - product.customerPrice / product.retailPrice) * 100)
      return {
        text: `${discountPercent}% off`,
        subtext: formatPrice(product.customerPrice),
        color: 'text-amber-400'
      }
    }

    // Regular copay
    return { text: formatPrice(product.customerPrice), subtext: 'copay', color: 'text-emerald-400' }
  }

  // Format contact lens benefit for display
  const formatContactBenefit = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return 'Not covered'
    if (typeof value === 'number') return formatPrice(value)
    // Handle text descriptions like "100% of amount over remaining balance"
    if (value.includes('100%')) return 'Patient pays 100% of overage'
    if (value.includes('85%')) return 'Patient pays 85% of overage (15% off)'
    if (value.includes('DISCOUNT')) {
      const match = value.match(/DISCOUNT_(\d+)/)
      if (match) return `${match[1]}% discount`
    }
    return value
  }

  const hasInsurance = (customer.insuranceCarrier && customer.insuranceCarrier !== 'None') || authData !== null
  const effectiveCarrier = authData?.carrier?.toUpperCase() || customer.insuranceCarrier?.toUpperCase() || null

  // Filter products
  const categories = Array.from(new Set(products.map(p => p.category)))
  const filteredProducts = products.filter(product => {
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Group by category
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = []
    acc[product.category].push(product)
    return acc
  }, {} as Record<string, Product[]>)

  return (
    <div className="space-y-4">
      {/* Compact Insurance Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="h-5 w-5 text-blue-500" />
              {loadingAuth ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : hasInsurance ? (
                <>
                  <Badge className={`${getCarrierColor(effectiveCarrier)} text-white`}>
                    {effectiveCarrier}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {authData?.planName || 'Insurance Plan'}
                  </span>
                  {(customer.memberId || authData?.memberId) && (
                    <>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-sm">Member: {customer.memberId || authData?.memberId}</span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">No insurance on file</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowScanner(!showScanner)}>
                <FileSearch className="h-4 w-4 mr-2" />
                {showScanner ? 'Hide Scanner' : 'Scan Document'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Benefits Summary Row */}
          {authData && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Exam:</span>
                  <span className="font-semibold text-emerald-400">{formatPrice(authData.examCopay)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">CL Fit:</span>
                  <span className="font-semibold text-emerald-400">
                    {typeof authData.contactFittingCopay === 'number'
                      ? formatPrice(authData.contactFittingCopay)
                      : formatContactBenefit(authData.contactFittingCopay)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Materials:</span>
                  <span className="font-semibold text-blue-400">{formatPrice(authData.materialsCopay)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Frame:</span>
                  <span className="font-semibold text-amber-400">
                    {authData.frameAllowanceMin && authData.frameAllowanceMax && authData.frameAllowanceMin !== authData.frameAllowanceMax
                      ? `${formatPrice(authData.frameAllowanceMin)}-${formatPrice(authData.frameAllowanceMax)}`
                      : formatPrice(authData.frameAllowance)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">CL:</span>
                  <span className="font-semibold text-purple-400">{formatPrice(authData.contactAllowance)}</span>
                  {authData.isContactDecliningBalance && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-purple-500 text-purple-400">
                      Declining
                    </Badge>
                  )}
                </div>
              </div>
              {authData.contactLensCost && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Contact lens overage: {formatContactBenefit(authData.contactLensCost)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanner (collapsible) */}
      {showScanner && (
        <Card>
          <CardContent className="py-4">
            <InlineScanner
              customerId={customerId}
              onDocumentProcessed={async (result) => {
                if (result.success) {
                  toast({
                    title: 'Document Processed',
                    description: `${result.carrier || 'Insurance'} document scanned. Generating prices...`
                  })
                  await fetchAuthorization()
                  await handleGeneratePricePlan()
                  if (onUpdate) onUpdate()
                }
              }}
              onClose={() => setShowScanner(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Insurance Edit Modal */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Insurance Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <InsuranceSelector
                value={insuranceData}
                onChange={setInsuranceData}
                showDetails={true}
                compact={false}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Insurance'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="price-list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="price-list">Products</TabsTrigger>
          <TabsTrigger value="history" onClick={() => !priceListHistory.length && fetchHistory()}>
            History
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="price-list" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              {/* Search and filters */}
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="ml-auto">
                  <Button
                    onClick={handleGeneratePricePlan}
                    disabled={generatingPrices || !authData}
                    className="flex items-center gap-2"
                  >
                    {generatingPrices ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {generatingPrices ? 'Generating...' : 'Regenerate Prices'}
                  </Button>
                </div>
              </div>

              {/* Products table */}
              {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {products.length === 0
                    ? 'No price list generated. Click "Regenerate Prices" to create one.'
                    : 'No products match your search.'}
                </div>
              ) : (
                Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                  <div key={category} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{category}</Badge>
                      <span className="text-sm text-muted-foreground">({categoryProducts.length})</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Retail</TableHead>
                          <TableHead className="text-right">You Pay</TableHead>
                          <TableHead className="text-right">Savings</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryProducts.map(product => {
                          const youPay = formatYouPay(product)
                          return (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div className="font-medium">{product.name}</div>
                                {product.sku && (
                                  <div className="text-xs text-muted-foreground">{product.sku}</div>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatPrice(product.retailPrice)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className={`font-semibold ${youPay.color}`}>
                                  {youPay.text}
                                </div>
                                {youPay.subtext && (
                                  <div className="text-xs text-muted-foreground">{youPay.subtext}</div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {product.savings > 0 ? (
                                  <span className="text-emerald-400 font-medium">
                                    {formatPrice(product.savings)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => openOverrideModal(product)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Price List History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : priceListHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No price list history available.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Carrier / Plan</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceListHistory.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={`${getCarrierColor(item.carrier)} text-white w-fit`}>
                              {item.carrier}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{item.planName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.productCount} products</TableCell>
                        <TableCell>
                          {item.active ? (
                            <Badge variant="default" className="bg-emerald-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!item.active && item.authorizationId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => activatePriceList(item.authorizationId!)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Activate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Override Modal */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Custom Price</DialogTitle>
            <DialogDescription>
              Override the price for: {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Retail Price</div>
                <div className="text-lg font-semibold">{formatPrice(selectedProduct?.retailPrice || 0)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Current Price</div>
                <div className="text-lg font-semibold text-emerald-400">
                  {formatPrice(selectedProduct?.customerPrice || selectedProduct?.retailPrice || 0)}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Custom Price</label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  value={overridePrice}
                  onChange={(e) => setOverridePrice(e.target.value)}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Reason for Override</label>
              <Select value={overrideReasonPreset} onValueChange={setOverrideReasonPreset}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="special-promotion">Special Promotion</SelectItem>
                  <SelectItem value="loyalty-discount">Loyalty Discount</SelectItem>
                  <SelectItem value="price-match">Price Match Competitor</SelectItem>
                  <SelectItem value="staff-accommodation">Staff Accommodation</SelectItem>
                  <SelectItem value="warranty-replacement">Warranty Replacement</SelectItem>
                  <SelectItem value="custom">Custom (specify below)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {overrideReasonPreset === 'custom' && (
              <div>
                <label className="text-sm font-medium">Custom Reason</label>
                <Textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Enter reason..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideModalOpen(false)} disabled={savingOverride}>
              Cancel
            </Button>
            <Button onClick={saveOverride} disabled={savingOverride}>
              {savingOverride ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Override'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
