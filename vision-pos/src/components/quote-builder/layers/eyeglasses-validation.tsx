'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle,
  AlertTriangle,
  Eye,
  Glasses,
  DollarSign,
  FileText,
  ArrowRight,
  Gift,
  Info
} from 'lucide-react';
import { useQuoteStore } from '@/store/quote-store';

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface PricingLineItem {
  label: string;
  price: number;
  isDiscount?: boolean;
  description?: string;
}

interface EyeglassesValidationProps {
  className?: string;
}

export function EyeglassesValidation({ className }: EyeglassesValidationProps) {
  const { quote, markLayerComplete, setCurrentLayer } = useQuoteStore();

  const validateSelections = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Validate frame selection
    if (!quote.eyeglasses.frame?.id) {
      errors.push({
        field: 'frame',
        message: 'Please select a frame for your eyeglasses',
        severity: 'error'
      });
    }

    // Validate lens type
    if (!quote.eyeglasses.lenses.type) {
      errors.push({
        field: 'lensType',
        message: 'Please select a lens type',
        severity: 'error'
      });
    }

    // Validate lens material
    if (!quote.eyeglasses.lenses.material) {
      errors.push({
        field: 'lensMaterial',
        message: 'Please select a lens material',
        severity: 'error'
      });
    }

    // Warning for no enhancements
    if (!quote.eyeglasses.enhancements || quote.eyeglasses.enhancements.length === 0) {
      errors.push({
        field: 'enhancements',
        message: 'Consider adding lens enhancements for better protection and clarity',
        severity: 'warning'
      });
    }

    // Warning for no insurance
    if (!quote.insurance.carrier || !quote.insurance.memberId) {
      errors.push({
        field: 'insurance',
        message: 'Insurance information not provided - you may be missing out on savings',
        severity: 'warning'
      });
    }

    return errors;
  };

  const calculatePricing = (): PricingLineItem[] => {
    const lineItems: PricingLineItem[] = [];

    // Frame pricing
    if (quote.eyeglasses.frame?.price) {
      lineItems.push({
        label: `${quote.eyeglasses.frame.brand} ${quote.eyeglasses.frame.model}`,
        price: quote.eyeglasses.frame.price,
        description: 'Frame'
      });
    }

    // Lens pricing (mock calculation)
    if (quote.eyeglasses.lenses.type) {
      const lensTypePrices: Record<string, number> = {
        'single-vision': 99,
        'progressive': 299,
        'bifocal': 179,
        'computer': 189
      };

      const materialMultipliers: Record<string, number> = {
        'plastic': 1.0,
        'polycarbonate': 1.5,
        'high-index': 2.2,
        'trivex': 1.8
      };

      const basePrice = lensTypePrices[quote.eyeglasses.lenses.type] || 99;
      const multiplier = materialMultipliers[quote.eyeglasses.lenses.material] || 1.0;
      const lensPrice = basePrice * multiplier;

      lineItems.push({
        label: `${quote.eyeglasses.lenses.type} lenses (${quote.eyeglasses.lenses.material})`,
        price: lensPrice,
        description: 'Lenses'
      });
    }

    // Enhancement pricing (mock)
    if (quote.eyeglasses.enhancements && quote.eyeglasses.enhancements.length > 0) {
      const enhancementPrices: Record<string, number> = {
        'anti-reflective': 89,
        'photochromic': 129,
        'polarized': 159,
        'blue-light': 69,
        'scratch-resistant': 39,
        'premium-ar': 149
      };

      quote.eyeglasses.enhancements.forEach(enhancement => {
        const price = enhancementPrices[enhancement] || 50;
        lineItems.push({
          label: enhancement.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          price,
          description: 'Enhancement'
        });
      });
    }

    // Insurance discounts
    if (quote.pricing.insurance.totalCoverage > 0) {
      lineItems.push({
        label: 'Insurance Coverage',
        price: quote.pricing.insurance.totalCoverage,
        isDiscount: true,
        description: 'Insurance Benefit'
      });
    }

    // Second pair pricing
    if (quote.eyeglasses.secondPair?.frame && quote.eyeglasses.secondPair?.discount) {
      const secondPairTotal = (quote.eyeglasses.secondPair.frame.price || 0) + 299; // Frame + lenses
      const discountAmount = secondPairTotal * (quote.eyeglasses.secondPair.discount / 100);
      
      lineItems.push({
        label: 'Second Pair',
        price: secondPairTotal - discountAmount,
        description: `${quote.eyeglasses.secondPair.discount}% discount applied`
      });
    }

    return lineItems;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const validation = validateSelections();
  const errors = validation.filter(v => v.severity === 'error');
  const warnings = validation.filter(v => v.severity === 'warning');
  const isValid = errors.length === 0;
  const pricing = calculatePricing();
  const subtotal = pricing.reduce((sum, item) => {
    return sum + (item.isDiscount ? -item.price : item.price);
  }, 0);

  const handleProceedToNext = () => {
    if (isValid) {
      markLayerComplete('eyeglasses');
      setCurrentLayer('contacts'); // Move to next layer
    }
  };

  const renderCompletionIcon = () => {
    if (errors.length > 0) return <AlertTriangle className="h-6 w-6 text-red-600" />;
    if (warnings.length > 0) return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
    return <CheckCircle className="h-6 w-6 text-green-600" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Eyeglasses Summary</h2>
          <p className="text-sm text-muted-foreground">
            Review your selections and pricing
          </p>
        </div>
      </div>

      {/* Validation Status */}
      <Card className={`border-2 ${isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            {renderCompletionIcon()}
            <div>
              <h3 className="font-semibold">
                {isValid ? 'Ready to Continue' : 'Additional Selections Required'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isValid 
                  ? 'All required selections have been made'
                  : `${errors.length} error${errors.length !== 1 ? 's' : ''} must be resolved`
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Messages */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-3">
          {errors.map((error, index) => (
            <Alert key={`error-${index}`} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ))}
          
          {warnings.map((warning, index) => (
            <Alert key={`warning-${index}`} className="border-yellow-200 bg-yellow-50">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {warning.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Selection Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Frame Summary */}
        {quote.eyeglasses.frame?.id && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Glasses className="h-4 w-4" />
                <span>Selected Frame</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold">{quote.eyeglasses.frame.brand}</h4>
                <p className="text-sm text-muted-foreground">{quote.eyeglasses.frame.model}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {quote.eyeglasses.frame.selectedColor} • {quote.eyeglasses.frame.selectedSize}
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {quote.eyeglasses.frame.category}
                  </Badge>
                </div>
                <div className="font-semibold">
                  {formatPrice(quote.eyeglasses.frame.price || 0)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lens Summary */}
        {quote.eyeglasses.lenses.type && quote.eyeglasses.lenses.material && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Eye className="h-4 w-4" />
                <span>Lens Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold capitalize">
                  {quote.eyeglasses.lenses.type.replace('-', ' ')} Lenses
                </h4>
                <p className="text-sm text-muted-foreground capitalize">
                  {quote.eyeglasses.lenses.material} material
                </p>
              </div>
              {quote.eyeglasses.enhancements && quote.eyeglasses.enhancements.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium">Enhancements:</h5>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {quote.eyeglasses.enhancements.map((enhancement, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {enhancement.replace(/-/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pricing Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Pricing Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pricing.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{item.label}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                )}
              </div>
              <div className={`font-semibold ${item.isDiscount ? 'text-green-600' : ''}`}>
                {item.isDiscount ? '-' : ''}{formatPrice(item.price)}
              </div>
            </div>
          ))}
          
          <Separator />
          
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          {quote.eyeglasses.secondPair && (
            <Alert className="border-purple-200 bg-purple-50">
              <Gift className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                Second pair discount of {quote.eyeglasses.secondPair.discount}% applied!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button 
          onClick={handleProceedToNext}
          disabled={!isValid}
          className="flex-1"
        >
          {isValid ? (
            <>
              <span>Continue to Contact Lenses</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            'Complete Required Selections'
          )}
        </Button>
        
        <Button variant="outline" onClick={() => window.print()}>
          Print Summary
        </Button>
      </div>

      {/* Additional Notes */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This quote is valid for 30 days. Prescription verification will be required 
          at the time of order fulfillment. Frame and lens availability may vary.
        </AlertDescription>
      </Alert>
    </div>
  );
}