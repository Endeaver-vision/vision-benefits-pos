'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  Clock
} from 'lucide-react';
import { useQuoteStore } from '@/store/quote-store';

interface ExamLayerValidationProps {
  className?: string;
  onProceedToNext?: () => void;
}

export function ExamLayerValidation({ className, onProceedToNext }: ExamLayerValidationProps) {
  const { getExamLayerValidation, setCurrentLayer, markLayerComplete } = useQuoteStore();
  
  const validation = getExamLayerValidation();
  const { isValid, errors, warnings, totalDuration } = validation;

  const handleProceedToNext = () => {
    if (isValid) {
      markLayerComplete('exam');
      setCurrentLayer('eyeglasses');
      onProceedToNext?.();
    }
  };

  if (errors.length === 0 && warnings.length === 0) {
    return null; // Don't show validation component if no issues
  }

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Validation Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            isValid ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {isValid ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {isValid ? 'Layer Ready' : 'Validation Issues'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isValid 
                ? 'All requirements met. Ready to continue.'
                : 'Please resolve the following issues to continue.'
              }
            </p>
          </div>
        </div>

        {isValid && (
          <Button onClick={handleProceedToNext} className="flex items-center space-x-2">
            <span>Continue to Eyeglasses</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <Alert key={index} variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Warning Messages */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <Alert key={index} className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Recommendation:</strong> {warning}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Layer Summary */}
      {isValid && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-green-900">Exam Layer Summary</h4>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-800">Required services selected</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="text-green-800">
                    {totalDuration} minutes scheduled
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-800">Ready for next layer</span>
                </div>
              </div>
              
              {warnings.length > 0 && (
                <div className="pt-2 border-t border-green-300">
                  <p className="text-xs text-green-700">
                    <strong>Note:</strong> You can proceed with the current selection, 
                    but consider the recommendations above for optimal care.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons for Invalid State */}
      {!isValid && (
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Resolve all errors above to continue to the next layer.
          </p>
          
          <Button 
            variant="outline" 
            disabled={!isValid}
            onClick={handleProceedToNext}
          >
            Continue to Eyeglasses
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}