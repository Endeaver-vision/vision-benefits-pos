/**
 * Benefit Summary Card
 * Displays insurance benefit allowances and usage
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Eye,
  Glasses,
  Contact,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface BenefitSummary {
  carrier: string;
  planYear: number;

  // Exam
  examCopay: number;
  examCovered: boolean;
  examEligible: boolean;
  examNextDate?: string;

  // Materials
  materialsCopay: number;
  materialsEligible: boolean;
  materialsNextDate?: string;

  // Allowances
  frameAllowance: number;
  frameAllowanceFeatured?: number;
  frameOverageDiscount?: number;
  frameAllowanceUsed: number;
  frameAllowanceRemaining: number;
  lensAllowance: number;
  lensAllowanceUsed: number;
  lensAllowanceRemaining: number;
  contactAllowance: number;
  contactAllowanceUsed: number;
  contactAllowanceRemaining: number;

  // Contacts
  contactFittingCovered?: boolean;
  contactFittingCopay: number;
  contactsEligible: boolean;
  contactsNextDate?: string;

  // Exclusion rules
  glassesContactsExclusive?: boolean;
}

interface BenefitSummaryCardProps {
  benefit: BenefitSummary;
  compact?: boolean;
}

export function BenefitSummaryCard({ benefit, compact = false }: BenefitSummaryCardProps) {
  const getCarrierColor = (carrier: string) => {
    const colors: Record<string, string> = {
      VSP: 'bg-blue-500',
      EyeMed: 'bg-green-500',
      Spectera: 'bg-purple-500',
      Medicare: 'bg-red-500',
      Medicaid: 'bg-orange-500',
    };
    return colors[carrier] || 'bg-gray-500';
  };

  const calculateUsagePercent = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Insurance Benefits</CardTitle>
            <Badge className={getCarrierColor(benefit.carrier)}>
              {benefit.carrier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">Frames</div>
              <div className="font-semibold">{formatCurrency(benefit.frameAllowanceRemaining)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Lenses</div>
              <div className="font-semibold">{formatCurrency(benefit.lensAllowanceRemaining)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Contacts</div>
              <div className="font-semibold">{formatCurrency(benefit.contactAllowanceRemaining)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Insurance Benefits Summary</CardTitle>
            <CardDescription>
              {benefit.carrier} - Plan Year {benefit.planYear}
            </CardDescription>
          </div>
          <Badge className={getCarrierColor(benefit.carrier)} variant="default">
            {benefit.carrier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Eligibility Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3">
            <Eye className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Eye Exam</span>
                {benefit.examEligible ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {benefit.examEligible 
                  ? `Copay: ${formatCurrency(benefit.examCopay)}`
                  : `Next: ${formatDate(benefit.examNextDate)}`
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Glasses className="h-5 w-5 text-purple-500 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Materials</span>
                {benefit.materialsEligible ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {benefit.materialsEligible 
                  ? `Copay: ${formatCurrency(benefit.materialsCopay)}`
                  : `Next: ${formatDate(benefit.materialsNextDate)}`
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Contact className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Contacts</span>
                {benefit.contactsEligible ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {benefit.contactsEligible
                  ? benefit.contactFittingCovered
                    ? 'Fitting: Covered'
                    : `Fitting: ${formatCurrency(benefit.contactFittingCopay)}`
                  : `Next: ${formatDate(benefit.contactsNextDate)}`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Glasses/Contacts Mutual Exclusion Warning */}
        {benefit.glassesContactsExclusive && (
          <div className="flex items-start space-x-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Glasses or Contacts - Not Both
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This plan covers glasses OR contacts per benefit period, not both.
                If the patient chooses contacts, they cannot also use frame/lens benefits.
              </p>
            </div>
          </div>
        )}

        {/* Allowance Usage */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Allowance Usage</h4>
          
          {/* Frames */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Frame Allowance</span>
              <div className="text-right">
                <span className="text-sm font-semibold">
                  {formatCurrency(benefit.frameAllowanceRemaining)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  of {formatCurrency(benefit.frameAllowance)}
                </span>
              </div>
            </div>
            <Progress
              value={calculateUsagePercent(benefit.frameAllowanceUsed, benefit.frameAllowance)}
              className="h-2"
            />
            {benefit.frameAllowanceFeatured && benefit.frameAllowanceFeatured > benefit.frameAllowance && (
              <p className="text-xs text-muted-foreground mt-1">
                Featured brands: {formatCurrency(benefit.frameAllowanceFeatured)}
                {benefit.frameOverageDiscount ? ` • ${benefit.frameOverageDiscount}% off overage` : ''}
              </p>
            )}
          </div>
          
          {/* Lenses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Lens Allowance</span>
              <div className="text-right">
                <span className="text-sm font-semibold">
                  {formatCurrency(benefit.lensAllowanceRemaining)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  of {formatCurrency(benefit.lensAllowance)}
                </span>
              </div>
            </div>
            <Progress 
              value={calculateUsagePercent(benefit.lensAllowanceUsed, benefit.lensAllowance)} 
              className="h-2"
            />
          </div>
          
          {/* Contacts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Contact Lens Allowance</span>
              <div className="text-right">
                <span className="text-sm font-semibold">
                  {formatCurrency(benefit.contactAllowanceRemaining)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  of {formatCurrency(benefit.contactAllowance)}
                </span>
              </div>
            </div>
            <Progress 
              value={calculateUsagePercent(benefit.contactAllowanceUsed, benefit.contactAllowance)} 
              className="h-2"
            />
          </div>
        </div>

        {/* Total Savings */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Available Benefits</span>
            <span className="text-lg font-bold text-green-600">
              {formatCurrency(
                benefit.frameAllowanceRemaining + 
                benefit.lensAllowanceRemaining + 
                benefit.contactAllowanceRemaining
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
