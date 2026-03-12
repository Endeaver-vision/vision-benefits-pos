'use client'

import { usePOSStore } from '@/stores/pos-store'
import type { Product } from '@/lib/pricing/product-catalog'

/**
 * Hook for centralized price lookups with insurance awareness
 *
 * Handles:
 * - Price list lookups for insured patients
 * - Tier-aware pricing for VSP materials (SV vs MF)
 * - Fallback to retail for cash patients
 */
export function usePriceList() {
  const { priceList, quote } = usePOSStore()

  const hasInsurance = quote.insurance.hasActiveAuth
  const isSingleVision = ['sv', 'neurolens_sv'].includes(
    (quote.lineItems ?? []).find(
      item => item.pairId === quote.activePairId && item.category === 'lens_type'
    )?.productId ?? 'sv'
  )

  /**
   * Get price for a product from the price list
   * Returns the patient pays amount (copay)
   */
  const getProductPrice = (product: Product): number => {
    // Free products
    if (product.retail === 0) return 0

    // No insurance = retail price
    if (!priceList || !hasInsurance) {
      return product.retail
    }

    const priceData = priceList.prices[product.id]

    // Simple number price
    if (typeof priceData === 'number') {
      return priceData
    }

    // SV/MF variance price (materials)
    if (priceData && typeof priceData === 'object') {
      const svPrice = (priceData as Record<string, number>).sv
      const mfPrice = (priceData as Record<string, number>).mf
      return isSingleVision ? (svPrice ?? product.retail) : (mfPrice ?? product.retail)
    }

    // No price in list = retail
    return product.retail
  }

  /**
   * Get price by product ID (for simpler lookups)
   */
  const getPriceById = (productId: string, retail: number): number => {
    // No insurance = retail price
    if (!priceList || !hasInsurance) {
      return retail
    }

    const priceData = priceList.prices[productId]

    // Simple number price
    if (typeof priceData === 'number') {
      return priceData
    }

    // SV/MF variance price
    if (priceData && typeof priceData === 'object') {
      const svPrice = (priceData as Record<string, number>).sv
      const mfPrice = (priceData as Record<string, number>).mf
      return isSingleVision ? (svPrice ?? retail) : (mfPrice ?? retail)
    }

    return retail
  }

  /**
   * Get exam copay from insurance authorization
   */
  const getExamCopay = (): number | null => {
    if (!hasInsurance) return null
    return quote.insurance.examCopay ?? null
  }

  /**
   * Get material copay from insurance authorization
   */
  const getMaterialCopay = (): number | null => {
    if (!hasInsurance) return null
    return quote.insurance.materialCopay ?? null
  }

  /**
   * Calculate insurance pays amount
   */
  const getInsurancePays = (product: Product, patientPays: number): number => {
    if (!hasInsurance) return 0
    return Math.max(0, product.retail - patientPays)
  }

  return {
    priceList,
    hasInsurance,
    isSingleVision,
    getProductPrice,
    getPriceById,
    getExamCopay,
    getMaterialCopay,
    getInsurancePays,
  }
}
