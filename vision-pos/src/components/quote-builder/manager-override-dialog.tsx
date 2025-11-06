'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, AlertTriangle, DollarSign, Loader2 } from 'lucide-react';
import { calculateSecondPairDiscount, SecondPairDiscountType } from '@/lib/second-pair';

interface ManagerOverrideDialogProps {
  customerId: string;
  currentQuoteId: string;
  locationId: string;
  userId: string;
  managerName: string;
  currentTotal: number;
  onDiscountApplied: (newTotal: number) => void;
  children: React.ReactNode;
}

export function ManagerOverrideDialog({
  customerId,
  currentQuoteId,
  locationId,
  userId,
  managerName,
  currentTotal,
  onDiscountApplied,
  children
}: ManagerOverrideDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [reason, setReason] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate preview of discount
  const getDiscountPreview = () => {
    const percent = parseFloat(discountPercent);
    if (!percent || percent <= 0 || percent > 100) return null;
    
    return calculateSecondPairDiscount(
      currentTotal,
      SecondPairDiscountType.MANAGER_OVERRIDE,
      percent
    );
  };

  const discountPreview = getDiscountPreview();

  const validateForm = () => {
    const percent = parseFloat(discountPercent);
    
    if (!percent || percent <= 0 || percent > 100) {
      return 'Discount percentage must be between 1 and 100';
    }
    
    if (!reason.trim() || reason.trim().length < 10) {
      return 'Reason must be at least 10 characters long';
    }
    
    return null;
  };

  const handleApplyOverride = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setApplying(true);
    setError(null);

    try {
      const response = await fetch('/api/quotes/apply-second-pair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId: currentQuoteId,
          customerId,
          locationId,
          userId,
          managerOverride: {
            discountPercent: parseFloat(discountPercent),
            reason: reason.trim(),
            overrideBy: managerName,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to apply manager override');
      }

      const result = await response.json();
      
      if (result.success) {
        onDiscountApplied(result.updatedQuote.finalTotal);
        setIsOpen(false);
        // Reset form
        setDiscountPercent('');
        setReason('');
      } else {
        throw new Error(result.message || 'Failed to apply override');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-amber-600" />
            <span>Manager Second Pair Override</span>
          </DialogTitle>
          <DialogDescription>
            Apply a custom second pair discount outside of normal business rules
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <div className="font-medium">Manager Authorization Required</div>
                <div>This override will be logged and audited. Only use when normal business rules don&apos;t apply to the specific customer situation.</div>
              </div>
            </div>
          </div>

          {/* Discount Percentage Input */}
          <div className="space-y-2">
            <label htmlFor="discountPercent" className="block text-sm font-medium text-neutral-700">
              Discount Percentage *
            </label>
            <div className="relative">
              <Input
                id="discountPercent"
                type="number"
                min="1"
                max="100"
                step="1"
                placeholder="Enter discount percentage (1-100)"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="pr-8"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-neutral-500 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <label htmlFor="reason" className="block text-sm font-medium text-neutral-700">
              Override Reason *
            </label>
            <Textarea
              id="reason"
              placeholder="Explain why this override is necessary (minimum 10 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="text-xs text-neutral-500">
              {reason.length}/10 characters minimum
            </div>
          </div>

          {/* Discount Preview */}
          {discountPreview && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-brand-purple" />
                  <div className="font-medium text-neutral-900">Pricing Preview</div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Original Quote Total</span>
                    <span>${discountPreview.originalTotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-amber-600">
                    <span>Manager Override ({discountPreview.discountPercent}%)</span>
                    <span>-${discountPreview.discountAmount.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Final Total</span>
                    <span className="text-brand-purple">${discountPreview.finalTotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="text-center mt-2">
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      Manager Override: ${discountPreview.discountAmount.toFixed(2)} off
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manager Info */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3">
            <div className="text-sm">
              <div className="font-medium text-neutral-900">Manager Authorization</div>
              <div className="text-neutral-600">Authorized by: {managerName}</div>
              <div className="text-neutral-600">Date: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyOverride}
              disabled={applying || !discountPreview}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Apply Override
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ManagerOverrideDialog;