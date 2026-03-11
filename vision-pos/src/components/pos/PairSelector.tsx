'use client'

import { useState } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  Glasses,
  Sun,
  Monitor,
} from 'lucide-react'

const PAIR_PRESETS = [
  { label: 'Everyday', icon: Glasses },
  { label: 'Sunglasses', icon: Sun },
  { label: 'Computer', icon: Monitor },
  { label: 'Reading', icon: Glasses },
]

/**
 * Multi-pair selector with tabs and management
 * Shows at top of product area when patient is selected
 */
export default function PairSelector() {
  const {
    quote,
    addPair,
    setActivePair,
    updatePair,
    removePair,
    getLineItemsForPair,
  } = usePOSStore()

  const { pairs, activePairId } = quote

  const [editingPairId, setEditingPairId] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [showAddMenu, setShowAddMenu] = useState(false)

  // Don't show if only one pair with no items
  const activeItems = getLineItemsForPair(activePairId)
  if (pairs.length === 1 && activeItems.length === 0) {
    return null
  }

  const handleStartEdit = (pairId: number, currentLabel: string) => {
    setEditingPairId(pairId)
    setEditLabel(currentLabel)
  }

  const handleSaveEdit = () => {
    if (editingPairId && editLabel.trim()) {
      updatePair(editingPairId, { label: editLabel.trim() })
    }
    setEditingPairId(null)
    setEditLabel('')
  }

  const handleCancelEdit = () => {
    setEditingPairId(null)
    setEditLabel('')
  }

  const handleAddPair = (label: string) => {
    addPair(label)
    setShowAddMenu(false)
  }

  const handleRemovePair = (pairId: number) => {
    if (pairs.length > 1) {
      removePair(pairId)
    }
  }

  return (
    <div className="mb-4 -mt-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Pair tabs */}
        {pairs.map((pair) => {
          const pairItems = getLineItemsForPair(pair.id)
          const pairTotal = pairItems.reduce(
            (sum, item) => sum + item.patientPays,
            0
          )
          const isActive = pair.id === activePairId
          const isEditing = editingPairId === pair.id

          if (isEditing) {
            return (
              <div
                key={pair.id}
                className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-lg"
              >
                <Input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-6 w-28 text-xs px-2"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                />
                <button
                  onClick={handleSaveEdit}
                  className="p-1 hover:bg-blue-200 rounded"
                >
                  <Check className="h-3 w-3 text-green-600" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 hover:bg-blue-200 rounded"
                >
                  <X className="h-3 w-3 text-red-600" />
                </button>
              </div>
            )
          }

          return (
            <div
              key={pair.id}
              role="button"
              tabIndex={0}
              onClick={() => setActivePair(pair.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActivePair(pair.id)
                }
              }}
              className={cn(
                'group flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer',
                isActive
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600'
              )}
            >
              <Glasses className={cn('h-4 w-4', isActive && 'text-blue-500')} />
              <span className="text-sm font-medium">{pair.label}</span>

              {pairItems.length > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] px-1.5',
                    isActive ? 'bg-blue-200 text-blue-800' : ''
                  )}
                >
                  {pairItems.length} • ${pairTotal.toFixed(0)}
                </Badge>
              )}

              {/* Edit/Delete buttons (show on hover) */}
              <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartEdit(pair.id, pair.label)
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <Pencil className="h-3 w-3 text-gray-500" />
                </button>
                {pairs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemovePair(pair.id)
                    }}
                    className="p-1 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Add pair button */}
        {pairs.length < 4 && (
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Add Pair</span>
            </button>

            {/* Add pair dropdown */}
            {showAddMenu && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-10">
                <div className="p-2 border-b">
                  <span className="text-xs text-gray-500 font-medium">
                    Quick Add
                  </span>
                </div>
                {PAIR_PRESETS.map((preset) => {
                  const Icon = preset.icon
                  // Skip presets that are already used
                  const isUsed = pairs.some((p) =>
                    p.label.toLowerCase().includes(preset.label.toLowerCase())
                  )
                  if (isUsed) return null

                  return (
                    <button
                      key={preset.label}
                      onClick={() => handleAddPair(preset.label)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
                    >
                      <Icon className="h-4 w-4 text-gray-400" />
                      {preset.label}
                    </button>
                  )
                })}
                <div className="border-t">
                  <button
                    onClick={() => handleAddPair(`Pair ${pairs.length + 1}`)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 text-blue-600"
                  >
                    <Plus className="h-4 w-4" />
                    Custom Label...
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Second pair discount indicator */}
        {pairs.length >= 2 && (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            2nd pair 20% off
          </Badge>
        )}
      </div>

      {/* Click outside to close add menu */}
      {showAddMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowAddMenu(false)}
        />
      )}
    </div>
  )
}
