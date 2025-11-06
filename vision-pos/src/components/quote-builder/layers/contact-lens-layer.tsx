'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { NavigationFooter } from '@/components/quote-builder/layout/navigation-footer'
import { 
  VSPCategorySection, 
  VSPSelectionButton, 
  VSPGrid3
} from '@/components/ui/vsp-components'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useQuoteStore } from '@/store/quote-store'

interface ContactBrand {
  id: string
  name: string
  manufacturer: string
  description: string
  rebateAmount: number
  insuranceCovered: boolean
  copay?: number
}

interface LensType {
  id: string
  name: string
  subtitle: string
  price: number
  replacementSchedule: string
  insuranceCovered: boolean
  copay?: number
}

interface ContactPricingCalculator {
  pricePerBox: number            // Data entry
  numberOfBoxes: number          // Data entry  
  totalCostOfCLs: number          // Calculated: pricePerBox × numberOfBoxes
  additionalSavings: number       // Data entry
  insuranceBenefit: number        // Data entry
  inOfficeTotal: number           // Calculated: totalCostOfCLs - additionalSavings - insuranceBenefit
  manufacturerRebate: number      // Data entry
  afterRebateTotal: number        // Calculated: inOfficeTotal - manufacturerRebate
  finalCostPerBox: number         // Calculated: afterRebateTotal ÷ numberOfBoxes
}

interface ContactLensLayerProps {
  onNext: () => void
  onBack?: () => void
}

// Updated contact lens brands from attachment
const contactBrands: ContactBrand[] = [
  { id: 'acuvue-oasys', name: 'Acuvue Oasys', manufacturer: 'Johnson & Johnson', description: 'Bi-weekly silicone hydrogel', rebateAmount: 100, insuranceCovered: true, copay: 25 },
  { id: 'biofinity', name: 'Biofinity', manufacturer: 'CooperVision', description: 'Monthly silicone hydrogel', rebateAmount: 80, insuranceCovered: true, copay: 30 },
  { id: 'air-optix', name: 'Air Optix', manufacturer: 'Alcon', description: 'Monthly breathable lenses', rebateAmount: 120, insuranceCovered: true, copay: 20 },
  { id: 'dailies-total1', name: 'Dailies Total1', manufacturer: 'Alcon', description: 'Premium daily disposable', rebateAmount: 90, insuranceCovered: true, copay: 35 },
  { id: 'ultra', name: 'Ultra', manufacturer: 'Bausch + Lomb', description: 'Monthly moisture seal', rebateAmount: 75, insuranceCovered: true, copay: 25 },
  { id: 'clariti', name: 'Clariti', manufacturer: 'CooperVision', description: 'Daily silicone hydrogel', rebateAmount: 110, insuranceCovered: true, copay: 40 },
  { id: 'precision1', name: 'Precision1', manufacturer: 'Alcon', description: 'Daily with smart surface', rebateAmount: 95, insuranceCovered: true, copay: 30 }
]

const lensTypes: LensType[] = [
  { id: 'daily', name: 'Daily Disposable', subtitle: 'New pair every day', price: 35, replacementSchedule: 'Daily', insuranceCovered: true, copay: 15 },
  { id: 'weekly', name: 'Weekly Disposable', subtitle: '1-2 week replacement', price: 25, replacementSchedule: 'Weekly', insuranceCovered: true, copay: 10 },
  { id: 'monthly', name: 'Monthly Disposable', subtitle: '30 day replacement', price: 30, replacementSchedule: 'Monthly', insuranceCovered: true, copay: 12 },
  { id: 'toric', name: 'Toric (Astigmatism)', subtitle: 'For astigmatism correction', price: 45, replacementSchedule: 'Monthly', insuranceCovered: true, copay: 20 },
  { id: 'multifocal', name: 'Multifocal', subtitle: 'Progressive vision', price: 55, replacementSchedule: 'Monthly', insuranceCovered: true, copay: 25 },
  { id: 'colored', name: 'Colored/Cosmetic', subtitle: 'Enhancement lenses', price: 40, replacementSchedule: 'Monthly', insuranceCovered: false }
]

