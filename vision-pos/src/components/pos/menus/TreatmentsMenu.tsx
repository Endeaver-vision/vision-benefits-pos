'use client'

import { usePOSStore } from '@/stores/pos-store'
import {
  AR_COATINGS,
  PHOTOCHROMICS,
  ADD_ONS,
  MOUNT_FEES,
  Product,
} from '@/lib/pricing/product-catalog'
import {
  Sparkles,
  Sun,
  Plus,
  Wrench,
} from 'lucide-react'
import ProductTile from '../ProductTile'

export default function TreatmentsMenu() {
  const {
    quote,
    priceList,
    addLineItem,
    removeLineItem,
  } = usePOSStore()

  // ===== SELECTION STATE =====

  // AR Coating (single select)
  const selectedAR = (quote.lineItems ?? []).find(
    (item) => item.pairId === quote.activePairId && item.category === 'ar_coating'
  )

  // Photochromic (single select)
  const selectedPhotochromic = (quote.lineItems ?? []).find(
    (item) => item.pairId === quote.activePairId && item.category === 'photochromic'
  )

  // Add-Ons (multi-select)
  const selectedAddOns = (quote.lineItems ?? [])
    .filter((item) => item.pairId === quote.activePairId && item.category === 'add_on')
    .map((item) => item.productId)

  // Mount Fee (single select)
  const selectedMount = (quote.lineItems ?? []).find(
    (item) => item.pairId === quote.activePairId && item.category === 'mount_fee'
  )

  // ===== PRICING =====

  const getPrice = (product: Product): number => {
    if (product.retail === 0) return 0

    // No insurance = retail price
    if (!quote.insurance.hasActiveAuth) {
      return product.retail
    }

    // First check price list (from uploaded PDF or synthesized from authorization)
    if (priceList) {
      const priceData = priceList.prices[product.id]
      if (typeof priceData === 'number') {
        return priceData
      }
    }

    return product.retail
  }

  // ===== SELECTION HANDLERS =====

  const handleSelectAR = (product: Product) => {
    // "None" removes any AR coating
    if (product.id === 'none') {
      if (selectedAR) removeLineItem(selectedAR.id)
      return
    }

    const isSelected = selectedAR?.productId === product.id

    if (isSelected) {
      if (selectedAR) removeLineItem(selectedAR.id)
    } else {
      if (selectedAR) removeLineItem(selectedAR.id)

      const price = getPrice(product)
      const insurancePays = quote.insurance.hasActiveAuth
        ? Math.max(0, product.retail - price)
        : 0

      addLineItem({
        productId: product.id,
        name: product.name,
        category: 'ar_coating',
        quantity: 1,
        retailPrice: product.retail,
        patientPays: price,
        insurancePays,
        tier: product.vspTier,
        pairId: quote.activePairId,
      })
    }
  }

  const handleSelectPhotochromic = (product: Product) => {
    // "None" removes any photochromic
    if (product.id === 'none') {
      if (selectedPhotochromic) removeLineItem(selectedPhotochromic.id)
      return
    }

    const isSelected = selectedPhotochromic?.productId === product.id

    if (isSelected) {
      if (selectedPhotochromic) removeLineItem(selectedPhotochromic.id)
    } else {
      if (selectedPhotochromic) removeLineItem(selectedPhotochromic.id)

      const price = getPrice(product)
      const insurancePays = quote.insurance.hasActiveAuth
        ? Math.max(0, product.retail - price)
        : 0

      addLineItem({
        productId: product.id,
        name: product.name,
        category: 'photochromic',
        quantity: 1,
        retailPrice: product.retail,
        patientPays: price,
        insurancePays,
        pairId: quote.activePairId,
      })
    }
  }

  const handleSelectAddOn = (product: Product) => {
    const isSelected = selectedAddOns.includes(product.id)

    if (isSelected) {
      const item = (quote.lineItems ?? []).find(
        (i) =>
          i.productId === product.id &&
          i.pairId === quote.activePairId &&
          i.category === 'add_on'
      )
      if (item) removeLineItem(item.id)
    } else {
      const price = getPrice(product)
      const insurancePays = quote.insurance.hasActiveAuth
        ? Math.max(0, product.retail - price)
        : 0

      addLineItem({
        productId: product.id,
        name: product.name,
        category: 'add_on',
        quantity: 1,
        retailPrice: product.retail,
        patientPays: price,
        insurancePays,
        pairId: quote.activePairId,
      })
    }
  }

  const handleSelectMount = (product: Product) => {
    // Full Rim is default - selecting it removes any mount fee
    if (product.id === 'fullRim') {
      if (selectedMount) removeLineItem(selectedMount.id)
      return
    }

    const isSelected = selectedMount?.productId === product.id

    if (isSelected) {
      if (selectedMount) removeLineItem(selectedMount.id)
    } else {
      if (selectedMount) removeLineItem(selectedMount.id)

      const price = getPrice(product)
      const insurancePays = quote.insurance.hasActiveAuth
        ? Math.max(0, product.retail - price)
        : 0

      addLineItem({
        productId: product.id,
        name: product.name,
        category: 'mount_fee',
        quantity: 1,
        retailPrice: product.retail,
        patientPays: price,
        insurancePays,
        pairId: quote.activePairId,
      })
    }
  }

  // Filter out "none" options for display (we'll add them manually)
  const arCoatingsFiltered = AR_COATINGS.filter((p) => p.id !== 'none')
  const photochromicsFiltered = PHOTOCHROMICS.filter((p) => p.id !== 'none')

  return (
    <div className="space-y-6">
      {/* ===== AR COATINGS ===== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">AR Coatings</h3>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          <ProductTile
                        icon={Sparkles}
            name="None"
            isSelected={!selectedAR}
            onClick={() => handleSelectAR(AR_COATINGS[0])}
            className="w-[100px]"
          />
          {arCoatingsFiltered.map((product) => (
            <ProductTile
              key={product.id}
                            icon={Sparkles}
              name={product.name}
              isSelected={selectedAR?.productId === product.id}
              disabled={product.cashOnly && quote.insurance.hasActiveAuth}
              onClick={() => handleSelectAR(product)}
              className="w-[100px]"
            />
          ))}
        </div>
      </div>

      {/* ===== PHOTOCHROMICS ===== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sun className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Photochromics</h3>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          <ProductTile
                        icon={Sun}
            name="None"
            isSelected={!selectedPhotochromic}
            onClick={() => handleSelectPhotochromic(PHOTOCHROMICS[0])}
            className="w-[100px]"
          />
          {photochromicsFiltered.map((product) => (
            <ProductTile
              key={product.id}
                            icon={Sun}
              name={product.name}
              isSelected={selectedPhotochromic?.productId === product.id}
              onClick={() => handleSelectPhotochromic(product)}
              className="w-[100px]"
            />
          ))}
        </div>
      </div>

      {/* ===== ADD-ONS ===== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Add-Ons</h3>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          {ADD_ONS.map((product) => (
            <ProductTile
              key={product.id}
                            icon={Plus}
              name={product.name}
              isSelected={selectedAddOns.includes(product.id)}
              onClick={() => handleSelectAddOn(product)}
              className="w-[100px]"
            />
          ))}
        </div>
      </div>

      {/* ===== MOUNT TYPE ===== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Mount Type</h3>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          {MOUNT_FEES.map((product) => (
            <ProductTile
              key={product.id}
                            icon={Wrench}
              name={product.name}
              isSelected={
                product.id === 'fullRim'
                  ? !selectedMount
                  : selectedMount?.productId === product.id
              }
              onClick={() => handleSelectMount(product)}
              className="w-[100px]"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
