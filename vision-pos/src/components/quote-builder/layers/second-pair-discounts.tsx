'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2, Search, X, Glasses, ArrowLeft, ArrowRight, Percent } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
  pricingCategory?: string
}

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

interface SecondPairDiscountsProps {
  className?: string
  onNext?: () => void
  onBack?: () => void
}

type DiscountType = 'same-day' | 'within-30-days' | 'none'

export function SecondPairDiscounts({ className, onNext, onBack }: SecondPairDiscountsProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { updateSecondPair } = useQuotePricingContext()

  // Products from database
  const [products, setProducts] = useState<ProductsData | null>(null)

  // Discount type
  const [discountType, setDiscountType] = useState<DiscountType>('same-day')

  // State for selections
  const [frame, setFrame] = useState<string | null>(null)
  const [lensType, setLensType] = useState<string | null>(null)
  const [lensMaterial, setLensMaterial] = useState<string | null>(null)
  const [arCoating, setArCoating] = useState<string | null>(null)
  const [transitions, setTransitions] = useState<string | null>(null)
  const [polarized, setPolarized] = useState<string | null>(null)
  const [mountFee, setMountFee] = useState<string | null>(null)
  const [addons, setAddons] = useState<string[]>([])

  // Frame search state
  const [frameSearch, setFrameSearch] = useState('')
  const [frameSearchResults, setFrameSearchResults] = useState<FrameResult[]>([])
  const [frameSearchLoading, setFrameSearchLoading] = useState(false)
  const [selectedFrame, setSelectedFrame] = useState<FrameResult | null>(null)

  // Fetch products from API
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        const response = await fetch('/api/quote-builder/products')
        const data = await response.json()

        if (data.success) {
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

  const getSelectedProduct = (list: Product[] | undefined, id: string | null): Product | undefined => {
    if (!list || !id) return undefined
    return list.find(p => p.id === id)
  }

  const getDiscountPercent = () => {
    return discountType === 'same-day' ? 50 : discountType === 'within-30-days' ? 30 : 0
  }

  const calculateSubtotal = () => {
    if (!products) return 0
    let total = 0

    if (selectedFrame) total += selectedFrame.price

    const lens = getSelectedProduct(products.lensType, lensType)
    if (lens) total += lens.price

    const material = getSelectedProduct(products.lensMaterial, lensMaterial)
    if (material) total += material.price

    const ar = getSelectedProduct(products.arCoating, arCoating)
    if (ar) total += ar.price

    const trans = getSelectedProduct(products.transitions, transitions)
    if (trans) total += trans.price

    const polar = getSelectedProduct(products.polarized, polarized)
    if (polar) total += polar.price

    const mount = getSelectedProduct(products.mountFee, mountFee)
    if (mount) total += mount.price

    addons.forEach(id => {
      const addon = getSelectedProduct(products.addons, id)
      if (addon) total += addon.price
    })

    return total
  }

  const subtotal = calculateSubtotal()
  const discountPercent = getDiscountPercent()
  const discountAmount = subtotal * (discountPercent / 100)
  const totalDue = subtotal - discountAmount

  // Update pricing context whenever selections change
  useEffect(() => {
    if (selectedFrame || lensType) {
      const lineItems: Array<{ name: string; price: number }> = []
      if (selectedFrame) lineItems.push({ name: `${selectedFrame.brand} ${selectedFrame.model}`, price: selectedFrame.price })
      if (lensType && products?.lensType) {
        const lens = getSelectedProduct(products.lensType, lensType)
        if (lens) lineItems.push({ name: lens.name, price: lens.price })
      }
      if (lensMaterial && products?.lensMaterial) {
        const material = getSelectedProduct(products.lensMaterial, lensMaterial)
        if (material && material.price > 0) lineItems.push({ name: material.name, price: material.price })
      }
      if (arCoating && products?.arCoating) {
        const ar = getSelectedProduct(products.arCoating, arCoating)
        if (ar && ar.price > 0) lineItems.push({ name: ar.name, price: ar.price })
      }
      if (transitions && products?.transitions) {
        const trans = getSelectedProduct(products.transitions, transitions)
        if (trans && trans.price > 0) lineItems.push({ name: trans.name, price: trans.price })
      }
      if (polarized && products?.polarized) {
        const polar = getSelectedProduct(products.polarized, polarized)
        if (polar && polar.price > 0) lineItems.push({ name: polar.name, price: polar.price })
      }
      if (mountFee && products?.mountFee) {
        const mount = getSelectedProduct(products.mountFee, mountFee)
        if (mount && mount.price > 0) lineItems.push({ name: mount.name, price: mount.price })
      }
      if (products?.addons) {
        addons.forEach(id => {
          const addon = getSelectedProduct(products.addons, id)
          if (addon) lineItems.push({ name: addon.name, price: addon.price })
        })
      }

      updateSecondPair({
        enabled: true,
        frameName: selectedFrame ? `${selectedFrame.brand} ${selectedFrame.model}` : 'Second Pair',
        framePrice: selectedFrame?.price || 0,
        lensPrice: (getSelectedProduct(products?.lensType, lensType)?.price || 0) + (getSelectedProduct(products?.lensMaterial, lensMaterial)?.price || 0),
        coatingPrice: (getSelectedProduct(products?.arCoating, arCoating)?.price || 0) + (getSelectedProduct(products?.transitions, transitions)?.price || 0) + (getSelectedProduct(products?.polarized, polarized)?.price || 0) + (getSelectedProduct(products?.mountFee, mountFee)?.price || 0) + addons.reduce((sum, id) => sum + (getSelectedProduct(products?.addons, id)?.price || 0), 0),
        discountType,
        discountPercent,
        subtotal,
        discountAmount,
        totalDue,
        lineItems
      })
    } else {
      updateSecondPair({
        enabled: false,
        frameName: '',
        framePrice: 0,
        lensPrice: 0,
        coatingPrice: 0,
        discountType: 'none',
        discountPercent: 0,
        subtotal: 0,
        discountAmount: 0,
        totalDue: 0
      })
    }
  }, [selectedFrame, lensType, lensMaterial, arCoating, transitions, polarized, mountFee, addons, discountType, subtotal, discountAmount, totalDue, discountPercent, updateSecondPair, products])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handleReset = () => {
    setFrame(null)
    setSelectedFrame(null)
    setFrameSearch('')
    setFrameSearchResults([])
    setLensType(null)
    setLensMaterial(null)
    setArCoating(null)
    setTransitions(null)
    setPolarized(null)
    setMountFee(null)
    setAddons([])
    setShowResetConfirm(false)
  }

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
    setSelectedFrame(frameResult)
    setFrame(frameResult.id)
    setFrameSearch('')
    setFrameSearchResults([])
  }

  // Clear frame selection
  const handleClearFrame = () => {
    setSelectedFrame(null)
    setFrame(null)
  }

  const handleLensTypeSelect = (product: Product) => {
    setLensType(product.id)
  }

  const handleLensMaterialSelect = (product: Product) => {
    setLensMaterial(product.id)
  }

  const handleArCoatingSelect = (product: Product) => {
    setArCoating(product.id)
  }

  const handleTransitionsSelect = (product: Product) => {
    setTransitions(product.id)
  }

  const handlePolarizedSelect = (product: Product) => {
    setPolarized(product.id)
  }

  const handleMountFeeSelect = (product: Product) => {
    setMountFee(product.id)
  }

  const handleAddonToggle = (product: Product) => {
    if (addons.includes(product.id)) {
      setAddons(prev => prev.filter(a => a !== product.id))
    } else {
      setAddons(prev => [...prev, product.id])
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
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
      {/* Second Pair Header Banner */}
      <Card className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Glasses className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">Second Pair</h2>
              <p className="text-white/60">Retail pricing with discount • Cash pay only</p>
            </div>
            <Badge className="bg-amber-500/30 text-amber-300 border-amber-400/50 text-lg px-4 py-2">
              <Percent className="h-4 w-4 mr-2" />
              {discountPercent}% Off
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Discount Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-white">Select Discount</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setDiscountType('same-day')}
              className={`relative p-5 rounded-lg border-2 transition-all text-center ${
                discountType === 'same-day'
                  ? 'border-emerald-400 bg-emerald-500/30'
                  : 'border-white/20 hover:border-white/40 bg-white/10'
              }`}
            >
              {discountType === 'same-day' && (
                <div className="absolute top-3 right-3">
                  <div className="bg-emerald-500 rounded-full p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
              <div className="text-3xl font-bold text-emerald-400">50%</div>
              <div className="text-lg text-white mt-1">Same Day</div>
              <div className="text-sm text-white/60">Purchase today</div>
            </button>

            <button
              onClick={() => setDiscountType('within-30-days')}
              className={`relative p-5 rounded-lg border-2 transition-all text-center ${
                discountType === 'within-30-days'
                  ? 'border-blue-400 bg-blue-500/30'
                  : 'border-white/20 hover:border-white/40 bg-white/10'
              }`}
            >
              {discountType === 'within-30-days' && (
                <div className="absolute top-3 right-3">
                  <div className="bg-blue-500 rounded-full p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
              <div className="text-3xl font-bold text-blue-400">30%</div>
              <div className="text-lg text-white mt-1">30 Days</div>
              <div className="text-sm text-white/60">Return within 30 days</div>
            </button>

            <button
              onClick={() => setDiscountType('none')}
              className={`relative p-5 rounded-lg border-2 transition-all text-center ${
                discountType === 'none'
                  ? 'border-white/60 bg-white/20'
                  : 'border-white/20 hover:border-white/40 bg-white/10'
              }`}
            >
              {discountType === 'none' && (
                <div className="absolute top-3 right-3">
                  <div className="bg-white/60 rounded-full p-1">
                    <Check className="h-4 w-4 text-black" />
                  </div>
                </div>
              )}
              <div className="text-3xl font-bold text-white/70">0%</div>
              <div className="text-lg text-white mt-1">Full Price</div>
              <div className="text-sm text-white/60">No discount</div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      {(frame || lensType) && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowResetConfirm(true)}
            variant="outline"
            className="text-red-400 border-red-400/50 hover:bg-red-500/20"
          >
            Reset Second Pair
          </Button>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <Card className="border-red-400/50 bg-red-500/20">
          <CardContent className="p-4">
            <div className="space-y-3">
              <p className="font-semibold text-white">Are you sure you want to reset second pair selections?</p>
              <p className="text-sm text-white/70">All second pair selections will be cleared.</p>
              <div className="flex gap-3">
                <Button onClick={() => setShowResetConfirm(false)} variant="outline" size="sm">
                  Cancel
                </Button>
                <Button onClick={handleReset} variant="destructive" size="sm">
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
          <CardTitle className="text-lg text-white">Step 1: Select Frame</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedFrame ? (
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
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-amber-400">
                      {formatPrice(selectedFrame.price)}
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
                  {frameSearchResults.map((frameResult) => (
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
                          <div className="font-bold text-amber-400">
                            {formatPrice(frameResult.price)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Lens Type */}
      {(frame || lensType) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Step 2: Select Lens Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.lensType?.filter(p => !p.name.toLowerCase().includes('neurolens') && !p.name.toLowerCase().includes('eyezen')).map((product) => {
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
                    <div className="text-lg font-semibold mb-2 text-white">{product.name}</div>
                    <div className="text-2xl font-bold text-amber-400">
                      {formatPrice(product.price)}
                    </div>
                  </button>
                )
              })}
            </div>
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
                    <div className="text-2xl font-bold text-amber-400">
                      {product.price === 0 ? 'Included' : formatPrice(product.price)}
                    </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.arCoating?.filter(p => !p.name.toLowerCase().includes('neurolens')).map((product) => {
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
                    <div className="text-lg font-semibold mb-2 text-white">{product.name}</div>
                    <div className="text-2xl font-bold text-amber-400">
                      {product.price === 0 ? 'No charge' : formatPrice(product.price)}
                    </div>
                  </button>
                )
              })}
            </div>
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
                    <div className="text-2xl font-bold text-amber-400">
                      {product.price === 0 ? 'No charge' : formatPrice(product.price)}
                    </div>
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
                    <div className="text-2xl font-bold text-amber-400">
                      {product.price === 0 ? 'No charge' : formatPrice(product.price)}
                    </div>
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
                    <div className="text-2xl font-bold text-amber-400">
                      {product.price === 0 ? 'Included' : formatPrice(product.price)}
                    </div>
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
                    <div className="text-2xl font-bold text-amber-400">
                      {product.price === 0 ? 'Included' : `+${formatPrice(product.price)}`}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Summary */}
      {(frame || lensType) && (
        <Card className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/70 mb-1">Second Pair Retail</div>
                <div className="text-xl text-white/60 line-through">{formatPrice(subtotal)}</div>
                {discountPercent > 0 && (
                  <div className={`text-lg font-medium mt-1 ${
                    discountType === 'same-day' ? 'text-emerald-400' : 'text-blue-400'
                  }`}>
                    -{discountPercent}% discount: -{formatPrice(discountAmount)}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <div>
                    <div className="text-sm text-amber-400">You pay</div>
                    <div className="text-3xl font-bold text-amber-400">
                      {formatPrice(totalDue)}
                    </div>
                  </div>
                </div>
                {discountAmount > 0 && (
                  <div className="text-sm text-emerald-400 mt-1">
                    You save {formatPrice(discountAmount)} with {discountType === 'same-day' ? 'same day' : '30 day'} discount!
                  </div>
                )}
              </div>
              {mountFee && (
                <div className="flex gap-3">
                  {onBack && (
                    <Button onClick={onBack} variant="outline" size="lg">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  )}
                  {onNext && (
                    <Button onClick={onNext} size="lg">
                      Continue to Contacts
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skip Second Pair */}
      {!frame && !lensType && (
        <Card className="border-white/20 bg-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-white/70">
                <div className="font-medium text-white">No second pair selected</div>
                <div className="text-sm">You can skip second pair and proceed to contacts or review.</div>
              </div>
              <div className="flex gap-3">
                {onBack && (
                  <Button onClick={onBack} variant="outline" size="lg">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
                {onNext && (
                  <Button
                    onClick={onNext}
                    variant="outline"
                    size="lg"
                    className="border-amber-400/50 text-amber-400 hover:bg-amber-500/20"
                  >
                    Skip Second Pair
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
