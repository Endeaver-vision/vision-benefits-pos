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
  DollarSign, Clock, CheckCircle, AlertTriangle, History, Download, Grid3X3
} from 'lucide-react'
import { buildVspPriceMatrix, PROGRESSIVE_TIER_LABELS, MATERIAL_CODE_LABELS, TIER_TO_PRODUCT_NAMES, MATERIAL_TO_PRODUCT_NAMES, ProgressiveTier, MaterialCode } from '@/lib/services/vsp-matrix-lookup'
import InsuranceSelector, { InsuranceData } from '@/components/insurance-selector'
import { useToast } from '@/components/ui/use-toast'
import { InlineScanner } from '@/components/scanner'
import { getPricelistByMemberId } from '@/lib/data/eyemed-pricelists'

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
  frameOveragePercent?: number | null
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
  categoryDisplayOrder: number
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

  // Extracted prices from insurance document
  const [extractedPrices, setExtractedPrices] = useState<any[] | null>(null)

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
          frameOveragePercent: data.authorization.frameOveragePercent,
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

  // Debug: Log effectiveCarrier value
  useEffect(() => {
    console.log('[CustomerInsurancePricing] effectiveCarrier:', effectiveCarrier, 'authData.carrier:', authData?.carrier, 'customer.insuranceCarrier:', customer.insuranceCarrier)
  }, [effectiveCarrier, authData, customer])

  // VSP-specific product display logic
  const getVspProductDisplay = (product: Product, copays: Record<string, number | string | null> | undefined): {
    text: string;
    subtext?: string;
    color: string;
    badge?: string;
  } | null => {
    if (!copays) return null

    const productNameLower = product.name.toLowerCase()

    // Materials that depend on progressive selection (show "See Matrix")
    // Trivex, Hi-Index 1.67, Hi-Index 1.74 - these have different SV/MF prices AND depend on progressive tier
    if (productNameLower.includes('trivex') ||
        productNameLower.includes('hi-index 1.67') ||
        productNameLower.includes('hi-index 1.74') ||
        productNameLower.includes('1.67') ||
        productNameLower.includes('1.74')) {
      return {
        text: 'See Matrix',
        subtext: 'depends on lens type',
        color: 'text-blue-400',
        badge: 'Matrix'
      }
    }

    // Polycarbonate - flat $35 across all progressives
    if (productNameLower.includes('polycarbonate') && !productNameLower.includes('plus')) {
      const polyPrice = copays['AD'] ?? copays['AD_sv'] ?? 35
      return {
        text: formatPrice(typeof polyPrice === 'number' ? polyPrice : 35),
        subtext: 'flat copay',
        color: 'text-emerald-400'
      }
    }

    // Polarized (DA) - different SV/MF pricing
    if (productNameLower.includes('polarized')) {
      const svPrice = copays['DA_sv'] ?? copays['DE_sv'] ?? 57
      const mfPrice = copays['DA'] ?? copays['DE'] ?? 77
      return {
        text: `SV: $${svPrice} / MF: $${mfPrice}`,
        color: 'text-purple-400'
      }
    }

    // Technical Add-On (TA) - different SV/MF pricing
    if (productNameLower.includes('tech') && productNameLower.includes('add')) {
      const svPrice = copays['TA_sv'] ?? 10
      const mfPrice = copays['TA'] ?? 40
      return {
        text: `SV: $${svPrice} / MF: $${mfPrice}`,
        color: 'text-purple-400'
      }
    }

    // Return null for products that should use default display
    return null
  }

  // Format special pricing values for display
  const formatYouPay = (product: Product): { text: string; subtext?: string; color: string; badge?: string } => {
    // Check for VSP-specific display first
    if (effectiveCarrier === 'VSP' && authData?.copays) {
      const vspDisplay = getVspProductDisplay(product, authData.copays)
      if (vspDisplay) return vspDisplay
    }

    if (product.customerPrice === null) {
      return { text: 'At retail', subtext: formatPrice(product.retailPrice), color: 'text-amber-400' }
    }

    // Check if price equals retail (no savings)
    const hasSavings = product.savings > 0 && product.customerPrice < product.retailPrice

    if (!hasSavings) {
      // No insurance benefit - show retail price
      return { text: formatPrice(product.retailPrice), subtext: 'no coverage', color: 'text-muted-foreground' }
    }

    // Check if using discount pricing (percentage off retail)
    if (product.pricingMethod === 'ins_discount') {
      const discountPercent = Math.round((1 - product.customerPrice / product.retailPrice) * 100)
      if (discountPercent > 0) {
        return {
          text: `${discountPercent}% off`,
          subtext: formatPrice(product.customerPrice),
          color: 'text-amber-400'
        }
      }
    }

    // Regular copay with savings
    return { text: formatPrice(product.customerPrice), subtext: 'copay', color: 'text-emerald-400' }
  }

  // Format copay values - handles numbers, DISCOUNT_XX, and text descriptions
  const formatCopayValue = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'number') return formatPrice(value)
    // Handle DISCOUNT_XX format (e.g., "DISCOUNT_20" -> "20% off")
    if (value.includes('DISCOUNT')) {
      const match = value.match(/DISCOUNT_(\d+)/)
      if (match) return `${match[1]}% off`
    }
    // Handle text descriptions like "100% of amount over remaining balance"
    if (value.includes('100%')) return 'Patient pays 100%'
    if (value.includes('85%')) return '15% off overage'
    if (value.includes('90%')) return '10% off'
    if (value.includes('10% off')) return '10% off'
    return value
  }

  // Format contact lens benefit for display (uses formatCopayValue)
  const formatContactBenefit = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return 'Not covered'
    return formatCopayValue(value)
  }

  // Enrich products with extracted price data
  const enrichProductsWithExtractedPrices = (
    products: Product[],
    extracted: any[] | null
  ): Product[] => {
    if (!extracted || extracted.length === 0) {
      console.log('[enrichProducts] No extracted products')
      return products
    }

    console.log('[enrichProducts] Found', extracted.length, 'extracted products')
    console.log('[enrichProducts] Database has', products.length, 'products')

    // Create a map of product names to extracted prices for quick lookup
    // Normalize names by lowercasing and removing extra whitespace
    const extractedMap = new Map<string, any>()
    extracted.forEach((item: any) => {
      const normalizedName = item.productName?.toLowerCase().trim() || ''
      if (normalizedName) {
        extractedMap.set(normalizedName, item)
      }
    })

    console.log('[enrichProducts] Created map with', extractedMap.size, 'entries')
    console.log('[enrichProducts] Map keys (first 10):', Array.from(extractedMap.keys()).slice(0, 10))

    // Enrich products with extracted copay values
    let enrichedCount = 0
    const enriched = products.map(product => {
      const productNameLower = product.name.toLowerCase().trim()

      // Try exact match first
      let extractedData = extractedMap.get(productNameLower)

      // If no exact match, try partial match (e.g., "bifocal" matches "ft bifocal")
      if (!extractedData) {
        for (const [extractedName, data] of extractedMap.entries()) {
          // Check if extracted name is contained in product name (e.g., "bifocal" in "ft bifocal")
          if (productNameLower.includes(extractedName) || extractedName.includes(productNameLower)) {
            extractedData = data
            break
          }
        }
      }

      if (extractedData) {
        console.log('[enrichProducts] Matched', product.name, 'with extracted copay:', extractedData.copay)

        // Include products with copay >= 0 (including $0 copays like exams, frames, etc)
        if (extractedData.copay !== undefined && extractedData.copay !== null && extractedData.copay >= 0) {
          enrichedCount++
          // Override customerPrice with extracted copay
          return {
            ...product,
            customerPrice: extractedData.copay,
            pricingMethod: 'extracted_copay',
            savings: Math.max(0, product.retailPrice - extractedData.copay)
          }
        }
      }

      return product
    })

    console.log('[enrichProducts] Enriched', enrichedCount, 'out of', products.length, 'products')
    return enriched
  }

  // Get products to display - use extracted prices if available, otherwise database products
  const displayProducts = enrichProductsWithExtractedPrices(products, extractedPrices)

  const hasInsurance = (customer.insuranceCarrier && customer.insuranceCarrier !== 'None') || authData !== null
  const effectiveCarrier = authData?.carrier?.toUpperCase() || customer.insuranceCarrier?.toUpperCase() || null

  // Export price list to CSV - grouped by category
  const exportPriceList = () => {
    // Define logical category order for optical products
    const categoryOrder = [
      'Single Vision',
      'Bifocal',
      'Progressive Lenses',
      'Lens Materials',
      'AR Coatings',
      'Photochromic',
      'Add-ons',
      'Mount Fees',
      'Contact Lenses',
      'Exams',
      'Services'
    ]

    // Group products by category - use displayProducts with extracted prices
    const grouped = displayProducts.reduce((acc, product) => {
      if (!acc[product.category]) acc[product.category] = []
      acc[product.category].push(product)
      return acc
    }, {} as Record<string, Product[]>)

    // Sort categories by defined order, unknown categories go at the end
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      const indexA = categoryOrder.indexOf(a)
      const indexB = categoryOrder.indexOf(b)
      if (indexA === -1 && indexB === -1) return a.localeCompare(b)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })

    // Build rows with category headers
    const rows: string[][] = []
    const headers = ['Product', 'Category', 'SKU', 'Retail Price', 'Customer Price', 'Savings', 'Tier', 'Carrier']

    for (const category of sortedCategories) {
      const categoryProducts = grouped[category].sort((a, b) => a.name.localeCompare(b.name))

      // Add category header row
      rows.push([`--- ${category} (${categoryProducts.length}) ---`, '', '', '', '', '', '', ''])

      // Add products in this category
      for (const p of categoryProducts) {
        rows.push([
          p.name,
          p.category,
          p.sku || '',
          p.retailPrice.toFixed(2),
          p.customerPrice !== null ? p.customerPrice.toFixed(2) : 'N/A',
          p.savings > 0 ? p.savings.toFixed(2) : '0.00',
          p.insuranceTier || '',
          p.insuranceCarrier || 'Cash'
        ])
      }
    }

    const customerName = authData?.patientName || 'Customer'
    const csvContent = [
      `Price List for ${customerName}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      `Insurance: ${effectiveCarrier || 'None'}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `price-list-${customerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter products - use displayProducts (with extracted prices) if available
  const categories = Array.from(new Set(displayProducts.map(p => p.category)))
  const filteredProducts = displayProducts.filter(product => {
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Group by category and sort by categoryDisplayOrder
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = []
    acc[product.category].push(product)
    return acc
  }, {} as Record<string, Product[]>)

  // Sort categories by the categoryDisplayOrder from the first product in each category
  // This ensures: Lens types → AR → Transitions → Materials → Add-ons
  const sortedCategoryEntries = Object.entries(productsByCategory).sort(([catA, productsA], [catB, productsB]) => {
    const orderA = productsA[0]?.categoryDisplayOrder ?? 100
    const orderB = productsB[0]?.categoryDisplayOrder ?? 100
    return orderA - orderB
  })

  return (
    <div className="space-y-4">
      <div className="bg-red-900 text-white p-4 text-center font-bold">PRICELIST COMPONENT TEST RENDERING - {new Date().toISOString()}</div>
      {/* Scanner (collapsible) */}
      {showScanner && (
        <Card>
          <CardContent className="py-4">
            <InlineScanner
              customerId={customerId}
              onDocumentProcessed={async (result) => {
                if (result.success) {
                  console.log('[onDocumentProcessed] Received result:', result)
                  console.log('[onDocumentProcessed] Extracted data:', result.extractedData)

                  toast({
                    title: 'Document Processed',
                    description: `${result.carrier || 'Insurance'} document scanned. Prices loaded...`
                  })

                  // Store the extracted prices locally
                  if (result.extractedData?.pricedProducts) {
                    console.log('[onDocumentProcessed] Setting extracted prices:', result.extractedData.pricedProducts.length, 'products')
                    console.log('[onDocumentProcessed] Sample products:', result.extractedData.pricedProducts.slice(0, 3))
                    setExtractedPrices(result.extractedData.pricedProducts)
                  } else {
                    console.log('[onDocumentProcessed] No pricedProducts found in result')
                  }

                  // Fetch authorization and products to trigger re-render
                  await fetchAuthorization()
                  await fetchProducts()

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

      {/* Unified Price List Card - Insurance Header + Products Together */}
      <Card>
        <CardContent className="pt-4">
          {/* Insurance Header Row */}
          <div className="flex items-center justify-between mb-4">
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
            <div className="mb-4 pb-4 border-b border-border">
              <div className="flex flex-wrap gap-4 text-sm">
                {extractedPrices && extractedPrices.length > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-green-500 text-green-400 mb-2">
                    Extracted: {extractedPrices.length} products
                  </Badge>
                )}
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
                    {formatPrice(authData.frameAllowance)}
                  </span>
                  {authData.frameOveragePercent && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-amber-500 text-amber-400">
                      {authData.frameOveragePercent}% off overage
                    </Badge>
                  )}
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

          {/* Tabs within the same card */}
          <Tabs defaultValue="price-list" className="w-full">
            <TabsList className={`grid w-full ${effectiveCarrier === 'VSP' ? 'grid-cols-3' : 'grid-cols-2'} mb-4`}>
              <TabsTrigger value="price-list">Products</TabsTrigger>
              {effectiveCarrier === 'VSP' && (
                <TabsTrigger value="vsp-matrix">
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  Matrix
                </TabsTrigger>
              )}
              <TabsTrigger value="history" onClick={() => !priceListHistory.length && fetchHistory()}>
                History
              </TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="price-list" className="mt-0">
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
                <div className="ml-auto flex gap-2">
                  <Button
                    variant="outline"
                    onClick={exportPriceList}
                    disabled={displayProducts.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
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
                sortedCategoryEntries.map(([category, categoryProducts]) => (
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
                                <div className="flex items-center justify-end gap-2">
                                  {youPay.badge && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-blue-500 text-blue-400">
                                      <Grid3X3 className="h-3 w-3 mr-1" />
                                      {youPay.badge}
                                    </Badge>
                                  )}
                                  <div>
                                    <div className={`font-semibold ${youPay.color}`}>
                                      {youPay.text}
                                    </div>
                                    {youPay.subtext && (
                                      <div className="text-xs text-muted-foreground">{youPay.subtext}</div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {product.savings > 0 && !youPay.badge ? (
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
            </TabsContent>

            {/* VSP Matrix Tab - Only shown for VSP customers */}
            {effectiveCarrier === 'VSP' && authData?.copays && (
              <TabsContent value="vsp-matrix" className="mt-0">
                {(() => {
                  const { matrix, flatAddons } = buildVspPriceMatrix(authData.copays as Record<string, number | null>)

                  // Filter tiers and materials based on products we actually have in the catalog
                  const productNames = products.map(p => p.name.toLowerCase())

                  // Find which progressive tiers have products in our catalog
                  const availableProgressiveTiers = (['K', 'J', 'F', 'O', 'N'] as ProgressiveTier[]).filter(tier => {
                    const tierProducts = TIER_TO_PRODUCT_NAMES[tier]
                    return tierProducts.some(name =>
                      productNames.some(pn => pn.includes(name.toLowerCase()))
                    )
                  })

                  // Find which materials we have in our catalog
                  const availableMaterialCodes = (['A', 'D', 'B', 'H', 'J', 'P'] as MaterialCode[]).filter(mat => {
                    const matProducts = MATERIAL_TO_PRODUCT_NAMES[mat]
                    return matProducts.some(name =>
                      productNames.some(pn => pn.includes(name.toLowerCase()))
                    )
                  })

                  // Use available tiers/materials, or fall back to all if none found
                  const progressiveTiers = availableProgressiveTiers.length > 0 ? availableProgressiveTiers : ['K', 'J', 'F', 'O', 'N'] as ProgressiveTier[]
                  const materialCodes = availableMaterialCodes.length > 0 ? availableMaterialCodes : ['A', 'D', 'B', 'H', 'J'] as MaterialCode[]

                  return (
                    <div className="space-y-6">
                      {/* Matrix Header */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Grid3X3 className="h-4 w-4" />
                        <span>
                          VSP combined codes: Progressive (column) + Material (row) = Copay
                        </span>
                      </div>

                      {/* Progressive + Material Matrix */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-2 font-semibold text-sm">
                          Progressive Lens + Material Copays
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium">Material</th>
                                {progressiveTiers.map(tier => (
                                  <th key={tier} className="px-3 py-2 text-center font-medium min-w-[120px]">
                                    <div className="text-xs leading-tight">{PROGRESSIVE_TIER_LABELS[tier]}</div>
                                    <div className="text-[10px] text-muted-foreground font-normal">Code: {tier}</div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {materialCodes.map(mat => (
                                <tr key={mat} className="border-t hover:bg-muted/20">
                                  <td className="px-3 py-2 font-medium">
                                    <div className="text-sm">{MATERIAL_CODE_LABELS[mat]}</div>
                                    <div className="text-[10px] text-muted-foreground">Code: {mat}</div>
                                  </td>
                                  {progressiveTiers.map(tier => {
                                    const code = tier + mat
                                    const copay = matrix[tier][mat]
                                    return (
                                      <td key={code} className="px-3 py-2 text-center">
                                        {copay !== null ? (
                                          <div>
                                            <span className="font-semibold text-emerald-400 text-lg">
                                              ${copay}
                                            </span>
                                            <div className="text-[10px] text-muted-foreground font-mono">{code}</div>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Single Vision Materials */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-2 font-semibold text-sm">
                          Single Vision Material Copays
                        </div>
                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          {['D', 'B', 'H', 'J'].map(mat => {
                            const svCode = `A${mat}_sv`
                            const mfCode = `A${mat}`
                            const svCopay = (authData.copays as Record<string, number | null>)[svCode]
                            const mfCopay = (authData.copays as Record<string, number | null>)[mfCode]
                            return (
                              <div key={mat} className="p-3 bg-muted/30 rounded-lg">
                                <div className="font-medium text-sm">
                                  {MATERIAL_CODE_LABELS[mat as MaterialCode]}
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">SV:</span>{' '}
                                    <span className="text-emerald-400">${svCopay ?? '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">MF:</span>{' '}
                                    <span className="text-blue-400">${mfCopay ?? '—'}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Flat Add-ons */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-4 py-2 font-semibold text-sm">
                          Flat Add-On Copays (same for all lenses)
                        </div>
                        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {Object.entries(flatAddons).map(([code, prices]) => {
                            const labels: Record<string, string> = {
                              QM: 'Basic AR',
                              QT: 'Standard AR',
                              QV: 'Premium AR',
                              PR: 'Transitions',
                              LF: 'Light Filter',
                              MN: 'Tint',
                              DA: 'Polarized',
                              SP: 'Roll & Polish',
                              SW: 'Rimless Mount',
                              TA: 'Tech Add-On'
                            }
                            const label = labels[code] || code
                            const isSame = prices.sv === prices.mf
                            return (
                              <div key={code} className="p-3 bg-muted/30 rounded-lg">
                                <div className="font-medium text-sm">{label}</div>
                                <div className="text-xs text-muted-foreground mb-1">{code}</div>
                                {isSame ? (
                                  <div className="text-emerald-400 font-semibold">
                                    ${prices.mf ?? '—'}
                                  </div>
                                ) : (
                                  <div className="flex gap-2 text-sm">
                                    <span className="text-muted-foreground">SV:</span>
                                    <span className="text-emerald-400">${prices.sv ?? '—'}</span>
                                    <span className="text-muted-foreground">MF:</span>
                                    <span className="text-blue-400">${prices.mf ?? '—'}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Base Copays */}
                      <div className="border rounded-lg p-4 bg-muted/20">
                        <div className="flex items-center gap-6">
                          <div>
                            <span className="text-muted-foreground text-sm">Materials Copay:</span>{' '}
                            <span className="font-semibold text-blue-400">
                              ${(authData.copays as Record<string, number | null>)['materialsCopay'] ?? '—'}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">(always added)</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-sm">Exam Copay:</span>{' '}
                            <span className="font-semibold text-emerald-400">
                              ${(authData.copays as Record<string, number | null>)['examCopay'] ?? authData.examCopay ?? '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Example Calculation */}
                      <div className="border rounded-lg p-4 bg-blue-500/10">
                        <div className="font-semibold text-sm mb-2">Example: Varilux X (N) + Hi-Index 1.74 (J)</div>
                        <div className="text-sm text-muted-foreground">
                          Combined code: <span className="font-mono font-semibold text-white">NJ</span> = ${matrix['N']['J'] ?? '—'}
                          <span className="ml-2">(NOT: NA ${matrix['N']['A'] ?? '—'} + AJ ${(authData.copays as Record<string, number | null>)['AJ'] ?? '—'} = ${(matrix['N']['A'] ?? 0) + ((authData.copays as Record<string, number | null>)['AJ'] ?? 0)})</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </TabsContent>
            )}

            {/* History Tab */}
            <TabsContent value="history" className="mt-0">
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Angela Clayton EyeMed Pricelist - Always show for testing */}
      <Card className="mb-6 border-emerald-600/30 bg-emerald-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-emerald-400">Angela Clayton - EyeMed Insurance Pricelist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-emerald-600/30">
                <tr>
                  <th className="text-left py-2 px-4 font-semibold text-emerald-400">Product</th>
                  <th className="text-right py-2 px-4 font-semibold text-emerald-400">Copay</th>
                  <th className="text-left py-2 px-4 font-semibold text-muted-foreground">Benefit Details</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/30">
                  <td className="py-2 px-4">Eye Exam</td>
                  <td className="text-right py-2 px-4 font-semibold text-emerald-400">$0</td>
                  <td className="py-2 px-4 text-muted-foreground">Routine exam coverage</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-2 px-4">Single Vision Lenses</td>
                  <td className="text-right py-2 px-4 font-semibold text-emerald-400">$25</td>
                  <td className="py-2 px-4 text-muted-foreground">Standard single vision</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-2 px-4">Bifocal Lenses</td>
                  <td className="text-right py-2 px-4 font-semibold text-emerald-400">$25</td>
                  <td className="py-2 px-4 text-muted-foreground">Flat Top 28 and similar</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-2 px-4">Progressive Lenses</td>
                  <td className="text-right py-2 px-4 font-semibold text-emerald-400">$25</td>
                  <td className="py-2 px-4 text-muted-foreground">Standard progressives</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-2 px-4">Premium Progressive Lenses</td>
                  <td className="text-right py-2 px-4 font-semibold text-emerald-400">$25 + 20% off</td>
                  <td className="py-2 px-4 text-muted-foreground">Varilux Comfort DRx, etc.</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-2 px-4">Frames</td>
                  <td className="text-right py-2 px-4 font-semibold text-amber-400">$0 + 20% off</td>
                  <td className="py-2 px-4 text-muted-foreground">$180 allowance, 20% overage</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-2 px-4">AR Coatings (Crizal Rock, etc.)</td>
                  <td className="text-right py-2 px-4 font-semibold text-purple-400">$45</td>
                  <td className="py-2 px-4 text-muted-foreground">Standard AR coatings</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-2 px-4">Polycarbonate Lenses</td>
                  <td className="text-right py-2 px-4 font-semibold text-blue-400">$40</td>
                  <td className="py-2 px-4 text-muted-foreground">Impact-resistant material</td>
                </tr>
                <tr>
                  <td className="py-2 px-4">Contact Lenses</td>
                  <td className="text-right py-2 px-4 font-semibold text-emerald-400">$0</td>
                  <td className="py-2 px-4 text-muted-foreground">Fully covered</td>
                </tr>
              </tbody>
            </table>
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
