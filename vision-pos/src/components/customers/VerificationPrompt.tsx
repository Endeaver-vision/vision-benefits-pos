'use client';

import { useState } from 'react';
import { AlertTriangle, Camera, Edit, DollarSign, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InlineScanner } from '@/components/scanner';
import { InsuranceStatusBadge, InsuranceVerificationStatus } from './InsuranceStatusBadge';

// Note: "Verification" in this component refers to prompting the user to scan
// insurance documents - not a manual GPT verification step. Documents are
// processed and saved automatically when scanned.

interface VerificationPromptProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  status: InsuranceVerificationStatus;
  carrier?: string | null;
  onVerificationComplete?: () => void;
  onProceedWithRetail?: () => void;
  onManualEntry?: () => void;
}

export function VerificationPrompt({
  isOpen,
  onClose,
  customerId,
  customerName,
  status,
  carrier,
  onProceedWithRetail,
  onManualEntry,
  onVerificationComplete,
}: VerificationPromptProps) {
  const [showScanner, setShowScanner] = useState(false);

  const handleScanComplete = async (result: any) => {
    if (result.success) {
      setShowScanner(false);
      onVerificationComplete?.();
      onClose();
    }
  };

  if (showScanner) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setShowScanner(false);
          onClose();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-emerald-500" />
              Scan Insurance Document
            </DialogTitle>
            <DialogDescription>
              Upload {customerName}&apos;s insurance authorization or benefits document
            </DialogDescription>
          </DialogHeader>
          <InlineScanner
            customerId={customerId}
            onDocumentProcessed={handleScanComplete}
            compact={false}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Insurance Scan Required
          </DialogTitle>
          <DialogDescription>
            {customerName}&apos;s insurance information needs to be scanned before
            calculating accurate pricing.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Current Status:</span>
            <InsuranceStatusBadge
              status={status}
              carrier={carrier}
              showTooltip={false}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <p className="text-sm font-medium">How would you like to proceed?</p>

            {/* Option 1: Scan Document */}
            <button
              onClick={() => setShowScanner(true)}
              className="w-full p-4 text-left rounded-lg border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Scan Insurance Document</p>
                  <p className="text-sm text-muted-foreground">
                    Upload the insurance authorization or benefits document. AI will
                    extract the benefits automatically.
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2: Manual Entry */}
            <button
              onClick={() => {
                onManualEntry?.();
                onClose();
              }}
              className="w-full p-4 text-left rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <Edit className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Enter Manually</p>
                  <p className="text-sm text-muted-foreground">
                    Type in the member ID, group number, and plan details from the
                    insurance card.
                  </p>
                </div>
              </div>
            </button>

            {/* Option 3: Proceed with Retail */}
            <button
              onClick={() => {
                onProceedWithRetail?.();
                onClose();
              }}
              className="w-full p-4 text-left rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Skip for Now</p>
                  <p className="text-sm text-muted-foreground">
                    Proceed with retail pricing. Insurance discounts can be applied
                    later.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Inline version for customer profile page
export function VerificationBanner({
  customerId,
  customerName,
  status,
  carrier,
  onVerificationComplete,
}: {
  customerId: string;
  customerName: string;
  status: InsuranceVerificationStatus;
  carrier?: string | null;
  onVerificationComplete?: () => void;
}) {
  const [showPrompt, setShowPrompt] = useState(false);

  if (status === 'verified') {
    return null;
  }

  const getMessage = () => {
    switch (status) {
      case 'needs_verification':
        return 'Insurance on file but not verified. Scan card for accurate pricing.';
      case 'no_insurance':
        return 'No insurance on file. Add insurance to unlock discounts.';
      case 'expired':
        return 'Insurance has expired. Please scan a new card.';
      default:
        return 'Insurance verification pending.';
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'needs_verification':
        return 'Verify Now';
      case 'no_insurance':
        return 'Add Insurance';
      case 'expired':
        return 'Update Insurance';
      default:
        return 'Verify';
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              {status === 'no_insurance' ? 'No Insurance' : 'Verification Required'}
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {getMessage()}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowPrompt(true)}
          size="sm"
          variant="outline"
          className="border-yellow-300 hover:bg-yellow-100 dark:border-yellow-700 dark:hover:bg-yellow-900/40"
        >
          <Camera className="h-4 w-4 mr-2" />
          {getButtonText()}
        </Button>
      </div>

      <VerificationPrompt
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        customerId={customerId}
        customerName={customerName}
        status={status}
        carrier={carrier}
        onVerificationComplete={() => {
          setShowPrompt(false);
          onVerificationComplete?.();
        }}
        onProceedWithRetail={() => {}}
        onManualEntry={() => {}}
      />
    </>
  );
}
