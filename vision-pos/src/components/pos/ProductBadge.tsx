'use client'

import { cn } from '@/lib/utils'
import { Star, TrendingUp, Zap, Award, ThumbsUp, Sparkles } from 'lucide-react'

export type BadgeType =
  | 'most-popular'
  | 'best-value'
  | 'premium'
  | 'new'
  | 'recommended'
  | 'staff-pick'
  | 'insurance-covered'
  | 'featured'

interface ProductBadgeProps {
  type: BadgeType
  size?: 'sm' | 'md'
  className?: string
}

const BADGE_CONFIG: Record<
  BadgeType,
  {
    label: string
    icon: React.ElementType
    className: string
  }
> = {
  'most-popular': {
    label: 'Most Popular',
    icon: TrendingUp,
    className: 'bg-blue-500 text-white',
  },
  'best-value': {
    label: 'Best Value',
    icon: Star,
    className: 'bg-green-500 text-white',
  },
  premium: {
    label: 'Premium',
    icon: Award,
    className: 'bg-purple-500 text-white',
  },
  new: {
    label: 'New',
    icon: Sparkles,
    className: 'bg-amber-500 text-white',
  },
  recommended: {
    label: 'Recommended',
    icon: ThumbsUp,
    className: 'bg-indigo-500 text-white',
  },
  'staff-pick': {
    label: 'Staff Pick',
    icon: Award,
    className: 'bg-rose-500 text-white',
  },
  'insurance-covered': {
    label: 'Covered',
    icon: Zap,
    className: 'bg-emerald-500 text-white',
  },
  featured: {
    label: 'Featured',
    icon: Star,
    className: 'bg-orange-500 text-white',
  },
}

/**
 * Product badge component for showing smart labels
 * Used in menus to highlight products
 */
export default function ProductBadge({
  type,
  size = 'sm',
  className,
}: ProductBadgeProps) {
  const config = BADGE_CONFIG[type]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        config.className,
        className
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {config.label}
    </span>
  )
}

/**
 * Get badge type based on product data
 */
export function getBadgeType(product: {
  isPopular?: boolean
  isBestValue?: boolean
  isPremium?: boolean
  isNew?: boolean
  isRecommended?: boolean
  isStaffPick?: boolean
  insuranceCovered?: boolean
  isFeatured?: boolean
}): BadgeType | null {
  // Priority order for badges
  if (product.isBestValue) return 'best-value'
  if (product.isPopular) return 'most-popular'
  if (product.isPremium) return 'premium'
  if (product.isNew) return 'new'
  if (product.isRecommended) return 'recommended'
  if (product.isStaffPick) return 'staff-pick'
  if (product.insuranceCovered) return 'insurance-covered'
  if (product.isFeatured) return 'featured'
  return null
}
