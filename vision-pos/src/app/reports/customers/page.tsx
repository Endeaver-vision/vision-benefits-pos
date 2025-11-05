'use client';

// @ts-nocheck
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Star,
  Filter,
  Download
} from 'lucide-react';

interface CustomerAnalyticsFilters {
  startDate: string;
  endDate: string;
  locationId: string;
  insuranceCarrier: string;
  minTransactions: number;
  minSpent: number;
  limit: number;
}

const initialFilters: CustomerAnalyticsFilters = {
  startDate: '',
  endDate: '',
  locationId: '',
  insuranceCarrier: 'all',
  minTransactions: 0,
  minSpent: 0,
  limit: 100,
};

export default function CustomerAnalyticsPage() {
  const [filters, setFilters] = useState<CustomerAnalyticsFilters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'customers' | 'insights'>('overview');

  // Fetch customer analytics
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['customer-analytics', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== 0) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/analytics/customers?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer analytics');
      }
      return response.json();
    },
  });

  // Handle export
  const handleExport = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== 0) {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`/api/analytics/customers/export?${params}`);
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customer-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };
  const updateFilter = (key: keyof CustomerAnalyticsFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const customers = analyticsData?.data?.customers || [];
  const summary = analyticsData?.data?.summary || {};
  const topCustomers = analyticsData?.data?.topCustomers || {};
  const insights = analyticsData?.data?.insights || {};

  const getLoyaltyBadge = (customer: any) => {
    if (customer.isHighValueCustomer && customer.isFrequentCustomer) {
      return <Badge className="bg-purple-500">VIP</Badge>;
    }
    if (customer.isHighValueCustomer) {
      return <Badge className="bg-green-500">High Value</Badge>;
    }
    if (customer.isFrequentCustomer) {
      return <Badge className="bg-blue-500">Frequent</Badge>;
    }
    if (customer.isRepeatCustomer) {
      return <Badge variant="secondary">Repeat</Badge>;
    }
    return <Badge variant="outline">New</Badge>;
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-500">
          Error loading customer analytics. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Analytics</h1>
          <p className="text-muted-foreground">
            Customer insights, purchase history, and loyalty analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <a href="/reports/customers/dashboard">Customer Dashboard</a>
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
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
              Active customers with transactions
            </p>
          </CardContent>
        </Card>

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
              From all customers
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
              Customers with 2+ purchases
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter customer analytics by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => updateFilter('startDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => updateFilter('endDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Insurance</label>
                <Select value={filters.insuranceCarrier} onValueChange={(value) => updateFilter('insuranceCarrier', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All carriers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All carriers</SelectItem>
                    <SelectItem value="VSP">VSP</SelectItem>
                    <SelectItem value="EyeMed">EyeMed</SelectItem>
                    <SelectItem value="Spectera">Spectera</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Transactions</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minTransactions || ''}
                  onChange={(e) => updateFilter('minTransactions', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Spent</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={filters.minSpent || ''}
                  onChange={(e) => updateFilter('minSpent', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => setFilters(initialFilters)}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b">
        <Button
          variant={selectedTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('overview')}
          className="rounded-b-none"
        >
          Overview
        </Button>
        <Button
          variant={selectedTab === 'customers' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('customers')}
          className="rounded-b-none"
        >
          Customer List
        </Button>
        <Button
          variant={selectedTab === 'insights' ? 'default' : 'ghost'}
          onClick={() => setSelectedTab('insights')}
          className="rounded-b-none"
        >
          Insights
        </Button>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading customer analytics...</div>
        </div>
      ) : (
        <>
          {selectedTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Spenders */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Spenders</CardTitle>
                  <CardDescription>Customers by total revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topCustomers.topSpenders?.slice(0, 5).map((customer: any, index: number) => (
                      <div key={customer.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${customer.totalSpent.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">{customer.totalTransactions} orders</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Most Frequent Customers */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Frequent Customers</CardTitle>
                  <CardDescription>Customers by transaction count</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topCustomers.topFrequent?.slice(0, 5).map((customer: any, index: number) => (
                      <div key={customer.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{customer.totalTransactions} orders</div>
                          <div className="text-sm text-muted-foreground">${customer.totalSpent.toFixed(2)} total</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Customers</CardTitle>
                  <CardDescription>Customers by last purchase date</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topCustomers.topRecent?.slice(0, 5).map((customer: any, index: number) => (
                      <div key={customer.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                            <div className="text-sm text-muted-foreground">{customer.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{customer.daysSinceLastPurchase} days ago</div>
                          <div className="text-sm text-muted-foreground">${customer.totalSpent.toFixed(2)} total</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Loyalty Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Loyalty</CardTitle>
                  <CardDescription>Distribution by customer value</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-purple-500">VIP</Badge>
                        <span>High Value + Frequent</span>
                      </div>
                      <span className="font-bold">
                        {customers.filter((c: any) => c.isHighValueCustomer && c.isFrequentCustomer).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-500">High Value</Badge>
                        <span>$500+ spent</span>
                      </div>
                      <span className="font-bold">
                        {customers.filter((c: any) => c.isHighValueCustomer).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-blue-500">Frequent</Badge>
                        <span>3+ transactions</span>
                      </div>
                      <span className="font-bold">
                        {customers.filter((c: any) => c.isFrequentCustomer).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">Repeat</Badge>
                        <span>2+ transactions</span>
                      </div>
                      <span className="font-bold">
                        {customers.filter((c: any) => c.isRepeatCustomer).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedTab === 'customers' && (
            <Card>
              <CardHeader>
                <CardTitle>Customer List</CardTitle>
                <CardDescription>
                  Showing {customers.length} customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {customers.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">No customers found</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4 font-medium">Customer</th>
                          <th className="text-left py-2 px-4 font-medium">Loyalty</th>
                          <th className="text-right py-2 px-4 font-medium">Total Spent</th>
                          <th className="text-right py-2 px-4 font-medium">Transactions</th>
                          <th className="text-right py-2 px-4 font-medium">Avg Order</th>
                          <th className="text-right py-2 px-4 font-medium">Last Purchase</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((customer: any) => (
                          <tr key={customer.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium">
                                  {customer.firstName} {customer.lastName}
                                </div>
                                {customer.email && (
                                  <div className="text-sm text-muted-foreground">
                                    {customer.email}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {getLoyaltyBadge(customer)}
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              ${customer.totalSpent.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {customer.totalTransactions}
                            </td>
                            <td className="py-3 px-4 text-right">
                              ${customer.averageTransactionValue.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {customer.daysSinceLastPurchase} days ago
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedTab === 'insights' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Insurance Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Insurance Usage</CardTitle>
                  <CardDescription>Customer behavior by insurance carrier</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(insights.insuranceAnalysis || {}).map(([carrier, data]: [string, any]) => (
                      <div key={carrier} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{carrier}</h4>
                          <Badge variant="outline">{data.customers} customers</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Transactions:</span>
                            <span className="ml-2 font-medium">{data.transactions}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Savings:</span>
                            <span className="ml-2 font-medium">${data.totalSavings.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Category Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Preferences</CardTitle>
                  <CardDescription>Popular product categories among customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(insights.categoryAnalysis || {})
                      .sort(([,a]: [string, any], [,b]: [string, any]) => b.revenue - a.revenue)
                      .map(([category, data]: [string, any]) => (
                      <div key={category} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{category}</h4>
                          <Badge variant="outline">{data.customers} customers</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Items Sold:</span>
                            <span className="ml-2 font-medium">{data.items}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Revenue:</span>
                            <span className="ml-2 font-medium">${data.revenue.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}