'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface VSPToggleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  disabled?: boolean
  className?: string
}

export function VSPToggleSection({
  title,
  children,
  defaultOpen = false,
  disabled = false,
  className
}: VSPToggleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn('vsp-toggle-section', className)}>
      <div 
        className={cn(
          'vsp-toggle-header',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-3">
          <h4 className="text-vsp-title">{title}</h4>
          {disabled && (
            <span className="text-xs text-neutral-500 italic">
              (Enable contact lens exam to access)
            </span>
          )}
        </div>
        {!disabled && (
          isOpen ? (
            <ChevronUp className="h-5 w-5 text-neutral-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-600" />
          )
        )}
      </div>
      {isOpen && !disabled && (
        <div className="vsp-toggle-content">
          {children}
        </div>
      )}
    </div>
  )
}