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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Gift, Clock, DollarSign, AlertTriangle, Loader2 } from 'lucide-react';
import { SecondPairEligibility, calculateSecondPairDiscount, SecondPairDiscountType } from '@/lib/second-pair';

interface SecondPairDialogProps {
  eligibility: SecondPairEligibility;
  currentQuoteId: string;
  customerId: string;
  locationId: string;
  userId: string;
  currentTotal: number;
  onDiscountApplied: (newTotal: number) => void;
  children: React.ReactNode;
}

export function SecondPairDialog({
  eligibility,
  currentQuoteId,
  customerId,
  locationId,
  userId,
  currentTotal,
  onDiscountApplied,
  children
}: SecondPairDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate discount preview
  const discountPreview = eligibility.discountType 
    ? calculateSecondPairDiscount(
        currentTotal, 
        eligibility.discountType as SecondPairDiscountType, 
        eligibility.discountPercent
      )
    : null;

  const getDiscountIcon = () => {
    switch (eligibility.discountType) {
      case 'SAME_DAY_50':
        return <Gift className="h-5 w-5 text-green-600" />;
      case 'THIRTY_DAY_30':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <DollarSign className="h-5 w-5 text-brand-purple" />;
    }
  };

  const getDiscountTitle = () => {
    switch (eligibility.discountType) {
      case 'SAME_DAY_50':
        return 'Same Day Second Pair - 50% Off';
      case 'THIRTY_DAY_30':
        return 'Second Pair Within 30 Days - 30% Off';
      default:
        return 'Second Pair Discount Available';
    }
  };

  const getDiscountDescription = () => {
    if (eligibility.daysAfterOriginal === 0) {
      return 'Customer purchased their first pair today and qualifies for a 50% discount on a second pair.';
    } else {
      return `Customer purchased their first pair ${eligibility.daysAfterOriginal} days ago and qualifies for a 30% discount on a second pair.`;
    }
  };

  const handleApplyDiscount = async () => {
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to apply second pair discount');
      }

      const result = await response.json();
      
      if (result.success) {
        onDiscountApplied(result.updatedQuote.finalTotal);
        setIsOpen(false);
      } else {
        throw new Error(result.message || 'Failed to apply discount');
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
            {getDiscountIcon()}
            <span>{getDiscountTitle()}</span>
          </DialogTitle>
          <DialogDescription>
            {getDiscountDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Purchase Info */}
          {eligibility.originalPurchaseDate && (
            <Card>
              <CardContent className="p-4">
                <div className="text-sm">
                  <div className="font-medium text-neutral-900">Original Purchase</div>
                  <div className="text-neutral-600">
                    {eligibility.originalPurchaseDate.toLocaleDateString()}
                  </div>
                  {eligibility.originalQuoteId && (
                    <div className="text-xs text-neutral-500 mt-1">
                      Quote ID: {eligibility.originalQuoteId.slice(-8)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Breakdown */}
          {discountPreview && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="font-medium text-neutral-900">Pricing Breakdown</div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Original Quote Total</span>
                    <span>${discountPreview.originalTotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-green-600">
                    <span>Second Pair Discount ({discountPreview.discountPercent}%)</span>
                    <span>-${discountPreview.discountAmount.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Final Total</span>
                    <span className="text-brand-purple">${discountPreview.finalTotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="text-center mt-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      You save ${discountPreview.discountAmount.toFixed(2)}!
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cash Payment Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <div className="font-medium">Cash Payment Required</div>
                <div>Second pair discounts are only available with cash payment. Insurance cannot be applied to discounted second pairs.</div>
              </div>
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
              onClick={handleApplyDiscount}
              disabled={applying}
              className="flex-1 bg-brand-purple hover:bg-brand-purple/90"
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply Discount'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SecondPairDialog;