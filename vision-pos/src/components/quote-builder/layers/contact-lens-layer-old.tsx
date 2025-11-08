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
  pricePerBox: number
  numberOfBoxes: number
  totalCostOfCLs: number // Calculated: pricePerBox × numberOfBoxes
  additionalSavings: number
  insuranceBenefit: number
  inOfficeTotal: number // Calculated: totalCostOfCLs - additionalSavings - insuranceBenefit
  manufacturerRebate: number
  afterRebateTotal: number // Calculated: inOfficeTotal - manufacturerRebate
  finalCostPerBox: number // Calculated: afterRebateTotal ÷ numberOfBoxes
}

interface ContactLensLayerProps {
  onNext: () => void
  onBack?: () => void
}

// Mock data - VSP-style contact lens brands
const contactBrands: ContactBrand[] = [
  { id: 'acuvue', name: 'ACUVUE', manufacturer: 'Johnson & Johnson', description: 'Premium daily & monthly lenses', rebateAmount: 100, insuranceCovered: true, copay: 25 },
  { id: 'biofinity', name: 'Biofinity', manufacturer: 'CooperVision', description: 'Silicone hydrogel technology', rebateAmount: 80, insuranceCovered: true, copay: 30 },
  { id: 'dailies', name: 'DAILIES', manufacturer: 'Alcon', description: 'Water gradient technology', rebateAmount: 120, insuranceCovered: true, copay: 20 },
  { id: 'bausch', name: 'Bausch + Lomb', manufacturer: 'Bausch + Lomb', description: 'Biotrue hydration technology', rebateAmount: 90, insuranceCovered: true, copay: 35 },
  { id: 'proclear', name: 'Proclear', manufacturer: 'CooperVision', description: 'Phosphorylcholine technology', rebateAmount: 75, insuranceCovered: true, copay: 25 },
  { id: 'optix', name: 'AIR OPTIX', manufacturer: 'Alcon', description: 'Breathable monthly lenses', rebateAmount: 110, insuranceCovered: true, copay: 40 }
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
  const { quote, updateContacts } = useQuoteStore()
  
  const [selectedBrand, setSelectedBrand] = useState<string | null>(quote.contacts?.brand || null)
  const [selectedLensType, setSelectedLensType] = useState<string | null>(quote.contacts?.type || null)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [parameters, setParameters] = useState<ContactParameters>({
    rightEye: {
      power: (quote.contacts?.parameters?.rightEye?.power || 0).toString(),
      baseCurve: (quote.contacts?.parameters?.rightEye?.baseCurve || 0).toString(),
      diameter: (quote.contacts?.parameters?.rightEye?.diameter || 0).toString(),
      cylinder: '',
      axis: ''
    },
    leftEye: {
      power: (quote.contacts?.parameters?.leftEye?.power || 0).toString(),
      baseCurve: (quote.contacts?.parameters?.leftEye?.baseCurve || 0).toString(),
      diameter: (quote.contacts?.parameters?.leftEye?.diameter || 0).toString(),
      cylinder: '',
      axis: ''
    }
  })
  
  const [quantity, setQuantity] = useState<number>(quote.contacts?.quantity || 1)
  const [fittingRequired, setFittingRequired] = useState<boolean>(true)

  // Progressive unlock logic
  const hasSelectedBrand = Boolean(selectedBrand)
  const hasSelectedLensType = Boolean(selectedLensType)
  const hasCompletedParameters = Boolean(
    parameters.rightEye.power && parameters.rightEye.baseCurve && parameters.rightEye.diameter &&
    parameters.leftEye.power && parameters.leftEye.baseCurve && parameters.leftEye.diameter
  )
  const canSelectSpecialties = hasSelectedBrand && hasSelectedLensType && hasCompletedParameters

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrand(brandId)
    const brand = contactBrands.find(b => b.id === brandId)
    if (brand) {
      updateContacts({
        brand: brand.id
      })
    }
  }

  const handleLensTypeSelect = (lensTypeId: string) => {
    setSelectedLensType(lensTypeId)
    const lensType = lensTypes.find(l => l.id === lensTypeId)
    if (lensType && (lensTypeId === 'daily' || lensTypeId === 'weekly' || lensTypeId === 'monthly' || lensTypeId === 'extended')) {
      updateContacts({
        type: lensTypeId
      })
    }
  }

  const handleSpecialtyToggle = (specialtyId: string) => {
    const newSpecialties = selectedSpecialties.includes(specialtyId)
      ? selectedSpecialties.filter(id => id !== specialtyId)
      : [...selectedSpecialties, specialtyId]
    
    setSelectedSpecialties(newSpecialties)
    // Handle annual supply in the store
    if (specialtyId === 'annual-supply') {
      updateContacts({
        annualSupply: newSpecialties.includes('annual-supply')
      })
    }
  }

  const handleParameterChange = (eye: 'rightEye' | 'leftEye', field: string, value: string) => {
    const newParameters = {
      ...parameters,
      [eye]: {
        ...parameters[eye],
        [field]: value
      }
    }
    setParameters(newParameters)
    
    // Convert to numbers for the store
    const storeParameters = {
      rightEye: {
        power: parseFloat(newParameters.rightEye.power) || 0,
        baseCurve: parseFloat(newParameters.rightEye.baseCurve) || 0,
        diameter: parseFloat(newParameters.rightEye.diameter) || 0
      },
      leftEye: {
        power: parseFloat(newParameters.leftEye.power) || 0,
        baseCurve: parseFloat(newParameters.leftEye.baseCurve) || 0,
        diameter: parseFloat(newParameters.leftEye.diameter) || 0
      }
    }
    
    updateContacts({
      parameters: storeParameters
    })
  }

  const copyRightToLeft = () => {
    const newParameters = {
      ...parameters,
      leftEye: { ...parameters.rightEye }
    }
    setParameters(newParameters)
    
    // Convert to numbers for the store
    const storeParameters = {
      rightEye: {
        power: parseFloat(newParameters.rightEye.power) || 0,
        baseCurve: parseFloat(newParameters.rightEye.baseCurve) || 0,
        diameter: parseFloat(newParameters.rightEye.diameter) || 0
      },
      leftEye: {
        power: parseFloat(newParameters.leftEye.power) || 0,
        baseCurve: parseFloat(newParameters.leftEye.baseCurve) || 0,
        diameter: parseFloat(newParameters.leftEye.diameter) || 0
      }
    }
    
    updateContacts({
      parameters: storeParameters
    })
  }

  const isSpecialtySelected = (specialtyId: string) => {
    return selectedSpecialties.includes(specialtyId)
  }

  const calculateTotal = () => {
    const brand = contactBrands.find(b => b.id === selectedBrand)
    const lensType = lensTypes.find(l => l.id === selectedLensType)
    const selectedSpecialtyItems = specialtyOptions.filter(s => selectedSpecialties.includes(s.id))

    const basePrice = lensType?.price || 0
    const fittingFee = fittingRequired ? 75 : 0
    const specialtyPrices = selectedSpecialtyItems.reduce((sum, item) => {
      return sum + (item.price || 0)
    }, 0)

    // Annual supply calculation
    const isAnnualSupply = selectedSpecialties.includes('annual-supply')
    const annualDiscount = isAnnualSupply ? basePrice * quantity * 0.15 : 0
    
    const subtotal = (basePrice * quantity) + fittingFee + specialtyPrices - annualDiscount
    
    // Insurance calculations
    const brandCopay = brand?.insuranceCovered ? (brand.copay || 0) : basePrice
    const lensTypeCopay = lensType?.insuranceCovered ? (lensType.copay || 0) : basePrice
    const fittingCopay = fittingRequired ? 35 : 0 // Insurance covers part of fitting
    
    const patientResponsibility = (brandCopay + lensTypeCopay) * quantity + fittingCopay + specialtyPrices - annualDiscount

    return { subtotal, patientResponsibility, annualDiscount }
  }

  // Validation functions
  const getValidationErrors = (): string[] => {
    const errors: string[] = []
    if (!selectedBrand) errors.push('Please select a contact lens brand')
    if (!selectedLensType) errors.push('Please select lens type')
    if (!hasCompletedParameters) errors.push('Please complete lens parameters for both eyes')
    return errors
  }

  const getValidationWarnings = (): string[] => {
    const warnings: string[] = []
    if (!selectedSpecialties.includes('annual-supply')) {
      warnings.push('Consider annual supply for 15% savings and rebate eligibility')
    }
    if (!fittingRequired && selectedLensType) {
      warnings.push('Professional fitting recommended for optimal comfort and safety')
    }
    return warnings
  }

  const canProceedWithSelection = (): boolean => {
    return hasSelectedBrand && hasSelectedLensType && hasCompletedParameters
  }

  const handleNext = () => {
    if (canProceedWithSelection()) {
      updateContacts({
        quantity
      })
      onNext()
    }
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  const getSelectedItemSummary = () => {
    const brand = contactBrands.find(b => b.id === selectedBrand)
    const lensType = lensTypes.find(l => l.id === selectedLensType)
    const selectedSpecialtyItems = specialtyOptions.filter(s => selectedSpecialties.includes(s.id))

    return {
      brand: brand?.name || '',
      lensType: lensType?.name || '',
      parameters: hasCompletedParameters ? 'Complete' : 'Incomplete',
      specialties: selectedSpecialtyItems.map(s => s.name).join(', ') || 'None'
    }
  }

  const summary = getSelectedItemSummary()

  // Generate power options for dropdowns
  const powerOptions = Array.from({ length: 41 }, (_, i) => {
    const power = (i - 20) * 0.25
    return {
      value: power.toFixed(2),
      label: `${power > 0 ? '+' : ''}${power.toFixed(2)}`
    }
  })

  const baseCurveOptions = ['8.3', '8.4', '8.5', '8.6', '8.7', '8.8', '9.0']
  const diameterOptions = ['13.8', '14.0', '14.2', '14.5']
  const cylinderOptions = Array.from({ length: 21 }, (_, i) => {
    const cylinder = (i - 10) * 0.25
    return {
      value: cylinder.toFixed(2),
      label: `${cylinder > 0 ? '+' : ''}${cylinder.toFixed(2)}`
    }
  })
  const axisOptions = Array.from({ length: 18 }, (_, i) => ((i + 1) * 10).toString())

  return (
    <div className="space-y-8 bg-vsp-light min-h-screen p-6">
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-vsp-title text-2xl mb-2">Contact Lenses</h2>
        <p className="text-vsp-subtitle">Select contact lens brand, type, and configure your prescription parameters.</p>
      </div>

      {/* Selection Summary Breadcrumb */}
      {(hasSelectedBrand || hasSelectedLensType || hasCompletedParameters || selectedSpecialties.length > 0) && (
        <div className="bg-white p-4 rounded-lg border border-neutral-200">
          <h4 className="text-vsp-label mb-3">Current Selection</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-neutral-500">Brand:</span>
              <p className={`font-medium ${summary.brand ? 'text-vsp-selected' : 'text-neutral-400'}`}>
                {summary.brand || 'Not selected'}
              </p>
            </div>
            <div>
              <span className="text-neutral-500">Lens Type:</span>
              <p className={`font-medium ${summary.lensType ? 'text-vsp-selected' : 'text-neutral-400'}`}>
                {summary.lensType || 'Not selected'}
              </p>
            </div>
            <div>
              <span className="text-neutral-500">Parameters:</span>
              <p className={`font-medium ${summary.parameters === 'Complete' ? 'text-vsp-selected' : 'text-neutral-400'}`}>
                {summary.parameters}
              </p>
            </div>
            <div>
              <span className="text-neutral-500">Options:</span>
              <p className={`font-medium ${summary.specialties !== 'None' ? 'text-vsp-selected' : 'text-neutral-400'}`}>
                {summary.specialties}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Brand Selection */}
      <VSPCategorySection number={1} title="Select Contact Lens Brand">
        <VSPGrid3>
          {contactBrands.map(brand => (
            <VSPSelectionButton
              key={brand.id}
              selected={selectedBrand === brand.id}
              onClick={() => handleBrandSelect(brand.id)}
              subtitle={brand.manufacturer}
              price={brand.insuranceCovered ? `$${brand.copay} copay` : ''}
            >
              {brand.name}
            </VSPSelectionButton>
          ))}
        </VSPGrid3>
        <p className="text-xs text-neutral-500 mt-2">Select a brand to continue</p>
      </VSPCategorySection>

      {/* Step 2: Lens Type Selection - Only show if brand selected */}
      {hasSelectedBrand && (
        <VSPCategorySection number={2} title="Select Lens Type">
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
          <p className="text-xs text-neutral-500 mt-2">Choose your lens replacement schedule</p>
        </VSPCategorySection>
      )}

      {/* Step 3: Prescription Parameters - Only show if lens type selected */}
      {hasSelectedLensType && (
        <VSPCategorySection number={3} title="Enter Prescription Parameters">
          <div className="space-y-6">
            
            {/* Right Eye */}
            <div className="bg-white p-4 rounded-lg border border-neutral-200">
              <h5 className="text-vsp-label mb-4">Right Eye (OD)</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-neutral-600">Power (SPH)</Label>
                  <Select
                    value={parameters.rightEye.power}
                    onValueChange={(value) => handleParameterChange('rightEye', 'power', value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Power" />
                    </SelectTrigger>
                    <SelectContent>
                      {powerOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-neutral-600">Base Curve</Label>
                  <Select
                    value={parameters.rightEye.baseCurve}
                    onValueChange={(value) => handleParameterChange('rightEye', 'baseCurve', value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="BC" />
                    </SelectTrigger>
                    <SelectContent>
                      {baseCurveOptions.map(bc => (
                        <SelectItem key={bc} value={bc}>
                          {bc}mm
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-neutral-600">Diameter</Label>
                  <Select
                    value={parameters.rightEye.diameter}
                    onValueChange={(value) => handleParameterChange('rightEye', 'diameter', value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="DIA" />
                    </SelectTrigger>
                    <SelectContent>
                      {diameterOptions.map(dia => (
                        <SelectItem key={dia} value={dia}>
                          {dia}mm
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedLensType === 'toric' && (
                  <>
                    <div>
                      <Label className="text-xs text-neutral-600">Cylinder</Label>
                      <Select
                        value={parameters.rightEye.cylinder || ''}
                        onValueChange={(value) => handleParameterChange('rightEye', 'cylinder', value)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="CYL" />
                        </SelectTrigger>
                        <SelectContent>
                          {cylinderOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-neutral-600">Axis</Label>
                      <Select
                        value={parameters.rightEye.axis || ''}
                        onValueChange={(value) => handleParameterChange('rightEye', 'axis', value)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="AXIS" />
                        </SelectTrigger>
                        <SelectContent>
                          {axisOptions.map(axis => (
                            <SelectItem key={axis} value={axis}>
                              {axis}°
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Left Eye */}
            <div className="bg-white p-4 rounded-lg border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-vsp-label">Left Eye (OS)</h5>
                <button
                  type="button"
                  onClick={copyRightToLeft}
                  className="text-xs text-vsp-primary hover:text-vsp-primary-dark px-3 py-1 rounded border border-vsp-primary/20"
                  disabled={!parameters.rightEye.power}
                >
                  Copy from Right
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-neutral-600">Power (SPH)</Label>
                  <Select
                    value={parameters.leftEye.power}
                    onValueChange={(value) => handleParameterChange('leftEye', 'power', value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Power" />
                    </SelectTrigger>
                    <SelectContent>
                      {powerOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-neutral-600">Base Curve</Label>
                  <Select
                    value={parameters.leftEye.baseCurve}
                    onValueChange={(value) => handleParameterChange('leftEye', 'baseCurve', value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="BC" />
                    </SelectTrigger>
                    <SelectContent>
                      {baseCurveOptions.map(bc => (
                        <SelectItem key={bc} value={bc}>
                          {bc}mm
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-neutral-600">Diameter</Label>
                  <Select
                    value={parameters.leftEye.diameter}
                    onValueChange={(value) => handleParameterChange('leftEye', 'diameter', value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="DIA" />
                    </SelectTrigger>
                    <SelectContent>
                      {diameterOptions.map(dia => (
                        <SelectItem key={dia} value={dia}>
                          {dia}mm
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedLensType === 'toric' && (
                  <>
                    <div>
                      <Label className="text-xs text-neutral-600">Cylinder</Label>
                      <Select
                        value={parameters.leftEye.cylinder || ''}
                        onValueChange={(value) => handleParameterChange('leftEye', 'cylinder', value)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="CYL" />
                        </SelectTrigger>
                        <SelectContent>
                          {cylinderOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-neutral-600">Axis</Label>
                      <Select
                        value={parameters.leftEye.axis || ''}
                        onValueChange={(value) => handleParameterChange('leftEye', 'axis', value)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="AXIS" />
                        </SelectTrigger>
                        <SelectContent>
                          {axisOptions.map(axis => (
                            <SelectItem key={axis} value={axis}>
                              {axis}°
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quantity & Fitting */}
            <div className="bg-white p-4 rounded-lg border border-neutral-200">
              <h5 className="text-vsp-label mb-4">Supply & Fitting Options</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-neutral-600">Number of Boxes</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="h-10"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="fitting"
                    checked={fittingRequired}
                    onCheckedChange={(checked) => setFittingRequired(checked as boolean)}
                  />
                  <Label htmlFor="fitting" className="text-sm">
                    Contact lens fitting (+$75)
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-2">Complete all prescription parameters to continue</p>
        </VSPCategorySection>
      )}

      {/* Step 4: Specialty Options - Only show if parameters complete */}
      {canSelectSpecialties && (
        <VSPCategorySection number={4} title="Additional Options (Optional)">
          <VSPGrid2>
            {specialtyOptions.map(option => (
              <VSPSelectionButton
                key={option.id}
                selected={isSpecialtySelected(option.id)}
                onClick={() => handleSpecialtyToggle(option.id)}
                subtitle={option.subtitle}
                price={option.price ? formatPrice(option.price) : (option.savings ? `${option.savings}% off` : option.discount ? `${option.discount}% off` : '')}
              >
                {option.name}
              </VSPSelectionButton>
            ))}
          </VSPGrid2>
          <p className="text-xs text-neutral-500 mt-2">Select additional services to enhance your contact lens experience</p>
        </VSPCategorySection>
      )}

      {/* Pricing Summary */}
      {canProceedWithSelection() && (
        <div className="bg-white p-4 rounded-lg border border-neutral-200">
          <h4 className="text-vsp-label mb-3">Pricing Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Estimated Total:</span>
              <span className="font-semibold">{formatPrice(calculateTotal().subtotal)}</span>
            </div>
            {calculateTotal().annualDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Annual Supply Savings:</span>
                <span className="font-semibold">-{formatPrice(calculateTotal().annualDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-vsp-primary">
              <span>Your Cost (with insurance):</span>
              <span className="font-semibold">{formatPrice(calculateTotal().patientResponsibility)}</span>
            </div>
            {selectedSpecialties.includes('annual-supply') && (
              <p className="text-xs text-green-600 mt-2">
                Annual supply qualifies for manufacturer rebate up to ${contactBrands.find(b => b.id === selectedBrand)?.rebateAmount || 0}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <NavigationFooter
        currentStep={3}
        totalSteps={3}
        onNext={handleNext}
        onBack={onBack}
        canProceed={canProceedWithSelection()}
        validationErrors={getValidationErrors()}
        validationWarnings={getValidationWarnings()}
        nextLabel="Complete Quote"
        backLabel="Back to Eyeglasses"
      />
    </div>
  )
}