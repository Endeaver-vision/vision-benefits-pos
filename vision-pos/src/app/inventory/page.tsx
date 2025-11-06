'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Loader2, 
  Search, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Edit,
  Eye,
  BarChart3,
  ArrowLeft
} from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string | null
  manufacturer: string | null
  basePrice: number
  category: {
    id: string
    name: string
  }
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
  location: {
    id: string
    name: string
  }
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

interface InventoryResponse {
  data: InventoryItem[]
  summary: {
    totalItems: number
    lowStockCount: number
    totalValue: number
    lastUpdated: string
  }
}

export default function InventoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

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
    if (!session) return

    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (searchTerm) params.append('search', searchTerm)
      if (selectedCategory !== 'all') params.append('categoryId', selectedCategory)
      if (showLowStockOnly) params.append('lowStock', 'true')

      const response = await fetch(`/api/inventory?${params}`)
      if (response.ok) {
        const data: InventoryResponse = await response.json()
        setInventory(data.data)
        setSummary(data.summary)
      } else {
        console.error('Failed to load inventory')
      }
    } catch (error) {
      console.error('Inventory loading error:', error)
    } finally {
      setLoading(false)
    }
  }, [session, searchTerm, selectedCategory, showLowStockOnly])

  useEffect(() => {
    if (session) {
      loadCategories()
      loadInventory()
    }
  }, [session, loadCategories, loadInventory])

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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
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
                <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                <p className="text-sm text-gray-600">
                  Manage your product inventory and stock levels
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

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

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
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
              <Button
                variant={showLowStockOnly ? "default" : "outline"}
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className="whitespace-nowrap"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Low Stock Only
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Items</CardTitle>
          </CardHeader>
          <CardContent>
            {inventory.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No inventory items found</p>
                <p className="text-sm text-gray-400">
                  Try adjusting your search criteria
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Product</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-right p-4 font-medium">Current Stock</th>
                      <th className="text-right p-4 font-medium">Available</th>
                      <th className="text-right p-4 font-medium">Reorder Point</th>
                      <th className="text-center p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Value</th>
                      <th className="text-center p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => {
                      const stockStatus = getStockStatus(item)
                      const itemValue = item.currentStock * (item.costPrice || 0)
                      
                      return (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div>
                              <div className="font-medium">{item.product.name}</div>
                              <div className="text-sm text-gray-500">
                                SKU: {item.product.sku || 'N/A'}
                              </div>
                              {item.product.manufacturer && (
                                <div className="text-xs text-gray-400">
                                  {item.product.manufacturer}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">
                              {item.product.category.name}
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-medium">
                            {item.currentStock}
                          </td>
                          <td className="p-4 text-right">
                            {item.availableStock}
                          </td>
                          <td className="p-4 text-right">
                            {item.reorderPoint}
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant={stockStatus.variant}>
                              {stockStatus.label}
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-medium">
                            {formatCurrency(itemValue)}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center space-x-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Edit className="h-4 w-4" />
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
          </CardContent>
        </Card>
      </main>
    </div>
  )
}