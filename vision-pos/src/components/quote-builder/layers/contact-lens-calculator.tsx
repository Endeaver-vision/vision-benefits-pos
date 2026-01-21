'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Check,
  Plus,
  Minus,
  Eye,
  Calculator,
  DollarSign,
  Search,
  CheckCircle,
  XCircle,
  Package,
  Shield,
  Loader2,
  ChevronDown,
  ChevronUp,
  Edit2
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useQuotePricingContext } from '@/contexts/quote-pricing-context'
import {
  calculateAnnualSupplyThreshold,
  calculateBoxesPerEye,
  getModalityFromLens,
} from '@/lib/contact-lens-utils'

// API pricing result type
interface ContactLensPricingResult {
  lensId: string
  lensName: string
  manufacturer: string
  modality: string
  boxSize: number
  boxesRight: number
  boxesLeft: number
  totalBoxes: number
  pricePerBox: number
  retailSubtotal: number
  meetsAnnualSupply: boolean
  annualSupplyThreshold: number
  annualSupplyDiscount: number
  subtotalAfterDiscount: number
  hasInsurance: boolean
  carrier: string | null
  insuranceAllowance: number
  insuranceApplied: number
  subtotalAfterInsurance: number
  rebateAmount: number
  rebateApplied: number
  patientTotal: number
  totalSavings: number
  costPerBox: number
  breakdown: {
    label: string
    amount: number
    type: 'addition' | 'subtraction' | 'total'
  }[]
}

interface ContactLens {
  id: string
  manufacturer: string
  lensName: string
  boxSize: number
  retailPrice: number
  officePrice: number | null
  annualSupplyBothEyes: number | null
  annualSupplyPerEye: number | null
  modality: string | null
  isAstigmatism: boolean
  isMultifocal: boolean
  isColor: boolean
  isDaily: boolean
  isWeekly: boolean
  isMonthly: boolean
}

interface ContactLensCalculatorProps {
  className?: string
  onNext?: () => void
  onBack?: () => void
}

