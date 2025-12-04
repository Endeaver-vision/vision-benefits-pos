'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingDown,
  CreditCard,
  Building,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { InsuranceStatusBadge, getInsuranceStatus } from '@/components/customers/InsuranceStatusBadge';
import { VerificationBanner } from '@/components/customers/VerificationPrompt';

interface QuoteItem {
  productId: string;
  productName: string;
  productType: 'frame' | 'progressive' | 'ar_coating' | 'other';
  retailPrice: number;
  allowance?: number;
  tierDiscount?: number;
  patientPays?: number;
  insurancePays?: number;
  savings?: number;
  formularyMatch?: {
    tier: string;
    tierName: string;
    brand: string;
  };
}

interface QuoteSummary {
  subtotal: number;
  totalAllowance: number;
  totalDiscount: number;
  patientTotal: number;
  insuranceTotal: number;
  totalSavings: number;
  materialsCopay: number;
  examCopay: number;
}

interface CustomerInsurance {
  carrier: string | null;
  planName: string | null;
  tier: string | null;
  frameAllowance: number;
  lensAllowance: number;
  materialsCopay: number;
  isVerified: boolean;
}

interface InsuranceQuoteBreakdownProps {
  customerId: string;
  customerName: string;
  customer: {
    insuranceCarrier?: string | null;
    insuranceInfo?: Array<{
      isActive: boolean;
      carrier: string;
      planName?: string | null;
      expirationDate?: Date | string | null;
      coverageDetails?: Record<string, unknown>;
    }> | null;
    insuranceDocuments?: Array<{
      isVerified: boolean;
      carrier?: string | null;
      frameAllowance?: number | null;
      lensAllowance?: number | null;
      copayMaterials?: number | null;
      networkTier?: string | null;
    }> | null;
  };
  items: QuoteItem[];
  onRecalculate?: () => void;
  className?: string;
}

