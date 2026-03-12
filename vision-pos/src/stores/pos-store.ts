/**
 * POS Store - Zustand store with persist for quote management
 * Auto-saves on every selection change with debounced API calls
 */

import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

// =============================================================================
// TYPES
// =============================================================================

export type MenuId =
  | 'exam'
  | 'lenses'
  | 'materials'
  | 'addons'
  | 'frames'
  | 'contacts'

export type QuoteStatus = 'draft' | 'saved' | 'sent' | 'accepted' | 'converted' | 'expired'

export interface Patient {
  id: string
  firstName: string
  lastName: string
  dob?: string
  email?: string
  phone?: string
}

export interface Insurance {
  carrier: 'VSP' | 'EYEMED' | 'SPECTERA' | 'CASH' | null
  memberId?: string
  authNumber?: string
  hasActiveAuth: boolean
  effectiveDate?: string
  expirationDate?: string
  // Allowances & copays
  examCopay?: number
  materialCopay?: number
  clExamCopay?: number // Contact lens fitting copay
  frameAllowance?: number
  contactAllowance?: number
  // VSP-specific tier info
  currentTier?: string // K, J, F, O, N for progressives
}

export interface LineItem {
  id: string
  productId: string
  name: string
  category: string
  subcategory?: string
  quantity: number
  retailPrice: number
  patientPays: number
  insurancePays: number
  tier?: string // For VSP tier-based pricing
  note?: string
  pairId: number // For multi-pair support
  isManualPrice?: boolean // True if price was manually adjusted
}

export interface Pair {
  id: number
  label: string // "Pair 1 - Everyday", "Pair 2 - Sunglasses"
  frameId?: string
  lensTypeId?: string
  materialId?: string
  coatingIds: string[]
  addOnIds: string[]
}

export interface Quote {
  id?: string
  status: QuoteStatus
  patientId: string
  patient: Patient | null
  insurance: Insurance
  pairs: Pair[]
  activePairId: number
  lineItems: LineItem[]
  notes: string
  discounts: Array<{
    type: 'percent' | 'fixed'
    amount: number
    reason: string
  }>
  // Calculated totals
  subtotal: number
  insuranceSavings: number
  discountTotal: number
  tax: number
  total: number
  // Timestamps
  createdAt?: string
  updatedAt?: string
  lastSavedAt?: string
}

export interface PriceList {
  // Identification
  versionId: string
  carrier: string
  planName?: string | null

  // Dates
  effectiveDate: string
  expirationDate?: string | null

  // === COPAYS (from extractedData) ===
  examCopay?: number | null
  materialsCopay?: number | null

  // === FRAME BENEFITS ===
  frameAllowance?: number | null
  frameAllowanceAltair?: number | null
  frameOverageDiscount?: number | null

  // === CONTACT LENS BENEFITS ===
  contactLens?: {
    examCopay: number | null
    fittingCopay: number | null
    materialsAllowance: number | null
    insteadOf?: string[]
  } | null

  // === ELIGIBILITY ===
  eligibility?: {
    exam: boolean
    lens: boolean
    frame: boolean
    contacts: boolean
  }

  // === PATIENT INFO ===
  patientInfo?: {
    name: string | null
    memberName: string | null
    authNumber: string | null
  }

  // === PRODUCT PRICES ===
  prices: Record<string, number | Record<string, number>>
}

interface POSState {
  // Navigation
  activeMenu: MenuId

  // Quote data
  quote: Quote

  // Lens type state (affects material pricing)
  isSingleVision: boolean

  // Price list (loaded when patient selected)
  priceList: PriceList | null
  priceListLoading: boolean

  // Auto-save
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: Date | null
  saveError: string | null

  // Actions
  setActiveMenu: (menu: MenuId) => void

  // Patient actions
  selectPatient: (patient: Patient) => void
  clearPatient: () => void
  setInsurance: (insurance: Partial<Insurance>) => void

  // Price list actions
  loadPriceList: (customerId: string) => Promise<void>

  // Line item actions
  addLineItem: (item: Omit<LineItem, 'id'>) => void
  updateLineItem: (id: string, updates: Partial<LineItem>) => void
  removeLineItem: (id: string) => void

  // Pair management
  addPair: (label?: string) => void
  setActivePair: (pairId: number) => void
  updatePair: (pairId: number, updates: Partial<Pair>) => void
  removePair: (pairId: number) => void

  // Discount actions
  addDiscount: (discount: Quote['discounts'][0]) => void
  removeDiscount: (index: number) => void

  // Notes
  setNotes: (notes: string) => void

