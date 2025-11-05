'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Eye, 
  Calculator, 
  CheckCircle,
  AlertCircle,
  Percent
} from 'lucide-react'

interface ContactLensParameters {
  rightEye: {
    power: string
    baseCurve: string
    diameter: string
  }
  leftEye: {
    power: string
    baseCurve: string
    diameter: string
  }
}

interface ContactLensSelection {
  brand: string
  product: string
  type: 'daily' | 'weekly' | 'monthly' | 'extended' | ''
  parameters: ContactLensParameters
  quantity: number
  annualSupply: boolean
  rebateApplied: boolean
  fittingRequired: boolean
}

// Mock contact lens brands and products
const contactLensBrands = [
  {
    id: 'acuvue',
    name: 'ACUVUE',
    manufacturer: 'Johnson & Johnson',
    products: {
      daily: ['ACUVUE OASYS 1-Day', 'ACUVUE MOIST 1-Day', 'ACUVUE TruEye 1-Day'],
      weekly: ['ACUVUE OASYS', 'ACUVUE VITA'],
      monthly: ['ACUVUE OASYS', 'ACUVUE 2'],
      extended: ['ACUVUE OASYS for Astigmatism']
    },
    rebate: {
      annual: 100,
      description: '$100 rebate on annual supply'
    }
  },
  {
    id: 'biofinity',
    name: 'Biofinity',
    manufacturer: 'CooperVision',
    products: {
      daily: ['MyDay Daily Disposable', 'clariti 1 day'],
      weekly: ['Biofinity'],
      monthly: ['Biofinity', 'Avaira Vitality'],
      extended: ['Biofinity Toric', 'Biofinity Multifocal']
    },
    rebate: {
      annual: 80,
      description: '$80 rebate on annual supply'
    }
  },
  {
    id: 'dailies',
    name: 'DAILIES',
    manufacturer: 'Alcon',
    products: {
      daily: ['DAILIES TOTAL1', 'DAILIES AquaComfort Plus', 'DAILIES All Day Comfort'],
      weekly: ['AIR OPTIX AQUA'],
      monthly: ['AIR OPTIX plus HydraGlyde', 'AIR OPTIX AQUA'],
      extended: ['AIR OPTIX for Astigmatism']
    },
    rebate: {
      annual: 120,
      description: '$120 rebate on annual supply'
    }
  },
  {
    id: 'bausch',
    name: 'Bausch + Lomb',
    manufacturer: 'Bausch + Lomb',
    products: {
      daily: ['Biotrue ONEday', 'SofLens daily disposable'],
      weekly: ['Biotrue ONEday for Presbyopia'],
      monthly: ['ULTRA', 'PureVision2'],
      extended: ['ULTRA for Astigmatism']
    },
    rebate: {
      annual: 90,
      description: '$90 rebate on annual supply'
    }
  }
]

