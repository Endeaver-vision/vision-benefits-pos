'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { QuoteResult, QuoteLineItem } from '@/types/product-catalog'
import {
  getVspCombinedCopay,
  getVspSingleVisionMaterialCopay,
  getVspFlatAddonCopay,
  isSingleVisionLens,
  isProgressiveLens,
  VspMatrixResult,
} from '@/lib/services/vsp-matrix-lookup'

// Types for quote items
interface QuoteItem {
  sku: string
  displayName: string
  category: 'exam' | 'frame' | 'lens' | 'coating' | 'addon' | 'contact' | 'service'
  pricingCategory?: string | null  // e.g., "VISION_EXAM", "PROGRESSIVE", "FRAME"
  retailPrice: number
  quantity?: number
}

// Saved price list types - for using pre-calculated prices from a saved version
export interface SavedPriceItem {
  sku: string
  productId: string
  displayName: string
  category: 'exam' | 'frame' | 'lens' | 'coating' | 'addon' | 'contact' | 'service'
  retailPrice: number
  finalPrice: number
  patientPays: number
  insurancePays: number
  savings: number
  tier?: string | null
  copay?: number | null
  notes?: string[]
}

export interface SavedPriceListVersion {
  id: string
  versionLabel: string
  carrier: string
  planName: string | null
  createdAt: string
  active: boolean
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
  lineItems?: Array<{ name: string; price: number }>
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

// Frame selection data (for restoration)
interface FrameSelection {
  id: string
  sku: string
  brand: string
  model: string
  color: string
  size: string
  price: number
  manufacturer: string
}

// Eyeglasses layer selection state (for restoration when navigating back)
interface EyeglassesSelections {
  frame: string | null
  selectedFrame: FrameSelection | null
  isPatientOwnedFrame: boolean
  lensType: string | null
  lensMaterial: string | null
  arCoating: string | null
  transitions: string | null
  polarized: string | null
  mountFee: string | null
  addons: string[]
  techAddon: string | null
}

// Second pair layer selection state
interface SecondPairSelections {
  discountType: 'same-day' | 'within-30-days' | 'none'
  frame: string | null
  selectedFrame: FrameSelection | null
  isPatientOwnedFrame: boolean
  lensType: string | null
  lensMaterial: string | null
  arCoating: string | null
  transitions: string | null
  polarized: string | null
  mountFee: string | null
  addons: string[]
}

// Contact lens layer selection state
interface ContactLensSelections {
  manufacturer: string
  selectedLens: {
    id: string
    name: string
    manufacturer: string
    pricePerBox: number
  } | null
  boxesRight: number
  boxesLeft: number
}

// Exam services layer selection state (for restoration when navigating back)
interface ExamSelections {
  mainExamSku: string | null
  addOnSkus: string[]
  clFittingSku: string | null
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
  lastVerified?: string | null  // For staleness checking (48-hour threshold)

  // ===== DECLINING BALANCE / FLEX PLAN SUPPORT =====
  benefitStructure?: 'COPAY_ALLOWANCE' | 'DECLINING_BALANCE' | 'PACKAGE' | null
  totalMaterialsCredit?: number | null  // Lump sum credit for declining balance plans
  creditAppliesToFrames?: boolean
  creditAppliesToLenses?: boolean
  creditAppliesToContacts?: boolean
  creditAppliesToCoatings?: boolean
  overageDiscountPercent?: number | null  // Discount after credit exhausted (e.g., 0.20 = 20%)
  eitherOrRestriction?: boolean  // Contacts OR glasses, not both
  // Unified declining balance object (from API)
  decliningBalance?: {
    totalAllowance: number | null
    appliesTo: string[]
    overageDiscounts: {
      frameLensPackage: number
      contactsConventional: number
      contactsDisposable: number
    }
    eitherOrRestriction: boolean
  } | null

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

// Export selection types for layer components
export type { EyeglassesSelections, SecondPairSelections, ContactLensSelections, ExamSelections, FrameSelection }

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

// Initial selections state
const initialEyeglassesSelections: EyeglassesSelections = {
  frame: null,
  selectedFrame: null,
  isPatientOwnedFrame: false,
  lensType: null,
  lensMaterial: null,
  arCoating: null,
  transitions: null,
  polarized: null,
  mountFee: null,
  addons: [],
  techAddon: null,
}

const initialSecondPairSelections: SecondPairSelections = {
  discountType: 'same-day',
  frame: null,
  selectedFrame: null,
  isPatientOwnedFrame: false,
  lensType: null,
  lensMaterial: null,
  arCoating: null,
  transitions: null,
  polarized: null,
  mountFee: null,
  addons: [],
}

const initialContactLensSelections: ContactLensSelections = {
  manufacturer: '',
  selectedLens: null,
  boxesRight: 0,  // Start at 0, auto-populated when lens selected
  boxesLeft: 0,
}

const initialExamSelections: ExamSelections = {
  mainExamSku: null,
  addOnSkus: [],
  clFittingSku: null,
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

  // Layer selections (for restoration when navigating back)
  examSelections: ExamSelections
  eyeglassesSelections: EyeglassesSelections
  secondPairSelections: SecondPairSelections
  contactLensSelections: ContactLensSelections

  // Loading/error states
  isCalculating: boolean
  error: string | null
  lastCalculatedAt: Date | null

  // Saved price list mode
  // When enabled, uses pre-calculated prices from a saved version instead of dynamic calculation
  useSavedPriceList: boolean
  activePriceListVersion: SavedPriceListVersion | null
  savedPriceItems: Map<string, SavedPriceItem>
}

// Context actions
interface QuotePricingActions {
  // Set customer (triggers authorization fetch)
  setCustomer: (customerId: string, customerName: string) => void
  clearCustomer: () => void

