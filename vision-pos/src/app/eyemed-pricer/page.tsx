'use client'

import { useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { FileUp, Loader2, User, DollarSign, Save, ExternalLink, CheckCircle } from 'lucide-react'
import AppNavigation from '@/components/layout/app-navigation'
import { PatientSelectorStep, type SelectedPatient } from '@/components/pricer/patient-selector-step'
import {
  EYEMED_PRODUCTS,
  calcPatientCost,
  type ExtractedBenefits,
  type PricedProduct
} from '@/lib/pricing/eyemed-pricer'

type Status = 'idle' | 'loading' | 'extracting' | 'done' | 'error'

interface SavedVersion {
  id: string
  version: number
  versionLabel: string
}

function EyeMedPricerContent() {
  const searchParams = useSearchParams()
  const preSelectedCustomerId = searchParams.get('customerId')

  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')
  const [benefits, setBenefits] = useState<ExtractedBenefits | null>(null)
  const [priceList, setPriceList] = useState<PricedProduct[]>([])
  const [rawJSON, setRawJSON] = useState<string>('')
  const [showRaw, setShowRaw] = useState(false)

  // Patient selection and save state
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null)
  const [savedVersion, setSavedVersion] = useState<SavedVersion | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

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

      // Call extraction API
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

      // Calculate prices for all products
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
    // Only set to false if leaving the drop zone entirely
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
    if (!selectedPatient || !benefits || priceList.length === 0) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/eyemed/save-price-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedPatient.id,
          planName: benefits.plan_name,
          extractedBenefits: benefits,
          pricedProducts: priceList
        })
      })

      const data = await response.json()
      if (data.success) {
        setSavedVersion({
          id: data.version.id,
          version: data.version.version,
          versionLabel: data.version.versionLabel
        })
      } else {
        setErrorMsg(data.error || 'Failed to save price list')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save price list')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearPatient = () => {
    setSelectedPatient(null)
    resetUpload()
  }

  const fmt = (n: number) => n === 0 ? '$0' : `$${n.toFixed(2)}`
  const categories = [...new Set(priceList.map(p => p.category))]

  return (
    <div className="min-h-screen">
      <AppNavigation
        title="EyeMed Pricer"
        subtitle="Upload authorization PDF to calculate patient prices"
        showNavigation={true}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Patient Selection + Back to Profile */}
        <div className="mb-6 flex items-start gap-4">
          <div className="flex-1">
            <PatientSelectorStep
              onSelect={setSelectedPatient}
              selectedPatient={selectedPatient}
              onClear={handleClearPatient}
              preSelectedCustomerId={preSelectedCustomerId}
            />
          </div>
          {selectedPatient && (
            <a
              href={`/customers/${selectedPatient.id}?tab=price-plan`}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4" />
              Back to Profile
            </a>
          )}
        </div>

        {/* Upload State - Only show when patient selected */}
        {selectedPatient && status === 'idle' && (
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
            <CardContent className="py-16">
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileInput}
                  className="hidden"
                  data-testid="pdf-upload"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className={`h-20 w-20 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isDragging ? 'bg-blue-400/30 scale-110' : 'bg-blue-500/20'
                  }`}>
                    <FileUp className={`h-10 w-10 transition-colors duration-200 ${
                      isDragging ? 'text-blue-300' : 'text-blue-400'
                    }`} />
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {isDragging ? 'Drop PDF Here' : 'Upload EyeMed Authorization'}
                    </h2>
                    <p className="text-white/70">
                      {isDragging
                        ? 'Release to upload the PDF'
                        : 'Drag and drop or click to select the EyeMed benefit PDF'
                      }
                    </p>
                  </div>
                  {!isDragging && (
                    <div className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors">
                      Choose PDF File
                    </div>
                  )}
                </div>
              </label>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {(status === 'loading' || status === 'extracting') && (
          <Card className="glass-card border-white/20">
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-white">
                    {status === 'loading' ? 'Reading PDF...' : 'Extracting benefits...'}
                  </h2>
                  <p className="text-white/70 mt-2">{fileName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {status === 'error' && (
          <Card className="glass-card border-red-500/30">
            <CardContent className="py-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
                <p className="text-white/70 mb-4">{errorMsg}</p>
                <button
                  onClick={resetUpload}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
                >
                  Try Again
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success State - Show price list */}
        {status === 'done' && benefits && (
          <div className="space-y-6">
            {/* Patient Header with Navigation */}
            <Card className="glass-card border-emerald-500/30">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <User className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {benefits.patient_name || selectedPatient?.firstName + ' ' + selectedPatient?.lastName || 'Unknown Patient'}
                      </h2>
                      <p className="text-white/70">{benefits.plan_name || 'Unknown Plan'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {benefits.member_id && (
                        <p className="text-white/70 text-sm">ID: {benefits.member_id}</p>
                      )}
                      {benefits.patient_age && (
                        <p className="text-white/70 text-sm">Age: {benefits.patient_age}</p>
                      )}
                    </div>
                    {selectedPatient && (
                      <a
                        href={`/customers/${selectedPatient.id}?tab=price-plan`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Profile
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefit Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Card className="glass-card border-white/20">
                <CardContent className="py-4">
                  <p className="text-xs text-white/50 uppercase tracking-wide">Exam Copay</p>
                  <p className="text-xl font-bold text-white mt-1">{fmt(benefits.exam_copay ?? 0)}</p>
                </CardContent>
              </Card>
              <Card className="glass-card border-white/20">
                <CardContent className="py-4">
                  <p className="text-xs text-white/50 uppercase tracking-wide">Frame Allow</p>
                  <p className="text-xl font-bold text-white mt-1">{fmt(benefits.frame_allowance ?? 0)}</p>
                </CardContent>
              </Card>
              <Card className="glass-card border-white/20">
                <CardContent className="py-4">
                  <p className="text-xs text-white/50 uppercase tracking-wide">CL Allow</p>
                  <p className="text-xl font-bold text-white mt-1">{fmt(benefits.contacts_allowance ?? 0)}</p>
                </CardContent>
              </Card>
              <Card className="glass-card border-white/20">
                <CardContent className="py-4">
                  <p className="text-xs text-white/50 uppercase tracking-wide">SV Lens</p>
                  <p className="text-xl font-bold text-white mt-1">{fmt(benefits.lens_sv ?? 0)}</p>
                </CardContent>
              </Card>
              <Card className="glass-card border-white/20">
                <CardContent className="py-4">
                  <p className="text-xs text-white/50 uppercase tracking-wide">Prog Std</p>
                  <p className="text-xl font-bold text-white mt-1">{benefits.progressive_standard != null ? fmt(benefits.progressive_standard) : '—'}</p>
                </CardContent>
              </Card>
              <Card className="glass-card border-white/20">
                <CardContent className="py-4">
                  <p className="text-xs text-white/50 uppercase tracking-wide">CL Fit</p>
                  <p className="text-xl font-bold text-white mt-1">{benefits.cl_fit_standard != null ? fmt(benefits.cl_fit_standard) : '—'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Price Table */}
            <Card className="glass-card border-white/20 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-white/10">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-white">Patient Price List</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-6 py-3 text-left text-white/70 font-semibold">Product</th>
                        <th className="px-4 py-3 text-right text-white/70 font-semibold">Retail</th>
                        <th className="px-4 py-3 text-right text-white/70 font-semibold">Patient Cost</th>
                        <th className="px-6 py-3 text-left text-white/50 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat, ci) => {
                        const rows = priceList.filter(p => p.category === cat)
                        return (
                          <React.Fragment key={cat}>
                            <tr>
                              <td colSpan={4} className={`px-6 py-2 text-xs font-bold uppercase tracking-wider ${ci % 2 === 0 ? 'bg-blue-500/10 text-blue-300' : 'bg-purple-500/10 text-purple-300'} border-t border-white/10`}>
                                {cat}
                              </td>
                            </tr>
                            {rows.map((p, ri) => (
                              <tr key={p.name} className={`${ri % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'} hover:bg-white/[0.08] transition-colors`}>
                                <td className={`px-6 py-2 ${p.type === 'cash_only' ? 'text-red-400 font-semibold' : 'text-white'}`}>
                                  {p.name}
                                </td>
                                <td className="px-4 py-2 text-right text-white/60">{fmt(p.retail)}</td>
                                <td className={`px-4 py-2 text-right font-bold ${p.type === 'cash_only' ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {fmt(p.patientCost)}
                                </td>
                                <td className="px-6 py-2 text-white/50 text-xs italic">{p.note}</td>
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
            {selectedPatient && !savedVersion && (
              <Card className="glass-card border-white/20">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Save this price list?</p>
                      <p className="text-white/60 text-sm">
                        This will save to {selectedPatient.firstName}&apos;s profile for future reference
                      </p>
                    </div>
                    <button
                      onClick={handleSavePriceList}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save to Profile
                        </>
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Saved Success - Prominent confirmation */}
            {savedVersion && (
              <Card className="glass-card border-emerald-500 bg-emerald-500/10">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-emerald-400 mb-2">
                        Price List Saved Successfully!
                      </h3>
                      <p className="text-white/80">
                        Saved as <span className="font-semibold text-white">{savedVersion.versionLabel}</span> to {selectedPatient?.firstName}&apos;s profile
                      </p>
                      <p className="text-white/60 text-sm mt-1">
                        {benefits?.plan_name && `Plan: ${benefits.plan_name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <a
                        href={`/customers/${selectedPatient?.id}?tab=price-plan`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors"
                      >
                        <ExternalLink className="w-5 h-5" />
                        View Price List
                      </a>
                      <button
                        onClick={resetUpload}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 font-semibold transition-colors"
                      >
                        <FileUp className="w-5 h-5" />
                        Upload Another
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions - only show when not yet saved */}
            {!savedVersion && (
              <div className="flex items-center justify-between">
                <button
                  onClick={resetUpload}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-semibold transition-colors"
                >
                  New Upload
                </button>
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="text-white/50 hover:text-white/80 text-sm underline"
                >
                  {showRaw ? 'Hide' : 'Show'} raw JSON
                </button>
              </div>
            )}

            {/* Debug JSON toggle - always available */}
            {savedVersion && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="text-white/50 hover:text-white/80 text-sm underline"
                >
                  {showRaw ? 'Hide' : 'Show'} raw JSON
                </button>
              </div>
            )}

            {/* Raw JSON */}
            {showRaw && (
              <Card className="glass-card border-white/20">
                <CardContent className="py-4">
                  <pre className="text-xs text-emerald-400 overflow-auto max-h-96 font-mono">
                    {rawJSON}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

// Need to import React for JSX fragments
import React from 'react'

export default function EyeMedPricerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <EyeMedPricerContent />
    </Suspense>
  )
}
