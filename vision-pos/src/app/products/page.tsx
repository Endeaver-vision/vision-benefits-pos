'use client'

import { useEffect, useState } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  Search,
  Package,
  DollarSign,
  Shield,
  Filter,
  Star,
  ChevronDown,
  ChevronRight,
  Stethoscope
} from 'lucide-react'
import PageLayout from '@/components/layout/page-layout'

interface Product {
  id: string
  name: string
  sku: string | null
  manufacturer: string | null
  basePrice: number
  tierVsp: string | null
  tierEyemed: string | null
  tierSpectera: string | null
  active: boolean
  displayTier: string
  displayOrder: number
  category: {
    id: string
    name: string
    code: string
    displayOrder: number
  }
}

interface ServicePrice {
  id: string
  name: string
  sku: string | null
  code: string | null
  retailPrice: number
  category: string
  isActive: boolean
}

interface ProductCategory {
  id: string
  name: string
  code: string
}

export default function ProductsAndServicesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<ServicePrice[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showReserve, setShowReserve] = useState(false)
  const [showServices, setShowServices] = useState(true)
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products')

  useEffect(() => {
    fetchCategories()
    fetchProducts()
    fetchServices()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/products/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/pricing/services')
      if (response.ok) {
        const data = await response.json()
        const allServices = [...(data.exams || []), ...(data.fittings || [])]
        setServices(allServices)
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    }
  }

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory =
      selectedCategory === 'all' ||
      product.category.code === selectedCategory

    return matchesSearch && matchesCategory && product.active
  })

  // Split into everyday and reserve
  const everydayProducts = filteredProducts.filter(p => p.displayTier === 'everyday')
  const reserveProducts = filteredProducts.filter(p => p.displayTier === 'reserve')

  // Group by category
  const groupByCategory = (prods: Product[]) => {
    const groups: { [key: string]: Product[] } = {}
    prods.forEach(p => {
      if (!groups[p.category.name]) {
        groups[p.category.name] = []
      }
      groups[p.category.name].push(p)
    })
    return Object.entries(groups).sort((a, b) => {
      const orderA = a[1][0]?.category.displayOrder ?? 100
      const orderB = b[1][0]?.category.displayOrder ?? 100
      return orderA - orderB
    })
  }

  const everydayByCategory = groupByCategory(everydayProducts)
  const reserveByCategory = groupByCategory(reserveProducts)

  // Filter services
  const filteredServices = services.filter(service => {
    return service.name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const getTierBadgeColor = (tier: string | null) => {
    if (!tier || tier === 'none' || tier === 'standard') return 'secondary'
    if (tier === 'non-formulary') return 'destructive'
    if (tier.includes('5') || tier === 'V' || tier === 'N' || tier === 'IV') return 'default'
    if (tier.includes('4') || tier === 'IV' || tier === 'O') return 'default'
    return 'outline'
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const renderProductTable = (categoryProducts: Product[], showTiers: boolean = true) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">Retail Price</TableHead>
          {showTiers && (
            <>
              <TableHead className="text-center">VSP</TableHead>
              <TableHead className="text-center">EyeMed</TableHead>
              <TableHead className="text-center">Spectera</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {categoryProducts.map((product) => (
          <TableRow key={product.id}>
            <TableCell>
              <div className="font-medium">{product.name}</div>
              {product.manufacturer && (
                <div className="text-xs text-muted-foreground">{product.manufacturer}</div>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {product.sku || '—'}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatPrice(product.basePrice)}
            </TableCell>
            {showTiers && (
              <>
                <TableCell className="text-center">
                  <Badge variant={getTierBadgeColor(product.tierVsp)} className="text-xs">
                    {product.tierVsp || '—'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={getTierBadgeColor(product.tierEyemed)} className="text-xs">
                    {product.tierEyemed || '—'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={getTierBadgeColor(product.tierSpectera)} className="text-xs">
                    {product.tierSpectera || '—'}
                  </Badge>
                </TableCell>
              </>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <PageLayout
      title="Products & Services"
      subtitle="Database view of all products and services with pricing"
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Package className="h-3 w-3 mr-1" />
            {products.length} Products
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Stethoscope className="h-3 w-3 mr-1" />
            {services.length} Services
          </Badge>
        </div>
      }
    >
      <div className="container mx-auto py-6 space-y-6">
        {/* Tab Switcher */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'products' ? 'default' : 'outline'}
            onClick={() => setActiveTab('products')}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Products ({products.length})
          </Button>
          <Button
            variant={activeTab === 'services' ? 'default' : 'outline'}
            onClick={() => setActiveTab('services')}
            className="flex items-center gap-2"
          >
            <Stethoscope className="h-4 w-4" />
            Services ({services.length})
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {activeTab === 'products' && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.code}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {activeTab === 'products' ? (
          <>
            {/* Everyday Products */}
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
                    No everyday products found
                  </div>
                ) : (
                  everydayByCategory.map(([category, categoryProducts]) => (
                    <div key={category} className="border-t first:border-t-0">
                      <div className="px-4 py-2 bg-muted/30 font-medium text-sm flex items-center gap-2">
                        <Badge variant="outline">{category}</Badge>
                        <span className="text-muted-foreground">({categoryProducts.length})</span>
                      </div>
                      <div className="overflow-x-auto">
                        {renderProductTable(categoryProducts)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Reserve Products - Collapsible */}
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
                      No reserve products found
                    </div>
                  ) : (
                    reserveByCategory.map(([category, categoryProducts]) => (
                      <div key={category} className="border-t first:border-t-0">
                        <div className="px-4 py-2 bg-muted/20 font-medium text-sm flex items-center gap-2">
                          <Badge variant="outline">{category}</Badge>
                          <span className="text-muted-foreground">({categoryProducts.length})</span>
                        </div>
                        <div className="overflow-x-auto">
                          {renderProductTable(categoryProducts)}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              )}
            </Card>
          </>
        ) : (
          /* Services Tab */
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="h-5 w-5 text-blue-400" />
                Services
                <Badge variant="secondary" className="ml-2">{filteredServices.length}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Exam and fitting services from the database
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Retail Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No services found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredServices.map((service) => (
                        <TableRow key={service.sku || service.name}>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {service.sku || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {service.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(service.retailPrice)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insurance Tier Legend - only show on products tab */}
        {activeTab === 'products' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Insurance Tier Legend
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">VSP Tiers</h4>
                <div className="space-y-1 text-muted-foreground">
                  <div><Badge variant="outline" className="mr-2">K</Badge> Standard</div>
                  <div><Badge variant="outline" className="mr-2">J</Badge> Premium Standard</div>
                  <div><Badge variant="outline" className="mr-2">F</Badge> Premium Advanced</div>
                  <div><Badge variant="default" className="mr-2">O</Badge> Custom Level 1</div>
                  <div><Badge variant="default" className="mr-2">N</Badge> Custom Level 2</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">EyeMed Tiers</h4>
                <div className="space-y-1 text-muted-foreground">
                  <div><Badge variant="outline" className="mr-2">tier_1</Badge> Basic</div>
                  <div><Badge variant="outline" className="mr-2">tier_2</Badge> Mid</div>
                  <div><Badge variant="outline" className="mr-2">tier_3</Badge> Upper</div>
                  <div><Badge variant="default" className="mr-2">tier_4</Badge> Advanced</div>
                  <div><Badge variant="default" className="mr-2">tier_5</Badge> Top</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Spectera Tiers</h4>
                <div className="space-y-1 text-muted-foreground">
                  <div><Badge variant="outline" className="mr-2">I</Badge> Tier 1</div>
                  <div><Badge variant="outline" className="mr-2">II</Badge> Tier 2</div>
                  <div><Badge variant="outline" className="mr-2">III</Badge> Tier 3</div>
                  <div><Badge variant="default" className="mr-2">IV</Badge> Tier 4</div>
                  <div><Badge variant="default" className="mr-2">V</Badge> Tier 5</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  )
}
