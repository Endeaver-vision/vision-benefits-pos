'use client';

// @ts-nocheck
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ShoppingCart,
  Package,
  AlertTriangle,
  Target,
  Calendar,
  BarChart3,
  Activity,
  Briefcase,
  Crown,
  CheckCircle,
  XCircle,
  Download,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';

export default function ExecutiveDashboard() {
  const [period, setPeriod] = useState('30'); // Default to last 30 days

  // Fetch executive dashboard data
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['executive-dashboard', period],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      const response = await fetch(`/api/analytics/executive?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch executive dashboard data');
      }
      return response.json().then(data => data.data);
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const handleExport = async (reportType = 'summary') => {
    try {
      const params = new URLSearchParams({ period, type: reportType });
      const response = await fetch(`/api/analytics/executive/export?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `executive-dashboard-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-destructive">
            Error loading executive dashboard. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading executive dashboard...</div>
        </div>
      </div>
    );
  }

  const { 
    keyMetrics, 
    performanceIndicators, 
    categoryPerformance, 
    topCustomers, 
    dailyTrends,
    financialBreakdown,
    operationalMetrics,
    alerts,
    dateRange
  } = dashboardData || {};

  const getGrowthIcon = (trend: string, growth: number) => {
    if (trend === 'up' || growth > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (trend === 'down' || growth < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="flex items-center gap-2"
          >
            <a href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </a>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
            <p className="text-muted-foreground">
              High-level business intelligence and performance metrics
            </p>
            <p className="text-sm text-muted-foreground">
              Period: {dateRange?.start} to {dateRange?.end}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('summary')}>
            <Download className="mr-2 h-4 w-4" />
            Export Summary
          </Button>
          <Button variant="outline" onClick={() => handleExport('detailed')}>
            <Download className="mr-2 h-4 w-4" />
            Export Detailed
          </Button>
          <Button
            variant={period === '7' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('7')}
          >
            7 Days
          </Button>
          <Button
            variant={period === '30' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('30')}
          >
            30 Days
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('month')}
          >
            This Month
          </Button>
          <Button
            variant={period === 'quarter' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('quarter')}
          >
            Quarter
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="grid gap-4">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center p-4 rounded-lg border ${
                alert.type === 'error' ? 'bg-red-50 border-red-200' :
                alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-blue-50 border-blue-200'
              }`}
            >
              {getAlertIcon(alert.type)}
              <div className="ml-3 flex-1">
                <p className="font-medium">{alert.message}</p>
                <p className="text-sm text-muted-foreground">{alert.action}</p>
              </div>
              <Badge variant={alert.priority === 'high' ? 'destructive' : alert.priority === 'medium' ? 'secondary' : 'outline'}>
                {alert.priority} priority
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${keyMetrics?.revenue?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <div className={`flex items-center space-x-1 text-xs ${getGrowthColor(performanceIndicators?.salesGrowth?.growth || 0)}`}>
              {getGrowthIcon(performanceIndicators?.salesGrowth?.trend, performanceIndicators?.salesGrowth?.growth)}
              <span>
                {performanceIndicators?.salesGrowth?.growth > 0 ? '+' : ''}
                {performanceIndicators?.salesGrowth?.growth?.toFixed(1) || '0.0'}% vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics?.transactions || 0}</div>
            <div className={`flex items-center space-x-1 text-xs ${getGrowthColor(performanceIndicators?.transactionVolume?.growth || 0)}`}>
              {getGrowthIcon(performanceIndicators?.transactionVolume?.trend, performanceIndicators?.transactionVolume?.growth)}
              <span>
                {performanceIndicators?.transactionVolume?.growth > 0 ? '+' : ''}
                {performanceIndicators?.transactionVolume?.growth?.toFixed(1) || '0.0'}% vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${keyMetrics?.averageOrderValue?.toFixed(2) || '0.00'}
            </div>
            <div className={`flex items-center space-x-1 text-xs ${getGrowthColor(performanceIndicators?.averageOrderValue?.growth || 0)}`}>
              {getGrowthIcon(performanceIndicators?.averageOrderValue?.trend, performanceIndicators?.averageOrderValue?.growth)}
              <span>
                {performanceIndicators?.averageOrderValue?.growth > 0 ? '+' : ''}
                {performanceIndicators?.averageOrderValue?.growth?.toFixed(1) || '0.0'}% vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Retention</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {keyMetrics?.customerRetentionRate?.toFixed(1) || '0.0'}%
            </div>
            <div className={`flex items-center space-x-1 text-xs ${getGrowthColor(0)}`}>
              {getGrowthIcon(performanceIndicators?.customerRetention?.trend, 0)}
              <span>{keyMetrics?.activeCustomers || 0} active customers</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Revenue by product category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryPerformance?.slice(0, 5).map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {category.quantity} items • {category.transactions} orders
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${category.revenue.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          ${category.averageOrderValue.toFixed(2)} avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue Trend</CardTitle>
                <CardDescription>Last 30 days performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dailyTrends?.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between p-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{day.dayName}</span>
                        <span className="text-muted-foreground">{format(new Date(day.date), 'MMM d')}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-green-600 font-medium">
                          ${day.revenue.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground">
                          {day.transactions} orders
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Insurance vs patient payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-8 w-8 text-green-600" />
                      <div>
                        <div className="font-semibold text-green-800">Total Revenue</div>
                        <div className="text-sm text-green-600">All sources</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-800">
                      ${financialBreakdown?.totalRevenue?.toFixed(2) || '0.00'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Briefcase className="h-8 w-8 text-blue-600" />
                      <div>
                        <div className="font-semibold text-blue-800">Insurance Revenue</div>
                        <div className="text-sm text-blue-600">Insurance payments</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-800">
                      ${financialBreakdown?.insuranceRevenue?.toFixed(2) || '0.00'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-purple-600" />
                      <div>
                        <div className="font-semibold text-purple-800">Patient Revenue</div>
                        <div className="text-sm text-purple-600">Direct payments</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-purple-800">
                      ${financialBreakdown?.patientRevenue?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Financial Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Metrics</CardTitle>
                <CardDescription>Key financial indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{keyMetrics?.transactions || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Orders</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      ${financialBreakdown?.averageInsuranceDiscount?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Insurance Discount</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      ${keyMetrics?.inventoryValue?.toFixed(0) || '0'}
                    </div>
                    <div className="text-sm text-muted-foreground">Inventory Value</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {keyMetrics?.inventoryTurnover?.toFixed(2) || '0.00'}x
                    </div>
                    <div className="text-sm text-muted-foreground">Inventory Turnover</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inventory Status */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Status</CardTitle>
                <CardDescription>Current inventory metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Items</span>
                    <span className="font-bold">{operationalMetrics?.totalInventoryItems || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Low Stock Items</span>
                    <span className="font-bold text-orange-600">{keyMetrics?.lowStockItems || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending Orders</span>
                    <span className="font-bold text-blue-600">{keyMetrics?.pendingOrders || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Suppliers</span>
                    <span className="font-bold">{operationalMetrics?.totalSuppliers || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Operational efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg Inventory Turnover</span>
                    <span className="font-bold">{operationalMetrics?.averageInventoryTurnover?.toFixed(2) || '0.00'}x</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Customer Retention</span>
                    <span className="font-bold">{keyMetrics?.customerRetentionRate?.toFixed(1) || '0.0'}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Avg Order Value</span>
                    <span className="font-bold">${keyMetrics?.averageOrderValue?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Navigate to detailed views</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href="/reports/inventory">
                      <Package className="mr-2 h-4 w-4" />
                      Inventory Reports
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href="/reports/customers">
                      <Users className="mr-2 h-4 w-4" />
                      Customer Analytics
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href="/analytics">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Sales Analytics
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Highest value customers this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCustomers?.slice(0, 5).map((customer, index) => (
                    <div key={customer.customer.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {customer.customer.firstName} {customer.customer.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {customer.transactionCount} orders
                          </div>
                        </div>
                        {index === 0 && <Crown className="h-4 w-4 text-yellow-500" />}
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${customer.totalSpent.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          Last: {format(new Date(customer.lastPurchase), 'MMM d')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Metrics</CardTitle>
                <CardDescription>Customer engagement statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">
                      {keyMetrics?.totalCustomers || 0}
                    </div>
                    <div className="text-sm text-blue-600">Total Customers</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">
                      {keyMetrics?.activeCustomers || 0}
                    </div>
                    <div className="text-sm text-green-600">Active Customers</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg border">
                    <div className="text-2xl font-bold text-purple-600">
                      {keyMetrics?.customerRetentionRate?.toFixed(1) || '0.0'}%
                    </div>
                    <div className="text-sm text-purple-600">Retention Rate</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg border">
                    <div className="text-2xl font-bold text-orange-600">
                      ${keyMetrics?.averageOrderValue?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-orange-600">Avg Order Value</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}