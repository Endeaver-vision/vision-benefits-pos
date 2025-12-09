'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FrameStockEditor } from './FrameStockEditor'
import { NewFrameForm } from './NewFrameForm'
import {
  Loader2,
  Search,
  ScanBarcode,
  Keyboard,
  ArrowLeft,
  Package,
  Plus
} from 'lucide-react'

interface Frame {
  id: string
  brand: string
  model: string
  color: string
  sku: string | null
  upc: string | null
  locations: string[]
  locationStock: Record<string, number>
  stockQuantity: number
  retailPrice: number
  wholesaleCost: number
}

interface FrameLookupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStockUpdated?: () => void
  initialFrame?: Frame | null
}

export function FrameLookupModal({
  open,
  onOpenChange,
  onStockUpdated,
  initialFrame
}: FrameLookupModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'scan' | 'manual'>('search')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Frame[]>([])

  // Manual entry state
  const [upcInput, setUpcInput] = useState('')
  const [skuInput, setSkuInput] = useState('')

  // Selected frame for editing
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(initialFrame || null)

  // Add new frame state
  const [showAddForm, setShowAddForm] = useState(false)
  const [notFoundUpc, setNotFoundUpc] = useState<string | null>(null)
  const [notFoundSku, setNotFoundSku] = useState<string | null>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setSearchResults([])
      setUpcInput('')
      setSkuInput('')
      setError(null)
      setShowAddForm(false)
      setNotFoundUpc(null)
      setNotFoundSku(null)
      if (!initialFrame) {
        setSelectedFrame(null)
      }
    }
  }, [open, initialFrame])

  // Set initial frame when provided
  useEffect(() => {
    if (initialFrame) {
      setSelectedFrame(initialFrame)
    }
  }, [initialFrame])

  // Search handler
  const handleSearch = async () => {
    if (!searchTerm.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/frames/lookup?search=${encodeURIComponent(searchTerm)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Search failed')
      }

      setSearchResults(data.data || [])
      if (data.data?.length === 0) {
        setError('No frames found matching your search')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  // UPC lookup handler
  const handleUpcLookup = async () => {
    if (!upcInput.trim()) return

    setLoading(true)
    setError(null)
    setNotFoundUpc(null)
    setNotFoundSku(null)

    try {
      const response = await fetch(`/api/frames/lookup?upc=${encodeURIComponent(upcInput.trim())}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          // Frame not found - offer to add it
          setNotFoundUpc(upcInput.trim())
          setError(`No frame found with UPC: ${upcInput.trim()}`)
        } else {
          throw new Error(data.message || 'Lookup failed')
        }
        return
      }

      setSelectedFrame(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  // SKU lookup handler
  const handleSkuLookup = async () => {
    if (!skuInput.trim()) return

    setLoading(true)
    setError(null)
    setNotFoundUpc(null)
    setNotFoundSku(null)

    try {
      const response = await fetch(`/api/frames/lookup?sku=${encodeURIComponent(skuInput.trim())}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          // Frame not found - offer to add it
          setNotFoundSku(skuInput.trim())
          setError(`No frame found with SKU: ${skuInput.trim()}`)
        } else {
          throw new Error(data.message || 'Lookup failed')
        }
        return
      }

      setSelectedFrame(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  // Handle frame selection from search
  const selectFrame = (frame: Frame) => {
    setSelectedFrame(frame)
  }

  // Handle back from editor or add form
  const handleBack = () => {
    setSelectedFrame(null)
    setShowAddForm(false)
    setError(null)
    setNotFoundUpc(null)
    setNotFoundSku(null)
  }

  // Handle save complete
  const handleSaveComplete = () => {
    onStockUpdated?.()
    onOpenChange(false)
  }

  // Barcode scanner input handler (listens for rapid keyboard input)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const lastKeyTime = useRef(0)
  const barcodeBuffer = useRef('')

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now()

    // If Enter key and we have buffer content, it's a complete scan
    if (e.key === 'Enter' && barcodeBuffer.current.length > 5) {
      e.preventDefault()
      setUpcInput(barcodeBuffer.current)
      barcodeBuffer.current = ''
      // Auto-lookup
      setTimeout(() => handleUpcLookup(), 100)
      return
    }

    // Reset buffer if too much time passed (human typing vs scanner)
    if (now - lastKeyTime.current > 100) {
      barcodeBuffer.current = ''
    }

    // Add character to buffer
    if (e.key.length === 1) {
      barcodeBuffer.current += e.key
    }

    lastKeyTime.current = now
  }

  // Focus barcode input when scan tab is active
  useEffect(() => {
    if (activeTab === 'scan' && barcodeInputRef.current && !selectedFrame) {
      barcodeInputRef.current.focus()
    }
  }, [activeTab, selectedFrame])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(selectedFrame || showAddForm) && !initialFrame && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mr-2"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Package className="h-5 w-5" />
            {showAddForm ? 'Add New Frame' : selectedFrame ? 'Edit Frame Stock' : 'Find Frame'}
          </DialogTitle>
        </DialogHeader>

        {showAddForm ? (
          <NewFrameForm
            initialUpc={notFoundUpc || undefined}
            initialSku={notFoundSku || undefined}
            onSuccess={handleSaveComplete}
            onCancel={handleBack}
          />
        ) : selectedFrame ? (
          <FrameStockEditor
            frame={selectedFrame}
            onSave={handleSaveComplete}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="search" className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Search
              </TabsTrigger>
              <TabsTrigger value="scan" className="flex-1">
                <ScanBarcode className="h-4 w-4 mr-2" />
                Scan
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1">
                <Keyboard className="h-4 w-4 mr-2" />
                Manual
              </TabsTrigger>
            </TabsList>

            {/* Search Tab */}
            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by brand, model, color..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Search Results */}
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {searchResults.map((frame) => (
                  <div
                    key={frame.id}
                    className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer transition-all"
                    onClick={() => selectFrame(frame)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-white">
                          {frame.brand} {frame.model}
                        </div>
                        <div className="text-sm text-white/70">{frame.color}</div>
                        <div className="text-xs text-white/50 mt-1">
                          {frame.sku && <span className="mr-3">SKU: {frame.sku}</span>}
                          {frame.upc && <span>UPC: {frame.upc}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-lg font-bold">{frame.stockQuantity}</div>
                        <div className="flex gap-1">
                          {frame.locations?.map((loc) => (
                            <Badge
                              key={loc}
                              variant="outline"
                              className={
                                loc.toLowerCase() === 'insight'
                                  ? 'border-purple-500 text-purple-400 text-xs'
                                  : 'border-blue-500 text-blue-400 text-xs'
                              }
                            >
                              {loc}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Scan Tab */}
            <TabsContent value="scan" className="space-y-4">
              <div className="text-center p-8 border border-dashed border-white/20 rounded-xl">
                <ScanBarcode className="h-16 w-16 mx-auto text-white/40 mb-4" />
                <p className="text-white/70 mb-4">
                  Scan a barcode or type the UPC below
                </p>
                <Input
                  ref={barcodeInputRef}
                  placeholder="Scan or type UPC..."
                  value={upcInput}
                  onChange={(e) => setUpcInput(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  className="text-center text-lg max-w-xs mx-auto"
                  autoFocus
                />
                <Button
                  className="mt-4"
                  onClick={handleUpcLookup}
                  disabled={loading || !upcInput.trim()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Look Up
                </Button>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
                  <p className="text-amber-400">{error}</p>
                  {notFoundUpc && (
                    <Button onClick={() => setShowAddForm(true)} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Frame
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Manual Entry Tab - Direct add form */}
            <TabsContent value="manual" className="space-y-4">
              <NewFrameForm
                onSuccess={handleSaveComplete}
                onCancel={() => onOpenChange(false)}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
