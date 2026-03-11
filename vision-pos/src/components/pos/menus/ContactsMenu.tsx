'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Search,
  Loader2,
  Check,
  Eye,
  Package,
  ChevronDown,
  X,
} from 'lucide-react'

interface ContactLens {
  id: string
  manufacturer: string
  lensName: string
  boxSize: number
  retailPrice: number
  officePrice: number
  modality: string
  isAstigmatism: boolean
  isMultifocal: boolean
  isColor: boolean
  annualSupplyBothEyes: number | null
  annualSupplyPerEye: number | null
}

type EyeSide = 'OD' | 'OS' | 'OU'

interface ContactLensCardProps {
  lens: ContactLens
  isSelected: boolean
  selectedEye: EyeSide | null
  onSelect: (eye: EyeSide) => void
}

function ContactLensCard({
  lens,
  isSelected,
  selectedEye,
  onSelect,
}: ContactLensCardProps) {
  const [showEyeSelector, setShowEyeSelector] = useState(false)

  const handleEyeSelect = (eye: EyeSide) => {
    onSelect(eye)
    setShowEyeSelector(false)
  }

  const getModalityLabel = (modality: string) => {
    switch (modality) {
      case 'daily':
        return 'D'
      case 'biweekly':
        return '2W'
      case 'monthly':
        return 'M'
      default:
        return modality
    }
  }

  const getModalityColor = (modality: string) => {
    switch (modality) {
      case 'daily':
        return 'text-emerald-400'
      case 'biweekly':
        return 'text-blue-400'
      case 'monthly':
        return 'text-purple-400'
      default:
        return 'text-white/70'
    }
  }

  return (
    <div
      className={cn(
        'relative flex flex-col p-3 rounded-xl border-2 transition-all duration-150 glass-card',
        'aspect-square',
        isSelected
          ? 'border-blue-500 bg-blue-500/20 shadow-md'
          : 'border-white/10 hover:border-white/30 hover:shadow-sm'
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Modality badge - simplified */}
      <div className={cn('absolute top-2 left-2 text-[10px] font-bold', getModalityColor(lens.modality))}>
        {getModalityLabel(lens.modality)}
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center mt-2">
        <h3
          className={cn(
            'font-semibold text-xs leading-tight text-white',
            isSelected && 'text-blue-400'
          )}
        >
          {lens.manufacturer}
        </h3>
        <p className="text-[11px] text-white/70 mt-0.5 line-clamp-2">{lens.lensName}</p>
        <p className="text-[10px] text-white/50 mt-1">{lens.boxSize} pack</p>
      </div>

      {/* Price at bottom */}
      <div className="text-center">
        <span className="text-sm font-semibold text-white">${lens.retailPrice.toFixed(0)}</span>
        <span className="text-[10px] text-white/50">/box</span>
      </div>

      {/* Eye selection buttons - compact */}
      <div className="mt-2 pt-2 border-t border-white/10">
        {showEyeSelector || isSelected ? (
          <div className="flex gap-1">
            <button
              onClick={() => handleEyeSelect('OD')}
              className={cn(
                'flex-1 py-1 text-[10px] font-medium rounded border transition-all',
                selectedEye === 'OD' || selectedEye === 'OU'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-white/80'
              )}
            >
              OD
            </button>
            <button
              onClick={() => handleEyeSelect('OS')}
              className={cn(
                'flex-1 py-1 text-[10px] font-medium rounded border transition-all',
                selectedEye === 'OS' || selectedEye === 'OU'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-white/80'
              )}
            >
              OS
            </button>
            <button
              onClick={() => handleEyeSelect('OU')}
              className={cn(
                'flex-1 py-1 text-[10px] font-medium rounded border transition-all',
                selectedEye === 'OU'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-white/80'
              )}
            >
              Both
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowEyeSelector(true)}
            className="w-full py-1 text-[10px] font-medium text-blue-400 hover:bg-blue-500/10 rounded transition-all"
          >
            Select
          </button>
        )}
      </div>
    </div>
  )
}

