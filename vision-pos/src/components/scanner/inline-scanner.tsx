'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileSearch,
  Brain,
  Shield
} from 'lucide-react'

interface InlineScannerProps {
  customerId: string
  onDocumentProcessed?: (result: ProcessedDocument) => void
  onClose?: () => void
  compact?: boolean
}

interface ProcessedDocument {
  documentId: string
  carrier?: string
  planName?: string
  confidenceScore?: number
  extractedData?: Record<string, unknown>
  success: boolean
  error?: string
}

type ScannerState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export function InlineScanner({ customerId, onDocumentProcessed, onClose, compact = false }: InlineScannerProps) {
  const [state, setState] = useState<ScannerState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProcessedDocument | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type. Please upload a PDF, JPG, or PNG file.`
    }
    if (file.size > MAX_SIZE) {
      return `File size exceeds 10MB limit.`
    }
    return null
  }

  const handleFile = useCallback((file: File) => {
    setError(null)
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setSelectedFile(file)
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
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }, [handleFile])

  const processDocument = useCallback(async () => {
    if (!selectedFile) return

    setState('uploading')
    setProgress(10)
    setError(null)

    try {
      // Step 1: Upload
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('customerId', customerId)
      formData.append('uploadedBy', 'inline-scanner')

      setProgress(20)

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed')
      }

      setProgress(40)
      setState('processing')

      // Step 2: Process with OCR + GPT
      const processResponse = await fetch(`/api/documents/${uploadResult.documentId}/process`, {
        method: 'POST',
      })

      setProgress(80)

      const processResult = await processResponse.json()

      if (processResult.success) {
        setProgress(100)
        setState('complete')

        const processed: ProcessedDocument = {
          documentId: uploadResult.documentId,
          carrier: processResult.carrier,
          planName: processResult.planName,
          confidenceScore: processResult.confidenceScore,
          extractedData: processResult.extractedData,
          success: true,
        }

        setResult(processed)
        onDocumentProcessed?.(processed)
      } else {
        throw new Error(processResult.error || 'Processing failed')
      }
    } catch (err) {
      setState('error')
      const errorMessage = err instanceof Error ? err.message : 'Processing failed'
      setError(errorMessage)
      setResult({
        documentId: '',
        success: false,
        error: errorMessage,
      })
    }
  }, [selectedFile, customerId, onDocumentProcessed])

  const reset = useCallback(() => {
    setState('idle')
    setSelectedFile(null)
    setProgress(0)
    setError(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') {
      return <FileText className="h-6 w-6 text-red-400" />
    }
    return <ImageIcon className="h-6 w-6 text-blue-400" />
  }

  // Compact mode for embedding in smaller spaces
  if (compact) {
    return (
      <div className="space-y-3">
        {state === 'idle' && !selectedFile && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
              ${isDragging
                ? 'border-emerald-400 bg-emerald-400/10'
                : 'border-white/20 hover:border-white/40 hover:bg-white/5'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-emerald-400' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium">Drop document or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (max 10MB)</p>
          </div>
        )}

        {state === 'idle' && selectedFile && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            {getFileIcon(selectedFile.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={processDocument}>
              <Upload className="h-4 w-4 mr-1" />
              Process
            </Button>
          </div>
        )}

        {(state === 'uploading' || state === 'processing') && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              <span className="text-sm">
                {state === 'uploading' ? 'Uploading document...' : 'Running OCR & AI extraction...'}
              </span>
            </div>
            <Progress value={progress} variant="default" className="h-2" />
          </div>
        )}

        {state === 'complete' && result && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/30 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <span className="font-medium text-emerald-400">Document Processed</span>
              {result.carrier && (
                <Badge variant="success" size="sm">{result.carrier}</Badge>
              )}
            </div>
            {result.planName && (
              <p className="text-sm text-muted-foreground">{result.planName}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={reset}>
                Scan Another
              </Button>
              {onClose && (
                <Button size="sm" onClick={onClose}>Done</Button>
              )}
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={reset}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Full mode with more details
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-emerald-500" />
            Scan Insurance Document
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        {state === 'idle' && !selectedFile && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              ${isDragging
                ? 'border-emerald-400 bg-emerald-400/10'
                : 'border-white/20 hover:border-white/40 hover:bg-white/5'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragging ? 'text-emerald-400' : 'text-muted-foreground'}`} />
            <p className="font-medium">
              {isDragging ? 'Drop your file here' : 'Drag and drop your document'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
            <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" /> PDF
              </span>
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> JPG/PNG
              </span>
            </div>
          </div>
        )}

        {/* Selected File */}
        {state === 'idle' && selectedFile && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                {getFileIcon(selectedFile.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={reset}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">
                Cancel
              </Button>
              <Button onClick={processDocument} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Upload & Process
              </Button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {(state === 'uploading' || state === 'processing') && (
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${progress >= 40 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-muted-foreground'}`}>
                  {progress >= 40 ? <CheckCircle className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <span className={progress >= 40 ? 'text-emerald-400' : ''}>Uploading document</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${progress >= 80 ? 'bg-emerald-500/20 text-emerald-400' : state === 'processing' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted-foreground'}`}>
                  {progress >= 80 ? <CheckCircle className="h-4 w-4" /> : state === 'processing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                </div>
                <span className={progress >= 80 ? 'text-emerald-400' : state === 'processing' ? 'text-primary' : 'text-muted-foreground'}>Running OCR extraction</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${progress === 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-muted-foreground'}`}>
                  {progress === 100 ? <CheckCircle className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
                </div>
                <span className={progress === 100 ? 'text-emerald-400' : 'text-muted-foreground'}>AI data extraction</span>
              </div>
            </div>
          </div>
        )}

        {/* Complete State */}
        {state === 'complete' && result && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="font-medium text-emerald-400">Document Processed Successfully</p>
                  {result.confidenceScore && (
                    <p className="text-sm text-muted-foreground">
                      {(result.confidenceScore * 100).toFixed(0)}% confidence
                    </p>
                  )}
                </div>
              </div>
              {(result.carrier || result.planName) && (
                <div className="flex flex-wrap gap-2">
                  {result.carrier && (
                    <Badge variant="success">{result.carrier}</Badge>
                  )}
                  {result.planName && (
                    <Badge variant="secondary">{result.planName}</Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">
                Scan Another
              </Button>
              {onClose && (
                <Button onClick={onClose} className="flex-1">
                  Done
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Processing Failed</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={reset} className="w-full">
              Try Again
            </Button>
          </div>
        )}

        {error && state === 'idle' && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
