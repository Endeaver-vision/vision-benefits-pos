/**
 * Insurance Pricing Breakdown
 * Shows detailed pricing with insurance discounts and patient responsibility
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle } from 'lucide-react';

interface PricingBreakdownProps {
  retailPrice: number;
  tierDiscount: number;
  tierDiscountPercent: number;
  insurancePrice: number;
  allowanceApplied: number;
  copayAmount: number;
  patientResponsibility: number;
  insuranceSavings: number;
  isFullyCovered: boolean;
  productName?: string;
  carrier?: string;
  tierCode?: string;
}

export function InsurancePricingBreakdown(props: PricingBreakdownProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pricing Breakdown</CardTitle>
          {props.isFullyCovered && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Fully Covered
            </Badge>
          )}
        </div>
        {props.productName && (
          <p className="text-sm text-muted-foreground">{props.productName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Retail Price */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Retail Price</span>
          <span className="text-sm font-medium">{formatCurrency(props.retailPrice)}</span>
        </div>

        {/* Tier Discount */}
        {props.tierDiscount > 0 && (
          <>
            <div className="flex items-center justify-between text-green-600">
              <span className="text-sm flex items-center">
                Insurance Discount
                {props.carrier && props.tierCode && (
                  <Badge variant="outline" className="ml-2">
                    {props.carrier} Tier {props.tierCode}
                  </Badge>
                )}
              </span>
              <span className="text-sm font-medium">
                -{formatCurrency(props.tierDiscount)}
                {props.tierDiscountPercent > 0 && (
                  <span className="text-xs ml-1">({props.tierDiscountPercent}%)</span>
                )}
              </span>
            </div>
            <Separator />
          </>
        )}

        {/* Insurance Price */}
        {props.tierDiscount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Insurance Price</span>
            <span className="text-sm font-medium">{formatCurrency(props.insurancePrice)}</span>
          </div>
        )}

        {/* Allowance Applied */}
        {props.allowanceApplied > 0 && (
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-sm">Benefit Allowance Applied</span>
            <span className="text-sm font-medium">-{formatCurrency(props.allowanceApplied)}</span>
          </div>
        )}

        {/* Copay */}
        {props.copayAmount > 0 && (
          <div className="flex items-center justify-between text-orange-600">
            <span className="text-sm">Copay</span>
            <span className="text-sm font-medium">+{formatCurrency(props.copayAmount)}</span>
          </div>
        )}

        <Separator className="my-3" />

        {/* Patient Responsibility */}
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">Patient Pays</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(props.patientResponsibility)}
          </span>
        </div>

        {/* Savings Summary */}
        {props.insuranceSavings > 0 && (
          <div className="pt-3 mt-3 border-t bg-green-50 dark:bg-green-950 -mx-6 -mb-6 px-6 py-3 rounded-b-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700 dark:text-green-300">
                Total Insurance Savings
              </span>
              <span className="text-base font-bold text-green-700 dark:text-green-300">
                {formatCurrency(props.insuranceSavings)}
              </span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              You save {Math.round((props.insuranceSavings / props.retailPrice) * 100)}% with insurance
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
