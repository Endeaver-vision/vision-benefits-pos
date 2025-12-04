'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Shield, Loader2, AlertCircle } from 'lucide-react'
import { useQuoteStore } from '@/store/quote-store'
import { useQuotePricingContext } from '@/contexts/quote-pricing-context'
import { useExamServices } from '@/hooks/use-exam-services'

interface ExamServicesLayerProps {
  onNext?: () => void
  onBack?: () => void
}

export default function ExamServicesLayer({ onNext, onBack }: ExamServicesLayerProps) {
  const { quote, updateExam, resetQuote } = useQuoteStore()
  const { 
    addItem, 
    removeItem, 
    clearItemsByCategory, 
    pricedItems, 
    authorization, 
    isCalculating,
    customerId,
  } = useQuotePricingContext()

  // Fetch services from database with insurance pricing
  const { 
    mainExams,
    addOnServices, 
    clFittings,
    hasInsurance, 
    carrier, 
    loading: servicesLoading, 
    error: servicesError,
    getServiceBySku,
  } = useExamServices({ customerId, enabled: true })

  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Initialize from existing selections
  const existingExamItems = pricedItems.filter(item => item.category === 'exam')
  const existingExamSkus = existingExamItems.map(item => item.sku)
  const initialServices = existingExamSkus.length > 0 ? existingExamSkus : (quote.exam.selectedServices || [])

  // State for selections - track by SKU
  const [selectedMainExamSku, setSelectedMainExamSku] = useState<string | null>(() => {
    // Find if any of the initial services match a main exam
    for (const sku of initialServices) {
      if (mainExams.find(e => e.sku === sku)) {
        return sku
      }
    }
    return null
  })

  const [selectedAddOnSkus, setSelectedAddOnSkus] = useState<string[]>(() => {
    return initialServices.filter(sku => addOnServices.find(a => a.sku === sku))
  })

  const [selectedCLFittingSku, setSelectedCLFittingSku] = useState<string | null>(() => {
    for (const sku of initialServices) {
      if (clFittings.find(f => f.sku === sku)) {
        return sku
      }
    }
    return null
  })

  // Track if we've done initial sync
  const [hasSynced, setHasSynced] = useState(false)

  // Sync exam selections to pricing context
  const syncToPricingContext = useCallback((examSku: string | null, addOnSkus: string[], clFitSku: string | null) => {
    // Clear existing exam items first
    clearItemsByCategory('exam')

    // Add main exam
    if (examSku) {
      const examDef = getServiceBySku(examSku)
      if (examDef) {
        addItem({
          sku: examDef.sku,
          displayName: examDef.name,
          category: 'exam',
          retailPrice: examDef.retailPrice,
          quantity: 1
        })
      }
    }

    // Add add-ons
    addOnSkus.forEach(sku => {
      const addOnDef = getServiceBySku(sku)
      if (addOnDef) {
        addItem({
          sku: addOnDef.sku,
          displayName: addOnDef.name,
          category: 'exam',
          retailPrice: addOnDef.retailPrice,
          quantity: 1
        })
      }
    })

    // Add contact lens fitting
    if (clFitSku) {
      const clDef = getServiceBySku(clFitSku)
      if (clDef) {
        addItem({
          sku: clDef.sku,
          displayName: clDef.name,
          category: 'exam',
          retailPrice: clDef.retailPrice,
          quantity: 1
        })
      }
    }
  }, [clearItemsByCategory, addItem, getServiceBySku])

  // Update both Zustand store and pricing context
  const updateStore = useCallback((examSku: string | null, addOnSkus: string[], clFitSku: string | null) => {
    const allServices = [
      ...(examSku ? [examSku] : []),
      ...addOnSkus,
      ...(clFitSku ? [clFitSku] : [])
    ]
    // Update Zustand store (for persistence)
    updateExam({ selectedServices: allServices })
    // Sync to pricing context (for review layer)
    syncToPricingContext(examSku, addOnSkus, clFitSku)
  }, [updateExam, syncToPricingContext])

  // Sync existing selections to pricing context on mount (after services load)
  useEffect(() => {
    if (!hasSynced && !servicesLoading && mainExams.length > 0) {
      // Try to re-match any existing selections with new SKUs
      if (selectedMainExamSku || selectedAddOnSkus.length > 0 || selectedCLFittingSku) {
        syncToPricingContext(selectedMainExamSku, selectedAddOnSkus, selectedCLFittingSku)
      }
      setHasSynced(true)
    }
  }, [hasSynced, servicesLoading, mainExams.length, selectedMainExamSku, selectedAddOnSkus, selectedCLFittingSku, syncToPricingContext])

  // Update selections when services load (match old fake SKUs to new real SKUs)
  useEffect(() => {
    if (!servicesLoading && mainExams.length > 0 && !hasSynced) {
      // Check if we have old-style SKUs that need to be migrated
      const hasOldSkus = initialServices.some(sku => 
        sku === 'routine' || sku === 'medical' || 
        sku.startsWith('cl-') || !sku.startsWith('SVC-')
      )
      
      if (hasOldSkus) {
        // Try to find matching services for old SKUs
        let newMainExam: string | null = null
        const newAddOns: string[] = []
        let newCLFitting: string | null = null

        for (const oldSku of initialServices) {
          if (oldSku === 'routine') {
            const match = mainExams.find(e => e.name.toLowerCase().includes('routine'))
            if (match) newMainExam = match.sku
          } else if (oldSku === 'medical') {
            const match = mainExams.find(e => e.name.toLowerCase().includes('medical'))
            if (match) newMainExam = match.sku
          } else if (oldSku.startsWith('cl-')) {
            const nameMatch = oldSku.replace('cl-', '')
            const match = clFittings.find(f => f.name.toLowerCase().includes(nameMatch))
            if (match) newCLFitting = match.sku
          } else {
            // Try to match add-on by name
            const match = addOnServices.find(a => 
              a.name.toLowerCase().includes(oldSku.toLowerCase().replace(/-/g, ' '))
            )
            if (match) newAddOns.push(match.sku)
          }
        }

        if (newMainExam || newAddOns.length > 0 || newCLFitting) {
          setSelectedMainExamSku(newMainExam)
          setSelectedAddOnSkus(newAddOns)
          setSelectedCLFittingSku(newCLFitting)
        }
      }
    }
  }, [servicesLoading, mainExams, addOnServices, clFittings, initialServices, hasSynced])

  const handleMainExamChange = (sku: string) => {
    const newSku = selectedMainExamSku === sku ? null : sku
    setSelectedMainExamSku(newSku)
    updateStore(newSku, selectedAddOnSkus, selectedCLFittingSku)
  }

  const handleAddOnToggle = (sku: string) => {
    const newAddOns = selectedAddOnSkus.includes(sku)
      ? selectedAddOnSkus.filter(s => s !== sku)
      : [...selectedAddOnSkus, sku]
    setSelectedAddOnSkus(newAddOns)
    updateStore(selectedMainExamSku, newAddOns, selectedCLFittingSku)
  }

  const handleCLFittingChange = (sku: string) => {
    const newCL = selectedCLFittingSku === sku ? null : sku
    setSelectedCLFittingSku(newCL)
    updateStore(selectedMainExamSku, selectedAddOnSkus, newCL)
  }

  // Calculate totals from the priced services
  const calculateTotal = useMemo(() => {
    let retail = 0
    let patient = 0
    let insurance = 0

    if (selectedMainExamSku) {
      const exam = getServiceBySku(selectedMainExamSku)
      if (exam) {
        retail += exam.retailPrice
        patient += exam.patientPays
        insurance += exam.insurancePays
      }
    }

    selectedAddOnSkus.forEach(sku => {
      const addOn = getServiceBySku(sku)
      if (addOn) {
        retail += addOn.retailPrice
        patient += addOn.patientPays
        insurance += addOn.insurancePays
      }
    })

    if (selectedCLFittingSku) {
      const clFit = getServiceBySku(selectedCLFittingSku)
      if (clFit) {
        retail += clFit.retailPrice
        patient += clFit.patientPays
        insurance += clFit.insurancePays
      }
    }

    return { retail, patient, insurance, savings: retail - patient }
  }, [selectedMainExamSku, selectedAddOnSkus, selectedCLFittingSku, getServiceBySku])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  // Show loading state
  if (servicesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        <span className="ml-3 text-white/70">Loading services...</span>
      </div>
    )
  }

  // Show error state
  if (servicesError) {
    return (
      <Card className="glass-card border-red-400/50 bg-red-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="h-6 w-6" />
            <span>Failed to load services: {servicesError}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Reset Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowResetConfirm(true)}
          variant="outline"
          className="text-red-400 border-red-400/50 hover:bg-red-500/20"
        >
          Reset Quote
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <Card className="border-red-400/50 bg-red-500/20 glass-card">
          <CardContent className="p-4">
            <div className="space-y-3">
              <p className="font-semibold text-white">Are you sure you want to reset this quote?</p>
              <p className="text-sm text-white/70">All selections will be cleared and cannot be recovered.</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowResetConfirm(false)}
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    resetQuote()
                    setSelectedMainExamSku(null)
                    setSelectedAddOnSkus([])
                    setSelectedCLFittingSku(null)
                    setShowResetConfirm(false)
                  }}
                  variant="destructive"
                  size="sm"
                >
                  Yes, Reset Quote
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insurance Banner */}
      {hasInsurance && carrier && (
        <Card className="glass-card border-emerald-400/50 bg-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-emerald-400" />
              <div>
                <div className="font-semibold text-emerald-400">{carrier.toUpperCase()} Insurance Applied</div>
                <div className="text-sm text-emerald-300/70">Copays will be calculated automatically</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam Services - Choose One */}
      <Card className="glass-card border-white/20">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center justify-between">
            <span>Exam Services (Choose One)</span>
            {hasInsurance && authorization?.examCopay !== null && authorization?.examCopay !== undefined && (
              <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/50">
                <Shield className="h-3 w-3 mr-1" />
                ${authorization.examCopay} Copay
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mainExams.length === 0 ? (
            <div className="text-white/60 text-sm">No exam services available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mainExams.map((exam) => {
                const isSelected = selectedMainExamSku === exam.sku
                const hasInsurancePricing = exam.insurancePays > 0
                
                return (
                  <button
                    key={exam.sku}
                    onClick={() => handleMainExamChange(exam.sku)}
                    className={`relative p-6 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-400 bg-blue-500/30'
                        : 'border-white/20 hover:border-white/40 bg-white/10'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-blue-500 rounded-full p-1">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="text-xl font-semibold mb-2 text-white">{exam.name}</div>
                    {hasInsurancePricing ? (
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          {formatPrice(exam.retailPrice)}
                        </div>
                        <div className="text-2xl font-bold text-emerald-400">
                          {formatPrice(exam.patientPays)}
                        </div>
                        <div className="text-xs text-emerald-300">
                          Insurance pays {formatPrice(exam.insurancePays)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-blue-400">
                        {formatPrice(exam.retailPrice)}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exam Add-ons - Multiple Selection */}
      {selectedMainExamSku && addOnServices.length > 0 && (
        <Card className="glass-card border-white/20">
          <CardHeader>
            <CardTitle className="text-lg text-white">Exam Add-ons (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {addOnServices.map((addOn) => {
                const isSelected = selectedAddOnSkus.includes(addOn.sku)
                const hasInsurancePricing = addOn.insurancePays > 0
                
                return (
                  <button
                    key={addOn.sku}
                    onClick={() => handleAddOnToggle(addOn.sku)}
                    className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/30'
                        : 'border-white/20 hover:border-white/40 bg-white/10'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-emerald-500 rounded-full p-1">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="font-semibold mb-1 pr-6 text-white">{addOn.name}</div>
                    {hasInsurancePricing ? (
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          {formatPrice(addOn.retailPrice)}
                        </div>
                        <div className="text-lg font-bold text-emerald-400">
                          {formatPrice(addOn.patientPays)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-emerald-400">
                        {formatPrice(addOn.retailPrice)}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Lens Fitting - Choose One */}
      {selectedMainExamSku && clFittings.length > 0 && (
        <Card className="glass-card border-white/20">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center justify-between">
              <span>Contact Lens Fitting (Optional - Choose One)</span>
              {hasInsurance && authorization?.contactFittingCovered && (
                <Badge className="bg-purple-500/30 text-purple-300 border-purple-400/50">
                  <Shield className="h-3 w-3 mr-1" />
                  Covered
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {clFittings.map((clFit) => {
                const isSelected = selectedCLFittingSku === clFit.sku
                const hasInsurancePricing = clFit.insurancePays > 0

                return (
                  <button
                    key={clFit.sku}
                    onClick={() => handleCLFittingChange(clFit.sku)}
                    className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-purple-400 bg-purple-500/30'
                        : 'border-white/20 hover:border-white/40 bg-white/10'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-purple-500 rounded-full p-1">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="font-semibold mb-1 pr-6 text-white">{clFit.name}</div>
                    {hasInsurancePricing ? (
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          {formatPrice(clFit.retailPrice)}
                        </div>
                        <div className="text-lg font-bold text-emerald-400">
                          {clFit.patientPays === 0 ? 'Covered' : formatPrice(clFit.patientPays)}
                        </div>
                        <div className="text-xs text-emerald-300">
                          Insurance saves {formatPrice(clFit.insurancePays)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-purple-400">
                        {formatPrice(clFit.retailPrice)}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total and Navigation */}
      {selectedMainExamSku && (
        <Card className="glass-card border-white/20 bg-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                {calculateTotal.insurance > 0 ? (
                  <>
                    <div className="text-sm text-white/70 mb-1">Retail Total</div>
                    <div className="text-xl text-white/60 line-through">{formatPrice(calculateTotal.retail)}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <div>
                        <div className="text-sm text-emerald-400">Insurance pays</div>
                        <div className="text-lg font-semibold text-emerald-400">
                          {formatPrice(calculateTotal.insurance)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-amber-400">You pay</div>
                        <div className="text-3xl font-bold text-amber-400">
                          {isCalculating ? (
                            <Loader2 className="h-6 w-6 animate-spin inline" />
                          ) : (
                            formatPrice(calculateTotal.patient)
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-white/70 mb-1">Exam Services Total</div>
                    <div className="text-3xl font-bold text-white">{formatPrice(calculateTotal.retail)}</div>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                {onBack && (
                  <Button
                    onClick={onBack}
                    variant="outline"
                    size="lg"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Back
                  </Button>
                )}
                {onNext && selectedMainExamSku && (
                  <Button
                    onClick={onNext}
                    size="lg"
                    className="chip-blue"
                  >
                    Continue to Eyeglasses
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
