'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Search,
  Package,
  Star,
  ChevronDown,
  ChevronRight,
  Stethoscope,
  Shield
} from 'lucide-react'
import PageLayout from '@/components/layout/page-layout'

interface Product {
  id: string
  name: string
  sku: string | null
  basePrice: number
  displayGroup: string
  displayOrder: number
  tierVsp: string | null
  tierEyemed: string | null
  tierSpectera: string | null
  category: {
    id: string
    name: string
    code: string
    displayOrder: number
  }
}

interface ServicePrice {
  sku: string
  name: string
  retailPrice: number
  category: string
  tierVsp: string | null
  tierEyemed: string | null
  tierSpectera: string | null
}

interface ServicesResponse {
  services: {
    EXAM: ServicePrice[]
    DIAGNOSTIC: ServicePrice[]
    CONTACT_LENS_FIT: ServicePrice[]
    PROCEDURE: ServicePrice[]
    SPECTACLE_SERVICE: ServicePrice[]
    FITTING: ServicePrice[]
    OTHER: ServicePrice[]
  }
}

const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  EXAM: 'Exams',
  DIAGNOSTIC: 'Diagnostics & Screenings',
  CONTACT_LENS_FIT: 'Contact Lens Fittings',
  PROCEDURE: 'Procedures',
  SPECTACLE_SERVICE: 'Spectacle Services',
  FITTING: 'Other Fittings',
  OTHER: 'Other Services'
}

const SERVICE_CATEGORY_ORDER = [
  'EXAM',
  'DIAGNOSTIC',
  'CONTACT_LENS_FIT',
  'PROCEDURE',
  'SPECTACLE_SERVICE',
  'FITTING',
  'OTHER'
]

