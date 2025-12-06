'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Shield
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useQuotePricingContext } from '@/contexts/quote-pricing-context'

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

// Annual supply discount rules
const DISCOUNT_RULES = {
  daily: 30,
  biweekly: 10,
  monthly: 10,
}

export function ContactLensCalculator({ className, onNext, onBack }: ContactLensCalculatorProps) {
  // State
  const [lenses, setLenses] = useState<ContactLens[]>([])
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Selection state
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('')
  const [selectedLens, setSelectedLens] = useState<ContactLens | null>(null)
  const [rightEyeBoxes, setRightEyeBoxes] = useState(4)
  const [leftEyeBoxes, setLeftEyeBoxes] = useState(4)
  const [insuranceCredit, setInsuranceCredit] = useState(0)
  const [rebateAmount, setRebateAmount] = useState(0)

  // Get insurance context and selected items
  const {
    authorization,
    updateContactLenses,
    selectedItems,
    materialsConflict,
    usesMaterialsAllowance,
  } = useQuotePricingContext()

  // Check if contacts benefit is getting the insurance allowance
  // This uses the automatic conflict detection system
  const isContactsInsured = usesMaterialsAllowance('contacts')

  // Show retail-only mode banner ONLY when there's a conflict AND glasses is active
  // This means the user has both glasses and contacts in the quote, and chose glasses for the allowance
  const showRetailOnlyBanner = materialsConflict.hasConflict && materialsConflict.activeBenefit === 'glasses'

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

  // Initialize insurance credit from authorization - only if contacts benefit is selected
  useEffect(() => {
    if (authorization?.contactAllowance && isContactsInsured) {
      setInsuranceCredit(authorization.contactAllowance)
    } else {
      // No insurance credit in retail-only mode
      setInsuranceCredit(0)
    }
  }, [authorization, isContactsInsured])

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

  // Calculate pricing
  const calculation = useMemo(() => {
    if (!selectedLens) {
      return {
        totalBoxes: 0,
        retailPrice: 0,
        meetsAnnualThreshold: false,
        annualDiscount: 0,
        subtotal: 0,
        insuranceCredit: 0,
        rebate: 0,
        finalCost: 0,
        costPerBox: 0,
      }
    }

    const totalBoxes = rightEyeBoxes + leftEyeBoxes
    const pricePerBox = selectedLens.officePrice || selectedLens.retailPrice
    const retailPrice = totalBoxes * pricePerBox

    // Check if meets annual supply threshold
    const annualThreshold = selectedLens.annualSupplyBothEyes || 8 // Default to 8 for daily lenses
    const meetsAnnualThreshold = totalBoxes >= annualThreshold

    // Calculate annual supply discount
    const modality = selectedLens.modality || 'daily'
    const annualDiscount = meetsAnnualThreshold ? (DISCOUNT_RULES[modality as keyof typeof DISCOUNT_RULES] || 0) : 0

    // Calculate subtotal after discount
    const subtotal = retailPrice - annualDiscount

    // Apply insurance credit
    const appliedInsurance = Math.min(insuranceCredit, subtotal)

    // Apply rebate
    const afterInsurance = subtotal - appliedInsurance
    const appliedRebate = Math.min(rebateAmount, afterInsurance)

    // Final cost
    const finalCost = Math.max(0, afterInsurance - appliedRebate)

    // Cost per box
    const costPerBox = totalBoxes > 0 ? finalCost / totalBoxes : 0

    return {
      totalBoxes,
      retailPrice,
      meetsAnnualThreshold,
      annualDiscount,
      subtotal,
      insuranceCredit: appliedInsurance,
      rebate: appliedRebate,
      finalCost,
      costPerBox,
    }
  }, [selectedLens, rightEyeBoxes, leftEyeBoxes, insuranceCredit, rebateAmount])

  // Update context when pricing changes
  useEffect(() => {
    if (selectedLens && calculation.totalBoxes > 0) {
      updateContactLenses({
        enabled: true,
        lensName: selectedLens.lensName,
        manufacturer: selectedLens.manufacturer,
        boxesRight: rightEyeBoxes,
        boxesLeft: leftEyeBoxes,
        pricePerBox: selectedLens.officePrice || selectedLens.retailPrice,
        subtotal: calculation.retailPrice,
        meetsAnnualSupply: calculation.meetsAnnualThreshold,
        annualSupplyDiscount: calculation.annualDiscount,
        insuranceCredit: calculation.insuranceCredit,
        rebate: calculation.rebate,
        totalDue: calculation.finalCost,
      })
    } else {
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
  }, [selectedLens, rightEyeBoxes, leftEyeBoxes, calculation, updateContactLenses])

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
    if (lens.isWeekly) types.push('Bi-Weekly')
    if (lens.isMonthly) types.push('Monthly')
    return types.join(' • ') || 'Standard'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Retail-Only Mode Banner - When glasses benefit is using the allowance */}
      {showRetailOnlyBanner && (
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
        <Card className="glass-card border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Eye className="h-5 w-5" />
              Step 2: Select Contact Lens
            </CardTitle>
            <CardDescription>
              Choose the lens and box size
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-white/60">Loading lenses...</div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedLenses).map(([lensName, variants]) => {
                  const isSelected = selectedLens && variants.some(v => v.id === selectedLens.id)
                  const primaryVariant = variants[0]

                  return (
                    <div key={lensName} className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-white">{lensName}</span>
                        <Badge variant="outline" className="text-xs border-white/30 text-white/70">
                          {getLensTypeLabel(primaryVariant)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {variants.map(variant => (
                          <button
                            key={variant.id}
                            onClick={() => setSelectedLens(variant)}
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
                                <div className="text-lg font-bold text-white">
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
              Annual supply threshold: {selectedLens.annualSupplyBothEyes || 8} boxes for both eyes
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
                    Add {(selectedLens?.annualSupplyBothEyes || 8) - calculation.totalBoxes} more boxes for annual supply discount
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
                <label className="text-sm font-medium text-white">Insurance Credit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                  <Input
                    type="number"
                    value={insuranceCredit}
                    onChange={(e) => setInsuranceCredit(parseFloat(e.target.value) || 0)}
                    className="pl-7 bg-white/10 border-white/30 text-white"
                  />
                </div>
                {authorization?.contactAllowance && (
                  <p className="text-xs text-emerald-400">
                    {authorization.carrier} allowance: ${authorization.contactAllowance}
                  </p>
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
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Breakdown */}
      {selectedLens && (
        <Card className="glass-card border-white/20 bg-white/10">
          <CardHeader>
            <CardTitle className="text-white">Price Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-white/70">
                <span>Retail Price ({calculation.totalBoxes} × {formatPrice(selectedLens.officePrice || selectedLens.retailPrice)})</span>
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
                  <span>Insurance Credit ({authorization?.carrier || 'Insurance'})</span>
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
                  <span className="text-lg font-semibold text-white">Patient Pays</span>
                  <span className="text-2xl font-bold text-blue-400">
                    {formatPrice(calculation.finalCost)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-white/60 mt-1">
                  <span>Per Box</span>
                  <span>{formatPrice(calculation.costPerBox)}</span>
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
