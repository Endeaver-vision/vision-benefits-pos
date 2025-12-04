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
import { Loader2, DollarSign, Edit, Sparkles, AlertCircle } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string | null
  category: string
  categoryCode: string
  retailPrice: number
  customerPrice: number | null
  customPrice: number | null
  savings: number
  insuranceTier: string | null
  insuranceCarrier: string | null
  hasPricePlan: boolean
  priceOverrideReason: string | null
}

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
  const [searchTerm, setSearchTerm] = useState('')
  
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

  const filteredProducts = products.filter(product => {
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

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
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="text-sm text-muted-foreground">Products with Pricing</div>
              <div className="text-lg font-semibold">{summary?.productsWithPricing || 0}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Custom Overrides</div>
              <div className="text-lg font-semibold">{summary?.productsWithOverrides || 0}</div>
            </div>
          </div>

          {!customer?.insurance && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                This customer has no insurance on file. Click "Generate Price Plan" to create cash pricing, or add insurance to the customer profile first.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Retail Price</TableHead>
                  <TableHead className="text-center">Tier</TableHead>
                  <TableHead className="text-right">Customer Pays</TableHead>
                  <TableHead className="text-right">Savings</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map(product => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        {product.sku && (
                          <div className="text-sm text-muted-foreground">{product.sku}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
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
                          <span className={product.customerPrice ? 'font-semibold text-green-600' : 'text-muted-foreground'}>
                            {formatPrice(product.customerPrice)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {product.savings > 0 ? (
                          <span className="text-green-600 font-medium">
                            {formatPrice(product.savings)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openOverrideModal(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
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
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Retail Price</div>
                <div className="text-lg font-semibold">
                  {formatPrice(selectedProduct?.retailPrice || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Current Price</div>
                <div className="text-lg font-semibold text-green-600">
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