  // Refresh authorization (re-fetch from API)
  refreshAuthorization: () => Promise<void>

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

  // Layer selections management (for state persistence)
  updateExamSelections: (selections: Partial<ExamSelections>) => void
  updateEyeglassesSelections: (selections: Partial<EyeglassesSelections>) => void
  updateSecondPairSelections: (selections: Partial<SecondPairSelections>) => void
  updateContactLensSelections: (selections: Partial<ContactLensSelections>) => void

  // Force recalculation
  recalculatePricing: () => Promise<void>

  // Saved price list mode
  enableSavedPriceListMode: (customerId: string, versionId: string) => Promise<void>
  disableSavedPriceListMode: () => void
  getSavedPrice: (sku: string) => SavedPriceItem | null
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

  // Layer selections (for state persistence when navigating between layers)
  const [examSelections, setExamSelections] = useState<ExamSelections>(initialExamSelections)
  const [eyeglassesSelections, setEyeglassesSelections] = useState<EyeglassesSelections>(initialEyeglassesSelections)
  const [secondPairSelections, setSecondPairSelections] = useState<SecondPairSelections>(initialSecondPairSelections)
  const [contactLensSelections, setContactLensSelections] = useState<ContactLensSelections>(initialContactLensSelections)

  // Saved price list mode state
  const [useSavedPriceList, setUseSavedPriceList] = useState(false)
  const [activePriceListVersion, setActivePriceListVersion] = useState<SavedPriceListVersion | null>(null)
  const [savedPriceItems, setSavedPriceItems] = useState<Map<string, SavedPriceItem>>(new Map())

