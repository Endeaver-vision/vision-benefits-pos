'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Users, Eye } from 'lucide-react'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  insuranceCarrier?: string
  memberId?: string
  _count?: {
    transactions: number
  }
}

export default function CustomersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
    }
  }, [session, status, router])

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('limit', '50')

      const response = await fetch(`/api/customers?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    if (session) {
      fetchCustomers()
    }
  }, [session, fetchCustomers])

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Search and manage customer information</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Customers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name, email, phone, or member ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={fetchCustomers} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Customer Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add New Customer</CardTitle>
            <CardDescription>Enter customer information below</CardDescription>
          </CardHeader>
          <CardContent>
            <AddCustomerForm 
              onSuccess={() => {
                setShowAddForm(false)
                fetchCustomers()
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customers ({customers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Searching customers...</div>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No customers found</div>
              {search && (
                <p className="text-sm text-gray-400 mt-2">
                  Try adjusting your search terms
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-medium">
                          {customer.firstName} {customer.lastName}
                        </h3>
                        <div className="text-sm text-gray-500 space-y-1">
                          {customer.email && <div>📧 {customer.email}</div>}
                          {customer.phone && <div>📞 {customer.phone}</div>}
                          {customer.memberId && (
                            <div>🆔 {customer.memberId}</div>
                          )}
                        </div>
                      </div>
                      {customer.insuranceCarrier && (
                        <Badge variant="outline">
                          {customer.insuranceCarrier}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {customer._count && (
                      <Badge variant="secondary">
                        {customer._count.transactions} transactions
                      </Badge>
                    )}
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Simple Add Customer Form Component
function AddCustomerForm({ 
  onSuccess, 
  onCancel 
}: { 
  onSuccess: () => void
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    insuranceCarrier: '',
    memberId: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create customer')
      }
    } catch (error) {
      console.error('Create customer error:', error)
      alert('Failed to create customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="insuranceCarrier">Insurance Carrier</Label>
          <Select
            value={formData.insuranceCarrier}
            onValueChange={(value) => setFormData(prev => ({ ...prev, insuranceCarrier: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select carrier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VSP">VSP</SelectItem>
              <SelectItem value="EyeMed">EyeMed</SelectItem>
              <SelectItem value="Spectera">Spectera</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="memberId">Member ID</Label>
          <Input
            id="memberId"
            value={formData.memberId}
            onChange={(e) => setFormData(prev => ({ ...prev, memberId: e.target.value }))}
          />
        </div>
      </div>
      
      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Customer'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}