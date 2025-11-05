'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Plus, Filter, MoreHorizontal, Phone, Mail, MapPin, Calendar, DollarSign, BarChart, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Customer, CustomerSearchFilters } from '@/types/customer'

interface CustomerListProps {
  onSelectCustomer?: (customer: Customer) => void
  showActions?: boolean
}

export default function CustomerManagement({ onSelectCustomer, showActions = true }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<CustomerSearchFilters>({
    accountStatus: undefined,
    insuranceCarrier: undefined,
    city: undefined,
    state: undefined,
    isHighValue: undefined,
    hasRecentVisit: undefined
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Fetch customers with search and filters
  const fetchCustomers = useCallback(async (currentPage?: number, currentLimit?: number) => {
    setLoading(true)
    try {
      const page = currentPage || pagination.page
      const limit = currentLimit || pagination.limit
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })

      if (searchTerm) params.append('search', searchTerm)
      if (filters.accountStatus) params.append('accountStatus', filters.accountStatus)
      if (filters.insuranceCarrier) params.append('insuranceCarrier', filters.insuranceCarrier)
      if (filters.city) params.append('city', filters.city)
      if (filters.state) params.append('state', filters.state)
      if (filters.isHighValue !== undefined) params.append('isHighValue', filters.isHighValue.toString())
      if (filters.hasRecentVisit !== undefined) params.append('hasRecentVisit', filters.hasRecentVisit.toString())

      const response = await fetch(`/api/customers?${params}`)
      const result = await response.json()

      if (result.success) {
        // API returns customers in data, not data.customers
        setCustomers(result.data || [])
        setPagination(result.pagination || {
          page: page,
          limit: limit,
          total: 0,
          totalPages: 0
        })
      } else {
        console.error('Failed to fetch customers:', result.error)
        // Reset to default state on error
        setCustomers([])
        setPagination(prev => ({
          ...prev,
          total: 0,
          totalPages: 0
        }))
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      // Reset to default state on error
      setCustomers([])
      setPagination(prev => ({
        ...prev,
        total: 0,
        totalPages: 0
      }))
    } finally {
      setLoading(false)
    }
  }, [searchTerm, filters, pagination.page, pagination.limit])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers()
    }, 300)

    return () => clearTimeout(timer)
  }, [fetchCustomers])

  // Filter unique values for dropdowns
  const uniqueInsuranceCarriers = useMemo(() => {
    const carriers = customers.map(c => c.insuranceCarrier).filter(Boolean) as string[]
    return [...new Set(carriers)]
  }, [customers])

  const uniqueCities = useMemo(() => {
    const cities = customers.map(c => c.city).filter(Boolean) as string[]
    return [...new Set(cities)]
  }, [customers])

  const uniqueStates = useMemo(() => {
    const states = customers.map(c => c.state).filter(Boolean) as string[]
    return [...new Set(states)]
  }, [customers])

  const handleCustomerSelect = (customer: Customer) => {
    if (onSelectCustomer) {
      onSelectCustomer(customer)
    } else {
      // Default behavior: Log selection and show in console
      console.log('✅ Customer selected:', customer)
      console.log(`📝 Selected: ${customer.firstName} ${customer.lastName}`)
      if (customer.email) console.log(`📧 Email: ${customer.email}`)
      if (customer.phone) console.log(`📞 Phone: ${customer.phone}`)
      if (customer.insuranceCarrier) console.log(`🏥 Insurance: ${customer.insuranceCarrier}`)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'INACTIVE': return 'secondary'
      case 'SUSPENDED': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">
            Search, view, and manage customer profiles and information
          </p>
        </div>
        {showActions && (
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => window.location.href = '/customers/analytics'} 
              variant="outline"
              className="flex items-center space-x-2"
            >
              <BarChart className="h-4 w-4" />
              <span>Analytics</span>
            </Button>
            <Button 
              onClick={() => window.location.href = '/customers/segmentation'} 
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>Segmentation</span>
            </Button>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Customer
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Customers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, email, phone, or customer number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Select
              value={filters.accountStatus || 'all'}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                accountStatus: (value === 'all' ? undefined : value) as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | undefined
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.insuranceCarrier || 'all'}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                insuranceCarrier: value === 'all' ? undefined : value 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Insurance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Insurance</SelectItem>
                {uniqueInsuranceCarriers.map(carrier => (
                  <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.city || 'all'}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                city: value === 'all' ? undefined : value 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.state || 'all'}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                state: value === 'all' ? undefined : value 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {uniqueStates.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.isHighValue?.toString() || 'all'}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                isHighValue: value === 'all' ? undefined : value === 'true' 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Value Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="true">High Value</SelectItem>
                <SelectItem value="false">Standard</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  accountStatus: undefined,
                  insuranceCarrier: undefined,
                  city: undefined,
                  state: undefined,
                  isHighValue: undefined,
                  hasRecentVisit: undefined
                })
                setSearchTerm('')
              }}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Customers ({pagination?.total || 0} total)
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {pagination ? `Page ${pagination.page} of ${pagination.totalPages}` : 'Loading...'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No customers found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or filters
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer hover:bg-accent"
                  onClick={() => handleCustomerSelect(customer)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Customer Name and Number */}
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">
                          {customer.firstName} {customer.lastName}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {customer.customerNumber}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(customer.accountStatus)}>
                          {customer.accountStatus}
                        </Badge>
                        {customer.isHighValueCustomer && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            High Value
                          </Badge>
                        )}
                      </div>

                      {/* Contact Information */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {customer.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {customer.phone}
                          </div>
                        )}
                        {(customer.city || customer.state) && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {customer.city && customer.state ? `${customer.city}, ${customer.state}` : customer.city || customer.state}
                          </div>
                        )}
                      </div>

                      {/* Customer Metrics */}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Total Spent:</span>
                          <span>{formatCurrency(customer.totalSpent || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Member Since:</span>
                          <span>{formatDate(customer.registrationDate)}</span>
                        </div>
                        {customer.lastVisit && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">Last Visit:</span>
                            <span>{formatDate(customer.lastVisit)}</span>
                          </div>
                        )}
                      </div>

                      {/* Insurance Information */}
                      {customer.insuranceCarrier && (
                        <div className="text-sm">
                          <span className="font-medium">Insurance:</span>
                          <span className="ml-1">{customer.insuranceCarrier}</span>
                          {customer.memberId && (
                            <span className="ml-2 text-muted-foreground">
                              (ID: {customer.memberId})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {showActions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCustomerSelect(customer)}>
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Edit Customer
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            View History
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Create Quote
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} customers
              </div>
              <Button
                variant="outline"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}