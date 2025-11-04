'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Users, 
  Package, 
  BarChart3,
  TrendingUp,
  DollarSign
} from 'lucide-react';

const reportCategories = [
  {
    title: 'Transaction Reports',
    description: 'Detailed transaction analysis with filtering and export capabilities',
    icon: FileText,
    href: '/reports/transactions',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Customer Analytics',
    description: 'Customer insights, purchase history, and loyalty analysis',
    icon: Users,
    href: '/reports/customers',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    comingSoon: false,
  },
  {
    title: 'Inventory Analytics',
    description: 'Inventory turnover, reorder optimization, and supplier performance',
    icon: Package,
    href: '/reports/inventory',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    comingSoon: false,
  },
  {
    title: 'Sales Performance',
    description: 'Associate performance, targets, and commission reports',
    icon: TrendingUp,
    href: '/reports/performance',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    comingSoon: true,
  },
  {
    title: 'Financial Reports',
    description: 'Revenue analysis, profit margins, and financial summaries',
    icon: DollarSign,
    href: '/reports/financial',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    comingSoon: true,
  },
  {
    title: 'Executive Dashboard',
    description: 'High-level business intelligence and performance metrics',
    icon: BarChart3,
    href: '/analytics/executive',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    comingSoon: false,
  },
];

export default function ReportsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive reporting and analytics for your vision practice
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6</div>
            <p className="text-xs text-muted-foreground">
              Report categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Reports</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">
              Currently available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coming Soon</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              In development
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCategories.map((category) => {
          const Icon = category.icon;
          
          return (
            <Card key={category.href} className="relative overflow-hidden transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${category.bgColor}`}>
                    <Icon className={`h-5 w-5 ${category.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    {category.comingSoon && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {category.description}
                </CardDescription>
                {category.comingSoon ? (
                  <Button variant="outline" disabled className="w-full">
                    In Development
                  </Button>
                ) : category.title === 'Customer Analytics' ? (
                  <div className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={category.href}>
                        View Reports
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/reports/customers/dashboard">
                        Dashboard
                      </Link>
                    </Button>
                  </div>
                ) : category.title === 'Inventory Analytics' ? (
                  <div className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={category.href}>
                        View Reports
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/reports/inventory/dashboard">
                        Dashboard
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Button asChild className="w-full">
                    <Link href={category.href}>
                      View Reports
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest report generations and exports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent report activity</p>
            <p className="text-sm">Reports will appear here once you start generating them</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}