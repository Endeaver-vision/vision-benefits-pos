'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  Users,
  DollarSign,
  Download,
  ShoppingCart,
  Loader2,
  Package,
  Clock
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
  fulfillmentMetrics: {
    averageFulfillmentDays: number
    completedOrdersCount: number
    ordersByLab: Array<{ labId: string | null; count: number }>
  }
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

interface CustomerSummary {
  totalCustomers: number
  totalRevenue: number
  averageCustomerValue: number
  repeatCustomerRate: number
  recentCustomerRate: number
  highValueCustomerRate: number
}

interface TopCustomer {
  id: string
  firstName: string
  lastName: string
  totalSpent: number
  totalTransactions: number
}

function CustomerAnalyticsTab() {
  const [customerData, setCustomerData] = useState<{
    summary: CustomerSummary
    topCustomers: { topSpenders: TopCustomer[] }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCustomerData() {
      setLoading(true)
      try {
        const response = await fetch('/api/analytics/customers?limit=50')
        if (!response.ok) throw new Error('Failed to fetch customer data')
        const result = await response.json()
        if (result.success) {
          setCustomerData(result.data)
        } else {
          throw new Error(result.error || 'Unknown error')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchCustomerData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!customerData) return null

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{customerData.summary.totalCustomers}</div>
            <p className="text-sm text-muted-foreground">With purchase history</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Repeat Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{customerData.summary.repeatCustomerRate.toFixed(0)}%</div>
            <p className="text-sm text-muted-foreground">Made multiple purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Avg Customer Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(customerData.summary.averageCustomerValue)}</div>
            <p className="text-sm text-muted-foreground">Lifetime value per customer</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{customerData.summary.recentCustomerRate.toFixed(0)}%</div>
            <p className="text-sm text-muted-foreground">Active in last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">High Value Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{customerData.summary.highValueCustomerRate.toFixed(0)}%</div>
            <p className="text-sm text-muted-foreground">Spent over $500</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
          <CardDescription>Highest value customers by total spend</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customerData.topCustomers.topSpenders.length > 0 ? (
            customerData.topCustomers.topSpenders.slice(0, 10).map((customer, i) => (
              <div key={customer.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                    <p className="text-xs text-muted-foreground">{customer.totalTransactions} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(customer.totalSpent)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">No customer data available</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default function UnifiedAnalyticsPage() {
  const [dateRange, setDateRange] = useState('month')
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
        const period = periodMap[dateRange] || 'month'
        const response = await fetch(`/api/analytics/sales?period=${period}&compare=true`)
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
  }, [dateRange])

  return (
    <PageLayout
      title="Analytics & Reports"
      subtitle="Business intelligence, performance metrics, and data exports"
      actions={
        <div className="flex gap-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(range)}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
            </Button>
          ))}
        </div>
      }
    >
      <div className="container mx-auto p-6 space-y-6">

      {/* Tabbed Interface */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="exports" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </TabsTrigger>
        </TabsList>

        {/* PERFORMANCE TAB - Executive KPIs */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(salesData.metrics.totalRevenue)}</div>
                    {salesData.growth && (
                      <p className={`text-xs ${salesData.growth.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(salesData.growth.revenue)} from last period
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesData.metrics.totalOrders}</div>
                    {salesData.growth && (
                      <p className={`text-xs ${salesData.growth.orders >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(salesData.growth.orders)} from last period
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesData.metrics.uniqueCustomers}</div>
                    {salesData.growth && (
                      <p className={`text-xs ${salesData.growth.customers >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(salesData.growth.customers)} from last period
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(salesData.metrics.averageOrderValue)}</div>
                    {salesData.growth && (
                      <p className={`text-xs ${salesData.growth.averageOrderValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(salesData.growth.averageOrderValue)} from last period
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Additional Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesData.metrics.totalItemsSold}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Insurance Billed</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(salesData.metrics.totalInsuranceBilled)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg Fulfillment</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesData.fulfillmentMetrics.averageFulfillmentDays} days</div>
                    <p className="text-xs text-muted-foreground">{salesData.fulfillmentMetrics.completedOrdersCount} completed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Orders by Status</CardTitle>
                    <CardDescription>Current order pipeline</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {salesData.ordersByStatus.length > 0 ? (
                      salesData.ordersByStatus.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                            <span className="font-medium capitalize">{item.status.toLowerCase().replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">{item.count} orders</span>
                            <span className="font-semibold">{formatCurrency(item.revenue)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No orders in this period</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Products</CardTitle>
                    <CardDescription>Best selling items this period</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {salesData.topProducts.length > 0 ? (
                      salesData.topProducts.slice(0, 5).map((product, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.quantitySold} units</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(product.retailRevenue)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No products sold in this period</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* SALES TAB - Sales Analytics */}
        <TabsContent value="sales" className="space-y-6">
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Period Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(salesData.metrics.totalRevenue)}</div>
                    <p className="text-sm text-muted-foreground">{salesData.metrics.totalTransactions} transactions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Patient Collected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(salesData.metrics.totalRevenue - salesData.metrics.totalInsuranceBilled)}</div>
                    <p className="text-sm text-muted-foreground">Direct patient payments</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Insurance Billed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{formatCurrency(salesData.metrics.totalInsuranceBilled)}</div>
                    <p className="text-sm text-muted-foreground">Billed to carriers</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Sales by Category</CardTitle>
                  <CardDescription>Revenue breakdown by product category</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {salesData.salesByCategory.length > 0 ? (
                    salesData.salesByCategory.map((item, i) => {
                      const totalCategoryRevenue = salesData.salesByCategory.reduce((sum, c) => sum + c.retailRevenue, 0)
                      const percentage = totalCategoryRevenue > 0 ? ((item.retailRevenue / totalCategoryRevenue) * 100).toFixed(0) : 0
                      return (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">{percentage}%</span>
                            <span className="font-semibold">{formatCurrency(item.retailRevenue)}</span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No category data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Sales Breakdown</CardTitle>
                  <CardDescription>Revenue by day in selected period</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {salesData.dailySales.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {salesData.dailySales.map((day, i) => (
                        <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                          <span className="text-sm">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground text-sm">{day.orders} orders</span>
                            <span className="font-semibold">{formatCurrency(day.revenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No sales data for this period</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Associate Performance</CardTitle>
                  <CardDescription>Sales by employee</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {salesData.associatePerformance.length > 0 ? (
                    salesData.associatePerformance.map((assoc, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium">
                            {assoc.performance.rank}
                          </div>
                          <div>
                            <span className="font-medium">{assoc.employee?.name || 'Unknown'}</span>
                            <p className="text-xs text-muted-foreground">{assoc.totalOrders} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{formatCurrency(assoc.totalRevenue)}</span>
                          <p className="text-xs text-muted-foreground">Avg: {formatCurrency(assoc.averageOrderValue)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No associate data available</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* CUSTOMERS TAB - Customer Intelligence */}
        <TabsContent value="customers" className="space-y-6">
          <CustomerAnalyticsTab />
        </TabsContent>

        {/* EXPORTS TAB - Data Exports & Reports */}
        <TabsContent value="exports" className="space-y-6" id="exports-tab">
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>Generate and download reports in various formats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base">Transaction Report</CardTitle>
                    <CardDescription>All sales transactions with details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export as Excel
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base">Customer Report</CardTitle>
                    <CardDescription>Customer list with contact info</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export as Excel
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base">Inventory Report</CardTitle>
                    <CardDescription>Current stock levels and valuation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export as Excel
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base">Financial Report</CardTitle>
                    <CardDescription>Revenue, costs, and profit margins</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export as PDF
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
              <CardDescription>Create custom reports with specific date ranges and filters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-center justify-center border-2 border-dashed rounded">
                <p className="text-muted-foreground">Custom report builder interface (coming soon)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </PageLayout>
  )
}