export function InsuranceQuoteBreakdown({
  customerId,
  customerName,
  customer,
  items,
  onRecalculate,
  className,
}: InsuranceQuoteBreakdownProps) {
  const [summary, setSummary] = useState<QuoteSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine insurance status
  const insuranceStatus = getInsuranceStatus(customer);

  // Get insurance details
  const getInsuranceDetails = (): CustomerInsurance => {
    const verifiedDoc = customer.insuranceDocuments?.find((d) => d.isVerified);
    const activeInsurance = customer.insuranceInfo?.find((i) => i.isActive);

    if (verifiedDoc) {
      return {
        carrier: verifiedDoc.carrier || null,
        planName: null,
        tier: verifiedDoc.networkTier || null,
        frameAllowance: Number(verifiedDoc.frameAllowance) || 0,
        lensAllowance: Number(verifiedDoc.lensAllowance) || 0,
        materialsCopay: Number(verifiedDoc.copayMaterials) || 0,
        isVerified: true,
      };
    }

    if (activeInsurance) {
      const coverage = activeInsurance.coverageDetails || {};
      return {
        carrier: activeInsurance.carrier,
        planName: activeInsurance.planName || null,
        tier: (coverage.networkTier as string) || null,
        frameAllowance: Number(coverage.frameAllowance) || 0,
        lensAllowance: Number(coverage.lensAllowance) || 0,
        materialsCopay: Number(coverage.materialsCopay) || 0,
        isVerified: false,
      };
    }

    return {
      carrier: customer.insuranceCarrier || null,
      planName: null,
      tier: null,
      frameAllowance: 0,
      lensAllowance: 0,
      materialsCopay: 0,
      isVerified: false,
    };
  };

  const insurance = getInsuranceDetails();

  // Calculate pricing
  useEffect(() => {
    const calculatePricing = async () => {
      if (items.length === 0) {
        setSummary(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId,
            products: items.map((item) => ({
              productId: item.productId,
              productType: item.productType,
              productName: item.productName,
              retailPrice: item.retailPrice,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to calculate pricing');
        }

        const result = await response.json();
        if (result.success) {
          setSummary(result.data.summary);
        } else {
          throw new Error(result.error || 'Calculation failed');
        }
      } catch (err) {
        console.error('Pricing error:', err);
        setError(err instanceof Error ? err.message : 'Failed to calculate');
        // Fall back to retail pricing
        const subtotal = items.reduce((sum, item) => sum + item.retailPrice, 0);
        setSummary({
          subtotal,
          totalAllowance: 0,
          totalDiscount: 0,
          patientTotal: subtotal,
          insuranceTotal: 0,
          totalSavings: 0,
          materialsCopay: 0,
          examCopay: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    calculatePricing();
  }, [customerId, items]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Insurance Pricing Breakdown
          </CardTitle>
          <div className="flex items-center gap-2">
            {insurance.carrier && (
              <InsuranceStatusBadge
                status={insuranceStatus}
                carrier={insurance.carrier}
              />
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Verification Banner if needed */}
          {insuranceStatus !== 'verified' && insuranceStatus !== 'no_insurance' && (
            <VerificationBanner
              customerId={customerId}
              customerName={customerName}
              status={insuranceStatus}
              carrier={insurance.carrier}
              onVerificationComplete={onRecalculate}
            />
          )}

          {/* Insurance Summary */}
          {insurance.carrier && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Insurance Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRecalculate}
                  disabled={loading}
                >
                  <RefreshCw
                    className={cn('h-4 w-4 mr-1', loading && 'animate-spin')}
                  />
                  Recalculate
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Carrier:</span>{' '}
                  <span className="font-medium">{insurance.carrier}</span>
                </div>
                {insurance.tier && (
                  <div>
                    <span className="text-muted-foreground">Tier:</span>{' '}
                    <span className="font-medium">{insurance.tier}</span>
                  </div>
                )}
                {insurance.frameAllowance > 0 && (
                  <div>
                    <span className="text-muted-foreground">Frame Allowance:</span>{' '}
                    <span className="font-medium">
                      {formatCurrency(insurance.frameAllowance)}
                    </span>
                  </div>
                )}
                {insurance.materialsCopay > 0 && (
                  <div>
                    <span className="text-muted-foreground">Materials Copay:</span>{' '}
                    <span className="font-medium">
                      {formatCurrency(insurance.materialsCopay)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items Breakdown */}
          {items.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Items</h4>
              <div className="space-y-1">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.productName}</p>
                      {item.formularyMatch && (
                        <p className="text-xs text-muted-foreground">
                          {item.formularyMatch.brand} - Tier{' '}
                          {item.formularyMatch.tier}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {formatCurrency(item.patientPays || item.retailPrice)}
                      </p>
                      {(item.savings || 0) > 0 && (
                        <p className="text-xs text-green-600">
                          Save {formatCurrency(item.savings || 0)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Retail Subtotal</span>
                <span>{formatCurrency(summary.subtotal)}</span>
              </div>

              {summary.totalAllowance > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    Frame Allowance
                  </span>
                  <span>-{formatCurrency(summary.totalAllowance)}</span>
                </div>
              )}

              {summary.totalDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Tier Discounts
                  </span>
                  <span>-{formatCurrency(summary.totalDiscount)}</span>
                </div>
              )}

              {summary.materialsCopay > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Materials Copay</span>
                  <span>+{formatCurrency(summary.materialsCopay)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Insurance Pays</span>
                <span className="text-blue-600">
                  {formatCurrency(summary.insuranceTotal)}
                </span>
              </div>

              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4" />
                  Patient Pays
                </span>
                <span>{formatCurrency(summary.patientTotal)}</span>
              </div>

              {summary.totalSavings > 0 && (
                <div className="flex justify-between text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  <span className="font-medium">Total Savings</span>
                  <span className="font-bold">
                    {formatCurrency(summary.totalSavings)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                {error}
              </div>
              <p className="text-xs mt-1">Showing retail pricing as fallback</p>
            </div>
          )}

          {/* No Insurance Info */}
          {!insurance.carrier && items.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">
                No insurance on file. Using retail pricing.
              </p>
              <Button variant="outline" size="sm">
                Add Insurance
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