export default function ContactLensLayer({ onNext, onBack }: ContactLensLayerProps) {
  const { updateContacts, updatePricing, saveQuote, quote } = useQuoteStore()
  
  // Initialize contact lens state from store
  const [selectedBrand, setSelectedBrand] = useState<string>(() => 
    quote.contacts.brand || ''
  )
  const [selectedLensType, setSelectedLensType] = useState<string>(() => 
    quote.contacts.type || ''
  )
  
  // Contact Lens Pricing Calculator - 9 fields with string inputs for better UX
  const [pricing, setPricing] = useState<ContactPricingCalculator>({
    pricePerBox: 0,
    numberOfBoxes: 0,
    totalCostOfCLs: 0,
    additionalSavings: 0,
    insuranceBenefit: 0,
    inOfficeTotal: 0,
    manufacturerRebate: 0,
    afterRebateTotal: 0,
    finalCostPerBox: 0
  })

  // String values for input fields to prevent formatting interference
  const [inputValues, setInputValues] = useState({
    pricePerBox: '',
    additionalSavings: '',
    insuranceBenefit: '',
    manufacturerRebate: ''
  })

  // Calculate dependent fields using useMemo
  const calculatedPricing = useMemo(() => {
    const totalCost = pricing.pricePerBox * pricing.numberOfBoxes
    const inOfficeTotal = Math.max(0, totalCost - pricing.additionalSavings - pricing.insuranceBenefit)
    const afterRebateTotal = Math.max(0, inOfficeTotal - pricing.manufacturerRebate)
    const finalCostPerBox = pricing.numberOfBoxes > 0 ? afterRebateTotal / pricing.numberOfBoxes : 0

    return {
      ...pricing,
      totalCostOfCLs: totalCost,
      inOfficeTotal,
      afterRebateTotal,
      finalCostPerBox: Math.max(0, finalCostPerBox)
    }
  }, [pricing])

  const saveContactsData = useCallback(async () => {
    try {
      updateContacts({
        brand: selectedBrand,
        type: selectedLensType as 'daily' | 'weekly' | 'monthly' | 'extended',
        parameters: {
          rightEye: {
            power: -2.50 // Simplified default power
          },
          leftEye: {
            power: -2.75 // Simplified default power
          }
        },
        quantity: calculatedPricing.numberOfBoxes,
        annualSupply: true, // Simplified to always include annual supply
        rebate: selectedBrand ? {
          amount: contactBrands.find(b => b.id === selectedBrand)?.rebateAmount || 0,
          manufacturer: contactBrands.find(b => b.id === selectedBrand)?.manufacturer || ''
        } : undefined
      })
      
      // Trigger auto-save
      await saveQuote()
    } catch (error) {
      console.error('Failed to save contacts data:', error)
    }
  }, [selectedBrand, selectedLensType, calculatedPricing.numberOfBoxes, updateContacts, saveQuote])

  // Real-time pricing updates for the sidebar
  useEffect(() => {
    if (calculatedPricing.totalCostOfCLs > 0) {
      updatePricing({
        contacts: {
          product: calculatedPricing.afterRebateTotal,
          fitting: 0, // Contact fitting is handled in exam services
          total: calculatedPricing.afterRebateTotal
        }
      })
    }
  }, [calculatedPricing.totalCostOfCLs, calculatedPricing.afterRebateTotal, updatePricing])

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrand(brandId)
    const brand = contactBrands.find(b => b.id === brandId)
    if (brand) {
      // Auto-populate manufacturer rebate when brand is selected
      const rebateAmount = brand.rebateAmount.toString()
      setInputValues(prev => ({
        ...prev,
        manufacturerRebate: rebateAmount
      }))
      setPricing(prev => ({
        ...prev,
        manufacturerRebate: brand.rebateAmount
      }))
    }
  }

  const handleLensTypeSelect = (lensTypeId: string) => {
    setSelectedLensType(lensTypeId)
  }

  const handlePricingChange = (field: keyof ContactPricingCalculator, value: string | number) => {
    if (field === 'pricePerBox' || field === 'additionalSavings' || field === 'insuranceBenefit' || field === 'manufacturerRebate') {
      // Update string input value
      setInputValues(prev => ({
        ...prev,
        [field]: value as string
      }))
      // Update numeric value for calculations
      setPricing(prev => ({
        ...prev,
        [field]: parseFloat(value as string) || 0
      }))
    } else {
      setPricing(prev => ({
        ...prev,
        [field]: value as number
      }))
    }
  }

  const formatPrice = (price: number) => `$${price.toFixed(2)}`

  const canProceed = () => {
    return Boolean(selectedBrand && selectedLensType && calculatedPricing.numberOfBoxes > 0)
  }

  const handleNext = async () => {
    if (canProceed()) {
      // Save current data before proceeding
      await saveContactsData()
      onNext()
    }
  }

  const handleBack = async () => {
    // Save current data before going back
    if (selectedBrand || selectedLensType || calculatedPricing.numberOfBoxes > 0) {
      await saveContactsData()
    }
    if (onBack) {
      onBack()
    }
  }

  return (
    <div className="space-y-8 bg-neutral-50 min-h-screen p-6">
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-blue-900 mb-2">Contact Lenses</h2>
        <p className="text-neutral-600">Select contact lens brand, type, and configure pricing.</p>
      </div>

      {/* 1. Brand Selection */}
      <VSPCategorySection number={1} title="Contact Lens Brand">
        <VSPGrid3>
          {contactBrands.map(brand => (
            <VSPSelectionButton
              key={brand.id}
              selected={selectedBrand === brand.id}
              onClick={() => handleBrandSelect(brand.id)}
              subtitle={brand.manufacturer}
              price={`$${brand.rebateAmount} rebate`}
            >
              {brand.name}
            </VSPSelectionButton>
          ))}
        </VSPGrid3>
      </VSPCategorySection>

      {/* 2. Lens Type */}
      <VSPCategorySection number={2} title="Lens Type">
        <VSPGrid3>
          {lensTypes.map(lensType => (
            <VSPSelectionButton
              key={lensType.id}
              selected={selectedLensType === lensType.id}
              onClick={() => handleLensTypeSelect(lensType.id)}
              subtitle={lensType.subtitle}
              price={lensType.insuranceCovered ? `$${lensType.copay} copay` : formatPrice(lensType.price)}
            >
              {lensType.name}
            </VSPSelectionButton>
          ))}
        </VSPGrid3>
      </VSPCategorySection>

      {/* 3. Contact Lens Pricing Calculator */}
      <VSPCategorySection number={3} title="Contact Lens Pricing Calculator">
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Data Entry Fields */}
            <div className="space-y-4">
              <h4 className="font-semibold text-blue-900 mb-4">Data Entry</h4>
              
              <div>
                <Label htmlFor="pricePerBox">Price per Box</Label>
                <Input
                  id="pricePerBox"
                  type="number"
                  value={inputValues.pricePerBox}
                  onChange={(e) => handlePricingChange('pricePerBox', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="numberOfBoxes">Number of Boxes</Label>
                <Input
                  id="numberOfBoxes"
                  type="number"
                  value={pricing.numberOfBoxes}
                  onChange={(e) => handlePricingChange('numberOfBoxes', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <Label htmlFor="additionalSavings">Additional Savings</Label>
                <Input
                  id="additionalSavings"
                  type="number"
                  value={inputValues.additionalSavings}
                  onChange={(e) => handlePricingChange('additionalSavings', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="insuranceBenefit">Insurance Benefit</Label>
                <Input
                  id="insuranceBenefit"
                  type="number"
                  value={inputValues.insuranceBenefit}
                  onChange={(e) => handlePricingChange('insuranceBenefit', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="manufacturerRebate">Manufacturer Rebate</Label>
                <Input
                  id="manufacturerRebate"
                  type="number"
                  value={inputValues.manufacturerRebate}
                  onChange={(e) => handlePricingChange('manufacturerRebate', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Calculated Fields */}
            <div className="space-y-4">
              <h4 className="font-semibold text-blue-900 mb-4">Calculated Fields</h4>
              
              <div>
                <Label>Total Cost of CLs</Label>
                <div className="bg-neutral-100 p-3 rounded-md text-lg font-semibold">
                  {formatPrice(calculatedPricing.totalCostOfCLs)}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Price per Box × Number of Boxes</p>
              </div>

              <div>
                <Label>In-Office Total</Label>
                <div className="bg-neutral-100 p-3 rounded-md text-lg font-semibold">
                  {formatPrice(calculatedPricing.inOfficeTotal)}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Total Cost - Additional Savings - Insurance Benefit</p>
              </div>

              <div>
                <Label>After Rebate Total</Label>
                <div className="bg-neutral-100 p-3 rounded-md text-lg font-semibold">
                  {formatPrice(calculatedPricing.afterRebateTotal)}
                </div>
                <p className="text-xs text-neutral-500 mt-1">In-Office Total - Manufacturer Rebate</p>
              </div>

              <div>
                <Label>Final Cost per Box</Label>
                <div className="bg-blue-100 p-3 rounded-md text-lg font-bold text-blue-900">
                  {formatPrice(calculatedPricing.finalCostPerBox)}
                </div>
                <p className="text-xs text-neutral-500 mt-1">After Rebate Total ÷ Number of Boxes</p>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              <h4 className="font-semibold text-blue-900 mb-4">Pricing Summary</h4>
              
              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span>Original Price:</span>
                  <span className="font-semibold">{formatPrice(calculatedPricing.totalCostOfCLs)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Total Savings:</span>
                  <span className="font-semibold">
                    -{formatPrice(pricing.additionalSavings + pricing.insuranceBenefit + pricing.manufacturerRebate)}
                  </span>
                </div>
                <hr className="border-blue-200" />
                <div className="flex justify-between text-sm text-neutral-600">
                  <span>Patient Pays:</span>
                  <span className="font-medium">{formatPrice(calculatedPricing.afterRebateTotal)}</span>
                </div>
                <div className="flex justify-between text-2xl font-bold text-blue-900 bg-yellow-100 p-3 rounded-lg border-2 border-yellow-300 mt-3">
                  <span>Final Cost per Box:</span>
                  <span className="text-3xl">{formatPrice(calculatedPricing.finalCostPerBox)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </VSPCategorySection>

      {/* Navigation Footer */}
      <NavigationFooter
        currentStep={3}
        totalSteps={3}
        onNext={handleNext}
        onBack={handleBack}
        canProceed={canProceed()}
        validationErrors={[]}
        validationWarnings={[]}
        nextLabel="Complete Quote"
        backLabel="Back to Eyeglasses"
      />
    </div>
  )
}