  // Quote lifecycle
  saveQuote: () => Promise<void>
  loadQuote: (quoteId: string) => Promise<void>
  newQuote: () => void

  // Tier management (VSP)
  setCurrentTier: (tier: string) => void

  // Single vision tracking (affects material pricing)
  setIsSingleVision: (isSV: boolean) => void

  // Helpers
  getLineItemsForPair: (pairId: number) => LineItem[]
  recalculateTotals: () => void

  // Benefit type helpers (CL vs Glasses separation)
  hasGlassesItems: () => boolean
  hasContactItems: () => boolean
  getActiveBenefitType: () => 'glasses' | 'contacts' | 'both' | 'none'
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const createEmptyQuote = (): Quote => ({
  status: 'draft',
  patientId: '',
  patient: null,
  insurance: {
    carrier: null,
    hasActiveAuth: false,
  },
  pairs: [{
    id: 1,
    label: 'Pair 1',
    coatingIds: [],
    addOnIds: [],
  }],
  activePairId: 1,
  lineItems: [],
  notes: '',
  discounts: [],
  subtotal: 0,
  insuranceSavings: 0,
  discountTotal: 0,
  tax: 0,
  total: 0,
})

// =============================================================================
// STORE
// =============================================================================

export const usePOSStore = create<POSState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        activeMenu: 'exam',
        quote: createEmptyQuote(),
        isSingleVision: true, // Default to SV
        priceList: null,
        priceListLoading: false,
        isDirty: false,
        isSaving: false,
        lastSavedAt: null,
        saveError: null,

        // Navigation
        setActiveMenu: (menu) => {
          set({ activeMenu: menu }, false, 'setActiveMenu')
        },

        // Patient actions
        selectPatient: (patient) => {
          set((state) => ({
            quote: {
              ...state.quote,
              patientId: patient.id,
              patient,
            },
            isDirty: true,
          }), false, 'selectPatient')

          // Load price list for patient
          get().loadPriceList(patient.id)
        },

        clearPatient: () => {
          set((state) => ({
            quote: createEmptyQuote(),
            isSingleVision: true,
            priceList: null,
            isDirty: false,
          }), false, 'clearPatient')
        },

        setInsurance: (insurance) => {
          set((state) => ({
            quote: {
              ...state.quote,
              insurance: { ...state.quote.insurance, ...insurance },
            },
            isDirty: true,
          }), false, 'setInsurance')
        },

        // Price list loading - THE SINGLE SOURCE OF TRUTH
        // PriceList contains everything: copays, allowances, eligibility, product prices
        loadPriceList: async (customerId) => {
          set({ priceListLoading: true }, false, 'loadPriceList:start')

          try {
            const response = await fetch(`/api/customers/${customerId}/price-list/active`)
            if (response.ok) {
              const data = await response.json()
              const priceList = data.priceList

              set({
                priceList: priceList || null,
                priceListLoading: false,
              }, false, 'loadPriceList:success')

              // Set insurance info from priceList (no separate authorization call needed)
              if (priceList) {
                get().setInsurance({
                  carrier: priceList.carrier?.toUpperCase() as Insurance['carrier'],
                  hasActiveAuth: true,
                  examCopay: priceList.examCopay,
                  materialCopay: priceList.materialsCopay,
                  clExamCopay: priceList.contactLens?.fittingCopay,
                  frameAllowance: priceList.frameAllowance,
                  contactAllowance: priceList.contactLens?.materialsAllowance,
                })
              }
            } else {
              set({ priceList: null, priceListLoading: false }, false, 'loadPriceList:notFound')
            }
          } catch (error) {
            console.error('Failed to load price list:', error)
            set({ priceList: null, priceListLoading: false }, false, 'loadPriceList:error')
          }
        },

        // Line item actions
        addLineItem: (item) => {
          const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          set((state) => {
            const newItems = [...(state.quote.lineItems ?? []), { ...item, id }]
            const newQuote = { ...state.quote, lineItems: newItems }
            return {
              quote: newQuote,
              isDirty: true,
            }
          }, false, 'addLineItem')

          get().recalculateTotals()
          get().debouncedSave()
        },

        updateLineItem: (id, updates) => {
          set((state) => ({
            quote: {
              ...state.quote,
              lineItems: (state.quote.lineItems ?? []).map((item) =>
                item.id === id ? { ...item, ...updates } : item
              ),
            },
            isDirty: true,
          }), false, 'updateLineItem')

          get().recalculateTotals()
          get().debouncedSave()
        },

