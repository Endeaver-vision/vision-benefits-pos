'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Loader2,
  FolderOpen,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Search,
} from 'lucide-react'

interface BatchJob {
  id: string
  name: string
  folderPath: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  totalFiles: number
  processedFiles: number
  successfulFiles: number
  failedFiles: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  documents: Array<{
    id: string
    status: string
    carrier: string | null
    memberName: string | null
  }>
  stats: {
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
    assigned: number
  }
}

interface BatchDocument {
  id: string
  fileName: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ASSIGNED'
  carrier: string | null
  planName: string | null
  memberName: string | null
  memberId: string | null
  confidenceScore: number | null
  errorMessage: string | null
  processedAt: string | null
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  insuranceCarrier: string | null
}

export default function BatchScannerPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<BatchJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create job form
  const [folderPath, setFolderPath] = useState('')
  const [jobName, setJobName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Expanded job
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [jobDocuments, setJobDocuments] = useState<BatchDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)

  // Processing
  const [processingJob, setProcessingJob] = useState<string | null>(null)

  // Customer assignment modal
  const [assigningDoc, setAssigningDoc] = useState<BatchDocument | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)

  const fetchJobs = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/batch-scan')
      const json = await res.json()
      if (json.success) {
        setJobs(json.data)
      } else {
        setError(json.error)
      }
    } catch {
      setError('Failed to fetch batch jobs')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const createJob = async () => {
    if (!folderPath.trim()) {
      setError('Please enter a folder path')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/batch-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: folderPath.trim(),
          name: jobName.trim() || undefined,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setFolderPath('')
        setJobName('')
        await fetchJobs()
      } else {
        setError(json.error)
      }
    } catch {
      setError('Failed to create batch job')
    } finally {
      setIsCreating(false)
    }
  }

  const processJob = async (jobId: string) => {
    setProcessingJob(jobId)
    setError(null)

    try {
      const res = await fetch(`/api/batch-scan/${jobId}/process`, {
        method: 'POST',
      })

      const json = await res.json()
      if (json.success) {
        await fetchJobs()
        // Refresh documents if this job is expanded
        if (expandedJob === jobId) {
          await fetchJobDocuments(jobId)
        }
      } else {
        setError(json.error)
      }
    } catch {
      setError('Failed to process batch job')
    } finally {
      setProcessingJob(null)
    }
  }

  const fetchJobDocuments = async (jobId: string) => {
    setIsLoadingDocs(true)
    try {
      const res = await fetch(`/api/batch-scan/${jobId}/process`)
      const json = await res.json()
      if (json.success) {
        setJobDocuments(json.documents)
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoadingDocs(false)
    }
  }

  const toggleJob = async (jobId: string) => {
    if (expandedJob === jobId) {
      setExpandedJob(null)
      setJobDocuments([])
    } else {
      setExpandedJob(jobId)
      await fetchJobDocuments(jobId)
    }
  }

  const searchCustomers = async (query: string) => {
    if (query.length < 2) {
      setCustomers([])
      return
    }

    setIsSearchingCustomers(true)
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=10`)
      const json = await res.json()
      if (json.customers) {
        setCustomers(json.customers)
      }
    } catch {
      // Silent fail
    } finally {
      setIsSearchingCustomers(false)
    }
  }

  const assignToCustomer = async (customerId: string) => {
    if (!assigningDoc) return

    setIsAssigning(true)
    try {
      const res = await fetch(`/api/batch-scan/${assigningDoc.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      })

      const json = await res.json()
      if (json.success) {
        setAssigningDoc(null)
        setCustomerSearch('')
        setCustomers([])
        // Refresh job documents
        if (expandedJob) {
          await fetchJobDocuments(expandedJob)
        }
        await fetchJobs()
      } else {
        setError(json.error)
      }
    } catch {
      setError('Failed to assign price list')
    } finally {
      setIsAssigning(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>
      case 'PROCESSING':
        return <Badge className="bg-blue-600">Processing</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-600">Completed</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>
      case 'ASSIGNED':
        return <Badge className="bg-purple-600">Assigned</Badge>
      case 'CANCELLED':
        return <Badge variant="secondary">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCarrierBadge = (carrier: string | null) => {
    if (!carrier) return null
    const colors: Record<string, string> = {
      VSP: 'bg-purple-600',
      EYEMED: 'bg-blue-600',
      SPECTERA: 'bg-teal-600',
    }
    return <Badge className={colors[carrier.toUpperCase()] || 'bg-gray-600'}>{carrier}</Badge>
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <PageLayout title="Batch Scanner" subtitle="Process folders of insurance documents">
      {/* Create Job Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Scan a Folder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter folder path (e.g., /Users/staff/Insurance Docs)"
                  value={folderPath}
                  onChange={e => setFolderPath(e.target.value)}
                />
              </div>
              <div className="w-48">
                <Input
                  placeholder="Job name (optional)"
                  value={jobName}
                  onChange={e => setJobName(e.target.value)}
                />
              </div>
              <Button onClick={createJob} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4 mr-2" />
                )}
                Create Job
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              The folder will be scanned for PDF and image files. Each file will be processed for insurance data extraction.
            </p>
          </CardContent>
        </Card>

        {/* Error display */}
        {error && (
          <Card className="mb-4 border-destructive">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Jobs List */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Batch Jobs</h2>
          <Button variant="outline" onClick={fetchJobs} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No batch jobs yet. Create one above to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <Card key={job.id}>
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleJob(job.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{job.name}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-md">
                          {job.folderPath}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Stats */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{job.totalFiles} files</span>
                        {job.stats.completed > 0 && (
                          <span className="text-green-600">{job.stats.completed} done</span>
                        )}
                        {job.stats.assigned > 0 && (
                          <span className="text-purple-600">{job.stats.assigned} assigned</span>
                        )}
                        {job.stats.failed > 0 && (
                          <span className="text-red-600">{job.stats.failed} failed</span>
                        )}
                      </div>

                      {getStatusBadge(job.status)}

                      {/* Actions */}
                      {job.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={e => {
                            e.stopPropagation()
                            processJob(job.id)
                          }}
                          disabled={processingJob === job.id}
                        >
                          {processingJob === job.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4 mr-1" />
                          )}
                          Process
                        </Button>
                      )}

                      {expandedJob === job.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Progress bar for processing jobs */}
                  {job.status === 'PROCESSING' && (
                    <div className="mt-3">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{
                            width: `${job.totalFiles > 0 ? (job.processedFiles / job.totalFiles) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {job.processedFiles} / {job.totalFiles} processed
                      </p>
                    </div>
                  )}
                </div>

                {/* Expanded document list */}
                {expandedJob === job.id && (
                  <div className="border-t p-4 bg-muted/30">
                    {isLoadingDocs ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : jobDocuments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No documents found</p>
                    ) : (
                      <div className="space-y-2">
                        {jobDocuments.map(doc => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-background rounded-md"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{doc.fileName}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {doc.memberName && (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {doc.memberName}
                                    </span>
                                  )}
                                  {doc.memberId && <span>ID: {doc.memberId}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {getCarrierBadge(doc.carrier)}
                              {doc.confidenceScore && (
                                <Badge
                                  className={
                                    doc.confidenceScore >= 70 ? 'bg-green-600' : 'bg-yellow-600'
                                  }
                                >
                                  {doc.confidenceScore}%
                                </Badge>
                              )}
                              {getStatusBadge(doc.status)}

                              {doc.status === 'COMPLETED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAssigningDoc(doc)}
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Assign
                                </Button>
                              )}

                              {doc.errorMessage && (
                                <span className="text-xs text-destructive max-w-xs truncate">
                                  {doc.errorMessage}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Customer Assignment Modal */}
      {assigningDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Assign Price List to Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-muted rounded-md">
                <p className="font-medium">{assigningDoc.fileName}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getCarrierBadge(assigningDoc.carrier)}
                  {assigningDoc.memberName && (
                    <span className="text-sm text-muted-foreground">
                      Member: {assigningDoc.memberName}
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Search Customer</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or member ID..."
                    value={customerSearch}
                    onChange={e => {
                      setCustomerSearch(e.target.value)
                      searchCustomers(e.target.value)
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {isSearchingCustomers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : customers.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {customers.map(customer => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-md hover:bg-muted/80 cursor-pointer"
                      onClick={() => assignToCustomer(customer.id)}
                    >
                      <div>
                        <p className="font-medium">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                      {customer.insuranceCarrier && (
                        <Badge variant="outline">{customer.insuranceCarrier}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : customerSearch.length >= 2 ? (
                <p className="text-center text-muted-foreground py-4">No customers found</p>
              ) : null}

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssigningDoc(null)
                    setCustomerSearch('')
                    setCustomers([])
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageLayout>
  )
}
