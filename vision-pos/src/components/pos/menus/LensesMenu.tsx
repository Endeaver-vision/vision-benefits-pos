'use client'

import { usePOSStore } from '@/stores/pos-store'
import {
  LENS_TYPES,
  AR_COATINGS,
  PHOTOCHROMICS,
  LENS_MATERIALS,
  Product,
} from '@/lib/pricing/product-catalog'
import {
  Eye,
  Package,
} from 'lucide-react'
import ProductTile from '../ProductTile'

// Package deal definitions
interface PackageDeal {
  id: string
  name: string
  description: string
  lensTypeId: string
  materialId: string
  arCoatingId?: string
  photochromicId?: string
  discountPercent: number
}

const PACKAGES: PackageDeal[] = [
  {
    id: 'pkg-basic',
    name: 'Basic',
    description: 'SV + CR-39',
    lensTypeId: 'sv',
    materialId: 'cr39',
    discountPercent: 0,
  },
  {
    id: 'pkg-essential',
    name: 'Essential',
    description: 'SV + Poly + AR',
    lensTypeId: 'sv',
    materialId: 'poly',
    arCoatingId: 'crizalEZPro',
    discountPercent: 10,
  },
  {
    id: 'pkg-premium',
    name: 'Premium',
    description: 'PAL + Poly + AR + Trans',
    lensTypeId: 'comfortDRx',
    materialId: 'poly',
    arCoatingId: 'crizalRock',
    photochromicId: 'genS',
    discountPercent: 15,
  },
  {
    id: 'pkg-kids',
    name: 'Kids',
    description: 'SV + Poly + AR',
    lensTypeId: 'sv',
    materialId: 'poly',
    arCoatingId: 'crizalEZPro',
    discountPercent: 5,
  },
]

export default function LensesMenu() {
  const {
    quote,
    priceList,
    addLineItem,
    removeLineItem,
    setCurrentTier,
  } = usePOSStore()

  // ===== SELECTION STATE =====

  // Lens Type (single select)
  const selectedLensType = (quote.lineItems ?? []).find(
    (item) => item.pairId === quote.activePairId && item.category === 'lens_type'
  )

  // Material (for package selection)
  const selectedMaterial = (quote.lineItems ?? []).find(
    (item) => item.pairId === quote.activePairId && item.category === 'lens_material'
  )

  // AR Coating (for package selection)
  const selectedAR = (quote.lineItems ?? []).find(
    (item) => item.pairId === quote.activePairId && item.category === 'ar_coating'
  )

  // Photochromic (for package selection)
  const selectedPhotochromic = (quote.lineItems ?? []).find(
    (item) => item.pairId === quote.activePairId && item.category === 'photochromic'
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

  const handleSelectLensType = (product: Product) => {
    const isSelected = selectedLensType?.productId === product.id

    if (isSelected) {
      if (selectedLensType) removeLineItem(selectedLensType.id)
      setCurrentTier('')
    } else {
      if (selectedLensType) removeLineItem(selectedLensType.id)

      const price = getPrice(product)
      const insurancePays = quote.insurance.hasActiveAuth
        ? Math.max(0, product.retail - price)
        : 0

      addLineItem({
        productId: product.id,
        name: product.name,
        category: 'lens_type',
        quantity: 1,
        retailPrice: product.retail,
        patientPays: price,
        insurancePays,
        tier: product.vspTier,
        pairId: quote.activePairId,
      })

      // Set tier for VSP pricing
      if (product.vspTier && product.vspTier !== 'Standard' && product.vspTier !== 'N/A') {
        const tierMatch = product.vspTier.match(/^([KJFON])/i)
        if (tierMatch) setCurrentTier(tierMatch[1].toUpperCase())
      } else {
        setCurrentTier('K')
      }
    }
  }

  // Helper handlers for package selection
  const handleSelectMaterial = (product: Product) => {
    if (product.id === 'cr39') {
      if (selectedMaterial) removeLineItem(selectedMaterial.id)
      return
    }

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

  const handleSelectAR = (product: Product) => {
    if (product.id === 'none') {
      if (selectedAR) removeLineItem(selectedAR.id)
      return
    }

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

  const handleSelectPhotochromic = (product: Product) => {
    if (product.id === 'none') {
      if (selectedPhotochromic) removeLineItem(selectedPhotochromic.id)
      return
    }

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

  const handleSelectPackage = (pkg: PackageDeal) => {
    // Select all components of the package
    const lensType = LENS_TYPES.find((p) => p.id === pkg.lensTypeId)
    const material = LENS_MATERIALS.find((p) => p.id === pkg.materialId)
    const ar = pkg.arCoatingId ? AR_COATINGS.find((p) => p.id === pkg.arCoatingId) : null
    const photo = pkg.photochromicId ? PHOTOCHROMICS.find((p) => p.id === pkg.photochromicId) : null

    if (lensType) handleSelectLensType(lensType)
    if (material && material.id !== 'cr39') handleSelectMaterial(material)
    if (ar) handleSelectAR(ar)
    if (photo) handleSelectPhotochromic(photo)
  }

  return (
    <div className="p-[2%] space-y-[3%]">
      {/* ===== PACKAGES ===== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Packages</h3>
        </div>
        <div className="grid grid-cols-4 gap-[2%]">
          {PACKAGES.map((pkg) => (
            <ProductTile
              key={pkg.id}
              icon={Package}
              name={pkg.name}
              onClick={() => handleSelectPackage(pkg)}
            />
          ))}
        </div>
      </div>

      {/* ===== LENS TYPE ===== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Eye className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Lens Type</h3>
        </div>
        <div className="grid grid-cols-4 gap-[2%]">
          {LENS_TYPES.map((product) => (
            <ProductTile
              key={product.id}
              icon={Eye}
              name={product.name}
              isSelected={selectedLensType?.productId === product.id}
              disabled={product.cashOnly && quote.insurance.hasActiveAuth}
              onClick={() => handleSelectLensType(product)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
