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

// Authorization info from the API - now includes full pricing tiers
interface Authorization {
  id: string
  carrier: string
  planName: string
  planNetwork?: string | null
  patientName?: string
  patientAge?: number | null
  memberId?: string
  groupNumber?: string | null
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
  effectiveDate?: string | null
  expirationDate: string | null
  isActive?: boolean

  // ===== PRICING TIERS FOR POS =====
  // Lens copays
  lensCopays?: {
    singleVision: number | null
    bifocal: number | null
    trifocal: number | null
  }

  // Progressive tiers (carrier-specific codes)
  progressiveTiers?: Record<string, number | string | null>

  // AR coating tiers (carrier-specific codes)
  arCoatingTiers?: Record<string, number | string | null>

  // Material copays
  materialCopays?: {
    polycarbonate: number | string | null
    polycarbonateChild: number | string | null
    highIndex160: number | string | null
    highIndex167: number | string | null
    highIndex174: number | string | null
    trivex: number | string | null
  }

  // Enhancement copays
  enhancementCopays?: {
    photochromic: number | string | null
    polarized: number | string | null
    blueLight: number | string | null
    tint: number | string | null
    uvCoating: number | string | null
    scratchCoating: number | string | null
  }

  // Special rules
  specialRules?: {
    polycarbonateChildFreeAge: number
    childAge: number | null
    isChild: boolean
    secondPairDiscount: number | null
  }
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

// Materials benefit type - only frame allowance vs contact allowance is exclusive
// Services (exams, fittings) are NEVER exclusive and always use insurance
export type MaterialsBenefitType = 'glasses' | 'contacts' | null

// Materials conflict state - automatically tracked based on what's in the quote
export interface MaterialsConflict {
  hasConflict: boolean           // True when both glasses materials AND contact materials are added
  activeBenefit: MaterialsBenefitType  // Which benefit is currently getting the allowance
  conflictingBenefit: MaterialsBenefitType // The other benefit that's NOT getting the allowance
  firstAddedType: MaterialsBenefitType // Which type was added first (gets the allowance by default)
}

// Initial conflict state
const initialMaterialsConflict: MaterialsConflict = {
  hasConflict: false,
  activeBenefit: null,
  conflictingBenefit: null,
  firstAddedType: null,
}

// Context state
interface QuotePricingState {
  // Customer info
  customerId: string | null
  customerName: string | null

  // Authorization
  authorization: Authorization | null
  authorizationLoading: boolean

  // Materials benefit tracking (automatic - not user-selected upfront)
  // This tracks which materials benefit is active based on what was added first
  // Services (exam, CL fitting) are NEVER affected by this - they always use insurance
  materialsConflict: MaterialsConflict

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

  // Materials benefit switching (only when conflict exists)
  // This allows user to choose which materials type gets the allowance when both are in the quote
  switchMaterialsBenefit: (type: MaterialsBenefitType) => void

  // Check if a materials category should use insurance allowance
  // Services (exam, fittings) always use insurance - this is ONLY for frame/contact allowance
  usesMaterialsAllowance: (category: 'glasses' | 'contacts') => boolean

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
  const [materialsConflict, setMaterialsConflict] = useState<MaterialsConflict>(initialMaterialsConflict)
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

  // Update materials conflict state when contact lenses state changes
  // (contactLenses is managed separately from selectedItems)
  useEffect(() => {
    updateMaterialsConflictState(selectedItems)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactLenses?.enabled])

  // Actions
  const setCustomer = useCallback((id: string, name: string) => {
    setCustomerId(id)
    setCustomerName(name)
  }, [])

  const clearCustomer = useCallback(() => {
    setCustomerId(null)
    setCustomerName(null)
    setAuthorization(null)
    setMaterialsConflict(initialMaterialsConflict)
    setSelectedItems(new Map())
    setPricedItems([])
    setPricingSummary(initialSummary)
    setSecondPair(null)
    setContactLenses(null)
  }, [])

  // Helper to determine what type of materials category an item belongs to
  const getItemMaterialsType = useCallback((item: QuoteItem): MaterialsBenefitType => {
    // Frame and lens categories are "glasses" materials
    if (item.category === 'frame' || item.category === 'lens' || item.category === 'coating' || item.category === 'addon') {
      return 'glasses'
    }
    // Contact lens materials (not fitting - fitting is a service)
    if (item.category === 'contact') {
      return 'contacts'
    }
    // Exam and services don't count as materials
    return null
  }, [])

