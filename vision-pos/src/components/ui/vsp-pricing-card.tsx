'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface VSPPricingCardProps {
  title: string
  items: Array<{
    label: string
    amount: number
    type?: 'regular' | 'discount' | 'total'
  }>
  total: number
  className?: string
  onAction?: () => void
  actionLabel?: string
}

export function VSPPricingCard({
  title,
  items,
  total,
  className,
  onAction,
  actionLabel = "Continue"
}: VSPPricingCardProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <div className={cn(
      'bg-white rounded-lg border border-neutral-200 shadow-vsp overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="bg-vsp-gradient px-4 py-3">
        <h3 className="text-white font-semibold text-center">{title}</h3>
      </div>
      
      {/* Items */}
      <div className="p-4 space-y-2">
        {items.map((item, index) => (
          <div 
            key={index}
            className={cn(
              'flex justify-between items-center text-sm',
              item.type === 'total' && 'border-t pt-2 mt-2 font-semibold',
              item.type === 'discount' && 'text-success-green'
            )}
          >
            <span className={cn(
              item.type === 'total' ? 'font-semibold' : 'text-neutral-600'
            )}>
              {item.label}
            </span>
            <span className={cn(
              item.type === 'total' ? 'font-bold text-lg' : '',
              item.type === 'discount' ? 'text-success-green' : 'text-neutral-900'
            )}>
              {item.type === 'discount' ? '-' : ''}{formatPrice(item.amount)}
            </span>
          </div>
        ))}
        
        {/* Total */}
        <div className="border-t pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">TOTAL</span>
            <span className="font-bold text-xl text-brand-purple">
              {formatPrice(total)}
            </span>
          </div>
          <div className="text-center text-xs text-neutral-500 mt-1">
            PATIENT PAYS
          </div>
        </div>
      </div>
      
      {/* Action Button */}
      {onAction && (
        <div className="p-4 border-t bg-neutral-50">
          <button
            onClick={onAction}
            className="w-full bg-brand-purple hover:bg-primary-purple-hover text-white font-semibold py-2 px-4 rounded-md transition-colors"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  )
}