'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, User, Loader2 } from 'lucide-react'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  insuranceCarrier?: string
}

interface CustomerSelectorProps {
  onSelect: (customer: Customer) => void
}

export function CustomerSelector({ onSelect }: CustomerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomers = useCallback(async (search?: string) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('limit', '10')

      const response = await fetch(`/api/customers?${params}`)
      const data = await response.json()

      if (data.success) {
        setCustomers(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch customers')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load initial customers
  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2 || searchTerm.length === 0) {
        fetchCustomers(searchTerm)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, fetchCustomers])

  const getCarrierVariant = (carrier?: string) => {
    if (!carrier) return 'secondary'
    const c = carrier.toLowerCase()
    if (c.includes('vsp')) return 'blue'
    if (c.includes('eyemed')) return 'purple'
    if (c.includes('spectera')) return 'teal'
    return 'secondary'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Select Customer
        </CardTitle>
        <CardDescription>
          Choose the customer to associate with this document
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or member ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Customer List */}
        {!loading && customers.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {customers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onSelect(customer)}
                className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {customer.firstName} {customer.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {customer.email || customer.phone || 'No contact info'}
                      </div>
                    </div>
                  </div>
                  {customer.insuranceCarrier && (
                    <Badge variant={getCarrierVariant(customer.insuranceCarrier)} size="sm">
                      {customer.insuranceCarrier}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && customers.length === 0 && (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchTerm
                ? `No customers found matching "${searchTerm}"`
                : 'No customers found'}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.location.href = '/customers/new'}
            >
              Create New Customer
            </Button>
          </div>
        )}

        {/* Quick Create Link */}
        {!loading && customers.length > 0 && (
          <div className="text-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/customers/new'}
            >
              + Create New Customer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
