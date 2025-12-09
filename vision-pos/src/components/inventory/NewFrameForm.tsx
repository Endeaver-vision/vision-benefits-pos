'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Minus, Plus, Save, X } from 'lucide-react'

interface NewFrameFormProps {
  initialUpc?: string
  initialSku?: string
  onSuccess: () => void
  onCancel: () => void
}

const AVAILABLE_LOCATIONS = ['Insight', 'Spectrum']

export function NewFrameForm({ initialUpc, initialSku, onSuccess, onCancel }: NewFrameFormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [upc, setUpc] = useState(initialUpc || '')
  const [sku, setSku] = useState(initialSku || '')
  const [retailPrice, setRetailPrice] = useState('')
  const [wholesaleCost, setWholesaleCost] = useState('')

  // Measurements
  const [eyeSize, setEyeSize] = useState('')
  const [bridge, setBridge] = useState('')
  const [temple, setTemple] = useState('')

  // Location stock
  const [locationStock, setLocationStock] = useState<Record<string, number>>({
    Insight: 0,
    Spectrum: 0
  })
  const [enabledLocations, setEnabledLocations] = useState<Set<string>>(new Set(['Insight']))

  // Calculate total stock
  const totalStock = Object.entries(locationStock)
    .filter(([loc]) => enabledLocations.has(loc))
    .reduce((sum, [, qty]) => sum + qty, 0)

  const handleQuantityChange = (location: string, value: string) => {
    const qty = parseInt(value, 10)
    if (isNaN(qty) || qty < 0) return
    setLocationStock(prev => ({ ...prev, [location]: qty }))
  }

  const handleIncrement = (location: string) => {
    setLocationStock(prev => ({
      ...prev,
      [location]: (prev[location] || 0) + 1
    }))
  }

  const handleDecrement = (location: string) => {
    setLocationStock(prev => ({
      ...prev,
      [location]: Math.max(0, (prev[location] || 0) - 1)
    }))
  }

  const toggleLocation = (location: string, checked: boolean) => {
    setEnabledLocations(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(location)
      } else {
        next.delete(location)
        setLocationStock(prev => ({ ...prev, [location]: 0 }))
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Build final locationStock
      const finalStock: Record<string, number> = {}
      for (const loc of AVAILABLE_LOCATIONS) {
        if (enabledLocations.has(loc)) {
          finalStock[loc] = locationStock[loc] || 0
        }
      }

      const response = await fetch('/api/frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          model,
          color,
          upc: upc || null,
          sku: sku || null,
          retailPrice: parseFloat(retailPrice),
          wholesaleCost: parseFloat(wholesaleCost),
          eyeSize: eyeSize || null,
          bridge: bridge || null,
          temple: temple || null,
          locationStock: finalStock
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create frame')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create frame')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Frame Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Brand *
          </label>
          <Input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ray-Ban"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Model *
          </label>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="RB5154"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/70 mb-1">
          Color *
        </label>
        <Input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="Tortoise"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            UPC {initialUpc && <span className="text-white/50">(from lookup)</span>}
          </label>
          <Input
            value={upc}
            onChange={(e) => setUpc(e.target.value)}
            placeholder="805289441113"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            SKU {initialSku && <span className="text-white/50">(from lookup)</span>}
          </label>
          <Input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="RB5154-5091"
          />
        </div>
      </div>

      {/* Measurements */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1">
          Size (Eye-Bridge-Temple)
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={eyeSize}
            onChange={(e) => setEyeSize(e.target.value)}
            placeholder="52"
            className="w-20 text-center"
          />
          <span className="text-white/50">-</span>
          <Input
            type="number"
            value={bridge}
            onChange={(e) => setBridge(e.target.value)}
            placeholder="18"
            className="w-20 text-center"
          />
          <span className="text-white/50">-</span>
          <Input
            type="number"
            value={temple}
            onChange={(e) => setTemple(e.target.value)}
            placeholder="140"
            className="w-20 text-center"
          />
          <span className="text-xs text-white/40 ml-2">mm</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Retail Price *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={retailPrice}
              onChange={(e) => setRetailPrice(e.target.value)}
              placeholder="199.00"
              className="pl-7"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">
            Wholesale Cost *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={wholesaleCost}
              onChange={(e) => setWholesaleCost(e.target.value)}
              placeholder="89.00"
              className="pl-7"
              required
            />
          </div>
        </div>
      </div>

      {/* Initial Stock */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-white/80">Initial Stock</h4>

        {AVAILABLE_LOCATIONS.map(location => {
          const isEnabled = enabledLocations.has(location)
          const qty = locationStock[location] || 0
          const isInsight = location.toLowerCase() === 'insight'

          return (
            <div
              key={location}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                isEnabled
                  ? isInsight
                    ? 'border-purple-500/50 bg-purple-500/10'
                    : 'border-blue-500/50 bg-blue-500/10'
                  : 'border-white/10 bg-white/5 opacity-60'
              }`}
            >
              <Checkbox
                checked={isEnabled}
                onCheckedChange={(checked) => toggleLocation(location, !!checked)}
              />

              <div className="flex-1">
                <Badge
                  variant="outline"
                  className={
                    isInsight
                      ? 'border-purple-500 text-purple-400'
                      : 'border-blue-500 text-blue-400'
                  }
                >
                  {location}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDecrement(location)}
                  disabled={!isEnabled || qty <= 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <Input
                  type="number"
                  min={0}
                  value={qty}
                  onChange={(e) => handleQuantityChange(location, e.target.value)}
                  disabled={!isEnabled}
                  className="w-16 text-center"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleIncrement(location)}
                  disabled={!isEnabled}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}

        <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-white/70">Total Initial Stock</span>
          <span className="text-xl font-bold text-white">{totalStock}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Create Frame
        </Button>
      </div>
    </form>
  )
}
