'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePOSStore } from '@/stores/pos-store'
import { useCurrentPatient } from '@/hooks/useCurrentPatient'
import POSLayout from '@/components/pos/POSLayout'
import PatientBanner from '@/components/pos/PatientBanner'
import NavigationColumn from '@/components/pos/NavigationColumn'
import ProductArea from '@/components/pos/ProductArea'
import OrderSummary from '@/components/pos/OrderSummary'
import ActionsColumn from '@/components/pos/ActionsColumn'

/**
 * Point of Sale Page
 *
 * Phase 1 implementation with 4-column iPad-optimized layout:
 * - Navigation (80px): Menu buttons for product categories
 * - Products (flex): Scrollable product grid with search
 * - Order Summary (320px): Running totals and line items
 * - Actions (80px): Hold, print, checkout buttons
 *
 * Features:
 * - Patient banner persists across menu changes
 * - Auto-save with 300ms debounce
 * - Touch-friendly 44x44pt minimum tap targets
 * - Real-time price calculations
 *
 * URL Params:
 * - customerId: Pre-select a customer when navigating from profile
 */
export default function POSPage() {
  return (
    <Suspense fallback={<POSLoadingFallback />}>
      <POSPageContent />
    </Suspense>
  )
}

function POSLoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white/60">Loading POS...</div>
    </div>
  )
}

function POSPageContent() {
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customerId')
  const { quote, priceList, debouncedSave, isDirty, selectPatient, setInsurance, loadPriceList } = usePOSStore()
  const { setCurrentPatient } = useCurrentPatient()

  // Load customer from URL param if provided
  // Always load if customerId differs from current patient
  useEffect(() => {
    if (customerId && customerId !== quote.patientId) {
      // Fetch customer data and select them
      fetch(`/api/customers/${customerId}`)
        .then((res) => res.json())
        .then((response) => {
          const customer = response.data
          if (customer && customer.id) {
            // Clear existing quote first if switching patients
            if (quote.patientId && quote.patientId !== customer.id) {
              usePOSStore.getState().newQuote()
            }

            selectPatient({
              id: customer.id,
              firstName: customer.firstName,
              lastName: customer.lastName,
              dob: customer.dateOfBirth,
              email: customer.email,
              phone: customer.phone,
            })
            // Persist current patient for cross-page navigation
            setCurrentPatient({
              id: customer.id,
              firstName: customer.firstName,
              lastName: customer.lastName,
            })
            // Also load their insurance if available
            if (customer.authorizations?.[0]) {
              const auth = customer.authorizations[0]
              setInsurance({
                carrier: auth.carrier,
                memberId: auth.memberId,
                authNumber: auth.authorizationNumber,
                hasActiveAuth: auth.isActive,
                effectiveDate: auth.effectiveDate,
                expirationDate: auth.expirationDate,
                examCopay: Number(auth.examCopay) || 0,
                materialCopay: Number(auth.materialsCopay) || 0,
                clExamCopay: auth.clExamCopay ? Number(auth.clExamCopay) : undefined,
                frameAllowance: Number(auth.frameAllowance) || 0,
                contactAllowance: Number(auth.contactAllowance) || 0,
              })
            }
          }
        })
        .catch(console.error)
    }
  }, [customerId, quote.patientId, selectPatient, setInsurance])

  // Sync current patient with global context when quote has patient
  useEffect(() => {
    if (quote.patient) {
      setCurrentPatient({
        id: quote.patient.id,
        firstName: quote.patient.firstName,
        lastName: quote.patient.lastName,
      })
    }
  }, [quote.patient, setCurrentPatient])

  // Load price list on mount if patient exists but priceList wasn't loaded
  // (handles case where quote was persisted but priceList wasn't)
  useEffect(() => {
    if (quote.patientId && !priceList) {
      loadPriceList(quote.patientId)
    }
  }, [quote.patientId, priceList, loadPriceList])

  // Auto-save when quote changes
  useEffect(() => {
    if (isDirty && quote.patient) {
      debouncedSave()
    }
  }, [isDirty, quote, debouncedSave])

  return (
    <POSLayout
      patientBanner={<PatientBanner />}
      navigation={<NavigationColumn />}
      productArea={<ProductArea />}
      orderSummary={<OrderSummary />}
      actions={<ActionsColumn />}
    />
  )
}
