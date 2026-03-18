'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  Loader2,
  Check,
  Package,
  Star,
  ChevronDown,
  X,
} from 'lucide-react'

interface Frame {
  id: string
  sku: string
  brand: string
  model: string
  color: string
  size: string | null
  price: number
  manufacturer: string
  material: string
  style: string
  category: 'value' | 'designer' | 'premium'
  inStock: boolean
  isFeaturedBrand: boolean
}

interface BrandFilter {
  name: string
  count: number
}

interface FrameCardProps {
  frame: Frame
  isSelected: boolean
  onSelect: () => void
}

function FrameCard({
  frame,
  isSelected,
  onSelect,
}: FrameCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={!frame.inStock}
      className={cn(
        'relative flex flex-col p-3 rounded-xl border-2 transition-all duration-150 glass-card',
        'aspect-square text-left',
        isSelected
          ? 'border-blue-500 bg-blue-500/20 shadow-md'
          : frame.inStock
            ? 'border-white/10 hover:border-white/30 hover:shadow-sm'
            : 'border-white/10 opacity-60 cursor-not-allowed'
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Featured brand badge */}
      {frame.isFeaturedBrand && (
        <div className="absolute top-2 left-2">
          <Star className="h-4 w-4 text-amber-400" />
        </div>
      )}

      {/* Out of stock indicator */}
      {!frame.inStock && (
        <div className="absolute top-2 left-2 text-[10px] text-red-400 font-medium">
          Out of Stock
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center items-center text-center mt-2">
        <h3
          className={cn(
            'font-semibold text-xs leading-tight text-white',
            isSelected && 'text-blue-400'
          )}
        >
          {frame.brand}
        </h3>
        <p className="text-[11px] text-white/70 mt-0.5 line-clamp-1">{frame.model}</p>
        <p className="text-[10px] text-white/50 mt-1">{frame.color}</p>
      </div>

      {/* Price at bottom - simple display */}
      <div className="mt-auto text-center">
        <span className="text-sm font-semibold text-white">${frame.price.toFixed(0)}</span>
      </div>
    </button>
  )
}

export default function FramesMenu() {
  const { quote, addLineItem, removeLineItem } = usePOSStore()

  // State
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [frames, setFrames] = useState<Frame[]>([])
  const [brands, setBrands] = useState<BrandFilter[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)

  // Get frame allowance from insurance
  const frameAllowance = quote.insurance.frameAllowance || 0
  const hasInsurance = quote.insurance.hasActiveAuth

  // Get selected frame for current pair
  const selectedFrameItem = (quote.lineItems ?? []).find(
    (item) =>
      item.pairId === quote.activePairId && item.category === 'frame'
  )

  // Fetch frames
  const fetchFrames = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sortBy: 'brand',
        sortOrder: 'asc',
      })

      if (search) {
        params.set('search', search)
      }

      if (selectedBrand && selectedBrand !== 'all') {
        params.set('brand', selectedBrand)
      }

      const response = await fetch(`/api/frames?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFrames(data.frames || [])
        setTotalPages(data.pagination?.totalPages || 1)

        // Only update brands on initial load or brand change
        if (data.filters?.brands && brands.length === 0) {
          setBrands(data.filters.brands)
        }
      }
    } catch (error) {
      console.error('Failed to fetch frames:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, selectedBrand, brands.length])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to first page on search
      fetchFrames()
    }, 300)

    return () => clearTimeout(timer)
  }, [search, selectedBrand, fetchFrames])

  // Initial load
  useEffect(() => {
    fetchFrames()
  }, [page])

  const handleSelectFrame = (frame: Frame) => {
    if (!frame.inStock) return

    const isSelected = selectedFrameItem?.productId === frame.id

    if (isSelected) {
      // Deselect
      if (selectedFrameItem) {
        removeLineItem(selectedFrameItem.id)
      }
    } else {
      // First remove any existing frame for this pair
      if (selectedFrameItem) {
        removeLineItem(selectedFrameItem.id)
      }

      // Calculate pricing with allowance
      const featuredBonus = frame.isFeaturedBrand && hasInsurance ? frameAllowance * 0.2 : 0
      const totalAllowance = frameAllowance + featuredBonus
      const allowanceUsed = hasInsurance ? Math.min(frame.price, totalAllowance) : 0
      const overage = Math.max(0, frame.price - totalAllowance)

      // VSP: 20% off overage (patient pays 80% of amount over allowance)
      const isVsp = quote.insurance.carrier === 'VSP'
      const overageDiscount = isVsp ? 0.20 : 0
      const patientPays = overage * (1 - overageDiscount)

      // Insurance pays: allowance + overage discount
      const overageDiscountAmount = overage * overageDiscount
      const insurancePays = allowanceUsed + overageDiscountAmount

      addLineItem({
        productId: frame.id,
        name: `${frame.brand} ${frame.model}`,
        category: 'frame',
        subcategory: frame.category,
        quantity: 1,
        retailPrice: frame.price,
        patientPays,
        insurancePays,
        note: frame.color,
        pairId: quote.activePairId,
      })
    }
  }

  return (
    <div className="p-[2%] space-y-[3%]">
      {/* Frame allowance banner */}
      {hasInsurance && frameAllowance > 0 && (
        <div className="flex items-center justify-between p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-400" />
            <span className="text-sm text-emerald-300">
              Frame Allowance: <strong>${frameAllowance.toFixed(2)}</strong>
            </span>
          </div>
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
            <Star className="h-3 w-3 mr-1" />
            Featured brands +20%
          </Badge>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search frames by brand, model, or color..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <X className="h-4 w-4 text-white/40 hover:text-white/70" />
          </button>
        )}
      </div>

      {/* Brand filter - prominent horizontal buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedBrand('all')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            selectedBrand === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          )}
        >
          All Brands
        </button>
        {brands.slice(0, 8).map((brand) => (
          <button
            key={brand.name}
            onClick={() => setSelectedBrand(brand.name)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              selectedBrand === brand.name
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            )}
          >
            {brand.name}
          </button>
        ))}
        {brands.length > 8 && (
          <button
            onClick={() => setShowBrandDropdown(!showBrandDropdown)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white/70 hover:bg-white/20 flex items-center gap-1"
          >
            More
            <ChevronDown className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* More brands dropdown */}
      {showBrandDropdown && brands.length > 8 && (
        <div className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
          {brands.slice(8).map((brand) => (
            <button
              key={brand.name}
              onClick={() => {
                setSelectedBrand(brand.name)
                setShowBrandDropdown(false)
              }}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-all',
                selectedBrand === brand.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              )}
            >
              {brand.name}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
        </div>
      )}

      {/* Frames grid */}
      {!loading && frames.length > 0 && (
        <div className="grid grid-cols-4 gap-[2%]">
          {frames.map((frame) => (
            <FrameCard
              key={frame.id}
              frame={frame}
              isSelected={selectedFrameItem?.productId === frame.id}
              onSelect={() => handleSelectFrame(frame)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && frames.length === 0 && (
        <div className="text-center py-12 text-white/60">
          <Package className="h-12 w-12 mx-auto mb-3 text-white/30" />
          <p className="font-medium text-white">No frames found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-white/20 rounded hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-white/60">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border border-white/20 rounded hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
