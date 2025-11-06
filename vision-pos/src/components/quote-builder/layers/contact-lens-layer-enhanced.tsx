'use client'

import { useState, useEffect } from 'react'
import { NavigationFooter } from '@/components/quote-builder/layout/navigation-footer'
import { 
  VSPCategorySection, 
  VSPSelectionButton, 
  VSPGrid2, 
  VSPGrid3
} from '@/components/ui/vsp-components'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

interface ContactParameters {
  rightEye: {
    power: string
    baseCurve: string
    diameter: string
    cylinder?: string
    axis?: string
  }
  leftEye: {
    power: string
    baseCurve: string
    diameter: string
    cylinder?: string
    axis?: string
  }
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

const specialtyOptions = [
  { id: 'annual-supply', name: 'Annual Supply', subtitle: '12-month supply', savings: 15, description: 'Save 15% with annual purchase' },
  { id: 'trial-fitting', name: 'Trial Fitting', subtitle: 'Try before you buy', price: 75, description: 'Professional fitting service' },
  { id: 'backup-glasses', name: 'Backup Glasses', subtitle: 'Emergency pair', discount: 50, description: '50% off backup frame' },
  { id: 'care-kit', name: 'Contact Care Kit', subtitle: 'Solution & case', price: 25, description: 'Complete care package' }
]

export default function ContactLensLayer({ onNext, onBack }: ContactLensLayerProps) {
  const { updateContacts } = useQuoteStore()
  
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedLensType, setSelectedLensType] = useState<string>('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [parameters, setParameters] = useState<ContactParameters>({
    rightEye: {
      power: '',
      baseCurve: '',
      diameter: '',
      cylinder: '',
      axis: ''
    },
    leftEye: {
      power: '',
      baseCurve: '',
      diameter: '',
      cylinder: '',
      axis: ''
    }
  })
  
  // Contact Lens Pricing Calculator - 9 fields
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

  // Auto-calculate dependent fields whenever data entry fields change
  useEffect(() => {
    const newTotalCost = pricing.pricePerBox * pricing.numberOfBoxes
    const newInOfficeTotal = newTotalCost - pricing.additionalSavings - pricing.insuranceBenefit
    const newAfterRebateTotal = newInOfficeTotal - pricing.manufacturerRebate
    const newFinalCostPerBox = pricing.numberOfBoxes > 0 ? newAfterRebateTotal / pricing.numberOfBoxes : 0

    setPricing(prev => ({
      ...prev,
      totalCostOfCLs: newTotalCost,
      inOfficeTotal: Math.max(0, newInOfficeTotal),
      afterRebateTotal: Math.max(0, newAfterRebateTotal),
      finalCostPerBox: Math.max(0, newFinalCostPerBox)
    }))
  }, [pricing.pricePerBox, pricing.numberOfBoxes, pricing.additionalSavings, pricing.insuranceBenefit, pricing.manufacturerRebate])

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrand(brandId)
    const brand = contactBrands.find(b => b.id === brandId)
    if (brand) {
      // Auto-populate manufacturer rebate when brand is selected
      setPricing(prev => ({
        ...prev,
        manufacturerRebate: brand.rebateAmount
      }))
    }
  }

  const handleLensTypeSelect = (lensTypeId: string) => {
    setSelectedLensType(lensTypeId)
  }

  const handleSpecialtyToggle = (specialtyId: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(specialtyId) 
        ? prev.filter(id => id !== specialtyId)
        : [...prev, specialtyId]
    )
  }

  const handleParameterChange = (eye: 'rightEye' | 'leftEye', field: string, value: string) => {
    setParameters(prev => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        [field]: value
      }
    }))
  }

  const handlePricingChange = (field: keyof ContactPricingCalculator, value: number) => {
    setPricing(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const formatPrice = (price: number) => `$${price.toFixed(2)}`
  const formatPriceInput = (price: number) => price.toFixed(2)

  const canProceed = () => {
    return Boolean(selectedBrand && selectedLensType && pricing.numberOfBoxes > 0)
  }

  const handleNext = () => {
    if (canProceed()) {
      updateContacts({
        brand: selectedBrand,
        type: selectedLensType as 'daily' | 'weekly' | 'monthly' | 'extended',
        parameters: {
          rightEye: {
            power: parseFloat(parameters.rightEye.power) || 0,
            baseCurve: parseFloat(parameters.rightEye.baseCurve) || 0,
            diameter: parseFloat(parameters.rightEye.diameter) || 0,
            cylinder: parseFloat(parameters.rightEye.cylinder || '0') || 0,
            axis: parseFloat(parameters.rightEye.axis || '0') || 0
          },
          leftEye: {
            power: parseFloat(parameters.leftEye.power) || 0,
            baseCurve: parseFloat(parameters.leftEye.baseCurve) || 0,
            diameter: parseFloat(parameters.leftEye.diameter) || 0,
            cylinder: parseFloat(parameters.leftEye.cylinder || '0') || 0,
            axis: parseFloat(parameters.leftEye.axis || '0') || 0
          }
        },
        quantity: pricing.numberOfBoxes,
        pricing: pricing,
        specialties: selectedSpecialties
      })
      onNext()
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
                  value={formatPriceInput(pricing.pricePerBox)}
                  onChange={(e) => handlePricingChange('pricePerBox', parseFloat(e.target.value) || 0)}
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
                  value={formatPriceInput(pricing.additionalSavings)}
                  onChange={(e) => handlePricingChange('additionalSavings', parseFloat(e.target.value) || 0)}
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
                  value={formatPriceInput(pricing.insuranceBenefit)}
                  onChange={(e) => handlePricingChange('insuranceBenefit', parseFloat(e.target.value) || 0)}
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
                  value={formatPriceInput(pricing.manufacturerRebate)}
                  onChange={(e) => handlePricingChange('manufacturerRebate', parseFloat(e.target.value) || 0)}
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
                  {formatPrice(pricing.totalCostOfCLs)}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Price per Box × Number of Boxes</p>
              </div>

              <div>
                <Label>In-Office Total</Label>
                <div className="bg-neutral-100 p-3 rounded-md text-lg font-semibold">
                  {formatPrice(pricing.inOfficeTotal)}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Total Cost - Additional Savings - Insurance Benefit</p>
              </div>

              <div>
                <Label>After Rebate Total</Label>
                <div className="bg-neutral-100 p-3 rounded-md text-lg font-semibold">
                  {formatPrice(pricing.afterRebateTotal)}
                </div>
                <p className="text-xs text-neutral-500 mt-1">In-Office Total - Manufacturer Rebate</p>
              </div>

              <div>
                <Label>Final Cost per Box</Label>
                <div className="bg-blue-100 p-3 rounded-md text-lg font-bold text-blue-900">
                  {formatPrice(pricing.finalCostPerBox)}
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
                  <span className="font-semibold">{formatPrice(pricing.totalCostOfCLs)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Total Savings:</span>
                  <span className="font-semibold">
                    -{formatPrice(pricing.additionalSavings + pricing.insuranceBenefit + pricing.manufacturerRebate)}
                  </span>
                </div>
                <hr className="border-blue-200" />
                <div className="flex justify-between text-xl font-bold text-blue-900">
                  <span>Patient Pays:</span>
                  <span>{formatPrice(pricing.afterRebateTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-neutral-600">
                  <span>Per Box Cost:</span>
                  <span>{formatPrice(pricing.finalCostPerBox)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </VSPCategorySection>

      {/* 4. Prescription Parameters */}
      <VSPCategorySection number={4} title="Prescription Parameters">
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Right Eye */}
            <div>
              <h4 className="font-semibold mb-4 text-blue-900">Right Eye (OD)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="od-power">Power (SPH)</Label>
                  <Input
                    id="od-power"
                    value={parameters.rightEye.power}
                    onChange={(e) => handleParameterChange('rightEye', 'power', e.target.value)}
                    placeholder="-3.00"
                  />
                </div>
                <div>
                  <Label htmlFor="od-bc">Base Curve</Label>
                  <Input
                    id="od-bc"
                    value={parameters.rightEye.baseCurve}
                    onChange={(e) => handleParameterChange('rightEye', 'baseCurve', e.target.value)}
                    placeholder="8.5"
                  />
                </div>
                <div>
                  <Label htmlFor="od-diameter">Diameter</Label>
                  <Input
                    id="od-diameter"
                    value={parameters.rightEye.diameter}
                    onChange={(e) => handleParameterChange('rightEye', 'diameter', e.target.value)}
                    placeholder="14.2"
                  />
                </div>
                <div>
                  <Label htmlFor="od-cylinder">Cylinder (CYL)</Label>
                  <Input
                    id="od-cylinder"
                    value={parameters.rightEye.cylinder}
                    onChange={(e) => handleParameterChange('rightEye', 'cylinder', e.target.value)}
                    placeholder="-1.25"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="od-axis">Axis</Label>
                  <Input
                    id="od-axis"
                    value={parameters.rightEye.axis}
                    onChange={(e) => handleParameterChange('rightEye', 'axis', e.target.value)}
                    placeholder="180"
                  />
                </div>
              </div>
            </div>

            {/* Left Eye */}
            <div>
              <h4 className="font-semibold mb-4 text-blue-900">Left Eye (OS)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="os-power">Power (SPH)</Label>
                  <Input
                    id="os-power"
                    value={parameters.leftEye.power}
                    onChange={(e) => handleParameterChange('leftEye', 'power', e.target.value)}
                    placeholder="-3.25"
                  />
                </div>
                <div>
                  <Label htmlFor="os-bc">Base Curve</Label>
                  <Input
                    id="os-bc"
                    value={parameters.leftEye.baseCurve}
                    onChange={(e) => handleParameterChange('leftEye', 'baseCurve', e.target.value)}
                    placeholder="8.5"
                  />
                </div>
                <div>
                  <Label htmlFor="os-diameter">Diameter</Label>
                  <Input
                    id="os-diameter"
                    value={parameters.leftEye.diameter}
                    onChange={(e) => handleParameterChange('leftEye', 'diameter', e.target.value)}
                    placeholder="14.2"
                  />
                </div>
                <div>
                  <Label htmlFor="os-cylinder">Cylinder (CYL)</Label>
                  <Input
                    id="os-cylinder"
                    value={parameters.leftEye.cylinder}
                    onChange={(e) => handleParameterChange('leftEye', 'cylinder', e.target.value)}
                    placeholder="-0.75"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="os-axis">Axis</Label>
                  <Input
                    id="os-axis"
                    value={parameters.leftEye.axis}
                    onChange={(e) => handleParameterChange('leftEye', 'axis', e.target.value)}
                    placeholder="170"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </VSPCategorySection>

      {/* 5. Specialty Options */}
      <VSPCategorySection number={5} title="Specialty Options (Optional)">
        <VSPGrid2>
          {specialtyOptions.map(option => (
            <VSPSelectionButton
              key={option.id}
              selected={selectedSpecialties.includes(option.id)}
              onClick={() => handleSpecialtyToggle(option.id)}
              subtitle={option.subtitle}
              price={option.price ? formatPrice(option.price) : option.savings ? `${option.savings}% off` : option.discount ? `${option.discount}% off` : ''}
            >
              {option.name}
            </VSPSelectionButton>
          ))}
        </VSPGrid2>
      </VSPCategorySection>

      {/* Navigation Footer */}
      <NavigationFooter
        currentStep={3}
        totalSteps={3}
        onNext={handleNext}
        onBack={onBack}
        canProceed={canProceed()}
        validationErrors={[]}
        validationWarnings={[]}
        nextLabel="Complete Quote"
        backLabel="Back to Eyeglasses"
      />
    </div>
  )
}