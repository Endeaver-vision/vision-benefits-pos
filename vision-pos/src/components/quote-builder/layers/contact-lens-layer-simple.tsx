'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Plus, Minus } from 'lucide-react'

interface ContactLensLayerProps {
  className?: string
  onNext?: () => void
  onBack?: () => void
}

export function ContactLensLayerSimple({ className, onNext, onBack }: ContactLensLayerProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  
  // State for selections
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addons, setAddons] = useState<string[]>([])

  // Contact lens options
  const contactLenses = [
    { id: 'acuvue-oasys', name: 'Acuvue Oasys', type: '2-week disposable', price: 65 },
    { id: 'dailies-total1', name: 'Dailies Total1', type: 'Daily disposable', price: 85 },
    { id: 'biofinity', name: 'Biofinity', type: 'Monthly disposable', price: 55 },
    { id: 'air-optix', name: 'Air Optix Plus', type: 'Monthly disposable', price: 60 },
    { id: 'acuvue-moist', name: '1-Day Acuvue Moist', type: 'Daily disposable', price: 70 },
    { id: 'proclear', name: 'Proclear', type: 'Monthly disposable', price: 58 }
  ]

  // Quantity options
  const quantityOptions = [1, 2, 4, 8, 12]

  // Add-on options
  const addonOptions = [
    { id: 'solution', name: 'Contact Lens Solution', price: 15 },
    { id: 'cases', name: 'Contact Lens Cases (3-pack)', price: 5 },
    { id: 'rewetting', name: 'Rewetting Drops', price: 12 }
  ]

  const toggleAddon = (id: string) => {
    setAddons(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const calculateTotal = () => {
    let total = 0

    // Contact lenses
    const lens = contactLenses.find(l => l.id === selectedBrand)
    if (lens) total += lens.price * quantity

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
    setSelectedBrand(null)
    setQuantity(1)
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
              <p className="font-semibold">Are you sure you want to reset contact lens selections?</p>
              <p className="text-sm text-gray-600">All contact lens selections will be cleared.</p>
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

      {/* Brand/Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 1: Select Contact Lens Brand/Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contactLenses.map((lens) => (
              <button
                key={lens.id}
                onClick={() => setSelectedBrand(lens.id)}
                className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                  selectedBrand === lens.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {selectedBrand === lens.id && (
                  <div className="absolute top-3 right-3">
                    <div className="bg-blue-500 rounded-full p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
                <div className="text-lg font-semibold mb-1">{lens.name}</div>
                <div className="text-sm text-gray-600 mb-2">{lens.type}</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPrice(lens.price)}/box
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quantity Selection */}
      {selectedBrand && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Select Quantity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-5 gap-4">
              {quantityOptions.map((qty) => (
                <button
                  key={qty}
                  onClick={() => setQuantity(qty)}
                  className={`p-5 rounded-lg border-2 transition-all text-center ${
                    quantity === qty
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {quantity === qty && (
                    <div className="flex justify-center mb-2">
                      <div className="bg-green-500 rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="text-2xl font-bold mb-1">{qty}</div>
                  <div className="text-sm text-gray-600">
                    {qty === 1 ? 'box' : 'boxes'}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Quantity Adjuster */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-3 rounded-lg border-2 border-gray-300 hover:bg-gray-50"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="text-center">
                <div className="text-3xl font-bold">{quantity}</div>
                <div className="text-sm text-gray-600">boxes</div>
              </div>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-3 rounded-lg border-2 border-gray-300 hover:bg-gray-50"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add-ons */}
      {selectedBrand && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 3: Select Add-ons (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {addonOptions.map((addon) => (
                <button
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                    addons.includes(addon.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {addons.includes(addon.id) && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-purple-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="text-lg font-semibold mb-2">{addon.name}</div>
                  <div className="text-2xl font-bold text-purple-600">
                    +{formatPrice(addon.price)}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total */}
      {selectedBrand && (
        <Card className="bg-gray-50 border-2 border-gray-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Contact Lenses Total</div>
                <div className="text-3xl font-bold">{formatPrice(calculateTotal())}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {quantity} {quantity === 1 ? 'box' : 'boxes'} × {formatPrice(contactLenses.find(l => l.id === selectedBrand)?.price || 0)}
                  {addons.length > 0 && ` + ${addons.length} add-on${addons.length > 1 ? 's' : ''}`}
                </div>
              </div>
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
                    Continue to Review
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
