'use client'

import { usePOSStore } from '@/stores/pos-store'
import {
  LENS_MATERIALS,
  AR_COATINGS,
  PHOTOCHROMICS,
  Product,
} from '@/lib/pricing/product-catalog'
import {
  Layers,
  Sparkles,
  Sun,
  AlertTriangle,
} from 'lucide-react'
import ProductTile from '../ProductTile'

export default function MaterialsMenu() {
  const {
    quote,
    priceList,
    isSingleVision,
    addLineItem,
    removeLineItem,
    hasContactItems,
  } = usePOSStore()

  // ===== SELECTION STATE =====

  // Material (single select)
  const selectedMaterial = (quote.lineItems ?? []).find(
    (item) => item.pairId === quote.activePairId && item.category === 'lens_material'
  )

  // AR Coating (single select)
  const selectedAR = (quote.lineItems ?? []).find(
    (item) => item.pairId === quote.activePairId && item.category === 'ar_coating'
  )

  // Photochromic (single select)
  const selectedPhotochromic = (quote.lineItems ?? []).find(
    (item) => item.pairId === quote.activePairId && item.category === 'photochromic'
  )

  // ===== PRICING =====

  const getPrice = (product: Product, category?: string): number => {
    if (product.retail === 0) return 0

    // No insurance = retail price
    if (!quote.insurance.hasActiveAuth) {
      return product.retail
    }

    // First check price list (from uploaded PDF or synthesized from authorization)
    if (priceList) {
      const priceData = priceList.prices[product.id]

      // Simple number price
      if (typeof priceData === 'number') {
        return priceData
      }

      // SV/MF variance price (materials)
      if (priceData && typeof priceData === 'object') {
        const prices = priceData as Record<string, number>
        return isSingleVision ? (prices.sv ?? product.retail) : (prices.mf ?? product.retail)
      }
    }

    // Fallback: use generic materialCopay from authorization if available
    // This applies to all material upgrades when no specific price is found
    if (quote.insurance.materialCopay !== undefined && quote.insurance.materialCopay !== null) {
      return quote.insurance.materialCopay
    }

    return product.retail
  }

  // ===== SELECTION HANDLERS =====

  const handleSelectMaterial = (product: Product) => {
    // CR-39 is default - selecting it removes any material upgrade
    if (product.id === 'cr39') {
      if (selectedMaterial) removeLineItem(selectedMaterial.id)
      return
    }

    const isSelected = selectedMaterial?.productId === product.id

    if (isSelected) {
      if (selectedMaterial) removeLineItem(selectedMaterial.id)
    } else {
      if (selectedMaterial) removeLineItem(selectedMaterial.id)

      const price = getPrice(product)
      const insurancePays = quote.insurance.hasActiveAuth
        ? Math.max(0, product.retail - price)
        : 0

      addLineItem({
        productId: product.id,
        name: product.name,
        category: 'lens_material',
        quantity: 1,
        retailPrice: product.retail,
        patientPays: price,
        insurancePays,
        tier: product.vspTier,
        pairId: quote.activePairId,
      })
    }
  }

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

      let price = getPrice(product)

      // EyeMed backside UV surcharge: $15 extra for AR coatings with backsideUV
      const isEyeMed = quote.insurance.carrier === 'EYEMED'
      const hasBacksideUV = product.backsideUV === true
      if (isEyeMed && hasBacksideUV && quote.insurance.hasActiveAuth) {
        price += 15
      }

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
        note: isEyeMed && hasBacksideUV ? 'Includes $15 backside UV' : undefined,
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

  // Filter out "none" options for display (we'll add them manually)
  const arCoatingsFiltered = AR_COATINGS.filter((p) => p.id !== 'none')
  const photochromicsFiltered = PHOTOCHROMICS.filter((p) => p.id !== 'none')

  // Check for benefit conflict
  const contactItemsExist = hasContactItems()

  return (
    <div className="p-[2%] space-y-[3%]">
      {/* Benefit conflict warning */}
      {contactItemsExist && quote.insurance.hasActiveAuth && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-300">
            <strong>Benefit Conflict:</strong> Contact lenses are in this order. Most vision plans do not cover both contacts and glasses in the same benefit period.
          </span>
        </div>
      )}

      {/* ===== MATERIALS ===== */}
      <div>
        <div className="flex items-center gap-2 mb-[1.5%]">
          <Layers className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Materials</h3>
        </div>
        <div className="grid grid-cols-4 gap-[2%]">
          {LENS_MATERIALS.map((product) => (
            <ProductTile
              key={product.id}
              icon={Layers}
              name={product.name}
              price={getPrice(product)}
              retailPrice={product.retail}
              showPrice={quote.insurance.hasActiveAuth}
              isSelected={
                product.id === 'cr39'
                  ? !selectedMaterial
                  : selectedMaterial?.productId === product.id
              }
              onClick={() => handleSelectMaterial(product)}
            />
          ))}
        </div>
      </div>

      {/* ===== AR COATINGS ===== */}
      <div>
        <div className="flex items-center gap-2 mb-[1.5%]">
          <Sparkles className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">AR Coatings</h3>
        </div>
        <div className="grid grid-cols-4 gap-[2%]">
          <ProductTile
            icon={Sparkles}
            name="None"
            price={0}
            showPrice={quote.insurance.hasActiveAuth}
            isSelected={!selectedAR}
            onClick={() => handleSelectAR(AR_COATINGS[0])}
          />
          {arCoatingsFiltered.map((product) => (
            <ProductTile
              key={product.id}
              icon={Sparkles}
              name={product.name}
              price={getPrice(product)}
              retailPrice={product.retail}
              showPrice={quote.insurance.hasActiveAuth}
              isSelected={selectedAR?.productId === product.id}
              disabled={product.cashOnly && quote.insurance.hasActiveAuth}
              onClick={() => handleSelectAR(product)}
            />
          ))}
        </div>
      </div>

      {/* ===== PHOTOCHROMICS ===== */}
      <div>
        <div className="flex items-center gap-2 mb-[1.5%]">
          <Sun className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Photochromics</h3>
        </div>
        <div className="grid grid-cols-4 gap-[2%]">
          <ProductTile
            icon={Sun}
            name="None"
            price={0}
            showPrice={quote.insurance.hasActiveAuth}
            isSelected={!selectedPhotochromic}
            onClick={() => handleSelectPhotochromic(PHOTOCHROMICS[0])}
          />
          {photochromicsFiltered.map((product) => (
            <ProductTile
              key={product.id}
              icon={Sun}
              name={product.name}
              price={getPrice(product)}
              retailPrice={product.retail}
              showPrice={quote.insurance.hasActiveAuth}
              isSelected={selectedPhotochromic?.productId === product.id}
              onClick={() => handleSelectPhotochromic(product)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
