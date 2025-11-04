'use client';

// @ts-nocheck
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, TrendingUp, DollarSign, Users } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export default function TransactionDashboard() {
  const [dateRange, setDateRange] = useState('7'); // Default to last 7 days

  // Calculate date range
  const endDate = new Date();
  const startDate = subDays(endDate, parseInt(dateRange));

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['transaction-dashboard', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: format(startOfDay(startDate), 'yyyy-MM-dd'),
        endDate: format(endOfDay(endDate), 'yyyy-MM-dd'),
        limit: '1000', // Get more data for analysis
      });

      const response = await fetch(`/api/reports/transactions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json().then(data => data.data);
    },
  });

  const summary = dashboardData?.summary || {};
  const distributions = dashboardData?.distributions || {};
  const topAssociates = dashboardData?.topAssociates || [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction Dashboard</h1>
          <p className="text-muted-foreground">
            Quick insights for the last {dateRange} days
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={dateRange === '7' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('7')}
          >
            7 Days
          </Button>
          <Button
            variant={dateRange === '30' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('30')}
          >
            30 Days
          </Button>
          <Button
            variant={dateRange === '90' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('90')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {dateRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.transactionCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {((summary.transactionCount || 0) / parseInt(dateRange)).toFixed(1)} per day avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.averageTransactionValue?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patient Portion</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.totalPatientPortion?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Patient responsibility
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Status */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Status</CardTitle>
            <CardDescription>Distribution of transaction statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {distributions.status?.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">{item.status}</span>
                  <span className="text-sm text-muted-foreground">{item._count.status} transactions</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Associates */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Associates</CardTitle>
            <CardDescription>Revenue by sales associate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAssociates.slice(0, 5).map((associate: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">{associate.userName}</span>
                  <div className="text-right">
                    <div className="font-medium">${associate._sum.total?.toFixed(2) || '0.00'}</div>
                    <div className="text-sm text-muted-foreground">{associate._count.id} transactions</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insurance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Insurance Carriers</CardTitle>
            <CardDescription>Transaction breakdown by insurance carrier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {distributions.insurance?.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">{item.insuranceCarrier || 'No Insurance'}</span>
                  <span className="text-sm text-muted-foreground">{item._count.insuranceCarrier} transactions</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate to detailed reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" asChild>
              <a href="/reports/transactions">Detailed Transaction Reports</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/analytics">Sales Analytics</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/reports">All Reports</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/dashboard">Back to Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}