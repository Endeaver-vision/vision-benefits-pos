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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileSearch, Download, Loader2, Shield, Edit, History, CheckCircle, ExternalLink, Clock, FileText, Calculator, Trash2, Upload, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'
import { InlineScanner } from '@/components/scanner'
import { InlineEyemedPricer } from './inline-eyemed-pricer'
import { InlineVspPricer } from './inline-vsp-pricer'
import {
  generateAllPriceLists,
  generateEyeMedPriceList,
  EyeMedAuth,
  PriceListResult,
  PriceListItem,
} from '@/lib/pricing/standalone-pricelist'
import { getPricelistByMemberId } from '@/lib/data/eyemed-pricelists'

interface Customer {
  id: string
  firstName: string
  lastName: string
  insuranceCarrier?: string | null
  memberId?: string | null
}

interface AuthorizationData {
  id: string
  carrier: string
  planName: string
  examCopay?: number | null
  frameAllowance?: number | null
  frameOveragePercent?: number | null
  copays?: Record<string, number | string | null>
}

interface PriceListVersionSummary {
  id: string
  customerId: string
  insuranceCarrier: string
  planName: string | null
  version: number
  versionLabel: string
  active: boolean
  createdAt: string
  createdBy: string | null
  itemCount: number
}

interface SavedPriceItem {
  // EyeMed format
  name?: string
  category?: string
  retail: number
  patientCost?: number
  note?: string
  type?: string
  // VSP format
  productName?: string
  productId?: string
  section?: string
  copay?: number
  notes?: string[]
  isCashOnly?: boolean
  isNotCovered?: boolean
}

interface CustomerPricelistProps {
  customerId: string
  customer: Customer
  onUpdate?: () => void
}

