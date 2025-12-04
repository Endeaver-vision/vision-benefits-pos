'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { QuoteResult, QuoteLineItem } from '@/types/product-catalog'

// Types for quote items
interface QuoteItem {
  sku: string
  displayName: string
  category: 'exam' | 'frame' | 'lens' | 'coating' | 'addon' | 'contact'
  retailPrice: number
  quantity?: number
}

// Second pair (cash only) pricing
interface SecondPairPricing {
  enabled: boolean
  frameName: string
  framePrice: number
  lensPrice: number
  coatingPrice: number
  discountType: 'same-day' | 'within-30-days' | 'none'
  discountPercent: number
  subtotal: number
  discountAmount: number
  totalDue: number
}

// Contact lens pricing
interface ContactLensPricing {
  enabled: boolean
  lensName: string
  manufacturer: string
  boxesRight: number
  boxesLeft: number
  pricePerBox: number
  subtotal: number
  meetsAnnualSupply: boolean
  annualSupplyDiscount: number
  insuranceCredit: number
  rebate: number
  totalDue: number
}

// Authorization info from the API
interface Authorization {
  id: string
  carrier: string
  planName: string
  examCopay: number | null
  materialsCopay: number | null
  frameAllowance: number | null
  frameAllowanceFeatured?: number | null
  frameOverageDiscount: number | null
  contactAllowance: number | null
  contactFittingCovered: boolean
  contactExamCopay: number | null
  contactFittingCopay: number | null
  glassesContactsExclusive: boolean
  expirationDate: string | null
}

// Pricing summary for display
interface PricingSummary {
  retailTotal: number
  insuranceTotal: number
  patientTotal: number
  totalSavings: number
  examCopay: number
  materialsCopay: number
}

// Line item with calculated pricing
interface PricedItem extends QuoteItem {
  patientPays: number
  insurancePays: number
  savings: number
  tierUsed?: string
  notes?: string
}

// Context state
interface QuotePricingState {
  // Customer info
  customerId: string | null
  customerName: string | null

  // Authorization
  authorization: Authorization | null
  authorizationLoading: boolean

  // Selected items (keyed by SKU for easy updates)
  selectedItems: Map<string, QuoteItem>

  // Calculated pricing
  pricedItems: PricedItem[]
  pricingSummary: PricingSummary

  // Second pair (cash only)
  secondPair: SecondPairPricing | null

  // Contact lenses
  contactLenses: ContactLensPricing | null

  // Loading/error states
  isCalculating: boolean
  error: string | null
  lastCalculatedAt: Date | null
}

// Context actions
interface QuotePricingActions {
  // Set customer (triggers authorization fetch)
  setCustomer: (customerId: string, customerName: string) => void
  clearCustomer: () => void

  // Item management
  addItem: (item: QuoteItem) => void
  removeItem: (sku: string) => void
  updateItem: (sku: string, updates: Partial<QuoteItem>) => void
  clearItems: () => void
  clearItemsByCategory: (category: QuoteItem['category']) => void

  // Get pricing for a specific SKU
  getItemPricing: (sku: string) => PricedItem | null

  // Second pair and contact lens management
  updateSecondPair: (pricing: SecondPairPricing) => void
  updateContactLenses: (pricing: ContactLensPricing) => void

  // Force recalculation
  recalculatePricing: () => Promise<void>
}

type QuotePricingContextType = QuotePricingState & QuotePricingActions

const QuotePricingContext = createContext<QuotePricingContextType | null>(null)

// Initial state
const initialSummary: PricingSummary = {
  retailTotal: 0,
  insuranceTotal: 0,
  patientTotal: 0,
  totalSavings: 0,
  examCopay: 0,
  materialsCopay: 0,
}

