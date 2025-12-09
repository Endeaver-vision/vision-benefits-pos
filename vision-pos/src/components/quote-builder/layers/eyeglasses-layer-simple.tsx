'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2, Shield, AlertTriangle, Search, X, Glasses } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useQuotePricingContext } from '@/contexts/quote-pricing-context'

interface Product {
  id: string
  name: string
  price: number
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
}

export function EyeglassesLayerSimple({ className, onNext, onBack }: EyeglassesLayerProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Pricing context for real-time insurance calculations
  const {
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
  } = useQuotePricingContext()

  // Check if glasses benefit is getting the insurance allowance
  // This uses the automatic conflict detection system
  const isGlassesInsured = usesMaterialsAllowance('glasses')

  // Show retail-only mode banner ONLY when there's a conflict AND contacts is active
  // This means the user has both glasses and contacts in the quote, and chose contacts for the allowance
  const showRetailOnlyBanner = materialsConflict.hasConflict && materialsConflict.activeBenefit === 'contacts'

  // Products from database
  const [products, setProducts] = useState<ProductsData | null>(null)

  // State for selections
  const [frame, setFrame] = useState<string | null>(null)
  const [lensType, setLensType] = useState<string | null>(null)
  const [lensMaterial, setLensMaterial] = useState<string | null>(null)
  const [arCoating, setArCoating] = useState<string | null>(null)
  const [transitions, setTransitions] = useState<string | null>(null)
  const [polarized, setPolarized] = useState<string | null>(null)
  const [mountFee, setMountFee] = useState<string | null>(null)
  const [addons, setAddons] = useState<string[]>([])
  const [techAddon, setTechAddon] = useState<string | null>(null)  // VSP tech addon

  // Frame search state
  const [frameSearch, setFrameSearch] = useState('')
  const [frameSearchResults, setFrameSearchResults] = useState<FrameResult[]>([])
  const [frameSearchLoading, setFrameSearchLoading] = useState(false)
  const [selectedFrame, setSelectedFrame] = useState<FrameResult | null>(null)
  const [isPatientOwnedFrame, setIsPatientOwnedFrame] = useState(false)

  // Get existing eyeglasses items from pricing context
  const existingEyeglassItems = useMemo(() => {
    return pricedItems.filter(item =>
      item.category === 'frame' ||
      item.category === 'lens' ||
      item.category === 'coating' ||
      item.category === 'addon'
    )
  }, [pricedItems])

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

  // Fetch products from API
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        const response = await fetch('/api/quote-builder/products')
        const data = await response.json()

        if (data.success) {
          // Add "None" option to transitions and polarized if not present
          const productsWithNone: ProductsData = {
            ...data.products,
            transitions: [
              { id: 'none', name: 'None', price: 0 },
              ...(data.products.transitions || [])
            ],
            polarized: [
              { id: 'none', name: 'None', price: 0 },
              ...(data.products.polarized || [])
            ],
            arCoating: [
              { id: 'opt-out', name: 'Opt out', price: 0 },
              ...(data.products.arCoating || [])
            ]
          }
          setProducts(productsWithNone)
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
  }, [])

  // Initialize selections from existing pricing context items when products load
  useEffect(() => {
    if (!products || hasInitialized || existingEyeglassItems.length === 0) return

    // Find and restore existing selections
    const existingSkus = existingEyeglassItems.map(item => item.sku)

    // Restore frame selection
    const existingFrame = products.frames?.find(p => existingSkus.includes(p.sku || p.id))
    if (existingFrame) setFrame(existingFrame.id)

    // Restore lens type selection
    const existingLensType = products.lensType?.find(p => existingSkus.includes(p.sku || p.id))
    if (existingLensType) setLensType(existingLensType.id)

    // Restore lens material selection
    const existingLensMaterial = products.lensMaterial?.find(p => existingSkus.includes(p.sku || p.id))
    if (existingLensMaterial) setLensMaterial(existingLensMaterial.id)

    // Restore AR coating selection
    const existingArCoating = products.arCoating?.find(p => existingSkus.includes(p.sku || p.id))
    if (existingArCoating) setArCoating(existingArCoating.id)

    // Restore transitions selection
    const existingTransitions = products.transitions?.find(p => existingSkus.includes(p.sku || p.id))
    if (existingTransitions) setTransitions(existingTransitions.id)

    // Restore polarized selection
    const existingPolarized = products.polarized?.find(p => existingSkus.includes(p.sku || p.id))
    if (existingPolarized) setPolarized(existingPolarized.id)

    // Restore mount fee selection
    const existingMountFee = products.mountFee?.find(p => existingSkus.includes(p.sku || p.id))
    if (existingMountFee) setMountFee(existingMountFee.id)

    // Restore addons (multiple selection)
    const existingAddons = products.addons?.filter(p => existingSkus.includes(p.sku || p.id))
    if (existingAddons && existingAddons.length > 0) {
      setAddons(existingAddons.map(a => a.id))
    }

    setHasInitialized(true)
  }, [products, existingEyeglassItems, hasInitialized])

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
  // Overage discount is typically 20% (patient pays 80% of amount over allowance)
  const calculateFramePatientCost = (framePrice: number) => {
    if (!authorization || !authorization.frameAllowance) return framePrice
    const allowance = authorization.frameAllowance
    if (framePrice <= allowance) return 0
    const overage = framePrice - allowance
    // Normalize discount to decimal (0.20 = 20%) in case stored as integer (20)
    let overageDiscount = authorization.frameOverageDiscount ?? 0.20
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
    // Remove old selection
    if (lensType && products?.lensType) {
      const oldProduct = products.lensType.find(p => p.id === lensType)
      if (oldProduct) removeProductFromQuote(oldProduct.sku || oldProduct.id)
    }

    // Remove old tech addon if any
    if (techAddon) {
      removeProductFromQuote(techAddon)
      setTechAddon(null)
    }

    setLensType(product.id)
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
    if (lensMaterial && products?.lensMaterial) {
      const oldProduct = products.lensMaterial.find(p => p.id === lensMaterial)
      if (oldProduct) removeProductFromQuote(oldProduct.sku || oldProduct.id)
    }
    setLensMaterial(product.id)
    addProductToQuote(product, 'lens')
  }

  const handleArCoatingSelect = (product: Product) => {
    if (arCoating && products?.arCoating) {
      const oldProduct = products.arCoating.find(p => p.id === arCoating)
      if (oldProduct) removeProductFromQuote(oldProduct.sku || oldProduct.id)
    }
    setArCoating(product.id)
    addProductToQuote(product, 'coating')
  }

  const handleTransitionsSelect = (product: Product) => {
    if (transitions && products?.transitions) {
      const oldProduct = products.transitions.find(p => p.id === transitions)
      if (oldProduct) removeProductFromQuote(oldProduct.sku || oldProduct.id)
    }
    setTransitions(product.id)
    addProductToQuote(product, 'coating')
  }

  const handlePolarizedSelect = (product: Product) => {
    if (polarized && products?.polarized) {
      const oldProduct = products.polarized.find(p => p.id === polarized)
      if (oldProduct) removeProductFromQuote(oldProduct.sku || oldProduct.id)
    }
    setPolarized(product.id)
    addProductToQuote(product, 'coating')
  }

  const handleMountFeeSelect = (product: Product) => {
    if (mountFee && products?.mountFee) {
      const oldProduct = products.mountFee.find(p => p.id === mountFee)
      if (oldProduct) removeProductFromQuote(oldProduct.sku || oldProduct.id)
    }
    setMountFee(product.id)
    addProductToQuote(product, 'addon')
  }

  const handleAddonToggle = (product: Product) => {
    if (addons.includes(product.id)) {
      setAddons(prev => prev.filter(a => a !== product.id))
      removeProductFromQuote(product.sku || product.id)
    } else {
      setAddons(prev => [...prev, product.id])
      addProductToQuote(product, 'addon')
    }
  }

  // Get insurance pricing for a product
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

      {/* Insurance Mode Banner - When glasses benefit is selected */}
      {isGlassesInsured && authorization && (
        <Alert className="bg-emerald-500/20 border-emerald-400/50">
          <Shield className="h-4 w-4 text-emerald-400" />
          <AlertDescription className="text-emerald-200">
            <strong className="text-emerald-300">Insurance Active:</strong> {authorization.carrier} coverage applies to eyeglasses.
            Frame allowance: ${authorization.frameAllowance ?? 0} • Materials copay: ${authorization.materialsCopay ?? 0}
          </AlertDescription>
        </Alert>
      )}


      {/* Reset Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowResetConfirm(true)}
          variant="outline"
          className="text-red-400 border-red-400/50 hover:bg-red-500/20"
        >
          Reset Eyeglasses
        </Button>
      </div>

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

      {/* Step 2: Lens Type */}
      {(frame || isPatientOwnedFrame || lensType) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center justify-between">
              <span>Step 2: Select Lens Type</span>
              {authorization && (
                <Badge className="bg-blue-500/30 text-blue-300 border-blue-400/50">
                  <Shield className="h-3 w-3 mr-1" />
                  {authorization.materialsCopay ? `$${authorization.materialsCopay} Copay` : 'Covered'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Regular Lens Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.lensType?.filter(p => !p.name.toLowerCase().includes('neurolens')).map((product) => {
                const insurancePricing = getInsurancePricing(product.sku || product.id)
                const isSelected = lensType === product.id
                return (
                  <button
                    key={product.id}
                    onClick={() => handleLensTypeSelect(product)}
                    className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-400 bg-blue-500/30'
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
                    {authorization ? (
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
                    {/* Show insurance pricing breakdown if selected */}
                    {isSelected && insurancePricing && (
                      <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                        <div className="text-xs text-emerald-400">
                          Insurance pays: {formatPrice(insurancePricing.insurancePays)}
                        </div>
                        {insurancePricing.savings > 0 && (
                          <div className="text-xs text-emerald-300">
                            You save: {formatPrice(insurancePricing.savings)}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Neurolens Section */}
            {products.lensType?.some(p => p.name.toLowerCase().includes('neurolens')) && (
              <div className="mt-6 pt-4 border-t border-amber-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-1 bg-amber-500 rounded-full"></div>
                  <span className="text-amber-400 font-semibold text-sm uppercase tracking-wide">Neurolens</span>
                  <span className="text-amber-400/60 text-xs">(Cash Pay Only)</span>
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
                            ? 'border-amber-400 bg-amber-500/30'
                            : 'border-amber-500/30 hover:border-amber-400/50 bg-amber-500/10'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <div className="bg-amber-500 rounded-full p-1">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                        <div className="text-lg font-semibold mb-1 text-white">{product.name}</div>
                        <div className="text-xs text-amber-400 mb-2">Cash pay only - no vision plans</div>
                        <div className="text-2xl font-bold text-amber-400">
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
      )}

      {/* Step 3: Lens Material */}
      {(lensType || lensMaterial) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Step 3: Select Lens Material</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {products.lensMaterial?.map((product) => {
                const insurancePricing = getInsurancePricing(product.sku || product.id)
                const isSelected = lensMaterial === product.id
                return (
                  <button
                    key={product.id}
                    onClick={() => handleLensMaterialSelect(product)}
                    className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/30'
                        : 'border-white/20 hover:border-white/40 bg-white/10'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-emerald-500 rounded-full p-1">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="text-lg font-semibold mb-2 text-white">{product.name}</div>
                    {product.price === 0 ? (
                      <div className="text-2xl font-bold text-emerald-400">Included</div>
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
                          <div className="text-2xl font-bold text-emerald-400">
                            Select to see price
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-emerald-400">
                        {formatPrice(product.price)}
                      </div>
                    )}
                    {/* Show insurance savings if selected */}
                    {isSelected && insurancePricing && insurancePricing.savings > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <div className="text-xs text-emerald-400">
                          Insurance pays: {formatPrice(insurancePricing.insurancePays)}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: AR Coating */}
      {(lensMaterial || arCoating) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Step 4: Select AR Coating</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Regular AR Coatings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.arCoating?.filter(p => !p.name.toLowerCase().includes('neurolens')).map((product) => {
                const insurancePricing = getInsurancePricing(product.sku || product.id)
                const isSelected = arCoating === product.id
                return (
                  <button
                    key={product.id}
                    onClick={() => handleArCoatingSelect(product)}
                    className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-orange-400 bg-orange-500/30'
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
                    {product.price === 0 ? (
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
                    {/* Show insurance savings if selected */}
                    {isSelected && insurancePricing && insurancePricing.savings > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <div className="text-xs text-emerald-400">
                          Insurance pays: {formatPrice(insurancePricing.insurancePays)}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Neurolens AR Section */}
            {products.arCoating?.some(p => p.name.toLowerCase().includes('neurolens')) && (
              <div className="mt-6 pt-4 border-t border-amber-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-1 bg-amber-500 rounded-full"></div>
                  <span className="text-amber-400 font-semibold text-sm uppercase tracking-wide">Neurolens AR</span>
                  <span className="text-amber-400/60 text-xs">(Cash Pay Only)</span>
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
                            ? 'border-amber-400 bg-amber-500/30'
                            : 'border-amber-500/30 hover:border-amber-400/50 bg-amber-500/10'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <div className="bg-amber-500 rounded-full p-1">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                        <div className="text-lg font-semibold mb-1 text-white">{product.name}</div>
                        <div className="text-xs text-amber-400 mb-2">Cash pay only - no vision plans</div>
                        <div className="text-2xl font-bold text-amber-400">
                          {formatPrice(product.price)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Transitions */}
      {(arCoating || transitions) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Step 5: Select Transitions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.transitions?.map((product) => {
                const insurancePricing = getInsurancePricing(product.sku || product.id)
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
                    {/* Show insurance savings if selected */}
                    {isSelected && insurancePricing && insurancePricing.savings > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <div className="text-xs text-emerald-400">
                          Insurance pays: {formatPrice(insurancePricing.insurancePays)}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Polarized */}
      {(transitions || polarized) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Step 6: Polarized</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.polarized?.map((product) => {
                const insurancePricing = getInsurancePricing(product.sku || product.id)
                const isSelected = polarized === product.id
                return (
                  <button
                    key={product.id}
                    onClick={() => handlePolarizedSelect(product)}
                    className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/30'
                        : 'border-white/20 hover:border-white/40 bg-white/10'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-cyan-500 rounded-full p-1">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="text-lg font-semibold mb-2 text-white">{product.name}</div>
                    {product.price === 0 ? (
                      <div className="text-2xl font-bold text-cyan-400">No charge</div>
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
                          <div className="text-2xl font-bold text-cyan-400">
                            Select to see price
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-cyan-400">
                        {formatPrice(product.price)}
                      </div>
                    )}
                    {/* Show insurance savings if selected */}
                    {isSelected && insurancePricing && insurancePricing.savings > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <div className="text-xs text-emerald-400">
                          Insurance pays: {formatPrice(insurancePricing.insurancePays)}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 7: Mount Fee */}
      {(polarized || mountFee) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Step 7: Select Mount Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.mountFee?.map((product) => {
                const insurancePricing = getInsurancePricing(product.sku || product.id)
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
                    {/* Show insurance savings if selected */}
                    {isSelected && insurancePricing && insurancePricing.savings > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <div className="text-xs text-emerald-400">
                          Insurance pays: {formatPrice(insurancePricing.insurancePays)}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 8: Add-ons */}
      {(mountFee || addons.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Step 8: Select Add-ons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.addons?.map((product) => {
                const insurancePricing = getInsurancePricing(product.sku || product.id)
                const isSelected = addons.includes(product.id)
                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddonToggle(product)}
                    className={`relative p-5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/30'
                        : 'border-white/20 hover:border-white/40 bg-white/10'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-emerald-500 rounded-full p-1">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="text-lg font-semibold mb-2 text-white">{product.name}</div>
                    {product.price === 0 ? (
                      <div className="text-2xl font-bold text-emerald-400">Included</div>
                    ) : authorization ? (
                      <div className="space-y-1">
                        <div className="text-sm text-white/60 line-through">
                          +{formatPrice(product.price)}
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
                        +{formatPrice(product.price)}
                      </div>
                    )}
                    {/* Show insurance savings if selected */}
                    {isSelected && insurancePricing && insurancePricing.savings > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20">
                        <div className="text-xs text-emerald-400">
                          Insurance pays: {formatPrice(insurancePricing.insurancePays)}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total */}
      {(frame || isPatientOwnedFrame) && (
        <Card className="bg-white/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                {authorization ? (
                  <>
                    <div className="text-sm text-white/70 mb-1">Retail Total</div>
                    <div className="text-xl text-white/60 line-through">{formatPrice(pricingSummary.retailTotal)}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <div>
                        <div className="text-sm text-emerald-400">Insurance pays</div>
                        <div className="text-lg font-semibold text-emerald-400">{formatPrice(pricingSummary.insuranceTotal)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-amber-400">You pay</div>
                        <div className="text-3xl font-bold text-amber-400">
                          {isCalculating ? (
                            <Loader2 className="h-6 w-6 animate-spin inline" />
                          ) : (
                            formatPrice(pricingSummary.patientTotal)
                          )}
                        </div>
                      </div>
                    </div>
                    {pricingSummary.totalSavings > 0 && (
                      <div className="text-sm text-emerald-400 mt-1">
                        You save {formatPrice(pricingSummary.totalSavings)} with insurance!
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-sm text-white/70 mb-1">Eyeglasses Total</div>
                    <div className="text-3xl font-bold text-white">{formatPrice(calculateTotal())}</div>
                  </>
                )}
              </div>
              {mountFee && (
                <div className="flex gap-3">
                  {onBack && (
                    <Button
                      onClick={onBack}
                      variant="outline"
                      size="lg"
                    >
                      Back
                    </Button>
                  )}
                  {onNext && (
                    <Button
                      onClick={onNext}
                      size="lg"
                    >
                      Continue to Second Pair
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skip Eyeglasses - Show when no frame selected */}
      {!frame && !isPatientOwnedFrame && onNext && (
        <Card className="glass-card border-white/20 bg-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-white/70">
                <div className="font-medium text-white">No eyeglasses selected</div>
                <div className="text-sm">You can skip eyeglasses and proceed to contact lenses or review.</div>
              </div>
              <div className="flex gap-3">
                {onBack && (
                  <Button
                    onClick={onBack}
                    variant="outline"
                    size="lg"
                  >
                    Back
                  </Button>
                )}
                <Button
                  onClick={onNext}
                  variant="outline"
                  size="lg"
                  className="border-amber-400/50 text-amber-400 hover:bg-amber-500/20"
                >
                  Skip Eyeglasses →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
