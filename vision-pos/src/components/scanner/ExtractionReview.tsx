'use client';

import { useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Edit2,
  Save,
  X,
  Loader2,
  BadgeCheck,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CardPreviewCompact } from './CardPreview';
import { cn } from '@/lib/utils';

export interface ExtractedInsuranceData {
  carrier: string | null;
  carrierConfidence?: number;
  memberId: string | null;
  memberIdConfidence?: number;
  groupNumber: string | null;
  groupConfidence?: number;
  planName: string | null;
  planConfidence?: number;
  networkTier: string | null;
  tierConfidence?: number;
  examCopay: number | null;
  materialsCopay: number | null;
  frameAllowance: number | null;
  lensAllowance: number | null;
  contactAllowance: number | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  overallConfidence?: number;
  // Authorization-specific fields
  authNumber?: string | null;
  authExpiryDate?: string | null;
  approvedServices?: string[] | null;
  authNotes?: string | null;
}

interface ExtractionReviewProps {
  documentId: string;
  documentType?: string;
  imagePath?: string;
  customerId?: string;
  customerName?: string;
  frontImage?: string;
  backImage?: string;
  extractedData: ExtractedInsuranceData;
  confidenceScores?: Record<string, number>;
  processingStatus?: 'processing' | 'ready_for_review' | 'verified' | 'failed';
  onVerify: (data: ExtractedInsuranceData) => Promise<void> | void;
  onCancel: () => void;
}

interface EditableFieldProps {
  label: string;
  value: string | number | null;
  confidence: number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'date';
  prefix?: string;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.9) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="h-3 w-3" />
        High
      </span>
    );
  }
  if (confidence >= 0.7) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
        <AlertTriangle className="h-3 w-3" />
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
      <AlertCircle className="h-3 w-3" />
      Low
    </span>
  );
}