  // Fetch authorization function (reusable for initial load and refresh)
  const fetchAuthorizationForCustomer = useCallback(async (id: string) => {
    setAuthorizationLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/customers/${id}/authorization`)
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
  }, [])

  // Fetch authorization when customer changes
  useEffect(() => {
    if (!customerId) {
      setAuthorization(null)
      return
    }

    fetchAuthorizationForCustomer(customerId)
  }, [customerId, fetchAuthorizationForCustomer])

  // Refresh authorization (re-fetch from API) - pricing recalculation happens via useEffect
  const refreshAuthorization = useCallback(async () => {
    if (!customerId) return
    await fetchAuthorizationForCustomer(customerId)
    // Pricing will auto-recalculate via the useEffect that watches authorization changes
  }, [customerId, fetchAuthorizationForCustomer])

  // Calculate pricing when items or authorization changes
  // Also recalculates when activeMaterialsBenefit changes (user switches glasses/contacts)
  // When useSavedPriceList is true, uses saved prices instead of dynamic API calculation
  const calculatePricing = useCallback(async () => {
    if (!customerId || selectedItems.size === 0) {
      setPricedItems([])
      setPricingSummary(initialSummary)
      return
    }

    setIsCalculating(true)
    setError(null)

    try {
      // If using saved price list mode, calculate from saved prices
      if (useSavedPriceList && savedPriceItems.size > 0) {
        console.log('[QuotePricing] Using saved price list mode')

        const priced: PricedItem[] = Array.from(selectedItems.values()).map(item => {
          const savedPrice = savedPriceItems.get(item.sku)

          if (savedPrice) {
            return {
              ...item,
              patientPays: savedPrice.patientPays,
              insurancePays: savedPrice.insurancePays,
              savings: savedPrice.savings,
              tierUsed: savedPrice.tier || undefined,
              notes: savedPrice.notes?.join(', '),
            }
          }

          // If item not in saved prices, use retail (no insurance coverage)
          console.log(`[QuotePricing] Item ${item.sku} not in saved prices, using retail`)
          return {
            ...item,
            patientPays: item.retailPrice,
            insurancePays: 0,
            savings: 0,
          }
        })

        // Calculate totals from priced items
        const retailTotal = priced.reduce((sum, item) => sum + item.retailPrice * (item.quantity || 1), 0)
        const patientTotal = priced.reduce((sum, item) => sum + item.patientPays * (item.quantity || 1), 0)
        const insuranceTotal = priced.reduce((sum, item) => sum + item.insurancePays * (item.quantity || 1), 0)
        const totalSavings = priced.reduce((sum, item) => sum + item.savings * (item.quantity || 1), 0)

        setPricedItems(priced)
        setPricingSummary({
          retailTotal,
          insuranceTotal,
          patientTotal,
          totalSavings,
          examCopay: 0, // Not tracked in saved mode
          materialsCopay: 0,
        })
        setLastCalculatedAt(new Date())
        return
      }

      // Standard dynamic pricing via API
      // Convert Map to array for API
      const items = Array.from(selectedItems.values()).map(item => ({
        sku: item.sku,
        retailPrice: item.retailPrice,
        quantity: item.quantity || 1,
        category: item.category,
        pricingCategory: item.pricingCategory,
      }))

      // Debug: Log items being sent to API
      console.log('[QuotePricing] Items being sent to API:', items.length, 'items')
      console.log('[QuotePricing] Item details:', items.map(i => `${i.sku} (${i.category}): $${i.retailPrice}`))

      // Pass activeMaterialsBenefit so the API knows which category gets the allowance
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          items,
          activeMaterialsBenefit: materialsConflict.activeBenefit,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to calculate pricing')
      }

      const quote: QuoteResult = data.quote

      // Debug: Log API response
      console.log('[QuotePricing] API response - patientTotal:', quote.patientTotal, 'retailTotal:', quote.retailTotal)
      console.log('[QuotePricing] API response items:', quote.items.map(i => `${i.sku}: patient $${i.patientCopay}, insurance $${i.insurancePays}`))

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
  }, [customerId, selectedItems, materialsConflict.activeBenefit, authorization, useSavedPriceList, savedPriceItems])

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
    // Clear layer selections
    setExamSelections(initialExamSelections)
    setEyeglassesSelections(initialEyeglassesSelections)
    setSecondPairSelections(initialSecondPairSelections)
    setContactLensSelections(initialContactLensSelections)
    // Clear saved price list mode
    setUseSavedPriceList(false)
    setActivePriceListVersion(null)
    setSavedPriceItems(new Map())
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

    // If activeBenefit is already set, use that
    if (materialsConflict.activeBenefit) {
      return materialsConflict.activeBenefit === category
    }

    // activeBenefit is null (initial state) - determine based on what's in the quote
    // This handles the timing issue where pricing is requested before conflict state is set
    const hasGlassesMaterials = Array.from(selectedItems.values()).some(
      item => item.category === 'frame' || item.category === 'lens' || item.category === 'coating' || item.category === 'addon'
    )

    // If asking about contacts and no glasses materials in quote, contacts can use allowance
    if (category === 'contacts' && !hasGlassesMaterials) {
      return true
    }

    // If asking about glasses and no contacts enabled, glasses can use allowance
    if (category === 'glasses' && !contactLenses?.enabled) {
      return true
    }

    return false
  }, [authorization, materialsConflict.activeBenefit, selectedItems, contactLenses?.enabled])

  const addItem = useCallback((item: QuoteItem) => {
    console.log('[QuotePricing] Adding item:', item.sku, item.category, '$' + item.retailPrice)
    setSelectedItems(prev => {
      const newItems = new Map(prev).set(item.sku, item)
      console.log('[QuotePricing] Map now has', newItems.size, 'items:', Array.from(newItems.keys()))
      // Update conflict state when items change
      updateMaterialsConflictState(newItems)
      return newItems
    })
  }, [updateMaterialsConflictState])

  const removeItem = useCallback((sku: string) => {
    console.log('[QuotePricing] Removing item:', sku)
    setSelectedItems(prev => {
      const next = new Map(prev)
      const existed = next.delete(sku)
      console.log('[QuotePricing] Item existed:', existed, '- Map now has', next.size, 'items:', Array.from(next.keys()))
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

  // Layer selections update functions
  const updateExamSelections = useCallback((selections: Partial<ExamSelections>) => {
    setExamSelections(prev => ({ ...prev, ...selections }))
  }, [])

  const updateEyeglassesSelections = useCallback((selections: Partial<EyeglassesSelections>) => {
    setEyeglassesSelections(prev => ({ ...prev, ...selections }))
  }, [])

  const updateSecondPairSelections = useCallback((selections: Partial<SecondPairSelections>) => {
    setSecondPairSelections(prev => ({ ...prev, ...selections }))
  }, [])

  const updateContactLensSelections = useCallback((selections: Partial<ContactLensSelections>) => {
    setContactLensSelections(prev => ({ ...prev, ...selections }))
  }, [])

  // Saved price list mode functions
  const enableSavedPriceListMode = useCallback(async (customerId: string, versionId: string) => {
    try {
      setIsCalculating(true)
      const response = await fetch(`/api/customers/${customerId}/price-list/versions/${versionId}/prices`)
      const data = await response.json()

      if (data.success) {
        // Store version info
        setActivePriceListVersion(data.version)

        // Convert price items to map for quick lookup by SKU
        const priceMap = new Map<string, SavedPriceItem>()
        for (const item of data.priceItems) {
          priceMap.set(item.sku, item)
        }
        setSavedPriceItems(priceMap)
        setUseSavedPriceList(true)

        console.log('[QuotePricing] Enabled saved price list mode:', data.version.versionLabel, `(${priceMap.size} items)`)
      } else {
        console.error('[QuotePricing] Failed to load price list version:', data.error)
        setError(data.error || 'Failed to load price list')
      }
    } catch (err) {
      console.error('[QuotePricing] Error enabling saved price list mode:', err)
      setError('Failed to load saved price list')
    } finally {
      setIsCalculating(false)
    }
  }, [])

  const disableSavedPriceListMode = useCallback(() => {
    setUseSavedPriceList(false)
    setActivePriceListVersion(null)
    setSavedPriceItems(new Map())
    console.log('[QuotePricing] Disabled saved price list mode')
  }, [])

  const getSavedPrice = useCallback((sku: string): SavedPriceItem | null => {
    if (!useSavedPriceList) return null
    return savedPriceItems.get(sku) || null
  }, [useSavedPriceList, savedPriceItems])

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
    examSelections,
    eyeglassesSelections,
    secondPairSelections,
    contactLensSelections,
    isCalculating,
    error,
    lastCalculatedAt,

    // Saved price list mode state
    useSavedPriceList,
    activePriceListVersion,
    savedPriceItems,

    // Actions
    setCustomer,
    clearCustomer,
    refreshAuthorization,
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
    updateExamSelections,
    updateEyeglassesSelections,
    updateSecondPairSelections,
    updateContactLensSelections,
    recalculatePricing,

    // Saved price list mode actions
    enableSavedPriceListMode,
    disableSavedPriceListMode,
    getSavedPrice,
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

    // VSP default: 20% off overage (patient pays 80%)
    // Other carriers: use stored discount or default to 0
    const isVsp = authorization.carrier?.toUpperCase() === 'VSP'
    const defaultDiscount = isVsp ? 0.20 : 0
    let discountRate = authorization.frameOverageDiscount ?? defaultDiscount

    // Normalize if stored as percentage (e.g., 20 instead of 0.20)
    if (discountRate > 1) {
      discountRate = discountRate / 100
    }

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

  /**
   * Check if this is a declining balance plan
   */
  const isDecliningBalancePlan = authorization?.benefitStructure === 'DECLINING_BALANCE'

  /**
   * Calculate pricing for declining balance plans
   * Returns the patient pays amount after applying credit and overage discount
   */
  const calculateDecliningBalance = (
    items: Array<{ retailPrice: number; category: 'frame' | 'lens' | 'coating' | 'addon' | 'contact' | 'exam' }>
  ): {
    totalRetail: number
    creditApplied: number
    afterCredit: number
    overageDiscount: number
    patientPays: number
    creditRemaining: number
  } => {
    if (!authorization || authorization.benefitStructure !== 'DECLINING_BALANCE') {
      const totalRetail = items.reduce((sum, i) => sum + i.retailPrice, 0)
      return {
        totalRetail,
        creditApplied: 0,
        afterCredit: totalRetail,
        overageDiscount: 0,
        patientPays: totalRetail,
        creditRemaining: 0,
      }
    }

    // Get total credit from new or legacy fields
    const totalCredit = authorization.decliningBalance?.totalAllowance
      ?? authorization.totalMaterialsCredit
      ?? 0

    // Get overage discount rate - use frameLensPackage for eyeglasses, legacy field as fallback
    const overageDiscountRate = authorization.decliningBalance?.overageDiscounts?.frameLensPackage
      ? authorization.decliningBalance.overageDiscounts.frameLensPackage / 100
      : (authorization.overageDiscountPercent ?? 0)

    // Determine what the declining balance applies to
    const appliesTo = authorization.decliningBalance?.appliesTo ?? ['frame', 'lens', 'lensOptions', 'contacts']

    // Filter items eligible for credit based on appliesTo
    const eligibleItems = items.filter(item => {
      // Exams are always separate - not covered by declining balance credit
      if (item.category === 'exam') return false

      if (item.category === 'frame') return appliesTo.includes('frame') || authorization.creditAppliesToFrames !== false
      if (item.category === 'lens') return appliesTo.includes('lens') || authorization.creditAppliesToLenses !== false
      if (item.category === 'coating' || item.category === 'addon') return appliesTo.includes('lensOptions') || authorization.creditAppliesToCoatings !== false
      if (item.category === 'contact') return appliesTo.includes('contacts') || authorization.creditAppliesToContacts === true
      return false
    })

    // Non-eligible items (like exams) are handled separately with copays
    const nonEligibleItems = items.filter(item => !eligibleItems.includes(item))

    const eligibleRetail = eligibleItems.reduce((sum, i) => sum + i.retailPrice, 0)
    const nonEligibleRetail = nonEligibleItems.reduce((sum, i) => sum + i.retailPrice, 0)

    // Apply credit to eligible items
    const creditApplied = Math.min(eligibleRetail, totalCredit)
    const afterCredit = eligibleRetail - creditApplied

    // Apply overage discount to remaining amount (overage)
    const overageDiscount = afterCredit * overageDiscountRate
    const eligiblePatientPays = afterCredit - overageDiscount

    // Credit remaining for tracking
    const creditRemaining = Math.max(0, totalCredit - eligibleRetail)

    return {
      totalRetail: eligibleRetail + nonEligibleRetail,
      creditApplied,
      afterCredit,
      overageDiscount,
      patientPays: eligiblePatientPays + nonEligibleRetail, // Add non-eligible items at full price (or with copays)
      creditRemaining,
    }
  }

  /**
   * VSP Matrix Pricing: Get combined price for progressive + material
   *
   * VSP uses combined codes where progressive tier + material = single copay
   * Example: Varilux X (N) + Hi-Index 1.74 (J) = "NJ" = $125
   * NOT: NA ($175) + AJ ($118) = $293
   *
   * @param progressiveName - The progressive lens name (e.g., "Varilux X Design")
   * @param materialName - The material name (e.g., "Hi-Index 1.74")
   * @returns Combined copay result or null if not VSP or lookup fails
   */
  const getVspMatrixPrice = (
    progressiveName: string,
    materialName: string
  ): VspMatrixResult | null => {
    // Only applies to VSP
    if (authorization?.carrier?.toUpperCase() !== 'VSP') return null

    // Get copays JSON from authorization
    const copays = (authorization as { copays?: Record<string, number | null> })?.copays
    if (!copays) return null

    return getVspCombinedCopay(progressiveName, materialName, copays)
  }

  /**
   * VSP: Get material price for Single Vision lenses
   * Single Vision doesn't use the progressive matrix - just material-only codes
   *
   * @param materialName - The material name (e.g., "Polycarbonate")
   * @returns Material copay for SV or null if not VSP
   */
  const getVspSvMaterialPrice = (materialName: string): VspMatrixResult | null => {
    if (authorization?.carrier?.toUpperCase() !== 'VSP') return null

    const copays = (authorization as { copays?: Record<string, number | null> })?.copays
    if (!copays) return null

    return getVspSingleVisionMaterialCopay(materialName, copays)
  }

  /**
   * VSP: Get flat add-on copay (AR coating, photochromic, etc.)
   * These are NOT part of the progressive+material matrix
   *
   * @param addonCode - VSP two-letter code (e.g., "QV" for premium AR)
   * @param isSingleVision - Whether to use SV pricing (default: false = MF)
   * @returns The addon copay or null
   */
  const getVspAddonPrice = (addonCode: string, isSingleVision: boolean = false): number | null => {
    if (authorization?.carrier?.toUpperCase() !== 'VSP') return null

    const copays = (authorization as { copays?: Record<string, number | null> })?.copays
    if (!copays) return null

    return getVspFlatAddonCopay(addonCode, copays, !isSingleVision)
  }

  /**
   * Calculate total eyeglasses patient cost using VSP matrix pricing
   *
   * This correctly handles VSP's combined progressive+material codes.
   * For non-VSP carriers, returns null (use standard additive pricing).
   *
   * @param selections - Current eyeglasses selections
   * @returns Total patient cost or null if not applicable
   */
  const calculateVspEyeglassesTotal = (
    lensTypeName: string | null,
    materialName: string | null,
    arCoatingCode: string | null,
    photochromicCode: string | null,
    polarizedCode: string | null,
    otherAddonCodes: string[],
    materialsCopay: number | null
  ): { total: number; breakdown: Record<string, number> } | null => {
    if (authorization?.carrier?.toUpperCase() !== 'VSP') return null

    const copays = (authorization as { copays?: Record<string, number | null> })?.copays
    if (!copays) return null

    let total = 0
    const breakdown: Record<string, number> = {}

    // Materials copay is always added
    if (materialsCopay !== null) {
      total += materialsCopay
      breakdown['materialsCopay'] = materialsCopay
    }

    // Determine if Single Vision or Progressive
    const isSV = lensTypeName ? isSingleVisionLens(lensTypeName) : false
    const isProgressive = lensTypeName ? isProgressiveLens(lensTypeName) : false

    // Lens + Material pricing
    if (isProgressive && materialName) {
      // Progressive: use matrix combined code
      const matrixResult = getVspCombinedCopay(lensTypeName!, materialName, copays)
      if (matrixResult) {
        total += matrixResult.copay
        breakdown[`lens+material (${matrixResult.combinedCode})`] = matrixResult.copay
      }
    } else if (isSV && materialName) {
      // Single Vision: use material-only code
      const svMaterialResult = getVspSingleVisionMaterialCopay(materialName, copays)
      if (svMaterialResult) {
        total += svMaterialResult.copay
        breakdown[`material (${svMaterialResult.combinedCode})`] = svMaterialResult.copay
      }
    }

    // Add-ons (flat copays, not part of matrix)
    const addonsToCheck = [
      { code: arCoatingCode, name: 'AR Coating' },
      { code: photochromicCode, name: 'Photochromic' },
      { code: polarizedCode, name: 'Polarized' },
      ...otherAddonCodes.map(code => ({ code, name: code }))
    ]

    for (const addon of addonsToCheck) {
      if (addon.code) {
        const addonCopay = getVspFlatAddonCopay(addon.code, copays, !isSV)
        if (addonCopay !== null) {
          total += addonCopay
          breakdown[`${addon.name} (${addon.code})`] = addonCopay
        }
      }
    }

    return { total, breakdown }
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

    // Declining balance support
    isDecliningBalancePlan,
    totalMaterialsCredit: authorization?.totalMaterialsCredit ?? null,
    overageDiscountPercent: authorization?.overageDiscountPercent ?? null,
    benefitStructure: authorization?.benefitStructure ?? 'COPAY_ALLOWANCE',

    // Special flags
    isChild: authorization?.specialRules?.isChild ?? false,
    glassesContactsExclusive: authorization?.glassesContactsExclusive ?? false,

    // Tier lookup functions
    getProgressiveCopay,
    getArCopay,
    getMaterialCopay,
    getEnhancementCopay,
    calculateFramePrice,
    calculateDecliningBalance,

    // VSP Matrix pricing functions
    getVspMatrixPrice,
    getVspSvMaterialPrice,
    getVspAddonPrice,
    calculateVspEyeglassesTotal,
  }
}
