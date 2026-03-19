'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, Users, Package, DollarSign, BarChart3, Box, Shield, ArrowRight, FileUp } from 'lucide-react'
import AppNavigation from '@/components/layout/app-navigation'

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <AppNavigation
        title="Vision Benefits POS"
        subtitle="Welcome"
        showNavigation={false}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main POS Button - Full Width Solid Chip */}
        <div className="mb-8">
          <Link href="/pos" className="block">
            <div className="cursor-pointer hover:shadow-xl transition-all chip-blue rounded-xl p-8">
              <div className="flex items-center justify-center gap-4">
                <Store className="h-12 w-12 text-white" />
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white">Point of Sale</h2>
                  <p className="text-blue-100 mt-1">Start a new quote or checkout</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Quick Stats */}
          <Card className="glass-card border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Today&apos;s Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">$2,847</div>
              <p className="text-xs text-emerald-400">+12% from yesterday</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Orders</CardTitle>
              <Package className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">23</div>
              <p className="text-xs text-blue-400">+5 from yesterday</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Customers</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">18</div>
              <p className="text-xs text-purple-400">+2 new today</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Avg. Order</CardTitle>
              <Store className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">$124</div>
              <p className="text-xs text-orange-400">+8% from last week</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - 4 equal size boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/customers" className="block">
            <Card className="glass-card border-white/20 cursor-pointer hover:shadow-lg transition-all h-full hover:scale-[1.02] hover:bg-white/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-purple-400" />
                  <CardTitle className="text-lg text-white">Customer Lookup</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/70">Search for existing customer records</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/products" className="block">
            <Card className="glass-card border-white/20 cursor-pointer hover:shadow-lg transition-all h-full hover:scale-[1.02] hover:bg-white/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Package className="h-6 w-6 text-blue-400" />
                  <CardTitle className="text-lg text-white">Products & Services</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/70">View all products and services with pricing</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/inventory" className="block">
            <Card className="glass-card border-white/20 cursor-pointer hover:shadow-lg transition-all h-full hover:scale-[1.02] hover:bg-white/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Box className="h-6 w-6 text-emerald-400" />
                  <CardTitle className="text-lg text-white">Inventory</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/70">View and manage product inventory</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/analytics" className="block">
            <Card className="glass-card border-white/20 cursor-pointer hover:shadow-lg transition-all h-full hover:scale-[1.02] hover:bg-white/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-orange-400" />
                  <CardTitle className="text-lg text-white">Analytics & Reports</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/70">Performance metrics, sales analytics, and data exports</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Order Tracking Section - NEW */}
        <div className="mb-8">
          <Link href="/orders" className="block">
            <Card className="glass-card border-white/20 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] hover:bg-white/20">
              <CardContent className="py-8">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                    <Package className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">Order Tracking</h3>
                    <p className="text-white/70">Track orders from vendor to patient delivery • Timeline monitoring • Overdue alerts</p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-white/50" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Insurance Pricers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link href="/eyemed-pricer" className="block">
            <Card className="glass-card border-white/20 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] hover:bg-white/20 h-full">
              <CardContent className="py-8">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                    <FileUp className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">EyeMed Pricer</h3>
                    <p className="text-white/70">Upload auth PDF • Extract benefits • Calculate prices</p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-white/50" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/vsp-pricer" className="block">
            <Card className="glass-card border-white/20 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.01] hover:bg-white/20 h-full">
              <CardContent className="py-8">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                    <Shield className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">VSP Pricer</h3>
                    <p className="text-white/70">Upload auth + enhancement PDFs • Extract copays • Generate price list</p>
                  </div>
                  <ArrowRight className="h-6 w-6 text-white/50" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}
