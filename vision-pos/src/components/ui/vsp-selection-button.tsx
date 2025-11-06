'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface VSPSelectionButtonProps {
  children: React.ReactNode
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  price?: string
  subtitle?: string
}

export function VSPSelectionButton({
  children,
  selected = false,
  disabled = false,
  onClick,
  className,
  price,
  subtitle
}: VSPSelectionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'vsp-selection-button',
        selected && 'selected',
        disabled && 'disabled',
        className
      )}
    >
      <div className="flex flex-col items-center space-y-1">
        <div className="text-vsp-label">{children}</div>
        {subtitle && (
          <div className="text-vsp-subtitle text-xs">{subtitle}</div>
        )}
        {price && (
          <div className={cn(
            "text-vsp-price text-xs mt-1",
            selected ? "text-white" : "text-brand-purple"
          )}>
            {price}
          </div>
        )}
      </div>
    </button>
  )
}