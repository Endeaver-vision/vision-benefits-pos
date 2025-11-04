'use client';

// @ts-nocheck
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, TrendingUp, Star, Calendar, Crown } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export default function CustomerDashboard() {
  const [dateRange, setDateRange] = useState('30'); // Default to last 30 days

  // Calculate date range
  const endDate = new Date();
  const startDate = subDays(endDate, parseInt(dateRange));

  // Fetch customer analytics
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['customer-dashboard', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: format(startOfDay(startDate), 'yyyy-MM-dd'),
        endDate: format(endOfDay(endDate), 'yyyy-MM-dd'),
        limit: '1000',
      });

      const response = await fetch(`/api/analytics/customers?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer analytics');
      }
      return response.json().then(data => data.data);
    },
  });

  const summary = dashboardData?.summary || {};
  const customers = dashboardData?.customers || [];
  const topCustomers = dashboardData?.topCustomers || {};
  const insights = dashboardData?.insights || {};

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
          <h1 className="text-3xl font-bold tracking-tight">Customer Dashboard</h1>
          <p className="text-muted-foreground">
            Customer insights for the last {dateRange} days
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <a href="/reports/customers">Detailed Reports</a>
          </Button>
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
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCustomers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.totalRevenue?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total customer value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Customer Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.averageCustomerValue?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per customer lifetime
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Rate</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.repeatCustomerRate?.toFixed(1) || '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Customers with 2+ orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments</CardTitle>
            <CardDescription>Customer distribution by value and frequency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Crown className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="font-semibold text-purple-800">VIP Customers</div>
                    <div className="text-sm text-purple-600">High Value + Frequent</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-800">
                    {customers.filter(c => c.isHighValueCustomer && c.isFrequentCustomer).length}
                  </div>
                  <div className="text-sm text-purple-600">customers</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="font-semibold text-green-800">High Value</div>
                    <div className="text-sm text-green-600">$500+ lifetime value</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-800">
                    {customers.filter(c => c.isHighValueCustomer).length}
                  </div>
                  <div className="text-sm text-green-600">customers</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="font-semibold text-blue-800">Frequent Customers</div>
                    <div className="text-sm text-blue-600">3+ transactions</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-800">
                    {customers.filter(c => c.isFrequentCustomer).length}
                  </div>
                  <div className="text-sm text-blue-600">customers</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-gray-600" />
                  <div>
                    <div className="font-semibold text-gray-800">Repeat Customers</div>
                    <div className="text-sm text-gray-600">2+ transactions</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800">
                    {customers.filter(c => c.isRepeatCustomer).length}
                  </div>
                  <div className="text-sm text-gray-600">customers</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Spenders</CardTitle>
            <CardDescription>Highest value customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCustomers.topSpenders?.slice(0, 5).map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                      <div className="text-sm text-muted-foreground">{customer.totalTransactions} orders</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${customer.totalSpent.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      ${customer.averageTransactionValue.toFixed(2)} avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Insurance Preferences</CardTitle>
            <CardDescription>Customer insurance usage patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(insights.insuranceAnalysis || {})
                .sort(([,a], [,b]) => b.customers - a.customers)
                .map(([carrier, data]) => (
                <div key={carrier} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">{carrier}</div>
                    <div className="text-sm text-muted-foreground">
                      {data.transactions} transactions
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{data.customers} customers</div>
                    <div className="text-sm text-muted-foreground">
                      ${data.totalSavings.toFixed(2)} saved
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Preferences</CardTitle>
            <CardDescription>Popular product categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(insights.categoryAnalysis || {})
                .sort(([,a], [,b]) => b.customers - a.customers)
                .slice(0, 5)
                .map(([category, data]) => (
                <div key={category} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">{category}</div>
                    <div className="text-sm text-muted-foreground">
                      {data.items} items sold
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{data.customers} customers</div>
                    <div className="text-sm text-muted-foreground">
                      ${data.revenue.toFixed(2)} revenue
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to detailed reports and analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button className="w-full" asChild>
              <a href="/reports/customers">Detailed Customer Reports</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/reports/transactions">Transaction Reports</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/analytics">Sales Analytics</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/dashboard">Back to Dashboard</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}