  // Detect and update materials conflict state based on current items
  const updateMaterialsConflictState = useCallback((items: Map<string, QuoteItem>) => {
    // Don't track conflict if glasses/contacts aren't exclusive for this plan
    if (authorization && !authorization.glassesContactsExclusive) {
      setMaterialsConflict(initialMaterialsConflict)
      return
    }

    // Determine what materials types are in the quote
    let hasGlassesMaterials = false
    let hasContactMaterials = false

    for (const item of items.values()) {
      const type = getItemMaterialsType(item)
      if (type === 'glasses') hasGlassesMaterials = true
      if (type === 'contacts') hasContactMaterials = true
    }

    // Also check contact lenses state (separate from selectedItems)
    if (contactLenses?.enabled) {
      hasContactMaterials = true
    }

    setMaterialsConflict(prev => {
      // Case 1: No materials at all
      if (!hasGlassesMaterials && !hasContactMaterials) {
        return initialMaterialsConflict
      }

      // Case 2: Only one type of materials
      if (hasGlassesMaterials && !hasContactMaterials) {
        return {
          hasConflict: false,
          activeBenefit: 'glasses',
          conflictingBenefit: null,
          firstAddedType: prev.firstAddedType || 'glasses',
        }
      }
      if (hasContactMaterials && !hasGlassesMaterials) {
        return {
          hasConflict: false,
          activeBenefit: 'contacts',
          conflictingBenefit: null,
          firstAddedType: prev.firstAddedType || 'contacts',
        }
      }

      // Case 3: Both types present - CONFLICT
      // First-added type gets the allowance by default, but can be switched
      const firstType = prev.firstAddedType || 'glasses' // Default to glasses if somehow not set
      return {
        hasConflict: true,
        activeBenefit: prev.activeBenefit || firstType, // Keep current selection if already set
        conflictingBenefit: prev.activeBenefit === 'glasses' ? 'contacts' : 'glasses',
        firstAddedType: firstType,
      }
    })
  }, [authorization, contactLenses, getItemMaterialsType])

  // Switch which materials type gets the insurance allowance (only relevant when conflict exists)
  const switchMaterialsBenefit = useCallback((type: MaterialsBenefitType) => {
    if (!type) return

    setMaterialsConflict(prev => {
      if (!prev.hasConflict) {
        // No conflict - just set the active benefit
        return {
          ...prev,
          activeBenefit: type,
        }
      }

      // Conflict exists - switch the active benefit
      return {
        ...prev,
        activeBenefit: type,
        conflictingBenefit: type === 'glasses' ? 'contacts' : 'glasses',
      }
    })
  }, [])

  // Check if a materials category should use insurance ALLOWANCE
  // This is ONLY for frame allowance vs contact allowance
  // Services (exam, CL fitting) ALWAYS use insurance and should NOT call this function
  const usesMaterialsAllowance = useCallback((category: 'glasses' | 'contacts'): boolean => {
    // No authorization = no allowance for anything
    if (!authorization) return false

    // If glasses and contacts are NOT exclusive (rare plans), both can use allowance
    if (!authorization.glassesContactsExclusive) return true

    // Use allowance if this is the active benefit type
    return materialsConflict.activeBenefit === category
  }, [authorization, materialsConflict.activeBenefit])

  const addItem = useCallback((item: QuoteItem) => {
    setSelectedItems(prev => {
      const newItems = new Map(prev).set(item.sku, item)
      // Update conflict state when items change
      updateMaterialsConflictState(newItems)
      return newItems
    })
  }, [updateMaterialsConflictState])

  const removeItem = useCallback((sku: string) => {
    setSelectedItems(prev => {
      const next = new Map(prev)
      next.delete(sku)
      // Update conflict state when items change
      updateMaterialsConflictState(next)
      return next
    })
  }, [updateMaterialsConflictState])

  const updateItem = useCallback((sku: string, updates: Partial<QuoteItem>) => {
    setSelectedItems(prev => {
      const existing = prev.get(sku)
      if (!existing) return prev
      return new Map(prev).set(sku, { ...existing, ...updates })
    })
  }, [])

  const clearItems = useCallback(() => {
    setSelectedItems(new Map())
    setMaterialsConflict(initialMaterialsConflict)
  }, [])