        removeLineItem: (id) => {
          set((state) => ({
            quote: {
              ...state.quote,
              lineItems: (state.quote.lineItems ?? []).filter((item) => item.id !== id),
            },
            isDirty: true,
          }), false, 'removeLineItem')

          get().recalculateTotals()
          get().debouncedSave()
        },

        // Pair management
        addPair: (label) => {
          set((state) => {
            const pairs = state.quote.pairs ?? []
            const newPairId = Math.max(...pairs.map(p => p.id), 0) + 1
            return {
              quote: {
                ...state.quote,
                pairs: [
                  ...pairs,
                  {
                    id: newPairId,
                    label: label || `Pair ${newPairId}`,
                    coatingIds: [],
                    addOnIds: [],
                  },
                ],
                activePairId: newPairId,
              },
              isDirty: true,
            }
          }, false, 'addPair')
        },

        setActivePair: (pairId) => {
          set((state) => ({
            quote: { ...state.quote, activePairId: pairId },
          }), false, 'setActivePair')
        },

        updatePair: (pairId, updates) => {
          set((state) => ({
            quote: {
              ...state.quote,
              pairs: (state.quote.pairs ?? []).map((pair) =>
                pair.id === pairId ? { ...pair, ...updates } : pair
              ),
            },
            isDirty: true,
          }), false, 'updatePair')
        },

        removePair: (pairId) => {
          set((state) => {
            const newPairs = (state.quote.pairs ?? []).filter((p) => p.id !== pairId)
            const newLineItems = (state.quote.lineItems ?? []).filter((item) => item.pairId !== pairId)
            return {
              quote: {
                ...state.quote,
                pairs: newPairs.length > 0 ? newPairs : [{
                  id: 1,
                  label: 'Pair 1',
                  coatingIds: [],
                  addOnIds: [],
                }],
                lineItems: newLineItems,
                activePairId: newPairs[0]?.id || 1,
              },
              isDirty: true,
            }
          }, false, 'removePair')

          get().recalculateTotals()
        },

        // Discounts
        addDiscount: (discount) => {
          set((state) => ({
            quote: {
              ...state.quote,
              discounts: [...(state.quote.discounts ?? []), discount],
            },
            isDirty: true,
          }), false, 'addDiscount')

          get().recalculateTotals()
        },

        removeDiscount: (index) => {
          set((state) => ({
            quote: {
              ...state.quote,
              discounts: (state.quote.discounts ?? []).filter((_, i) => i !== index),
            },
            isDirty: true,
          }), false, 'removeDiscount')

          get().recalculateTotals()
        },

        // Notes
        setNotes: (notes) => {
          set((state) => ({
            quote: { ...state.quote, notes },
            isDirty: true,
          }), false, 'setNotes')
        },

