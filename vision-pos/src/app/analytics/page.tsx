'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  TrendingUp,
  DollarSign,
  Download,
  ShoppingCart,
  Loader2,
  Package,
  Calendar
} from 'lucide-react'
import PageLayout from '@/components/layout/page-layout'

interface SalesData {
  period: string
  dateRange: { start: string; end: string }
  metrics: {
    totalRevenue: number
    totalTransactions: number
    totalOrders: number
    averageOrderValue: number
    totalItemsSold: number
    uniqueCustomers: number
    totalDiscount: number
    totalInsuranceBilled: number
    totalTax: number
  }
  comparison?: {
    totalRevenue: number
    totalTransactions: number
    totalOrders: number
    averageOrderValue: number
    uniqueCustomers: number
  } | null
  growth?: {
    revenue: number
    transactions: number
    orders: number
    averageOrderValue: number
    customers: number
  } | null
  ordersByStatus: Array<{ status: string; count: number; revenue: number }>
  topProducts: Array<{
    name: string
    productType: string
    quantitySold: number
    retailRevenue: number
    patientRevenue: number
    orderCount: number
  }>
  dailySales: Array<{
    date: string
    revenue: number
    patientRevenue: number
    insuranceRevenue: number
    orders: number
  }>
  salesByCategory: Array<{
    name: string
    productType: string
    retailRevenue: number
    patientRevenue: number
    insuranceRevenue: number
    quantity: number
    itemCount: number
  }>
  associatePerformance: Array<{
    employee: { id: string; name: string; role: string } | null
    totalRevenue: number
    patientRevenue: number
    averageOrderValue: number
    totalOrders: number
    performance: { rank: number }
  }>
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSalesData() {
      setLoading(true)
      setError(null)
      try {
        const periodMap: Record<string, string> = {
          '7d': 'week',
          '30d': 'month',
          '90d': 'quarter',
          '1y': 'year'
        }

        let url = `/api/analytics/sales?compare=true`

        if (dateRange === 'custom' && customStart && customEnd) {
          url += `&startDate=${customStart}&endDate=${customEnd}`
        } else {
          const period = periodMap[dateRange] || 'month'
          url += `&period=${period}`
        }

        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch analytics data')
        const result = await response.json()
        if (result.success) {
          setSalesData(result.data)
        } else {
          throw new Error(result.error || 'Unknown error')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchSalesData()
  }, [dateRange, customStart, customEnd])

  const handleCustomRangeApply = () => {
    if (customStart && customEnd) {
      setDateRange('custom')
    }
  }

  return (
    <PageLayout
      title="Analytics"
      subtitle="Performance metrics and revenue tracking"
      actions={
        <div className="flex flex-wrap gap-2 items-center">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setDateRange(range)
                setShowCustomRange(false)
              }}
            >
              {range === '7d' ? 'Daily' : range === '30d' ? 'Weekly' : range === '90d' ? 'Monthly' : 'Yearly'}
            </Button>
          ))}
          <Button
            variant={showCustomRange || dateRange === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowCustomRange(!showCustomRange)}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Custom
          </Button>
        </div>
      }
    >
      <div className="container mx-auto p-6 space-y-6">
        {/* Custom Date Range Picker */}
        {showCustomRange && (
          <Card className="bg-slate-800/50 border-white/10">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-white/70 text-sm">Start Date</Label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-40 bg-slate-700 border-white/20 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/70 text-sm">End Date</Label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-40 bg-slate-700 border-white/20 text-white"
                  />
                </div>
                <Button onClick={handleCustomRangeApply} disabled={!customStart || !customEnd}>
                  Apply Range
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabbed Interface - Simplified to Performance + Exports */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="exports" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </TabsTrigger>
          </TabsList>

          {/* PERFORMANCE TAB - All metrics unified */}
          <TabsContent value="performance" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-red-600">{error}</p>
              </div>
            ) : salesData ? (
              <>
                {/* Key Revenue Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-gradient-to-br from-emerald-900/30 to-emerald-950/30 border-emerald-500/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-emerald-300">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{formatCurrency(salesData.metrics.totalRevenue)}</div>
                      {salesData.growth && (
                        <p className={`text-sm ${salesData.growth.revenue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatPercent(salesData.growth.revenue)} from last period
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border-blue-500/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-blue-300">Patient Collected</CardTitle>
                      <DollarSign className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{formatCurrency(salesData.metrics.totalRevenue - salesData.metrics.totalInsuranceBilled)}</div>
                      <p className="text-sm text-blue-400/70">Direct payments</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border-purple-500/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-purple-300">Insurance Billed</CardTitle>
                      <DollarSign className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{formatCurrency(salesData.metrics.totalInsuranceBilled)}</div>
                      <p className="text-sm text-purple-400/70">Carrier claims</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-orange-900/30 to-orange-950/30 border-orange-500/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-orange-300">Avg Order Value</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-orange-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{formatCurrency(salesData.metrics.averageOrderValue)}</div>
                      {salesData.growth && (
                        <p className={`text-sm ${salesData.growth.averageOrderValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatPercent(salesData.growth.averageOrderValue)} from last period
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-slate-800/50 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-white/80">Total Orders</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-white/50" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{salesData.metrics.totalOrders}</div>
                      {salesData.growth && (
                        <p className={`text-xs ${salesData.growth.orders >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatPercent(salesData.growth.orders)} from last period
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-white/80">Items Sold</CardTitle>
                      <Package className="h-4 w-4 text-white/50" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{salesData.metrics.totalItemsSold}</div>
                      <p className="text-xs text-white/50">{salesData.metrics.totalTransactions} transactions</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-white/80">Unique Customers</CardTitle>
                      <Package className="h-4 w-4 text-white/50" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{salesData.metrics.uniqueCustomers}</div>
                      {salesData.growth && (
                        <p className={`text-xs ${salesData.growth.customers >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatPercent(salesData.growth.customers)} from last period
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Revenue by Category + Top Products */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-slate-800/50 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Revenue by Category</CardTitle>
                      <CardDescription className="text-white/60">Breakdown by product type</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {salesData.salesByCategory.length > 0 ? (
                        salesData.salesByCategory.map((item, i) => {
                          const totalCategoryRevenue = salesData.salesByCategory.reduce((sum, c) => sum + c.retailRevenue, 0)
                          const percentage = totalCategoryRevenue > 0 ? ((item.retailRevenue / totalCategoryRevenue) * 100).toFixed(0) : 0
                          const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500']
                          return (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                                <span className="font-medium text-white">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-white/50 text-sm">{percentage}%</span>
                                <span className="font-semibold text-white">{formatCurrency(item.retailRevenue)}</span>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-white/50 text-center py-4">No category data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Top Selling Items</CardTitle>
                      <CardDescription className="text-white/60">By quantity sold</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {salesData.topProducts.length > 0 ? (
                        salesData.topProducts.slice(0, 8).map((product, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-blue-900/50 flex items-center justify-center text-xs font-medium text-blue-300">
                                {i + 1}
                              </div>
                              <div>
                                <p className="font-medium text-white text-sm">{product.name}</p>
                                <p className="text-xs text-white/50">{product.productType}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-white">{product.quantitySold} sold</p>
                              <p className="text-xs text-white/50">{formatCurrency(product.retailRevenue)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-white/50 text-center py-4">No products sold in this period</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Top Revenue Items */}
                <Card className="bg-slate-800/50 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Top Revenue Items</CardTitle>
                    <CardDescription className="text-white/60">Highest revenue generating products</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {salesData.topProducts.length > 0 ? (
                        [...salesData.topProducts]
                          .sort((a, b) => b.retailRevenue - a.retailRevenue)
                          .slice(0, 8)
                          .map((product, i) => (
                            <div key={i} className="p-3 rounded-lg bg-slate-700/50 border border-white/10">
                              <p className="font-medium text-white text-sm truncate">{product.name}</p>
                              <p className="text-lg font-bold text-emerald-400">{formatCurrency(product.retailRevenue)}</p>
                              <p className="text-xs text-white/50">{product.quantitySold} units • {product.orderCount} orders</p>
                            </div>
                          ))
                      ) : (
                        <p className="text-white/50 text-center py-4 col-span-4">No revenue data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Sales Breakdown */}
                <Card className="bg-slate-800/50 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Daily Sales</CardTitle>
                    <CardDescription className="text-white/60">Revenue breakdown by day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {salesData.dailySales.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {salesData.dailySales.map((day, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                            <span className="text-sm text-white">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            <div className="flex items-center gap-6">
                              <span className="text-white/50 text-sm">{day.orders} orders</span>
                              <span className="font-semibold text-white">{formatCurrency(day.revenue)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/50 text-center py-4">No sales data for this period</p>
                    )}
                  </CardContent>
                </Card>

                {/* Associate Performance */}
                {salesData.associatePerformance.length > 0 && (
                  <Card className="bg-slate-800/50 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Associate Performance</CardTitle>
                      <CardDescription className="text-white/60">Sales by employee</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {salesData.associatePerformance.map((assoc, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-sm font-medium text-blue-300">
                              {assoc.performance.rank}
                            </div>
                            <div>
                              <span className="font-medium text-white">{assoc.employee?.name || 'Unknown'}</span>
                              <p className="text-xs text-white/50">{assoc.totalOrders} orders</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-white">{formatCurrency(assoc.totalRevenue)}</span>
                            <p className="text-xs text-white/50">Avg: {formatCurrency(assoc.averageOrderValue)}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}
          </TabsContent>

          {/* EXPORTS TAB */}
          <TabsContent value="exports" className="space-y-6">
            <Card className="bg-slate-800/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Export Data</CardTitle>
                <CardDescription className="text-white/60">Generate and download reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-2 border-white/20 bg-slate-700/30">
                    <CardHeader>
                      <CardTitle className="text-base text-white">Transaction Report</CardTitle>
                      <CardDescription className="text-white/60">All sales transactions with details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-start bg-slate-600/50 border-white/20 text-white hover:bg-slate-600">
                        <Download className="h-4 w-4 mr-2" />
                        Export as CSV
                      </Button>
                      <Button variant="outline" className="w-full justify-start bg-slate-600/50 border-white/20 text-white hover:bg-slate-600">
                        <Download className="h-4 w-4 mr-2" />
                        Export as Excel
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-white/20 bg-slate-700/30">
                    <CardHeader>
                      <CardTitle className="text-base text-white">Inventory Report</CardTitle>
                      <CardDescription className="text-white/60">Current stock levels and valuation</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-start bg-slate-600/50 border-white/20 text-white hover:bg-slate-600">
                        <Download className="h-4 w-4 mr-2" />
                        Export as CSV
                      </Button>
                      <Button variant="outline" className="w-full justify-start bg-slate-600/50 border-white/20 text-white hover:bg-slate-600">
                        <Download className="h-4 w-4 mr-2" />
                        Export as Excel
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-white/20 bg-slate-700/30">
                    <CardHeader>
                      <CardTitle className="text-base text-white">Financial Report</CardTitle>
                      <CardDescription className="text-white/60">Revenue, costs, and profit margins</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-start bg-slate-600/50 border-white/20 text-white hover:bg-slate-600">
                        <Download className="h-4 w-4 mr-2" />
                        Export as CSV
                      </Button>
                      <Button variant="outline" className="w-full justify-start bg-slate-600/50 border-white/20 text-white hover:bg-slate-600">
                        <Download className="h-4 w-4 mr-2" />
                        Export as PDF
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-white/20 bg-slate-700/30">
                    <CardHeader>
                      <CardTitle className="text-base text-white">Product Report</CardTitle>
                      <CardDescription className="text-white/60">Product performance and trends</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-start bg-slate-600/50 border-white/20 text-white hover:bg-slate-600">
                        <Download className="h-4 w-4 mr-2" />
                        Export as CSV
                      </Button>
                      <Button variant="outline" className="w-full justify-start bg-slate-600/50 border-white/20 text-white hover:bg-slate-600">
                        <Download className="h-4 w-4 mr-2" />
                        Export as Excel
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  )
}
