'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Camera, X, FileImage, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type DocumentType =
  | 'INSURANCE_CARD_FRONT'
  | 'INSURANCE_CARD_BACK'
  | 'AUTHORIZATION_FORM'
  | 'ELIGIBILITY_VERIFICATION'
  | 'EOB'
  | 'PRESCRIPTION'
  | 'OTHER';

interface UploadedFile {
  file: File;
  preview: string;
  documentType: DocumentType;
}

interface DocumentUploaderProps {
  customerId: string;
  onUploadComplete?: (documents: UploadedFile[]) => void;
  onProcessingStart?: () => void;
  maxFiles?: number;
  acceptedTypes?: string[];
}

export function DocumentUploader({
  customerId,
  onUploadComplete,
  onProcessingStart,
  maxFiles = 2,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = useCallback((file: File, type: DocumentType): UploadedFile | null => {
    if (!acceptedTypes.includes(file.type)) {
      setError(`File type not supported: ${file.type}`);
      return null;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return null;
    }

    const preview = URL.createObjectURL(file);
    return { file, preview, documentType: type };
  }, [acceptedTypes]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const droppedFiles = Array.from(e.dataTransfer.files);

    if (files.length + droppedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles: UploadedFile[] = [];
    droppedFiles.forEach((file, index) => {
      // Auto-assign type: first file = front, second = back
      const type: DocumentType = files.length + index === 0
        ? 'INSURANCE_CARD_FRONT'
        : 'INSURANCE_CARD_BACK';

      const processed = processFile(file, type);
      if (processed) newFiles.push(processed);
    });

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, maxFiles, processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFiles = Array.from(e.target.files || []);

    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles: UploadedFile[] = [];
    selectedFiles.forEach((file, index) => {
      const type: DocumentType = files.length + index === 0
        ? 'INSURANCE_CARD_FRONT'
        : 'INSURANCE_CARD_BACK';

      const processed = processFile(file, type);
      if (processed) newFiles.push(processed);
    });

    setFiles(prev => [...prev, ...newFiles]);

    // Reset input
    if (e.target) e.target.value = '';
  }, [files.length, maxFiles, processFile]);

  const handleCameraCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e);
  }, [handleFileSelect]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  }, []);

  const changeDocumentType = useCallback((index: number, type: DocumentType) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], documentType: type };
      return newFiles;
    });
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);
    onProcessingStart?.();

    try {
      const formData = new FormData();
      formData.append('customerId', customerId);

      files.forEach((uploadedFile, index) => {
        formData.append(`file_${index}`, uploadedFile.file);
        formData.append(`type_${index}`, uploadedFile.documentType);
      });

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      onUploadComplete?.(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [files, customerId, onUploadComplete, onProcessingStart]);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-colors',
          'flex flex-col items-center justify-center min-h-[200px]',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          files.length >= maxFiles && 'opacity-50 pointer-events-none'
        )}
      >
        <Upload className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground text-center mb-2">
          <span className="font-medium">Drag and drop</span> insurance card images here
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Supports: JPEG, PNG, WebP, PDF (max 10MB)
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= maxFiles}
          >
            <FileImage className="h-4 w-4 mr-2" />
            Browse Files
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            disabled={files.length >= maxFiles}
          >
            <Camera className="h-4 w-4 mr-2" />
            Take Photo
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* File Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {files.map((uploadedFile, index) => (
            <div
              key={index}
              className="relative border rounded-lg overflow-hidden bg-muted/30"
            >
              {/* Preview Image */}
              <div className="aspect-[3/2] relative">
                {uploadedFile.file.type === 'application/pdf' ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <FileImage className="h-16 w-16 text-muted-foreground" />
                    <span className="sr-only">PDF Document</span>
                  </div>
                ) : (
                  <img
                    src={uploadedFile.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background shadow-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Document Type Selector */}
              <div className="p-3 border-t">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Document Type
                </label>
                <select
                  value={uploadedFile.documentType}
                  onChange={(e) => changeDocumentType(index, e.target.value as DocumentType)}
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background"
                >
                  <option value="INSURANCE_CARD_FRONT">Insurance Card - Front</option>
                  <option value="INSURANCE_CARD_BACK">Insurance Card - Back</option>
                  <option value="AUTHORIZATION_FORM">Authorization Form</option>
                  <option value="ELIGIBILITY_VERIFICATION">Eligibility Verification</option>
                  <option value="EOB">Explanation of Benefits</option>
                  <option value="PRESCRIPTION">Prescription</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="min-w-[140px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Process
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
