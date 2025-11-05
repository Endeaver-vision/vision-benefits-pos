'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, User, CheckCircle } from 'lucide-react'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  insuranceCarrier?: string
  memberId?: string
}

export default function CustomerSelectionTest() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch customers
  const fetchCustomers = async (search?: string) => {
    setLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('limit', '10')
      
      console.log('Fetching customers with URL:', `/api/customers?${params}`)
      
      const response = await fetch(`/api/customers?${params}`)
      console.log('Response status:', response.status)
      
      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success) {
        setCustomers(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch customers')
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Network error while fetching customers')
    } finally {
      setLoading(false)
    }
  }

  // Load customers on mount
  useEffect(() => {
    fetchCustomers()
  }, [])

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    if (value.length > 2 || value.length === 0) {
      fetchCustomers(value)
    }
  }

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    console.log('Customer selected:', customer)
    setSelectedCustomer(customer)
    
    // Show success feedback
    const button = document.getElementById(`customer-${customer.id}`)
    if (button) {
      button.style.backgroundColor = '#22c55e'
      button.style.color = 'white'
      setTimeout(() => {
        button.style.backgroundColor = ''
        button.style.color = ''
      }, 1000)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Selection Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Customer Display */}
          {selectedCustomer && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Selected Customer</h3>
              </div>
              <div className="text-sm">
                <div><strong>Name:</strong> {selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                <div><strong>ID:</strong> {selectedCustomer.id}</div>
                {selectedCustomer.email && <div><strong>Email:</strong> {selectedCustomer.email}</div>}
                {selectedCustomer.phone && <div><strong>Phone:</strong> {selectedCustomer.phone}</div>}
                {selectedCustomer.insuranceCarrier && (
                  <div><strong>Insurance:</strong> {selectedCustomer.insuranceCarrier}</div>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => setSelectedCustomer(null)}
              >
                Clear Selection
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search customers (try 'Hermione' or 'Stark')..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-4 text-gray-500">
              Loading customers...
            </div>
          )}

          {/* Customer List */}
          <div className="space-y-2">
            <h4 className="font-medium">Available Customers ({customers.length})</h4>
            {customers.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No customers found. Try searching for "Hermione" or "Stark".
              </div>
            )}
            
            {customers.map((customer) => (
              <div
                key={customer.id}
                id={`customer-${customer.id}`}
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleCustomerSelect(customer)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = ''
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      {customer.firstName} {customer.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {customer.email && <span>📧 {customer.email}</span>}
                      {customer.phone && <span className="ml-2">📞 {customer.phone}</span>}
                    </div>
                    {customer.insuranceCarrier && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {customer.insuranceCarrier}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    ID: {customer.id.slice(-8)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Debug Info */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-600">Debug Information</summary>
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
              <div><strong>Search Term:</strong> "{searchTerm}"</div>
              <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
              <div><strong>Error:</strong> {error || 'None'}</div>
              <div><strong>Customers Found:</strong> {customers.length}</div>
              <div><strong>Selected Customer:</strong> {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'None'}</div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}