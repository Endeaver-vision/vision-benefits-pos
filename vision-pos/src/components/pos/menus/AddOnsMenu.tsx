'use client'

import { usePOSStore } from '@/stores/pos-store'
import {
  ADD_ONS,
  MOUNT_FEES,
  Product,
} from '@/lib/pricing/product-catalog'
import {
  Plus,
  Wrench,
  AlertTriangle,
} from 'lucide-react'
import ProductTile from '../ProductTile'

export default function AddOnsMenu() {
  const {
    quote,
    priceList,
    addLineItem,
    removeLineItem,
    hasContactItems,
  } = usePOSStore()

  // ===== SELECTION STATE =====

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

      {/* ===== ADD-ONS ===== */}
      <div>
        <div className="flex items-center gap-2 mb-[1.5%]">
          <Plus className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Add-Ons</h3>
        </div>
        <div className="grid grid-cols-4 gap-[2%]">
          {ADD_ONS.map((product) => (
            <ProductTile
              key={product.id}
              icon={Plus}
              name={product.name}
              price={getPrice(product)}
              retailPrice={product.retail}
              showPrice={quote.insurance.hasActiveAuth}
              isSelected={selectedAddOns.includes(product.id)}
              onClick={() => handleSelectAddOn(product)}
            />
          ))}
        </div>
      </div>

      {/* ===== MOUNT TYPE ===== */}
      <div>
        <div className="flex items-center gap-2 mb-[1.5%]">
          <Wrench className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Mount Type</h3>
        </div>
        <div className="grid grid-cols-4 gap-[2%]">
          {MOUNT_FEES.map((product) => (
            <ProductTile
              key={product.id}
              icon={Wrench}
              name={product.name}
              price={getPrice(product)}
              retailPrice={product.retail}
              showPrice={quote.insurance.hasActiveAuth}
              isSelected={
                product.id === 'fullRim'
                  ? !selectedMount
                  : selectedMount?.productId === product.id
              }
              onClick={() => handleSelectMount(product)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
