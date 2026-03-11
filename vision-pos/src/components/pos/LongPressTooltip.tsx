'use client'

import { useState, useRef, ReactNode } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface LongPressTooltipProps {
  content: ReactNode
  children: ReactNode
  delay?: number
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

/**
 * Tooltip that appears on hover (desktop) or long-press (touch)
 * Touch-friendly for iPad use
 */
export default function LongPressTooltip({
  content,
  children,
  delay = 500,
  className,
  side = 'top',
}: LongPressTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPress = useRef(false)

  const handleTouchStart = () => {
    isLongPress.current = false
    timerRef.current = setTimeout(() => {
      isLongPress.current = true
      setIsOpen(true)
    }, delay)
  }

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    // Keep open briefly after long press
    if (isLongPress.current) {
      setTimeout(() => setIsOpen(false), 2000)
    }
  }

  const handleTouchCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsOpen(false)
  }

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger
          asChild
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          {children}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className={cn(
            'max-w-xs text-sm',
            className
          )}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Product info tooltip - shows detailed product information
 */
export function ProductInfoTooltip({
  name,
  description,
  features,
  children,
}: {
  name: string
  description?: string
  features?: string[]
  children: ReactNode
}) {
  return (
    <LongPressTooltip
      content={
        <div className="space-y-2">
          <p className="font-semibold">{name}</p>
          {description && (
            <p className="text-gray-400">{description}</p>
          )}
          {features && features.length > 0 && (
            <ul className="text-xs space-y-1">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-green-400 rounded-full" />
                  {feature}
                </li>
              ))}
            </ul>
          )}
        </div>
      }
    >
      {children}
    </LongPressTooltip>
  )
}
