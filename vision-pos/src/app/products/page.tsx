'use client'

// import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  ArrowUpDown,
  Filter
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
  category: {
    id: string
    name: string
    code: string
  }
}

interface ProductCategory {
  id: string
  name: string
  code: string
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortField, setSortField] = useState<'name' | 'basePrice'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
  }, [router])

  useEffect(() => {
    fetchCategories()
    fetchProducts()
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

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = 
        selectedCategory === 'all' || 
        product.category.code === selectedCategory

      return matchesSearch && matchesCategory && product.active
    })
    .sort((a, b) => {
      let comparison = 0
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortField === 'basePrice') {
        comparison = a.basePrice - b.basePrice
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

  const toggleSort = (field: 'name' | 'basePrice') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getTierBadgeColor = (tier: string | null) => {
    if (!tier || tier === 'none' || tier === 'standard') return 'secondary'
    if (tier === 'non-formulary') return 'destructive'
    if (tier.includes('5') || tier === 'V' || tier === 'N' || tier === 'IV') return 'default'
    if (tier.includes('4') || tier === 'IV' || tier === 'O') return 'default'
    return 'outline'
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
      title="Product Catalog"
      subtitle="View retail prices and insurance tier assignments"
      actions={
        <Badge variant="outline" className="text-sm">
          <Package className="h-3 w-3 mr-1" />
          {filteredProducts.length} Products
        </Badge>
      }
    >
      <div className="container mx-auto py-6 space-y-6">
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
                placeholder="Search products, SKU, or manufacturer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('name')}
                      className="font-semibold"
                    >
                      Product
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('basePrice')}
                      className="font-semibold"
                    >
                      Retail Price
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">VSP</TableHead>
                  <TableHead className="text-center">EyeMed</TableHead>
                  <TableHead className="text-center">Spectera</TableHead>
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
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.sku && (
                            <div className="text-sm text-muted-foreground">
                              {product.sku}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {product.category.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {product.manufacturer || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 font-medium">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          {product.basePrice.toFixed(2)}
                        </div>
                      </TableCell>
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
      </div>
    </PageLayout>
  )
}
