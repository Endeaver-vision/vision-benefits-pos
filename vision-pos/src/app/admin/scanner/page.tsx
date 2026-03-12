'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '@/components/layout/page-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Search,
  FileText,
  User,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
}

interface InsuranceDocument {
  id: string
  customerId: string
  customer: Customer
  fileName: string
  fileType: string
  filePath: string
  carrier: string | null
  planName: string | null
  ocrStatus: string
  gptStatus: string
  extractedData: Record<string, unknown> | null
  confidenceScore: number | null
  createdAt: string
  updatedAt: string
}

interface DocumentStats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  lowConfidence: number
}

type TabType = 'completed' | 'processing' | 'failed' | 'all'

const CONFIDENCE_THRESHOLD = 0.70

export default function AdminScannerPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<InsuranceDocument[]>([])
  const [stats, setStats] = useState<DocumentStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('completed')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)

  const fetchDocuments = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/documents?limit=100')
      const json = await res.json()
      if (json.success) {
        setDocuments(json.data)
        calculateStats(json.data)
      } else {
        setError(json.error || 'Failed to fetch documents')
      }
    } catch {
      setError('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = (docs: InsuranceDocument[]) => {
    const stats: DocumentStats = {
      total: docs.length,
      pending: docs.filter(d => d.gptStatus === 'pending').length,
      processing: docs.filter(d => d.gptStatus === 'processing').length,
      completed: docs.filter(d => d.gptStatus === 'completed').length,
      failed: docs.filter(d => d.gptStatus === 'failed').length,
      lowConfidence: docs.filter(d =>
        d.gptStatus === 'completed' &&
        d.confidenceScore !== null &&
        d.confidenceScore < CONFIDENCE_THRESHOLD
      ).length,
    }
    setStats(stats)
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const toggleExpand = (docId: string) => {
    setExpandedDoc(expandedDoc === docId ? null : docId)
  }

  // Filter documents based on tab and search
  const filteredDocuments = documents.filter(doc => {
    // Tab filter
    if (activeTab === 'completed') {
      if (doc.gptStatus !== 'completed') return false
    } else if (activeTab === 'processing') {
      if (doc.gptStatus !== 'processing' && doc.gptStatus !== 'pending') return false
    } else if (activeTab === 'failed') {
      if (doc.gptStatus !== 'failed') return false
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const customerName = `${doc.customer.firstName} ${doc.customer.lastName}`.toLowerCase()
      return (
        customerName.includes(term) ||
        doc.fileName.toLowerCase().includes(term) ||
        doc.carrier?.toLowerCase().includes(term) ||
        doc.customer.email?.toLowerCase().includes(term)
      )
    }
    return true
  })

  const getStatusBadge = (doc: InsuranceDocument) => {
    if (doc.gptStatus === 'failed') {
      return <Badge variant="destructive">Failed</Badge>
    }
    if (doc.gptStatus === 'processing') {
      return <Badge variant="secondary">Processing</Badge>
    }
    if (doc.gptStatus === 'pending') {
      return <Badge variant="outline">Pending</Badge>
    }
    if (doc.confidenceScore !== null && doc.confidenceScore < CONFIDENCE_THRESHOLD) {
      return <Badge className="bg-yellow-600">Low Confidence</Badge>
    }
    return <Badge className="bg-green-600">Completed</Badge>
  }

  const getConfidenceBadge = (score: number | null) => {
    if (score === null) return null
    const displayScore = Math.round(score * 100)
    if (score >= 0.90) {
      return <Badge className="bg-green-600">{displayScore}%</Badge>
    }
    if (score >= CONFIDENCE_THRESHOLD) {
      return <Badge className="bg-blue-600">{displayScore}%</Badge>
    }
    return <Badge className="bg-yellow-600">{displayScore}%</Badge>
  }

  const getCarrierColor = (carrier: string | null) => {
    switch (carrier?.toUpperCase()) {
      case 'VSP':
        return 'bg-purple-600'
      case 'EYEMED':
        return 'bg-blue-600'
      case 'SPECTERA':
        return 'bg-teal-600'
      default:
        return 'bg-gray-600'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const renderExtractionSummary = (data: Record<string, unknown> | null) => {
    if (!data) return <p className="text-muted-foreground">No data extracted</p>

    const fields: Array<{ label: string; value: unknown; important?: boolean }> = []

    // Patient info
    const patient = data.patient as Record<string, { value: unknown }> | undefined
    if (patient?.memberName?.value) fields.push({ label: 'Member', value: patient.memberName.value })
    if (patient?.authNumber?.value) fields.push({ label: 'Auth #', value: patient.authNumber.value })

    // Plan info
    const plan = data.plan as Record<string, { value: unknown }> | undefined
    if (plan?.benefitPlanName?.value) fields.push({ label: 'Plan', value: plan.benefitPlanName.value })

    // Copays
    const copays = data.copays as Record<string, { value: unknown }> | undefined
    if (copays?.examCopay?.value !== undefined) {
      fields.push({ label: 'Exam Copay', value: `$${copays.examCopay.value}`, important: true })
    }
    if (copays?.materialsCopay?.value !== undefined) {
      fields.push({ label: 'Materials Copay', value: `$${copays.materialsCopay.value}`, important: true })
    }

    // Frame allowance
    const frame = data.frame as { allowances?: { nonAltairMarchonFrameAllowance?: { allowance?: number }; frameAllowance?: { value?: number } } } | undefined
    const frameAllowance = frame?.allowances?.nonAltairMarchonFrameAllowance?.allowance ??
                          frame?.allowances?.frameAllowance?.value
    if (frameAllowance !== undefined) {
      fields.push({ label: 'Frame Allowance', value: `$${frameAllowance}`, important: true })
    }

    // Contact lens
    const contacts = data.contacts as Record<string, { value: unknown }> | undefined
    const clAllowance = contacts?.contactAllowance?.value ?? contacts?.clExamAndMaterialsAllowance?.value
    if (clAllowance !== undefined) {
      fields.push({ label: 'CL Allowance', value: `$${clAllowance}`, important: true })
    }

    // CL Fit
    const clFit = data.clFit as Record<string, { value: unknown }> | undefined
    if (clFit?.standardCost?.value !== undefined) {
      fields.push({ label: 'CL Fit Copay', value: `$${clFit.standardCost.value}` })
    }

    // Progressive copays
    const progressives = copays?.progressiveCopays as Record<string, { value: unknown }> | undefined
    if (progressives) {
      const tiers = Object.entries(progressives).filter(([, v]) => v?.value !== undefined).length
      if (tiers > 0) {
        fields.push({ label: 'Progressive Tiers', value: `${tiers} tiers` })
      }
    }

    if (fields.length === 0) {
      return <p className="text-muted-foreground">Minimal data extracted - manual review may be needed</p>
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {fields.map((field, idx) => (
          <div
            key={idx}
            className={`p-2 rounded ${field.important ? 'bg-primary/10 border border-primary/20' : 'bg-muted'}`}
          >
            <div className="text-xs text-muted-foreground">{field.label}</div>
            <div className="font-medium">{String(field.value)}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <PageLayout title="Insurance Scanner" subtitle="Scanned insurance documents and extraction results">
      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card className={stats.processing + stats.pending > 0 ? 'border-yellow-500' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">Processing</span>
                </div>
                <div className="text-2xl font-bold">{stats.processing + stats.pending}</div>
              </CardContent>
            </Card>

            <Card className="border-green-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <div className="text-2xl font-bold">{stats.completed}</div>
              </CardContent>
            </Card>

            <Card className={stats.lowConfidence > 0 ? 'border-orange-500' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-muted-foreground">Low Confidence</span>
                </div>
                <div className="text-2xl font-bold">{stats.lowConfidence}</div>
              </CardContent>
            </Card>

            <Card className={stats.failed > 0 ? 'border-red-500' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">Failed</span>
                </div>
                <div className="text-2xl font-bold">{stats.failed}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b pb-2">
          {[
            { id: 'completed', label: 'Completed', count: stats?.completed },
            { id: 'processing', label: 'Processing', count: stats ? stats.processing + stats.pending : 0 },
            { id: 'failed', label: 'Failed', count: stats?.failed },
            { id: 'all', label: 'All Documents', count: stats?.total },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 rounded-t-md font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-xs">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Search and Refresh */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, carrier, or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={fetchDocuments} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push('/scanner')}>
            <FileText className="h-4 w-4 mr-2" />
            New Scan
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={fetchDocuments} className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {activeTab === 'completed'
                  ? 'No completed documents'
                  : activeTab === 'processing'
                  ? 'No documents processing'
                  : activeTab === 'failed'
                  ? 'No failed documents'
                  : 'No documents found'}
              </p>
              <Button onClick={() => router.push('/scanner')} className="mt-4">
                Scan New Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map(doc => (
              <Card
                key={doc.id}
                className={`overflow-hidden ${
                  doc.confidenceScore !== null && doc.confidenceScore < CONFIDENCE_THRESHOLD
                    ? 'border-yellow-500'
                    : ''
                }`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(doc.id)}
                >
                  <div className="flex items-center justify-between">
                    {/* Left side - Customer and doc info */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {doc.customer.firstName} {doc.customer.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Center - Carrier and confidence */}
                    <div className="flex items-center gap-3">
                      {doc.carrier && (
                        <Badge className={getCarrierColor(doc.carrier)}>
                          {doc.carrier.toUpperCase()}
                        </Badge>
                      )}
                      {getConfidenceBadge(doc.confidenceScore)}
                      {getStatusBadge(doc)}
                    </div>

                    {/* Right side - Date and expand */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {formatDate(doc.createdAt)}
                        </p>
                      </div>
                      {expandedDoc === doc.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {expandedDoc === doc.id && (
                  <div className="border-t p-4 bg-muted/30">
                    {/* Extraction summary */}
                    <div className="mb-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Extracted Benefits
                      </h4>
                      {renderExtractionSummary(doc.extractedData)}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/customers/${doc.customerId}`)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        View Customer
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/scanner?customerId=${doc.customerId}`)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Scan More Docs
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