  const clearItemsByCategory = useCallback((category: QuoteItem['category']) => {
    setSelectedItems(prev => {
      const next = new Map(prev)
      for (const [sku, item] of next) {
        if (item.category === category) {
          next.delete(sku)
        }
      }
      // Update conflict state when items change
      updateMaterialsConflictState(next)
      return next
    })
  }, [updateMaterialsConflictState])

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
    materialsConflict,
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
    switchMaterialsBenefit,
    usesMaterialsAllowance,
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

// ===== TIER PRICING HELPERS =====

/**
 * Hook to get pricing tier information from the authorization
 * Useful for displaying copays in product selection UIs
 */
export function useAuthorizationPricing() {
  const { authorization, authorizationLoading } = useQuotePricingContext()

  /**
   * Get progressive lens copay by tier code
   */
  const getProgressiveCopay = (tierCode: string): number | null => {
    if (!authorization?.progressiveTiers) return null
    const copay = authorization.progressiveTiers[tierCode]
    if (copay === null || copay === undefined) return null
    if (typeof copay === 'string') return null // Handle "80% of U&C" etc.
    return copay
  }

  /**
   * Get AR coating copay by tier code
   */
  const getArCopay = (tierCode: string): number | null => {
    if (!authorization?.arCoatingTiers) return null
    const copay = authorization.arCoatingTiers[tierCode]
    if (copay === null || copay === undefined) return null
    if (typeof copay === 'string') return null
    return copay
  }

  /**
   * Get material copay (polycarbonate, hi-index, trivex)
   */
  const getMaterialCopay = (material: 'polycarbonate' | 'highIndex160' | 'highIndex167' | 'highIndex174' | 'trivex'): number | null => {
    if (!authorization?.materialCopays) return null

    // Check if patient is a child (poly is often free for children)
    const isChild = authorization.specialRules?.isChild ?? false
    if (material === 'polycarbonate' && isChild) {
      const childCopay = authorization.materialCopays.polycarbonateChild
      if (childCopay === 'covered' || childCopay === 0) return 0
      if (typeof childCopay === 'number') return childCopay
    }

    const copay = authorization.materialCopays[material]
    if (copay === null || copay === undefined) return null
    if (typeof copay === 'string') return null
    return copay
  }

  /**
   * Get enhancement copay (photochromic, polarized, etc.)
   */
  const getEnhancementCopay = (enhancement: 'photochromic' | 'polarized' | 'blueLight' | 'tint'): number | null => {
    if (!authorization?.enhancementCopays) return null
    const copay = authorization.enhancementCopays[enhancement]
    if (copay === null || copay === undefined) return null
    if (typeof copay === 'string') return null
    return copay
  }

  /**
   * Calculate frame patient cost with allowance and overage
   */
  const calculateFramePrice = (retailPrice: number, isFeaturedBrand: boolean = false) => {
    if (!authorization) {
      return {
        patientPays: retailPrice,
        insurancePays: 0,
        allowanceUsed: 0,
        overage: 0,
        overageDiscount: 0,
      }
    }

    const allowance = isFeaturedBrand && authorization.frameAllowanceFeatured
      ? authorization.frameAllowanceFeatured
      : authorization.frameAllowance ?? 0

    const overage = Math.max(0, retailPrice - allowance)
    const discountRate = authorization.frameOverageDiscount ?? 0
    const overageDiscount = overage * discountRate
    const patientPays = overage - overageDiscount

    return {
      patientPays,
      insurancePays: allowance + overageDiscount,
      allowanceUsed: Math.min(allowance, retailPrice),
      overage,
      overageDiscount,
    }
  }

  return {
    authorization,
    isLoading: authorizationLoading,
    hasInsurance: authorization !== null,
    carrier: authorization?.carrier ?? null,

    // Basic copays
    examCopay: authorization?.examCopay ?? null,
    materialsCopay: authorization?.materialsCopay ?? null,
    frameAllowance: authorization?.frameAllowance ?? null,
    contactAllowance: authorization?.contactAllowance ?? null,

    // Special flags
    isChild: authorization?.specialRules?.isChild ?? false,
    glassesContactsExclusive: authorization?.glassesContactsExclusive ?? false,

    // Tier lookup functions
    getProgressiveCopay,
    getArCopay,
    getMaterialCopay,
    getEnhancementCopay,
    calculateFramePrice,
  }
}