export default function CustomerPricelist({
  customerId,
  customer,
  onUpdate
}: CustomerPricelistProps) {
  const [showScanner, setShowScanner] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [authData, setAuthData] = useState<AuthorizationData | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(false)

  // Price lists (one for each carrier)
  const [priceLists, setPriceLists] = useState<Record<string, PriceListResult>>({
    EYEMED: { carrier: 'EYEMED', items: [], generatedAt: new Date() },
    VSP: { carrier: 'VSP', items: [], generatedAt: new Date() },
    SPECTERA: { carrier: 'SPECTERA', items: [], generatedAt: new Date() },
    CASH: { carrier: 'CASH', items: [], generatedAt: new Date() },
  })

  // UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [activeCarrier, setActiveCarrier] = useState<'EYEMED' | 'VSP' | 'SPECTERA' | 'CASH'>('EYEMED')

  // Version state
  const [versions, setVersions] = useState<PriceListVersionSummary[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [activatingVersion, setActivatingVersion] = useState<string | null>(null)

  // Saved price items from active version
  const [savedPriceItems, setSavedPriceItems] = useState<Record<string, SavedPriceItem[]>>({})
  const [loadingSavedPrices, setLoadingSavedPrices] = useState(false)
  const [activeVersionCarrier, setActiveVersionCarrier] = useState<string | null>(null)
  // VSP lens matrix data
  const [lensMatrixData, setLensMatrixData] = useState<Record<string, unknown> | null>(null)
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null)

  // Replace mode - when true, show inline pricer even if saved prices exist
  const [replaceMode, setReplaceMode] = useState<Record<string, boolean>>({
    EYEMED: false,
    VSP: false,
    SPECTERA: false,
    CASH: false
  })
  const [deletingVersion, setDeletingVersion] = useState(false)

  const { toast } = useToast()

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
          examCopay: data.authorization.examCopay,
          frameAllowance: data.authorization.frameAllowance,
          frameOveragePercent: data.authorization.frameOveragePercent,
          copays: data.authorization.copays
        })

        // Generate all price lists with this auth data
        generatePriceLists(data.authorization)
      } else {
        setAuthData(null)
        // Generate default price lists without auth
        generatePriceLists(null)
      }
    } catch (error) {
      console.error('Error fetching authorization:', error)
      generatePriceLists(null)
    } finally {
      setLoadingAuth(false)
    }
  }

  // Fetch saved price list versions
  const fetchVersions = async () => {
    setLoadingVersions(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/price-list/versions`)
      const data = await response.json()

      if (data.success && data.versions) {
        setVersions(data.versions)
        // Select the active version by default and load its prices
        const activeVersion = data.versions.find((v: PriceListVersionSummary) => v.active)
        if (activeVersion) {
          setSelectedVersionId(activeVersion.id)
          // Load prices from the active version
          await loadSavedPrices(activeVersion.id)
        }
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
    } finally {
      setLoadingVersions(false)
    }
  }

  // Activate a specific version
  const activateVersion = async (versionId: string) => {
    setActivatingVersion(versionId)
    try {
      const response = await fetch(`/api/customers/${customerId}/price-list/versions/${versionId}/activate`, {
        method: 'PUT'
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Version Activated',
          description: 'This version is now the active price list.'
        })
        await fetchVersions()
        // Reload prices for the newly activated version
        await loadSavedPrices(versionId)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to activate version',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error activating version:', error)
      toast({
        title: 'Error',
        description: 'Failed to activate version',
        variant: 'destructive'
      })
    } finally {
      setActivatingVersion(null)
    }
  }

  // Delete a price list version
  const deleteVersion = async (versionId: string, carrier: string) => {
    if (!confirm('Are you sure you want to delete this price list? This action cannot be undone.')) {
      return
    }

    setDeletingVersion(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/price-list/versions/${versionId}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Price List Deleted',
          description: 'The price list has been removed.'
        })
        // Clear saved prices and refresh
        setSavedPriceItems({})
        setActiveVersionCarrier(null)
        setReplaceMode(prev => ({ ...prev, [carrier]: false }))
        await fetchVersions()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete price list',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error deleting version:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete price list',
        variant: 'destructive'
      })
    } finally {
      setDeletingVersion(false)
    }
  }

  // Load saved price items from a version
  const loadSavedPrices = async (versionId: string) => {
    setLoadingSavedPrices(true)
    try {
      const response = await fetch(`/api/customers/${customerId}/price-list/versions/${versionId}`)
      const data = await response.json()

      if (data.success && data.version?.priceListData) {
        const priceData = data.version.priceListData as Record<string, SavedPriceItem[]>
        setSavedPriceItems(priceData)
        setActiveVersionCarrier(data.version.insuranceCarrier?.toUpperCase() || null)

        // Load VSP lens matrix data if available
        if (data.version.lensMatrixData) {
          setLensMatrixData(data.version.lensMatrixData)
        } else {
          setLensMatrixData(null)
        }
        if (data.version.extractedData) {
          setExtractedData(data.version.extractedData)
        } else {
          setExtractedData(null)
        }

        // Switch to the carrier tab
        const carrier = data.version.insuranceCarrier?.toUpperCase()
        if (carrier === 'EYEMED' || carrier === 'VSP' || carrier === 'SPECTERA') {
          setActiveCarrier(carrier as 'EYEMED' | 'VSP' | 'SPECTERA' | 'CASH')
        }
      }
    } catch (error) {
      console.error('Error loading saved prices:', error)
    } finally {
      setLoadingSavedPrices(false)
    }
  }

  // Generate price lists
  const generatePriceLists = (auth: AuthorizationData | null) => {
    let eyemedAuth: EyeMedAuth = {}

    if (auth && auth.carrier === 'EYEMED') {
      // Map authorization data to EyeMedAuth format
      eyemedAuth = {
        examCopay: auth.examCopay || undefined,
        frameAllowance: auth.frameAllowance || undefined,
        frameOverageDiscount: auth.frameOveragePercent || 20,
        backsideUVSurcharge: 15,
        photochromicFreeUnder19: true,
        polyFreeUnder18: true,
      }
    }

    const lists = generateAllPriceLists(eyemedAuth)
    setPriceLists(lists)
  }

  useEffect(() => {
    if (customerId) {
      fetchAuthorization()
      fetchVersions()
    }
  }, [customerId])

  // Get current price list items
  const currentPriceList = priceLists[activeCarrier]

  // Filter items by search and category
  const categories = Array.from(new Set(currentPriceList.items.map(p => p.category)))
  const filteredItems = currentPriceList.items.filter(item => {
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Group by category
  const itemsByCategory = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, PriceListItem[]>)

  // Sort categories logically
  const categoryOrder = [
    'lens_type',
    'lens_material',
    'ar_coating',
    'photochromic',
    'add_on',
    'mount_fee',
  ]
  const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a)
    const indexB = categoryOrder.indexOf(b)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
  }

  const formatCategory = (cat: string): string => {
    return cat
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getCarrierColor = (carrier: string): string => {
    switch (carrier) {
      case 'EYEMED': return 'bg-emerald-600'
      case 'VSP': return 'bg-blue-600'
      case 'SPECTERA': return 'bg-purple-600'
      case 'CASH': return 'bg-gray-600'
      default: return 'bg-gray-600'
    }
  }

  const exportPricelist = () => {
    const rows: string[][] = []
    const headers = ['Product', 'Category', 'Retail', 'Copay', 'Tier', 'Notes']

    for (const category of sortedCategories) {
      const categoryItems = itemsByCategory[category]
      rows.push([`--- ${formatCategory(category)} (${categoryItems.length}) ---`, '', '', '', '', ''])

      for (const item of categoryItems) {
        rows.push([
          item.productName,
          item.category,
          item.retail.toFixed(2),
          item.copay?.toFixed(2) || 'N/A',
          item.tier || '',
          item.notes || ''
        ])
      }
    }

    const csvContent = [
      `Price List for ${customer.firstName} ${customer.lastName}`,
      `Carrier: ${activeCarrier}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `pricelist-${customer.firstName}-${activeCarrier}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const hasInsurance = authData !== null
  const effectiveCarrier = authData?.carrier?.toUpperCase() || customer.insuranceCarrier?.toUpperCase() || null

  // Check if this is Angela Clayton and load her hardcoded pricelist
  const isAngelaClayton = customer.memberId === '20706244103' || (customer.firstName === 'Angela' && customer.lastName === 'Clayton')
  const angelaPricelist = isAngelaClayton ? getPricelistByMemberId('20706244103') : null

  return (
    <div className="space-y-4">
      {/* Scanner */}
      {showScanner && (
        <Card>
          <CardContent className="py-4">
            <InlineScanner
              customerId={customerId}
              onDocumentProcessed={async (result) => {
                if (result.success) {
                  toast({
                    title: 'Document Processed',
                    description: `${result.carrier || 'Insurance'} document scanned.`
                  })
                  await fetchAuthorization()
                  if (onUpdate) onUpdate()
                }
              }}
              onClose={() => setShowScanner(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Price List Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-2xl">Insurance Coverage</CardTitle>
                {loadingAuth ? (
                  <p className="text-sm text-muted-foreground mt-1">Loading...</p>
                ) : hasInsurance ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`${getCarrierColor(effectiveCarrier || 'CASH')} text-white`}>
                      {effectiveCarrier}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{authData?.planName}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Cash / Retail Pricing</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Version History Toggle */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
              >
                <History className="h-4 w-4 mr-2" />
                {versions.length > 0 ? `${versions.length} Versions` : 'No Saved Versions'}
              </Button>
            </div>
          </div>

          {/* Version History Panel */}
          {showVersionHistory && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Saved Price Lists</h3>
                <div className="flex gap-2">
                  {versions.some(v => v.active) && (
                    <Link href={`/pos?customerId=${customerId}`}>
                      <Button variant="default" size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700">
                        <Calculator className="h-3 w-3 mr-1" />
                        Quick Quote
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {loadingVersions ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <p>No saved price lists yet.</p>
                  <p className="mt-1">Use the VSP or EyeMed Pricer to generate and save a price list.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        version.active
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-background border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {version.active && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{version.versionLabel}</span>
                            <Badge variant="outline" className="text-xs">
                              {version.insuranceCarrier}
                            </Badge>
                            {version.active && (
                              <Badge className="bg-green-600 text-white text-xs">Active</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {new Date(version.createdAt).toLocaleDateString()}
                            {version.planName && <span>• {version.planName}</span>}
                            <span>• {version.itemCount} items</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!version.active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => activateVersion(version.id)}
                            disabled={activatingVersion === version.id}
                          >
                            {activatingVersion === version.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Activate'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Carrier Tabs */}
          <Tabs value={activeCarrier} onValueChange={(v) => setActiveCarrier(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="EYEMED">EyeMed</TabsTrigger>
              <TabsTrigger value="VSP">VSP</TabsTrigger>
              <TabsTrigger value="SPECTERA">Spectera</TabsTrigger>
              <TabsTrigger value="CASH">Cash</TabsTrigger>
            </TabsList>

            {(['EYEMED', 'VSP', 'SPECTERA', 'CASH'] as const).map(carrier => {
              // Check if we have saved prices for this carrier
              const hasSavedPrices = activeVersionCarrier === carrier && Object.keys(savedPriceItems).length > 0

              // For saved prices from EyeMed/VSP pricer, show those (unless in replace mode)
              if (hasSavedPrices && !replaceMode[carrier]) {
                const activeVersion = versions.find(v => v.active)
                const savedCategories = Object.keys(savedPriceItems)

                // Get all items flattened for search
                const allSavedItems = savedCategories.flatMap(cat =>
                  savedPriceItems[cat].map(item => ({ ...item, categoryKey: cat }))
                )

                // Filter saved items by search (handle both name and productName)
                const filteredSavedItems = allSavedItems.filter(item => {
                  const itemName = item.name || item.productName || ''
                  return itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    (filterCategory === 'all' || item.categoryKey === filterCategory)
                })

                // Group filtered items by category
                const groupedItems = filteredSavedItems.reduce((acc, item) => {
                  if (!acc[item.categoryKey]) acc[item.categoryKey] = []
                  acc[item.categoryKey].push(item)
                  return acc
                }, {} as Record<string, typeof filteredSavedItems>)

                return (
                  <TabsContent key={carrier} value={carrier} className="space-y-5 mt-6">
                    {/* Saved Version Banner */}
                    <div className={`${carrier === 'EYEMED' ? 'bg-emerald-950/30 border-emerald-600/30' : 'bg-blue-950/30 border-blue-600/30'} border rounded-lg p-4`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className={`h-4 w-4 ${carrier === 'EYEMED' ? 'text-emerald-400' : 'text-blue-400'}`} />
                            <h3 className={`text-sm font-semibold ${carrier === 'EYEMED' ? 'text-emerald-400' : 'text-blue-400'}`}>
                              Saved Price List - {activeVersion?.versionLabel}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activeVersion?.planName} • {filteredSavedItems.length} items • Saved {activeVersion?.createdAt ? new Date(activeVersion.createdAt).toLocaleDateString() : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Upload New Document */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReplaceMode(prev => ({ ...prev, [carrier]: true }))}
                            className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Upload New
                          </Button>
                          {/* Delete Price List */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => activeVersion && deleteVersion(activeVersion.id, carrier)}
                            disabled={deletingVersion}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            {deletingVersion ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            Delete
                          </Button>
                          {/* Quick Quote */}
                          <Link href={`/pos?customerId=${customerId}`}>
                            <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                              <Calculator className="h-4 w-4 mr-1" />
                              Quick Quote
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* VSP Authorization Header - Exact copy from VSP pricer */}
                    {carrier === 'VSP' && extractedData && (
                      <>
                        {/* Patient Info Banner */}
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-blue-600/30 rounded-full flex items-center justify-center">
                              <Shield className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-white">
                                {(extractedData as any)?.patientInfo?.name || `${customer.firstName} ${customer.lastName}`}
                              </h2>
                              <p className="text-white/70 capitalize">
                                {(extractedData as any)?.planInfo?.planType?.replace(/_/g, ' ') || 'VSP'} Plan
                              </p>
                            </div>
                            <div className="ml-auto text-right">
                              {(extractedData as any)?.patientInfo?.authNumber && (
                                <p className="text-white/50 text-sm">Auth #: {(extractedData as any).patientInfo.authNumber}</p>
                              )}
                              {(extractedData as any)?.patientInfo?.effectiveDate && (
                                <p className="text-white/50 text-sm">
                                  {(extractedData as any).patientInfo.effectiveDate} - {(extractedData as any).patientInfo.expirationDate}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Key Benefits Summary - Row 1 */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-700/50 rounded-lg p-3">
                              <p className="text-white/50 text-xs uppercase">Exam Copay</p>
                              <p className="text-white font-bold text-lg">${(extractedData as any)?.copays?.exam ?? '—'}</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                              <p className="text-white/50 text-xs uppercase">Material Copay</p>
                              <p className="text-white font-bold text-lg">${(extractedData as any)?.copays?.material ?? '—'}</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                              <p className="text-white/50 text-xs uppercase">Frame Allow</p>
                              <p className="text-white font-bold text-lg">${(extractedData as any)?.frameAllowance?.amount ?? '—'}</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                              <p className="text-white/50 text-xs uppercase">CL Allow</p>
                              <p className="text-white font-bold text-lg">
                                {(extractedData as any)?.contactLens?.materialsAllowance != null
                                  ? `$${(extractedData as any).contactLens.materialsAllowance}`
                                  : (extractedData as any)?.contactLens?.combinedAllowance != null
                                    ? `$${(extractedData as any).contactLens.combinedAllowance}`
                                    : 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Key Benefits Summary - Row 2 */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div className="bg-gray-700/50 rounded-lg p-3">
                              <p className="text-white/50 text-xs uppercase">EasyOptions</p>
                              <p className="text-white font-bold text-lg">{(extractedData as any)?.easyOptions?.enabled ? 'Yes' : 'No'}</p>
                            </div>
                            <div className={`rounded-lg p-3 ${(extractedData as any)?.flags?.hasEmc ? 'bg-green-700/50' : 'bg-gray-700/50'}`}>
                              <p className="text-white/50 text-xs uppercase">EMC</p>
                              <p className={`font-bold text-lg ${(extractedData as any)?.flags?.hasEmc ? 'text-green-400' : 'text-white'}`}>
                                {(extractedData as any)?.flags?.hasEmc ? 'Yes' : 'No'}
                              </p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                              <p className="text-white/50 text-xs uppercase">Computer Vision</p>
                              <p className="text-white font-bold text-lg">{(extractedData as any)?.flags?.isComputerVisioncare ? 'Yes' : 'No'}</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                              <p className="text-white/50 text-xs uppercase">CL Exam Copay</p>
                              <p className="text-white font-bold text-lg">
                                {(extractedData as any)?.contactLens?.examCopay != null ? `$${(extractedData as any).contactLens.examCopay}` : 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Progressive Tier Base Copays */}
                          {(extractedData as any)?.progressives && (
                            <div className="mt-4 p-4 bg-gray-700/30 rounded-lg">
                              <h4 className="text-white/70 text-sm font-medium mb-2">
                                Progressive Tier Base Copays
                              </h4>
                              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                                <div className="bg-gray-800/50 rounded p-2">
                                  <p className="text-gray-400">K (Standard)</p>
                                  <p className="text-green-400 font-bold">${(extractedData as any).progressives.K_standard ?? '—'}</p>
                                </div>
                                <div className="bg-gray-800/50 rounded p-2">
                                  <p className="text-gray-400">J (Premium)</p>
                                  <p className="text-yellow-400 font-bold">${(extractedData as any).progressives.J_premium ?? '—'}</p>
                                </div>
                                <div className="bg-gray-800/50 rounded p-2">
                                  <p className="text-gray-400">F (Prem Adv)</p>
                                  <p className="text-yellow-400 font-bold">${(extractedData as any).progressives.F_premium_adv ?? '—'}</p>
                                </div>
                                <div className="bg-gray-800/50 rounded p-2">
                                  <p className="text-gray-400">O (Custom)</p>
                                  <p className="text-orange-400 font-bold">${(extractedData as any).progressives.O_custom ?? '—'}</p>
                                </div>
                                <div className="bg-gray-800/50 rounded p-2">
                                  <p className="text-gray-400">N (Varilux X)</p>
                                  <p className="text-orange-400 font-bold">${(extractedData as any).progressives.N_custom ?? '—'}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* EMC Available Banner */}
                        {(extractedData as any)?.flags?.hasEmc && (
                          <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-green-400 font-medium">EMC Available - Enhanced Medical Coverage</p>
                              <p className="text-green-300/80 text-sm mt-1">
                                {(extractedData as any)?.flags?.emcType && (
                                  <span className="capitalize">{(extractedData as any).flags.emcType.replace(/_/g, ' ')}</span>
                                )}
                                {(extractedData as any)?.flags?.emcExamCopay != null && (
                                  <span className="ml-2">• EMC Exam Copay: ${(extractedData as any).flags.emcExamCopay}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Computer VisionCare Warning */}
                        {(extractedData as any)?.flags?.isComputerVisioncare && (
                          <div className="mt-4 p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg flex items-start gap-3">
                            <FileText className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-amber-400 font-medium">Computer VisionCare Plan</p>
                              <p className="text-amber-300/80 text-sm mt-1">
                                Photochromics and Polarized lenses are NOT COVERED under this plan.
                                {(extractedData as any)?.flags?.computerRxRequirement && (
                                  <span className="block mt-1">{(extractedData as any).flags.computerRxRequirement}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* VSP Lens + Material Matrix - Full Grid (exact copy from VSP pricer) */}
                    {carrier === 'VSP' && lensMatrixData && extractedData && (
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <Calculator className="w-5 h-5 text-green-400" />
                          Lens + Material Matrix
                          {(extractedData as any)?.copays?.material !== undefined && (
                            <span className="text-xs text-white/50 font-normal ml-2">(includes ${(extractedData as any).copays.material} material copay)</span>
                          )}
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-white/70">
                                <th className="text-left py-2 px-3 bg-gray-700/50 rounded-tl-lg">Material</th>
                                <th className="text-center py-2 px-3 bg-gray-700/50">SV</th>
                                <th className="text-center py-2 px-3 bg-gray-700/50">
                                  <div>Standard</div>
                                  <div className="text-xs text-gray-400">Eyezen/Bifocal</div>
                                </th>
                                <th className="text-center py-2 px-3 bg-gray-700/50">
                                  <div>Premium</div>
                                  <div className="text-xs text-gray-400">Comfort DRx</div>
                                </th>
                                <th className="text-center py-2 px-3 bg-gray-700/50">
                                  <div>Prem Adv</div>
                                  <div className="text-xs text-gray-400">Comfort Max</div>
                                </th>
                                <th className="text-center py-2 px-3 bg-gray-700/50 rounded-tr-lg">
                                  <div>Custom</div>
                                  <div className="text-xs text-gray-400">Varilux X</div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const matrix = (lensMatrixData as any)?.lensMatrix || {}
                                const materialCopay = Number((extractedData as any)?.copays?.material) || 0

                                // CR-39 / Plastic
                                const cr39 = {
                                  sv: (matrix.SV_plastic ?? 0) + materialCopay,
                                  std: (matrix.KA ?? 0) + materialCopay,
                                  prem: (matrix.JA ?? 0) + materialCopay,
                                  premAdv: (matrix.FA ?? 0) + materialCopay,
                                  custom: (matrix.OA ?? 0) + materialCopay,
                                }
                                // Polycarbonate = base + KD/JD/FD/OD upgrade
                                const poly = {
                                  sv: (matrix.SV_poly ?? 0) + materialCopay,
                                  std: (matrix.KA ?? 0) + (matrix.KD ?? 0) + materialCopay,
                                  prem: (matrix.JA ?? 0) + (matrix.JD ?? 0) + materialCopay,
                                  premAdv: (matrix.FA ?? 0) + (matrix.FD ?? 0) + materialCopay,
                                  custom: (matrix.OA ?? 0) + (matrix.OD ?? 0) + materialCopay,
                                }
                                // Trivex = base + KB/JB/FB/OB upgrade
                                const trivex = {
                                  sv: (matrix.SV_trivex ?? 0) + materialCopay,
                                  std: (matrix.KA ?? 0) + (matrix.KB ?? 0) + materialCopay,
                                  prem: (matrix.JA ?? 0) + (matrix.JB ?? 0) + materialCopay,
                                  premAdv: (matrix.FA ?? 0) + (matrix.FB ?? 0) + materialCopay,
                                  custom: (matrix.OA ?? 0) + (matrix.OB ?? 0) + materialCopay,
                                }
                                // 1.67 High Index = base + KH/JH/FH/OH upgrade
                                const hi167 = {
                                  sv: (matrix.SV_hi167 ?? 0) + materialCopay,
                                  std: (matrix.KA ?? 0) + (matrix.KH ?? 0) + materialCopay,
                                  prem: (matrix.JA ?? 0) + (matrix.JH ?? 0) + materialCopay,
                                  premAdv: (matrix.FA ?? 0) + (matrix.FH ?? 0) + materialCopay,
                                  custom: (matrix.OA ?? 0) + (matrix.OH ?? 0) + materialCopay,
                                }
                                // 1.74 Ultra High = base + KJ/JJ/FJ/OJ upgrade
                                const hi174 = {
                                  sv: (matrix.SV_hi174 ?? 0) + materialCopay,
                                  std: (matrix.KA ?? 0) + (matrix.KJ ?? 0) + materialCopay,
                                  prem: (matrix.JA ?? 0) + (matrix.JJ ?? 0) + materialCopay,
                                  premAdv: (matrix.FA ?? 0) + (matrix.FJ ?? 0) + materialCopay,
                                  custom: (matrix.OA ?? 0) + (matrix.OJ ?? 0) + materialCopay,
                                }

                                const materials = [
                                  { name: 'CR-39 (Plastic)', values: cr39 },
                                  { name: 'Polycarbonate', values: poly },
                                  { name: 'Trivex', values: trivex },
                                  { name: '1.67 High Index', values: hi167 },
                                  { name: '1.74 Ultra High', values: hi174 },
                                ]

                                return materials.map((mat, idx) => (
                                  <tr key={mat.name} className={`border-t border-gray-700/50 ${idx % 2 === 1 ? 'bg-gray-800/30' : ''}`}>
                                    <td className="py-2 px-3 text-white font-medium">{mat.name}</td>
                                    <td className="py-2 px-3 text-center text-green-400 font-semibold">${mat.values.sv}</td>
                                    <td className="py-2 px-3 text-center text-green-400 font-semibold">${mat.values.std}</td>
                                    <td className="py-2 px-3 text-center text-yellow-400 font-semibold">${mat.values.prem}</td>
                                    <td className="py-2 px-3 text-center text-yellow-400 font-semibold">${mat.values.premAdv}</td>
                                    <td className="py-2 px-3 text-center text-orange-400 font-semibold">${mat.values.custom}</td>
                                  </tr>
                                ))
                              })()}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-white/40 mt-3">
                          * Total patient cost = Progressive tier + Material upgrade + ${(extractedData as any)?.copays?.material || 0} material copay. Add AR coating, photochromic, and other add-ons separately.
                        </p>
                      </div>
                    )}

                    {/* Patient Price List - EXACT copy from VSP pricer */}
                    {carrier === 'VSP' && (
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-green-400" />
                            Patient Price List
                          </h3>
                          <span className="text-gray-500 text-sm">
                            {filteredSavedItems.length} products
                          </span>
                        </div>

                        {loadingSavedPrices ? (
                          <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {Object.keys(groupedItems).map(section => {
                              const products = groupedItems[section]
                              // Check if this section has items with SV/Multi variance
                              const hasVarianceItems = products.some((p: any) => p.hasVariance === true || (p.svCopay !== undefined && p.multiCopay !== undefined))

                              return (
                                <div key={section}>
                                  <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-2">
                                    {section}
                                  </h4>
                                  <table className="w-full">
                                    <thead>
                                      <tr className="text-left text-white/50 text-xs uppercase">
                                        <th className="pb-2">Product</th>
                                        <th className="pb-2 text-right">Retail</th>
                                        {hasVarianceItems ? (
                                          <>
                                            <th className="pb-2 text-right">SV</th>
                                            <th className="pb-2 text-right">Multi</th>
                                          </>
                                        ) : (
                                          <th className="pb-2 text-right">Copay</th>
                                        )}
                                        <th className="pb-2 text-right">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {products.map((product: any, idx: number) => {
                                        const productName = product.name || product.productName || 'Unknown'
                                        const retail = product.retail || 0
                                        const copay = product.patientCost ?? product.copay ?? 0
                                        const svCopay = product.svCopay ?? copay
                                        const multiCopay = product.multiCopay ?? copay
                                        const isCashOnly = product.isCashOnly
                                        const isNotCovered = product.isNotCovered
                                        const notes = product.notes || []

                                        const getCopayColor = (val: number, cashOnly: boolean, notCovered: boolean) => {
                                          if (cashOnly || notCovered) return 'text-red-400'
                                          if (val === 0) return 'text-green-400'
                                          return 'text-yellow-400'
                                        }

                                        const getStatus = () => {
                                          if (isCashOnly) return <span className="text-red-400">Cash Only</span>
                                          if (isNotCovered) return <span className="text-red-400">Not Covered</span>
                                          if (copay === 0) return <span className="text-green-400">Covered</span>
                                          if (hasVarianceItems && product.hasVariance) return <span className="text-blue-400">SV/Multi</span>
                                          if (notes.length > 0) return <span className="text-white/40">{notes.join(', ')}</span>
                                          return <span className="text-white/40">Copay</span>
                                        }

                                        return (
                                          <tr key={idx} className="border-t border-gray-700/50">
                                            <td className="py-2 text-white">{productName}</td>
                                            <td className="py-2 text-right text-white/50">${retail.toFixed(2)}</td>
                                            {hasVarianceItems ? (
                                              <>
                                                <td className={`py-2 text-right font-semibold ${getCopayColor(svCopay, isCashOnly, isNotCovered)}`}>
                                                  ${svCopay.toFixed(2)}
                                                </td>
                                                <td className={`py-2 text-right font-semibold ${getCopayColor(multiCopay, isCashOnly, isNotCovered)}`}>
                                                  ${multiCopay.toFixed(2)}
                                                </td>
                                              </>
                                            ) : (
                                              <td className={`py-2 text-right font-semibold ${getCopayColor(copay, isCashOnly, isNotCovered)}`}>
                                                ${copay.toFixed(2)}
                                              </td>
                                            )}
                                            <td className="py-2 text-right text-sm">
                                              {getStatus()}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* EyeMed Authorization Header - Exact copy from EyeMed pricer */}
                    {carrier === 'EYEMED' && extractedData && (
                      <>
                        {/* Patient Info Banner */}
                        <div className="bg-emerald-900/30 border border-emerald-600/30 rounded-lg p-6 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <Shield className="h-6 w-6 text-emerald-400" />
                              </div>
                              <div>
                                <h2 className="text-xl font-bold text-white">
                                  {(extractedData as any)?.patient_name || `${customer.firstName} ${customer.lastName}`}
                                </h2>
                                <p className="text-white/70">{(extractedData as any)?.plan_name || 'EyeMed Plan'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {(extractedData as any)?.member_id && (
                                <p className="text-white/70 text-sm">ID: {(extractedData as any).member_id}</p>
                              )}
                              {(extractedData as any)?.patient_age && (
                                <p className="text-white/70 text-sm">Age: {(extractedData as any).patient_age}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Benefit Summary Cards - 6 boxes */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                            <p className="text-xs text-white/50 uppercase tracking-wide">Exam Copay</p>
                            <p className="text-xl font-bold text-white mt-1">
                              {(extractedData as any)?.exam_copay != null ? `$${(extractedData as any).exam_copay}` : '—'}
                            </p>
                          </div>
                          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                            <p className="text-xs text-white/50 uppercase tracking-wide">Frame Allow</p>
                            <p className="text-xl font-bold text-white mt-1">
                              {(extractedData as any)?.frame_allowance != null ? `$${(extractedData as any).frame_allowance}` : '—'}
                            </p>
                          </div>
                          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                            <p className="text-xs text-white/50 uppercase tracking-wide">
                              CL Allow
                              {(extractedData as any)?.contacts_allowance_type === 'both' && (
                                <span className="text-amber-400 ml-1">*</span>
                              )}
                            </p>
                            <p className="text-xl font-bold text-white mt-1">
                              {(extractedData as any)?.contacts_allowance != null ? `$${(extractedData as any).contacts_allowance}` : '—'}
                            </p>
                            {(extractedData as any)?.contacts_allowance_type === 'both' && (
                              <p className="text-xs text-amber-400/70 mt-1">Shared w/ CL Fit</p>
                            )}
                          </div>
                          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                            <p className="text-xs text-white/50 uppercase tracking-wide">SV Lens</p>
                            <p className="text-xl font-bold text-white mt-1">
                              {(extractedData as any)?.lens_sv != null ? `$${(extractedData as any).lens_sv}` : '—'}
                            </p>
                          </div>
                          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                            <p className="text-xs text-white/50 uppercase tracking-wide">Prog Std</p>
                            <p className="text-xl font-bold text-white mt-1">
                              {(extractedData as any)?.progressive_standard != null ? `$${(extractedData as any).progressive_standard}` : '—'}
                            </p>
                          </div>
                          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                            <p className="text-xs text-white/50 uppercase tracking-wide">CL Fit</p>
                            <p className="text-xl font-bold text-white mt-1">
                              {(extractedData as any)?.cl_fit_standard != null
                                ? `$${(extractedData as any).cl_fit_standard}`
                                : (extractedData as any)?.cl_fit_standard_type === 'discount' && (extractedData as any)?.cl_fit_standard_pct != null
                                  ? `${Math.round((1 - (extractedData as any).cl_fit_standard_pct) * 100)}% over $${(extractedData as any)?.contacts_allowance || 0}`
                                  : '—'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* EyeMed Price List (different format) */}
                    {carrier === 'EYEMED' && (
                      <div className="space-y-6">
                        {loadingSavedPrices ? (
                          <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : filteredSavedItems.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No products found
                          </div>
                        ) : (
                          Object.keys(groupedItems).map(categoryKey => (
                            <div key={categoryKey}>
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                {categoryKey} ({groupedItems[categoryKey].length})
                              </h3>
                              <div className="space-y-1">
                                {/* Header */}
                                <div className="flex text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">
                                  <div className="flex-1 px-4 py-2">Product</div>
                                  <div className="w-32 px-4 py-2 text-right">Retail</div>
                                  <div className="w-32 px-4 py-2 text-right">You Pay</div>
                                  <div className="w-32 px-4 py-2 text-right">Savings</div>
                                </div>
                                {/* Items */}
                                {groupedItems[categoryKey].map((item: any, idx: number) => {
                                  const displayName = item.name || item.productName || 'Unknown'
                                  const patientPays = item.patientCost ?? item.copay ?? 0
                                  const displayNote = item.note || (item.notes && item.notes.length > 0 ? item.notes.join(', ') : null)
                                  const savings = item.retail - patientPays
                                  const savingsPercent = item.retail > 0 ? Math.round((savings / item.retail) * 100) : 0
                                  return (
                                    <div
                                      key={`${categoryKey}-${idx}`}
                                      className={`flex text-sm transition-colors rounded-md px-2 py-2 ${idx % 2 === 0 ? 'bg-muted/30' : 'bg-transparent'} hover:bg-muted/50`}
                                    >
                                      <div className="flex-1 px-4 py-2">
                                        <div className="font-medium text-foreground">{displayName}</div>
                                        {displayNote && <div className="text-xs text-muted-foreground mt-1">{displayNote}</div>}
                                        {item.isNotCovered && <div className="text-xs text-red-400 mt-1">Not Covered</div>}
                                        {item.isCashOnly && <div className="text-xs text-yellow-400 mt-1">Cash Only</div>}
                                      </div>
                                      <div className="w-32 px-4 py-2 text-right text-foreground font-mono">
                                        {formatPrice(item.retail)}
                                      </div>
                                      <div className="w-32 px-4 py-2 text-right">
                                        <div className="font-semibold text-green-600 font-mono">{formatPrice(patientPays)}</div>
                                      </div>
                                      <div className="w-32 px-4 py-2 text-right">
                                        {savings > 0 ? (
                                          <div className="font-semibold text-orange-600">{savingsPercent}% off</div>
                                        ) : (
                                          <div className="text-muted-foreground">—</div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </TabsContent>
                )
              }

              // Show loading state while versions are being fetched
              if ((carrier === 'VSP' || carrier === 'EYEMED') && (loadingVersions || loadingSavedPrices)) {
                return (
                  <TabsContent key={carrier} value={carrier} className="space-y-5 mt-6">
                    <Card className="glass-card border-white/20">
                      <CardContent className="py-12">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-white">Loading price list...</h3>
                            <p className="text-white/70 mt-1 text-sm">Checking for saved prices</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )
              }

              // For VSP in replace mode OR without saved prices - show inline pricer
              if (carrier === 'VSP' && (replaceMode[carrier] || (!hasSavedPrices && !loadingVersions && !loadingSavedPrices))) {
                return (
                  <TabsContent key={carrier} value={carrier} className="space-y-5 mt-6">
                    {/* Cancel Replace Mode button */}
                    {replaceMode[carrier] && hasSavedPrices && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReplaceMode(prev => ({ ...prev, [carrier]: false }))}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    <InlineVspPricer
                      customerId={customerId}
                      customer={{ firstName: customer.firstName, lastName: customer.lastName }}
                      onPriceListSaved={async () => {
                        setReplaceMode(prev => ({ ...prev, [carrier]: false }))
                        await fetchVersions()
                      }}
                    />
                  </TabsContent>
                )
              }

              // For EyeMed in replace mode OR without saved prices - show inline pricer
              if (carrier === 'EYEMED' && !angelaPricelist && (replaceMode[carrier] || (!hasSavedPrices && !loadingVersions && !loadingSavedPrices))) {
                return (
                  <TabsContent key={carrier} value={carrier} className="space-y-5 mt-6">
                    {/* Cancel Replace Mode button */}
                    {replaceMode[carrier] && hasSavedPrices && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReplaceMode(prev => ({ ...prev, [carrier]: false }))}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    <InlineEyemedPricer
                      customerId={customerId}
                      customer={{ firstName: customer.firstName, lastName: customer.lastName }}
                      onPriceListSaved={async () => {
                        setReplaceMode(prev => ({ ...prev, [carrier]: false }))
                        await fetchVersions()
                      }}
                    />
                  </TabsContent>
                )
              }

              // For Angela Clayton on EYEMED tab, show her hardcoded pricelist
              if (carrier === 'EYEMED' && angelaPricelist) {
                return (
                  <TabsContent key={carrier} value={carrier} className="space-y-5 mt-6">
                    <div className="bg-emerald-950/30 border border-emerald-600/30 rounded-lg p-4 mb-4">
                      <h3 className="text-sm font-semibold text-emerald-400">Angela Clayton - EyeMed Benefits</h3>
                      <p className="text-xs text-muted-foreground mt-1">Member ID: {angelaPricelist.member.memberId} | Network: {angelaPricelist.member.network}</p>
                    </div>
                    <div className="space-y-4">
                      {angelaPricelist.pricedProducts.map((product, idx) => (
                        <div key={idx} className={`flex text-sm border-b border-border/30 pb-3 ${idx % 2 === 0 ? 'bg-muted/20' : 'bg-transparent'} p-3 rounded`}>
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{product.productName}</div>
                            <div className="text-xs text-muted-foreground mt-1">{product.category}</div>
                            {product.notes && <div className="text-xs text-muted-foreground mt-1">{product.notes}</div>}
                          </div>
                          <div className="w-40 text-right">
                            <div className="font-semibold text-emerald-400">
                              ${product.copay === 0 ? '0' : product.copay}
                            </div>
                            {product.formula && (
                              <div className="text-xs text-muted-foreground mt-1">{product.formula}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )
              }

              // For other carriers, show the generated pricelist
              return (
                <TabsContent key={carrier} value={carrier} className="space-y-5 mt-6">
                  {/* Search & Filter Bar */}
                  <div className="flex gap-4 items-center">
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {formatCategory(cat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportPricelist}
                      className="ml-auto"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>

                  {/* Products Table */}
                  {loadingAuth ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No products found
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Header Row */}
                      <div className="flex text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">
                        <div className="flex-1 px-4 py-2">Product</div>
                        <div className="w-32 px-4 py-2 text-right">Retail</div>
                        <div className="w-32 px-4 py-2 text-right">You Pay</div>
                        <div className="w-32 px-4 py-2 text-right">Savings</div>
                        <div className="w-12 px-4 py-2 text-center"></div>
                      </div>
                      {/* Data Rows */}
                      {filteredItems.map((item, idx) => {
                        const savings = (item.retail || 0) - (item.copay || 0)
                        const savingsPercent = item.retail ? Math.round((savings / item.retail) * 100) : 0
                        return (
                          <div key={`${item.productId}-${carrier}`} className={`flex text-sm transition-colors rounded-md px-2 py-2 ${idx % 2 === 0 ? 'bg-muted/30' : 'bg-transparent'} hover:bg-muted/50`}>
                            <div className="flex-1 px-4 py-2">
                              <div className="font-medium text-foreground">{item.productName}</div>
                              <div className="text-xs text-muted-foreground mt-1">{item.category}</div>
                            </div>
                            <div className="w-32 px-4 py-2 text-right text-foreground font-mono">
                              {formatPrice(item.retail)}
                            </div>
                            <div className="w-32 px-4 py-2 text-right">
                              <div className="font-semibold text-green-600 font-mono">{formatPrice(item.copay)}</div>
                            </div>
                            <div className="w-32 px-4 py-2 text-right">
                              {savings > 0 ? (
                                <div className="font-semibold text-orange-600">{savingsPercent}% off</div>
                              ) : (
                                <div className="text-muted-foreground">—</div>
                              )}
                            </div>
                            <div className="w-12 px-4 py-2 text-center flex items-center justify-center">
                              <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
