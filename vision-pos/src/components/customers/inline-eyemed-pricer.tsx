'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { FileUp, Loader2, User, DollarSign, Save, CheckCircle } from 'lucide-react'
import {
  EYEMED_PRODUCTS,
  calcPatientCost,
  type ExtractedBenefits,
  type PricedProduct
} from '@/lib/pricing/eyemed-pricer'

type Status = 'idle' | 'loading' | 'extracting' | 'done' | 'error'

interface InlineEyemedPricerProps {
  customerId: string
  customer: { firstName: string; lastName: string }
  onPriceListSaved: () => void
}

export function InlineEyemedPricer({ customerId, customer, onPriceListSaved }: InlineEyemedPricerProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')
  const [benefits, setBenefits] = useState<ExtractedBenefits | null>(null)
  const [priceList, setPriceList] = useState<PricedProduct[]>([])
  const [rawJSON, setRawJSON] = useState<string>('')
  const [showRaw, setShowRaw] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [savedVersion, setSavedVersion] = useState<{ versionLabel: string } | null>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please upload a PDF file')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMsg('')
    setFileName(file.name)
    setBenefits(null)
    setPriceList([])

    try {
      // Convert PDF to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1])
        }
        reader.onerror = () => reject(new Error('File read failed'))
        reader.readAsDataURL(file)
      })

      setStatus('extracting')

      // Call extraction API - SAME as standalone pricer
      const response = await fetch('/api/eyemed-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64 }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || `API error: ${response.status}`)
      }

      const data = await response.json()
      const extractedBenefits = data.benefits as ExtractedBenefits
      setBenefits(extractedBenefits)
      setRawJSON(JSON.stringify(extractedBenefits, null, 2))

      // Calculate prices - SAME logic as standalone pricer via shared utility
      const list = EYEMED_PRODUCTS.map(p => {
        const { cost, note } = calcPatientCost(p, extractedBenefits)
        return { ...p, patientCost: Math.round(cost * 100) / 100, note }
      })
      setPriceList(list)
      setStatus('done')

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const resetUpload = useCallback(() => {
    setStatus('idle')
    setFileName('')
    setErrorMsg('')
    setBenefits(null)
    setPriceList([])
    setRawJSON('')
    setShowRaw(false)
    setSavedVersion(null)
  }, [])

  const handleSavePriceList = async () => {
    if (!benefits || priceList.length === 0) return

    setIsSaving(true)
    try {
      // Call save API - SAME as standalone pricer
      const response = await fetch('/api/eyemed/save-price-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          planName: benefits.plan_name,
          extractedBenefits: benefits,
          pricedProducts: priceList
        })
      })

      const data = await response.json()
      if (data.success) {
        setSavedVersion({ versionLabel: data.version.versionLabel })
        // Notify parent to refresh versions
        onPriceListSaved()
      } else {
        setErrorMsg(data.error || 'Failed to save price list')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save price list')
    } finally {
      setIsSaving(false)
    }
  }

  const fmt = (n: number) => n === 0 ? '$0' : `$${n.toFixed(2)}`
  const categories = [...new Set(priceList.map(p => p.category))]

  // Upload State
  if (status === 'idle') {
    return (
      <Card
        className={`glass-card transition-all duration-200 ${
          isDragging
            ? 'border-blue-400 border-2 bg-blue-500/10'
            : 'border-white/20'
        }`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="py-12">
          <label className="cursor-pointer block">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
              data-testid="eyemed-pdf-upload"
            />
            <div className="flex flex-col items-center gap-4">
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                isDragging ? 'bg-blue-400/30 scale-110' : 'bg-blue-500/20'
              }`}>
                <FileUp className={`h-8 w-8 transition-colors duration-200 ${
                  isDragging ? 'text-blue-300' : 'text-blue-400'
                }`} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-1">
                  {isDragging ? 'Drop PDF Here' : 'Upload EyeMed Authorization'}
                </h3>
                <p className="text-white/70 text-sm">
                  {isDragging
                    ? 'Release to upload'
                    : 'Drag and drop or click to select the EyeMed benefit PDF'
                  }
                </p>
              </div>
              {!isDragging && (
                <div className="mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors text-sm">
                  Choose PDF File
                </div>
              )}
            </div>
          </label>
        </CardContent>
      </Card>
    )
  }

  // Loading State
  if (status === 'loading' || status === 'extracting') {
    return (
      <Card className="glass-card border-white/20">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white">
                {status === 'loading' ? 'Reading PDF...' : 'Extracting benefits...'}
              </h3>
              <p className="text-white/70 mt-1 text-sm">{fileName}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error State
  if (status === 'error') {
    return (
      <Card className="glass-card border-red-500/30">
        <CardContent className="py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Error</h3>
            <p className="text-white/70 mb-4 text-sm">{errorMsg}</p>
            <button
              onClick={resetUpload}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Success State - Show price list
  if (status === 'done' && benefits) {
    return (
      <div className="space-y-4">
        {/* Patient Header */}
        <Card className="glass-card border-emerald-500/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {benefits.patient_name || `${customer.firstName} ${customer.lastName}`} - EyeMed Benefits
                  </h3>
                  <p className="text-white/70 text-sm">{benefits.plan_name || 'Unknown Plan'}</p>
                </div>
              </div>
              <div className="text-right text-sm">
                {benefits.member_id && (
                  <p className="text-white/70">ID: {benefits.member_id}</p>
                )}
                {benefits.patient_age && (
                  <p className="text-white/70">Age: {benefits.patient_age}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefit Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="glass-card border-white/20">
            <CardContent className="py-3">
              <p className="text-xs text-white/50 uppercase tracking-wide">Exam Copay</p>
              <p className="text-lg font-bold text-white mt-1">{fmt(benefits.exam_copay ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-white/20">
            <CardContent className="py-3">
              <p className="text-xs text-white/50 uppercase tracking-wide">Frame Allow</p>
              <p className="text-lg font-bold text-white mt-1">{fmt(benefits.frame_allowance ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-white/20">
            <CardContent className="py-3">
              <p className="text-xs text-white/50 uppercase tracking-wide">CL Allow</p>
              <p className="text-lg font-bold text-white mt-1">{fmt(benefits.contacts_allowance ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-white/20">
            <CardContent className="py-3">
              <p className="text-xs text-white/50 uppercase tracking-wide">SV Lens</p>
              <p className="text-lg font-bold text-white mt-1">{fmt(benefits.lens_sv ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-white/20">
            <CardContent className="py-3">
              <p className="text-xs text-white/50 uppercase tracking-wide">Prog Std</p>
              <p className="text-lg font-bold text-white mt-1">{benefits.progressive_standard != null ? fmt(benefits.progressive_standard) : '—'}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-white/20">
            <CardContent className="py-3">
              <p className="text-xs text-white/50 uppercase tracking-wide">CL Fit</p>
              <p className="text-lg font-bold text-white mt-1">{benefits.cl_fit_standard != null ? fmt(benefits.cl_fit_standard) : '—'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Price Table */}
        <Card className="glass-card border-white/20 overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <h3 className="text-base font-semibold text-white">Patient Price List</h3>
            </div>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900/95">
                  <tr className="bg-white/5">
                    <th className="px-4 py-2 text-left text-white/70 font-semibold text-xs">Product</th>
                    <th className="px-3 py-2 text-right text-white/70 font-semibold text-xs">Retail</th>
                    <th className="px-3 py-2 text-right text-white/70 font-semibold text-xs">Patient Cost</th>
                    <th className="px-4 py-2 text-left text-white/50 font-medium text-xs">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, ci) => {
                    const rows = priceList.filter(p => p.category === cat)
                    return (
                      <React.Fragment key={cat}>
                        <tr>
                          <td colSpan={4} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${ci % 2 === 0 ? 'bg-blue-500/10 text-blue-300' : 'bg-purple-500/10 text-purple-300'} border-t border-white/10`}>
                            {cat}
                          </td>
                        </tr>
                        {rows.map((p, ri) => (
                          <tr key={p.name} className={`${ri % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'} hover:bg-white/[0.08] transition-colors`}>
                            <td className={`px-4 py-1.5 text-xs ${p.type === 'cash_only' ? 'text-red-400 font-semibold' : 'text-white'}`}>
                              {p.name}
                            </td>
                            <td className="px-3 py-1.5 text-right text-white/60 text-xs">{fmt(p.retail)}</td>
                            <td className={`px-3 py-1.5 text-right font-bold text-xs ${p.type === 'cash_only' ? 'text-red-400' : 'text-emerald-400'}`}>
                              {fmt(p.patientCost)}
                            </td>
                            <td className="px-4 py-1.5 text-white/50 text-xs italic">{p.note}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Save to Patient Profile */}
        {!savedVersion && (
          <Card className="glass-card border-white/20">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">Save this price list?</p>
                  <p className="text-white/60 text-xs">
                    This will save to {customer.firstName}&apos;s profile
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetUpload}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-semibold transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePriceList}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save to Profile
                      </>
                    )}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saved Success */}
        {savedVersion && (
          <Card className="glass-card border-emerald-500 bg-emerald-500/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-emerald-400">
                    Price List Saved!
                  </h3>
                  <p className="text-white/70 text-sm">
                    Saved as {savedVersion.versionLabel}
                  </p>
                </div>
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 font-semibold transition-colors text-sm"
                >
                  Upload Another
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug JSON toggle */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-white/50 hover:text-white/80 text-xs underline"
          >
            {showRaw ? 'Hide' : 'Show'} raw JSON
          </button>
        </div>

        {/* Raw JSON */}
        {showRaw && (
          <Card className="glass-card border-white/20">
            <CardContent className="py-3">
              <pre className="text-xs text-emerald-400 overflow-auto max-h-64 font-mono">
                {rawJSON}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return null
}
