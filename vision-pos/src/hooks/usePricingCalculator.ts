/**
 * usePricingCalculator Hook
 *
 * Calls the /api/pricing/calculate endpoint to get accurate patient pricing
 * for products based on their insurance authorization.
 */

import { useState, useCallback } from 'react'
import { useQuoteStore } from '@/store/quote-store'

// Types matching the API response
export interface PricedItem {
  sku: string
  productName: string
  retailPrice: number
  patientCopay: number
  insurancePays: number
  savings: number
  tierUsed?: string
  notes?: string
}

export interface PricingSummary {
  retailTotal: number
  patientTotal: number
  insuranceTotal: number
  totalSavings: number
  examCopay: number
  materialsCopay: number
}

export interface PricingResult {
  customerId: string
  carrier: string | null
  planName: string | null
  items: PricedItem[]
  summary: PricingSummary
  warnings?: string[]
}

export interface ProductForPricing {
  sku: string
  productType: 'progressive' | 'ar_coating' | 'frame' | 'lens_sv' | 'material' | 'photochromic' | 'polarized' | 'blue_light' | 'tint' | 'other'
  brand?: string
  productName?: string
  retailPrice: number
  isFeaturedBrand?: boolean
}

interface UsePricingCalculatorResult {
  // State
  isLoading: boolean
  error: string | null
  result: PricingResult | null

  // Actions
  calculatePricing: (products: ProductForPricing[]) => Promise<PricingResult | null>
  calculateSingleProduct: (product: ProductForPricing) => Promise<PricedItem | null>
  clearResult: () => void
}

/**
 * Hook to calculate pricing for products using the pricing API
 *
 * @example
 * ```tsx
 * function LensSelector() {
 *   const { calculateSingleProduct, isLoading } = usePricingCalculator()
 *   const { customerId } = useQuoteAuthorization()
 *
 *   const handleLensSelect = async (lens) => {
 *     const pricing = await calculateSingleProduct({
 *       sku: lens.sku,
 *       productType: 'progressive',
 *       retailPrice: lens.retailPrice,
 *     })
 *     if (pricing) {
 *       console.log(`Patient pays: $${pricing.patientCopay}`)
 *     }
 *   }
 * }
 * ```
 */
export function usePricingCalculator(): UsePricingCalculatorResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PricingResult | null>(null)

  const initState = useQuoteStore((state) => state.initState)
  const customerId = initState.customerId

  /**
   * Calculate pricing for multiple products
   */
  const calculatePricing = useCallback(async (products: ProductForPricing[]): Promise<PricingResult | null> => {
    if (!customerId) {
      setError('No customer selected')
      return null
    }

    if (products.length === 0) {
      setError('No products to price')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          products,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate pricing')
      }

      if (data.success && data.data) {
        setResult(data.data)
        return data.data
      } else {
        throw new Error('Invalid response from pricing API')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Pricing calculation failed'
      setError(errorMessage)
      console.error('[PricingCalculator]', errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  /**
   * Calculate pricing for a single product
   */
  const calculateSingleProduct = useCallback(async (product: ProductForPricing): Promise<PricedItem | null> => {
    const result = await calculatePricing([product])
    if (result && result.items.length > 0) {
      return result.items[0]
    }
    return null
  }, [calculatePricing])

  /**
   * Clear the result
   */
  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    result,
    calculatePricing,
    calculateSingleProduct,
    clearResult,
  }
}

/**
 * Hook to get pricing for a specific product with caching
 * Uses React Query pattern for automatic refetching
 */
export function useProductPrice(
  product: ProductForPricing | null,
  enabled: boolean = true
): {
  isLoading: boolean
  error: string | null
  pricing: PricedItem | null
  refetch: () => Promise<void>
} {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pricing, setPricing] = useState<PricedItem | null>(null)

  const initState = useQuoteStore((state) => state.initState)
  const customerId = initState.customerId

  const fetchPrice = useCallback(async () => {
    if (!enabled || !product || !customerId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          products: [product],
        }),
      })

      const data = await response.json()

      if (data.success && data.data?.items?.length > 0) {
        setPricing(data.data.items[0])
      } else {
        // No insurance pricing - return retail
        setPricing({
          sku: product.sku,
          productName: product.productName || product.sku,
          retailPrice: product.retailPrice,
          patientCopay: product.retailPrice,
          insurancePays: 0,
          savings: 0,
          notes: 'No insurance coverage',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price')
    } finally {
      setIsLoading(false)
    }
  }, [enabled, product, customerId])

  return {
    isLoading,
    error,
    pricing,
    refetch: fetchPrice,
  }
}

/**
 * Batch pricing hook - calculates prices for multiple products at once
 * Useful for displaying a product grid with all prices
 */
export function useBatchPricing(): {
  isLoading: boolean
  error: string | null
  prices: Map<string, PricedItem>
  calculateBatch: (products: ProductForPricing[]) => Promise<void>
} {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prices, setPrices] = useState<Map<string, PricedItem>>(new Map())

  const initState = useQuoteStore((state) => state.initState)
  const customerId = initState.customerId

  const calculateBatch = useCallback(async (products: ProductForPricing[]) => {
    if (!customerId || products.length === 0) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          products,
        }),
      })

      const data = await response.json()

      if (data.success && data.data?.items) {
        const priceMap = new Map<string, PricedItem>()
        for (const item of data.data.items) {
          priceMap.set(item.sku, item)
        }
        setPrices(priceMap)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate batch pricing')
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  return {
    isLoading,
    error,
    prices,
    calculateBatch,
  }
}

export default usePricingCalculator
