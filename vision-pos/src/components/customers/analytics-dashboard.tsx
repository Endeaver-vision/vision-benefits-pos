'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, Users, DollarSign, Target, BarChart } from 'lucide-react'

interface AnalyticsOverview {
  totalCustomers: number
  activeCustomers: number
  newCustomersThisPeriod: number
  highValueCustomers: number
  frequentCustomers: number
  customerRetentionRate: string
  averageOrderValue: number
  totalRevenue: number
  totalTransactions: number
}

interface TopCustomer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  insuranceCarrier: string | null
  city: string | null
  state: string | null
  totalSpent: number
}

interface RecentActivity {
  id: string
  firstName: string
  lastName: string
  email: string | null
  updatedAt: string
  createdAt: string
}

interface CustomerSegmentation {
  recentlyActive: number
  atRisk: number
  dormant: number
  byInsuranceCarrier: Array<{
    carrier: string
    count: number
    percentage: string
  }>
  byLocation: Array<{
    city: string
    count: number
    percentage: string
  }>
}

interface GrowthPeriod {
  period: string
  newCustomers: number
  revenue: number
}

interface GrowthAnalysis {
  periods: GrowthPeriod[]
  trends: {
    customerGrowthRate: string
    averageCustomerValue: number
    totalCustomerValue: number
  }
}

interface AnalyticsData {
  overview: AnalyticsOverview
  topCustomers: TopCustomer[]
  recentActivity: RecentActivity[]
  timeframe: string
  segmentation?: CustomerSegmentation
  growth?: GrowthAnalysis
}

export default function CustomerAnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('30')
  const [includeSegmentation, setIncludeSegmentation] = useState(true)
  const [includeGrowth, setIncludeGrowth] = useState(true)

  const fetchAnalytics = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        timeframe,
        segmentation: includeSegmentation.toString(),
        growth: includeGrowth.toString()
      })
      
      const response = await fetch(`/api/customers/dashboard?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setAnalyticsData(data.data)
      } else {
        console.error('Analytics error:', data.error)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [timeframe, includeSegmentation, includeGrowth])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Failed to load analytics data
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customer Analytics</h1>
          <p className="text-gray-600">Comprehensive customer insights and business intelligence</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.overview.activeCustomers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.newCustomersThisPeriod}</div>
            <p className="text-xs text-muted-foreground">
              Last {analyticsData.timeframe}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.overview.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.overview.totalTransactions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.overview.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.overview.customerRetentionRate}% retention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Segments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">High Value Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analyticsData.overview.highValueCustomers}
            </div>
            <p className="text-sm text-gray-600">Customers with $500+ spent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Frequent Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {analyticsData.overview.frequentCustomers}
            </div>
            <p className="text-sm text-gray-600">Customers with 3+ visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Retention Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {analyticsData.overview.customerRetentionRate}%
            </div>
            <p className="text-sm text-gray-600">Customer retention rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">Top Customers</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          {analyticsData.segmentation && (
            <TabsTrigger value="segmentation">Segmentation</TabsTrigger>
          )}
          {analyticsData.growth && (
            <TabsTrigger value="growth">Growth Analysis</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers by Revenue</CardTitle>
              <CardDescription>Highest spending customers in selected timeframe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topCustomers.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {customer.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {customer.city}, {customer.state} • {customer.insuranceCarrier || 'No insurance'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {formatCurrency(customer.totalSpent)}
                      </div>
                      <Badge variant="secondary">High Value</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Customer Activity</CardTitle>
              <CardDescription>Most recently updated customer records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.recentActivity.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-sm text-gray-600">
                          {customer.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Updated: {formatDate(customer.updatedAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Joined: {formatDate(customer.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {analyticsData.segmentation && (
          <TabsContent value="segmentation" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Lifecycle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Recently Active</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {analyticsData.segmentation.recentlyActive}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>At Risk</span>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      {analyticsData.segmentation.atRisk}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Dormant</span>
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      {analyticsData.segmentation.dormant}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Insurance Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analyticsData.segmentation.byInsuranceCarrier.slice(0, 5).map((carrier) => (
                    <div key={carrier.carrier} className="flex justify-between items-center">
                      <span className="text-sm">{carrier.carrier}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{carrier.count}</span>
                        <Badge variant="outline" className="text-xs">
                          {carrier.percentage}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {analyticsData.growth && (
          <TabsContent value="growth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Growth Trends</CardTitle>
                <CardDescription>Customer acquisition and revenue growth over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.growth.periods.map((period) => (
                    <div key={period.period} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <BarChart className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">{period.period}</span>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="text-sm font-medium">New Customers</div>
                          <div className="text-lg font-bold text-blue-600">{period.newCustomers}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">Revenue</div>
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(period.revenue)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}