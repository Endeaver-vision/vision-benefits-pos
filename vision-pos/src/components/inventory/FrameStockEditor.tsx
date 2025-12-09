'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, Minus, Plus, Save, X } from 'lucide-react'

interface Frame {
  id: string
  brand: string
  model: string
  color: string
  sku: string | null
  upc: string | null
  locations: string[]
  locationStock: Record<string, number>
  stockQuantity: number
  retailPrice: number
  wholesaleCost: number
}

interface FrameStockEditorProps {
  frame: Frame
  onSave: () => void
  onCancel: () => void
}

// Available locations - could be fetched from API but keeping simple
const AVAILABLE_LOCATIONS = ['Insight', 'Spectrum']

export function FrameStockEditor({ frame, onSave, onCancel }: FrameStockEditorProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize location stock from frame data
  const initialStock: Record<string, number> = {}
  AVAILABLE_LOCATIONS.forEach(loc => {
    initialStock[loc] = (frame.locationStock as Record<string, number>)?.[loc] ?? 0
  })

  const [locationStock, setLocationStock] = useState<Record<string, number>>(initialStock)
  const [enabledLocations, setEnabledLocations] = useState<Set<string>>(
    new Set(frame.locations || [])
  )

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
        // Reset stock to 0 when disabling
        setLocationStock(prev => ({ ...prev, [location]: 0 }))
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      // Build final locationStock (only include enabled locations)
      const finalStock: Record<string, number> = {}
      for (const loc of AVAILABLE_LOCATIONS) {
        if (enabledLocations.has(loc)) {
          finalStock[loc] = locationStock[loc] || 0
        }
      }

      const response = await fetch(`/api/frames/${frame.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationStock: finalStock })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update stock')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Frame Header */}
      <div className="border-b border-white/10 pb-4">
        <h3 className="text-lg font-semibold text-white">
          {frame.brand} {frame.model}
        </h3>
        <p className="text-white/70">{frame.color}</p>
        <div className="flex gap-4 mt-2 text-sm text-white/60">
          {frame.sku && <span>SKU: {frame.sku}</span>}
          {frame.upc && <span>UPC: {frame.upc}</span>}
        </div>
      </div>

      {/* Location Stock Controls */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-white/80">Stock by Location</h4>

        {AVAILABLE_LOCATIONS.map(location => {
          const isEnabled = enabledLocations.has(location)
          const qty = locationStock[location] || 0
          const isInsight = location.toLowerCase() === 'insight'

          return (
            <div
              key={location}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                isEnabled
                  ? isInsight
                    ? 'border-purple-500/50 bg-purple-500/10'
                    : 'border-blue-500/50 bg-blue-500/10'
                  : 'border-white/10 bg-white/5 opacity-60'
              }`}
            >
              {/* Enable/Disable Checkbox */}
              <Checkbox
                checked={isEnabled}
                onCheckedChange={(checked) => toggleLocation(location, !!checked)}
                className="data-[state=checked]:bg-primary"
              />

              {/* Location Name */}
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

              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <Button
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
                  className="w-20 text-center"
                />

                <Button
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
      </div>

      {/* Total Stock */}
      <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/10">
        <span className="text-white/70">Total Stock</span>
        <span className="text-2xl font-bold text-white">{totalStock}</span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
