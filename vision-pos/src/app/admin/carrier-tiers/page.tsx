'use client'

import { useState, useEffect } from 'react'
import PageLayout from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Pencil,
  X,
  Save
} from 'lucide-react'

interface CarrierTier {
  id: string
  productType: string
  productId: string
  productName: string
  carrier: string
  tierCode: string
  tierLabel: string | null
  pricingRule: string
  createdAt: string
  updatedAt: string
}

interface CoverageStat {
  mapped: number
  total: number
  percentage: number
}

interface Stats {
  total: number
  byCarrier: Record<string, number>
  byProductType: Record<string, number>
  byPricingRule: Record<string, number>
  coverage: {
    VSP: CoverageStat
    EYEMED: CoverageStat
    SPECTERA: CoverageStat
  }
  legacyMappings: {
    lensCarrierTiers: number
    productsWithTierColumns: number
  }
}

type TabType = 'overview' | 'vsp' | 'eyemed' | 'spectera' | 'missing'

const PRICING_RULES = [
  { value: 'TIER_COPAY', label: 'Tier Copay', description: 'Patient pays copay from authorization' },
  { value: '80_UC', label: '80% U&C', description: 'Patient pays 80% of retail price' },
  { value: 'ALLOWANCE', label: 'Allowance', description: 'Apply allowance, patient pays overage' },
  { value: 'INCLUDED', label: 'Included', description: 'Covered at $0 copay' },
  { value: 'CASH_ONLY', label: 'Cash Only', description: 'Not covered, full retail price' }
]

