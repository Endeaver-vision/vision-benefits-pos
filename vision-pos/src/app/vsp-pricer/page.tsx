'use client'

import { useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { FileUp, Loader2, User, DollarSign, CheckCircle, AlertTriangle, Info, X, FileText, Save, ExternalLink } from 'lucide-react'
import AppNavigation from '@/components/layout/app-navigation'
import { PatientSelectorStep, type SelectedPatient } from '@/components/pricer/patient-selector-step'
import type { VspMergedAuthorization } from '@/types/vsp-authorization'

type Status = 'idle' | 'uploading' | 'extracting' | 'pricing' | 'done' | 'error'

interface SavedVersion {
  id: string
  version: number
  versionLabel: string
}

interface PriceListItem {
  section: string
  productId: string
  productName: string
  retail: number
  copay: number
  patientCost: number
  // SV/Multi variance
  svCopay?: number
  multiCopay?: number
  hasVariance?: boolean
  notes: string[]
  isCashOnly: boolean
  isNotCovered: boolean
}

interface PriceListResponse {
  success: boolean
  patientInfo: {
    name: string
    authNumber: string
    effectiveDate: string | null
    expirationDate: string | null
  }
  planInfo: {
    planType: string
    materialCopay: number
    frameAllowance: number
    hasEasyOptions: boolean
    isComputerVisioncare: boolean
  }
  priceList: Record<string, PriceListItem[]>
  summary: {
    totalProducts: number
    coveredProducts: number
    cashOnlyProducts: number
    notCoveredProducts: number
  }
}

function VspPricerContent() {
  const searchParams = useSearchParams()
  const preSelectedCustomerId = searchParams.get('customerId')

  const [status, setStatus] = useState<Status>('idle')
  const [authFileName, setAuthFileName] = useState<string>('')
  const [enhancementFileName, setEnhancementFileName] = useState<string>('')
  const [authBase64, setAuthBase64] = useState<string>('')
  const [enhancementBase64, setEnhancementBase64] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')
  const [authorization, setAuthorization] = useState<VspMergedAuthorization | null>(null)
  const [priceListData, setPriceListData] = useState<PriceListResponse | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<{name: string, base64: string}[]>([])
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Patient selection and save state
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null)
  const [savedVersion, setSavedVersion] = useState<SavedVersion | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    const newPending: {name: string, base64: string}[] = []
    for (const file of files) {
      const base64 = await fileToBase64(file)
      newPending.push({ name: file.name, base64 })
    }
    setPendingFiles(prev => [...prev, ...newPending])
  }, [])

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newPending: {name: string, base64: string}[] = []
    for (const file of Array.from(files)) {
      const base64 = await fileToBase64(file)
      newPending.push({ name: file.name, base64 })
    }
    setPendingFiles(prev => [...prev, ...newPending])
    e.target.value = ''
  }, [])

  const assignFileAs = (fileIndex: number, type: 'auth' | 'enhancement') => {
    const file = pendingFiles[fileIndex]
    if (!file) return

    if (type === 'auth') {
      setAuthFileName(file.name)
      setAuthBase64(file.base64)
    } else {
      setEnhancementFileName(file.name)
      setEnhancementBase64(file.base64)
    }
    setPendingFiles(prev => prev.filter((_, i) => i !== fileIndex))
  }

  const removePendingFile = (fileIndex: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== fileIndex))
  }

  const removeAuthFile = () => {
    setAuthFileName('')
    setAuthBase64('')
  }

  const removeEnhancementFile = () => {
    setEnhancementFileName('')
    setEnhancementBase64('')
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsDataURL(file)
    })
  }

  const handleExtract = useCallback(async () => {
    if (!authBase64 || !enhancementBase64) {
      setErrorMsg('Please upload both Auth Form and Enhancement Form PDFs')
      return
    }

    setStatus('extracting')
    setErrorMsg('')

    try {
      // Call extraction API
      const extractResponse = await fetch('/api/vsp/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authFormBase64: authBase64,
          enhancementFormBase64: enhancementBase64,
        }),
      })

      if (!extractResponse.ok) {
        const err = await extractResponse.json()
        throw new Error(err.error || 'Extraction failed')
      }

      const extractResult = await extractResponse.json()
      if (!extractResult.success) {
        throw new Error(extractResult.errors?.join(', ') || 'Extraction failed')
      }

      setAuthorization(extractResult.authorization)
      setStatus('pricing')

      // Call pricing API
      const priceResponse = await fetch('/api/vsp/price-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorization: extractResult.authorization,
        }),
      })

      if (!priceResponse.ok) {
        const err = await priceResponse.json()
        throw new Error(err.error || 'Pricing failed')
      }

      const priceResult = await priceResponse.json()
      if (!priceResult.success) {
        throw new Error('Pricing failed')
      }

      setPriceListData(priceResult)
      setStatus('done')

    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [authBase64, enhancementBase64])

  const resetForm = () => {
    setStatus('idle')
    setAuthFileName('')
    setEnhancementFileName('')
    setAuthBase64('')
    setEnhancementBase64('')
    setAuthorization(null)
    setPriceListData(null)
    setErrorMsg('')
    setSavedVersion(null)
  }

  const handleSavePriceList = async () => {
    if (!selectedPatient || !authorization || !priceListData) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/vsp/save-price-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedPatient.id,
          planName: authorization.planInfo.planType,
          authorization,
          priceList: priceListData.priceList
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
    resetForm()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <AppNavigation />
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">VSP Pricer</h1>
          <p className="text-white/60">Upload VSP authorization documents to calculate patient prices</p>
        </div>

        {/* Step 1: Patient Selection */}
        <div className="mb-6">
          <PatientSelectorStep
            onSelect={setSelectedPatient}
            selectedPatient={selectedPatient}
            onClear={handleClearPatient}
            preSelectedCustomerId={preSelectedCustomerId}
          />
        </div>

        {/* Drag & Drop Upload Zone - Only show when patient selected */}
        {selectedPatient && (status === 'idle' || status === 'error') && (
          <>
            <Card className="bg-gray-800/50 border-gray-700 mb-6">
              <CardContent className="p-6">
                {/* Drop Zone */}
                <div
                  ref={dropZoneRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
                    isDragging
                      ? 'border-blue-400 bg-blue-500/10 scale-[1.02]'
                      : authBase64 && enhancementBase64
                        ? 'border-green-500 bg-green-500/5'
                        : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  {/* Drop zone content */}
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                      isDragging ? 'bg-blue-500/20' : 'bg-gray-700/50'
                    }`}>
                      <FileUp className={`w-8 h-8 ${isDragging ? 'text-blue-400' : 'text-gray-400'}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {isDragging ? 'Drop your PDFs here' : 'Drag & Drop VSP Documents'}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Drop both PDFs, then assign which is Auth and which is Enhancement
                    </p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg cursor-pointer transition-colors">
                      <FileText className="w-4 h-4" />
                      Browse Files
                      <input
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Pending Files - Need Assignment */}
                  {pendingFiles.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <p className="text-center text-amber-400 text-sm font-medium">Assign each file:</p>
                      {pendingFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                          <FileText className="w-5 h-5 text-amber-400 flex-shrink-0" />
                          <span className="text-white text-sm truncate flex-1">{file.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => assignFileAs(idx, 'auth')}
                              disabled={!!authBase64}
                              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                                authBase64
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              Auth Form
                            </button>
                            <button
                              onClick={() => assignFileAs(idx, 'enhancement')}
                              disabled={!!enhancementBase64}
                              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                                enhancementBase64
                                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-purple-600 text-white hover:bg-purple-700'
                              }`}
                            >
                              Enhancement
                            </button>
                            <button
                              onClick={() => removePendingFile(idx)}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors"
                            >
                              <X className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Assigned Files */}
                  {(authFileName || enhancementFileName) && (
                    <div className="mt-6 flex flex-wrap gap-3 justify-center">
                      {/* Auth File Chip */}
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                        authFileName ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-gray-700/50 border border-gray-600'
                      }`}>
                        {authFileName ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-300 text-sm font-medium">Auth:</span>
                            <span className="text-white text-sm truncate max-w-[200px]">{authFileName}</span>
                            <button
                              onClick={removeAuthFile}
                              className="ml-1 p-0.5 hover:bg-blue-500/30 rounded-full transition-colors"
                            >
                              <X className="w-4 h-4 text-blue-400" />
                            </button>
                          </>
                        ) : (
                          <>
                            <FileUp className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-400 text-sm">Auth Form needed</span>
                          </>
                        )}
                      </div>

                      {/* Enhancement File Chip */}
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                        enhancementFileName ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-gray-700/50 border border-gray-600'
                      }`}>
                        {enhancementFileName ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-purple-400" />
                            <span className="text-purple-300 text-sm font-medium">Enhancement:</span>
                            <span className="text-white text-sm truncate max-w-[200px]">{enhancementFileName}</span>
                            <button
                              onClick={removeEnhancementFile}
                              className="ml-1 p-0.5 hover:bg-purple-500/30 rounded-full transition-colors"
                            >
                              <X className="w-4 h-4 text-purple-400" />
                            </button>
                          </>
                        ) : (
                          <>
                            <FileUp className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-400 text-sm">Enhancement Form needed</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Extract Button */}
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleExtract}
                    disabled={!authBase64 || !enhancementBase64}
                    className={`px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                      authBase64 && enhancementBase64
                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <DollarSign className="w-5 h-5" />
                    Extract & Generate Price List
                  </button>
                </div>
              </CardContent>
            </Card>

            {status === 'error' && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Error
                </p>
                <p className="text-red-300 text-sm mt-1">{errorMsg}</p>
              </div>
            )}
          </>
        )}

        {/* Loading State */}
        {(status === 'extracting' || status === 'pricing') && (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-8 flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
              <p className="text-white font-medium">
                {status === 'extracting' ? 'Extracting benefits from PDFs...' : 'Calculating prices...'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {status === 'extracting' ? 'Using Claude AI to read documents' : 'Applying VSP copay rules'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {status === 'done' && authorization && priceListData && (
          <>
            {/* Patient Info Banner */}
            <Card className="bg-gray-800/50 border-gray-700 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-600/30 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{authorization.patientInfo.name}</h2>
                    <p className="text-white/70 capitalize">{authorization.planInfo.planType.replace(/_/g, ' ')} Plan</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-white/50 text-sm">Auth #: {authorization.patientInfo.authNumber}</p>
                    <p className="text-white/50 text-sm">
                      {authorization.patientInfo.effectiveDate} - {authorization.patientInfo.expirationDate}
                    </p>
                  </div>
                </div>

                {/* Key Benefits Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-white/50 text-xs uppercase">Exam Copay</p>
                    <p className="text-white font-bold text-lg">${authorization.copays.exam}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-white/50 text-xs uppercase">Material Copay</p>
                    <p className="text-white font-bold text-lg">${authorization.copays.material}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-white/50 text-xs uppercase">Frame Allow</p>
                    <p className="text-white font-bold text-lg">${authorization.frameAllowance.amount}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-white/50 text-xs uppercase">CL Allow</p>
                    <p className="text-white font-bold text-lg">
                      {authorization.contactLens.materialsAllowance != null
                        ? `$${authorization.contactLens.materialsAllowance}`
                        : authorization.contactLens.combinedAllowance != null
                          ? `$${authorization.contactLens.combinedAllowance}`
                          : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-white/50 text-xs uppercase">EasyOptions</p>
                    <p className="text-white font-bold text-lg">{authorization.easyOptions?.enabled ? 'Yes' : 'No'}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${authorization.flags.hasEmc ? 'bg-green-700/50' : 'bg-gray-700/50'}`}>
                    <p className="text-white/50 text-xs uppercase">EMC</p>
                    <p className={`font-bold text-lg ${authorization.flags.hasEmc ? 'text-green-400' : 'text-white'}`}>
                      {authorization.flags.hasEmc ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-white/50 text-xs uppercase">Computer Vision</p>
                    <p className="text-white font-bold text-lg">{authorization.flags.isComputerVisioncare ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <p className="text-white/50 text-xs uppercase">CL Exam Copay</p>
                    <p className="text-white font-bold text-lg">
                      {authorization.contactLens.examCopay != null ? `$${authorization.contactLens.examCopay}` : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Progressive Tier Copays */}
                <div className="mt-4 p-4 bg-gray-700/30 rounded-lg">
                  <h4 className="text-white/70 text-sm font-medium mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Progressive Tier Base Copays
                  </h4>
                  <div className="grid grid-cols-5 gap-2 text-center text-sm">
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-gray-400">K (Standard)</p>
                      <p className="text-green-400 font-bold">${authorization.progressives.K_standard}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-gray-400">J (Premium)</p>
                      <p className="text-yellow-400 font-bold">${authorization.progressives.J_premium}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-gray-400">F (Prem Adv)</p>
                      <p className="text-yellow-400 font-bold">${authorization.progressives.F_premium_adv}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-gray-400">O (Custom)</p>
                      <p className="text-orange-400 font-bold">${authorization.progressives.O_custom}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded p-2">
                      <p className="text-gray-400">N (Varilux X)</p>
                      <p className="text-orange-400 font-bold">${authorization.progressives.N_custom}</p>
                    </div>
                  </div>
                </div>

                {/* EMC Available Banner */}
                {authorization.flags.hasEmc && (
                  <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-green-400 font-medium">EMC Available - Enhanced Medical Coverage</p>
                      <p className="text-green-300/80 text-sm mt-1">
                        {authorization.flags.emcType && (
                          <span className="capitalize">{authorization.flags.emcType.replace(/_/g, ' ')}</span>
                        )}
                        {authorization.flags.emcExamCopay != null && (
                          <span className="ml-2">• EMC Exam Copay: ${authorization.flags.emcExamCopay}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Warnings for Computer VisionCare */}
                {authorization.flags.isComputerVisioncare && (
                  <div className="mt-4 p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-400 font-medium">Computer VisionCare Plan</p>
                      <p className="text-amber-300/80 text-sm mt-1">
                        Photochromics and Polarized lenses are NOT COVERED under this plan.
                        {authorization.flags.computerRxRequirement && (
                          <span className="block mt-1">{authorization.flags.computerRxRequirement}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* LENS MATRIX - Full Material × Lens Type Grid */}
            <Card className="bg-gray-800/50 border-gray-700 mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  Lens + Material Matrix
                  <span className="text-xs text-white/50 font-normal ml-2">(includes ${authorization.copays.material} material copay)</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/70">
                        <th className="text-left py-2 px-3 bg-gray-700/50 rounded-tl-lg">Material</th>
                        <th className="text-center py-2 px-3 bg-gray-700/50">SV</th>
                        <th className="text-center py-2 px-3 bg-gray-700/50">
                          <div>Standard</div>
                          <div className="text-xs text-gray-400">Eyezen/Bifocal</div>
                        </th>
                        <th className="text-center py-2 px-3 bg-gray-700/50">
                          <div>Premium</div>
                          <div className="text-xs text-gray-400">Comfort DRx</div>
                        </th>
                        <th className="text-center py-2 px-3 bg-gray-700/50">
                          <div>Prem Adv</div>
                          <div className="text-xs text-gray-400">Comfort Max</div>
                        </th>
                        <th className="text-center py-2 px-3 bg-gray-700/50 rounded-tr-lg">
                          <div>Custom</div>
                          <div className="text-xs text-gray-400">Varilux X</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* CR-39 / Plastic */}
                      <tr className="border-t border-gray-700/50">
                        <td className="py-2 px-3 text-white font-medium">CR-39 (Plastic)</td>
                        <td className="py-2 px-3 text-center text-green-400 font-semibold">
                          ${(authorization.lensMatrix.SV_plastic ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-green-400 font-semibold">
                          ${(authorization.lensMatrix.KA ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-yellow-400 font-semibold">
                          ${(authorization.lensMatrix.JA ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-yellow-400 font-semibold">
                          ${(authorization.lensMatrix.FA ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-orange-400 font-semibold">
                          ${(authorization.lensMatrix.OA ?? 0) + authorization.copays.material}
                        </td>
                      </tr>
                      {/* Polycarbonate */}
                      <tr className="border-t border-gray-700/50 bg-gray-800/30">
                        <td className="py-2 px-3 text-white font-medium">Polycarbonate</td>
                        <td className="py-2 px-3 text-center text-green-400 font-semibold">
                          ${(authorization.lensMatrix.SV_poly ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-green-400 font-semibold">
                          ${(authorization.lensMatrix.KA ?? 0) + (authorization.lensMatrix.KD ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-yellow-400 font-semibold">
                          ${(authorization.lensMatrix.JA ?? 0) + (authorization.lensMatrix.JD ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-yellow-400 font-semibold">
                          ${(authorization.lensMatrix.FA ?? 0) + (authorization.lensMatrix.FD ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-orange-400 font-semibold">
                          ${(authorization.lensMatrix.OA ?? 0) + (authorization.lensMatrix.OD ?? 0) + authorization.copays.material}
                        </td>
                      </tr>
                      {/* Trivex */}
                      <tr className="border-t border-gray-700/50">
                        <td className="py-2 px-3 text-white font-medium">Trivex</td>
                        <td className="py-2 px-3 text-center text-green-400 font-semibold">
                          ${(authorization.lensMatrix.SV_trivex ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-green-400 font-semibold">
                          ${(authorization.lensMatrix.KA ?? 0) + (authorization.lensMatrix.KB ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-yellow-400 font-semibold">
                          ${(authorization.lensMatrix.JA ?? 0) + (authorization.lensMatrix.JB ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-yellow-400 font-semibold">
                          ${(authorization.lensMatrix.FA ?? 0) + (authorization.lensMatrix.FB ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-orange-400 font-semibold">
                          ${(authorization.lensMatrix.OA ?? 0) + (authorization.lensMatrix.OB ?? 0) + authorization.copays.material}
                        </td>
                      </tr>
                      {/* 1.67 High Index */}
                      <tr className="border-t border-gray-700/50 bg-gray-800/30">
                        <td className="py-2 px-3 text-white font-medium">1.67 High Index</td>
                        <td className="py-2 px-3 text-center text-green-400 font-semibold">
                          ${(authorization.lensMatrix.SV_hi167 ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-green-400 font-semibold">
                          ${(authorization.lensMatrix.KA ?? 0) + (authorization.lensMatrix.KH ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-yellow-400 font-semibold">
                          ${(authorization.lensMatrix.JA ?? 0) + (authorization.lensMatrix.JH ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-yellow-400 font-semibold">
                          ${(authorization.lensMatrix.FA ?? 0) + (authorization.lensMatrix.FH ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-orange-400 font-semibold">
                          ${(authorization.lensMatrix.OA ?? 0) + (authorization.lensMatrix.OH ?? 0) + authorization.copays.material}
                        </td>
                      </tr>
                      {/* 1.74 Ultra High Index */}
                      <tr className="border-t border-gray-700/50">
                        <td className="py-2 px-3 text-white font-medium">1.74 Ultra High</td>
                        <td className="py-2 px-3 text-center text-green-400 font-semibold">
                          ${(authorization.lensMatrix.SV_hi174 ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-green-400 font-semibold">
                          ${(authorization.lensMatrix.KA ?? 0) + (authorization.lensMatrix.KJ ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-yellow-400 font-semibold">
                          ${(authorization.lensMatrix.JA ?? 0) + (authorization.lensMatrix.JJ ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-yellow-400 font-semibold">
                          ${(authorization.lensMatrix.FA ?? 0) + (authorization.lensMatrix.FJ ?? 0) + authorization.copays.material}
                        </td>
                        <td className="py-2 px-3 text-center text-orange-400 font-semibold">
                          ${(authorization.lensMatrix.OA ?? 0) + (authorization.lensMatrix.OJ ?? 0) + authorization.copays.material}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-white/40 mt-3">
                  * Total patient cost = Progressive tier + Material upgrade + ${authorization.copays.material} material copay. Add AR coating, photochromic, and other add-ons separately.
                </p>
              </CardContent>
            </Card>

            {/* Price List */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    Patient Price List
                  </h3>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowRaw(!showRaw)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      {showRaw ? 'Hide raw data' : 'Show raw data'}
                    </button>
                    <span className="text-gray-500 text-sm">
                      {priceListData.summary.totalProducts} products
                    </span>
                  </div>
                </div>

                {showRaw && (
                  <pre className="bg-gray-900 p-4 rounded-lg text-xs text-green-400 overflow-x-auto mb-4 max-h-96">
                    {JSON.stringify(authorization, null, 2)}
                  </pre>
                )}

                <div className="space-y-6">
                  {Object.entries(priceListData.priceList).map(([section, products]) => {
                    // Check if this section has any items with SV/Multi variance
                    const hasVarianceItems = products.some(p => p.hasVariance === true)

                    return (
                      <div key={section}>
                        <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-2">
                          {section}
                        </h4>
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-white/50 text-xs uppercase">
                              <th className="pb-2">Product</th>
                              <th className="pb-2 text-right">Retail</th>
                              {hasVarianceItems ? (
                                <>
                                  <th className="pb-2 text-right">SV</th>
                                  <th className="pb-2 text-right">Multi</th>
                                </>
                              ) : (
                                <th className="pb-2 text-right">Copay</th>
                              )}
                              <th className="pb-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map((product, idx) => (
                              <tr key={idx} className="border-t border-gray-700/50">
                                <td className="py-2 text-white">{product.productName}</td>
                                <td className="py-2 text-right text-white/50">${product.retail.toFixed(2)}</td>
                                {hasVarianceItems ? (
                                  <>
                                    <td className={`py-2 text-right font-semibold ${
                                      product.isCashOnly || product.isNotCovered
                                        ? 'text-red-400'
                                        : (product.svCopay ?? product.copay) === 0
                                          ? 'text-green-400'
                                          : 'text-yellow-400'
                                    }`}>
                                      ${(product.svCopay ?? product.copay).toFixed(2)}
                                    </td>
                                    <td className={`py-2 text-right font-semibold ${
                                      product.isCashOnly || product.isNotCovered
                                        ? 'text-red-400'
                                        : (product.multiCopay ?? product.copay) === 0
                                          ? 'text-green-400'
                                          : 'text-yellow-400'
                                    }`}>
                                      ${(product.multiCopay ?? product.copay).toFixed(2)}
                                    </td>
                                  </>
                                ) : (
                                  <td className={`py-2 text-right font-semibold ${
                                    product.isCashOnly || product.isNotCovered
                                      ? 'text-red-400'
                                      : product.patientCost === 0
                                        ? 'text-green-400'
                                        : 'text-yellow-400'
                                  }`}>
                                    ${product.patientCost.toFixed(2)}
                                  </td>
                                )}
                                <td className="py-2 text-right text-sm">
                                  {product.isCashOnly ? (
                                    <span className="text-red-400">Cash Only</span>
                                  ) : product.isNotCovered ? (
                                    <span className="text-red-400">Not Covered</span>
                                  ) : product.patientCost === 0 ? (
                                    <span className="text-green-400">Covered</span>
                                  ) : product.hasVariance ? (
                                    <span className="text-blue-400">SV/Multi</span>
                                  ) : (
                                    <span className="text-white/40">{product.notes.join(', ') || 'Copay'}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </div>

                {/* Save to Patient Profile */}
                {selectedPatient && !savedVersion && (
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <button
                      onClick={handleSavePriceList}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save to {selectedPatient.firstName}&apos;s Profile
                        </>
                      )}
                    </button>
                    <p className="text-white/50 text-sm mt-2">
                      This will save the price list to the patient&apos;s profile for future reference
                    </p>
                  </div>
                )}

                {/* Saved Success */}
                {savedVersion && (
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <div className="flex items-center gap-3 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <div className="flex-1">
                        <p className="text-green-400 font-medium">Price list saved!</p>
                        <p className="text-green-300/70 text-sm">
                          Saved as {savedVersion.versionLabel} to {selectedPatient?.firstName}&apos;s profile
                        </p>
                      </div>
                      <a
                        href={`/customers/${selectedPatient?.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Profile
                      </a>
                    </div>
                  </div>
                )}

                {/* Upload Another */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <button
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FileUp className="w-4 h-4" />
                    Upload New Documents
                  </button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export default function VspPricerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <VspPricerContent />
    </Suspense>
  )
}