export function ContactLensLayer() {
  const [selection, setSelection] = useState<ContactLensSelection>({
    brand: '',
    product: '',
    type: '',
    parameters: {
      rightEye: { power: '', baseCurve: '', diameter: '' },
      leftEye: { power: '', baseCurve: '', diameter: '' }
    },
    quantity: 0,
    annualSupply: false,
    rebateApplied: false,
    fittingRequired: true
  })

  const [currentStep, setCurrentStep] = useState<'brand' | 'type' | 'product' | 'parameters' | 'quantity'>('brand')
  const [validation, setValidation] = useState<string[]>([])

  // Get selected brand data
  const selectedBrand = contactLensBrands.find(b => b.id === selection.brand)
  
  // Get available products for selected type
  const availableProducts = selectedBrand && selection.type 
    ? selectedBrand.products[selection.type] || []
    : []

  // Calculate pricing
  const basePrice = getBasePrice(selection.brand, selection.product, selection.type)
  const annualQuantity = getAnnualQuantity(selection.type)
  const totalPrice = selection.annualSupply ? basePrice * annualQuantity : basePrice * selection.quantity
  const rebateAmount = selection.annualSupply && selection.rebateApplied && selectedBrand ? selectedBrand.rebate.annual : 0
  const fittingFee = selection.fittingRequired ? 75 : 0
  const finalPrice = totalPrice - rebateAmount + fittingFee

  function getBasePrice(brand: string, product: string, type: string): number {
    // Mock pricing based on brand and type
    const basePrices: Record<string, Record<string, number>> = {
      acuvue: { daily: 35, weekly: 45, monthly: 55, extended: 65 },
      biofinity: { daily: 32, weekly: 42, monthly: 52, extended: 62 },
      dailies: { daily: 38, weekly: 48, monthly: 58, extended: 68 },
      bausch: { daily: 30, weekly: 40, monthly: 50, extended: 60 }
    }
    return basePrices[brand]?.[type] || 0
  }

  function getAnnualQuantity(type: string): number {
    const quantities: Record<string, number> = {
      daily: 8, // 8 boxes for annual supply
      weekly: 4, // 4 boxes for annual supply
      monthly: 4, // 4 boxes for annual supply
      extended: 2 // 2 boxes for annual supply
    }
    return quantities[type] || 0
  }

  function validateStep(): string[] {
    const errors: string[] = []
    
    switch (currentStep) {
      case 'brand':
        if (!selection.brand) errors.push('Please select a contact lens brand')
        break
      case 'type':
        if (!selection.type) errors.push('Please select a lens type')
        break
      case 'product':
        if (!selection.product) errors.push('Please select a specific product')
        break
      case 'parameters':
        if (!selection.parameters.rightEye.power) errors.push('Right eye power is required')
        if (!selection.parameters.leftEye.power) errors.push('Left eye power is required')
        if (!selection.parameters.rightEye.baseCurve) errors.push('Right eye base curve is required')
        if (!selection.parameters.leftEye.baseCurve) errors.push('Left eye base curve is required')
        break
      case 'quantity':
        if (!selection.annualSupply && selection.quantity < 1) errors.push('Please specify quantity or select annual supply')
        break
    }
    
    return errors
  }

  function handleNext() {
    const errors = validateStep()
    setValidation(errors)
    
    if (errors.length === 0) {
      const steps = ['brand', 'type', 'product', 'parameters', 'quantity'] as const
      const currentIndex = steps.indexOf(currentStep)
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1])
      }
    }
  }

  function handleBack() {
    const steps = ['brand', 'type', 'product', 'parameters', 'quantity'] as const
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  function copyRightToLeft() {
    setSelection(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        leftEye: { ...prev.parameters.rightEye }
      }
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Contact Lens Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {['brand', 'type', 'product', 'parameters', 'quantity'].map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step 
                    ? 'bg-blue-600 text-white' 
                    : index < ['brand', 'type', 'product', 'parameters', 'quantity'].indexOf(currentStep)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < ['brand', 'type', 'product', 'parameters', 'quantity'].indexOf(currentStep) ? 
                    <CheckCircle className="h-4 w-4" /> : 
                    index + 1
                  }
                </div>
                <span className="text-sm capitalize font-medium">{step}</span>
                {index < 4 && <div className="w-8 h-0.5 bg-gray-200" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validation.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validation.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Brand Selection */}
      {currentStep === 'brand' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Contact Lens Brand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contactLensBrands.map((brand) => (
                <div
                  key={brand.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selection.brand === brand.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelection(prev => ({ 
                    ...prev, 
                    brand: brand.id, 
                    product: '', 
                    type: '' 
                  }))}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{brand.name}</h3>
                    {selection.brand === brand.id && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{brand.manufacturer}</p>
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-xs">
                      <Percent className="h-3 w-3 mr-1" />
                      {brand.rebate.description}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lens Type Selection */}
      {currentStep === 'type' && selectedBrand && (
        <Card>
          <CardHeader>
            <CardTitle>Select Lens Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['daily', 'weekly', 'monthly', 'extended'].map((type) => (
                <div
                  key={type}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selection.type === type 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelection(prev => ({ 
                    ...prev, 
                    type: type as 'daily' | 'weekly' | 'monthly' | 'extended', 
                    product: '' 
                  }))}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {selection.type === type && (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <h3 className="font-semibold capitalize">{type} Disposable</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {type === 'daily' && 'New pair every day'}
                      {type === 'weekly' && 'Replace every 1-2 weeks'}
                      {type === 'monthly' && 'Replace every month'}
                      {type === 'extended' && 'Extended wear options'}
                    </p>
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        ${getBasePrice(selection.brand, '', type)} per box
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Selection */}
      {currentStep === 'product' && availableProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Specific Product</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableProducts.map((product) => (
                <div
                  key={product}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selection.product === product 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelection(prev => ({ ...prev, product }))}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{product}</h3>
                      <p className="text-sm text-gray-600">
                        {selectedBrand?.name} • {selection.type} disposable
                      </p>
                    </div>
                    {selection.product === product && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parameters */}
      {currentStep === 'parameters' && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Lens Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Right Eye */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Right Eye (OD)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="right-power">Power (Sphere)</Label>
                    <Select
                      value={selection.parameters.rightEye.power}
                      onValueChange={(value) => setSelection(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          rightEye: { ...prev.parameters.rightEye, power: value }
                        }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select power" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 21 }, (_, i) => {
                          const power = (i - 10) * 0.25
                          return (
                            <SelectItem key={power} value={power.toFixed(2)}>
                              {power > 0 ? '+' : ''}{power.toFixed(2)}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="right-bc">Base Curve</Label>
                    <Select
                      value={selection.parameters.rightEye.baseCurve}
                      onValueChange={(value) => setSelection(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          rightEye: { ...prev.parameters.rightEye, baseCurve: value }
                        }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select BC" />
                      </SelectTrigger>
                      <SelectContent>
                        {['8.4', '8.5', '8.6', '8.7', '8.8', '9.0'].map(bc => (
                          <SelectItem key={bc} value={bc}>{bc}mm</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="right-dia">Diameter</Label>
                    <Select
                      value={selection.parameters.rightEye.diameter}
                      onValueChange={(value) => setSelection(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          rightEye: { ...prev.parameters.rightEye, diameter: value }
                        }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select DIA" />
                      </SelectTrigger>
                      <SelectContent>
                        {['13.8', '14.0', '14.2', '14.5'].map(dia => (
                          <SelectItem key={dia} value={dia}>{dia}mm</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Left Eye */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Left Eye (OS)
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={copyRightToLeft}
                    disabled={!selection.parameters.rightEye.power}
                  >
                    Copy from Right Eye
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="left-power">Power (Sphere)</Label>
                    <Select
                      value={selection.parameters.leftEye.power}
                      onValueChange={(value) => setSelection(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          leftEye: { ...prev.parameters.leftEye, power: value }
                        }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select power" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 21 }, (_, i) => {
                          const power = (i - 10) * 0.25
                          return (
                            <SelectItem key={power} value={power.toFixed(2)}>
                              {power > 0 ? '+' : ''}{power.toFixed(2)}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="left-bc">Base Curve</Label>
                    <Select
                      value={selection.parameters.leftEye.baseCurve}
                      onValueChange={(value) => setSelection(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          leftEye: { ...prev.parameters.leftEye, baseCurve: value }
                        }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select BC" />
                      </SelectTrigger>
                      <SelectContent>
                        {['8.4', '8.5', '8.6', '8.7', '8.8', '9.0'].map(bc => (
                          <SelectItem key={bc} value={bc}>{bc}mm</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="left-dia">Diameter</Label>
                    <Select
                      value={selection.parameters.leftEye.diameter}
                      onValueChange={(value) => setSelection(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          leftEye: { ...prev.parameters.leftEye, diameter: value }
                        }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select DIA" />
                      </SelectTrigger>
                      <SelectContent>
                        {['13.8', '14.0', '14.2', '14.5'].map(dia => (
                          <SelectItem key={dia} value={dia}>{dia}mm</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contact Fitting */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fitting"
                    checked={selection.fittingRequired}
                    onCheckedChange={(checked) => setSelection(prev => ({
                      ...prev,
                      fittingRequired: checked as boolean
                    }))}
                  />
                  <Label htmlFor="fitting" className="text-sm font-medium">
                    Contact lens fitting required (+$75)
                  </Label>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  First-time contact lens wearers or new prescription changes require a fitting appointment
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quantity and Annual Supply */}
      {currentStep === 'quantity' && (
        <Card>
          <CardHeader>
            <CardTitle>Quantity and Supply Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Annual Supply Option */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox
                    id="annual"
                    checked={selection.annualSupply}
                    onCheckedChange={(checked) => setSelection(prev => ({
                      ...prev,
                      annualSupply: checked as boolean,
                      quantity: checked ? getAnnualQuantity(selection.type) : 0
                    }))}
                  />
                  <Label htmlFor="annual" className="text-sm font-medium">
                    Annual Supply ({getAnnualQuantity(selection.type)} boxes)
                  </Label>
                </div>
                <p className="text-sm text-gray-600">
                  Get the best value with an annual supply and qualify for manufacturer rebates
                </p>
                {selection.annualSupply && selectedBrand && (
                  <div className="mt-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="rebate"
                        checked={selection.rebateApplied}
                        onCheckedChange={(checked) => setSelection(prev => ({
                          ...prev,
                          rebateApplied: checked as boolean
                        }))}
                      />
                      <Label htmlFor="rebate" className="text-sm">
                        Apply {selectedBrand.rebate.description}
                      </Label>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Quantity */}
              {!selection.annualSupply && (
                <div>
                  <Label htmlFor="quantity">Number of Boxes</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="12"
                    value={selection.quantity}
                    onChange={(e) => setSelection(prev => ({
                      ...prev,
                      quantity: parseInt(e.target.value) || 0
                    }))}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Each box typically contains 30 lenses (daily) or 6 lenses (weekly/monthly)
                  </p>
                </div>
              )}

              {/* Pricing Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Pricing Summary
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Base Price ({selection.annualSupply ? getAnnualQuantity(selection.type) : selection.quantity} boxes):</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  {selection.fittingRequired && (
                    <div className="flex justify-between">
                      <span>Contact Fitting Fee:</span>
                      <span>${fittingFee.toFixed(2)}</span>
                    </div>
                  )}
                  {rebateAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Manufacturer Rebate:</span>
                      <span>-${rebateAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${finalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleBack}
          disabled={currentStep === 'brand'}
        >
          Back
        </Button>
        <div className="flex gap-2">
          {currentStep !== 'quantity' ? (
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button onClick={() => console.log('Contact lens selection complete', selection)}>
              Add to Quote
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}