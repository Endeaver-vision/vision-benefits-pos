'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  AlertCircle,
  CheckCircle,
  Plus,
  Loader2
} from 'lucide-react'

export type DocumentSlot = 'authorization' | 'lens-enhancement'

interface UploadedDocument {
  documentId: string
  fileName: string
  filePath: string
  slot: DocumentSlot
  detectedType?: string
}

interface DocumentFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  progress: number
  uploadedDoc?: UploadedDocument
  error?: string
  detectedType?: string
}

interface MultiDocumentUploadProps {
  customerId: string
  onUploadComplete: (documents: UploadedDocument[]) => void
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export function MultiDocumentUpload({ customerId, onUploadComplete }: MultiDocumentUploadProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateId = () => Math.random().toString(36).substring(2, 9)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}. Please upload a PDF, JPG, or PNG file.`
    }
    if (file.size > MAX_SIZE) {
      return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 10MB limit.`
    }
    return null
  }

  const detectDocumentType = (fileName: string): string => {
    const lower = fileName.toLowerCase()
    // Check lens/enhancement FIRST (before carrier detection)
    // because files like "AB-vsp-lens-1.pdf" contain both "vsp" and "lens"
    if (lower.includes('lens') || lower.includes('enhancement') || lower.includes('copay')) {
      return 'Lens Enhancement Form'
    }
    if (lower.includes('auth') || lower.includes('patient') || lower.includes('record')) {
      return 'VSP Authorization'
    }
    if (lower.includes('eyemed')) {
      return 'EyeMed Authorization'
    }
    if (lower.includes('spectera')) {
      return 'Spectera Authorization'
    }
    if (lower.includes('vsp')) {
      return 'VSP Authorization'
    }
    return 'Insurance Document'
  }

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newDocs: DocumentFile[] = []

    fileArray.forEach(file => {
      const validationError = validateFile(file)
      if (validationError) {
        newDocs.push({
          id: generateId(),
          file,
          status: 'error',
          progress: 0,
          error: validationError
        })
      } else {
        newDocs.push({
          id: generateId(),
          file,
          status: 'pending',
          progress: 0,
          detectedType: detectDocumentType(file.name)
        })
      }
    })

    setDocuments(prev => [...prev, ...newDocs])
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }, [addFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [addFiles])

  const removeDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id))
  }, [])

  const uploadDocument = async (doc: DocumentFile): Promise<UploadedDocument | null> => {
    const formData = new FormData()
    formData.append('file', doc.file)
    formData.append('customerId', customerId)
    formData.append('uploadedBy', 'scanner-ui')

    // Determine document type based on detection
    let documentType = 'VSP_AUTHORIZATION'
    if (doc.detectedType?.toLowerCase().includes('lens') || doc.detectedType?.toLowerCase().includes('enhancement')) {
      documentType = 'VSP_LENS_ENHANCEMENT'
    } else if (doc.detectedType?.toLowerCase().includes('eyemed')) {
      documentType = 'EYEMED_AUTHORIZATION'
    } else if (doc.detectedType?.toLowerCase().includes('spectera')) {
      documentType = 'SPECTERA_AUTHORIZATION'
    }
    formData.append('documentType', documentType)

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      return {
        documentId: result.documentId,
        fileName: result.fileName,
        filePath: result.filePath,
        slot: documentType.includes('LENS') ? 'lens-enhancement' : 'authorization',
        detectedType: doc.detectedType
      }
    } else {
      throw new Error(result.error || 'Upload failed')
    }
  }

  const handleUploadAll = useCallback(async () => {
    const pendingDocs = documents.filter(d => d.status === 'pending')
    if (pendingDocs.length === 0) return

    const results: UploadedDocument[] = []

    for (const doc of pendingDocs) {
      // Set uploading
      setDocuments(prev => prev.map(d =>
        d.id === doc.id ? { ...d, status: 'uploading' as const, progress: 30 } : d
      ))

      try {
        // Upload
        setDocuments(prev => prev.map(d =>
          d.id === doc.id ? { ...d, progress: 60 } : d
        ))

        const result = await uploadDocument(doc)

        if (result) {
          // Complete
          setDocuments(prev => prev.map(d =>
            d.id === doc.id ? { ...d, status: 'complete' as const, progress: 100, uploadedDoc: result } : d
          ))
          results.push(result)
        }
      } catch (err) {
        setDocuments(prev => prev.map(d =>
          d.id === doc.id ? {
            ...d,
            status: 'error' as const,
            progress: 0,
            error: err instanceof Error ? err.message : 'Upload failed'
          } : d
        ))
      }
    }

    // Auto-continue after all uploads complete - the scanner page will handle OCR processing
    if (results.length > 0) {
      onUploadComplete(results)
    }
  }, [documents, customerId, onUploadComplete])


  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-400" />
    }
    return <ImageIcon className="h-5 w-5 text-blue-400" />
  }

  const getStatusBadge = (doc: DocumentFile) => {
    switch (doc.status) {
      case 'pending':
        return <Badge variant="outline" className="text-xs">Ready</Badge>
      case 'uploading':
        return <Badge variant="secondary" className="text-xs">Uploading...</Badge>
      case 'processing':
        return <Badge variant="secondary" className="text-xs">Processing...</Badge>
      case 'complete':
        return <Badge variant="default" className="text-xs bg-green-600">Accepted</Badge>
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>
    }
  }

  const pendingCount = documents.filter(d => d.status === 'pending').length
  const completedCount = documents.filter(d => d.status === 'complete').length
  const isProcessing = documents.some(d => d.status === 'uploading' || d.status === 'processing')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Insurance Documents
        </CardTitle>
        <CardDescription>
          Upload insurance authorization and benefit documents.
          You can select multiple files or add them one at a time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drop Zone */}
        <div
          className={`
            relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer
            ${isDragging ? 'border-primary bg-primary/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <Upload className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium">
                Drop files here or click to select
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                PDF, JPG, or PNG • Max 10MB per file • Multiple files supported
              </p>
            </div>
          </div>
        </div>

        {/* Document List */}
        {documents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">
                Documents ({documents.length})
              </h4>
              {completedCount > 0 && (
                <span className="text-sm text-green-500">
                  {completedCount} processed
                </span>
              )}
            </div>

            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl transition-all
                    ${doc.status === 'complete' ? 'bg-green-500/10 border border-green-500/30' :
                      doc.status === 'error' ? 'bg-destructive/10 border border-destructive/30' :
                      'bg-white/5 border border-white/10'}
                  `}
                >
                  {/* File Icon */}
                  <div className="shrink-0">
                    {doc.status === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : doc.status === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : doc.status === 'uploading' || doc.status === 'processing' ? (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    ) : (
                      getFileIcon(doc.file.type)
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{doc.file.name}</p>
                      {getStatusBadge(doc)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {doc.detectedType && doc.status !== 'error' && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <p className="text-xs text-primary">{doc.detectedType}</p>
                        </>
                      )}
                    </div>
                    {doc.error && (
                      <p className="text-xs text-destructive mt-1">{doc.error}</p>
                    )}
                    {(doc.status === 'uploading' || doc.status === 'processing') && (
                      <Progress value={doc.progress} className="h-1 mt-2" />
                    )}
                  </div>

                  {/* Remove Button */}
                  {(doc.status === 'pending' || doc.status === 'error' || doc.status === 'complete') && !isProcessing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeDocument(doc.id)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add More Files
          </Button>

          <Button
            onClick={handleUploadAll}
            disabled={isProcessing || pendingCount === 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Process{pendingCount > 1 ? ` (${pendingCount} files)` : pendingCount === 1 ? ' (1 file)' : ''}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
