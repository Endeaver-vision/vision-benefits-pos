'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Plus, Minus, Shield, Loader2 } from 'lucide-react'
import { useQuotePricingContext } from '@/contexts/quote-pricing-context'

interface ContactLensLayerProps {
  className?: string
  onNext?: () => void
  onBack?: () => void
}

export function ContactLensLayerSimple({ className, onNext, onBack }: ContactLensLayerProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const { addItem, removeItem, clearItemsByCategory, authorization, pricingSummary, isCalculating, updateContactLenses } = useQuotePricingContext()

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

  // Handle brand selection - add to pricing context
  const handleBrandSelect = useCallback((brandId: string) => {
    // Remove old contact lens item if any
    if (selectedBrand) {
      removeItem(selectedBrand)
    }

    setSelectedBrand(brandId)

    // Add new contact lens item
    const lens = contactLenses.find(l => l.id === brandId)
    if (lens) {
      addItem({
        sku: lens.id,
        displayName: lens.name,
        category: 'contact',
        retailPrice: lens.price * quantity,
        quantity: quantity,
      })
    }
  }, [selectedBrand, quantity, addItem, removeItem])

  // Update quantity and sync to pricing context
  const handleQuantityChange = useCallback((newQty: number) => {
    setQuantity(newQty)

    // Update contact lens item with new quantity
    if (selectedBrand) {
      const lens = contactLenses.find(l => l.id === selectedBrand)
      if (lens) {
        removeItem(selectedBrand)
        addItem({
          sku: lens.id,
          displayName: lens.name,
          category: 'contact',
          retailPrice: lens.price * newQty,
          quantity: newQty,
        })
      }
    }
  }, [selectedBrand, addItem, removeItem])

  // Calculate patient total with insurance applied
  const calculatePatientTotal = () => {
    const retailTotal = calculateTotal()
    if (authorization && authorization.contactAllowance) {
      const allowance = authorization.contactAllowance
      return Math.max(0, retailTotal - allowance)
    }
    return retailTotal
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
    // Clear contact items from pricing context
    clearItemsByCategory('contact')
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
          className="text-red-400 border-red-400/50 hover:bg-red-500/20"
        >
          Reset Contacts
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <Card className="border-red-400/50 bg-red-500/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <p className="font-semibold text-white">Are you sure you want to reset contact lens selections?</p>
              <p className="text-sm text-white/70">All contact lens selections will be cleared.</p>
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
          <CardTitle className="text-lg text-white flex items-center justify-between">
            <span>Step 1: Select Contact Lens Brand/Type</span>
            {authorization && authorization.contactAllowance && (
              <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/50">
                <Shield className="h-3 w-3 mr-1" />
                ${authorization.contactAllowance} Allowance
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contactLenses.map((lens) => (
              <button
                key={lens.id}
                onClick={() => handleBrandSelect(lens.id)}
                className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                  selectedBrand === lens.id
                    ? 'border-blue-400 bg-blue-500/30'
                    : 'border-white/20 hover:border-white/40 bg-white/10'
                }`}
              >
                {selectedBrand === lens.id && (
                  <div className="absolute top-3 right-3">
                    <div className="bg-blue-500 rounded-full p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
                <div className="text-lg font-semibold mb-1 text-white">{lens.name}</div>
                <div className="text-sm text-white/70 mb-2">{lens.type}</div>
                <div className="text-2xl font-bold text-blue-400">
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
            <CardTitle className="text-lg text-white">Step 2: Select Quantity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-5 gap-4">
              {quantityOptions.map((qty) => (
                <button
                  key={qty}
                  onClick={() => handleQuantityChange(qty)}
                  className={`p-5 rounded-lg border-2 transition-all text-center ${
                    quantity === qty
                      ? 'border-emerald-400 bg-emerald-500/30'
                      : 'border-white/20 hover:border-white/40 bg-white/10'
                  }`}
                >
                  {quantity === qty && (
                    <div className="flex justify-center mb-2">
                      <div className="bg-emerald-500 rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="text-2xl font-bold mb-1 text-white">{qty}</div>
                  <div className="text-sm text-white/70">
                    {qty === 1 ? 'box' : 'boxes'}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Quantity Adjuster */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/20">
              <button
                onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                className="p-3 rounded-lg border-2 border-white/30 hover:bg-white/10 text-white"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{quantity}</div>
                <div className="text-sm text-white/70">boxes</div>
              </div>
              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                className="p-3 rounded-lg border-2 border-white/30 hover:bg-white/10 text-white"
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
                      ? 'border-purple-400 bg-purple-500/30'
                      : 'border-white/20 hover:border-white/40 bg-white/10'
                  }`}
                >
                  {addons.includes(addon.id) && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-purple-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="text-lg font-semibold mb-2 text-white">{addon.name}</div>
                  <div className="text-2xl font-bold text-purple-400">
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
        <Card className="bg-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                {authorization && authorization.contactAllowance ? (
                  <>
                    <div className="text-sm text-white/70 mb-1">Retail Total</div>
                    <div className="text-xl text-white/60 line-through">{formatPrice(calculateTotal())}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <div>
                        <div className="text-sm text-emerald-400">Insurance pays</div>
                        <div className="text-lg font-semibold text-emerald-400">
                          {formatPrice(Math.min(authorization.contactAllowance, calculateTotal()))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-amber-400">You pay</div>
                        <div className="text-3xl font-bold text-amber-400">
                          {isCalculating ? (
                            <Loader2 className="h-6 w-6 animate-spin inline" />
                          ) : (
                            formatPrice(calculatePatientTotal())
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-white/70 mt-2">
                      {quantity} {quantity === 1 ? 'box' : 'boxes'} × {formatPrice(contactLenses.find(l => l.id === selectedBrand)?.price || 0)}
                      {addons.length > 0 && ` + ${addons.length} add-on${addons.length > 1 ? 's' : ''}`}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-white/70 mb-1">Contact Lenses Total</div>
                    <div className="text-3xl font-bold text-white">{formatPrice(calculateTotal())}</div>
                    <div className="text-sm text-white/70 mt-1">
                      {quantity} {quantity === 1 ? 'box' : 'boxes'} × {formatPrice(contactLenses.find(l => l.id === selectedBrand)?.price || 0)}
                      {addons.length > 0 && ` + ${addons.length} add-on${addons.length > 1 ? 's' : ''}`}
                    </div>
                  </>
                )}
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
