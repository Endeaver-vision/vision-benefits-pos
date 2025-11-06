'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Gift, Clock, User, Calendar, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  total: number;
  createdAt: string;
  status: string;
  isSecondPair?: boolean;
  patientInfo: Record<string, unknown>;
  insuranceInfo: Record<string, unknown>;
  examServices: Record<string, unknown>;
  eyeglasses: Record<string, unknown>;
  contacts: Record<string, unknown>;
}

interface DuplicateQuoteDialogProps {
  quote: Quote;
  eligibleForSecondPair?: boolean;
  secondPairDiscount?: {
    type: string;
    percent: number;
    amount: number;
  };
  children: React.ReactNode;
}

export function DuplicateQuoteDialog({
  quote,
  eligibleForSecondPair = false,
  secondPairDiscount,
  children
}: DuplicateQuoteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDuplicate = async (applySecondPairDiscount = false) => {
    setDuplicating(true);
    setError(null);

    try {
      // Create new quote with duplicated data
      const newQuoteData = {
        customerId: quote.customerId,
        description: `Copy of ${quote.quoteNumber}${applySecondPairDiscount ? ' (Second Pair)' : ''}`,
        patientInfo: quote.patientInfo,
        insuranceInfo: applySecondPairDiscount ? {} : quote.insuranceInfo, // No insurance for second pair
        examServices: quote.examServices,
        eyeglasses: quote.eyeglasses,
        contacts: quote.contacts,
        isSecondPair: applySecondPairDiscount,
        originalQuoteId: applySecondPairDiscount ? quote.id : undefined,
      };

      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newQuoteData),
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate quote');
      }

      const result = await response.json();
      const newQuoteId = result.quote.id;

      // If applying second pair discount, apply it to the new quote
      if (applySecondPairDiscount && eligibleForSecondPair) {
        const discountResponse = await fetch('/api/quotes/apply-second-pair', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quoteId: newQuoteId,
            customerId: quote.customerId,
            locationId: localStorage.getItem('locationId') || '',
            userId: localStorage.getItem('userId') || '',
          }),
        });

        if (!discountResponse.ok) {
          console.warn('Failed to apply second pair discount, but quote was created');
        }
      }

      // Navigate to the new quote in quote builder
      setIsOpen(false);
      router.push(`/quote-builder?quoteId=${newQuoteId}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setDuplicating(false);
    }
  };

  const getSecondPairIcon = () => {
    if (!secondPairDiscount) return <Gift className="h-4 w-4 text-green-600" />;
    
    switch (secondPairDiscount.type) {
      case 'SAME_DAY_50':
        return <Gift className="h-4 w-4 text-green-600" />;
      case 'THIRTY_DAY_30':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Gift className="h-4 w-4 text-brand-purple" />;
    }
  };

  const getSecondPairText = () => {
    if (!secondPairDiscount) return 'Second Pair Discount Available';
    
    switch (secondPairDiscount.type) {
      case 'SAME_DAY_50':
        return '50% Off Same Day Second Pair';
      case 'THIRTY_DAY_30':
        return '30% Off Second Pair (Within 30 Days)';
      default:
        return `${secondPairDiscount.percent}% Off Second Pair`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Copy className="h-5 w-5 text-brand-purple" />
            <span>Duplicate Quote</span>
          </DialogTitle>
          <DialogDescription>
            Create a copy of this quote for the same customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quote Info */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{quote.quoteNumber}</div>
                  <Badge variant="outline">${quote.total.toFixed(2)}</Badge>
                </div>
                <div className="flex items-center space-x-4 text-sm text-neutral-600">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>{quote.customerName}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Second Pair Option */}
          {eligibleForSecondPair && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  {getSecondPairIcon()}
                  <div className="flex-1">
                    <div className="font-medium text-green-800">
                      {getSecondPairText()}
                    </div>
                    <div className="text-sm text-green-700 mt-1">
                      Customer is eligible for a second pair discount. 
                      {secondPairDiscount && (
                        <span className="font-medium"> Save ${secondPairDiscount.amount.toFixed(2)}!</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {/* Regular Duplicate */}
            <Button
              onClick={() => handleDuplicate(false)}
              disabled={duplicating}
              variant="outline"
              className="w-full justify-start"
            >
              {duplicating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Duplicate Quote (Regular)
            </Button>

            {/* Second Pair Duplicate */}
            {eligibleForSecondPair && (
              <Button
                onClick={() => handleDuplicate(true)}
                disabled={duplicating}
                className="w-full justify-start bg-green-600 hover:bg-green-700"
              >
                {duplicating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  getSecondPairIcon()
                )}
                <span className="ml-2">Duplicate as Second Pair</span>
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simple button component for duplicating quotes
export function DuplicateQuoteButton({
  quote,
  eligibleForSecondPair = false,
  secondPairDiscount,
  variant = "outline",
  size = "sm",
  className = ""
}: DuplicateQuoteDialogProps & {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <DuplicateQuoteDialog
      quote={quote}
      eligibleForSecondPair={eligibleForSecondPair}
      secondPairDiscount={secondPairDiscount}
    >
      <Button variant={variant} size={size} className={className}>
        <Copy className="h-4 w-4 mr-2" />
        Duplicate
        {eligibleForSecondPair && (
          <Badge className="ml-2 bg-green-600 text-white text-xs">
            2nd Pair
          </Badge>
        )}
      </Button>
    </DuplicateQuoteDialog>
  );
}

export default DuplicateQuoteDialog;