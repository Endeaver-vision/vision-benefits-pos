'use client'

import { useState, useCallback, useEffect } from 'react'
import { NavigationFooter } from '@/components/quote-builder/layout/navigation-footer'
import { 
  VSPCategorySection, 
  VSPSelectionButton, 
  VSPGrid2, 
  VSPGrid3 
} from '@/components/ui/vsp-components'
import { useQuoteStore } from '@/store/quote-store'
import { getActiveBrands } from '@/data/frame-brands'
import { POFWorkflow } from '@/components/quote-builder/pof/pof-workflow'
import { POFWorkflowEnhanced } from '@/components/quote-builder/pof/pof-workflow-enhanced'
import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'

interface ManualFrameInfo {
  brand: string
  model: string
  color: string
  size: string
  style: 'Full Rim' | 'Semi-Rimless' | 'Rimless'
  price: number
  isPatientOwned: boolean
  isFreeAdd: boolean
}

interface EyeglassesLayerProps {
  onNext: () => void
  onBack?: () => void
}

// UC Price List - Lens Types
const lensTypes = [
  { id: 'single-vision', name: 'Single Vision', price: 80.00, insuranceCovered: true },
  { id: 'eyezen', name: 'Eyezen', price: 130.00, insuranceCovered: true },
  { id: 'ft-bifocal', name: 'FT Bifocal', price: 182.00, insuranceCovered: true },
  { id: 'ft-trifocal', name: 'FT Trifocal', price: 135.00, insuranceCovered: true },
  { id: 'varilux-comfort-drx', name: 'Varilux Comfort DRx', price: 280.00, insuranceCovered: true },
  { id: 'varilux-comfort-max', name: 'Varilux Comfort Max', price: 394.00, insuranceCovered: true },
  { id: 'varilux-i', name: 'Varilux i', price: 480.00, insuranceCovered: false, note: 'cash pay only - no vision plans' },
  { id: 'varilux-x', name: 'Varilux X', price: 600.00, insuranceCovered: true },
  { id: 'neurolens-sv', name: 'Neurolens SV', price: 400.00, insuranceCovered: false, note: 'cash pay only - no vision plans' },
  { id: 'neurolens-progressive', name: 'Neurolens Progressive', price: 700.00, insuranceCovered: false, note: 'cash pay only - no vision plans' }
]

// UC Price List - Lens Materials
const lensMaterials = [
  { id: 'plastic', name: 'CR-39', price: 0.00, insuranceCovered: true },
  { id: 'polycarbonate', name: 'Polycarbonate', price: 65.00, insuranceCovered: true },
  { id: 'trivex', name: 'Trivex', price: 75.00, insuranceCovered: true },
  { id: 'high-index', name: 'High Index 1.67', price: 130.00, insuranceCovered: true },
  { id: 'ultra-high-index', name: 'Ultra High Index 1.72', price: 150.00, insuranceCovered: true }
]

// UC Price List - AR Coatings
const arCoatings = [
  { id: 'crizal-ez-pro', name: 'Crizal EZ Pro', price: 111.00, insuranceCovered: true },
  { id: 'crizal-rock', name: 'Crizal Rock', price: 158.00, insuranceCovered: true },
  { id: 'crizal-sunshield', name: 'Crizal SunShield', price: 135.00, insuranceCovered: true },
  { id: 'crizal-prevencia', name: 'Crizal Prevencia', price: 187.00, insuranceCovered: true },
  { id: 'crizal-sapphire', name: 'Crizal Sapphire', price: 187.00, insuranceCovered: true },
  { id: 'neurolens-premium', name: 'Neurolens Premium', price: 180.00, insuranceCovered: false, note: 'cash pay only - no vision plans' },
  { id: 'neurolens-blue', name: 'Neurolens Blue', price: 180.00, insuranceCovered: false, note: 'cash pay only - no vision plans' },
  { id: 'opt-out', name: 'Opt Out', price: 0.00, insuranceCovered: true }
]

// UC Price List - Transitions
const transitionsOptions = [
  { id: 'gen-s', name: 'Transitions Gen S', price: 167.50, insuranceCovered: true },
  { id: 'xtra-active', name: 'Transitions Xtra Active', price: 167.50, insuranceCovered: true },
  { id: 'opt-out', name: 'Opt Out', price: 0.00, insuranceCovered: true }
]

