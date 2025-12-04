'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface DocumentUploadProps {
  customerId: string
  onUploadComplete: (document: {
    documentId: string
    fileName: string
    filePath: string
  }) => void
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export function DocumentUpload({ customerId, onUploadComplete }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}. Please upload a PDF, JPG, or PNG file.`
    }
    if (file.size > MAX_SIZE) {
      return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 10MB limit.`
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

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('customerId', customerId)
      formData.append('uploadedBy', 'scanner-ui')

      // Simulate progress (since fetch doesn't support progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (result.success) {
        onUploadComplete({
          documentId: result.documentId,
          fileName: result.fileName,
          filePath: result.filePath,
        })
      } else {
        setError(result.error || 'Upload failed')
        setUploading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
    }
  }, [selectedFile, customerId, onUploadComplete])

  const clearSelection = useCallback(() => {
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-400" />
    }
    return <ImageIcon className="h-8 w-8 text-blue-400" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Document
        </CardTitle>
        <CardDescription>
          Upload an insurance card, authorization, or benefits summary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        {!selectedFile && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
              ${isDragging
                ? 'border-primary bg-primary/10'
                : 'border-white/20 hover:border-white/40 hover:bg-white/5'
              }
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
                <Upload className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {isDragging ? 'Drop your file here' : 'Drag and drop your document'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>
              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> PDF
                </span>
                <span className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> JPG
                </span>
                <span className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> PNG
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Maximum file size: 10MB</p>
            </div>
          </div>
        )}

        {/* Selected File Preview */}
        {selectedFile && !uploading && (
          <div className="border border-white/20 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center">
                {getFileIcon(selectedFile.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clearSelection}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center">
                {getFileIcon(selectedFile?.type || '')}
              </div>
              <div className="flex-1">
                <p className="font-medium truncate">{selectedFile?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {uploadProgress < 100 ? 'Uploading...' : 'Upload complete!'}
                </p>
              </div>
              {uploadProgress === 100 && (
                <CheckCircle className="h-5 w-5 text-success" />
              )}
            </div>
            <Progress
              value={uploadProgress}
              variant={uploadProgress === 100 ? 'success' : 'default'}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && !uploading && (
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={clearSelection}>
              Cancel
            </Button>
            <Button onClick={handleUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload & Process
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
