'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePOSStore } from '@/stores/pos-store'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  Loader2,
  Check,
  Eye,
  Package,
  ChevronDown,
  X,
  AlertTriangle,
  Plus,
  Minus,
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

// Annual supply discount rules by modality (from calculator)
const ANNUAL_SUPPLY_DISCOUNT: Record<string, number> = {
  daily: 30,     // $30 discount for daily annual supply
  biweekly: 10,  // $10 discount for biweekly annual supply
  monthly: 10,   // $10 discount for monthly annual supply
}

interface SelectedLensState {
  lens: ContactLens
  boxesOD: number
  boxesOS: number
  rebate: number
}

export default function ContactsMenu() {
  const { quote, addLineItem, removeLineItem, hasGlassesItems } = usePOSStore()

  // State
  const [search, setSearch] = useState('')
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all')
  const [selectedModality, setSelectedModality] = useState<string>('all')
  const [lenses, setLenses] = useState<ContactLens[]>([])
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showMfgDropdown, setShowMfgDropdown] = useState(false)
  const [selectedLens, setSelectedLens] = useState<SelectedLensState | null>(null)

  // Get contact allowance from insurance
  const contactAllowance = quote.insurance.contactAllowance || 0
  const hasInsurance = quote.insurance.hasActiveAuth

  // Get existing CL items
  const existingCLItems = (quote.lineItems ?? []).filter(
    (item) => item.pairId === quote.activePairId && item.category === 'contact_lens'
  )

  // Calculate how much allowance is already used
  const usedAllowance = existingCLItems
    .filter(item => item.category === 'contact_lens')
    .reduce((sum, item) => sum + (item.insurancePays || 0), 0)
  const remainingAllowance = Math.max(0, contactAllowance - usedAllowance)

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

  // Check if meets annual supply threshold
  const meetsAnnualSupply = (lens: ContactLens, totalBoxes: number): boolean => {
    const threshold = lens.annualSupplyBothEyes || 8 // Default to 8 if not set
    return totalBoxes >= threshold
  }

  // Get annual supply discount amount
  const getAnnualSupplyDiscount = (lens: ContactLens, totalBoxes: number): number => {
    if (!meetsAnnualSupply(lens, totalBoxes)) return 0
    const modality = lens.modality || 'daily'
    return ANNUAL_SUPPLY_DISCOUNT[modality] || 0
  }

  // Handle lens selection
  const handleSelectLens = (lens: ContactLens) => {
    // Set initial box counts to annual supply recommendation
    const annualBoxes = lens.annualSupplyBothEyes || 8
    const perEye = lens.annualSupplyPerEye || Math.ceil(annualBoxes / 2)
    setSelectedLens({
      lens,
      boxesOD: perEye,
      boxesOS: perEye,
      rebate: 0,
    })
  }

  // Update box count
  const updateBoxCount = (eye: 'OD' | 'OS', delta: number) => {
    if (!selectedLens) return
    setSelectedLens(prev => {
      if (!prev) return prev
      const key = eye === 'OD' ? 'boxesOD' : 'boxesOS'
      const newValue = Math.max(0, prev[key] + delta)
      return { ...prev, [key]: newValue }
    })
  }

  // Update rebate amount
  const updateRebate = (value: number) => {
    if (!selectedLens) return
    setSelectedLens(prev => {
      if (!prev) return prev
      return { ...prev, rebate: Math.max(0, value) }
    })
  }

  // Add lens to order
  const addLensToOrder = () => {
    if (!selectedLens) return

    const { lens, boxesOD, boxesOS, rebate } = selectedLens
    const totalBoxes = boxesOD + boxesOS
    if (totalBoxes === 0) return

    // Calculate pricing with annual supply discount
    const retailTotal = totalBoxes * lens.retailPrice
    const annualDiscount = getAnnualSupplyDiscount(lens, totalBoxes)
    const subtotal = retailTotal - annualDiscount

    // Apply remaining allowance to subtotal
    const insuranceApplied = hasInsurance ? Math.min(remainingAllowance, subtotal) : 0
    const inOfficeTotal = subtotal - insuranceApplied

    // Rebate is post-purchase (mail-in), so it doesn't affect in-office total
    // But we'll store it in the note for reference

    // Remove any existing lens items for this lens
    const existingLensItems = existingCLItems.filter(
      item => item.productId === lens.id && item.category === 'contact_lens'
    )
    existingLensItems.forEach(item => removeLineItem(item.id))

    // Build note with box breakdown and rebate info
    const boxBreakdown: string[] = []
    if (boxesOD > 0) boxBreakdown.push(`${boxesOD} OD`)
    if (boxesOS > 0) boxBreakdown.push(`${boxesOS} OS`)

    let note = `${lens.boxSize}-pk × ${totalBoxes} (${boxBreakdown.join(', ')})`
    if (annualDiscount > 0) note += ` | Annual -$${annualDiscount}`
    if (rebate > 0) note += ` | Rebate -$${rebate}`

    // Add single line item (quantity is 1 since retailPrice is already the total)
    addLineItem({
      productId: lens.id,
      name: `${lens.manufacturer} ${lens.lensName}`,
      category: 'contact_lens',
      subcategory: boxesOD > 0 && boxesOS > 0 ? 'OU' : (boxesOD > 0 ? 'OD' : 'OS'),
      quantity: 1,
      retailPrice: retailTotal,
      patientPays: inOfficeTotal,
      insurancePays: insuranceApplied,
      note,
      pairId: quote.activePairId,
    })

    // Clear selection
    setSelectedLens(null)
  }

  // Check for benefit conflict
  const glassesItemsExist = hasGlassesItems()

  // Get modality label
  const getModalityLabel = (modality: string) => {
    switch (modality) {
      case 'daily': return 'Daily'
      case 'biweekly': return '2-Week'
      case 'monthly': return 'Monthly'
      default: return modality
    }
  }

  return (
    <div className="p-[2%] space-y-[3%]">
      {/* Benefit conflict warning */}
      {glassesItemsExist && hasInsurance && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-300">
            <strong>Benefit Conflict:</strong> Glasses items are in this order. Most vision plans do not cover both contacts and glasses in the same benefit period.
          </span>
        </div>
      )}

      {/* Contact allowance banner */}
      {hasInsurance && contactAllowance > 0 && (
        <div className="flex items-center justify-between p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-400" />
            <span className="text-sm text-emerald-300">
              Contact Lens Allowance: <strong>${contactAllowance.toFixed(2)}</strong>
            </span>
          </div>
          {usedAllowance > 0 && (
            <span className="text-sm text-emerald-300">
              Remaining: <strong>${remainingAllowance.toFixed(2)}</strong>
            </span>
          )}
        </div>
      )}

      {/* Selected Lens Configuration Panel */}
      {selectedLens && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-white">{selectedLens.lens.manufacturer}</h4>
              <p className="text-sm text-white/70">{selectedLens.lens.lensName}</p>
              <p className="text-xs text-white/50">
                {selectedLens.lens.boxSize}-pack • {getModalityLabel(selectedLens.lens.modality)} • ${selectedLens.lens.retailPrice}/box
              </p>
            </div>
            <button
              onClick={() => setSelectedLens(null)}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X className="h-4 w-4 text-white/40" />
            </button>
          </div>

          {/* Box Count Controls */}
          <div className="grid grid-cols-2 gap-4">
            {/* Right Eye */}
            <div className="space-y-2">
              <label className="text-xs text-white/60 uppercase">Right Eye (OD)</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateBoxCount('OD', -1)}
                  disabled={selectedLens.boxesOD === 0}
                  className="h-10 w-10 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-white">{selectedLens.boxesOD}</div>
                  <div className="text-xs text-white/50">boxes</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateBoxCount('OD', 1)}
                  className="h-10 w-10 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Left Eye */}
            <div className="space-y-2">
              <label className="text-xs text-white/60 uppercase">Left Eye (OS)</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateBoxCount('OS', -1)}
                  disabled={selectedLens.boxesOS === 0}
                  className="h-10 w-10 p-0"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-white">{selectedLens.boxesOS}</div>
                  <div className="text-xs text-white/50">boxes</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateBoxCount('OS', 1)}
                  className="h-10 w-10 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Rebate Input */}
          <div className="space-y-2">
            <label className="text-xs text-white/60 uppercase">Manufacturer Rebate</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={selectedLens.rebate || ''}
              onChange={(e) => updateRebate(Number(e.target.value) || 0)}
              placeholder="0"
              className="h-10"
            />
          </div>

          {/* Pricing Summary */}
          {(selectedLens.boxesOD + selectedLens.boxesOS) > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              {(() => {
                const totalBoxes = selectedLens.boxesOD + selectedLens.boxesOS
                const retailTotal = totalBoxes * selectedLens.lens.retailPrice
                const annualDiscount = getAnnualSupplyDiscount(selectedLens.lens, totalBoxes)
                const subtotal = retailTotal - annualDiscount
                const insuranceApplied = hasInsurance ? Math.min(remainingAllowance, subtotal) : 0
                const inOfficeTotal = subtotal - insuranceApplied
                const afterRebate = inOfficeTotal - selectedLens.rebate
                const perBox = totalBoxes > 0 ? afterRebate / totalBoxes : 0
                const threshold = selectedLens.lens.annualSupplyBothEyes || 8

                return (
                  <>
                    {/* Base cost */}
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">{totalBoxes} boxes × ${selectedLens.lens.retailPrice}</span>
                      <span className="text-white">${retailTotal.toFixed(2)}</span>
                    </div>

                    {/* Annual supply discount */}
                    {annualDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Annual supply discount
                        </span>
                        <span className="text-emerald-400">-${annualDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {annualDiscount === 0 && totalBoxes > 0 && (
                      <div className="text-xs text-amber-400/70">
                        Add {threshold - totalBoxes} more box{threshold - totalBoxes !== 1 ? 'es' : ''} for ${ANNUAL_SUPPLY_DISCOUNT[selectedLens.lens.modality || 'daily']} annual discount
                      </div>
                    )}

                    {/* Subtotal */}
                    {annualDiscount > 0 && (
                      <div className="flex justify-between text-sm pt-1 border-t border-white/5">
                        <span className="text-white/60">Subtotal</span>
                        <span className="text-white">${subtotal.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Insurance allowance */}
                    {insuranceApplied > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-400">Insurance allowance</span>
                        <span className="text-emerald-400">-${insuranceApplied.toFixed(2)}</span>
                      </div>
                    )}

                    {/* In-Office Total */}
                    <div className="flex justify-between text-base font-semibold pt-2 border-t border-white/10">
                      <span className="text-white">In-Office Total</span>
                      <span className="text-white">${inOfficeTotal.toFixed(2)}</span>
                    </div>

                    {/* Rebate (if any) */}
                    {selectedLens.rebate > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-400">Manufacturer rebate (mail-in)</span>
                          <span className="text-blue-400">-${selectedLens.rebate.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 -mx-4 px-4 py-2 rounded">
                          <span className="text-white">Final Cost</span>
                          <span className="text-white">${afterRebate.toFixed(2)}</span>
                        </div>
                        <div className="text-center text-sm text-white/60">
                          ${perBox.toFixed(2)} per box
                        </div>
                      </>
                    )}
                  </>
                )
              })()}

              <Button
                onClick={addLensToOrder}
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Order
              </Button>
            </div>
          )}
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
              {mod === 'all' ? 'All' : mod === 'biweekly' ? '2-Week' : mod.charAt(0).toUpperCase() + mod.slice(1)}
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

      {/* Lenses grid - simplified cards for selection */}
      {!loading && lenses.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {lenses.map((lens) => {
            const isInOrder = existingCLItems.some(
              item => item.productId === lens.id && item.category === 'contact_lens'
            )
            const isCurrentSelection = selectedLens?.lens.id === lens.id

            return (
              <button
                key={lens.id}
                onClick={() => handleSelectLens(lens)}
                className={cn(
                  'relative p-3 rounded-xl border-2 transition-all text-left',
                  isCurrentSelection
                    ? 'border-blue-500 bg-blue-500/20'
                    : isInOrder
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 hover:border-white/30 bg-white/5'
                )}
              >
                {isInOrder && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}

                {/* Modality badge */}
                <div className={cn(
                  'text-[10px] font-bold mb-1',
                  lens.modality === 'daily' ? 'text-emerald-400' :
                  lens.modality === 'biweekly' ? 'text-blue-400' : 'text-purple-400'
                )}>
                  {getModalityLabel(lens.modality)}
                </div>

                <h3 className="font-semibold text-sm text-white truncate">{lens.manufacturer}</h3>
                <p className="text-xs text-white/70 truncate">{lens.lensName}</p>

                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">{lens.boxSize}-pack</span>
                    <span className="text-sm font-semibold text-white">${lens.retailPrice}</span>
                  </div>
                  {lens.annualSupplyBothEyes && (
                    <div className="text-[10px] text-emerald-400/70 mt-1">
                      {lens.annualSupplyBothEyes}+ boxes = ${ANNUAL_SUPPLY_DISCOUNT[lens.modality || 'daily']} off
                    </div>
                  )}
                </div>
              </button>
            )
          })}
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
