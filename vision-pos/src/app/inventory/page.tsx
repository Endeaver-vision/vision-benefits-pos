'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Loader2,
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  Glasses,
  Pill,
  Droplets,
  Plus,
  Minus
} from 'lucide-react'
import PageLayout from '@/components/layout/page-layout'

interface Product {
  id: string
  name: string
  sku: string | null
  manufacturer: string | null
  basePrice: number
  color?: string
  category: {
    id: string
    name: string
  }
}

interface LocationStock {
  locationId: string
  locationName: string
  shortName: string
  quantity: number
}

interface InventoryItem {
  id: string
  currentStock: number
  reservedStock: number
  availableStock: number
  reorderPoint: number
  reorderQuantity: number
  maxStock: number | null
  costPrice: number | null
  lastRestocked: string | null
  lastSold: string | null
  product: Product
  stockByLocation: LocationStock[]
  movements: Array<{
    id: string
    type: string
    quantity: number
    reason: string | null
    createdAt: string
    user: {
      firstName: string
      lastName: string
    } | null
  }>
}

interface Category {
  id: string
  name: string
  code: string
}

interface LocationInfo {
  id: string
  name: string
  shortName: string
}

interface InventoryResponse {
  data: InventoryItem[]
  locations: LocationInfo[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: {
    totalItems: number
    lowStockCount: number
    totalValue: number
    lastUpdated: string
  }
}

type ProductType = 'frames' | 'supplements' | 'dryeye'

const PRODUCT_TYPES: { value: ProductType; label: string; icon: React.ReactNode }[] = [
  { value: 'frames', label: 'Frames', icon: <Glasses className="h-4 w-4" /> },
  { value: 'supplements', label: 'Supplements', icon: <Pill className="h-4 w-4" /> },
  { value: 'dryeye', label: 'Dry Eye', icon: <Droplets className="h-4 w-4" /> }
]

export default function InventoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [productType, setProductType] = useState<ProductType>('frames')
  const [summary, setSummary] = useState({
    totalItems: 0,
    lowStockCount: 0,
    totalValue: 0,
    lastUpdated: ''
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  // Pagination state (server-side)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Add product modal state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addingProduct, setAddingProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: '',
    brand: '',
    sku: '',
    wholesaleCost: '',
    retailPrice: '',
    stockQuantity: ''
  })

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
  }, [router])

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }, [])

  // Load inventory
  const loadInventory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('type', productType)
      params.append('page', currentPage.toString())
      params.append('limit', itemsPerPage.toString())
      if (searchTerm) params.append('search', searchTerm)
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory)
      if (showLowStockOnly && productType !== 'frames') params.append('lowStock', 'true')

      const response = await fetch(`/api/inventory?${params.toString()}`)
      if (response.ok) {
        const data: InventoryResponse = await response.json()
        setInventory(data.data)
        setSummary(data.summary)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalItems(data.pagination?.total || data.data.length)
      } else {
        console.error('Failed to load inventory')
      }
    } catch (error) {
      console.error('Inventory loading error:', error)
    } finally {
      setLoading(false)
    }
  }, [productType, currentPage, itemsPerPage, searchTerm, selectedCategory, showLowStockOnly])

  useEffect(() => {
    loadCategories()
    loadInventory()
  }, [loadCategories, loadInventory])

  const getStockStatus = (item: InventoryItem) => {
    if (item.availableStock <= 0) {
      return { status: 'out-of-stock', label: 'Out of Stock', variant: 'destructive' as const }
    } else if (item.currentStock <= item.reorderPoint) {
      return { status: 'low-stock', label: 'Low Stock', variant: 'secondary' as const }
    } else {
      return { status: 'in-stock', label: 'In Stock', variant: 'default' as const }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  // Server-side pagination - data already paginated from API
  const startIndex = (currentPage - 1) * itemsPerPage

  // Reset to page 1 when filters change (not when page changes)
  useEffect(() => {
    setCurrentPage(1)
  }, [productType, searchTerm, selectedCategory, showLowStockOnly, itemsPerPage])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    scrollToTop()
  }

  // Adjust stock quantity
  const adjustStock = async (itemId: string, delta: number) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: delta,
          productType,
          reason: delta > 0 ? 'Manual stock addition' : 'Manual stock removal'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Stock adjustment failed:', errorData)
        alert(`Stock adjustment failed: ${errorData.error || 'Unknown error'}`)
        return
      }

      // Reload inventory to reflect changes
      loadInventory()
    } catch (error) {
      console.error('Stock adjustment error:', error)
      alert('Stock adjustment failed. Check console for details.')
    }
  }

  // Reset new product form
  const resetNewProduct = () => {
    setNewProduct({
      name: '',
      brand: '',
      sku: '',
      wholesaleCost: '',
      retailPrice: '',
      stockQuantity: ''
    })
  }

  // Add new product
  const addProduct = async () => {
    if (!newProduct.name || !newProduct.retailPrice) {
      alert('Name and retail price are required')
      return
    }

    setAddingProduct(true)
    try {
      const response = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType,
          name: newProduct.name,
          brand: newProduct.brand || null,
          sku: newProduct.sku || null,
          wholesaleCost: newProduct.wholesaleCost ? parseFloat(newProduct.wholesaleCost) : null,
          retailPrice: parseFloat(newProduct.retailPrice),
          stockQuantity: newProduct.stockQuantity ? parseInt(newProduct.stockQuantity) : 0
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        alert(`Failed to add product: ${errorData.error || 'Unknown error'}`)
        return
      }

      // Success - close modal and reload inventory
      setAddModalOpen(false)
      resetNewProduct()
      loadInventory()
    } catch (error) {
      console.error('Add product error:', error)
      alert('Failed to add product. Check console for details.')
    } finally {
      setAddingProduct(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }


  return (
    <PageLayout
      title="Inventory Management"
      subtitle="Manage your product inventory and stock levels"
    >
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalItems}</div>
              <p className="text-xs text-muted-foreground">
                Products in inventory
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {summary.lowStockCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Items need restocking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Current inventory value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {formatDate(summary.lastUpdated)}
              </div>
              <p className="text-xs text-muted-foreground">
                Inventory sync
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Product Type Tabs */}
        <Tabs value={productType} onValueChange={(v) => setProductType(v as ProductType)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3 max-w-xl">
            {PRODUCT_TYPES.map((type) => (
              <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-2">
                {type.icon}
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
                  <Input
                    placeholder={`Search ${PRODUCT_TYPES.find(t => t.value === productType)?.label || 'products'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {productType === 'frames' && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {productType !== 'frames' && (
                <Button
                  variant={showLowStockOnly ? "default" : "outline"}
                  onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                  className="whitespace-nowrap"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Low Stock Only
                </Button>
              )}
              <Button
                onClick={() => setAddModalOpen(true)}
                className="whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Inventory Items</CardTitle>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/70">
                Showing {startIndex + 1}-{Math.min(startIndex + inventory.length, totalItems)} of {totalItems}
              </span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {inventory.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-white/50 mx-auto mb-4" />
                <p className="text-white/70">No inventory items found</p>
                <p className="text-sm text-white/50">
                  Try adjusting your search criteria
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left p-4 font-medium text-white">Product</th>
                      <th className="text-right p-4 font-medium text-white">Stock</th>
                      <th className="text-right p-4 font-medium text-white">Wholesale</th>
                      <th className="text-right p-4 font-medium text-white">Retail</th>
                      <th className="text-center p-4 font-medium text-white">Status</th>
                      <th className="text-center p-4 font-medium text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => {
                      const stockStatus = getStockStatus(item)
                      const wholesaleValue = (item.costPrice || 0) * item.currentStock

                      return (
                        <tr key={item.id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="p-4">
                            <div>
                              <div className="font-medium text-white">{item.product.name}</div>
                              <div className="text-sm text-white/70">
                                {item.product.color && <span className="mr-2">{item.product.color}</span>}
                                {item.product.sku && <span>SKU: {item.product.sku}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right font-bold text-lg">
                            {item.currentStock}
                          </td>
                          <td className="p-4 text-right text-white/70">
                            {formatCurrency(wholesaleValue)}
                          </td>
                          <td className="p-4 text-right font-medium">
                            {formatCurrency(item.product.basePrice)}
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant={stockStatus.variant}>
                              {stockStatus.label}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => adjustStock(item.id, -1)}
                                disabled={item.currentStock <= 0}
                                title="Remove 1"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => adjustStock(item.id, 1)}
                                title="Add 1"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <div className="text-sm text-white/70">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Page number buttons */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className="w-8"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Scroll to top button */}
      {showScrollTop && (
        <Button
          className="fixed bottom-6 right-6 rounded-full shadow-lg"
          size="icon"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      {/* Add Product Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add {productType === 'frames' ? 'Frame' : productType === 'supplements' ? 'Supplement' : 'Dry Eye Product'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder={productType === 'frames' ? 'Brand Model' : 'Product name'}
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  placeholder="Brand name"
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  placeholder="SKU/UPC"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wholesaleCost">Wholesale Cost</Label>
                <Input
                  id="wholesaleCost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newProduct.wholesaleCost}
                  onChange={(e) => setNewProduct({ ...newProduct, wholesaleCost: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="retailPrice">Retail Price *</Label>
                <Input
                  id="retailPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newProduct.retailPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, retailPrice: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stockQuantity">Initial Stock Quantity</Label>
              <Input
                id="stockQuantity"
                type="number"
                placeholder="0"
                value={newProduct.stockQuantity}
                onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddModalOpen(false); resetNewProduct(); }}>
              Cancel
            </Button>
            <Button onClick={addProduct} disabled={addingProduct}>
              {addingProduct ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PageLayout>
  )
}