const TIER_CODE_SUGGESTIONS: Record<string, string[]> = {
  VSP: ['AA', 'BA', 'FA', 'GA', 'IA', 'JA', 'KA', 'NA', 'OA', 'QM', 'QT', 'QV', 'AD', 'BH', 'BJ', 'PR', 'DA', 'MP', 'exam_copay', 'cl_fitting_copay'],
  EYEMED: ['standard', 'digital_sv', 'tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'polycarbonate', 'high_index_167', 'high_index_174', 'photochromic', 'exam_copay'],
  SPECTERA: ['standard', 'tier_I', 'tier_II', 'tier_III', 'tier_IV', 'tier_V', 'polycarbonate', 'high_index_167', 'high_index_174', 'photochromic', 'exam_copay']
}

export default function CarrierTiersPage() {
  const [data, setData] = useState<CarrierTier[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductType, setSelectedProductType] = useState<string>('')
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['LENS']))

  // Edit modal state
  const [editingTier, setEditingTier] = useState<CarrierTier | null>(null)
  const [editForm, setEditForm] = useState({
    tierCode: '',
    tierLabel: '',
    pricingRule: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/carrier-tiers')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setStats(json.stats)
      } else {
        setError(json.error || 'Failed to fetch data')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleExpanded = (type: string) => {
    const newExpanded = new Set(expandedTypes)
    if (newExpanded.has(type)) {
      newExpanded.delete(type)
    } else {
      newExpanded.add(type)
    }
    setExpandedTypes(newExpanded)
  }

  const openEditModal = (tier: CarrierTier) => {
    setEditingTier(tier)
    setEditForm({
      tierCode: tier.tierCode,
      tierLabel: tier.tierLabel || '',
      pricingRule: tier.pricingRule
    })
    setSaveError(null)
  }

  const closeEditModal = () => {
    setEditingTier(null)
    setEditForm({ tierCode: '', tierLabel: '', pricingRule: '' })
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!editingTier) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const res = await fetch('/api/admin/carrier-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType: editingTier.productType,
          productId: editingTier.productId,
          productName: editingTier.productName,
          carrier: editingTier.carrier,
          tierCode: editForm.tierCode,
          tierLabel: editForm.tierLabel || null,
          pricingRule: editForm.pricingRule
        })
      })

      const json = await res.json()

      if (json.success) {
        // Update local data
        setData(prev => prev.map(item =>
          item.id === editingTier.id
            ? { ...item, tierCode: editForm.tierCode, tierLabel: editForm.tierLabel || null, pricingRule: editForm.pricingRule }
            : item
        ))
        closeEditModal()
      } else {
        setSaveError(json.error || 'Failed to save')
      }
    } catch (err) {
      setSaveError('Network error')
    } finally {
      setIsSaving(false)
    }
  }

  // Filter data based on active tab and search
  const filteredData = data.filter(item => {
    // Tab filter
    if (activeTab === 'vsp' && item.carrier !== 'VSP') return false
    if (activeTab === 'eyemed' && item.carrier !== 'EYEMED') return false
    if (activeTab === 'spectera' && item.carrier !== 'SPECTERA') return false

    // Product type filter
    if (selectedProductType && item.productType !== selectedProductType) return false

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        item.productName.toLowerCase().includes(term) ||
        item.tierCode.toLowerCase().includes(term) ||
        item.tierLabel?.toLowerCase().includes(term)
      )
    }
    return true
  })

  // Group by product type
  const groupedData = filteredData.reduce((acc, item) => {
    if (!acc[item.productType]) {
      acc[item.productType] = []
    }
    acc[item.productType].push(item)
    return acc
  }, {} as Record<string, CarrierTier[]>)

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400'
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getPricingRuleBadge = (rule: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'TIER_COPAY': { variant: 'default', label: 'Tier Copay' },
      '80_UC': { variant: 'secondary', label: '80% U&C' },
      'ALLOWANCE': { variant: 'outline', label: 'Allowance' },
      'INCLUDED': { variant: 'default', label: 'Included' },
      'CASH_ONLY': { variant: 'destructive', label: 'Cash Only' }
    }
    const config = variants[rule] || { variant: 'outline' as const, label: rule }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const exportToCSV = () => {
    const headers = ['Product Type', 'Product Name', 'Carrier', 'Tier Code', 'Tier Label', 'Pricing Rule']
    const rows = filteredData.map(item => [
      item.productType,
      item.productName,
      item.carrier,
      item.tierCode,
      item.tierLabel || '',
      item.pricingRule
    ])

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `carrier-tiers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageLayout title="Carrier Tier Mappings" subtitle="Insurance tier assignments for all products">
      {/* Edit Modal */}
      {editingTier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Edit Tier Mapping</h2>
              <button onClick={closeEditModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Read-only info */}
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p><span className="font-medium">Product:</span> {editingTier.productName}</p>
                <p><span className="font-medium">Carrier:</span> {editingTier.carrier}</p>
                <p><span className="font-medium">Type:</span> {editingTier.productType}</p>
              </div>

              {/* Tier Code */}
              <div className="space-y-2">
                <Label htmlFor="tierCode">Tier Code</Label>
                <Input
                  id="tierCode"
                  value={editForm.tierCode}
                  onChange={e => setEditForm(prev => ({ ...prev, tierCode: e.target.value }))}
                  placeholder="e.g., KA, tier_3, exam_copay"
                />
                {/* Suggestions */}
                <div className="flex flex-wrap gap-1">
                  {TIER_CODE_SUGGESTIONS[editingTier.carrier]?.slice(0, 8).map(code => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, tierCode: code }))}
                      className={`text-xs px-2 py-1 rounded border hover:bg-muted ${
                        editForm.tierCode === code ? 'bg-primary text-primary-foreground' : ''
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tier Label */}
              <div className="space-y-2">
                <Label htmlFor="tierLabel">Tier Label (optional)</Label>
                <Input
                  id="tierLabel"
                  value={editForm.tierLabel}
                  onChange={e => setEditForm(prev => ({ ...prev, tierLabel: e.target.value }))}
                  placeholder="Human-readable description"
                />
              </div>

              {/* Pricing Rule */}
              <div className="space-y-2">
                <Label htmlFor="pricingRule">Pricing Rule</Label>
                <select
                  id="pricingRule"
                  value={editForm.pricingRule}
                  onChange={e => setEditForm(prev => ({ ...prev, pricingRule: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  {PRICING_RULES.map(rule => (
                    <option key={rule.value} value={rule.value}>
                      {rule.label} - {rule.description}
                    </option>
                  ))}
                </select>
              </div>

              {saveError && (
                <div className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {saveError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !editForm.tierCode || !editForm.pricingRule}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* VSP Coverage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">VSP Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getCoverageColor(stats.coverage.VSP.percentage)}`}>
                {stats.coverage.VSP.percentage}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.coverage.VSP.mapped} / {stats.coverage.VSP.total} products
              </p>
              {stats.coverage.VSP.percentage >= 100 ? (
                <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-1" />
              )}
            </CardContent>
          </Card>

          {/* EyeMed Coverage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">EyeMed Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getCoverageColor(stats.coverage.EYEMED.percentage)}`}>
                {stats.coverage.EYEMED.percentage}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.coverage.EYEMED.mapped} / {stats.coverage.EYEMED.total} products
              </p>
              {stats.coverage.EYEMED.percentage >= 100 ? (
                <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-1" />
              )}
            </CardContent>
          </Card>

          {/* Spectera Coverage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Spectera Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getCoverageColor(stats.coverage.SPECTERA.percentage)}`}>
                {stats.coverage.SPECTERA.percentage}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.coverage.SPECTERA.mapped} / {stats.coverage.SPECTERA.total} products
              </p>
              {stats.coverage.SPECTERA.percentage >= 100 ? (
                <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-1" />
              )}
            </CardContent>
          </Card>

          {/* Total Mappings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Mappings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Legacy: {stats.legacyMappings.lensCarrierTiers} lens tiers, {stats.legacyMappings.productsWithTierColumns} product columns
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b pb-2">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'vsp', label: 'VSP' },
          { id: 'eyemed', label: 'EyeMed' },
          { id: 'spectera', label: 'Spectera' },
          { id: 'missing', label: 'Missing Mappings' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 rounded-t-md font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            {tab.label}
            {tab.id !== 'overview' && tab.id !== 'missing' && stats && (
              <span className="ml-2 text-xs">
                ({stats.byCarrier[tab.id.toUpperCase()] || 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name or tier code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedProductType}
          onChange={e => setSelectedProductType(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="">All Types</option>
          <option value="LENS">Lens</option>
          <option value="SERVICE">Service</option>
          <option value="MATERIAL">Material</option>
          <option value="ADDON">Add-on</option>
        </select>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={fetchData} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : activeTab === 'overview' ? (
        <div className="space-y-4">
          {/* Stats by Product Type */}
          <Card>
            <CardHeader>
              <CardTitle>Mappings by Product Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(stats?.byProductType || {}).map(([type, count]) => (
                  <div key={type} className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground">{type}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats by Pricing Rule */}
          <Card>
            <CardHeader>
              <CardTitle>Mappings by Pricing Rule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(stats?.byPricingRule || {}).map(([rule, count]) => (
                  <div key={rule} className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground">{rule.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stage 2 Completion Check */}
          <Card>
            <CardHeader>
              <CardTitle>Stage 2 Completion Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {stats?.coverage.VSP.percentage === 100 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>VSP: All products have tier mappings</span>
                </div>
                <div className="flex items-center gap-2">
                  {stats?.coverage.EYEMED.percentage === 100 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>EyeMed: All products have tier mappings</span>
                </div>
                <div className="flex items-center gap-2">
                  {stats?.coverage.SPECTERA.percentage === 100 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>Spectera: All products have tier mappings</span>
                </div>
              </div>
              {stats?.coverage.VSP.percentage === 100 &&
               stats?.coverage.EYEMED.percentage === 100 &&
               stats?.coverage.SPECTERA.percentage === 100 ? (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Stage 2 Complete - Ready to proceed to Stage 3</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Stage 2 Incomplete - Tier mappings needed</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'missing' ? (
        <Card>
          <CardHeader>
            <CardTitle>Products Missing Tier Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The new carrier_tiers table is empty. Run the migration script to populate it from existing tier data.
            </p>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm">
              <p className="text-muted-foreground mb-2"># Migration sources:</p>
              <p>- lens_carrier_tiers: {stats?.legacyMappings.lensCarrierTiers || 0} rows</p>
              <p>- products with tier columns: {stats?.legacyMappings.productsWithTierColumns || 0} rows</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Carrier-specific view */
        <div className="space-y-4">
          {Object.entries(groupedData).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No tier mappings found for this carrier.</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedData).map(([type, items]) => (
              <Card key={type}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpanded(type)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {expandedTypes.has(type) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      {type}
                      <Badge variant="secondary">{items.length}</Badge>
                    </CardTitle>
                  </div>
                </CardHeader>
                {expandedTypes.has(type) && (
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3">Product Name</th>
                            <th className="text-left py-2 px-3">Tier Code</th>
                            <th className="text-left py-2 px-3">Tier Label</th>
                            <th className="text-left py-2 px-3">Pricing Rule</th>
                            <th className="text-left py-2 px-3 w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(item => (
                            <tr key={item.id} className="border-b hover:bg-muted/50">
                              <td className="py-2 px-3 font-medium">{item.productName}</td>
                              <td className="py-2 px-3 font-mono">{item.tierCode}</td>
                              <td className="py-2 px-3 text-muted-foreground">{item.tierLabel || '-'}</td>
                              <td className="py-2 px-3">{getPricingRuleBadge(item.pricingRule)}</td>
                              <td className="py-2 px-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(item)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </PageLayout>
  )
}
