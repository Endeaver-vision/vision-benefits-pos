'use client';

import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  FileText, 
  Presentation, 
  FileSignature, 
  CheckCircle, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';

// Quote status enum matching our database schema
export type QuoteStatus = 
  | 'BUILDING' 
  | 'DRAFT' 
  | 'PRESENTED' 
  | 'SIGNED' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'EXPIRED';

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  BUILDING: {
    label: 'Building',
    color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    icon: Clock,
    description: 'Quote is being built'
  },
  DRAFT: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
    icon: FileText,
    description: 'Quote saved as draft'
  },
  PRESENTED: {
    label: 'Presented',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
    icon: Presentation,
    description: 'Quote presented to customer'
  },
  SIGNED: {
    label: 'Signed',
    color: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
    icon: FileSignature,
    description: 'Quote signed by customer'
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
    icon: CheckCircle,
    description: 'Quote completed successfully'
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
    icon: XCircle,
    description: 'Quote was cancelled'
  },
  EXPIRED: {
    label: 'Expired',
    color: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
    icon: AlertTriangle,
    description: 'Quote has expired'
  }
};

export function QuoteStatusBadge({ 
  status, 
  size = 'md', 
  showIcon = true, 
  className = '' 
}: QuoteStatusBadgeProps) {
  const config = statusConfig[status];
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge 
      variant="secondary"
      className={`
        inline-flex items-center gap-1.5 font-medium border
        ${config.color} 
        ${sizeClasses[size]} 
        ${className}
      `}
      title={config.description}
    >
      {showIcon && (
        <IconComponent className={iconSizes[size]} />
      )}
      {config.label}
    </Badge>
  );
}

// Helper function to get status color for other components
export function getStatusColor(status: QuoteStatus): string {
  return statusConfig[status].color;
}

// Helper function to get all statuses for filters
export function getAllQuoteStatuses(): { value: QuoteStatus; label: string }[] {
  return Object.entries(statusConfig).map(([value, config]) => ({
    value: value as QuoteStatus,
    label: config.label
  }));
}

// Helper function to check if status allows certain actions
export function canResumeQuote(status: QuoteStatus): boolean {
  return status === 'DRAFT' || status === 'BUILDING';
}

export function canCancelQuote(status: QuoteStatus): boolean {
  return ['BUILDING', 'DRAFT', 'PRESENTED', 'SIGNED'].includes(status);
}

export function canCompleteQuote(status: QuoteStatus): boolean {
  return status === 'SIGNED';
}