export default function ProductsAndServicesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [serviceGroups, setServiceGroups] = useState<ServicesResponse['services'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showReserve, setShowReserve] = useState(false)
  const [showTiers, setShowTiers] = useState(false)
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products')

  useEffect(() => {
    fetchProducts()
    fetchServices()
  }, [])

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
        setServiceGroups(data.services || null)
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    }
  }

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Split into everyday and reserve
  const everydayProducts = filteredProducts.filter(p => p.displayGroup === 'everyday')
  const reserveProducts = filteredProducts.filter(p => p.displayGroup === 'reserve')

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

  // Count total services
  const totalServices = serviceGroups
    ? Object.values(serviceGroups).reduce((sum, arr) => sum + arr.length, 0)
    : 0

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const getTierDisplay = (tier: string | null) => {
    if (!tier) return '—'
    return tier
  }

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
      subtitle="Quick reference for all products and services"
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {products.length} Products
          </Badge>
          <Badge variant="outline" className="text-sm">
            {totalServices} Services
          </Badge>
        </div>
      }
    >
      <div className="container mx-auto py-6 space-y-6">
        {/* Tab Switcher + Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'products' ? 'default' : 'outline'}
              onClick={() => setActiveTab('products')}
              size="sm"
            >
              <Package className="h-4 w-4 mr-2" />
              Products
            </Button>
            <Button
              variant={activeTab === 'services' ? 'default' : 'outline'}
              onClick={() => setActiveTab('services')}
              size="sm"
            >
              <Stethoscope className="h-4 w-4 mr-2" />
              Services
            </Button>
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <Button
            variant={showTiers ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowTiers(!showTiers)}
          >
            <Shield className="h-4 w-4 mr-2" />
            {showTiers ? 'Hide Tiers' : 'Show Tiers'}
          </Button>
        </div>

        {activeTab === 'products' ? (
          <div className="space-y-6">
            {/* Everyday Products */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-4 w-4 text-amber-400" />
                  Everyday
                  <span className="text-muted-foreground font-normal text-sm">
                    ({everydayProducts.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {everydayByCategory.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">No products found</p>
                ) : (
                  <div className="space-y-4">
                    {everydayByCategory.map(([category, categoryProducts]) => (
                      <div key={category}>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          {category}
                        </h3>
                        {showTiers ? (
                          // Table view with tiers
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left">
                                  <th className="py-1 pr-4 font-medium">Product</th>
                                  <th className="py-1 px-2 text-right font-medium">Price</th>
                                  <th className="py-1 px-2 text-center font-medium text-blue-500">VSP</th>
                                  <th className="py-1 px-2 text-center font-medium text-green-500">EyeMed</th>
                                  <th className="py-1 px-2 text-center font-medium text-purple-500">Spectera</th>
                                </tr>
                              </thead>
                              <tbody>
                                {categoryProducts.map((product) => (
                                  <tr key={product.id} className="border-b border-border/30">
                                    <td className="py-1.5 pr-4">{product.name}</td>
                                    <td className="py-1.5 px-2 text-right text-muted-foreground">
                                      {formatPrice(product.basePrice)}
                                    </td>
                                    <td className="py-1.5 px-2 text-center">
                                      <span className="text-xs text-muted-foreground">
                                        {getTierDisplay(product.tierVsp)}
                                      </span>
                                    </td>
                                    <td className="py-1.5 px-2 text-center">
                                      <span className="text-xs text-muted-foreground">
                                        {getTierDisplay(product.tierEyemed)}
                                      </span>
                                    </td>
                                    <td className="py-1.5 px-2 text-center">
                                      <span className="text-xs text-muted-foreground">
                                        {getTierDisplay(product.tierSpectera)}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          // Compact grid view
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                            {categoryProducts.map((product) => (
                              <div
                                key={product.id}
                                className="flex justify-between items-center py-1 border-b border-border/50 last:border-0"
                              >
                                <span className="text-sm truncate pr-2">{product.name}</span>
                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                  {formatPrice(product.basePrice)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reserve Products - Collapsible */}
            <Card className="border-dashed">
              <CardHeader
                className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg"
                onClick={() => setShowReserve(!showReserve)}
              >
                <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
                  {showReserve ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Package className="h-4 w-4" />
                  Reserve
                  <span className="font-normal text-sm">
                    ({reserveProducts.length})
                  </span>
                </CardTitle>
              </CardHeader>
              {showReserve && (
                <CardContent className="pt-0">
                  {reserveByCategory.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No products found</p>
                  ) : (
                    <div className="space-y-4">
                      {reserveByCategory.map(([category, categoryProducts]) => (
                        <div key={category}>
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            {category}
                          </h3>
                          {showTiers ? (
                            // Table view with tiers
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b text-left">
                                    <th className="py-1 pr-4 font-medium">Product</th>
                                    <th className="py-1 px-2 text-right font-medium">Price</th>
                                    <th className="py-1 px-2 text-center font-medium text-blue-500">VSP</th>
                                    <th className="py-1 px-2 text-center font-medium text-green-500">EyeMed</th>
                                    <th className="py-1 px-2 text-center font-medium text-purple-500">Spectera</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {categoryProducts.map((product) => (
                                    <tr key={product.id} className="border-b border-border/30">
                                      <td className="py-1.5 pr-4">{product.name}</td>
                                      <td className="py-1.5 px-2 text-right text-muted-foreground">
                                        {formatPrice(product.basePrice)}
                                      </td>
                                      <td className="py-1.5 px-2 text-center">
                                        <span className="text-xs text-muted-foreground">
                                          {getTierDisplay(product.tierVsp)}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-2 text-center">
                                        <span className="text-xs text-muted-foreground">
                                          {getTierDisplay(product.tierEyemed)}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-2 text-center">
                                        <span className="text-xs text-muted-foreground">
                                          {getTierDisplay(product.tierSpectera)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            // Compact grid view
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
                              {categoryProducts.map((product) => (
                                <div
                                  key={product.id}
                                  className="flex justify-between items-center py-1 border-b border-border/50 last:border-0"
                                >
                                  <span className="text-sm truncate pr-2">{product.name}</span>
                                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                                    {formatPrice(product.basePrice)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        ) : (
          /* Services Tab */
          <div className="space-y-6">
            {serviceGroups && SERVICE_CATEGORY_ORDER.map(catKey => {
              const services = serviceGroups[catKey as keyof typeof serviceGroups] || []
              const filteredServices = services.filter(s =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase())
              )

              if (filteredServices.length === 0) return null

              return (
                <Card key={catKey}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {SERVICE_CATEGORY_LABELS[catKey]}
                      <span className="text-muted-foreground font-normal text-sm">
                        ({filteredServices.length})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {showTiers ? (
                      // Table view with tiers
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="py-1 pr-4 font-medium">Service</th>
                              <th className="py-1 px-2 text-right font-medium">Price</th>
                              <th className="py-1 px-2 text-center font-medium text-blue-500">VSP</th>
                              <th className="py-1 px-2 text-center font-medium text-green-500">EyeMed</th>
                              <th className="py-1 px-2 text-center font-medium text-purple-500">Spectera</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredServices.map((service) => (
                              <tr key={service.sku} className="border-b border-border/30">
                                <td className="py-1.5 pr-4">{service.name}</td>
                                <td className="py-1.5 px-2 text-right text-muted-foreground">
                                  {formatPrice(service.retailPrice)}
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <span className="text-xs text-muted-foreground">
                                    {getTierDisplay(service.tierVsp)}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <span className="text-xs text-muted-foreground">
                                    {getTierDisplay(service.tierEyemed)}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <span className="text-xs text-muted-foreground">
                                    {getTierDisplay(service.tierSpectera)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      // Compact grid view
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                        {filteredServices.map((service) => (
                          <div
                            key={service.sku}
                            className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0"
                          >
                            <span className="text-sm">{service.name}</span>
                            <span className="text-sm font-medium">
                              {formatPrice(service.retailPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
