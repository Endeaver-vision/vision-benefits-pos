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
} from 'lucide-react'
import ProductTile from '../ProductTile'

export default function AddOnsMenu() {
  const {
    quote,
    priceList,
    addLineItem,
    removeLineItem,
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
    if (!priceList || !quote.insurance.hasActiveAuth) {
      return product.retail
    }
    const priceData = priceList.prices[product.id]
    if (typeof priceData === 'number') {
      return priceData
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

  return (
    <div className="p-[2%] space-y-[3%]">
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
