'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, LogOut, Store, Users, Package, DollarSign, Shield } from 'lucide-react'
import StockAlerts from '@/components/stock-alerts'
import { SecondPairQuickAction } from '@/components/dashboard/second-pair-widget'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vision Benefits POS</h1>
              <p className="text-sm text-gray-600">
                Welcome, {session.user.name} ({session.user.role})
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session.user.locationName}</p>
                <p className="text-xs text-gray-500">{session.user.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Quick Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$2,847</div>
              <p className="text-xs text-muted-foreground">+12% from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">+5 from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18</div>
              <p className="text-xs text-muted-foreground">+2 new today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Order</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$124</div>
              <p className="text-xs text-muted-foreground">+8% from last week</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">New Quote</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Start a new eyeglasses quote with comprehensive selection</p>
                  <Button className="w-full" asChild>
                    <a href="/quote-builder">Start Quote</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Quick POS</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Quick product sales and accessories</p>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/pos">Quick Sale</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Customer Lookup</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Search for existing customer records</p>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/customers">Search Customers</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">View and manage product inventory</p>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/inventory">View Inventory</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Sales Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">View sales trends and performance metrics</p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" asChild>
                      <a href="/analytics">View Analytics</a>
                    </Button>
                    <Button className="w-full" asChild>
                      <a href="/analytics/executive">Executive Dashboard</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Comprehensive reporting and data exports</p>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/reports">View Reports</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <StockAlerts maxItems={4} />
            
            {/* Second Pair Quick Action */}
            <SecondPairQuickAction locationId={session?.user?.locationId} />
          </div>
        </div>

        {/* Admin Section - Only visible for Admin users */}
        {session?.user?.role === 'ADMIN' && (
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                Administration
              </h2>
              <p className="text-sm text-gray-600 mt-1">System administration and management tools</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-md transition-shadow border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center text-blue-900">
                    <Package className="h-5 w-5 mr-2" />
                    Product Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Manage products, categories, pricing, and inventory</p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                    <a href="/admin/products">Manage Products</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center text-purple-900">
                    <Users className="h-5 w-5 mr-2" />
                    User Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Manage staff accounts, roles, and permissions</p>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700" asChild>
                    <a href="/admin/users">Manage Users</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center text-green-900">
                    <Store className="h-5 w-5 mr-2" />
                    Location Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Configure locations, settings, and preferences</p>
                  <Button className="w-full bg-green-600 hover:bg-green-700" asChild>
                    <a href="/admin/locations">Location Settings</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}