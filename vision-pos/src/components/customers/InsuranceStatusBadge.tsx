'use client';

import { CheckCircle2, AlertCircle, XCircle, Clock, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type InsuranceVerificationStatus =
  | 'verified'
  | 'needs_verification'
  | 'no_insurance'
  | 'expired'
  | 'pending';

interface InsuranceStatusBadgeProps {
  status: InsuranceVerificationStatus;
  carrier?: string | null;
  expirationDate?: string | Date | null;
  showTooltip?: boolean;
  className?: string;
}

const statusConfig = {
  verified: {
    icon: CheckCircle2,
    label: 'Verified',
    variant: 'default' as const,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
    tooltip: 'Insurance verified and ready for pricing',
  },
  needs_verification: {
    icon: AlertCircle,
    label: 'Needs Verification',
    variant: 'secondary' as const,
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    tooltip: 'Insurance on file but not verified - scan card to verify',
  },
  no_insurance: {
    icon: XCircle,
    label: 'No Insurance',
    variant: 'outline' as const,
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400',
    borderColor: 'border-gray-200 dark:border-gray-700',
    tooltip: 'No insurance on file - will use retail pricing',
  },
  expired: {
    icon: Clock,
    label: 'Expired',
    variant: 'destructive' as const,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
    tooltip: 'Insurance has expired - request new card',
  },
  pending: {
    icon: HelpCircle,
    label: 'Pending',
    variant: 'secondary' as const,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800',
    tooltip: 'Insurance information is being processed',
  },
};

export function InsuranceStatusBadge({
  status,
  carrier,
  expirationDate,
  showTooltip = true,
  className,
}: InsuranceStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const badge = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{carrier || config.label}</span>
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  let tooltipText = config.tooltip;
  if (carrier && status === 'verified') {
    tooltipText = `${carrier} - Verified`;
  }
  if (expirationDate && status === 'expired') {
    const expDate = new Date(expirationDate).toLocaleDateString();
    tooltipText = `Expired on ${expDate}`;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper function to determine status from customer data
export function getInsuranceStatus(customer: {
  insuranceCarrier?: string | null;
  insuranceInfo?: Array<{
    isActive: boolean;
    expirationDate?: Date | string | null;
    // Check if there are verified documents
  }> | null;
  insuranceDocuments?: Array<{
    isVerified: boolean;
  }> | null;
}): InsuranceVerificationStatus {
  // Check for verified documents
  const hasVerifiedDocument = customer.insuranceDocuments?.some(
    (doc) => doc.isVerified
  );

  // Check active insurance records
  const activeInsurance = customer.insuranceInfo?.find(
    (ins) => ins.isActive
  );

  if (!customer.insuranceCarrier && !activeInsurance) {
    return 'no_insurance';
  }

  // Check expiration
  if (activeInsurance?.expirationDate) {
    const expDate = new Date(activeInsurance.expirationDate);
    if (expDate < new Date()) {
      return 'expired';
    }
  }

  if (hasVerifiedDocument) {
    return 'verified';
  }

  if (customer.insuranceCarrier || activeInsurance) {
    return 'needs_verification';
  }

  return 'no_insurance';
}

// Compact version for lists
export function InsuranceStatusIcon({
  status,
  className,
}: {
  status: InsuranceVerificationStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Icon className={cn('h-4 w-4', config.textColor, className)} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
