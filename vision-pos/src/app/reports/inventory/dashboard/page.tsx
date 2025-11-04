'use client';

// @ts-nocheck
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, TrendingUp, AlertTriangle, DollarSign, Truck, Calendar, BarChart3 } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export default function InventoryDashboard() {
  const [dateRange, setDateRange] = useState('30'); // Default to last 30 days

  // Calculate date range
  const endDate = new Date();
  const startDate = subDays(endDate, parseInt(dateRange));

  // Fetch inventory analytics
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['inventory-dashboard', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: format(startOfDay(startDate), 'yyyy-MM-dd'),
        endDate: format(endOfDay(endDate), 'yyyy-MM-dd'),
        limit: '1000',
      });

      const response = await fetch(`/api/analytics/inventory?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch inventory analytics');
      }
      return response.json().then(data => data.data);
    },
  });

  const summary = dashboardData?.summary || {};
  const topPerformers = dashboardData?.topPerformers || {};
  const categoryAnalysis = dashboardData?.categoryAnalysis || [];
  const supplierAnalysis = dashboardData?.supplierAnalysis || [];

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
          <h1 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h1>
          <p className="text-muted-foreground">
            Inventory insights for the last {dateRange} days
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <a href="/reports/inventory">Detailed Reports</a>
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
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground">
              Inventory SKUs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.totalValue?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Current inventory value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Turnover</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.avgTurnoverRate?.toFixed(2) || '0.00'}x
            </div>
            <p className="text-xs text-muted-foreground">
              Times per period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reorder Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summary.reorderAlerts?.recommended || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.reorderAlerts?.urgent || 0} urgent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Status Overview</CardTitle>
          <CardDescription>Current stock level distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border">
              <div className="text-2xl font-bold text-red-600">
                {summary.stockStatus?.outOfStock || 0}
              </div>
              <div className="text-sm text-red-600">Out of Stock</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border">
              <div className="text-2xl font-bold text-yellow-600">
                {summary.stockStatus?.lowStock || 0}
              </div>
              <div className="text-sm text-yellow-600">Low Stock</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">
                {summary.stockStatus?.normal || 0}
              </div>
              <div className="text-sm text-green-600">Normal Stock</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">
                {summary.stockStatus?.overstock || 0}
              </div>
              <div className="text-sm text-blue-600">Overstock</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Fastest turning inventory items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.fastestTurning?.slice(0, 5).map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-sm text-green-600">{item.product.category.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {item.analytics.turnoverRate.toFixed(2)}x
                    </div>
                    <div className="text-sm text-green-600">
                      {item.analytics.totalSold} sold
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reorder Alerts</CardTitle>
            <CardDescription>Items requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.slowestTurning?.slice(0, 5).map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                    <div>
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-sm text-red-600">
                        {item.availableStock} in stock • {item.reorderPoint} reorder point
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">
                      {item.analytics.turnoverRate.toFixed(2)}x
                    </div>
                    <div className="text-sm text-red-600">Slow moving</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category & Supplier Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Turnover by product category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryAnalysis
                .sort((a, b) => b.avgTurnover - a.avgTurnover)
                .slice(0, 5)
                .map((category) => (
                <div key={category.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">{category.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {category.totalItems} items • {category.totalSold} sold
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{category.avgTurnover.toFixed(2)}x</div>
                    <div className="text-sm text-muted-foreground">
                      ${category.totalValue.toFixed(0)} value
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supplier Performance</CardTitle>
            <CardDescription>Top suppliers by turnover</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {supplierAnalysis
                .sort((a, b) => b.avgTurnover - a.avgTurnover)
                .slice(0, 5)
                .map((supplier) => (
                <div key={supplier.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Truck className="h-6 w-6 text-blue-600" />
                    <div>
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {supplier.totalProducts} products
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{supplier.avgTurnover.toFixed(2)}x</div>
                    <div className="text-sm text-muted-foreground">
                      ${supplier.totalValue.toFixed(0)} value
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
          <CardDescription>Navigate to detailed reports and management tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button className="w-full" asChild>
              <a href="/reports/inventory">Detailed Inventory Reports</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/reports/customers">Customer Analytics</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/reports/transactions">Transaction Reports</a>
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