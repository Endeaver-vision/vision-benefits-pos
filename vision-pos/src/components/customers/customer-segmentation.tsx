'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, Filter, TrendingUp, AlertTriangle, Clock } from 'lucide-react'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  insuranceCarrier: string | null
  createdAt: string
  updatedAt: string
  segment?: 'high-value' | 'frequent' | 'at-risk' | 'dormant' | 'new' | 'standard'
  totalSpent?: number
  lastVisit?: string
  riskScore?: number
}

interface SegmentationFilters {
  segment: string
  minSpent: string
  maxSpent: string
  daysSinceLastVisit: string
  insuranceCarrier: string
}

export default function CustomerSegmentation() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<SegmentationFilters>({
    segment: 'all',
    minSpent: '',
    maxSpent: '',
    daysSinceLastVisit: '',
    insuranceCarrier: 'all'
  })

  // Mock segmentation logic - in real app, this would come from the API
  const segmentCustomer = (customer: Customer): Customer => {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(customer.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    const daysSinceCreation = Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    
    // Mock total spent based on customer data
    const mockTotalSpent = Math.random() * 2000
    
    let segment: Customer['segment'] = 'standard'
    
    if (daysSinceCreation <= 30) {
      segment = 'new'
    } else if (mockTotalSpent > 1000) {
      segment = 'high-value'
    } else if (daysSinceUpdate <= 14) {
      segment = 'frequent'
    } else if (daysSinceUpdate > 90) {
      segment = 'dormant'
    } else if (daysSinceUpdate > 60) {
      segment = 'at-risk'
    }

    return {
      ...customer,
      segment,
      totalSpent: mockTotalSpent,
      lastVisit: customer.updatedAt,
      riskScore: daysSinceUpdate > 60 ? Math.min(daysSinceUpdate / 10, 10) : 0
    }
  }

  const fetchCustomers = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/customers?limit=100')
      const data = await response.json()
      
      if (data.success) {
        const segmentedCustomers = data.data.customers.map(segmentCustomer)
        setCustomers(segmentedCustomers)
        setFilteredCustomers(segmentedCustomers)
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    let filtered = customers

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm)
      )
    }

    // Segment filter
    if (filters.segment !== 'all') {
      filtered = filtered.filter(customer => customer.segment === filters.segment)
    }

    // Spending filters
    if (filters.minSpent) {
      const minSpent = parseFloat(filters.minSpent)
      filtered = filtered.filter(customer => (customer.totalSpent || 0) >= minSpent)
    }

    if (filters.maxSpent) {
      const maxSpent = parseFloat(filters.maxSpent)
      filtered = filtered.filter(customer => (customer.totalSpent || 0) <= maxSpent)
    }

    // Days since last visit
    if (filters.daysSinceLastVisit) {
      const days = parseInt(filters.daysSinceLastVisit)
      filtered = filtered.filter(customer => {
        const daysSince = Math.floor((Date.now() - new Date(customer.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
        return daysSince >= days
      })
    }

    // Insurance filter
    if (filters.insuranceCarrier !== 'all') {
      filtered = filtered.filter(customer => customer.insuranceCarrier === filters.insuranceCarrier)
    }

    setFilteredCustomers(filtered)
  }, [customers, searchTerm, filters])

  const getSegmentBadge = (segment: Customer['segment']) => {
    const segmentConfig = {
      'high-value': { label: 'High Value', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      'frequent': { label: 'Frequent', variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' },
      'at-risk': { label: 'At Risk', variant: 'destructive' as const, color: 'bg-yellow-100 text-yellow-800' },
      'dormant': { label: 'Dormant', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
      'new': { label: 'New', variant: 'outline' as const, color: 'bg-purple-100 text-purple-800' },
      'standard': { label: 'Standard', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' }
    }

    const config = segmentConfig[segment || 'standard']
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const getSegmentIcon = (segment: Customer['segment']) => {
    switch (segment) {
      case 'high-value':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'at-risk':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'dormant':
        return <Clock className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const segmentCounts = customers.reduce((acc, customer) => {
    const segment = customer.segment || 'standard'
    acc[segment] = (acc[segment] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const uniqueInsuranceCarriers = [...new Set(customers.map(c => c.insuranceCarrier).filter(Boolean))]

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customer Segmentation</h1>
          <p className="text-gray-600">Intelligent customer categorization and lifecycle tracking</p>
        </div>
        <Button onClick={fetchCustomers} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Segment Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{segmentCounts['high-value'] || 0}</div>
              <div className="text-sm text-gray-600">High Value</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{segmentCounts['frequent'] || 0}</div>
              <div className="text-sm text-gray-600">Frequent</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{segmentCounts['new'] || 0}</div>
              <div className="text-sm text-gray-600">New</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{segmentCounts['standard'] || 0}</div>
              <div className="text-sm text-gray-600">Standard</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{segmentCounts['at-risk'] || 0}</div>
              <div className="text-sm text-gray-600">At Risk</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{segmentCounts['dormant'] || 0}</div>
              <div className="text-sm text-gray-600">Dormant</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.segment} onValueChange={(value) => setFilters(prev => ({ ...prev, segment: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="high-value">High Value</SelectItem>
                <SelectItem value="frequent">Frequent</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="at-risk">At Risk</SelectItem>
                <SelectItem value="dormant">Dormant</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Min spent ($)"
              type="number"
              value={filters.minSpent}
              onChange={(e) => setFilters(prev => ({ ...prev, minSpent: e.target.value }))}
            />

            <Input
              placeholder="Max spent ($)"
              type="number"
              value={filters.maxSpent}
              onChange={(e) => setFilters(prev => ({ ...prev, maxSpent: e.target.value }))}
            />

            <Input
              placeholder="Days since last visit"
              type="number"
              value={filters.daysSinceLastVisit}
              onChange={(e) => setFilters(prev => ({ ...prev, daysSinceLastVisit: e.target.value }))}
            />

            <Select value={filters.insuranceCarrier} onValueChange={(value) => setFilters(prev => ({ ...prev, insuranceCarrier: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All insurance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Insurance</SelectItem>
                {uniqueInsuranceCarriers.map(carrier => (
                  <SelectItem key={carrier} value={carrier!}>{carrier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>Segmented Customers ({filteredCustomers.length})</CardTitle>
          <CardDescription>
            Customers categorized by value, engagement, and risk level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback>
                      {customer.firstName[0]}{customer.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{customer.firstName} {customer.lastName}</span>
                      {getSegmentIcon(customer.segment)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {customer.email} • {customer.phone}
                    </div>
                    <div className="text-xs text-gray-500">
                      {customer.city}, {customer.state} • {customer.insuranceCarrier || 'No insurance'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(customer.totalSpent || 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Last visit: {formatDate(customer.lastVisit || customer.updatedAt)}
                    </div>
                    {customer.riskScore && customer.riskScore > 5 && (
                      <div className="text-xs text-red-600">
                        Risk score: {customer.riskScore.toFixed(1)}
                      </div>
                    )}
                  </div>
                  {getSegmentBadge(customer.segment)}
                </div>
              </div>
            ))}

            {filteredCustomers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No customers found matching the current filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}