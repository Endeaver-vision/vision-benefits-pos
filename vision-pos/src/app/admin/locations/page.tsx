'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import PageLayout from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Search,
  Plus,
  Edit,
  MapPin,
  Users,
  RefreshCw,
  Building,
  Power,
} from 'lucide-react'

interface Location {
  id: string
  name: string
  address: string
  phone: string | null
  timezone: string
  active: boolean
  createdAt: string
  _count: {
    users: number
    productSettings: number
  }
}

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
]

export default function LocationsAdminPage() {
  const { data: session } = useSession()

  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  // Form state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    timezone: 'America/Los_Angeles',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const userRole = session?.user?.role
  const isAdmin = userRole === 'ADMIN'

  // Load locations
  const loadLocations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('limit', '100')

      const response = await fetch(`/api/admin/locations?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
      }
    } catch (err) {
      console.error('Failed to load locations:', err)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    loadLocations()
  }, [loadLocations])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(loadLocations, 300)
    return () => clearTimeout(timer)
  }, [search, loadLocations])

  // Create location
  const handleCreate = async () => {
    setError('')
    setSaving(true)

    try {
      const response = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setShowCreateDialog(false)
        setFormData({
          name: '',
          address: '',
          phone: '',
          timezone: 'America/Los_Angeles',
        })
        loadLocations()
      } else {
        setError(data.error || 'Failed to create location')
      }
    } catch (err) {
      setError('Failed to create location')
    } finally {
      setSaving(false)
    }
  }

  // Edit location
  const openEditDialog = (location: Location) => {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      address: location.address,
      phone: location.phone || '',
      timezone: location.timezone,
    })
    setError('')
    setShowEditDialog(true)
  }

  const handleUpdate = async () => {
    if (!editingLocation) return
    setError('')
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/locations/${editingLocation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setShowEditDialog(false)
        setEditingLocation(null)
        loadLocations()
      } else {
        setError(data.error || 'Failed to update location')
      }
    } catch (err) {
      setError('Failed to update location')
    } finally {
      setSaving(false)
    }
  }

  // Toggle location status
  const handleToggleStatus = async (location: Location) => {
    const action = location.active ? 'deactivate' : 'reactivate'
    if (!confirm(`Are you sure you want to ${action} "${location.name}"?`)) return

    try {
      if (location.active) {
        // Deactivate
        const response = await fetch(`/api/admin/locations/${location.id}`, {
          method: 'DELETE',
        })
        const data = await response.json()
        if (!response.ok) {
          alert(data.error || `Failed to ${action} location`)
          return
        }
      } else {
        // Reactivate
        const response = await fetch(`/api/admin/locations/${location.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: true }),
        })
        if (!response.ok) {
          alert(`Failed to ${action} location`)
          return
        }
      }
      loadLocations()
    } catch (err) {
      console.error(`Failed to ${action} location:`, err)
    }
  }

  return (
    <PageLayout
      title="Location Management"
      subtitle="Manage store locations"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
              <Input
                placeholder="Search locations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={loadLocations}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isAdmin && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Location</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  )}
                  <div>
                    <Label>Location Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Downtown Office"
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main St, City, State ZIP"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label>Timezone</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(v) => setFormData({ ...formData, timezone: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {US_TIMEZONES.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={saving}>
                    {saving ? 'Creating...' : 'Create Location'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full p-8 text-center text-white/70">Loading...</div>
          ) : locations.length === 0 ? (
            <div className="col-span-full p-8 text-center text-white/70">No locations found</div>
          ) : (
            locations.map((location) => (
              <Card
                key={location.id}
                className={!location.active ? 'opacity-60' : ''}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">{location.name}</CardTitle>
                    </div>
                    {!location.active && (
                      <Badge variant="outline" className="text-red-600">Inactive</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm text-white/80">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{location.address}</span>
                    </div>

                    {location.phone && (
                      <div className="text-sm text-white/80">
                        {location.phone}
                      </div>
                    )}

                    <div className="text-xs text-white/60">
                      {US_TIMEZONES.find(tz => tz.value === location.timezone)?.label || location.timezone}
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-1 text-sm text-white/80">
                        <Users className="h-4 w-4 text-white/60" />
                        <span>{location._count.users} users</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <span>{location._count.productSettings} custom settings</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(location)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={location.active ? 'text-red-600' : 'text-green-600'}
                          onClick={() => handleToggleStatus(location)}
                        >
                          <Power className="h-4 w-4 mr-1" />
                          {location.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
              <div>
                <Label>Location Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(v) => setFormData({ ...formData, timezone: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {US_TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  )
}
