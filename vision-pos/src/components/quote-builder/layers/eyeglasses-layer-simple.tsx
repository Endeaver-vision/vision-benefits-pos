'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2, Shield, AlertTriangle, Search, X, Glasses, Wallet } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useQuotePricingContext, useAuthorizationPricing } from '@/contexts/quote-pricing-context'

interface Product {
  id: string
  name: string
  price: number                    // Retail price
  customerPrice?: number | null    // Patient pays from price list (null = needs pricing)
  insuranceSavings?: number        // How much insurance covers
  tier?: string | null             // Insurance tier code
  needsPricing?: boolean           // True if no price mapping exists
  hasCustomPrice?: boolean         // True if manually overridden
  notes?: string
  sku?: string
  manufacturer?: string
  brand?: string
  model?: string
  color?: string
  isFeatured?: boolean
  pricingCategory?: string  // For determining SV vs MF tech addon
}

// Frame from search API
interface FrameResult {
  id: string
  sku: string
  brand: string
  model: string
  color: string
  size: string
  price: number
  manufacturer: string
}

interface ProductsData {
  frames: Product[]
  lensType: Product[]
  lensMaterial: Product[]
  arCoating: Product[]
  transitions: Product[]
  polarized: Product[]
  mountFee: Product[]
  addons: Product[]
}

interface EyeglassesLayerProps {
  className?: string
  onNext?: () => void
  onBack?: () => void
  onSkipSecondPair?: () => void
}

