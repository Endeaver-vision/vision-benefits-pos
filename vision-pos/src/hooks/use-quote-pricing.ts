/**
 * Quote Pricing Hook
 *
 * Fetches insurance-based pricing for products from the quote API.
 * Integrates with the quote store to provide real-time pricing updates.
 */

import { useState, useCallback, useEffect } from 'react'
import { QuoteResult, QuoteLineItem } from '@/types/product-catalog'

interface QuoteItem {
  sku: string
  retailPrice?: number
  quantity?: number
}

interface QuotePricingState {
  isLoading: boolean
  error: string | null
  quote: QuoteResult | null
  authorization: {
    id: string
    carrier: string
    planName: string
    examCopay: number | null
    materialsCopay: number | null
  } | null
}

interface UseQuotePricingReturn extends QuotePricingState {
  calculateQuote: (customerId: string, items: QuoteItem[]) => Promise<QuoteResult | null>
  clearQuote: () => void
  getLineItemPrice: (sku: string) => QuoteLineItem | null
}

export function useQuotePricing(): UseQuotePricingReturn {
  const [state, setState] = useState<QuotePricingState>({
    isLoading: false,
    error: null,
    quote: null,
    authorization: null,
  })

  /**
   * Calculate quote for a set of items
   */
  const calculateQuote = useCallback(async (
    customerId: string,
    items: QuoteItem[]
  ): Promise<QuoteResult | null> => {
    if (!customerId || items.length === 0) {
      return null
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, items }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to calculate quote')
      }

      setState({
        isLoading: false,
        error: null,
        quote: data.quote,
        authorization: data.authorization || null,
      })

      return data.quote
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))
      return null
    }
  }, [])

  /**
   * Clear the current quote
   */
  const clearQuote = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      quote: null,
      authorization: null,
    })
  }, [])

  /**
   * Get pricing for a specific line item
   */
  const getLineItemPrice = useCallback((sku: string): QuoteLineItem | null => {
    if (!state.quote) return null
    return state.quote.items.find(item => item.sku === sku) || null
  }, [state.quote])

  return {
    ...state,
    calculateQuote,
    clearQuote,
    getLineItemPrice,
  }
}

/**
 * Hook to fetch customer's active authorization info
 */
export function useCustomerAuthorization(customerId: string | null) {
  const [authorization, setAuthorization] = useState<{
    id: string
    carrier: string
    planName: string
    examCopay: number | null
    materialsCopay: number | null
    frameAllowance: number | null
    contactAllowance: number | null
    expirationDate: string | null
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customerId) {
      setAuthorization(null)
      return
    }

    const fetchAuthorization = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/customers/${customerId}/authorization`)
        const data = await response.json()

        if (data.success && data.authorization) {
          setAuthorization(data.authorization)
        } else {
          setAuthorization(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch authorization')
        setAuthorization(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAuthorization()
  }, [customerId])

  return { authorization, isLoading, error }
}
