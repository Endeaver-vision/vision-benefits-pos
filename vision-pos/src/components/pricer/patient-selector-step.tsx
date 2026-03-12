'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, User, Loader2, X, CheckCircle } from 'lucide-react'

export interface SelectedPatient {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  insuranceCarrier?: string
}

interface PatientSelectorStepProps {
  onSelect: (patient: SelectedPatient) => void
  selectedPatient: SelectedPatient | null
  onClear: () => void
  preSelectedCustomerId?: string | null
}

export function PatientSelectorStep({
  onSelect,
  selectedPatient,
  onClear,
  preSelectedCustomerId
}: PatientSelectorStepProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<SelectedPatient[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [preSelectLoading, setPreSelectLoading] = useState(false)

  // Auto-fetch customer when preSelectedCustomerId is provided
  useEffect(() => {
    if (preSelectedCustomerId && !selectedPatient) {
      setPreSelectLoading(true)
      fetch(`/api/customers/${preSelectedCustomerId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            const customer = data.data
            onSelect({
              id: customer.id,
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email || undefined,
              phone: customer.phone || undefined,
              insuranceCarrier: customer.insuranceCarrier || undefined
            })
          }
        })
        .catch(err => console.error('Failed to fetch pre-selected customer:', err))
        .finally(() => setPreSelectLoading(false))
    }
  }, [preSelectedCustomerId, selectedPatient, onSelect])

  const fetchCustomers = useCallback(async (search?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('limit', '8')

      const response = await fetch(`/api/customers?${params}`)
      const data = await response.json()

      if (data.success) {
        setCustomers(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 1) {
        fetchCustomers(searchTerm)
        setShowResults(true)
      } else {
        setCustomers([])
        setShowResults(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, fetchCustomers])

  const handleSelect = (customer: SelectedPatient) => {
    onSelect(customer)
    setSearchTerm('')
    setShowResults(false)
  }

  const getCarrierColor = (carrier?: string) => {
    if (!carrier) return 'bg-gray-500/20 text-gray-300'
    const c = carrier.toLowerCase()
    if (c.includes('vsp')) return 'bg-blue-500/20 text-blue-300'
    if (c.includes('eyemed')) return 'bg-purple-500/20 text-purple-300'
    if (c.includes('spectera')) return 'bg-teal-500/20 text-teal-300'
    return 'bg-gray-500/20 text-gray-300'
  }

  // Show loading state when pre-selecting
  if (preSelectLoading) {
    return (
      <Card className="bg-gray-800/50 border-gray-600">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <p className="text-white/70">Loading patient...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If patient is selected, show compact display
  if (selectedPatient) {
    return (
      <Card className="bg-green-900/20 border-green-500/50">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white font-medium">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
                <p className="text-white/60 text-sm">
                  {selectedPatient.email || selectedPatient.phone || 'No contact info'}
                </p>
              </div>
              {selectedPatient.insuranceCarrier && (
                <Badge className={getCarrierColor(selectedPatient.insuranceCarrier)}>
                  {selectedPatient.insuranceCarrier}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-white/70 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Change
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show search interface
  return (
    <Card className="bg-gray-800/50 border-amber-500/50">
      <CardContent className="py-4">
        <div className="flex items-center gap-3 mb-3">
          <User className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-white font-medium">Step 1: Select Patient</p>
            <p className="text-white/60 text-sm">Search for the patient before uploading documents</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-900/50 border-gray-600"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>

        {/* Search Results */}
        {showResults && customers.length > 0 && (
          <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-700 divide-y divide-gray-700">
            {customers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => handleSelect(customer)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition-colors text-left"
              >
                <div>
                  <p className="text-white font-medium">
                    {customer.firstName} {customer.lastName}
                  </p>
                  <p className="text-white/50 text-sm">
                    {customer.email || customer.phone || 'No contact info'}
                  </p>
                </div>
                {customer.insuranceCarrier && (
                  <Badge className={getCarrierColor(customer.insuranceCarrier)}>
                    {customer.insuranceCarrier}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}

        {showResults && !loading && customers.length === 0 && searchTerm && (
          <p className="mt-2 text-gray-400 text-sm text-center py-2">
            No patients found matching &quot;{searchTerm}&quot;
          </p>
        )}
      </CardContent>
    </Card>
  )
}
