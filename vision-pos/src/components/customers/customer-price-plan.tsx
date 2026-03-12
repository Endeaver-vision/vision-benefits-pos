'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Loader2, DollarSign, Edit, Sparkles, AlertCircle, AlertTriangle, ChevronDown, ChevronRight, Star, Package, Download } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string | null
  category: string
  categoryCode: string
  categoryDisplayOrder: number
  displayGroup: string  // 'everyday' or 'reserve'
  displayOrder: number
  retailPrice: number
  customerPrice: number | null
  customPrice: number | null
  savings: number
  insuranceTier: string | null
  insuranceCarrier: string | null
  hasPricePlan: boolean
  needsTierAssignment: boolean  // True if using 80% retail fallback
  priceOverrideReason: string | null
}

// Categories that MUST have prices for POS to work
const KEY_CATEGORIES = [
  'PROGRESSIVE_LENSES',
  'AR_COATINGS',
  'FRAMES',
  'EXAMS',
  'LENS_MATERIALS'
]

interface CustomerPricePlanProps {
  customerId: string
}

export default function CustomerPricePlan({ customerId }: CustomerPricePlanProps) {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [customer, setCustomer] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterCarrier, setFilterCarrier] = useState<string>('all')  // New: filter by carrier
  const [filterMissing, setFilterMissing] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showReserve, setShowReserve] = useState(false)  // Collapsed by default

  // Override modal state
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [overridePrice, setOverridePrice] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideReasonPreset, setOverrideReasonPreset] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPricePlan()
  }, [customerId])

  const fetchPricePlan = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/customers/${customerId}/price-plan`)
      if (response.ok) {
        const data = await response.json()
        setCustomer(data.customer)
        setProducts(data.products)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching price plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateBulkPricePlan = async () => {
    if (!confirm('This will regenerate all prices based on insurance. Any custom overrides will be lost. Continue?')) {
      return
    }

    try {
      setGenerating(true)
      const response = await fetch(`/api/customers/${customerId}/price-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-bulk' })
      })

      if (response.ok) {
        await fetchPricePlan()
        alert('Price plan generated successfully!')
      } else {
        alert('Failed to generate price plan')
      }
    } catch (error) {
      console.error('Error generating price plan:', error)
      alert('Error generating price plan')
    } finally {
      setGenerating(false)
    }
  }

  const exportPriceList = () => {
    // Build CSV content
    const headers = ['Product', 'Category', 'SKU', 'Retail Price', 'Customer Price', 'Savings', 'Tier', 'Carrier']
    const rows = products.map(p => [
      p.name,
      p.category,
      p.sku || '',
      p.retailPrice.toFixed(2),
      p.customerPrice !== null ? p.customerPrice.toFixed(2) : 'N/A',
      p.savings > 0 ? p.savings.toFixed(2) : '0.00',
      p.insuranceTier || '',
      p.insuranceCarrier || 'Cash'
    ])

    const csvContent = [
      `Price List for ${customer?.name || 'Customer'}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      `Insurance: ${customer?.insurance?.carrier || 'None'}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `price-list-${customer?.name?.replace(/\s+/g, '-') || 'customer'}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const openOverrideModal = (product: Product) => {
    setSelectedProduct(product)
    setOverridePrice(product.customerPrice?.toString() || product.retailPrice.toString())
    setOverrideReason(product.priceOverrideReason || '')
    setOverrideReasonPreset('')
    setOverrideModalOpen(true)
  }

  const saveOverride = async () => {
    if (!selectedProduct) return

    const price = parseFloat(overridePrice)
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price')
      return
    }

    const reason = overrideReasonPreset === 'custom' 
      ? overrideReason 
      : overrideReasonPreset

    try {
      setSaving(true)
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
        await fetchPricePlan()
        setOverrideModalOpen(false)
      } else {
        alert('Failed to save price override')
      }
    } catch (error) {
      console.error('Error saving override:', error)
      alert('Error saving price override')
    } finally {
      setSaving(false)
    }
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const categories = Array.from(new Set(products.map(p => p.category)))
  const carriers = Array.from(new Set(products.map(p => p.insuranceCarrier).filter((c): c is string => c !== null)))

  // Calculate missing prices stats
  const missingPrices = products.filter(p => p.customerPrice === null)
  const missingKeyPrices = missingPrices.filter(p => KEY_CATEGORIES.includes(p.categoryCode))
  const hasMissingKeyPrices = missingKeyPrices.length > 0

  // Products using fallback pricing (80% retail - needs tier assignment)
  const fallbackPricedProducts = products.filter(p => p.needsTierAssignment)
  const tierBasedProducts = products.filter(p => p.hasPricePlan && !p.needsTierAssignment && p.customerPrice !== null)

  const filteredProducts = products.filter(product => {
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    const matchesCarrier = filterCarrier === 'all' || product.insuranceCarrier === filterCarrier
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMissing = !filterMissing || product.customerPrice === null
    return matchesCategory && matchesCarrier && matchesSearch && matchesMissing
  })

  // Split into everyday and reserve products
  const everydayProducts = filteredProducts.filter(p => p.displayGroup === 'everyday')
  const reserveProducts = filteredProducts.filter(p => p.displayGroup === 'reserve')

  // Group products by category for display
  const groupByCategory = (prods: Product[]) => {
    const groups: { [key: string]: Product[] } = {}
    prods.forEach(p => {
      if (!groups[p.category]) {
        groups[p.category] = []
      }
      groups[p.category].push(p)
    })
    // Sort categories by displayOrder
    return Object.entries(groups).sort((a, b) => {
      const orderA = a[1][0]?.categoryDisplayOrder ?? 100
      const orderB = b[1][0]?.categoryDisplayOrder ?? 100
      return orderA - orderB
    })
  }

  const everydayByCategory = groupByCategory(everydayProducts)
  const reserveByCategory = groupByCategory(reserveProducts)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Price Plan for {customer?.name}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={exportPriceList}
                disabled={products.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                onClick={generateBulkPricePlan}
                disabled={generating}
                className="flex items-center gap-2"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generating ? 'Generating...' : 'Generate Price Plan'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Insurance</div>
              <div className="text-lg font-semibold">
                {customer?.insurance?.carrier || 'None'}
              </div>
              {customer?.insurance?.planName && (
                <div className="text-sm text-muted-foreground">
                  {customer.insurance.planName}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Products</div>
              <div className="text-lg font-semibold">{summary?.totalProducts || 0}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Tier-Based Pricing</div>
              <div className="text-lg font-semibold text-emerald-500">{tierBasedProducts.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Fallback Pricing</div>
              <div className={`text-lg font-semibold ${fallbackPricedProducts.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {fallbackPricedProducts.length}
              </div>
              {fallbackPricedProducts.length > 0 && (
                <div className="text-xs text-muted-foreground">80% of retail</div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Custom Overrides</div>
              <div className="text-lg font-semibold">{summary?.productsWithOverrides || 0}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Missing Prices</div>
              <div className={`text-lg font-semibold ${missingPrices.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {missingPrices.length}
              </div>
            </div>
          </div>

          {hasMissingKeyPrices && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-400">
                <strong className="text-red-300">{missingKeyPrices.length} key product(s) need manual pricing.</strong> These products cannot be added to POS until prices are set:
                <ul className="mt-1 list-disc list-inside text-red-400/80">
                  {missingKeyPrices.slice(0, 5).map(p => (
                    <li key={p.id}>{p.name} ({p.category})</li>
                  ))}
                  {missingKeyPrices.length > 5 && (
                    <li>...and {missingKeyPrices.length - 5} more</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {fallbackPricedProducts.length > 0 && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-400">
                <strong className="text-amber-300">{fallbackPricedProducts.length} product(s) using fallback pricing (80% of retail).</strong> These products don&apos;t have a tier assignment for this carrier. The price is set to 20% off retail. Consider assigning proper tier codes for accurate insurance pricing.
              </div>
            </div>
          )}

          {!customer?.insurance && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm text-amber-400">
                This customer has no insurance on file. Click "Generate Price Plan" to create cash pricing, or add insurance to the customer profile first.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {carriers.length > 1 && (
              <Select value={filterCarrier} onValueChange={setFilterCarrier}>
                <SelectTrigger>
                  <SelectValue placeholder="All Carriers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Carriers</SelectItem>
                  {carriers.map(carrier => (
                    <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant={filterMissing ? "destructive" : "outline"}
              onClick={() => setFilterMissing(!filterMissing)}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {filterMissing ? `Showing ${missingPrices.length} Missing` : 'Show Missing Only'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Everyday Products Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-amber-400" />
            Everyday Products
            <Badge variant="secondary" className="ml-2">{everydayProducts.length}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Common products sold daily in the office
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {everydayByCategory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No everyday products found matching filters
            </div>
          ) : (
            everydayByCategory.map(([category, categoryProducts]) => (
              <div key={category} className="border-t first:border-t-0">
                <div className="px-4 py-2 bg-muted/30 font-medium text-sm flex items-center gap-2">
                  <Badge variant="outline">{category}</Badge>
                  <span className="text-muted-foreground">({categoryProducts.length})</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        {carriers.length > 1 && <TableHead className="text-center">Carrier</TableHead>}
                        <TableHead className="text-right">Retail</TableHead>
                        <TableHead className="text-center">Tier</TableHead>
                        <TableHead className="text-right">Customer Pays</TableHead>
                        <TableHead className="text-right">Savings</TableHead>
                        <TableHead className="text-center w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryProducts.map(product => {
                        const isMissingPrice = product.customerPrice === null
                        const isKeyCategory = KEY_CATEGORIES.includes(product.categoryCode)
                        const needsAttention = isMissingPrice && isKeyCategory

                        return (
                          <TableRow
                            key={`${product.id}-${product.insuranceCarrier || 'cash'}`}
                            className={needsAttention ? 'bg-red-500/10' : isMissingPrice ? 'bg-amber-500/10' : ''}
                          >
                            <TableCell>
                              <div className="font-medium">{product.name}</div>
                              {product.sku && (
                                <div className="text-xs text-muted-foreground">{product.sku}</div>
                              )}
                            </TableCell>
                            {carriers.length > 1 && (
                              <TableCell className="text-center">
                                {product.insuranceCarrier ? (
                                  <Badge
                                    className={`text-xs ${
                                      product.insuranceCarrier === 'VSP'
                                        ? 'bg-blue-500/20 text-blue-300 border-blue-400/50'
                                        : product.insuranceCarrier === 'EYEMED'
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                                        : 'bg-purple-500/20 text-purple-300 border-purple-400/50'
                                    }`}
                                  >
                                    {product.insuranceCarrier}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="text-right text-muted-foreground">
                              {formatPrice(product.retailPrice)}
                            </TableCell>
                            <TableCell className="text-center">
                              {product.insuranceTier ? (
                                <Badge variant="secondary" className="text-xs">
                                  {product.insuranceTier}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {product.customPrice !== null && (
                                  <Badge variant="default" className="text-xs">Override</Badge>
                                )}
                                {product.needsTierAssignment && product.customPrice === null && (
                                  <Badge className="text-xs bg-amber-500/20 text-amber-300 border-amber-400/50">Fallback</Badge>
                                )}
                                {isMissingPrice ? (
                                  <span className={`font-semibold ${needsAttention ? 'text-red-400' : 'text-amber-400'}`}>
                                    NEEDS PRICE
                                  </span>
                                ) : (
                                  <span className={`font-semibold ${product.needsTierAssignment && product.customPrice === null ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {formatPrice(product.customerPrice)}
                                  </span>
                                )}
                              </div>
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
                            <TableCell className="text-center">
                              <Button
                                variant={needsAttention ? "destructive" : "ghost"}
                                size="sm"
                                onClick={() => openOverrideModal(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Reserve Products Section - Collapsible */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setShowReserve(!showReserve)}
        >
          <CardTitle className="flex items-center gap-2 text-lg">
            {showReserve ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
            <Package className="h-5 w-5 text-muted-foreground" />
            Reserve Products
            <Badge variant="outline" className="ml-2">{reserveProducts.length}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Additional products available for special cases
          </p>
        </CardHeader>
        {showReserve && (
          <CardContent className="p-0">
            {reserveByCategory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reserve products found matching filters
              </div>
            ) : (
              reserveByCategory.map(([category, categoryProducts]) => (
                <div key={category} className="border-t first:border-t-0">
                  <div className="px-4 py-2 bg-muted/20 font-medium text-sm flex items-center gap-2">
                    <Badge variant="outline">{category}</Badge>
                    <span className="text-muted-foreground">({categoryProducts.length})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          {carriers.length > 1 && <TableHead className="text-center">Carrier</TableHead>}
                          <TableHead className="text-right">Retail</TableHead>
                          <TableHead className="text-center">Tier</TableHead>
                          <TableHead className="text-right">Customer Pays</TableHead>
                          <TableHead className="text-right">Savings</TableHead>
                          <TableHead className="text-center w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryProducts.map(product => {
                          const isMissingPrice = product.customerPrice === null
                          const isKeyCategory = KEY_CATEGORIES.includes(product.categoryCode)
                          const needsAttention = isMissingPrice && isKeyCategory

                          return (
                            <TableRow
                              key={`${product.id}-${product.insuranceCarrier || 'cash'}`}
                              className={needsAttention ? 'bg-red-500/10' : isMissingPrice ? 'bg-amber-500/10' : ''}
                            >
                              <TableCell>
                                <div className="font-medium">{product.name}</div>
                                {product.sku && (
                                  <div className="text-xs text-muted-foreground">{product.sku}</div>
                                )}
                              </TableCell>
                              {carriers.length > 1 && (
                                <TableCell className="text-center">
                                  {product.insuranceCarrier ? (
                                    <Badge
                                      className={`text-xs ${
                                        product.insuranceCarrier === 'VSP'
                                          ? 'bg-blue-500/20 text-blue-300 border-blue-400/50'
                                          : product.insuranceCarrier === 'EYEMED'
                                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                                          : 'bg-purple-500/20 text-purple-300 border-purple-400/50'
                                      }`}
                                    >
                                      {product.insuranceCarrier}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="text-right text-muted-foreground">
                                {formatPrice(product.retailPrice)}
                              </TableCell>
                              <TableCell className="text-center">
                                {product.insuranceTier ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {product.insuranceTier}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {product.customPrice !== null && (
                                    <Badge variant="default" className="text-xs">Override</Badge>
                                  )}
                                  {product.needsTierAssignment && product.customPrice === null && (
                                    <Badge className="text-xs bg-amber-500/20 text-amber-300 border-amber-400/50">Fallback</Badge>
                                  )}
                                  {isMissingPrice ? (
                                    <span className={`font-semibold ${needsAttention ? 'text-red-400' : 'text-amber-400'}`}>
                                      NEEDS PRICE
                                    </span>
                                  ) : (
                                    <span className={`font-semibold ${product.needsTierAssignment && product.customPrice === null ? 'text-amber-400' : 'text-emerald-400'}`}>
                                      {formatPrice(product.customerPrice)}
                                    </span>
                                  )}
                                </div>
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
                              <TableCell className="text-center">
                                <Button
                                  variant={needsAttention ? "destructive" : "ghost"}
                                  size="sm"
                                  onClick={() => openOverrideModal(product)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        )}
      </Card>

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
                <div className="text-lg font-semibold">
                  {formatPrice(selectedProduct?.retailPrice || 0)}
                </div>
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
              <Select 
                value={overrideReasonPreset} 
                onValueChange={setOverrideReasonPreset}
              >
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
            <Button
              variant="outline"
              onClick={() => setOverrideModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={saveOverride}
              disabled={saving}
            >
              {saving ? (
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
