'use client'

import { useMemo } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Sparkles, Plus, ArrowRight } from 'lucide-react'

interface UpsellItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  trigger: (categories: string[]) => boolean
  badge?: string
}

// Upsell configurations based on what's in cart
const UPSELL_RULES: UpsellItem[] = [
  {
    id: 'ar-coating',
    name: 'Anti-Reflective Coating',
    description: 'Reduce glare and improve clarity',
    price: 89,
    category: 'coating',
    trigger: (cats) =>
      cats.includes('lens_type') && !cats.includes('coating'),
    badge: 'Most Popular',
  },
  {
    id: 'blue-light',
    name: 'Blue Light Protection',
    description: 'Shield eyes from digital screens',
    price: 49,
    category: 'coating',
    trigger: (cats) =>
      cats.includes('lens_type') && !cats.includes('coating'),
    badge: 'Best for Computer Use',
  },
  {
    id: 'photochromic',
    name: 'Transitions Lenses',
    description: 'Adapts to changing light conditions',
    price: 159,
    category: 'add_on',
    trigger: (cats) =>
      cats.includes('lens_type') &&
      !cats.some((c) => c.includes('transitions') || c.includes('photochromic')),
    badge: 'Best Value',
  },
  {
    id: 'scratch-resistant',
    name: 'Scratch-Resistant Coating',
    description: 'Protect your investment',
    price: 35,
    category: 'coating',
    trigger: (cats) => cats.includes('lens_type'),
  },
  {
    id: 'second-pair',
    name: 'Add a Second Pair',
    description: 'Save 20% on your second pair!',
    price: 0,
    category: 'pair',
    trigger: (cats) => cats.includes('frame') && cats.length >= 2,
    badge: '20% Off',
  },
  {
    id: 'contact-supply',
    name: 'Annual Contact Supply',
    description: 'Maximize your insurance benefits',
    price: 199,
    category: 'contact_lens',
    trigger: (cats) => cats.includes('contact_lens_single'),
  },
]

interface UpsellPromptsProps {
  className?: string
  maxPrompts?: number
}

/**
 * Smart upsell suggestions based on cart contents
 * Shows relevant add-ons and upgrades
 */
export default function UpsellPrompts({
  className,
  maxPrompts = 2,
}: UpsellPromptsProps) {
  const { quote, addLineItem, addPair } = usePOSStore()

  // Get categories currently in cart
  const cartCategories = useMemo(() => {
    return [
      ...new Set((quote.lineItems ?? []).map((item) => item.category)),
      ...new Set((quote.lineItems ?? []).map((item) => item.subcategory).filter(Boolean)),
    ]
  }, [(quote.lineItems ?? [])])

  // Find applicable upsells
  const applicableUpsells = useMemo(() => {
    return UPSELL_RULES.filter((upsell) => upsell.trigger(cartCategories))
      .slice(0, maxPrompts)
  }, [cartCategories, maxPrompts])

  if (applicableUpsells.length === 0 || (quote.lineItems ?? []).length === 0) {
    return null
  }

  const handleAddUpsell = (upsell: UpsellItem) => {
    if (upsell.id === 'second-pair') {
      addPair()
      return
    }

    addLineItem({
      productId: upsell.id,
      category: upsell.category,
      name: upsell.name,
      retailPrice: upsell.price,
      patientPays: upsell.price,
      insurancePays: 0,
      quantity: 1,
    })
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <Sparkles className="h-4 w-4" />
        <span className="font-medium">Suggested for you</span>
      </div>

      <div className="space-y-2">
        {applicableUpsells.map((upsell) => (
          <div
            key={upsell.id}
            className={cn(
              'flex items-center justify-between gap-3',
              'bg-gradient-to-r from-amber-50 to-orange-50',
              'border border-amber-200 rounded-lg p-3',
              'hover:from-amber-100 hover:to-orange-100 transition-colors'
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{upsell.name}</span>
                {upsell.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500 text-white rounded-full whitespace-nowrap">
                    {upsell.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{upsell.description}</p>
            </div>

            <div className="flex items-center gap-2">
              {upsell.price > 0 && (
                <span className="text-sm font-semibold text-amber-700">
                  +${upsell.price}
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-100"
                onClick={() => handleAddUpsell(upsell)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
