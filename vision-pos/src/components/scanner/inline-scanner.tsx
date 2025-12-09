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

interface FileWithStatus {
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  progress: number
  error?: string
  result?: ProcessedDocument
}

type ScannerState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export function InlineScanner({ customerId, onDocumentProcessed, onClose, compact = false }: InlineScannerProps) {
  const [state, setState] = useState<ScannerState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileWithStatus[]>([])
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProcessedDocument | null>(null)
  const [processedCount, setProcessedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // For backward compatibility
  const selectedFile = selectedFiles.length > 0 ? selectedFiles[0].file : null

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
    // Add file to the list (allow multiple)
    setSelectedFiles(prev => [...prev, {
      file,
      status: 'pending',
      progress: 0
    }])
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
    // Handle multiple files
    for (let i = 0; i < files.length; i++) {
      handleFile(files[i])
    }
  }, [handleFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      // Handle multiple files
      for (let i = 0; i < files.length; i++) {
        handleFile(files[i])
      }
    }
  }, [handleFile])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const processDocument = useCallback(async () => {
    if (selectedFiles.length === 0) return

    setState('uploading')
    setProgress(0)
    setError(null)
    setProcessedCount(0)

    const totalFiles = selectedFiles.length
    let lastResult: ProcessedDocument | null = null
    let hasError = false

    for (let i = 0; i < selectedFiles.length; i++) {
      const fileEntry = selectedFiles[i]
      const fileProgress = (i / totalFiles) * 100

      // Update file status
      setSelectedFiles(prev => prev.map((f, idx) =>
        idx === i ? { ...f, status: 'uploading', progress: 10 } : f
      ))
      setProgress(fileProgress + (10 / totalFiles))

      try {
        // Step 1: Upload
        const formData = new FormData()
        formData.append('file', fileEntry.file)
        formData.append('customerId', customerId)
        formData.append('uploadedBy', 'inline-scanner')

        const uploadResponse = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        })

        const uploadResult = await uploadResponse.json()

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Upload failed')
        }

        setSelectedFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'processing', progress: 50 } : f
        ))
        setProgress(fileProgress + (50 / totalFiles))
        setState('processing')

        // Step 2: Process with OCR + GPT
        const processResponse = await fetch(`/api/documents/${uploadResult.documentId}/process`, {
          method: 'POST',
        })

        const processResult = await processResponse.json()

        if (processResult.success) {
          const processed: ProcessedDocument = {
            documentId: uploadResult.documentId,
            carrier: processResult.carrier,
            planName: processResult.planName,
            confidenceScore: processResult.confidenceScore,
            extractedData: processResult.extractedData,
            success: true,
          }

          setSelectedFiles(prev => prev.map((f, idx) =>
            idx === i ? { ...f, status: 'complete', progress: 100, result: processed } : f
          ))
          setProcessedCount(prev => prev + 1)
          lastResult = processed
          onDocumentProcessed?.(processed)
        } else {
          throw new Error(processResult.error || 'Processing failed')
        }
      } catch (err) {
        hasError = true
        const errorMessage = err instanceof Error ? err.message : 'Processing failed'
        setSelectedFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'error', error: errorMessage } : f
        ))
      }
    }

    setProgress(100)
    if (hasError && !lastResult) {
      setState('error')
      setError('One or more documents failed to process')
    } else {
      setState('complete')
      setResult(lastResult)
    }
  }, [selectedFiles, customerId, onDocumentProcessed])

  const reset = useCallback(() => {
    setState('idle')
    setSelectedFiles([])
    setProgress(0)
    setError(null)
    setResult(null)
    setProcessedCount(0)
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
        {/* Drop zone - always show when idle, even with files selected */}
        {state === 'idle' && (
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
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-emerald-400' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium">Drop documents or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (max 10MB each)</p>
            <p className="text-xs text-white/50 mt-2">Upload authorization and benefit documents</p>
          </div>
        )}

        {/* Selected files list */}
        {state === 'idle' && selectedFiles.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-white/60 font-medium">{selectedFiles.length} document{selectedFiles.length > 1 ? 's' : ''} selected</div>
            {selectedFiles.map((fileEntry, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                {getFileIcon(fileEntry.file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileEntry.file.name}</p>
                  <p className="text-xs text-muted-foreground">{(fileEntry.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => removeFile(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={reset} className="flex-1">
                Clear All
              </Button>
              <Button size="sm" onClick={processDocument} className="flex-1">
                <Upload className="h-4 w-4 mr-1" />
                Process {selectedFiles.length > 1 ? `All ${selectedFiles.length}` : ''}
              </Button>
            </div>
          </div>
        )}

        {(state === 'uploading' || state === 'processing') && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                <span className="text-sm">
                  Processing {selectedFiles.length} document{selectedFiles.length > 1 ? 's' : ''}...
                </span>
              </div>
              <span className="text-xs text-white/60">{processedCount}/{selectedFiles.length}</span>
            </div>
            <Progress value={progress} variant="default" className="h-2" />
            {/* Individual file status */}
            <div className="space-y-1">
              {selectedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {f.status === 'complete' ? (
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                  ) : f.status === 'error' ? (
                    <AlertCircle className="h-3 w-3 text-red-400" />
                  ) : f.status === 'pending' ? (
                    <div className="h-3 w-3 rounded-full border border-white/30" />
                  ) : (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                  )}
                  <span className={`truncate ${f.status === 'complete' ? 'text-emerald-400' : f.status === 'error' ? 'text-red-400' : 'text-white/60'}`}>
                    {f.file.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {state === 'complete' && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/30 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <span className="font-medium text-emerald-400">
                {processedCount} Document{processedCount > 1 ? 's' : ''} Processed
              </span>
              {result?.carrier && (
                <Badge variant="success" size="sm">{result.carrier}</Badge>
              )}
            </div>
            {result?.planName && (
              <p className="text-sm text-muted-foreground">{result.planName}</p>
            )}
            {/* Show any errors */}
            {selectedFiles.some(f => f.status === 'error') && (
              <div className="text-xs text-red-400">
                {selectedFiles.filter(f => f.status === 'error').length} file(s) had errors
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={reset}>
                Scan More
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
        {/* Drop Zone - always show when idle */}
        {state === 'idle' && (
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
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragging ? 'text-emerald-400' : 'text-muted-foreground'}`} />
            <p className="font-medium">
              {isDragging ? 'Drop your files here' : 'Drag and drop your documents'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse (select multiple)</p>
            <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" /> PDF
              </span>
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> JPG/PNG
              </span>
            </div>
            <p className="text-xs text-white/50 mt-3">Upload authorization and benefit documents</p>
          </div>
        )}

        {/* Selected Files */}
        {state === 'idle' && selectedFiles.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm font-medium text-white/80">{selectedFiles.length} document{selectedFiles.length > 1 ? 's' : ''} selected</div>
            {selectedFiles.map((fileEntry, index) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                  {getFileIcon(fileEntry.file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{fileEntry.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(fileEntry.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => removeFile(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">
                Clear All
              </Button>
              <Button onClick={processDocument} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Upload & Process {selectedFiles.length > 1 ? `All ${selectedFiles.length}` : ''}
              </Button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {(state === 'uploading' || state === 'processing') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Processing {selectedFiles.length} document{selectedFiles.length > 1 ? 's' : ''}...</span>
              <span className="text-xs text-white/60">{processedCount}/{selectedFiles.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
            {/* Per-file status */}
            <div className="space-y-2 pt-2">
              {selectedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  {f.status === 'complete' ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  ) : f.status === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  ) : f.status === 'pending' ? (
                    <div className="h-4 w-4 rounded-full border border-white/30" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  )}
                  <span className={`text-sm truncate flex-1 ${f.status === 'complete' ? 'text-emerald-400' : f.status === 'error' ? 'text-red-400' : 'text-white/70'}`}>
                    {f.file.name}
                  </span>
                  {f.status !== 'pending' && f.status !== 'complete' && f.status !== 'error' && (
                    <span className="text-xs text-white/50">{f.status === 'uploading' ? 'Uploading...' : 'Processing...'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete State */}
        {state === 'complete' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
                <div>
                  <p className="font-medium text-emerald-400">
                    {processedCount} Document{processedCount > 1 ? 's' : ''} Processed Successfully
                  </p>
                  {result?.confidenceScore && (
                    <p className="text-sm text-muted-foreground">
                      {(result.confidenceScore * 100).toFixed(0)}% confidence
                    </p>
                  )}
                </div>
              </div>
              {(result?.carrier || result?.planName) && (
                <div className="flex flex-wrap gap-2">
                  {result.carrier && (
                    <Badge variant="success">{result.carrier}</Badge>
                  )}
                  {result.planName && (
                    <Badge variant="secondary">{result.planName}</Badge>
                  )}
                </div>
              )}
              {/* Show any failed files */}
              {selectedFiles.some(f => f.status === 'error') && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-red-400 mb-2">{selectedFiles.filter(f => f.status === 'error').length} file(s) had errors:</p>
                  {selectedFiles.filter(f => f.status === 'error').map((f, i) => (
                    <p key={i} className="text-xs text-red-300">{f.file.name}: {f.error}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">
                Scan More
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
