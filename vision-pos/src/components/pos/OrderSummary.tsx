'use client'

import { usePOSStore } from '@/stores/pos-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Trash2,
  Plus,
  ShoppingCart,
  Tag,
  Sparkles,
} from 'lucide-react'

/**
 * Order summary showing line items and totals
 * Dark glass theme - glass-morphism with light text
 */
export default function OrderSummary() {
  const {
    quote,
    removeLineItem,
    addPair,
  } = usePOSStore()

  const { pairs = [], lineItems = [], activePairId, subtotal, insuranceSavings, discountTotal, tax, total } = quote || {}

  // Group line items by pair
  const itemsByPair = pairs.map((pair) => ({
    pair,
    items: lineItems.filter((item) => item.pairId === pair.id),
  }))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2 text-white">
            <ShoppingCart className="h-5 w-5 text-blue-400" />
            Order
          </h2>
          <Badge variant="secondary" className="bg-white/10 text-white/70">
            {lineItems.length} items
          </Badge>
        </div>
      </div>

      {/* Line Items - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {lineItems.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-white/20" />
            <p className="font-medium">No items yet</p>
            <p className="text-sm mt-1">Select products from the menu</p>
          </div>
        ) : (
          <div className="space-y-6">
            {itemsByPair.map(({ pair, items }) => (
              items.length > 0 && (
                <div key={pair.id}>
                  {/* Pair Header (only show if multiple pairs) */}
                  {pairs.length > 1 && (
                    <div
                      className={cn(
                        'flex items-center gap-2 mb-2 pb-2 border-b border-white/10',
                        pair.id === activePairId ? 'text-blue-400' : 'text-white/60'
                      )}
                    >
                      <span className="font-semibold text-sm">{pair.label}</span>
                      {pair.id === activePairId && (
                        <Badge variant="outline" className="text-xs border-blue-400/50 text-blue-400 bg-blue-500/10">
                          Active
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Items for this pair */}
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 group"
                      >
                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate text-white">
                                {item.name}
                              </p>
                              {item.note && (
                                <p className="text-xs text-white/50 truncate">
                                  {item.note}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Pricing */}
                          <div className="flex items-center gap-2 mt-1">
                            {item.insurancePays > 0 ? (
                              <>
                                <span className="font-semibold text-emerald-400 text-sm">
                                  ${item.patientPays.toFixed(2)}
                                </span>
                                <span className="text-xs text-white/40 line-through">
                                  ${item.retailPrice.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="font-medium text-sm text-white">
                                ${item.patientPays.toFixed(2)}
                              </span>
                            )}

                            {item.tier && (
                              <Badge variant="outline" className="text-[10px] px-1 border-white/30 text-white/60">
                                {item.tier}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1">
                          {item.quantity > 1 && (
                            <span className="text-sm text-white/50 mr-1">
                              x{item.quantity}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-500/20"
                            onClick={() => removeLineItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Add Another Pair Button */}
      {lineItems.length > 0 && pairs.length < 3 && (
        <div className="px-4 py-2 border-t border-white/10">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => addPair()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Pair
          </Button>
        </div>
      )}

      {/* Totals */}
      {lineItems.length > 0 && (
        <div className="p-4 border-t border-white/10 bg-white/5">
          {/* Retail Total */}
          <div className="flex justify-between text-sm text-white/60 mb-1">
            <span>Retail Total</span>
            <span>
              ${lineItems
                .reduce((sum, item) => sum + item.retailPrice * item.quantity, 0)
                .toFixed(2)}
            </span>
          </div>

          {/* Insurance Savings */}
          {insuranceSavings > 0 && (
            <div className="flex justify-between text-sm text-emerald-400 mb-1">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Insurance Savings
              </span>
              <span>-${insuranceSavings.toFixed(2)}</span>
            </div>
          )}

          {/* Discounts */}
          {discountTotal > 0 && (
            <div className="flex justify-between text-sm text-orange-400 mb-1">
              <span>Discounts</span>
              <span>-${discountTotal.toFixed(2)}</span>
            </div>
          )}

          {/* Subtotal */}
          <div className="flex justify-between text-sm mb-1 text-white/80">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          {/* Tax */}
          <div className="flex justify-between text-sm text-white/60 mb-2">
            <span>Tax (8.75%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>

          <Separator className="my-2 bg-white/20" />

          {/* Total */}
          <div className="flex justify-between font-bold text-xl text-white">
            <span>Total</span>
            <span className="text-blue-400">${total.toFixed(2)}</span>
          </div>

          {/* Savings Summary */}
          {insuranceSavings > 0 && (
            <div className="mt-3 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-center">
              <Sparkles className="h-4 w-4 inline text-emerald-400 mr-1" />
              <span className="text-sm text-emerald-300 font-medium">
                Saving ${insuranceSavings.toFixed(2)} with insurance!
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
