'use client';

// @ts-nocheck
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign,
  Filter,
  Download,
  RotateCcw,
  Truck,
  Calendar,
  BarChart3
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface InventoryAnalyticsFilters {
  startDate: string;
  endDate: string;
  locationId?: string;
  categoryId?: string;
  supplierId?: string;
  lowStock?: boolean;
}

export default function InventoryAnalytics() {
  const [filters, setFilters] = useState<InventoryAnalyticsFilters>({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    lowStock: false
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch inventory analytics
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['inventory-analytics', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/analytics/inventory?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch inventory analytics');
      }
      return response.json().then(data => data.data);
    },
  });

  const handleFilterChange = (key: keyof InventoryAnalyticsFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/analytics/inventory/export?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `inventory-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const resetFilters = () => {
    setFilters({
      startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      lowStock: false
    });
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-destructive">
            Error loading inventory analytics. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading inventory analytics...</div>
        </div>
      </div>
    );
  }

  const { inventory, summary, topPerformers, categoryAnalysis, supplierAnalysis, recentActivity } = analyticsData || {};

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return <Badge variant="destructive">Out of Stock</Badge>;
      case 'LOW_STOCK':
        return <Badge variant="secondary">Low Stock</Badge>;
      case 'OVERSTOCK':
        return <Badge variant="outline">Overstock</Badge>;
      default:
        return <Badge variant="default">Normal</Badge>;
    }
  };

  const getTurnoverColor = (rate: number) => {
    if (rate >= 2) return 'text-green-600';
    if (rate >= 1) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Analytics</h1>
          <p className="text-muted-foreground">
            Inventory turnover, reorder optimization, and supplier performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <a href="/reports/inventory/dashboard">Inventory Dashboard</a>
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          <Button variant="outline" onClick={resetFilters}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter inventory analytics by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select onValueChange={(value) => handleFilterChange('categoryId', value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="frames">Frames</SelectItem>
                    <SelectItem value="lenses">Lenses</SelectItem>
                    <SelectItem value="coatings">Coatings</SelectItem>
                    <SelectItem value="contacts">Contacts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Select onValueChange={(value) => handleFilterChange('locationId', value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    <SelectItem value="downtown">Downtown</SelectItem>
                    <SelectItem value="westside">Westside</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Status</label>
                <Select onValueChange={(value) => handleFilterChange('lowStock', value === 'true')}>
                  <SelectTrigger>
                    <SelectValue placeholder="All stock levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stock levels</SelectItem>
                    <SelectItem value="true">Low stock only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalItems || 0}</div>
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
              ${summary?.totalValue?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
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
              {summary?.avgTurnoverRate?.toFixed(2) || '0.00'}x
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
              {summary?.reorderAlerts?.recommended || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.reorderAlerts?.urgent || 0} urgent
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
                {summary?.stockStatus?.outOfStock || 0}
              </div>
              <div className="text-sm text-red-600">Out of Stock</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border">
              <div className="text-2xl font-bold text-yellow-600">
                {summary?.stockStatus?.lowStock || 0}
              </div>
              <div className="text-sm text-yellow-600">Low Stock</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">
                {summary?.stockStatus?.normal || 0}
              </div>
              <div className="text-sm text-green-600">Normal Stock</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">
                {summary?.stockStatus?.overstock || 0}
              </div>
              <div className="text-sm text-blue-600">Overstock</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory List</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>Detailed inventory with turnover analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventory?.slice(0, 20).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-semibold">{item.product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.product.category.name} • {item.location.name}
                          </div>
                        </div>
                        {getStockStatusBadge(item.analytics.stockStatus)}
                        {item.analytics.urgentReorder && (
                          <Badge variant="destructive">Urgent Reorder</Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-8 text-center">
                      <div>
                        <div className="text-sm text-muted-foreground">Stock</div>
                        <div className="font-semibold">{item.availableStock}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Turnover</div>
                        <div className={`font-semibold ${getTurnoverColor(item.analytics.turnoverRate)}`}>
                          {item.analytics.turnoverRate.toFixed(2)}x
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Days Left</div>
                        <div className="font-semibold">
                          {item.analytics.daysOfInventory === 999 ? '∞' : Math.floor(item.analytics.daysOfInventory)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Value</div>
                        <div className="font-semibold">
                          ${item.analytics.currentValue.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Fastest turning inventory items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers?.fastestTurning?.slice(0, 5).map((item: any, index: number) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-sm text-muted-foreground">{item.product.category.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {item.analytics.turnoverRate.toFixed(2)}x
                        </div>
                        <div className="text-sm text-muted-foreground">
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
                <CardTitle>Slow Movers</CardTitle>
                <CardDescription>Items with low turnover rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers?.slowestTurning?.slice(0, 5).map((item: any, index: number) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-sm text-muted-foreground">{item.product.category.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600">
                          {item.analytics.turnoverRate.toFixed(2)}x
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.analytics.totalSold} sold
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance</CardTitle>
              <CardDescription>Supplier analysis and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplierAnalysis?.map((supplier: any) => (
                  <div key={supplier.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Truck className="h-8 w-8 text-blue-600" />
                      <div>
                        <div className="font-semibold">{supplier.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {supplier.totalProducts} products • {supplier.leadTime} days lead time
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-8 text-center">
                      <div>
                        <div className="text-sm text-muted-foreground">Avg Turnover</div>
                        <div className="font-semibold">{supplier.avgTurnover.toFixed(2)}x</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Total Value</div>
                        <div className="font-semibold">${supplier.totalValue.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Need Reorder</div>
                        <div className="font-semibold text-orange-600">{supplier.productsNeedingReorder}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Analysis</CardTitle>
                <CardDescription>Performance by product category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryAnalysis?.slice(0, 5).map((category: any) => (
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
                          ${category.totalValue.toFixed(2)} value
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest inventory movements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity?.slice(0, 10).map((activity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{activity.productName}</span>
                          <span className="text-muted-foreground"> • {activity.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={activity.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                          {activity.quantity > 0 ? '+' : ''}{activity.quantity}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(activity.createdAt), 'MMM d')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}