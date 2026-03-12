'use client'

import { useState, useEffect } from 'react'
import PageLayout from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Code,
  Timer,
  Search,
  Users,
  DollarSign
} from 'lucide-react'

interface PriceListItem {
  productName: string
  category: string
  retailPrice: number
  customerPrice: number
  savings: number
  tier: string | null
  covered: boolean
}

function PriceListView({ extractedData, carrier }: { extractedData?: Record<string, any>, carrier?: string }) {
  const [prices, setPrices] = useState<PriceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [groupBy, setGroupBy] = useState<'category' | 'coverage'>('category')

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch(`/api/admin/pricing-debug/simulate-prices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extractedData, carrier }),
        })
        const data = await res.json()
        if (data.success) {
          setPrices(data.prices)
        }
      } catch (err) {
        console.error('Failed to fetch prices:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPrices()
  }, [extractedData, carrier])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Calculating prices...
        </CardContent>
      </Card>
    )
  }

  const grouped = prices.reduce((acc, item) => {
    const key = groupBy === 'category' ? item.category : (item.covered ? 'Covered by Insurance' : 'Cash Pay Only')
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, PriceListItem[]>)

  const coveredCount = prices.filter(p => p.covered).length
  const totalSavings = prices.reduce((sum, p) => sum + p.savings, 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="flex items-center gap-8 py-4">
          <div>
            <div className="text-2xl font-bold text-emerald-400">{coveredCount}</div>
            <div className="text-xs text-muted-foreground">Products Covered</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">{prices.length - coveredCount}</div>
            <div className="text-xs text-muted-foreground">Cash Pay Only</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">${totalSavings.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Total Potential Savings</div>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant={groupBy === 'category' ? 'default' : 'outline'}
              onClick={() => setGroupBy('category')}
            >
              By Category
            </Button>
            <Button
              size="sm"
              variant={groupBy === 'coverage' ? 'default' : 'outline'}
              onClick={() => setGroupBy('coverage')}
            >
              By Coverage
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Price Tables */}
      {Object.entries(grouped).map(([group, items]) => (
        <Card key={group}>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{group}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Product</th>
                  <th className="text-right px-4 py-2 font-medium">Retail</th>
                  <th className="text-right px-4 py-2 font-medium">Patient Pays</th>
                  <th className="text-right px-4 py-2 font-medium">Savings</th>
                  <th className="text-left px-4 py-2 font-medium">Tier</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                    <td className="px-4 py-2">{item.productName}</td>
                    <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                      ${item.retailPrice.toFixed(2)}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono font-semibold ${item.covered ? 'text-emerald-400' : 'text-orange-400'}`}>
                      ${item.customerPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-blue-400">
                      {item.savings > 0 ? `$${item.savings.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      {item.tier ? (
                        <Badge variant="outline" className="text-xs">{item.tier}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface DebugResult {
  success: boolean
  debug?: {
    rawText: string
    ocrMethod: string
    pageCount?: number
    detectedCarrier?: string
    planName?: string
    confidenceScore?: number
    extractedData?: Record<string, any>
    gptError?: string
    timing: {
      ocrMs: number
      gptMs: number
      totalMs: number
    }
  }
  error?: string
}

export default function PricingDebugPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<DebugResult | null>(null)
  const [activeTab, setActiveTab] = useState<'ocr' | 'parsed' | 'prices'>('ocr')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleProcess = async () => {
    if (!file) return

    setIsProcessing(true)
    setResult(null)

    try {
      // Upload file first
      const formData = new FormData()
      formData.append('file', file)
      formData.append('customerId', 'debug-test')
      formData.append('documentType', 'authorization')

      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error('Upload failed')
      }

      const uploadData = await uploadRes.json()

      // Process with debug endpoint
      const processRes = await fetch('/api/admin/pricing-debug/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: uploadData.filePath,
        }),
      })

      const debugData = await processRes.json()
      setResult(debugData)

      if (debugData.success) {
        setActiveTab('parsed')
      }

    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Processing failed',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getMissingFields = (data: Record<string, any>): string[] => {
    const requiredFields = [
      'copays.examCopay',
      'copays.materialsCopay',
      'frame.allowances',
      'contacts.clExamAndMaterialsAllowance',
    ]

    const missing: string[] = []

    requiredFields.forEach(field => {
      const parts = field.split('.')
      let current: any = data
      for (const part of parts) {
        if (!current || current[part] === undefined || current[part] === null) {
          missing.push(field)
          break
        }
        current = current[part]
      }
    })

    return missing
  }

  return (
    <PageLayout
      title="Pricing Engine Debug"
      subtitle="Test insurance document extraction and price generation"
    >
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Authorization Document
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="block w-full text-sm text-white/70
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  file:cursor-pointer cursor-pointer"
              />
              <Button
                onClick={handleProcess}
                disabled={!file || isProcessing}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Process Document
                  </>
                )}
              </Button>
            </div>

            {file && (
              <div className="text-sm text-muted-foreground">
                Selected: <span className="text-white font-medium">{file.name}</span>
                {' '}({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <>
            {/* Status Banner */}
            <Card className={
              result.success
                ? 'border-success/50 bg-success/10'
                : 'border-destructive/50 bg-destructive/10'
            }>
              <CardContent className="flex items-center gap-4 py-4">
                {result.success ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-success" />
                    <div className="flex-1">
                      <div className="font-semibold text-success">
                        {result.debug?.detectedCarrier?.toUpperCase() || 'SUCCESS'}
                      </div>
                      <div className="text-sm text-success/70">
                        {result.debug?.planName || 'Document processed successfully'}
                      </div>
                    </div>
                    {result.debug?.confidenceScore && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-success">
                          {Math.round(result.debug.confidenceScore * 100)}%
                        </div>
                        <div className="text-xs text-success/60">confidence</div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-6 w-6 text-destructive" />
                    <div>
                      <div className="font-semibold text-destructive">Processing Failed</div>
                      <div className="text-sm text-destructive/70">
                        {result.error || result.debug?.gptError || 'Unknown error'}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timing Info */}
            {result.debug?.timing && (
              <Card>
                <CardContent className="flex items-center gap-6 py-4">
                  <Timer className="h-5 w-5 text-cyan-400" />
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">OCR: </span>
                      <span className="text-blue-400 font-medium">
                        {(result.debug.timing.ocrMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GPT: </span>
                      <span className="text-purple-400 font-medium">
                        {(result.debug.timing.gptMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total: </span>
                      <span className="text-emerald-400 font-medium">
                        {(result.debug.timing.totalMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Method: </span>
                      <Badge variant="outline">{result.debug.ocrMethod}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'ocr' ? 'default' : 'outline'}
                onClick={() => setActiveTab('ocr')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Raw OCR Text
              </Button>
              <Button
                variant={activeTab === 'parsed' ? 'default' : 'outline'}
                onClick={() => setActiveTab('parsed')}
                disabled={!result.success}
              >
                <Code className="h-4 w-4 mr-2" />
                Parsed Data
              </Button>
              <Button
                variant={activeTab === 'prices' ? 'default' : 'outline'}
                onClick={() => setActiveTab('prices')}
                disabled={!result.success}
              >
                Price List
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={handleProcess}
                disabled={isProcessing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>

            {/* Tab Content */}
            {activeTab === 'ocr' && result.debug?.rawText && (
              <Card>
                <CardHeader>
                  <CardTitle>Raw OCR Text</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-black/50 rounded-lg p-4 text-xs text-green-400 overflow-x-auto max-h-[600px] overflow-y-auto whitespace-pre-wrap">
                    {result.debug.rawText}
                  </pre>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {result.debug.rawText.length} characters
                    {result.debug.pageCount && ` • ${result.debug.pageCount} pages`}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'parsed' && result.debug?.extractedData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Extracted Data */}
                <Card>
                  <CardHeader>
                    <CardTitle>Extracted Data (JSON)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-black/50 rounded-lg p-4 text-xs text-cyan-400 overflow-x-auto max-h-[600px] overflow-y-auto">
                      {JSON.stringify(result.debug.extractedData, null, 2)}
                    </pre>
                  </CardContent>
                </Card>

                {/* Field Validation */}
                <Card>
                  <CardHeader>
                    <CardTitle>Field Validation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const missing = getMissingFields(result.debug.extractedData)

                      return (
                        <div className="space-y-4">
                          {/* Missing Fields */}
                          {missing.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-destructive">
                                Missing Required Fields ({missing.length})
                              </div>
                              {missing.map(field => (
                                <div
                                  key={field}
                                  className="bg-destructive/10 border border-destructive/30 rounded px-3 py-2 text-sm text-destructive"
                                >
                                  {field}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Success Message */}
                          {missing.length === 0 && (
                            <div className="flex items-center gap-2 text-success">
                              <CheckCircle className="h-5 w-5" />
                              <span className="font-medium">All required fields extracted</span>
                            </div>
                          )}

                          {/* Key Extracted Values */}
                          <div className="space-y-2 pt-4 border-t border-white/10">
                            <div className="text-sm font-medium text-white/70">Key Values</div>
                            {(() => {
                              const data = result.debug.extractedData
                              const getValue = (path: string): any => {
                                const parts = path.split('.')
                                let current: any = data
                                for (const part of parts) {
                                  if (!current) return null
                                  current = current[part]
                                }
                                if (current && typeof current === 'object' && 'value' in current) {
                                  return current.value
                                }
                                return current
                              }

                              return (
                                <>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Exam Copay:</span>
                                    <span className="font-mono">${getValue('copays.examCopay') ?? '—'}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Materials Copay:</span>
                                    <span className="font-mono">${getValue('copays.materialsCopay') ?? '—'}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Frame Allowance:</span>
                                    <span className="font-mono">
                                      ${getValue('frame.allowances.nonAltairMarchonFrameAllowance.allowance') ?? '—'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Contacts Allowance:</span>
                                    <span className="font-mono">${getValue('contacts.clExamAndMaterialsAllowance') ?? '—'}</span>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'prices' && result.success && (
              <PriceListView extractedData={result.debug?.extractedData} carrier={result.debug?.detectedCarrier} />
            )}
          </>
        )}
      </div>
    </PageLayout>
  )
}