        // Quote lifecycle
        saveQuote: async () => {
          const state = get()
          if (!state.quote.patientId || !state.isDirty) return

          set({ isSaving: true, saveError: null }, false, 'saveQuote:start')

          try {
            // Convert lineItems to API format
            const items = (state.quote.lineItems ?? []).map(item => ({
              sku: item.productId,
              displayName: item.name,
              category: item.category,
              retailPrice: item.retailPrice,
              patientPays: item.patientPays,
              insurancePays: item.insurancePays,
              quantity: item.quantity,
              tierUsed: item.tier,
              notes: item.note,
            }))

            // Calculate totals
            const retailTotal = items.reduce((sum, i) => sum + i.retailPrice * i.quantity, 0)
            const insuranceTotal = items.reduce((sum, i) => sum + i.insurancePays * i.quantity, 0)
            const patientTotal = state.quote.subtotal
            const tax = state.quote.tax
            const grandTotal = state.quote.total

            const quotePayload = {
              customerId: state.quote.patientId,
              items,
              retailTotal,
              insuranceTotal,
              patientTotal,
              tax,
              grandTotal,
              notes: state.quote.notes,
            }

            let response
            if (state.quote.id) {
              // Update existing quote
              response = await fetch(`/api/quotes/${state.quote.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  items,
                  retailTotal,
                  insuranceTotal,
                  patientTotal,
                  tax,
                  grandTotal,
                  notes: state.quote.notes,
                }),
              })
            } else {
              // Create new quote
              response = await fetch('/api/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quotePayload),
              })
            }

            if (response.ok) {
              const data = await response.json()
              set((state) => ({
                quote: {
                  ...state.quote,
                  id: data.quote?.id || state.quote.id,
                  lastSavedAt: new Date().toISOString(),
                },
                isDirty: false,
                isSaving: false,
                lastSavedAt: new Date(),
              }), false, 'saveQuote:success')
            } else {
              throw new Error('Failed to save quote')
            }
          } catch (error) {
            set({
              isSaving: false,
              saveError: error instanceof Error ? error.message : 'Save failed',
            }, false, 'saveQuote:error')
          }
        },

        loadQuote: async (quoteId) => {
          try {
            const response = await fetch(`/api/quotes/${quoteId}`)
            if (response.ok) {
              const data = await response.json()
              const apiQuote = data.quote

              // Transform API format to store format
              const lineItems: LineItem[] = (apiQuote.items || []).map((item: {
                sku: string
                displayName: string
                category: string
                retailPrice: number
                patientPays: number
                insurancePays: number
                quantity: number
                tierUsed?: string
                notes?: string
                pairId?: number
              }, index: number) => ({
                id: `loaded-${index}`,
                productId: item.sku,
                name: item.displayName,
                category: item.category,
                retailPrice: item.retailPrice,
                patientPays: item.patientPays,
                insurancePays: item.insurancePays,
                quantity: item.quantity,
                tier: item.tierUsed,
                note: item.notes,
                pairId: item.pairId || 1,
              }))

              // Build patient object from customer data
              const patient = apiQuote.customer ? {
                id: apiQuote.customer.id || apiQuote.customerId,
                firstName: apiQuote.customer.firstName,
                lastName: apiQuote.customer.lastName,
                email: apiQuote.customer.email,
                phone: apiQuote.customer.phone,
              } : null

              // Calculate totals from lineItems
              const retailTotal = lineItems.reduce((sum, i) => sum + i.retailPrice * i.quantity, 0)
              const subtotal = apiQuote.patientTotal || lineItems.reduce((sum, i) => sum + i.patientPays * i.quantity, 0)
              const insuranceSavings = retailTotal - subtotal
              const tax = apiQuote.tax || 0
              const total = apiQuote.grandTotal || (subtotal + tax)

              const transformedQuote: Quote = {
                id: apiQuote.id,
                status: apiQuote.status?.toLowerCase() || 'draft',
                patientId: apiQuote.customerId || apiQuote.customer?.id || '',
                patient,
                insurance: {
                  carrier: null,
                  hasActiveAuth: false,
                },
                pairs: [{
                  id: 1,
                  label: 'Pair 1',
                  coatingIds: [],
                  addOnIds: [],
                }],
                activePairId: 1,
                lineItems,
                notes: apiQuote.notes || '',
                discounts: [],
                subtotal,
                insuranceSavings,
                discountTotal: 0,
                tax,
                total,
                lastSavedAt: apiQuote.updatedAt || apiQuote.createdAt,
              }

              set({
                quote: transformedQuote,
                isDirty: false,
                lastSavedAt: new Date(apiQuote.updatedAt || apiQuote.createdAt),
              }, false, 'loadQuote:success')

              if (transformedQuote.patientId) {
                get().loadPriceList(transformedQuote.patientId)
              }
            }
          } catch (error) {
            console.error('Failed to load quote:', error)
          }
        },

        newQuote: () => {
          set({
            quote: createEmptyQuote(),
            isSingleVision: true,
            priceList: null,
            isDirty: false,
            lastSavedAt: null,
            activeMenu: 'exam',
          }, false, 'newQuote')
        },

        // Tier management
        setCurrentTier: (tier) => {
          set((state) => ({
            quote: {
              ...state.quote,
              insurance: { ...state.quote.insurance, currentTier: tier },
            },
          }), false, 'setCurrentTier')
        },

        // Single vision tracking (recalculates material prices when changed)
        setIsSingleVision: (isSV) => {
          const state = get()
          if (state.isSingleVision === isSV) return // No change

          set({ isSingleVision: isSV }, false, 'setIsSingleVision')

          // Recalculate material line items if price list exists
          if (state.priceList && state.quote.insurance.hasActiveAuth) {
            const lineItems = state.quote.lineItems ?? []
            const materialItems = lineItems.filter(
              item => item.category === 'lens_material' && item.pairId === state.quote.activePairId
            )

            // Update each material item with new pricing
            for (const item of materialItems) {
              const priceData = state.priceList.prices[item.productId]
              if (priceData && typeof priceData === 'object') {
                const prices = priceData as Record<string, number>
                const newPrice = isSV ? (prices.sv ?? item.patientPays) : (prices.mf ?? item.patientPays)
                const insurancePays = Math.max(0, item.retailPrice - newPrice)

                get().updateLineItem(item.id, {
                  patientPays: newPrice,
                  insurancePays,
                })
              }
            }
          }
        },

        // Helpers
        getLineItemsForPair: (pairId) => {
          return (get().quote.lineItems ?? []).filter((item) => item.pairId === pairId)
        },

        recalculateTotals: () => {
          set((state) => {
            const lineItems = state.quote.lineItems ?? []
            const discounts = state.quote.discounts ?? []
            const pairs = state.quote.pairs ?? []

            // Group items by pair to calculate pair totals
            const pairTotals = new Map<number, number>()
            for (const item of lineItems) {
              const current = pairTotals.get(item.pairId) || 0
              pairTotals.set(item.pairId, current + item.patientPays * item.quantity)
            }

            // Sort pairs by total (highest first) to apply discount to cheaper pair
            const sortedPairs = Array.from(pairTotals.entries())
              .sort((a, b) => b[1] - a[1])

            // Calculate second pair discount (20% off second pair)
            let secondPairDiscount = 0
            if (sortedPairs.length >= 2 && pairs.length >= 2) {
              // Second highest pair gets 20% discount
              secondPairDiscount = sortedPairs[1][1] * 0.20
            }

            const subtotal = lineItems.reduce(
              (sum, item) => sum + item.patientPays * item.quantity,
              0
            )

            const insuranceSavings = lineItems.reduce(
              (sum, item) => sum + item.insurancePays * item.quantity,
              0
            )

            // Calculate manual discounts
            let manualDiscountTotal = 0
            for (const discount of discounts) {
              if (discount.type === 'percent') {
                manualDiscountTotal += subtotal * (discount.amount / 100)
              } else {
                manualDiscountTotal += discount.amount
              }
            }

            // Total discount includes second pair discount
            const discountTotal = manualDiscountTotal + secondPairDiscount

            const afterDiscount = subtotal - discountTotal
            const tax = afterDiscount * 0.0875 // 8.75% tax
            const total = afterDiscount + tax

            return {
              quote: {
                ...state.quote,
                subtotal,
                insuranceSavings,
                discountTotal,
                tax,
                total,
              },
            }
          }, false, 'recalculateTotals')
        },

        // Benefit type helpers - detect CL vs Glasses items in order
        // Glasses categories: lens_type, lens_material, ar_coating, photochromic, addon, mount, frame
        // Contact categories: contact_lens
        hasGlassesItems: () => {
          const lineItems = get().quote.lineItems ?? []
          const glassesCategories = ['lens_type', 'lens_material', 'ar_coating', 'photochromic', 'addon', 'mount', 'frame']
          return lineItems.some(item => glassesCategories.includes(item.category))
        },

        hasContactItems: () => {
          const lineItems = get().quote.lineItems ?? []
          return lineItems.some(item => item.category === 'contact_lens')
        },

        getActiveBenefitType: () => {
          const hasGlasses = get().hasGlassesItems()
          const hasContacts = get().hasContactItems()
          if (hasGlasses && hasContacts) return 'both'
          if (hasGlasses) return 'glasses'
          if (hasContacts) return 'contacts'
          return 'none'
        },

        // Internal: debounced save (will be called after changes)
        debouncedSave: (() => {
          let timeoutId: NodeJS.Timeout | null = null
          return () => {
            if (timeoutId) clearTimeout(timeoutId)
            timeoutId = setTimeout(() => {
              get().saveQuote()
            }, 300) // 300ms debounce
          }
        })(),
      }),
      {
        name: 'pos-quote-storage',
        partialize: (state) => ({
          quote: state.quote,
          activeMenu: state.activeMenu,
        }),
        // Merge persisted state with defaults to handle old data missing new fields
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<POSState> | undefined
          if (!persisted) return currentState

          // Ensure quote has all required arrays
          const quote = persisted.quote ? {
            ...createEmptyQuote(),
            ...persisted.quote,
            pairs: persisted.quote.pairs ?? createEmptyQuote().pairs,
            lineItems: persisted.quote.lineItems ?? [],
            discounts: persisted.quote.discounts ?? [],
          } : createEmptyQuote()

          // Derive isSingleVision from existing lens type in quote
          // Single vision lens IDs: 'sv', 'neurolens_sv'
          const lineItems = quote.lineItems ?? []
          const lensTypeItem = lineItems.find(item => item.category === 'lens_type')
          const isSingleVision = !lensTypeItem || ['sv', 'neurolens_sv'].includes(lensTypeItem.productId)

          return {
            ...currentState,
            ...persisted,
            quote,
            isSingleVision,
          }
        },
      }
    ),
    { name: 'pos-store' }
  )
)
