/**
 * Hook to fetch contact lenses and calculate pricing
 * 
 * Fetches contact lenses from the database and applies
 * carrier-specific pricing based on customer authorization.
 */

import { useState, useEffect, useCallback } from 'react'
import { ContactLensProduct, ContactLensPricingResult } from '@/lib/services/unified-pricing-service'

interface UseContactLensesOptions {
  isAstigmatism?: boolean
  isMultifocal?: boolean
  isDaily?: boolean
  manufacturer?: string
}

interface ContactLensesState {
  lenses: ContactLensProduct[]
  manufacturers: string[]
  loading: boolean
  error: string | null
}

export function useContactLenses(options: UseContactLensesOptions = {}) {
  const { isAstigmatism, isMultifocal, isDaily, manufacturer } = options
  
  const [state, setState] = useState<ContactLensesState>({
    lenses: [],
    manufacturers: [],
    loading: false,
    error: null,
  })
  
  const fetchLenses = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const params = new URLSearchParams()
      if (isAstigmatism !== undefined) params.set('isAstigmatism', String(isAstigmatism))
      if (isMultifocal !== undefined) params.set('isMultifocal', String(isMultifocal))
      if (isDaily !== undefined) params.set('isDaily', String(isDaily))
      if (manufacturer) params.set('manufacturer', manufacturer)
      
      const url = `/api/pricing/contacts${params.toString() ? '?' + params.toString() : ''}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch contact lenses')
      }
      
      setState({
        lenses: data.lenses || [],
        manufacturers: data.manufacturers || [],
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
  }, [isAstigmatism, isMultifocal, isDaily, manufacturer])
  
  useEffect(() => {
    fetchLenses()
  }, [fetchLenses])
  
  return {
    ...state,
    refetch: fetchLenses,
  }
}

interface ContactLensPricingOptions {
  customerId: string
  lensId: string
  boxesOD: number
  boxesOS: number
  annualSupplyBoxes?: number
}

interface ContactLensPricingState {
  pricing: ContactLensPricingResult | null
  hasInsurance: boolean
  carrier: string | null
  loading: boolean
  error: string | null
}

export function useContactLensPricing() {
  const [state, setState] = useState<ContactLensPricingState>({
    pricing: null,
    hasInsurance: false,
    carrier: null,
    loading: false,
    error: null,
  })
  
  const calculatePricing = useCallback(async (options: ContactLensPricingOptions) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const response = await fetch('/api/pricing/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to calculate pricing')
      }
      
      setState({
        pricing: data.pricing,
        hasInsurance: data.hasInsurance || false,
        carrier: data.carrier || null,
        loading: false,
        error: null,
      })
      
      return data.pricing as ContactLensPricingResult
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
      return null
    }
  }, [])
  
  const reset = useCallback(() => {
    setState({
      pricing: null,
      hasInsurance: false,
      carrier: null,
      loading: false,
      error: null,
    })
  }, [])
  
  return {
    ...state,
    calculatePricing,
    reset,
  }
}
