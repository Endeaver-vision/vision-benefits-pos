'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  Users, 
  FileText, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Eye,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface KPICardsProps {
  data: {
    totalQuotes: number;
    completedSales: number;
    totalRevenue: number;
    averageSaleValue: number;
    uniqueCustomers: number;
    activeStaff: number;
    conversionRate: string;
    period: {
      startDate: string;
      endDate: string;
    };
  };
  statusBreakdown: Array<{
    status: string;
    count: number;
    value: number;
    percentage: string;
  }>;
  loading?: boolean;
}

export default function KPICards({ data, statusBreakdown, loading = false }: KPICardsProps) {
  // Calculate additional metrics
  const averageQuotesPerCustomer = data.uniqueCustomers > 0 ? (data.totalQuotes / data.uniqueCustomers).toFixed(1) : '0';
  const averageQuotesPerStaff = data.activeStaff > 0 ? (data.totalQuotes / data.activeStaff).toFixed(1) : '0';
  const revenuePerStaff = data.activeStaff > 0 ? (data.totalRevenue / data.activeStaff).toFixed(0) : '0';

  // Get specific status counts
  const draftQuotes = statusBreakdown.find(s => s.status === 'DRAFT')?.count || 0;
  const presentedQuotes = statusBreakdown.find(s => s.status === 'PRESENTED')?.count || 0;
  const signedQuotes = statusBreakdown.find(s => s.status === 'SIGNED')?.count || 0;
  const cancelledQuotes = statusBreakdown.find(s => s.status === 'CANCELLED')?.count || 0;

  // Mock previous period data for comparison (in a real app, this would come from the API)
  const mockPreviousPeriod = {
    totalRevenue: data.totalRevenue * 0.85,
    completedSales: Math.floor(data.completedSales * 0.9),
    conversionRate: (parseFloat(data.conversionRate) - 5),
    averageSaleValue: data.averageSaleValue * 0.95
  };

  // Helper function to calculate trend
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, isPositive: true };
    const percentage = ((current - previous) / previous) * 100;
    return { 
      percentage: Math.abs(percentage), 
      isPositive: percentage >= 0 
    };
  };

  // Trend calculations
  const revenueTrend = calculateTrend(data.totalRevenue, mockPreviousPeriod.totalRevenue);
  const salesTrend = calculateTrend(data.completedSales, mockPreviousPeriod.completedSales);
  const conversionTrend = calculateTrend(parseFloat(data.conversionRate), mockPreviousPeriod.conversionRate);
  const avgSaleTrend = calculateTrend(data.averageSaleValue, mockPreviousPeriod.averageSaleValue);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-700">Total Revenue</p>
                <p className="text-3xl font-bold text-green-900">
                  ${data.totalRevenue.toLocaleString()}
                </p>
                <div className="flex items-center space-x-1">
                  {revenueTrend.isPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    revenueTrend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {revenueTrend.percentage.toFixed(1)}% vs last period
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed Sales */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-700">Completed Sales</p>
                <p className="text-3xl font-bold text-blue-900">{data.completedSales}</p>
                <div className="flex items-center space-x-1">
                  {salesTrend.isPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    salesTrend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {salesTrend.percentage.toFixed(1)}% vs last period
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-purple-700">Conversion Rate</p>
                <p className="text-3xl font-bold text-purple-900">{data.conversionRate}%</p>
                <div className="flex items-center space-x-1">
                  {conversionTrend.isPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    conversionTrend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {conversionTrend.percentage.toFixed(1)}% vs last period
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Sale Value */}
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-700">Avg Sale Value</p>
                <p className="text-3xl font-bold text-orange-900">
                  ${data.averageSaleValue.toFixed(0)}
                </p>
                <div className="flex items-center space-x-1">
                  {avgSaleTrend.isPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    avgSaleTrend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {avgSaleTrend.percentage.toFixed(1)}% vs last period
                  </span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Quotes */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Quotes</p>
                <p className="text-2xl font-bold">{data.totalQuotes}</p>
                <p className="text-xs text-muted-foreground">
                  {averageQuotesPerCustomer} quotes/customer
                </p>
              </div>
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Unique Customers */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Unique Customers</p>
                <p className="text-2xl font-bold">{data.uniqueCustomers}</p>
                <p className="text-xs text-muted-foreground">
                  Active in period
                </p>
              </div>
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Active Staff */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Active Staff</p>
                <p className="text-2xl font-bold">{data.activeStaff}</p>
                <p className="text-xs text-muted-foreground">
                  ${revenuePerStaff}/staff revenue
                </p>
              </div>
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Quotes per Staff */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Quotes/Staff</p>
                <p className="text-2xl font-bold">{averageQuotesPerStaff}</p>
                <p className="text-xs text-muted-foreground">
                  Average productivity
                </p>
              </div>
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Quote Status Breakdown
          </CardTitle>
          <CardDescription>
            Current distribution of quotes across all stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* In Progress Quotes */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <p className="text-2xl font-bold text-gray-900">{draftQuotes}</p>
              <p className="text-sm text-gray-600">Drafts</p>
            </div>

            {/* Presented Quotes */}
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Eye className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-900">{presentedQuotes}</p>
              <p className="text-sm text-yellow-600">Presented</p>
            </div>

            {/* Signed Quotes */}
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold text-orange-900">{signedQuotes}</p>
              <p className="text-sm text-orange-600">Signed</p>
            </div>

            {/* Completed Sales */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-900">{data.completedSales}</p>
              <p className="text-sm text-green-600">Completed</p>
            </div>

            {/* Cancelled Quotes */}
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <Activity className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold text-red-900">{cancelledQuotes}</p>
              <p className="text-sm text-red-600">Cancelled</p>
            </div>

            {/* Total Quotes */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-900">{data.totalQuotes}</p>
              <p className="text-sm text-blue-600">Total</p>
            </div>
          </div>

          {/* Status Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Quote Processing Pipeline</span>
              <span className="text-sm text-muted-foreground">
                {data.totalQuotes} total quotes
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              {statusBreakdown.map((status) => {
                const colors = {
                  'BUILDING': 'bg-gray-400',
                  'DRAFT': 'bg-yellow-400',
                  'PRESENTED': 'bg-orange-400',
                  'SIGNED': 'bg-blue-400',
                  'COMPLETED': 'bg-green-500',
                  'CANCELLED': 'bg-red-400',
                  'EXPIRED': 'bg-red-300'
                };
                
                return (
                  <div
                    key={status.status}
                    className={`h-full float-left ${colors[status.status as keyof typeof colors] || 'bg-gray-300'}`}
                    style={{ width: `${status.percentage}%` }}
                    title={`${status.status}: ${status.count} (${status.percentage}%)`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>Pipeline Start</span>
              <span>Completed Sales</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}