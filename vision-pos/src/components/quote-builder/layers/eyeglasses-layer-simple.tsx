'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface EyeglassesLayerProps {
  className?: string
  onNext?: () => void
  onBack?: () => void
}

export function EyeglassesLayerSimple({ className, onNext, onBack }: EyeglassesLayerProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  
  // State for selections
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null)
  const [lensType, setLensType] = useState<string | null>(null)
  const [lensMaterial, setLensMaterial] = useState<string | null>(null)
  const [antiReflective, setAntiReflective] = useState<string | null>(null)
  const [transitions, setTransitions] = useState<string | null>(null)
  const [addons, setAddons] = useState<string[]>([])

  // Frame options
  const frames = [
    { id: 'rayban-rb5154', name: 'Ray-Ban RB5154', price: 180 },
    { id: 'oakley-ox8156', name: 'Oakley OX8156', price: 165 },
    { id: 'warby-winston', name: 'Warby Parker Winston', price: 95 },
    { id: 'silhouette-5515', name: 'Silhouette TMA Icon', price: 320 },
    { id: 'coach-hc6152', name: 'Coach HC6152', price: 195 },
    { id: 'flexon-108', name: 'Flexon AutoFlex 108', price: 125 }
  ]

  // Lens type options
  const lensTypes = [
    { id: 'single-vision', name: 'Single Vision', price: 99 },
    { id: 'progressive', name: 'Progressive (No-line)', price: 299 },
    { id: 'bifocal', name: 'Bifocal', price: 179 },
    { id: 'computer', name: 'Computer/Office', price: 189 }
  ]

  // Lens material options
  const materials = [
    { id: 'plastic', name: 'Standard Plastic', price: 0 },
    { id: 'polycarbonate', name: 'Polycarbonate', price: 50 },
    { id: 'high-index', name: 'High-Index 1.67', price: 119 },
    { id: 'trivex', name: 'Trivex', price: 79 }
  ]

  // Anti-reflective options
  const arOptions = [
    { id: 'none', name: 'No AR Coating', price: 0 },
    { id: 'basic', name: 'Basic AR', price: 50 },
    { id: 'premium', name: 'Premium AR', price: 100 }
  ]

  // Transitions options
  const transitionOptions = [
    { id: 'none', name: 'No Transitions', price: 0 },
    { id: 'transitions', name: 'Transitions Photochromic', price: 120 }
  ]

  // Add-on options
  const addonOptions = [
    { id: 'warranty', name: 'Extended Warranty', price: 30 },
    { id: 'cleaning-kit', name: 'Cleaning Kit', price: 15 },
    { id: 'case', name: 'Premium Case', price: 10 }
  ]

  const toggleAddon = (id: string) => {
    setAddons(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const calculateTotal = () => {
    let total = 0

    // Frame
    const frame = frames.find(f => f.id === selectedFrame)
    if (frame) total += frame.price

    // Lens type
    const lens = lensTypes.find(l => l.id === lensType)
    if (lens) total += lens.price

    // Lens material
    const material = materials.find(m => m.id === lensMaterial)
    if (material) total += material.price

    // AR coating
    const ar = arOptions.find(a => a.id === antiReflective)
    if (ar) total += ar.price

    // Transitions
    const trans = transitionOptions.find(t => t.id === transitions)
    if (trans) total += trans.price

    // Add-ons
    addons.forEach(id => {
      const addon = addonOptions.find(a => a.id === id)
      if (addon) total += addon.price
    })

    return total
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handleReset = () => {
    setSelectedFrame(null)
    setLensType(null)
    setLensMaterial(null)
    setAntiReflective(null)
    setTransitions(null)
    setAddons([])
    setShowResetConfirm(false)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Reset Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowResetConfirm(true)}
          variant="outline"
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          Reset Quote
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <p className="font-semibold">Are you sure you want to reset eyeglasses selections?</p>
              <p className="text-sm text-gray-600">All eyeglasses selections will be cleared.</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowResetConfirm(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReset}
                  variant="destructive"
                  size="sm"
                >
                  Yes, Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frame Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 1: Select Frame</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {frames.map((frame) => (
              <button
                key={frame.id}
                onClick={() => setSelectedFrame(frame.id)}
                className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                  selectedFrame === frame.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {selectedFrame === frame.id && (
                  <div className="absolute top-3 right-3">
                    <div className="bg-blue-500 rounded-full p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
                <div className="text-lg font-semibold mb-2">{frame.name}</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPrice(frame.price)}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lens Type */}
      {selectedFrame && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Select Lens Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {lensTypes.map((lens) => (
                <button
                  key={lens.id}
                  onClick={() => setLensType(lens.id)}
                  className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                    lensType === lens.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {lensType === lens.id && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-green-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="text-lg font-semibold mb-2">{lens.name}</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatPrice(lens.price)}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lens Material */}
      {lensType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 3: Select Lens Material</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {materials.map((material) => (
                <button
                  key={material.id}
                  onClick={() => setLensMaterial(material.id)}
                  className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                    lensMaterial === material.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {lensMaterial === material.id && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-purple-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="text-lg font-semibold mb-2">{material.name}</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {material.price === 0 ? 'Included' : `+${formatPrice(material.price)}`}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anti-Reflective */}
      {lensMaterial && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 4: Select Anti-Reflective Coating</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {arOptions.map((ar) => (
                <button
                  key={ar.id}
                  onClick={() => setAntiReflective(ar.id)}
                  className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                    antiReflective === ar.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {antiReflective === ar.id && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-orange-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="text-lg font-semibold mb-2">{ar.name}</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {ar.price === 0 ? 'No charge' : `+${formatPrice(ar.price)}`}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transitions */}
      {antiReflective && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 5: Select Transitions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transitionOptions.map((trans) => (
                <button
                  key={trans.id}
                  onClick={() => setTransitions(trans.id)}
                  className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                    transitions === trans.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {transitions === trans.id && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-indigo-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="text-lg font-semibold mb-2">{trans.name}</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {trans.price === 0 ? 'No charge' : `+${formatPrice(trans.price)}`}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add-ons */}
      {transitions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 6: Select Add-ons (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {addonOptions.map((addon) => (
                <button
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                    addons.includes(addon.id)
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {addons.includes(addon.id) && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-teal-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="text-lg font-semibold mb-2">{addon.name}</div>
                  <div className="text-2xl font-bold text-teal-600">
                    +{formatPrice(addon.price)}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total */}
      {selectedFrame && (
        <Card className="bg-gray-50 border-2 border-gray-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Eyeglasses Total</div>
                <div className="text-3xl font-bold">{formatPrice(calculateTotal())}</div>
              </div>
              {transitions && (
                <div className="flex gap-3">
                  {onBack && (
                    <Button
                      onClick={onBack}
                      variant="outline"
                      size="lg"
                    >
                      Back
                    </Button>
                  )}
                  {onNext && (
                    <Button
                      onClick={onNext}
                      size="lg"
                    >
                      Continue to Contacts
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
