'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PageLayout from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Glasses,
  Contact,
  Stethoscope,
  Package,
  ChevronUp,
  ChevronDown,
  Save,
  RefreshCw,
  MapPin,
  RotateCcw,
} from 'lucide-react'

interface ProductItem {
  id: string
  name?: string
  brand?: string
  model?: string
  lensName?: string
  category?: string
  retailPrice: number
  manufacturer?: string
  showInPos: boolean
  isFeatured: boolean
  posDisplayOrder: number
  hasLocationOverride?: boolean
}

interface Stats {
  total: { frames: number; lenses: number; contacts: number; services: number }
  hidden: { frames: number; lenses: number; contacts: number; services: number }
  featured: { frames: number; lenses: number; contacts: number; services: number }
}

interface Location {
  id: string
  name: string
}

export default function POSAdminPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState('services')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [frames, setFrames] = useState<ProductItem[]>([])
  const [lenses, setLenses] = useState<ProductItem[]>([])
  const [contacts, setContacts] = useState<ProductItem[]>([])
  const [services, setServices] = useState<ProductItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)

  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')

  const [pendingChanges, setPendingChanges] = useState<Map<string, Record<string, unknown>>>(new Map())

  const userRole = session?.user?.role
  const userLocationId = session?.user?.locationId
  const isAdmin = userRole === 'ADMIN'

  // Load locations for admin users
  useEffect(() => {
    async function loadLocations() {
      if (!isAdmin) {
        // Non-admin users just use their own location
        setSelectedLocationId(userLocationId || '')
        return
      }

      try {
        const response = await fetch('/api/admin/locations?status=active')
        if (response.ok) {
          const data = await response.json()
          setLocations(data.locations || [])
          // Default to user's location
          if (userLocationId) {
            setSelectedLocationId(userLocationId)
          } else if (data.locations?.length > 0) {
            setSelectedLocationId(data.locations[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to load locations:', err)
      }
    }
    loadLocations()
  }, [isAdmin, userLocationId])

  // Load products
  const loadProducts = useCallback(async () => {
    if (!selectedLocationId) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('type', activeTab)
      params.append('locationId', selectedLocationId)
      if (search) params.append('search', search)
      params.append('limit', '200')

      const response = await fetch(`/api/pos/admin?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFrames(data.frames || [])
        setLenses(data.lenses || [])
        setContacts(data.contacts || [])
        setServices(data.services || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, search, selectedLocationId])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, loadProducts])

  // Update a product's visibility
  const updateProduct = (type: string, id: string, field: string, value: unknown) => {
    const key = `${type}:${id}`
    const existing = pendingChanges.get(key) || { type, id }
    existing[field] = value
    setPendingChanges(new Map(pendingChanges.set(key, existing)))

    // Update local state immediately
    const updateList = (list: ProductItem[]) =>
      list.map(item => item.id === id ? { ...item, [field]: value, hasLocationOverride: true } : item)

    switch (type) {
      case 'frames':
        setFrames(updateList(frames))
        break
      case 'lenses':
        setLenses(updateList(lenses))
        break
      case 'contacts':
        setContacts(updateList(contacts))
        break
      case 'services':
        setServices(updateList(services))
        break
    }
  }

  // Save all pending changes
  const saveChanges = async () => {
    if (pendingChanges.size === 0 || !selectedLocationId) return

    setSaving(true)
    try {
      const updates = Array.from(pendingChanges.values())
      const response = await fetch('/api/pos/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates,
          locationId: selectedLocationId
        })
      })

      if (response.ok) {
        setPendingChanges(new Map())
        loadProducts() // Refresh
      }
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  // Get display name for an item
  const getDisplayName = (item: ProductItem) => {
    if (item.brand && item.model) return `${item.brand} ${item.model}`
    if (item.lensName) return item.lensName
    return item.name || 'Unknown'
  }

  // Get current list based on active tab
  const getCurrentList = () => {
    switch (activeTab) {
      case 'frames': return frames
      case 'lenses': return lenses
      case 'contacts': return contacts
      case 'services': return services
      default: return []
    }
  }

  const selectedLocationName = isAdmin
    ? locations.find(l => l.id === selectedLocationId)?.name
    : session?.user?.locationName

  return (
    <PageLayout
      title="POS Product Manager"
      subtitle={selectedLocationName ? `Managing products for ${selectedLocationName}` : 'Control which products appear in POS'}
      actions={
        <div className="flex items-center gap-3">
          {pendingChanges.size > 0 && (
            <Badge variant="outline" className="text-orange-600">
              {pendingChanges.size} unsaved changes
            </Badge>
          )}
          <Button
            onClick={saveChanges}
            disabled={pendingChanges.size === 0 || saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Location Selector (Admin only) */}
        {isAdmin && locations.length > 1 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg flex items-center gap-4">
            <MapPin className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium">Select Location</p>
              <p className="text-xs text-blue-600">Product visibility settings are specific to each location</p>
            </div>
            <Select value={selectedLocationId} onValueChange={(v) => {
              setSelectedLocationId(v)
              setPendingChanges(new Map()) // Clear pending changes when switching
            }}>
              <SelectTrigger className="w-48 bg-white">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.total.services}</div>
                    <div className="text-xs text-white/60">
                      {stats.hidden.services} hidden · {stats.featured.services} featured
                    </div>
                  </div>
                </div>
                <div className="text-sm text-white/70 mt-1">Services</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Glasses className="h-5 w-5 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.total.frames}</div>
                    <div className="text-xs text-white/60">
                      {stats.hidden.frames} hidden · {stats.featured.frames} featured
                    </div>
                  </div>
                </div>
                <div className="text-sm text-white/70 mt-1">Frames</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.total.lenses}</div>
                    <div className="text-xs text-white/60">
                      {stats.hidden.lenses} hidden · {stats.featured.lenses} featured
                    </div>
                  </div>
                </div>
                <div className="text-sm text-white/70 mt-1">Lenses</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Contact className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.total.contacts}</div>
                    <div className="text-xs text-white/60">
                      {stats.hidden.contacts} hidden · {stats.featured.contacts} featured
                    </div>
                  </div>
                </div>
                <div className="text-sm text-white/70 mt-1">Contacts</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="services">
                    <Stethoscope className="h-4 w-4 mr-1" />
                    Exams
                  </TabsTrigger>
                  <TabsTrigger value="frames">
                    <Glasses className="h-4 w-4 mr-1" />
                    Frames
                  </TabsTrigger>
                  <TabsTrigger value="lenses">
                    <Package className="h-4 w-4 mr-1" />
                    Lenses
                  </TabsTrigger>
                  <TabsTrigger value="contacts">
                    <Contact className="h-4 w-4 mr-1" />
                    Contacts
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={loadProducts}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Table Header */}
              <div className="border rounded-lg">
                <div className="grid grid-cols-12 gap-4 p-3 bg-white/10 border-b border-white/20 text-sm font-medium text-white/80">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2 text-center">Category</div>
                  <div className="col-span-1 text-right">Price</div>
                  <div className="col-span-1 text-center">Visible</div>
                  <div className="col-span-1 text-center">Featured</div>
                  <div className="col-span-2 text-center">Order</div>
                </div>

                {/* Product List */}
                <div className="max-h-[500px] overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center text-white/70">Loading...</div>
                  ) : getCurrentList().length === 0 ? (
                    <div className="p-8 text-center text-white/70">No products found</div>
                  ) : (
                    getCurrentList().map((item) => (
                      <div
                        key={item.id}
                        className={`grid grid-cols-12 gap-4 p-3 border-b items-center hover:bg-gray-50 ${
                          !item.showInPos ? 'bg-gray-100 opacity-60' : ''
                        } ${item.isFeatured ? 'bg-yellow-50' : ''}`}
                      >
                        {/* Product Name */}
                        <div className="col-span-5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{getDisplayName(item)}</span>
                            {item.hasLocationOverride && (
                              <Badge variant="outline" className="text-xs text-blue-600">
                                Custom
                              </Badge>
                            )}
                          </div>
                          {item.manufacturer && (
                            <div className="text-xs text-white/60">{item.manufacturer}</div>
                          )}
                        </div>

                        {/* Category */}
                        <div className="col-span-2 text-center">
                          <Badge variant="outline" className="text-xs">
                            {item.category || activeTab}
                          </Badge>
                        </div>

                        {/* Price */}
                        <div className="col-span-1 text-right text-sm">
                          ${item.retailPrice.toFixed(2)}
                        </div>

                        {/* Visible Toggle */}
                        <div className="col-span-1 flex justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateProduct(activeTab, item.id, 'showInPos', !item.showInPos)}
                            className={item.showInPos ? 'text-green-600' : 'text-white/50'}
                          >
                            {item.showInPos ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                        </div>

                        {/* Featured Toggle */}
                        <div className="col-span-1 flex justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateProduct(activeTab, item.id, 'isFeatured', !item.isFeatured)}
                            className={item.isFeatured ? 'text-yellow-500' : 'text-white/50'}
                          >
                            {item.isFeatured ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                          </Button>
                        </div>

                        {/* Order Controls */}
                        <div className="col-span-2 flex justify-center items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => updateProduct(activeTab, item.id, 'posDisplayOrder', Math.max(1, item.posDisplayOrder - 1))}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-8 text-center">{item.posDisplayOrder}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => updateProduct(activeTab, item.id, 'posDisplayOrder', item.posDisplayOrder + 1)}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 mt-4 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-600" />
                  <span>Visible in POS</span>
                </div>
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-white/50" />
                  <span>Hidden from POS</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span>Featured (shown first)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-blue-600">Custom</Badge>
                  <span>Location-specific override</span>
                </div>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