export function ContactLensCalculator({ className, onNext, onBack }: ContactLensCalculatorProps) {
  // Get insurance context and selected items
  const {
    customerId,
    authorization,
    updateContactLenses,
    selectedItems,
    materialsConflict,
    usesMaterialsAllowance,
    contactLensSelections,
    updateContactLensSelections,
  } = useQuotePricingContext()

  // State
  const [lenses, setLenses] = useState<ContactLens[]>([])
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLensSelectionExpanded, setIsLensSelectionExpanded] = useState(true)

  // Selection state - initialized from context (selectedLens restored when lenses load)
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>(contactLensSelections.manufacturer)
  const [selectedLens, setSelectedLens] = useState<ContactLens | null>(null)
  const [pendingLensId, setPendingLensId] = useState<string | null>(
    contactLensSelections.selectedLens?.id || null
  )
  const [rightEyeBoxes, setRightEyeBoxes] = useState(contactLensSelections.boxesRight)
  const [leftEyeBoxes, setLeftEyeBoxes] = useState(contactLensSelections.boxesLeft)
  const [rebateAmount, setRebateAmount] = useState(0)

  // API pricing state
  const [apiPricing, setApiPricing] = useState<ContactLensPricingResult | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingError, setPricingError] = useState<string | null>(null)

  // Sync selections to context whenever they change
  useEffect(() => {
    updateContactLensSelections({
      manufacturer: selectedManufacturer,
      selectedLens: selectedLens ? {
        id: selectedLens.id,
        name: selectedLens.lensName,
        manufacturer: selectedLens.manufacturer,
        pricePerBox: selectedLens.retailPrice,
      } : null,
      boxesRight: rightEyeBoxes,
      boxesLeft: leftEyeBoxes,
    })
  }, [selectedManufacturer, selectedLens, rightEyeBoxes, leftEyeBoxes, updateContactLensSelections])

  // Check if contacts benefit is getting the insurance allowance
  // This uses the automatic conflict detection system
  const isContactsInsured = usesMaterialsAllowance('contacts')

  // Check for declining balance either/or restriction
  const isDecliningBalance = authorization?.benefitStructure === 'DECLINING_BALANCE'
  const hasEitherOrRestriction = authorization?.eitherOrRestriction || authorization?.decliningBalance?.eitherOrRestriction

  // Check if glasses are already in the quote (for either/or warning)
  const hasGlassesInQuote = useMemo(() => {
    return Array.from(selectedItems.values()).some(
      item => item.category === 'frame' || item.category === 'lens' || item.category === 'coating'
    )
  }, [selectedItems])

  // Show retail-only mode banner ONLY when there's a conflict AND glasses is active
  // This means the user has both glasses and contacts in the quote, and chose glasses for the allowance
  const showRetailOnlyBanner = materialsConflict.hasConflict && materialsConflict.activeBenefit === 'glasses'

  // Show either/or warning for declining balance plans when glasses are already selected
  const showEitherOrWarning = isDecliningBalance && hasEitherOrRestriction && hasGlassesInQuote && materialsConflict.activeBenefit === 'glasses'

  // Load contact lenses from API
  useEffect(() => {
    const fetchLenses = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedManufacturer) {
          params.set('manufacturer', selectedManufacturer)
        }
        if (searchQuery) {
          params.set('search', searchQuery)
        }

        const response = await fetch(`/api/contact-lenses?${params.toString()}`)
        const result = await response.json()

        if (result.success) {
          setLenses(result.data)
          if (!selectedManufacturer && result.manufacturers) {
            setManufacturers(result.manufacturers)
          }
        }
      } catch (error) {
        console.error('Failed to load contact lenses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLenses()
  }, [selectedManufacturer, searchQuery])

  // Restore selected lens from context when lenses load
  useEffect(() => {
    if (pendingLensId && lenses.length > 0 && !selectedLens) {
      const lens = lenses.find(l => l.id === pendingLensId)
      if (lens) {
        setSelectedLens(lens)
        setPendingLensId(null)
      }
    }
  }, [lenses, pendingLensId, selectedLens])

  // Fetch pricing from API when selection changes
  const fetchPricing = useCallback(async () => {
    if (!selectedLens || !customerId) {
      setApiPricing(null)
      return
    }

    const totalBoxes = rightEyeBoxes + leftEyeBoxes
    if (totalBoxes <= 0) {
      setApiPricing(null)
      return
    }

    setPricingLoading(true)
    setPricingError(null)

    try {
      const response = await fetch('/api/pricing/contact-lenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          lensId: selectedLens.id,
          boxesRight: rightEyeBoxes,
          boxesLeft: leftEyeBoxes,
          rebateAmount,
          useInsurance: isContactsInsured, // Only apply insurance if contacts benefit is active
        }),
      })

      const data = await response.json()

      if (data.success && data.pricing) {
        setApiPricing(data.pricing)
      } else {
        setPricingError(data.error || 'Failed to calculate pricing')
        setApiPricing(null)
      }
    } catch (error) {
      console.error('Pricing API error:', error)
      setPricingError('Failed to connect to pricing service')
      setApiPricing(null)
    } finally {
      setPricingLoading(false)
    }
  }, [selectedLens, customerId, rightEyeBoxes, leftEyeBoxes, rebateAmount, isContactsInsured])

  // Debounced API call when inputs change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPricing()
    }, 300) // Debounce to avoid too many API calls

    return () => clearTimeout(timeoutId)
  }, [fetchPricing])

  // Filter lenses by manufacturer
  const filteredLenses = useMemo(() => {
    if (!selectedManufacturer) return []
    return lenses.filter(l => l.manufacturer === selectedManufacturer)
  }, [lenses, selectedManufacturer])

  // Group lenses by name (different box sizes)
  const groupedLenses = useMemo(() => {
    const groups: Record<string, ContactLens[]> = {}
    filteredLenses.forEach(lens => {
      if (!groups[lens.lensName]) {
        groups[lens.lensName] = []
      }
      groups[lens.lensName].push(lens)
    })
    // Sort each group by box size descending
    Object.values(groups).forEach(group => {
      group.sort((a, b) => b.boxSize - a.boxSize)
    })
    return groups
  }, [filteredLenses])

  // Calculation derived from API pricing (for backward compatibility with UI)
  const calculation = useMemo(() => {
    if (!apiPricing) {
      return {
        totalBoxes: rightEyeBoxes + leftEyeBoxes,
        retailPrice: selectedLens ? (selectedLens.retailPrice * (rightEyeBoxes + leftEyeBoxes)) : 0,
        meetsAnnualThreshold: false,
        annualDiscount: 0,
        subtotal: 0,
        insuranceCredit: 0,
        rebate: 0,
        finalCost: 0,
        costPerBox: 0,
      }
    }

    return {
      totalBoxes: apiPricing.totalBoxes,
      retailPrice: apiPricing.retailSubtotal,
      meetsAnnualThreshold: apiPricing.meetsAnnualSupply,
      annualDiscount: apiPricing.annualSupplyDiscount,
      subtotal: apiPricing.subtotalAfterDiscount,
      insuranceCredit: apiPricing.insuranceApplied,
      rebate: apiPricing.rebateApplied,
      finalCost: apiPricing.patientTotal,
      costPerBox: apiPricing.costPerBox,
    }
  }, [apiPricing, selectedLens, rightEyeBoxes, leftEyeBoxes])

  // Update context when API pricing changes
  useEffect(() => {
    if (selectedLens && apiPricing) {
      updateContactLenses({
        enabled: true,
        lensName: apiPricing.lensName,
        manufacturer: apiPricing.manufacturer,
        boxesRight: apiPricing.boxesRight,
        boxesLeft: apiPricing.boxesLeft,
        pricePerBox: apiPricing.pricePerBox,
        subtotal: apiPricing.retailSubtotal,
        meetsAnnualSupply: apiPricing.meetsAnnualSupply,
        annualSupplyDiscount: apiPricing.annualSupplyDiscount,
        insuranceCredit: apiPricing.insuranceApplied,
        rebate: apiPricing.rebateApplied,
        totalDue: apiPricing.patientTotal,
      })
    } else if (!selectedLens) {
      updateContactLenses({
        enabled: false,
        lensName: '',
        manufacturer: '',
        boxesRight: 0,
        boxesLeft: 0,
        pricePerBox: 0,
        subtotal: 0,
        meetsAnnualSupply: false,
        annualSupplyDiscount: 0,
        insuranceCredit: 0,
        rebate: 0,
        totalDue: 0,
      })
    }
  }, [selectedLens, apiPricing, updateContactLenses])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  const getLensTypeLabel = (lens: ContactLens) => {
    const types = []
    if (lens.isAstigmatism) types.push('Toric')
    if (lens.isMultifocal) types.push('Multifocal')
    if (lens.isColor) types.push('Color')
    if (lens.isDaily) types.push('Daily')
    if (lens.isWeekly) {
      // Check modality string to distinguish weekly vs bi-weekly
      types.push(lens.modality === 'weekly' ? 'Weekly' : 'Bi-Weekly')
    }
    if (lens.isMonthly) types.push('Monthly')
    return types.join(' • ') || 'Standard'
  }

  // Get annual supply threshold using hybrid calculation
  // Prefers API value > DB override > dynamic formula
  const getAnnualSupplyThreshold = (lens: ContactLens | null) => {
    // Prefer API pricing threshold if available (most accurate, server-calculated)
    if (apiPricing?.annualSupplyThreshold) {
      return apiPricing.annualSupplyThreshold
    }
    // Use hybrid calculation: DB override or dynamic formula
    if (!lens) return 8
    const modality = getModalityFromLens(lens)
    return calculateAnnualSupplyThreshold(modality, lens.boxSize, lens.annualSupplyBothEyes)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Either/Or Warning - Declining balance plans where glasses already selected */}
      {showEitherOrWarning && (
        <Alert className="bg-amber-500/20 border-amber-400/50">
          <Shield className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200">
            <strong className="text-amber-300">Declining Balance Plan - Glasses OR Contacts:</strong> This plan only allows <span className="font-semibold">one benefit</span> to be used.
            You have already selected eyeglasses materials which are using the insurance allowance.
            To use contact lenses with insurance, you must remove all eyeglasses from your quote first.
          </AlertDescription>
        </Alert>
      )}

      {/* Retail-Only Mode Banner - When glasses benefit is using the allowance */}
      {showRetailOnlyBanner && !showEitherOrWarning && (
        <Alert className="bg-blue-500/20 border-blue-400/50">
          <Shield className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-200">
            <strong className="text-blue-300">Retail Pricing Mode:</strong> Your insurance allowance is being applied to <span className="font-semibold">Eyeglasses</span>.
            Contact lens materials will be priced at <span className="font-semibold">retail</span>. You can switch the benefit in the conflict banner above.
          </AlertDescription>
        </Alert>
      )}

      {/* Insurance Mode Banner - When contacts benefit is getting the allowance */}
      {isContactsInsured && authorization && (
        <Alert className="bg-emerald-500/20 border-emerald-400/50">
          <Shield className="h-4 w-4 text-emerald-400" />
          <AlertDescription className="text-emerald-200">
            <strong className="text-emerald-300">Insurance Active:</strong> {authorization.carrier} coverage applies to contact lenses.
            {authorization.contactAllowance && ` Allowance: $${authorization.contactAllowance}`}
            {authorization.contactFittingCopay !== null && authorization.contactFittingCopay !== undefined && ` • Fitting Copay: $${authorization.contactFittingCopay}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Manufacturer Selection */}
      <Card className="glass-card border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Package className="h-5 w-5" />
            Step 1: Select Manufacturer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {manufacturers.map(mfr => (
              <button
                key={mfr}
                onClick={() => {
                  setSelectedManufacturer(mfr)
                  setSelectedLens(null)
                }}
                className={`
                  p-4 rounded-xl border-2 transition-all text-center
                  ${selectedManufacturer === mfr
                    ? 'border-blue-400 bg-blue-500/30'
                    : 'border-white/20 hover:border-white/40 bg-white/10'
                  }
                `}
              >
                <span className="text-sm font-medium text-white">{mfr}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lens Selection */}
      {selectedManufacturer && (
        <Card className={`glass-card border-white/20 ${selectedLens && !isLensSelectionExpanded ? 'border-emerald-500/50' : ''}`}>
          <CardHeader className="cursor-pointer" onClick={() => selectedLens && setIsLensSelectionExpanded(!isLensSelectionExpanded)}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                {selectedLens && !isLensSelectionExpanded ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
                Step 2: Select Contact Lens
              </CardTitle>
              {selectedLens && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsLensSelectionExpanded(!isLensSelectionExpanded)
                  }}
                  className="text-white/70 hover:text-white"
                >
                  {isLensSelectionExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Change
                    </>
                  )}
                </Button>
              )}
            </div>
            {/* Collapsed Summary - Show when lens is selected and collapsed */}
            {selectedLens && !isLensSelectionExpanded && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-white">{selectedLens.lensName}</div>
                    <div className="text-sm text-white/70">
                      {selectedLens.manufacturer} • {selectedLens.boxSize}-pack • {formatPrice(selectedLens.officePrice || selectedLens.retailPrice)}/box
                    </div>
                  </div>
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            )}
            {/* Description only when expanded or no lens selected */}
            {(!selectedLens || isLensSelectionExpanded) && (
              <CardDescription>
                Choose the lens and box size
              </CardDescription>
            )}
          </CardHeader>
          {/* Expandable Content */}
          {(!selectedLens || isLensSelectionExpanded) && (
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-white/60">Loading lenses...</div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(groupedLenses).map(([lensName, variants]) => {
                    const isSelected = selectedLens && variants.some(v => v.id === selectedLens.id)
                    const primaryVariant = variants[0]

                    return (
                      <div key={lensName} className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl font-bold text-white">{lensName}</span>
                          <Badge variant="outline" className="text-xs border-white/30 text-white/70">
                            {getLensTypeLabel(primaryVariant)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {variants.map(variant => (
                            <button
                              key={variant.id}
                              onClick={() => {
                                setSelectedLens(variant)
                                setIsLensSelectionExpanded(false)
                                // Auto-set box quantities to annual supply threshold
                                const modality = getModalityFromLens(variant)
                                const boxesPerEye = calculateBoxesPerEye(
                                  modality,
                                  variant.boxSize,
                                  variant.annualSupplyBothEyes
                                )
                                setRightEyeBoxes(boxesPerEye)
                                setLeftEyeBoxes(boxesPerEye)
                              }}
                              className={`
                                p-3 rounded-lg border transition-all text-left
                                ${selectedLens?.id === variant.id
                                  ? 'border-blue-400 bg-blue-500/20'
                                  : 'border-white/20 hover:border-white/40 bg-white/5'
                                }
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-xs text-white/60">{variant.boxSize}-pack</div>
                                  <div className="text-sm font-medium text-white">
                                    {formatPrice(variant.officePrice || variant.retailPrice)}
                                  </div>
                                </div>
                                {selectedLens?.id === variant.id && (
                                  <CheckCircle className="h-5 w-5 text-blue-400" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Box Quantity */}
      {selectedLens && (
        <Card className="glass-card border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calculator className="h-5 w-5" />
              Step 3: Select Quantity
            </CardTitle>
            <CardDescription>
              Annual supply threshold: {getAnnualSupplyThreshold(selectedLens)} boxes for both eyes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* Right Eye */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Right Eye (OD)
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setRightEyeBoxes(Math.max(0, rightEyeBoxes - 1))}
                    className="border-white/30"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={rightEyeBoxes}
                    onChange={(e) => setRightEyeBoxes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 text-center bg-white/10 border-white/30 text-white"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setRightEyeBoxes(rightEyeBoxes + 1)}
                    className="border-white/30"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-white/60">boxes</span>
                </div>
              </div>

              {/* Left Eye */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Left Eye (OS)
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setLeftEyeBoxes(Math.max(0, leftEyeBoxes - 1))}
                    className="border-white/30"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={leftEyeBoxes}
                    onChange={(e) => setLeftEyeBoxes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 text-center bg-white/10 border-white/30 text-white"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setLeftEyeBoxes(leftEyeBoxes + 1)}
                    className="border-white/30"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-white/60">boxes</span>
                </div>
              </div>
            </div>

            {/* Total Boxes */}
            <div className="mt-4 p-3 rounded-lg bg-white/5 flex items-center justify-between">
              <span className="text-white/70">Total Boxes:</span>
              <span className="text-xl font-bold text-white">{calculation.totalBoxes}</span>
            </div>

            {/* Annual Supply Status */}
            <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
              calculation.meetsAnnualThreshold
                ? 'bg-green-500/20 border border-green-500/30'
                : 'bg-yellow-500/20 border border-yellow-500/30'
            }`}>
              {calculation.meetsAnnualThreshold ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-green-300 text-sm">
                    Meets annual supply threshold - ${calculation.annualDiscount} discount applied
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-yellow-400" />
                  <span className="text-yellow-300 text-sm">
                    Add {getAnnualSupplyThreshold(selectedLens) - calculation.totalBoxes} more boxes for annual supply discount
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insurance & Rebates */}
      {selectedLens && (
        <Card className="glass-card border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5" />
              Step 4: Insurance & Rebates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Insurance Allowance</label>
                {apiPricing?.hasInsurance ? (
                  <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                    <div className="text-2xl font-bold text-emerald-400">
                      {formatPrice(apiPricing.insuranceAllowance)}
                    </div>
                    <div className="text-xs text-emerald-300 mt-1">
                      {apiPricing.carrier} contact lens allowance
                    </div>
                    {apiPricing.insuranceApplied < apiPricing.insuranceAllowance && (
                      <div className="text-xs text-white/60 mt-1">
                        Applied: {formatPrice(apiPricing.insuranceApplied)} (limited by subtotal)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-white/10 border border-white/20">
                    <div className="text-lg font-medium text-white/60">
                      {showRetailOnlyBanner ? 'Used for Eyeglasses' : 'No Insurance'}
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {showRetailOnlyBanner
                        ? 'Switch benefit in banner above to use here'
                        : 'No contact lens allowance available'}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Manufacturer Rebate</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                  <Input
                    type="number"
                    value={rebateAmount}
                    onChange={(e) => setRebateAmount(parseFloat(e.target.value) || 0)}
                    className="pl-7 bg-white/10 border-white/30 text-white"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-white/50">
                  Enter any manufacturer rebate amount
                </p>
              </div>
              {/* Fitting Copay - shown when insurance is active */}
              {authorization?.contactFittingCopay !== null && authorization?.contactFittingCopay !== undefined && isContactsInsured && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">CL Fitting Copay</label>
                  <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <div className="text-2xl font-bold text-blue-400">
                      {formatPrice(authorization.contactFittingCopay)}
                    </div>
                    <div className="text-xs text-blue-300 mt-1">
                      Patient pays for fitting service
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Breakdown */}
      {selectedLens && (
        <Card className="glass-card border-white/20 bg-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              Price Breakdown
              {pricingLoading && <Loader2 className="h-4 w-4 animate-spin text-white/60" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pricingError && (
              <Alert className="mb-4 bg-red-500/20 border-red-400/50">
                <AlertDescription className="text-red-200">
                  {pricingError}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              <div className="flex justify-between text-white/70">
                <span>Retail Price ({calculation.totalBoxes} × {formatPrice(selectedLens.retailPrice)})</span>
                <span className="text-white">{formatPrice(calculation.retailPrice)}</span>
              </div>

              {calculation.annualDiscount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Annual Supply Discount</span>
                  <span>-{formatPrice(calculation.annualDiscount)}</span>
                </div>
              )}

              {calculation.insuranceCredit > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Insurance Credit ({apiPricing?.carrier || 'Insurance'})</span>
                  <span>-{formatPrice(calculation.insuranceCredit)}</span>
                </div>
              )}

              {calculation.rebate > 0 && (
                <div className="flex justify-between text-purple-400">
                  <span>Manufacturer Rebate</span>
                  <span>-{formatPrice(calculation.rebate)}</span>
                </div>
              )}

              <div className="border-t border-white/20 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-white">Per Box</span>
                  <span className="text-3xl font-bold text-blue-400">
                    {formatPrice(calculation.costPerBox)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-white/60 mt-2">
                  <span>Patient Pays Total</span>
                  <span className="text-lg font-semibold text-white">{formatPrice(calculation.finalCost)}</span>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/20">
              {onBack && (
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="border-white/30 text-white"
                >
                  Back
                </Button>
              )}
              {onNext && (
                <Button onClick={onNext}>
                  Continue to Review
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation when no lens selected */}
      {!selectedLens && (
        <div className="flex justify-between">
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="border-white/30 text-white"
            >
              Back
            </Button>
          )}
          {onNext && (
            <Button
              variant="outline"
              onClick={onNext}
              className="ml-auto"
            >
              Skip Contact Lenses
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
