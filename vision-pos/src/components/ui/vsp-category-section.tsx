'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface VSPCategorySectionProps {
  number: number
  title: string
  children: React.ReactNode
  className?: string
}

export function VSPCategorySection({
  number,
  title,
  children,
  className
}: VSPCategorySectionProps) {
  return (
    <div className={cn('vsp-category-section', className)}>
      <div className="vsp-category-header">
        <div className="vsp-category-number">{number}</div>
        <h3 className="vsp-category-title">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  )
}