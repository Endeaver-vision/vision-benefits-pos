'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  ShoppingCart, 
  Package,
  BarChart3,
  PieChart,
  Activity,
  ArrowLeft
} from 'lucide-react'

interface SalesMetrics {
  totalRevenue: number
  totalTransactions: number
  averageOrderValue: number
  totalItemsSold: number
  uniqueCustomers: number
  totalDiscount: number
  totalTax: number
  conversionRate: number
}

interface GrowthMetrics {
  revenue: number
  transactions: number
  averageOrderValue: number
  customers: number
}

interface TopProduct {
  product: {
    id: string
    name: string
    sku: string | null
    category: {
      name: string
    }
  }
  quantitySold: number
  revenue: number
  transactions: number
}

interface DailySale {
  date: string
  revenue: number
  transactions: number
}

interface CategorySale {
  name: string
  revenue: number
  quantity: number
}

interface AssociatePerformance {
  user: {
    firstName: string
    lastName: string
    role: string
  }
  totalRevenue: number
  averageOrderValue: number
  totalTransactions: number
  performance: {
    rank: number
  }
}

interface AnalyticsData {
  period: string
  dateRange: {
    start: string
    end: string
  }
  metrics: SalesMetrics
  comparison?: SalesMetrics
  growth?: GrowthMetrics
  topProducts: TopProduct[]
  dailySales: DailySale[]
  salesByCategory: CategorySale[]
  associatePerformance: AssociatePerformance[]
  generatedAt: string
}

export default function SalesAnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [compareEnabled, setCompareEnabled] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const loadAnalytics = useCallback(async () => {
    if (!session) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        period: selectedPeriod,
        compare: compareEnabled.toString()
      })

      const response = await fetch(`/api/analytics/sales?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.data)
      } else {
        console.error('Failed to load analytics')
      }
    } catch (error) {
      console.error('Analytics loading error:', error)
    } finally {
      setLoading(false)
    }
  }, [session, selectedPeriod, compareEnabled])

  useEffect(() => {
    if (session) {
      loadAnalytics()
    }
  }, [session, loadAnalytics])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatPercentage = (num: number, showSign = true) => {
    const formatted = `${Math.abs(num).toFixed(1)}%`
    if (!showSign) return formatted
    return num >= 0 ? `+${formatted}` : `-${formatted}`
  }

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    )
  }

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'today': return 'Today'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      case 'quarter': return 'This Quarter'
      case 'year': return 'This Year'
      default: return period
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session || !analytics) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="text-neutral-600 hover:text-brand-purple"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-neutral-300" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
                <p className="text-sm text-gray-600">
                  Performance insights and sales trends for {getPeriodLabel(selectedPeriod).toLowerCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button asChild>
                <a href="/analytics/executive">Executive Dashboard</a>
              </Button>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={compareEnabled ? "default" : "outline"}
                onClick={() => setCompareEnabled(!compareEnabled)}
                size="sm"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Compare
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.metrics.totalRevenue)}
              </div>
              {analytics.growth && (
                <div className={`text-xs flex items-center space-x-1 ${getGrowthColor(analytics.growth.revenue)}`}>
                  {getGrowthIcon(analytics.growth.revenue)}
                  <span>{formatPercentage(analytics.growth.revenue)} from last period</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(analytics.metrics.totalTransactions)}
              </div>
              {analytics.growth && (
                <div className={`text-xs flex items-center space-x-1 ${getGrowthColor(analytics.growth.transactions)}`}>
                  {getGrowthIcon(analytics.growth.transactions)}
                  <span>{formatPercentage(analytics.growth.transactions)} from last period</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.metrics.averageOrderValue)}
              </div>
              {analytics.growth && (
                <div className={`text-xs flex items-center space-x-1 ${getGrowthColor(analytics.growth.averageOrderValue)}`}>
                  {getGrowthIcon(analytics.growth.averageOrderValue)}
                  <span>{formatPercentage(analytics.growth.averageOrderValue)} from last period</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(analytics.metrics.uniqueCustomers)}
              </div>
              {analytics.growth && (
                <div className={`text-xs flex items-center space-x-1 ${getGrowthColor(analytics.growth.customers)}`}>
                  {getGrowthIcon(analytics.growth.customers)}
                  <span>{formatPercentage(analytics.growth.customers)} from last period</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts and Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Top Products</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topProducts.slice(0, 5).map((item, index) => (
                  <div key={item.product.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Badge variant="outline">{index + 1}</Badge>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.product.category.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(item.revenue)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.quantitySold} sold
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sales by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5" />
                <span>Sales by Category</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.salesByCategory.map((category) => {
                  const percentage = (category.revenue / analytics.metrics.totalRevenue) * 100
                  return (
                    <div key={category.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{category.name}</span>
                        <span>{formatCurrency(category.revenue)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{category.quantity} items</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Associate Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Sales Associate Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Rank</th>
                    <th className="text-left p-2 font-medium">Associate</th>
                    <th className="text-right p-2 font-medium">Revenue</th>
                    <th className="text-right p-2 font-medium">Transactions</th>
                    <th className="text-right p-2 font-medium">Avg Order</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.associatePerformance.map((associate) => (
                    <tr key={associate.user.firstName + associate.user.lastName} className="border-b">
                      <td className="p-2">
                        <Badge variant={associate.performance.rank <= 3 ? "default" : "outline"}>
                          #{associate.performance.rank}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">
                            {associate.user.firstName} {associate.user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {associate.user.role.replace('_', ' ').toLowerCase()}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-right font-medium">
                        {formatCurrency(associate.totalRevenue)}
                      </td>
                      <td className="p-2 text-right">
                        {associate.totalTransactions}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(associate.averageOrderValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}