/**
 * Accessibility utilities and helpers for the POS system
 */

import React from 'react'

/**
 * Generate a unique ID for aria-labelledby relationships
 */
export function generateAriaId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Screen reader announcements
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcer = document.getElementById('sr-announcer') || createAnnouncer()
  announcer.setAttribute('aria-live', priority)
  announcer.textContent = message

  // Clear after announcement
  setTimeout(() => {
    announcer.textContent = ''
  }, 1000)
}

function createAnnouncer(): HTMLElement {
  const announcer = document.createElement('div')
  announcer.id = 'sr-announcer'
  announcer.setAttribute('aria-live', 'polite')
  announcer.setAttribute('aria-atomic', 'true')
  announcer.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `
  document.body.appendChild(announcer)
  return announcer
}

/**
 * Focus trap for modals
 */
export function createFocusTrap(container: HTMLElement) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  const firstFocusable = focusableElements[0] as HTMLElement
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable.focus()
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)
  firstFocusable?.focus()

  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Skip link for keyboard navigation
 */
export function SkipLink({ targetId, children }: { targetId: string; children: React.ReactNode }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white"
    >
      {children}
    </a>
  )
}

/**
 * Format currency for screen readers
 */
export function formatCurrencyForSR(amount: number): string {
  const dollars = Math.floor(amount)
  const cents = Math.round((amount - dollars) * 100)

  if (cents === 0) {
    return `${dollars} dollars`
  }
  return `${dollars} dollars and ${cents} cents`
}

/**
 * Keyboard shortcuts manager
 */
export class KeyboardShortcuts {
  private shortcuts: Map<string, () => void> = new Map()

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown)
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return
    }

    const key = this.getKeyString(e)
    const handler = this.shortcuts.get(key)

    if (handler) {
      e.preventDefault()
      handler()
    }
  }

  private getKeyString(e: KeyboardEvent): string {
    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('Cmd')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey) parts.push('Alt')
    parts.push(e.key.toUpperCase())
    return parts.join('+')
  }

  register(key: string, handler: () => void) {
    this.shortcuts.set(key, handler)
  }

  unregister(key: string) {
    this.shortcuts.delete(key)
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown)
    }
    this.shortcuts.clear()
  }
}

/**
 * ARIA labels for common POS actions
 */
export const ARIA_LABELS = {
  addToCart: (productName: string) => `Add ${productName} to quote`,
  removeFromCart: (productName: string) => `Remove ${productName} from quote`,
  increaseQuantity: (productName: string) => `Increase quantity of ${productName}`,
  decreaseQuantity: (productName: string) => `Decrease quantity of ${productName}`,
  selectPatient: (name: string) => `Select patient ${name}`,
  selectPair: (label: string) => `Switch to ${label}`,
  checkout: (total: number) =>
    `Proceed to checkout. Total: ${formatCurrencyForSR(total)}`,
  holdQuote: 'Hold current quote for later',
  recallQuote: 'Recall a previously held quote',
  applyDiscount: 'Apply a discount to the quote',
  addNotes: 'Add notes to the quote',
  printQuote: 'Print the current quote',
  emailQuote: 'Email the quote to the patient',
}

/**
 * Color contrast checker
 */
export function checkContrast(foreground: string, background: string): {
  ratio: number
  passesAA: boolean
  passesAAA: boolean
} {
  const getLuminance = (hexColor: string) => {
    const rgb = hexToRgb(hexColor)
    if (!rgb) return 0

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
      const srgb = v / 255
      return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  const l1 = getLuminance(foreground)
  const l2 = getLuminance(background)
  const ratio =
    l1 > l2 ? (l1 + 0.05) / (l2 + 0.05) : (l2 + 0.05) / (l1 + 0.05)

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
  }
}
