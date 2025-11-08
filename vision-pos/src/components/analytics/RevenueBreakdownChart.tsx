'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  Download,
  Filter,
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  Package
} from 'lucide-react';



interface RevenueBreakdownChartProps {
  data: {
    monthlyRevenue: Array<{
      month: string;
      totalRevenue: number;
      completedSales: number;
      averageSaleValue: number;
      productRevenue: Array<{
        category: string;
        revenue: number;
        percentage: string;
      }>;
      staffRevenue: Array<{
        staffName: string;
        revenue: number;
        salesCount: number;
        averageSale: number;
      }>;
      customerSegments: Array<{
        segment: string;
        revenue: number;
        count: number;
        percentage: string;
      }>;
    }>;
    yearToDate: {
      totalRevenue: number;
      growth: string;
      topPerformingMonth: string;
      topProducts: Array<{
        name: string;
        revenue: number;
        units: number;
      }>;
    };
  };
  period: string;
  loading?: boolean;
}

// Color palettes for charts
const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6b7280'
];

const SEGMENT_COLORS = {
  'Residential': '#3b82f6',
  'Commercial': '#10b981', 
  'Industrial': '#f59e0b',
  'Institutional': '#8b5cf6',
  'Other': '#6b7280'
};

export default function RevenueBreakdownChart({ data, period, loading = false }: RevenueBreakdownChartProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState<string>(data.monthlyRevenue[data.monthlyRevenue.length - 1]?.month || '');

  // Get current month data for detailed breakdown
  const currentMonthData = data.monthlyRevenue.find(m => m.month === selectedMonth) || data.monthlyRevenue[data.monthlyRevenue.length - 1];

  // Format currency
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;



  // Export functionality
  const handleExport = (type: 'csv' | 'png' | 'pdf') => {
    // In a real implementation, this would trigger actual export
    console.log(`Exporting ${activeTab} data as ${type}`);
    // You could use libraries like jsPDF, html2canvas, or csv-writer here
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Revenue Breakdown Analysis
              </CardTitle>
              <CardDescription>
                Comprehensive revenue analysis for {period}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('png')}>
                <Download className="h-4 w-4 mr-2" />
                PNG
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Year-to-Date Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-4">
            <div className="text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(data.yearToDate.totalRevenue)}
              </p>
              <p className="text-sm text-green-600">YTD Revenue</p>
              <Badge variant="secondary" className="mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                {data.yearToDate.growth}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-lg font-bold text-gray-900">
                {data.yearToDate.topPerformingMonth}
              </p>
              <p className="text-sm text-gray-600">Best Month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Package className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-lg font-bold text-gray-900">
                {data.yearToDate.topProducts[0]?.name || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">Top Product</p>
              <p className="text-xs text-purple-600 mt-1">
                {formatCurrency(data.yearToDate.topProducts[0]?.revenue || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-lg font-bold text-gray-900">
                {data.monthlyRevenue.length}
              </p>
              <p className="text-sm text-gray-600">Months Tracked</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="monthly">Monthly Trends</TabsTrigger>
              <TabsTrigger value="products">By Product</TabsTrigger>
              <TabsTrigger value="staff">By Staff</TabsTrigger>
              <TabsTrigger value="customers">Customer Segments</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Revenue Trend */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Monthly Revenue Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="totalRevenue" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Current Month Product Mix */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Product Revenue Mix - {selectedMonth}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={currentMonthData?.productRevenue || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percentage }) => `${category}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {(currentMonthData?.productRevenue || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* Monthly Trends Tab */}
            <TabsContent value="monthly" className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Monthly Performance Analysis</h3>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <select 
                    className="px-3 py-1 border rounded-md"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {data.monthlyRevenue.map(month => (
                      <option key={month.month} value={month.month}>
                        {month.month}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalRevenue" fill="#3b82f6" name="Total Revenue" />
                  <Bar dataKey="averageSaleValue" fill="#10b981" name="Avg Sale Value" />
                </BarChart>
              </ResponsiveContainer>

              {/* Monthly Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card className="bg-blue-50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-blue-600">Selected Month Revenue</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(currentMonthData?.totalRevenue || 0)}
                    </p>
                    <p className="text-xs text-blue-600">
                      {currentMonthData?.completedSales || 0} completed sales
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-green-50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-green-600">Average Sale Value</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(currentMonthData?.averageSaleValue || 0)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-purple-600">Sales Volume</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {currentMonthData?.completedSales || 0}
                    </p>
                    <p className="text-xs text-purple-600">Completed this month</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              <h3 className="text-lg font-semibold">Revenue by Product Category</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart 
                    data={currentMonthData?.productRevenue || []} 
                    layout="horizontal"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis dataKey="category" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  <h4 className="font-semibold">Product Performance Details</h4>
                  {(currentMonthData?.productRevenue || []).map((product, index) => (
                    <Card key={product.category} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium">{product.category}</h5>
                          <p className="text-sm text-gray-600">
                            {product.percentage}% of total revenue
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {formatCurrency(product.revenue)}
                          </p>
                          <Badge 
                            variant="secondary"
                            style={{ backgroundColor: COLORS[index % COLORS.length] + '20' }}
                          >
                            Rank #{index + 1}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Staff Tab */}
            <TabsContent value="staff" className="space-y-6">
              <h3 className="text-lg font-semibold">Revenue by Staff Member</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={currentMonthData?.staffRevenue || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="staffName" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  <h4 className="font-semibold">Staff Leaderboard</h4>
                  {(currentMonthData?.staffRevenue || [])
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((staff, index) => (
                      <Card key={staff.staffName} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl font-bold text-gray-400">
                              #{index + 1}
                            </div>
                            <div>
                              <h5 className="font-medium">{staff.staffName}</h5>
                              <p className="text-sm text-gray-600">
                                {staff.salesCount} sales • Avg: {formatCurrency(staff.averageSale)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              {formatCurrency(staff.revenue)}
                            </p>
                            <Badge variant={index === 0 ? "default" : "secondary"}>
                              {index === 0 ? "Top Performer" : "Contributor"}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            </TabsContent>

            {/* Customer Segments Tab */}
            <TabsContent value="customers" className="space-y-6">
              <h3 className="text-lg font-semibold">Revenue by Customer Segment</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={currentMonthData?.customerSegments || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="revenue"
                    >
                      {(currentMonthData?.customerSegments || []).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={SEGMENT_COLORS[entry.segment as keyof typeof SEGMENT_COLORS] || COLORS[index]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  <h4 className="font-semibold">Segment Analysis</h4>
                  {(currentMonthData?.customerSegments || []).map((segment) => (
                    <Card key={segment.segment} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ 
                                backgroundColor: SEGMENT_COLORS[segment.segment as keyof typeof SEGMENT_COLORS] || '#6b7280' 
                              }}
                            />
                            {segment.segment}
                          </h5>
                          <p className="text-sm text-gray-600">
                            {segment.count} customers • {segment.percentage}% of total
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {formatCurrency(segment.revenue)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(segment.revenue / segment.count)} avg/customer
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}