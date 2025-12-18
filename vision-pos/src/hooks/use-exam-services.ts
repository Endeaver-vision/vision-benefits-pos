/**
 * Hook to fetch exam and fitting services from the pricing API
 *
 * ARCHITECTURE: Prices come from customer_price_lists table (single source of truth).
 * The API returns pre-computed prices, NOT real-time calculations.
 */

import { useState, useEffect, useCallback } from 'react'

// Service type returned by /api/pricing/services
export interface PricedService {
  sku: string
  name: string
  category: string
  retailPrice: number
  patientPays: number
  insurancePays: number
  savings: number
  pricingMethod: 'copay' | 'tier' | 'retail' | 'fallback'
  tierUsed?: string
  notes?: string
  needsTierAssignment?: boolean
}

interface UseExamServicesOptions {
  customerId?: string | null
  enabled?: boolean
}

interface ExamServicesState {
  exams: PricedService[]
  fittings: PricedService[]
  hasInsurance: boolean
  carrier: string | null
  loading: boolean
  error: string | null
}

export function useExamServices(options: UseExamServicesOptions = {}) {
  const { customerId, enabled = true } = options
  
  const [state, setState] = useState<ExamServicesState>({
    exams: [],
    fittings: [],
    hasInsurance: false,
    carrier: null,
    loading: false,
    error: null,
  })
  
  const fetchServices = useCallback(async () => {
    if (!enabled) return
    
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const url = customerId 
        ? `/api/pricing/services?customerId=${customerId}` 
        : '/api/pricing/services'
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch services')
      }
      
      setState({
        exams: data.exams || [],
        fittings: data.fittings || [],
        hasInsurance: data.hasInsurance || false,
        carrier: data.carrier || null,
        loading: false,
        error: null,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [customerId, enabled])
  
  useEffect(() => {
    fetchServices()
  }, [fetchServices])
  
  // Helper to get a service by SKU
  const getServiceBySku = useCallback((sku: string): PricedService | undefined => {
    return [...state.exams, ...state.fittings].find(s => s.sku === sku)
  }, [state.exams, state.fittings])
  
  // Get main exams (routine, comprehensive)
  const mainExams = state.exams.filter(e => 
    e.name.toLowerCase().includes('routine') || 
    e.name.toLowerCase().includes('comprehensive') ||
    e.name === 'Medical Exam'
  )
  
  // Get add-on services (everything else in exams)
  const addOnServices = state.exams.filter(e => 
    !e.name.toLowerCase().includes('routine') && 
    !e.name.toLowerCase().includes('comprehensive') &&
    e.name !== 'Medical Exam' &&
    !e.name.toLowerCase().includes('amd:') &&
    !e.name.toLowerCase().includes('tobacco') &&
    !e.name.toLowerCase().includes('reschedule')
  )
  
  // Get CL fittings (standard ones, not specialty billing codes)
  const clFittings = state.fittings.filter(f =>
    f.name.toLowerCase().includes('sphere') ||
    f.name.toLowerCase().includes('toric') ||
    f.name.toLowerCase().includes('multifocal') ||
    f.name.toLowerCase().includes('monovision') ||
    f.name.toLowerCase().includes('rgp') ||
    f.name.toLowerCase().includes('specialty') ||
    f.name.toLowerCase().includes('ortho') ||
    f.name.toLowerCase().includes('misight')
  )
  
  return {
    ...state,
    mainExams,
    addOnServices,
    clFittings,
    getServiceBySku,
    refetch: fetchServices,
  }
}
