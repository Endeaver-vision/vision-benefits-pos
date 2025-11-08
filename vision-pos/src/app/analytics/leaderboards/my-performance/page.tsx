'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Trophy,
  Star,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Users,
  Calendar,
  Award,
  Zap,
  Eye,
  CheckCircle2,
  BarChart3,
  ArrowLeft,
  Crown
} from 'lucide-react';
import Link from 'next/link';

// Mock performance data
const mockPerformanceData = {
  personal: {
    id: '1',
    name: 'Sarah Johnson',
    rank: 1,
    avatar: 'SJ',
    salesCount: 42,
    revenue: 125000,
    conversionRate: 78.5,
    captureRate: 85.2,
    achievements: ['top-seller', 'conversion-master', 'revenue-leader'],
    goals: {
      salesTarget: 45,
      revenueTarget: 130000,
      conversionTarget: 80.0,
      captureTarget: 88.0
    },
    trends: {
      daily: [
        { date: '2024-11-01', sales: 2, revenue: 5200, leads: 8 },
        { date: '2024-11-02', sales: 1, revenue: 2800, leads: 6 },
        { date: '2024-11-03', sales: 3, revenue: 8900, leads: 10 },
        { date: '2024-11-04', sales: 2, revenue: 6100, leads: 7 },
        { date: '2024-11-05', sales: 4, revenue: 12300, leads: 12 },
        { date: '2024-11-06', sales: 2, revenue: 4900, leads: 8 },
      ],
      weekly: [
        { week: 'Week 1', sales: 8, revenue: 23800, conversion: 72.5, capture: 81.2 },
        { week: 'Week 2', sales: 10, revenue: 28400, conversion: 75.1, capture: 83.5 },
        { week: 'Week 3', sales: 12, revenue: 34200, conversion: 78.2, capture: 85.8 },
        { week: 'Week 4', sales: 12, revenue: 38600, conversion: 79.1, capture: 86.1 },
      ],
      monthly: [
        { month: 'Aug', sales: 35, revenue: 98000, conversion: 72.1, capture: 79.5 },
        { month: 'Sep', sales: 38, revenue: 112000, conversion: 75.8, capture: 82.1 },
        { month: 'Oct', sales: 41, revenue: 118000, conversion: 77.2, capture: 84.3 },
        { month: 'Nov', sales: 42, revenue: 125000, conversion: 78.5, capture: 85.2 },
      ]
    },
    breakdown: {
      byProduct: [
        { name: 'Premium Package', sales: 18, revenue: 54000, percentage: 43.2 },
        { name: 'Standard Package', sales: 15, revenue: 37500, percentage: 30.0 },
        { name: 'Basic Package', sales: 9, revenue: 18000, percentage: 14.4 },
        { name: 'Add-ons', sales: 0, revenue: 15500, percentage: 12.4 },
      ],
      byStage: [
        { stage: 'Initial Contact', count: 156, percentage: 100 },
        { stage: 'Quote Generated', count: 132, percentage: 84.6 },
        { stage: 'Quote Presented', count: 98, percentage: 62.8 },
        { stage: 'Quote Signed', count: 54, percentage: 34.6 },
        { stage: 'Sale Completed', count: 42, percentage: 26.9 },
      ]
    }
  },
  comparison: {
    teamAverage: {
      salesCount: 32,
      revenue: 89000,
      conversionRate: 68.2,
      captureRate: 76.8
    },
    companyAverage: {
      salesCount: 28,
      revenue: 78000,
      conversionRate: 65.1,
      captureRate: 73.5
    },
    topPerformer: {
      salesCount: 45,
      revenue: 142000,
      conversionRate: 82.1,
      captureRate: 89.5
    }
  }
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function MyPerformancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [activeTab, setActiveTab] = useState('overview');

  const { personal, comparison } = mockPerformanceData;
  
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;



  const getComparisonIcon = (current: number, comparison: number) => {
    if (current > comparison) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < comparison) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4 rounded-full bg-gray-300"></div>;
  };

  const getAchievementBadge = (achievement: string) => {
    const badges = {
      'top-seller': { icon: <Trophy className="h-4 w-4" />, label: 'Top Seller', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      'conversion-master': { icon: <Target className="h-4 w-4" />, label: 'Conversion Master', color: 'bg-green-100 text-green-800 border-green-300' },
      'revenue-leader': { icon: <DollarSign className="h-4 w-4" />, label: 'Revenue Leader', color: 'bg-blue-100 text-blue-800 border-blue-300' },
      'consistent-performer': { icon: <Star className="h-4 w-4" />, label: 'Consistent Performer', color: 'bg-purple-100 text-purple-800 border-purple-300' },
      'team-player': { icon: <Users className="h-4 w-4" />, label: 'Team Player', color: 'bg-orange-100 text-orange-800 border-orange-300' },
      'newcomer': { icon: <Zap className="h-4 w-4" />, label: 'Rising Star', color: 'bg-pink-100 text-pink-800 border-pink-300' },
    };
    
    const badge = badges[achievement as keyof typeof badges];
    if (!badge) return null;
    
    return (
      <Badge className={`${badge.color} border flex items-center gap-2 text-sm px-3 py-1`}>
        {badge.icon}
        {badge.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/analytics/leaderboards">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leaderboards
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              My Performance Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Track your progress, goals, and achievements
            </p>
          </div>
        </div>
        
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="this-quarter">This Quarter</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Rank Card */}
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Crown className="h-6 w-6 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700">Current Rank</span>
                </div>
                <p className="text-4xl font-bold text-yellow-900">#{personal.rank}</p>
                <p className="text-sm text-yellow-600">Company-wide</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {personal.avatar}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Count */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Sales Count</span>
                </div>
                {getComparisonIcon(personal.salesCount, comparison.teamAverage.salesCount)}
              </div>
              <p className="text-3xl font-bold">{personal.salesCount}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Goal: {personal.goals.salesTarget}</span>
                  <span>{Math.round((personal.salesCount / personal.goals.salesTarget) * 100)}%</span>
                </div>
                <Progress 
                  value={(personal.salesCount / personal.goals.salesTarget) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Revenue</span>
                </div>
                {getComparisonIcon(personal.revenue, comparison.teamAverage.revenue)}
              </div>
              <p className="text-3xl font-bold">{formatCurrency(personal.revenue)}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Goal: {formatCurrency(personal.goals.revenueTarget)}</span>
                  <span>{Math.round((personal.revenue / personal.goals.revenueTarget) * 100)}%</span>
                </div>
                <Progress 
                  value={(personal.revenue / personal.goals.revenueTarget) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Conversion</span>
                </div>
                {getComparisonIcon(personal.conversionRate, comparison.teamAverage.conversionRate)}
              </div>
              <p className="text-3xl font-bold">{formatPercentage(personal.conversionRate)}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Goal: {formatPercentage(personal.goals.conversionTarget)}</span>
                  <span>{Math.round((personal.conversionRate / personal.goals.conversionTarget) * 100)}%</span>
                </div>
                <Progress 
                  value={(personal.conversionRate / personal.goals.conversionTarget) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            Current Achievements
          </CardTitle>
          <CardDescription>
            Badges earned through exceptional performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {personal.achievements.map((achievement) => 
              getAchievementBadge(achievement)
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Performance Trends</TabsTrigger>
          <TabsTrigger value="goals">Goals Progress</TabsTrigger>
          <TabsTrigger value="comparison">Benchmarking</TabsTrigger>
          <TabsTrigger value="breakdown">Detailed Breakdown</TabsTrigger>
        </TabsList>

        {/* Performance Trends Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales Trend</CardTitle>
                <CardDescription>Sales performance over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={personal.trends.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="sales" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={personal.trends.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Progress Overview</CardTitle>
              <CardDescription>Performance metrics across recent weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={personal.trends.weekly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#3b82f6" name="Sales Count" />
                  <Bar dataKey="conversion" fill="#10b981" name="Conversion %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Progress Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  Sales Goal Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600">
                    {personal.salesCount}/{personal.goals.salesTarget}
                  </p>
                  <p className="text-sm text-gray-600">Sales completed</p>
                </div>
                <Progress 
                  value={(personal.salesCount / personal.goals.salesTarget) * 100} 
                  className="h-3"
                />
                <p className="text-center text-sm text-gray-600">
                  {personal.goals.salesTarget - personal.salesCount} more sales to reach goal
                </p>
              </CardContent>
            </Card>

            {/* Revenue Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Revenue Goal Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600">
                    {Math.round((personal.revenue / personal.goals.revenueTarget) * 100)}%
                  </p>
                  <p className="text-sm text-gray-600">of revenue target</p>
                </div>
                <Progress 
                  value={(personal.revenue / personal.goals.revenueTarget) * 100} 
                  className="h-3"
                />
                <p className="text-center text-sm text-gray-600">
                  {formatCurrency(personal.goals.revenueTarget - personal.revenue)} remaining
                </p>
              </CardContent>
            </Card>

            {/* Conversion Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Conversion Rate Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-purple-600">
                    {formatPercentage(personal.conversionRate)}
                  </p>
                  <p className="text-sm text-gray-600">current conversion rate</p>
                </div>
                <Progress 
                  value={(personal.conversionRate / personal.goals.conversionTarget) * 100} 
                  className="h-3"
                />
                <p className="text-center text-sm text-gray-600">
                  Target: {formatPercentage(personal.goals.conversionTarget)}
                </p>
              </CardContent>
            </Card>

            {/* Capture Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-orange-600" />
                  Capture Rate Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-orange-600">
                    {formatPercentage(personal.captureRate)}
                  </p>
                  <p className="text-sm text-gray-600">current capture rate</p>
                </div>
                <Progress 
                  value={(personal.captureRate / personal.goals.captureTarget) * 100} 
                  className="h-3"
                />
                <p className="text-center text-sm text-gray-600">
                  Target: {formatPercentage(personal.goals.captureTarget)}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Benchmarking Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Benchmarking</CardTitle>
              <CardDescription>
                Compare your performance against team and company averages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Sales Comparison */}
                <div className="text-center space-y-3">
                  <h4 className="font-semibold text-gray-900">Sales Count</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <p className="text-2xl font-bold text-blue-600">{personal.salesCount}</p>
                      <p className="text-xs text-blue-600">You</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="font-semibold">{comparison.teamAverage.salesCount}</p>
                      <p className="text-xs text-gray-600">Team Avg</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="font-semibold">{comparison.companyAverage.salesCount}</p>
                      <p className="text-xs text-gray-600">Company Avg</p>
                    </div>
                  </div>
                </div>

                {/* Revenue Comparison */}
                <div className="text-center space-y-3">
                  <h4 className="font-semibold text-gray-900">Revenue</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 rounded-lg border-2 border-green-200">
                      <p className="text-lg font-bold text-green-600">{formatCurrency(personal.revenue)}</p>
                      <p className="text-xs text-green-600">You</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="font-semibold">{formatCurrency(comparison.teamAverage.revenue)}</p>
                      <p className="text-xs text-gray-600">Team Avg</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="font-semibold">{formatCurrency(comparison.companyAverage.revenue)}</p>
                      <p className="text-xs text-gray-600">Company Avg</p>
                    </div>
                  </div>
                </div>

                {/* Conversion Comparison */}
                <div className="text-center space-y-3">
                  <h4 className="font-semibold text-gray-900">Conversion Rate</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                      <p className="text-xl font-bold text-purple-600">{formatPercentage(personal.conversionRate)}</p>
                      <p className="text-xs text-purple-600">You</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="font-semibold">{formatPercentage(comparison.teamAverage.conversionRate)}</p>
                      <p className="text-xs text-gray-600">Team Avg</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="font-semibold">{formatPercentage(comparison.companyAverage.conversionRate)}</p>
                      <p className="text-xs text-gray-600">Company Avg</p>
                    </div>
                  </div>
                </div>

                {/* Capture Comparison */}
                <div className="text-center space-y-3">
                  <h4 className="font-semibold text-gray-900">Capture Rate</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-orange-50 rounded-lg border-2 border-orange-200">
                      <p className="text-xl font-bold text-orange-600">{formatPercentage(personal.captureRate)}</p>
                      <p className="text-xs text-orange-600">You</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="font-semibold">{formatPercentage(comparison.teamAverage.captureRate)}</p>
                      <p className="text-xs text-gray-600">Team Avg</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border">
                      <p className="font-semibold">{formatPercentage(comparison.companyAverage.captureRate)}</p>
                      <p className="text-xs text-gray-600">Company Avg</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Sales by Product Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={personal.breakdown.byProduct}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {personal.breakdown.byProduct.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sales Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Funnel Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {personal.breakdown.byStage.map((stage) => (
                    <div key={stage.stage} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{stage.stage}</span>
                        <span className="text-sm text-gray-600">{stage.count} ({stage.percentage}%)</span>
                      </div>
                      <Progress value={stage.percentage} className="h-3" />
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