function EditableField({
  label,
  value,
  confidence,
  onChange,
  type = 'text',
  prefix,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value?.toString() || '');
    setIsEditing(false);
  };

  const needsReview = confidence < 0.7;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        needsReview ? 'border-yellow-200 bg-yellow-50/50' : 'border-border'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <ConfidenceBadge confidence={confidence} />
      </div>

      {isEditing ? (
        <div className="flex items-center gap-2">
          {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
          <Input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}>
            <Save className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {prefix}
            {value || <span className="text-muted-foreground italic">Not detected</span>}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function ExtractionReview({
  documentId,
  documentType = 'INSURANCE_CARD_FRONT',
  imagePath,
  customerId,
  customerName,
  frontImage,
  backImage,
  extractedData,
  confidenceScores = {},
  processingStatus,
  onVerify,
  onCancel,
}: ExtractionReviewProps) {
  const [data, setData] = useState<ExtractedInsuranceData>(extractedData);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthorizationForm = documentType === 'AUTHORIZATION_FORM';
  const isEOB = documentType === 'EOB';
  const isInsuranceCard = documentType?.includes('INSURANCE_CARD');

  const updateField = useCallback(
    (field: keyof ExtractedInsuranceData, value: string | string[]) => {
      setData((prev) => ({
        ...prev,
        [field]: value,
        // When manually editing, set confidence to 1 (user verified)
        [`${field}Confidence`]: 1,
      }));
    },
    []
  );

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      await onVerify(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  if (processingStatus === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium">Processing Document</p>
          <p className="text-sm text-muted-foreground">
            AI is extracting information from the uploaded document...
          </p>
        </div>
      </div>
    );
  }

  if (processingStatus === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div className="text-center">
          <p className="font-medium">Processing Failed</p>
          <p className="text-sm text-muted-foreground">
            Unable to extract information from the uploaded document.
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Try Again
        </Button>
      </div>
    );
  }

  const getConfidence = (field: string) => confidenceScores[field] || (data as Record<string, unknown>)[`${field}Confidence`] || 0.5;

  const lowConfidenceCount = [
    getConfidence('carrier'),
    getConfidence('memberId'),
    getConfidence('groupNumber'),
    getConfidence('planName'),
  ].filter((c) => c < 0.7).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">Review Extracted Information</h3>
          <p className="text-sm text-muted-foreground">
            {customerName
              ? `Verify the information extracted from ${customerName}'s document`
              : 'Verify the extracted information'
            }
          </p>
        </div>

        {/* Overall Confidence */}
        {data.overallConfidence !== undefined && (
          <div className="text-right">
            <div className="text-2xl font-bold">
              {Math.round(data.overallConfidence * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Overall Confidence</p>
          </div>
        )}
      </div>

      {/* Low Confidence Warning */}
      {lowConfidenceCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">
              {lowConfidenceCount} field{lowConfidenceCount > 1 ? 's need' : ' needs'} review
            </p>
            <p className="text-sm text-yellow-700">
              Please verify the highlighted fields before confirming.
            </p>
          </div>
        </div>
      )}

      {/* Document Image */}
      <div>
        <h4 className="text-sm font-medium mb-2">Scanned Document</h4>
        {imagePath ? (
          <div className="border rounded-lg overflow-hidden">
            <img src={imagePath} alt="Scanned document" className="max-h-64 object-contain mx-auto" />
          </div>
        ) : (
          <CardPreviewCompact frontImage={frontImage} backImage={backImage} />
        )}
      </div>

      {/* Authorization Form Fields */}
      {isAuthorizationForm && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Authorization Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <EditableField
              label="Authorization Number"
              value={data.authNumber || null}
              confidence={getConfidence('authNumber')}
              onChange={(v) => updateField('authNumber', v)}
            />
            <EditableField
              label="Auth Expiry Date"
              value={data.authExpiryDate || null}
              confidence={getConfidence('authExpiryDate')}
              onChange={(v) => updateField('authExpiryDate', v)}
              type="date"
            />
            <EditableField
              label="Insurance Carrier"
              value={data.carrier}
              confidence={getConfidence('carrier')}
              onChange={(v) => updateField('carrier', v)}
            />
            <EditableField
              label="Member ID"
              value={data.memberId}
              confidence={getConfidence('memberId')}
              onChange={(v) => updateField('memberId', v)}
            />
          </div>

          <div className="p-3 rounded-lg border">
            <Label className="text-xs text-muted-foreground">Approved Services</Label>
            <div className="mt-2 space-y-1">
              {data.approvedServices && data.approvedServices.length > 0 ? (
                data.approvedServices.map((service, idx) => (
                  <div key={idx} className="text-sm bg-green-50 text-green-800 px-2 py-1 rounded inline-block mr-2 mb-1">
                    {service}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No services detected</p>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg border">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea
              value={data.authNotes || ''}
              onChange={(e) => updateField('authNotes', e.target.value)}
              placeholder="Add any notes about this authorization..."
              className="mt-2"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Insurance Card Fields */}
      {(isInsuranceCard || (!isAuthorizationForm && !isEOB)) && (
        <>
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Insurance Information</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <EditableField
                label="Insurance Carrier"
                value={data.carrier}
                confidence={getConfidence('carrier')}
                onChange={(v) => updateField('carrier', v)}
              />
              <EditableField
                label="Plan Name"
                value={data.planName}
                confidence={getConfidence('planName')}
                onChange={(v) => updateField('planName', v)}
              />
              <EditableField
                label="Member ID"
                value={data.memberId}
                confidence={getConfidence('memberId')}
                onChange={(v) => updateField('memberId', v)}
              />
              <EditableField
                label="Group Number"
                value={data.groupNumber}
                confidence={getConfidence('groupNumber')}
                onChange={(v) => updateField('groupNumber', v)}
              />
              <EditableField
                label="Network Tier"
                value={data.networkTier}
                confidence={getConfidence('networkTier')}
                onChange={(v) => updateField('networkTier', v)}
              />
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Benefits</h4>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border">
                <Label className="text-xs text-muted-foreground">Exam Copay</Label>
                <p className="text-sm font-medium">
                  {data.examCopay !== null ? `$${data.examCopay}` : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-lg border">
                <Label className="text-xs text-muted-foreground">Materials Copay</Label>
                <p className="text-sm font-medium">
                  {data.materialsCopay !== null ? `$${data.materialsCopay}` : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-lg border">
                <Label className="text-xs text-muted-foreground">Frame Allowance</Label>
                <p className="text-sm font-medium">
                  {data.frameAllowance !== null ? `$${data.frameAllowance}` : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-lg border">
                <Label className="text-xs text-muted-foreground">Lens Allowance</Label>
                <p className="text-sm font-medium">
                  {data.lensAllowance !== null ? `$${data.lensAllowance}` : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-lg border">
                <Label className="text-xs text-muted-foreground">Contact Allowance</Label>
                <p className="text-sm font-medium">
                  {data.contactAllowance !== null ? `$${data.contactAllowance}` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border">
              <Label className="text-xs text-muted-foreground">Effective Date</Label>
              <p className="text-sm font-medium">
                {data.effectiveDate || 'Not detected'}
              </p>
            </div>
            <div className="p-3 rounded-lg border">
              <Label className="text-xs text-muted-foreground">Expiration Date</Label>
              <p className="text-sm font-medium">
                {data.expirationDate || 'Not detected'}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isVerifying}>
          Cancel
        </Button>
        <Button onClick={handleVerify} disabled={isVerifying}>
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <BadgeCheck className="h-4 w-4 mr-2" />
              Confirm & Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
