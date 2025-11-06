'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Modern Design System - Navigation Footer Component
// Standardized layer navigation with progress indicators and validation

export interface NavigationFooterProps {
  // Navigation actions
  onBack?: () => void;
  onNext?: () => void;
  onComplete?: () => void;
  
  // State
  canProceed?: boolean;
  isLoading?: boolean;
  
  // Labels
  backLabel?: string;
  nextLabel?: string;
  completeLabel?: string;
  
  // Progress context
  currentStep?: number;
  totalSteps?: number;
  stepName?: string;
  
  // Validation
  validationErrors?: string[];
  validationWarnings?: string[];
  
  // Styling
  className?: string;
  showProgress?: boolean;
}

export function NavigationFooter({
  onBack,
  onNext,
  onComplete,
  canProceed = true,
  isLoading = false,
  backLabel = 'Back',
  nextLabel = 'Next',
  completeLabel = 'Complete',
  currentStep,
  totalSteps,
  stepName,
  validationErrors = [],
  validationWarnings = [],
  className,
  showProgress = true
}: NavigationFooterProps) {
  
  const hasErrors = validationErrors.length > 0;
  const hasWarnings = validationWarnings.length > 0;
  const showValidation = hasErrors || hasWarnings;
  
  const progressPercentage = currentStep && totalSteps 
    ? Math.round((currentStep / totalSteps) * 100) 
    : 0;

  return (
    <div className={cn("space-y-6 bg-white p-6 rounded-lg border border-neutral-200 shadow-sm", className)}>
      
      {/* Validation Messages */}
      {showValidation && (
        <div className="space-y-3">
          {hasErrors && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-800 mb-2">
                    Please resolve the following issues:
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {hasWarnings && !hasErrors && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-800 mb-2">
                    Recommendations:
                  </h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-amber-400 mt-1">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Indicator */}
      {showProgress && currentStep && totalSteps && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-neutral-700">
                Step {currentStep} of {totalSteps}
              </span>
              {stepName && (
                <span className="text-sm text-neutral-500">• {stepName}</span>
              )}
            </div>
            <span className="text-sm font-semibold text-vsp-blue">
              {progressPercentage}% Complete
            </span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-vsp-gradient rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        
        {/* Back Button */}
        <div>
          {onBack ? (
            <Button 
              variant="outline" 
              onClick={onBack}
              disabled={isLoading}
              className="border-neutral-300 hover:border-vsp-blue hover:text-vsp-blue transition-all duration-200 px-6 py-2 h-12"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel}
            </Button>
          ) : (
            <div /> // Placeholder for flex justification
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          
          {/* Completion Status */}
          {canProceed && !hasErrors && (
            <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Ready to proceed</span>
            </div>
          )}
          
          {/* Next/Complete Button */}
          {onNext && (
            <Button 
              onClick={onNext}
              disabled={!canProceed || hasErrors || isLoading}
              className={cn(
                "min-w-[140px] h-12 px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg",
                canProceed && !hasErrors
                  ? "bg-vsp-gradient hover:opacity-90 text-white border-0"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300"
              )}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>{nextLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          )}
          
          {onComplete && (
            <Button 
              onClick={onComplete}
              disabled={!canProceed || hasErrors || isLoading}
              className={cn(
                "min-w-[140px] h-12 px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg",
                canProceed && !hasErrors
                  ? "bg-brand-purple hover:bg-brand-purple/90 text-white border-0"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300"
              )}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>{completeLabel}</span>
                </div>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NavigationFooter;