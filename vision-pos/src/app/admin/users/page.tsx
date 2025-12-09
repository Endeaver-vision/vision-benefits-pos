'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  UserX,
  Users,
  Shield,
  RefreshCw,
} from 'lucide-react'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  active: boolean
  locationId: string
  location: {
    id: string
    name: string
  }
  createdAt: string
}

interface Location {
  id: string
  name: string
}

export default function UsersAdminPage() {
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [locationFilter, setLocationFilter] = useState('all')

  // Form state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'SALES_ASSOCIATE',
    locationId: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Auth disabled - default to admin for now
  const userLocationId = null as string | null
  const isAdmin = true
  const currentUserId = null as string | null // No session, no current user ID

  // Load locations
  useEffect(() => {
    async function loadLocations() {
      try {
        const response = await fetch('/api/admin/locations?status=active')
        if (response.ok) {
          const data = await response.json()
          setLocations(data.locations || [])
          // Set default location for form
          if (data.locations?.length > 0 && !formData.locationId) {
            setFormData(prev => ({
              ...prev,
              locationId: userLocationId || data.locations[0].id
            }))
          }
        }
      } catch (err) {
        console.error('Failed to load locations:', err)
      }
    }
    loadLocations()
  }, [userLocationId])

  // Load users
  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (locationFilter !== 'all') params.append('locationId', locationFilter)
      params.append('limit', '100')

      const response = await fetch(`/api/admin/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter, locationFilter])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(loadUsers, 300)
    return () => clearTimeout(timer)
  }, [search, loadUsers])

  // Create user
  const handleCreate = async () => {
    setError('')
    setSaving(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setShowCreateDialog(false)
        setFormData({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          role: 'SALES_ASSOCIATE',
          locationId: userLocationId || locations[0]?.id || '',
        })
        loadUsers()
      } else {
        setError(data.error || 'Failed to create user')
      }
    } catch (err) {
      setError('Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  // Edit user
  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      locationId: user.locationId,
    })
    setError('')
    setShowEditDialog(true)
  }

  const handleUpdate = async () => {
    if (!editingUser) return
    setError('')
    setSaving(true)

    try {
      const updateData: Record<string, string> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        locationId: formData.locationId,
      }
      if (formData.password) {
        updateData.password = formData.password
      }

      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (response.ok) {
        setShowEditDialog(false)
        setEditingUser(null)
        loadUsers()
      } else {
        setError(data.error || 'Failed to update user')
      }
    } catch (err) {
      setError('Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  // Deactivate user
  const handleDeactivate = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadUsers()
      }
    } catch (err) {
      console.error('Failed to deactivate user:', err)
    }
  }

  // Reactivate user
  const handleReactivate = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      })

      if (response.ok) {
        loadUsers()
      }
    } catch (err) {
      console.error('Failed to reactivate user:', err)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800'
      case 'MANAGER': return 'bg-blue-100 text-blue-800'
      default: return 'bg-white/10 text-white'
    }
  }

  return (
    <PageLayout
      title="User Management"
      subtitle="Manage system users and permissions"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="SALES_ASSOCIATE">Sales</SelectItem>
              </SelectContent>
            </Select>

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

            {isAdmin && (
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="outline" size="icon" onClick={loadUsers}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(v) => setFormData({ ...formData, role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isAdmin && <SelectItem value="ADMIN">Admin</SelectItem>}
                        {isAdmin && <SelectItem value="MANAGER">Manager</SelectItem>}
                        <SelectItem value="SALES_ASSOCIATE">Sales Associate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Select
                      value={formData.locationId}
                      onValueChange={(v) => setFormData({ ...formData, locationId: v })}
                      disabled={!isAdmin}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-white/20 rounded-lg">
              <div className="grid grid-cols-12 gap-4 p-3 bg-white/10 border-b border-white/20 text-sm font-medium text-white/80">
                <div className="col-span-3">Name</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-white/70">Loading...</div>
                ) : users.length === 0 ? (
                  <div className="p-8 text-center text-white/70">No users found</div>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className={`grid grid-cols-12 gap-4 p-3 border-b border-white/10 items-center hover:bg-white/5 ${
                        !user.active ? 'bg-white/5 opacity-60' : ''
                      }`}
                    >
                      <div className="col-span-3">
                        <div className="font-medium text-white">
                          {user.firstName} {user.lastName}
                        </div>
                        {!user.active && (
                          <Badge variant="outline" className="text-xs text-red-400 border-red-400/50">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="col-span-3 text-sm text-white/80">
                        {user.email}
                      </div>
                      <div className="col-span-2">
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </div>
                      <div className="col-span-2 text-sm">
                        {user.location?.name}
                      </div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleDeactivate(user.id)}
                            disabled={user.id === currentUserId}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600"
                            onClick={() => handleReactivate(user.id)}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>New Password (leave blank to keep current)</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v) => setFormData({ ...formData, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isAdmin && <SelectItem value="ADMIN">Admin</SelectItem>}
                      {isAdmin && <SelectItem value="MANAGER">Manager</SelectItem>}
                      <SelectItem value="SALES_ASSOCIATE">Sales Associate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Select
                    value={formData.locationId}
                    onValueChange={(v) => setFormData({ ...formData, locationId: v })}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
