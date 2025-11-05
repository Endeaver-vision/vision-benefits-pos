'use client';

import React from 'react';
import { FrameSelection } from './frame-selection';
import { LensSelection } from './lens-selection';
import { LensEnhancements } from './lens-enhancements';
import { InsuranceIntegration } from './insurance-integration';
import { SecondPairDiscounts } from './second-pair-discounts';
import { EyeglassesValidation } from './eyeglasses-validation';
import { useQuoteStore } from '@/store/quote-store';

interface EyeglassesLayerProps {
  className?: string;
}

export function EyeglassesLayer({ className }: EyeglassesLayerProps) {
  const { quote } = useQuoteStore();
  
  const hasSelectedFrame = Boolean(quote.eyeglasses.frame?.id);
  const hasSelectedLenses = Boolean(quote.eyeglasses.lenses.type && quote.eyeglasses.lenses.material);
  
  return (
    <div className={`space-y-8 ${className}`}>
      {/* Frame Selection */}
      <div className="space-y-4">
        <FrameSelection />
      </div>
      
      {/* Lens Selection - Show after frame is selected */}
      {hasSelectedFrame && (
        <div className="space-y-4">
          <LensSelection />
        </div>
      )}
      
      {/* Lens Enhancements - Show after lenses are selected */}
      {hasSelectedLenses && (
        <div className="space-y-4">
          <LensEnhancements />
        </div>
      )}
      
      {/* Insurance Integration - Show after enhancements */}
      {hasSelectedLenses && (
        <div className="space-y-4">
          <InsuranceIntegration />
        </div>
      )}
      
      {/* Second Pair Offers - Show after insurance */}
      {hasSelectedLenses && (
        <div className="space-y-4">
          <SecondPairDiscounts />
        </div>
      )}

      {/* Validation and Summary - Always show if frame and lenses are selected */}
      {hasSelectedLenses && (
        <div className="space-y-4">
          <EyeglassesValidation />
        </div>
      )}
    </div>
  );
}