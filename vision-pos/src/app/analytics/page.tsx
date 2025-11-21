'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Download,
  ArrowLeft,
  ShoppingCart
} from 'lucide-react'

export default function UnifiedAnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d')

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              Analytics & Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Business intelligence, performance metrics, and data exports
            </p>
          </div>
        </div>
        
        {/* Date Range Selector */}
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
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$45,231</div>
                <p className="text-xs text-green-600">+20.1% from last period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">312</div>
                <p className="text-xs text-green-600">+12% from last period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,847</div>
                <p className="text-xs text-green-600">+8.3% from last period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$145</div>
                <p className="text-xs text-green-600">+7.2% from last period</p>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>Revenue over time ({dateRange})</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center border-2 border-dashed rounded">
                <p className="text-muted-foreground">Chart: Revenue trend visualization</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best selling items this period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: 'Progressive Lenses', sales: '$8,420', count: 42 },
                  { name: 'Designer Frames', sales: '$6,230', count: 38 },
                  { name: 'Blue Light Coating', sales: '$4,890', count: 67 },
                  { name: 'Contact Lenses', sales: '$3,120', count: 28 },
                ].map((product, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.count} units</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{product.sales}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SALES TAB - Sales Analytics */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$2,847</div>
                <p className="text-sm text-muted-foreground">23 transactions today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$18,432</div>
                <p className="text-sm text-muted-foreground">147 transactions this week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$72,890</div>
                <p className="text-sm text-muted-foreground">587 transactions this month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
              <CardDescription>Revenue breakdown by product category</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center border-2 border-dashed rounded">
              <p className="text-muted-foreground">Chart: Category breakdown visualization</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales by Insurance Carrier</CardTitle>
              <CardDescription>Revenue breakdown by insurance provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { carrier: 'VSP', amount: '$18,420', percentage: '41%' },
                { carrier: 'EyeMed', amount: '$14,230', percentage: '31%' },
                { carrier: 'Spectera', amount: '$8,890', percentage: '20%' },
                { carrier: 'Cash Pay', amount: '$3,691', percentage: '8%' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="font-medium">{item.carrier}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">{item.percentage}</span>
                    <span className="font-semibold">{item.amount}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CUSTOMERS TAB - Customer Intelligence */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">2,847</div>
                <p className="text-sm text-muted-foreground">+142 this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">1,284</div>
                <p className="text-sm text-muted-foreground">Purchased in last 90 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Avg Customer Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">$487</div>
                <p className="text-sm text-muted-foreground">Lifetime value per customer</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Acquisition</CardTitle>
              <CardDescription>New customers over time</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center border-2 border-dashed rounded">
              <p className="text-muted-foreground">Chart: Customer growth visualization</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>Highest value customers this period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Sarah Johnson', spent: '$2,840', orders: 8 },
                { name: 'Michael Chen', spent: '$2,120', orders: 6 },
                { name: 'Emily Rodriguez', spent: '$1,890', orders: 5 },
                { name: 'David Kim', spent: '$1,650', orders: 7 },
              ].map((customer, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{customer.spent}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPORTS TAB - Data Exports & Reports */}
        <TabsContent value="exports" className="space-y-6">
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
  )
}
