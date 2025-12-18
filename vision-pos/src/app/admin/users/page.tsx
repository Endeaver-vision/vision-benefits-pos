'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Stethoscope,
  UserCog,
} from 'lucide-react'

interface Location {
  id: string
  name: string
  shortName?: string
}

interface Employee {
  id: string
  externalId: string | null
  firstName: string
  lastName: string
  username: string
  email: string | null
  phone: string | null
  roles: string[]
  active: boolean
  primaryLocationId: string | null
  primaryLocation: Location | null
  locations: { location: Location; isPrimary: boolean }[]
  createdAt: string
}

const ROLE_OPTIONS = [
  { value: 'system_admin', label: 'Super Admin' },
  { value: 'office_admin', label: 'Admin' },
  { value: 'optometrist', label: 'Doctor' },
  { value: 'optician', label: 'Team Member' },
]

export default function EmployeesAdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [locationFilter, setLocationFilter] = useState('all')

  // Form state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    roles: ['optician'],
    primaryLocationId: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load locations
  useEffect(() => {
    async function loadLocations() {
      try {
        const response = await fetch('/api/admin/locations?status=active')
        if (response.ok) {
          const data = await response.json()
          setLocations(data.locations || [])
          if (data.locations?.length > 0 && !formData.primaryLocationId) {
            setFormData(prev => ({
              ...prev,
              primaryLocationId: data.locations[0].id
            }))
          }
        }
      } catch (err) {
        console.error('Failed to load locations:', err)
      }
    }
    loadLocations()
  }, [])

  // Load employees
  const loadEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (locationFilter !== 'all') params.append('locationId', locationFilter)
      params.append('limit', '100')

      const response = await fetch(`/api/admin/employees?${params}`)
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
      }
    } catch (err) {
      console.error('Failed to load employees:', err)
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter, locationFilter])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(loadEmployees, 300)
    return () => clearTimeout(timer)
  }, [search, loadEmployees])

  // Create employee
  const handleCreate = async () => {
    setError('')
    setSaving(true)

    try {
      const response = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setShowCreateDialog(false)
        setFormData({
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          phone: '',
          roles: ['optician'],
          primaryLocationId: locations[0]?.id || '',
        })
        loadEmployees()
      } else {
        setError(data.error || 'Failed to create employee')
      }
    } catch (err) {
      setError('Failed to create employee')
    } finally {
      setSaving(false)
    }
  }

  // Edit employee
  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      username: employee.username,
      email: employee.email || '',
      phone: employee.phone || '',
      roles: employee.roles,
      primaryLocationId: employee.primaryLocationId || '',
    })
    setError('')
    setShowEditDialog(true)
  }

  const handleUpdate = async () => {
    if (!editingEmployee) return
    setError('')
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/employees/${editingEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setShowEditDialog(false)
        setEditingEmployee(null)
        loadEmployees()
      } else {
        setError(data.error || 'Failed to update employee')
      }
    } catch (err) {
      setError('Failed to update employee')
    } finally {
      setSaving(false)
    }
  }

  // Deactivate employee
  const handleDeactivate = async (employeeId: string) => {
    if (!confirm('Are you sure you want to deactivate this employee?')) return

    try {
      const response = await fetch(`/api/admin/employees/${employeeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadEmployees()
      }
    } catch (err) {
      console.error('Failed to deactivate employee:', err)
    }
  }

  // Reactivate employee
  const handleReactivate = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/admin/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      })

      if (response.ok) {
        loadEmployees()
      }
    } catch (err) {
      console.error('Failed to reactivate employee:', err)
    }
  }

  const getRoleBadge = (roles: string[]) => {
    if (roles.includes('system_admin')) {
      return { label: 'Super Admin', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Shield }
    }
    if (roles.includes('office_admin')) {
      return { label: 'Admin', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: UserCog }
    }
    if (roles.includes('optometrist') || roles.includes('ophthalmologist')) {
      return { label: 'Doctor', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Stethoscope }
    }
    return { label: 'Team Member', color: 'bg-white/10 text-white/80 border-white/20', icon: Users }
  }

  const getPrimaryRole = (roles: string[]) => {
    if (roles.includes('system_admin')) return 'system_admin'
    if (roles.includes('office_admin')) return 'office_admin'
    if (roles.includes('optometrist') || roles.includes('ophthalmologist')) return 'optometrist'
    return 'optician'
  }

  return (
    <PageLayout
      title="Team Management"
      subtitle="Manage employees and team members"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
              <Input
                placeholder="Search employees..."
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
                <SelectItem value="system_admin">Super Admin</SelectItem>
                <SelectItem value="office_admin">Admin</SelectItem>
                <SelectItem value="optometrist">Doctor</SelectItem>
                <SelectItem value="optician">Team Member</SelectItem>
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

            <Button variant="outline" size="icon" onClick={loadEmployees}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
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
                  <Label>Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email (optional)</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone (optional)</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Role</Label>
                    <Select
                      value={getPrimaryRole(formData.roles)}
                      onValueChange={(v) => setFormData({ ...formData, roles: [v] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(role => (
                          <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Select
                      value={formData.primaryLocationId}
                      onValueChange={(v) => setFormData({ ...formData, primaryLocationId: v })}
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
                  {saving ? 'Creating...' : 'Add Employee'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team ({employees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-white/20 rounded-lg">
              <div className="grid grid-cols-12 gap-4 p-3 bg-white/10 border-b border-white/20 text-sm font-medium text-white/80">
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Username</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-1">Phone</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-white/70">Loading...</div>
                ) : employees.length === 0 ? (
                  <div className="p-8 text-center text-white/70">No employees found</div>
                ) : (
                  employees.map((employee) => {
                    const roleBadge = getRoleBadge(employee.roles)
                    const RoleIcon = roleBadge.icon
                    return (
                      <div
                        key={employee.id}
                        className={`grid grid-cols-12 gap-4 p-3 border-b border-white/10 items-center hover:bg-white/5 ${
                          !employee.active ? 'bg-white/5 opacity-60' : ''
                        }`}
                      >
                        <div className="col-span-3">
                          <div className="font-medium text-white">
                            {employee.firstName} {employee.lastName}
                          </div>
                          {!employee.active && (
                            <Badge variant="outline" className="text-xs text-red-400 border-red-400/50">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="col-span-2 text-sm text-white/80">
                          {employee.username}
                        </div>
                        <div className="col-span-2">
                          <Badge className={`${roleBadge.color} border`}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {roleBadge.label}
                          </Badge>
                        </div>
                        <div className="col-span-2 text-sm">
                          {employee.primaryLocation?.name || '-'}
                        </div>
                        <div className="col-span-1 text-sm text-white/60">
                          {employee.phone || '-'}
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {employee.active ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDeactivate(employee.id)}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                              onClick={() => handleReactivate(employee.id)}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
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
                <Label>Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select
                    value={getPrimaryRole(formData.roles)}
                    onValueChange={(v) => setFormData({ ...formData, roles: [v] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(role => (
                        <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Select
                    value={formData.primaryLocationId}
                    onValueChange={(v) => setFormData({ ...formData, primaryLocationId: v })}
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
