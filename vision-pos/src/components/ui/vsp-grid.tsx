'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface VSPGridProps {
  children: React.ReactNode
  columns: 2 | 3 | 4 | 5
  className?: string
}

export function VSPGrid({ children, columns, className }: VSPGridProps) {
  const gridClass = `vsp-grid-${columns}`
  
  return (
    <div className={cn(gridClass, className)}>
      {children}
    </div>
  )
}

// Individual grid variants for convenience
export function VSPGrid2({ children, className }: { children: React.ReactNode; className?: string }) {
  return <VSPGrid columns={2} className={className}>{children}</VSPGrid>
}

export function VSPGrid3({ children, className }: { children: React.ReactNode; className?: string }) {
  return <VSPGrid columns={3} className={className}>{children}</VSPGrid>
}

export function VSPGrid4({ children, className }: { children: React.ReactNode; className?: string }) {
  return <VSPGrid columns={4} className={className}>{children}</VSPGrid>
}

export function VSPGrid5({ children, className }: { children: React.ReactNode; className?: string }) {
  return <VSPGrid columns={5} className={className}>{children}</VSPGrid>
}