export function QuotePricingProvider({ children }: { children: React.ReactNode }) {
  // State
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [authorization, setAuthorization] = useState<Authorization | null>(null)
  const [authorizationLoading, setAuthorizationLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Map<string, QuoteItem>>(new Map())
  const [pricedItems, setPricedItems] = useState<PricedItem[]>([])
  const [pricingSummary, setPricingSummary] = useState<PricingSummary>(initialSummary)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCalculatedAt, setLastCalculatedAt] = useState<Date | null>(null)
  const [secondPair, setSecondPair] = useState<SecondPairPricing | null>(null)
  const [contactLenses, setContactLenses] = useState<ContactLensPricing | null>(null)

  // Fetch authorization when customer changes
  useEffect(() => {
    if (!customerId) {
      setAuthorization(null)
      return
    }

    const fetchAuthorization = async () => {
      setAuthorizationLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/customers/${customerId}/authorization`)
        const data = await response.json()

        if (data.success && data.authorization) {
          setAuthorization(data.authorization)
        } else {
          setAuthorization(null)
        }
      } catch (err) {
        console.error('Failed to fetch authorization:', err)
        setAuthorization(null)
      } finally {
        setAuthorizationLoading(false)
      }
    }

    fetchAuthorization()
  }, [customerId])

  // Calculate pricing when items or authorization changes
  const calculatePricing = useCallback(async () => {
    if (!customerId || selectedItems.size === 0) {
      setPricedItems([])
      setPricingSummary(initialSummary)
      return
    }

    setIsCalculating(true)
    setError(null)

    try {
      // Convert Map to array for API
      const items = Array.from(selectedItems.values()).map(item => ({
        sku: item.sku,
        retailPrice: item.retailPrice,
        quantity: item.quantity || 1,
      }))

      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, items }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to calculate pricing')
      }

      const quote: QuoteResult = data.quote

      // Map API response to priced items
      const priced: PricedItem[] = Array.from(selectedItems.values()).map(item => {
        const apiItem = quote.items.find(i => i.sku === item.sku)

        if (apiItem) {
          return {
            ...item,
            patientPays: apiItem.patientCopay,
            insurancePays: apiItem.insurancePays,
            savings: apiItem.savings,
            tierUsed: apiItem.tierUsed,
            notes: apiItem.notes,
          }
        }

        // Fallback if item not found in API response (no insurance)
        return {
          ...item,
          patientPays: item.retailPrice,
          insurancePays: 0,
          savings: 0,
        }
      })

      setPricedItems(priced)
      setPricingSummary({
        retailTotal: quote.retailTotal,
        insuranceTotal: quote.insuranceTotal,
        patientTotal: quote.patientTotal,
        totalSavings: quote.totalSavings,
        examCopay: quote.examCopay || 0,
        materialsCopay: quote.materialsCopay || 0,
      })
      setLastCalculatedAt(new Date())
    } catch (err) {
      console.error('Pricing calculation failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')

      // Fallback: use retail prices if API fails
      const priced: PricedItem[] = Array.from(selectedItems.values()).map(item => ({
        ...item,
        patientPays: item.retailPrice,
        insurancePays: 0,
        savings: 0,
      }))

      const retailTotal = priced.reduce((sum, item) => sum + item.retailPrice * (item.quantity || 1), 0)

      setPricedItems(priced)
      setPricingSummary({
        retailTotal,
        insuranceTotal: 0,
        patientTotal: retailTotal,
        totalSavings: 0,
        examCopay: 0,
        materialsCopay: 0,
      })
    } finally {
      setIsCalculating(false)
    }
  }, [customerId, selectedItems])

  // Trigger recalculation when items change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculatePricing()
    }, 300) // Debounce to avoid too many API calls

    return () => clearTimeout(timeoutId)
  }, [calculatePricing])

  // Actions
  const setCustomer = useCallback((id: string, name: string) => {
    setCustomerId(id)
    setCustomerName(name)
  }, [])

  const clearCustomer = useCallback(() => {
    setCustomerId(null)
    setCustomerName(null)
    setAuthorization(null)
    setSelectedItems(new Map())
    setPricedItems([])
    setPricingSummary(initialSummary)
  }, [])

  const addItem = useCallback((item: QuoteItem) => {
    setSelectedItems(prev => new Map(prev).set(item.sku, item))
  }, [])

  const removeItem = useCallback((sku: string) => {
    setSelectedItems(prev => {
      const next = new Map(prev)
      next.delete(sku)
      return next
    })
  }, [])

  const updateItem = useCallback((sku: string, updates: Partial<QuoteItem>) => {
    setSelectedItems(prev => {
      const existing = prev.get(sku)
      if (!existing) return prev
      return new Map(prev).set(sku, { ...existing, ...updates })
    })
  }, [])

  const clearItems = useCallback(() => {
    setSelectedItems(new Map())
  }, [])

  const clearItemsByCategory = useCallback((category: QuoteItem['category']) => {
    setSelectedItems(prev => {
      const next = new Map(prev)
      for (const [sku, item] of next) {
        if (item.category === category) {
          next.delete(sku)
        }
      }
      return next
    })
  }, [])

  const getItemPricing = useCallback((sku: string): PricedItem | null => {
    return pricedItems.find(item => item.sku === sku) || null
  }, [pricedItems])

  const recalculatePricing = useCallback(async () => {
    await calculatePricing()
  }, [calculatePricing])

  const updateSecondPair = useCallback((pricing: SecondPairPricing) => {
    setSecondPair(pricing.enabled ? pricing : null)
  }, [])

  const updateContactLenses = useCallback((pricing: ContactLensPricing) => {
    setContactLenses(pricing.enabled ? pricing : null)
  }, [])

  const value: QuotePricingContextType = {
    // State
    customerId,
    customerName,
    authorization,
    authorizationLoading,
    selectedItems,
    pricedItems,
    pricingSummary,
    secondPair,
    contactLenses,
    isCalculating,
    error,
    lastCalculatedAt,

    // Actions
    setCustomer,
    clearCustomer,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    clearItemsByCategory,
    getItemPricing,
    updateSecondPair,
    updateContactLenses,
    recalculatePricing,
  }

  return (
    <QuotePricingContext.Provider value={value}>
      {children}
    </QuotePricingContext.Provider>
  )
}

// Hook to use the context
export function useQuotePricingContext() {
  const context = useContext(QuotePricingContext)
  if (!context) {
    throw new Error('useQuotePricingContext must be used within a QuotePricingProvider')
  }
  return context
}

// Convenience hook for just reading pricing summary
export function usePricingSummary() {
  const { pricingSummary, isCalculating, authorization } = useQuotePricingContext()
  return { pricingSummary, isCalculating, authorization }
}

// Convenience hook for item management
export function useQuoteItems() {
  const {
    selectedItems,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    clearItemsByCategory,
    getItemPricing,
    pricedItems,
  } = useQuotePricingContext()

  return {
    items: Array.from(selectedItems.values()),
    pricedItems,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    clearItemsByCategory,
    getItemPricing,
  }
}
