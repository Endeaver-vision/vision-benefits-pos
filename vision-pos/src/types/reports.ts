// Transaction Report Types
export interface TransactionReportFilters {
  startDate?: string;
  endDate?: string;
  locationId?: string;
  userId?: string;
  status?: string;
  insuranceCarrier?: string;
  customerId?: string;
  minAmount?: string;
  maxAmount?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionSummary {
  totalRevenue: number;
  totalSubtotal: number;
  totalTax: number;
  totalDiscount: number;
  totalInsuranceDiscount: number;
  totalPatientPortion: number;
  averageTransactionValue: number;
  transactionCount: number;
}

export interface StatusDistribution {
  status: string;
  _count: {
    status: number;
  };
}

export interface InsuranceDistribution {
  insuranceCarrier: string | null;
  _count: {
    insuranceCarrier: number;
  };
}

export interface TopAssociate {
  userId: string;
  _sum: {
    total: number | null;
  };
  _count: {
    id: number;
  };
  userName?: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalTransactions: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TransactionReportResponse {
  success: boolean;
  data?: {
    transactions: any[];
    pagination: PaginationInfo;
    summary: TransactionSummary;
    distributions: {
      status: StatusDistribution[];
      insurance: InsuranceDistribution[];
    };
    topAssociates: TopAssociate[];
  };
  error?: string;
}