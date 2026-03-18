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
  AlertTriangle,
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
    setIsSingleVision,
    hasContactItems,
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

    // Fallback: use generic examCopay for lens types (they're often covered at exam copay)
    // Note: This is a rough fallback - specific lens type pricing should come from price list
    if (quote.insurance.examCopay !== undefined && quote.insurance.examCopay !== null) {
      return quote.insurance.examCopay
    }

    return product.retail
  }

  // ===== SELECTION HANDLERS =====

  // Get existing tech addon for current pair
  const selectedTechAddon = (quote.lineItems ?? []).find(
    (item) => item.pairId === quote.activePairId && item.productId?.startsWith('tech_addon_')
  )

  const handleSelectLensType = (product: Product) => {
    const isSelected = selectedLensType?.productId === product.id

    if (isSelected) {
      if (selectedLensType) removeLineItem(selectedLensType.id)
      // Remove tech addon when lens type is deselected
      if (selectedTechAddon) removeLineItem(selectedTechAddon.id)
      setCurrentTier('')
      setIsSingleVision(true) // Reset to SV on deselect
    } else {
      if (selectedLensType) removeLineItem(selectedLensType.id)
      // Remove old tech addon before adding new one
      if (selectedTechAddon) removeLineItem(selectedTechAddon.id)

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

      // Set single vision flag for material pricing
      const isSV = ['sv', 'neurolens_sv'].includes(product.id)
      setIsSingleVision(isSV)

      // VSP: Auto-add Tech Addon - SV ($10) or M/F ($40)
      const isVsp = quote.insurance.carrier === 'VSP'
      if (isVsp && quote.insurance.hasActiveAuth) {
        const techAddonPrice = isSV ? 10 : 40
        const techAddonName = isSV ? 'Tech Addon (SV)' : 'Tech Addon (M/F)'
        addLineItem({
          productId: isSV ? 'tech_addon_sv' : 'tech_addon_mf',
          name: techAddonName,
          category: 'add_on',
          quantity: 1,
          retailPrice: techAddonPrice,
          patientPays: techAddonPrice,
          insurancePays: 0,
          pairId: quote.activePairId,
        })
      }

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

      {/* ===== PACKAGES ===== */}
      <div>
        <div className="flex items-center gap-2 mb-[1.5%]">
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
        <div className="flex items-center gap-2 mb-[1.5%]">
          <Eye className="h-4 w-4 text-white/60" />
          <h3 className="text-xs font-medium text-white/60 uppercase tracking-wide">Lens Type</h3>
        </div>
        <div className="grid grid-cols-4 gap-[2%]">
          {LENS_TYPES.map((product) => (
            <ProductTile
              key={product.id}
              icon={Eye}
              name={product.name}
              price={getPrice(product)}
              retailPrice={product.retail}
              showPrice={quote.insurance.hasActiveAuth}
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