export function EyeglassesLayerSimple({ className, onNext, onBack, onSkipSecondPair }: EyeglassesLayerProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Pricing context for real-time insurance calculations
  const {
    customerId,
    addItem,
    removeItem,
    getItemPricing,
    authorization,
    clearItemsByCategory,
    pricedItems,
    pricingSummary,
    isCalculating,
    contactLenses,
    materialsConflict,
    usesMaterialsAllowance,
    eyeglassesSelections,
    updateEyeglassesSelections,
  } = useQuotePricingContext()

  // Check if glasses benefit is getting the insurance allowance
  // This uses the automatic conflict detection system
  const isGlassesInsured = usesMaterialsAllowance('glasses')

  // Show retail-only mode banner ONLY when there's a conflict AND contacts is active
  // This means the user has both glasses and contacts in the quote, and chose contacts for the allowance
  const showRetailOnlyBanner = materialsConflict.hasConflict && materialsConflict.activeBenefit === 'contacts'

  // Check for declining balance plan
  const isDecliningBalancePlan = authorization?.benefitStructure === 'DECLINING_BALANCE'

  // Check for declining balance either/or restriction
  const hasEitherOrRestriction = authorization?.eitherOrRestriction || authorization?.decliningBalance?.eitherOrRestriction

  // Show either/or warning for declining balance plans when contacts are already using the allowance
  const showEitherOrWarning = isDecliningBalancePlan && hasEitherOrRestriction && contactLenses?.enabled && materialsConflict.activeBenefit === 'contacts'

  // VSP Matrix pricing helper
  const {
    carrier,
    materialsCopay,
    getVspMatrixPrice,
    getVspSvMaterialPrice,
    getVspAddonPrice,
  } = useAuthorizationPricing()

  // Check if this is a VSP customer
  const isVspCustomer = carrier?.toUpperCase() === 'VSP'

  // Products from database
  const [products, setProducts] = useState<ProductsData | null>(null)

  // State for selections - initialized from context
  const [frame, setFrame] = useState<string | null>(eyeglassesSelections.frame)
  const [lensType, setLensType] = useState<string | null>(eyeglassesSelections.lensType)
  const [lensMaterial, setLensMaterial] = useState<string | null>(eyeglassesSelections.lensMaterial)
  const [arCoating, setArCoating] = useState<string | null>(eyeglassesSelections.arCoating)
  const [transitions, setTransitions] = useState<string | null>(eyeglassesSelections.transitions)
  const [polarized, setPolarized] = useState<string | null>(eyeglassesSelections.polarized)
  const [mountFee, setMountFee] = useState<string | null>(eyeglassesSelections.mountFee)
  const [addons, setAddons] = useState<string[]>(eyeglassesSelections.addons)
  const [techAddon, setTechAddon] = useState<string | null>(eyeglassesSelections.techAddon)  // VSP tech addon
  const [uvTreatment, setUvTreatment] = useState<string | null>(null)  // VSP UV treatment (backside/front)
  const [prismDiopters, setPrismDiopters] = useState<number>(1)  // Prism amount (per diopter pricing)

  // Manual item addition state
  const [showManualItemForm, setShowManualItemForm] = useState(false)
  const [manualItemName, setManualItemName] = useState('')
  const [manualItemPrice, setManualItemPrice] = useState('')
  const [manualItems, setManualItems] = useState<Array<{ id: string; name: string; price: number }>>([])


  // Track the actual SKUs added to the Map for reliable removal
  // This ensures we always remove the correct item even if product lookup fails
  const [addedSkus, setAddedSkus] = useState<{
    lensType?: string
    lensMaterial?: string
    arCoating?: string
    transitions?: string
    polarized?: string
    mountFee?: string
  }>({})

  // Frame search state - initialize selectedFrame from context
  const [frameSearch, setFrameSearch] = useState('')
  const [frameSearchResults, setFrameSearchResults] = useState<FrameResult[]>([])
  const [frameSearchLoading, setFrameSearchLoading] = useState(false)
  const [selectedFrame, setSelectedFrame] = useState<FrameResult | null>(
    eyeglassesSelections.selectedFrame as FrameResult | null
  )
  const [isPatientOwnedFrame, setIsPatientOwnedFrame] = useState(eyeglassesSelections.isPatientOwnedFrame)

  // Sync selections to context whenever they change
  useEffect(() => {
    updateEyeglassesSelections({
      frame,
      selectedFrame: selectedFrame as any,
      isPatientOwnedFrame,
      lensType,
      lensMaterial,
      arCoating,
      transitions,
      polarized,
      mountFee,
      addons,
      techAddon,
    })
  }, [frame, selectedFrame, isPatientOwnedFrame, lensType, lensMaterial, arCoating, transitions, polarized, mountFee, addons, techAddon, updateEyeglassesSelections])

  // Get existing eyeglasses items from pricing context
  const existingEyeglassItems = useMemo(() => {
    return pricedItems.filter(item =>
      item.category === 'frame' ||
      item.category === 'lens' ||
      item.category === 'coating' ||
      item.category === 'addon'
    )
  }, [pricedItems])

  // Calculate eyeglasses-specific totals (NOT including exams or contacts)
  const eyeglassesSummary = useMemo(() => {
    const retailTotal = existingEyeglassItems.reduce((sum, item) => sum + item.retailPrice, 0)
    const patientTotal = existingEyeglassItems.reduce((sum, item) => sum + item.patientPays, 0)
    const insuranceTotal = existingEyeglassItems.reduce((sum, item) => sum + item.insurancePays, 0)
    return {
      retailTotal,
      patientTotal,
      insuranceTotal,
      totalSavings: insuranceTotal,
    }
  }, [existingEyeglassItems])

  // VSP Matrix-based patient total calculation
  // For VSP, progressive + material pricing uses combined codes (e.g., "NJ" = $125)
  // NOT the additive approach (NA $175 + AJ $118 = $293)
  const vspMatrixTotal = useMemo(() => {
    if (!isVspCustomer || !products) return null

    // Get selected products
    const selectedLens = products.lensType?.find(p => p.id === lensType)
    const selectedMaterial = products.lensMaterial?.find(p => p.id === lensMaterial)
    const selectedAr = products.arCoating?.find(p => p.id === arCoating)
    const selectedTrans = products.transitions?.find(p => p.id === transitions)
    const selectedPolar = products.polarized?.find(p => p.id === polarized)

    let total = 0
    const breakdown: Record<string, { name: string; copay: number; code?: string }> = {}

    // Materials copay (always added for VSP)
    if (materialsCopay !== null) {
      total += materialsCopay
      breakdown['materialsCopay'] = { name: 'Materials Copay', copay: materialsCopay }
    }

    // Check if it's Single Vision or Progressive
    const isSV = selectedLens?.pricingCategory === 'SINGLE_VISION'
    const isProgressive = selectedLens?.pricingCategory === 'PROGRESSIVE' ||
                          selectedLens?.pricingCategory === 'BIFOCAL' ||
                          selectedLens?.pricingCategory === 'TRIFOCAL'

    // Lens + Material pricing (VSP Matrix)
    if (isProgressive && selectedLens && selectedMaterial) {
      // Progressive: use matrix combined code (e.g., "NJ" for Varilux X + Hi-Index 1.74)
      const matrixResult = getVspMatrixPrice(selectedLens.name, selectedMaterial.name)
      if (matrixResult) {
        total += matrixResult.copay
        breakdown['lensAndMaterial'] = {
          name: `${selectedLens.name} + ${selectedMaterial.name}`,
          copay: matrixResult.copay,
          code: matrixResult.combinedCode
        }
      } else {
        // Fallback to additive if matrix lookup fails
        const lensCopay = selectedLens.customerPrice ?? selectedLens.price
        const materialCopay = selectedMaterial.customerPrice ?? selectedMaterial.price
        total += lensCopay + materialCopay
        breakdown['lens'] = { name: selectedLens.name, copay: lensCopay }
        breakdown['material'] = { name: selectedMaterial.name, copay: materialCopay }
      }
    } else if (isSV && selectedMaterial) {
      // Single Vision: use material-only code (e.g., "AD_sv" for Poly SV)
      const svMaterialResult = getVspSvMaterialPrice(selectedMaterial.name)
      if (svMaterialResult) {
        total += svMaterialResult.copay
        breakdown['material'] = {
          name: selectedMaterial.name,
          copay: svMaterialResult.copay,
          code: svMaterialResult.combinedCode
        }
      } else {
        // Fallback
        const materialCopay = selectedMaterial.customerPrice ?? selectedMaterial.price
        total += materialCopay
        breakdown['material'] = { name: selectedMaterial.name, copay: materialCopay }
      }
      // SV lens itself is typically covered under materials copay
    } else if (selectedLens) {
      // No material selected or unknown category - use individual price
      const lensCopay = selectedLens.customerPrice ?? selectedLens.price
      total += lensCopay
      breakdown['lens'] = { name: selectedLens.name, copay: lensCopay }
    }

    // Add-ons (flat copays, not part of progressive+material matrix)
    // AR Coating
    if (selectedAr?.tier) {
      const arCopay = getVspAddonPrice(selectedAr.tier, isSV)
      if (arCopay !== null) {
        total += arCopay
        breakdown['arCoating'] = { name: selectedAr.name, copay: arCopay, code: selectedAr.tier }
      }
    }

    // Photochromic
    if (selectedTrans?.tier) {
      const transCopay = getVspAddonPrice(selectedTrans.tier, isSV)
      if (transCopay !== null) {
        total += transCopay
        breakdown['photochromic'] = { name: selectedTrans.name, copay: transCopay, code: selectedTrans.tier }
      }
    }

    // Polarized
    if (selectedPolar?.tier) {
      const polarCopay = getVspAddonPrice(selectedPolar.tier, isSV)
      if (polarCopay !== null) {
        total += polarCopay
        breakdown['polarized'] = { name: selectedPolar.name, copay: polarCopay, code: selectedPolar.tier }
      }
    }

    // Frame pricing (use standard frame allowance calculation, not matrix)
    // Frame pricing is handled separately via frameAllowance, not included here

    return {
      total,
      breakdown,
      isMatrixPricing: isProgressive && selectedMaterial !== undefined,
    }
  }, [isVspCustomer, products, lensType, lensMaterial, arCoating, transitions, polarized,
      materialsCopay, getVspMatrixPrice, getVspSvMaterialPrice, getVspAddonPrice])

  // Determine if selected lens type is Single Vision or Multifocal
  const selectedLensCategory = useMemo(() => {
    if (!lensType || !products?.lensType) return null
    const selectedLensProduct = products.lensType.find(p => p.id === lensType)
    if (!selectedLensProduct?.pricingCategory) return null

    if (selectedLensProduct.pricingCategory === 'SINGLE_VISION') {
      return 'sv'
    } else if (['PROGRESSIVE', 'BIFOCAL', 'TRIFOCAL', 'LINED_MULTIFOCAL'].includes(selectedLensProduct.pricingCategory)) {
      return 'multifocal'
    }
    return null
  }, [lensType, products?.lensType])

  // Group materials by base name to show SV/MF prices side by side
  interface MaterialGroup {
    baseName: string
    sv?: Product
    mf?: Product
    standard?: Product  // For materials without SV/MF variants (like CR-39)
  }

  const groupedMaterials = useMemo((): MaterialGroup[] => {
    if (!products?.lensMaterial) return []

    const groups: Record<string, MaterialGroup> = {}

    for (const material of products.lensMaterial) {
      const name = material.name
      const isSvVariant = name.toLowerCase().includes('(single vision)')
      const isMfVariant = name.toLowerCase().includes('(multifocal)')

      // Extract base name (e.g., "Polycarbonate" from "Polycarbonate (Single Vision)")
      const baseName = name.replace(/\s*\((Single Vision|Multifocal)\)/i, '').trim()

      if (!groups[baseName]) {
        groups[baseName] = { baseName }
      }

      if (isSvVariant) {
        groups[baseName].sv = material
      } else if (isMfVariant) {
        groups[baseName].mf = material
      } else {
        // Standard product without SV/MF variant (like CR-39)
        groups[baseName].standard = material
      }
    }

    return Object.values(groups)
  }, [products?.lensMaterial])

  // Declining balance specific calculations
  const decliningBalanceInfo = useMemo(() => {
    if (!isDecliningBalancePlan || !authorization?.decliningBalance) {
      return null
    }

    const totalAllowance = authorization.decliningBalance.totalAllowance ?? 0
    const balanceUsed = eyeglassesSummary.retailTotal
    const balanceRemaining = Math.max(0, totalAllowance - balanceUsed)
    const overage = Math.max(0, balanceUsed - totalAllowance)
    const overageDiscount = authorization.decliningBalance.overageDiscounts.frameLensPackage / 100
    const overageDiscountAmount = overage * overageDiscount
    const patientPaysOverage = overage - overageDiscountAmount

    return {
      totalAllowance,
      balanceUsed,
      balanceRemaining,
      overage,
      overageDiscount: authorization.decliningBalance.overageDiscounts.frameLensPackage,
      overageDiscountAmount,
      patientPaysOverage,
      patientPaysTotal: patientPaysOverage, // For glasses, patient only pays overage
      eitherOrRestriction: authorization.decliningBalance.eitherOrRestriction,
    }
  }, [isDecliningBalancePlan, authorization, eyeglassesSummary.retailTotal])

  // Helper to add product to pricing context
  const addProductToQuote = useCallback((product: Product, category: 'frame' | 'lens' | 'coating' | 'addon') => {
    if (product.id === 'none' || product.id === 'opt-out') {
      return // Don't add opt-out items
    }
    addItem({
      sku: product.sku || product.id,
      displayName: product.name,
      category,
      retailPrice: product.price,
    })
  }, [addItem])

  // Helper to remove product from pricing context
  const removeProductFromQuote = useCallback((productId: string) => {
    removeItem(productId)
  }, [removeItem])

  // Customer info from price list API
  const [customerPriceInfo, setCustomerPriceInfo] = useState<{
    hasPriceList: boolean
    carrier: string | null
    productsNeedingPricing: number
  } | null>(null)

  // Fetch products from API - include customerId for price list integration
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        // Build URL with customerId if available
        const url = customerId
          ? `/api/quote-builder/products?customerId=${encodeURIComponent(customerId)}`
          : '/api/quote-builder/products'

        const response = await fetch(url)
        const data = await response.json()

        if (data.success) {
          // Add "None" option to transitions and polarized at the end
          const productsWithNone: ProductsData = {
            ...data.products,
            transitions: [
              ...(data.products.transitions || []),
              { id: 'none', name: 'None', price: 0 }
            ],
            polarized: [
              ...(data.products.polarized || []),
              { id: 'none', name: 'None', price: 0 }
            ],
            arCoating: [
              ...(data.products.arCoating || []),
              { id: 'opt-out', name: 'No Charge', price: 0 }
            ]
          }
          setProducts(productsWithNone)

          // Store customer price info if available
          if (data.customer) {
            setCustomerPriceInfo({
              hasPriceList: data.customer.hasPriceList,
              carrier: data.customer.carrier,
              productsNeedingPricing: data.customer.productsNeedingPricing
            })
          }
        } else {
          setError('Failed to load products')
        }
      } catch (err) {
        console.error('Error fetching products:', err)
        setError('Failed to load products')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [customerId])  // Re-fetch when customer changes

  // Mark as initialized once products are loaded
  // Also initialize addedSkus from existing selections to ensure proper removal tracking
  useEffect(() => {
    if (products && !hasInitialized) {
      // Initialize addedSkus from existing selections
      const initialSkus: typeof addedSkus = {}

      if (lensType) {
        const product = products.lensType?.find(p => p.id === lensType)
        if (product) initialSkus.lensType = product.sku || product.id
      }
      if (lensMaterial) {
        const product = products.lensMaterial?.find(p => p.id === lensMaterial)
        if (product) initialSkus.lensMaterial = product.sku || product.id
      }
      if (arCoating) {
        const product = products.arCoating?.find(p => p.id === arCoating)
        if (product) initialSkus.arCoating = product.sku || product.id
      }
      if (transitions && transitions !== 'none') {
        const product = products.transitions?.find(p => p.id === transitions)
        if (product) initialSkus.transitions = product.sku || product.id
      }
      if (polarized && polarized !== 'none') {
        const product = products.polarized?.find(p => p.id === polarized)
        if (product) initialSkus.polarized = product.sku || product.id
      }
      if (mountFee) {
        const product = products.mountFee?.find(p => p.id === mountFee)
        if (product) initialSkus.mountFee = product.sku || product.id
      }

      setAddedSkus(initialSkus)
      setHasInitialized(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, hasInitialized])

  const toggleAddon = (id: string) => {
    setAddons(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const getSelectedProduct = (list: Product[] | undefined, id: string | null): Product | undefined => {
    if (!list || !id) return undefined
    return list.find(p => p.id === id)
  }

  const calculateTotal = () => {
    if (!products) return 0
    let total = 0

    // Frame
    const selectedFrame = getSelectedProduct(products.frames, frame)
    if (selectedFrame) total += selectedFrame.price

    // Lens type
    const lens = getSelectedProduct(products.lensType, lensType)
    if (lens) total += lens.price

    // Lens material
    const material = getSelectedProduct(products.lensMaterial, lensMaterial)
    if (material) total += material.price

    // AR coating
    const ar = getSelectedProduct(products.arCoating, arCoating)
    if (ar) total += ar.price

    // Transitions
    const trans = getSelectedProduct(products.transitions, transitions)
    if (trans) total += trans.price

    // Polarized
    const polar = getSelectedProduct(products.polarized, polarized)
    if (polar) total += polar.price

    // Mount fee
    const mount = getSelectedProduct(products.mountFee, mountFee)
    if (mount) total += mount.price

    // Add-ons
    addons.forEach(id => {
      const addon = getSelectedProduct(products.addons, id)
      if (addon) total += addon.price
    })

    return total
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handleReset = () => {
    setFrame(null)
    setSelectedFrame(null)
    setIsPatientOwnedFrame(false)
    setFrameSearch('')
    setFrameSearchResults([])
    setLensType(null)
    setLensMaterial(null)
    setArCoating(null)
    setTransitions(null)
    setPolarized(null)
    setMountFee(null)
    setAddons([])
    setTechAddon(null)  // Clear VSP tech addon
    setUvTreatment(null)  // Clear VSP UV treatment
    setManualItems([])  // Clear custom items
    setShowManualItemForm(false)
    setManualItemName('')
    setManualItemPrice('')
    setAddedSkus({})  // Clear SKU tracking
    // Clear all eyeglasses items from pricing context
    clearItemsByCategory('frame')
    clearItemsByCategory('lens')
    clearItemsByCategory('coating')
    clearItemsByCategory('addon')
    setShowResetConfirm(false)
  }

  // Handlers that sync with pricing context
  // Frame search function
  const searchFrames = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setFrameSearchResults([])
      return
    }

    setFrameSearchLoading(true)
    try {
      const response = await fetch(`/api/frames?search=${encodeURIComponent(query)}&limit=20`)
      const data = await response.json()
      if (data.success) {
        setFrameSearchResults(data.frames || [])
      }
    } catch (error) {
      console.error('Frame search error:', error)
      setFrameSearchResults([])
    } finally {
      setFrameSearchLoading(false)
    }
  }, [])

  // Debounced frame search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchFrames(frameSearch)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [frameSearch, searchFrames])

  // Handle frame selection from search
  const handleFrameSearchSelect = (frameResult: FrameResult) => {
    // Remove old selection if any
    if (selectedFrame) {
      removeProductFromQuote(selectedFrame.sku || selectedFrame.id)
    }

    setSelectedFrame(frameResult)
    setFrame(frameResult.id)
    setFrameSearch('')
    setFrameSearchResults([])

    // Add to quote
    addItem({
      sku: frameResult.sku || frameResult.id,
      displayName: `${frameResult.brand} ${frameResult.model}`,
      category: 'frame',
      retailPrice: frameResult.price,
    })
  }

  // Clear frame selection
  const handleClearFrame = () => {
    if (selectedFrame) {
      removeProductFromQuote(selectedFrame.sku || selectedFrame.id)
    }
    // If POF was selected, also remove the POF mount fee
    if (isPatientOwnedFrame) {
      removeProductFromQuote('MOUNT-POF')
      setMountFee(null)
    }
    setSelectedFrame(null)
    setFrame(null)
    setIsPatientOwnedFrame(false)
  }

  // Handle patient owned frame selection
  const handlePatientOwnedFrame = () => {
    // Clear any existing frame selection
    if (selectedFrame) {
      removeProductFromQuote(selectedFrame.sku || selectedFrame.id)
    }
    // Clear any existing mount fee
    if (mountFee && products?.mountFee) {
      const oldMountProduct = products.mountFee.find(p => p.id === mountFee)
      if (oldMountProduct) removeProductFromQuote(oldMountProduct.sku || oldMountProduct.id)
    }

    setSelectedFrame(null)
    setFrame('patient-owned')
    setIsPatientOwnedFrame(true)
    setFrameSearch('')
    setFrameSearchResults([])

    // Automatically add the POF mount fee ($75)
    setMountFee('pof-mount-fee')
    addItem({
      sku: 'MOUNT-POF',
      displayName: 'Patient Owned Frame Mount',
      category: 'addon',
      retailPrice: 75,
    })
  }

  // Calculate patient cost for frame (simple: retail - allowance, with discount on overage)
  // VSP: 20% off overage (patient pays 80% of amount over allowance)
  const calculateFramePatientCost = (framePrice: number) => {
    if (!authorization || !authorization.frameAllowance) return framePrice
    const allowance = authorization.frameAllowance
    if (framePrice <= allowance) return 0
    const overage = framePrice - allowance

    // VSP default: 20% off overage
    const isVsp = authorization.carrier?.toUpperCase() === 'VSP'
    const defaultDiscount = isVsp ? 0.20 : 0
    let overageDiscount = authorization.frameOverageDiscount ?? defaultDiscount

    // Normalize discount to decimal (0.20 = 20%) in case stored as integer (20)
    if (overageDiscount > 1) {
      overageDiscount = overageDiscount / 100
    }

    // Patient pays (1 - discount) of the overage (e.g., 80% if discount is 20%)
    return Math.round(overage * (1 - overageDiscount) * 100) / 100
  }

  const handleFrameSelect = (product: Product) => {
    // Remove old selection
    if (frame && products?.frames) {
      const oldProduct = products.frames.find(p => p.id === frame)
      if (oldProduct) removeProductFromQuote(oldProduct.sku || oldProduct.id)
    }
    setFrame(product.id)
    addProductToQuote(product, 'frame')
  }

  const handleLensTypeSelect = (product: Product) => {
    const newSku = product.sku || product.id

    // Remove old selection using tracked SKU (more reliable than product lookup)
    if (addedSkus.lensType) {
      removeProductFromQuote(addedSkus.lensType)
    }

    // Remove old tech addon if any
    if (techAddon) {
      removeProductFromQuote(techAddon)
      setTechAddon(null)
    }

    // Clear material selection when lens type changes (SV/MF have different pricing)
    if (lensMaterial && addedSkus.lensMaterial) {
      removeProductFromQuote(addedSkus.lensMaterial)
      setLensMaterial(null)
      setAddedSkus(prev => ({ ...prev, lensMaterial: undefined }))
    }

    setLensType(product.id)
    setAddedSkus(prev => ({ ...prev, lensType: newSku }))
    addProductToQuote(product, 'lens')

    // Auto-add VSP tech addon based on lens pricing category
    const isVsp = authorization?.carrier?.toUpperCase() === 'VSP'
    if (isVsp && product.pricingCategory) {
      const isSingleVision = product.pricingCategory === 'SINGLE_VISION'
      const isMultifocal = ['PROGRESSIVE', 'BIFOCAL', 'TRIFOCAL', 'LINED_MULTIFOCAL'].includes(product.pricingCategory)

      if (isSingleVision) {
        // Add SV tech addon ($10)
        const techSku = 'ADDON-TECH-SV'
        setTechAddon(techSku)
        addItem({
          sku: techSku,
          displayName: 'Tech Add-on Single Vision (VSP)',
          category: 'addon',
          retailPrice: 10,
        })
      } else if (isMultifocal) {
        // Add MF tech addon ($40)
        const techSku = 'ADDON-TECH-MF'
        setTechAddon(techSku)
        addItem({
          sku: techSku,
          displayName: 'Tech Add-on Multifocal (VSP)',
          category: 'addon',
          retailPrice: 40,
        })
      }
    }
  }

  const handleLensMaterialSelect = (product: Product) => {
    const newSku = product.sku || product.id

    // Remove old selection using tracked SKU
    if (addedSkus.lensMaterial) {
      removeProductFromQuote(addedSkus.lensMaterial)
    }

    setLensMaterial(product.id)
    setAddedSkus(prev => ({ ...prev, lensMaterial: newSku }))
    addProductToQuote(product, 'lens')
  }

  const handleArCoatingSelect = (product: Product) => {
    const newSku = product.sku || product.id

    // Remove old selection using tracked SKU
    if (addedSkus.arCoating) {
      removeProductFromQuote(addedSkus.arCoating)
    }

    // Remove old UV treatment if any
    if (uvTreatment) {
      removeProductFromQuote(uvTreatment)
      setUvTreatment(null)
    }

    setArCoating(product.id)
    setAddedSkus(prev => ({ ...prev, arCoating: newSku }))
    addProductToQuote(product, 'coating')

    // VSP auto-add UV treatment based on coating selection
    const isVsp = authorization?.carrier?.toUpperCase() === 'VSP'
    if (isVsp && product.id !== 'opt-out') {
      const isCrizal = product.name.toLowerCase().includes('crizal')

      if (isCrizal) {
        // Crizal coating → Backside UV
        const uvSku = 'UV-BACKSIDE'
        setUvTreatment(uvSku)
        addItem({
          sku: uvSku,
          displayName: 'UV Backside (with Crizal)',
          category: 'addon',
          retailPrice: 16,
        })
      } else {
        // Non-Crizal coating → Front UV
        const uvSku = 'UV-FRONT'
        setUvTreatment(uvSku)
        addItem({
          sku: uvSku,
          displayName: 'UV Front (without Crizal)',
          category: 'addon',
          retailPrice: 16,
        })
      }
    }
  }

  const handleTransitionsSelect = (product: Product) => {
    const newSku = product.sku || product.id

    // Remove old transitions selection using tracked SKU
    if (addedSkus.transitions) {
      removeProductFromQuote(addedSkus.transitions)
    }

    setTransitions(product.id)

    // Transitions and Polarized are mutually exclusive (can't have both)
    // If selecting an actual transitions product (not "None"), clear polarized
    if (product.id !== 'none' && addedSkus.polarized) {
      removeProductFromQuote(addedSkus.polarized)
      setAddedSkus(prev => ({ ...prev, polarized: undefined }))
      setPolarized(null)
    }

    // Track the new SKU (or clear if "none")
    if (product.id !== 'none') {
      setAddedSkus(prev => ({ ...prev, transitions: newSku }))
    } else {
      setAddedSkus(prev => ({ ...prev, transitions: undefined }))
    }

    addProductToQuote(product, 'coating')
  }

  const handlePolarizedSelect = (product: Product) => {
    const newSku = product.sku || product.id

    // Remove old polarized selection using tracked SKU
    if (addedSkus.polarized) {
      removeProductFromQuote(addedSkus.polarized)
    }

    setPolarized(product.id)

    // Polarized and Transitions are mutually exclusive (can't have both)
    // If selecting an actual polarized product (not "None"), clear transitions
    if (product.id !== 'none' && addedSkus.transitions) {
      removeProductFromQuote(addedSkus.transitions)
      setAddedSkus(prev => ({ ...prev, transitions: undefined }))
      setTransitions(null)
    }

    // Track the new SKU (or clear if "none")
    if (product.id !== 'none') {
      setAddedSkus(prev => ({ ...prev, polarized: newSku }))
    } else {
      setAddedSkus(prev => ({ ...prev, polarized: undefined }))
    }

    addProductToQuote(product, 'coating')
  }

  const handleMountFeeSelect = (product: Product) => {
    const newSku = product.sku || product.id

    // Remove old selection using tracked SKU
    if (addedSkus.mountFee) {
      removeProductFromQuote(addedSkus.mountFee)
    }

    setMountFee(product.id)
    setAddedSkus(prev => ({ ...prev, mountFee: newSku }))
    addProductToQuote(product, 'addon')
  }

  const handleAddonToggle = (product: Product) => {
    const isPrism = product.id === 'preferred-prism' || product.name.toLowerCase().includes('prism (per diopter)')

    if (addons.includes(product.id)) {
      setAddons(prev => prev.filter(a => a !== product.id))
      removeProductFromQuote(product.sku || product.id)
      if (isPrism) {
        setPrismDiopters(1)  // Reset diopters when deselecting prism
      }
    } else {
      setAddons(prev => [...prev, product.id])
      if (isPrism) {
        // For prism, add with quantity = diopters
        addItem({
          sku: product.sku || product.id,
          displayName: `${product.name} (${prismDiopters} diopter${prismDiopters > 1 ? 's' : ''})`,
          category: 'addon',
          retailPrice: product.price * prismDiopters,
          quantity: prismDiopters,
        })
      } else {
        addProductToQuote(product, 'addon')
      }
    }
  }

  // Handle prism diopter change
  const handlePrismDioptersChange = (newDiopters: number, product: Product) => {
    if (newDiopters < 1) newDiopters = 1
    if (newDiopters > 20) newDiopters = 20
    setPrismDiopters(newDiopters)

    // Update the quote with new quantity
    if (addons.includes(product.id)) {
      // Remove old entry and add new one with updated quantity
      removeProductFromQuote(product.sku || product.id)
      addItem({
        sku: product.sku || product.id,
        displayName: `${product.name} (${newDiopters} diopter${newDiopters > 1 ? 's' : ''})`,
        category: 'addon',
        retailPrice: product.price * newDiopters,
        quantity: newDiopters,
      })
    }
  }

  // Handle adding a manual/custom item
  const handleAddManualItem = () => {
    if (!manualItemName.trim() || !manualItemPrice) return

    const price = parseFloat(manualItemPrice)
    if (isNaN(price) || price < 0) return

    const id = `manual-${Date.now()}`
    const newItem = { id, name: manualItemName.trim(), price }

    setManualItems(prev => [...prev, newItem])
    addItem({
      sku: id,
      displayName: newItem.name,
      category: 'addon',
      retailPrice: price,
    })

    // Reset form
    setManualItemName('')
    setManualItemPrice('')
    setShowManualItemForm(false)
  }

  // Handle removing a manual item
  const handleRemoveManualItem = (itemId: string) => {
    setManualItems(prev => prev.filter(i => i.id !== itemId))
    removeProductFromQuote(itemId)
  }

  // Get insurance pricing for a product
  // Priority: 1) Pre-computed price from price list, 2) Real-time calculated price
  const getInsurancePricing = (productId: string) => {
    const pricing = getItemPricing(productId)
    if (pricing && authorization) {
      return {
        patientPays: pricing.patientPays,
        insurancePays: pricing.insurancePays,
        savings: pricing.savings
      }
    }
    return null
  }

  // Get the display price for a product - uses price list when available
  const getProductDisplayPrice = (product: Product): {
    patientPays: number | null
    retailPrice: number
    insuranceSavings: number
    needsPricing: boolean
    hasCustomPrice: boolean
    hasPriceListEntry: boolean
    tier: string | null
  } => {
    // If product has pre-computed price from price list, use it
    if (product.customerPrice !== undefined) {
      return {
        patientPays: product.customerPrice,
        retailPrice: product.price,
        insuranceSavings: product.insuranceSavings ?? 0,
        needsPricing: product.needsPricing ?? false,
        hasCustomPrice: product.hasCustomPrice ?? false,
        hasPriceListEntry: true,
        tier: product.tier ?? null
      }
    }

    // No price list entry - return retail price
    return {
      patientPays: null,
      retailPrice: product.price,
      insuranceSavings: 0,
      needsPricing: customerPriceInfo?.hasPriceList ?? false,  // Need pricing if customer has other products priced
      hasCustomPrice: false,
      hasPriceListEntry: false,
      tier: null
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        <span className="ml-3 text-white/70">Loading products...</span>
      </div>
    )
  }

  if (error || !products) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-red-400">{error || 'Failed to load products'}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Retail-Only Mode Banner - When contacts benefit is using the allowance */}
      {showRetailOnlyBanner && (
        <Alert className="bg-blue-500/20 border-blue-400/50">
          <Shield className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-200">
            <strong className="text-blue-300">Retail Pricing Mode:</strong> Your insurance allowance is being applied to <span className="font-semibold">Contact Lenses</span>.
            Eyeglasses materials will be priced at <span className="font-semibold">retail</span>. You can switch the benefit in the conflict banner above.
          </AlertDescription>
        </Alert>
      )}

      {/* Either/Or Warning - Declining balance plans where contacts already selected */}
      {showEitherOrWarning && (
        <Alert className="bg-amber-500/20 border-amber-400/50">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200">
            <strong className="text-amber-300">Declining Balance Plan - Glasses OR Contacts:</strong>{' '}
            This plan only allows the use of one benefit type per benefit period.
            <span className="font-semibold text-amber-300"> Contact lenses</span> have already been selected for this allowance.
            Eyeglasses will be priced at <span className="font-semibold">full retail</span>.
          </AlertDescription>
        </Alert>
      )}

      {/* Declining Balance Tracker - For unified declining balance plans */}
      {isDecliningBalancePlan && decliningBalanceInfo && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-400" />
              <span className="text-amber-300 font-semibold">Declining Balance</span>
              <Badge variant="outline" className="text-xs border-amber-500 text-amber-400">
                {authorization?.carrier}
              </Badge>
            </div>
            {decliningBalanceInfo.eitherOrRestriction && (
              <div className="flex items-center gap-1 text-xs text-amber-400/80">
                <AlertTriangle className="h-3 w-3" />
                <span>Glasses OR Contacts only</span>
              </div>
            )}
          </div>

          {/* Balance Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Balance Used</span>
              <span className="text-white font-medium">
                {formatPrice(decliningBalanceInfo.balanceUsed)} / {formatPrice(decliningBalanceInfo.totalAllowance)}
              </span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  decliningBalanceInfo.overage > 0
                    ? 'bg-gradient-to-r from-amber-500 to-red-500'
                    : 'bg-gradient-to-r from-emerald-500 to-amber-500'
                }`}
                style={{
                  width: `${Math.min(100, (decliningBalanceInfo.balanceUsed / decliningBalanceInfo.totalAllowance) * 100)}%`
                }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-400">
                {decliningBalanceInfo.balanceRemaining > 0
                  ? `${formatPrice(decliningBalanceInfo.balanceRemaining)} remaining`
                  : 'Allowance used'}
              </span>
              {decliningBalanceInfo.overage > 0 && (
                <span className="text-amber-400">
                  {formatPrice(decliningBalanceInfo.overage)} over • {decliningBalanceInfo.overageDiscount}% off
                </span>
              )}
            </div>
          </div>

          {/* Patient Pays Summary */}
          {decliningBalanceInfo.balanceUsed > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
              <span className="text-white/60 text-sm">Patient Pays (Eyeglasses)</span>
              <span className="text-xl font-bold text-white">
                {formatPrice(decliningBalanceInfo.patientPaysTotal)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Insurance Mode Banner - When glasses benefit is selected (copay-based plans only) */}
      {!isDecliningBalancePlan && isGlassesInsured && authorization && (
        <Alert className="bg-emerald-500/20 border-emerald-400/50">
          <Shield className="h-4 w-4 text-emerald-400" />
          <AlertDescription className="text-emerald-200">
            <strong className="text-emerald-300">Insurance Active:</strong> {authorization.carrier} coverage applies to eyeglasses.
            Frame allowance: ${authorization.frameAllowance ?? 0} • Materials copay: ${authorization.materialsCopay ?? 0}
          </AlertDescription>
        </Alert>
      )}


      {/* Progress Indicator - Shows next action needed */}
      {(() => {
        // Determine current status and next action
        let statusMessage = ''
        let isComplete = false
        let stepNumber = 0

        if (!frame && !isPatientOwnedFrame) {
          statusMessage = 'Select a frame to begin'
          stepNumber = 1
        } else if (!lensType) {
          statusMessage = 'Select lens type'
          stepNumber = 2
        } else if (!lensMaterial) {
          statusMessage = 'Select lens material'
          stepNumber = 3
        } else if (!arCoating) {
          statusMessage = 'Select AR coating (or No Charge)'
          stepNumber = 4
        } else if (transitions === null) {
          statusMessage = 'Select transitions (or None)'
          stepNumber = 5
        } else if (!mountFee) {
          statusMessage = 'Select mount type'
          stepNumber = 7
        } else {
          statusMessage = 'Eyeglasses complete'
          isComplete = true
        }

        return (
          <div className={`sticky top-0 z-10 flex items-center justify-between p-4 rounded-lg border backdrop-blur-sm ${
            isComplete
              ? 'bg-emerald-500/30 border-emerald-400/50'
              : 'bg-amber-500/30 border-amber-400/50'
          }`}>
            <div className="flex items-center gap-3">
              {!isComplete ? (
                <>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-sm">
                    {stepNumber}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-amber-300">
                      {statusMessage}
                    </div>
                    <div className="text-white/50 text-xs">
                      Polarized and Add-ons are optional
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white font-bold">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-emerald-300">
                      {statusMessage}
                    </div>
                    <div className="text-emerald-400/70 text-xs">
                      You can add optional items or continue
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onBack && (
                <Button
                  onClick={onBack}
                  variant="outline"
                  size="sm"
                >
                  ← Back
                </Button>
              )}
              {isComplete && onNext && (
                <Button
                  onClick={onNext}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Continue →
                </Button>
              )}
              {!isComplete && onNext && (
                <Button
                  onClick={onNext}
                  variant="outline"
                  size="sm"
                  className="text-white/70 border-white/30"
                >
                  Skip Eyeglasses
                </Button>
              )}
              <Button
                onClick={() => setShowResetConfirm(true)}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:bg-red-500/20"
              >
                Reset
              </Button>
            </div>
          </div>
        )
      })()}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <Card className="border-red-400/50 bg-red-500/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <p className="font-semibold text-white">Are you sure you want to reset eyeglasses selections?</p>
              <p className="text-sm text-white/70">All eyeglasses selections will be cleared.</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowResetConfirm(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReset}
                  variant="destructive"
                  size="sm"
                >
                  Yes, Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Select Frame - Searchable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center justify-between">
            <span>Step 1: Select Frame</span>
            {authorization && (
              <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/50">
                <Shield className="h-3 w-3 mr-1" />
                ${authorization.frameAllowance} Allowance
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Patient Owned Frame Display */}
          {isPatientOwnedFrame ? (
            <div className="p-4 rounded-lg border-2 border-cyan-400 bg-cyan-500/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="h-5 w-5 text-cyan-400" />
                    <span className="text-lg font-semibold text-white">
                      Patient Owned Frame
                    </span>
                  </div>
                  <div className="text-sm text-white/70">
                    Customer is using their own frame for new lenses
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Mounting fee:</span>
                      <span className="text-lg font-bold text-amber-400">$75.00</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFrame}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : selectedFrame ? (
            /* Selected Frame Display */
            <div className="p-4 rounded-lg border-2 border-amber-400 bg-amber-500/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="h-5 w-5 text-amber-400" />
                    <span className="text-lg font-semibold text-white">
                      {selectedFrame.brand} {selectedFrame.model}
                    </span>
                  </div>
                  <div className="text-sm text-white/70 space-y-1">
                    {selectedFrame.color && <div>Color: {selectedFrame.color}</div>}
                    {selectedFrame.size && <div>Size: {selectedFrame.size}</div>}
                    <div>SKU: {selectedFrame.sku}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="text-white/60 line-through">
                      {formatPrice(selectedFrame.price)}
                    </div>
                    {authorization && (
                      <div className="text-lg font-bold text-emerald-400">
                        {selectedFrame.price <= (authorization.frameAllowance ?? 0) ? (
                          'Covered by allowance'
                        ) : (
                          <>You pay: {formatPrice(calculateFramePatientCost(selectedFrame.price))}</>
                        )}
                      </div>
                    )}
                    {!authorization && (
                      <div className="text-lg font-bold text-amber-400">
                        {formatPrice(selectedFrame.price)}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFrame}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  type="text"
                  placeholder="Search by model code, brand, or SKU... (e.g., TF5401, Ray-Ban, Oakley)"
                  value={frameSearch}
                  onChange={(e) => setFrameSearch(e.target.value)}
                  className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/50"
                />
                {frameSearchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 animate-spin" />
                )}
              </div>

              {/* Search Results */}
              {frameSearchResults.length > 0 && (
                <div className="max-h-80 overflow-y-auto space-y-2 border border-white/20 rounded-lg p-2">
                  {frameSearchResults.map((frameResult) => {
                    const patientCost = calculateFramePatientCost(frameResult.price)
                    const isWithinAllowance = authorization && frameResult.price <= (authorization.frameAllowance ?? 0)

                    return (
                      <button
                        key={frameResult.id}
                        onClick={() => handleFrameSearchSelect(frameResult)}
                        className="w-full p-3 rounded-lg border border-white/20 hover:border-amber-400/50 hover:bg-amber-500/10 transition-all text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">
                              {frameResult.brand} {frameResult.model}
                            </div>
                            <div className="text-sm text-white/60">
                              {frameResult.color} {frameResult.size && `• ${frameResult.size}`} • SKU: {frameResult.sku}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white/60 text-sm line-through">
                              {formatPrice(frameResult.price)}
                            </div>
                            {authorization ? (
                              <div className={`font-medium ${isWithinAllowance ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {isWithinAllowance ? 'Covered' : `You pay: ${formatPrice(patientCost)}`}
                              </div>
                            ) : (
                              <div className="font-medium text-amber-400">
                                {formatPrice(frameResult.price)}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* No Results Message */}
              {frameSearch.length >= 2 && !frameSearchLoading && frameSearchResults.length === 0 && (
                <div className="text-center py-4 text-white/60">
                  No frames found matching "{frameSearch}"
                </div>
              )}

              {/* Search Hint */}
              {!frameSearch && (
                <div className="text-center py-6 text-white/50 text-sm">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Enter a model code (e.g., TF5401, OX8046) or brand name to search
                </div>
              )}

              {/* Patient Owned Frame Option */}
              <div className="pt-4 border-t border-white/20">
                <button
                  onClick={handlePatientOwnedFrame}
                  className="w-full p-4 rounded-lg border-2 border-dashed border-cyan-400/50 hover:border-cyan-400 hover:bg-cyan-500/10 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Glasses className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white">Patient Owned Frame</div>
                      <div className="text-sm text-white/60">
                        Customer is bringing their own frame for new lenses
                      </div>
                    </div>
                    <div className="ml-auto text-amber-400 font-semibold">
                      $75 mounting
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Lens Type - Always visible */}
      <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center justify-between">
              <span>Step 2: Select Lens Type</span>
              {authorization && (
                <div className="flex items-center gap-2 bg-blue-500/30 border border-blue-400/50 rounded-lg px-4 py-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  <span className="text-2xl font-bold text-blue-300">
                    {authorization.materialsCopay ? `$${authorization.materialsCopay}` : 'Covered'}
                  </span>
                  <span className="text-sm text-blue-300/70">copay</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Regular Lens Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.lensType?.filter(p => !p.name.toLowerCase().includes('neurolens')).map((product) => {
                const insurancePricing = getInsurancePricing(product.sku || product.id)
                const priceListInfo = getProductDisplayPrice(product)
                const isSelected = lensType === product.id
                return (
                  <button
                    key={product.id}
                    onClick={() => handleLensTypeSelect(product)}
                    className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-400 bg-blue-500/30'
                        : priceListInfo.needsPricing
                          ? 'border-yellow-400/50 hover:border-yellow-400 bg-yellow-500/10'
                          : 'border-white/20 hover:border-white/40 bg-white/10'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-blue-500 rounded-full p-1">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="text-lg font-semibold mb-1 text-white">{product.name}</div>
                    {product.notes && (
                      <div className="text-xs text-yellow-400 mb-2">{product.notes}</div>
                    )}
                    {/* Price List pricing (pre-computed) */}
                    {priceListInfo.hasPriceListEntry ? (
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          {formatPrice(priceListInfo.retailPrice)}
                        </div>
                        {priceListInfo.patientPays !== null ? (
                          <div className="text-2xl font-bold text-emerald-400">
                            {formatPrice(priceListInfo.patientPays)}
                            {priceListInfo.hasCustomPrice && (
                              <span className="text-xs ml-2 text-purple-400">(custom)</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-lg font-bold text-yellow-400">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            Needs pricing
                          </div>
                        )}
                        {priceListInfo.insuranceSavings > 0 && (
                          <div className="text-xs text-emerald-400">
                            Saves: {formatPrice(priceListInfo.insuranceSavings)}
                          </div>
                        )}
                      </div>
                    ) : authorization ? (
                      /* Real-time pricing fallback */
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          {formatPrice(product.price)}
                        </div>
                        {isSelected && insurancePricing ? (
                          <div className="text-2xl font-bold text-emerald-400">
                            {formatPrice(insurancePricing.patientPays)}
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-blue-400">
                            Select to see price
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-blue-400">
                        {formatPrice(product.price)}
                      </div>
                    )}
                    {/* Show insurance pricing breakdown if selected (real-time) */}
                    {isSelected && insurancePricing && !priceListInfo.hasPriceListEntry && (
                      <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                        <div className="text-xs text-emerald-400">
                          Insurance saves: {formatPrice(insurancePricing.insurancePays)}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Neurolens Section */}
            {products.lensType?.some(p => p.name.toLowerCase().includes('neurolens')) && (
              <div className="mt-6 pt-4 border-t border-cyan-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-1 bg-cyan-500 rounded-full"></div>
                  <span className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">Neurolens</span>
                  <span className="text-cyan-400/60 text-xs">(Cash Pay Only)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.lensType?.filter(p => p.name.toLowerCase().includes('neurolens')).map((product) => {
                    const insurancePricing = getInsurancePricing(product.sku || product.id)
                    const isSelected = lensType === product.id
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleLensTypeSelect(product)}
                        className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500/30'
                            : 'border-cyan-500/30 hover:border-cyan-400/50 bg-cyan-500/10'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <div className="bg-cyan-500 rounded-full p-1">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                        <div className="text-lg font-semibold mb-1 text-white">{product.name}</div>
                        <div className="text-xs text-cyan-400 mb-2">Cash pay only - no vision plans</div>
                        <div className="text-2xl font-bold text-cyan-400">
                          {formatPrice(product.price)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {/* VSP Tech Add-on indicator */}
            {techAddon && (
              <div className="mt-4 p-3 rounded-lg bg-purple-500/20 border border-purple-400/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-purple-400" />
                    <span className="text-purple-300 font-medium">
                      {techAddon === 'ADDON-TECH-SV' ? 'VSP Tech Add-on (SV)' : 'VSP Tech Add-on (MF)'} auto-added
                    </span>
                  </div>
                  <span className="text-purple-400 font-semibold">
                    +{techAddon === 'ADDON-TECH-SV' ? '$10' : '$40'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Step 3: Lens Material - Always visible */}
      <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Step 3: Select Lens Material</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Column headers */}
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 text-sm font-medium text-white/70 border-b border-white/20 pb-2">
              <div>Material</div>
              <div className="text-center">Single Vision</div>
              <div className="text-center">Progressive/Bifocal</div>
            </div>
            {/* Material rows with SV/MF prices side by side */}
            <div className="space-y-2">
              {groupedMaterials.map((group) => {
                // For standard materials (like CR-39), use the same product for both columns
                const svProduct = group.sv || group.standard
                const mfProduct = group.mf || group.standard
                const svPriceInfo = svProduct ? getProductDisplayPrice(svProduct) : null
                const mfPriceInfo = mfProduct ? getProductDisplayPrice(mfProduct) : null
                const isSelected = lensMaterial === svProduct?.id || lensMaterial === mfProduct?.id

                return (
                  <div
                    key={group.baseName}
                    className={`grid grid-cols-[2fr_1fr_1fr] gap-4 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/20'
                        : 'border-white/20 hover:border-white/40 bg-white/5'
                    }`}
                  >
                    {/* Material name */}
                    <div className="flex items-center">
                      <span className="text-lg font-semibold text-white">{group.baseName}</span>
                      {isSelected && (
                        <div className="ml-2 bg-emerald-500 rounded-full p-0.5">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* SV Price */}
                    <button
                      onClick={() => svProduct && handleLensMaterialSelect(svProduct)}
                      disabled={!svProduct}
                      className={`text-center p-2 rounded transition-all ${
                        lensMaterial === svProduct?.id
                          ? 'bg-emerald-500/30 ring-2 ring-emerald-400'
                          : svProduct ? 'hover:bg-white/10' : 'opacity-50'
                      }`}
                    >
                      {svProduct ? (
                        svPriceInfo?.hasPriceListEntry && svPriceInfo.patientPays !== null ? (
                          <div>
                            <div className="text-lg font-bold text-emerald-400">
                              {formatPrice(svPriceInfo.patientPays)}
                            </div>
                            <div className="text-xs text-white/50 line-through">
                              {formatPrice(svPriceInfo.retailPrice)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-lg font-bold text-white/70">
                            {formatPrice(svProduct.price)}
                          </div>
                        )
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                    </button>

                    {/* MF Price */}
                    <button
                      onClick={() => mfProduct && handleLensMaterialSelect(mfProduct)}
                      disabled={!mfProduct}
                      className={`text-center p-2 rounded transition-all ${
                        lensMaterial === mfProduct?.id
                          ? 'bg-emerald-500/30 ring-2 ring-emerald-400'
                          : mfProduct ? 'hover:bg-white/10' : 'opacity-50'
                      }`}
                    >
                      {mfProduct ? (
                        mfPriceInfo?.hasPriceListEntry && mfPriceInfo.patientPays !== null ? (
                          <div>
                            <div className="text-lg font-bold text-emerald-400">
                              {formatPrice(mfPriceInfo.patientPays)}
                            </div>
                            <div className="text-xs text-white/50 line-through">
                              {formatPrice(mfPriceInfo.retailPrice)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-lg font-bold text-white/70">
                            {formatPrice(mfProduct.price)}
                          </div>
                        )
                      ) : (
                        <span className="text-white/30">-</span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

      {/* Step 4: AR Coating - Always visible */}
      <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Step 4: Select AR Coating</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Regular AR Coatings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.arCoating?.filter(p => !p.name.toLowerCase().includes('neurolens')).map((product) => {
                const insurancePricing = getInsurancePricing(product.sku || product.id)
                const priceListInfo = getProductDisplayPrice(product)
                const isSelected = arCoating === product.id
                return (
                  <button
                    key={product.id}
                    onClick={() => handleArCoatingSelect(product)}
                    className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-orange-400 bg-orange-500/30'
                        : priceListInfo.needsPricing
                          ? 'border-yellow-400/50 hover:border-yellow-400 bg-yellow-500/10'
                          : 'border-white/20 hover:border-white/40 bg-white/10'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-orange-500 rounded-full p-1">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="text-lg font-semibold mb-1 text-white">{product.name}</div>
                    {product.notes && (
                      <div className="text-xs text-yellow-400 mb-2">{product.notes}</div>
                    )}
                    {/* Price List pricing (pre-computed) */}
                    {priceListInfo.hasPriceListEntry ? (
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          {formatPrice(priceListInfo.retailPrice)}
                        </div>
                        {priceListInfo.patientPays !== null ? (
                          <div className="text-2xl font-bold text-emerald-400">
                            {formatPrice(priceListInfo.patientPays)}
                            {priceListInfo.hasCustomPrice && (
                              <span className="text-xs ml-2 text-purple-400">(custom)</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-lg font-bold text-yellow-400">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            Needs pricing
                          </div>
                        )}
                        {priceListInfo.insuranceSavings > 0 && (
                          <div className="text-xs text-emerald-400">
                            Saves: {formatPrice(priceListInfo.insuranceSavings)}
                          </div>
                        )}
                      </div>
                    ) : product.price === 0 ? (
                      <div className="text-2xl font-bold text-orange-400">No charge</div>
                    ) : authorization ? (
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          {formatPrice(product.price)}
                        </div>
                        {isSelected && insurancePricing ? (
                          <div className="text-2xl font-bold text-emerald-400">
                            {formatPrice(insurancePricing.patientPays)}
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-orange-400">
                            Select to see price
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-orange-400">
                        {formatPrice(product.price)}
                      </div>
                    )}
                    {/* Show insurance savings if selected (real-time fallback) */}
                    {isSelected && insurancePricing && !priceListInfo.hasPriceListEntry && insurancePricing.savings > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <div className="text-xs text-emerald-400">
                          Insurance saves: {formatPrice(insurancePricing.insurancePays)}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Neurolens AR Section */}
            {products.arCoating?.some(p => p.name.toLowerCase().includes('neurolens')) && (
              <div className="mt-6 pt-4 border-t border-cyan-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-1 bg-cyan-500 rounded-full"></div>
                  <span className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">Neurolens AR</span>
                  <span className="text-cyan-400/60 text-xs">(Cash Pay Only)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.arCoating?.filter(p => p.name.toLowerCase().includes('neurolens')).map((product) => {
                    const isSelected = arCoating === product.id
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleArCoatingSelect(product)}
                        className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-500/30'
                            : 'border-cyan-500/30 hover:border-cyan-400/50 bg-cyan-500/10'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <div className="bg-cyan-500 rounded-full p-1">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                        <div className="text-lg font-semibold mb-1 text-white">{product.name}</div>
                        <div className="text-xs text-cyan-400 mb-2">Cash pay only - no vision plans</div>
                        <div className="text-2xl font-bold text-cyan-400">
                          {formatPrice(product.price)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {/* VSP UV Treatment indicator */}
            {uvTreatment && (
              <div className="mt-4 p-3 rounded-lg bg-blue-500/20 border border-blue-400/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-400" />
                    <span className="text-blue-300 font-medium">
                      {uvTreatment === 'UV-BACKSIDE' ? 'UV Backside (Crizal)' : 'UV Front'} auto-added
                    </span>
                  </div>
                  <span className="text-blue-400 font-semibold">
                    +$16
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Step 5: Transitions - Always visible */}
      <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Step 5: Select Transitions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.transitions?.map((product) => {
                const insurancePricing = getInsurancePricing(product.sku || product.id)
                const priceListInfo = getProductDisplayPrice(product)
                const isSelected = transitions === product.id
                return (
                  <button
                    key={product.id}
                    onClick={() => handleTransitionsSelect(product)}
                    className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-purple-400 bg-purple-500/30'
                        : 'border-white/20 hover:border-white/40 bg-white/10'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-purple-500 rounded-full p-1">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="text-lg font-semibold mb-2 text-white">{product.name}</div>
                    {product.price === 0 ? (
                      <div className="text-2xl font-bold text-purple-400">No charge</div>
                    ) : priceListInfo.hasPriceListEntry ? (
                      /* Price List pricing (pre-computed) */
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          {formatPrice(priceListInfo.retailPrice)}
                        </div>
                        {priceListInfo.patientPays !== null ? (
                          <div className="text-2xl font-bold text-emerald-400">
                            {formatPrice(priceListInfo.patientPays)}
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-purple-400">
                            Needs pricing
                          </div>
                        )}
                        {priceListInfo.insuranceSavings > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/20">
                            <div className="text-xs text-emerald-400">
                              Insurance saves: {formatPrice(priceListInfo.insuranceSavings)}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : authorization ? (
                      /* Real-time pricing fallback */
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          {formatPrice(product.price)}
                        </div>
                        {isSelected && insurancePricing ? (
                          <div className="text-2xl font-bold text-emerald-400">
                            {formatPrice(insurancePricing.patientPays)}
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-purple-400">
                            Select to see price
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-purple-400">
                        {formatPrice(product.price)}
                      </div>
                    )}
                    {/* Show insurance savings if selected (real-time fallback) */}
                    {!priceListInfo.hasPriceListEntry && isSelected && insurancePricing && insurancePricing.savings > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <div className="text-xs text-emerald-400">
                          Insurance saves: {formatPrice(insurancePricing.insurancePays)}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

      {/* Step 6: Mount Type - Always visible */}
      <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Step 6: Select Mount Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.mountFee?.map((product) => {
                const insurancePricing = getInsurancePricing(product.sku || product.id)
                const priceListInfo = getProductDisplayPrice(product)
                const isSelected = mountFee === product.id
                return (
                  <button
                    key={product.id}
                    onClick={() => handleMountFeeSelect(product)}
                    className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-pink-400 bg-pink-500/30'
                        : 'border-white/20 hover:border-white/40 bg-white/10'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-pink-500 rounded-full p-1">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="text-lg font-semibold mb-2 text-white">{product.name}</div>
                    {product.price === 0 ? (
                      <div className="text-2xl font-bold text-pink-400">Included</div>
                    ) : priceListInfo.hasPriceListEntry ? (
                      /* Price List pricing (pre-computed) */
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          {formatPrice(priceListInfo.retailPrice)}
                        </div>
                        {priceListInfo.patientPays !== null ? (
                          <div className="text-2xl font-bold text-emerald-400">
                            {formatPrice(priceListInfo.patientPays)}
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-pink-400">
                            Needs pricing
                          </div>
                        )}
                        {priceListInfo.insuranceSavings > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/20">
                            <div className="text-xs text-emerald-400">
                              Insurance saves: {formatPrice(priceListInfo.insuranceSavings)}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : authorization ? (
                      /* Real-time pricing fallback */
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          {formatPrice(product.price)}
                        </div>
                        {isSelected && insurancePricing ? (
                          <div className="text-2xl font-bold text-emerald-400">
                            {formatPrice(insurancePricing.patientPays)}
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-pink-400">
                            Select to see price
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-pink-400">
                        {formatPrice(product.price)}
                      </div>
                    )}
                    {/* Show insurance savings if selected (real-time fallback) */}
                    {!priceListInfo.hasPriceListEntry && isSelected && insurancePricing && insurancePricing.savings > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <div className="text-xs text-emerald-400">
                          Insurance saves: {formatPrice(insurancePricing.insurancePays)}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

      {/* Step 7: Add-ons - Always visible */}
      <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Step 7: Select Add-ons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.addons?.filter(p =>
                // Never show tech addons as selectable options - they only appear via VSP auto-add
                !p.name.toLowerCase().includes('tech add-on')
              ).map((product) => {
                const insurancePricing = getInsurancePricing(product.sku || product.id)
                const priceListInfo = getProductDisplayPrice(product)
                const isSelected = addons.includes(product.id)
                const isPrism = product.id === 'preferred-prism' || product.name.toLowerCase().includes('prism (per diopter)')
                const displayPrice = isPrism ? product.price * prismDiopters : product.price
                return (
                  <div
                    key={product.id}
                    className={`relative p-5 rounded-lg border-2 transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/30'
                        : priceListInfo.needsPricing
                          ? 'border-yellow-400/50 hover:border-yellow-400 bg-yellow-500/10'
                          : 'border-white/20 hover:border-white/40 bg-white/10'
                    }`}
                    onClick={() => !isPrism || !isSelected ? handleAddonToggle(product) : undefined}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-emerald-500 rounded-full p-1">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="text-lg font-semibold mb-2 text-white">{product.name}</div>

                    {/* Prism diopter input */}
                    {isPrism && isSelected && (
                      <div className="mb-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <label className="text-sm text-white/70">Diopters:</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={prismDiopters}
                          onChange={(e) => handlePrismDioptersChange(parseInt(e.target.value) || 1, product)}
                          className="w-20 px-2 py-1 rounded bg-white/20 border border-white/30 text-white text-center focus:outline-none focus:border-emerald-400"
                        />
                        <span className="text-xs text-white/50">@ {formatPrice(product.price)}/diopter</span>
                      </div>
                    )}

                    {product.price === 0 ? (
                      <div className="text-2xl font-bold text-emerald-400">Included</div>
                    ) : priceListInfo.hasPriceListEntry ? (
                      /* Price List pricing (pre-computed) */
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          +{formatPrice(priceListInfo.retailPrice)}
                        </div>
                        {priceListInfo.patientPays !== null ? (
                          <div className="text-2xl font-bold text-emerald-400">
                            +{formatPrice(priceListInfo.patientPays)}
                          </div>
                        ) : (
                          <div className="text-lg font-bold text-yellow-400">
                            <AlertTriangle className="h-4 w-4 inline mr-1" />
                            Needs pricing
                          </div>
                        )}
                        {priceListInfo.insuranceSavings > 0 && (
                          <div className="text-xs text-emerald-400">
                            Saves: {formatPrice(priceListInfo.insuranceSavings)}
                          </div>
                        )}
                      </div>
                    ) : authorization ? (
                      /* Real-time pricing fallback */
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          +{formatPrice(displayPrice)}
                        </div>
                        {isSelected && insurancePricing ? (
                          <div className="text-2xl font-bold text-emerald-400">
                            +{formatPrice(insurancePricing.patientPays)}
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-emerald-400">
                            Select to see price
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-emerald-400">
                        +{formatPrice(displayPrice)}
                      </div>
                    )}
                    {/* Show insurance savings if selected (real-time fallback) */}
                    {isSelected && insurancePricing && !priceListInfo.hasPriceListEntry && insurancePricing.savings > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <div className="text-xs text-emerald-400">
                          Insurance saves: {formatPrice(insurancePricing.insurancePays)}
                        </div>
                      </div>
                    )}

                    {/* Click to deselect for prism when already selected */}
                    {isPrism && isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddonToggle(product)
                        }}
                        className="mt-3 w-full text-xs text-red-400 hover:text-red-300 underline"
                      >
                        Remove Prism
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Manual Item Section */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-1 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-orange-300">Custom Items</span>
                </div>
                {!showManualItemForm && (
                  <button
                    onClick={() => setShowManualItemForm(true)}
                    className="px-3 py-1 text-sm bg-orange-500/20 border border-orange-400/50 rounded-lg text-orange-300 hover:bg-orange-500/30 transition-colors"
                  >
                    + Add Custom Item
                  </button>
                )}
              </div>

              {/* Manual Item Form */}
              {showManualItemForm && (
                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-400/30 mb-4">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-white/70 block mb-1">Item Name</label>
                      <input
                        type="text"
                        value={manualItemName}
                        onChange={(e) => setManualItemName(e.target.value)}
                        placeholder="e.g., Special Coating"
                        className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-orange-400"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-xs text-white/70 block mb-1">Price</label>
                      <input
                        type="number"
                        value={manualItemPrice}
                        onChange={(e) => setManualItemPrice(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-orange-400"
                      />
                    </div>
                    <button
                      onClick={handleAddManualItem}
                      disabled={!manualItemName.trim() || !manualItemPrice}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowManualItemForm(false)
                        setManualItemName('')
                        setManualItemPrice('')
                      }}
                      className="px-3 py-2 text-white/60 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* List of added manual items */}
              {manualItems.length > 0 && (
                <div className="space-y-2">
                  {manualItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-orange-500/20 border border-orange-400/50"
                    >
                      <div className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-orange-400" />
                        <span className="text-white font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-orange-400 font-semibold">{formatPrice(item.price)}</span>
                        <button
                          onClick={() => handleRemoveManualItem(item.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      {/* Eyeglasses Total Summary + Navigation - Always visible */}
      <Card className="bg-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                {authorization ? (
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-sm text-white/70 mb-1">Eyeglasses Retail</div>
                      <div className="text-xl text-white/60 line-through">{formatPrice(eyeglassesSummary.retailTotal)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-emerald-400">Insurance saves</div>
                      <div className="text-lg font-semibold text-emerald-400">
                        {/* For VSP, calculate savings from matrix total */}
                        {isVspCustomer && vspMatrixTotal
                          ? formatPrice(eyeglassesSummary.retailTotal - vspMatrixTotal.total)
                          : formatPrice(eyeglassesSummary.insuranceTotal)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-amber-400">You Pay</div>
                      <div className="text-3xl font-bold text-amber-400">
                        {isCalculating ? (
                          <Loader2 className="h-6 w-6 animate-spin inline" />
                        ) : isVspCustomer && vspMatrixTotal ? (
                          /* VSP Matrix pricing: show combined total */
                          formatPrice(vspMatrixTotal.total)
                        ) : (
                          formatPrice(eyeglassesSummary.patientTotal)
                        )}
                      </div>
                      {/* Show VSP matrix code if using combined pricing */}
                      {isVspCustomer && vspMatrixTotal?.isMatrixPricing && vspMatrixTotal.breakdown.lensAndMaterial?.code && (
                        <div className="text-xs text-amber-300 mt-1">
                          Code: {vspMatrixTotal.breakdown.lensAndMaterial.code}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-white/70">Eyeglasses Total:</div>
                    <div className="text-3xl font-bold text-white">{formatPrice(calculateTotal())}</div>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3">
                {onBack && (
                  <Button
                    onClick={onBack}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Back
                  </Button>
                )}
                {onSkipSecondPair && (
                  <Button
                    onClick={onSkipSecondPair}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Skip Second Pair
                  </Button>
                )}
                {onNext && (
                  <Button
                    onClick={onNext}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Continue to Second Pair
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Navigation when no frame selected yet */}
      {!frame && !isPatientOwnedFrame && (onBack || onNext || onSkipSecondPair) && (
        <Card className="bg-white/10">
          <CardContent className="p-4">
            <div className="flex justify-end gap-3">
              {onBack && (
                <Button
                  onClick={onBack}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Back
                </Button>
              )}
              {onSkipSecondPair && (
                <Button
                  onClick={onSkipSecondPair}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Skip to Contacts
                </Button>
              )}
              {onNext && (
                <Button
                  onClick={onNext}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Continue to Second Pair
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
