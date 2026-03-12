'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { FileUp, Loader2, User, DollarSign, CheckCircle, AlertTriangle, Info, X, FileText, Save } from 'lucide-react'
import type { VspMergedAuthorization } from '@/types/vsp-authorization'

type Status = 'idle' | 'uploading' | 'extracting' | 'pricing' | 'done' | 'error'

interface InlineVspPricerProps {
  customerId: string
  customer: { firstName: string; lastName: string }
  onPriceListSaved: () => void
}

interface PriceListItem {
  section: string
  productId: string
  productName: string
  retail: number
  copay: number
  patientCost: number
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

export function InlineVspPricer({ customerId, customer, onPriceListSaved }: InlineVspPricerProps) {
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
  const [savedVersion, setSavedVersion] = useState<{ versionLabel: string } | null>(null)
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
      // Call extraction API - SAME as standalone pricer
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

      // Call pricing API - SAME as standalone pricer
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
    setPendingFiles([])
  }

  const handleSavePriceList = async () => {
    if (!authorization || !priceListData) return

    setIsSaving(true)
    try {
      // Call save API - SAME as standalone pricer
      const response = await fetch('/api/vsp/save-price-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          planName: authorization.planInfo.planType,
          authorization,
          priceList: priceListData.priceList
        })
      })

      const data = await response.json()
      if (data.success) {
        setSavedVersion({ versionLabel: data.version.versionLabel })
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

  // Upload State
  if (status === 'idle' || status === 'error') {
    return (
      <div className="space-y-4">
        <Card className="glass-card border-white/20">
          <CardContent className="p-4">
            {/* Drop Zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${
                isDragging
                  ? 'border-blue-400 bg-blue-500/10 scale-[1.01]'
                  : authBase64 && enhancementBase64
                    ? 'border-green-500 bg-green-500/5'
                    : 'border-white/30 hover:border-white/50'
              }`}
            >
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${
                  isDragging ? 'bg-blue-500/20' : 'bg-white/10'
                }`}>
                  <FileUp className={`w-6 h-6 ${isDragging ? 'text-blue-400' : 'text-white/70'}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  {isDragging ? 'Drop your PDFs here' : 'Drag & Drop VSP Documents'}
                </h3>
                <p className="text-white/60 text-xs mb-3">
                  Drop both PDFs, then assign Auth and Enhancement
                </p>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer transition-colors text-sm">
                  <FileText className="w-4 h-4" />
                  Browse Files
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                    data-testid="vsp-pdf-upload"
                  />
                </label>
              </div>

              {/* Pending Files - Need Assignment */}
              {pendingFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-center text-amber-400 text-xs font-medium">Assign each file:</p>
                  {pendingFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="text-white text-xs truncate flex-1">{file.name}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => assignFileAs(idx, 'auth')}
                          disabled={!!authBase64}
                          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                            authBase64
                              ? 'bg-white/10 text-white/40 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          Auth
                        </button>
                        <button
                          onClick={() => assignFileAs(idx, 'enhancement')}
                          disabled={!!enhancementBase64}
                          className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                            enhancementBase64
                              ? 'bg-white/10 text-white/40 cursor-not-allowed'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          Enhancement
                        </button>
                        <button
                          onClick={() => removePendingFile(idx)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <X className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Assigned Files */}
              {(authFileName || enhancementFileName) && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ${
                    authFileName ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-white/10 border border-white/20'
                  }`}>
                    {authFileName ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-blue-400" />
                        <span className="text-blue-300 font-medium">Auth:</span>
                        <span className="text-white truncate max-w-[140px]">{authFileName}</span>
                        <button onClick={removeAuthFile} className="ml-1 p-0.5 hover:bg-blue-500/30 rounded-full">
                          <X className="w-3 h-3 text-blue-400" />
                        </button>
                      </>
                    ) : (
                      <span className="text-white/50">Auth Form needed</span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ${
                    enhancementFileName ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-white/10 border border-white/20'
                  }`}>
                    {enhancementFileName ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-purple-400" />
                        <span className="text-purple-300 font-medium">Enhancement:</span>
                        <span className="text-white truncate max-w-[140px]">{enhancementFileName}</span>
                        <button onClick={removeEnhancementFile} className="ml-1 p-0.5 hover:bg-purple-500/30 rounded-full">
                          <X className="w-3 h-3 text-purple-400" />
                        </button>
                      </>
                    ) : (
                      <span className="text-white/50">Enhancement needed</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Extract Button */}
            <div className="flex justify-center mt-4">
              <button
                onClick={handleExtract}
                disabled={!authBase64 || !enhancementBase64}
                className={`px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all text-sm ${
                  authBase64 && enhancementBase64
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Generate Price List
              </button>
            </div>
          </CardContent>
        </Card>

        {status === 'error' && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 font-medium flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Error
            </p>
            <p className="text-red-300 text-xs mt-1">{errorMsg}</p>
          </div>
        )}
      </div>
    )
  }

  // Loading State
  if (status === 'extracting' || status === 'pricing') {
    return (
      <Card className="glass-card border-white/20">
        <CardContent className="p-8 flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-4" />
          <p className="text-white font-medium">
            {status === 'extracting' ? 'Extracting benefits from PDFs...' : 'Calculating prices...'}
          </p>
          <p className="text-white/60 text-sm mt-1">
            {status === 'extracting' ? 'Using Claude AI to read documents' : 'Applying VSP copay rules'}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Results
  if (status === 'done' && authorization && priceListData) {
    return (
      <div className="space-y-4">
        {/* Patient Info Banner */}
        <Card className="glass-card border-emerald-500/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-600/30 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{authorization.patientInfo.name}</h3>
                <p className="text-white/70 capitalize text-sm">{authorization.planInfo.planType.replace(/_/g, ' ')} Plan</p>
              </div>
              <div className="text-right text-xs">
                <p className="text-white/50">Auth #: {authorization.patientInfo.authNumber}</p>
                <p className="text-white/50">
                  {authorization.patientInfo.effectiveDate} - {authorization.patientInfo.expirationDate}
                </p>
              </div>
            </div>

            {/* Key Benefits Summary */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-white/50 text-[10px] uppercase">Exam Copay</p>
                <p className="text-white font-bold">${authorization.copays.exam}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-white/50 text-[10px] uppercase">Material Copay</p>
                <p className="text-white font-bold">${authorization.copays.material}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-white/50 text-[10px] uppercase">Frame Allow</p>
                <p className="text-white font-bold">${authorization.frameAllowance.amount}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-white/50 text-[10px] uppercase">CL Allow</p>
                <p className="text-white font-bold">
                  {authorization.contactLens.materialsAllowance != null
                    ? `$${authorization.contactLens.materialsAllowance}`
                    : authorization.contactLens.combinedAllowance != null
                      ? `$${authorization.contactLens.combinedAllowance}`
                      : 'N/A'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-white/50 text-[10px] uppercase">EasyOptions</p>
                <p className="text-white font-bold">{authorization.easyOptions?.enabled ? 'Yes' : 'No'}</p>
              </div>
              <div className={`rounded-lg p-2 ${authorization.flags.hasEmc ? 'bg-green-700/30' : 'bg-white/5'}`}>
                <p className="text-white/50 text-[10px] uppercase">EMC</p>
                <p className={`font-bold ${authorization.flags.hasEmc ? 'text-green-400' : 'text-white'}`}>
                  {authorization.flags.hasEmc ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-white/50 text-[10px] uppercase">Computer Vision</p>
                <p className="text-white font-bold">{authorization.flags.isComputerVisioncare ? 'Yes' : 'No'}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-white/50 text-[10px] uppercase">CL Exam Copay</p>
                <p className="text-white font-bold">
                  {authorization.contactLens.examCopay != null ? `$${authorization.contactLens.examCopay}` : 'N/A'}
                </p>
              </div>
            </div>

            {/* Progressive Tier Copays */}
            <div className="mt-3 p-3 bg-white/5 rounded-lg">
              <h4 className="text-white/70 text-xs font-medium mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Progressive Tier Base Copays
              </h4>
              <div className="grid grid-cols-5 gap-1 text-center text-xs">
                <div className="bg-slate-800/50 rounded p-1.5">
                  <p className="text-white/50 text-[10px]">K (Std)</p>
                  <p className="text-green-400 font-bold">${authorization.progressives.K_standard}</p>
                </div>
                <div className="bg-slate-800/50 rounded p-1.5">
                  <p className="text-white/50 text-[10px]">J (Prem)</p>
                  <p className="text-yellow-400 font-bold">${authorization.progressives.J_premium}</p>
                </div>
                <div className="bg-slate-800/50 rounded p-1.5">
                  <p className="text-white/50 text-[10px]">F (Adv)</p>
                  <p className="text-yellow-400 font-bold">${authorization.progressives.F_premium_adv}</p>
                </div>
                <div className="bg-slate-800/50 rounded p-1.5">
                  <p className="text-white/50 text-[10px]">O (Custom)</p>
                  <p className="text-orange-400 font-bold">${authorization.progressives.O_custom}</p>
                </div>
                <div className="bg-slate-800/50 rounded p-1.5">
                  <p className="text-white/50 text-[10px]">N (Varilux)</p>
                  <p className="text-orange-400 font-bold">${authorization.progressives.N_custom}</p>
                </div>
              </div>
            </div>

            {/* EMC Banner */}
            {authorization.flags.hasEmc && (
              <div className="mt-3 p-2 bg-green-500/20 border border-green-500/50 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="text-green-400 font-medium">EMC Available</p>
                  <p className="text-green-300/80">
                    {authorization.flags.emcType && <span className="capitalize">{authorization.flags.emcType.replace(/_/g, ' ')}</span>}
                    {authorization.flags.emcExamCopay != null && <span className="ml-1">• EMC Exam: ${authorization.flags.emcExamCopay}</span>}
                  </p>
                </div>
              </div>
            )}

            {/* Computer VisionCare Warning */}
            {authorization.flags.isComputerVisioncare && (
              <div className="mt-3 p-2 bg-amber-500/20 border border-amber-500/50 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="text-amber-400 font-medium">Computer VisionCare Plan</p>
                  <p className="text-amber-300/80">Photochromics and Polarized lenses NOT COVERED</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lens Matrix */}
        <Card className="glass-card border-white/20">
          <CardContent className="p-4">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              Lens + Material Matrix
              <span className="text-[10px] text-white/50 font-normal ml-1">(includes ${authorization.copays.material} material copay)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/70">
                    <th className="text-left py-1.5 px-2 bg-white/5 rounded-tl-lg">Material</th>
                    <th className="text-center py-1.5 px-2 bg-white/5">SV</th>
                    <th className="text-center py-1.5 px-2 bg-white/5">Standard</th>
                    <th className="text-center py-1.5 px-2 bg-white/5">Premium</th>
                    <th className="text-center py-1.5 px-2 bg-white/5">Prem Adv</th>
                    <th className="text-center py-1.5 px-2 bg-white/5 rounded-tr-lg">Custom</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-white/10">
                    <td className="py-1.5 px-2 text-white font-medium">CR-39</td>
                    <td className="py-1.5 px-2 text-center text-green-400 font-semibold">
                      ${(authorization.lensMatrix.SV_plastic ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-green-400 font-semibold">
                      ${(authorization.lensMatrix.KA ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-yellow-400 font-semibold">
                      ${(authorization.lensMatrix.JA ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-yellow-400 font-semibold">
                      ${(authorization.lensMatrix.FA ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-orange-400 font-semibold">
                      ${(authorization.lensMatrix.OA ?? 0) + authorization.copays.material}
                    </td>
                  </tr>
                  <tr className="border-t border-white/10 bg-white/[0.02]">
                    <td className="py-1.5 px-2 text-white font-medium">Polycarbonate</td>
                    <td className="py-1.5 px-2 text-center text-green-400 font-semibold">
                      ${(authorization.lensMatrix.SV_poly ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-green-400 font-semibold">
                      ${(authorization.lensMatrix.KA ?? 0) + (authorization.lensMatrix.KD ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-yellow-400 font-semibold">
                      ${(authorization.lensMatrix.JA ?? 0) + (authorization.lensMatrix.JD ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-yellow-400 font-semibold">
                      ${(authorization.lensMatrix.FA ?? 0) + (authorization.lensMatrix.FD ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-orange-400 font-semibold">
                      ${(authorization.lensMatrix.OA ?? 0) + (authorization.lensMatrix.OD ?? 0) + authorization.copays.material}
                    </td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="py-1.5 px-2 text-white font-medium">Trivex</td>
                    <td className="py-1.5 px-2 text-center text-green-400 font-semibold">
                      ${(authorization.lensMatrix.SV_trivex ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-green-400 font-semibold">
                      ${(authorization.lensMatrix.KA ?? 0) + (authorization.lensMatrix.KB ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-yellow-400 font-semibold">
                      ${(authorization.lensMatrix.JA ?? 0) + (authorization.lensMatrix.JB ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-yellow-400 font-semibold">
                      ${(authorization.lensMatrix.FA ?? 0) + (authorization.lensMatrix.FB ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-orange-400 font-semibold">
                      ${(authorization.lensMatrix.OA ?? 0) + (authorization.lensMatrix.OB ?? 0) + authorization.copays.material}
                    </td>
                  </tr>
                  <tr className="border-t border-white/10 bg-white/[0.02]">
                    <td className="py-1.5 px-2 text-white font-medium">1.67 High Index</td>
                    <td className="py-1.5 px-2 text-center text-green-400 font-semibold">
                      ${(authorization.lensMatrix.SV_hi167 ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-green-400 font-semibold">
                      ${(authorization.lensMatrix.KA ?? 0) + (authorization.lensMatrix.KH ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-yellow-400 font-semibold">
                      ${(authorization.lensMatrix.JA ?? 0) + (authorization.lensMatrix.JH ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-yellow-400 font-semibold">
                      ${(authorization.lensMatrix.FA ?? 0) + (authorization.lensMatrix.FH ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-orange-400 font-semibold">
                      ${(authorization.lensMatrix.OA ?? 0) + (authorization.lensMatrix.OH ?? 0) + authorization.copays.material}
                    </td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="py-1.5 px-2 text-white font-medium">1.74 Ultra High</td>
                    <td className="py-1.5 px-2 text-center text-green-400 font-semibold">
                      ${(authorization.lensMatrix.SV_hi174 ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-green-400 font-semibold">
                      ${(authorization.lensMatrix.KA ?? 0) + (authorization.lensMatrix.KJ ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-yellow-400 font-semibold">
                      ${(authorization.lensMatrix.JA ?? 0) + (authorization.lensMatrix.JJ ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-yellow-400 font-semibold">
                      ${(authorization.lensMatrix.FA ?? 0) + (authorization.lensMatrix.FJ ?? 0) + authorization.copays.material}
                    </td>
                    <td className="py-1.5 px-2 text-center text-orange-400 font-semibold">
                      ${(authorization.lensMatrix.OA ?? 0) + (authorization.lensMatrix.OJ ?? 0) + authorization.copays.material}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Price List */}
        <Card className="glass-card border-white/20 overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                Patient Price List
              </h3>
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {showRaw ? 'Hide' : 'Show'} raw
                </button>
                <span className="text-white/50 text-xs">
                  {priceListData.summary.totalProducts} products
                </span>
              </div>
            </div>

            {showRaw && (
              <pre className="bg-slate-900 p-3 text-[10px] text-green-400 overflow-x-auto max-h-64 border-b border-white/10">
                {JSON.stringify(authorization, null, 2)}
              </pre>
            )}

            <div className="max-h-[350px] overflow-y-auto">
              {Object.entries(priceListData.priceList).map(([section, products]) => {
                const hasVarianceItems = products.some(p => p.hasVariance === true)

                return (
                  <div key={section} className="p-3 border-b border-white/10 last:border-b-0">
                    <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">
                      {section}
                    </h4>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-white/50 uppercase">
                          <th className="pb-1">Product</th>
                          <th className="pb-1 text-right">Retail</th>
                          {hasVarianceItems ? (
                            <>
                              <th className="pb-1 text-right">SV</th>
                              <th className="pb-1 text-right">Multi</th>
                            </>
                          ) : (
                            <th className="pb-1 text-right">Copay</th>
                          )}
                          <th className="pb-1 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product, idx) => (
                          <tr key={idx} className="border-t border-white/5">
                            <td className="py-1 text-white">{product.productName}</td>
                            <td className="py-1 text-right text-white/50">${product.retail.toFixed(2)}</td>
                            {hasVarianceItems ? (
                              <>
                                <td className={`py-1 text-right font-semibold ${
                                  product.isCashOnly || product.isNotCovered
                                    ? 'text-red-400'
                                    : (product.svCopay ?? product.copay) === 0
                                      ? 'text-green-400'
                                      : 'text-yellow-400'
                                }`}>
                                  ${(product.svCopay ?? product.copay).toFixed(2)}
                                </td>
                                <td className={`py-1 text-right font-semibold ${
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
                              <td className={`py-1 text-right font-semibold ${
                                product.isCashOnly || product.isNotCovered
                                  ? 'text-red-400'
                                  : product.patientCost === 0
                                    ? 'text-green-400'
                                    : 'text-yellow-400'
                              }`}>
                                ${product.patientCost.toFixed(2)}
                              </td>
                            )}
                            <td className="py-1 text-right">
                              {product.isCashOnly ? (
                                <span className="text-red-400">Cash</span>
                              ) : product.isNotCovered ? (
                                <span className="text-red-400">N/C</span>
                              ) : product.patientCost === 0 ? (
                                <span className="text-green-400">✓</span>
                              ) : product.hasVariance ? (
                                <span className="text-blue-400">SV/M</span>
                              ) : (
                                <span className="text-white/40">$</span>
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
          </CardContent>
        </Card>

        {/* Save to Profile */}
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
                    onClick={resetForm}
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
                  onClick={resetForm}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 font-semibold transition-colors text-sm"
                >
                  Upload Another
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return null
}
