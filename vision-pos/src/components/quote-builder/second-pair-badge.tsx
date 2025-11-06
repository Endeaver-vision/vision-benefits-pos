'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Gift, Clock, Percent } from 'lucide-react';
import { SecondPairEligibility } from '@/lib/second-pair';
import { SecondPairDialog } from './second-pair-dialog';

interface SecondPairBadgeProps {
  customerId: string;
  locationId?: string;
  currentQuoteId?: string;
  userId?: string;
  currentTotal?: number;
  onDiscountApplied?: (newTotal: number) => void;
  className?: string;
}

export function SecondPairBadge({ 
  customerId, 
  locationId,
  currentQuoteId,
  userId,
  currentTotal = 0,
  onDiscountApplied,
  className = "" 
}: SecondPairBadgeProps) {
  const [eligibility, setEligibility] = useState<SecondPairEligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check eligibility when component mounts or customerId changes
  useEffect(() => {
    if (!customerId) return;
    
    const checkEligibility = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({ customerId });
        if (locationId) params.append('locationId', locationId);
        
        const response = await fetch(`/api/quotes/apply-second-pair?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to check eligibility');
        }
        
        const data = await response.json();
        setEligibility(data.eligibility);
      } catch (err) {
        setError('Unable to check second pair eligibility');
        console.error('Second pair eligibility check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkEligibility();
  }, [customerId, locationId]);

  // Don't render anything if not eligible or still loading
  if (loading || error || !eligibility?.isEligible) {
    return null;
  }

  const getBadgeContent = () => {
    switch (eligibility.discountType) {
      case 'SAME_DAY_50':
        return {
          icon: <Gift className="h-3 w-3" />,
          text: '50% Off Same Day',
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-700 text-white border-green-600'
        };
      case 'THIRTY_DAY_30':
        return {
          icon: <Clock className="h-3 w-3" />,
          text: '30% Off (30 Days)',
          variant: 'secondary' as const,
          className: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
        };
      default:
        return {
          icon: <Percent className="h-3 w-3" />,
          text: 'Second Pair Eligible',
          variant: 'outline' as const,
          className: 'border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white'
        };
    }
  };

  const badgeContent = getBadgeContent();

  const badgeElement = (
    <Badge 
      className={`flex items-center space-x-1 px-2 py-1 cursor-pointer transition-colors ${badgeContent.className}`}
    >
      {badgeContent.icon}
      <span className="text-xs font-medium">{badgeContent.text}</span>
    </Badge>
  );

  // If we have all required props for applying discount, wrap with dialog
  if (currentQuoteId && userId && onDiscountApplied) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <SecondPairDialog
          eligibility={eligibility}
          currentQuoteId={currentQuoteId}
          customerId={customerId}
          locationId={locationId || ''}
          userId={userId}
          currentTotal={currentTotal}
          onDiscountApplied={onDiscountApplied}
        >
          {badgeElement}
        </SecondPairDialog>
        
        {eligibility.daysAfterOriginal !== undefined && (
          <span className="text-xs text-neutral-500">
            {eligibility.daysAfterOriginal === 0 
              ? 'Purchased today' 
              : `${eligibility.daysAfterOriginal} days ago`
            }
          </span>
        )}
      </div>
    );
  }

  // Otherwise just show the badge without dialog functionality
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {badgeElement}
      
      {eligibility.daysAfterOriginal !== undefined && (
        <span className="text-xs text-neutral-500">
          {eligibility.daysAfterOriginal === 0 
            ? 'Purchased today' 
            : `${eligibility.daysAfterOriginal} days ago`
          }
        </span>
      )}
    </div>
  );
}

// Compact version for tight spaces
export function SecondPairBadgeCompact({ 
  customerId, 
  locationId,
  currentQuoteId,
  userId,
  currentTotal = 0,
  onDiscountApplied,
  className = "" 
}: SecondPairBadgeProps) {
  const [eligibility, setEligibility] = useState<SecondPairEligibility | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    
    const checkEligibility = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ customerId });
        if (locationId) params.append('locationId', locationId);
        
        const response = await fetch(`/api/quotes/apply-second-pair?${params}`);
        if (response.ok) {
          const data = await response.json();
          setEligibility(data.eligibility);
        }
      } catch (err) {
        console.error('Second pair eligibility check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkEligibility();
  }, [customerId, locationId]);

  if (loading || !eligibility?.isEligible) {
    return null;
  }

  const getDiscountText = () => {
    switch (eligibility.discountType) {
      case 'SAME_DAY_50':
        return '50%';
      case 'THIRTY_DAY_30':
        return '30%';
      default:
        return '2nd';
    }
  };

  const getColor = () => {
    switch (eligibility.discountType) {
      case 'SAME_DAY_50':
        return 'bg-green-600 text-white';
      case 'THIRTY_DAY_30':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-brand-purple text-white';
    }
  };

  const badgeElement = (
    <Badge 
      className={`${getColor()} px-1 py-0.5 text-xs cursor-pointer hover:opacity-80 ${className}`}
    >
      {getDiscountText()}
    </Badge>
  );

  // If we have all required props for applying discount, wrap with dialog
  if (currentQuoteId && userId && onDiscountApplied) {
    return (
      <SecondPairDialog
        eligibility={eligibility}
        currentQuoteId={currentQuoteId}
        customerId={customerId}
        locationId={locationId || ''}
        userId={userId}
        currentTotal={currentTotal}
        onDiscountApplied={onDiscountApplied}
      >
        {badgeElement}
      </SecondPairDialog>
    );
  }

  return badgeElement;
}

export default SecondPairBadge;