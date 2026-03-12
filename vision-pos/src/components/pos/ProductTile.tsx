'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface ProductTileProps {
  image?: string               // Product image URL
  icon?: LucideIcon            // Fallback icon when no image
  name: string                 // Product name
  description?: string         // Optional subtitle
  price?: number | null        // Patient pays price (null = show retail)
  retailPrice?: number         // Retail price for comparison
  showPrice?: boolean          // Whether to show price display
  isSelected?: boolean         // Selection state
  isGrouped?: boolean          // Red dotted border for grouped items
  disabled?: boolean           // Disabled state
  className?: string
  onClick: () => void
}

/**
 * ProductTile - Chick-fil-A style product selection tile
 *
 * Features:
 * - Square tiles (1:1 ratio) like Chick-fil-A POS
 * - Small number badge in top-left corner
 * - Centered product image or icon
 * - Name at bottom
 * - Selected state with blue border
 */
export default function ProductTile({
  image,
  icon: Icon,
  name,
  description,
  price,
  retailPrice,
  showPrice = false,
  isSelected = false,
  isGrouped = false,
  disabled = false,
  className,
  onClick,
}: ProductTileProps) {
  // Format price for display
  const formatPrice = (amount: number): string => {
    if (amount === 0) return 'Included'
    return `$${amount.toFixed(0)}`
  }

  // Determine display price and styling
  const displayPrice = price ?? retailPrice
  const isIncluded = displayPrice === 0
  const hasSavings = retailPrice !== undefined && price !== null && price !== undefined && price < retailPrice

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Base styles - square tiles like Chick-fil-A POS
        'relative flex flex-col glass-card rounded-md p-2 cursor-pointer transition-all',
        'border text-left w-full aspect-square',
        // Hover state
        'hover:shadow-md hover:border-white/30',
        // Selected state - blue border
        isSelected && 'border-blue-500 bg-blue-500/20 shadow-md',
        // Grouped state - dotted blue border
        isGrouped && !isSelected && 'border-dashed border-blue-500',
        // Default border
        !isSelected && !isGrouped && 'border-white/10',
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed hover:shadow-none hover:border-white/10',
        className
      )}
    >

      {/* Compact centered icon/image area */}
      <div className="flex-1 flex items-center justify-center pt-2">
        {image ? (
          <img
            src={image}
            alt={name}
            className="h-8 w-auto object-contain"
          />
        ) : Icon ? (
          <Icon className={cn(
            'h-6 w-6',
            isSelected ? 'text-blue-400' : 'text-white/50'
          )} />
        ) : (
          <div className="h-6 w-6 rounded bg-white/10" />
        )}
      </div>

      {/* Name and price at bottom - compact */}
      <div className="mt-auto">
        <p className={cn(
          'font-medium text-[10px] leading-tight line-clamp-2 text-center',
          isSelected ? 'text-blue-400' : 'text-white'
        )}>
          {name}
        </p>
        {showPrice && displayPrice !== undefined && (
          <p className={cn(
            'text-[9px] text-center mt-0.5',
            isIncluded ? 'text-emerald-400 font-medium' : 'text-white/60'
          )}>
            {hasSavings && (
              <span className="line-through text-white/30 mr-1">
                ${retailPrice}
              </span>
            )}
            {formatPrice(displayPrice)}
          </p>
        )}
      </div>


      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}