// UC Price List - Polarized
const polarizedOptions = [
  { id: 'polarized', name: 'Polarized', price: 129.75, insuranceCovered: true },
  { id: 'opt-out', name: 'Opt Out', price: 0.00, insuranceCovered: true }
]

// UC Price List - Mount Fees
const mountFees = [
  { id: 'full-rim', name: 'Full Rim', price: 0.00 },
  { id: 'semi-rimless', name: 'Semi-Rimless', price: 35.00 },
  { id: 'rimless', name: 'Rimless', price: 47.00 }
]

// UC Price List - Lens Add-ons
const lensAddons = [
  { id: 'uv', name: 'UV Protection', price: 15.00, insuranceCovered: true },
  { id: 'mirror', name: 'Mirror Coating', price: 45.00, insuranceCovered: true },
  { id: 'tint', name: 'Tint', price: 30.00, insuranceCovered: true },
  { id: 'oversize', name: 'Oversize Lenses', price: 30.00, insuranceCovered: true },
  { id: 'tech-sv', name: 'Tech Add-on Single Vision', price: 10.00, insuranceCovered: true, note: 'VSP plan specific' },
  { id: 'tech-mf', name: 'Tech Add-on Multifocal', price: 40.00, insuranceCovered: true, note: 'VSP plan specific' },
  { id: 'prism', name: 'Prism Per D', price: 12.00, insuranceCovered: true },
  { id: 'essential-blue', name: 'Essential Blue', price: 40.00, insuranceCovered: true },
  { id: 'roll-polish', name: 'Roll and Polish', price: 30.00, insuranceCovered: true }
]

