'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Target, 
  Activity,
  Download,
  RefreshCw,
  Eye,
  Calendar,
  MapPin,
  Filter
} from 'lucide-react';

// Import our dashboard components (will create these next)
import KPICards from '@/components/analytics/KPICards';
import CaptureRateVisualizations from '@/components/analytics/CaptureRateVisualizations';
import RevenueBreakdownChart from '@/components/analytics/RevenueBreakdownChart';
import StaffPerformanceLeaderboard from '@/components/analytics/StaffPerformanceLeaderboard';
import TrendAnalysisChart from '@/components/analytics/TrendAnalysisChart';
import RecentActivityFeed from '@/components/analytics/RecentActivityFeed';

interface DashboardData {
  summary: {
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
  trends: Array<{
    analytics_date?: string;
    month_year?: string;
    total_quotes: number;
    quotes_completed: number;
    revenue_completed: number;
    completion_rate: number;
    avg_sale_value: number;
  }>;
  categories: {
    secondPair: {
      count: number;
      totalDiscount: number;
    };
    patientOwnedFrame: {
      count: number;
      totalFees: number;
    };
    paymentTypes: Array<{
      payment_type: string;
      quote_count: number;
      total_revenue: number;
      avg_value: number;
    }>;
  };
  topPerformers: Array<{
    staff_name: string;
    role: string;
    total_quotes: number;
    completed_sales: number;
    total_revenue: number;
    completion_rate: number;
  }>;
  conversionFunnel: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string;
    timestamp: string;
    user: string;
    location: string;
    details: string;
  }>;
}

interface CaptureRateData {
  summary: {
    totalProspects: number;
    quotesPresented: number;
    quotesSigned: number;
    completedSales: number;
    overallCaptureRate: number;
    presentationRate: number;
    signatureRate: number;
    completionRate: number;
  };
  conversionFunnel: Array<{
    stage: string;
    count: number;
    percentage: number;
    dropoffCount: number;
    dropoffRate: number;
  }>;
}

export default function AnalyticsDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [captureRateData, setCaptureRateData] = useState<CaptureRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [dateRange, setDateRange] = useState<{from: Date; to: Date} | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('daily');
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', dateRange.from.toISOString().split('T')[0]);
      if (dateRange?.to) params.append('endDate', dateRange.to.toISOString().split('T')[0]);
      if (selectedLocation !== 'all') params.append('locationId', selectedLocation);
      params.append('period', selectedPeriod);

      const [dashboardResponse, captureRateResponse] = await Promise.all([
        fetch(`/api/analytics/dashboard?${params.toString()}`),
        fetch(`/api/analytics/capture-rates?${params.toString()}`)
      ]);

      if (!dashboardResponse.ok || !captureRateResponse.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const dashboardResult = await dashboardResponse.json();
      const captureRateResult = await captureRateResponse.json();

      setDashboardData(dashboardResult);
      setCaptureRateData(captureRateResult);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, selectedLocation, selectedPeriod]);

  // Export functionality
  const exportData = async (format: 'csv' | 'pdf') => {
    try {
      // Implementation would go here - for now just show a message
      alert(`Exporting dashboard data as ${format.toUpperCase()}...`);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading Analytics Dashboard...</p>
          <p className="text-muted-foreground">Calculating performance metrics</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <Activity className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Analytics Unavailable</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchDashboardData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive business performance insights and metrics
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={fetchDashboardData} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          
          <Select value="csv" onValueChange={(value) => exportData(value as 'csv' | 'pdf')}>
            <SelectTrigger className="w-32">
              <Download className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">Export CSV</SelectItem>
              <SelectItem value="pdf">Export PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters & Time Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <DatePickerWithRange 
                date={dateRange} 
                setDate={setDateRange}
                className="w-full"
              />
            </div>
            
            <div className="w-full lg:w-48">
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {/* Add actual locations here */}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full lg:w-48">
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales Performance</TabsTrigger>
          <TabsTrigger value="staff">Staff Analytics</TabsTrigger>
          <TabsTrigger value="customers">Customer Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          {dashboardData && (
            <KPICards 
              data={dashboardData.summary}
              statusBreakdown={dashboardData.statusBreakdown}
              loading={refreshing}
            />
          )}

          {/* Capture Rate Visualizations */}
          {captureRateData && (
            <CaptureRateVisualizations 
              data={captureRateData}
              loading={refreshing}
            />
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Breakdown */}
            {dashboardData && (
              <RevenueBreakdownChart 
                statusBreakdown={dashboardData.statusBreakdown}
                categories={dashboardData.categories}
                loading={refreshing}
              />
            )}

            {/* Trend Analysis */}
            {dashboardData && (
              <TrendAnalysisChart 
                trends={dashboardData.trends}
                period={selectedPeriod}
                loading={refreshing}
              />
            )}
          </div>
        </TabsContent>

        {/* Sales Performance Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversion Funnel */}
            {captureRateData && (
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Conversion Funnel</CardTitle>
                    <CardDescription>
                      Track prospects through the complete sales process
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {captureRateData.conversionFunnel.map((stage, index) => (
                        <div key={stage.stage} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-blue-100 text-blue-700' :
                              index === 1 ? 'bg-yellow-100 text-yellow-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{stage.stage}</p>
                              <p className="text-sm text-muted-foreground">
                                {stage.count} prospects ({stage.percentage.toFixed(1)}%)
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`w-20 h-2 rounded-full bg-gray-200 overflow-hidden`}>
                              <div 
                                className={`h-full ${
                                  index === 0 ? 'bg-blue-500' :
                                  index === 1 ? 'bg-yellow-500' :
                                  index === 2 ? 'bg-orange-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${stage.percentage}%` }}
                              />
                            </div>
                            {stage.dropoffCount > 0 && (
                              <p className="text-xs text-red-600 mt-1">
                                -{stage.dropoffCount} lost ({stage.dropoffRate.toFixed(1)}%)
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Stats */}
            <div className="space-y-4">
              {dashboardData && (
                <>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold">{dashboardData.summary.conversionRate}%</p>
                          <p className="text-muted-foreground">Overall Conversion Rate</p>
                        </div>
                        <Target className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold">${dashboardData.summary.averageSaleValue.toFixed(2)}</p>
                          <p className="text-muted-foreground">Average Sale Value</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold">{dashboardData.summary.activeStaff}</p>
                          <p className="text-muted-foreground">Active Staff</p>
                        </div>
                        <Users className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Staff Analytics Tab */}
        <TabsContent value="staff" className="space-y-6">
          {dashboardData && (
            <StaffPerformanceLeaderboard 
              topPerformers={dashboardData.topPerformers}
              loading={refreshing}
            />
          )}
        </TabsContent>

        {/* Customer Insights Tab */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Unique Customers</span>
                      <span className="font-bold">{dashboardData.summary.uniqueCustomers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Repeat Customers</span>
                      <span className="font-bold">{dashboardData.categories.secondPair.count}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            {dashboardData && (
              <RecentActivityFeed 
                activities={dashboardData.recentActivity}
                loading={refreshing}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}