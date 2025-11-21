'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart3,
  TrendingUp,
  FileText,
  ArrowLeft,
  Crown
} from 'lucide-react'

const analyticsCategories = [
  {
    title: 'Sales Analytics',
    description: 'View sales trends, performance metrics, and category analysis',
    icon: TrendingUp,
    href: '/analytics/sales',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Executive Dashboard',
    description: 'High-level business intelligence and key performance indicators',
    icon: Crown,
    href: '/analytics/executive',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Reports & Data Exports',
    description: 'Comprehensive reporting, data exports, and detailed analysis',
    icon: FileText,
    href: '/reports',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
]

export default function AnalyticsLandingPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          Analytics & Reports
        </h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive analytics, business intelligence, and reporting tools
        </p>
      </div>

      {/* Analytics Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {analyticsCategories.map((category) => {
          const Icon = category.icon
          return (
            <Link key={category.href} href={category.href}>
              <Card className="cursor-pointer hover:shadow-lg transition-all h-full">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${category.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${category.color}`} />
                  </div>
                  <CardTitle className="text-xl">{category.title}</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    View {category.title.replace(' & Data Exports', '')}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">About Analytics & Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Sales Analytics:</strong> Track daily, weekly, and monthly sales performance with detailed metrics on revenue, transactions, and customer behavior.
          </p>
          <p>
            <strong>Executive Dashboard:</strong> High-level overview with key performance indicators, business health metrics, and strategic insights for decision-makers.
          </p>
          <p>
            <strong>Reports:</strong> Generate detailed reports on transactions, customers, inventory, and financial performance with export capabilities.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