export default function EyeglassesLayer({ onNext, onBack }: EyeglassesLayerProps) {
  const { updateEyeglasses, updatePricing, saveQuote, quote } = useQuoteStore()
  
  // Initialize frame selection state from store or defaults
  const [frameSource, setFrameSource] = useState<'brand' | 'manual' | 'free-add' | 'pof'>('brand')
  const [selectedBrand, setSelectedBrand] = useState<string>(() => 
    quote.eyeglasses.frame?.brand || ''
  )
  const [brandPanelOpen, setBrandPanelOpen] = useState<boolean>(false)
  const [manualFrameInfo, setManualFrameInfo] = useState<ManualFrameInfo>({
    brand: '',
    model: '',
    color: '',
    size: '',
    style: 'Full Rim',
    price: 0,
    isPatientOwned: false,
    isFreeAdd: false
  })

  // POF workflow state
  const [showPOFWorkflow, setShowPOFWorkflow] = useState(false)
  const [showEnhancedPOFWorkflow, setShowEnhancedPOFWorkflow] = useState(false)
  const [pofCompleted, setPofCompleted] = useState(false)
  const [pofFrameDetails, setPofFrameDetails] = useState<any>(null)

  // Mock user data - in real app this would come from session/context
  const [mockUser] = useState({
    name: 'John Smith',
    isManager: true // This would be determined by user role
  })

  // Mock customer data - in real app this would come from quote context
  const [mockCustomer] = useState({
    id: 'cust001',
    name: 'Jane Doe'
  })

  // Lens selection state - initialize from store
  const [selectedLensType, setSelectedLensType] = useState<string>(() => 
    quote.eyeglasses.lenses?.type || ''
  )
  const [selectedLensMaterial, setSelectedLensMaterial] = useState<string>(() => 
    quote.eyeglasses.lenses?.material || ''
  )
  const [selectedArCoating, setSelectedArCoating] = useState<string>(() => 
    quote.eyeglasses.enhancements?.find(e => e.includes('ar-')) || ''
  )
  const [selectedTransitions, setSelectedTransitions] = useState<string>(() => 
    quote.eyeglasses.enhancements?.find(e => e.includes('transitions')) || ''
  )
  const [selectedPolarized, setSelectedPolarized] = useState<string>(() => 
    quote.eyeglasses.enhancements?.find(e => e.includes('polarized')) || ''
  )
  const [selectedAddons, setSelectedAddons] = useState<string[]>(() => 
    quote.eyeglasses.enhancements?.filter(e => !e.includes('ar-') && !e.includes('transitions') && !e.includes('polarized')) || []
  )

  const activeBrands = getActiveBrands()

  const calculateTotal = useCallback(() => {
    let total = 0

    // Frame cost
    if (frameSource === 'manual' || frameSource === 'free-add' || frameSource === 'pof') {
      total += frameSource === 'pof' ? 45.00 : manualFrameInfo.price
    }

    // Lens type cost
    const lensType = lensTypes.find(l => l.id === selectedLensType)
    if (lensType) total += lensType.price

    // Lens material cost
    const lensMaterial = lensMaterials.find(m => m.id === selectedLensMaterial)
    if (lensMaterial) total += lensMaterial.price

    // AR coating cost
    const arCoating = arCoatings.find(c => c.id === selectedArCoating)
    if (arCoating) total += arCoating.price

    // Transitions cost
    const transitions = transitionsOptions.find(t => t.id === selectedTransitions)
    if (transitions) total += transitions.price

    // Polarized cost
    const polarized = polarizedOptions.find(p => p.id === selectedPolarized)
    if (polarized) total += polarized.price

    // Mount fee
    const mountFee = mountFees.find(m => m.id === manualFrameInfo.style.toLowerCase().replace(' ', '-'))
    if (mountFee) total += mountFee.price

    // Add-ons cost
    selectedAddons.forEach(addonId => {
      const addon = lensAddons.find(a => a.id === addonId)
      if (addon) total += addon.price
    })

    return total
  }, [frameSource, manualFrameInfo, selectedLensType, selectedLensMaterial, selectedArCoating, 
      selectedTransitions, selectedPolarized, selectedAddons])

  // Update pricing in real-time when selections change
  useEffect(() => {
    const totalCost = calculateTotal()
    
    updatePricing({
      eyeglasses: {
        frame: frameSource === 'manual' || frameSource === 'free-add' || frameSource === 'pof' ? 
               (frameSource === 'pof' ? 45.00 : manualFrameInfo.price) : 0,
        lenses: (lensTypes.find(l => l.id === selectedLensType)?.price || 0) + 
                (lensMaterials.find(m => m.id === selectedLensMaterial)?.price || 0),
        enhancements: (arCoatings.find(c => c.id === selectedArCoating)?.price || 0) +
                     (transitionsOptions.find(t => t.id === selectedTransitions)?.price || 0) +
                     (polarizedOptions.find(p => p.id === selectedPolarized)?.price || 0) +
                     selectedAddons.reduce((sum, addonId) => 
                       sum + (lensAddons.find(a => a.id === addonId)?.price || 0), 0
                     ),
        total: totalCost
      }
    })
  }, [frameSource, manualFrameInfo, selectedLensType, selectedLensMaterial, selectedArCoating,
      selectedTransitions, selectedPolarized, selectedAddons, calculateTotal, updatePricing])

  const saveEyeglassesData = useCallback(async () => {
    try {
      // Calculate total cost first
      const totalCost = calculateTotal()
      
      updateEyeglasses({
        frame: frameSource === 'brand' && selectedBrand ? {
          id: selectedBrand,
          brand: activeBrands.find(b => b.id === selectedBrand)?.name || selectedBrand,
          model: '',
          price: 0,
          style: 'full-rim' as const,
          material: 'plastic' as const
        } : frameSource === 'manual' || frameSource === 'free-add' || frameSource === 'pof' ? {
          id: `manual-${manualFrameInfo.brand}-${manualFrameInfo.model}`,
          brand: manualFrameInfo.brand,
          model: manualFrameInfo.model,
          price: manualFrameInfo.price,
          style: manualFrameInfo.style.toLowerCase().replace(' ', '-') as 'full-rim' | 'semi-rimless' | 'rimless',
          material: 'plastic' as const
        } : null,
        lenses: {
          type: selectedLensType as '' | 'single-vision' | 'progressive' | 'bifocal' | 'computer',
          material: selectedLensMaterial as '' | 'plastic' | 'polycarbonate' | 'high-index' | 'trivex',
          arCoating: selectedArCoating ? {
            productId: selectedArCoating,
            price: 0
          } : undefined
        },
        enhancements: [
          ...(selectedArCoating ? [selectedArCoating] : []),
          ...(selectedTransitions ? [selectedTransitions] : []),
          ...(selectedPolarized ? [selectedPolarized] : []),
          ...selectedAddons
        ]
      })
      
      // Update pricing totals
      updatePricing({
        eyeglasses: {
          frame: frameSource === 'manual' || frameSource === 'free-add' || frameSource === 'pof' ? 
                 (frameSource === 'pof' ? 45.00 : manualFrameInfo.price) : 0,
          lenses: (lensTypes.find(l => l.id === selectedLensType)?.price || 0) + 
                  (lensMaterials.find(m => m.id === selectedLensMaterial)?.price || 0),
          enhancements: (arCoatings.find(c => c.id === selectedArCoating)?.price || 0) +
                       (transitionsOptions.find(t => t.id === selectedTransitions)?.price || 0) +
                       (polarizedOptions.find(p => p.id === selectedPolarized)?.price || 0) +
                       selectedAddons.reduce((sum, addonId) => 
                         sum + (lensAddons.find(a => a.id === addonId)?.price || 0), 0
                       ),
          total: totalCost
        }
      })
      
      await saveQuote()
    } catch (error) {
      console.error('Failed to save eyeglasses data:', error)
    }
  }, [frameSource, selectedBrand, manualFrameInfo, selectedLensType, selectedLensMaterial, 
      selectedArCoating, selectedTransitions, selectedPolarized, selectedAddons, 
      updateEyeglasses, updatePricing, saveQuote, activeBrands, calculateTotal])

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrand(brandId)
    setFrameSource('brand')
    setBrandPanelOpen(false) // Close panel after selection
  }

  const handleManualFrameUpdate = (field: keyof ManualFrameInfo, value: string | number | boolean) => {
    setManualFrameInfo(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLensTypeSelect = (lensTypeId: string) => {
    setSelectedLensType(lensTypeId)
  }

  const handleLensMaterialSelect = (materialId: string) => {
    setSelectedLensMaterial(materialId)
  }

  const handleArCoatingSelect = (coatingId: string) => {
    setSelectedArCoating(coatingId)
  }

  const handleTransitionsSelect = (transitionId: string) => {
    setSelectedTransitions(transitionId)
  }

  const handlePolarizedSelect = (polarizedId: string) => {
    setSelectedPolarized(polarizedId)
  }

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    )
  }

  const formatPrice = (price: number) => `$${price.toFixed(2)}`

  // POF workflow handlers
  const handlePOFComplete = (pofData: any) => {
    setPofFrameDetails(pofData.frameDetails)
    setPofCompleted(true)
    setShowPOFWorkflow(false)
    setShowEnhancedPOFWorkflow(false)
    
    // Update the frame info with POF details
    setManualFrameInfo({
      brand: pofData.frameDetails.brand,
      model: pofData.frameDetails.model,
      color: pofData.frameDetails.color,
      size: '',
      style: 'Full Rim',
      price: 45.00, // POF fixed fee
      isPatientOwned: true,
      isFreeAdd: false
    })
  }

  const handlePOFCancel = () => {
    setShowPOFWorkflow(false)
    setShowEnhancedPOFWorkflow(false)
    setFrameSource('brand') // Reset to default
  }

  const canProceed = () => {
    const hasFrame = frameSource === 'brand' ? selectedBrand : 
                    frameSource === 'pof' ? pofCompleted :
                    (manualFrameInfo.brand && manualFrameInfo.model)
    return Boolean(hasFrame && selectedLensType && selectedLensMaterial)
  }

  const handleNext = async () => {
    if (canProceed()) {
      // Save current state before navigation
      await saveEyeglassesData()
      onNext()
    }
  }

  return (
    <div className="space-y-8 bg-neutral-50 min-h-screen p-6">
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-blue-900 mb-2">Eyeglasses</h2>
        <p className="text-neutral-600">Select frame, lenses, and options for your prescription glasses.</p>
      </div>

      {/* 1. Frame Selection */}
      <VSPCategorySection number={1} title="Frame Selection">
        {/* Frame Source Selection */}
        <div className="mb-6">
          <VSPGrid3>
            <VSPSelectionButton
              selected={frameSource === 'brand'}
              onClick={() => setFrameSource('brand')}
            >
              Brand Selection
            </VSPSelectionButton>
            <VSPSelectionButton
              selected={frameSource === 'manual'}
              onClick={() => setFrameSource('manual')}
            >
              Manual Entry
            </VSPSelectionButton>
            <div className="space-y-2">
              <VSPSelectionButton
                selected={frameSource === 'pof'}
                onClick={() => {
                  setFrameSource('pof')
                  setShowPOFWorkflow(true)
                }}
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Patient-Owned Frame (Standard)
                </div>
                {pofCompleted && (
                  <Badge className="mt-1 bg-green-100 text-green-800">
                    POF Setup Complete
                  </Badge>
                )}
              </VSPSelectionButton>
              <VSPSelectionButton
                selected={false}
                onClick={() => {
                  setFrameSource('pof')
                  setShowEnhancedPOFWorkflow(true)
                }}
                className="border-blue-200 bg-blue-50 hover:bg-blue-100"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700">Patient-Owned Frame (Enhanced)</span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Advanced validation • Real-time notifications • Async operations
                </div>
              </VSPSelectionButton>
            </div>
          </VSPGrid3>
        </div>

        {/* Brand Selection */}
        {frameSource === 'brand' && (
          <div>
            {!selectedBrand && !brandPanelOpen && (
              // Default collapsed state - show "Select Frame Brand" button
              <div className="text-center">
                <VSPSelectionButton
                  selected={false}
                  onClick={() => setBrandPanelOpen(true)}
                  subtitle="Choose from 40+ frame brands"
                >
                  Select Frame Brand
                </VSPSelectionButton>
              </div>
            )}
            
            {!selectedBrand && brandPanelOpen && (
              // Panel open state - show all brands
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold">Select Frame Brand</h4>
                  <button
                    onClick={() => setBrandPanelOpen(false)}
                    className="text-neutral-500 hover:text-neutral-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {activeBrands.map(brand => (
                    <VSPSelectionButton
                      key={brand.id}
                      selected={false}
                      onClick={() => handleBrandSelect(brand.id)}
                    >
                      {brand.name}
                    </VSPSelectionButton>
                  ))}
                </div>
              </div>
            )}
            
            {selectedBrand && (
              // Selected state - show selected brand only
              <div>
                <h4 className="text-lg font-semibold mb-4">Selected Frame Brand</h4>
                <div className="flex items-center gap-4">
                  <VSPSelectionButton
                    selected={true}
                    onClick={() => {}}
                  >
                    {activeBrands.find(b => b.id === selectedBrand)?.name || selectedBrand}
                  </VSPSelectionButton>
                  <button
                    onClick={() => {
                      setSelectedBrand('')
                      setBrandPanelOpen(true)
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Change Brand
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Frame Entry */}
        {(frameSource === 'manual' || frameSource === 'free-add') && (
          <div className="bg-white p-6 rounded-lg border border-neutral-200">
            <h4 className="text-lg font-semibold mb-4">
              {frameSource === 'free-add' ? 'Free Add / Patient Owned Frame' : 'Manual Frame Entry'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Brand</label>
                <input
                  type="text"
                  value={manualFrameInfo.brand}
                  onChange={(e) => handleManualFrameUpdate('brand', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                  placeholder="Enter brand name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <input
                  type="text"
                  value={manualFrameInfo.model}
                  onChange={(e) => handleManualFrameUpdate('model', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                  placeholder="Enter model name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <input
                  type="text"
                  value={manualFrameInfo.color}
                  onChange={(e) => handleManualFrameUpdate('color', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                  placeholder="Enter color"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Size</label>
                <input
                  type="text"
                  value={manualFrameInfo.size}
                  onChange={(e) => handleManualFrameUpdate('size', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                  placeholder="e.g., 52-18-140"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Style</label>
                <select
                  value={manualFrameInfo.style}
                  onChange={(e) => handleManualFrameUpdate('style', e.target.value as ManualFrameInfo['style'])}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                >
                  <option value="Full Rim">Full Rim</option>
                  <option value="Semi-Rimless">Semi-Rimless</option>
                  <option value="Rimless">Rimless</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Price</label>
                <input
                  type="number"
                  value={manualFrameInfo.price}
                  onChange={(e) => handleManualFrameUpdate('price', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            {frameSource === 'free-add' && (
              <div className="mt-4 flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={manualFrameInfo.isPatientOwned}
                    onChange={(e) => handleManualFrameUpdate('isPatientOwned', e.target.checked)}
                    className="mr-2"
                  />
                  Patient Owned Frame
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={manualFrameInfo.isFreeAdd}
                    onChange={(e) => handleManualFrameUpdate('isFreeAdd', e.target.checked)}
                    className="mr-2"
                  />
                  Free Add (Discounted)
                </label>
              </div>
            )}
          </div>
        )}
      </VSPCategorySection>

      {/* 2. Lens Type */}
      <VSPCategorySection number={2} title="Lens Type Selection">
        <div>
          <VSPGrid3>
            {lensTypes.map(lensType => (
              <VSPSelectionButton
                key={lensType.id}
                selected={selectedLensType === lensType.id}
                onClick={() => handleLensTypeSelect(lensType.id)}
                price={formatPrice(lensType.price)}
                subtitle={lensType.note}
              >
                {lensType.name}
              </VSPSelectionButton>
            ))}
          </VSPGrid3>
        </div>
      </VSPCategorySection>

      {/* 3. Lens Material */}
      <VSPCategorySection number={3} title="Lens Material">
        <div>
          <VSPGrid3>
            {lensMaterials.map(material => (
              <VSPSelectionButton
                key={material.id}
                selected={selectedLensMaterial === material.id}
                onClick={() => handleLensMaterialSelect(material.id)}
                price={formatPrice(material.price)}
              >
                {material.name}
              </VSPSelectionButton>
            ))}
          </VSPGrid3>
        </div>
      </VSPCategorySection>

      {/* 4. AR Coatings */}
      <VSPCategorySection number={4} title="AR Coatings">
        <div>
          <VSPGrid3>
            {arCoatings.map(coating => (
              <VSPSelectionButton
                key={coating.id}
                selected={selectedArCoating === coating.id}
                onClick={() => handleArCoatingSelect(coating.id)}
                price={formatPrice(coating.price)}
                subtitle={coating.note}
              >
                {coating.name}
              </VSPSelectionButton>
            ))}
          </VSPGrid3>
        </div>
      </VSPCategorySection>

      {/* 5. Transitions */}
      <VSPCategorySection number={5} title="Transitions">
        <VSPGrid3>
          {transitionsOptions.map(transition => (
            <VSPSelectionButton
              key={transition.id}
              selected={selectedTransitions === transition.id}
              onClick={() => handleTransitionsSelect(transition.id)}
              price={formatPrice(transition.price)}
            >
              {transition.name}
            </VSPSelectionButton>
          ))}
        </VSPGrid3>
      </VSPCategorySection>

      {/* 6. Polarized */}
      <VSPCategorySection number={6} title="Polarized">
        <VSPGrid2>
          {polarizedOptions.map(polarized => (
            <VSPSelectionButton
              key={polarized.id}
              selected={selectedPolarized === polarized.id}
              onClick={() => handlePolarizedSelect(polarized.id)}
              price={formatPrice(polarized.price)}
            >
              {polarized.name}
            </VSPSelectionButton>
          ))}
        </VSPGrid2>
      </VSPCategorySection>

      {/* 7. Lens Add-ons */}
      <VSPCategorySection number={7} title="Lens Add-ons (Optional)">
        <VSPGrid3>
          {lensAddons.map(addon => (
            <VSPSelectionButton
              key={addon.id}
              selected={selectedAddons.includes(addon.id)}
              onClick={() => handleAddonToggle(addon.id)}
              price={formatPrice(addon.price)}
              subtitle={addon.note}
            >
              {addon.name}
            </VSPSelectionButton>
          ))}
        </VSPGrid3>
      </VSPCategorySection>

      {/* Pricing Summary */}
      {canProceed() && (
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <h4 className="text-lg font-semibold mb-4">Eyeglasses Total</h4>
          <div className="text-2xl font-bold text-blue-900">
            {formatPrice(calculateTotal())}
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <NavigationFooter
        currentStep={2}
        totalSteps={3}
        onNext={handleNext}
        onBack={onBack}
        canProceed={canProceed()}
        validationErrors={[]}
        validationWarnings={[]}
        nextLabel="Continue to Contact Lenses"
        backLabel="Back to Exams"
      />

      {/* POF Workflow Modal */}
      {showPOFWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto">
            <POFWorkflow
              quoteId={quote.id || 'temp-quote-id'}
              customerId={mockCustomer.id}
              customerName={mockCustomer.name}
              staffName={mockUser.name}
              isManager={mockUser.isManager}
              onComplete={handlePOFComplete}
              onCancel={handlePOFCancel}
            />
          </div>
        </div>
      )}

      {/* Enhanced POF Workflow Modal */}
      {showEnhancedPOFWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto">
            <POFWorkflowEnhanced
              quoteId={quote.id || 'temp-quote-id'}
              customerId={mockCustomer.id}
              customerName={mockCustomer.name}
              staffName={mockUser.name}
              isManager={mockUser.isManager}
              onComplete={handlePOFComplete}
              onCancel={handlePOFCancel}
            />
          </div>
        </div>
      )}
    </div>
  )
}