'use client';

import { useState, useCallback } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DocumentUploader } from './DocumentUploader';
import { ExtractionReview, ExtractedInsuranceData } from './ExtractionReview';

type ScannerStep = 'upload' | 'processing' | 'review' | 'success';

interface InsuranceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onVerificationComplete?: (data: ExtractedInsuranceData) => void;
}

export function InsuranceScannerModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  onVerificationComplete,
}: InsuranceScannerModalProps) {
  const [step, setStep] = useState<ScannerStep>('upload');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [frontImage, setFrontImage] = useState<string | undefined>();
  const [backImage, setBackImage] = useState<string | undefined>();
  const [extractedData, setExtractedData] = useState<ExtractedInsuranceData | null>(null);
  const [processingStatus, setProcessingStatus] = useState<
    'processing' | 'ready_for_review' | 'verified' | 'failed'
  >('processing');

  const handleUploadComplete = useCallback(
    async (files: { preview: string; documentType: string }[]) => {
      // Store previews
      files.forEach((file) => {
        if (file.documentType === 'INSURANCE_CARD_FRONT') {
          setFrontImage(file.preview);
        } else if (file.documentType === 'INSURANCE_CARD_BACK') {
          setBackImage(file.preview);
        }
      });

      setStep('processing');
      setProcessingStatus('processing');

      try {
        // Poll for processing status
        const pollInterval = setInterval(async () => {
          const response = await fetch(`/api/documents/${documentId}/status`);
          const data = await response.json();

          if (data.status === 'ready_for_review') {
            clearInterval(pollInterval);
            setExtractedData(data.extractedData);
            setProcessingStatus('ready_for_review');
            setStep('review');
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setProcessingStatus('failed');
          }
        }, 2000);

        // Timeout after 60 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
          if (processingStatus === 'processing') {
            setProcessingStatus('failed');
          }
        }, 60000);
      } catch {
        setProcessingStatus('failed');
      }
    },
    [documentId, processingStatus]
  );

  const handleProcessingStart = useCallback(() => {
    setStep('processing');
  }, []);

  const handleVerify = useCallback(
    async (data: ExtractedInsuranceData) => {
      // Save verified data to database
      await fetch(`/api/documents/${documentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          extractedData: data,
        }),
      });

      // Update customer insurance info
      await fetch(`/api/customers/${customerId}/insurance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: data.carrier,
          memberId: data.memberId,
          groupNumber: data.groupNumber,
          planName: data.planName,
          networkTier: data.networkTier,
          copayExam: data.examCopay,
          copayMaterials: data.materialsCopay,
          frameAllowance: data.frameAllowance,
          lensAllowance: data.lensAllowance,
          contactAllowance: data.contactAllowance,
          effectiveDate: data.effectiveDate,
          expirationDate: data.expirationDate,
          isVerified: true,
        }),
      });

      setStep('success');
      onVerificationComplete?.(data);
    },
    [documentId, customerId, onVerificationComplete]
  );

  const handleClose = useCallback(() => {
    // Reset state
    setStep('upload');
    setDocumentId(null);
    setFrontImage(undefined);
    setBackImage(undefined);
    setExtractedData(null);
    setProcessingStatus('processing');
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {step === 'upload' && 'Scan Insurance Card'}
              {step === 'processing' && 'Processing...'}
              {step === 'review' && 'Review Information'}
              {step === 'success' && 'Verification Complete'}
            </span>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload images of {customerName}&apos;s insurance card (front and back) to
                automatically extract their benefits information.
              </p>
              <DocumentUploader
                customerId={customerId}
                onUploadComplete={handleUploadComplete}
                onProcessingStart={handleProcessingStart}
                maxFiles={2}
              />
            </div>
          )}

          {/* Step: Processing / Review */}
          {(step === 'processing' || step === 'review') && extractedData && (
            <ExtractionReview
              documentId={documentId || ''}
              customerId={customerId}
              customerName={customerName}
              frontImage={frontImage}
              backImage={backImage}
              extractedData={extractedData}
              processingStatus={processingStatus}
              onVerify={handleVerify}
              onCancel={() => setStep('upload')}
            />
          )}

          {/* Step: Processing (no data yet) */}
          {step === 'processing' && !extractedData && (
            <ExtractionReview
              documentId={documentId || ''}
              customerId={customerId}
              customerName={customerName}
              frontImage={frontImage}
              backImage={backImage}
              extractedData={{
                carrier: null,
                carrierConfidence: 0,
                memberId: null,
                memberIdConfidence: 0,
                groupNumber: null,
                groupConfidence: 0,
                planName: null,
                planConfidence: 0,
                networkTier: null,
                tierConfidence: 0,
                examCopay: null,
                materialsCopay: null,
                frameAllowance: null,
                lensAllowance: null,
                contactAllowance: null,
                effectiveDate: null,
                expirationDate: null,
                overallConfidence: 0,
              }}
              processingStatus={processingStatus}
              onVerify={handleVerify}
              onCancel={() => setStep('upload')}
            />
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">Insurance Verified!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {customerName}&apos;s insurance information has been saved and their
                  pricing has been updated.
                </p>
              </div>
              <Button onClick={handleClose}>Done</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
