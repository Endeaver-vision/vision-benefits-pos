import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import CustomerAnalyticsDashboard from '@/components/customers/analytics-dashboard'

export default function AnalyticsPage() {
  return (
    <div>
      <div className="container mx-auto p-6 pb-0">
        <Link href="/customers">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
      </div>
      <CustomerAnalyticsDashboard />
    </div>
  )
}