export default function ContactsMenu() {
  const { quote, addLineItem, removeLineItem } = usePOSStore()

  // State
  const [search, setSearch] = useState('')
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all')
  const [selectedModality, setSelectedModality] = useState<string>('all')
  const [lenses, setLenses] = useState<ContactLens[]>([])
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showMfgDropdown, setShowMfgDropdown] = useState(false)

  // Get contact allowance from insurance
  const contactAllowance = quote.insurance.contactAllowance || 0
  const hasInsurance = quote.insurance.hasActiveAuth

  // Get selected contacts for current pair
  const selectedContactItems = (quote.lineItems ?? []).filter(
    (item) =>
      item.pairId === quote.activePairId && item.category === 'contact_lens'
  )

  // Get selected eye for a specific lens
  const getSelectedEye = (lensId: string): EyeSide | null => {
    const items = selectedContactItems.filter((item) => item.productId === lensId)
    if (items.length === 0) return null
    if (items.some((item) => item.subcategory === 'OU')) return 'OU'
    if (items.length === 2) return 'OU'
    return items[0]?.subcategory as EyeSide
  }

  // Fetch lenses
  const fetchLenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()

      if (search) {
        params.set('search', search)
      }

      if (selectedManufacturer && selectedManufacturer !== 'all') {
        params.set('manufacturer', selectedManufacturer)
      }

      if (selectedModality && selectedModality !== 'all') {
        params.set('modality', selectedModality)
      }

      const response = await fetch(`/api/contact-lenses?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLenses(data.data || [])

        // Update manufacturers on initial load
        if (data.manufacturers && manufacturers.length === 0) {
          setManufacturers(data.manufacturers)
        }
      }
    } catch (error) {
      console.error('Failed to fetch contact lenses:', error)
    } finally {
      setLoading(false)
    }
  }, [search, selectedManufacturer, selectedModality, manufacturers.length])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLenses()
    }, 300)

    return () => clearTimeout(timer)
  }, [search, selectedManufacturer, selectedModality, fetchLenses])

  // Initial load
  useEffect(() => {
    fetchLenses()
  }, [])

  const handleSelectLens = (lens: ContactLens, eye: EyeSide) => {
    // Remove any existing selections for this lens
    const existingItems = selectedContactItems.filter(
      (item) => item.productId === lens.id
    )
    existingItems.forEach((item) => removeLineItem(item.id))

    // If clicking same eye again, just deselect
    const currentEye = getSelectedEye(lens.id)
    if (currentEye === eye) {
      return
    }

    // Calculate pricing
    const boxesPerYear = eye === 'OU' ? 8 : 4 // 4 boxes per eye per year
    const annualCost =
      eye === 'OU'
        ? lens.annualSupplyBothEyes || lens.retailPrice * 8
        : lens.annualSupplyPerEye || lens.retailPrice * 4
    const allowanceUsed = hasInsurance ? Math.min(annualCost, contactAllowance) : 0
    const patientPays = Math.max(0, annualCost - allowanceUsed)

    // Add line item(s)
    if (eye === 'OU') {
      addLineItem({
        productId: lens.id,
        name: `${lens.manufacturer} ${lens.lensName}`,
        category: 'contact_lens',
        subcategory: 'OU',
        quantity: boxesPerYear,
        retailPrice: annualCost,
        patientPays,
        insurancePays: allowanceUsed,
        note: `${lens.boxSize} pack - Both Eyes`,
        pairId: quote.activePairId,
      })
    } else {
      addLineItem({
        productId: lens.id,
        name: `${lens.manufacturer} ${lens.lensName}`,
        category: 'contact_lens',
        subcategory: eye,
        quantity: boxesPerYear,
        retailPrice: annualCost,
        patientPays,
        insurancePays: allowanceUsed,
        note: `${lens.boxSize} pack - ${eye === 'OD' ? 'Right Eye' : 'Left Eye'}`,
        pairId: quote.activePairId,
      })
    }
  }

  return (
    <div className="p-[2%] space-y-[3%]">
      {/* Contact allowance banner */}
      {hasInsurance && contactAllowance > 0 && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
          <Package className="h-5 w-5 text-emerald-400" />
          <span className="text-sm text-emerald-300">
            Contact Lens Allowance: <strong>${contactAllowance.toFixed(2)}</strong>
          </span>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            type="text"
            placeholder="Search contact lenses..."
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

        {/* Manufacturer filter */}
        <div className="relative">
          <button
            onClick={() => setShowMfgDropdown(!showMfgDropdown)}
            className="flex items-center gap-2 px-4 py-2 border border-white/20 rounded-lg glass-card hover:bg-white/10 min-w-[150px]"
          >
            <span className="text-sm truncate text-white">
              {selectedManufacturer === 'all' ? 'All Brands' : selectedManufacturer}
            </span>
            <ChevronDown className="h-4 w-4 text-white/60" />
          </button>

          {showMfgDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 max-h-64 overflow-y-auto glass-card border border-white/20 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  setSelectedManufacturer('all')
                  setShowMfgDropdown(false)
                }}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm hover:bg-white/10 text-white',
                  selectedManufacturer === 'all' && 'bg-blue-500/20 text-blue-400'
                )}
              >
                All Brands
              </button>
              {manufacturers.map((mfg) => (
                <button
                  key={mfg}
                  onClick={() => {
                    setSelectedManufacturer(mfg)
                    setShowMfgDropdown(false)
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm hover:bg-white/10 text-white',
                    selectedManufacturer === mfg && 'bg-blue-500/20 text-blue-400'
                  )}
                >
                  {mfg}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modality filter */}
        <div className="flex gap-1 border border-white/20 rounded-lg p-1 bg-white/5">
          {['all', 'daily', 'biweekly', 'monthly'].map((mod) => (
            <button
              key={mod}
              onClick={() => setSelectedModality(mod)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded transition-all',
                selectedModality === mod
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-white/10 text-white/70'
              )}
            >
              {mod === 'all' ? 'All' : mod.charAt(0).toUpperCase() + mod.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
        </div>
      )}

      {/* Lenses grid */}
      {!loading && lenses.length > 0 && (
        <div className="grid grid-cols-4 gap-[2%]">
          {lenses.map((lens) => (
            <ContactLensCard
              key={lens.id}
              lens={lens}
              isSelected={selectedContactItems.some((item) => item.productId === lens.id)}
              selectedEye={getSelectedEye(lens.id)}
              onSelect={(eye) => handleSelectLens(lens, eye)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && lenses.length === 0 && (
        <div className="text-center py-12 text-white/60">
          <Eye className="h-12 w-12 mx-auto mb-3 text-white/30" />
          <p className="font-medium text-white">No contact lenses found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}
