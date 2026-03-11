'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2 } from 'lucide-react'

// Import menu components
import {
  ExamServicesMenu,
  LensesMenu,
  MaterialsMenu,
  AddOnsMenu,
  FramesMenu,
  ContactsMenu,
} from './menus'

/**
 * Customer search component for patient selection
 */
function CustomerSearch() {
  const { selectPatient, quote } = usePOSStore()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `/api/customers?search=${encodeURIComponent(query)}&limit=10`
      )
      if (response.ok) {
        const data = await response.json()
        setResults(data.data || [])
      }
    } catch (error) {
      console.error('Customer search error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchCustomers(search), 300)
    return () => clearTimeout(timer)
  }, [search, searchCustomers])

  if (quote.patient) return null

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Select a Patient</h2>
        <p className="text-white/60">Search by name, phone, or email to begin</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
        <Input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 text-lg glass-input bg-white/10 border-white/20 text-white placeholder:text-white/40"
          autoFocus
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40 animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-2 glass-card rounded-lg max-h-64 overflow-y-auto">
          {results.map((customer) => (
            <button
              key={customer.id}
              onClick={() => {
                selectPatient({
                  id: customer.id,
                  firstName: customer.firstName,
                  lastName: customer.lastName,
                  dob: customer.dob,
                  email: customer.email,
                  phone: customer.phone,
                })
                setSearch('')
                setResults([])
              }}
              className="w-full text-left p-4 hover:bg-white/10 border-b border-white/10 last:border-b-0 text-white"
            >
              <div className="font-medium">
                {customer.firstName} {customer.lastName}
              </div>
              <div className="text-sm text-white/60 flex items-center gap-2">
                {customer.phone && <span>{customer.phone}</span>}
                {customer.insuranceCarrier && (
                  <Badge variant="outline" className="border-white/30 text-white/80">{customer.insuranceCarrier}</Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Main product area component
 * Displays different menu content based on active menu selection
 */
export default function ProductArea() {
  const { activeMenu, quote } = usePOSStore()

  // If no patient selected, show search
  if (!quote.patient) {
    return (
      <div className="flex items-center justify-center h-full">
        <CustomerSearch />
      </div>
    )
  }

  // Get title and render appropriate menu
  const getMenuContent = () => {
    switch (activeMenu) {
      case 'exam':
        return {
          title: 'Exam Services',
          component: <ExamServicesMenu />,
        }
      case 'lenses':
        return {
          title: 'Lenses',
          component: <LensesMenu />,
        }
      case 'materials':
        return {
          title: 'Materials & Coatings',
          component: <MaterialsMenu />,
        }
      case 'addons':
        return {
          title: 'Add-Ons',
          component: <AddOnsMenu />,
        }
      case 'frames':
        return {
          title: 'Frames',
          component: <FramesMenu />,
        }
      case 'contacts':
        return {
          title: 'Contact Lenses',
          component: <ContactsMenu />,
        }
      default:
        return {
          title: '',
          component: null,
        }
    }
  }

  const { title, component } = getMenuContent()

  return (
    <div className="h-full">
      {/* Menu Header */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>

      {/* Menu Content */}
      {component}
    </div>
  )
}
